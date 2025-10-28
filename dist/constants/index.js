"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupStatus = exports.Role = void 0;
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
