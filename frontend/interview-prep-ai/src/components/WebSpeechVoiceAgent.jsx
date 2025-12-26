import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuMic, LuMicOff, LuPhoneOff, LuUser, LuChevronRight, LuCheck } from "react-icons/lu";
import axiosInstance from "../utils/axiosInstance";

const WebSpeechVoiceAgent = ({
  questions,
  userName = "Candidate",
  userRole,
  userExperience,
  sessionId,
  onAnswerSaved,
  onInterviewComplete,
}) => {
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [answerFeedbacks, setAnswerFeedbacks] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // ---------------- Speech Recognition Setup ----------------
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript + " ";
        else interimText += transcript;
      }

      if (finalText) {
        setCurrentAnswer((prev) => (prev + " " + finalText).trim());
        setCurrentTranscript("");
      } else {
        setCurrentTranscript(interimText);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, []);

  // ---------------- Speech Synthesis ----------------
  const speak = (text) =>
    new Promise((resolve) => {
      setAiSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setAiSpeaking(false);
        resolve();
      };
      synthRef.current.cancel();
      synthRef.current.speak(utterance);
    });

  // ---------------- Generate Feedback ----------------
  const generateFeedback = async ({ question, userAnswer }) => {
    try {
      const res = await axiosInstance.post("/api/ai/generate-feedback", {
        question,
        answer: userAnswer,
        role: userRole,
        experience: userExperience,
      });
      return res.data;
    } catch (err) {
      console.error("Error generating feedback:", err);
      return {
        score: 5,
        strengths: "Answer addresses the question at a basic level.",
        improvements: "Needs more depth, structure, and technical clarity.",
        idealAnswerHint: "Explain the concept clearly with an example.",
      };
    }
  };

  // ---------------- Start Interview ----------------
  const startInterview = async () => {
    setShowWelcome(false);
    setIsInterviewActive(true);
    setCurrentQuestionIndex(0);
    setAnswerFeedbacks([]);

    await speak(
      `Hello ${userName}, welcome to your ${userRole} interview. I'll be your interviewer today. Let's begin.`
    );
    askQuestion(0);
  };

  const askQuestion = async (index) => {
    const q = questions[index];
    await speak(`Question ${index + 1}. ${q.question}`);
    recognitionRef.current?.start();
  };

  // ---------------- Next Question ----------------
  const handleNextQuestion = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    recognitionRef.current?.stop();

    const finalAnswer = `${currentAnswer} ${currentTranscript}`.trim();
    if (!finalAnswer) {
      alert("Please provide an answer before proceeding");
      setIsProcessing(false);
      return;
    }

    const q = questions[currentQuestionIndex];

    await speak("Thank you. Let me evaluate your answer.");

    const feedback = await generateFeedback({
      question: q.question,
      userAnswer: finalAnswer,
    });

    const feedbackObj = {
      questionIndex: currentQuestionIndex,
      question: q.question,
      userAnswer: finalAnswer,
      expectedAnswer: q.answer,
      ...feedback,
    };

    setAnswerFeedbacks((prev) => [...prev, feedbackObj]);

    if (onAnswerSaved) {
      await onAnswerSaved({
        questionId: q._id || currentQuestionIndex,
        question: q.question,
        answer: finalAnswer,
        questionIndex: currentQuestionIndex,
        feedback,
      });
    }

    await speak("Here is your feedback.");
    await new Promise((r) => setTimeout(r, 3000));

    setCurrentAnswer("");
    setCurrentTranscript("");

    const next = currentQuestionIndex + 1;
    if (next < questions.length) {
      setCurrentQuestionIndex(next);
      askQuestion(next);
    } else {
      endInterview();
    }

    setIsProcessing(false);
  };

  // ---------------- End Interview ----------------
  const endInterview = async () => {
    setIsInterviewActive(false);
    await speak(
      "Excellent work! Your interview is now complete. Please review your detailed feedback below."
    );

    if (onInterviewComplete) {
      onInterviewComplete({ feedbacks: answerFeedbacks });
    }
  };

  const currentFeedback = answerFeedbacks.find(
    (f) => f.questionIndex === currentQuestionIndex
  );
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // ---------------- RENDER ----------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Screen */}
      <AnimatePresence>
        {showWelcome && !isInterviewActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-50"
          >
            <div className="max-w-2xl mx-auto px-8 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-xl rounded-full mb-8 border border-white/20">
                  <LuUser className="text-5xl text-white" />
                </div>
                <h1 className="text-5xl font-light text-white mb-4 tracking-tight">
                  AI Interview Session
                </h1>
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto mb-6" />
                <p className="text-xl text-gray-300 font-light mb-8">
                  {userRole} · {userExperience}
                </p>
                <div className="flex items-center justify-center gap-6 mb-12 text-sm text-gray-400">
                  <span>{questions.length} Questions</span>
                  <span className="w-1 h-1 bg-gray-600 rounded-full" />
                  <span>~{questions.length * 3} minutes</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startInterview}
                  className="group relative px-10 py-4 bg-white text-slate-900 rounded-lg font-medium text-lg overflow-hidden transition-all"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Join Interview
                    <LuChevronRight className="text-xl group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
                <p className="mt-8 text-sm text-gray-500 flex items-center justify-center gap-2">
                  <LuMic className="text-base" />
                  Ensure your microphone is enabled
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Interview */}
      {isInterviewActive && (
        <div className="min-h-screen bg-gray-50">
          {/* Header and Progress */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
            <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center">
                    <LuUser className="text-white text-lg" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">AI Interviewer</p>
                    <div className="flex items-center gap-2">
                      {aiSpeaking ? (
                        <>
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-2 h-2 bg-green-500 rounded-full"
                          />
                          <span className="text-xs text-gray-500">Speaking...</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                          <span className="text-xs text-gray-500">Active</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Progress</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {currentQuestionIndex + 1} / {questions.length}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={endInterview}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <LuPhoneOff className="text-lg" />
                  End
                </motion.button>
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-slate-700 to-slate-900"
              />
            </div>
          </div>

          {/* Question & Answer Area */}
          <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Question Card */}
              <motion.div
                key={`question-${currentQuestionIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
              >
                <h2 className="text-2xl font-normal text-gray-900 leading-relaxed">
                  {questions[currentQuestionIndex]?.question}
                </h2>
              </motion.div>

              {/* Answer Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
              >
                <p className="text-gray-800 text-lg leading-relaxed font-light min-h-[140px]">
                  {currentAnswer || currentTranscript || "Waiting for your answer..."}
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNextQuestion}
                  disabled={isProcessing || !currentAnswer.trim()}
                  className={`mt-6 w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    isProcessing || !currentAnswer.trim()
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm"
                  }`}
                >
                  {isProcessing ? "Evaluating..." : currentQuestionIndex < questions.length - 1 ? "Continue" : "Complete Interview"}
                  <LuChevronRight />
                </motion.button>
              </motion.div>
            </div>

            {/* Feedback Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <AnimatePresence mode="wait">
                  {currentFeedback ? (
                    <motion.div
                      key={`feedback-${currentQuestionIndex}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h3>
                      <p>Score: {currentFeedback.score}/10</p>
                      <p>Strengths: {currentFeedback.strengths}</p>
                      <p>Improvements: {currentFeedback.improvements}</p>
                      <p>Pro Tip: {currentFeedback.idealAnswerHint}</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h3>
                      <p className="text-sm text-gray-500 text-center py-8">
                        Answer the question to receive feedback
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final Summary */}
      {!isInterviewActive && answerFeedbacks.length > 0 && (
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-5xl mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
              <LuCheck className="text-4xl text-green-600 mx-auto mb-4" />
              <h1 className="text-4xl font-light text-gray-900 mb-3">Interview Complete</h1>
              <p className="text-lg text-gray-600">Here's your performance summary</p>
            </motion.div>

            {answerFeedbacks.map((fb, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-4"
              >
                <h3 className="text-xl font-normal text-gray-900 mb-2">Q{i + 1}: {fb.question}</h3>
                <p>Your Answer: {fb.userAnswer}</p>
                <p>Score: {fb.score}/10</p>
                <p>Strengths: {fb.strengths}</p>
                <p>Improvements: {fb.improvements}</p>
                <p>Pro Tip: {fb.idealAnswerHint}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSpeechVoiceAgent;
