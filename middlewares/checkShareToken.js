import File from "../models/fileModel.js";

export const checkShareToken = async (req, res, next) => {
  const { id } = req.params;
  const file = await File.findById(id);
  if(!file) return res.status.json({error:"invalid fileId!"})
  try {
    if (!file.sharing.shareToken) {
      file.sharing.shareToken = crypto.randomUUID();
      await file.save();
    }
    req.file = file;
    next();
  } catch (err) {
    next(err);
  }
};
