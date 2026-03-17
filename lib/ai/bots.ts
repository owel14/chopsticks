import { getBestMove } from "./minimax";
import type { BotMinimaxState, BotMove, Difficulty, GameState, PlayerState } from "../game/types";
import { getAllValidDistributions, botHandToHandId } from "../game/gameLogic";

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
    const fromVal = from === "left" ? player.leftHand : player.rightHand;
    if (fromVal === 0) continue;
    for (const to of hands) {
      const toVal = to === "left" ? opponent.leftHand : opponent.rightHand;
      if (toVal !== 0) {
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
  const useAdd = Math.random() < 0.5;
  if (useAdd) return getRandomAddMove(gameState) ?? getRandomSplitMove(gameState);
  return getRandomSplitMove(gameState) ?? getRandomAddMove(gameState);
}

export function getMinimaxBotMove(gameState: GameState, depth: number): BotMove | null {
  const state = getHandStates(gameState);
  return getBestMove(state, depth);
}

export function getMixedBotMove(gameState: GameState): BotMove | null {
  if (Math.random() < 0.4) return getRandomBotMove(gameState);
  return getMinimaxBotMove(gameState, 4);
}

export function getBotMove(gameState: GameState, difficulty: Difficulty): BotMove | null {
  switch (difficulty) {
    case "easy":   return getRandomBotMove(gameState);
    case "medium": return getMixedBotMove(gameState);
    case "hard":   return getMinimaxBotMove(gameState, 12);
  }
}

export function botMoveToHandIds(
  move: BotMove
): { sourceHandId: string; targetHandId: string } | null {
  if (move.type !== "add") return null;
  return {
    sourceHandId: botHandToHandId(move.from, "top"),
    targetHandId: botHandToHandId(move.to, "bottom"),
  };
}
