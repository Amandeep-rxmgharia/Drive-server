import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import directoryRoutes from "./routes/directoryRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import checkAuth from "./middlewares/authMiddleware.js";
import authRoutes from './routes/authRoutes.js'
import sharedFileRoutes from './routes/sharedFileRoutes.js'
import { connectDB } from "./config/db.js";
import { uploadComplete, uploadInitiate } from "./controllers/fileController.js";
const mySecretKey = process.env.SECRET_KEY;

await connectDB();

const app = express();
app.use(cookieParser(mySecretKey));
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    exposedHeaders: ["user-role","file-name"]
  })
);

app.use("/directory", checkAuth, directoryRoutes);
app.use("/file", checkAuth, fileRoutes);
app.use("/auth",authRoutes)
app.use("/uploads/initiate",checkAuth,uploadInitiate)
app.use("/uploads/complete",checkAuth,uploadComplete)
app.use("/shared-file",sharedFileRoutes)
app.use("/", userRoutes);

app.use((err, req, res, next) => {
  console.log(err.errorResponse ? err.errorResponse.errInfo.details.schemaRulesNotSatisfied[0].propertiesNotSatisfied[0].details : err);
  console.log('runnig error');
  res.status(err.status || 500).json({ error: "Something went wrong!" });
});

app.listen(process.env.PORT, () => {
  console.log(`Server Started`);
});
