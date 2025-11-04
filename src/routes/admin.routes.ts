import express from 'express';
import adminController from '../controllers/admin.controller';
import { protect } from '../middleware/auth.middleware';
import { admin } from '../middleware/admin.middleware';

const router = express.Router();


router.use(protect, admin);

router.get('/users', adminController.getAllUsers.bind(adminController));
router.get('/groups/pending/count', adminController.getPendingGroupCount.bind(adminController));
router.get('/groups/pending', adminController.getPendingGroups.bind(adminController));
router.patch('/groups/:id/approve', adminController.approveGroup.bind(adminController));
router.patch('/groups/:id/reject', adminController.rejectGroup.bind(adminController));

export default router;
