'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UsefulPhrase, tokenizePhraseForPuzzle, shuffleTokens, getPhraseMasteryLabel } from '@/core/types/phrase';
import { RecallBars } from '../words/RecallBars';
import { cleanTextForAudioSpeech, getAvailableSpanishVoices } from '@/voice/webSpeechTransport';
import {
  Sparkles,
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  HelpCircle,
  BookOpen,
  Trash2,
  Layers,
  GraduationCap,
  Play,
  Lightbulb,
} from 'lucide-react';

interface QuizViewProps {
  phrases: UsefulPhrase[];
  onUpdateMastery: (id: string, correct: boolean) => Promise<void>;
  onDeletePhrase: (id: string) => Promise<void>;
  deepgramKey?: string;
  deepgramVoice?: string;
}

export const QuizView: React.FC<QuizViewProps> = ({
  phrases,
  onUpdateMastery,
  onDeletePhrase,
  deepgramKey,
  deepgramVoice,
}) => {
  const [activeMode, setActiveMode] = useState<'quiz' | 'bank'>('quiz');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [bankTokens, setBankTokens] = useState<string[]>([]);
  const [status, setStatus] = useState<'answering' | 'correct' | 'incorrect'>('answering');
  const [filter, setFilter] = useState<'all' | 'due' | 'mastered'>('all');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const currentPhrase: UsefulPhrase | undefined = phrases[currentIndex % (phrases.length || 1)];

  // Expected tokens for current phrase
  const targetTokens = useMemo(() => {
    if (!currentPhrase) return [];
    return tokenizePhraseForPuzzle(currentPhrase.phrase);
  }, [currentPhrase]);

  // Reset puzzle whenever current phrase changes
  useEffect(() => {
    if (targetTokens.length > 0) {
      setSelectedTokens([]);
      setBankTokens(shuffleTokens(targetTokens));
      setStatus('answering');
    }
  }, [targetTokens]);

  // Audio playback using Deepgram or Web Speech API
  const playAudio = async (text: string) => {
    if (isPlayingAudio || !text) return;
    setIsPlayingAudio(true);

    const clean = cleanTextForAudioSpeech(text);

    if (deepgramKey) {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: clean,
            voice: deepgramVoice || 'aura-2-diana-es',
            deepgramKey,
          }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            URL.revokeObjectURL(url);
            setIsPlayingAudio(false);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            playBrowserAudio(clean);
          };
          await audio.play();
          return;
        }
      } catch (e) {
        console.warn('Deepgram playback error, falling back to Web Speech:', e);
      }
    }

    playBrowserAudio(clean);
  };

  const playBrowserAudio = (clean: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsPlayingAudio(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-ES';
    utterance.rate = 0.92;

    const voices = getAvailableSpanishVoices();
    const preferred = voices.find((v) => v.name.includes('Paulina') || v.name.includes('Mónica') || v.name.includes('Natural'));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSelectToken = (token: string, bankIndex: number) => {
    if (status !== 'answering') return;
    setSelectedTokens((prev) => [...prev, token]);
    setBankTokens((prev) => prev.filter((_, i) => i !== bankIndex));
  };

  const handleDeselectToken = (token: string, selectedIndex: number) => {
    if (status !== 'answering') return;
    setSelectedTokens((prev) => prev.filter((_, i) => i !== selectedIndex));
    setBankTokens((prev) => [...prev, token]);
  };

  const handleCheckAnswer = async () => {
    if (!currentPhrase || status !== 'answering') return;

    const normalize = (t: string) => t.toLowerCase().trim();
    const isMatch =
      selectedTokens.length === targetTokens.length &&
      selectedTokens.every((t, i) => normalize(t) === normalize(targetTokens[i]));

    if (isMatch) {
      setStatus('correct');
      await onUpdateMastery(currentPhrase.id, true);
      playAudio(currentPhrase.phrase);
    } else {
      setStatus('incorrect');
      await onUpdateMastery(currentPhrase.id, false);
    }
  };

  const handleNext = () => {
    if (phrases.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % phrases.length);
  };

  const handleRetry = () => {
    if (targetTokens.length > 0) {
      setSelectedTokens([]);
      setBankTokens(shuffleTokens(targetTokens));
      setStatus('answering');
    }
  };

  const filteredPhrases = phrases.filter((p) => {
    if (filter === 'due') return p.mastery < 2;
    if (filter === 'mastered') return p.mastery === 3;
    return true;
  });

  if (phrases.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#FFF0C7] flex items-center justify-center text-[#FF8A4C] mx-auto shadow-xs">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#362A22] font-rounded">No phrases saved yet</h3>
        <p className="text-sm text-[#735B4A] max-w-md mx-auto">
          Start a conversation in the <strong>Talk</strong> tab! Sóró will gently correct your mistakes and automatically store useful daily phrases here for you to practice.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header & Mode Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold tracking-wider text-[#735B4A] uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF8A4C]" />
            Conversational Remembrance
          </span>
          <h2 className="text-2xl font-bold text-[#362A22] font-rounded mt-0.5">Useful Phrases Quiz</h2>
        </div>

        <div className="flex items-center gap-1 bg-[#FFE3CF]/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveMode('quiz')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeMode === 'quiz'
                ? 'bg-white text-[#362A22] shadow-xs'
                : 'text-[#735B4A] hover:text-[#362A22]'
            }`}
          >
            Quiz Mode
          </button>
          <button
            onClick={() => setActiveMode('bank')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activeMode === 'bank'
                ? 'bg-white text-[#362A22] shadow-xs'
                : 'text-[#735B4A] hover:text-[#362A22]'
            }`}
          >
            <span>Phrase Bank</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FFF0C7] text-[#FF8A4C] font-bold">
              {phrases.length}
            </span>
          </button>
        </div>
      </div>

      {activeMode === 'quiz' && currentPhrase && (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#FFE3CF] shadow-sm space-y-6">
          {/* Card Meta & Progress */}
          <div className="flex items-center justify-between border-b border-[#FFE3CF]/50 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFE3CF]/60 text-[#735B4A]">
                {currentPhrase.context}
              </span>
              {currentPhrase.originalSaid && (
                <span className="text-[11px] font-medium text-[#FF8A4C] bg-[#FFF0C7]/80 px-2 py-0.5 rounded-md">
                  Corrected from conversation
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#735B4A] font-medium">
                Phrase {(currentIndex % phrases.length) + 1} of {phrases.length}
              </span>
              <RecallBars count={currentPhrase.mastery} size="sm" />
            </div>
          </div>

          {/* Meaning Prompt in English */}
          <div className="text-center space-y-1 py-2">
            <span className="text-xs font-bold text-[#735B4A]/70 uppercase tracking-wider">
              How do you say in Spanish:
            </span>
            <h3 className="text-2xl font-bold text-[#362A22] font-rounded">
              &ldquo;{currentPhrase.translation}&rdquo;
            </h3>
            {currentPhrase.originalSaid && (
              <p className="text-xs text-[#735B4A]/60 italic mt-1">
                You previously said: <span className="line-through text-red-500/80">&ldquo;{currentPhrase.originalSaid}&rdquo;</span>
              </p>
            )}
          </div>

          {/* Answer Drop / Construction Line */}
          <div className="min-h-[68px] p-3 rounded-2xl bg-[#FFF8EE]/80 border-2 border-dashed border-[#FFE3CF] flex flex-wrap items-center justify-center gap-2 transition-all">
            {selectedTokens.length === 0 ? (
              <span className="text-xs text-[#735B4A]/40 font-medium">
                Tap words below in the correct order
              </span>
            ) : (
              selectedTokens.map((token, i) => (
                <button
                  key={`${token}_${i}`}
                  onClick={() => handleDeselectToken(token, i)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#362A22] text-[#FFF8EE] font-medium text-sm shadow-xs hover:bg-[#FF8A4C] transition-all cursor-pointer animate-in zoom-in-95 duration-150"
                >
                  {token}
                </button>
              ))
            )}
          </div>

          {/* Word Bank Choices */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 min-h-[50px]">
            {bankTokens.map((token, i) => (
              <button
                key={`${token}_${i}`}
                onClick={() => handleSelectToken(token, i)}
                className="px-3.5 py-1.5 rounded-xl bg-white border border-[#FFE3CF] text-[#362A22] font-semibold text-sm shadow-xs hover:border-[#FF8A4C] hover:text-[#FF8A4C] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                {token}
              </button>
            ))}
          </div>

          {/* Result Feedback Banner */}
          {status === 'correct' && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>¡Exacto! Excellent sentence recall</span>
                </div>
                <button
                  onClick={() => playAudio(currentPhrase.phrase)}
                  title="Listen to phrase"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen</span>
                </button>
              </div>
              <p className="text-base font-semibold text-emerald-950 font-rounded">
                {currentPhrase.phrase}
              </p>
              {currentPhrase.explanation && (
                <div className="flex items-start gap-1.5 text-xs text-emerald-700 pt-1 border-t border-emerald-200/50">
                  <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                  <span>{currentPhrase.explanation}</span>
                </div>
              )}
            </div>
          )}

          {status === 'incorrect' && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                <XCircle className="w-5 h-5 text-red-600" />
                <span>Not quite — here is the correct phrase:</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-red-950 font-rounded">
                  {currentPhrase.phrase}
                </p>
                <button
                  onClick={() => playAudio(currentPhrase.phrase)}
                  title="Listen to phrase"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen</span>
                </button>
              </div>
              {currentPhrase.explanation && (
                <p className="text-xs text-red-700/90 pt-1 border-t border-red-200/50">
                  Tip: {currentPhrase.explanation}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleRetry}
              disabled={status === 'answering' && selectedTokens.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#735B4A] hover:bg-[#FFE3CF]/50 transition-colors cursor-pointer disabled:opacity-30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            {status === 'answering' ? (
              <button
                onClick={handleCheckAnswer}
                disabled={selectedTokens.length === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#362A22] text-[#FFF8EE] text-sm font-semibold hover:bg-[#FF8A4C] transition-all cursor-pointer shadow-xs disabled:opacity-40"
              >
                <span>Check Answer</span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF8A4C] text-white text-sm font-semibold hover:bg-[#FF752A] transition-all cursor-pointer shadow-sm"
              >
                <span>Next Phrase</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Phrase Bank Mode */}
      {activeMode === 'bank' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-[#362A22] text-[#FFF8EE]'
                    : 'bg-white/60 text-[#735B4A] hover:bg-white'
                }`}
              >
                All ({phrases.length})
              </button>
              <button
                onClick={() => setFilter('due')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'due'
                    ? 'bg-[#362A22] text-[#FFF8EE]'
                    : 'bg-white/60 text-[#735B4A] hover:bg-white'
                }`}
              >
                Needs Review ({phrases.filter((p) => p.mastery < 2).length})
              </button>
              <button
                onClick={() => setFilter('mastered')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  filter === 'mastered'
                    ? 'bg-[#362A22] text-[#FFF8EE]'
                    : 'bg-white/60 text-[#735B4A] hover:bg-white'
                }`}
              >
                Mastered ({phrases.filter((p) => p.mastery === 3).length})
              </button>
            </div>

            <button
              onClick={() => setActiveMode('quiz')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF8A4C] text-white text-xs font-semibold hover:bg-[#FF752A] transition-colors cursor-pointer shadow-2xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Practice Now</span>
            </button>
          </div>

          <div className="space-y-3">
            {filteredPhrases.map((phrase) => (
              <div
                key={phrase.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-[#FFE3CF]/70 shadow-2xs hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-[#362A22] font-rounded">
                        {phrase.phrase}
                      </h4>
                      <button
                        onClick={() => playAudio(phrase.phrase)}
                        title="Listen"
                        className="w-7 h-7 rounded-lg bg-[#FFF0C7] flex items-center justify-center text-[#FF8A4C] hover:bg-[#FFE3CF] transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-[#735B4A]">{phrase.translation}</p>
                    {phrase.originalSaid && (
                      <p className="text-xs text-[#735B4A]/60 italic">
                        Learner original: <span className="line-through">{phrase.originalSaid}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <RecallBars count={phrase.mastery} size="md" />
                    <span className="text-[11px] font-medium text-[#735B4A]">
                      {getPhraseMasteryLabel(phrase.mastery)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#FFE3CF]/40 flex items-center justify-between text-xs text-[#735B4A]/70">
                  <span className="font-medium bg-[#FFE3CF]/50 px-2 py-0.5 rounded-md">
                    {phrase.context}
                  </span>

                  <button
                    onClick={() => onDeletePhrase(phrase.id)}
                    title="Remove from phrase bank"
                    className="text-[#735B4A]/40 hover:text-red-500 p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
