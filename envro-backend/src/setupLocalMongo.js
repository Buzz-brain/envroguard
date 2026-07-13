const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

async function startLocalMongo() {
  mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'envroguard-db',
    },
  });
  const uri = mongod.getUri();
  console.log(`[Local MongoDB] Started at ${uri}`);
  return uri;
}

async function stopLocalMongo() {
  if (mongod) {
    await mongod.stop();
    console.log('[Local MongoDB] Stopped');
  }
}

module.exports = { startLocalMongo, stopLocalMongo };
