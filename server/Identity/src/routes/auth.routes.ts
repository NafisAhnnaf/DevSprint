import { Router } from "express";
import { loginUser, getStatus, registerUser } from "../controllers/auth.controller.js";
import { loginLimiter } from "../middlewares/rate-limit.middleware.js";

const router = Router();
router.get('/', getStatus);
router.post('/login', loginLimiter, loginUser);
router.post('/register', registerUser);

export default router;