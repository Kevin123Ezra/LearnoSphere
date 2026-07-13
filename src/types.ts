export interface Material {
  id: string;
  title: string;
  type: 'slides' | 'pdf' | 'video' | 'assignment';
  content: string; // The text content parsed/extracted
  summary: string;
  concepts: {
    title: string;
    description: string;
  }[];
  createdAt: string;
}

export interface Flashcard {
  id: string;
  materialId: string;
  materialTitle: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  box: number; // For spaced repetition
  nextReviewDate: string;
  isWeaknessCard?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  materialId: string;
  materialTitle: string;
  title: string;
  questions: QuizQuestion[];
  isAdaptive?: boolean; // If generated specifically due to weakness
  subject?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  total: number;
  answers: number[]; // Index of answers selected by user
  date: string;
}

export interface RevisionTask {
  id: string;
  title: string;
  materialTitle?: string;
  dueDate: string;
  subject: string;
  completed: boolean;
  isAutoScheduled?: boolean; // Scheduled due to calculus/weakness detection
  type: 'practice' | 'quiz' | 'review';
}

export interface LearningStyle {
  analyticalScore: number;
  visualScore: number;
  retrievalScore: number;
  activeRecallScore: number;
}

export interface Analytics {
  streak: number;
  lastActive: string;
  weaknesses: {
    subject: string;
    score: number; // out of 100
    recommendation: string;
    lastTested: string;
  }[];
  examReadiness: {
    [subject: string]: number; // percentage 0-100
  };
  learningStyle: LearningStyle;
  preferredStyleName: string;
  totalTimeMinutes: number;
}

export interface GroupStudy {
  id: string;
  title: string;
  sources: {
    author: string;
    content: string;
  }[];
  mergedSummary: string;
  unifiedStudyGuide: string;
  keyTakeaways: string[];
  createdAt: string;
}

export interface DBState {
  materials: Material[];
  flashcards: Flashcard[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  revisionTasks: RevisionTask[];
  analytics: Analytics;
  groupStudies: GroupStudy[];
}
