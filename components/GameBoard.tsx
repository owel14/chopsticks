"use client";

import { useEffect } from "react";
import Hand from "./Hand";
import type { HandId, GameState } from "@/lib/game/types";
import type { AnimatingMove, PendingSplit } from "@/lib/hooks/useGame";
import { getHandValue, isSplitMoveValid } from "@/lib/game/gameLogic";
import { ADD_ANIMATION_MS, SPLIT_ANIMATION_MS } from "@/lib/game/constants";
import { useDragDrop } from "@/lib/hooks/useDragDrop";

interface GameBoardProps {
  gameState: GameState;
  pendingSplit: PendingSplit | null;
  animatingMove: AnimatingMove;
  onExecuteAdd: (sourceHandId: HandId, targetHandId: HandId, preSplit?: PendingSplit | null) => void;
  onSetPendingSplit: (split: PendingSplit | null) => void;
  onConfirmSplit: () => void;
  opponentName?: string;
  isOnline?: boolean;
}

// Returns the center of a DOMRect as {x, y}
function center(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export default function GameBoard({
  gameState,
  pendingSplit,
  animatingMove,
  onExecuteAdd,
  onSetPendingSplit,
  onConfirmSplit,
  opponentName = "Computer",
  isOnline = false,
}: GameBoardProps) {
  const isPlayerTurn = gameState.currentPlayer === "player2" && gameState.phase === "playing";

  const { handRefs, draggingHandId, preview, canDragHand, handlePointerDown } = useDragDrop({
    gameState,
    pendingSplit,
    isPlayerTurn,
    onExecuteAdd,
    onSetPendingSplit,
  });

  // ── Bot animation ──────────────────────────────────────────────────────────
  // Uses Web Animations API so bot motion is completely decoupled from CSS
  // transitions (which are used only for drag). fill:"none" means the API
  // never leaves a committed inline style behind — no manual cleanup needed.
  useEffect(() => {
    const refs = handRefs.current;

    if (!animatingMove) {
      // Cancel any in-flight animations so they don't hold a stale transform.
      (["topLeft", "topRight", "bottomLeft", "bottomRight"] as HandId[]).forEach((id) => {
        refs[id]?.getAnimations().forEach((a) => a.cancel());
      });
      return;
    }

    if (animatingMove.type === "add") {
      const sourceEl = refs[animatingMove.sourceHandId];
      const targetEl = refs[animatingMove.targetHandId];
      if (!sourceEl || !targetEl) return;

      const sc = center(sourceEl.getBoundingClientRect());
      const tc = center(targetEl.getBoundingClientRect());
      const dx = tc.x - sc.x;
      const dy = tc.y - sc.y;

      // Single animation: origin → target (ease-out) → origin (ease-in-out)
      sourceEl.animate(
        [
          { transform: "translate(0px, 0px)", easing: "ease-out" },
          { transform: `translate(${dx}px, ${dy}px)`, easing: "ease-in-out" },
          { transform: "translate(0px, 0px)" },
        ],
        { duration: ADD_ANIMATION_MS, fill: "none" }
      );
    }

    if (animatingMove.type === "split") {
      const leftEl = refs["topLeft"];
      const rightEl = refs["topRight"];
      if (!leftEl || !rightEl) return;

      const lc = center(leftEl.getBoundingClientRect());
      const rc = center(rightEl.getBoundingClientRect());
      const midX = (lc.x + rc.x) / 2;
      const ldx = midX - lc.x;
      const rdx = midX - rc.x;

      const opts: KeyframeAnimationOptions = { duration: SPLIT_ANIMATION_MS, fill: "none" };
      // Each hand moves to the midpoint then returns — brief "collision" effect
      leftEl.animate(
        [
          { transform: "translate(0px, 0px)", easing: "ease-in-out" },
          { transform: `translate(${ldx}px, 0px)`, easing: "ease-in-out" },
          { transform: "translate(0px, 0px)" },
        ],
        opts
      );
      rightEl.animate(
        [
          { transform: "translate(0px, 0px)", easing: "ease-in-out" },
          { transform: `translate(${rdx}px, 0px)`, easing: "ease-in-out" },
          { transform: "translate(0px, 0px)" },
        ],
        opts
      );
    }
  }, [animatingMove]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getDisplayValue = (handId: HandId): number => {
    if (pendingSplit) {
      if (handId === "bottomLeft") return pendingSplit.newLeft;
      if (handId === "bottomRight") return pendingSplit.newRight;
    }
    return getHandValue(gameState, handId);
  };

  const getPreviewValue = (handId: HandId): number | null => {
    if (!preview) return null;
    if (handId === preview.targetHandId) return preview.targetPreviewValue;
    if (handId === preview.sourceHandId && preview.sourcePreviewValue !== undefined)
      return preview.sourcePreviewValue;
    return null;
  };

  const animatingHandIds = new Set<HandId>(
    animatingMove?.type === "add" ? [animatingMove.sourceHandId] :
    animatingMove?.type === "split" ? ["topLeft", "topRight"] : []
  );

  const splitEnabled =
    pendingSplit !== null &&
    isPlayerTurn &&
    isSplitMoveValid(gameState, pendingSplit.newLeft, pendingSplit.newRight);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="game-board">
      {/* Computer */}
      <div className="player-section">
        <div className="player-header">
          <header id="computer">{opponentName}</header>
        </div>
        <div className="draggable-container">
          {(["topLeft", "topRight"] as HandId[]).map((handId) => (
            <Hand
              key={handId}
              ref={(el) => { handRefs.current[handId] = el; }}
              handId={handId}
              value={getHandValue(gameState, handId)}
              previewValue={getPreviewValue(handId)}
              isZero={getHandValue(gameState, handId) === 0}
              canDrag={false}
              isDragging={false}
              isAnimating={animatingHandIds.has(handId)}
            />
          ))}
        </div>
      </div>

      <div className="turn-divider">
        <span className={`turn-badge${isPlayerTurn ? " turn-badge--player" : " turn-badge--computer"}`}>
          {isPlayerTurn ? "Your turn" : isOnline ? `${opponentName}'s turn` : "Computer thinking…"}
        </span>
      </div>

      {/* Player */}
      <div className="player-section">
        <div className="draggable-container">
          {(["bottomLeft", "bottomRight"] as HandId[]).map((handId) => (
            <Hand
              key={handId}
              ref={(el) => { handRefs.current[handId] = el; }}
              handId={handId}
              value={getDisplayValue(handId)}
              previewValue={getPreviewValue(handId)}
              isZero={getDisplayValue(handId) === 0}
              canDrag={canDragHand(handId)}
              isDragging={draggingHandId === handId}
              isAnimating={animatingHandIds.has(handId)}
              onPointerDown={(e) => handlePointerDown(e, handId)}
            />
          ))}
        </div>
        <button
          id="splitButton"
          disabled={!splitEnabled}
          style={{ opacity: splitEnabled ? 1 : 0.5, cursor: splitEnabled ? "pointer" : "not-allowed" }}
          onClick={onConfirmSplit}
        >
          Split
        </button>
      </div>
    </div>
  );
}
