describe('Tic-Tac-Toe Server', () => {
  let mockHttpServerCalled = false;
  let mockHttpServerListenCalled = false;
  let mockWsServerCalled = false;

  beforeAll(async () => {
    jest.mock('../src/ws', () => ({
      startWsServer: jest.fn(() => {
        mockWsServerCalled = true;
      }),
    }));

    jest.mock('http', () => ({
      createServer: jest.fn(() => {
        mockHttpServerCalled = true;
        return {
          listen: jest.fn(() => {
            mockHttpServerListenCalled = true;
          }),
        };
      }),
    }));

    await require('../src/server');
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should start the http server', () => {
    expect(mockHttpServerCalled).toBeTruthy();
    expect(mockHttpServerListenCalled).toBeTruthy();
  });

  it('should the web socket server', () => {
    expect(mockWsServerCalled).toBeTruthy();
  });
});
