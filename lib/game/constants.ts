// Game rules
export const FINGERS_MOD = 5;
export const MAX_FINGERS = FINGERS_MOD - 1; // 4

// AI tuning
export const MEDIUM_RANDOM_CHANCE = 0.4;
export const MEDIUM_DEPTH = 4;
export const HARD_DEPTH = 12;
export const ADD_VS_SPLIT_CHANCE = 0.5;

// Minimax evaluation scores
export const EVAL_WIN = 100;
export const EVAL_LOSS = -100;
export const EVAL_VULNERABILITY = 10;

// Animation timings (ms)
export const BOT_THINK_DELAY = 600;
export const ADD_ANIMATION_MS = 800;
export const SPLIT_ANIMATION_MS = 650;
