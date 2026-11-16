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

    // Subtle floating sound particles
    const particles = Array.from({ length: 32 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.25 + 0.1,
    }));

    let phase = 0;
    let lastTime = performance.now();

    const render = (time: number) => {
      if (!isVisible) return;
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      phase += delta * 0.6;

      ctx.clearRect(0, 0, width, height);

      const isDark = theme === 'dark';

      // 1. Draw subtle harmonic sine waveforms
      const waveCount = 2;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const baseColor = isDark
          ? w === 0
            ? 'rgba(59, 130, 246, 0.04)' // subtle blue
            : 'rgba(139, 92, 246, 0.035)' // subtle violet
          : w === 0
          ? 'rgba(59, 130, 246, 0.05)'
          : 'rgba(139, 92, 246, 0.04)';

        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 2.5;

        const freq = 0.0018 + w * 0.0008;
        const amp = 35 + w * 20;
        const yOffset = height * (0.35 + w * 0.25);

        for (let x = 0; x <= width; x += 8) {
          const y = yOffset + Math.sin(x * freq + phase + w * 1.5) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 2. Draw ambient particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(6, 182, 212, ${p.alpha * 0.7})`
          : `rgba(99, 102, 241, ${p.alpha * 0.6})`;
        ctx.fill();
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
      {/* Studio Ambient Glow Lights */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-studio-blue/10 dark:bg-studio-blue/15 blur-[120px]" />
      <div className="absolute bottom-1/3 -right-32 w-96 h-96 rounded-full bg-studio-violet/10 dark:bg-studio-violet/15 blur-[120px]" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-80 transition-opacity duration-500"
      />
    </div>
  );
}

