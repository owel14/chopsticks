"use client";

import { useState } from "react";
import type { Difficulty } from "@/lib/game/types";

interface DifficultyModalProps {
  initialDifficulty: Difficulty;
  onStart: (difficulty: Difficulty) => void;
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export default function DifficultyModal({ initialDifficulty, onStart }: DifficultyModalProps) {
  const [selected, setSelected] = useState<Difficulty>(initialDifficulty);

  return (
    <div className="popup-overlay">
      <div className="popup game-mode-popup">
        <h2>Select difficulty</h2>
        <div className="difficulty-selection">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`difficulty-btn${selected === d ? " selected" : ""}`}
              onClick={() => setSelected(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => onStart(selected)}>Play</button>
      </div>
    </div>
  );
}
