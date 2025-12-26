const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {  // Changed from 'userId' to 'user'
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  role: {
    type: String,
    required: true,
  },
  experience: {
    type: String,
    required: true,
  },
  topicsToFocus: {
    type: String,
  },
  description: {
    type: String,
  },
  questions: [{  // Changed to store references instead of embedded docs
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  }],
  status: {
    type: String,
    enum: ['draft', 'in-progress', 'completed'],
    default: 'draft',
  },
  transcript: {
    type: Array,
    default: [],
  },
  interviewCompletedAt: {
    type: Date,
  },
  totalAnswers: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

sessionSchema.index({ user: 1, status: 1 });
sessionSchema.index({ createdAt: -1 });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;