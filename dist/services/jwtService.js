"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tsyringe_1 = require("tsyringe");
const config_1 = __importDefault(require("../config"));
let JwtService = class JwtService {
    constructor() {
        this._accessTokenOptions = {
            expiresIn: config_1.default.jwt.expiresIn,
            algorithm: 'HS256',
        };
        this._refreshTokenOptions = {
            expiresIn: config_1.default.jwt.refreshExpiresIn,
            algorithm: 'HS256',
        };
    }
    generateAccessToken(userId, role) {
        const payload = { id: userId };
        if (role)
            payload.role = role;
        return jsonwebtoken_1.default.sign(payload, config_1.default.jwt.secret, this._accessTokenOptions);
    }
    generateRefreshToken(userId, role) {
        const payload = { id: userId };
        if (role)
            payload.role = role;
        return jsonwebtoken_1.default.sign(payload, config_1.default.jwt.refreshSecret, this._refreshTokenOptions);
    }
    verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        }
        catch {
            throw new Error('Invalid or expired access token');
        }
    }
    verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, config_1.default.jwt.refreshSecret);
        }
        catch {
            throw new Error('Invalid or expired refresh token');
        }
    }
};
exports.JwtService = JwtService;
exports.JwtService = JwtService = __decorate([
    (0, tsyringe_1.injectable)()
], JwtService);
