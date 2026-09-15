'use client';

import React from 'react';
import { Sliders, Mic, Sparkles, BookOpen } from 'lucide-react';

interface HeaderProps {
  activeTab: 'talk' | 'themes' | 'words' | 'quiz';
  onTabChange: (tab: 'talk' | 'themes' | 'words' | 'quiz') => void;
  onOpenSettings: () => void;
  wordCount: number;
  phraseCount?: number;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
  wordCount,
  phraseCount = 0,
  hasApiKey,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FFF8EE]/90 backdrop-blur-md border-b border-[#FFE3CF]/50 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('talk')}>
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#FF8A4C] to-[#FFF0C7] shadow-xs" />
          <h1 className="text-2xl font-black text-[#362A22] font-rounded tracking-tight lowercase">
            sóró
          </h1>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#FFE3CF]/40 p-1 rounded-2xl border border-[#FFE3CF]/50">
          <button
            onClick={() => onTabChange('talk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'talk'
                ? 'bg-white text-[#362A22] shadow-xs'
                : 'text-[#735B4A] hover:text-[#362A22]'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-[#FF8A4C]" />
            <span>Talk</span>
          </button>

          <button
            onClick={() => onTabChange('themes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'themes'
                ? 'bg-white text-[#362A22] shadow-xs'
                : 'text-[#735B4A] hover:text-[#362A22]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF8A4C]" />
            <span>Themes</span>
          </button>

          <button
            onClick={() => onTabChange('words')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'words'
                ? 'bg-white text-[#362A22] shadow-xs'
                : 'text-[#735B4A] hover:text-[#362A22]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF8A4C]" />
            <span>Words</span>
            {wordCount > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[#FFF0C7] text-[#FF8A4C] font-bold">
                {wordCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('quiz')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-white text-[#362A22] shadow-xs'
                : 'text-[#735B4A] hover:text-[#362A22]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Quiz</span>
            {phraseCount > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[#EAECD6] text-[#5A7A3A] font-bold">
                {phraseCount}
              </span>
            )}
          </button>
        </nav>

        {/* Settings Action */}
        <button
          onClick={onOpenSettings}
          title="Settings & API Keys"
          className="relative w-9 h-9 rounded-xl bg-white/80 border border-[#FFE3CF] flex items-center justify-center text-[#735B4A] hover:bg-white hover:text-[#362A22] transition-colors cursor-pointer shadow-2xs"
        >
          <Sliders className="w-4 h-4" />
          {!hasApiKey && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FF8A4C] ring-2 ring-white" />
          )}
        </button>
      </div>
    </header>
  );
};
