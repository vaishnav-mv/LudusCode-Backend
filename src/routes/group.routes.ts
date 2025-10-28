import express from 'express';
import groupController from '../controllers/group.controller';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createGroupSchema } from '../validators/group.validator';

const router = express.Router();

router.route('/').post(protect, validateRequest(createGroupSchema), groupController.createGroup.bind(groupController));

router.route('/my-groups').get(protect, groupController.getMyGroups.bind(groupController));

export default router;
