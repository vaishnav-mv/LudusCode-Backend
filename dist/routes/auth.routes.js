"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = __importDefault(require("../controllers/auth.controller"));
// FIX: Correct middleware import path
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_validator_1 = require("../validators/auth.validator");
const router = express_1.default.Router();
router.post('/register', (0, validation_middleware_1.validateRequest)(auth_validator_1.registerSchema), auth_controller_1.default.registerUser.bind(auth_controller_1.default));
router.post('/login', (0, validation_middleware_1.validateRequest)(auth_validator_1.loginSchema), auth_controller_1.default.loginUser.bind(auth_controller_1.default));
router.post('/verify-otp', (0, validation_middleware_1.validateRequest)(auth_validator_1.otpSchema), auth_controller_1.default.verifyUserOTP.bind(auth_controller_1.default));
router.post('/forgot-password', auth_controller_1.default.forgotPassword.bind(auth_controller_1.default));
router.get('/profile', auth_middleware_1.protect, auth_controller_1.default.getUserProfile.bind(auth_controller_1.default));
exports.default = router;
