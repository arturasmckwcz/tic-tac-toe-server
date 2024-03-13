import http from 'http';
import { Action } from 'tic-tac-toe-message';
import url from 'url';
import { v4 as uuid } from 'uuid';
import WebSocket from 'ws';

import { keepAliveTimeout, maxUsers } from '../app.config';
import { gamesDeleteByUser } from '../game';
import { createLogger } from '../utils';

const users: User[] = [];

export const logUser = createLogger('User').info;

export function userGetFromRequest(
  connection: WebSocket,
  request: http.IncomingMessage,
) {
  const name = url.parse(request.url || '', true).query?.name || 'noname';
  const userId = url.parse(request.url || '', true).query?.userId || '';
  const userIdx = users.findIndex(({ id }) => userId === id);
  let user: User;

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
      users.push(user);
    }
  }
  return user;
}

export function broadcast(message: string, users: User[]) {
  users.forEach(({ connection }) => {
    if (connection.OPEN) {
      connection.send(message);
    }
  });
}

export function userDelete(userId: string) {
  const idx = users.findIndex(({ id }) => id === userId);
  if (idx >= 0) {
    users.splice(idx, 1);
  }
}

export function usersStartHartBeat() {
  setInterval(() => {
    broadcast(JSON.stringify({ action: Action.KEEP_ALIVE }), users);
    console.log(
      'DEBUG:user:k-a:users',
      users.map(({ name, id }) => ({ name, id })),
    );
    const keepAliveLastTime = Date.now() - keepAliveTimeout;
    const usersDead = users.filter(({ keepAlive }) => {
      return keepAlive < keepAliveLastTime;
    });
    console.log(
      'DEBUG:user:k-a:keepAliveLastTime:deadUsers',
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
}

export class User {
  constructor(name: string, connection: WebSocket) {
    this.id = uuid();
    this.name = name;
    this.connection = connection;
    this.keepAlive = Date.now();
    if (process.env.NODE_ENV === 'develop') {
      logUser('constructor', { ...this, connection: {} });
    }
  }

  id: string;
  name: string;
  keepAlive: number;
  connection: WebSocket;
}
