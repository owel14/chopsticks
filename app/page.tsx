"use client";

import { useState } from "react";
import GameBoard from "@/components/GameBoard";
import DifficultyModal from "@/components/modals/DifficultyModal";
import OnlineLobbyModal from "@/components/modals/OnlineLobbyModal";
import WinnerModal from "@/components/modals/WinnerModal";
import TutorialModal from "@/components/modals/TutorialModal";
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

  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);

  return (
    <main className="game-container">
      <button
        id="info-button"
        onClick={() => setShowTutorial(true)}
        aria-label="How to play"
      >
        ?
      </button>

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

      {showTutorial && (
        <TutorialModal onClose={() => setShowTutorial(false)} />
      )}
    </main>
  );
}
