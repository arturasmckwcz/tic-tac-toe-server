import http from 'http';
import { Action } from 'tic-tac-toe-message';
import { WebSocketServer } from 'ws';

import { gamesDeleteByUser } from '../game';
import { userDelete, userGetFromRequest, usersStartHartBeat } from '../user';
import { createLogger } from '../utils';
import {
  actionGamesForUsr,
  actionJoinGame,
  actionMove,
  actionNewGame,
  parseMessage,
} from './utils';

const logMsg = createLogger('Message').info;

export function startWsServer(
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>,
) {
  const wsServer = new WebSocketServer({ server });

  usersStartHartBeat();

  // ws://localhost:4000?name=John&userId=blah-blah-blah
  wsServer.on('connection', (connection, request) => {
    const user = userGetFromRequest(connection, request);

    // log outgoing traffic
    if (process.env.NODE_ENV === 'develop') {
      const send = connection.send;
      connection.send = function (...args) {
        logMsg('outgoing', user.name, args[0].toString());
        return send.apply(this, args as any);
      };
    }

    connection.send(
      JSON.stringify({
        action: Action.CONNECTION,
        payload: { userId: user.id },
      }),
    );

    connection.on('message', data => {
      const message = parseMessage(data.toString());
      if (process.env.NODE_ENV === 'develop')
        logMsg('incoming', user.name, message);

      if (message) {
        switch (message.action) {
          case Action.GAMES_FOR_USR:
            actionGamesForUsr(user);
            break;
          case Action.JOIN_GAME:
            actionJoinGame(user, message);
            break;
          case Action.NEW_GAME:
            actionNewGame(user, message);
            break;
          case Action.MOVE:
            actionMove(user, message);
            break;
          case Action.KEEP_ALIVE:
            user.keepAlive = Date.now();
            break;
          default:
            return;
        }
      }
    });

    connection.on('close', () => {
      console.log('DEBUG:ws:close:user:', { ...user, connection: undefined });
      gamesDeleteByUser(user.id);
      userDelete(user.id);
    });
  });
}
