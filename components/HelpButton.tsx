"use client";

import { useState } from "react";
import TutorialModal from "@/components/modals/TutorialModal";

export default function HelpButton() {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <>
      <button
        id="info-button"
        onClick={() => setShowTutorial(true)}
        aria-label="How to play"
      >
        ?
      </button>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
    </>
  );
}
