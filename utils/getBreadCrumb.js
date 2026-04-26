import Directory from "../models/directoryModel.js";

export async function getBreadCrumb(parentDirId) {
    const path = [];
    async function getPath(parentDirId) {
      const Dir = await Directory.findById(parentDirId).lean();
      if (!Dir.parentDirId && path.length < 2) return path.unshift(Dir._id);
      // console.log(object);
      if (path.length < 2) {
        path.unshift(Dir._id);
        console.log(path);
        await getPath(Dir.parentDirId);
      }
    }
    await getPath(parentDirId);
    console.log(path);
    return path;
  }