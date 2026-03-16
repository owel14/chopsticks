"use client";

interface WinnerModalProps {
  winner: "player1" | "player2";
  onPlayAgain: () => void;
  onLeave?: () => void;
  opponentName?: string;
}

export default function WinnerModal({ winner, onPlayAgain, onLeave, opponentName }: WinnerModalProps) {
  const loserLabel = opponentName || "Computer";
  const message = winner === "player2" ? "You win!" : `${loserLabel} wins!`;

  return (
    <div className="popup-overlay">
      <div className="winner-popup">
        <h2>{message}</h2>
        <div className="winner-actions">
          <button onClick={onPlayAgain}>Play Again</button>
          {onLeave && (
            <button className="leave-btn" onClick={onLeave}>Leave</button>
          )}
        </div>
      </div>
    </div>
  );
}
