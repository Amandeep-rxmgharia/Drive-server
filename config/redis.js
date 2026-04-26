import { createClient } from "redis";

const redisClient = createClient({password: "Jus#0203*"});
redisClient.on("error", (err) => {
  console.log(err);
});
await redisClient.connect();
export default redisClient;
