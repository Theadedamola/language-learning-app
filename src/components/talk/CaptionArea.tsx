'use client';

import React, { useState } from 'react';
import { Passage } from '@/core/types/models';
import { HelpCircle, X, Sparkles, Loader2 } from 'lucide-react';

interface CaptionAreaProps {
  assistantPassage?: Passage;
  userPassage?: Passage;
  meaning: string;
  meaningVisible: boolean;
  isTranslating: boolean;
  defaultGreeting: string;
  meaningLanguage: string;
  onLookupWord: (word: string, sentence: string) => Promise<string>;
}

export const CaptionArea: React.FC<CaptionAreaProps> = ({
  assistantPassage,
  userPassage,
  meaning,
  meaningVisible,
  isTranslating,
  defaultGreeting,
  onLookupWord,
}) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [glossText, setGlossText] = useState<string | null>(null);
  const [loadingGloss, setLoadingGloss] = useState(false);

  const captionText = assistantPassage?.text || defaultGreeting;

  // Split sentence into words and punctuation while preserving whitespace
  const tokens = captionText.split(/([A-Za-zÁÉÍÓÚáéíóúÑñüÜ]+)/g);

  const handleWordClick = async (rawWord: string) => {
    const cleanWord = rawWord.replace(/[¿¡.,;:!?"'()]/g, '').trim();
    if (!cleanWord || cleanWord.length <= 1) return;

    setSelectedWord(cleanWord);
    setLoadingGloss(true);
    setGlossText(null);

    try {
      const result = await onLookupWord(cleanWord, captionText);
      setGlossText(result);
    } catch {
      setGlossText('Could not get the definition right now.');
    } finally {
      setLoadingGloss(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto text-center space-y-4 px-2">
      {/* Target Language Caption with Interactive Tokens */}
      <div className="relative">
        <p className="text-xl md:text-2xl font-medium tracking-tight text-[#362A22] font-rounded leading-relaxed">
          {tokens.map((token, index) => {
            const isWord = /^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ]+$/.test(token);
            if (!isWord) {
              return <span key={index}>{token}</span>;
            }
            return (
              <button
                key={index}
                onClick={() => handleWordClick(token)}
                title="Click to see meaning in context"
                className="inline-block hover:text-[#FF8A4C] hover:bg-[#FFF0C7]/70 rounded px-1 transition-all cursor-pointer underline decoration-[#FF8A4C]/30 hover:decoration-[#FF8A4C] underline-offset-4"
              >
                {token}
              </button>
            );
          })}
        </p>

        <p className="text-[10px] text-[#735B4A]/50 mt-1">
          (Click any word to see its meaning)
        </p>
      </div>

      {/* Meaning Subtitles (English) */}
      {meaningVisible && (
        <div className="min-h-[24px]">
          {isTranslating ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-[#735B4A]/70 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              Translating subtitle...
            </div>
          ) : meaning ? (
            <p className="text-sm font-normal text-[#735B4A] italic bg-white/40 py-1 px-3 rounded-lg inline-block">
              &ldquo;{meaning}&rdquo;
            </p>
          ) : null}
        </div>
      )}

      {/* User Last Utterance Feedback */}
      {userPassage && (
        <div className="pt-2">
          <p className="text-xs text-[#735B4A]/70">
            <span className="font-semibold text-[#FF8A4C] tracking-wide uppercase mr-1.5">YOU:</span>
            {userPassage.text}
          </p>
        </div>
      )}

      {/* Word Contextual Lookup Popover / Modal */}
      {selectedWord && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl border border-[#FFE3CF] space-y-3 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FFF0C7] flex items-center justify-center text-[#FF8A4C]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-lg text-[#362A22] font-rounded">{selectedWord}</h4>
              </div>
              <button
                onClick={() => setSelectedWord(null)}
                className="w-7 h-7 rounded-full bg-[#FFF8EE] flex items-center justify-center text-[#735B4A] hover:bg-[#FFE3CF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm text-[#735B4A] leading-relaxed">
              {loadingGloss ? (
                <div className="flex items-center gap-2 py-3 text-xs text-[#735B4A]/70">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF8A4C]" />
                  Looking up meaning in context...
                </div>
              ) : (
                <p className="py-1">{glossText}</p>
              )}
            </div>

            <div className="pt-2 border-t border-[#FFE3CF]/50 flex justify-end">
              <button
                onClick={() => setSelectedWord(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#362A22] text-[#FFF8EE] hover:bg-[#FF8A4C] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
