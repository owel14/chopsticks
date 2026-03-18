"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  applyAddMove,
  applySplitMove,
  botHandToHandId,
  createInitialGameState,
  getAllValidDistributions,
  isSplitMoveValid,
  parseHandId,
} from "../game/gameLogic";
import { BOT_THINK_DELAY, ADD_ANIMATION_MS, SPLIT_ANIMATION_MS } from "../game/constants";
import { getBotMove } from "../ai/bots";
import type { Difficulty, GameState, HandId } from "../game/types";

type Action =
  | { type: "START_GAME"; difficulty: Difficulty; nextStarting: "player1" | "player2" }
  | { type: "EXECUTE_ADD"; sourceHandId: HandId; targetHandId: HandId; preSplit?: PendingSplit | null }
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
    case "EXECUTE_ADD": {
      if (state.isGameOver) return state;
      const [sourcePlayer] = parseHandId(action.sourceHandId);
      if (sourcePlayer !== state.currentPlayer) return state;
      let baseState = state;
      if (action.preSplit) {
        baseState = {
          ...state,
          players: {
            ...state.players,
            [state.currentPlayer]: {
              leftHand: action.preSplit.newLeft,
              rightHand: action.preSplit.newRight,
            },
          },
        };
      }
      return applyAddMove(baseState, action.sourceHandId, action.targetHandId);
    }
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

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPendingSplit = useCallback((split: PendingSplit | null) => {
    setPendingSplitState(split);
  }, []);

  // AI turn
  useEffect(() => {
    if (gameState.phase !== "playing") return;
    if (gameState.currentPlayer !== "player1") return;
    if (gameState.isGameOver) return;

    const outerTimeout = setTimeout(() => {
      const current = gameStateRef.current;
      const move = getBotMove(current, current.difficulty);
      if (!move) return;

      if (move.type === "add") {
        const sourceHandId = botHandToHandId(move.from, "top");
        const targetHandId = botHandToHandId(move.to, "bottom");

        setAnimatingMove({ type: "add", sourceHandId, targetHandId });
        animTimerRef.current = setTimeout(() => {
          setAnimatingMove(null);
          dispatch({ type: "EXECUTE_ADD", sourceHandId, targetHandId });
        }, ADD_ANIMATION_MS);
      } else {
        setAnimatingMove({ type: "split" });
        animTimerRef.current = setTimeout(() => {
          setAnimatingMove(null);
          dispatch({ type: "EXECUTE_SPLIT", newLeft: move.left, newRight: move.right });
        }, SPLIT_ANIMATION_MS);
      }
    }, BOT_THINK_DELAY);

    return () => {
      clearTimeout(outerTimeout);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [gameState.currentPlayer, gameState.phase, gameState.isGameOver]);

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
    (sourceHandId: HandId, targetHandId: HandId, preSplit?: PendingSplit | null) => {
      setPendingSplit(null);
      dispatch({ type: "EXECUTE_ADD", sourceHandId, targetHandId, preSplit });
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
