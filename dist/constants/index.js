"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpStatus = exports.GroupStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["User"] = "USER";
    Role["Leader"] = "LEADER";
    Role["Admin"] = "ADMIN";
})(Role || (exports.Role = Role = {}));
var GroupStatus;
(function (GroupStatus) {
    GroupStatus["Pending"] = "PENDING";
    GroupStatus["Approved"] = "APPROVED";
    GroupStatus["Rejected"] = "REJECTED";
})(GroupStatus || (exports.GroupStatus = GroupStatus = {}));
var HttpStatus;
(function (HttpStatus) {
    // Success
    HttpStatus[HttpStatus["OK"] = 200] = "OK";
    HttpStatus[HttpStatus["CREATED"] = 201] = "CREATED";
    HttpStatus[HttpStatus["NO_CONTENT"] = 204] = "NO_CONTENT";
    // Client Errors
    HttpStatus[HttpStatus["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    HttpStatus[HttpStatus["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    HttpStatus[HttpStatus["FORBIDDEN"] = 403] = "FORBIDDEN";
    HttpStatus[HttpStatus["NOT_FOUND"] = 404] = "NOT_FOUND";
    HttpStatus[HttpStatus["CONFLICT"] = 409] = "CONFLICT";
    HttpStatus[HttpStatus["UNPROCESSABLE_ENTITY"] = 422] = "UNPROCESSABLE_ENTITY";
    HttpStatus[HttpStatus["TOO_MANY_REQUESTS"] = 429] = "TOO_MANY_REQUESTS";
    // Server Errors
    HttpStatus[HttpStatus["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    HttpStatus[HttpStatus["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
})(HttpStatus || (exports.HttpStatus = HttpStatus = {}));
