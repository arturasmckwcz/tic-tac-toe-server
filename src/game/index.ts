import { v4 as uuid } from 'uuid';

import type { Move } from '../types';
import { User } from '../user';

enum Player {
  X = 'x',
  O = 'o',
}
const games: Game[] = [];

export function gameCreate(xPlayer?: User) {
  const game = new Game(xPlayer);
  games.push(game);
  return game.id;
}

export function gameJoinAsX(id: string, user: User) {
  const { game } = gameGetById(id);
  if (game) {
    game.setPlayer(Player.X, user);
  }

  return game?.id;
}

export function gameJoinAsO(id: string, user: User) {
  const { game } = gameGetById(id);
  if (game) {
    game.setPlayer(Player.O, user);
  }

  return game?.id;
}

export function gameIdsAll() {
  return { games: games.map(({ id }) => id) };
}

export function gameIdsNoO() {
  return games.filter(({ o }) => !o).map(({ id }) => id);
}

function gameGetById(gameId: string) {
  const result: { game?: Game; idx?: number } = {};
  result.game = games.find(({ id }, idx) => {
    if (id === gameId) {
      result.idx = idx;
      return true;
    } else return false;
  });
  return result;
}

export function gameDelete(gameId: string) {
  const { idx } = gameGetById(gameId);
  if (idx !== undefined) games.splice(idx, 1);
}

export function gameMakeMove(gameId: string, playerId: string, move: Move) {
  const { game } = gameGetById(gameId);
  if (game && game.move(playerId, move)) {
    return game.conclude();
  }
  return { isGameOver: false, result: null };
}

export function gameGetPlayers(gameId: string) {
  const { game } = gameGetById(gameId);
  const players: User[] = [];
  if (game) {
    if (game.x) players.push(game.x);
    if (game.o) players.push(game.o);
    return players;
  }
  return [];
}

export class Game {
  constructor(xPlayer?: User) {
    this.id = uuid();
    this.x = xPlayer || null;
    this.o = null;
    this.moves = [];
    this.boardSize = 3;
  }

  id: string;
  x: User | null;
  o: User | null;
  moves: { player: Player; move: Move }[];
  boardSize: number;

  setPlayer(player: Player, user: User) {
    if (player === Player.O) this.o = user;
    if (player === Player.X) this.x = user;
    console.log('DEBUG:Game:setPlayer:players:', [this.x?.id, this.o?.id]);
  }

  isReady() {
    return this.x && this.o;
  }

  playerFromUser(userId: string) {
    return userId === this.x?.id
      ? Player.X
      : userId === this.o?.id
      ? Player.O
      : null;
  }

  next(): Player {
    return this.moves.length
      ? this.moves.at(-1)?.player === Player.X
        ? Player.O
        : Player.X
      : Player.X;
  }

  isEmpty(move: Move) {
    return !this.moves.some(
      ({ move: { h, v } }) => h === move.h && v === move.v,
    );
  }

  isMoveValid(move: Move) {
    return (
      move.h >= 0 &&
      move.h < this.boardSize &&
      move.v >= 0 &&
      move.v < this.boardSize
    );
  }

  move(playerId: string, move: Move) {
    if (
      this.isReady() &&
      this.isMoveValid(move) &&
      this.playerFromUser(playerId) === this.next() &&
      this.isEmpty(move)
    ) {
      console.log('DEBUG:Game:move:playerId,players:', playerId, [
        this.x?.id,
        this.o?.id,
      ]);
      let player: Player;
      if (playerId === this.x?.id) player = Player.X;
      else if (playerId === this.o?.id) player = Player.O;
      else return null;

      return this.moves.push({ player, move });
    }
    return null;
  }

  conclude(): { isGameOver: boolean; result: Player | 'tie' | null } {
    const board: Array<Array<Player | ''>> = Array.from(
      { length: this.boardSize },
      () => Array(this.boardSize).fill(''),
    );
    this.moves.forEach(({ player, move }) => {
      board[move.v][move.h] = player;
    });
    console.log('DEBUG:Game:conclude:board:\n', board);

    const lineCheck = (line: string[]) =>
      line.every(item => item === line[0] && item !== '');

    const columns = () => {
      const result: Array<Array<Player | ''>> = [[], [], []];
      for (let i = 0; i < this.boardSize; i++) {
        for (let j = 0; j < this.boardSize; j++) {
          result[i].push(board[j][i]);
        }
      }
      return result;
    };

    const diagonals = () => {
      const result: Array<Array<Player | ''>> = [[], []];
      for (let i = 0; i < this.boardSize; i++) {
        result[0].push(board[i][i]);
        result[1].push(board[this.boardSize - 1 - i][i]);
      }
      return result;
    };

    for (const horizontal of board) {
      if (lineCheck(horizontal))
        return { isGameOver: true, result: horizontal[0] as Player };
    }

    for (const vertical of columns()) {
      if (lineCheck(vertical))
        return { isGameOver: true, result: vertical[0] as Player };
    }

    for (const diagonal of diagonals()) {
      if (lineCheck(diagonal))
        return { isGameOver: true, result: diagonal[0] as Player };
    }

    if (board.flat().every(item => item !== ''))
      return { isGameOver: true, result: 'tie' };

    return { isGameOver: false, result: 'tie' };
  }
}
