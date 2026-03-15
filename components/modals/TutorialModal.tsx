"use client";

import Image from "next/image";

interface TutorialModalProps {
  onClose: () => void;
}

export default function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <div className="popup-overlay">
      <div className="info-content">
        <div className="info-header">
          <h3>How to Play Chopsticks</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="tutorial-content">
          <p><strong>On your turn, you can either:</strong></p>
          <p>
            <strong>Add</strong>: Tap one of your hands on an opponent&apos;s hand to add fingers.
            If the opponent&apos;s hand reaches 5 fingers, that hand is out.
          </p>
          {/* <div className="gif-wrapper">
            <Image src="/gifs/add.gif" alt="Add Tutorial" width={200} height={150} unoptimized />
          </div> */}
          <p>
            <strong>Split</strong>: Redistribute fingers between your hands.
          </p>
          {/* <div className="gif-wrapper">
            <Image src="/gifs/split.gif" alt="Split Tutorial" width={200} height={150} unoptimized />
          </div> */}
          <p><strong>Winning:</strong> You win if your opponent has both hands &quot;out.&quot;</p>
        </div>
      </div>
    </div>
  );
}
