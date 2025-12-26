
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true,
  },
  feedback: {
  score: { type: Number, min: 0, max: 10 },
  feedback: { type: String },
  strengths: [{ type: String }],
  improvements: [{ type: String }]
}
,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  questionId: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
  questionIndex: {
    type: Number,
    required: true,
  },
  isPartial: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
},);

// Compound index for efficient querying
answerSchema.index({ sessionId: 1, questionIndex: 1 });
answerSchema.index({ userId: 1, createdAt: -1 });

const Answer = mongoose.model('Answer', answerSchema);

module.exports = Answer;