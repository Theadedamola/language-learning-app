'use client';

import React from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Subtitles,
  Keyboard,
  Sparkles,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface VoiceControlsProps {
  state: 'idle' | 'connecting' | 'active' | 'closing' | 'ended' | 'failed';
  isMuted: boolean;
  meaningVisible: boolean;
  onToggleStart: () => void;
  onToggleMute: () => void;
  onToggleMeaning: () => void;
  onEnd: () => void;
  onOpenType: () => void;
  onHelp: () => void;
  onReset: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  state,
  isMuted,
  meaningVisible,
  onToggleStart,
  onToggleMute,
  onToggleMeaning,
  onEnd,
  onOpenType,
  onHelp,
  onReset,
}) => {
  const isRunning = state === 'active' || state === 'connecting' || state === 'closing';

  return (
    <div className="flex flex-col items-center space-y-4 pt-2">
      {/* Primary Interaction Buttons Row */}
      <div className="flex items-center justify-center gap-6">
        {/* Toggle Subtitles Button */}
        <button
          onClick={onToggleMeaning}
          title={meaningVisible ? 'Hide English subtitles' : 'Show English subtitles'}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all cursor-pointer ${
            meaningVisible
              ? 'bg-[#FFF0C7] text-[#FF8A4C] shadow-xs'
              : 'bg-white/60 text-[#735B4A] hover:bg-white'
          }`}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <Subtitles className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium">Subtitles</span>
        </button>

        {/* Center Main Mic Action Button */}
        <button
          onClick={isRunning ? onToggleMute : onToggleStart}
          disabled={state === 'connecting' || state === 'closing'}
          title={
            !isRunning
              ? 'Start conversation'
              : isMuted
              ? 'Unmute'
              : 'Mute'
          }
          className="relative group cursor-pointer disabled:opacity-50"
        >
          {/* Subtle pulse effect when active and not muted */}
          {state === 'active' && !isMuted && (
            <div className="absolute -inset-2 rounded-full bg-[#FF8A4C]/25 animate-ping duration-1000" />
          )}

          <div
            className={`w-18 h-18 rounded-full flex items-center justify-center shadow-lg transition-transform transform active:scale-95 duration-200 ${
              state === 'active'
                ? isMuted
                  ? 'bg-amber-100 text-[#735B4A]'
                  : 'bg-gradient-to-tr from-[#FF8A4C] to-[#FFA770] text-white'
                : 'bg-gradient-to-tr from-[#FF8A4C] to-[#FFA770] text-white hover:shadow-xl'
            }`}
          >
            {state === 'connecting' || state === 'closing' ? (
              <Loader2 className="w-7 h-7 animate-spin text-white" />
            ) : isRunning && isMuted ? (
              <MicOff className="w-7 h-7 text-[#735B4A]" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </div>
        </button>

        {/* End / Reset Conversation Button */}
        {isRunning ? (
          <button
            onClick={onEnd}
            title="End conversation"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/60 text-[#735B4A] hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <PhoneOff className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium">End</span>
          </button>
        ) : (
          <button
            onClick={onReset}
            title="Reset conversation"
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/60 text-[#735B4A] hover:bg-white transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium">New</span>
          </button>
        )}
      </div>

      {/* Secondary Actions Row */}
      <div className="flex items-center gap-4 text-xs">
        {state === 'active' && (
          <>
            <button
              onClick={onOpenType}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 text-[#735B4A] hover:bg-white transition-colors cursor-pointer border border-[#FFE3CF]/50"
            >
              <Keyboard className="w-3.5 h-3.5 text-[#FF8A4C]" />
              Type instead of speaking
            </button>
            <button
              onClick={onHelp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 text-[#735B4A] hover:bg-white transition-colors cursor-pointer border border-[#FFE3CF]/50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF8A4C]" />
              A little help
            </button>
          </>
        )}
      </div>
    </div>
  );
};
