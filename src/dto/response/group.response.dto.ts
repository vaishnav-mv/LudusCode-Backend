import { UserResponseDTO } from './user.response.dto'

export interface GroupResponseDTO {
    id: string
    name: string
    description: string
    isPrivate: boolean
    topics: string[]
    members: UserResponseDTO[]
    pendingMembers: UserResponseDTO[]
    blockedMembers: UserResponseDTO[]
    ownerId: string
}
