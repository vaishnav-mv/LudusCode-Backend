import mongoose, { Schema } from 'mongoose'

const TestCaseSchema = new Schema({
  input: { type: String },
  output: { type: String },
  isSample: { type: Boolean }
})

const SolutionSchema = new Schema({
  language: { type: String },
  code: { type: String }
})

const ProblemSchema = new Schema({
  legacyId: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  constraints: { type: [String], default: [] },
  inputFormat: { type: String },
  outputFormat: { type: String },
  testCases: { type: [TestCaseSchema], default: [] },
  solutions: { type: [SolutionSchema], default: [] },
  solution: { type: SolutionSchema, required: false }, // Deprecated, kept for backward compatibility/migration
  starterCode: { type: String, required: false },
  functionName: { type: String, required: false },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Custom'],
    default: 'Custom'
  }
}, { timestamps: true })

export const ProblemModel = mongoose.model('Problem', ProblemSchema)
