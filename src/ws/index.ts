import http from 'http';
import { WebSocketServer } from 'ws';

import { Action } from 'tic-tac-toe-message';
import { keepAliveTimeout, maxUsers } from '../app.config';
import { gamesDeleteByUser } from '../game';
import { User } from '../user';
import {
  actionGamesForUsr,
  actionJoinGame,
  actionMove,
  actionNewGame,
  broadcast,
  createLogger,
  getUserFromRequest,
  parseMessage,
} from './utils';

const users: User[] = [];

const logOut = createLogger('Outgoing message:').info;
const logIn = createLogger('Incoming message:').info;

export function startWsServer(
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>,
) {
  const wsServer = new WebSocketServer({ server });

  setInterval(() => {
    broadcast(JSON.stringify({ action: Action.KEEP_ALIVE }), users);
    const keepAliveLastTime = Date.now() - keepAliveTimeout;
    const deadUsers = users.filter(({ id, keepAlive }) => {
      return keepAlive < keepAliveLastTime;
    });
    deadUsers.forEach(({ id: deadId, connection }) => {
      connection.close(4000, 'keep alive timed out');
      gamesDeleteByUser(deadId);
      const idx = users.findIndex(({ id }) => id === deadId);
      if (idx >= 0) users.splice(idx, 1);
    });
  }, keepAliveTimeout);

  wsServer.on('connection', (connection, request) => {
    // ws://localhost:4000?name=Johnny&userId=blah-blah-blah
    const { name, userId } = getUserFromRequest(request);
    const userIdx = users.findIndex(({ id }) => userId === id);
    let user: User;
    let idx: number = -1;

    if (userIdx >= 0) {
      user = users[userIdx];
      user.keepAlive = Date.now();
    } else {
      user = new User(name as string, connection);
      if (users.length >= maxUsers) {
        // TODO: revert with an error instead of connect/close
        user.connection.close(
          4001,
          'number of connections exceeded the limit, please try later.',
        );
      } else {
        idx = users.push(user) - 1;
      }
    }
    // log outgoing traffic
    if (process.env.NODE_ENV === 'develop') {
      const send = connection.send;
      connection.send = function (...args) {
        logOut(user.name, args[0].toString());
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
      logIn(user.name, message);

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
      gamesDeleteByUser(user.id);
      users.splice(idx, 1);
    });
  });
}
