import { model, Schema } from "mongoose";

const permissionSchema = new Schema({
  user: {
    type: String,
    ref: "User",
  },

  role: {
    type: String,
    enum: ["viewer","editor"],
    default: "viewer",
  },
});

const fileSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    parentDirId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
    },
    sharing: {
      // type: Schema.Types.Mixed,
      default: {},
      access: {
        type: String,
        enum: ["restricted", "anyone"],
        default: "restricted",
      },
      shareToken: {
        type: String,
        default: null,
        unique: true
      },
      expiresAt: {
        type: Schema.Types.Date,
        default: null,
        // expires: 600,
      },
    },
    permissions: [permissionSchema],
    createdAt: {
      type: Schema.Types.String,
      required: true
    },
    updatedAt: {
      type: Schema.Types.String,
      required: true
    },
    size: {
      type: Schema.Types.BigInt,
      required: true
    },
    path: {
      type: Schema.Types.Array,
      required: true,
      ref: "Directory"
    },
    isUploading: {
      type: Boolean
    }
  },
  {
    strict: "throw",
    timestamps: true
  },
);

const File = model("File", fileSchema);
export default File;
