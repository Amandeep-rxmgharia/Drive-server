import redisClient from "../config/redis.js";
import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";

export default async function checkAuth(req, res, next) {
  console.log("running this middleware");
  const { sid } = req.signedCookies;

  if (!sid) {
    res.clearCookie("sid");
    return res.status(401).json({ error: "1 Not logged in!" });
  }

 const session = await redisClient.json.get(`session:${sid}`)
  if (!session) {
    res.clearCookie("sid");
    return res.status(401).json({ error: "2 Not logged in!" });
  }
  console.log(sid)
  const user = await User.findOne({ _id: session.userId }).lean();
  if (!user) {
    return res.status(401).json({ error: "3 Not logged in!" });
  }
  if(user && user.deleted) {
    return res.status(401).json({error: "you'r account has been deleted"})
  }
  console.log('check auth complete');
  req.user = user;
  req.session = session
  next();
}
