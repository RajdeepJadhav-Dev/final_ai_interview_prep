import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layouts/DashboardLayout";
import WebSpeechVoiceAgent from "../components/WebSpeechVoiceAgent";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";
import SpinnerLoader from "../components/Loader/SpinnerLoader";
import toast from "react-hot-toast";

const Agent = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: "User" }); // Get from auth context
  const [savedAnswers, setSavedAnswers] = useState([]);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await axiosInstance.get(
          API_PATHS.SESSION.GET_ONE(sessionId)
        );

        if (response.data && response.data.session) {
          setSessionData(response.data.session);
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load session data");
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Save individual answer to database
  const handleAnswerSaved = async (answerData) => {
    console.log("Saving answer:", answerData);
    
    try {
      const response = await axiosInstance.post(
        API_PATHS.SESSION.SAVE_ANSWER,
        {
          sessionId, // ✅ now we are sending the sessionId
          questionId: answerData.questionId,
          question: answerData.question,
          answer: answerData.answer,
          questionIndex: answerData.questionIndex,
          timestamp: new Date(),
          isPartial: answerData.partial || false,
        }
      );

      if (response.data) {
        console.log("Answer saved successfully:", response.data);
        setSavedAnswers(prev => [...prev, answerData]);
        if (!answerData.partial) {
          toast.success(`Answer ${answerData.questionIndex + 1} saved!`, {
            duration: 2000,
            position: 'bottom-right',
          });
        }
      }
    } catch (error) {
      console.error("Error saving answer:", error);
      toast.error("Failed to save answer. Please try again.");
      throw error;
    }
  };

  const handleInterviewComplete = async (transcript) => {
    console.log("Interview completed with transcript:", transcript);
    
    try {
      await axiosInstance.post(API_PATHS.SESSION.SAVE_TRANSCRIPT, {
        sessionId, // ✅ send sessionId here as well
        transcript,
        completedAt: new Date(),
        totalAnswers: savedAnswers.length,
      });
      
      toast.success("Interview completed successfully!");
     
    } catch (error) {
      console.error("Error saving transcript:", error);
      toast.error("Interview completed but failed to save transcript");
      
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <SpinnerLoader />
        </div>
      </DashboardLayout>
    );
  }

  if (!sessionData) {
    return (
      <DashboardLayout>
        <div className="text-center py-10">
          <p className="text-red-600 text-lg mb-4">Session not found</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2 font-medium transition-colors"
        >
          ← Back to Questions
        </button>

        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {sessionData.role} Interview
          </h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-700">
            <span className="px-3 py-1 bg-white rounded-full font-medium">
              Experience: {sessionData.experience}
            </span>
            <span className="px-3 py-1 bg-white rounded-full font-medium">
              {sessionData.questions?.length || 0} Questions
            </span>
            <span className="px-3 py-1 bg-white rounded-full font-medium">
              Topics: {sessionData.topicsToFocus}
            </span>
            {savedAnswers.length > 0 && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                ✓ {savedAnswers.length} Answers Saved
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">📋 Instructions:</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>The AI will read each question aloud</li>
            <li>Speak your answer clearly after the question</li>
            <li>Click "Next Question" when you're done with your answer</li>
            <li>Your answers are automatically saved to the database</li>
            <li>You can pause the interview at any time</li>
          </ul>
        </div>

        {/* ✅ Pass sessionId here */}
       <WebSpeechVoiceAgent
  questions={sessionData.questions || []}
  userName={user.name}
  sessionId={sessionId}
  userRole={sessionData.role}           // ✅ pass role
  userExperience={sessionData.experience} // ✅ pass experience
  onAnswerSaved={handleAnswerSaved}
  onInterviewComplete={handleInterviewComplete}
/>
      </div>
    </DashboardLayout>
  );
};

export default Agent;
