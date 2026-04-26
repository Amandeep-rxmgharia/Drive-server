import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";

export default async function(_id,userId) {
    const directoryData = await Directory.findOne({ _id,userId }).populate("path","name").lean();
  if (!directoryData) {
    return {
      status: 404,
      error: "Directory not found or you do not have access to it!"}
  }

  const files = await File.find({ parentDirId: directoryData._id }).populate("path","name").lean();
  const directories = await Directory.find({ parentDirId: _id }).populate("path","name").lean();
  

  return {
      ...directoryData,
      files: files.map((dir) => ({ ...dir, id: dir._id })),
      directories: directories.map((dir) => ({ ...dir, id: dir._id })),
    }
}