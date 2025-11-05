"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = __importDefault(require("../controllers/admin.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.protect, admin_middleware_1.admin);
router.get('/users', admin_controller_1.default.getAllUsers.bind(admin_controller_1.default));
router.get('/groups/pending/count', admin_controller_1.default.getPendingGroupCount.bind(admin_controller_1.default));
router.get('/groups/pending', admin_controller_1.default.getPendingGroups.bind(admin_controller_1.default));
router.patch('/groups/:id/approve', admin_controller_1.default.approveGroup.bind(admin_controller_1.default));
router.patch('/groups/:id/reject', admin_controller_1.default.rejectGroup.bind(admin_controller_1.default));
exports.default = router;
