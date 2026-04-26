import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import OTP from "../models/otpModel.js";
import User from "../models/userModel.js";
import mongoose, { Types } from "mongoose";
import { sendOtp } from "../utils/sendOtp.js";
import verifyOtp from "../utils/verifyOtp.js";
import { ObjectId } from "mongodb";
import {
  fetchGdriveFiles,
  generateGdriveAuthURL,
  getTokens,
  verifyToken,
} from "../utils/googleServices.js";
import createUser from "../utils/createUser.js";
import generateGitAuthCode from "../utils/generateGitAuthCode.js";
import fetchGithubUserData from "../utils/fetchGithubUserData.js";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import getUsers from "../utils/getUsers.js";
import { readFile, rm } from "fs/promises";
import getDirectoryData from "../utils/getDirectoryData.js";
import redisClient from "../config/redis.js";
import {
  loginSchema,
  registerSchema,
  verifyEmail,
} from "../validators/authSchema.js";
import z from "zod/v4";
import { Readable } from "stream";

export const register = async (req, res, next) => {
  const userData = req.body;
  // console.log(registerSchema);
  const verify = registerSchema.safeParse(userData);
  if (!verify.success)
    return res
      .status(400)
      .json({ error: z.flattenError(verify.error).fieldErrors });
  const userId = new Types.ObjectId();
  const { userId: id, error } = await createUser(userId, userData, res, next);
  console.log(id);
  if (error == 11000) {
    return res.status(409).json({
      error: "This email already exists",
      message:
        "A user with this email address already exists. Please try logging in or use a different email.",
    });
  } else if (error == 121) {
    res
      .status(400)
      .json({ error: "Invalid input, please enter valid details" });
  } else {
    res.status(201).json({ message: "User Registered" });
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  const verify = loginSchema.safeParse({ email, password });
  if (!verify.success)
    return res
      .status(400)
      .json({ error: z.flattenError(verify.error).fieldErrors });
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: "Invalid Credentials" });
  }
  if (user.deleted) {
    return res.status(404).json({ error: "user doesn't exist" });
  }
  console.log(password);
  if (!user.password) {
    return res.status(404).json({ error: "have not set any password yet!" });
  }
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(404).json({ error: "Invalid Credentials" });
  }
  const session = await redisClient.ft.search(
    "userIdIdx",
    `@userId:{${user.id}}`,
  );
  if (session.total > 1) {
    await redisClient.del(session.documents[0].id);
  }
  const sessionId = crypto.randomUUID();
  const ok = await redisClient.json.set(`session:${sessionId}`, "$", {
    userId: user._id.toString(),
  });
  await redisClient.expire(`session:${sessionId}`, 60 * 60 * 24 * 7);
  if (ok) {
    res.cookie("sid", sessionId, {
      httpOnly: true,
      signed: true,
      maxAge: 60 * 1000 * 60 * 24 * 7,
      sameSite: "lax",
    });
    res.json({ message: "logged in" });
  } else {
    next(err);
  }
};

export const getCurrentUser = async (req, res) => {
  const rootDirIdSize = await Directory.findById(req.user.rootDirId).select(
    "size",
  );
  res.status(200).json({
    name: req.user.name,
    email: req.user.email,
    profilePic: req.user.profilePic,
    role: req.user.role,
    maxStorageInBytes: req.user.maxStorageInBytes.toString(),
    usedStorageInBytes: rootDirIdSize.size.toString(),
  });
};

export const logout = async (req, res) => {
  const { sid } = req.signedCookies;
  await redisClient.json.del(`session:${sid}`);
  res.clearCookie("sid");
  res.status(204).end();
};

export const logoutAll = async (req, res) => {
  const { sid } = req.signedCookies;
  const session = await redisClient.json.get(`session:${sid}`);
  const keys = await redisClient.keys("session:*");
  // return
  const sessions = await redisClient.ft.search(
    "userIdIdx",
    `@userId:{${session.userId}}`,
  );
  const userIdArr = sessions.documents.map(({ id }) => id);
  await redisClient.del(userIdArr);
  console.log(userIdArr);
  res.clearCookie("sid");
  res.status(204).end();
};

export const OTPSender = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email }).lean();
  if (user && user.deleted) {
    return res.status(404).json({ error: "you'r account has been deleted" });
  }
  console.log(email);
  const AlreadyVerified = await OTP.findOne({ email }).lean();
  if (AlreadyVerified) {
    return res.json({ message: "already verified!" });
  }
  console.log("sending");
  const { success, message } = await sendOtp(email);
  if (success) return res.json({ message });
  return res.status(404).json({ error: message });
};

export const OTPVerifier = async (req, res) => {
  const { email, otp } = req.body;
  const { success, error } = await verifyOtp(email, otp);
  if (success) return res.status(200).json({ message: "ok report" });
  res.status(404).json({ error });
};

export const googleLogin = async (req, res, next) => {
  const { id_token } = req.body;
  const userData = await verifyToken(id_token);
  userData.provider = "GOOGLE";
  if (userData.email) {
    const user = await User.findOne({ email: userData.email });
    let userId = user ? user._id : null;
    if (!user) {
      userId = await createUser(userId, userData, res, next);
      console.log("userCreated");
    }
    if (user && user.deleted) {
      return res.status(404).json({ error: "you'r account has been deleted" });
    }
    if (user && !user.provider) {
      (user.provider = userData.provider), (user.profilePic = userData.picture);
      await user.save();
    }
    const session = await redisClient.ft.search(
      "userIdIdx",
      `@userId:{${user?.id}}`,
    );
    if (session.total > 1) {
      await redisClient.del(session.documents[0].id);
    }
    const sessionId = crypto.randomUUID();
    const ok = await redisClient.json.set(`session:${sessionId}`, "$", {
      userId: user ? user._id.toString() : userId,
    });
    await redisClient.expire(`session:${sessionId}`, 60 * 60 * 24 * 7);
    if (ok) {
      res.cookie("sid", sessionId, {
        httpOnly: true,
        signed: true,
        maxAge: 60 * 1000 * 60 * 24 * 7,
        sameSite: "lax",
      });
      return res.json({ message: "logged in" });
    }
  }
};

export const githubLogin = async (req, res, next) => {
  const authCode = await generateGitAuthCode();
  res.redirect(authCode);
  res.end();
};

export const githubLoginCallback = async (req, res, next) => {
  const code = req.query.code;
  const userData = await fetchGithubUserData(code);
  if (userData.error)
    return res.status(404).send(`
  <script>
    window.close();
  </script>
`);
  if (userData.email) {
    console.log("bahar ka if");
    const { success, data, error } = verifyEmail.safeParse(userData.email);
    if (!success) return next(error);
    const user = await User.findOne({ email: data });
    let userId = user ? user._id : null;
    if (!user) {
      console.log("andar ka if running");
      // console.log();
      userId = await createUser(userId, userData, res, next);
      console.log("userCreated");
    }
    if (userId.error == 121) return next(userId.message);
    if (user && user.deleted) {
      return res.status(404).send(`
  <script>
    window.close();
  </script>
`);
      // return res.status(404).json({error: "you'r account has been deleted"})
    }
    console.log(userId);
    if (user && !user.provider) {
      user.provider = userData.provider;
      if (userData.picture) {
        user.profilePic = userData.picture;
      }
      await user.save();
    }
    console.log("redis tak run ho raha h ");
    const session = await redisClient.ft.search(
      "userIdIdx",
      `@userId:{${user ? user.id : userId}}`,
    );
    if (session.total > 1) {
      await redisClient.del(session.documents[0].id);
    }
    // return
    const sessionId = crypto.randomUUID();
    const ok = await redisClient.json.set(`session:${sessionId}`, "$", {
      userId: user ? user._id.toString() : userId,
    });
    console.log("this is user Data", userData);
    await redisClient.expire(`session:${sessionId}`, 60 * 60 * 24 * 7);
    if (ok) {
      res.redirect(`http://localhost:5173/callback?sid=${sessionId}`);
      res.end();
    }
  }
};
export const sessionCookieProvider = async (req, res, next) => {
  const { sid } = req.body;
  if (sid) {
    res.cookie("sid", sid, {
      httpOnly: true,
      signed: true,
      maxAge: oneWeek,
      sameSite: "lax",
    });
    return res.json({ message: "success" });
  }
  res.status(404).json({ error: "failure" });
};

export const GDriveAuthCodeGenerator = async (req, res, next) => {
  const { sid } = req.signedCookies;
  const session = await redisClient.json.get(`session:${sid}`);
  if (session.token) {
    const files = await fetchGdriveFiles(session.token);
    console.log(session.token);
    console.log(files);
    if (files.error?.code === 401) {
      const authURL = generateGdriveAuthURL();
      res.redirect(authURL);
      return;
    }
    if (files) {
      console.log("inner");
      return res.send(`
  <script>
    window.opener.postMessage(
      { type: "DRIVE_FILES", data: ${JSON.stringify(files)} },
      "http://localhost:5173"
    );
    window.close();
  </script>
`);
    }
  }
  // console.log('sid',sid)
  console.log("outer");
  const authURL = generateGdriveAuthURL();
  res.redirect(authURL);
};
export const GDriveFileProvider = async (req, res, next) => {
  const { code } = req.query;
  const { access_token } = await getTokens(code);
  const files = await fetchGdriveFiles(access_token);
  const { sid } = req.signedCookies;
  await redisClient.json.set(`session:${sid}`, "$.token", access_token);
  if (files) {
    res.send(`
  <script>
    window.opener.postMessage(
      { type: "DRIVE_FILES", data: ${JSON.stringify(files)} },
      "http://localhost:5173"
    );
    window.close();
  </script>
`);
  }
};

export const driveFileDownloader = async (req, res, next) => {
  const session = req.session;
  const user = req.user;
  const parentDirId = user.rootDirId.toString();
  const rootDir = await Directory.findById(parentDirId).lean();
  const dirname = "Google Drive";
  const maxStorage = req.user.maxStorageInBytes;
  const { files } = req.body;
  let GdriveDir;
  try {
    const parentDir = await Directory.findOne({
      _id: parentDirId,
    }).lean();
    if (!parentDir)
      return res
        .status(404)
        .json({ message: "Parent Directory Does not exist!" });
    GdriveDir = await Directory.findOneAndUpdate(
      { name: dirname, userId: user._id }, // find condition
      {
        $setOnInsert: {
          name: dirname,
          parentDirId,
          userId: user._id,
          createdAt: new Date().toLocaleString(),
          updatedAt: new Date().toLocaleString(),
          path: [rootDir._id],
        },
      },
      {
        new: true, // updated/inserted document return karega
        upsert: true, // agar nahi mila to insert karega
      },
    );
    await Directory.findByIdAndUpdate(parentDirId, {
      $inc: { numOfFolders: 1 },
    });
  } catch (err) {
    if (err.code === 121) {
      console.log(err);
      return res
        .status(400)
        .json({ error: "Invalid input, please enter valid details" });
    } else {
      return next(err);
    }
  }
  console.log("accepting");
  await Promise.all(
    files.map(async (file) => {
      const fileId = new Types.ObjectId();
      const filename = file.name;
      const extension = path.extname(filename);
      const fullFileName = `${fileId}${extension}`;
      console.log(fullFileName);
      const writeStream = createWriteStream(
        `${import.meta.dirname}/../storage/${fullFileName}`,
      );
      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      );
      console.log(driveResponse.body);
      if (!driveResponse.ok) return;
      const stream = Readable.fromWeb(driveResponse.body);

      let responseSent = false;
      let size = 0;
      stream.on("data", async (chunk) => {
        size += chunk.length;
        if (size > 100000000 && !responseSent) {
          responseSent = true;
          stream.pause();
          await rm(`${import.meta.dirname}/../storage/${fullFileName}`);
          return res.status(400).json(
            JSON.stringify({
              success: false,
              message: "too large",
            }),
          );
        }
        const ok = writeStream.write(chunk);
        if (!ok) {
          stream.pause();
        }
      });
      // console.log(size);
      writeStream.on("drain", () => {
        stream.resume();
      });

      stream.on("end", () => {
        console.log(size);
        writeStream.end(); // close write stream
      });

      stream.on("error", (err) => {
        console.error("Read Error:", err);
        writeStream.destroy(err);
      });

      writeStream.on("error", (err) => {
        console.error("Write Error:", err);
        stream.destroy(err);
      });

      writeStream.on("close", async () => {
        console.log("WriteStream closed");
        console.log("drive running");
        if (responseSent) return;
        if (rootDir.size + size > maxStorage)
          return res
            .status(403)
            .json({ error: "you have reached your max limit!" });

        await File.insertOne({
          _id: fileId,
          extension,
          size,
          name: filename,
          parentDirId: GdriveDir._id,
          userId: req.user._id,
          createdAt: new Date().toLocaleString(),
          updatedAt: new Date().toLocaleString(),
          sharing: {
            shareToken: crypto.randomUUID(),
          },
          path: [rootDir._id, GdriveDir._id],
        });
        let parentFolderId = GdriveDir._id;
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
            { $inc: { size, numOfFiles: 1 } },
          );
        }
      });

      // await pipeline(driveResponse.body, writeStream);
      // const fileStream = driveResponse.body;
      // for await (const chunk of fileStream) {
      //   // console.log(chunk.toString()); // Buffer chunk
      //   writeStream.write(chunk);
      // }
    }),
  );
  return res.json({ message: "success" });
};

export const getAllUsers = async (req, res, next) => {
  const usersData = await getUsers(false);
  return res.json(usersData);
};

export const getDeletedUsers = async (req, res, next) => {
  const usersData = await getUsers(true);
  return res.json(usersData);
};

export const logoutUser = async (req, res) => {
  const { userId } = req.params;
  const sessions = await redisClient.ft.search(
    "userIdIdx",
    `@userId:{${userId}}`,
  );
  const userIdArr = sessions.documents.map(({ id }) => id);
  await redisClient.del(userIdArr);
  return res.json({ message: "successfull" });
};

export const deleteUser = async (req, res, next) => {
  const { userId } = req.params;

  console.log(userId);
  try {
    const sessions = await redisClient.ft.search(
      "userIdIdx",
      `@userId:{${userId}}`,
    );
    console.log(sessions);
    if (sessions.documents.length) {
      const userIdArr = sessions.documents.map(({ id }) => id);
      await redisClient.del(userIdArr);
    }
    await User.findByIdAndUpdate(userId, { deleted: true });
    return res.json({ message: "success" });
  } catch (err) {
    next(err);
  }
};

export const recoverUser = async (req, res, next) => {
  const { userId } = req.params;
  try {
    await User.findByIdAndUpdate(userId, { deleted: false });
    return res.json({ message: "success" });
  } catch (err) {
    next(err);
  }
};
export const hardDeleteUser = async (req, res, next) => {
  const { userId } = req.params;
  console.log(userId);
  if (!ObjectId.isValid(userId)) {
    return res.status(400).json({ error: `Invalid ID` });
  }
  const session = await mongoose.startSession();
  try {
    const files = await File.find({ userId }).select("_id extension");
    console.log(files);
    files.forEach(async ({ _id, extension }) => {
      await rm(
        `${import.meta.dirname}/../storage/${_id.toString()}${extension}`,
      );
    });
    session.startTransaction();
    await User.deleteOne({ _id: userId }, { session });
    await Directory.deleteMany({ userId }, { session });
    await File.deleteMany({ userId }, { session });

    session.commitTransaction();
    return res.json({ message: "success" });
  } catch (err) {
    session.abortTransaction();
    next(err);
  }
};

export const roleChanger = async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { role });
    return res.json({ message: "success" });
  } catch (err) {
    next(err);
  }
};

export const userDirectory = async (req, res, next) => {
  const { dirId } = req.query;
  const { userId } = req.body;
  console.log(userId);
  if (dirId) {
    const dirData = await getDirectoryData(dirId, userId);
    console.log(dirData);
    return res.json(dirData);
  }
  if (userId) {
    const user = await User.findById(userId).select("rootDirId").lean();
    if (!user) return res.status(404).json({ error: "Invalid credentials!" });
    const id = user.rootDirId;
    const dirData = await getDirectoryData(id, userId);
    return res.json(dirData);
  }
};
