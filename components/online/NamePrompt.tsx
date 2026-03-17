"use client";

import { useState } from "react";

interface NamePromptProps {
  onSubmit: (name: string) => void;
}

export default function NamePrompt({ onSubmit }: NamePromptProps) {
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
