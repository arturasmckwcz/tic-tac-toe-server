import {
  Action,
  GameMoveForward,
  GameNewJoin,
  Message,
  Payload,
  Player,
} from 'tic-tac-toe-message';
import {
  gameCreate,
  gameDelete,
  gameGetOpponent,
  gameGetUsers,
  gameIdsAvailable,
  gameJoin,
  gameMakeMove,
} from '../game';
import { User, broadcast } from '../user';

function isValueValid<E extends Action | Player>(enumObject: Object, value: E) {
  return Object.entries(enumObject)
    .map(([_, value]) => value)
    .includes(value);
}

export function parseMessage(data: string): Message<Payload> | null {
  // 1. does it parse into an obj?
  // 2. has parsed obj required structure, i.e. {action:Action; payload:Payload}?
  // 3. is action value valid?
  // 4. does payload structure match action value?
  // 5. return message if it's okay otherwise null
  try {
    const message = JSON.parse(data);

    const action = message.action;
    if (!isValueValid<Action>(Action, action)) return null;

    const payload = message.payload;
    switch (action) {
      case Action.NEW_GAME:
        if (
          payload.hasOwnProperty('player') &&
          isValueValid<Player>(Player, payload.player)
        )
          return message;
        break;
      case Action.JOIN_GAME:
        if (payload.hasOwnProperty('gameId')) return message;
        break;
      case Action.MOVE:
        if (
          payload.hasOwnProperty('gameId') &&
          payload.hasOwnProperty('move') &&
          payload?.move.hasOwnProperty('h') &&
          payload?.move.hasOwnProperty('v')
        )
          return message;
        break;
      case Action.GAMES_AVAILABLE:
      case Action.KEEP_ALIVE:
        return message;
      default:
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function actionGamesForUsr(user: User) {
  user.connection.send(
    JSON.stringify({
      action: Action.GAMES_AVAILABLE_RESPONSE,
      payload: {
        games: gameIdsAvailable(user.id),
      },
    }),
  );
}

export function actionJoinGame(
  user: User,
  message: Message<GameNewJoin & { gameId: string }>,
) {
  const payload = message.payload;
  const player = gameJoin(payload.gameId, user, payload.player);
  user.connection.send(
    JSON.stringify({
      action: Action.JOIN_GAME_RESPONSE,
      payload: { gameId: payload.gameId, player },
    }),
  );
  if (player) {
    const opponent = gameGetOpponent(payload.gameId, user.id);
    if (opponent)
      opponent.connection.send(
        JSON.stringify({
          action: Action.MOVE_FORWARD,
          payload: { gameId: payload.gameId, move: null },
        }),
      );
  }
}

export function actionNewGame(user: User, message: Message<GameNewJoin>) {
  const payloadNewGame = message.payload;
  user.connection.send(
    JSON.stringify({
      action: Action.NEW_GAME_RESPONSE,
      payload: {
        gameId: gameCreate({ player: payloadNewGame.player, user }),
        player: payloadNewGame.player,
      },
    }),
  );
}

export function actionMove(user: User, message: Message<GameMoveForward>) {
  const payload = message.payload;
  if (payload) {
    const gameId = payload.gameId;
    const move = payload.move;
    if (!gameId || !move) return;
    const users = gameGetUsers(gameId);
    const { isGameOver, result } = gameMakeMove(gameId, user.id, move);
    if (!result) {
      user.connection.send(
        JSON.stringify({
          action: Action.MOVE_RESPONSE,
          payload: { okay: false },
        }),
      );
      return;
    }
    if (isGameOver) {
      broadcast(
        JSON.stringify({ action: Action.GAME_OVER, payload: result }),
        users,
      );
      gameDelete(payload.gameId);
    } else {
      user.connection.send(
        JSON.stringify({
          action: Action.MOVE_RESPONSE,
          payload: { okay: true },
        }),
      );
      const opponent = gameGetOpponent(gameId, user.id);
      if (opponent)
        opponent.connection.send(
          JSON.stringify({
            action: Action.MOVE_FORWARD,
            payload: { gameId, move },
          }),
        );
    }
  }
}
