"use client";

import Image from "next/image";
import { forwardRef } from "react";
import type { HandId } from "@/lib/game/types";

interface HandProps {
  handId: HandId;
  value: number;
  previewValue?: number | null;
  isZero: boolean;
  canDrag: boolean;
  isDragging: boolean;
  isAnimating?: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
}

const IMG_TRANSFORMS: Record<HandId, string> = {
  topLeft:     "scaleX(-1) rotate(180deg)",
  topRight:    "rotate(180deg)",
  bottomLeft:  "none",
  bottomRight: "scaleX(-1)",
};

const Hand = forwardRef<HTMLDivElement, HandProps>(function Hand(
  { handId, value, previewValue, isZero, canDrag, isDragging, isAnimating, onPointerDown },
  ref
) {
  const displayValue =
    previewValue !== null && previewValue !== undefined ? previewValue : value;
  const imgValue = Math.max(0, Math.min(4, displayValue >= 5 ? 0 : displayValue));

  const classes = ["hand", isZero ? "non-draggable" : "", isDragging ? "dragging" : "", isAnimating ? "animating" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      id={handId}
      className={classes}
      style={{
        cursor: isDragging ? "grabbing" : canDrag && !isZero ? "grab" : "default",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={canDrag && !isZero ? onPointerDown : undefined}
    >
      <Image
        src={`/img/${imgValue}.png`}
        alt={`${handId} showing ${imgValue} fingers`}
        width={80}
        height={80}
        style={{ transform: IMG_TRANSFORMS[handId], width: "100%", height: "auto" }}
        draggable={false}
        priority
      />
    </div>
  );
});

export default Hand;
