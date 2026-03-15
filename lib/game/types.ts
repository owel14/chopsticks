export type PlayerId = "player1" | "player2";
export type HandSide = "leftHand" | "rightHand";
export type HandId = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
export type Difficulty = "easy" | "medium" | "hard";
export type GamePhase = "selectDifficulty" | "playing" | "gameOver";

export interface PlayerState {
  leftHand: number;
  rightHand: number;
}

export interface GameState {
  players: Record<PlayerId, PlayerState>;
  currentPlayer: PlayerId;
  startingPlayer: PlayerId;
  isGameOver: boolean;
  winner: PlayerId | null;
  phase: GamePhase;
  difficulty: Difficulty;
}

export interface BotAddMove {
  type: "add";
  from: "left" | "right";
  to: "left" | "right";
}

export interface BotSplitMove {
  type: "split";
  left: number;
  right: number;
}

export type BotMove = BotAddMove | BotSplitMove;

export interface BotMinimaxState {
  player1: PlayerState;
  player2: PlayerState;
  isPlayer1Turn: boolean;
}
