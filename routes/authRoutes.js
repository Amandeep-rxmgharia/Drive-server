import express from 'express'
import {  GDriveAuthCodeGenerator, GDriveFileProvider, githubLogin, githubLoginCallback, googleLogin, OTPSender, OTPVerifier, sessionCookieProvider } from '../controllers/userController.js'
import { IPRateLimiter } from '../middlewares/rateLimiter.js'

const router = express.Router()

router.post('/sendOtp',IPRateLimiter(5, 300000),OTPSender)
router.post('/verify-otp',OTPVerifier)
router.post("/google",IPRateLimiter(5, 300000),googleLogin)
router.get("/github",IPRateLimiter(5, 300000),githubLogin)
router.get("/github/callback",githubLoginCallback)
router.post("/session",sessionCookieProvider)
router.get("/Gdrive",GDriveAuthCodeGenerator)
router.get("/Gdrive/callback",GDriveFileProvider)
export default router