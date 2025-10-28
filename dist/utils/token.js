"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const generateToken = (id) => {
    // FIX: Explicitly type the options to prevent incorrect overload resolution.
    const options = {
        expiresIn: config_1.default.jwt.expiresIn,
    };
    return jsonwebtoken_1.default.sign({ id: id.toString() }, config_1.default.jwt.secret, options);
};
exports.generateToken = generateToken;
