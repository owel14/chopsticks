import type { GameState, HandId, HandSide, PlayerId, PlayerState } from "./types";

export function parseHandId(handId: HandId): [PlayerId, HandSide] {
  const match = handId.match(/^(top|bottom)(Left|Right)$/);
  if (!match) throw new Error(`Invalid hand ID: ${handId}`);
  const playerMap = { top: "player1", bottom: "player2" } as const;
  const handMap = { Left: "leftHand", Right: "rightHand" } as const;
  return [
    playerMap[match[1] as "top" | "bottom"],
    handMap[match[2] as "Left" | "Right"],
  ];
}

export function getHandValue(state: GameState, handId: HandId): number {
  const [playerId, hand] = parseHandId(handId);
  return state.players[playerId][hand];
}

export function isPlayerDefeated(player: PlayerState): boolean {
  return player.leftHand === 0 && player.rightHand === 0;
}

export function checkWinner(state: GameState): PlayerId | null {
  if (isPlayerDefeated(state.players.player1)) return "player2";
  if (isPlayerDefeated(state.players.player2)) return "player1";
  return null;
}

export function isAddMoveValid(
  state: GameState,
  sourceHandId: HandId,
  targetHandId: HandId
): boolean {
  const [sourcePlayerId] = parseHandId(sourceHandId);
  const [targetPlayerId] = parseHandId(targetHandId);
  const sourceValue = getHandValue(state, sourceHandId);
  const targetValue = getHandValue(state, targetHandId);
  return sourcePlayerId !== targetPlayerId && sourceValue > 0 && targetValue !== 0;
}

/** Applies an add move: adds source hand's value to the target, mod 5 (0 = eliminated). */
export function applyAddMove(
  state: GameState,
  sourceHandId: HandId,
  targetHandId: HandId
): GameState {
  const sourceValue = getHandValue(state, sourceHandId);
  const targetValue = getHandValue(state, targetHandId);
  const sum = sourceValue + targetValue;
  const [targetPlayerId, targetHand] = parseHandId(targetHandId);

  const newState: GameState = structuredClone(state);
  newState.players[targetPlayerId][targetHand] = sum >= 5 ? 0 : sum;
  newState.currentPlayer = state.currentPlayer === "player1" ? "player2" : "player1";

  const winner = checkWinner(newState);
  if (winner) {
    newState.isGameOver = true;
    newState.winner = winner;
    newState.phase = "gameOver";
  }

  return newState;
}

/** Applies a split move: redistributes the current player's fingers to newLeft/newRight. */
export function applySplitMove(
  state: GameState,
  newLeft: number,
  newRight: number
): GameState {
  const newState: GameState = structuredClone(state);
  newState.players[state.currentPlayer].leftHand = newLeft;
  newState.players[state.currentPlayer].rightHand = newRight;
  newState.currentPlayer = state.currentPlayer === "player1" ? "player2" : "player1";
  return newState;
}

/** Returns all valid [left, right] split distributions for the current player, deduplicating symmetric pairs. */
export function getAllValidDistributions(
  state: GameState
): [number, number][] {
  const player = state.players[state.currentPlayer];
  const total = player.leftHand + player.rightHand;
  const seen = new Set<string>();
  const results: [number, number][] = [];

  for (let i = 0; i <= 4; i++) {
    const j = total - i;
    if (j < 0 || j > 4) continue;
    const key = `${Math.min(i, j)},${Math.max(i, j)}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push([i, j]);
    }
  }

  return results.filter(([newLeft, newRight]) => {
    const { leftHand, rightHand } = player;
    return (
      !(newLeft === leftHand && newRight === rightHand) &&
      !(newLeft === rightHand && newRight === leftHand)
    );
  });
}

export function isSplitMoveValid(
  state: GameState,
  newLeft: number,
  newRight: number
): boolean {
  const validSplits = getAllValidDistributions(state);
  return validSplits.some(
    ([l, r]) =>
      (l === newLeft && r === newRight) || (l === newRight && r === newLeft)
  );
}

/**
 * Returns true when the player's split preview is genuinely different from their
 * turn-start state (accounting for hand symmetry), meaning attacks are blocked.
 */
export function isBlockingPreview(
  pendingSplit: { newLeft: number; newRight: number } | null,
  player: PlayerState
): boolean {
  if (!pendingSplit) return false;
  const { leftHand, rightHand } = player;
  const symmetric =
    (pendingSplit.newLeft === leftHand && pendingSplit.newRight === rightHand) ||
    (pendingSplit.newLeft === rightHand && pendingSplit.newRight === leftHand);
  return !symmetric;
}

/** Maps a bot move's `"left"` / `"right"` side to a board `HandId`. */
export function botHandToHandId(side: "left" | "right", position: "top" | "bottom"): HandId {
  return `${position}${side === "left" ? "Left" : "Right"}` as HandId;
}

export function createInitialGameState(): GameState {
  return {
    players: {
      player1: { leftHand: 1, rightHand: 1 },
      player2: { leftHand: 1, rightHand: 1 },
    },
    currentPlayer: "player2",
    startingPlayer: "player2",
    isGameOver: false,
    winner: null,
    phase: "selectDifficulty",
    difficulty: "easy",
  };
}
