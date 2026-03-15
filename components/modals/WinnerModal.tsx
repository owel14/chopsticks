"use client";

interface WinnerModalProps {
  winner: "player1" | "player2";
  onPlayAgain: () => void;
}

export default function WinnerModal({ winner, onPlayAgain }: WinnerModalProps) {
  const message = winner === "player2" ? "You win!" : "Computer wins!";

  return (
    <div className="popup-overlay">
      <div className="winner-popup">
        <h2>{message}</h2>
        <button onClick={onPlayAgain}>Play Again</button>
      </div>
    </div>
  );
}
