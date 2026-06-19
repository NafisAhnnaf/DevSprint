import { Router } from "express";
import { deleteAllUsers, getUser } from "../controllers/user.controller.js";

const router = Router();
router.get('/:id', getUser);
router.delete('/', deleteAllUsers);

export default router;