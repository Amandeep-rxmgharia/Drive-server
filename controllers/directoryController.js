import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import { stat } from "fs/promises";
import deleteDir, { getDirectoryContents } from "../utils/deleteDir.js";
import { getBreadCrumb } from "../utils/getBreadCrumb.js";
import getDirectoryData from "../utils/getDirectoryData.js";
import DOMPurify from "isomorphic-dompurify";

export const getDirectory = async (req, res) => {
  const user = req.user;
  // console.log(import.meta.dirname);
  const dirId = req.params.id || user.rootDirId.toString();
  const dirData = await getDirectoryData(dirId, req.user._id);
  if (dirData.status === 404)
    return res.status(404).json({ error: dirData.error });
  return res.status(200).json(dirData);
};

export const createDirectory = async (req, res, next) => {
  const user = req.user;

  const parentDirId = req.params.parentDirId || user.rootDirId.toString();
  const dirname = req.headers.dirname || "New Folder";
  const sanatizedDirName = DOMPurify.sanitize(dirname);
  console.log("THIS IS NAME", sanatizedDirName);
  try {
    const parentDir = await Directory.findOne({
      _id: parentDirId,
    }).lean();

    if (!parentDir)
      return res
        .status(404)
        .json({ message: "Parent Directory Does not exist!" });

    const path = [...(await getBreadCrumb(parentDirId))];
    console.log(path);
    await Directory.insertOne({
      name: sanatizedDirName || "New Folder",
      parentDirId,
      userId: user._id,
      path,
      createdAt: new Date().toLocaleString(),
      updatedAt: new Date().toLocaleString(),
    });
    let parentFolderId = parentDirId;
    const parents = [];
    do {
      const Dir = await Directory.findById(parentFolderId).lean();
      if (!Dir) break;
      parents.push(Dir._id);
      parentFolderId = Dir.parentDirId;
    } while (parentFolderId);
    if (parents.length > 0) {
      await Directory.updateMany(
        { _id: { $in: parents } },
        { $inc: { numOfFolders: 1 } },
      );
    }
    return res.status(201).json({ message: "Directory Created!" });
  } catch (err) {
    if (err.code === 121) {
      res
        .status(400)
        .json({ error: "Invalid input, please enter valid details" });
    } else {
      next(err);
    }
  }
};

export const renameDirectory = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const { newDirName } = req.body;
  const sanatizedDirName = DOMPurify.sanitize(newDirName);
  try {
    await Directory.findOneAndUpdate(
      {
        _id: id,
        userId: user._id,
      },
      {
        name: sanatizedDirName || "Renamed Folder",
        updatedAt: new Date().toLocaleString(),
      },
    );
    res.status(200).json({ message: "Directory Renamed!" });
  } catch (err) {
    next(err);
  }
};

export const deleteDirectory = async (req, res, next) => {
  const { id } = req.params;
  const { success, error, status } = await deleteDir(id, req.user._id);
  if (!success && status == 404)
    res.status(status).json({ error: "Directory not found!" });
  if (!success && status == 500) return next(error);
  return res.json({ message: "Files deleted successfully" });
};
