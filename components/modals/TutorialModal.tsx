"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

/* ── Shared frame-cycling hook ───────────────────────── */

function useFrameCycle<T>(frames: T[], timings: number[]): T {
  const [index, setIndex] = useState(0);
  const tick = useCallback(() => setIndex((i) => (i + 1) % frames.length), [frames.length]);

  useEffect(() => {
    const id = setTimeout(tick, timings[index]);
    return () => clearTimeout(id);
  }, [index, tick, timings]);

  return frames[index];
}

/* ── Shared hand image ───────────────────────────────── */

function DemoHand({ value, label, flip, className, style }: {
  value: number;
  label: string;
  flip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`demo-hand ${className ?? ""}`} style={style}>
      <Image
        src={`/img/${value}.png`}
        alt={`${value} fingers`}
        width={56}
        height={56}
        style={flip ? { transform: "scaleX(-1)" } : undefined}
        draggable={false}
      />
      <span className="demo-label">{label}</span>
    </div>
  );
}

/* ── Add demo ────────────────────────────────────────── */

const ADD_FRAMES = [
  { attacker: 1, defender: 2, offsetX: 0, flash: false },
  { attacker: 1, defender: 2, offsetX: 60, flash: false },
  { attacker: 1, defender: 3, offsetX: 60, flash: true },
  { attacker: 1, defender: 3, offsetX: 0, flash: false },
];
const ADD_TIMINGS = [1200, 400, 500, 600];

function AddDemo() {
  const { attacker, defender, offsetX, flash } = useFrameCycle(ADD_FRAMES, ADD_TIMINGS);

  return (
    <div className="demo-scene">
      <DemoHand value={attacker} label="You (1)" style={{ transform: `translateX(${offsetX}%)` }} />
      <div className="demo-arrow">+</div>
      <DemoHand value={defender} label={`Opp (${defender})`} flip className={flash ? "demo-flash" : ""} />
    </div>
  );
}

/* ── Eliminate demo ──────────────────────────────────── */

const ELIM_FRAMES = [
  { attacker: 2, defender: 3, offsetX: 0, eliminated: false },
  { attacker: 2, defender: 3, offsetX: 60, eliminated: false },
  { attacker: 2, defender: 0, offsetX: 60, eliminated: true },
  { attacker: 2, defender: 0, offsetX: 0, eliminated: true },
];
const ELIM_TIMINGS = [1200, 400, 500, 600];

function EliminateDemo() {
  const { attacker, defender, offsetX, eliminated } = useFrameCycle(ELIM_FRAMES, ELIM_TIMINGS);

  return (
    <div className="demo-scene">
      <DemoHand value={attacker} label="You (2)" style={{ transform: `translateX(${offsetX}%)` }} />
      <div className="demo-arrow">+</div>
      <DemoHand
        value={defender}
        label={eliminated ? "Out!" : `Opp (${defender})`}
        flip
        className={eliminated ? "demo-eliminated" : ""}
        style={{ opacity: eliminated ? 0.3 : 1, transition: "opacity 0.3s" }}
      />
    </div>
  );
}

/* ── Split demo ──────────────────────────────────────── */

type SplitPhase = "idle" | "drag" | "land" | "return" | "choose" | "hover" | "confirm" | "done";

const SPLIT_FRAMES: { left: number; right: number; phase: SplitPhase; offsetX: number }[] = [
  { left: 3, right: 1, phase: "idle", offsetX: 0 },
  { left: 3, right: 1, phase: "drag", offsetX: 60 },
  { left: 2, right: 2, phase: "land", offsetX: 60 },
  { left: 2, right: 2, phase: "return", offsetX: 0 },
  { left: 2, right: 2, phase: "choose", offsetX: 0 },
  { left: 2, right: 2, phase: "hover", offsetX: 0 },
  { left: 2, right: 2, phase: "confirm", offsetX: 0 },
  { left: 2, right: 2, phase: "done", offsetX: 0 },
];
const SPLIT_TIMINGS = [1000, 500, 400, 500, 600, 600, 500, 900];

function SplitDemo() {
  const { left, right, phase, offsetX } = useFrameCycle(SPLIT_FRAMES, SPLIT_TIMINGS);
  const btnActive = phase === "choose" || phase === "hover";

  const btnClass = [
    "demo-split-btn",
    btnActive ? "demo-split-btn-active" : "",
    phase === "hover" ? "demo-split-btn-hover" : "",
    phase === "confirm" ? "demo-split-btn-pressed" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="demo-split-scene">
      <div className="demo-split-hands">
        <DemoHand value={left} label={`Left (${left})`} style={{ transform: `translateX(${offsetX}%)` }} />
        <DemoHand value={right} label={`Right (${right})`} flip />
      </div>
      <div className={btnClass}>Split</div>
    </div>
  );
}

/* ── Tutorial Modal ──────────────────────────────────── */

export default function TutorialModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="popup-overlay">
      <div className="info-content">
        <div className="info-header">
          <h3>How to Play Chopsticks</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="tutorial-content">
          <p>Each player starts with <strong>1 finger</strong> on each hand. Take turns choosing one action:</p>

          <div className="tutorial-section">
            <p className="tutorial-rule-title">Attack</p>
            <p>Drag your hand onto an opponent&apos;s hand. Your fingers <strong>add</strong> to theirs.</p>
            <AddDemo />
          </div>

          <div className="tutorial-section">
            <p className="tutorial-rule-title">Eliminate</p>
            <p>If a hand reaches <strong>exactly 5</strong>, it&apos;s knocked out!</p>
            <EliminateDemo />
          </div>

          <div className="tutorial-section">
            <p className="tutorial-rule-title">Split</p>
            <p>Drag your hand onto your other hand to redistribute fingers. Press the <strong>Split</strong> button to confirm.</p>
            <SplitDemo />
          </div>

          <p className="tutorial-win">Knock out <strong>both</strong> opponent hands to win.</p>
        </div>
      </div>
    </div>
  );
}
