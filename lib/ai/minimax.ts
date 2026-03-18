import type { BotMinimaxState, BotMove, PlayerState } from "../game/types";
import { isPlayerDefeated } from "../game/gameLogic";

function isGameOver(state: BotMinimaxState): boolean {
  return isPlayerDefeated(state.player1) || isPlayerDefeated(state.player2);
}

function getTotalFingers(player: PlayerState): number {
  return player.leftHand + player.rightHand;
}

function isVulnerable(player: PlayerState): boolean {
  return getTotalFingers(player) <= 1;
}

// Returns true if the attacker can eliminate the defender's last remaining hand
// in a single attack (one attacking hand vs one defending hand).
// Previously used total fingers as the attacking value, which was incorrect.
function canWinNextMove(attacker: PlayerState, defender: PlayerState): boolean {
  const attackHands: number[] = [];
  if (attacker.leftHand > 0) attackHands.push(attacker.leftHand);
  if (attacker.rightHand > 0) attackHands.push(attacker.rightHand);

  const defenseTargets: Array<{ value: number; other: number }> = [];
  if (defender.leftHand > 0)
    defenseTargets.push({ value: defender.leftHand, other: defender.rightHand });
  if (defender.rightHand > 0)
    defenseTargets.push({ value: defender.rightHand, other: defender.leftHand });

  for (const atk of attackHands) {
    for (const { value, other } of defenseTargets) {
      if (atk + value >= 5 && other === 0) return true;
    }
  }
  return false;
}

function evaluateVulnerableState(
  player1: PlayerState,
  player2: PlayerState,
  isPlayer1Turn: boolean
): number {
  const botVulnerable = isVulnerable(player1);
  const opponentVulnerable = isVulnerable(player2);
  let score = 0;
  if (botVulnerable && !opponentVulnerable) score -= 10;
  else if (opponentVulnerable && !botVulnerable) score += 10;
  return isPlayer1Turn ? -score : score;
}

// Scores wins/losses with depth adjustment to prefer faster wins and slower losses.
// At maxDepth=12, win scores range 88–99 and loss scores range -99 to -88,
// always dominating the heuristic range of ±10.
function evaluateState(state: BotMinimaxState, depth: number, maxDepth: number): number {
  const { player1, player2, isPlayer1Turn } = state;
  if (isPlayerDefeated(player2)) return 100 - (maxDepth - depth);
  if (isPlayerDefeated(player1)) return -100 + (maxDepth - depth);

  let score = 0;
  score += evaluateVulnerableState(player1, player2, isPlayer1Turn);

  if (isPlayer1Turn && canWinNextMove(player1, player2)) return 100 - (maxDepth - depth);
  if (!isPlayer1Turn && canWinNextMove(player2, player1)) return -100 + (maxDepth - depth);

  return score;
}

function getSymmetricHandKey(player: PlayerState): string {
  return [player.leftHand, player.rightHand].sort().join(",");
}

function getSymmetricStateKey(state: BotMinimaxState): string {
  return `${getSymmetricHandKey(state.player1)}|${getSymmetricHandKey(state.player2)}|${state.isPlayer1Turn}`;
}

function applyMove(state: BotMinimaxState, move: BotMove): BotMinimaxState {
  // Shallow copy — all state values are primitives, structuredClone is not needed
  const newState: BotMinimaxState = {
    player1: { leftHand: state.player1.leftHand, rightHand: state.player1.rightHand },
    player2: { leftHand: state.player2.leftHand, rightHand: state.player2.rightHand },
    isPlayer1Turn: state.isPlayer1Turn,
  };
  const player = newState.isPlayer1Turn ? newState.player1 : newState.player2;
  const opponent = newState.isPlayer1Turn ? newState.player2 : newState.player1;

  if (move.type === "add") {
    const sourceValue = player[`${move.from}Hand` as "leftHand" | "rightHand"];
    const targetValue = opponent[`${move.to}Hand` as "leftHand" | "rightHand"];
    const sum = sourceValue + targetValue;
    opponent[`${move.to}Hand` as "leftHand" | "rightHand"] = sum >= 5 ? 0 : sum;
  } else {
    player.leftHand = move.left;
    player.rightHand = move.right;
  }

  newState.isPlayer1Turn = !newState.isPlayer1Turn;
  return newState;
}

function getAllPossibleMoves(state: BotMinimaxState): BotMove[] {
  const moves: BotMove[] = [];
  const player = state.isPlayer1Turn ? state.player1 : state.player2;
  const opponent = state.isPlayer1Turn ? state.player2 : state.player1;
  const addedStates = new Set<string>();

  const addIfUnique = (move: BotMove) => {
    const key = getSymmetricStateKey(applyMove(state, move));
    if (!addedStates.has(key)) {
      moves.push(move);
      addedStates.add(key);
    }
  };

  if (player.leftHand !== 0) {
    if (opponent.leftHand !== 0) addIfUnique({ type: "add", from: "left", to: "left" });
    if (opponent.rightHand !== 0) addIfUnique({ type: "add", from: "left", to: "right" });
  }
  if (player.rightHand !== 0) {
    if (opponent.leftHand !== 0) addIfUnique({ type: "add", from: "right", to: "left" });
    if (opponent.rightHand !== 0) addIfUnique({ type: "add", from: "right", to: "right" });
  }

  // Enumerate split distributions up to total/2 to deduplicate symmetric halves;
  // addIfUnique filters any remaining post-state duplicates.
  const total = player.leftHand + player.rightHand;
  for (let left = 0; left <= Math.floor(total / 2); left++) {
    const right = total - left;
    if (
      right >= 0 &&
      right <= 4 &&
      left !== player.leftHand &&
      right !== player.rightHand &&
      left !== player.rightHand &&
      right !== player.leftHand
    ) {
      addIfUnique({ type: "split", left, right });
    }
  }

  return moves;
}

interface MinimaxResult {
  move: BotMove | null;
  score: number;
}

function minimax(
  state: BotMinimaxState,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  maxDepth: number
): MinimaxResult {
  if (depth === 0 || isGameOver(state)) {
    return { move: null, score: evaluateState(state, depth, maxDepth) };
  }

  const moves = getAllPossibleMoves(state);
  let bestMove: BotMove | null = null;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const { score } = minimax(applyMove(state, move), depth - 1, false, alpha, beta, maxDepth);
      if (score > maxEval) { maxEval = score; bestMove = move; }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { move: bestMove, score: maxEval };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const { score } = minimax(applyMove(state, move), depth - 1, true, alpha, beta, maxDepth);
      if (score < minEval) { minEval = score; bestMove = move; }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { move: bestMove, score: minEval };
  }
}

export function getBestMove(state: BotMinimaxState, depth: number): BotMove | null {
  return minimax(state, depth, true, -Infinity, Infinity, depth).move;
}
