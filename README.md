# Sóró — Conversational Spanish Learning App

> **The language app you eventually delete.** Inspired by [Mural](https://github.com/Chuloo/mural), re-imagined natively for the web with Next.js 16, React 19, WebRTC, and low-cost/free AI providers.

---

## What is Sóró?

**Sóró** is a local-first web application designed for learning Spanish through real-time conversation rather than robotic gamification or multiple-choice drills.

- **Warm, animated Liquid Glass Orb:** Reacts dynamically to your voice and Sóró's speech in real-time.
- **Immediate immersion in Spanish:** Sóró speaks Spanish, listens patiently, accepts replies in any language, and gently recasts mistakes without interrupting your flow.
- **Interactive Word Lookup:** Tap any Spanish word in the caption to view a 1-sentence contextual gloss and grammar lemma.
- **Real-Time Meaning Subtitles:** Optional English subtitles that automatically translate assistant utterances with debouncing and caching.
- **Evidence-Based Learning & Recall Bars:** Tracks vocabulary using a 3-bar spaced repetition heuristic verified through actual conversation evidence (cross-day and cross-context retrieval).
- **Cultural Themes:** Order *un café con leche*, go to the local market (*el mercado*), discuss tapas with friends, or enjoy a relaxed *sobremesa*.
- **Zero to Ultra-Low Cost:** Operates 100% free using your browser's native Speech Recognition & Synthesis coupled with Groq Cloud's free tier (Llama 3.3 70B) or Google Gemini Flash, with optional native OpenAI Realtime WebRTC support.

---

## Quick Start

### 1. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Google Chrome**, **Microsoft Edge**, or **Safari** (for best Web Speech API microphone support).

### 2. Configure Your AI Provider in Settings (BYOK)

Click the **Sliders / Settings** icon in the top right:
1. **100% Free / Zero-Cost Mode (Default & Recommended):**
   - **Speech:** Native browser Web Speech API (zero cost).
   - **LLM:** Add a free API key from [Groq Console](https://console.groq.com/) (`gsk_...`) or [Google AI Studio](https://aistudio.google.com/) (`AIzaSy...`).
2. **OpenAI Realtime WebRTC Mode:**
   - Add your OpenAI API key (`sk-proj-...`) for low-latency native voice via WebRTC.

---

## Architecture & Project Map

```
language-learning-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts              # Streaming LLM endpoint (Groq / Gemini / OpenAI)
│   │   │   ├── assess/route.ts            # Pedagogical evaluation with strict JSON schema
│   │   │   ├── translate/route.ts         # Debounced subtitle translation
│   │   │   ├── lookup/route.ts            # Contextual word glossing
│   │   │   └── realtime-session/route.ts  # WebRTC ephemeral token generation
│   │   ├── layout.tsx                     # Root layout with warm cream styling
│   │   ├── page.tsx                       # Main coordinator (Hablar, Temas, Palabras)
│   │   └── globals.css                    # Design tokens & custom scrollbars
│   ├── components/
│   │   ├── orb/
│   │   │   └── MuralOrb.tsx               # Animated HTML5 Canvas liquid glass orb
│   │   ├── talk/
│   │   │   ├── TalkView.tsx               # Main voice conversation view
│   │   │   ├── CaptionArea.tsx            # Interactive Spanish words with lookup links
│   │   │   ├── VoiceControls.tsx          # Mic toggle, mute, end, and subtitles
│   │   │   └── TypedReplyModal.tsx        # Written reply fallback
│   │   ├── themes/
│   │   │   └── ThemesView.tsx             # Cultural conversation scenarios
│   │   ├── words/
│   │   │   ├── WordsView.tsx              # Vocabulary drawer & progress metrics
│   │   │   └── RecallBars.tsx             # 3-bar spaced repetition visualizer
│   │   ├── settings/
│   │   │   └── SettingsModal.tsx          # BYOK key settings & provider selection
│   │   └── ui/
│   │       └── Header.tsx                 # Brand navigation header
│   ├── core/
│   │   ├── teaching/
│   │   │   ├── policy.ts                  # Prompt engineering (immersion, evaluation, lookup)
│   │   │   └── spanish.ts                 # Spanish language module & 6-level guidance
│   │   ├── learning/
│   │   │   ├── learningEngine.ts          # Anti-hallucination evidence validator
│   │   │   └── spacedRepetition.ts        # 0-3 recall bars calculation & decay logic
│   │   └── types/
│   │       ├── models.ts                  # SessionRecord, Fragment, Passage, Assessment
│   │       └── vocabulary.ts              # WordState & LearnerState
│   ├── voice/
│   │   ├── audioEnergy.ts                 # Web Audio API RMS energy meter
│   │   ├── webSpeechTransport.ts          # 100% Free Web Speech API voice transport
│   │   └── webrtcTransport.ts             # OpenAI Realtime WebRTC transport
│   └── storage/
│       ├── db.ts                          # IndexedDB local storage (idb)
│       └── preferenceStore.ts             # LocalStorage settings
└── package.json
```

---

## Testing & Quality

Run the automated pedagogical test suite:

```bash
npm test
```

Build for production:

```bash
npm run build
```

---

## Privacy & Local-First Philosophy

- Conversations and vocabulary records are stored in your browser's local **IndexedDB** database.
- API keys are stored in browser **LocalStorage** and are never saved to remote servers.
- You can export your full learning history at any time as a JSON file from the Settings modal.
