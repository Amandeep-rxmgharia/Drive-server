import File from "../models/fileModel.js";
import Session from "../models/sessionModel.js";
import { tokenSchema } from "../validators/authSchema.js";
import checkAuth from "./authMiddleware.js";

export const fileSharingAuth = async (req, res, next) => {
  console.log("running")
  const { token } = req.params;
  const {success,data} = tokenSchema.safeParse(token)
  if(!success) return res.status(400).json({error:"invalid credentials"})
  const file = await File.findOne({
    "sharing.shareToken": data,
  }).lean();
  if (!file) return res.status(404).json({ error: "invalid credentials!" });
  req.file = file;
  if (file.sharing.access === "anyone") return next();  
  checkAuth(req,res,(err) => {
    if(err) return next(err)
      const requestedUser = req.user
    console.log("running check auth")
      if (!requestedUser) return res.status(403).json({ error: "login first!" });
      const authorizedUser = file.permissions.find(
        ({ user }) => user === requestedUser.email,
      );
      if (!authorizedUser) return res.status(403).json({ error: "unauthorized!" });
      console.log(authorizedUser)
      req.authorizedUser = authorizedUser;
      next();
  })
};
