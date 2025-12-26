const express = require('express');
const { createSession, getSessionById, getMySessions, deleteSession } = require('../controllers/sessionController');
const { protect } = require('../middlewares/authMiddleware');

// Import models
const Session = require('../models/Session');
const Answer = require('../models/Answer');

const router = express.Router();

// Existing routes
router.post('/create', protect, createSession);
router.get('/my-sessions', protect, getMySessions);
router.get('/:id', protect, getSessionById);
router.delete('/:id', protect, deleteSession);

// POST /api/sessions/save-answer - Save individual answer
// POST /api/sessions/save-answer - Save individual answer
router.post("/save-answer", protect, async (req, res) => {
  try {
    const {
      sessionId,
      questionId,
      question,
      answer,
      questionIndex,
      feedback,
    } = req.body;

    if (!sessionId || !questionId || !answer) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const savedAnswer = await Answer.create({
      sessionId,
      userId: req.user._id,
      questionId,
      question,
      answer,
      questionIndex,
      feedback,
    });

    session.totalAnswers = (session.totalAnswers || 0) + 1;
    session.status = "in-progress";
    await session.save();

    res.status(201).json({ message: "Saved", savedAnswer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sessions/save-transcript - Save complete transcript
router.post('/save-transcript', protect, async (req, res) => {
  try {
    const { sessionId, transcript, completedAt, totalAnswers } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check authorization
    // ✅ Changed from session.userId to session.user
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this session' });
    }

    // Update session with transcript and mark as completed
    session.transcript = transcript || [];
    session.interviewCompletedAt = completedAt || new Date();
    session.totalAnswers = totalAnswers || 0;
    session.status = 'completed';
    
    await session.save();

    console.log('✅ Transcript saved for session:', sessionId);

    res.status(200).json({
      message: 'Transcript saved successfully',
      session,
    });

  } catch (error) {
    console.error('❌ Error saving transcript:', error);
    res.status(500).json({ 
      message: 'Failed to save transcript',
      error: error.message 
    });
  }
});

// GET /api/sessions/:sessionId/answers - Get all answers for a session
router.get('/:sessionId/answers', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check authorization
    // ✅ Changed from session.userId to session.user
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view these answers' });
    }

    // Get all answers for this session, sorted by question index
    const answers = await Answer.find({ sessionId })
      .sort({ questionIndex: 1 })
      .select('-__v');

    res.status(200).json({
      answers,
      count: answers.length,
      sessionId,
    });

  } catch (error) {
    console.error('❌ Error fetching answers:', error);
    res.status(500).json({ 
      message: 'Failed to fetch answers',
      error: error.message 
    });
  }
});
// GET /api/sessions/:sessionId/feedback - Get all feedback for a session
router.get('/:sessionId/feedback', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists and user has access
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check authorization
    if (session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this feedback' });
    }

    // Fetch all answers for this session with feedback
    const answers = await Answer.find({ 
      sessionId,
      'feedback.score': { $exists: true } // Only get answers with feedback
    })
    .sort({ questionIndex: 1 }) // Sort by question order
    .lean();

    if (!answers || answers.length === 0) {
      return res.status(404).json({ 
        message: 'No feedback found for this session' 
      });
    }

    // Calculate overall statistics
    const totalQuestions = answers.length;
    const averageScore = answers.reduce((sum, a) => sum + (a.feedback?.score || 0), 0) / totalQuestions;
    const strongAnswers = answers.filter(a => a.feedback?.score >= 7).length;
    const needsImprovement = answers.filter(a => a.feedback?.score < 7).length;

    // Get all unique strengths and improvements
    const allStrengths = [];
    const allImprovements = [];
    
    answers.forEach(answer => {
      if (answer.feedback?.strengths) {
        allStrengths.push(...answer.feedback.strengths);
      }
      if (answer.feedback?.improvements) {
        allImprovements.push(...answer.feedback.improvements);
      }
    });

    res.json({
      sessionId,
      totalQuestions,
      averageScore: averageScore.toFixed(1),
      strongAnswers,
      needsImprovement,
      answers,
      summary: {
        topStrengths: [...new Set(allStrengths)].slice(0, 5),
        topImprovements: [...new Set(allImprovements)].slice(0, 5)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching feedback:', error);
    res.status(500).json({ 
      message: 'Error fetching feedback',
      error: error.message 
    });
  }
});

module.exports = router;

