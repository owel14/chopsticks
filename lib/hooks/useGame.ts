"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  applyAddMove,
  applySplitMove,
  createInitialGameState,
  getAllValidDistributions,
  isSplitMoveValid,
} from "../game/gameLogic";
import { getBotMove } from "../ai/bots";
import type { Difficulty, GameState, HandId } from "../game/types";

type Action =
  | { type: "START_GAME"; difficulty: Difficulty; nextStarting: "player1" | "player2" }
  | { type: "EXECUTE_ADD"; sourceHandId: HandId; targetHandId: HandId }
  | { type: "EXECUTE_SPLIT"; newLeft: number; newRight: number }
  | { type: "PLAY_AGAIN" };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START_GAME":
      return {
        ...createInitialGameState(),
        difficulty: action.difficulty,
        startingPlayer: action.nextStarting,
        currentPlayer: action.nextStarting,
        phase: "playing",
      };
    case "EXECUTE_ADD":
      if (state.isGameOver) return state;
      return applyAddMove(state, action.sourceHandId, action.targetHandId);
    case "EXECUTE_SPLIT":
      if (state.isGameOver) return state;
      if (!isSplitMoveValid(state, action.newLeft, action.newRight)) return state;
      return applySplitMove(state, action.newLeft, action.newRight);
    case "PLAY_AGAIN":
      return { ...state, phase: "selectDifficulty" };
    default:
      return state;
  }
}

export interface PendingSplit {
  newLeft: number;
  newRight: number;
}

export type AnimatingMove =
  | { type: "add"; sourceHandId: HandId; targetHandId: HandId }
  | { type: "split" }
  | null;

export function useGame() {
  const [gameState, dispatch] = useReducer(gameReducer, createInitialGameState());
  const [pendingSplit, setPendingSplitState] = useState<PendingSplit | null>(null);
  const [animatingMove, setAnimatingMove] = useState<AnimatingMove>(null);

  const pendingSplitRef = useRef<PendingSplit | null>(null);
  pendingSplitRef.current = pendingSplit;

  const setPendingSplit = useCallback((split: PendingSplit | null) => {
    setPendingSplitState(split);
  }, []);

  // AI turn
  useEffect(() => {
    if (gameState.phase !== "playing") return;
    if (gameState.currentPlayer !== "player1") return;
    if (gameState.isGameOver) return;

    const outerTimeout = setTimeout(() => {
      const move = getBotMove(gameState, gameState.difficulty);
      if (!move) return;

      if (move.type === "add") {
        const sourceHandId = `top${move.from.charAt(0).toUpperCase()}${move.from.slice(1)}` as HandId;
        const targetHandId = `bottom${move.to.charAt(0).toUpperCase()}${move.to.slice(1)}` as HandId;

        setAnimatingMove({ type: "add", sourceHandId, targetHandId });
        setTimeout(() => {
          setAnimatingMove(null);
          dispatch({ type: "EXECUTE_ADD", sourceHandId, targetHandId });
        }, 800);
      } else {
        setAnimatingMove({ type: "split" });
        setTimeout(() => {
          setAnimatingMove(null);
          dispatch({ type: "EXECUTE_SPLIT", newLeft: move.left, newRight: move.right });
        }, 650);
      }
    }, 600);

    return () => clearTimeout(outerTimeout);
  }, [gameState.currentPlayer, gameState.phase, gameState.isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGame = useCallback(
    (difficulty: Difficulty) => {
      const nextStarting =
        gameState.startingPlayer === "player1" ? "player2" : "player1";
      setPendingSplit(null);
      dispatch({ type: "START_GAME", difficulty, nextStarting });
    },
    [gameState.startingPlayer, setPendingSplit]
  );

  const executeAdd = useCallback(
    (sourceHandId: HandId, targetHandId: HandId) => {
      setPendingSplit(null);
      dispatch({ type: "EXECUTE_ADD", sourceHandId, targetHandId });
    },
    [setPendingSplit]
  );

  const confirmSplit = useCallback(() => {
    const split = pendingSplitRef.current;
    if (!split) return;
    if (!isSplitMoveValid(gameState, split.newLeft, split.newRight)) return;
    setPendingSplit(null);
    dispatch({ type: "EXECUTE_SPLIT", newLeft: split.newLeft, newRight: split.newRight });
  }, [gameState, setPendingSplit]);

  const playAgain = useCallback(() => {
    dispatch({ type: "PLAY_AGAIN" });
  }, []);

  const validDistributions =
    gameState.phase === "playing" ? getAllValidDistributions(gameState) : [];

  return {
    gameState,
    pendingSplit,
    animatingMove,
    validDistributions,
    startGame,
    executeAdd,
    setPendingSplit,
    confirmSplit,
    playAgain,
  };
}
