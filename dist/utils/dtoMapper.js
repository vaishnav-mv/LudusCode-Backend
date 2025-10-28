"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DTOMapper = void 0;
/**
 * A utility class to map database models to Data Transfer Objects (DTOs).
 * This ensures that we only expose the fields we want to the client.
 */
class DTOMapper {
    /**
     * Maps an IUser model instance to a UserResponseDTO.
     * @param user - The Mongoose user document.
     * @returns A DTO safe to send to the client.
     */
    static toUserResponseDTO(user) {
        return {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
        };
    }
    /**
     * Maps an IGroup model instance to a GroupResponseDTO.
     * @param group - The Mongoose group document.
     * @returns A DTO safe to send to the client.
     */
    static toGroupResponseDTO(group) {
        // Check if leader is populated
        // FIX: Safely cast populated leader field to IUser to create the DTO
        const leaderDTO = group.leader && group.leader.username
            ? DTOMapper.toUserResponseDTO(group.leader)
            : null;
        return {
            id: group._id.toString(),
            name: group.name,
            //// @ts-expect-error allow nullable leader until population ensured
            leader: leaderDTO,
            status: group.status,
            createdAt: group.createdAt.toISOString(),
        };
    }
}
exports.DTOMapper = DTOMapper;
