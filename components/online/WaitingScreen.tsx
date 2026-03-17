"use client";

import { useState } from "react";

interface WaitingScreenProps {
  roomCode: string;
}

export default function WaitingScreen({ roomCode }: WaitingScreenProps) {
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
