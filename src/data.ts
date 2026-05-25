/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MonsterStatsDefinition, GameUpgrade } from './types';

// Pixel grids: 12x12 matrix where:
// 0 = transparent
// 1 = Primary Color
// 2 = Secondary Color / Highlights
// 3 = Belly / Contrast Accent
// 4 = Eye / Mouth Accent (usually red/whites)

const REPTILE_SPRITE: number[][] = [
  [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 3, 3, 3, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 4, 3, 3, 3, 1, 0],
  [0, 1, 1, 2, 1, 1, 1, 3, 3, 3, 1, 0],
  [1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 2, 1, 1, 1, 1, 1, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1],
  [0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1],
];

const GORILLA_SPRITE: number[][] = [
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 3, 3, 1, 4, 1, 1, 0],
  [0, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1],
  [1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  [1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0],
];

const SLIME_SPRITE: number[][] = [
  [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 2, 2, 1, 0, 0],
  [0, 1, 1, 1, 4, 1, 1, 2, 4, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0],
  [1, 1, 1, 3, 3, 3, 3, 1, 1, 1, 1, 1],
  [1, 1, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
];

export const MONSTERS: MonsterStatsDefinition[] = [
  {
    id: 'reptile',
    name: 'Giga-Lizard',
    codename: 'M.O.N.S.T.E.R. Alpha',
    description: 'An ancient nuclear reptilian predator. High defensive scales and sweeping physical balance. Accumulates radioactive kinetic energy to channel atomic laser breath.',
    specialName: 'Cosmic Deathbeam',
    specialDescription: 'Channels an intense focused radioactive stream that slices buildings, tanks, and helicopters instantly.',
    baseHealth: 150,
    baseSpeed: 3.5,
    baseMelee: 20,
    color: '#10b981', // green-500
    secondaryColor: '#f59e0b', // amber-500
    pixelSprite: REPTILE_SPRITE,
  },
  {
    id: 'gorilla',
    name: 'Mecha-Gorilla',
    codename: 'Subject R-41 Ape',
    description: 'A cybernetically enhanced silverback gorilla escapee. Blazes with metallic fury, moves at intense speed, and climbs or crushes concrete walls with mechanical power fists.',
    specialName: 'Tectonic Thump',
    specialDescription: 'Smashes the ground with massive hydraulic force, releasing seismic radial shockwaves that disintegrate nearby structures and soldiers.',
    baseHealth: 120,
    baseSpeed: 4.8,
    baseMelee: 25,
    color: '#64748b', // slate-500
    secondaryColor: '#3b82f6', // blue-500
    pixelSprite: GORILLA_SPRITE,
  },
  {
    id: 'slime',
    name: 'Acid-Fiend',
    codename: 'Biohazard Sludge v9',
    description: 'A microscopic industrial runoff slime grown into titanic size. Secretes deep melting acid trails, absorbs victims into its toxic jelly, and splits sections off to crash buildings.',
    specialName: 'Radioactive Puddle',
    specialDescription: 'Secretes glowing radioactive puddles that dissolve running citizens, military vehicles, and melts building basements instantly.',
    baseHealth: 180,
    baseSpeed: 2.8,
    baseMelee: 15,
    color: '#a855f7', // purple-500
    secondaryColor: '#22c55e', // green-500
    pixelSprite: SLIME_SPRITE,
  },
];

export const UPGRADES_TEMPLATE: GameUpgrade[] = [
  {
    id: 'max_health',
    name: 'Titanium Cells',
    description: 'Increases ultimate durability, allowing the beast to withstand more heavy artillery and tank shells.',
    level: 0,
    maxLevel: 5,
    baseCost: 80,
    costMultiplier: 1.6,
    statMultiplier: 0.3, // +30% health per level
    icon: 'Heart',
  },
  {
    id: 'speed',
    name: 'Seismic Adrenaline',
    description: 'Mutates nerve fiber speed. Accelerate movement across the urban asphalt to chase down fleeing convoys.',
    level: 0,
    maxLevel: 5,
    baseCost: 60,
    costMultiplier: 1.5,
    statMultiplier: 0.15, // +15% speed per level
    icon: 'Zap',
  },
  {
    id: 'bite_power',
    name: 'Steel Jaw / Acid Fang',
    description: 'Increases melee bite and claw damage. Crush heavy steel skyscrapers and chew up tanks in fewer bites.',
    level: 0,
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 1.7,
    statMultiplier: 0.35, // +35% damage per level
    icon: 'Scissors',
  },
  {
    id: 'special_duration',
    name: 'Isotope Generator',
    description: 'Boosts energy generation and makes the special destructive attack (Laser/Thump/Puddle) last longer.',
    level: 0,
    maxLevel: 5,
    baseCost: 120,
    costMultiplier: 1.8,
    statMultiplier: 0.25, // +25% duration/regen per level
    icon: 'Flame',
  },
];

export const CITY_STREET_NAMES = [
  'Broadway Ave',
  'Skyline Boulvard',
  'Nuclear Blvd',
  'Central Plaza',
  'Wall Street',
  'Lexington Ave',
  'Subway Crossway',
  'Harbor Boulevard',
  'Military Command S-5',
];
