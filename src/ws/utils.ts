import { Action, Message, Move, Player } from 'tic-tac-toe-message';
import {
  gameCreate,
  gameDelete,
  gameGetOpponent,
  gameGetUsers,
  gameIdsAvailable,
  gameJoin,
  gameMakeMove,
} from '../game';
import { User } from '../user';

interface GameNewJoin {
  gameId: string;
  player: Player;
}

function isValueValid<E extends Action | Player>(enumObject: Object, value: E) {
  return Object.entries(enumObject)
    .map(([_, value]) => value)
    .includes(value);
}

export function parseMessage(data: string): Message | null {
  // 1. does it parse into an obj?
  // 2. has parsed obj required structure, i.e. {action:Action; payload:Payload}?
  // 3. is action value valid?
  // 4. does payload structure match action value?
  // 5. return message if it's okay otherwise null
  try {
    const message = JSON.parse(data);

    const action = message.action;
    if (!isValueValid(Action, action)) return null;

    let isPayloadOk = false;
    const payload = message.payload;
    switch (action) {
      case Action.NEW_GAME:
        if (payload?.player && isValueValid(Player, payload?.player))
          isPayloadOk = true;
        break;
      case Action.JOIN_GAME:
        if (payload?.gameId) isPayloadOk = true;
        break;
      case Action.MOVE:
        if (
          payload.hasOwnProperty('gameId') &&
          payload.hasOwnProperty('move') &&
          payload?.move.hasOwnProperty('h') &&
          payload?.move.hasOwnProperty('v')
        )
          isPayloadOk = true;
        break;
      case Action.GAMES_FOR_USR:
      case Action.KEEP_ALIVE:
        isPayloadOk = true;
        break;
      default:
        break;
    }
    return isPayloadOk ? message : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function actionGamesForUsr(user: User) {
  user.connection.send(
    JSON.stringify({
      action: Action.GAMES_AVAILABLE,
      payload: {
        games: gameIdsAvailable(user.id),
      },
    }),
  );
}

export function actionJoinGame(user: User, message: Message) {
  const payloadJoinGame = message.payload as GameNewJoin;
  const player = gameJoin(payloadJoinGame.gameId, user, payloadJoinGame.player);
  user.connection.send(
    JSON.stringify({
      action: Action.JOIN_GAME_RESPONSE,
      payload: { gameId: payloadJoinGame.gameId, player },
    }),
  );
  if (player) {
    const opponent = gameGetOpponent(payloadJoinGame.gameId, user.id);
    if (opponent)
      opponent.connection.send(
        JSON.stringify({
          action: Action.MOVE_FORWARD,
          payload: { gameId: payloadJoinGame.gameId, move: null },
        }),
      );
  }
}

export function actionNewGame(user: User, message: Message) {
  const payloadNewGame = message.payload as GameNewJoin;
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

export function actionMove(user: User, message: Message) {
  const payloadMove = message.payload as { gameId: string; move: Move | null };
  if (payloadMove) {
    const gameId = payloadMove.gameId;
    const move = payloadMove.move;
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
      gameDelete(payloadMove.gameId);
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
