import mongoose, { Schema } from 'mongoose'
import { StudySessionMode, StudySessionStatus } from '../types'

const StudySessionParticipantSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    role: { type: String, enum: ['host', 'participant', 'observer'], default: 'participant' }
})

const StudySessionSchema = new Schema({
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    mode: { type: String, enum: Object.values(StudySessionMode), required: true },
    status: { type: String, enum: Object.values(StudySessionStatus), default: StudySessionStatus.Upcoming },
    startTime: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    problems: [{ type: Schema.Types.ObjectId, ref: 'Problem' }],
    participants: { type: [StudySessionParticipantSchema], default: [] },
    chatEnabled: { type: Boolean, default: true },
    voiceEnabled: { type: Boolean, default: false },
    currentTurnUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    turnStartedAt: { type: Date }
}, { timestamps: true })

export const StudySessionModel = mongoose.model('StudySession', StudySessionSchema)
