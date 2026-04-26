import express from "express";
import { fileSharingAuth } from "../middlewares/fileSharingAuth.js";
import { getSharedFile } from "../controllers/fileController.js";

const router = express.Router();

router.get("/:token", fileSharingAuth, getSharedFile);

export default router;
