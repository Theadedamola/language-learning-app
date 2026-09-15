'use client';

import React, { useEffect, useRef } from 'react';

interface MuralOrbProps {
  energy: number; // 0.0 to 1.0 (combined energy)
  listening: boolean;
  active: boolean;
  size?: number;
}

export const MuralOrb: React.FC<MuralOrbProps> = ({ energy, listening, active, size = 220 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina display resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // Advance oscillation phase
      phaseRef.current += 0.025;
      const phase = phaseRef.current;
      const e = Math.min(1, Math.max(0, energy));

      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = (size * 0.38) * (1 + e * 0.12);

      // 1. Outer ambient glow
      const ambientGlow = ctx.createRadialGradient(cx, cy, baseRadius * 0.8, cx, cy, baseRadius * 1.4);
      ambientGlow.addColorStop(0, listening ? 'rgba(255, 138, 76, 0.28)' : 'rgba(255, 180, 120, 0.15)');
      ambientGlow.addColorStop(1, 'rgba(255, 240, 200, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // 2. Liquid Glass Blob Path with 12 harmonic control points
      const numPoints = 12;
      const points: Array<{ x: number; y: number }> = [];

      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const wave =
          Math.sin(angle * 3 + phase) * 0.025 +
          Math.cos(angle * 2 - phase * 0.7) * (0.015 + e * 0.04);
        const r = baseRadius * (1 + wave);
        points.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        });
      }

      ctx.save();
      ctx.beginPath();
      const firstMid = {
        x: (points[numPoints - 1].x + points[0].x) / 2,
        y: (points[numPoints - 1].y + points[0].y) / 2,
      };
      ctx.moveTo(firstMid.x, firstMid.y);

      for (let i = 0; i < numPoints; i++) {
        const current = points[i];
        const next = points[(i + 1) % numPoints];
        const mid = { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2 };
        ctx.quadraticCurveTo(current.x, current.y, mid.x, mid.y);
      }
      ctx.closePath();

      // 3. Main Orb Multi-Stop Liquid Gradient
      const orbGrad = ctx.createRadialGradient(
        cx - baseRadius * 0.35,
        cy - baseRadius * 0.35,
        baseRadius * 0.1,
        cx,
        cy,
        baseRadius * 1.15
      );
      orbGrad.addColorStop(0, '#FFF6E0'); // warm butter
      orbGrad.addColorStop(0.25, '#FFD3B0'); // soft peach
      orbGrad.addColorStop(0.55, '#FF8A4C'); // warm signature orange
      orbGrad.addColorStop(0.85, '#E56F34'); // deep amber
      orbGrad.addColorStop(1, '#D982BF'); // subtle lilac edge reflection

      ctx.fillStyle = orbGrad;
      ctx.fill();

      // 4. Soft inner glass light (top left highlight)
      const highlightGrad = ctx.createRadialGradient(
        cx - baseRadius * 0.4,
        cy - baseRadius * 0.45,
        2,
        cx - baseRadius * 0.35,
        cy - baseRadius * 0.35,
        baseRadius * 0.55
      );
      highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
      highlightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
      highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGrad;
      ctx.fill();

      // 5. Specular reflective rim
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.stroke();

      ctx.restore();

      // 6. Orbital listening halo rings if currently listening
      if (listening && active) {
        ctx.save();
        ctx.beginPath();
        const haloRadius = baseRadius * (1.18 + Math.sin(phase * 1.2) * 0.04 + e * 0.08);
        ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 138, 76, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [energy, listening, active, size]);

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="transition-transform duration-300 ease-out drop-shadow-xl"
      />
    </div>
  );
};
