'use client';

import React from 'react';

interface RecallBarsProps {
  count: number; // 0 to 3
  size?: 'sm' | 'md';
}

export const RecallBars: React.FC<RecallBarsProps> = ({ count, size = 'md' }) => {
  const clamped = Math.min(3, Math.max(0, count));

  const width = size === 'sm' ? 'w-3.5 h-1.5' : 'w-5 h-2';

  return (
    <div className="flex items-center gap-1" title={`${clamped} de 3 barras de recuerdo`}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`rounded-full transition-colors duration-300 ${width} ${
            index < clamped ? 'bg-[#FF8A4C]' : 'bg-[#FFE3CF]'
          }`}
        />
      ))}
    </div>
  );
};
