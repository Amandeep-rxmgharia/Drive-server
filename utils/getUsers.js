import redisClient from "../config/redis.js";
import User from "../models/userModel.js";

export default async function(deleted) {
    const users = await User.find({ deleted })
    .select("_id email name profilePic role")
    .lean();
    const keys = await redisClient.keys("session:*");
  const allSessions = []
  for (const key of keys) {
  const data = await redisClient.json.get(key);
  allSessions.push(data);
}
  console.log(allSessions)
  const allSessionsUserId = allSessions.map(({ userId }) => userId.toString());
  const allSessionsUserIdSet = new Set(allSessionsUserId);
  const usersData = users.map((user) => {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic,
      role: user.role,
      isLoggedIn: allSessionsUserIdSet.has(user._id.toString()) ? true : false,
    };
  });
  return usersData
}