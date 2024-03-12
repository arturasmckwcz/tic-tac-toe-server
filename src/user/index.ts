import { v4 as uuid } from 'uuid';
import WebSocket from 'ws';
import { createLogger } from '../ws/utils';

export const logUser = createLogger('User').info;
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
