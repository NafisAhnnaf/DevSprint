import { Router } from "express";
import { StockController } from "../controllers/stock.controller.js";
const router = Router();

router.get('/date/:forDate', StockController.getStocksByDate);
router.get('/:id', StockController.getStockById);
router.get('/', StockController.getTodaysStockQty);
router.post('/', StockController.createStock);
router.delete('/date/:forDate', StockController.deleteStocksByDate);
router.delete('/:id', StockController.deleteStockById);

export default router;