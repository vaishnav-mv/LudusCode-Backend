"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const User_1 = __importDefault(require("./models/User"));
const constants_1 = require("./constants");
const logger_1 = __importDefault(require("./utils/logger"));
const redis_1 = __importDefault(require("./config/redis"));
const PORT = process.env.PORT || 5000;
const seedAdminUser = async () => {
    try {
        const adminExists = await User_1.default.findOne({ role: constants_1.Role.Admin });
        if (!adminExists) {
            const admin = new User_1.default({
                username: 'admin',
                name: 'Admin',
                email: 'admin@ludus.code',
                password: 'adminpassword',
                role: constants_1.Role.Admin,
                isVerified: true,
            });
            await admin.save();
            logger_1.default.info('Default admin user created.');
        }
    }
    catch (error) {
        logger_1.default.error('Error seeding admin user:', error);
    }
};
const startServer = async () => {
    try {
        await redis_1.default.connect();
        logger_1.default.info('Redis connected successfully');
        await mongoose_1.default.connect(config_1.default.mongoUri);
        logger_1.default.info('MongoDB connected successfully');
        app_1.default.listen(PORT, () => {
            logger_1.default.info(`Server is running on port ${PORT}`);
            // Seed the database with a default admin user
            seedAdminUser();
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start the server:', error);
        process.exit(1);
    }
};
startServer();
