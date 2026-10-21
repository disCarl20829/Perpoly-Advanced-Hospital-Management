import express from 'express';
import * as inventoryController from './controller.js.js';
import authenticate from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/rbac.middleware.js';

const router = express.Router();

// All inventory routes require authentication and inventory_staff or superadmin role
router.use(authenticate, authorize('inventory_staff', 'superadmin'));

// Material types
router.post('/material-types', inventoryController.createMaterialType);
router.get('/material-types', inventoryController.getAllMaterialTypes);

// Materials
router.post('/materials', inventoryController.createMaterial);
router.get('/materials', inventoryController.getAllMaterials);
router.get('/materials/:id', inventoryController.getMaterialById);
router.put('/materials/:id', inventoryController.updateMaterial);

// Stock movements
router.post('/stock-movements', inventoryController.recordStockMovement);
router.get('/stock-movements', inventoryController.getAllStockMovements);
router.get('/materials/:id/stock-movements', inventoryController.getStockMovementsByMaterial);

// Stock receipts (OCR)
router.post('/stock-receipts', inventoryController.createStockReceiptOcr);
router.get('/stock-receipts', inventoryController.getAllStockReceiptsOcr);
router.get('/stock-receipts/:id', inventoryController.getStockReceiptOcrById);
router.put('/stock-receipts/:id/confirm', inventoryController.confirmStockReceipt);
router.put('/stock-receipts/:id/mismatch', inventoryController.flagStockReceiptMismatch);

// Stock status / alerts
router.get('/stock-status', inventoryController.getStockStatus);
router.get('/incoming-stock', inventoryController.getIncomingStock);

export default router;
