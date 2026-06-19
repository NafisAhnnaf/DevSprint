import { Router } from "express";
import { OrderController } from "../controllers/order.controller.js";
const router = Router();

router.post('/', OrderController.createOrder);
router.get('/user', OrderController.getOrderByUser);
router.put('/:id', OrderController.cancelOrder);
router.get('/:id', OrderController.getOrderById);
router.get('/', OrderController.getAllOrders);
router.delete('/:id', OrderController.deleteOrder);


export default router;