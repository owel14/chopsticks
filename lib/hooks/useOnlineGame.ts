"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { HubConnectionBuilder, HubConnection, LogLevel } from "@microsoft/signalr";
import type { GameState, HandId, PlayerId, PlayerState } from "../game/types";
import type { PendingSplit, AnimatingMove } from "./useGame";
import { applyAddMove, applySplitMove, getAllValidDistributions, isSplitMoveValid } from "../game/gameLogic";
import { ADD_ANIMATION_MS, SPLIT_ANIMATION_MS } from "../game/constants";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

export type RoomStatus = "connecting" | "waiting" | "playing" | "gameOver" | "opponentLeft" | "error";

export interface OnlineState {
  roomCode: string | null;
  status: RoomStatus;
  myPlayerId: PlayerId | null;
  myName: string;
  opponentName: string | null;
  error: string | null;
}

interface ServerGameState {
  player1: PlayerState;
  player2: PlayerState;
  currentPlayer: string;
  isGameOver: boolean;
  winner: string | null;
}

interface MoveInfo {
  type: string;
  moverId: string;
  fromHand?: string;
  toHand?: string;
}

function translateState(serverState: ServerGameState, myPlayerId: PlayerId): GameState {
  if (myPlayerId === "player2") {
    return {
      players: {
        player1: { ...serverState.player1 },
        player2: { ...serverState.player2 },
      },
      currentPlayer: serverState.currentPlayer as PlayerId,
      startingPlayer: "player2", // placeholder — unused in online mode
      isGameOver: serverState.isGameOver,
      winner: serverState.winner as PlayerId | null,
      phase: serverState.isGameOver ? "gameOver" : "playing",
      difficulty: "easy", // placeholder — unused in online mode
    };
  }

  // I'm player1 on server — swap so I appear as player2 (bottom of board)
  return {
    players: {
      player1: { ...serverState.player2 },
      player2: { ...serverState.player1 },
    },
    currentPlayer: (serverState.currentPlayer === "player1" ? "player2" : "player1") as PlayerId,
    startingPlayer: "player2", // placeholder — unused in online mode
    isGameOver: serverState.isGameOver,
    winner: serverState.winner
      ? ((serverState.winner === "player1" ? "player2" : "player1") as PlayerId)
      : null,
    phase: serverState.isGameOver ? "gameOver" : "playing",
    difficulty: "easy", // placeholder — unused in online mode
  };
}

const INITIAL_STATE: GameState = {
  players: {
    player1: { leftHand: 1, rightHand: 1 },
    player2: { leftHand: 1, rightHand: 1 },
  },
  currentPlayer: "player2",
  startingPlayer: "player2",
  isGameOver: false,
  winner: null,
  phase: "playing",
  difficulty: "easy",
};

export function useOnlineGame(
  action: "create" | "join",
  roomCodeParam: string | null,
  playerName: string
) {
  const connectionRef = useRef<HubConnection | null>(null);
  const [online, setOnline] = useState<OnlineState>({
    roomCode: roomCodeParam,
    status: "connecting",
    myPlayerId: null,
    myName: playerName,
    opponentName: null,
    error: null,
  });

  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [pendingSplit, setPendingSplitState] = useState<PendingSplit | null>(null);
  const [animatingMove, setAnimatingMove] = useState<AnimatingMove>(null);
  const pendingSplitRef = useRef<PendingSplit | null>(null);
  pendingSplitRef.current = pendingSplit;
  const myPlayerIdRef = useRef<PlayerId | null>(null);
  const gameStateRef = useRef<GameState>(INITIAL_STATE);
  gameStateRef.current = gameState;
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(`${SERVER_URL}/gamehub`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on("RoomCreated", (roomCode: string) => {
      setOnline(prev => ({ ...prev, roomCode, status: "waiting" }));
      window.history.replaceState(null, "", `/${roomCode}`);
    });

    connection.on(
      "GameStarted",
      (serverState: ServerGameState, yourPlayerId: string, p1Name: string, p2Name: string) => {
        const myId = yourPlayerId as PlayerId;
        myPlayerIdRef.current = myId;
        const opponentName = myId === "player1" ? p2Name : p1Name;

        setOnline(prev => ({
          ...prev,
          status: "playing",
          myPlayerId: myId,
          opponentName,
        }));

        const translated = translateState(serverState, myId);
        setGameState(translated);
        gameStateRef.current = translated;
        setPendingSplitState(null);
      }
    );

    connection.on("GameStateUpdated", (serverState: ServerGameState, moveInfo?: MoveInfo) => {
      const myId = myPlayerIdRef.current;
      if (!myId) return;

      const translated = translateState(serverState, myId);
      const isOpponentMove = moveInfo ? moveInfo.moverId !== myId : false;

      if (isOpponentMove && moveInfo) {
        // Animate opponent's move before applying state
        if (moveInfo.type === "add" && moveInfo.fromHand && moveInfo.toHand) {
          const sourceHandId = (moveInfo.fromHand === "left" ? "topLeft" : "topRight") as HandId;
          const targetHandId = (moveInfo.toHand === "left" ? "bottomLeft" : "bottomRight") as HandId;
          setAnimatingMove({ type: "add", sourceHandId, targetHandId });
        } else if (moveInfo.type === "split") {
          setAnimatingMove({ type: "split" });
        }

        const delay = moveInfo.type === "add" ? ADD_ANIMATION_MS : SPLIT_ANIMATION_MS;
        if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
        animationTimerRef.current = setTimeout(() => {
          setAnimatingMove(null);
          setGameState(translated);
          gameStateRef.current = translated;
          setPendingSplitState(null);

          if (translated.isGameOver) {
            setOnline(prev => ({ ...prev, status: "gameOver" }));
          }
        }, delay);
      } else {
        // My own move — update immediately
        setGameState(translated);
        gameStateRef.current = translated;
        setPendingSplitState(null);

        if (translated.isGameOver) {
          setOnline(prev => ({ ...prev, status: "gameOver" }));
        }
      }
    });

    connection.on("OpponentLeft", () => {
      setOnline(prev => ({ ...prev, status: "opponentLeft" }));
    });

    connection.on("Error", (message: string) => {
      setOnline(prev => ({ ...prev, status: "error", error: message }));
    });

    connection.onclose(() => {
      setOnline(prev => {
        if (prev.status === "opponentLeft" || prev.status === "error") return prev;
        return { ...prev, status: "connecting" };
      });
    });

    connection
      .start()
      .then(() => {
        if (action === "create") {
          connection.invoke("CreateRoom", playerName);
        } else if (roomCodeParam) {
          connection.invoke("JoinRoom", roomCodeParam, playerName);
        }
      })
      .catch((err) => {
        console.error("SignalR error:", err);
        setOnline(prev => ({
          ...prev,
          status: "error",
          error: "Failed to connect to server",
        }));
      });

    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      connection.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPendingSplit = useCallback((split: PendingSplit | null) => {
    setPendingSplitState(split);
  }, []);

  const executeAdd = useCallback((sourceHandId: HandId, targetHandId: HandId) => {
    const conn = connectionRef.current;
    if (!conn) return;

    const fromHand = sourceHandId === "bottomLeft" ? "left" : "right";
    const toHand = targetHandId === "topLeft" ? "left" : "right";

    // Optimistic update — apply locally so there's no flash between
    // the drag preview clearing and the server response arriving
    const optimistic = applyAddMove(gameStateRef.current, sourceHandId, targetHandId);
    setGameState(optimistic);
    gameStateRef.current = optimistic;
    setPendingSplitState(null);
    conn.invoke("MakeAddMove", fromHand, toHand);
  }, []);

  const confirmSplit = useCallback(() => {
    const split = pendingSplitRef.current;
    const conn = connectionRef.current;
    if (!split || !conn) return;

    if (!isSplitMoveValid(gameStateRef.current, split.newLeft, split.newRight)) return;

    const optimistic = applySplitMove(gameStateRef.current, split.newLeft, split.newRight);
    setGameState(optimistic);
    gameStateRef.current = optimistic;
    setPendingSplitState(null);
    conn.invoke("MakeSplitMove", split.newLeft, split.newRight);
  }, []);

  const playAgain = useCallback(() => {
    connectionRef.current?.invoke("PlayAgain");
  }, []);

  const validDistributions =
    online.status === "playing" ? getAllValidDistributions(gameState) : [];

  return {
    gameState,
    pendingSplit,
    animatingMove,
    validDistributions,
    executeAdd,
    setPendingSplit,
    confirmSplit,
    playAgain,
    online,
  };
}
