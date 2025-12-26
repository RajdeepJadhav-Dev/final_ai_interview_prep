const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// @desc    Generate feedback for interview answer
// @route   POST /api/ai/generate-feedback
// @access  Private
const generateFeedback = async (req, res) => {
  try {
    console.log("=== GENERATE FEEDBACK REQUEST ===");
    console.log("Body:", req.body);

    const { question, answer, role, experience } = req.body;

    if (!question || !answer || !role || !experience) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prompt = `
You are a strict technical interview evaluator.

Role: ${role}
Experience Level: ${experience}

Interview Question:
${question}

Candidate Answer:
${answer}

Evaluate the answer and respond in STRICT JSON ONLY.

Format:
{
  "score": number (0-10),
  "strengths": "what was done well",
  "improvements": "what can be improved",
  "idealAnswerHint": "brief hint of a strong answer"
}

IMPORTANT RULES:
- Do NOT include markdown
- Do NOT include explanation text
- ONLY valid JSON
`;

    const modelsToTry = [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-3-flash",
    ];

    let response;
    let modelUsed;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        modelUsed = modelName;
        console.log(`✅ Feedback generated using ${modelName}`);
        break;
      } catch (err) {
        console.log(`❌ ${modelName} failed:`, err.message);
      }
    }

    if (!response) {
      return res.status(500).json({
        message: "All models failed while generating feedback",
        error: "ALL_MODELS_FAILED",
      });
    }

    let rawText = response.text;
    console.log("Raw feedback:", rawText.substring(0, 200));

    // Clean Gemini formatting
    const cleanedText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    let feedback;
    try {
      feedback = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("❌ JSON parse failed. Returning fallback.");
      feedback = {
        score: 5,
        strengths: "Answer addresses the question at a basic level.",
        improvements: "Needs more depth, structure, and technical clarity.",
        idealAnswerHint: "Explain the concept clearly with an example.",
      };
    }

    feedback.modelUsed = modelUsed;

    res.status(200).json(feedback);
  } catch (error) {
    console.error("❌ ERROR in generateFeedback:", error.message);
    res.status(500).json({
      message: "Failed to generate feedback",
      error: error.message,
    });
  }
};

module.exports = { generateFeedback };
