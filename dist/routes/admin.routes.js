"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = __importDefault(require("../controllers/admin.controller"));
// FIX: Correct middleware import paths
const auth_middleware_1 = require("../middleware/auth.middleware");
const admin_middleware_1 = require("../middleware/admin.middleware");
const cache_middleware_1 = require("../middleware/cache.middleware");
const router = express_1.default.Router();
// All routes in this file are protected and require admin access
router.use(auth_middleware_1.protect, admin_middleware_1.admin);
router.get('/users', cache_middleware_1.cacheMiddleware, admin_controller_1.default.getAllUsers.bind(admin_controller_1.default));
router.get('/groups/pending', admin_controller_1.default.getPendingGroups.bind(admin_controller_1.default));
router.patch('/groups/:id/approve', admin_controller_1.default.approveGroup.bind(admin_controller_1.default));
router.patch('/groups/:id/reject', admin_controller_1.default.rejectGroup.bind(admin_controller_1.default));
exports.default = router;
