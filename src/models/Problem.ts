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

const ParamSchemaDefinition = new Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['integer', 'float', 'string', 'boolean', 'char', 'array', 'matrix', 'object'],
    required: true
  },
  elementType: {
    type: String,
    enum: ['integer', 'float', 'string', 'boolean', 'char'],
    required: false
  },
  properties: { type: [Schema.Types.Mixed], default: undefined },
  description: { type: String, required: false }
}, { _id: false })

const ProblemSchema = new Schema({
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
  inputSchema: { type: [ParamSchemaDefinition], default: [] },
  outputSchema: { type: [ParamSchemaDefinition], default: [] },
  testCases: { type: [TestCaseSchema], default: [] },
  solutions: { type: [SolutionSchema], default: [] },
  starterCode: { type: String, required: false },
  functionName: { type: String, required: false },
  editorial: { type: String, required: false },
  timeLimitMs: { type: Number, default: 5000 },
  tags: { type: [String], default: [] },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Custom'],
    default: 'Custom'
  }
}, { timestamps: true })

export const ProblemModel = mongoose.model('Problem', ProblemSchema)
