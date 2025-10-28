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
require("./di"); // Initialize dependency injection container
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const group_routes_1 = __importDefault(require("./routes/group.routes"));
const otp_routes_1 = __importDefault(require("./routes/otp.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const AppError_1 = __importDefault(require("./utils/AppError"));
const logger_1 = __importDefault(require("./utils/logger"));
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
// Request logger middleware
// FIX: Correctly type the middleware function to resolve type errors on req properties
const requestLogger = (req, res, next) => {
    logger_1.default.info(`${req.method} ${req.originalUrl}`);
    next();
};
app.use(requestLogger);
// API Routes
app.get('/api', (req, res) => {
    res.send('LudusCode API is running...');
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/groups', group_routes_1.default);
app.use('/api/otp', otp_routes_1.default);
// Handle 404 errors
app.all('*', (req, res, next) => {
    next(new AppError_1.default(`Can't find ${req.originalUrl} on this server!`, 404));
});
// Global error handling middleware
app.use(error_middleware_1.errorHandler);
exports.default = app;
