/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameUpgrade } from '../types';
import { audio } from '../utils/audio';
import { Heart, Zap, Scissors, Flame, ArrowRight } from 'lucide-react';

interface UpgradePanelProps {
  upgrades: GameUpgrade[];
  dnaPoints: number;
  onUpgrade: (upgradeId: string, cost: number) => void;
  onClose: () => void;
}

export const UpgradePanel: React.FC<UpgradePanelProps> = ({
  upgrades,
  dnaPoints,
  onUpgrade,
  onClose,
}) => {
  const getIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case 'Heart':
        return <Heart className="w-5 h-5" style={{ color }} />;
      case 'Zap':
        return <Zap className="w-5 h-5" style={{ color }} />;
      case 'Scissors':
        return <Scissors className="w-5 h-5" style={{ color }} />;
      case 'Flame':
        return <Flame className="w-5 h-5" style={{ color }} />;
      default:
        return <Zap className="w-5 h-5" style={{ color }} />;
    }
  };

  const handleUpgradeClick = (upgrade: GameUpgrade) => {
    if (upgrade.level >= upgrade.maxLevel) return;
    const cost = Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
    if (dnaPoints < cost) {
      audio.playHurt(); // buzzer sound
      return;
    }
    audio.playGrow();
    onUpgrade(upgrade.id, cost);
  };

  return (
    <div className="flex flex-col items-center justify-between text-slate-100 max-w-2xl mx-auto p-5 md:p-8 min-h-[550px] bg-[#0F172A]/90 border border-[#334155] rounded-xl shadow-2xl relative overflow-hidden animate-fade-in">
      {/* Scanline pattern opacity */}
      <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.02]"></div>

      {/* Lab Header */}
      <div className="w-full flex justify-between items-center border-b border-slate-800/80 pb-4 mb-4 z-10">
        <div>
          <h2 className="text-2xl font-sans tracking-wide font-black text-emerald-500 uppercase">
            GENOM-MUTATION CHAMBER
          </h2>
          <p className="text-xs font-mono text-slate-400">AMPLIFY KAIJU ATTRIBUTES BY CONSUMING DNA</p>
        </div>
        <div className="bg-[#0F172A] border border-[#334155] px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-sm text-yellow-400">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-mono font-bold">{dnaPoints} DNA</span>
        </div>
      </div>

      {/* Upgrades List Grid */}
      <div className="w-full flex flex-col gap-3.5 z-10">
        {upgrades.map((upgrade) => {
          const isMax = upgrade.level >= upgrade.maxLevel;
          const cost = Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
          const canAfford = dnaPoints >= cost && !isMax;

          // Color coded highlights
          let upgradeColor = '#10b981'; // emerald
          if (upgrade.id === 'speed') upgradeColor = '#3b82f6'; // blue
          if (upgrade.id === 'bite_power') upgradeColor = '#e11d48'; // rose
          if (upgrade.id === 'special_duration') upgradeColor = '#eab308'; // yellow

          return (
            <div
              key={upgrade.id}
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all bg-[#0F172A]/70 ${
                isMax
                  ? 'border-slate-800/50 bg-slate-900/10 opacity-40'
                  : 'border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/30'
              }`}
            >
              {/* Icon & Details */}
              <div className="flex gap-4 items-start md:items-center max-w-md">
                <div
                  className="p-3 bg-slate-900 border rounded-lg shrink-0"
                  style={{ borderColor: upgradeColor + '30', backgroundColor: upgradeColor + '08' }}
                >
                  {getIcon(upgrade.icon, upgradeColor)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100 text-sm">{upgrade.name}</span>
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full"
                      style={{ color: upgradeColor, backgroundColor: upgradeColor + '15', border: `1px solid ${upgradeColor}20` }}
                    >
                      MUTATION Lvl {upgrade.level}/{upgrade.maxLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">{upgrade.description}</p>
                </div>
              </div>

              {/* Grid indicators & Upgrade Button */}
              <div className="flex items-center gap-4 self-end md:self-auto shrink-0 w-full md:w-auto md:justify-end justify-between">
                {/* Visual grid levels */}
                <div className="flex gap-1.5">
                  {Array.from({ length: upgrade.maxLevel }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-2.5 h-4 rounded-sm transition-all"
                      style={{
                        backgroundColor: idx < upgrade.level ? upgradeColor : '#1E293B',
                        boxShadow: idx < upgrade.level ? `0 0 4px ${upgradeColor}40` : undefined
                      }}
                    />
                  ))}
                </div>

                {/* Mutate Trigger Button */}
                <button
                  disabled={isMax || !canAfford}
                  onClick={() => handleUpgradeClick(upgrade)}
                  style={{
                    borderColor: isMax ? '#334155' : canAfford ? upgradeColor : '#ef444430',
                    backgroundColor: isMax ? 'transparent' : canAfford ? upgradeColor + '15' : 'transparent',
                  }}
                  className={`px-3.5 py-1.5 border rounded-lg font-mono text-xs font-bold uppercase transition-all flex items-center gap-1.5 min-w-[110px] justify-center ${
                    isMax
                      ? 'text-slate-500 cursor-not-allowed border-slate-800'
                      : canAfford
                      ? 'text-white hover:brightness-110 hover:scale-[1.02] active:scale-95 cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed opacity-45'
                  }`}
                >
                  {isMax ? (
                    'MAXED'
                  ) : (
                    <>
                      <span>MUTATE</span>
                      <span className="font-mono text-amber-500 font-bold ml-1">{cost}🧬</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lower triggers */}
      <button
        onClick={onClose}
        className="w-full mt-6 py-2.5 border border-slate-700 bg-slate-900/40 hover:bg-[#1E293B] active:scale-95 transition-all text-xs tracking-wider font-mono font-bold rounded-lg flex items-center justify-center gap-2 text-slate-200 hover:text-white cursor-pointer"
      >
        <span>DEPLOY MUTAGEN TARGETS</span>
        <ArrowRight className="w-4 h-4 text-emerald-500" />
      </button>
    </div>
  );
};
