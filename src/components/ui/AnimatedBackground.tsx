'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Pause on tab visibility change to preserve CPU/battery
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
        render(performance.now());
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Dynamic music-reactive particles (champagne, lavender, plum)
    const particleCount = 42;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.8 + 1.2,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.35,
      colorType: Math.floor(Math.random() * 3), // 0: champagne, 1: lavender, 2: plum
      baseAlpha: Math.random() * 0.35 + 0.25,
      pulseSpeed: Math.random() * 0.03 + 0.015,
      phase: Math.random() * Math.PI * 2,
    }));

    let phase = 0;
    let lastTime = performance.now();

    const render = (time: number) => {
      if (!isVisible) return;
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      phase += delta * 0.75;

      ctx.clearRect(0, 0, width, height);
      const isDark = theme === 'dark';

      // 1. Draw flowing translucent spectral ribbons
      const ribbons = [
        {
          freq: 0.0016,
          speed: 1.1,
          amp: 55,
          yRatio: 0.28,
          stroke: isDark ? 'rgba(232, 196, 117, 0.22)' : 'rgba(217, 167, 74, 0.28)', // warm champagne
          lineWidth: 2.2,
        },
        {
          freq: 0.0022,
          speed: 0.85,
          amp: 65,
          yRatio: 0.42,
          stroke: isDark ? 'rgba(153, 83, 196, 0.25)' : 'rgba(124, 60, 163, 0.22)', // plum violet
          lineWidth: 2.8,
        },
        {
          freq: 0.0019,
          speed: 1.35,
          amp: 75,
          yRatio: 0.58,
          stroke: isDark ? 'rgba(196, 176, 215, 0.2)' : 'rgba(165, 139, 189, 0.24)', // muted lavender
          lineWidth: 2.0,
        },
        {
          freq: 0.0028,
          speed: 0.95,
          amp: 45,
          yRatio: 0.75,
          stroke: isDark ? 'rgba(232, 196, 117, 0.18)' : 'rgba(217, 167, 74, 0.2)', // soft amber
          lineWidth: 1.8,
        },
      ];

      for (const r of ribbons) {
        ctx.beginPath();
        ctx.strokeStyle = r.stroke;
        ctx.lineWidth = r.lineWidth;

        const yBase = height * r.yRatio;
        for (let x = 0; x <= width; x += 6) {
          const y = yBase + Math.sin(x * r.freq + phase * r.speed) * r.amp +
            Math.cos(x * (r.freq * 0.5) - phase * 0.4) * (r.amp * 0.4);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 2. Draw soft ambient frequency spectrum along bottom
      const barCount = 36;
      const barWidth = width / barCount;
      for (let i = 0; i < barCount; i++) {
        const barPhase = phase * 1.4 + i * 0.22;
        const barHeight = Math.abs(Math.sin(barPhase) * Math.cos(barPhase * 0.7)) * (height * 0.14) + 12;
        const x = i * barWidth;
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, height, 0, y);
        if (isDark) {
          grad.addColorStop(0, 'rgba(40, 16, 51, 0.35)');
          grad.addColorStop(0.7, 'rgba(124, 60, 163, 0.18)');
          grad.addColorStop(1, 'rgba(232, 196, 117, 0.12)');
        } else {
          grad.addColorStop(0, 'rgba(217, 167, 74, 0.15)');
          grad.addColorStop(0.7, 'rgba(165, 139, 189, 0.18)');
          grad.addColorStop(1, 'rgba(124, 60, 163, 0.08)');
        }

        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
      }

      // 3. Draw floating audio frequency particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        p.phase += p.pulseSpeed;
        const currentAlpha = p.baseAlpha * (0.7 + Math.sin(p.phase) * 0.3);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        let color = '';
        if (p.colorType === 0) {
          // Champagne / Gold
          color = isDark
            ? `rgba(232, 196, 117, ${currentAlpha})`
            : `rgba(217, 167, 74, ${currentAlpha * 0.9})`;
        } else if (p.colorType === 1) {
          // Lavender
          color = isDark
            ? `rgba(196, 176, 215, ${currentAlpha})`
            : `rgba(138, 104, 168, ${currentAlpha * 0.9})`;
        } else {
          // Deep Plum / Violet
          color = isDark
            ? `rgba(153, 83, 196, ${currentAlpha})`
            : `rgba(100, 44, 128, ${currentAlpha * 0.9})`;
        }

        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Cinematic Studio Atmospheric Ambient Orbs */}
      <div className="absolute top-1/6 -left-36 w-[34rem] h-[34rem] rounded-full bg-plum-700/20 dark:bg-plum-800/35 blur-[140px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 -right-36 w-[36rem] h-[36rem] rounded-full bg-champagne-500/15 dark:bg-champagne-400/20 blur-[150px] animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-2/3 left-1/3 w-[30rem] h-[30rem] rounded-full bg-lavender-500/15 dark:bg-plum-600/25 blur-[160px]" />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-90 transition-opacity duration-700"
      />

      {/* Restrained readability gradient overlay that allows the animation to clearly breathe through */}
      <div className="absolute inset-0 bg-gradient-to-b from-cream-50/25 via-transparent to-cream-100/30 dark:from-charcoal-950/35 dark:via-transparent dark:to-charcoal-950/50 pointer-events-none" />
    </div>
  );
}
