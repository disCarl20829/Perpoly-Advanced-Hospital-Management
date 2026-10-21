import express from 'express';
import * as labController from './controller.js.js';
import authenticate from '../../middleware/auth.middleware.js';
import authorize from '../../middleware/rbac.middleware.js';

const router = express.Router();

// All laboratory routes require authentication
router.use(authenticate);

// Laboratories (any authenticated user can view)
router.get('/laboratories', labController.getAllLaboratories);
router.get('/laboratories/:id', labController.getLaboratoryById);

// Lab material defaults (doctor, lab_tech, superadmin)
router.get('/laboratories/:laboratory_id/defaults', authorize('doctor', 'lab_tech', 'superadmin'), labController.getLabMaterialDefaults);
router.put('/laboratories/:laboratory_id/defaults/:material_id', authorize('doctor', 'lab_tech', 'superadmin'), labController.upsertLabMaterialDefault);
router.delete('/laboratories/:laboratory_id/defaults/:material_id', authorize('doctor', 'lab_tech', 'superadmin'), labController.deleteLabMaterialDefault);

// Lab results (doctor, lab_tech, superadmin)
router.post('/results', authorize('doctor', 'lab_tech', 'superadmin'), labController.createLabResult);
router.get('/laboratories/:laboratory_id/results', authorize('doctor', 'lab_tech', 'superadmin'), labController.getLabResultsByLaboratory);
router.get('/doctors/:doctor_id/results', authorize('doctor', 'lab_tech', 'superadmin'), labController.getLabResultsByDoctor);
router.get('/results/:id', authorize('doctor', 'lab_tech', 'superadmin'), labController.getLabResultById);

// Pending transactions (doctor, lab_tech, superadmin)
router.get('/laboratories/:laboratory_id/pending', authorize('doctor', 'lab_tech', 'superadmin'), labController.getPendingTransactions);

export default router;
