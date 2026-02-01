import mongoose, { Schema } from 'mongoose'

const DuelPlayerSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  warnings: { type: Number, default: 0 }
})

const DuelSubmissionSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String },
  userCode: { type: String },
  executionTime: { type: Number },
  memoryUsage: { type: Number },
  attempts: { type: Number },
  codeHash: { type: String },
  submittedAt: { type: Number, default: () => Date.now() }
})

const DuelSchema = new Schema({
  legacyId: { type: String },
  problem: { type: Schema.Types.ObjectId, ref: 'Problem' },
  player1: { type: DuelPlayerSchema, required: true },
  player2: { type: DuelPlayerSchema, required: true },
  status: {
    type: String,
    enum: ['Waiting', 'In Progress', 'Finished', 'Cancelled'],
    default: 'Waiting'
  },
  startTime: { type: Number, default: () => Date.now() },
  winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  wager: { type: Number, default: 0 },
  finalOverallStatus: { type: String },
  finalUserCode: { type: String },
  submissions: { type: [DuelSubmissionSchema], default: [] }
}, { timestamps: true })

export const DuelModel = mongoose.model('Duel', DuelSchema)
