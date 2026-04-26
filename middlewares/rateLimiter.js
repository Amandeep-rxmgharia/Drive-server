import redisClient from "../config/redis.js";

export const IPRateLimiter = (numOfReq, windowSize) => {
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const ip = req.ip == "::1" ? "127.0.0.2" : req.ip;
      console.log(req.ip);
      console.log(ip);
      const key = `rate_limit:${req.path}:${ip}`;

      const multi = redisClient.multi();

      // 1. remove old
      multi.zRemRangeByScore(key, 0, now - windowSize);

      // 2. count
      multi.zCard(key);

      const results = await multi.exec();
      const count = results[1];

      // 3. check limit
      if (count >= numOfReq) {
        return res.status(429).json({ error: "too many req!" });
      }

      // 4. now add request
      await redisClient.zAdd(key, {
        score: now,
        value: now.toString(),
      });

      // 5. set expiry
      await redisClient.expire(key, Math.ceil(windowSize / 1000));
      console.log("limiter running");
      next();
    } catch (err) {
      console.error(err);
      next();
    }
  };
};

export const sessionRateLimiter = (numOfReq, windowSize) => {
  return async (req, res, next) => {
    try {
      const now = Date.now();
      const { sid } = req.signedCookies;
      if(!sid) return res.json({error: "not logged in!"})
      const key = `rate_limit:${req.path}:${sid}`;

      const multi = redisClient.multi();

      // 1. remove old
      multi.zRemRangeByScore(key, 0, now - windowSize);

      // 2. count
      multi.zCard(key);

      const results = await multi.exec();
      const count = results[1];

      // 3. check limit
      if (count >= numOfReq) {
        return res.status(429).json({ error: "too many req!" });
      }

      // 4. now add request
      await redisClient.zAdd(key, {
        score: now,
        value: now.toString(),
      });

      // 5. set expiry
      await redisClient.expire(key, Math.ceil(windowSize / 1000));

      next();
    } catch (err) {
      console.error(err);
      next();
    }
  };
};