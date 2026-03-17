"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HandId, GameState } from "@/lib/game/types";
import type { PendingSplit } from "@/lib/hooks/useGame";
import {
  parseHandId,
  getHandValue,
  isAddMoveValid,
  isBlockingPreview,
} from "@/lib/game/gameLogic";

export interface DragPreview {
  sourceHandId: HandId;
  sourcePreviewValue?: number;
  targetHandId: HandId;
  targetPreviewValue: number;
}

const ALL_HAND_IDS: HandId[] = ["topLeft", "topRight", "bottomLeft", "bottomRight"];

function samePlayer(a: HandId, b: HandId) {
  return parseHandId(a)[0] === parseHandId(b)[0];
}

interface UseDragDropOptions {
  gameState: GameState;
  pendingSplit: PendingSplit | null;
  isPlayerTurn: boolean;
  onExecuteAdd: (source: HandId, target: HandId, preSplit?: PendingSplit | null) => void;
  onSetPendingSplit: (split: PendingSplit | null) => void;
}

interface UseDragDropResult {
  handRefs: React.MutableRefObject<Partial<Record<HandId, HTMLDivElement | null>>>;
  draggingHandId: HandId | null;
  preview: DragPreview | null;
  canDragHand: (handId: HandId) => boolean;
  handlePointerDown: (e: React.PointerEvent<HTMLDivElement>, handId: HandId) => void;
}

export function useDragDrop({
  gameState,
  pendingSplit,
  isPlayerTurn,
  onExecuteAdd,
  onSetPendingSplit,
}: UseDragDropOptions): UseDragDropResult {
  const handRefs = useRef<Partial<Record<HandId, HTMLDivElement | null>>>({});
  const [draggingHandId, setDraggingHandId] = useState<HandId | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);

  // Drag state in refs — zero React re-renders per pointer frame
  const draggingRef = useRef<HandId | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastOverlapRef = useRef<HandId | null>(null);

  // Rects cached once at drag-start — all comparisons are plain arithmetic, no reflow per frame.
  const cachedRectsRef = useRef<Partial<Record<HandId, DOMRect>>>({});
  // Initial rect of the dragged element itself (used to compute its translated rect each frame).
  const draggedInitialRectRef = useRef<DOMRect | null>(null);

  // Stable ref mirrors so effect callbacks always see current values
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const pendingSplitRef = useRef(pendingSplit);
  pendingSplitRef.current = pendingSplit;
  const isPlayerTurnRef = useRef(isPlayerTurn);
  isPlayerTurnRef.current = isPlayerTurn;
  const onExecuteAddRef = useRef(onExecuteAdd);
  onExecuteAddRef.current = onExecuteAdd;
  const onSetPendingSplitRef = useRef(onSetPendingSplit);
  onSetPendingSplitRef.current = onSetPendingSplit;

  const getDisplayed = useCallback((id: HandId): number => {
    const ps = pendingSplitRef.current;
    if (ps && id === "bottomLeft") return ps.newLeft;
    if (ps && id === "bottomRight") return ps.newRight;
    return getHandValue(gameStateRef.current, id);
  }, []);

  const canDragHand = useCallback(
    (handId: HandId): boolean => {
      if (!isPlayerTurnRef.current) return false;
      const [playerId] = parseHandId(handId);
      if (playerId === "player1") return false;
      return getDisplayed(handId) > 0;
    },
    [getDisplayed]
  );

  // Returns which hand the dragged image currently overlaps, using AABB intersection.
  // The dragged element's current rect is derived from its cached initial rect + the
  // current translate offset (dx, dy) — zero getBoundingClientRect() calls per frame.
  const checkOverlapByRect = useCallback(
    (draggedId: HandId, dx: number, dy: number): HandId | null => {
      const init = draggedInitialRectRef.current;
      if (!init) return null;
      const r1 = {
        left:   init.left   + dx,
        right:  init.right  + dx,
        top:    init.top    + dy,
        bottom: init.bottom + dy,
      };
      const rects = cachedRectsRef.current;
      for (const otherId of ALL_HAND_IDS) {
        if (otherId === draggedId) continue;
        const r2 = rects[otherId];
        if (!r2) continue;
        if (!(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom)) {
          return otherId;
        }
      }
      return null;
    },
    []
  );

  const computePreview = useCallback(
    (draggedId: HandId, overlappedId: HandId): DragPreview | null => {
      const gs = gameStateRef.current;
      const ps = pendingSplitRef.current;
      const draggedVal = getDisplayed(draggedId);
      const overlappedVal = getDisplayed(overlappedId);

      if (!samePlayer(draggedId, overlappedId)) {
        if (isBlockingPreview(ps, gs.players.player2)) return null;
        if (overlappedVal === 0) return null;
        const sum = draggedVal + overlappedVal;
        return {
          sourceHandId: draggedId,
          targetHandId: overlappedId,
          targetPreviewValue: sum >= 5 ? 0 : sum,
        };
      }

      if (overlappedVal >= 4) return null;
      return {
        sourceHandId: draggedId,
        sourcePreviewValue: draggedVal - 1,
        targetHandId: overlappedId,
        targetPreviewValue: overlappedVal + 1,
      };
    },
    [getDisplayed]
  );

  // Global pointer listeners — registered once on mount, read all state via refs
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const handId = draggingRef.current;
      const start = dragStartRef.current;
      if (!handId || !start) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;

      // Direct DOM mutation — zero React renders per frame
      const el = handRefs.current[handId];
      if (el) el.style.transform = `translate(${dx}px, ${dy}px)`;

      // Overlap: dragged image rect vs cached target rects — zero reflow
      const overlapped = checkOverlapByRect(handId, dx, dy);
      if (overlapped !== lastOverlapRef.current) {
        lastOverlapRef.current = overlapped;
        setPreview(overlapped ? computePreview(handId, overlapped) : null);
      }
    };

    const onUp = (e: PointerEvent) => {
      const handId = draggingRef.current;
      const start = dragStartRef.current;
      if (!handId || !start) return;

      const el = handRefs.current[handId];
      if (el) el.style.transform = "";

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const gs = gameStateRef.current;
      const overlapped = checkOverlapByRect(handId, dx, dy);

      if (overlapped) {
        if (!samePlayer(handId, overlapped)) {
          if (!isBlockingPreview(pendingSplitRef.current, gs.players.player2)) {
            const sourceVal = getDisplayed(handId);
            const overlappedVal = getHandValue(gs, overlapped);
            if (sourceVal > 0 && overlappedVal !== 0) {
              onExecuteAddRef.current(handId, overlapped, pendingSplitRef.current);
            }
          }
        } else {
          const dVal = getDisplayed(handId);
          const oVal = getDisplayed(overlapped);
          if (oVal < 4) {
            const [, side] = parseHandId(handId);
            const isLeft = side === "leftHand";
            onSetPendingSplitRef.current({
              newLeft: isLeft ? dVal - 1 : oVal + 1,
              newRight: isLeft ? oVal + 1 : dVal - 1,
            });
          }
        }
      }

      draggingRef.current = null;
      dragStartRef.current = null;
      lastOverlapRef.current = null;
      cachedRectsRef.current = {};
      draggedInitialRectRef.current = null;
      setDraggingHandId(null);
      setPreview(null);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [checkOverlapByRect, computePreview]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, handId: HandId) => {
      if (!canDragHand(handId)) return;
      e.preventDefault();

      // Cache rects of all hands once — the only getBoundingClientRect calls per drag.
      // Dragged element's rect is used as the moving collider; all others are static targets.
      const rects: Partial<Record<HandId, DOMRect>> = {};
      for (const id of ALL_HAND_IDS) {
        const el = handRefs.current[id];
        if (el) rects[id] = el.getBoundingClientRect();
      }
      cachedRectsRef.current = rects;
      draggedInitialRectRef.current = rects[handId] ?? null;

      draggingRef.current = handId;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      lastOverlapRef.current = null;
      setDraggingHandId(handId);
    },
    [canDragHand]
  );

  return { handRefs, draggingHandId, preview, canDragHand, handlePointerDown };
}
