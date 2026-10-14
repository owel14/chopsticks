/**
 * Server-rendered, crawlable description of the game that sits below the fold.
 * The playable UI is client-side, so without this the page has almost no text
 * for search engines to index. Keep it in sync with lib/game/gameLogic.ts.
 */
export default function GameInfo() {
  return (
    <section className="seo-content" aria-labelledby="how-to-play-heading">
      <h2 id="how-to-play-heading">How to play Chopsticks</h2>
      <p>
        Chopsticks is a two-player hand game. Every player starts with{" "}
        <strong>one finger up on each hand</strong>, and players take turns
        doing exactly one of two things: attacking or splitting. The goal is to
        knock out both of your opponent&apos;s hands.
      </p>

      <h3>Attack</h3>
      <p>
        Drag one of your hands onto one of your opponent&apos;s hands.
        Your finger count is added to theirs. If their hand reaches{" "}
        <strong>5 or more</strong>, it is knocked out and can no longer be used
        or attacked.
      </p>

      <h3>Split</h3>
      <p>
        Instead of attacking, you can redistribute your own fingers between your
        two hands, for example turning a 3 and a 1 into a 2 and a 2. A split
        must change your arrangement, and no hand can hold more than 4 fingers.
        If one of your hands is out, a split can bring it back into play as long
        as you have at least 2 fingers left in total.
      </p>

      <h3>Winning</h3>
      <p>
        The first player to knock out both of the other player&apos;s hands
        wins.
      </p>

      <h2>Play Chopsticks free in your browser</h2>
      <ul>
        <li>
          <strong>Play against the computer.</strong> Pick easy, medium or hard.
          Easy plays mostly random moves, medium mixes random moves with
          look-ahead search, and hard searches many moves ahead.
        </li>
        <li>
          <strong>Play online with a friend.</strong> Create a room, share the
          6-character room code or link, and play in real time.
        </li>
        <li>
          <strong>No download or account.</strong> It works on desktop and
          mobile with mouse or touch drag-and-drop.
        </li>
      </ul>

      <h2>Chopsticks FAQ</h2>
      <h3>Is Chopsticks free to play here?</h3>
      <p>
        Yes. There is nothing to install and no sign-up, just choose a
        difficulty or enter a room code.
      </p>
      <h3>Can an eliminated hand come back?</h3>
      <p>
        Yes. With a split you can move fingers from your remaining hand onto
        the knocked-out one, provided you have at least 2 fingers in total.
      </p>
      <h3>Can I attack my own hand?</h3>
      <p>
        No. Dragging a hand onto your own other hand starts a split instead;
        attacks only target your opponent.
      </p>
    </section>
  );
}
