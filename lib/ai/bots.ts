import { getBestMove } from "./minimax";
import type { BotMinimaxState, BotMove, Difficulty, GameState, HandId } from "../game/types";
import { getAllValidDistributions } from "../game/gameLogic";
import { MEDIUM_RANDOM_CHANCE, MEDIUM_DEPTH, HARD_DEPTH, ADD_VS_SPLIT_CHANCE } from "../game/constants";

function getHandStates(gameState: GameState): BotMinimaxState {
  return {
    player1: { ...gameState.players.player1 },
    player2: { ...gameState.players.player2 },
    isPlayer1Turn: true,
  };
}

function getValidAddMoves(gameState: GameState): BotMove[] {
  const player = gameState.players.player1;
  const opponent = gameState.players.player2;
  const moves: BotMove[] = [];
  const hands: Array<"left" | "right"> = ["left", "right"];

  for (const from of hands) {
    if (player[`${from}Hand`] === 0) continue;
    for (const to of hands) {
      if (opponent[`${to}Hand`] !== 0) {
        moves.push({ type: "add", from, to });
      }
    }
  }
  return moves;
}

function getValidSplitMoves(gameState: GameState): BotMove[] {
  return getAllValidDistributions(gameState).map(([left, right]) => ({
    type: "split" as const,
    left,
    right,
  }));
}

function getRandomAddMove(gameState: GameState): BotMove | null {
  const moves = getValidAddMoves(gameState);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

function getRandomSplitMove(gameState: GameState): BotMove | null {
  const moves = getValidSplitMoves(gameState);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

export function getRandomBotMove(gameState: GameState): BotMove | null {
  const useAdd = Math.random() < ADD_VS_SPLIT_CHANCE;
  if (useAdd) return getRandomAddMove(gameState) ?? getRandomSplitMove(gameState);
  return getRandomSplitMove(gameState) ?? getRandomAddMove(gameState);
}

export function getMinimaxBotMove(gameState: GameState, depth: number): BotMove | null {
  const state = getHandStates(gameState);
  return getBestMove(state, depth);
}

export function getMixedBotMove(gameState: GameState): BotMove | null {
  if (Math.random() < MEDIUM_RANDOM_CHANCE) return getRandomBotMove(gameState);
  return getMinimaxBotMove(gameState, MEDIUM_DEPTH);
}

export function getBotMove(gameState: GameState, difficulty: Difficulty): BotMove | null {
  switch (difficulty) {
    case "easy":   return getRandomBotMove(gameState);
    case "medium": return getMixedBotMove(gameState);
    case "hard":   return getMinimaxBotMove(gameState, HARD_DEPTH);
  }
}

const HAND_ID_MAP: Record<string, HandId> = {
  "top-left": "topLeft",
  "top-right": "topRight",
  "bottom-left": "bottomLeft",
  "bottom-right": "bottomRight",
};

export function botMoveToHandIds(
  move: BotMove
): { sourceHandId: HandId; targetHandId: HandId } | null {
  if (move.type !== "add") return null;
  const sourceHandId = HAND_ID_MAP[`top-${move.from}`];
  const targetHandId = HAND_ID_MAP[`bottom-${move.to}`];
  return { sourceHandId, targetHandId };
}
