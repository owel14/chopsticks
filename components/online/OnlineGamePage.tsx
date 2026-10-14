"use client";

import { useState, useEffect } from "react";
import NamePrompt from "@/components/online/NamePrompt";
import OnlineGameRoom from "@/components/online/OnlineGameRoom";

interface OnlineGamePageProps {
  /** Either the literal "create" or a validated 6-character room code. */
  roomCode: string;
}

export default function OnlineGamePage({ roomCode: rawRoomCode }: OnlineGamePageProps) {
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
