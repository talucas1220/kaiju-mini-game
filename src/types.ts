/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MonsterTypeId = 'reptile' | 'gorilla' | 'slime';

export interface MonsterStatsDefinition {
  id: MonsterTypeId;
  name: string;
  codename: string;
  description: string;
  specialName: string;
  specialDescription: string;
  baseHealth: number;
  baseSpeed: number;
  baseMelee: number;
  color: string;
  secondaryColor: string;
  pixelSprite: number[][]; // Grid representation for title/select screens
}

export interface GameUpgrade {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  statMultiplier: number;
  icon: string;
}

export interface Human {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'civilian' | 'scientist' | 'police' | 'soldier';
  health: number;
  isPanicked: boolean;
  panicTimer: number;
  screamCooldown: number;
  screamText: string | null;
  size: number;
  color: string;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  stories: number;
  isDestroyed: boolean;
  humansOccupied: number;
  fireIntensity: number; // 0 to 1
  debrisColor: string;
  windowMatrix: boolean[][]; // representation of lights in windows
}

export interface Vehicle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'car' | 'police_cruiser' | 'tank' | 'helicopter';
  health: number;
  maxHealth: number;
  fireCooldown: number;
  targetAngle?: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  type: 'bullet' | 'shell' | 'rocket';
  size: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'rubble' | 'smoke' | 'fire' | 'blood' | 'laser' | 'spark' | 'text';
  text?: string;
}

export interface GameState {
  stage: 'title' | 'select' | 'playing' | 'upgrade' | 'encyclopedia' | 'gameover';
  selectedMonsterId: MonsterTypeId;
  dna: number;
  totalDnaEarned: number;
  score: number;
  highScore: number;
  level: number;
  buildingsDestroyed: number;
  humansEaten: number;
  militaryDestroyed: number;
  timePlayed: number; // in seconds
  soundEnabled: boolean;
}

export interface MonsterPlayState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  direction: 'left' | 'right';
  health: number;
  maxHealth: number;
  energy: number; // For special attack
  sizeMeters: number; // Current grow height in meters (starts at 1.5m up to 150m)
  growthProgress: number; // Progress to next size stage (0 - 100)
  isSpecialActive: boolean;
  specialDuration: number;
  lastAttackTime: number;
  isLockedInAction: boolean;
  animationFrameCount: number;
  invulnFrames: number;
}
