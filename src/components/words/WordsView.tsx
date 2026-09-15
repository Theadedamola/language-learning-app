'use client';

import React, { useState } from 'react';
import { LearnerState, getWordExplanation, getWordLabel } from '@/core/types/vocabulary';
import { RecallBars } from './RecallBars';
import { BookOpen, Sparkles, CheckCircle2, Clock, Search } from 'lucide-react';

interface WordsViewProps {
  learner: LearnerState;
}

export const WordsView: React.FC<WordsViewProps> = ({ learner }) => {
  const [filter, setFilter] = useState<'all' | 'due' | 'mastered'>('all');
  const [search, setSearch] = useState('');

  const now = Date.now();

  const filteredWords = learner.words.filter((word) => {
    const matchesSearch =
      word.lemma.toLowerCase().includes(search.toLowerCase()) ||
      word.meaning.toLowerCase().includes(search.toLowerCase()) ||
      word.form.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'due') {
      return new Date(word.dueAt).getTime() <= now;
    }
    if (filter === 'mastered') {
      return word.bars === 3;
    }
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Overview Card */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-[#FFE3CF]/60 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider text-[#735B4A] uppercase">Your Spanish Progress</span>
            <h2 className="text-2xl font-bold text-[#362A22] font-rounded">Challenge Level {learner.challenge}/5</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#FFF0C7] flex items-center justify-center text-[#FF8A4C]">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <p className="text-sm text-[#735B4A] leading-relaxed">
          {learner.nextGoal || 'Keep chatting so Sóró can adapt the level to your responses.'}
        </p>

        {learner.capabilities.length > 0 && (
          <div className="pt-2 border-t border-[#FFE3CF]/40">
            <span className="text-xs font-medium text-[#735B4A]">Demonstrated Skills:</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {learner.capabilities.map((cap, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#EAECD6] text-[#362A22]"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#5A7A3A]" />
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#735B4A]/60" />
          <input
            type="text"
            placeholder="Search words..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white/70 border border-[#FFE3CF] focus:outline-none focus:ring-2 focus:ring-[#FF8A4C]/40 text-[#362A22]"
          />
        </div>

        <div className="flex gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#362A22] text-[#FFF8EE]'
                : 'bg-white/60 text-[#735B4A] hover:bg-white/90'
            }`}
          >
            All ({learner.words.length})
          </button>
          <button
            onClick={() => setFilter('due')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === 'due'
                ? 'bg-[#362A22] text-[#FFF8EE]'
                : 'bg-white/60 text-[#735B4A] hover:bg-white/90'
            }`}
          >
            Due for Review
          </button>
          <button
            onClick={() => setFilter('mastered')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filter === 'mastered'
                ? 'bg-[#362A22] text-[#FFF8EE]'
                : 'bg-white/60 text-[#735B4A] hover:bg-white/90'
            }`}
          >
            Mastered
          </button>
        </div>
      </div>

      {/* Words List */}
      <div className="space-y-3">
        {filteredWords.length === 0 ? (
          <div className="text-center py-12 bg-white/40 rounded-2xl border border-dashed border-[#FFE3CF]">
            <BookOpen className="w-8 h-8 mx-auto text-[#735B4A]/50 mb-2" />
            <p className="text-sm text-[#735B4A]">
              {search
                ? 'No words found for that search.'
                : 'No words recorded yet. Start a conversation to learn new expressions!'}
            </p>
          </div>
        ) : (
          filteredWords.map((word) => {
            const isDue = new Date(word.dueAt).getTime() <= now;
            return (
              <div
                key={word.id}
                className="bg-white/85 backdrop-blur-sm rounded-xl p-4 border border-[#FFE3CF]/60 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base text-[#362A22] font-rounded">{word.lemma}</h3>
                      <span className="text-xs text-[#735B4A]/70">({word.form})</span>
                      {isDue && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-[#FFE3CF] text-[#FF8A4C]">
                          <Clock className="w-2.5 h-2.5" /> Review
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#735B4A] mt-0.5">{word.meaning}</p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <RecallBars count={word.bars} size="md" />
                    <span className="text-[11px] font-medium text-[#735B4A]">
                      {getWordLabel(word.bars)}
                    </span>
                  </div>
                </div>

                {word.example && (
                  <div className="mt-3 pt-2.5 border-t border-[#FFE3CF]/30">
                    <p className="text-xs text-[#735B4A]/80 italic">
                      &ldquo;{word.example}&rdquo;
                    </p>
                    <p className="text-[11px] text-[#735B4A]/60 mt-1">
                      {getWordExplanation(word)}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
