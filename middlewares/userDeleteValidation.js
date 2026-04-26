import User from "../models/userModel.js";

export const userSoftDeleteValidation = async(req, res, next) => {
  const targetUser = await User.findById(req.params.userId).lean();
  console.log(targetUser.role)
  if(targetUser.role === "Owner")
    return res.status(403).json({ error: "unauthorized!" });
  if(req.user._id.toString() == req.params.userId)
      return res.status(403).json({ error: "can't delete yourself!" });
    if (req.user.role === "Admin" || req.user.role === "Owner") {
      next();
      return;
    }
    return res.status(403).json({ error: "unauthorized!" });
  }
export const userHardDeleteValidation = async(req, res, next) => {
  const targetUser = await User.findById(req.params.userId).lean();
  if(targetUser.role === "Owner")
    return res.status(403).json({ error: "unauthorized!" });
  if(req.user._id.toString() == req.params.userId)
      return res.status(403).json({ error: "can't delete yourself!" });
    if (req.user.role === "Owner") {
      next();
      return;
    }
    return res.status(403).json({ error: "unauthorized!" });
  }