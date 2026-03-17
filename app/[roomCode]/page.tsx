"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useOnlineGame } from "@/lib/hooks/useOnlineGame";
import GameBoard from "@/components/GameBoard";
import WinnerModal from "@/components/modals/WinnerModal";

function NamePrompt({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");

  return (
    <main className="game-container">
      <div className="popup-overlay" style={{ position: "relative", background: "none", backdropFilter: "none" }}>
        <div className="game-mode-popup">
          <h2>Enter Your Name</h2>
          <div className="lobby-field">
            <input
              className="lobby-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  sessionStorage.setItem("playerName", name.trim());
                  onSubmit(name.trim());
                }
              }}
              autoFocus
            />
          </div>
          <button
            onClick={() => {
              if (!name.trim()) return;
              sessionStorage.setItem("playerName", name.trim());
              onSubmit(name.trim());
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </main>
  );
}

function WaitingScreen({ roomCode }: { roomCode: string }) {
  const [copied, setCopied] = useState(false);

  const link = typeof window !== "undefined"
    ? `${window.location.origin}/${roomCode}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main className="game-container">
      <div className="popup-overlay" style={{ position: "relative", background: "none", backdropFilter: "none" }}>
        <div className="game-mode-popup waiting-screen">
          <h2>Waiting for opponent&hellip;</h2>
          <div className="room-code-display">
            <span className="room-code-label">Room Code</span>
            <span className="room-code">{roomCode}</span>
          </div>
          <p className="waiting-hint">Share this code or link with a friend</p>
          <button onClick={copyLink}>
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>
    </main>
  );
}

function OnlineGameRoom({
  action,
  roomCode,
  playerName,
}: {
  action: "create" | "join";
  roomCode: string | null;
  playerName: string;
}) {
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

export default function OnlineGamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("playerName");
    if (stored) setPlayerName(stored);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!playerName) {
    return <NamePrompt onSubmit={setPlayerName} />;
  }

  const isCreate = roomCode === "create";

  return (
    <OnlineGameRoom
      action={isCreate ? "create" : "join"}
      roomCode={isCreate ? null : roomCode}
      playerName={playerName}
    />
  );
}
