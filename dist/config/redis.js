"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const index_1 = __importDefault(require("./index"));
const logger_1 = __importDefault(require("../utils/logger"));
const redisClient = (0, redis_1.createClient)({
    url: index_1.default.redisUrl,
});
redisClient.on('error', (err) => logger_1.default.error('Redis Client Error', err));
exports.default = redisClient;
