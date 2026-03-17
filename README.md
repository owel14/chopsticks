# Chopsticks

A browser implementation of the hand game [Chopsticks](https://en.wikipedia.org/wiki/Chopsticks_(hand_game)). Play against an AI opponent or challenge a friend online in real time.

## How to Play

Each player starts with one finger raised on each hand. On your turn you can:

- **Attack**  drag one of your hands onto an opponent's hand. Their finger count increases by yours. A hand that reaches exactly 5 is eliminated.
- **Split**  drag one of your own hands onto your other hand to preview a redistribution, then click **Split** to confirm. You cannot split into the same arrangement you already have.

Eliminate both of your opponent's hands to win.

## Features

- Single-player vs AI with three difficulty levels
- Online multiplayer via shareable room codes
- Drag-and-drop controls with live move preview

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5 |
| Multiplayer server | .NET 9, ASP.NET Core, SignalR |
| Tests | Vitest |

## Getting Started

### Prerequisites

- Node.js 18+
- .NET 9 SDK (multiplayer only)

### Single-player

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Multiplayer (local)

Start the SignalR server in one terminal:

```bash
cd server && dotnet run
```

In another terminal, set the server URL and start the frontend:

```bash
# .env.local
NEXT_PUBLIC_SERVER_URL=http://localhost:5000
```

```bash
npm run dev
```

The server runs on port 5000 by default. The frontend falls back to `http://localhost:5000` if `NEXT_PUBLIC_SERVER_URL` is not set.


## Project Structure

```
app/                  # Next.js App Router pages
components/           # React components (GameBoard, Hand, modals, online/)
lib/
  ai/                 # Bot strategy (bots.ts) and minimax (minimax.ts)
  game/               # Pure game logic, types, constants, tests
  hooks/              # useGame, useDragDrop, useOnlineGame
server/               # .NET SignalR server (GameHub, RoomManager, GameLogic)
```
