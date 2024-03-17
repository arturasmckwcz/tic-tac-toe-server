import { createLogger } from '../../src/utils';

describe('utils', () => {
  describe('createLogger', () => {
    it('should return an object with an info method', () => {
      const logger = createLogger('TEST');
      expect(typeof logger).toBe('object');
      expect(typeof logger.info).toBe('function');
    });

    it('should prepend the prefix to info messages', () => {
      const prefix = 'MY_LOGGER';
      const message = 'This is a test message';

      const mockConsoleLog = jest.spyOn(console, 'log');

      const logger = createLogger(prefix);
      logger.info(message);

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog.mock.calls[0][0]).toBe(prefix);
      expect(mockConsoleLog.mock.calls[0][1]).toBe(message);

      mockConsoleLog.mockRestore();
    });

    it('should pass additional arguments to console.log', () => {
      const prefix = 'DEBUG';
      const message = 'Error occurred';
      const error = new Error('Something went wrong');
      const logger = createLogger('DEBUG');

      const mockConsoleLog = jest.spyOn(console, 'log');

      logger.info(message, error);

      expect(mockConsoleLog).toHaveBeenCalledWith(prefix, message, error);

      mockConsoleLog.mockRestore();
    });
  });
});
