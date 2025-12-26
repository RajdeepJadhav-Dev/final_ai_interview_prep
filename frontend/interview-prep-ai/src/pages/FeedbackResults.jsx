import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LuTrophy, LuTrendingUp, LuCheckCircle2, LuAlertCircle } from 'react-icons/lu';

const FeedbackResults = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [feedbackData, setFeedbackData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbackData();
  }, [sessionId]);

  const fetchFeedbackData = async () => {
    try {
      // This endpoint should return all answers with feedback for this session
      const response = await fetch(`/api/sessions/${sessionId}/feedback`);
      const data = await response.json();
      setFeedbackData(data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallScore = () => {
    if (!feedbackData?.answers?.length) return 0;
    const scores = feedbackData.answers.map(a => a.feedback?.score || 0);
    return (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1);
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPerformanceLevel = (score) => {
    if (score >= 8) return { label: 'Excellent', emoji: '🌟' };
    if (score >= 6) return { label: 'Good', emoji: '👍' };
    if (score >= 4) return { label: 'Fair', emoji: '📈' };
    return { label: 'Needs Improvement', emoji: '💪' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const overallScore = calculateOverallScore();
  const performance = getPerformanceLevel(overallScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Interview Feedback Report
          </h1>
          <p className="text-gray-600">
            Here's how you performed in your interview
          </p>
        </motion.div>

        {/* Overall Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8 border-2 border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Overall Performance
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-5xl">{performance.emoji}</span>
                <div>
                  <p className="text-3xl font-bold text-blue-600">{overallScore}/10</p>
                  <p className="text-lg text-gray-600">{performance.label}</p>
                </div>
              </div>
            </div>
            <LuTrophy className="text-6xl text-yellow-500" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {feedbackData?.answers?.length || 0}
              </p>
              <p className="text-sm text-gray-600">Questions Answered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {feedbackData?.answers?.filter(a => a.feedback?.score >= 7).length || 0}
              </p>
              <p className="text-sm text-gray-600">Strong Answers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {feedbackData?.answers?.filter(a => a.feedback?.score < 7).length || 0}
              </p>
              <p className="text-sm text-gray-600">Need Improvement</p>
            </div>
          </div>
        </motion.div>

        {/* Individual Question Feedback */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Detailed Feedback
          </h2>

          {feedbackData?.answers?.map((answer, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* Question Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      Question {idx + 1}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(answer.feedback?.score || 0)}`}>
                      {answer.feedback?.score || 0}/10
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {answer.question}
                  </h3>
                </div>
              </div>

              {/* Your Answer */}
              <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Your Answer:</p>
                <p className="text-gray-600">{answer.answer}</p>
              </div>

              {/* Feedback */}
              {answer.feedback && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Feedback:</p>
                    <p className="text-gray-600">{answer.feedback.feedback}</p>
                  </div>

                  {/* Strengths */}
                  {answer.feedback.strengths?.length > 0 && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <LuCheckCircle2 className="text-green-600 text-xl" />
                        <p className="font-semibold text-green-700">Strengths</p>
                      </div>
                      <ul className="space-y-2">
                        {answer.feedback.strengths.map((strength, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700">
                            <span className="text-green-600 mt-1">✓</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Areas for Improvement */}
                  {answer.feedback.improvements?.length > 0 && (
                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-3">
                        <LuTrendingUp className="text-orange-600 text-xl" />
                        <p className="font-semibold text-orange-700">Areas for Improvement</p>
                      </div>
                      <ul className="space-y-2">
                        {answer.feedback.improvements.map((improvement, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700">
                            <span className="text-orange-600 mt-1">→</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex gap-4 justify-center">
          <button
            onClick={() => navigate(`/interview-prep/${sessionId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all"
          >
            Back to Questions
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gray-600 text-white rounded-full font-semibold hover:bg-gray-700 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackResults;