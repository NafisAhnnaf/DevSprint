import { addAdmin, deleteAdmin, getAdminAccess, getAdminByUserId, getAllAdmins } from "../controllers/admin.controller.js";
import { Router } from "express";
import { adminGuard } from "../middlewares/auth.middleware.js";

const router = Router();

router.post('/add/:userId', addAdmin) //Add adminGuard after adding an Admin to db.
router.delete('/:id', adminGuard, deleteAdmin);
router.get('/:userId', getAdminByUserId);
router.get('/', adminGuard, getAllAdmins);
router.get('/me', adminGuard, getAdminAccess);

export default router;