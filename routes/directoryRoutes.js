import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";

import {
  createDirectory,
  deleteDirectory,
  getDirectory,
  renameDirectory,
} from "../controllers/directoryController.js";
import { sessionRateLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);

router.get("/:id?",sessionRateLimiter(150,60000), getDirectory);

router.post("/:parentDirId?", createDirectory);
router.patch("/:id", renameDirectory);

router.delete("/:id", deleteDirectory);

export default router;
