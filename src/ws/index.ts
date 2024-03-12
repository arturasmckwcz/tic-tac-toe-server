import http from 'http';
import { WebSocketServer } from 'ws';

import { Action } from 'tic-tac-toe-message';
import { keepAliveTimeout, maxUsers } from '../app.config';
import { gamesDeleteByUser } from '../game';
import { User, logUser } from '../user';
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

const logMsg = createLogger('Message').info;

function userDelete(userId: string) {
  const idx = users.findIndex(({ id }) => id === userId);
  if (idx >= 0) {
    users.splice(idx, 1);
  }
}

export function startWsServer(
  server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>,
) {
  const wsServer = new WebSocketServer({ server });

  setInterval(() => {
    broadcast(JSON.stringify({ action: Action.KEEP_ALIVE }), users);
    console.log(
      'DEBUG:ws:k-a:users',
      users.map(({ name, id }) => ({ name, id })),
    );
    const keepAliveLastTime = Date.now() - keepAliveTimeout;
    const usersDead = users.filter(({ keepAlive }) => {
      return keepAlive < keepAliveLastTime;
    });
    console.log(
      'DEBUG:ws:k-a:keepAliveLastTime:deadUsers',
      keepAliveLastTime,
      usersDead.map(({ name, id }) => ({ name, id })),
    );
    usersDead.forEach(userDead => {
      userDead.connection.close(4000, 'keep alive timed out');
      logUser('kick out:', { ...userDead, connection: undefined });
      gamesDeleteByUser(userDead.id);
      userDelete(userDead.id);
    });
  }, keepAliveTimeout);

  wsServer.on('connection', (connection, request) => {
    // ws://localhost:4000?name=Johnny&userId=blah-blah-blah
    const { name, userId } = getUserFromRequest(request);
    const userIdx = users.findIndex(({ id }) => userId === id);
    let user: User; // TODO: move user state to User model
    let idx: number = -1; // TODO: move index from state to calc in an util

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
