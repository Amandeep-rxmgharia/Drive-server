import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import {
  deleteFile,
  deleteUserFromFileSharingConfig,
  getFile,
  getFileSharingConfig,
  renameFile,
  setFileSharingConfig,
  uploadInitiate,
} from "../controllers/fileController.js";
import { fileAuth } from "../middlewares/fileAuth.js";
import { checkShareToken } from "../middlewares/checkShareToken.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);
router.get("/:id", fileAuth, getFile);
router.get("/sharing-conf/:id", checkShareToken, getFileSharingConfig);
router.delete("/sharing-conf/:id", deleteUserFromFileSharingConfig);
router.post("/sharing-conf/:id", setFileSharingConfig);
router.post("/uploads/initiate",uploadInitiate)
router.patch("/:id", renameFile);
router.delete("/:id", deleteFile);

export default router;
