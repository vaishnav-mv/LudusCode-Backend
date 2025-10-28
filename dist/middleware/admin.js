"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = void 0;
const constants_1 = require("../constants");
const admin = (req, res, next) => {
    if (req.user && req.user.role === constants_1.Role.Admin) {
        next();
    }
    else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};
exports.admin = admin;
