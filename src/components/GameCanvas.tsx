/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameUpgrade, Human, Building, Vehicle, Projectile, Particle, MonsterPlayState, MonsterTypeId } from '../types';
import { MONSTERS, CITY_STREET_NAMES } from '../data';
import { audio } from '../utils/audio';
import { Play, RotateCcw, Volume2, VolumeX, Shield, Award, Users, Swords, Maximize2, Minimize2 } from 'lucide-react';

interface GameCanvasProps {
  monsterId: MonsterTypeId;
  upgrades: GameUpgrade[];
  dnaPoints: number;
  onGameCompleted: (score: number, dnaEarned: number, stats: { buildings: number; humans: number; military: number; maxHeight: number }) => void;
  onExit: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  monsterId,
  upgrades,
  dnaPoints,
  onGameCompleted,
  onExit,
  soundEnabled,
  onToggleSound,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // High-frequency simulation states kept in Refs to guarantee 60 FPS
  const gameLoopRef = useRef<number | null>(null);
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  
  // Game dimensions & camera
  const MAP_SIZE = { width: 3200, height: 2400 };
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1.0, shake: 0 });

  // Player stats
  const selectedMonster = MONSTERS.find((m) => m.id === monsterId) || MONSTERS[0];
  
  // Level buffs
  const healthBuff = 1 + (upgrades.find(u => u.id === 'max_health')?.level || 0) * 0.3;
  const speedBuff = 1 + (upgrades.find(u => u.id === 'speed')?.level || 0) * 0.15;
  const dmgBuff = 1 + (upgrades.find(u => u.id === 'bite_power')?.level || 0) * 0.35;
  const specBuff = 1 + (upgrades.find(u => u.id === 'special_duration')?.level || 0) * 0.25;

  const playerRef = useRef<MonsterPlayState>({
    x: MAP_SIZE.width / 2,
    y: MAP_SIZE.height / 2,
    vx: 0,
    vy: 0,
    width: 44,
    height: 44,
    direction: 'right',
    health: selectedMonster.baseHealth * healthBuff,
    maxHealth: selectedMonster.baseHealth * healthBuff,
    energy: 50,
    sizeMeters: 1.5,
    growthProgress: 0,
    isSpecialActive: false,
    specialDuration: 0,
    lastAttackTime: 0,
    isLockedInAction: false,
    animationFrameCount: 0,
    invulnFrames: 0,
  });

  // Track entities in Refs for real-time physics
  const buildingsRef = useRef<Building[]>([]);
  const humansRef = useRef<Human[]>([]);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // React state synced occasionally for UI HUD rendering
  const [hudStats, setHudStats] = useState({
    health: selectedMonster.baseHealth * healthBuff,
    maxHealth: selectedMonster.baseHealth * healthBuff,
    energy: 50,
    sizeMeters: 1.5,
    growthProgress: 0,
    score: 0,
    highScore: 0,
    buildingsDestroyed: 0,
    humansEaten: 0,
    militaryDestroyed: 0,
    isGameOver: false,
    dnaEarned: 0,
    timeRemaining: 180, // 3 minutes city rampage timer
  });

  const [joystick, setJoystick] = useState<{ active: boolean; startX: number; startY: number; curX: number; curY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0,
  });

  const joystickRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0,
    touchId: -1,
  });

  const [arenaFullMode, setArenaFullMode] = useState<boolean>(false);

  // Auto-resize canvas when mobile fullscreen horizontal mode is toggled
  useEffect(() => {
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      const parent = containerRef.current;
      if (canvas && parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [arenaFullMode]);

  const timeLimitRef = useRef<number>(180); // 3-minute challenge mode
  const accumulatedDnaRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const buildingsCountRef = useRef<number>(0);
  const humansCountRef = useRef<number>(0);
  const militaryCountRef = useRef<number>(0);
  const maxMetersAchievedRef = useRef<number>(1.5);
  const currentStreetRef = useRef<string>('Broadway Ave');
  const frameCountRef = useRef<number>(0);

  // Initialize Game World
  const initializeWorld = () => {
    // 1. Generate grid of distinct buildings
    const buildings: Building[] = [];
    const minD = 80;
    
    // Grid generation with randomized layout, alleys and central park area
    for (let x = 150; x < MAP_SIZE.width - 200; x += 300) {
      for (let y = 150; y < MAP_SIZE.height - 200; y += 300) {
        // Skip central plaza park region to create dynamic map structure
        if (Math.abs(x - MAP_SIZE.width / 2) < 250 && Math.abs(y - MAP_SIZE.height / 2) < 250) {
          continue;
        }

        const blockWidth = 140 + Math.random() * 80;
        const blockHeight = 140 + Math.random() * 80;
        const healthBase = 100 + Math.random() * 200;
        const stories = Math.floor(2 + Math.random() * 8); // height of stories

        buildings.push({
          id: `b-${x}-${y}`,
          x,
          y,
          width: blockWidth,
          height: blockHeight,
          health: healthBase,
          maxHealth: healthBase,
          stories,
          isDestroyed: false,
          humansOccupied: Math.ceil(stories * (3 + Math.random() * 6)),
          fireIntensity: 0,
          debrisColor: ['#78716c', '#44403c', '#57534e', '#3f3f46'][Math.floor(Math.random() * 4)],
          windowMatrix: Array.from({ length: stories }, () =>
            Array.from({ length: Math.ceil(blockWidth / 24) }, () => Math.random() > 0.2)
          ),
        });
      }
    }
    buildingsRef.current = buildings;

    // 2. Generate initial humans
    const humans: Human[] = [];
    for (let i = 0; i < 70; i++) {
      spawnHuman(humans);
    }
    humansRef.current = humans;

    // 3. Generate initial vehicles
    const vehicles: Vehicle[] = [];
    for (let i = 0; i < 15; i++) {
      spawnVehicle(vehicles);
    }
    vehiclesRef.current = vehicles;

    // Clean projectiles and particles
    projectilesRef.current = [];
    particlesRef.current = [];

    // Reset statistics
    scoreRef.current = 0;
    accumulatedDnaRef.current = 0;
    buildingsCountRef.current = 0;
    humansCountRef.current = 0;
    militaryCountRef.current = 0;
    maxMetersAchievedRef.current = 1.5;
    timeLimitRef.current = 180;

    const statsHealth = selectedMonster.baseHealth * healthBuff;
    playerRef.current = {
      x: MAP_SIZE.width / 2,
      y: MAP_SIZE.height / 2,
      vx: 0,
      vy: 0,
      width: 44,
      height: 44,
      direction: 'right',
      health: statsHealth,
      maxHealth: statsHealth,
      energy: 50,
      sizeMeters: 1.5,
      growthProgress: 0,
      isSpecialActive: false,
      specialDuration: 0,
      lastAttackTime: 0,
      isLockedInAction: false,
      animationFrameCount: 0,
      invulnFrames: 0,
    };
  };

  const spawnHuman = (list: Human[], forceNearPlayer = false) => {
    const player = playerRef.current;
    let rx = Math.random() * MAP_SIZE.width;
    let ry = Math.random() * MAP_SIZE.height;

    if (forceNearPlayer) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 200 + Math.random() * 300;
      rx = player.x + Math.cos(angle) * distance;
      ry = player.y + Math.sin(angle) * distance;
      // boundary constraint
      rx = Math.max(50, Math.min(MAP_SIZE.width - 50, rx));
      ry = Math.max(50, Math.min(MAP_SIZE.height - 50, ry));
    }

    const types: ('civilian' | 'scientist' | 'police' | 'soldier')[] = ['civilian', 'civilian', 'civilian', 'police', 'scientist'];
    if (player.sizeMeters > 10) {
      types.push('soldier', 'soldier');
    }
    const type = types[Math.floor(Math.random() * types.length)];

    let col = '#fbbf24'; // standard gold
    if (type === 'police') col = '#3b82f6'; // blue
    if (type === 'soldier') col = '#16a34a'; // army green
    if (type === 'scientist') col = '#ffffff'; // white coat

    list.push({
      id: `h-${Date.now()}-${Math.random()}`,
      x: rx,
      y: ry,
      vx: 0,
      vy: 0,
      type,
      health: 10,
      isPanicked: false,
      panicTimer: 0,
      screamCooldown: 0,
      screamText: null,
      size: 4 + Math.random() * 3,
      color: col,
    });
  };

  const spawnVehicle = (list: Vehicle[]) => {
    const player = playerRef.current;
    const edge = Math.random() > 0.5;
    let rx = edge ? (Math.random() > 0.5 ? 20 : MAP_SIZE.width - 20) : Math.random() * MAP_SIZE.width;
    let ry = !edge ? (Math.random() > 0.5 ? 20 : MAP_SIZE.height - 20) : Math.random() * MAP_SIZE.height;

    // Determine type by player size
    const randomV = Math.random();
    let type: 'car' | 'police_cruiser' | 'tank' | 'helicopter' = 'car';

    if (player.sizeMeters > 30) {
      if (randomV > 0.8) type = 'helicopter';
      else if (randomV > 0.5) type = 'tank';
      else if (randomV > 0.25) type = 'police_cruiser';
    } else if (player.sizeMeters > 8) {
      if (randomV > 0.6) type = 'police_cruiser';
      else if (randomV > 0.4) type = 'tank';
    } else {
      if (randomV > 0.8) type = 'police_cruiser';
    }

    let vHealth = 40;
    if (type === 'police_cruiser') vHealth = 80;
    if (type === 'tank') vHealth = 250;
    if (type === 'helicopter') vHealth = 150;

    list.push({
      id: `v-${Date.now()}-${Math.random()}`,
      x: rx,
      y: ry,
      vx: (Math.random() * 2 - 1) * 2,
      vy: (Math.random() * 2 - 1) * 2,
      type,
      health: vHealth,
      maxHealth: vHealth,
      fireCooldown: 30 + Math.random() * 50,
    });
  };

  const spawnExpellingHumans = (b: Building) => {
    // Generate panicking citizens running out of collapsed building
    const numToSpawn = Math.min(b.humansOccupied, 8);
    b.humansOccupied -= numToSpawn;
    
    const countLeft = humansRef.current.length;
    if (countLeft > 180) return; // Prevent excessive entities lag

    for (let i = 0; i < numToSpawn; i++) {
      const angle = (i / numToSpawn) * Math.PI * 2;
      const dist = 30;
      humansRef.current.push({
        id: `h-${Date.now()}-${Math.random()}`,
        x: b.x + b.width / 2 + Math.cos(angle) * dist,
        y: b.y + b.height / 2 + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 1.0,
        vy: Math.sin(angle) * 1.0,
        type: Math.random() > 0.8 ? 'scientist' : 'civilian',
        health: 10,
        isPanicked: true,
        panicTimer: 180,
        screamCooldown: 30,
        screamText: ['OH MY GOD!', 'HELP ME!', 'IT\'S TALL!', 'RUUNN!!', 'KYAAAAAH!'][Math.floor(Math.random() * 5)],
        size: 5,
        color: '#f59e0b',
      });
    }
  };

  // Screen/Window listeners
  useEffect(() => {
    initializeWorld();
    audio.setEnabled(soundEnabled);

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current[key] = true;

      // Special key functions
      if (e.key === ' ' || key === 'e') {
        // Trigger manual swipe attack
        triggerMeleeAttack();
      }
      if (e.key === 'Shift' || key === 'q') {
        // Trigger Special ability
        triggerSpecialAbility();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Handle Resize
    const handleResize = () => {
      const canvas = canvasRef.current;
      const parent = containerRef.current;
      if (!canvas || !parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Start tick runner loop
    gameLoopRef.current = requestAnimationFrame(gameTick);

    // BGM toggle setup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  // Update sound when prop updates
  useEffect(() => {
    audio.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Handle melee strike action
  const triggerMeleeAttack = () => {
    const player = playerRef.current;
    if (player.isLockedInAction) return;

    player.isLockedInAction = true;
    player.lastAttackTime = frameCountRef.current;
    
    // Play sound depending on monster type
    audio.playSmash();

    // Attack mechanics
    const range = player.width * 1.3;
    const reachAngle = player.direction === 'right' ? 0 : Math.PI;
    
    // Spawn swipe arc particles
    for (let i = -3; i <= 3; i++) {
      const pAngle = reachAngle + (i * 0.2);
      const px = player.x + Math.cos(pAngle) * range;
      const py = player.y + Math.sin(pAngle) * (player.height * 0.8) - 10;
      particlesRef.current.push({
        id: `p-${Date.now()}-${Math.random()}`,
        x: px,
        y: py,
        vx: Math.cos(pAngle) * 3,
        vy: Math.sin(pAngle) * 3,
        color: selectedMonster.secondaryColor,
        size: 5 + Math.random() * 5,
        life: 15,
        maxLife: 15,
        type: 'spark',
      });
    }

    // Camera shake
    cameraRef.current.shake = 8;

    // Hit detections
    const baseDmg = selectedMonster.baseMelee * dmgBuff * (player.sizeMeters * 0.5);

    // 1. Strike Vehicles
    vehiclesRef.current.forEach((veh) => {
      const dx = veh.x - player.x;
      const dy = veh.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < range + 40) {
        // Correct forward hemisphere attack check
        const isTargetAhead = (player.direction === 'right' && dx > -20) || (player.direction === 'left' && dx < 20);
        if (isTargetAhead) {
          veh.health -= baseDmg;
          veh.vx += (player.direction === 'right' ? 6 : -6);
          veh.vy += (Math.random() * 4 - 2);

          // Add heavy hit sparks
          addHitSparks(veh.x, veh.y, '#f59e0b');
        }
      }
    });

    // 2. Smash Buildings
    buildingsRef.current.forEach((b) => {
      if (b.isDestroyed) return;
      const bCenterX = b.x + b.width / 2;
      const bCenterY = b.y + b.height / 2;
      const dx = bCenterX - player.x;
      const dy = bCenterY - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < range + (b.width + b.height) / 4) {
        const isTargetAhead = (player.direction === 'right' && dx > -30) || (player.direction === 'left' && dx < 30);
        if (isTargetAhead) {
          b.health -= baseDmg;
          b.fireIntensity = Math.min(1.0, b.fireIntensity + 0.15);
          
          // Spawn citizens leaving building because of shake
          spawnExpellingHumans(b);

          // Spawn heavy rubble chunks
          for (let i = 0; i < 4; i++) {
            particlesRef.current.push({
              id: `p-b-${Date.now()}-${Math.random()}`,
              x: player.x + (dx * 0.6) + (Math.random() * 40 - 20),
              y: player.y + (dy * 0.6) + (Math.random() * 40 - 20),
              vx: (Math.random() * 4 - 2),
              vy: -2 - Math.random() * 3,
              color: b.debrisColor,
              size: 4 + Math.random() * 6,
              life: 30,
              maxLife: 30,
              type: 'rubble',
            });
          }
        }
      }
    });
  };

  // Trigger special ultimate ability
  const triggerSpecialAbility = () => {
    const player = playerRef.current;
    if (player.energy < 40 || player.isSpecialActive) return;

    player.isSpecialActive = true;
    player.energy = 0;
    // Special timer depending on generator level
    player.specialDuration = (120 + specBuff * 60);

    if (monsterId === 'reptile') {
      audio.playLaser(1.5);
    } else if (monsterId === 'gorilla') {
      audio.playExplosion();
      // Seismic Ground thump: massive immediate radial stomp
      cameraRef.current.shake = 25;
      triggerRadialShockwave();
    } else {
      audio.playGrow();
      // Slime Trail and Split blobs started
    }
  };

  const triggerRadialShockwave = () => {
    const player = playerRef.current;
    const range = player.width * 2.8;
    const damage = selectedMonster.baseMelee * 2.5 * dmgBuff * (player.sizeMeters * 0.4);

    // Draw visual seismic rings
    for (let r = 0; r < 5; r++) {
      particlesRef.current.push({
        id: `shock-${Date.now()}-${r}`,
        x: player.x,
        y: player.y,
        vx: 0,
        vy: 0,
        color: '#fb7185', // pink
        size: range * 0.2 * (r + 1),
        life: 20 + r * 3,
        maxLife: 20 + r * 3,
        type: 'laser', // circles rendered
      });
    }

    // Demolish all targets around
    buildingsRef.current.forEach((b) => {
      if (b.isDestroyed) return;
      const dx = (b.x + b.width / 2) - player.x;
      const dy = (b.y + b.height / 2) - player.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < range + (b.width + b.height) / 4) {
        b.health -= damage;
        b.fireIntensity = Math.min(1.0, b.fireIntensity + 0.4);
        spawnExpellingHumans(b);
      }
    });

    vehiclesRef.current.forEach((veh) => {
      const dx = veh.x - player.x;
      const dy = veh.y - player.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < range) {
        veh.health -= damage;
        veh.vx += (dx / d) * 12;
        veh.vy += (dy / d) * 12;
      }
    });

    // Also scare humans into running extreme distances
    humansRef.current.forEach((h) => {
      const dx = h.x - player.x;
      const dy = h.y - player.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < range) {
        h.isPanicked = true;
        h.panicTimer = 220;
        h.vx = (dx / d) * 7;
        h.vy = (dy / d) * 7;
      }
    });
  };

  const addHitSparks = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        id: `spark-${Date.now()}-${Math.random()}`,
        x,
        y,
        vx: (Math.random() * 6 - 3),
        vy: (Math.random() * 6 - 3),
        color,
        size: 2 + Math.random() * 3,
        life: 15,
        maxLife: 15,
        type: 'spark',
      });
    }
  };

  // Main logic engine frame TICK
  const gameTick = () => {
    frameCountRef.current++;
    const player = playerRef.current;

    if (hudStats.isGameOver) {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      return;
    }

    // 1. Countdown limits progress
    if (frameCountRef.current % 60 === 0) {
      timeLimitRef.current = Math.max(0, timeLimitRef.current - 1);
      if (timeLimitRef.current <= 0) {
        triggerGameOver(true); // Victory collapse
        return;
      }
    }

    // 2. Clear out player actions
    if (player.isLockedInAction && frameCountRef.current - player.lastAttackTime > 20) {
      player.isLockedInAction = false;
    }

    if (player.invulnFrames > 0) {
      player.invulnFrames--;
    }

    // 3. Movement input mechanics
    let dx = 0;
    let dy = 0;

    if (keysPressedRef.current['w'] || keysPressedRef.current['arrowup']) dy = -1;
    if (keysPressedRef.current['s'] || keysPressedRef.current['arrowdown']) dy = 1;
    if (keysPressedRef.current['a'] || keysPressedRef.current['arrowleft']) {
      dx = -1;
      player.direction = 'left';
    }
    if (keysPressedRef.current['d'] || keysPressedRef.current['arrowright']) {
      dx = 1;
      player.direction = 'right';
    }

    // Apply touch joystick input if active
    if (joystickRef.current.active) {
      const mx = joystickRef.current.curX - joystickRef.current.startX;
      const my = joystickRef.current.curY - joystickRef.current.startY;
      const dist = Math.sqrt(mx * mx + my * my);
      if (dist > 8) {
        dx = mx / dist;
        dy = my / dist;
        if (dx > 0.05) player.direction = 'right';
        if (dx < -0.05) player.direction = 'left';
      }
    }

    // Apply speed stats with dynamic mass drag (getting heavier as sizes scale up!)
    // But they still retain speed upgrades
    const massFactor = Math.max(0.4, 1.0 - (player.sizeMeters / 150) * 0.4);
    const speedMagnitude = selectedMonster.baseSpeed * speedBuff * massFactor;
    
    player.vx = dx * speedMagnitude;
    player.vy = dy * speedMagnitude;

    // Boundary constraints
    player.x += player.vx;
    player.y += player.vy;
    player.x = Math.max(player.width, Math.min(MAP_SIZE.width - player.width, player.x));
    player.y = Math.max(player.height, Math.min(MAP_SIZE.height - player.height, player.y));

    // Dynamic Special Beam casting
    if (player.isSpecialActive) {
      player.specialDuration--;
      if (player.specialDuration <= 0) {
        player.isSpecialActive = false;
      }

      // 1. Reptile atomic ray
      if (monsterId === 'reptile') {
        const rayRange = Math.min(600, player.width * 7);
        const rayAngle = player.direction === 'right' ? 0 : Math.PI;
        const beamX = player.x + Math.cos(rayAngle) * 30;
        const beamY = player.y - 12;

        // Damage elements in line
        buildingsRef.current.forEach((b) => {
          if (b.isDestroyed) return;
          const bCenterX = b.x + b.width / 2;
          const bCenterY = b.y + b.height / 2;
          
          // Check if building is near line of ray shooting
          const relativeX = bCenterX - beamX;
          const relativeY = bCenterY - beamY;
          const distanceProj = (player.direction === 'right' ? relativeX : -relativeX);

          if (distanceProj > 0 && distanceProj < rayRange && Math.abs(relativeY) < (b.height / 2 + 30)) {
            b.health -= 1.5 * dmgBuff * (player.sizeMeters * 0.2);
            b.fireIntensity = Math.min(1.0, b.fireIntensity + 0.04);
            
            // Add tiny sparks
            if (Math.random() > 0.6) {
              addHitSparks(bCenterX + (Math.random() * 40 - 20), bCenterY + (Math.random() * 40 - 20), '#f59e0b');
            }
          }
        });

        vehiclesRef.current.forEach((veh) => {
          const relativeX = veh.x - beamX;
          const relativeY = veh.y - beamY;
          const distanceProj = (player.direction === 'right' ? relativeX : -relativeX);
          if (distanceProj > 0 && distanceProj < rayRange && Math.abs(relativeY) < 40) {
            veh.health -= 2 * dmgBuff;
            addHitSparks(veh.x, veh.y, '#f59e0b');
          }
        });

        // Laser beam visual sparks
        for (let j = 0; j < 3; j++) {
          const distRand = Math.random() * rayRange;
          particlesRef.current.push({
            id: `beam-${Date.now()}-${j}-${Math.random()}`,
            x: beamX + (player.direction === 'right' ? distRand : -distRand),
            y: beamY + (Math.random() * 10 - 5),
            vx: (Math.random() * 2 - 1) * 3,
            vy: (Math.random() * 2 - 1) * 3,
            color: '#f59e0b',
            size: 3 + Math.random() * 3,
            life: 10,
            maxLife: 10,
            type: 'laser',
          });
        }
      }

      // 2. Slime trail secretion
      if (monsterId === 'slime') {
        if (frameCountRef.current % 6 === 0) {
          // Drop high-acid toxic splash
          particlesRef.current.push({
            id: `slime-trail-${Date.now()}`,
            x: player.x,
            y: player.y + player.height * 0.3,
            vx: 0,
            vy: 0,
            color: '#22c55e',
            size: player.width * 1.2,
            life: 180, // lasts long
            maxLife: 180,
            type: 'laser', // green circle
          });
          
          audio.playMunch(); // squish noise
        }
      }
    }

    // Slime puddles checking
    if (monsterId === 'slime') {
      particlesRef.current.forEach((p) => {
        if (p.type === 'laser' && p.color === '#22c55e') {
          // Melt soldiers or tanks inside trail
          humansRef.current.forEach((h) => {
            const hdx = h.x - p.x;
            const hdy = h.y - p.y;
            const dist = Math.sqrt(hdx * hdx + hdy * hdy);
            if (dist < p.size * 0.5) {
              h.health -= 5;
            }
          });

          vehiclesRef.current.forEach((veh) => {
            const vdx = veh.x - p.x;
            const vdy = veh.y - p.y;
            const dist = Math.sqrt(vdx * vdx + vdy * vdy);
            if (dist < p.size * 0.5) {
              veh.health -= 0.5;
            }
          });
        }
      });
    }

    // 4. Update camera to follow player smoothly with dynamic Zoom Scale factor!
    const targetZoom = Math.max(0.15, 1.4 - (player.sizeMeters / 90) * 0.95); // Camera starts closer so detail is clear, zooms out zoom levels
    cameraRef.current.zoom += (targetZoom - cameraRef.current.zoom) * 0.05;

    // Center view
    const canvas = canvasRef.current;
    if (canvas) {
      const halfW = canvas.width / 2 / cameraRef.current.zoom;
      const halfH = canvas.height / 2 / cameraRef.current.zoom;
      cameraRef.current.x += (player.x - halfW - cameraRef.current.x) * 0.15;
      cameraRef.current.y += (player.y - halfH - cameraRef.current.y) * 0.15;

      // Restrict camera to map bounds
      cameraRef.current.x = Math.max(0, Math.min(MAP_SIZE.width - halfW * 2, cameraRef.current.x));
      cameraRef.current.y = Math.max(0, Math.min(MAP_SIZE.height - halfH * 2, cameraRef.current.y));
    }

    if (cameraRef.current.shake > 0.1) {
      cameraRef.current.shake *= 0.85;
    } else {
      cameraRef.current.shake = 0;
    }

    // 5. Update Buildings
    buildingsRef.current.forEach((b) => {
      if (b.isDestroyed) return;

      if (b.health <= 0) {
        b.isDestroyed = true;
        b.fireIntensity = 0;
        buildingsCountRef.current++;
        scoreRef.current += Math.round(b.stories * 250);
        cameraRef.current.shake = 16;
        
        audio.playExplosion();

        // Expell lots of civilians
        spawnExpellingHumans(b);
        
        // Spawn massive explosion cloud
        for (let i = 0; i < 15; i++) {
          particlesRef.current.push({
            id: `smoke-b-${Date.now()}-${i}`,
            x: b.x + Math.random() * b.width,
            y: b.y + Math.random() * b.height - Math.random() * 20,
            vx: (Math.random() * 4 - 2),
            vy: -1 - Math.random() * 4,
            color: ['#4b5563', '#6b7280', '#9ca3af', '#f97316'][Math.floor(Math.random() * 4)],
            size: 15 + Math.random() * 15,
            life: 60 + Math.random() * 40,
            maxLife: 100,
            type: 'smoke',
          });
        }
      } else if (b.fireIntensity > 0) {
        // Passive burn damage
        b.health -= b.fireIntensity * 0.15;
        // Spew active fire sparks
        if (Math.random() > 0.9) {
          particlesRef.current.push({
            id: `fire-b-${Date.now()}-${Math.random()}`,
            x: b.x + Math.random() * b.width,
            y: b.y + Math.random() * b.height - b.stories * 5,
            vx: (Math.random() * 2 - 1),
            vy: -3 - Math.random() * 2,
            color: '#f97316',
            size: 5 + Math.random() * 5,
            life: 25,
            maxLife: 25,
            type: 'fire',
          });
        }
      }
    });

    // 6. Update Humans
    const remainingHumans = humansRef.current.filter((h) => h.health > 0);
    remainingHumans.forEach((h) => {
      const dxToPlayer = player.x - h.x;
      const dyToPlayer = player.y - h.y;
      const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);

      // Check if inside eating mouth zone!
      const mouthRange = player.width * 0.65;
      if (distToPlayer < mouthRange) {
        // CHOMP SNACK!
        h.health = 0;
        humansCountRef.current++;
        accumulatedDnaRef.current += h.type === 'scientist' ? 10 : h.type === 'police' ? 5 : 3;
        scoreRef.current += 100;

        // Sound effect
        audio.playMunch();

        // Feed energy
        player.energy = Math.min(100, player.energy + 8);

        // Splat blood splatter & Text "+1 DNA"
        for (let i = 0; i < 8; i++) {
          particlesRef.current.push({
            id: `blood-${Date.now()}-${i}-${Math.random()}`,
            x: h.x,
            y: h.y,
            vx: (Math.random() * 5 - 2.5),
            vy: (Math.random() * 5 - 2.5),
            color: monsterId === 'slime' ? '#a855f7' : '#ef4444',
            size: 3 + Math.random() * 3,
            life: 20,
            maxLife: 20,
            type: 'blood',
          });
        }

        particlesRef.current.push({
          id: `dna-${Date.now()}`,
          x: h.x,
          y: h.y - 10,
          vx: 0,
          vy: -1.5,
          color: '#fbbf24',
          size: 10,
          life: 45,
          maxLife: 45,
          type: 'text',
          text: h.type === 'scientist' ? '+10 DNA! 🧬' : '+3 DNA! 🧬',
        });

        // Mutate size progress!
        // The monster grows depending on humans consumed
        const sizeIncrement = (2.2 / Math.sqrt(player.sizeMeters)); // larger growth rate, growing even bigger fast!
        player.sizeMeters += sizeIncrement;
        maxMetersAchievedRef.current = Math.max(maxMetersAchievedRef.current, player.sizeMeters);
        
        // Visual physical scale width
        player.width = 44 + (player.sizeMeters - 1.5) * 2.8;
        player.height = 44 + (player.sizeMeters - 1.5) * 2.8;
        
        // Spawn grow particle bursts on clear thresholds
        if (Math.floor(player.sizeMeters) > Math.floor(player.sizeMeters - sizeIncrement) && Math.floor(player.sizeMeters) % 10 === 0) {
          audio.playGrow();
          triggerRadialShockwave();
          particlesRef.current.push({
            id: `grow-txt-${Date.now()}`,
            x: player.x,
            y: player.y - player.height * 0.7,
            vx: 0,
            vy: -2,
            color: '#10b981',
            size: 14,
            life: 60,
            maxLife: 60,
            type: 'text',
            text: `GROWTH BOOST! ${Math.floor(player.sizeMeters)} METERS`,
          });
        }

        return; // eaten
      }

      // Check panic sirens
      if (distToPlayer < 300) {
        h.isPanicked = true;
        h.panicTimer = 60; // 1 second
        
        // Scream dialogue text bubble
        h.screamCooldown--;
        if (h.screamCooldown <= 0) {
          h.screamText = ['AAAHAHH!!', 'IT\'S GIGANTIC!', 'RUN AWAY!!', 'HEELP!!', 'OH NO!'][Math.floor(Math.random() * 5)];
          h.screamCooldown = 150 + Math.random() * 150;
          
          audio.playScream();
        }
      }

      if (h.isPanicked) {
        h.panicTimer--;
        if (h.panicTimer <= 0) h.isPanicked = false;

        // Move away from player at speed (made slower for fun and ease of control)
        const angle = Math.atan2(h.y - player.y, h.x - player.x);
        h.vx = Math.cos(angle) * (0.8 + Math.random() * 0.7);
        h.vy = Math.sin(angle) * (0.8 + Math.random() * 0.7);
      } else {
        // Passive idle patrol (made slower for visual leisure)
        if (frameCountRef.current % 90 === 0 && Math.random() > 0.6) {
          const randAng = Math.random() * Math.PI * 2;
          h.vx = Math.cos(randAng) * 0.25;
          h.vy = Math.sin(randAng) * 0.25;
          h.screamText = null;
        }
      }

      // Apply physics displacement
      h.x += h.vx;
      h.y += h.vy;

      // Wrap inside streets or fences
      h.x = Math.max(10, Math.min(MAP_SIZE.width - 10, h.x));
      h.y = Math.max(10, Math.min(MAP_SIZE.height - 10, h.y));

      // Soldier firing sidearms logic
      if (h.type === 'soldier' && distToPlayer < 240) {
        h.vx = -h.vx * 0.2; // Halt slightly to fire weapon
        h.vy = -h.vy * 0.2;

        if (frameCountRef.current % 45 === 0 && Math.random() > 0.4) {
          const bAngle = Math.atan2(player.y - h.y, player.x - h.x) + (Math.random() * 0.2 - 0.1);
          projectilesRef.current.push({
            id: `proj-${Date.now()}-${Math.random()}`,
            x: h.x,
            y: h.y,
            vx: Math.cos(bAngle) * 5,
            vy: Math.sin(bAngle) * 5,
            damage: 2,
            type: 'bullet',
            size: 2,
          });
        }
      }
    });
    humansRef.current = remainingHumans;

    // Keep humans populated near player
    if (humansRef.current.length < 50) {
      spawnHuman(humansRef.current, true);
    }

    // 7. Update Vehicles
    const remainingVehicles = vehiclesRef.current.filter((v) => v.health > 0);
    remainingVehicles.forEach((v) => {
      const vdx = player.x - v.x;
      const vdy = player.y - v.y;
      const dist = Math.sqrt(vdx * vdx + vdy * vdy);

      // AI Logic for Vehicles:
      if (v.type === 'car') {
        // Scared civilians driving
        if (dist < 220) {
          const escapeAngle = Math.atan2(v.y - player.y, v.x - player.x);
          v.vx = Math.cos(escapeAngle) * 4.5;
          v.vy = Math.sin(escapeAngle) * 4.5;
        } else {
          // Patrol streets
          if (frameCountRef.current % 120 === 0) {
            v.vx = (Math.random() * 2 - 1) * 2;
            v.vy = (Math.random() * 2 - 1) * 2;
          }
        }
      } else if (v.type === 'police_cruiser') {
        // Chases player to pin him down
        if (dist > 150) {
          const angle = Math.atan2(player.y - v.y, player.x - v.x);
          v.vx = Math.cos(angle) * 3.8;
          v.vy = Math.sin(angle) * 3.8;
        } else {
          // Circle and shoot
          const angle = Math.atan2(v.y - player.y, v.x - player.x) + 0.5;
          v.vx = Math.cos(angle) * 3;
          v.vy = Math.sin(angle) * 3;
        }

        // Fire bullets
        v.fireCooldown--;
        if (v.fireCooldown <= 0 && dist < 320) {
          v.fireCooldown = 60 + Math.random() * 40;
          const bulletAngle = Math.atan2(player.y - v.y, player.x - v.x);
          projectilesRef.current.push({
            id: `proj-${Date.now()}-${Math.random()}`,
            x: v.x,
            y: v.y,
            vx: Math.cos(bulletAngle) * 7,
            vy: Math.sin(bulletAngle) * 7,
            damage: 4,
            type: 'bullet',
            size: 3,
          });
        }
      } else if (v.type === 'tank') {
        // Slow gun pivot
        const steerAngle = Math.atan2(vdy, vdx);
        v.targetAngle = steerAngle;

        // Position slightly away to bombard
        if (dist > 300) {
          v.vx = Math.cos(steerAngle) * 1.5;
          v.vy = Math.sin(steerAngle) * 1.5;
        } else if (dist < 180) {
          v.vx = -Math.cos(steerAngle) * 1.2;
          v.vy = -Math.sin(steerAngle) * 1.2;
        } else {
          v.vx = 0;
          v.vy = 0;
        }

        v.fireCooldown--;
        if (v.fireCooldown <= 0 && dist < 500) {
          v.fireCooldown = 130 + Math.random() * 80;
          
          // Flash shoot fires sparks
          addHitSparks(v.x + Math.cos(steerAngle) * 20, v.y + Math.sin(steerAngle) * 20, '#f59e0b');

          projectilesRef.current.push({
            id: `proj-${Date.now()}-${Math.random()}`,
            x: v.x + Math.cos(steerAngle) * 22,
            y: v.y + Math.sin(steerAngle) * 22,
            vx: Math.cos(steerAngle) * 6,
            vy: Math.sin(steerAngle) * 6,
            damage: 15,
            type: 'shell',
            size: 5,
          });
        }
      } else if (v.type === 'helicopter') {
        // Circle higher above ground
        const circleRad = frameCountRef.current * 0.02;
        const hoverTargetX = player.x + Math.cos(circleRad) * 240;
        const hoverTargetY = player.y - 120 + Math.sin(circleRad) * 100;

        v.vx = (hoverTargetX - v.x) * 0.05;
        v.vy = (hoverTargetY - v.y) * 0.05;

        v.fireCooldown--;
        if (v.fireCooldown <= 0 && dist < 650) {
          v.fireCooldown = 110 + Math.random() * 60;
          const targetAng = Math.atan2(player.y - v.y, player.x - v.x);
          
          projectilesRef.current.push({
            id: `proj-${Date.now()}-${Math.random()}`,
            x: v.x,
            y: v.y,
            vx: Math.cos(targetAng) * 8,
            vy: Math.sin(targetAng) * 8,
            damage: 22,
            type: 'rocket',
            size: 4,
          });
        }
      }

      // Stomp damage check
      // Running directly OVER vehicles crushes them if giant is big enough!
      if (player.sizeMeters > 15 && dist < player.width * 0.5) {
        v.health -= 5; // Passive crushing damage
        if (v.health <= 0 && Math.random() > 0.4) {
          scoreRef.current += 1500;
          militaryCountRef.current++;
          audio.playExplosion();
          cameraRef.current.shake = 12;
          addHitSparks(v.x, v.y, '#f59e0b');
          
          // Splat DNA reward
          accumulatedDnaRef.current += v.type === 'tank' ? 30 : v.type === 'helicopter' ? 25 : 12;
        }
      }

      v.x += v.vx;
      v.y += v.vy;

      // Restrict vehicles to map edges (helicopter can fly freely)
      if (v.type !== 'helicopter') {
        v.x = Math.max(20, Math.min(MAP_SIZE.width - 20, v.x));
        v.y = Math.max(20, Math.min(MAP_SIZE.height - 20, v.y));
      }
    });

    // Handle dead vehicles expending scores
    vehiclesRef.current.forEach((veh) => {
      if (veh.health <= 0) {
        // Spawn huge explosions
        audio.playExplosion();
        for (let i = 0; i < 7; i++) {
          particlesRef.current.push({
            id: `smoke-v-${Date.now()}-${i}`,
            x: veh.x + (Math.random() * 24 - 12),
            y: veh.y + (Math.random() * 24 - 12),
            vx: (Math.random() * 4 - 2),
            vy: -1 - Math.random() * 2,
            color: '#ef4444',
            size: 8 + Math.random() * 10,
            life: 25,
            maxLife: 25,
            type: 'fire',
          });
        }
        
        militaryCountRef.current++;
        accumulatedDnaRef.current += veh.type === 'tank' ? 30 : veh.type === 'helicopter' ? 20 : 10;
        scoreRef.current += veh.type === 'tank' ? 800 : veh.type === 'helicopter' ? 1200 : 400;
      }
    });

    vehiclesRef.current = remainingVehicles;

    // Keep active military responding
    if (vehiclesRef.current.length < 12) {
      spawnVehicle(vehiclesRef.current);
    }

    // 8. Update Projectiles
    const remainingProj = projectilesRef.current.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;

      const limits = p.x < 0 || p.x > MAP_SIZE.width || p.y < 0 || p.y > MAP_SIZE.height;
      if (limits) return false;

      // Collision with player monster
      const pdx = player.x - p.x;
      const pdy = player.y - p.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

      if (pdist < player.width * 0.5) {
        // Player takes hit
        if (player.invulnFrames <= 0) {
          player.health = Math.max(0, player.health - p.damage);
          player.invulnFrames = 15; // flashes red brief invincibility frames
          cameraRef.current.shake = Math.min(10, p.damage * 0.5);
          
          audio.playHurt();

          if (player.health <= 0) {
            triggerGameOver(false);
          }
        }

        // Hit smoke particle
        particlesRef.current.push({
          id: `sp-${Date.now()}-${Math.random()}`,
          x: p.x,
          y: p.y,
          vx: -p.vx * 0.3,
          vy: -p.vy * 0.3,
          color: '#ef4444',
          size: 4,
          life: 10,
          maxLife: 10,
          type: 'spark',
        });

        return false;
      }
      return true;
    });
    projectilesRef.current = remainingProj;

    // 9. Update Particles
    const remainingParticles = particlesRef.current.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });
    particlesRef.current = remainingParticles;

    // 10. Update Active Street Overlay Info depending on player coordinates
    if (frameCountRef.current % 180 === 0) {
      const idx = Math.floor((player.x / MAP_SIZE.width) * CITY_STREET_NAMES.length);
      currentStreetRef.current = CITY_STREET_NAMES[Math.min(CITY_STREET_NAMES.length - 1, idx)];
    }

    // Passive Special Energy recharge
    if (!player.isSpecialActive && frameCountRef.current % 15 === 0) {
      player.energy = Math.min(100, player.energy + 1 * specBuff);
    }

    // Sync high level stats to React UI states occasionally
    if (frameCountRef.current % 10 === 0) {
      setHudStats({
        health: player.health,
        maxHealth: player.maxHealth,
        energy: player.energy,
        sizeMeters: player.sizeMeters,
        growthProgress: Math.min(100, Math.floor((player.sizeMeters / 150) * 100)),
        score: scoreRef.current,
        highScore: Math.max(scoreRef.current, hudStats.highScore),
        buildingsDestroyed: buildingsCountRef.current,
        humansEaten: humansCountRef.current,
        militaryDestroyed: militaryCountRef.current,
        isGameOver: false,
        dnaEarned: accumulatedDnaRef.current,
        timeRemaining: timeLimitRef.current,
      });
    }

    // Render loop
    drawGameScene();

    // Trigger next request frame
    gameLoopRef.current = requestAnimationFrame(gameTick);
  };

  const drawGameScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cam = cameraRef.current;
    const player = playerRef.current;

    // Background Canvas Cleansing
    ctx.resetTransform();
    ctx.fillStyle = '#0f172a'; // Deep midnight color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Camera coordinate calculations with shake offset multiplier
    let camSx = cam.x;
    let camSy = cam.y;
    if (cam.shake > 0) {
      camSx += (Math.random() * 2 - 1) * cam.shake;
      camSy += (Math.random() * 2 - 1) * cam.shake;
    }

    // Transform Canvas Viewport Matrix relative to Player Size Zoom scale!
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-camSx, -camSy);

    // 1. Draw Grid Streets lines on Asphalt floor of Map
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    const gridSpacing = 200;
    
    ctx.beginPath();
    for (let x = 0; x < MAP_SIZE.width; x += gridSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_SIZE.height);
    }
    for (let y = 0; y < MAP_SIZE.height; y += gridSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_SIZE.width, y);
    }
    ctx.stroke();

    // Draw boundary safety fence bounds
    ctx.strokeStyle = '#ef444450';
    ctx.lineWidth = 15;
    ctx.strokeRect(0, 0, MAP_SIZE.width, MAP_SIZE.height);

    // 2. Render collapsing procedural Projected Buildings in depth layered rows
    const bSorted = [...buildingsRef.current].sort((a, b) => a.y - b.y);
    bSorted.forEach((b) => {
      drawBuildingShadow(ctx, b);
    });

    // 3. Render Eaten victims/civilians
    // 3. Render Fleeing Civilian Humans (Procedural Vector Silhouettes)
    humansRef.current.forEach((h) => {
      ctx.save();
      
      // Little floating shadow under feet
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.ellipse(h.x, h.y + h.size * 0.9, h.size * 0.8, h.size * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();

      // Walking swing logic
      const swing = Math.sin(frameCountRef.current * 0.25 + h.x) * (h.size * 0.45);

      // Torso / Suit depending on civilian / soldier / scientist / police
      ctx.fillStyle = h.type === 'scientist' ? '#e2e8f0' : h.type === 'police' ? '#1e3a8a' : h.type === 'soldier' ? '#14532d' : h.color;
      ctx.beginPath();
      ctx.roundRect(h.x - h.size * 0.38, h.y - h.size * 0.1, h.size * 0.76, h.size * 0.78, h.size * 0.2);
      ctx.fill();

      // Unit specific vectorized items (glowing badges, caps, or helmets)
      if (h.type === 'police') {
        // Police Cap
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(h.x, h.y - h.size * 0.62, h.size * 0.45, Math.PI, Math.PI * 2);
        ctx.fill();
        // Shiny gold badge
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(h.x, h.y + h.size * 0.15, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (h.type === 'soldier') {
        // Soldier Helmet
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(h.x, h.y - h.size * 0.65, h.size * 0.48, Math.PI, Math.PI * 2);
        ctx.fill();
      } else if (h.type === 'scientist') {
        // Lab Coat lining splits
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y - h.size * 0.05);
        ctx.lineTo(h.x, h.y + h.size * 0.68);
        ctx.stroke();
      }

      // Head Circle
      ctx.fillStyle = h.type === 'scientist' || h.type === 'civilian' ? '#fecdd3' : h.color; // Skin tone colors
      ctx.beginPath();
      ctx.arc(h.x, h.y - h.size * 0.32, h.size * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // Jointed leg walk sequences (smooth lines)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(1.5, h.size * 0.2);
      ctx.lineCap = 'round';
      
      // Left leg
      ctx.beginPath();
      ctx.moveTo(h.x - h.size * 0.18, h.y + h.size * 0.6);
      ctx.lineTo(h.x - h.size * 0.2 + swing * 0.4, h.y + h.size * 0.8);
      ctx.lineTo(h.x - h.size * 0.22 + swing * 0.7, h.y + h.size * 0.95);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(h.x + h.size * 0.18, h.y + h.size * 0.6);
      ctx.lineTo(h.x + h.size * 0.2 - swing * 0.4, h.y + h.size * 0.8);
      ctx.lineTo(h.x + h.size * 0.22 - swing * 0.7, h.y + h.size * 0.95);
      ctx.stroke();

      ctx.restore();

      // Speech bubble text bubble screaming
      if (h.screamText && h.isPanicked && Math.random() > 0.35) {
        ctx.save();
        ctx.font = 'bold 8px monospace';
        const txtW = ctx.measureText(h.screamText).width;
        const boxW = txtW + 10;
        const boxH = 13;
        const bx = h.x - boxW / 2;
        const by = h.y - h.size * 2 - 13;

        // Bubble hover shadow
        ctx.shadowColor = 'rgba(15, 23, 42, 0.15)';
        ctx.shadowBlur = 4;

        // Clean white bubble container
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0; // reset shadow

        // Little speech pointer bubble tail pointer
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(h.x - 3, by + boxH);
        ctx.lineTo(h.x, by + boxH + 3.5);
        ctx.lineTo(h.x + 3, by + boxH);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(h.x - 3, by + boxH);
        ctx.lineTo(h.x, by + boxH + 3.5);
        ctx.stroke();

        ctx.fillStyle = '#ef4444'; // screaming alert crimson font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(h.screamText, h.x, by + boxH / 2);
        ctx.restore();
      }
    });

    // 4. Render Active Army / Police Vehicles (Sleek Vector Designs)
    vehiclesRef.current.forEach((veh) => {
      ctx.save();
      ctx.imageSmoothingEnabled = true;

      // 1. Draw vehicle shadow on the ground
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.ellipse(veh.x + 3, veh.y + 7, veh.type === 'tank' ? 20 : 13, veh.type === 'helicopter' ? 18 : 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(veh.x, veh.y);

      // Determine rotation angle
      const movementAng = Math.atan2(veh.vy, veh.vx);
      ctx.rotate(movementAng);

      // Car configurations
      const carW = veh.type === 'car' ? 22 : veh.type === 'police_cruiser' ? 24 : veh.type === 'tank' ? 34 : 38;
      const carH = veh.type === 'car' ? 12 : veh.type === 'police_cruiser' ? 13 : veh.type === 'tank' ? 20 : 16;

      if (veh.type === 'helicopter') {
        // A. Helicopter: Sleek futuristic sci-fi design
        ctx.fillStyle = '#475569'; // steel armor metallic body
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;

        // Tail boom
        ctx.beginPath();
        ctx.moveTo(-carW * 0.2, 0);
        ctx.lineTo(-carW * 0.9, -1);
        ctx.lineTo(-carW * 0.9, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Main Fuselage cabin
        ctx.beginPath();
        ctx.ellipse(0, 0, carW * 0.5, carH * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Helicopter glass visor dome cockpits
        ctx.fillStyle = '#06b6d4'; // bright glowing cyan cockpit glass
        ctx.beginPath();
        ctx.ellipse(carW * 0.22, 0, carW * 0.2, carH * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Gloss glare line on nose
        ctx.strokeStyle = '#ffffffaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(carW * 0.22, -2, carW * 0.1, carH * 0.15, Math.PI * 0.1, 0, Math.PI);
        ctx.stroke();

        // Tail Wings
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-carW * 0.85, -carH * 0.45, 3, carH * 0.9);

        // Spinning Tail Rotor (Circle indicator)
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-carW * 0.92, -carH * 0.2, 5, 0, Math.PI * 2);
        ctx.stroke();

        // High-speed main rotor shadow lines spinning
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)';
        ctx.lineWidth = 2;
        const spinA = (frameCountRef.current * 0.95) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(Math.cos(spinA) * 28, Math.sin(spinA) * 28);
        ctx.lineTo(-Math.cos(spinA) * 28, -Math.sin(spinA) * 28);
        ctx.stroke();

        // Center hub cap bolt
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

      } else if (veh.type === 'tank') {
        // B. Tank: Camouflage caterpillar armor beast
        ctx.fillStyle = '#0f172a'; // Tread background plate
        ctx.beginPath();
        ctx.roundRect(-carW / 2 - 2, -carH / 2 - 3, carW + 4, carH + 6, 4);
        ctx.fill();

        // Track wheels detailing dots
        ctx.fillStyle = '#475569';
        for (let w = 0; w < 5; w++) {
          const wx = -carW / 2 + 3 + (w * (carW - 6) / 4);
          ctx.beginPath();
          ctx.arc(wx, -carH / 2 - 1.5, 2, 0, Math.PI * 2);
          ctx.arc(wx, carH / 2 + 1.5, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Heavy armor body
        ctx.fillStyle = '#2d4a16'; // dark camo green
        ctx.strokeStyle = '#143d11';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-carW / 2, -carH / 2, carW, carH, 5);
        ctx.fill();
        ctx.stroke();

        // Armor plate accent hatch
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(-carW * 0.22, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Rotatable dynamic turret face to player
        ctx.restore();
        ctx.save();
        ctx.translate(veh.x, veh.y);
        ctx.rotate(veh.targetAngle || 0);

        // Turret gun housing pod
        ctx.fillStyle = '#166534';
        ctx.strokeStyle = '#143d11';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-7, -7, 15, 14, 3);
        ctx.fill();
        ctx.stroke();

        // Gun muzzle barrel extension
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(8, -2.2, 18, 4.4); // gun barrel steel tube
        ctx.fillStyle = '#f59e0b'; // muzzle brakes brass accent
        ctx.fillRect(23, -3, 3, 6);

      } else if (veh.type === 'police_cruiser') {
        // C. Police Cruiser: High contract executive interceptor
        ctx.fillStyle = '#0f172a'; // black front fender
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-carW / 2, -carH / 2, carW, carH, 4);
        ctx.fill();
        ctx.stroke();

        // White side panels door paint jobs
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(-carW * 0.15, -carH / 2 + 1, carW * 0.32, carH - 2);

        // Windshield and back glass
        ctx.fillStyle = '#0891b2';
        ctx.fillRect(carW * 0.15, -carH * 0.35, 3, carH * 0.7); // Front wind
        ctx.fillRect(-carW * 0.33, -carH * 0.35, 2, carH * 0.7); // Rear wind

        // Flashing blue-red neon police lights
        const isBlueFlasher = frameCountRef.current % 14 > 7;
        ctx.fillStyle = isBlueFlasher ? '#3b82f6' : '#ef4444';
        ctx.shadowColor = isBlueFlasher ? '#3b82f6' : '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fillRect(-2, -carH / 2 + 1, 4, carH - 2);
        ctx.shadowBlur = 0; // reset glow

      } else {
        // D. Civilian Sedans: Stylish rounded vector hatchbacks
        const colorPalette = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
        const seedIndex = Math.abs(veh.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colorPalette.length;
        const carSeedCol = colorPalette[seedIndex];

        ctx.fillStyle = carSeedCol;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-carW / 2, -carH / 2, carW, carH, 5);
        ctx.fill();
        ctx.stroke();

        // Glass cabin top outline
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(-carW * 0.22, -carH * 0.35, carW * 0.44, carH * 0.7, 2);
        ctx.fill();

        // Window Glass reflection shine
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.roundRect(-carW * 0.16, -carH * 0.28, carW * 0.32, carH * 0.56, 1.5);
        ctx.fill();
      }

      ctx.restore();
    });

    // 5. Render Projected isometric Building Facades
    bSorted.forEach((b) => {
      drawBuildingIsometric(ctx, b);
    });

    // 6. Draw Player Monster! (Beautifully vectorized with anti-aliasing, glowing neon features, and smooth animation body parts instead of pixel grids!)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.imageSmoothingEnabled = true;

    // Flip horizontally based on facing direction
    const facingSign = player.direction === 'left' ? -1 : 1;
    ctx.scale(facingSign, 1);

    // Flash red visual effect on damage invuln frames
    if (player.invulnFrames > 0 && Math.floor(player.invulnFrames / 2) % 2 === 0) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 20;
    }

    // Smooth movement wobbling for limbs
    const swingPhase = (player.vx !== 0 || player.vy !== 0) ? Math.sin(frameCountRef.current * 0.2) : 0;
    const bodyWobble = (player.vx !== 0 || player.vy !== 0) ? Math.sin(frameCountRef.current * 0.4) * 2 : 0;
    const radSize = player.width / 2;

    if (monsterId === 'reptile') {
      // 🦎 REPTILE: Deep scaly green biological monster with sweeping glowing orange bio-ridges, a jointed tail, and neon laser eyes
      
      // A. Wiggling tail sections (rendered behind body)
      ctx.save();
      const tailCount = 4;
      for (let i = tailCount; i > 0; i--) {
        const segRad = radSize * 0.5 * (1 - (i / (tailCount + 1)));
        const tailX = -radSize * 0.95 - (i * radSize * 0.45);
        const tailY = radSize * 0.2 + (Math.sin(frameCountRef.current * 0.15 - i * 0.5) * radSize * 0.18) + (swingPhase * 3);
        
        ctx.fillStyle = selectedMonster.color;
        ctx.strokeStyle = '#064e3b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tailX, tailY, segRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Spikes on tail
        ctx.fillStyle = player.isSpecialActive ? '#f59e0b' : selectedMonster.secondaryColor;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY - segRad);
        ctx.lineTo(tailX - segRad * 0.5, tailY - segRad * 1.6);
        ctx.lineTo(tailX + segRad * 0.5, tailY - segRad * 1.6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // B. Strong legs stomp animations (two separate rounded limbs with sharp claws)
      for (let leg = 0; leg < 2; leg++) {
        const legMultiplier = leg === 0 ? 1 : -1;
        const stompH = legMultiplier * swingPhase * 4;
        const legX = -radSize * 0.35 + (leg * radSize * 0.55);
        const legY = radSize * 0.6 + (stompH > 0 ? -stompH : 0);

        // Foot shell
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.ellipse(legX, legY, radSize * 0.3, radSize * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Soft yellow nails/claws
        ctx.fillStyle = '#fdf0d5';
        ctx.beginPath();
        ctx.arc(legX + radSize * 0.15, legY + radSize * 0.3, radSize * 0.08, 0, Math.PI * 2);
        ctx.arc(legX + radSize * 0.25, legY + radSize * 0.2, radSize * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      // C. Dense Muscular Body torso with soft off-white bellies plate
      ctx.fillStyle = selectedMonster.color;
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.ellipse(0, bodyWobble * 0.3, radSize * 0.9, radSize * 0.95, Math.PI * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bellies contrast
      ctx.fillStyle = '#fdf0d5';
      ctx.beginPath();
      ctx.ellipse(radSize * 0.3, bodyWobble * 0.3 + radSize * 0.1, radSize * 0.4, radSize * 0.65, Math.PI * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // D. Jagged Glowing Bio-spinal ridges (Giga-Lizard signature dorsal plates)
      const dorsalSpikes = 4;
      ctx.fillStyle = player.isSpecialActive ? '#f59e0b' : selectedMonster.secondaryColor;
      if (player.isSpecialActive) {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
      }
      for (let s = 0; s < dorsalSpikes; s++) {
        const sx = -radSize * 0.7 + (s * radSize * 0.38);
        const sy = -radSize * 0.7 - (Math.abs(Math.sin(s * 1.2)) * 3) + bodyWobble * 0.3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - radSize * 0.15, sy - radSize * 0.45);
        ctx.lineTo(sx + radSize * 0.2, sy - radSize * 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0; // reset shadow

      // E. Head and cybernetically glowing red eye
      ctx.fillStyle = selectedMonster.color;
      ctx.beginPath();
      ctx.ellipse(radSize * 0.7, -radSize * 0.5 + bodyWobble * 0.5, radSize * 0.65, radSize * 0.55, -Math.PI * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing cybernetic neon slit-eye
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(radSize * 0.9, -radSize * 0.65 + bodyWobble * 0.5, radSize * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Snarling mouth with cute rows of teeth
      ctx.fillStyle = '#fdf0d5';
      ctx.beginPath();
      ctx.moveTo(radSize * 1.1, -radSize * 0.4 + bodyWobble * 0.5);
      ctx.lineTo(radSize * 0.9, -radSize * 0.45 + bodyWobble * 0.5);
      ctx.lineTo(radSize * 1.0, -radSize * 0.35 + bodyWobble * 0.5);
      ctx.closePath();
      ctx.fill();

      // F. Atomic stream effect
      if (player.isSpecialActive) {
        // Render bright energy aura circling muzzle
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(radSize * 1.15, -radSize * 0.4 + bodyWobble * 0.5, 6 + Math.sin(frameCountRef.current * 0.8) * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

    } else if (monsterId === 'gorilla') {
      // 🦍 GORILLA: A technical cyber-mecha titan with hydraulic heavy piston fists, iron face visor and blue glowing core coolant pipes
      
      // A. Hydraulic legs
      for (let leg = 0; leg < 2; leg++) {
        const stompH = leg === 0 ? swingPhase * 5 : -swingPhase * 5;
        const legX = -radSize * 0.45 + (leg * radSize * 0.75);
        const legY = radSize * 0.6 + (stompH > 0 ? -stompH : 0);

        ctx.fillStyle = '#334155'; // Dark metallic steel
        ctx.fillRect(legX - radSize * 0.25, legY, radSize * 0.5, radSize * 0.3);

        // Neon joint
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(legX - radSize * 0.15, legY + 2, radSize * 0.3, 3);
      }

      // B. Giant armored chest plates with dynamic glowing tech energy core
      ctx.fillStyle = selectedMonster.color; // steel grey slate
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-radSize * 0.95, -radSize * 0.65 + bodyWobble * 0.5, radSize * 1.8, radSize * 1.25, 12);
      ctx.fill();
      ctx.stroke();

      // Glowing mechanical power engine chest core
      ctx.save();
      ctx.fillStyle = '#3b82f6';
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 10 + Math.sin(frameCountRef.current * 0.3) * 4;
      ctx.beginPath();
      ctx.ellipse(radSize * 0.3, bodyWobble * 0.5, radSize * 0.3, radSize * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // C. Sturdy tech helmet with neon cobalt visor light
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(radSize * 0.5, -radSize * 0.82 + bodyWobble * 0.6, radSize * 0.52, radSize * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing cyan horizontal eye visor plate
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.fillRect(radSize * 0.45, -radSize * 0.95 + bodyWobble * 0.6, radSize * 0.46, radSize * 0.12);
      ctx.shadowBlur = 0;

      // D. Massive dynamic hydraulic Piston power fists swinging
      const fistsCount = 2;
      for (let f = 0; f < fistsCount; f++) {
        const fistMultiplier = f === 0 ? 1 : -1;
        const swingOffset = fistMultiplier * swingPhase * radSize * 0.5;
        const fistX = radSize * 0.7 + swingOffset;
        const fistY = radSize * 0.15 - swingOffset * 0.3 + bodyWobble * 0.5;

        // Arm steel pneumatic cylinders
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-radSize * 0.2 + (f * radSize * 0.3), -radSize * 0.3 + bodyWobble * 0.5, radSize * 0.8, radSize * 0.25);

        // Massive knuckle
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(fistX, fistY, radSize * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Neon energy knucklestripes
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(fistX + 2, fistY - radSize * 0.3, 4, radSize * 0.6);
      }

    } else {
      // 🧪 SLIME: A flowing translucent metabolic bio-slime blob with moving nucleus structures and floating acid spheres
      ctx.save();
      
      // Undulating outer soft body membrane constructed by overlapping smooth curve angles
      ctx.fillStyle = selectedMonster.color; // purple
      ctx.strokeStyle = '#701a75';
      ctx.lineWidth = 2.5;

      // Glow backing
      ctx.shadowColor = selectedMonster.color;
      ctx.shadowBlur = 15;

      const membranePoints = 12;
      ctx.beginPath();
      for (let i = 0; i < membranePoints; i++) {
        const ang = (i / membranePoints) * Math.PI * 2;
        // Fluctuating gooey radius based on cosine waves
        const organicRadius = radSize * 0.95 + Math.cos(frameCountRef.current * 0.15 + i * 1.4) * (radSize * 0.12);
        const mx = Math.cos(ang) * organicRadius;
        const my = Math.sin(ang) * organicRadius + bodyWobble * 0.2;
        if (i === 0) {
          ctx.moveTo(mx, my);
        } else {
          ctx.lineTo(mx, my);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Translucent inner biohazard core
      ctx.fillStyle = selectedMonster.secondaryColor + 'df'; // translucent neon green
      ctx.beginPath();
      ctx.arc(radSize * 0.1, bodyWobble * 0.2, radSize * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // B. Inside nucleus/organelles swimming dynamically
      const cores = 3;
      for (let c = 0; c < cores; c++) {
        const cx = Math.sin(frameCountRef.current * 0.08 + c * 2.1) * radSize * 0.35 + radSize * 0.1;
        const cy = Math.cos(frameCountRef.current * 0.08 + c * 2.1) * radSize * 0.35 + bodyWobble * 0.2;
        ctx.fillStyle = '#e9d5ff';
        ctx.beginPath();
        ctx.arc(cx, cy, radSize * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }

      // C. Multi-eyed glowing visual spots
      const eyes = [
        { x: radSize * 0.38, y: -radSize * 0.2 },
        { x: radSize * 0.54, y: radSize * 0.05 },
        { x: radSize * 0.22, y: radSize * 0.36 }
      ];
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      eyes.forEach((ey) => {
        ctx.beginPath();
        ctx.arc(ey.x, ey.y + bodyWobble * 0.2, radSize * 0.08, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // D. Outer toxic satellites/droplets circling slime
      const droplets = 3;
      for (let d = 0; d < droplets; d++) {
        const orbitSpeed = frameCountRef.current * 0.04 + d * (Math.PI * 2 / droplets);
        const dx = Math.cos(orbitSpeed) * radSize * 1.5;
        const dy = Math.sin(orbitSpeed) * radSize * 1.5 + bodyWobble * 0.2;
        ctx.fillStyle = selectedMonster.secondaryColor;
        ctx.beginPath();
        ctx.arc(dx, dy, radSize * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Draw active special ability custom visuals
    if (player.isSpecialActive) {
      if (monsterId === 'slime') {
        // Glowing radioactive poison ring expanding and collapsing
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, radSize * 1.6 + Math.sin(frameCountRef.current * 0.3) * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();

    // 7. Render Projectiles in Flight
    projectilesRef.current.forEach((p) => {
      ctx.fillStyle = p.type === 'bullet' ? '#fbbf24' : p.type === 'shell' ? '#ea580c' : '#ef4444';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Rocket flame trails
      if (p.type === 'rocket' && Math.random() > 0.4) {
        particlesRef.current.push({
          id: `f-${Date.now()}-${Math.random()}`,
          x: p.x - p.vx * 1.5,
          y: p.y - p.vy * 1.5,
          vx: -p.vx * 0.1,
          vy: -p.vy * 0.1,
          color: '#f97316',
          size: 3,
          life: 8,
          maxLife: 8,
          type: 'fire',
        });
      }
    });

    // 8. Draw Particle Splats
    particlesRef.current.forEach((p) => {
      if (p.type === 'text') {
        // Draw float label text block
        ctx.fillStyle = p.color;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.text || '', p.x, p.y);
      } else if (p.type === 'laser') {
        // Draw circle glows
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife * 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      } else if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife * 0.45;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      } else {
        // Standard blocky pixel particles
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    });

    // Reset layout alignment
    ctx.resetTransform();
  };

  // Pseudo-3D Isometric projected graphics formulas
  const drawBuildingShadow = (ctx: CanvasRenderingContext2D, b: Building) => {
    // Street footprint shadow
    ctx.fillStyle = b.isDestroyed ? '#1e293b' : 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(b.x - 4, b.y - 4, b.width + 8, b.height + 8);
  };

  const drawBuildingIsometric = (ctx: CanvasRenderingContext2D, b: Building) => {
    if (b.isDestroyed) {
      // Draw crushed rubble brick pile
      ctx.fillStyle = b.debrisColor;
      ctx.fillRect(b.x + 8, b.y + 8, b.width - 16, b.height - 16);
      
      // Broken small brick details
      ctx.fillStyle = '#1e293b';
      for (let i = 0; i < 5; i++) {
        const bx = b.x + 15 + (i * (b.width - 30) / 4);
        const by = b.y + 15 + Math.sin(i * 3) * 10;
        ctx.fillRect(bx, by, 7, 4);
      }
      return;
    }

    // Extrude isometric projections straight VERTICALLY UPWARD for 3D simulation!
    const extrudePixels = b.stories * 26; // vertical scale facade height
    const roofX = b.x;
    const roofY = b.y - extrudePixels;

    // Draw Front Facade shading wall
    ctx.fillStyle = '#27272a'; // Deep charcoal wall body
    ctx.fillRect(b.x, roofY, b.width, b.y - roofY);

    // Draw Left shading wall
    ctx.fillStyle = '#18181b'; // Dark shadow wall corner
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x, roofY);
    ctx.lineTo(b.x + 12, roofY + 12);
    ctx.lineTo(b.x + 12, b.y);
    ctx.closePath();
    ctx.fill();

    // Draw Roof cover slab
    ctx.fillStyle = '#3f3f46'; // lighter concrete top roof
    ctx.fillRect(b.x, roofY, b.width, b.height * 0.15);
    ctx.strokeStyle = '#71717a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x, roofY, b.width, b.height * 0.15);

    // Render columns of office light windows
    ctx.fillStyle = '#fef08a'; // Glowing yellow offices
    const rows = b.stories;
    const cols = Math.floor(b.width / 24);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Toggle light boolean check
        if (b.windowMatrix[r]?.[c]) {
          const windowW = 6;
          const windowH = 9;
          const wx = b.x + 15 + c * 20;
          const wy = roofY + b.height * 0.15 + 10 + r * 22;

          // Only draw window if it fits in active facade vertical box
          if (wy + windowH < b.y) {
            ctx.fillRect(wx, wy, windowW, windowH);
          }
        }
      }
    }

    // Fractures/Cracks as building health deteriorates
    const damagePercent = 1.0 - (b.health / b.maxHealth);
    if (damagePercent > 0.2) {
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(b.x + b.width / 2, roofY + 15);
      
      const fractureLines = Math.min(5, Math.ceil(damagePercent * 5));
      for (let i = 0; i < fractureLines; i++) {
        ctx.lineTo(
          b.x + b.width / 2 + Math.sin(i * 1.5) * 35,
          roofY + 20 + i * 22
        );
      }
      ctx.stroke();
    }
  };

  // Trigger game over / challenge metrics calculation
  const triggerGameOver = (completed: boolean) => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    
    // Set finished UI blocks
    setHudStats((prev) => ({ ...prev, isGameOver: true }));

    // Send final performance DNA to base mutations lab!
    onGameCompleted(
      scoreRef.current,
      accumulatedDnaRef.current,
      {
        buildings: buildingsCountRef.current,
        humans: humansCountRef.current,
        military: militaryCountRef.current,
        maxHeight: maxMetersAchievedRef.current,
      }
    );
  };

  // Toggle audio engine
  const handleToggleAudio = () => {
    onToggleSound(!soundEnabled);
    audio.setEnabled(!soundEnabled);
  };

  // Touch controls support for iframe joysticks
  const handleTouchStart = (e: React.TouchEvent) => {
    if (hudStats.isGameOver) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // Loop through all active touches
    for (let i = 0; i < e.targetTouches.length; i++) {
      const touch = e.targetTouches[i];
      const relX = touch.clientX - rect.left;
      const relY = touch.clientY - rect.top;

      // If the touch occurred on the left 50% of the game area, start the virtual joystick there!
      if (relX < rect.width / 2) {
        if (joystickRef.current.touchId === -1) {
          joystickRef.current = {
            active: true,
            startX: touch.clientX,
            startY: touch.clientY,
            curX: touch.clientX,
            curY: touch.clientY,
            touchId: touch.identifier,
          };
          setJoystick({
            active: true,
            startX: relX,
            startY: relY,
            curX: relX,
            curY: relY,
          });
          break;
        }
      } else {
        // Taps on the right 50% trigger a Melee Smash Strike!
        triggerMeleeAttack();
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || joystickRef.current.touchId === -1) return;
    const rect = container.getBoundingClientRect();

    // Track our joystick touch
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier === joystickRef.current.touchId) {
        // Update high-frequency simulation coords
        joystickRef.current.curX = touch.clientX;
        joystickRef.current.curY = touch.clientY;

        // Calculate visual offsets relative to start points
        const dX = touch.clientX - joystickRef.current.startX;
        const dY = touch.clientY - joystickRef.current.startY;

        setJoystick((p) => ({
          ...p,
          curX: p.startX + dX,
          curY: p.startY + dY,
        }));
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (joystickRef.current.touchId === -1) return;

    // Check if the joystick controller touch was lifted
    let stillActive = false;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === joystickRef.current.touchId) {
        stillActive = true;
        break;
      }
    }

    if (!stillActive) {
      joystickRef.current = {
        active: false,
        startX: 0,
        startY: 0,
        curX: 0,
        curY: 0,
        touchId: -1,
      };
      setJoystick({
        active: false,
        startX: 0,
        startY: 0,
        curX: 0,
        curY: 0,
       });
    }
  };

  // Convert time remaining to beautiful string format
  const formatTimeText = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col lg:flex-row gap-6 w-full max-w-6xl mx-auto p-2 ${arenaFullMode ? 'p-0 max-w-none' : ''}`} id="game_root_wrapper_id">
      
      {/* 2D Canvas Graphics Panel Box - fixed overlay in mobile landscape view */}
      <div 
        ref={containerRef}
        className={arenaFullMode 
          ? "fixed inset-0 z-50 bg-slate-950 overflow-hidden w-screen h-screen select-none flex items-center justify-center cursor-crosshair"
          : "relative flex-grow bg-slate-950 border border-[#334155] rounded-xl overflow-hidden min-h-[300px] h-[max(320px,min(480px,65vh))] md:h-[600px] shadow-2xl select-none flex items-center justify-center cursor-crosshair"
        }
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={triggerMeleeAttack}
      >
        {/* Actual HTML Canvas element */}
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

        {/* Dynamic Scanlines Overlay for arcade theme feel! */}
        <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.02]" />

        {/* HUD top status bars */}
        <div className="absolute top-4 left-4 right-4 flex justify-between gap-4 pointer-events-none z-10">
          
          {/* Life Vital Stats indicator */}
          <div className="bg-[#0F172A]/90 border border-[#334155] px-4 py-3 rounded-xl backdrop-blur-md min-w-[210px] shadow-lg">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                VITAL SIGNALS
              </span>
              <span className="text-[10px] font-mono font-bold" style={{ color: selectedMonster.color }}>
                {Math.round(hudStats.health)} / {Math.round(hudStats.maxHealth)}
              </span>
            </div>
            {/* Health scroll bar */}
            <div className="w-full h-2.5 bg-slate-950 border border-slate-800/60 rounded-lg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r transition-all duration-100"
                style={{
                  width: `${(hudStats.health / hudStats.maxHealth) * 100}%`,
                  backgroundImage: `linear-gradient(to right, ${selectedMonster.color}, #f43f5e)`,
                }}
              />
            </div>

            {/* Atomic beam charging meter */}
            <div className="mt-2.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-mono text-slate-400 font-bold uppercase flex items-center gap-1">
                  ⚡ SPECIAL CHARGE
                </span>
                <span className="text-[9px] font-mono font-bold text-amber-500">
                  {Math.round(hudStats.energy)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-950 border border-slate-800/60 rounded-lg overflow-hidden relative">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${hudStats.energy}%` }}
                />
                {hudStats.energy >= 40 && (
                  <div className="absolute inset-0 text-[8px] leading-tight font-black font-mono text-center text-slate-950 uppercase animate-pulse">
                    READY (Press [Shift])
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Time & City rampage targets status */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="bg-[#0F172A]/90 border border-[#334155] px-4 py-2.5 rounded-xl text-center backdrop-blur-md shadow-lg min-w-[110px]">
              <span className="text-[9px] font-mono text-slate-400 uppercase font-bold block leading-none tracking-wider">
                EVAC TIME
              </span>
              <span className="text-xl font-mono text-slate-100 font-black tracking-wide block mt-1">
                {formatTimeText(hudStats.timeRemaining)}
              </span>
            </div>
            
            <div className="bg-[#1E293B]/90 border border-slate-800 px-3 py-1 rounded-lg text-[9px] font-mono text-emerald-400 font-bold shadow-sm tracking-wide uppercase mt-0.5">
              📍 {currentStreetRef.current}
            </div>
          </div>

          {/* DNA Eaten progress & scale height meters */}
          <div className="bg-[#0F172A]/90 border border-[#334155] px-4 py-3 rounded-xl backdrop-blur-md text-right min-w-[150px] shadow-lg">
            <div className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">KINETIC SCALE</div>
            <div className="text-xl font-mono mt-0.5 uppercase block font-black" style={{ color: '#4ADE80' }}>
              {hudStats.sizeMeters.toFixed(1)}m <span className="text-xs text-slate-500">TALL</span>
            </div>
            
            {/* Mini slider for max limit reach progress with emerald gradient */}
            <div className="w-full h-1.5 bg-slate-950 rounded-full mt-2 border border-slate-800/60 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-300"
                style={{ width: `${hudStats.growthProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* On-screen visual hints when entering */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none z-10 font-sans">
          
          {/* Commands summary cheat sheet */}
          <div className="bg-[#0F172A]/95 border border-slate-800 rounded-xl p-3.5 hidden sm:block max-w-[280px] shadow-lg backdrop-blur-md">
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase mb-1.5 border-b border-slate-800 pb-1">COMMAND PROTOCOLS</div>
            <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-300">
              <div className="flex justify-between gap-6"><span>[W][A][S][D] / Arrows</span> <span className="text-emerald-400 font-bold">Move Monster</span></div>
              <div className="flex justify-between gap-6"><span>[Space] / Click</span> <span className="text-emerald-400 font-bold">Swipe Smash Strike</span></div>
              <div className="flex justify-between gap-6"><span>[Shift] / [Q] Key</span> <span className="text-emerald-400 font-bold">Special Ability</span></div>
            </div>
          </div>

          {/* Virtual active Joystick overlay for mobile/touch screens */}
          {joystick.active && (
            <div className="w-24 h-24 rounded-full border border-[#334155] bg-[#0F172A]/60 relative flex items-center justify-center shrink-0">
              <div
                style={{
                  transform: `translate(${Math.min(30, Math.max(-30, joystick.curX - joystick.startX))}px, ${Math.min(
                    30,
                    Math.max(-30, joystick.curY - joystick.startY)
                  )}px)`,
                }}
                className="w-10 h-10 rounded-full bg-emerald-500/80 shadow border border-emerald-600 cursor-pointer"
              />
            </div>
          )}

          {/* Floating Action buttons for mobile touch control when in landscape screen view */}
          {arenaFullMode && (
            <div className="absolute bottom-4 right-28 flex gap-3 pointer-events-auto shrink-0 z-20">
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  triggerMeleeAttack();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  triggerMeleeAttack();
                }}
                className="w-14 h-14 bg-red-650/90 active:bg-red-500 border border-red-500 text-white font-mono rounded-full flex items-center justify-center text-[10px] font-black shadow-2xl tracking-tighter cursor-pointer active:scale-90 transition-transform select-none uppercase"
              >
                SMASH 💥
              </button>
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  triggerSpecialAbility();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  triggerSpecialAbility();
                }}
                className={`w-14 h-14 ${hudStats.energy >= 40 ? 'bg-amber-500/90 active:bg-amber-400 animate-pulse' : 'bg-slate-800/80 cursor-not-allowed opacity-50'} border border-amber-600 text-slate-950 font-mono rounded-full flex flex-col items-center justify-center text-[8px] font-black shadow-2xl tracking-tighter active:scale-90 transition-transform select-none uppercase`}
              >
                <span>SPEC 🔥</span>
                <span className="text-[7px]">{Math.round(hudStats.energy)}%</span>
              </button>
            </div>
          )}

          {/* Audio & Fullscreen layout buttons group */}
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={() => {
                setArenaFullMode(!arenaFullMode);
                audio.playSelect();
              }}
              className="w-10 h-10 border bg-[#0F172A]/90 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-[#4ADE80] rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg cursor-pointer"
              title="Toggle mobile horizontal fullscreen view"
            >
              {arenaFullMode ? (
                <Minimize2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            <button
              onClick={handleToggleAudio}
              className="w-10 h-10 border bg-[#0F172A]/90 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-[#4ADE80] rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-505" />}
            </button>
          </div>
        </div>
      </div>

      {/* Side HUD Panel containing leaderboards & mutation shop entry */}
      <div className="w-full lg:w-80 flex flex-col gap-4 select-none" id="sidebar_hud_container_id">
        {/* Statistics scoreboard block */}
        <div className="bg-[#0F172A]/95 border border-[#334155] rounded-xl p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.01]"></div>
          
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-mono text-amber-500 font-bold uppercase block tracking-wider">CIVIL DESTRUCTION RATING</span>
            <span className="text-3xl font-mono text-slate-100 font-black tracking-wider block mt-1">
              {hudStats.score.toLocaleString()} <span className="text-xs text-slate-500">PTS</span>
            </span>
          </div>

          {/* Cumulative target destruction metrics */}
          <div className="flex flex-col gap-2.5">
            
            {/* Record 1 */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-900/60">
              <span className="text-[11px] font-mono text-slate-400 font-medium uppercase flex items-center gap-2">
                🏠 Towers Demolished
              </span>
              <span className="text-base font-mono text-slate-100 font-black">
                {hudStats.buildingsDestroyed}
              </span>
            </div>

            {/* Record 2 */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-900/60">
              <span className="text-[11px] font-mono text-slate-400 font-medium uppercase flex items-center gap-2">
                🍖 Citizens Eaten
              </span>
              <span className="text-base font-mono text-[#4ADE80] font-black">
                {hudStats.humansEaten}
              </span>
            </div>

            {/* Record 3 */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-900/60">
              <span className="text-[11px] font-mono text-slate-400 font-medium uppercase flex items-center gap-2">
                🛩️ Military Silenced
              </span>
              <span className="text-base font-mono text-blue-400 font-black">
                {hudStats.militaryDestroyed}
              </span>
            </div>

            {/* DNA earned currency inside a lush sleek green container */}
            <div className="flex items-center justify-between py-2 border border-emerald-500/15 bg-emerald-500/5 px-2.5 rounded-lg mt-2">
              <span className="text-[11px] font-mono text-[#4ADE80] font-extrabold uppercase flex items-center gap-1.5 tracking-wider">
                🧬 DNA MUTATED
              </span>
              <span className="text-lg font-mono text-emerald-400 font-black">
                +{hudStats.dnaEarned}
              </span>
            </div>
          </div>
        </div>

        {/* Character showcase display */}
        <div className="bg-[#0F172A]/95 border border-[#334155] rounded-xl p-5 shadow-lg flex-grow flex flex-col justify-between whitespace-normal animate-fade-in pb-4">
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase border-b border-slate-850 pb-2 flex items-center gap-2 tracking-wider">
              <Award className="w-4 h-4 text-amber-400" />
              IDENTIFIED SPECIMEN
            </span>
            <div className="flex gap-3 items-center">
              <div 
                className="w-14 h-14 bg-slate-950 border rounded-lg flex items-center justify-center p-1 shrink-0"
                style={{ borderColor: selectedMonster.color }}
              >
                <canvas
                  width={48}
                  height={48}
                  className="w-full h-full pixelated"
                  ref={(el) => {
                    if (el) {
                      const ctx = el.getContext('2d');
                      if (ctx) {
                        ctx.clearRect(0, 0, el.width, el.height);
                        ctx.imageSmoothingEnabled = false;
                        const sprite = selectedMonster.pixelSprite;
                        const px = Math.floor(el.width / sprite[0].length);
                        sprite.forEach((row, ry) => {
                          row.forEach((pixel, rx) => {
                            if (pixel === 0) return;
                            let col = selectedMonster.color;
                            if (pixel === 2) col = selectedMonster.secondaryColor;
                            if (pixel === 3) col = '#fdf0d5';
                            if (pixel === 4) col = '#ef4444';
                            ctx.fillStyle = col;
                            ctx.fillRect(rx * px, ry * px, px, px);
                          });
                        });
                      }
                    }
                  }}
                />
              </div>
              <div>
                <span className="text-sm font-black text-slate-100 block uppercase font-sans tracking-tight">
                  {selectedMonster.name}
                </span>
                <span className="text-[9px] font-mono text-amber-500 bg-[#0F172A] px-2 py-0.5 rounded border border-slate-800 uppercase inline-block mt-0.5 font-bold tracking-wider">
                  {selectedMonster.codename}
                </span>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed font-sans mt-1">
              {selectedMonster.description}
            </p>
          </div>

          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-850">
            <button
              onClick={() => {
                audio.playGrow();
                triggerRadialShockwave();
              }}
              style={{ borderColor: selectedMonster.color }}
              className="w-full py-2.5 bg-slate-950 text-[10px] font-mono font-bold uppercase rounded-lg border text-center transition-all hover:brightness-110 duration-200 active:scale-95 cursor-pointer text-white"
            >
              ☢️ MELEE SMASH STRIKE
            </button>
            
            <button
              className="w-full py-2 border border-slate-800 bg-slate-900/40 hover:bg-slate-800 transition-all font-mono text-[9px] uppercase font-bold text-slate-400 hover:text-white rounded-lg cursor-pointer"
              onClick={onExit}
            >
              &lt; RETURN TO SELECTION
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
