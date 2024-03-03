import http from 'http';
import url from 'url';
import { User } from '../user';

export function getUserName(request: http.IncomingMessage) {
  const name = url.parse(request.url || '', true).query?.name;
  return typeof name === 'string' ? name : '';
}

export function parseMessage(data: string) {
  try {
    const message = JSON.parse(data);
    if (!message.action) {
      return null;
    }
    return message;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function broadcast(message: string, users: User[]) {
  users.forEach(({ connection }) => {
    if (connection.OPEN) {
      connection.send(message);
    }
  });
}
