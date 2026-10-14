"use client";

import { useState } from "react";
import GameBoard from "@/components/GameBoard";
import DifficultyModal from "@/components/modals/DifficultyModal";
import OnlineLobbyModal from "@/components/modals/OnlineLobbyModal";
import WinnerModal from "@/components/modals/WinnerModal";
import HelpButton from "@/components/HelpButton";
import { useGame } from "@/lib/hooks/useGame";

export default function Home() {
  const {
    gameState,
    pendingSplit,
    animatingMove,
    startGame,
    executeAdd,
    setPendingSplit,
    confirmSplit,
    playAgain,
  } = useGame();

  const [showOnlineLobby, setShowOnlineLobby] = useState(false);

  return (
    <main className="game-container">
      <HelpButton />

      <GameBoard
        gameState={gameState}
        pendingSplit={pendingSplit}
        animatingMove={animatingMove}
        onExecuteAdd={executeAdd}
        onSetPendingSplit={setPendingSplit}
        onConfirmSplit={confirmSplit}
      />

      {gameState.phase === "selectDifficulty" && !showOnlineLobby && (
        <DifficultyModal
          initialDifficulty={gameState.difficulty}
          onStart={startGame}
          onPlayOnline={() => setShowOnlineLobby(true)}
        />
      )}

      {gameState.phase === "selectDifficulty" && showOnlineLobby && (
        <OnlineLobbyModal onBack={() => setShowOnlineLobby(false)} />
      )}

      {gameState.phase === "gameOver" && gameState.winner && (
        <WinnerModal winner={gameState.winner} onPlayAgain={playAgain} />
      )}
    </main>
  );
}
