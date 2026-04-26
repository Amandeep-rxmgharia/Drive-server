import File from "../models/fileModel.js";

export const fileAuth = async (req,res,next) => {
const { id } = req.params;
  const fileData = await File.findOne({
    _id: id,
    userId: req.user._id,
  }).lean();

   if (!fileData) {
    return res.status(404).json({ error: "File not found!" });
  }
  next()
}