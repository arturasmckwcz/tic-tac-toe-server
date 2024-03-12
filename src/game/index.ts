import { v4 as uuid } from 'uuid';

import { Move, Player } from 'tic-tac-toe-message';
import { User } from '../user';
import { createLogger } from '../ws/utils';

export interface GamesAvailable {
  gameId: string;
  player: Player | undefined;
}

const games: Game[] = [];

const logGame = createLogger('Game').info;

function getRandomPlayer() {
  return Math.round(Math.random()) ? Player.X : Player.O;
}

export function gameCreate({ player, user }: { player?: Player; user?: User }) {
  const game = new Game(player, user);
  games.push(game);
  return game.id;
}

export function gameJoin(gameId: string, user: User, player?: Player) {
  const { game } = gameGetById(gameId);
  if (game) {
    // 1. if the player is defined and a corresponding user is not assigned yet set the user as the player
    // 2. else return null
    // 3. if the player is undefined then
    // 4. -- if no user assigned yet set the user as random player
    // 5. -- if only one user is set then set the user as an opponent
    // 6. -- if both users are set already then return null
    if (player) {
      if (!game[player]) {
        game.setPlayer(player, user);
        return player;
      } else {
        return null;
      }
    } else {
      const countUser = gameGetUsers(gameId).length;
      switch (countUser) {
        case 0:
          const randomPlayer = getRandomPlayer();
          game.setPlayer(randomPlayer, user);
          return randomPlayer;
        case 1:
          if (game.x) {
            game.setPlayer(Player.O, user);
            return Player.O;
          } else {
            game.setPlayer(Player.X, user);
            return Player.X;
          }
        case 2:
          return null;
      }
    }
  }

  return null;
}

export function gameIdsAvailable(userId: string): GamesAvailable[] {
  // 1. not both users assigned, i.e. game's available to join in
  // 2. provided userId doesn't assigned to one of them
  return games
    .filter(({ o, x }) => o?.id !== userId && x?.id !== userId && (!o || !x))
    .map(({ id, o, x }) => ({
      gameId: id,
      player: o ? Player.X : x ? Player.O : undefined,
    }));
}

function gameGetById(gameId: string | null) {
  const idx = games.findIndex(({ id }) => id === gameId);
  return idx !== -1 ? { game: games[idx], idx } : { game: null, idx: null };
}

export function gamesDeleteByUser(userId: string) {
  games
    .filter(({ o, x }) => o?.id === userId || x?.id === userId)
    .forEach(({ id }) => gameDelete(id));
}

export function gameDelete(gameId: string) {
  const { idx } = gameGetById(gameId);
  if (idx !== null) games.splice(idx, 1);
}

export function gameMakeMove(gameId: string, playerId: string, move: Move) {
  const { game } = gameGetById(gameId);
  if (game && game.move(playerId, move)) {
    return game.conclude();
  }
  return { isGameOver: false, result: null };
}

export function gameGetOpponent(gameId: string | null, userId: string) {
  const { game } = gameGetById(gameId);
  let result: User | null = null;
  if (game)
    if (userId === game.x?.id) result = game.o;
    else if (userId === game.o?.id) result = game.x;
  return result; // TODO: it returns o if both users are null
}

export function gameGetUsers(gameId: string): User[] {
  const { game } = gameGetById(gameId);
  if (game) {
    return game.getUsers().filter(Boolean) as User[];
  }
  return [];
}

export class Game {
  constructor(player?: Player, user?: User) {
    this.id = uuid();
    this.x = player === Player.X && user ? user : null;
    this.o = player === Player.O && user ? user : null;
    this.moves = [];
    this.boardSize = 3;
    this._isReady = false;
    if (process.env.NODE_ENV === 'develop') {
      logGame('constructor', { ...this, o: this.o?.name, x: this.x?.name });
    }
  }

  id: string;
  x: User | null;
  o: User | null;
  moves: { player: Player; move: Move }[];
  boardSize: number;
  _isReady: boolean;

  setPlayer(player: Player, user: User) {
    if (!this.o && player === Player.O) this.o = user;
    if (!this.x && player === Player.X) this.x = user;
    this._isReady = !!this.x && !!this.o;
  }

  get isReady() {
    return this._isReady;
  }

  getUsers() {
    return [this.x, this.o];
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

  move(userId: string, move: Move) {
    if (
      this._isReady &&
      this.isMoveValid(move) &&
      this.playerFromUser(userId) === this.next() &&
      this.isEmpty(move)
    ) {
      let player: Player;
      if (userId === this.x?.id) player = Player.X;
      else if (userId === this.o?.id) player = Player.O;
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
      if (lineCheck(horizontal)) {
        this._isReady = false;
        return { isGameOver: true, result: horizontal[0] as Player };
      }
    }

    for (const vertical of columns()) {
      if (lineCheck(vertical)) {
        this._isReady = false;
        return { isGameOver: true, result: vertical[0] as Player };
      }
    }

    for (const diagonal of diagonals()) {
      if (lineCheck(diagonal)) {
        this._isReady = false;
        return { isGameOver: true, result: diagonal[0] as Player };
      }
    }

    if (board.flat().every(item => item !== '')) {
      this._isReady = false;
      return { isGameOver: true, result: 'tie' };
    }

    return { isGameOver: false, result: 'tie' };
  }
}
