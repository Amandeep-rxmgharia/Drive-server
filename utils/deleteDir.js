import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import { rm } from "fs/promises";
import { client } from "../controllers/fileController.js";

export default async function (id, userId) {
  try {
    const directoryData = await Directory.findOne({
      _id: id,
      userId: userId,
    }).lean();

    if (!directoryData) {
      return { success: false, status: 404, error: "Directory not found!" };
    }
    let parentFolderId = directoryData.parentDirId;
    let parents = [];
    do {
      const Dir = await Directory.findById(parentFolderId);
      if (!Dir) break;
      parents.push(Dir._id);
      parentFolderId = Dir.parentDirId;
    } while (parentFolderId);

    if (parents.length > 0) {
      await Directory.updateMany(
        { _id: { $in: parents } },
        {
          $inc: {
            size: directoryData.size ? -directoryData.size : 0,
            numOfFiles: directoryData.numOfFiles
              ? -directoryData.numOfFiles
              : 0,
            numOfFolders: directoryData.numOfFolders
              ? -(directoryData.numOfFolders + 1)
              : -1,
          },
        },
      );
    }

    const { files, directories } = await getDirectoryContents(id);
    const fileIdArr = files.map(({ _id }) => _id.toString());
    const keyArr = fileIdArr.map((id) => {
      return { Key: id }
    })
    if(keyArr.length) {
      const command = new DeleteObjectsCommand({
      Bucket: "mahi-storage-app",
      Delete: {
        Objects: keyArr,
        Quiet: false, // optional
      },
    });
    await client.send(command)

    }
    await File.deleteMany({
      _id: { $in: fileIdArr },
    });

    await Directory.deleteMany({
      _id: { $in: [...directories.map(({ _id }) => _id), id] },
    });

    return { success: true };
  } catch (err) {
    return { success: false, status: 500, error: err };
  }
}

export async function getDirectoryContents(id) {
  let files = await File.find({ parentDirId: id })
    .select("extension size")
    .lean();
  let directories = await Directory.find({ parentDirId: id })
    .select("_id")
    .lean();

  for (const { _id } of directories) {
    const { files: childFiles, directories: childDirectories } =
      await getDirectoryContents(_id);

    files = [...files, ...childFiles];
    directories = [...directories, ...childDirectories];
  }

  return { files, directories };
}
