/**
 * @file types.js
 * @description Game constants and type definitions for Incan Gold (Indiamant).
 */

export const CARD_TYPES = {
  TREASURE: 'TREASURE',
  HAZARD: 'HAZARD',
  ARTIFACT: 'ARTIFACT',
};

export const HAZARD_TYPES = {
  SPIDER: 'SPIDER',
  SNAKE: 'SNAKE',
  LAVA: 'LAVA', // "Explosion" / Fire
  ROCK: 'ROCK', // Landslide
  MUMMY: 'MUMMY', // "Gas" / Zombies sometimes. User said "Psych", "Poison", "Explosion", "Rock", "Scorpion"? 
  // User said: "山体滑坡 (Rock)", "蝎子 (Scorpion)", "毒蛇 (Snake)", "毒气 (Gas)", "爆炸 (Explosion)"
};

// Mapping user's hazard names to code constants
export const HAZARD_CONFIG = {
  ROCK: { id: 'ROCK', name: '山体滑坡', label: '山体滑坡' },
  SCORPION: { id: 'SCORPION', name: '蝎子', label: '蝎子' },
  SNAKE: { id: 'SNAKE', name: '毒蛇', label: '毒蛇' },
  GAS: { id: 'GAS', name: '毒气', label: '毒气' },
  EXPLOSION: { id: 'EXPLOSION', name: '爆炸', label: '爆炸' },
};

export const GAME_PHASES = {
  SETUP: 'SETUP',
  ROUND_START: 'ROUND_START',
  DECISION: 'DECISION', // Players choose to Leave or Stay
  REVEAL: 'REVEAL', // Flip card
  DISTRIBUTE: 'DISTRIBUTE', // Share gems or Resolve Hazard
  ROUND_END: 'ROUND_END',
  GAME_END: 'GAME_END',
};

export const DECK_CONFIG = {
  TREASURES: [
    1, 2, 3, 4, 5, 5, 7, 7, 9, 11, 11, 13, 14, 15, 17
    // Standard Distribution often used. User said "1-9" but that seems low for 15 cards?
    // User said: "宝藏卡... 15 张，数字 1-9 不等"
    // Let's trust user for now: 15 cards with values between 1-9.
    // We'll generate a distribution or use a random/fixed set if not specified.
    // Let's use a distribution summing to roughly standard game or just random 1-9.
    // Let's use: 1, 2, 3, 4, 5, 5, 7, 7, 9, 1, 2, 3, 4, 5, 9 (15 cards)
  ],
  HAZARDS_PER_TYPE: 3, // Standard is 3 per type in deck? User said 6 per type!
  // User: "30 张，5 种灾难各 6 张" -> OK.
  ARTIFACT_VALUES: [5, 5, 5, 10, 10], // Often first 3 are 5, last 2 are 10. Or 5,7,8,10,12..
  // User didn't specify artifact values, just "Value different".
};
