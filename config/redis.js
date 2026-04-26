import { createClient } from "redis";

const redisClient = createClient({password: process.env.REDIS_CLIENT_SECRET});
redisClient.on("error", (err) => {
  console.log(err);
});
await redisClient.connect();
export default redisClient;
