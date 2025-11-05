"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
require("reflect-metadata");
require("./di");
const constants_1 = require("./constants");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const group_routes_1 = __importDefault(require("./routes/group.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const AppError_1 = __importDefault(require("./utils/AppError"));
const logger_1 = __importDefault(require("./utils/logger"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app = (0, express_1.default)();
app.use((0, cookie_parser_1.default)());
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
const requestLogger = (req, res, next) => {
    logger_1.default.info(`${req.method} ${req.originalUrl}`);
    next();
};
app.use(requestLogger);
// API Routes
app.get('/api', (req, res) => {
    res.status(constants_1.HttpStatus.OK).json({
        success: true,
        message: 'LudusCode API is running...',
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        },
        statusCode: constants_1.HttpStatus.OK
    });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/groups', group_routes_1.default);
// Handle 404 errors
app.all('*', (req, res, next) => {
    next(new AppError_1.default(`Can't find ${req.originalUrl} on this server!`, constants_1.HttpStatus.NOT_FOUND));
});
// Global error handling middleware
app.use(error_middleware_1.errorHandler);
exports.default = app;
