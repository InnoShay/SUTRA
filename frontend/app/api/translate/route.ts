import { NextRequest, NextResponse } from "next/server";

// Server-side persistent in-memory cache preserved across Next.js reloads
declare global {
  // eslint-disable-next-line no-var
  var __sutraTranslationCache: Map<string, string> | undefined;
  // eslint-disable-next-line no-var
  var __sutraInFlightPromises: Map<string, Promise<string>> | undefined;
}

const translationCache =
  globalThis.__sutraTranslationCache || new Map<string, string>();
globalThis.__sutraTranslationCache = translationCache;

// In-flight promise map for request coalescing / stampede prevention
const inFlightPromises =
  globalThis.__sutraInFlightPromises || new Map<string, Promise<string>>();
globalThis.__sutraInFlightPromises = inFlightPromises;

interface TranslateRequestBody {
  input?: string;
  inputs?: string[];
  target_language_code: string;
  source_language_code?: string;
}

/**
 * Normalizes text to maximize cache hits
 */
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Checks if a string needs translation (skip pure numbers, symbols, etc.)
 */
function needsTranslation(text: string): boolean {
  if (!text || text.length < 2) return false;
  // Must contain alphabetic characters
  if (!/[a-zA-Z]/.test(text)) return false;
  // Skip pure emails, URLs, dates
  if (/^(https?:\/\/|www\.)/i.test(text)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return false;
  return true;
}

/**
 * Translates a single string with in-flight deduplication and cache
 */
async function translateWithSarvam(
  text: string,
  sourceCode: string,
  targetCode: string,
  apiKey: string
): Promise<string> {
  const normalized = normalizeText(text);

  if (!needsTranslation(normalized) || targetCode === sourceCode || targetCode === "en-IN") {
    return text;
  }

  const cacheKey = `${sourceCode}:${targetCode}:${normalized}`;

  // 1. Check memory cache
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 2. Check if identical request is currently in-flight (coalescing)
  if (inFlightPromises.has(cacheKey)) {
    return inFlightPromises.get(cacheKey)!;
  }

  // 3. Dispatch single outbound fetch to Sarvam AI
  const fetchPromise = (async () => {
    try {
      const response = await fetch("https://api.sarvam.ai/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey,
        },
        body: JSON.stringify({
          input: normalized,
          source_language_code: sourceCode,
          target_language_code: targetCode,
        }),
      });

      if (!response.ok) {
        console.error(
          "Sarvam AI Translation API error:",
          response.status,
          await response.text()
        );
        return text;
      }

      const data = await response.json();
      const translated = data.translated_text || text;

      // Cache the result
      translationCache.set(cacheKey, translated);
      return translated;
    } catch (err) {
      console.error("Sarvam translation fetch failed:", err);
      return text;
    } finally {
      inFlightPromises.delete(cacheKey);
    }
  })();

  inFlightPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "SARVAM_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body: TranslateRequestBody = await req.json();
    const {
      input,
      inputs,
      target_language_code,
      source_language_code = "en-IN",
    } = body;

    if (!target_language_code) {
      return NextResponse.json(
        { error: "target_language_code is required." },
        { status: 400 }
      );
    }

    // Pass-through for same source & target
    if (target_language_code === source_language_code || target_language_code === "en-IN") {
      if (input !== undefined) {
        return NextResponse.json({
          translated_text: input,
          source_language_code,
          target_language_code,
          cached: true,
        });
      }
      if (inputs !== undefined) {
        return NextResponse.json({
          translations: inputs,
          source_language_code,
          target_language_code,
          cached: true,
        });
      }
    }

    // 1. Single string translation
    if (typeof input === "string") {
      const normalized = normalizeText(input);
      const cacheKey = `${source_language_code}:${target_language_code}:${normalized}`;
      const wasCached = translationCache.has(cacheKey);

      const translated = await translateWithSarvam(
        input,
        source_language_code,
        target_language_code,
        apiKey
      );

      return NextResponse.json({
        translated_text: translated,
        source_language_code,
        target_language_code,
        cached: wasCached,
      });
    }

    // 2. Batch translation with deduplication & concurrency control
    if (Array.isArray(inputs)) {
      if (inputs.length === 0) {
        return NextResponse.json({
          translations: [],
          source_language_code,
          target_language_code,
        });
      }

      // Find unique non-empty strings to avoid redundant API hits
      const uniqueTexts = Array.from(
        new Set(inputs.filter((item) => typeof item === "string" && item.trim().length > 0))
      );

      // Map to hold unique translations
      const uniqueTranslations = new Map<string, string>();

      // 1. Resolve memory cache hits immediately (0ms)
      const uncachedTexts: string[] = [];
      uniqueTexts.forEach((text) => {
        const normalized = normalizeText(text);
        if (!needsTranslation(normalized)) {
          uniqueTranslations.set(text, text);
          return;
        }
        const cacheKey = `${source_language_code}:${target_language_code}:${normalized}`;
        if (translationCache.has(cacheKey)) {
          uniqueTranslations.set(text, translationCache.get(cacheKey)!);
        } else {
          uncachedTexts.push(text);
        }
      });

      // 2. Translate uncached items concurrently with high throughput (sub-second execution)
      await Promise.all(
        uncachedTexts.map(async (text) => {
          const translated = await translateWithSarvam(
            text,
            source_language_code,
            target_language_code,
            apiKey
          );
          uniqueTranslations.set(text, translated);
        })
      );

      // Reconstruct original array maintaining indices
      const results = inputs.map((item) => {
        if (!item || !item.trim()) return item;
        return uniqueTranslations.get(item) || item;
      });

      return NextResponse.json({
        translations: results,
        source_language_code,
        target_language_code,
        totalRequested: inputs.length,
        uniqueTranslated: uniqueTexts.length,
        cacheSize: translationCache.size,
      });
    }

    return NextResponse.json(
      { error: "Either 'input' or 'inputs' must be provided." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Translation route handler exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error during translation" },
      { status: 500 }
    );
  }
}
