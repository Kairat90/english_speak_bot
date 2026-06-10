export const SYSTEM_PROMPT = `You are an expert English language teacher assistant.
Always respond in valid JSON format only. No markdown, no explanations outside JSON.
User's native language is Russian — use Russian for explanations and recommendations.
Be encouraging but strict in evaluation.`;

export const PROMPTS = {
  GENERATE_VOCABULARY: (level: string, count: number) => `
Generate ${count} English vocabulary words for CEFR level ${level}.
Return JSON:
{
  "words": [
    {
      "word": "string",
      "transcription": "IPA string",
      "translation": "Russian translation",
      "example": "Example sentence in English",
      "partOfSpeech": "noun|verb|adjective|..."
    }
  ]
}`,

  EVALUATE_VOCABULARY: (word: string, expected: string, userAnswer: string, taskType: string) => `
Evaluate vocabulary answer.
Word: "${word}"
Expected: "${expected}"
User answer: "${userAnswer}"
Task type: ${taskType}
Return JSON:
{
  "score": 0-100,
  "passed": boolean,
  "errors": [{"wrong": "", "correct": "", "explanation": ""}],
  "recommendations": [""],
  "correctedAnswer": ""
}`,

  GENERATE_GRAMMAR_TASK: (level: string, topic?: string) => `
Create a grammar exercise for CEFR level ${level}.
${topic ? `Topic: ${topic}` : 'Choose an appropriate grammar topic.'}
Return JSON:
{
  "topic": "string",
  "instruction": "Russian instruction",
  "question": "English exercise text",
  "hint": "optional hint in Russian"
}`,

  EVALUATE_GRAMMAR: (question: string, userAnswer: string, level: string) => `
Evaluate grammar answer for level ${level}.
Question: "${question}"
User answer: "${userAnswer}"
Return JSON:
{
  "score": 0-100,
  "passed": boolean,
  "errors": [{"wrong": "", "correct": "", "explanation": ""}],
  "recommendations": [""],
  "correctedAnswer": ""
}`,

  GENERATE_SPEAKING_TOPIC: (level: string) => `
Generate a speaking topic for CEFR level ${level}.
Return JSON:
{
  "topic": "string",
  "prompt": "Russian prompt asking user to speak about the topic",
  "expectedDuration": 30,
  "keyVocabulary": ["word1", "word2"]
}`,

  ANALYZE_SPEAKING: (topic: string, transcript: string, level: string) => `
Analyze spoken English response for level ${level}.
Topic: "${topic}"
Transcript: "${transcript}"
Evaluate: grammar, vocabulary, fluency, relevance, completeness.
Pass threshold: 70.
Return JSON:
{
  "score": 0-100,
  "passed": boolean,
  "fluency": 0-100,
  "vocabulary": 0-100,
  "grammar": 0-100,
  "relevance": 0-100,
  "completeness": 0-100,
  "errors": [{"wrong": "", "correct": "", "explanation": ""}],
  "recommendations": [""],
  "correctedAnswer": ""
}`,

  GENERATE_LISTENING: (level: string, mode: string) => `
Create a listening exercise for CEFR level ${level}, mode: ${mode}.
Return JSON:
{
  "text": "English text to be read aloud (30-60 words)",
  "mode": "${mode}",
  "questions": [{"question": "Russian question", "expectedAnswer": "expected English answer"}]
}`,

  EVALUATE_LISTENING: (originalText: string, userAnswer: string, mode: string) => `
Evaluate listening comprehension answer.
Original text: "${originalText}"
User answer: "${userAnswer}"
Mode: ${mode}
Return JSON:
{
  "score": 0-100,
  "passed": boolean,
  "errors": [{"wrong": "", "correct": "", "explanation": ""}],
  "recommendations": [""],
  "correctedAnswer": ""
}`,

  GENERATE_LEARNING_PLAN: (profile: object) => `
Create a personalized English learning plan based on user profile:
${JSON.stringify(profile)}
Return JSON:
{
  "title": "string",
  "description": "Russian description",
  "focusAreas": [{"skill": "SPEAKING|LISTENING|...", "priority": 1-5, "reason": "Russian"}],
  "weeklyGoals": [{"skill": "SPEAKING|...", "tasksPerWeek": number}]
}`,

  GENERATE_DAILY_CHALLENGE: (level: string, weakSkills: string[]) => `
Create a daily mixed-skill challenge for level ${level}.
Weak skills to focus on: ${weakSkills.join(', ')}
Return JSON:
{
  "title": "string",
  "tasks": [
    {
      "type": "VOCABULARY|GRAMMAR|SPEAKING|LISTENING",
      "content": {},
      "instruction": "Russian instruction"
    }
  ]
}`,
};
