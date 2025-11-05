import express from 'express';
import groupController from '../controllers/group.controller';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { createGroupSchema } from '../validators/group.validator';

const router = express.Router();

router.route('/').get(groupController.getAllGroups.bind(groupController)).post(protect, validateRequest(createGroupSchema), groupController.createGroup.bind(groupController));

router.route('/my-groups').get(protect, groupController.getMyGroups.bind(groupController));
router.route('/my-groups/pending').get(protect, groupController.getMyPendingGroups.bind(groupController));

router.route('/:groupId').get(groupController.getGroupById.bind(groupController));

router.route('/:groupId/members/:userId').get(protect, groupController.isUserInGroup.bind(groupController));

router.route('/:groupId/join').post(protect, groupController.joinGroup.bind(groupController));

router.route('/:groupId/leave').post(protect, groupController.leaveGroup.bind(groupController));

export default router;
