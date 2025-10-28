"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const index_1 = __importDefault(require("./index"));
const logger_1 = __importDefault(require("../utils/logger"));
// Create a transporter object using SMTP transport
const transporter = nodemailer_1.default.createTransport({
    host: index_1.default.emailHost,
    port: index_1.default.emailPort,
    secure: index_1.default.emailSecure, // true for 465, false for other ports
    auth: {
        user: index_1.default.emailUser,
        pass: index_1.default.emailPassword,
    },
});
// Verify connection configuration
transporter.verify((error) => {
    if (error) {
        logger_1.default.error('Email service error:', error);
    }
    else {
        logger_1.default.info('Email service is ready to send messages');
    }
});
exports.default = transporter;
