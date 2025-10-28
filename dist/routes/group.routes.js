"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const group_controller_1 = __importDefault(require("../controllers/group.controller"));
// FIX: Correct middleware import path
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const group_validator_1 = require("../validators/group.validator");
const router = express_1.default.Router();
router.route('/').post(auth_middleware_1.protect, (0, validation_middleware_1.validateRequest)(group_validator_1.createGroupSchema), group_controller_1.default.createGroup.bind(group_controller_1.default));
router.route('/my-groups').get(auth_middleware_1.protect, group_controller_1.default.getMyGroups.bind(group_controller_1.default));
exports.default = router;
