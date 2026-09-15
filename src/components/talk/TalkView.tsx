'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MuralOrb } from '../orb/MuralOrb';
import { CaptionArea } from './CaptionArea';
import { VoiceControls } from './VoiceControls';
import { TypedReplyModal } from './TypedReplyModal';
import { ConversationTheme, spanishModule } from '@/core/teaching/spanish';
import { Preferences, SessionRecord, Fragment, groupIntoPassages } from '@/core/types/models';
import { LearnerState } from '@/core/types/vocabulary';
import { TeachingPolicy } from '@/core/teaching/policy';
import { WebSpeechTransport } from '@/voice/webSpeechTransport';
import { WebRTCTransport } from '@/voice/webrtcTransport';
import { StorageService } from '@/storage/db';

import { UsefulPhrase } from '@/core/types/phrase';

interface TalkViewProps {
  theme: ConversationTheme | null;
  preferences: Preferences;
  learner: LearnerState;
  onSessionUpdated: (session: SessionRecord) => void;
  onOpenSettings: () => void;
  onPhrasesExtracted?: (phrases: UsefulPhrase[]) => void;
}

export const TalkView: React.FC<TalkViewProps> = ({
  theme,
  preferences,
  learner,
  onSessionUpdated,
  onOpenSettings,
  onPhrasesExtracted,
}) => {
  const [connectionState, setConnectionState] = useState<
    'idle' | 'connecting' | 'active' | 'closing' | 'ended' | 'failed'
  >('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [meaning, setMeaning] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTypingOpen, setIsTypingOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionRef = useRef<SessionRecord | null>(null);
  const transportRef = useRef<WebSpeechTransport | WebRTCTransport | null>(null);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const assessmentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeTheme = theme || spanishModule.themes[0];

  // Derive passages from session fragments
  const passages = session ? groupIntoPassages(session.fragments) : [];
  const assistantPassage = passages.filter((p) => p.speaker === 'assistant').pop();
  const userPassage = passages.filter((p) => p.speaker === 'user').pop();

  // Status text matching Mural
  const getStatusText = () => {
    switch (connectionState) {
      case 'idle':
        return 'Ready when you are';
      case 'connecting':
        return 'Connecting to Sóró…';
      case 'active':
        if (isThinking) return 'Sóró is thinking…';
        if (outputLevel > 0.05) return 'Sóró is speaking…';
        if (inputLevel > 0.05) return 'Listening to you…';
        return 'Take your time to respond';
      case 'closing':
        return 'Saving our conversation…';
      case 'ended':
        return 'See you next time!';
      case 'failed':
        return 'An error occurred. Try again';
    }
  };

  // Schedule subtitle translation whenever assistant speaks
  useEffect(() => {
    if (!assistantPassage || !preferences.meaningVisible) {
      setMeaning('');
      return;
    }

    if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);

    setIsTranslating(true);
    translationTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: assistantPassage.text,
            meaningLanguage: preferences.meaningLanguage,
            groqKey: preferences.groqKey,
            geminiKey: preferences.geminiKey,
            openaiKey: preferences.openaiKey,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setMeaning(data.translation || '');
        }
      } catch (err) {
        console.warn('Subtitle error:', err);
      } finally {
        setIsTranslating(false);
      }
    }, 450); // 450ms debounce like Mural

    return () => {
      if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
    };
  }, [assistantPassage?.text, preferences.meaningVisible, preferences.meaningLanguage]);

  // Schedule assessment after user speaks (3 seconds of quiet)
  const scheduleAssessment = () => {
    if (assessmentTimeoutRef.current) clearTimeout(assessmentTimeoutRef.current);

    assessmentTimeoutRef.current = setTimeout(async () => {
      const latestSession = sessionRef.current;
      if (!latestSession) return;

      const currentPassages = groupIntoPassages(latestSession.fragments);
      const targetUserPassage = currentPassages.filter((p) => p.speaker === 'user').pop();
      if (!targetUserPassage || targetUserPassage.text.trim().length < 3) return;

      try {
        const formattedContext = TeachingPolicy.formatContext(latestSession, targetUserPassage);
        const res = await fetch('/api/assess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: formattedContext,
            groqKey: preferences.groqKey,
            geminiKey: preferences.geminiKey,
            openaiKey: preferences.openaiKey,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.assessment) {
            const updatedAssessment = {
              ...data.assessment,
              passageID: targetUserPassage.id,
              revisionKey: targetUserPassage.revisionKey,
              createdAt: new Date().toISOString(),
              context: activeTheme.id,
            };

            // Read the absolute latest session so we never overwrite newer assistant fragments
            const current = sessionRef.current || latestSession;
            const updatedSession: SessionRecord = {
              ...current,
              assessments: [...current.assessments, updatedAssessment],
            };

            sessionRef.current = updatedSession;
            setSession(updatedSession);
            await StorageService.saveSession(updatedSession);
            onSessionUpdated(updatedSession);
          }

          // Save and propagate any extracted useful conversational phrases
          if (data.phrases && Array.isArray(data.phrases) && data.phrases.length > 0) {
            for (const p of data.phrases) {
              await StorageService.savePhrase(p);
            }
            onPhrasesExtracted?.(data.phrases);
          }
        }
      } catch (e) {
        console.warn('Assessment error:', e);
      }
    }, 3000); // 3s debounce like Mural
  };

  // Start Voice Session
  const handleStart = async () => {
    setErrorMessage(null);
    const newSession: SessionRecord = {
      id: `session_${Date.now()}`,
      languageID: 'es',
      startedAt: new Date().toISOString(),
      themeID: activeTheme.id,
      title: activeTheme.title,
      fragments: [],
      assessments: [],
      translations: {},
      topics: [],
      voiceSeconds: 0,
      inputTokens: 0,
      outputTokens: 0,
    };

    sessionRef.current = newSession;
    setSession(newSession);

    const voicePrompt = TeachingPolicy.voice(
      learner,
      activeTheme,
      preferences.interests,
      preferences.meaningLanguage
    );

    const callbacks = {
      onFragment: (fragment: Fragment) => {
        const current = sessionRef.current || newSession;
        const existingIdx = current.fragments.findIndex((f) => f.id === fragment.id);
        let updatedFragments: Fragment[];
        if (existingIdx >= 0) {
          updatedFragments = [...current.fragments];
          updatedFragments[existingIdx] = fragment;
        } else {
          updatedFragments = [...current.fragments, fragment];
        }
        const updated: SessionRecord = { ...current, fragments: updatedFragments };
        sessionRef.current = updated;
        setSession(updated);
        StorageService.saveSession(updated);

        // Schedule notification outside render cycle
        setTimeout(() => {
          onSessionUpdated(updated);
          if (fragment.speaker === 'user') {
            scheduleAssessment();
          }
        }, 0);
      },
      onStateChange: (st: typeof connectionState) => {
        setConnectionState(st);
      },
      onEnergy: (inLevel: number, outLevel: number) => {
        setInputLevel(inLevel);
        setOutputLevel(outLevel);
      },
      onError: (msg: string) => {
        setErrorMessage(msg);
      },
      onProcessingChange: (thinking: boolean) => {
        setIsThinking(thinking);
      },
    };

    if (preferences.provider === 'openai' && preferences.openaiKey) {
      const webrtc = new WebRTCTransport(callbacks);
      transportRef.current = webrtc;
      await webrtc.start(voicePrompt, preferences.openaiKey);
    } else {
      const webSpeech = new WebSpeechTransport(callbacks);
      transportRef.current = webSpeech;
      await webSpeech.start(
        voicePrompt,
        activeTheme.starterQuestion,
        {
          groqKey: preferences.groqKey,
          geminiKey: preferences.geminiKey,
          openaiKey: preferences.openaiKey,
          deepgramKey: preferences.deepgramKey,
        },
        preferences.preferredVoice,
        preferences.deepgramVoice
      );
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    transportRef.current?.setMute(nextMuted);
  };

  const handleEnd = () => {
    if (transportRef.current) {
      transportRef.current.stop();
      transportRef.current = null;
    }
    setConnectionState('ended');
    setIsThinking(false);
    if (sessionRef.current) {
      const finishedSession = { ...sessionRef.current, endedAt: new Date().toISOString() };
      sessionRef.current = finishedSession;
      setSession(finishedSession);
      StorageService.saveSession(finishedSession);
      onSessionUpdated(finishedSession);
    }
  };

  const handleReset = () => {
    handleEnd();
    sessionRef.current = null;
    setSession(null);
    setConnectionState('idle');
    setMeaning('');
    setInputLevel(0);
    setOutputLevel(0);
    setIsThinking(false);
  };

  const handleSendTyped = async (text: string) => {
    if (transportRef.current) {
      await transportRef.current.sendTyped(text);
    }
  };

  const handleLookupWord = async (word: string, sentence: string): Promise<string> => {
    const res = await fetch('/api/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word,
        sentence,
        meaningLanguage: preferences.meaningLanguage,
        groqKey: preferences.groqKey,
        geminiKey: preferences.geminiKey,
        openaiKey: preferences.openaiKey,
      }),
    });
    if (!res.ok) return `Could not look up "${word}".`;
    const data = await res.json();
    return data.gloss || '';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-between min-h-[calc(100vh-80px)]">
      {/* Top Theme Pill */}
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF0C7]/80 text-[#735B4A] text-xs font-semibold tracking-wide border border-[#FFE3CF]/50 shadow-2xs">
        <span>{activeTheme.title}</span>
      </div>

      {/* Center Animated Liquid Glass Orb */}
      <div className="my-auto flex flex-col items-center space-y-4">
        <MuralOrb
          energy={isThinking ? 0.45 : Math.max(outputLevel, inputLevel * 0.55)}
          listening={connectionState === 'active' && !isMuted && !isThinking}
          active={connectionState !== 'closing'}
          size={230}
        />

        {/* Status Text */}
        <div className="flex items-center gap-2">
          {isThinking && (
            <span className="w-2 h-2 rounded-full bg-[#FF8A4C] animate-ping" />
          )}
          <p className="text-xs font-medium text-[#735B4A]/80 font-rounded transition-all">
            {getStatusText()}
          </p>
        </div>

        {/* Caption & Meaning Subtitle Area */}
        <CaptionArea
          assistantPassage={assistantPassage}
          userPassage={userPassage}
          meaning={meaning}
          meaningVisible={preferences.meaningVisible}
          isTranslating={isTranslating}
          defaultGreeting={spanishModule.greeting}
          meaningLanguage={preferences.meaningLanguage}
          onLookupWord={handleLookupWord}
        />

        {/* Error or Notice Alert */}
        {errorMessage && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Voice Controls Bottom Area */}
      <div className="w-full pb-4">
        <VoiceControls
          state={connectionState}
          isMuted={isMuted}
          meaningVisible={preferences.meaningVisible}
          onToggleStart={handleStart}
          onToggleMute={handleToggleMute}
          onToggleMeaning={() => {
            // Handled through props
          }}
          onEnd={handleEnd}
          onOpenType={() => setIsTypingOpen(true)}
          onHelp={async () => {
            if (transportRef.current) {
              await transportRef.current.sendTyped(
                '¿Puedes repetir eso un poco más despacio y con palabras más sencillas por favor?'
              );
            }
          }}
          onReset={handleReset}
        />
      </div>

      {/* Typed Reply Modal */}
      <TypedReplyModal
        isOpen={isTypingOpen}
        onClose={() => setIsTypingOpen(false)}
        onSend={handleSendTyped}
      />
    </div>
  );
};
