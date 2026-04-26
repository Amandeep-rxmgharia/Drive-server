import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  deleteUser,
  driveFileDownloader,
  getAllUsers,
  getCurrentUser,
  getDeletedUsers,
  hardDeleteUser,
  login,
  logout,
  logoutAll,
  logoutUser,
  recoverUser,
  register,
  roleChanger,
  userDirectory,
} from "../controllers/userController.js";
import { checkNotUser } from "../middlewares/checkNotUser.js";
import { basicUserCheck } from "../middlewares/basicUserCheck.js";
import {
  userHardDeleteValidation,
  userSoftDeleteValidation,
} from "../middlewares/userDeleteValidation.js";
import { checkOnlyOwner } from "../middlewares/checkOnlyOwner.js";
import { roleChangeUserValidation } from "../middlewares/roleChangeUserValidation.js";
import { checkNotUserManager } from "../middlewares/checkNotUserManager.js";
import { getFile } from "../controllers/fileController.js";
import { IPRateLimiter } from "../middlewares/rateLimiter.js";
import throttle from "../middlewares/throttle.js";

const router = express.Router();

router.post("/user/register", IPRateLimiter(5, 600000),throttle(1500), register);

router.post("/user/login", IPRateLimiter(5, 300000),throttle(1500), login);

router.get("/user", checkAuth, getCurrentUser);

router.post("/user/logout", logout);
router.post("/user/logout-all", logoutAll);
router.post("/user/drive/download", checkAuth, driveFileDownloader);
router.get("/users", checkAuth, checkNotUser, getAllUsers);
router.post(
  "/users/get-user-content",
  checkAuth,
  checkNotUserManager,
  userDirectory,
);
router.get("/users/get-file/:id", checkAuth, checkNotUserManager, getFile);
router.post("/:userId/logout", checkAuth, basicUserCheck, logoutUser);
router.post("/:userId/recover", checkAuth, checkOnlyOwner, recoverUser);
router.delete(
  "/:userId",
  checkAuth,
  basicUserCheck,
  userSoftDeleteValidation,
  deleteUser,
);
router.delete(
  "/:userId/hard",
  checkAuth,
  basicUserCheck,
  userHardDeleteValidation,
  hardDeleteUser,
);
router.get("/deleted-users", checkAuth, checkOnlyOwner, getDeletedUsers);
router.post(
  "/:userId/role-change",
  checkAuth,
  basicUserCheck,
  roleChangeUserValidation,
  roleChanger,
);
export default router;
