'use client';

import React from 'react';
import { ConversationTheme, spanishModule } from '@/core/teaching/spanish';
import {
  Coffee,
  ShoppingBasket,
  Utensils,
  Train,
  MessageCircle,
  MapPin,
  Film,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface ThemesViewProps {
  selectedTheme: ConversationTheme | null;
  onSelectTheme: (theme: ConversationTheme) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  Coffee: <Coffee className="w-5 h-5" />,
  ShoppingBasket: <ShoppingBasket className="w-5 h-5" />,
  Utensils: <Utensils className="w-5 h-5" />,
  Train: <Train className="w-5 h-5" />,
  MessageCircle: <MessageCircle className="w-5 h-5" />,
  MapPin: <MapPin className="w-5 h-5" />,
  Film: <Film className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
};

export const ThemesView: React.FC<ThemesViewProps> = ({ selectedTheme, onSelectTheme }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <span className="text-xs font-semibold tracking-wider text-[#735B4A] uppercase">Cultural Scenarios</span>
        <h2 className="text-2xl font-bold text-[#362A22] font-rounded mt-1">Choose a Conversation Topic</h2>
        <p className="text-sm text-[#735B4A] mt-1">
          Immerse yourself in everyday situations with authentic context from Spain and the Spanish-speaking world.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {spanishModule.themes.map((theme) => {
          const isSelected = selectedTheme?.id === theme.id;
          return (
            <div
              key={theme.id}
              onClick={() => onSelectTheme(theme)}
              className={`group cursor-pointer rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-[#FF8A4C] ring-2 ring-[#FF8A4C]/30 shadow-md'
                  : 'bg-white/80 border-[#FFE3CF]/70 hover:bg-white hover:border-[#FF8A4C]/50 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF0C7] flex items-center justify-center text-[#FF8A4C] group-hover:scale-105 transition-transform">
                    {iconMap[theme.icon] || <Sparkles className="w-5 h-5" />}
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-[#FFE3CF]/60 text-[#735B4A]">
                    Level {theme.recommendedLevel}+
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#362A22] font-rounded mt-3 group-hover:text-[#FF8A4C] transition-colors">
                  {theme.title}
                </h3>
                <p className="text-xs font-medium text-[#735B4A]/80">{theme.subtitle}</p>

                <p className="text-xs text-[#735B4A] mt-2.5 leading-relaxed line-clamp-3">
                  {theme.situation}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#FFE3CF]/30 flex items-center justify-between text-xs font-medium text-[#FF8A4C]">
                <span>{isSelected ? 'Theme selected' : 'Chat about this'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
