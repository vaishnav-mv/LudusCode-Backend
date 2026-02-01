import { UserResponseDTO } from './user.response.dto'

export interface ChatMessageResponseDTO {
    id: string
    user: UserResponseDTO | null
    text: string
    timestamp: string
}
