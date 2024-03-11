# Tic-Tac-Toe WebSocket Server

This project implements a multi-player Tic-Tac-Toe game server using WebSockets, enabling real-time gameplay between users.

## Key Features

- Real-time game:
  - Users experience immediate game updates with opponent moves and game over notifications.
- Game management:
  - Server handles game creation, player moves, and game state updates.
- Persistent game state:
  - Games remain active even if a player disconnects temporarily.
- Heartbeat mechanism:
  - Detects inactive users and cleans up resources for server stability.

## Installation

1. Clone this repository:
   `git clone [URL]`
2. Navigate to the project directory
3. Install dependencies:
   `npm install` or `yarn`
4. Run the server:
   `npm start` or `yarn start`

Server listens on port 3000 by default or on what is defined by environment variable `PORT`.

## Workflow brief

## Using the API

### Connecting to the server

### Messages

License
This project is licensed under the MIT License.
