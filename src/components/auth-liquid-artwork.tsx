"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useState } from "react";

export function AuthLiquidArtwork() {
  const [ripple, setRipple] = useState({ id: 0, x: 50, y: 50 });

  const disturbSurface = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setRipple({
      id: Date.now(),
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  };

  return (
    <section
      onPointerDown={disturbSurface}
      className="group relative hidden h-full min-h-0 cursor-crosshair touch-none overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#090a09] lg:block"
      aria-label="Interactive liquid tile artwork. Click anywhere to create a ripple."
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div className="absolute -left-24 -top-20 size-[32rem] rounded-full bg-lime-400/20 blur-[110px]" />
      <div className="absolute -bottom-32 right-0 size-[34rem] rounded-full bg-emerald-300/15 blur-[120px]" />

      <div className="absolute inset-[7%] grid grid-cols-6 grid-rows-6 gap-2 opacity-90">
        {Array.from({ length: 36 }, (_, index) => {
          const column = index % 6;
          const row = Math.floor(index / 6);
          const tileX = ((column + 0.5) / 6) * 100;
          const tileY = ((row + 0.5) / 6) * 100;
          const distance = Math.hypot(tileX - ripple.x, tileY - ripple.y);
          const style = ripple.id
            ? ({ animationDelay: `${Math.min(distance * 3.5, 260)}ms` } as CSSProperties)
            : undefined;

          return (
            <span
              key={`${index}-${ripple.id}`}
              style={style}
              className={`${ripple.id ? "auth-liquid-tile " : ""}rounded-sm border border-white/[0.04] ${
                index % 9 === 0
                  ? "bg-lime-300/45"
                  : index % 5 === 0
                    ? "bg-emerald-300/25"
                    : index % 3 === 0
                      ? "bg-white/[0.08]"
                      : "bg-black/25"
              }`}
            />
          );
        })}
      </div>

      {ripple.id > 0 && (
        <span
          key={ripple.id}
          aria-hidden="true"
          className="auth-liquid-ripple pointer-events-none absolute size-10 rounded-full border border-lime-100/70"
          style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
        />
      )}

      <style>{`
        .auth-liquid-tile { animation: auth-liquid-tile 920ms cubic-bezier(.2,.72,.2,1) both; transform-origin:center; }
        .auth-liquid-ripple { animation: auth-liquid-ripple 1.15s ease-out forwards; box-shadow:0 0 28px rgba(190,242,100,.28),inset 0 0 18px rgba(255,255,255,.2); }
        @keyframes auth-liquid-tile { 0% { transform:translateY(0) scale(1); filter:brightness(1); } 34% { transform:translateY(-13px) scale(1.045); filter:brightness(1.42); } 68% { transform:translateY(5px) scale(.985); } 100% { transform:translateY(0) scale(1); filter:brightness(1); } }
        @keyframes auth-liquid-ripple { 0% { opacity:.9; transform:translate(-50%,-50%) scale(.2); } 100% { opacity:0; transform:translate(-50%,-50%) scale(18); } }
        @media (prefers-reduced-motion:reduce) { .auth-liquid-tile,.auth-liquid-ripple { animation:none; } }
      `}</style>
    </section>
  );
}
