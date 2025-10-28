import { IGroup, IUser } from '../types/models';
import { GroupResponseDTO } from '../dto/response/GroupResponseDTO';
import { UserResponseDTO } from '../dto/response/UserResponseDTO';

/**
 * A utility class to map database models to Data Transfer Objects (DTOs).
 * This ensures that we only expose the fields we want to the client.
 */
export class DTOMapper {
  /**
   * Maps an IUser model instance to a UserResponseDTO.
   * @param user - The Mongoose user document.
   * @returns A DTO safe to send to the client.
   */
  public static toUserResponseDTO(user: IUser): UserResponseDTO {
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
  public static toGroupResponseDTO(group: IGroup): GroupResponseDTO {
    const leaderDTO =
      group.leader && (group.leader as unknown as IUser).username
        ? DTOMapper.toUserResponseDTO(group.leader as unknown as IUser)
        : null;

    return {
      id: group._id.toString(),
      name: group.name,
      leader: leaderDTO,
      status: group.status,
      createdAt: group.createdAt.toISOString(),
    };
  }
}
