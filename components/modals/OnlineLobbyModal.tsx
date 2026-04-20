"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isRoomCode, normalizeRoomCode } from "@/lib/online/roomCode";

interface OnlineLobbyModalProps {
  onBack: () => void;
}

export default function OnlineLobbyModal({ onBack }: OnlineLobbyModalProps) {
  const router = useRouter();
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("playerName") || "";
    }
    return "";
  });
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    sessionStorage.setItem("playerName", name.trim());
    router.push("/create");
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!joinCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    const normalizedCode = normalizeRoomCode(joinCode);
    if (!isRoomCode(normalizedCode)) {
      setError("Please enter a valid room code");
      return;
    }
    sessionStorage.setItem("playerName", name.trim());
    router.push(`/${normalizedCode}`);
  };

  return (
    <div className="popup-overlay">
      <div className="popup game-mode-popup online-lobby">
        <button className="modal-back-btn" onClick={onBack} aria-label="Back">
          &larr;
        </button>
        <h2>Play Online</h2>

        <div className="lobby-field">
          <label htmlFor="name-input">Your Name</label>
          <input
            id="name-input"
            className="lobby-input"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            maxLength={20}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
        </div>

        {error && <p className="lobby-error">{error}</p>}

        <button onClick={handleCreate}>Create Room</button>

        <div className="lobby-divider">
          <span>or join a room</span>
        </div>

        <div className="lobby-join-row">
          <input
            className="lobby-input lobby-code-input"
            type="text"
            placeholder="Room code"
            value={joinCode}
            onChange={(e) => { setJoinCode(normalizeRoomCode(e.target.value)); setError(""); }}
            maxLength={6}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
          <button className="lobby-join-btn" onClick={handleJoin}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
