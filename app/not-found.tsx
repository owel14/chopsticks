import Link from "next/link";

export default function NotFound() {
  return (
    <main className="game-container">
      <div className="popup-overlay" style={{ position: "relative", background: "none", backdropFilter: "none" }}>
        <div className="game-mode-popup">
          <h1>Page not found</h1>
          <p style={{ margin: "0 0 20px", color: "var(--text-muted)", textAlign: "center" }}>
            That page or room code doesn&apos;t exist.
          </p>
          <Link href="/" className="not-found-link">
            Back to the game
          </Link>
        </div>
      </div>
    </main>
  );
}
