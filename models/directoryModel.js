import { model, Schema } from "mongoose";
import { required } from "zod/mini";

const directorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    parentDirId: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: "Directory",
    },
    createdAt: {
      type: Schema.Types.String,
      required: true,
    },
    updatedAt: {
      type: Schema.Types.String,
      required: true,
    },
    size: {
      type: Schema.Types.BigInt,
      default: 0
    },
    path: [
    {
      type: Schema.Types.ObjectId,
      ref: "Directory",
      default: []
    }
  ],
    numOfFiles: {
      type: Number,
      default: 0
    },
    numOfFolders: {
      type: Number,
      default: 0
    }
  },
  {
    strict: "throw",
  },
);

const Directory = model("Directory", directorySchema);

export default Directory;
