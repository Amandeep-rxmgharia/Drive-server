import { createWriteStream } from "fs";
import { readFile, rm, stat } from "fs/promises";
import path from "path";
import Directory from "../models/directoryModel.js";
import DOMPurify from "isomorphic-dompurify";
import File from "../models/fileModel.js";
import { getBreadCrumb } from "../utils/getBreadCrumb.js";
import { Transform } from "stream";
import { Types } from "mongoose";
import { pipeline } from "stream/promises";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl as getCloudFrontSignedUrl } from "@aws-sdk/cloudfront-signer";

export const client = new S3Client();

async function updateParentDirectories(parentDirId, incField) {
  let parentFolderId = parentDirId;
  const parents = [];
  do {
    const Dir = await Directory.findById(parentFolderId).lean();
    if (!Dir) break;
    parents.push(Dir._id);
    parentFolderId = Dir.parentDirId;
  } while (parentFolderId);
  if (parents.length > 0) {
    await Directory.updateMany({ _id: { $in: parents } }, { $inc: incField });
  }
}

export const uploadInitiate = async (req, res, next) => {
  const user = req.user;
  const { name, size, type } = req.body;
  const parentDirId = req.body.parentDirId
    ? new Types.ObjectId(req.body.parentDirId)
    : user.rootDirId;
  if (!name || size <= 0)
    return res.status(404).json({ error: "invalid Credentials" });
  const rootDir = await Directory.findById(user.rootDirId).lean();
  if (user.maxStorageInBytes - rootDir.size < size)
    return res.status(400).json({ error: "stoarge full!" });
  const extension = path.extname(name);
  const pathArr = [...(await getBreadCrumb(parentDirId))];
  const file = await File.insertOne({
    extension,
    size,
    name,
    parentDirId,
    path: pathArr,
    userId: req.user._id,
    createdAt: new Date().toLocaleString(),
    updatedAt: new Date().toLocaleString(),
    sharing: {
      shareToken: crypto.randomUUID(),
    },
    isUploading: true,
  });
  await updateParentDirectories(file.parentDirId, {
    size: file.size,
    numOfFiles: 1,
  });
  const command = new PutObjectCommand({
    Bucket: "mahi-storage-app",
    Key: file._id.toString(),
    ContentType: type || "application/octet-stream",
    ContentLength: size,
  });
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 3600,
    signableHeaders: new Set(["content-type","content-length"]),
  });
  return res.json({
    fileId: file._id.toString(),
    uploadUrl,
  });
};

export const uploadComplete = async (req, res, next) => {
  const { fileId } = req.body;
  const file = await File.findById(fileId);
  const command = new HeadObjectCommand({
    Bucket: "mahi-storage-app",
    Key: fileId,
  });
  const uploadedFileData = await client.send(command);
  console.log(uploadedFileData);
  if (uploadedFileData.ContentLength != file.size) {
    await file.deleteOne();
    const deleteCommand = new DeleteObjectCommand({
      Bucket: "mahi-storage-app",
      Key: fileId,
    });
    await client.send(deleteCommand);
    res.status(500).json({ error: "Uploaded failed" });
    return;
  }
  file.isUploading = false;
  await file.save();
  res.status(201).end();
};

export const getFile = async (req, res) => {
  const { id } = req.params;
  console.log(req.query.action);
  const fileData = await File.findOne({
    _id: id,
  })
    .select("_id name")
    .lean();
  // Check if file exists
  if (!fileData) return res.status(404).json({ error: "file not found" });
  // If "download" is requested, set the appropriate headers
  const privateKey = await readFile(
    "C:/Users/Dell/Documents 1/Node.js/PROCODER DRIVE/cloudfront keys/private_key.pem",
    "utf-8",
  );
  // const url = `https://d3du29olkjloyw.cloudfront.net/${id}`;
  const url = new URL(id, `https://d3du29olkjloyw.cloudfront.net`);
  console.log(url);
  const downloadDisposition = `attachment; filename="${fileData.name}"`;
  const getDisposition = `inline; filename="${fileData.name}"`;
  if (req.query.action === "download") {
    url.searchParams.append("response-content-disposition", downloadDisposition);
  }else {
    url.searchParams.append("response-content-disposition", getDisposition);
  }
  const keyPairId = "K2F25X20M6EEFD";
  const time = 300 * 1000;
  const dateLessThan = new Date(Date.now() + time);
  let getUrl = getCloudFrontSignedUrl({
    url: url.href,
    keyPairId,
    dateLessThan,
    privateKey,
    // contentDisposition: `attachment; filename="${fileData.name || 'download.file'}"`,
  });
  if (req.query.action === "download") {
    const fixedSignedUrl = new URL(getUrl);
    fixedSignedUrl.searchParams.set(
      "response-content-disposition",
      downloadDisposition,
    )
    res.json({
      success: true,
      downloadUrl: fixedSignedUrl.href,
      fileName: fileData.name,
    });
    console.log('running this inner fun');
    return;
  }
   const fixedSignedUrl = new URL(getUrl);
    fixedSignedUrl.searchParams.set(
      "response-content-disposition",
      getDisposition,
    )
  res.redirect(fixedSignedUrl);
};

export const renameFile = async (req, res, next) => {
  const { id } = req.params;
  const file = await File.findOne({
    _id: id,
    userId: req.user._id,
  });

  // Check if file exists
  if (!file) {
    return res.status(404).json({ error: "File not found!" });
  }

  try {
    const sanatizedFileName = DOMPurify.sanitize(req.body.newFilename);
    file.name = sanatizedFileName || "untitled";
    file.updatedAt = new Date().toLocaleString();
    await file.save();
    return res.status(200).json({ message: "Renamed" });
  } catch (err) {
    console.log(err);
    err.status = 500;
    next(err);
  }
};

export const deleteFile = async (req, res, next) => {
  const { id } = req.params;
  const file = await File.findOne({
    _id: id,
    userId: req.user._id,
  }).select("extension parentDirId size");

  if (!file) {
    return res.status(404).json({ error: "File not found!" });
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: "mahi-storage-app",
      Key: id,
    });
    await client.send(command);
    await file.deleteOne();
    await updateParentDirectories(file.parentDirId, {
      size: -file.size,
      numOfFiles: -1,
    });
    return res.status(200).json({ message: "File Deleted Successfully" });
  } catch (err) {
    next(err);
  }
};

export const getFileSharingConfig = async (req, res, next) => {
  const file = req.file;
  res.json({
    access: file.sharing.access,
    shareToken: file.sharing.shareToken,
    peopleWithAccess: file.permissions,
  });
};
export const setFileSharingConfig = async (req, res, next) => {
  const { id } = req.params;
  const { data, accessStatus } = req.body;
  if (accessStatus == "anyone") {
    try {
      await File.findByIdAndUpdate(id, {
        "sharing.access": "anyone",
        updatedAt: new Date().toLocaleString(),
      });
      return res.json({ message: "success" });
    } catch (err) {
      next(err);
    }
  }
  try {
    await File.findByIdAndUpdate(id, {
      "sharing.access": "restricted",
      updatedAt: new Date().toLocaleString(),
    });
    if (data.length) {
      data.forEach(async ({ user, role }) => {
        const updated = await File.updateOne(
          { _id: id, "permissions.user": user },
          { $set: { "permissions.$.role": role } },
        );

        if (!updated.matchedCount) {
          await File.updateOne(
            { _id: id },
            { $push: { permissions: { user, role } } },
          );
        }
      });
    }
    return res.json({ message: "success" });
  } catch (err) {
    next(err);
  }
};

export const deleteUserFromFileSharingConfig = async (req, res, next) => {
  const { id } = req.params;
  const { user } = req.body;
  try {
    await File.updateOne(
      { _id: id },
      {
        $pull: { permissions: { user } },
      },
    );
    return res.json({ message: "success" });
  } catch (err) {
    next(err);
  }
};

export const getSharedFile = async (req, res, next) => {
  const file = req.file;
  const filePath = `${process.cwd()}/storage/${file._id.toString()}${file.extension}`;

  if (req.query.action === "download") {
    return res.download(filePath, fileData.name);
  }
  res.set({
    "user-role": req.authorizedUser?.role ? req.authorizedUser?.role : "anyone",
    "file-name": file.name,
  });
  // Send file
  return res.sendFile(filePath, (err) => {
    if (!res.headersSent && err) {
      return res.status(404).json({ error: "File not found!" });
    }
  });
};
