import http from 'http';

import { startWsServer } from './ws';

const server = http.createServer();
startWsServer(server);

const port = process.env.PORT || 3000;
server.listen(port, () =>
  console.log(
    `Tic-Tac-Toe server is listening to port: ${port}, in ${process.env.NODE_ENV} mode.`,
  ),
);
