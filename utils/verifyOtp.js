import z from "zod/v4";
import OTP from "../models/otpModel.js";
import { OTPSchema } from "../validators/authSchema.js";

export default async function (email, otp) {
  const verify = OTPSchema.safeParse({ email, otp });
  if (!verify.success)
    return { success: false, error: z.flattenError(verify.error).fieldErrors };
  const found = await OTP.findOne({ email, otp }).lean();
  console.log(found);
  if (found) return { success: true, data: found };
  return { success: false, error: "invalid credentials!" };
}
