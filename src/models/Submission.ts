import mongoose, { Schema } from 'mongoose'

const SubmissionResultSchema = new Schema({
    testCase: { type: Schema.Types.Mixed }, // Reduced strictness for flexibility
    status: String,
    userOutput: String
}, { _id: false });

const SubmissionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    problemId: { type: Schema.Types.ObjectId, ref: 'Problem', required: true },
    code: { type: String, required: true },
    language: { type: String, required: true },
    status: { type: String, enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Disqualified'], required: true },
    executionTime: { type: Number, default: 0 },
    memoryUsage: { type: Number, default: 0 },
    testCaseResults: { type: [SubmissionResultSchema], default: [] }
}, { timestamps: true });

export const SubmissionModel = mongoose.model('Submission', SubmissionSchema);
