"use client";

import { useRouter } from "next/navigation";
import { useOnlineGame } from "@/lib/hooks/useOnlineGame";
import GameBoard from "@/components/GameBoard";
import WinnerModal from "@/components/modals/WinnerModal";
import WaitingScreen from "./WaitingScreen";

interface OnlineGameRoomProps {
  action: "create" | "join";
  roomCode: string | null;
  playerName: string;
}

export default function OnlineGameRoom({ action, roomCode, playerName }: OnlineGameRoomProps) {
  const router = useRouter();
  const {
    gameState,
    pendingSplit,
    animatingMove,
    executeAdd,
    setPendingSplit,
    confirmSplit,
    playAgain,
    online,
  } = useOnlineGame(action, roomCode, playerName);

  if (online.status === "connecting") {
    return (
      <main className="game-container">
        <div className="status-message">Connecting to server&hellip;</div>
      </main>
    );
  }

  if (online.status === "waiting") {
    return <WaitingScreen roomCode={online.roomCode!} />;
  }

  if (online.status === "error") {
    return (
      <main className="game-container">
        <div className="popup-overlay" style={{ position: "relative", background: "none", backdropFilter: "none" }}>
          <div className="game-mode-popup">
            <h2>Error</h2>
            <p className="lobby-error">{online.error}</p>
            <button onClick={() => router.push("/")}>Back</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="game-container">
      <GameBoard
        gameState={gameState}
        pendingSplit={pendingSplit}
        animatingMove={animatingMove}
        onExecuteAdd={executeAdd}
        onSetPendingSplit={setPendingSplit}
        onConfirmSplit={confirmSplit}
        opponentName={online.opponentName || "Opponent"}
        isOnline
      />

      {online.status === "gameOver" && gameState.winner && (
        <WinnerModal
          winner={gameState.winner}
          onPlayAgain={playAgain}
          onLeave={() => router.push("/")}
          opponentName={online.opponentName || "Opponent"}
        />
      )}

      {online.status === "opponentLeft" && (
        <div className="popup-overlay">
          <div className="winner-popup">
            <h2>Opponent disconnected</h2>
            <button onClick={() => router.push("/")}>Back</button>
          </div>
        </div>
      )}
    </main>
  );
}
