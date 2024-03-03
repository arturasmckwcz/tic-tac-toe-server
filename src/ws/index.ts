import http from 'http';
import { WebSocketServer } from 'ws';

import { Action } from '../types';
import { User } from '../user';
import { broadcast, getUserName, parseMessage } from './utils';
import {
  gameCreate,
  gameGetPlayers,
  gameJoinAsO,
  gameIdsNoO,
  gameMakeMove,
  gameDelete,
} from '../game';

const users: User[] = [];

export function startWsServer(
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>,
) {
  const wsServer = new WebSocketServer({ server });

  wsServer.on('connection', (connection, request) => {
    // ws://localhost:4000?name=Johnny
    const user = new User(getUserName(request), connection);
    const idx = users.push(user) - 1;

    console.log(
      'DEBUG:ws:users:',
      users.map(({ id, name }) => ({ id, name })),
    );

    connection.on('message', data => {
      const message = parseMessage(data.toString());
      console.log('DEBUG:ws:user,message:', user.id, message);
      if (message) {
        switch (message.action) {
          case Action.GAMES_FOR_USR:
            user.connection.send(
              JSON.stringify({
                action: Action.GAMES_AVAILABLE,
                payload: { gameIds: gameIdsNoO() },
              }),
            );
            break;
          case Action.JOIN_GAME:
            user.connection.send(
              JSON.stringify({
                action: Action.JOIN_GAME_RESPONSE,
                payload: { gameId: gameJoinAsO(message?.payload.gameId, user) },
              }),
            );
            break;
          case Action.NEW_GAME:
            user.connection.send(
              JSON.stringify({
                action: Action.JOIN_GAME_RESPONSE,
                payload: { gameId: gameCreate(user) },
              }),
            );
            break;
          case Action.MOVE:
            console.log('DEBUG:ws:MOVE:payload', message.payload);
            const players = gameGetPlayers(message.payload?.gameId);
            if (message.payload) {
              const { isGameOver, result } = gameMakeMove(
                message.payload?.gameId,
                user.id,
                message.payload?.move,
              );
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
                  players,
                );
                gameDelete(message.payload?.gameId);
              } else {
                user.connection.send(
                  JSON.stringify({
                    action: Action.MOVE_RESPONSE,
                    payload: { okay: true },
                  }),
                );
              }
            }
            break;
          default:
            return;
        }
      }
    });

    connection.on('close', () => {
      users.splice(idx, 1);
    });
  });
}
