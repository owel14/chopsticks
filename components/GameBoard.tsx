"use client";

import Hand from "./Hand";
import type { HandId, GameState, AnimatingMove, PendingSplit } from "@/lib/game/types";
import { getHandValue, isSplitMoveValid } from "@/lib/game/gameLogic";
import { useDragDrop } from "@/lib/hooks/useDragDrop";
import { useBotAnimation } from "@/lib/hooks/useBotAnimation";

interface GameBoardProps {
  gameState: GameState;
  pendingSplit: PendingSplit | null;
  animatingMove: AnimatingMove;
  onExecuteAdd: (sourceHandId: HandId, targetHandId: HandId) => void;
  onSetPendingSplit: (split: PendingSplit | null) => void;
  onConfirmSplit: () => void;
  opponentName?: string;
  isOnline?: boolean;
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

  useBotAnimation(animatingMove, handRefs);

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
          className="btn-primary"
          disabled={!splitEnabled}
          onClick={onConfirmSplit}
        >
          Split
        </button>
      </div>
    </div>
  );
}
