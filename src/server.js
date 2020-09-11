/* eslint-disable no-unused-vars */
require('dotenv').config();
const polka = require('polka');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const sirv = require('sirv');

const { Elder } = require('@elderjs/elderjs');
const elder = new Elder({ context: 'server' });

const SERVER_PORT = process.env.SERVER_PORT || 3000;

const server = polka();

server.use(cors());

server.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

server.use(compression({ level: 6 }));

server.use(bodyParser.urlencoded({ extended: false }), bodyParser.json());

server.use(elder.server);

server.use(sirv('public', { dev: true }));

server.listen(SERVER_PORT, (err) => {
  if (err) {
    console.log(err);
  }
  console.log(`> Elder.js running on http://localhost:${SERVER_PORT}`);
});
