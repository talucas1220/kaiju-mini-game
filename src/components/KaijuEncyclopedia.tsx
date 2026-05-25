/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { audio } from '../utils/audio';
import { Trophy, BookOpen, Clock, Building, Heart } from 'lucide-react';

interface KaijuEncyclopediaProps {
  highScore: number;
  totalDnaSpent: number;
  totalBuildingsDestroyed: number;
  totalHumansEaten: number;
  totalMilitaryDestroyed: number;
  maxMonsterHeight: number;
  onBack: () => void;
}

export const KaijuEncyclopedia: React.FC<KaijuEncyclopediaProps> = ({
  highScore,
  totalDnaSpent,
  totalBuildingsDestroyed,
  totalHumansEaten,
  totalMilitaryDestroyed,
  maxMonsterHeight,
  onBack,
}) => {
  const [activeTab, setActiveTab] = React.useState<'records' | 'subjects'>('records');

  const entities = [
    {
      name: 'Petrified Civilian',
      type: 'HUMAN',
      danger: '★☆☆☆☆',
      nutrition: '★★★★★',
      description: 'The backbone of city snacks. These squishy bipedal units leave buildings, scream beautifully, and provide rich DNA materials that help you grow larger.',
      unicodeIcon: '🏃',
      color: '#fbbf24',
    },
    {
      name: 'S.W.A.T. Responder',
      type: 'SOLDIER',
      danger: '★★☆☆☆',
      nutrition: '★★★☆☆',
      description: 'Equipped with basic armor and fully loaded sidearms. They line up on streets and shoot bullets that slowly scratch your hide. Munching them provides high special energy.',
      unicodeIcon: '👮',
      color: '#60a5fa',
    },
    {
      name: 'Main Battle Tank',
      type: 'MILITARY',
      danger: '★★★★☆',
      nutrition: '★☆☆☆☆',
      description: 'Slow-moving heavy armor. Fires high-kinetic artillery shells which cause massive knockback and heavy damage. Crush them under your feet or swipe them to pieces.',
      unicodeIcon: '🚜',
      color: '#4ade80',
    },
    {
      name: 'Gunship Helicopter',
      type: 'AERIAL',
      danger: '★★★★☆',
      nutrition: '★☆☆☆☆',
      description: 'Circles your head from above, firing high-powered rockets in fast intervals. Swat them out of the sky with your fists or your signature tail-sweep attacks.',
      unicodeIcon: '🚁',
      color: '#f43f5e',
    },
    {
      name: 'City Skyscraper',
      type: 'OBJECT',
      danger: '☆☆☆☆☆',
      nutrition: '★★★★☆',
      description: 'Towering concrete blocks of business and housing. Bash them to force fleeing citizens into the streets! Demolishing buildings completely rewards huge victory points.',
      unicodeIcon: '🏢',
      color: '#a1a1aa',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-between text-slate-100 max-w-2xl mx-auto p-5 md:p-8 min-h-[550px] bg-[#0F172A]/90 border border-[#334155] rounded-xl shadow-2xl relative overflow-hidden animate-fade-in">
      {/* Scanline pattern */}
      <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.02]"></div>

      {/* Header */}
      <div className="w-full flex justify-between items-center border-b border-slate-800/80 pb-4 mb-4 z-10">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-amber-500" />
          <div>
            <h2 className="text-xl font-sans tracking-tight font-black text-amber-500 uppercase">
              KAIJU RECORDINGS LOG
            </h2>
            <p className="text-xs font-mono text-slate-400">RESEARCH DATA & GLOBAL DESTRUCTION DIRECTORY</p>
          </div>
        </div>
      </div>

      {/* Mini tabs */}
      <div className="w-full flex gap-2 mb-4 z-10">
        <button
          onClick={() => {
            audio.playSelect();
            setActiveTab('records');
          }}
          className={`flex-1 py-1.5 font-mono text-[10px] border uppercase font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'records'
              ? 'bg-[#0f172a] border-amber-500 text-amber-500'
              : 'bg-slate-900/60 border-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          RAMPAGE RECORDS
        </button>
        <button
          onClick={() => {
            audio.playSelect();
            setActiveTab('subjects');
          }}
          className={`flex-1 py-1.5 font-mono text-[10px] border uppercase font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'subjects'
              ? 'bg-[#0f172a] border-amber-500 text-amber-500'
              : 'bg-slate-900/60 border-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          BIOLOGICAL CLASSIFICATIONS
        </button>
      </div>

      {/* Body Section */}
      <div className="w-full flex-grow z-10 select-none">
        {activeTab === 'records' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
            {/* Record 1 */}
            <div className="bg-[#0F172A]/75 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4 hover:border-slate-700/60 duration-250 transition-all">
              <Trophy className="w-8 h-8 text-amber-500 shrink-0" />
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">All-Time High Score</span>
                <span className="text-lg font-black text-[#4ADE80] mt-0.5 block">
                  {highScore.toLocaleString()} PTS
                </span>
              </div>
            </div>

            {/* Record 2 */}
            <div className="bg-[#0F172A]/75 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4 hover:border-slate-700/60 duration-250 transition-all">
              <Building className="w-8 h-8 text-rose-500 shrink-0" />
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">Demolitions Logged</span>
                <span className="text-lg font-black text-rose-405 mt-0.5 block">
                  {totalBuildingsDestroyed} Buildings
                </span>
              </div>
            </div>

            {/* Record 3 */}
            <div className="bg-[#0F172A]/75 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4 hover:border-slate-700/60 duration-250 transition-all">
              <span className="text-3xl select-none shrink-0">🍖</span>
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">Snacks Consumed</span>
                <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                  {totalHumansEaten} Human Snacks
                </span>
              </div>
            </div>

            {/* Record 4 */}
            <div className="bg-[#0F172A]/75 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4 hover:border-slate-700/60 duration-250 transition-all">
              <span className="text-3xl select-none shrink-0">🛩️</span>
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">Military Silenced</span>
                <span className="text-lg font-black text-blue-400 mt-0.5 block">
                  {totalMilitaryDestroyed} Squads / Armor
                </span>
              </div>
            </div>

            {/* Record 5 */}
            <div className="bg-[#0F172A]/75 border border-slate-800/80 p-4 rounded-xl flex items-center gap-4 sm:col-span-2 hover:border-slate-700/60 duration-250 transition-all">
              <Heart className="w-8 h-8 text-yellow-500 shrink-0" />
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">Max Kinetic scale achieved</span>
                <span className="text-lg font-black text-yellow-400 mt-0.5 block">
                  {maxMonsterHeight.toFixed(1)}m Tall / Stage {Math.min(5, Math.ceil(maxMonsterHeight / 30))}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
            {entities.map((ent, idx) => (
              <div
                key={idx}
                className="bg-[#0F172A]/40 border border-slate-800/80 rounded-xl p-3.5 flex gap-4 items-center"
              >
                <div
                  style={{ backgroundColor: ent.color + '10', borderColor: ent.color + '30' }}
                  className="w-11 h-11 rounded-lg border flex items-center justify-center text-xl shrink-0"
                >
                  {ent.unicodeIcon}
                </div>
                <div className="min-w-0 flex-grow animate-fade-in">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm">{ent.name}</span>
                    <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                      {ent.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">{ent.description}</p>
                  <div className="flex justify-between mt-2 pt-1.5 border-t border-slate-900 text-[9px] font-mono">
                    <span className="text-rose-500">Threat: {ent.danger}</span>
                    <span className="text-emerald-500">DNA Gain: {ent.nutrition}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="w-full mt-6 py-2 border border-slate-700 bg-slate-900/40 hover:bg-[#1E293B] hover:text-white transition-all font-mono text-xs uppercase tracking-wider rounded-lg active:scale-95 cursor-pointer"
      >
        &lt; BASE LABS
      </button>
    </div>
  );
};
