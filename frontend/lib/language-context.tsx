"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  IndicLanguage,
  INDIC_LANGUAGES,
  DEFAULT_LANGUAGE,
  CORE_DICTIONARY,
  DICTIONARY_BY_TEXT,
} from "./i18n";

interface LanguageContextType {
  currentLanguage: IndicLanguage;
  setLanguage: (lang: IndicLanguage | string) => void;
  languages: IndicLanguage[];
  t: (keyOrText: string, fallback?: string) => string;
  translateText: (text: string, targetCode?: string) => Promise<string>;
  isTranslating: boolean;
  cacheSize: number;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const STORAGE_LANG_KEY = "sutra_selected_language";
const CACHE_PREFIX = "sutra_trans_v1_";

// WeakMaps for DOM tracking across component renders
const originalTextMap = new WeakMap<Node, string>();
const lastTranslatedTextMap = new WeakMap<Node, string>();
const lastTranslatedLangMap = new WeakMap<Node, string>();

const EXCLUDED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "PRE",
  "NOSCRIPT",
  "SVG",
  "INPUT",
  "TEXTAREA",
  "SELECT",
]);

/**
 * Filter out strings that should not trigger translation API calls
 */
function shouldTranslateNode(node: Node): boolean {
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const parent = node.parentElement;
  if (!parent) return false;
  if (EXCLUDED_TAGS.has(parent.tagName)) return false;
  if (parent.closest("[data-no-translate='true']")) return false;
  if (parent.closest("code") || parent.closest("pre")) return false;
  if (parent.isContentEditable) return false;

  const raw = node.nodeValue;
  if (!raw) return false;
  const text = raw.trim();
  if (!text || text.length < 2) return false;

  // Must contain at least one alphabetic letter
  if (!/[a-zA-Z]/.test(text)) return false;

  // Skip pure numbers, percentages, durations (e.g., "100%", "48h", "24h SLA", "75%")
  if (/^([0-9.,%+\-<>~]+|\d+[hmsd]|\d+%\s*SLA)$/i.test(text)) return false;

  // Skip pure URLs, emails, dates
  if (/^(https?:\/\/|www\.)/i.test(text)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return false;

  // Only skip technical codes if they contain digits (e.g. "CS-Y2", "ADR-004", "USR-1029", "v1.2")
  // Do NOT skip normal English uppercase words like "OVERVIEW", "ACTIVE", "ACTION"!
  if (/^[A-Z0-9_\-]*\d+[A-Z0-9_\-]*$/i.test(text) && text.length <= 10) return false;
  if (/^[a-zA-Z0-9_\-\.]{25,}$/.test(text)) return false; // Long JWT or hash

  return true;
}

/**
 * Detects if a DOM node is currently inside or near the viewport (above-the-fold)
 */
function isNodeVisible(node: Node): boolean {
  if (typeof window === "undefined") return false;
  const parent = node.parentElement;
  if (!parent) return false;
  try {
    const rect = parent.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  } catch {
    return false;
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] =
    useState<IndicLanguage>(DEFAULT_LANGUAGE);
  const [dynamicCache, setDynamicCache] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  // Flight-control & robust node queue references
  const isTranslatingDOMRef = useRef<boolean>(false);
  const waitingNodesMap = useRef<Map<string, Set<Node>>>(new Map());
  const queuedTextsSet = useRef<Set<string>>(new Set());
  const inFlightRequestsRef = useRef<Set<string>>(new Set());
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentLangRef = useRef<string>(DEFAULT_LANGUAGE.code);
  const dynamicCacheRef = useRef<Record<string, string>>({});

  currentLangRef.current = currentLanguage.code;
  dynamicCacheRef.current = dynamicCache;

  // 1. Initialize language from localStorage on client mount
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(STORAGE_LANG_KEY);
      if (savedCode) {
        const found = INDIC_LANGUAGES.find((l) => l.code === savedCode);
        if (found) {
          setCurrentLanguage(found);
          currentLangRef.current = found.code;

          // Preload saved cache immediately
          const savedCache = localStorage.getItem(`${CACHE_PREFIX}${found.code}`);
          if (savedCache) {
            const parsed = JSON.parse(savedCache);
            setDynamicCache(parsed);
            dynamicCacheRef.current = parsed;
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Helper to dispatch a single micro-batch of items to /api/translate
  const dispatchMicroBatch = useCallback(
    (batchTexts: string[], targetCode: string) => {
      if (batchTexts.length === 0) return;

      batchTexts.forEach((text) => {
        inFlightRequestsRef.current.add(`${targetCode}:${text}`);
      });

      setIsTranslating(true);

      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: batchTexts,
          target_language_code: targetCode,
          source_language_code: "en-IN",
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          // Guard against race conditions if user switched language while request was in flight
          if (currentLangRef.current !== targetCode) return;
          if (!data?.translations || !Array.isArray(data.translations)) return;

          isTranslatingDOMRef.current = true;
          try {
            const updates: Record<string, string> = {};

            batchTexts.forEach((originalCore, index) => {
              const flightKey = `${targetCode}:${originalCore}`;
              inFlightRequestsRef.current.delete(flightKey);

              const translatedCore = data.translations[index];
              if (!translatedCore) return;

              const cacheKey = `${targetCode}:${originalCore}`;
              updates[cacheKey] = translatedCore;

              // Immediately paint ALL waiting nodes on the screen for this text
              const waitingNodes = waitingNodesMap.current.get(originalCore);
              if (waitingNodes) {
                waitingNodes.forEach((node) => {
                  if (!node.isConnected) return;
                  const origVal = originalTextMap.get(node) || node.nodeValue || "";
                  const match = origVal.match(/^(\s*)([\s\S]*?)(\s*)$/);
                  const leading = match ? match[1] : "";
                  const trailing = match ? match[3] : "";

                  const finalTrans = leading + translatedCore + trailing;
                  node.nodeValue = finalTrans;
                  lastTranslatedTextMap.set(node, finalTrans);
                  lastTranslatedLangMap.set(node, targetCode);
                });
                waitingNodesMap.current.delete(originalCore);
              }
            });

            // Save updates to in-memory state and persistent storage
            setDynamicCache((prev) => {
              const next = { ...prev, ...updates };
              dynamicCacheRef.current = next;
              try {
                localStorage.setItem(
                  `${CACHE_PREFIX}${targetCode}`,
                  JSON.stringify(next)
                );
              } catch {
                // Ignore storage quota
              }
              return next;
            });
          } finally {
            isTranslatingDOMRef.current = false;
          }
        })
        .catch((err) => {
          console.error("Micro-batch translation error:", err);
        })
        .finally(() => {
          batchTexts.forEach((text) => {
            inFlightRequestsRef.current.delete(`${targetCode}:${text}`);
          });
          if (inFlightRequestsRef.current.size === 0) {
            setIsTranslating(false);
          }
        });
    },
    []
  );

  // Progressive micro-batch flush to /api/translate
  const flushBatch = useCallback(() => {
    const targetCode = currentLangRef.current;
    if (targetCode === "en-IN" || queuedTextsSet.current.size === 0) return;

    // Extract all pending texts
    const allTexts = Array.from(queuedTextsSet.current);
    queuedTextsSet.current.clear();

    if (allTexts.length === 0) return;

    // Priority sort: texts whose nodes are currently visible on screen come first!
    allTexts.sort((a, b) => {
      const nodesA = waitingNodesMap.current.get(a);
      const nodesB = waitingNodesMap.current.get(b);
      const isVisibleA = nodesA ? Array.from(nodesA).some(isNodeVisible) : false;
      const isVisibleB = nodesB ? Array.from(nodesB).some(isNodeVisible) : false;
      if (isVisibleA && !isVisibleB) return -1;
      if (!isVisibleA && isVisibleB) return 1;
      return 0;
    });

    // Partition into concurrent micro-batches of 8 items for progressive streaming paint
    const MICRO_BATCH_SIZE = 8;
    for (let i = 0; i < allTexts.length; i += MICRO_BATCH_SIZE) {
      const slice = allTexts.slice(i, i + MICRO_BATCH_SIZE);
      dispatchMicroBatch(slice, targetCode);
    }
  }, [dispatchMicroBatch]);

  // Synchronous text node translator using provided or current cache
  const processTextNodeSync = useCallback(
    (node: Node, targetCode: string, cache: Record<string, string>) => {
      if (!shouldTranslateNode(node)) return;

      // 1. Remember original English text
      if (!originalTextMap.has(node)) {
        originalTextMap.set(node, node.nodeValue || "");
      }

      const origText = originalTextMap.get(node) || "";
      if (!origText.trim()) return;

      // If English, restore original immediately
      if (targetCode === "en-IN") {
        if (node.nodeValue !== origText) {
          isTranslatingDOMRef.current = true;
          try {
            node.nodeValue = origText;
            lastTranslatedTextMap.delete(node);
            lastTranslatedLangMap.delete(node);
          } finally {
            isTranslatingDOMRef.current = false;
          }
        }
        return;
      }

      // If already showing the active translated text for THIS language, skip
      if (
        lastTranslatedLangMap.get(node) === targetCode &&
        node.nodeValue === lastTranslatedTextMap.get(node)
      ) {
        return;
      }

      const match = origText.match(/^(\s*)([\s\S]*?)(\s*)$/);
      const leading = match ? match[1] : "";
      const core = match ? match[2].trim() : origText.trim();
      const trailing = match ? match[3] : "";

      if (!core) return;

      // Tier 1: Static pre-compiled dictionary (0ms, 0 API calls)
      const dictEntry =
        CORE_DICTIONARY[core] ||
        DICTIONARY_BY_TEXT.get(core.toLowerCase());
      if (dictEntry && dictEntry[targetCode]) {
        isTranslatingDOMRef.current = true;
        try {
          const trans = dictEntry[targetCode];
          const finalVal = leading + trans + trailing;
          node.nodeValue = finalVal;
          lastTranslatedTextMap.set(node, finalVal);
          lastTranslatedLangMap.set(node, targetCode);
        } finally {
          isTranslatingDOMRef.current = false;
        }
        return;
      }

      // Tier 2: In-memory dynamicCache (0ms, 0 API calls)
      const cacheKey = `${targetCode}:${core}`;
      if (cache[cacheKey]) {
        isTranslatingDOMRef.current = true;
        try {
          const trans = cache[cacheKey];
          const finalVal = leading + trans + trailing;
          node.nodeValue = finalVal;
          lastTranslatedTextMap.set(node, finalVal);
          lastTranslatedLangMap.set(node, targetCode);
        } finally {
          isTranslatingDOMRef.current = false;
        }
        return;
      }

      // Tier 3: Queue for batch Sarvam AI translation
      // Register node in persistent waiting list so it is NEVER lost
      if (!waitingNodesMap.current.has(core)) {
        waitingNodesMap.current.set(core, new Set());
      }
      waitingNodesMap.current.get(core)!.add(node);

      // If not already in-flight, add to batch queue
      const flightKey = `${targetCode}:${core}`;
      if (!inFlightRequestsRef.current.has(flightKey)) {
        queuedTextsSet.current.add(core);
      }

      // Fast debounce or immediate flush if queue has reached batch size
      if (queuedTextsSet.current.size >= 8) {
        if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
        flushBatch();
      } else {
        if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
        batchTimerRef.current = setTimeout(flushBatch, 15);
      }
    },
    [flushBatch]
  );

  // Scan a DOM subtree for text nodes
  const scanTreeSync = useCallback(
    (root: Node, targetCode: string, cache: Record<string, string>) => {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        null
      );
      let currentNode = walker.nextNode();
      while (currentNode) {
        processTextNodeSync(currentNode, targetCode, cache);
        currentNode = walker.nextNode();
      }
    },
    [processTextNodeSync]
  );

  // Immediately restore all text nodes back to original English text
  const restoreOriginalEnglish = useCallback((root: Node) => {
    isTranslatingDOMRef.current = true;
    try {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        null
      );
      let currentNode = walker.nextNode();
      while (currentNode) {
        const orig = originalTextMap.get(currentNode);
        if (orig !== undefined && currentNode.nodeValue !== orig) {
          currentNode.nodeValue = orig;
        }
        lastTranslatedTextMap.delete(currentNode);
        lastTranslatedLangMap.delete(currentNode);
        currentNode = walker.nextNode();
      }
    } finally {
      isTranslatingDOMRef.current = false;
    }
  }, []);

  // Set language with synchronous instant DOM application (NO REFRESH REQUIRED)
  const setLanguage = useCallback(
    (lang: IndicLanguage | string) => {
      const selected =
        typeof lang === "string"
          ? INDIC_LANGUAGES.find((l) => l.code === lang) || DEFAULT_LANGUAGE
          : lang;

      currentLangRef.current = selected.code;

      // 1. Immediately load cache from localStorage synchronously
      let memoryCache: Record<string, string> = {};
      try {
        localStorage.setItem(STORAGE_LANG_KEY, selected.code);
        const savedCache = localStorage.getItem(`${CACHE_PREFIX}${selected.code}`);
        if (savedCache) {
          memoryCache = JSON.parse(savedCache);
        }
      } catch {
        // storage errors ignored
      }

      dynamicCacheRef.current = memoryCache;
      setDynamicCache(memoryCache);
      setCurrentLanguage(selected);

      // 2. Synchronously scan and update DOM right now in the click handler
      if (typeof window !== "undefined" && document.body) {
        if (selected.code === "en-IN") {
          restoreOriginalEnglish(document.body);
        } else {
          scanTreeSync(document.body, selected.code, memoryCache);
        }
      }
    },
    [restoreOriginalEnglish, scanTreeSync]
  );

  // 3. Automatic DOM Indic Translation Engine with MutationObserver
  useEffect(() => {
    if (typeof window === "undefined" || !document.body) return;

    const targetCode = currentLanguage.code;

    // Scan initial DOM on mount or language switch
    if (targetCode === "en-IN") {
      restoreOriginalEnglish(document.body);
    } else {
      scanTreeSync(document.body, targetCode, dynamicCacheRef.current);
    }

    // Watch for dynamic DOM changes (route change, tab switches, modals, async data)
    const observer = new MutationObserver((mutations) => {
      if (isTranslatingDOMRef.current) return;

      const activeCode = currentLangRef.current;
      if (activeCode === "en-IN") return;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              processTextNodeSync(node, activeCode, dynamicCacheRef.current);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              scanTreeSync(node, activeCode, dynamicCacheRef.current);
            }
          });
        } else if (mutation.type === "characterData") {
          const target = mutation.target;
          if (!target) return;

          // If React reset the node to original English value, re-apply the translated text
          const expectedTranslation = lastTranslatedTextMap.get(target);
          const expectedLang = lastTranslatedLangMap.get(target);

          if (
            expectedTranslation &&
            expectedLang === activeCode &&
            target.nodeValue !== expectedTranslation
          ) {
            isTranslatingDOMRef.current = true;
            try {
              target.nodeValue = expectedTranslation;
            } finally {
              isTranslatingDOMRef.current = false;
            }
          } else if (!expectedTranslation || expectedLang !== activeCode) {
            processTextNodeSync(target, activeCode, dynamicCacheRef.current);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, [currentLanguage.code, scanTreeSync, restoreOriginalEnglish, processTextNodeSync]);

  // Programmatic translate helper (with flight deduplication)
  const translateText = useCallback(
    async (text: string, targetCode?: string): Promise<string> => {
      const target = targetCode || currentLanguage.code;
      if (!text || !text.trim() || target === "en-IN") {
        return text;
      }

      const core = text.trim();

      // Check dictionary first (0 API calls)
      const dictEntry =
        CORE_DICTIONARY[core] ||
        DICTIONARY_BY_TEXT.get(core.toLowerCase());
      if (dictEntry && dictEntry[target]) {
        return dictEntry[target];
      }

      // Check dynamic cache (0 API calls)
      const cacheKey = `${target}:${core}`;
      if (dynamicCacheRef.current[cacheKey]) {
        return dynamicCacheRef.current[cacheKey];
      }

      try {
        setIsTranslating(true);
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: core,
            target_language_code: target,
            source_language_code: "en-IN",
          }),
        });

        if (!res.ok) {
          return text;
        }

        const data = await res.json();
        const translated = data.translated_text || text;

        setDynamicCache((prev) => {
          const next = { ...prev, [cacheKey]: translated };
          dynamicCacheRef.current = next;
          try {
            localStorage.setItem(
              `${CACHE_PREFIX}${target}`,
              JSON.stringify(next)
            );
          } catch {
            // Ignore storage errors
          }
          return next;
        });

        return translated;
      } catch (err) {
        console.error("Translation request failed:", err);
        return text;
      } finally {
        setIsTranslating(false);
      }
    },
    [currentLanguage.code]
  );

  // Synchronous t() helper for React components
  const t = useCallback(
    (keyOrText: string, fallback?: string): string => {
      if (!keyOrText) return "";
      if (currentLanguage.code === "en-IN") {
        return fallback || keyOrText;
      }

      // Check curated high-frequency dictionary
      const dictEntry =
        CORE_DICTIONARY[keyOrText] ||
        DICTIONARY_BY_TEXT.get(keyOrText.trim().toLowerCase());
      if (dictEntry && dictEntry[currentLanguage.code]) {
        return dictEntry[currentLanguage.code];
      }

      // Check dynamic cache
      const cacheKey = `${currentLanguage.code}:${keyOrText.trim()}`;
      if (dynamicCacheRef.current[cacheKey]) {
        return dynamicCacheRef.current[cacheKey];
      }

      return fallback || keyOrText;
    },
    [currentLanguage.code]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        languages: INDIC_LANGUAGES,
        t,
        translateText,
        isTranslating,
        cacheSize: Object.keys(dynamicCache).length,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
