import redisClient from "../config/redis.js";

export default function throttle(waitTime = 1000) {
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const ip = req.ip == "::1" ? "127.0.0.2" : req.ip;
      const key = `throttle:${req.path}:${ip}`;

      // Redis se data lao
      const data = await redisClient.hGetAll(key);

      let previousDelay = Number(data.previousDelay) || 0;
      let lastRequestTime =
        Number(data.lastRequestTime) || now - waitTime;

      // same logic
      const timePassed = now - lastRequestTime;
      const delay = Math.max(0, waitTime + previousDelay - timePassed);

      // Redis me update karo
      await redisClient.hSet(key, {
        previousDelay: delay,
        lastRequestTime: now,
      });

      // TTL set karo (important 🔥)
      await redisClient.expire(key, 60); // 60 sec me auto delete

      console.log(`Throttle delay: ${delay}ms`);

      setTimeout(next, delay);
    } catch (err) {
      console.error(err);
      next(); // fail-safe
    }
  };
}