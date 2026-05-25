/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { MONSTERS, UPGRADES_TEMPLATE } from './data';
import { MonsterTypeId, GameUpgrade, GameState } from './types';
import { MonsterSelector } from './components/MonsterSelector';
import { UpgradePanel } from './components/UpgradePanel';
import { KaijuEncyclopedia } from './components/KaijuEncyclopedia';
import { GameCanvas } from './components/GameCanvas';
import { audio } from './utils/audio';
import { Trophy, Shield, Volume2, VolumeX, Flame, Zap, Award, AlertTriangle } from 'lucide-react';

export default function App() {
  // Globalpersistent state indices
  const [stage, setStage] = useState<'title' | 'select' | 'playing' | 'upgrade' | 'encyclopedia' | 'summary'>('title');
  const [selectedMonsterId, setSelectedMonsterId] = useState<MonsterTypeId>('reptile');
  const [dna, setDna] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Upgrades list state
  const [upgrades, setUpgrades] = useState<GameUpgrade[]>(UPGRADES_TEMPLATE);

  // Stats logs
  const [stats, setStats] = useState({
    totalDnaSpent: 0,
    totalBuildingsDestroyed: 0,
    totalHumansEaten: 0,
    totalMilitaryDestroyed: 0,
    maxMonsterHeight: 1.5,
  });

  // Current run stats
  const [lastRun, setLastRun] = useState<{
    score: number;
    dnaEarned: number;
    buildingsDestroyed: number;
    humansEaten: number;
    militaryDestroyed: number;
    maxHeight: number;
    completed: boolean;
  } | null>(null);

  // 1. Load Local State on init
  useEffect(() => {
    try {
      const savedScore = localStorage.getItem('kaiju_high_score');
      if (savedScore) setHighScore(parseInt(savedScore, 10));

      const savedDna = localStorage.getItem('kaiju_dna');
      if (savedDna) setDna(parseInt(savedDna, 10));

      const savedSound = localStorage.getItem('kaiju_sound');
      if (savedSound) {
        const flag = savedSound === 'true';
        setSoundEnabled(flag);
        audio.setEnabled(flag);
      } else {
        audio.setEnabled(true);
      }

      const savedUpgrades = localStorage.getItem('kaiju_upgrades');
      if (savedUpgrades) {
        setUpgrades(JSON.parse(savedUpgrades));
      }

      const savedStats = localStorage.getItem('kaiju_cumulative_stats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    } catch (e) {
      console.warn('Could not read localStorage parameters', e);
    }
  }, []);

  // 2. Play intro bells when title screen renders or clicked
  const startCityRampage = () => {
    audio.playSelect();
    setStage('select');
  };

  const openMutationLab = () => {
    audio.playSelect();
    setStage('upgrade');
  };

  const openArchives = () => {
    audio.playSelect();
    setStage('encyclopedia');
  };

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    audio.setEnabled(nextState);
    localStorage.setItem('kaiju_sound', String(nextState));
  };

  // 3. Purchase upgrades
  const handleUpgradePurchased = (upgradeId: string, cost: number) => {
    const updated = upgrades.map((u) => {
      if (u.id === upgradeId) {
        return { ...u, level: u.level + 1 };
      }
      return u;
    });

    const nextDna = dna - cost;
    setDna(nextDna);
    setUpgrades(updated);
    
    const nextStats = {
      ...stats,
      totalDnaSpent: stats.totalDnaSpent + cost,
    };
    setStats(nextStats);

    // Persist
    localStorage.setItem('kaiju_dna', String(nextDna));
    localStorage.setItem('kaiju_upgrades', JSON.stringify(updated));
    localStorage.setItem('kaiju_cumulative_stats', JSON.stringify(nextStats));
  };

  // 4. Handle finished gameplay session
  const handleGameFinished = (
    finalScore: number,
    dnaEarned: number,
    runStats: { buildings: number; humans: number; military: number; maxHeight: number }
  ) => {
    const isVictor = runStats.maxHeight >= 100 || finalScore > 10000;

    setLastRun({
      score: finalScore,
      dnaEarned,
      buildingsDestroyed: runStats.buildings,
      humansEaten: runStats.humans,
      militaryDestroyed: runStats.military,
      maxHeight: runStats.maxHeight,
      completed: isVictor,
    });

    const nextDna = dna + dnaEarned;
    setDna(nextDna);

    const checkHighScore = finalScore > highScore;
    if (checkHighScore) {
      setHighScore(finalScore);
      localStorage.setItem('kaiju_high_score', String(finalScore));
    }

    const updatedCumulative = {
      totalDnaSpent: stats.totalDnaSpent,
      totalBuildingsDestroyed: stats.totalBuildingsDestroyed + runStats.buildings,
      totalHumansEaten: stats.totalHumansEaten + runStats.humans,
      totalMilitaryDestroyed: stats.totalMilitaryDestroyed + runStats.military,
      maxMonsterHeight: Math.max(stats.maxMonsterHeight, runStats.maxHeight),
    };
    setStats(updatedCumulative);

    // Save persistence
    localStorage.setItem('kaiju_dna', String(nextDna));
    localStorage.setItem('kaiju_cumulative_stats', JSON.stringify(updatedCumulative));

    // Shift to round stats summary deck
    setStage('summary');
  };

  const selectedSpecimenData = MONSTERS.find((m) => m.id === selectedMonsterId) || MONSTERS[0];

  return (
    <div className="min-h-screen bg-[#0F172A] font-sans text-slate-100 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden" id="applet_main_container_id">
      
      {/* Background drifting ambient pixel stars & grid */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-[0.03]"></div>
      
      {/* Absolute CRT Screen curve distortion */}
      <div className="bg-scanlines absolute inset-0 pointer-events-none z-50 opacity-[0.02]"></div>

      {/* Main retro Arcade Deck Chassis wrap */}
      <main className="w-full max-w-5xl bg-[#1E293B]/85 border border-[#334155] rounded-xl p-5 md:p-8 shadow-2xl relative z-10 flex flex-col justify-between overflow-hidden backdrop-blur-md">

        {/* Console upper neon branding header bar */}
        <header className="flex justify-between items-center pb-4 mb-6 border-b border-[#334155] z-10 text-slate-300">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute opacity-75"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative"></span>
            <div>
              <h1 className="text-xs font-mono font-bold tracking-widest text-emerald-400 flex items-center gap-2">
                KAIJU CONTROL MATRIX — SEC 7
              </h1>
              <p className="text-[10px] font-mono text-slate-400">SYSTEM COGNITION: ONLINE — BIO-SIMULA_ MODE ACTIVE</p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            {/* Audio Toggle button */}
            <button
              onClick={toggleSound}
              className="text-slate-400 hover:text-[#4ADE80] transition-colors p-1 cursor-pointer"
              title="Toggle audio systems"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <div className="bg-[#0F172A] border border-[#334155] px-3.5 py-1.5 rounded-lg font-mono text-xs uppercase flex items-center gap-1.5 shadow-sm text-yellow-400">
              <span className="font-bold">{dna} 🧬 DNA</span>
            </div>
          </div>
        </header>

        {/* Dynamic Display Screens based on game Stage */}
        <div className="flex-grow min-h-[500px] flex flex-col justify-center w-full relative z-10 font-sans">
          
          {/* STAGE A: RETRO TITLE SCREEN */}
          {stage === 'title' && (
            <div className="flex flex-col items-center justify-center text-center p-4 py-8 md:py-12 max-w-2xl mx-auto flex-grow gap-8 select-none">
              
              {/* Pulsing hazard atomic banner */}
              <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 rounded-full text-amber-500 font-mono text-xs flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>BIOHAZARD WARNING: MAXIMUM CONTAINER CONTRACTION ACTIVE</span>
              </div>

              {/* Main typography display */}
              <div className="flex flex-col">
                <span className="text-amber-400 font-mono text-xs tracking-widest uppercase font-black">
                  RETRO PIXEL ARCADE
                </span>
                <h2 className="text-5xl md:text-6xl font-sans tracking-tighter font-black text-white uppercase mt-2 drop-shadow-lg leading-none">
                  KAIJU RAMPAGE
                </h2>
                <h3 className="text-2xl font-mono text-emerald-400 tracking-widest font-extrabold uppercase mt-1">
                  CITY SMASHER
                </h3>
              </div>

              {/* High Score tracker ticker */}
              <div className="bg-[#0F172A]/90 border border-slate-800/80 px-6 py-3 rounded-xl flex items-center gap-4 shadow-md shadow-amber-500/5 min-w-[280px] animate-fade-in">
                <Trophy className="w-8 h-8 text-amber-500 shrink-0" />
                <div className="text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider">ALL-TIME HIGH SCORE</span>
                  <span className="text-lg font-mono font-black text-amber-400 block tracking-wide mt-0.5 animate-pulse">
                    {highScore.toLocaleString()} PTS
                  </span>
                </div>
              </div>

              {/* Interactive Menu Choices panel */}
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
                
                <button
                  onClick={startCityRampage}
                  className="px-8 py-3.5 border border-[#4ADE80] bg-emerald-500/10 hover:bg-[#4ADE80] text-[#4ADE80] hover:text-slate-950 font-mono text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/30 active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  START URBAN CHAOS 🔥
                </button>

                <button
                  onClick={openMutationLab}
                  className="px-6 py-3.5 border border-slate-705 bg-[#0F172A] hover:bg-[#1E293B] text-slate-300 hover:text-white font-mono text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  <span>GENE LABS 🧬</span>
                </button>
              </div>

              {/* Subsidiary navigation for lore/dictionary */}
              <button
                onClick={openArchives}
                className="text-[10px] font-mono text-slate-500 hover:text-amber-505 transition-colors uppercase tracking-widest cursor-pointer mt-1"
              >
                ACCESS KAIJU BIOLOGICAL CLASSIFICATION DICTIONARY
              </button>

            </div>
          )}

          {/* STAGE B: CHARACTER SELECT ROUTE */}
          {stage === 'select' && (
            <MonsterSelector
              dnaPoints={dna}
              onSelect={(mId) => {
                setSelectedMonsterId(mId);
                setStage('playing');
              }}
              onBack={() => setStage('title')}
            />
          )}

          {/* STAGE C: GAME SIMULATION RUNNING */}
          {stage === 'playing' && (
            <GameCanvas
              monsterId={selectedMonsterId}
              upgrades={upgrades}
              dnaPoints={dna}
              soundEnabled={soundEnabled}
              onToggleSound={setSoundEnabled}
              onGameCompleted={handleGameFinished}
              onExit={() => {
                audio.playGrow();
                setStage('select');
              }}
            />
          )}

          {/* STAGE D: MUTATION DNA UPGRADE CHAMBER */}
          {stage === 'upgrade' && (
            <UpgradePanel
              upgrades={upgrades}
              dnaPoints={dna}
              onUpgrade={handleUpgradePurchased}
              onClose={() => setStage('title')}
            />
          )}

          {/* STAGE E: KAIJU ENCYCLOPEDIA */}
          {stage === 'encyclopedia' && (
            <KaijuEncyclopedia
              highScore={highScore}
              totalDnaSpent={stats.totalDnaSpent}
              totalBuildingsDestroyed={stats.totalBuildingsDestroyed}
              totalHumansEaten={stats.totalHumansEaten}
              totalMilitaryDestroyed={stats.totalMilitaryDestroyed}
              maxMonsterHeight={stats.maxMonsterHeight}
              onBack={() => setStage('title')}
            />
          )}

          {/* STAGE F: PERFORMANCE ROUND SUMMARY */}
          {stage === 'summary' && lastRun && (
            <div className="flex flex-col items-center justify-between text-slate-100 max-w-xl mx-auto p-6 md:p-8 bg-[#0F172A]/90 border border-[#334155] rounded-xl shadow-2xl relative select-none">
              
              <div className="w-full text-center border-b border-slate-800/80 pb-4 mb-4">
                <span className="text-xs font-mono text-rose-500 font-extrabold block uppercase tracking-widest">
                  RAMPAGE OUTCOME REPORT
                </span>
                <h3 className="text-2xl font-sans font-black text-rose-500 uppercase mt-1 leading-none">
                  {lastRun.completed ? 'METROPOLIS CRUMBLED ☠️' : 'TACTICAL CONTAINMENT SUCCESS'}
                </h3>
              </div>

              {/* DNA Mutation visual card badge */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 w-full flex items-center justify-center gap-4 text-center my-4">
                <span className="text-3xl">🧬</span>
                <div className="text-left">
                  <span className="text-[10px] font-mono text-emerald-400 font-extrabold uppercase block tracking-wider">
                    GATHERED MUTAGEN GENES
                  </span>
                  <span className="text-xl font-mono text-[#4ADE80] font-black tracking-wide block mt-1">
                    +{lastRun.dnaEarned} DNA REWARDED
                  </span>
                </div>
              </div>

              {/* Individual statistics breakdown list */}
              <div className="w-full flex flex-col gap-2 my-3 text-slate-300 font-mono text-xs">
                
                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-400 uppercase tracking-wide">Kaiju Score</span>
                  <span className="font-bold text-slate-100">{lastRun.score.toLocaleString()} PTS</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-400 uppercase tracking-wide">Towers Leveled</span>
                  <span className="font-bold text-slate-100">{lastRun.buildingsDestroyed} Structures</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-400 uppercase tracking-wide">Citizens Digested</span>
                  <span className="font-bold text-[#4ADE80]">{lastRun.humansEaten} Humans</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                  <span className="text-slate-400 uppercase tracking-wide">Military Armed Casualties</span>
                  <span className="font-bold text-blue-400">{lastRun.militaryDestroyed} Squads</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-800/50 animate-pulse">
                  <span className="text-slate-400 uppercase tracking-wide">Max Proportional Height</span>
                  <span className="font-bold text-amber-500">{lastRun.maxHeight.toFixed(1)} Meters</span>
                </div>

              </div>

              {/* Options triggers below card */}
              <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
                
                <button
                  onClick={() => {
                    audio.playGrow();
                    setStage('upgrade');
                  }}
                  className="flex-1 py-2.5 border border-[#4ADE80] bg-emerald-500/10 hover:bg-[#4ADE80] text-[#4ADE80] hover:text-slate-950 font-mono text-xs font-bold uppercase rounded-lg transition-all active:scale-95 cursor-pointer text-center tracking-wider shadow-sm shadow-emerald-500/10"
                >
                  UPGRADE GENETIC CODES 🧬
                </button>

                <button
                  onClick={() => {
                    audio.playSelect();
                    setStage('title');
                  }}
                  className="flex-1 py-2.5 border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white font-mono text-xs font-semibold uppercase rounded-lg transition-all active:scale-95 cursor-pointer text-center"
                >
                  BACK TO TITLE LABS
                </button>

              </div>

            </div>
          )}

        </div>

        {/* Footer info panels */}
        <footer className="mt-4 pt-4 border-t border-[#334155] text-center text-[10px] font-mono text-slate-500 z-10 flex flex-col sm:flex-row justify-between gap-2 border-slate-800">
          <span>KAIJU SIMULATION HARNESS SYSTEM v2.1.2 — SEC-7 COLLIDER STATUS: ONLINE</span>
          <span>© 2026 BIO-CYBERNETIC HARVEST SERVICES. COGNITIONS BOUNDED.</span>
        </footer>

      </main>
    </div>
  );
}
