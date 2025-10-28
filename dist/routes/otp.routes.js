"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const otp_controller_1 = __importDefault(require("../controllers/otp.controller"));
const router = (0, express_1.Router)();
// OTP routes
router.post('/send', otp_controller_1.default.sendOtp);
router.post('/verify', otp_controller_1.default.verifyOtp);
exports.default = router;
