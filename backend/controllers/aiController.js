const { GoogleGenAI } = require("@google/genai");
const {
  conceptExplainPrompt,
  questionAnswerPrompt,
} = require("../utils/prompts");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// @desc    Generate interview questions and answers using Gemini
// @route   POST /api/ai/generate-questions
// @access  Private
const generateInterviewQuestions = async (req, res) => {
  try {
    console.log("=== GENERATE QUESTIONS REQUEST ===");
    console.log("Body:", req.body);
    console.log("API Key exists:", !!process.env.GEMINI_API_KEY);

    const { role, experience, topicsToFocus, numberOfQuestions } = req.body;

    if (!role || !experience || !topicsToFocus || !numberOfQuestions) {
      console.log("❌ Missing fields");
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prompt = questionAnswerPrompt(
      role,
      experience,
      topicsToFocus,
      numberOfQuestions
    );

    console.log("Prompt created, calling Gemini...");

    // ✅ Use models from YOUR dashboard that are actually available
    const modelsToTry = [
      "gemini-2.5-flash-lite",    // 10 RPM available
      "gemini-2.5-flash",          // 5 RPM available
      "gemini-3-flash",            // 5 RPM available
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
        console.log(`✅ Success with ${modelName}`);
        break;
      } catch (modelError) {
        console.log(`❌ ${modelName} failed:`, modelError.message);
      }
    }

    if (!response) {
      console.error("❌ All models failed");
      return res.status(500).json({
        message: "All available models failed. Please check your API configuration.",
        error: "ALL_MODELS_FAILED"
      });
    }

    let rawText = response.text;
    console.log("Raw response (first 200 chars):", rawText.substring(0, 200));

    // Clean it: Remove ```json and ``` from beginning and end
    const cleanedText = rawText
      .replace(/^```json\s*/, "")
      .replace(/```$/, "")
      .trim();

    console.log("Cleaned text (first 200 chars):", cleanedText.substring(0, 200));

    // Now safe to parse
    const data = JSON.parse(cleanedText);

    console.log(`✅ Successfully generated questions using ${modelUsed}`);
    res.status(200).json(data);
  } catch (error) {
    console.error("❌ ERROR in generateInterviewQuestions:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    
    res.status(500).json({
      message: "Failed to generate questions",
      error: error.message,
    });
  }
};

// @desc    Generate explains a interview question
// @route   POST /api/ai/generate-explanation
// @access  Private
const generateConceptExplanation = async (req, res) => {
  try {
    console.log("=== GENERATE EXPLANATION REQUEST ===");
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const prompt = conceptExplainPrompt(question);

    const modelsToTry = [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-3-flash",
    ];

    let response;
    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        console.log(`✅ Success with ${modelName}`);
        break;
      } catch (err) {
        console.log(`❌ ${modelName} failed:`, err.message);
      }
    }

    if (!response) {
      return res.status(500).json({
        message: "Failed to generate explanation with all available models",
        error: "ALL_MODELS_FAILED"
      });
    }

    let rawText = response.text;

    // Clean it: Remove ```json and ``` from beginning and end
    const cleanedText = rawText
      .replace(/^```(?:json)?\s*/, "")
      .replace(/```\s*\s*$/, "")
      .trim();

    // Now safe to parse
    const data = JSON.parse(cleanedText);

    console.log("✅ Explanation generated successfully");
    res.status(200).json(data);
  } catch (error) {
    console.error("❌ ERROR in generateConceptExplanation:", error.message);
    
    res.status(500).json({
      message: "Failed to generate explanation",
      error: error.message,
    });
  }
};

module.exports = { generateInterviewQuestions, generateConceptExplanation };
