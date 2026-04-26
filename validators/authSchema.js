import { z } from "zod/v4";

export const OTPSchema = z.object({
  email: z.email("Please enter valid email!"),
  otp: z.string("Please enter valid 4 digit otp").regex(/^\d{4}$/, "Please enter valid otp!"),
});

export const verifyEmail = z.email("please enter valid email!")

export const loginSchema = z.object({
  email: z.email("Please enter valid email!"),
  password: z.string().min(4, "Please enter valid password"),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(3, "name field should a string with at least three characters"),
});


export const tokenSchema = z.string().length(36,"enter valid token")
