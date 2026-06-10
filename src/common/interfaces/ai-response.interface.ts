export interface AiErrorItem {
  wrong: string;
  correct: string;
  explanation: string;
}

export interface AiEvaluationResponse {
  score: number;
  passed: boolean;
  errors: AiErrorItem[];
  recommendations: string[];
  correctedAnswer?: string;
  feedback?: string;
}

export interface AiSpeakingAnalysis extends AiEvaluationResponse {
  fluency: number;
  vocabulary: number;
  grammar: number;
  relevance: number;
  completeness: number;
}

export interface AiVocabularyWord {
  word: string;
  transcription: string;
  translation: string;
  example: string;
  partOfSpeech?: string;
}

export interface AiGrammarTask {
  topic: string;
  instruction: string;
  question: string;
  hint?: string;
}

export interface AiListeningTask {
  text: string;
  questions?: Array<{ question: string; expectedAnswer: string }>;
  mode: 'transcribe' | 'retell' | 'questions';
}

export interface AiSpeakingTopic {
  topic: string;
  prompt: string;
  expectedDuration: number;
  keyVocabulary: string[];
}

export interface AiLearningPlan {
  title: string;
  description: string;
  focusAreas: Array<{ skill: string; priority: number; reason: string }>;
  weeklyGoals: Array<{ skill: string; tasksPerWeek: number }>;
}
