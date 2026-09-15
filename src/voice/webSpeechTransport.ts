import { Fragment } from '../core/types/models';
import { AudioEnergyMeter } from './audioEnergy';

export interface TransportCallbacks {
  onFragment: (fragment: Fragment) => void;
  onStateChange: (state: 'idle' | 'connecting' | 'active' | 'closing' | 'ended' | 'failed') => void;
  onEnergy: (input: number, output: number) => void;
  onError: (msg: string) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

/**
 * Strips punctuation and symbols that Web Speech API voices pronounce literally
 * (e.g. inverted question marks '¿', question marks '?', exclamation marks '¡' / '!', markdown asterisks).
 */
export function cleanTextForAudioSpeech(raw: string): string {
  return raw
    .replace(/[*_#`~]/g, '') // remove markdown bold/italics/code
    .replace(/[¿¡]/g, '') // remove Spanish opening punctuation which TTS pronounces as "signo de interrogación"
    .replace(/\?/g, '.') // replace trailing question mark with period pause
    .replace(/!/g, '.') // replace exclamation mark with period pause
    .replace(/["'“”«»()[\]{}]/g, '') // remove quotation marks and brackets
    .replace(/[—–-]/g, ' ') // replace hyphens/dashes with space
    .replace(/\.+/g, '.') // collapse multiple dots
    .replace(/\s+/g, ' ') // collapse multiple spaces
    .trim();
}

/**
 * Returns available Spanish voices from the browser.
 */
export function getAvailableSpanishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  const excluded = ['Flo', 'Eddy', 'Rocko', 'Reed', 'Sandy', 'Shelby', 'Grandma', 'Grandpa', 'Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles'];
  return voices.filter(
    (v) => (v.lang === 'es-ES' || v.lang.startsWith('es-')) && !excluded.some((ex) => v.name.includes(ex))
  );
}

// Interface for Web Speech API SpeechRecognition
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: { error: string }) => void;
  onresult: (event: {
    resultIndex: number;
    results: Array<{
      isFinal: boolean;
      0: { transcript: string; confidence: number };
    }>;
  }) => void;
}

export class WebSpeechTransport {
  private callbacks: TransportCallbacks;
  private recognition: IWindowSpeechRecognition | null = null;
  private micStream: MediaStream | null = null;
  private energyMeter: AudioEnergyMeter | null = null;
  private isMuted = false;
  private isActive = false;
  private isSpeakingAssistant = false;
  private isProcessingTurn = false;
  private sessionStartTime = 0;
  private inputLevel = 0;
  private outputLevel = 0;
  private outputEnergyInterval: NodeJS.Timeout | null = null;
  private resumeInterval: NodeJS.Timeout | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private pendingUserText = '';
  private currentFragmentId = '';
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private conversationHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  private keys: { groqKey?: string; geminiKey?: string; openaiKey?: string; deepgramKey?: string } = {};
  private preferredVoiceName?: string;
  private deepgramVoice?: string;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor(callbacks: TransportCallbacks) {
    this.callbacks = callbacks;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
  }

  async start(
    systemPrompt: string,
    greeting: string,
    keys: { groqKey?: string; geminiKey?: string; openaiKey?: string; deepgramKey?: string },
    preferredVoiceName?: string,
    deepgramVoice?: string
  ) {
    this.keys = keys;
    this.preferredVoiceName = preferredVoiceName;
    this.deepgramVoice = deepgramVoice;
    this.sessionStartTime = Date.now();
    this.conversationHistory = [{ role: 'system', content: systemPrompt }];
    this.currentFragmentId = `user_${Date.now()}`;
    this.callbacks.onStateChange('connecting');

    // Unlock browser audio synthesis gesture immediately
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }

    try {
      // 1. Request microphone access
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      // 2. Set up energy meter for the visual orb
      this.energyMeter = new AudioEnergyMeter((level) => {
        this.inputLevel = this.isMuted ? 0 : level;
        this.callbacks.onEnergy(this.inputLevel, this.outputLevel);
      });
      await this.energyMeter.start(this.micStream);

      // 3. Set up browser speech recognition
      const SpeechRecognitionConstructor =
        (window as unknown as { SpeechRecognition?: new () => IWindowSpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => IWindowSpeechRecognition }).webkitSpeechRecognition;

      if (!SpeechRecognitionConstructor) {
        throw new Error('Tu navegador no soporta reconocimiento de voz nativo. Por favor usa Google Chrome, Microsoft Edge o Safari.');
      }

      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'es-ES';

      this.recognition.onresult = (event) => {
        if (this.isMuted || !this.isActive || this.isSpeakingAssistant || this.isProcessingTurn) return;

        let interimText = '';
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          interimText += res[0].transcript;
          if (res.isFinal) isFinal = true;
        }

        const trimmed = interimText.trim();
        if (!trimmed) return;

        this.pendingUserText = trimmed;
        const offset = Date.now() - this.sessionStartTime;

        // Emit fragment to display on screen in real time
        const fragment: Fragment = {
          id: this.currentFragmentId,
          revision: 0,
          previousTexts: [],
          speaker: 'user',
          text: trimmed,
          startMS: Math.max(0, offset - 1500),
          endMS: offset,
          receivedAt: new Date().toISOString(),
          meaningVisible: true,
          typed: false,
        };

        this.callbacks.onFragment(fragment);

        // Adaptive pause detection:
        // If final, commit quickly (350ms). If interim, commit after 1200ms of user silence.
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(
          () => {
            this.commitPendingUserSpeech();
          },
          isFinal ? 350 : 1200
        );
      };

      this.recognition.onerror = (err) => {
        if (err.error === 'no-speech') return; // Normal conversational pause
        console.warn('Speech recognition status:', err.error);
      };

      this.recognition.onend = () => {
        // Automatically restart speech recognition if active and not speaking assistant
        if (this.isActive && !this.isMuted && !this.isSpeakingAssistant && !this.isProcessingTurn && this.recognition) {
          try {
            this.recognition.start();
          } catch {
            // Already active or restarting
          }
        }
      };

      this.isActive = true;
      this.callbacks.onStateChange('active');

      // 4. Deliver initial greeting first; recognition starts after greeting finishes
      setTimeout(() => {
        if (this.isActive) {
          this.speakAssistantTurn(greeting);
        }
      }, 300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar el micrófono';
      this.callbacks.onError(msg);
      this.callbacks.onStateChange('failed');
      this.stop();
    }
  }

  private commitPendingUserSpeech() {
    if (!this.pendingUserText.trim() || this.isProcessingTurn || this.isSpeakingAssistant || !this.isActive) {
      return;
    }

    const textToCommit = this.pendingUserText.trim();
    this.pendingUserText = '';
    this.currentFragmentId = `user_${Date.now()}`;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.handleUserTurnComplete(textToCommit);
  }

  private async handleUserTurnComplete(userText: string) {
    if (!userText.trim() || this.isProcessingTurn || !this.isActive) return;

    this.isProcessingTurn = true;
    this.callbacks.onProcessingChange?.(true);
    this.conversationHistory.push({ role: 'user', content: userText });

    // Temporarily stop microphone listening while generating and speaking
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: this.conversationHistory,
          groqKey: this.keys.groqKey,
          geminiKey: this.keys.geminiKey,
          openaiKey: this.keys.openaiKey,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error del asistente (${res.status})`);
      }

      const data = await res.json();
      const reply = data.text?.trim();

      if (reply && this.isActive) {
        this.conversationHistory.push({ role: 'assistant', content: reply });
        this.speakAssistantTurn(reply);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al responder';
      this.callbacks.onError(msg);
      // Resume listening if failed
      if (this.isActive && !this.isMuted && this.recognition) {
        try {
          this.recognition.start();
        } catch {}
      }
    } finally {
      this.isProcessingTurn = false;
      this.callbacks.onProcessingChange?.(false);
    }
  }

  private async speakAssistantTurn(text: string) {
    if (typeof window === 'undefined') return;

    this.isSpeakingAssistant = true;

    // Abort mic recognition immediately so assistant speech does not loop back into mic
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }

    const offset = Date.now() - this.sessionStartTime;
    const fragment: Fragment = {
      id: `assistant_${Date.now()}`,
      revision: 0,
      previousTexts: [],
      speaker: 'assistant',
      text,
      startMS: offset,
      endMS: offset + text.length * 60,
      receivedAt: new Date().toISOString(),
      meaningVisible: true,
      typed: false,
    };

    this.callbacks.onFragment(fragment);

    // Cancel any previous synthesis or Deepgram audio
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }

    const speechCleaned = cleanTextForAudioSpeech(text);

    const cleanup = () => {
      if (this.resumeInterval) {
        clearInterval(this.resumeInterval);
        this.resumeInterval = null;
      }
      this.stopSimulatedOutputEnergy();
      this.isSpeakingAssistant = false;
      this.currentUtterance = null;
      this.currentAudio = null;

      // Resume speech recognition to listen to the user after a 300ms acoustic echo grace period
      setTimeout(() => {
        if (this.isActive && !this.isMuted && !this.isSpeakingAssistant && !this.isProcessingTurn && this.recognition) {
          try {
            this.recognition.start();
          } catch {}
        }
      }, 300);
    };

    // 1. Try Deepgram Aura-2 neural voice if deepgramKey is provided
    if (this.keys.deepgramKey) {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: speechCleaned,
            voice: this.deepgramVoice || 'aura-2-diana-es',
            deepgramKey: this.keys.deepgramKey,
          }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          this.currentAudio = audio;

          this.startSimulatedOutputEnergy();

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            cleanup();
          };
          audio.onerror = () => {
            console.warn('[Deepgram TTS] Playback failed, falling back to Web Speech.');
            URL.revokeObjectURL(audioUrl);
            this.speakWithSpeechSynthesis(speechCleaned, cleanup);
          };

          await audio.play();
          console.log(`[Sóró] Playing Deepgram voice: "${this.deepgramVoice || 'aura-2-diana-es'}"`);
          return;
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('[Deepgram TTS] API error, falling back to Web Speech:', errData.error);
        }
      } catch (err) {
        console.warn('[Deepgram TTS] Request failed, falling back to Web Speech:', err);
      }
    }

    // 2. Fallback: Browser Web Speech API
    this.speakWithSpeechSynthesis(speechCleaned, cleanup);
  }

  private speakWithSpeechSynthesis(speechCleaned: string, cleanup: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      cleanup();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(speechCleaned);
    this.currentUtterance = utterance; // Prevent garbage collection bug in Chrome
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;

    // Pick the best-sounding Spanish voice using a tiered scoring system
    if (this.availableVoices.length === 0) {
      this.loadVoices();
    }

    const spanishVoices = getAvailableSpanishVoices();

    // 1. If user selected a specific preferred voice, honour it
    let selectedVoice = this.preferredVoiceName
      ? spanishVoices.find((v) => v.name === this.preferredVoiceName)
      : undefined;

    // 2. Score each voice — higher is better. Prefer natural-sounding female voices.
    if (!selectedVoice && spanishVoices.length > 0) {
      const scoreVoice = (v: SpeechSynthesisVoice): number => {
        const n = v.name.toLowerCase();
        let score = 0;

        // Premium / Natural keyword (macOS labels these on high-quality voices)
        if (n.includes('premium'))  score += 50;
        if (n.includes('natural'))  score += 45;
        if (n.includes('enhanced')) score += 40;

        // Known high-quality female voices (best experience for Spanish learners)
        if (n.includes('mónica') || n.includes('monica'))   score += 60; // Castilian, warm
        if (n.includes('paulina'))                           score += 58; // Mexican, clear
        if (n.includes('jimena'))                            score += 55; // Mexican, natural
        if (n.includes('marisol'))                           score += 50;
        if (n.includes('isabel'))                            score += 48;

        // Google TTS voices are generally good quality
        if (n.includes('google'))                            score += 35;

        // Male voices are OK but secondary preference
        if (n.includes('jorge'))                             score += 30;
        if (n.includes('diego'))                             score += 28;

        // Prefer non-compact voices (compact/default tend to be robotic)
        if (n.includes('compact'))                           score -= 20;

        // Prefer es-ES or es-MX over less common locales
        if (v.lang === 'es-ES' || v.lang === 'es-MX')       score += 5;

        return score;
      };

      const ranked = [...spanishVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
      selectedVoice = ranked[0];
    }

    // 3. Last-resort fallback to any Spanish voice
    if (!selectedVoice) {
      selectedVoice = this.availableVoices.find((v) => v.lang.startsWith('es-'));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
      console.log(`[Sóró] Using voice: "${selectedVoice.name}" (${selectedVoice.lang})`);
    } else {
      console.warn('[Sóró] No Spanish voice found — using browser default.');
    }

    utterance.onstart = () => {
      this.startSimulatedOutputEnergy();

      // Chrome 15s bug workaround: pulse resume() during speech
      if (this.resumeInterval) clearInterval(this.resumeInterval);
      this.resumeInterval = setInterval(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 4000);
    };

    utterance.onend = cleanup;
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      cleanup();
    };

    // Ensure audio engine is unpaused
    window.speechSynthesis.resume();
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 60);
  }

  private startSimulatedOutputEnergy() {
    this.stopSimulatedOutputEnergy();
    let tick = 0;
    this.outputEnergyInterval = setInterval(() => {
      tick++;
      const wave = Math.sin(tick * 0.4) * 0.3 + Math.cos(tick * 0.8) * 0.2 + 0.55;
      this.outputLevel = Math.max(0.1, Math.min(0.95, wave));
      this.callbacks.onEnergy(this.inputLevel, this.outputLevel);
    }, 80);
  }

  private stopSimulatedOutputEnergy() {
    if (this.outputEnergyInterval) {
      clearInterval(this.outputEnergyInterval);
      this.outputEnergyInterval = null;
    }
    this.outputLevel = 0;
    this.callbacks.onEnergy(this.inputLevel, 0);
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      this.recognition?.stop();
    } else if (this.isActive && !this.isSpeakingAssistant && !this.isProcessingTurn) {
      try {
        this.recognition?.start();
      } catch {}
    }
  }

  async sendTyped(text: string) {
    const offset = Date.now() - this.sessionStartTime;
    const fragment: Fragment = {
      id: `user_typed_${Date.now()}`,
      revision: 0,
      previousTexts: [],
      speaker: 'user',
      text,
      startMS: offset,
      endMS: offset + 1,
      receivedAt: new Date().toISOString(),
      meaningVisible: true,
      typed: true,
    };
    this.callbacks.onFragment(fragment);
    await this.handleUserTurnComplete(text);
  }

  stop() {
    this.isActive = false;
    this.isMuted = true;
    this.isSpeakingAssistant = false;
    this.isProcessingTurn = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.resumeInterval) {
      clearInterval(this.resumeInterval);
      this.resumeInterval = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.energyMeter) {
      this.energyMeter.stop();
      this.energyMeter = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.currentUtterance = null;
    this.stopSimulatedOutputEnergy();
    this.callbacks.onStateChange('ended');
  }
}
