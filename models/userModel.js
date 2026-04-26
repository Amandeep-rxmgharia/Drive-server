import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      minLength: [
        3,
        "name field should a string with at least three characters",
      ],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/,
        "please enter a valid email",
      ],
    },
    password: {
      type: String,
       required: function () {
      return this.provider ? false : true
      // agar couponCode nahi hai to discountPercent required hoga
    },
      minLength: 4,
    },
    provider: {
      type: String,
      default: null
    },
    profilePic: {
      type: String,
      default: 'https://cdn.pixabay.com/photo/2022/09/06/20/31/profile-pic-7437435_1280.png'
    },
    rootDirId: {
      type: Schema.Types.ObjectId,
      ref: "Directory",
    },
    role: {
      type: String,
      enum: ["Admin","Manager","User","Owner"],
      default: "User",
      required: true
    },
    deleted: {
      type: Boolean,
      default: false
    },
    maxStorageInBytes: {
      type: Schema.Types.BigInt,
      required: true,
      default: 1 * 1024 ** 3
    }
  },
  {
    strict: "throw",
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = model("User", userSchema);

export default User;
