import nodemailer from "nodemailer";
import OTP from "../models/otpModel.js";
import { verifyEmail } from "../validators/authSchema.js";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  auth: {
    user: "aman9251813@gmail.com",
    pass: "iegf vcmf yftv aofy",
  },
});

export async function sendOtp(email) {
 const {success,data} = verifyEmail.safeParse(email)
 if(!success) return {success: false,message: "invalid credentials"}
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const html = `
    <div style="font-family:sans-serif;">
      <h2>Your OTP is: ${otp}</h2>
      <p>This OTP is valid for 10 minutes.</p>
    </div>
  `;
 try {
   await transporter.sendMail({
    from: '"Storage App" <aman9251813@gmail.com>',
    to: data,
    subject: "Storage App OTP",
    html,
  });
  console.log("sent!")
  await OTP.findOneAndUpdate(
    { email:data },
    { otp, createdAt: new Date() },
    { upsert: true, new: true },
  );

  return { success: true, message: "OTP sent successfully" };
 }catch(err) {
  return {success: false,message: "email Does'nt exist"}
 }
}
