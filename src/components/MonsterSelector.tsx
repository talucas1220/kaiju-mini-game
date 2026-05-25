/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { MONSTERS } from '../data';
import { MonsterTypeId } from '../types';
import { audio } from '../utils/audio';

interface MonsterSelectorProps {
  onSelect: (monsterId: MonsterTypeId) => void;
  onBack: () => void;
  dnaPoints: number;
}

// Draw beautiful smooth vector icons instead of pixel grids to match the sleek design theme!
const drawVectorMonsterIcon = (ctx: CanvasRenderingContext2D, id: MonsterTypeId, w: number, h: number, frame: number) => {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.translate(w / 2, h / 2);
  const rad = Math.min(w, h) * 0.42;

  if (id === 'reptile') {
    // 🦎 REPTILE: Deep scaly green biological monster profile
    ctx.fillStyle = '#059669';
    ctx.strokeStyle = '#064e3b';
    ctx.lineWidth = Math.max(1.5, w * 0.04);
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Belly Accent
    ctx.fillStyle = '#fdf0d5';
    ctx.beginPath();
    ctx.ellipse(rad * 0.3, rad * 0.1, rad * 0.5, rad * 0.75, Math.PI * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Spinal Ridges
    ctx.fillStyle = '#f59e0b';
    const spikesCount = 3;
    for (let s = 0; s < spikesCount; s++) {
      const sx = -rad * 0.85 + (s * rad * 0.45);
      const sy = -rad * 0.45;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - rad * 0.18, sy - rad * 0.35);
      ctx.lineTo(sx + rad * 0.15, sy - rad * 0.2);
      ctx.closePath();
      ctx.fill();
    }

    // Glowing Eye
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(rad * 0.42, -rad * 0.3, rad * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'gorilla') {
    // 🦍 GORILLA: A technical cyber-mecha titanium visor profile
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = Math.max(1.5, w * 0.04);
    ctx.beginPath();
    ctx.roundRect(-rad * 0.95, -rad * 0.95, rad * 1.9, rad * 1.9, w * 0.12);
    ctx.fill();
    ctx.stroke();

    // Glowing Energy Core
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.ellipse(0, rad * 0.25, rad * 0.4, rad * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cyan visor light plate
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-rad * 0.65, -rad * 0.65, rad * 1.3, rad * 0.26);
  } else {
    // 🧪 SLIME: Gooey metabolizing slime profile
    ctx.fillStyle = '#9d174d';
    ctx.strokeStyle = '#4c0519';
    ctx.lineWidth = Math.max(1.5, w * 0.04);
    
    ctx.beginPath();
    const dotsCount = 10;
    for (let i = 0; i < dotsCount; i++) {
      const angle = (i / dotsCount) * Math.PI * 2;
      const r = rad * (0.95 + Math.cos(frame * 0.15 + i * 1.3) * 0.08);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Green translucent internal core
    ctx.fillStyle = '#22c55e6a';
    ctx.beginPath();
    ctx.arc(0, 0, rad * 0.48, 0, Math.PI * 2);
    ctx.fill();

    // Glowing red nuclei parts
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(-rad * 0.18, -rad * 0.15, rad * 0.13, 0, Math.PI * 2);
    ctx.arc(rad * 0.28, rad * 0.15, rad * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

export const MonsterSelector: React.FC<MonsterSelectorProps> = ({ onSelect, onBack, dnaPoints }) => {
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const selectedMonster = MONSTERS[selectedIdx];
  const canvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    // Draw beautiful vector previews for the selections
    MONSTERS.forEach((monster, mIdx) => {
      const canvas = canvasesRef.current[mIdx];
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      drawVectorMonsterIcon(ctx, monster.id, canvas.width, canvas.height, 0);
    });
  }, [selectedIdx]);

  const handleSelect = () => {
    audio.playGrow();
    onSelect(selectedMonster.id);
  };

  const handleNext = () => {
    audio.playSelect();
    setSelectedIdx((prev) => (prev + 1) % MONSTERS.length);
  };

  const handlePrev = () => {
    audio.playSelect();
    setSelectedIdx((prev) => (prev - 1 + MONSTERS.length) % MONSTERS.length);
  };

  return (
    <div className="flex flex-col items-center justify-between text-slate-100 max-w-4xl mx-auto p-5 md:p-8 min-h-[600px] bg-[#0F172A]/90 border border-[#334155] rounded-xl shadow-2xl relative overflow-hidden">
      {/* Absolute scanline layout */}
      <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.02]"></div>
      
      {/* Header */}
      <div className="w-full flex justify-between items-center border-b border-slate-800/80 pb-4 mb-4 z-10">
        <div>
          <h2 className="text-2xl font-sans tracking-tight font-black text-amber-500 uppercase">
            MUTATION LAB SELECTION
          </h2>
          <p className="text-xs font-mono text-slate-400">SELECT YOUR URBAN APOCALYPSE INCUBATOR</p>
        </div>
        <div className="bg-[#0f172a]/95 border border-[#334155] px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm text-yellow-400">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
          <span className="text-xs font-mono font-bold">{dnaPoints} DNA</span>
        </div>
      </div>

      {/* Selector Area Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full items-center my-auto z-10">
        {/* Left column: List / Previews */}
        <div className="md:col-span-12 lg:col-span-5 flex flex-col gap-2.5">
          {MONSTERS.map((monster, idx) => {
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={monster.id}
                onClick={() => {
                  audio.playSelect();
                  setSelectedIdx(idx);
                }}
                className={`flex items-center gap-4 p-3.5 border rounded-xl transition-all duration-200 text-left cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/80 border-[#4ADE80] shadow-md shadow-[#4ADE80]/15 translate-x-1.5'
                    : 'bg-[#0F172A]/50 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-800/30'
                }`}
              >
                <div 
                  className="w-12 h-12 bg-slate-900/90 border rounded-lg p-1 flex items-center justify-center overflow-hidden shrink-0"
                  style={{ borderColor: isSelected ? monster.color : '#334155' }}
                >
                  <canvas
                    ref={(el) => {
                      canvasesRef.current[idx] = el;
                    }}
                    width={48}
                    height={48}
                    className="w-full h-full pixelated"
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-mono text-slate-500 font-bold">
                    {monster.codename}
                  </div>
                  <div className="text-base font-sans font-bold text-slate-100 truncate">
                    {monster.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right column: Main Showcase screen */}
        <div className="md:col-span-12 lg:col-span-7 bg-[#0F172A]/70 border border-slate-800 rounded-xl p-6 relative flex flex-col gap-4 shadow-lg min-h-[400px]">
          {/* LED / Screen Status indicators */}
          <div className="flex justify-between items-center text-xs font-mono text-slate-500 uppercase border-b border-slate-800 pb-2">
            <span>COMMAND STATE: ONLINE</span>
            <span style={{ color: selectedMonster.color }} className="font-bold">KAIJU-{selectedMonster.id.toUpperCase()} ENCRYPTED</span>
          </div>

          {/* Large showcase canvas preview */}
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div 
              className="w-32 h-32 bg-slate-900/95 border rounded-xl flex items-center justify-center p-2 relative shadow-inner overflow-hidden flex-shrink-0"
              style={{ borderColor: selectedMonster.color }}
            >
              {/* Scanline inside canvas box */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent animate-pulse pointer-events-none"></div>
              
              <canvas
                width={120}
                height={120}
                className="w-full h-full"
                ref={(el) => {
                  // Link currently active canvas preview with the renderer
                  if (el) {
                    const ctx = el.getContext('2d');
                    if (ctx) {
                      drawVectorMonsterIcon(ctx, selectedMonster.id, el.width, el.height, 0);
                    }
                  }
                }}
              />
            </div>

            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-2xl font-black text-slate-100 font-sans tracking-tight uppercase">
                {selectedMonster.name}
              </span>
              <span className="text-xs font-mono font-bold bg-[#0F172A] px-2.5 py-0.5 rounded text-amber-500 inline-block self-start border border-slate-800">
                {selectedMonster.codename}
              </span>
              <p className="text-xs text-slate-400 font-sans leading-relaxed line-clamp-4">
                {selectedMonster.description}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-slate-800 pt-3">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Durability</div>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-sm transition-all"
                    style={{
                      backgroundColor:
                        i < (selectedMonster.baseHealth > 150 ? 5 : selectedMonster.baseHealth >= 150 ? 4 : 3)
                          ? selectedMonster.color
                          : '#1e293b',
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Locomotion</div>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-sm transition-all"
                    style={{
                      backgroundColor:
                        i < (selectedMonster.baseSpeed > 4.5 ? 5 : selectedMonster.baseSpeed >= 3.5 ? 4 : 2)
                          ? selectedMonster.color
                          : '#1e293b',
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Claw / Force</div>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-sm transition-all"
                    style={{
                      backgroundColor:
                        i < (selectedMonster.baseMelee > 22 ? 5 : selectedMonster.baseMelee >= 18 ? 4 : 3)
                          ? selectedMonster.color
                          : '#1e293b',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Special Ability Card */}
          <div className="bg-[#0F172A] border border-slate-850 p-3.5 rounded-lg flex gap-3 text-xs items-start">
            <span className="text-xl shrink-0 p-1 select-none">🔥</span>
            <div>
              <span className="font-bold text-slate-100 uppercase block font-mono tracking-wider">
                {selectedMonster.specialName}
              </span>
              <span className="text-slate-400 font-sans leading-normal block mt-1">
                {selectedMonster.specialDescription}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="w-full mt-6 pt-4 border-t border-slate-800/80 flex justify-between gap-4 z-10">
        <button
          onClick={onBack}
          className="px-5 py-2 border border-slate-700 bg-slate-900/40 hover:bg-slate-800 active:scale-95 transition-all rounded-lg font-mono text-xs uppercase tracking-wider text-slate-300 hover:text-white cursor-pointer"
        >
          &lt; BASE LABS
        </button>

        <div className="flex gap-2 items-center md:hidden">
          <button
            onClick={handlePrev}
            className="w-10 h-10 border border-slate-700 rounded-lg bg-slate-800 hover:bg-slate-750 flex items-center justify-center font-bold text-slate-300"
          >
            ←
          </button>
          <button
            onClick={handleNext}
            className="w-10 h-10 border border-slate-700 rounded-lg bg-slate-800 hover:bg-slate-750 flex items-center justify-center font-bold text-slate-300"
          >
            →
          </button>
        </div>

        <button
          onClick={handleSelect}
          style={{
            borderColor: selectedMonster.color,
            boxShadow: `0 0 15px ${selectedMonster.color}35`,
          }}
          className="px-6 py-2 border bg-slate-950 font-mono text-xs font-bold uppercase text-white hover:brightness-110 active:brightness-95 transition-all rounded-lg active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          INCUBATE & RELEASE ⚡
        </button>
      </div>
    </div>
  );
};
