import { UserResponseDTO } from './user.response.dto';
import { StudySessionStatus } from '../../types';

export interface StudySessionParticipantDTO {
    user: UserResponseDTO | string;
    joinedAt: string;
    role: string;
}

export interface StudySessionResponseDTO {
    id: string;
    groupId: string;
    title: string;
    description: string;
    status: StudySessionStatus;
    startTime: string;
    durationMinutes: number;
    problems: string[];
    participants: StudySessionParticipantDTO[];
    chatEnabled: boolean;
    voiceEnabled: boolean;
}
