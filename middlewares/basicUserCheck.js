import User from "../models/userModel.js";

export const basicUserCheck = async (req, res, next) => {
  const targetUser = await User.findById(req.params.userId).lean();
  const priorityOrder = { Owner: 4, Admin: 3, Manager: 2, User: 1 };
  if (priorityOrder[req.user.role] === 1 || (priorityOrder[targetUser.role] === 4 && priorityOrder[req.user.role] !== 4))
    return res.status(403).json({ error: "unauthorized!" });
  if (priorityOrder[targetUser.role] > priorityOrder[req.user.role])
    return res.status(403).json({ error: "not allowed" });
  next();
};
