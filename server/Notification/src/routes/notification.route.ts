import { Router } from "express";
import { registerOrderStream } from "../controllers/notification.controller.js";

const router = Router();


router.get('/orders', registerOrderStream);

export default router;