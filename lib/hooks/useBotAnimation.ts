"use client";

import { useEffect } from "react";
import type { HandId, AnimatingMove } from "../game/types";
import { ADD_ANIMATION_MS, SPLIT_ANIMATION_MS } from "../game/constants";

function center(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function useBotAnimation(
  animatingMove: AnimatingMove,
  handRefs: React.MutableRefObject<Partial<Record<HandId, HTMLDivElement | null>>>
) {
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
  }, [animatingMove, handRefs]);
}
