# ADR-007 · Sarvam AI Indic Neural Translation Engine & Multi-Tiered Localization Architecture
- **Status:** Accepted & Implemented (Operational).
- **Context:** SUTRA is designed for Indian higher education institutions across diverse linguistic regions where faculty, counselors, academic deans, and students operate natively in languages beyond English. To eliminate cognitive friction, alert fatigue, and language barriers, the platform requires comprehensive support for the 22 scheduled languages of India with native script fidelity. Direct third-party client calls expose API keys, risk quota depletion from repeated renders, and create jarring translation flickers. A secure, highly cached, multi-tiered localization architecture is required.
- **Decision:**
  1. **Sovereign Indic AI Engine (Sarvam AI):** Integrate Sarvam AI's Indic neural translation API (`POST https://api.sarvam.ai/translate`) as the primary neural translation engine for regional languages of India (Hindi `hi-IN`, Bengali `bn-IN`, Telugu `te-IN`, Marathi `mr-IN`, Tamil `ta-IN`, Gujarati `gu-IN`, Kannada `kn-IN`, Malayalam `ml-IN`, Odia `od-IN`, Punjabi `pa-IN`, Assamese `as-IN`).
  2. **Zero-Trust Server Boundary & Secure Proxy:**
     - The private `SARVAM_API_KEY` is strictly confined to server-side runtime environments (`.env`, Next.js route handler, FastAPI config) and is **never** emitted to browser client bundles or public repositories.
     - Client components interact exclusively through an internal, authenticated proxy route (`/api/translate` in Next.js or `/api/v1/translate` in FastAPI).
  3. **Multi-Tiered Zero-Cost Caching Layer:**
     - **Tier 1 (Static Pre-Compiled Dictionary):** High-frequency institutional tokens (navigation, primary tabs, triage states, student risk categories, landing page CTAs) are pre-translated in `frontend/lib/i18n.ts` for instant 0ms rendering with 0 network calls.
     - **Tier 2 (Client In-Memory & `localStorage`):** Every dynamic translation is persisted in `localStorage` under `sutra_trans_v1_<lang_code>` and memory cache, ensuring repeated visits, tab switches, and re-renders incur 0 API hits.
     - **Tier 3 (Server Global In-Memory Cache):** Next.js server retains a globally preserved translation map (`globalThis.__sutraTranslationCache`) across hot-reloads and requests.
  4. **Flight Control & Stampede Prevention (Request Coalescing):**
     - Both client and server maintain in-flight Promise trackers (`inFlightPromises`). If concurrent UI elements request the same phrase simultaneously, they attach to a single outbound Sarvam API fetch.
     - Batch requests automatically deduplicate unique strings before dispatching.
  5. **Automatic Indic DOM Translation Engine:**
     - Client-side `MutationObserver` and `TreeWalker` in `LanguageProvider` walk visible text nodes, automatically localizing dynamic cards, tables, and modals into the active Indic script without requiring manual `t()` wrappers on every text element.
     - Text filtering strictly excludes code blocks, inputs, textareas, pure numbers, percentages, durations, UUIDs, and JWT tokens to prevent wasteful API consumption.
     - Synchronous click application in `setLanguage()` updates cached nodes in the exact same execution tick without requiring a page refresh.
     - React reconciliation rollback interceptor prevents React virtual DOM from reverting text nodes back to hardcoded English JSX strings.
- **Consequences:**
  - Full app-wide and landing page localization across 12 scheduled Indian regional languages.
  - Sub-second first-time page translation with 0ms instantaneous re-rendering for cached content.
  - Complete protection of `SARVAM_API_KEY` behind the internal gateway.
  - Significant cost and quota efficiency through deduplication, in-flight coalescing, and multi-tier caching.
- **Rejected Alternatives:**
  - Client-side direct calls to `https://api.sarvam.ai/translate` (Rejected: exposes API secret key to browser devtools).
  - Generic Google Translate web widget (Rejected: poor aesthetic integration, no programmatic caching, inconsistent Indic domain terminology).
  - Manual, string-by-string hardcoded translation files for all pages (Rejected: unsustainable maintenance overhead for dynamic data and frequent UI updates).
