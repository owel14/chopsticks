"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import NamePrompt from "@/components/online/NamePrompt";
import OnlineGameRoom from "@/components/online/OnlineGameRoom";

export default function OnlineGamePage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
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

  const isCreate = roomCode === "create";

  return (
    <OnlineGameRoom
      action={isCreate ? "create" : "join"}
      roomCode={isCreate ? null : roomCode}
      playerName={playerName}
    />
  );
}
