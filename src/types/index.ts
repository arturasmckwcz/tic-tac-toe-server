export enum Action {
  NEW_GAME = 'new-game',
  NEW_GAME_RESPONSE = 'new-game-response',
  JOIN_GAME = 'join-game',
  JOIN_GAME_RESPONSE = 'join-game-response',
  MOVE = 'move',
  MOVE_RESPONSE = 'move-response',
  GAME_OVER = 'game-over',
  GAMES_FOR_USR = 'games-for-usr',
  GAMES_AVAILABLE = 'games-available',
}

export interface Move {
  v: number;
  h: number;
}

export type Payload =
  | { gameId: string; move: Move }
  | { gameIds: string[] }
  | { gameId: string }
  | undefined;

export interface Message {
  action: Action;
  payload: Payload;
}
