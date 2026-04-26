import mongoose, { Types } from "mongoose";
import Directory from "../models/directoryModel.js";
import User from "../models/userModel.js";

export default  async function(userId,userData,res,next) {
    const { email, name,provider,picture,password } = userData;
    const session = await mongoose.startSession();

    try {
      const rootDirId = new Types.ObjectId();
      if(!userId) {
          userId = new Types.ObjectId();

      } 
      const user = await User.findOne({email})
      if(user && user.deleted) {
        return res.status(404).json({error: "you can't login using this email"})
      }
      console.log("running")
      session.startTransaction();

    await Directory.insertOne(
        {
          _id: rootDirId,
          name: `My Drive`,
          parentDirId: null,
          userId,
          createdAt: new Date().toLocaleString(),
          updatedAt: new Date().toLocaleString()
        },
        { session },
      );

        if(provider) {

            await User.insertOne(
               {
                 _id: userId,
                 name,
                 email,
                 provider,
                 rootDirId,
                 profilePic: picture ? picture : 'https://cdn.pixabay.com/photo/2022/09/06/20/31/profile-pic-7437435_1280.png'
               },
               { session },
             );
        }
        else {
 await User.insertOne(
      {
        _id: userId,
        name,
        email,
        password,
        rootDirId,
      },
      { session },
    );
        }
      session.commitTransaction();
      return userId
    } catch (err) {
      session.abortTransaction();
      console.log(err);
      if (err.code === 121) {
        return {error: err.code,message: err}
      } else if (err.code === 11000) {
        if (err.keyValue.email) {
          console.log("running this")
          return {error: err.code}
        }
      } else {
        next(err);
      }
    }
    Number
}