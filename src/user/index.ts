import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';

export class User {
  constructor(name: string, connection: WebSocket) {
    this.id = uuid();
    this.name = name;
    this.connection = connection;
  }

  id: string;
  name: string;
  connection: WebSocket;

  joinGame() {}

  newGame() {}

  makeMove() {}
}
