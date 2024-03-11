import { v4 as uuid } from 'uuid';
import WebSocket from 'ws';
import { createLogger } from '../ws/utils';

const userLog = createLogger('User constructor').info;
export class User {
  constructor(name: string, connection: WebSocket) {
    this.id = uuid();
    this.name = name;
    this.connection = connection;
    this.keepAlive = Date.now();
    if (process.env.NODE_ENV === 'develop') {
      userLog({ ...this, connection: {} });
    }
  }

  id: string;
  name: string;
  keepAlive: number;
  connection: WebSocket;
}
