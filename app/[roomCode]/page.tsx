"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import NamePrompt from "@/components/online/NamePrompt";
import OnlineGameRoom from "@/components/online/OnlineGameRoom";
import { isRoomCode } from "@/lib/online/roomCode";

export default function OnlineGamePage() {
  const params = useParams();
  const router = useRouter();
  const rawRoomCode = params.roomCode as string;
  const isCreate = rawRoomCode === "create";
  const roomCode = rawRoomCode.toUpperCase();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("playerName");
    if (stored) setPlayerName(stored);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!isCreate && !isRoomCode(roomCode)) {
    return (
      <main className="game-container">
        <div className="popup-overlay" style={{ position: "relative", background: "none", backdropFilter: "none" }}>
          <div className="game-mode-popup">
            <h2>Invalid room code</h2>
            <button onClick={() => router.push("/")}>Back</button>
          </div>
        </div>
      </main>
    );
  }

  if (!playerName) {
    return <NamePrompt onSubmit={setPlayerName} />;
  }

  return (
    <OnlineGameRoom
      action={isCreate ? "create" : "join"}
      roomCode={isCreate ? null : roomCode}
      playerName={playerName}
    />
  );
}
