const redisClient = require('./utils/redis.js');

(async () => {
  console.log('1> ', redisClient.isAlive());
  console.log('2> ', await redisClient.get('myKey'));
  await redisClient.set('myKey', 12, 5);
  console.log('3> ', await redisClient.get('myKey'));

  setTimeout(async () => {
    console.log('4> ', await redisClient.get('myKey'));
  }, 1000 * 10);