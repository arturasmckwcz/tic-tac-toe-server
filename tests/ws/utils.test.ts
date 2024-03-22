import {
  Action,
  GameMoveForward,
  GameNewJoin,
  Message,
  Player,
} from 'tic-tac-toe-message';
import * as game from '../../src/game';
import * as usr from '../../src/user';
import { User } from '../../src/user';
import {
  actionGamesForUsr,
  actionJoinGame,
  actionMove,
  actionNewGame,
  isValueValid,
  parseMessage,
} from '../../src/ws/utils';

describe('ws/utils', () => {
  describe('isValueValid()', () => {
    it('should return return true if value belongs to Action enum', () => {
      const value = Action.CONNECTION;
      expect(isValueValid(Action, value)).toBeTruthy();
    });

    it('should return return false if value does not belong to Action enum', () => {
      const value = Action.CONNECTION + 'blah';
      expect(isValueValid(Action, value as Action)).toBeFalsy();
    });

    it('should return return true if value belongs to Player enum', () => {
      const value = Player.O;
      expect(isValueValid(Player, value)).toBeTruthy();
    });

    it('should return return false if value does not belong to Player enum', () => {
      const value = Player.O + 'blah';
      expect(isValueValid(Player, value as Player)).toBeFalsy();
    });
  });

  describe('parseMessage()', () => {
    it('should return null if arg does not parse as object', () => {
      const str = 'any random string';
      const num = 420;
      expect(parseMessage(str)).toBeFalsy();
      expect(parseMessage(num as unknown as string)).toBeFalsy();
    });

    it('should return null if parsed object does not contain action attr', () => {
      const obj = { random: 'random' };
      expect(parseMessage(JSON.stringify(obj))).toBeFalsy();
    });

    it('should return null if action attr has got invalid value', () => {
      const obj = { action: 'random' };
      expect(parseMessage(JSON.stringify(obj))).toBeFalsy();
    });

    it('should return null if action attr has got invalid value', () => {
      const obj = { action: 'random' };
      expect(parseMessage(JSON.stringify(obj))).toBeFalsy();
    });

    it('should return null if action attr has got valid value which is not processed', () => {
      const values = [
        Action.CONNECTION,
        Action.NEW_GAME_RESPONSE,
        Action.JOIN_GAME_RESPONSE,
        Action.MOVE_FORWARD,
        Action.MOVE_RESPONSE,
        Action.GAME_OVER,
        Action.GAMES_AVAILABLE_RESPONSE,
      ];
      values.forEach(action => {
        expect(parseMessage(JSON.stringify({ action }))).toBeFalsy();
      });
    });

    describe('action value is NEW_GAME', () => {
      it('should return null if payload is missing', () => {
        expect(
          parseMessage(JSON.stringify({ action: Action.NEW_GAME })),
        ).toBeFalsy();
      });

      it('should return null if payload has not attr player', () => {
        expect(
          parseMessage(
            JSON.stringify({ action: Action.NEW_GAME, payload: 'random' }),
          ),
        ).toBeFalsy();
      });

      it('should return null if payload has attr player but it has invalid value', () => {
        expect(
          parseMessage(
            JSON.stringify({
              action: Action.NEW_GAME,
              payload: { player: 'random' },
            }),
          ),
        ).toBeFalsy();
      });

      it('should return obj if payload has attr player and it has valid value', () => {
        const obj = {
          action: Action.NEW_GAME,
          payload: { player: Player.X },
        };
        expect(parseMessage(JSON.stringify(obj))).toEqual(obj);
      });
    });

    describe('action value is JOIN_GAME', () => {
      it('should return null if payload is missing', () => {
        expect(
          parseMessage(JSON.stringify({ action: Action.JOIN_GAME })),
        ).toBeFalsy();
      });

      it('should return null if payload has not attr gameId', () => {
        expect(
          parseMessage(
            JSON.stringify({ action: Action.JOIN_GAME, payload: 'random' }),
          ),
        ).toBeFalsy();
      });

      it('should return obj if payload has attr gameId', () => {
        const obj = {
          action: Action.JOIN_GAME,
          payload: { gameId: 'some-id-string' },
        };
        expect(parseMessage(JSON.stringify(obj))).toEqual(obj);
      });
    });

    describe('action value is MOVE', () => {
      it('should return null if payload is missing', () => {
        expect(
          parseMessage(JSON.stringify({ action: Action.MOVE })),
        ).toBeFalsy();
      });

      it('should return null if payload has not attr gameId or move', () => {
        expect(
          parseMessage(
            JSON.stringify({ action: Action.MOVE, payload: 'random' }),
          ),
        ).toBeFalsy();
        expect(
          parseMessage(
            JSON.stringify({
              action: Action.MOVE,
              payload: { gameId: 'some-id-string' },
            }),
          ),
        ).toBeFalsy();
        expect(
          parseMessage(
            JSON.stringify({
              action: Action.MOVE,
              payload: { move: 'some-move-obj' },
            }),
          ),
        ).toBeFalsy();
      });

      it('should return null if payload has attrs gameId and move but it has invalid value', () => {
        expect(
          parseMessage(
            JSON.stringify({
              action: Action.MOVE,
              payload: { gameId: 'some-id-string', move: 'some-move-obj' },
            }),
          ),
        ).toBeFalsy();
      });

      it('should return obj if payload is has attrs gameId and move and it has valid obj', () => {
        const obj = {
          action: Action.MOVE,
          payload: { gameId: 'some-id-string', move: { h: 0, v: 0 } },
        };
        expect(parseMessage(JSON.stringify(obj))).toEqual(obj);
      });
    });

    it('should return parsed obj if action value is GAMES_AVAILABLE', () => {
      const obj = { action: Action.GAMES_AVAILABLE };
      expect(parseMessage(JSON.stringify(obj))).toEqual(obj);
    });

    it('should return parsed obj if action value is KEEP_ALIVE', () => {
      const obj = { action: Action.KEEP_ALIVE };
      expect(parseMessage(JSON.stringify(obj))).toEqual(obj);
    });
  });

  describe('actionGamesForUsr()', () => {
    const user = {
      id: 'some-id-string',
      connection: { send: jest.fn() },
    } as unknown as User;
    let mockGameIdsAvailable: jest.Spied<typeof game.gameIdsAvailable>;

    beforeAll(() => {
      mockGameIdsAvailable = jest
        .spyOn(game, 'gameIdsAvailable')
        .mockReturnValue([{ gameId: 'some-id-string', player: undefined }]);
    });
    afterAll(() => {
      mockGameIdsAvailable.mockReset();
    });

    it('should call gameIdsAvailable() and user.connection.send', () => {
      actionGamesForUsr(user);

      expect(game.gameIdsAvailable).toHaveBeenCalled();
      expect(user.connection.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: Action.GAMES_AVAILABLE_RESPONSE,
          payload: {
            games: [{ gameId: 'some-id-string', player: undefined }],
          },
        }),
      );
    });
  });

  describe('actionJoinGame()', () => {
    const user = {
      id: 'some-id-string',
      connection: { send: jest.fn() },
    } as unknown as User;
    const message = {
      action: Action.JOIN_GAME,
      payload: {
        gameId: 'some-id-string',
      },
    } as Message<GameNewJoin & { gameId: string }>;
    const mockGameJoin = jest.spyOn(game, 'gameJoin').mockReturnValue(Player.O);
    const mockGameGetOpponent = jest
      .spyOn(game, 'gameGetOpponent')
      .mockReturnValue(user);

    beforeAll(() => {});

    afterAll(() => {
      mockGameJoin.mockReset();
      mockGameGetOpponent.mockReset();
    });

    it('should call gameJoin(), user.connection.send, gameGetOpponent() and opponent.connection.send', () => {
      actionJoinGame(user, message);

      expect(game.gameJoin).toHaveBeenCalled();
      expect(user.connection.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: Action.JOIN_GAME_RESPONSE,
          payload: {
            gameId: 'some-id-string',
            player: Player.O,
          },
        }),
      );

      expect(game.gameGetOpponent).toHaveBeenCalled();
      expect(user.connection.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: Action.MOVE_FORWARD,
          payload: { gameId: 'some-id-string', move: null },
        }),
      );
    });
  });

  describe('actionNewGame()', () => {
    const user = {
      id: 'some-id-string',
      connection: { send: jest.fn() },
    } as unknown as User;
    const message = {
      action: Action.JOIN_GAME,
      payload: {
        player: Player.O,
      },
    } as Message<GameNewJoin>;
    let mockGameCreate: jest.Spied<typeof game.gameCreate>;

    beforeAll(() => {
      mockGameCreate = jest
        .spyOn(game, 'gameCreate')
        .mockReturnValue('some-id-string');
    });
    afterAll(() => {
      mockGameCreate.mockReset();
    });

    it('should call gameCreate() and user.connection.send', () => {
      actionNewGame(user, message);

      expect(game.gameCreate).toHaveBeenCalled();
      expect(user.connection.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: Action.NEW_GAME_RESPONSE,
          payload: {
            gameId: 'some-id-string',
            player: Player.O,
          },
        }),
      );
    });
  });

  describe('actionMove', () => {
    const user = {
      id: 'some-id-string',
      connection: { send: jest.fn() },
    } as unknown as User;
    const message = {
      action: Action.JOIN_GAME,
      payload: {
        gameId: 'some-id-string',
        move: {
          v: 0,
          h: 0,
        },
      },
    } as Message<GameMoveForward>;

    it('should early return if message.payload is invalid', () => {
      const mocks = [
        jest.spyOn(game, 'gameMakeMove'),
        jest.spyOn(game, 'gameGetUsers'),
        jest.spyOn(game, 'gameDelete'),
        jest.spyOn(game, 'gameGetOpponent'),
        jest.spyOn(usr, 'broadcast'),
      ];

      actionMove(user, { ...message, payload: {} as GameMoveForward });

      mocks.forEach(mock => {
        expect(mock).not.toHaveBeenCalled();
        mock.mockReset();
      });
    });

    it('should send negative response if move is invalid', () => {
      const mockGameMakeMove = jest
        .spyOn(game, 'gameMakeMove')
        .mockReturnValue({ isGameOver: false, result: null });
      actionMove(user, message);

      expect(mockGameMakeMove).toHaveBeenCalled();
      expect(user.connection.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: Action.MOVE_RESPONSE,
          payload: { okay: false },
        }),
      );

      mockGameMakeMove.mockReset();
    });

    it('should broadcast result if game is over', () => {
      const mockGameGetUsers = jest
        .spyOn(game, 'gameGetUsers')
        .mockReturnValue([]);
      const mockBroadcast = jest.spyOn(usr, 'broadcast');
      const mockGameMakeMove = jest
        .spyOn(game, 'gameMakeMove')
        .mockReturnValue({ isGameOver: true, result: 'tie' });

      actionMove(user, message);

      expect(mockGameMakeMove).toHaveBeenCalled();
      expect(mockGameGetUsers).toHaveBeenCalled();
      expect(mockBroadcast).toHaveBeenCalledWith(
        JSON.stringify({ action: Action.GAME_OVER, payload: 'tie' }),
        [],
      );
    });
  });
});
