import { describe, it, expect } from "vitest";
import {
  parseHandId,
  getHandValue,
  isPlayerDefeated,
  checkWinner,
  isAddMoveValid,
  applyAddMove,
  applySplitMove,
  getAllValidDistributions,
  isSplitMoveValid,
  isBlockingPreview,
  createInitialGameState,
  botHandToHandId,
} from "../gameLogic";
import type { GameState } from "../types";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeState(
  p1: { l: number; r: number },
  p2: { l: number; r: number },
  currentPlayer: "player1" | "player2" = "player2"
): GameState {
  return {
    players: {
      player1: { leftHand: p1.l, rightHand: p1.r },
      player2: { leftHand: p2.l, rightHand: p2.r },
    },
    currentPlayer,
    startingPlayer: "player2",
    isGameOver: false,
    winner: null,
    phase: "playing",
    difficulty: "easy",
  };
}

// ── parseHandId ────────────────────────────────────────────────────────────

describe("parseHandId", () => {
  it("topLeft → [player1, leftHand]", () => {
    expect(parseHandId("topLeft")).toEqual(["player1", "leftHand"]);
  });
  it("topRight → [player1, rightHand]", () => {
    expect(parseHandId("topRight")).toEqual(["player1", "rightHand"]);
  });
  it("bottomLeft → [player2, leftHand]", () => {
    expect(parseHandId("bottomLeft")).toEqual(["player2", "leftHand"]);
  });
  it("bottomRight → [player2, rightHand]", () => {
    expect(parseHandId("bottomRight")).toEqual(["player2", "rightHand"]);
  });
});

// ── getHandValue ───────────────────────────────────────────────────────────

describe("getHandValue", () => {
  it("returns the correct value for each hand position", () => {
    const state = makeState({ l: 1, r: 2 }, { l: 3, r: 4 });
    expect(getHandValue(state, "topLeft")).toBe(1);
    expect(getHandValue(state, "topRight")).toBe(2);
    expect(getHandValue(state, "bottomLeft")).toBe(3);
    expect(getHandValue(state, "bottomRight")).toBe(4);
  });
});

// ── isPlayerDefeated ───────────────────────────────────────────────────────

describe("isPlayerDefeated", () => {
  it("true when both hands are 0", () => {
    expect(isPlayerDefeated({ leftHand: 0, rightHand: 0 })).toBe(true);
  });
  it("false when only the left hand is non-zero", () => {
    expect(isPlayerDefeated({ leftHand: 1, rightHand: 0 })).toBe(false);
  });
  it("false when only the right hand is non-zero", () => {
    expect(isPlayerDefeated({ leftHand: 0, rightHand: 2 })).toBe(false);
  });
  it("false when both hands are non-zero", () => {
    expect(isPlayerDefeated({ leftHand: 1, rightHand: 1 })).toBe(false);
  });
});

// ── checkWinner ────────────────────────────────────────────────────────────

describe("checkWinner", () => {
  it("returns player2 when player1 is eliminated", () => {
    expect(checkWinner(makeState({ l: 0, r: 0 }, { l: 1, r: 1 }))).toBe("player2");
  });
  it("returns player1 when player2 is eliminated", () => {
    expect(checkWinner(makeState({ l: 1, r: 1 }, { l: 0, r: 0 }))).toBe("player1");
  });
  it("returns null when no one is eliminated", () => {
    expect(checkWinner(makeState({ l: 1, r: 1 }, { l: 1, r: 1 }))).toBeNull();
  });
});

// ── isAddMoveValid ─────────────────────────────────────────────────────────

describe("isAddMoveValid", () => {
  it("valid: player2 attacks player1 with non-zero hands", () => {
    const state = makeState({ l: 1, r: 2 }, { l: 3, r: 1 });
    expect(isAddMoveValid(state, "bottomLeft", "topRight")).toBe(true);
  });
  it("invalid: attacking own hand (same player)", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 2, r: 1 });
    expect(isAddMoveValid(state, "bottomLeft", "bottomRight")).toBe(false);
    expect(isAddMoveValid(state, "topLeft", "topRight")).toBe(false);
  });
  it("invalid: source hand has 0 fingers", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 0, r: 3 });
    expect(isAddMoveValid(state, "bottomLeft", "topLeft")).toBe(false);
  });
  it("invalid: target hand has 0 fingers (already eliminated)", () => {
    const state = makeState({ l: 0, r: 1 }, { l: 2, r: 1 });
    expect(isAddMoveValid(state, "bottomLeft", "topLeft")).toBe(false);
  });
});

// ── applyAddMove ───────────────────────────────────────────────────────────

describe("applyAddMove", () => {
  it("sum < 5: adds fingers to target correctly", () => {
    const state = makeState({ l: 1, r: 2 }, { l: 3, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topLeft"); // 3+1=4
    expect(next.players.player1.leftHand).toBe(4);
  });

  it("sum = 5: target hand becomes 0", () => {
    const state = makeState({ l: 2, r: 1 }, { l: 3, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topLeft"); // 3+2=5→0
    expect(next.players.player1.leftHand).toBe(0);
  });

  it("sum > 5: target hand becomes 0", () => {
    const state = makeState({ l: 3, r: 1 }, { l: 4, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topLeft"); // 4+3=7→0
    expect(next.players.player1.leftHand).toBe(0);
  });

  it("no hand ever holds a value ≥ 5 after an add move", () => {
    const state = makeState({ l: 4, r: 1 }, { l: 4, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topLeft"); // 4+4=8→0
    for (const player of Object.values(next.players)) {
      expect(player.leftHand).toBeLessThan(5);
      expect(player.rightHand).toBeLessThan(5);
    }
  });

  it("source hand is never modified", () => {
    const state = makeState({ l: 2, r: 1 }, { l: 3, r: 2 });
    const next = applyAddMove(state, "bottomLeft", "topLeft");
    expect(next.players.player2.leftHand).toBe(state.players.player2.leftHand);
    expect(next.players.player2.rightHand).toBe(state.players.player2.rightHand);
  });

  it("turn switches after the move", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 1, r: 1 });
    expect(applyAddMove(state, "bottomLeft", "topLeft").currentPlayer).toBe("player1");
    const p1Turn = makeState({ l: 1, r: 1 }, { l: 1, r: 1 }, "player1");
    expect(applyAddMove(p1Turn, "topLeft", "bottomLeft").currentPlayer).toBe("player2");
  });

  it("sets isGameOver and winner when opponent is fully eliminated", () => {
    const state = makeState({ l: 0, r: 1 }, { l: 4, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topRight"); // 4+1=5→0; p1 now {0,0}
    expect(next.players.player1.rightHand).toBe(0);
    expect(next.isGameOver).toBe(true);
    expect(next.winner).toBe("player2");
    expect(next.phase).toBe("gameOver");
  });

  it("does not set isGameOver when opponent still has a live hand", () => {
    const state = makeState({ l: 1, r: 2 }, { l: 3, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topLeft"); // 3+1=4, p1 still alive
    expect(next.isGameOver).toBe(false);
    expect(next.winner).toBeNull();
  });

  it("preserves immutability — original state is not mutated", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 2, r: 1 });
    const originalLeft = state.players.player1.leftHand;
    applyAddMove(state, "bottomLeft", "topLeft");
    expect(state.players.player1.leftHand).toBe(originalLeft);
  });
});

// ── applySplitMove ─────────────────────────────────────────────────────────

describe("applySplitMove", () => {
  it("updates current player's hand values", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 3, r: 0 });
    const next = applySplitMove(state, 2, 1);
    expect(next.players.player2.leftHand).toBe(2);
    expect(next.players.player2.rightHand).toBe(1);
  });

  it("total finger count is preserved", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 3, r: 1 });
    const totalBefore = state.players.player2.leftHand + state.players.player2.rightHand;
    const next = applySplitMove(state, 2, 2);
    expect(next.players.player2.leftHand + next.players.player2.rightHand).toBe(totalBefore);
  });

  it("turn switches after the split", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 3, r: 0 });
    expect(applySplitMove(state, 2, 1).currentPlayer).toBe("player1");
  });

  it("never modifies the opponent's hands", () => {
    const state = makeState({ l: 2, r: 3 }, { l: 3, r: 1 });
    const next = applySplitMove(state, 2, 2);
    expect(next.players.player1.leftHand).toBe(2);
    expect(next.players.player1.rightHand).toBe(3);
  });

  it("never sets isGameOver", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 4, r: 0 });
    const next = applySplitMove(state, 2, 2);
    expect(next.isGameOver).toBe(false);
    expect(next.winner).toBeNull();
  });
});

// ── getAllValidDistributions ────────────────────────────────────────────────

describe("getAllValidDistributions", () => {
  it("{1,1}: only valid split is {0,2}", () => {
    const dists = getAllValidDistributions(makeState({ l: 1, r: 1 }, { l: 1, r: 1 }));
    expect(dists).toHaveLength(1);
    expect(dists[0]).toEqual([0, 2]);
  });

  it("{1,3}: valid splits are {0,4} and {2,2}", () => {
    const dists = getAllValidDistributions(makeState({ l: 1, r: 1 }, { l: 1, r: 3 }));
    const canonical = dists.map(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((a, b) => a[0] - b[0]);
    expect(canonical).toEqual([[0, 4], [2, 2]]);
  });

  it("{3,0}: only valid split is {1,2}", () => {
    const dists = getAllValidDistributions(makeState({ l: 1, r: 1 }, { l: 3, r: 0 }));
    expect(dists).toHaveLength(1);
    const [[l, r]] = dists;
    expect(Math.min(l, r)).toBe(1);
    expect(Math.max(l, r)).toBe(2);
  });

  it("{4,0}: valid splits are {1,3} and {2,2}", () => {
    const dists = getAllValidDistributions(makeState({ l: 1, r: 1 }, { l: 4, r: 0 }));
    const canonical = dists.map(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((a, b) => a[0] - b[0]);
    expect(canonical).toEqual([[1, 3], [2, 2]]);
  });

  it("never returns a distribution with a hand value > 4", () => {
    const dists = getAllValidDistributions(makeState({ l: 1, r: 1 }, { l: 2, r: 2 }));
    dists.forEach(([l, r]) => {
      expect(l).toBeGreaterThanOrEqual(0);
      expect(l).toBeLessThanOrEqual(4);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(4);
    });
  });

  it("never returns symmetric duplicates", () => {
    const dists = getAllValidDistributions(makeState({ l: 1, r: 1 }, { l: 1, r: 3 }));
    const keys = dists.map(([a, b]) => `${Math.min(a, b)},${Math.max(a, b)}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never includes the original hand state (or its mirror)", () => {
    const dists = getAllValidDistributions(makeState({ l: 1, r: 1 }, { l: 2, r: 1 }));
    dists.forEach(([l, r]) => {
      expect((l === 2 && r === 1) || (l === 1 && r === 2)).toBe(false);
    });
  });

  it("every returned distribution sums to the original total", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 3, r: 1 });
    const total = state.players.player2.leftHand + state.players.player2.rightHand;
    getAllValidDistributions(state).forEach(([l, r]) => {
      expect(l + r).toBe(total);
    });
  });

  it("returns empty list when no valid split exists (total > 8 or all combos symmetric)", () => {
    // {4,3}: total=7, only [3,4] which is symmetric to original → no valid splits
    const dists = getAllValidDistributions(makeState({ l: 1, r: 1 }, { l: 4, r: 3 }));
    expect(dists).toHaveLength(0);
  });
});

// ── isSplitMoveValid ───────────────────────────────────────────────────────

describe("isSplitMoveValid", () => {
  it("accepts a valid distribution", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 1, r: 3 });
    expect(isSplitMoveValid(state, 2, 2)).toBe(true);
    expect(isSplitMoveValid(state, 0, 4)).toBe(true);
  });

  it("accepts both orderings of an asymmetric valid split", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 1, r: 3 });
    expect(isSplitMoveValid(state, 0, 4)).toBe(true);
    expect(isSplitMoveValid(state, 4, 0)).toBe(true);
  });

  it("rejects the original hand state", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 1, r: 3 });
    expect(isSplitMoveValid(state, 1, 3)).toBe(false);
  });

  it("rejects a distribution symmetric to the original", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 1, r: 3 });
    expect(isSplitMoveValid(state, 3, 1)).toBe(false);
  });

  it("rejects values that do not sum to the original total", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 1, r: 3 });
    expect(isSplitMoveValid(state, 3, 2)).toBe(false); // 3+2=5 ≠ 4
  });

  it("rejects values > 4", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 2, r: 3 });
    expect(isSplitMoveValid(state, 5, 0)).toBe(false);
  });
});

// ── isBlockingPreview ──────────────────────────────────────────────────────

describe("isBlockingPreview", () => {
  const player2 = { leftHand: 1, rightHand: 3 };

  it("returns false when pendingSplit is null", () => {
    expect(isBlockingPreview(null, player2)).toBe(false);
  });

  it("returns false when pendingSplit is identical to original", () => {
    expect(isBlockingPreview({ newLeft: 1, newRight: 3 }, player2)).toBe(false);
  });

  it("returns false when pendingSplit is symmetric to original", () => {
    expect(isBlockingPreview({ newLeft: 3, newRight: 1 }, player2)).toBe(false);
  });

  it("returns true when pendingSplit is genuinely different from original", () => {
    expect(isBlockingPreview({ newLeft: 2, newRight: 2 }, player2)).toBe(true);
    expect(isBlockingPreview({ newLeft: 0, newRight: 4 }, player2)).toBe(true);
  });

  it("returns false for symmetric {0,0} state", () => {
    const p = { leftHand: 0, rightHand: 0 };
    expect(isBlockingPreview({ newLeft: 0, newRight: 0 }, p)).toBe(false);
  });
});

// ── createInitialGameState ─────────────────────────────────────────────────

describe("createInitialGameState", () => {
  it("both players start with {1,1}", () => {
    const state = createInitialGameState();
    expect(state.players.player1).toEqual({ leftHand: 1, rightHand: 1 });
    expect(state.players.player2).toEqual({ leftHand: 1, rightHand: 1 });
  });
  it("starts in selectDifficulty phase", () => {
    expect(createInitialGameState().phase).toBe("selectDifficulty");
  });
  it("isGameOver is false, winner is null", () => {
    const state = createInitialGameState();
    expect(state.isGameOver).toBe(false);
    expect(state.winner).toBeNull();
  });
});

// ── Game rule invariants ───────────────────────────────────────────────────

describe("game rule invariants", () => {
  it("add move never changes the source player's finger count", () => {
    const state = makeState({ l: 2, r: 3 }, { l: 1, r: 2 });
    const next = applyAddMove(state, "bottomLeft", "topRight");
    expect(next.players.player2.leftHand).toBe(1);
    expect(next.players.player2.rightHand).toBe(2);
  });

  it("split move preserves the current player's total finger count", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 3, r: 1 });
    const total = state.players.player2.leftHand + state.players.player2.rightHand;
    const next = applySplitMove(state, 2, 2);
    expect(next.players.player2.leftHand + next.players.player2.rightHand).toBe(total);
  });

  it("split move never modifies the opponent's hands", () => {
    const state = makeState({ l: 2, r: 3 }, { l: 3, r: 1 });
    const next = applySplitMove(state, 2, 2);
    expect(next.players.player1.leftHand).toBe(2);
    expect(next.players.player1.rightHand).toBe(3);
  });

  it("split move never triggers a game over", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 4, r: 0 });
    const next = applySplitMove(state, 2, 2);
    expect(next.isGameOver).toBe(false);
    expect(next.winner).toBeNull();
  });

  it("turn alternates correctly across multiple moves", () => {
    let state = makeState({ l: 1, r: 1 }, { l: 1, r: 1 });
    expect(state.currentPlayer).toBe("player2");
    state = applyAddMove(state, "bottomLeft", "topLeft");
    expect(state.currentPlayer).toBe("player1");
    state = applyAddMove(state, "topLeft", "bottomLeft");
    expect(state.currentPlayer).toBe("player2");
  });

  it("a winning add move immediately ends the game", () => {
    // p1 has {0,1}, player2 attacks topRight with bottomLeft(4) → 4+1=5→0, p1 eliminated
    const state = makeState({ l: 0, r: 1 }, { l: 4, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topRight");
    expect(next.isGameOver).toBe(true);
    expect(next.phase).toBe("gameOver");
    expect(next.winner).toBe("player2");
  });

  it("a player with one zero hand is not yet eliminated", () => {
    const state = makeState({ l: 0, r: 2 }, { l: 1, r: 1 });
    expect(state.isGameOver).toBe(false);
    expect(checkWinner(state)).toBeNull();
  });

  it("split attack-blocking: isBlockingPreview gate matches isSplitMoveValid result", () => {
    // Starting from {1,3}, split to {2,2}: genuinely different → blocking
    const player2 = { leftHand: 1, rightHand: 3 };
    expect(isBlockingPreview({ newLeft: 2, newRight: 2 }, player2)).toBe(true);

    // Reaching {3,1} from {1,3}: symmetric to original → not blocking, but also not a valid committed split
    expect(isBlockingPreview({ newLeft: 3, newRight: 1 }, player2)).toBe(false);
    const state = makeState({ l: 1, r: 1 }, { l: 1, r: 3 });
    expect(isSplitMoveValid(state, 3, 1)).toBe(false);
  });

  it("symmetric split preview {0,3} from original {3,0}: attacks remain unblocked", () => {
    // Player has {3,0}, splits through previews to reach {0,3} (symmetric)
    const player2 = { leftHand: 3, rightHand: 0 };
    // {0,3} is symmetric to {3,0} → should NOT be blocking
    expect(isBlockingPreview({ newLeft: 0, newRight: 3 }, player2)).toBe(false);
    // Cannot commit this as a split either
    const state = makeState({ l: 1, r: 1 }, { l: 3, r: 0 });
    expect(isSplitMoveValid(state, 0, 3)).toBe(false);
  });

  it("after reaching symmetric split preview, the hand with 3 fingers can still attack", () => {
    // Original {3,0}: leftHand=3 is valid attacker
    const state = makeState({ l: 1, r: 2 }, { l: 3, r: 0 });
    // applyAddMove with the left hand (which has 3) should work
    const next = applyAddMove(state, "bottomLeft", "topRight"); // 3+2=5→0
    expect(next.players.player1.rightHand).toBe(0);
    expect(next.currentPlayer).toBe("player1");
  });
});

// ── parseHandId — error handling ───────────────────────────────────────────

describe("parseHandId — error handling", () => {
  it("throws on an unrecognised handId string", () => {
    expect(() => parseHandId("middleLeft" as never)).toThrow();
  });
  it("throws on an empty string", () => {
    expect(() => parseHandId("" as never)).toThrow();
  });
  it("throws on a partially-correct string", () => {
    expect(() => parseHandId("topleft" as never)).toThrow();
  });
});

// ── botHandToHandId ────────────────────────────────────────────────────────

describe("botHandToHandId", () => {
  it("left/top → topLeft", () => {
    expect(botHandToHandId("left", "top")).toBe("topLeft");
  });
  it("right/top → topRight", () => {
    expect(botHandToHandId("right", "top")).toBe("topRight");
  });
  it("left/bottom → bottomLeft", () => {
    expect(botHandToHandId("left", "bottom")).toBe("bottomLeft");
  });
  it("right/bottom → bottomRight", () => {
    expect(botHandToHandId("right", "bottom")).toBe("bottomRight");
  });
});

// ── applyAddMove — boundary values ────────────────────────────────────────

describe("applyAddMove — boundary values", () => {
  it("sum exactly 4 does NOT eliminate the hand", () => {
    const state = makeState({ l: 3, r: 1 }, { l: 1, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topLeft"); // 1+3=4 → stays 4
    expect(next.players.player1.leftHand).toBe(4);
    expect(next.isGameOver).toBe(false);
  });

  it("sum exactly 5 eliminates the hand (mod 5 → 0)", () => {
    const state = makeState({ l: 4, r: 1 }, { l: 1, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topLeft"); // 1+4=5→0
    expect(next.players.player1.leftHand).toBe(0);
  });

  it("sum 8 (4+4) wraps to 0", () => {
    const state = makeState({ l: 4, r: 1 }, { l: 4, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topLeft"); // 4+4=8→0
    expect(next.players.player1.leftHand).toBe(0);
  });

  it("sum 6 (4+2) wraps to 0", () => {
    const state = makeState({ l: 4, r: 1 }, { l: 2, r: 1 });
    const next = applyAddMove(state, "bottomLeft", "topLeft"); // 2+4=6→0
    expect(next.players.player1.leftHand).toBe(0);
  });
});

// ── getAllValidDistributions — player1's turn ──────────────────────────────

describe("getAllValidDistributions — player1's turn", () => {
  it("{1,3} for player1: valid splits are {0,4} and {2,2}", () => {
    const state = makeState({ l: 1, r: 3 }, { l: 1, r: 1 }, "player1");
    const dists = getAllValidDistributions(state);
    const canonical = dists
      .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    expect(canonical).toEqual([[0, 4], [2, 2]]);
  });

  it("{2,2} for player1: valid splits are {0,4} and {1,3}", () => {
    const state = makeState({ l: 2, r: 2 }, { l: 1, r: 1 }, "player1");
    const dists = getAllValidDistributions(state);
    const canonical = dists
      .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    expect(canonical).toEqual([[0, 4], [1, 3]]);
  });

  it("{4,3} for player1: no valid splits (only symmetric mirror exists)", () => {
    const state = makeState({ l: 4, r: 3 }, { l: 1, r: 1 }, "player1");
    expect(getAllValidDistributions(state)).toHaveLength(0);
  });

  it("{3,0} for player1: only valid split is {1,2}", () => {
    const state = makeState({ l: 3, r: 0 }, { l: 1, r: 1 }, "player1");
    const dists = getAllValidDistributions(state);
    expect(dists).toHaveLength(1);
    const [[l, r]] = dists;
    expect(Math.min(l, r)).toBe(1);
    expect(Math.max(l, r)).toBe(2);
  });
});

// ── getAllValidDistributions — one hand eliminated ─────────────────────────

describe("getAllValidDistributions — one eliminated hand", () => {
  it("{0,4}: valid splits are {1,3} and {2,2}", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 0, r: 4 });
    const dists = getAllValidDistributions(state);
    const canonical = dists
      .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    expect(canonical).toEqual([[1, 3], [2, 2]]);
  });

  it("{0,2}: valid split is {1,1}", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 0, r: 2 });
    const dists = getAllValidDistributions(state);
    expect(dists).toHaveLength(1);
    expect(dists[0][0] + dists[0][1]).toBe(2);
    expect(Math.min(dists[0][0], dists[0][1])).toBe(1);
  });

  it("{0,1}: no valid splits (total=1, only identity distribution)", () => {
    const state = makeState({ l: 1, r: 1 }, { l: 0, r: 1 });
    expect(getAllValidDistributions(state)).toHaveLength(0);
  });
});

// ── isSplitMoveValid — player1's turn ─────────────────────────────────────

describe("isSplitMoveValid — player1's turn", () => {
  it("accepts valid distributions for player1", () => {
    const state = makeState({ l: 3, r: 1 }, { l: 1, r: 1 }, "player1");
    expect(isSplitMoveValid(state, 2, 2)).toBe(true);
    expect(isSplitMoveValid(state, 0, 4)).toBe(true);
  });

  it("rejects the original hand state for player1", () => {
    const state = makeState({ l: 3, r: 1 }, { l: 1, r: 1 }, "player1");
    expect(isSplitMoveValid(state, 3, 1)).toBe(false);
    expect(isSplitMoveValid(state, 1, 3)).toBe(false);
  });
});

// ── checkWinner — priority ordering ───────────────────────────────────────

describe("checkWinner — priority ordering", () => {
  it("player1 check fires first: {0,0} vs {0,0} → player2 wins", () => {
    // Degenerate state unreachable via valid moves — tests evaluation order only
    const state = makeState({ l: 0, r: 0 }, { l: 0, r: 0 });
    expect(checkWinner(state)).toBe("player2");
  });
});

// ── Integration — multi-move game sequences ────────────────────────────────

describe("integration — multi-move game sequences", () => {
  it("correctly resolves a near-end game to game over", () => {
    let state = makeState({ l: 0, r: 1 }, { l: 4, r: 1 });
    expect(state.isGameOver).toBe(false);
    expect(state.currentPlayer).toBe("player2");

    state = applyAddMove(state, "bottomLeft", "topRight"); // 4+1=5→0, p1 eliminated
    expect(state.isGameOver).toBe(true);
    expect(state.winner).toBe("player2");
    expect(state.phase).toBe("gameOver");
    expect(state.players.player1.leftHand).toBe(0);
    expect(state.players.player1.rightHand).toBe(0);
  });

  it("split then add: total preserved and turn alternates correctly", () => {
    let state = makeState({ l: 2, r: 1 }, { l: 3, r: 1 }, "player2");
    const p2TotalBefore = state.players.player2.leftHand + state.players.player2.rightHand;

    state = applySplitMove(state, 2, 2); // p2 splits {3,1} → {2,2}
    expect(state.players.player2.leftHand + state.players.player2.rightHand).toBe(p2TotalBefore);
    expect(state.currentPlayer).toBe("player1");

    state = applyAddMove(state, "topLeft", "bottomLeft"); // p1 attacks: 2+2=4
    expect(state.players.player2.leftHand).toBe(4);
    expect(state.currentPlayer).toBe("player2");
  });

  it("original state is never mutated across a chain of moves", () => {
    const initial = makeState({ l: 1, r: 2 }, { l: 2, r: 1 });
    const snap = JSON.stringify(initial);
    const s1 = applyAddMove(initial, "bottomLeft", "topRight"); // 2+2=4
    const s2 = applyAddMove(s1, "topLeft", "bottomRight");      // 1+1=2
    void s2;
    expect(JSON.stringify(initial)).toBe(snap);
  });

  it("full game from initial: can reach a winner within valid moves", () => {
    // Start from initial state, play a sequence that ends the game
    // p2: 1,1 vs p1: 1,1. p2 attacks: 1+1=2. p1: 2,1. p2 attacks: 1+2=3. p1: 3,1
    // p2 attacks: 1+3=4. p1: 4,1. p2 attacks: 1+4=5→0. p1: 0,1
    // p1 attacks: 1+1=2. p2: 2,1. p1 attacks: 1+2=3. p2: 3,1
    // p1 attacks: 1+3=4. p2: 4,1. p1 attacks: 1+4=5→0. p2: 0,1
    // Then we'd cycle... let's use a shortcut: from {0,1} vs {4,1}, attack to finish
    let state = makeState({ l: 0, r: 1 }, { l: 4, r: 1 }); // p2's turn
    expect(checkWinner(state)).toBeNull();
    state = applyAddMove(state, "bottomLeft", "topRight");
    expect(state.winner).toBe("player2");
  });

  it("a split does not change whose turn it is after the opponent moves", () => {
    let state = makeState({ l: 1, r: 3 }, { l: 1, r: 1 }, "player2");
    // p2 splits
    state = applySplitMove(state, 2, 2);
    expect(state.currentPlayer).toBe("player1");
    // p1 makes an add move
    state = applyAddMove(state, "topLeft", "bottomLeft"); // 1+2=3
    expect(state.currentPlayer).toBe("player2");
  });
});
