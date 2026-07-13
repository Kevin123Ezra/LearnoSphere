import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { DBState, Material, Flashcard, Quiz, QuizAttempt, RevisionTask, Analytics, GroupStudy } from './src/types';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
const PORT = 3000;

// Path to file storage
const DATA_FILE_PATH = path.join(process.cwd(), 'data_store.json');

// --- Gemini Client Helper (Lazy Initialization) ---
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required but missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// --- Sarvam AI Client Helper ---
async function callSarvamAI(prompt: string, isJson: boolean, timeoutMs: number = 30000): Promise<string> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY is not configured');
  }

  const systemInstruction = isJson 
    ? "You are a precise academic helper. You must respond ONLY with raw, valid JSON matching the schema/instructions. Do not wrap in markdown or backticks."
    : "You are a precise and warm academic tutor.";

  const combinedContent = `${systemInstruction}\n\nUser request:\n${prompt}`;

  const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey
    },
    body: JSON.stringify({
      model: 'sarvam-2b-v0.5',
      messages: [
        { role: 'user', content: combinedContent }
      ],
      temperature: 0.1
    }),
    signal: AbortSignal.timeout(timeoutMs) // Increased timeout for larger requests
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.error(`Sarvam AI error response (${response.status}):`, errorBody);
    throw new Error(`Sarvam AI returned status ${response.status}: ${errorBody || response.statusText}`);
  }

  const data = await response.json() as any;
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('No content returned from Sarvam AI');
  }

  return text;
}

// --- High Fidelity Initial State ---
const INITIAL_ANALYTICS: Analytics = {
  streak: 5,
  lastActive: new Date().toISOString().split('T')[0],
  weaknesses: [
    {
      subject: 'Calculus',
      score: 40,
      recommendation: 'Struggling with Limits & continuity limit laws. Schedule more retrieval practice.',
      lastTested: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }
  ],
  examReadiness: {
    'Calculus': 42,
    'Machine Learning': 78,
    'Physics': 85
  },
  learningStyle: {
    analyticalScore: 85,
    visualScore: 45,
    retrievalScore: 90,
    activeRecallScore: 70
  },
  preferredStyleName: 'Active Analytical Learner',
  totalTimeMinutes: 320
};

const INITIAL_MATERIALS: Material[] = [
  {
    id: 'mat-calc-101',
    title: 'Calculus I: Limits & Continuity',
    type: 'pdf',
    content: `Calculus I focuses heavily on limits and the definition of continuity. The limit of a function is the fundamental concept on which calculus is built. Let f(x) be a function defined on an open interval containing c (except possibly at c). We say the limit of f(x) as x approaches c is L if for every epsilon > 0 there exists a delta > 0 such that if 0 < |x - c| < delta, then |f(x) - L| < epsilon.\n\nA function f(x) is continuous at x = c if and only if three conditions are satisfied:\n1. f(c) is defined (c is in the domain).\n2. The limit of f(x) as x approaches c exists.\n3. The limit of f(x) as x approaches c is equal to f(c).\n\nIf any of these conditions fail, the function is discontinuous at c. Discontinuities are categorized as removable, jump, or infinite.`,
    summary: 'This foundational lecture introduces the mathematical definitions of limits and continuity. It details the intuitive meaning of limits, the rigorous epsilon-delta formulation, and the three-part test for continuity of a function at any given point.',
    concepts: [
      {
        title: 'Limit of a Function',
        description: 'The behavior of a function near a point, describing the value f(x) gets arbitrarily close to as x approaches c.'
      },
      {
        title: 'Epsilon-Delta Definition',
        description: 'A formal framework proving a limit exists by establishing that for any distance boundary (epsilon) near the limit, there exists a corresponding input boundary (delta).'
      },
      {
        title: 'Three Continuity Conditions',
        description: 'A mathematical checklist: f(c) is defined, the limit as x approaches c exists, and the limit matches f(c).'
      }
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'mat-ml-201',
    title: 'Intro to Deep Learning: Neurons & Activation Functions',
    type: 'slides',
    content: `Deep Learning is inspired by biological neural networks. An artificial neuron (perceptron) computes a weighted sum of its inputs, adds a bias, and passes it through an activation function.\n\ny = f(sum(w_i * x_i) + b)\n\nCommon activation functions include:\n1. Sigmoid: Maps values between 0 and 1. Prone to vanishing gradient.\n2. Tanh: Maps values between -1 and 1.\n3. ReLU (Rectified Linear Unit): f(x) = max(0, x). Simple, computationally efficient, solves vanishing gradient for positive values.\n4. Leaky ReLU: Allows a small non-zero gradient when x is negative.\n\nNeural networks learn weights through feedforward propagation followed by backpropagation. Backpropagation calculates the loss function gradient using the calculus Chain Rule, allowing gradient descent to adjust weights iteratively.`,
    summary: 'A core lecture covering neural network mechanics. It defines individual perceptrons, weights, biases, and outlines the role and types of non-linear activation functions (ReLU, Sigmoid, Tanh) along with the basics of weight adjustment via backpropagation.',
    concepts: [
      {
        title: 'Perceptron Weighted Sum',
        description: 'The core linear combination inside a neuron combining inputs and weights, shifted by a bias parameter.'
      },
      {
        title: 'Activation Function Non-Linearity',
        description: 'Mathematical operations that introduce non-linearity into neurons, allowing deep networks to approximate arbitrary complex functions.'
      },
      {
        title: 'ReLU Activation Advantages',
        description: 'Replacing negative inputs with zero to boost speed and dramatically reduce vanishing gradient problems during backpropagation.'
      }
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_FLASHCARDS: Flashcard[] = [
  {
    id: 'card-1',
    materialId: 'mat-calc-101',
    materialTitle: 'Calculus I: Limits & Continuity',
    question: 'What are the three conditions for a function f(x) to be continuous at a point x = c?',
    answer: '1. f(c) must be defined.\n2. The limit of f(x) as x approaches c must exist.\n3. The limit of f(x) as x approaches c must equal f(c).',
    difficulty: 'hard',
    box: 1,
    nextReviewDate: new Date().toISOString()
  },
  {
    id: 'card-2',
    materialId: 'mat-calc-101',
    materialTitle: 'Calculus I: Limits & Continuity',
    question: 'How is a removable discontinuity defined?',
    answer: 'A discontinuity at x = c where the limit of f(x) as x approaches c exists, but either f(c) is not defined or is not equal to the limit.',
    difficulty: 'medium',
    box: 2,
    nextReviewDate: new Date().toISOString()
  },
  {
    id: 'card-3',
    materialId: 'mat-ml-201',
    materialTitle: 'Intro to Deep Learning: Neurons & Activation Functions',
    question: 'What is the formula and primary advantage of the ReLU activation function?',
    answer: 'Formula: f(x) = max(0, x). Advantage: It is extremely computationally efficient and helps mitigate the vanishing gradient problem for positive inputs.',
    difficulty: 'easy',
    box: 3,
    nextReviewDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_QUIZZES: Quiz[] = [
  {
    id: 'quiz-calc-1',
    materialId: 'mat-calc-101',
    materialTitle: 'Calculus I: Limits & Continuity',
    title: 'Limits & Continuity Challenge',
    questions: [
      {
        question: 'Under what conditions does the limit of f(x) as x approaches c exist?',
        options: [
          'If and only if f(c) is defined',
          'If the left-hand limit and right-hand limit both exist and are equal',
          'If the function has no asymptotes',
          'If the function is linear'
        ],
        correctIndex: 1,
        explanation: 'The limit of a function as x approaches c exists if and only if both the left-hand limit and the right-hand limit are equal to the same value.'
      },
      {
        question: 'What type of discontinuity occurs when the left-hand limit and right-hand limit both exist but are not equal?',
        options: [
          'Removable Discontinuity',
          'Jump Discontinuity',
          'Infinite Discontinuity',
          'Essential Discontinuity'
        ],
        correctIndex: 1,
        explanation: 'A jump discontinuity occurs when the left and right limits exist but are different, causing the graph to "jump" at that point.'
      },
      {
        question: 'What is the value of the limit of sin(x)/x as x approaches 0?',
        options: [
          '0',
          'Undefined',
          '1',
          'Infinity'
        ],
        correctIndex: 2,
        explanation: 'Using L\'Hopital\'s rule or geometric proofs, the limit of sin(x)/x as x approaches 0 is a standard calculus theorem equal to 1.'
      }
    ],
    subject: 'Calculus'
  },
  {
    id: 'quiz-ml-1',
    materialId: 'mat-ml-201',
    materialTitle: 'Intro to Deep Learning: Neurons & Activation Functions',
    title: 'Neural Networks Basics',
    questions: [
      {
        question: 'Which problem does the ReLU activation function primarily suffer from on negative inputs?',
        options: [
          'Exploding Gradients',
          'Dying ReLU (Zero Gradients)',
          'High Computational Cost',
          'Inability to approximate non-linear functions'
        ],
        correctIndex: 1,
        explanation: 'For inputs less than 0, the derivative of ReLU is exactly 0. This can cause neurons to become inactive and stop updating, known as the "Dying ReLU" problem.'
      },
      {
        question: 'What calculus principle is backpropagation built upon?',
        options: [
          'Mean Value Theorem',
          'Taylor Series Expansion',
          'The Chain Rule',
          'Fundamental Theorem of Calculus'
        ],
        correctIndex: 2,
        explanation: 'Backpropagation computes the gradient of the cost function with respect to weights by applying the Chain Rule of calculus from output layers backward.'
      }
    ],
    subject: 'Machine Learning'
  }
];

const INITIAL_ATTEMPTS: QuizAttempt[] = [
  {
    id: 'att-1',
    quizId: 'quiz-calc-1',
    quizTitle: 'Limits & Continuity Challenge',
    score: 1,
    total: 3,
    answers: [0, 1, 0], // Got 1st and 3rd questions wrong. Weakness!
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_REVISION: RevisionTask[] = [
  {
    id: 'rev-1',
    title: 'Review Calculus Limits & Continuities',
    materialTitle: 'Calculus I: Limits & Continuity',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subject: 'Calculus',
    completed: false,
    isAutoScheduled: true,
    type: 'review'
  },
  {
    id: 'rev-2',
    title: 'Complete Neural Network Basics Quiz',
    materialTitle: 'Intro to Deep Learning: Neurons & Activation Functions',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subject: 'Machine Learning',
    completed: false,
    type: 'quiz'
  }
];

const INITIAL_GROUP: GroupStudy[] = [
  {
    id: 'group-ethics',
    title: 'Machine Learning Ethics & AI Alignment',
    sources: [
      {
        author: 'Alex Henderson',
        content: 'AI systems must prioritize safety and transparency. Alignment theory ensures artificial intelligence systems behave in accordance with human values, addressing biases in training datasets.'
      },
      {
        author: 'Bailey Watson',
        content: 'Data privacy and algorithmic accountability are crucial. Machine learning models often inherit bias from historical training sets. Mitigation strategies are needed in credit scoring and legal algorithms.'
      }
    ],
    mergedSummary: 'This collaborative study guide synthesizes arguments from Alex and Bailey on AI Ethics. It unifies discussion on the Alignment Problem (aligning goals with human ethics), algorithmic bias detection, and strategies to protect personal privacy in training data.',
    unifiedStudyGuide: '# Machine Learning Ethics & AI Alignment\n\n## 1. Safety and Alignment\n- **Objective**: Ensure deep neural models support human values.\n- **Primary Challenge**: The "Alignment Problem"—preventing unintended behaviors arising from raw optimization metrics.\n\n## 2. Dataset Bias & Fairness\n- **Cause**: Historical training data contains built-in societal biases.\n- **Sectors Affected**: Credit scoring, automated hiring, and criminal justice risk scoring.\n- **Mitigation**: Standardized algorithmic auditing and balanced demographic dataset construction.\n\n## 3. Core Recommendations\n- Implement end-to-end data privacy safeguards.\n- Commit to full model explainability and algorithmic accountability metrics.',
    keyTakeaways: [
      'The Alignment Problem centers on making AI target human values rather than raw numerical cost outputs.',
      'Training data reflects historical social bias; engineers must audit and balance inputs.',
      'Transparent, explainable models are necessary in high-stakes fields like medicine and justice.'
    ],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Load current DB state
function loadDatabase(): DBState {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading data file, using default state.', e);
  }

  // Create default file if it doesn't exist
  const defaultState: DBState = {
    materials: INITIAL_MATERIALS,
    flashcards: INITIAL_FLASHCARDS,
    quizzes: INITIAL_QUIZZES,
    attempts: INITIAL_ATTEMPTS,
    revisionTasks: INITIAL_REVISION,
    analytics: INITIAL_ANALYTICS,
    groupStudies: INITIAL_GROUP
  };
  saveDatabase(defaultState);
  return defaultState;
}

// Save DB state
function saveDatabase(state: DBState) {
  try {
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing data file', e);
  }
}

// --- API Endpoints ---

// Check database state
app.get('/api/data', (req, res) => {
  const db = loadDatabase();
  res.json(db);
});

// Upload material and generate core elements using Gemini 3.5 Flash
app.post('/api/materials/upload', async (req, res) => {
  const { title, type, content } = req.body;
  if (!title || !content || !type) {
    res.status(400).json({ error: 'Missing title, type, or content' });
    return;
  }

  const db = loadDatabase();

  try {
    const ai = getGemini();

    const prompt = `You are an expert university AI professor. Analyze the following study material text and extract concepts, create flashcards, generate a quiz, and organize a summary.
Title: "${title}"
Format/Type: ${type}
Content:
${content}

Perform high-quality analysis and generate JSON.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: "An elegant, comprehensive 2-paragraph summary of the learning material."
        },
        subject: {
          type: Type.STRING,
          description: "The primary academic subject of this material, e.g. Calculus, Machine Learning, Chemistry, History, Physics."
        },
        concepts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Name of the difficult concept." },
              description: { type: Type.STRING, description: "An expert explanation that simplifies this difficult concept." }
            },
            required: ["title", "description"]
          },
          description: "3 most important or difficult concepts introduced."
        },
        flashcards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "Active recall question." },
              answer: { type: Type.STRING, description: "Accurate, concise answer." }
            },
            required: ["question", "answer"]
          },
          description: "Exactly 4 high-quality flashcards for spaced repetition."
        },
        quiz: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 multiple choice options."
              },
              correctIndex: { type: Type.INTEGER, description: "0-based index of correct option." },
              explanation: { type: Type.STRING, description: "Brief learning explanation." }
            },
            required: ["question", "options", "correctIndex", "explanation"]
          },
          description: "Exactly 3 multiple choice questions to test understanding."
        }
      },
      required: ["summary", "subject", "concepts", "flashcards", "quiz"]
    };

    let resultText = '';
    let sarvamFailed = false;

    if (process.env.SARVAM_API_KEY) {
      try {
        console.log('Attempting study material upload analysis with Sarvam AI...');
        const sarvamPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a raw JSON string matching the required structure. Do not use markdown blocks or backticks.`;
        const rawText = await callSarvamAI(sarvamPrompt, true);
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        JSON.parse(cleanedText); // Validate JSON format
        resultText = cleanedText;
        console.log('Successfully completed study material upload analysis with Sarvam AI.');
      } catch (error) {
        console.error('Sarvam AI failed or timed out:', error);
        sarvamFailed = true;
      }
    } else {
      sarvamFailed = true;
    }

    if (sarvamFailed || !resultText) {
      console.log('Falling back to Gemini for study material upload analysis...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.2
        }
      });
      resultText = response.text || '';
    }

    if (!resultText) {
      throw new Error('No text received from AI engine');
    }

    const aiGeneratedData = JSON.parse(resultText);

    // Create unique ID
    const materialId = `mat-${Date.now()}`;
    const subject = aiGeneratedData.subject || 'General Study';

    const newMaterial: Material = {
      id: materialId,
      title,
      type,
      content,
      summary: aiGeneratedData.summary,
      concepts: aiGeneratedData.concepts,
      createdAt: new Date().toISOString()
    };

    const newFlashcards: Flashcard[] = aiGeneratedData.flashcards.map((f: any, idx: number) => ({
      id: `card-${Date.now()}-${idx}`,
      materialId,
      materialTitle: title,
      question: f.question,
      answer: f.answer,
      difficulty: 'medium',
      box: 1,
      nextReviewDate: new Date().toISOString()
    }));

    const newQuiz: Quiz = {
      id: `quiz-${Date.now()}`,
      materialId,
      materialTitle: title,
      title: `${title} - Comprehension Check`,
      questions: aiGeneratedData.quiz,
      subject
    };

    const newRevisionTask: RevisionTask = {
      id: `rev-${Date.now()}`,
      title: `Practice flashcards: ${title}`,
      materialTitle: title,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subject,
      completed: false,
      type: 'practice'
    };

    // Append to list
    db.materials.push(newMaterial);
    db.flashcards.push(...newFlashcards);
    db.quizzes.push(newQuiz);
    db.revisionTasks.push(newRevisionTask);

    // Update Analytics: set initial subject readiness
    if (!db.analytics.examReadiness[subject]) {
      db.analytics.examReadiness[subject] = 50; // default initial readiness
    }
    db.analytics.totalTimeMinutes += 20; // 20 min estimated study added

    saveDatabase(db);

    res.json({
      success: true,
      material: newMaterial,
      flashcards: newFlashcards,
      quiz: newQuiz,
      revisionTask: newRevisionTask,
      sarvamFailed
    });

  } catch (error: any) {
    console.error('Gemini extraction error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with Gemini' });
  }
});

// Explain complex concepts in detail with Q&A using Gemini 3.5 Flash
app.post('/api/materials/explain', async (req, res) => {
  const { materialId, conceptTitle, question } = req.body;
  if (!materialId || !conceptTitle) {
    res.status(400).json({ error: 'Missing materialId or conceptTitle' });
    return;
  }

  const db = loadDatabase();
  const material = db.materials.find(m => m.id === materialId);
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }

  try {
    const ai = getGemini();
    const prompt = `You are a warm, highly-supportive AI tutor who specializes in adapting teaching style to help students master complex concepts.
Here is the context material:
"${material.content}"

Explain the concept "${conceptTitle}" in a customized, intuitive way. 
${question ? `The student has asked this specific question about it: "${question}"` : 'Explain it step-by-step with analogies and real-world relevance.'}

Provide your response in an elegant Markdown format. Include:
1. **Simplified Analogy** (something memorable and relatable)
2. **Technical breakdown** (clear, simple explanation of the core principles)
3. **Practice micro-question** (a small self-check question with the answer hidden as a spoiler or at the end).`;

    let explanation = '';
    let sarvamFailed = false;

    if (process.env.SARVAM_API_KEY) {
      try {
        console.log('Attempting concept explanation with Sarvam AI...');
        explanation = await callSarvamAI(prompt, false);
        console.log('Successfully completed concept explanation with Sarvam AI.');
      } catch (error) {
        console.error('Sarvam AI failed or timed out:', error);
        sarvamFailed = true;
      }
    } else {
      sarvamFailed = true;
    }

    if (sarvamFailed || !explanation) {
      console.log('Falling back to Gemini for concept explanation...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          temperature: 0.6
        }
      });
      explanation = response.text || '';
    }

    res.json({ explanation, sarvamFailed });
  } catch (error: any) {
    console.error('Gemini explanation error:', error);
    res.status(500).json({ error: error.message || 'Error calling Gemini API' });
  }
});

// Quiz Submission endpoint + WEAKNESS AUTO-SCHEDULE (KILLER FEATURE)
app.post('/api/quizzes/submit', async (req, res) => {
  const { quizId, answers } = req.body;
  if (!quizId || !answers) {
    res.status(400).json({ error: 'Missing quizId or answers' });
    return;
  }

  const db = loadDatabase();
  let sarvamFailed = false;
  const quiz = db.quizzes.find(q => q.id === quizId);
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }

  // Calculate score
  let score = 0;
  quiz.questions.forEach((q, idx) => {
    if (answers[idx] === q.correctIndex) {
      score++;
    }
  });

  const percentage = (score / quiz.questions.length) * 100;
  const isWeak = percentage < 65; // weak score threshold

  const newAttempt: QuizAttempt = {
    id: `att-${Date.now()}`,
    quizId,
    quizTitle: quiz.title,
    score,
    total: quiz.questions.length,
    answers,
    date: new Date().toISOString()
  };

  db.attempts.push(newAttempt);

  // Update Exam Readiness for the subject
  const subject = quiz.subject || 'General';
  const existingReadiness = db.analytics.examReadiness[subject] || 50;
  
  // Adjust readiness based on attempt score
  let updatedReadiness = existingReadiness;
  if (isWeak) {
    updatedReadiness = Math.max(25, existingReadiness - 8);
  } else {
    updatedReadiness = Math.min(100, existingReadiness + 12);
  }
  db.analytics.examReadiness[subject] = Math.round(updatedReadiness);

  // --- AUTOMATIC REINFORCEMENT ENGINE (Calculus / Weakness Detection) ---
  let weaknessReinforcements: {
    message: string;
    flashcards: Flashcard[];
    quiz: Quiz | null;
    tasks: RevisionTask[];
  } | null = null;

  if (isWeak) {
    // Add to weaknesses array
    const existingWeaknessIdx = db.analytics.weaknesses.findIndex(w => w.subject.toLowerCase() === subject.toLowerCase());
    const weaknessItem = {
      subject,
      score: Math.round(percentage),
      recommendation: `Scored ${score}/${quiz.questions.length} on "${quiz.title}". Automatically generated fresh adaptive drills and scheduled more frequent review tasks.`,
      lastTested: new Date().toISOString()
    };

    if (existingWeaknessIdx > -1) {
      db.analytics.weaknesses[existingWeaknessIdx] = weaknessItem;
    } else {
      db.analytics.weaknesses.push(weaknessItem);
    }

    // Call Gemini API to generate custom, targeted practice drills to support active improvement
    sarvamFailed = false;
    try {
      const ai = getGemini();
      const prompt = `The student scored poorly (${score}/${quiz.questions.length}) on the quiz "${quiz.title}" for the subject "${subject}".
The student was weak on these topics from the material: "${quiz.materialTitle}".

Generate:
1. Two target practice flashcards that reinforce the specific mistakes or fundamental formulas.
2. A small 2-question adaptive practice quiz targeting this exact sub-topic.

Format the response as JSON.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING, description: "A highly encouraging 1-sentence supportive tip addressing the student's struggle." },
          flashcards: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING }
              },
              required: ["question", "answer"]
            }
          },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["question", "options", "correctIndex", "explanation"]
            }
          }
        },
        required: ["explanation", "flashcards", "quiz"]
      };

      let resultText = '';
      if (process.env.SARVAM_API_KEY) {
        try {
          console.log('Attempting adaptive weakness remediation with Sarvam AI...');
          const sarvamPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a raw JSON string matching the required structure. Do not use markdown blocks or backticks.`;
          const rawText = await callSarvamAI(sarvamPrompt, true);
          const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          JSON.parse(cleanedText); // Validate JSON format
          resultText = cleanedText;
          console.log('Successfully completed adaptive weakness remediation with Sarvam AI.');
        } catch (error) {
          console.error('Sarvam AI failed or timed out:', error);
          sarvamFailed = true;
        }
      } else {
        sarvamFailed = true;
      }

      if (sarvamFailed || !resultText) {
        console.log('Falling back to Gemini for adaptive weakness remediation...');
        const aiRes = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.3
          }
        });
        resultText = aiRes.text || '';
      }

      const parsedGen = JSON.parse(resultText || '{}');

      // Create Flashcards
      const addedFlashcards: Flashcard[] = (parsedGen.flashcards || []).map((f: any, idx: number) => ({
        id: `card-adaptive-${Date.now()}-${idx}`,
        materialId: quiz.materialId,
        materialTitle: quiz.materialTitle,
        question: f.question,
        answer: f.answer,
        difficulty: 'hard',
        box: 1,
        nextReviewDate: new Date().toISOString(),
        isWeaknessCard: true
      }));

      // Create adaptive Quiz
      const adaptiveQuiz: Quiz = {
        id: `quiz-adaptive-${Date.now()}`,
        materialId: quiz.materialId,
        materialTitle: quiz.materialTitle,
        title: `Adaptive Reinforcement: ${subject} Review`,
        questions: parsedGen.quiz || [],
        isAdaptive: true,
        subject
      };

      // Add to revision tasks
      const extraTasks: RevisionTask[] = [
        {
          id: `rev-adaptive-fc-${Date.now()}`,
          title: `Reinforcement Drills: ${quiz.materialTitle}`,
          materialTitle: quiz.materialTitle,
          dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0], // in 12 hours (soon!)
          subject,
          completed: false,
          isAutoScheduled: true,
          type: 'practice'
        },
        {
          id: `rev-adaptive-qz-${Date.now()}`,
          title: `Try Adaptive Reinforcement Quiz`,
          materialTitle: quiz.materialTitle,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // tomorrow
          subject,
          completed: false,
          isAutoScheduled: true,
          type: 'quiz'
        }
      ];

      db.flashcards.push(...addedFlashcards);
      db.quizzes.push(adaptiveQuiz);
      db.revisionTasks.push(...extraTasks);

      // Boost analytical/retrieval learning preference
      db.analytics.learningStyle.activeRecallScore = Math.min(100, db.analytics.learningStyle.activeRecallScore + 5);
      db.analytics.learningStyle.retrievalScore = Math.min(100, db.analytics.learningStyle.retrievalScore + 4);

      weaknessReinforcements = {
        message: parsedGen.explanation || "Don't sweat it! AI has auto-scheduled target practice and built adaptive quizzes to help you break through this bottleneck.",
        flashcards: addedFlashcards,
        quiz: adaptiveQuiz,
        tasks: extraTasks
      };

    } catch (e) {
      console.error('Failed to auto-generate adaptive weakness remediation', e);
    }
  } else {
    // If passed excellently, resolve any registered weakness for this subject
    const existingIdx = db.analytics.weaknesses.findIndex(w => w.subject.toLowerCase() === subject.toLowerCase());
    if (existingIdx > -1 && percentage >= 80) {
      db.analytics.weaknesses.splice(existingIdx, 1);
    }
  }

  // Update last active
  db.analytics.lastActive = new Date().toISOString().split('T')[0];
  saveDatabase(db);

  res.json({
    attempt: newAttempt,
    percentage,
    isWeak,
    subjectReadiness: db.analytics.examReadiness[subject],
    weaknessReinforcements,
    sarvamFailed
  });
});

// Flashcard Spaced Repetition Review update
app.post('/api/flashcards/review', (req, res) => {
  const { cardId, rating } = req.body; // rating: 'easy' | 'medium' | 'hard'
  if (!cardId || !rating) {
    res.status(400).json({ error: 'Missing cardId or rating' });
    return;
  }

  const db = loadDatabase();
  const cardIdx = db.flashcards.findIndex(f => f.id === cardId);
  if (cardIdx === -1) {
    res.status(404).json({ error: 'Flashcard not found' });
    return;
  }

  const card = db.flashcards[cardIdx];
  card.difficulty = rating;

  // Spaced repetition scheduler (Leitner boxes)
  if (rating === 'easy') {
    card.box = Math.min(5, card.box + 1);
  } else if (rating === 'medium') {
    // Keep in same box
  } else {
    card.box = 1; // Back to box 1 for hard reviews
  }

  // Calculate next review interval in days
  // Box 1: 1 day, Box 2: 3 days, Box 3: 7 days, Box 4: 14 days, Box 5: 30 days
  const intervals = [1, 3, 7, 14, 30];
  const days = intervals[card.box - 1];
  card.nextReviewDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  // Award user metrics for active recall
  db.analytics.totalTimeMinutes += 2;
  db.analytics.learningStyle.activeRecallScore = Math.min(100, db.analytics.learningStyle.activeRecallScore + 1);

  saveDatabase(db);
  res.json({ success: true, updatedCard: card });
});

// Group study guide merge (KILLER FEATURE)
app.post('/api/group/merge', async (req, res) => {
  const { title, sources } = req.body; // sources: Array of { author: string, content: string }
  if (!title || !sources || !Array.isArray(sources) || sources.length < 2) {
    res.status(400).json({ error: 'Title and at least 2 source texts are required' });
    return;
  }

  const db = loadDatabase();

  try {
    const ai = getGemini();

    const formattedSources = sources.map((s, idx) => `Student ${idx + 1} (${s.author}):\n${s.content}\n`).join('\n---\n');

    const prompt = `You are an elite academic synthesizer. You have been provided with different sets of lecture notes and study summaries uploaded by a group of classmates.
Your task is to:
1. Carefully compare all versions.
2. Resolve any contradictory notes, terms, or definitions by using the most logical and accurate scientific explanation.
3. Merge overlapping theories, concepts, and details.
4. Synthesize everything into one comprehensive, high-quality Study Guide in standard Markdown.
5. Provide a combined executive level overview and 3 critical takeaway sentences.

Title of Guide: "${title}"
Student Notes Provided:
${formattedSources}

Deliver your response strictly structured in JSON format.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        mergedSummary: {
          type: Type.STRING,
          description: "An elegant, highly academic 2-paragraph overview explaining what the merged guide covers."
        },
        unifiedStudyGuide: {
          type: Type.STRING,
          description: "A comprehensive, extremely robust and cohesive Study Guide strictly formatted in rich Markdown. Must include headers, bullet points, and resolved definitions."
        },
        keyTakeaways: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Exactly 3 crucial summary statements that represent the absolute core learning takeaways from all merged materials combined."
        }
      },
      required: ["mergedSummary", "unifiedStudyGuide", "keyTakeaways"]
    };

    let resultText = '';
    let sarvamFailed = false;

    if (process.env.SARVAM_API_KEY) {
      try {
        console.log('Attempting classmate notes merger with Sarvam AI...');
        const sarvamPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a raw JSON string matching the required structure. Do not use markdown blocks or backticks.`;
        const rawText = await callSarvamAI(sarvamPrompt, true);
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        JSON.parse(cleanedText); // Validate JSON format
        resultText = cleanedText;
        console.log('Successfully completed classmate notes merger with Sarvam AI.');
      } catch (error) {
        console.error('Sarvam AI failed or timed out:', error);
        sarvamFailed = true;
      }
    } else {
      sarvamFailed = true;
    }

    if (sarvamFailed || !resultText) {
      console.log('Falling back to Gemini for classmate notes merger...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.4
        }
      });
      resultText = response.text || '';
    }

    const parsedGuide = JSON.parse(resultText || '{}');

    const newGroupStudy: GroupStudy = {
      id: `group-${Date.now()}`,
      title,
      sources,
      mergedSummary: parsedGuide.mergedSummary,
      unifiedStudyGuide: parsedGuide.unifiedStudyGuide,
      keyTakeaways: parsedGuide.keyTakeaways,
      createdAt: new Date().toISOString()
    };

    db.groupStudies.push(newGroupStudy);
    db.analytics.totalTimeMinutes += 30; // Merging grants collaborative time study

    saveDatabase(db);
    res.json({ success: true, studyGuide: newGroupStudy, sarvamFailed });

  } catch (error: any) {
    console.error('Gemini notes merger error:', error);
    res.status(500).json({ error: error.message || 'Error compiling collective notes via Gemini' });
  }
});

// Planner task completion toggle
app.post('/api/planner/toggle', (req, res) => {
  const { taskId } = req.body;
  if (!taskId) {
    res.status(400).json({ error: 'Missing taskId' });
    return;
  }

  const db = loadDatabase();
  const taskIdx = db.revisionTasks.findIndex(t => t.id === taskId);
  if (taskIdx === -1) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const task = db.revisionTasks[taskIdx];
  task.completed = !task.completed;

  // If completed, boost analytical or retrieval analytics
  if (task.completed) {
    db.analytics.totalTimeMinutes += 15;
    db.analytics.learningStyle.retrievalScore = Math.min(100, db.analytics.learningStyle.retrievalScore + 2);
  }

  saveDatabase(db);
  res.json({ success: true, updatedTask: task });
});

// Update customized style or study preferences manually
app.post('/api/analytics/style', (req, res) => {
  const { preferredStyleName } = req.body;
  if (!preferredStyleName) {
    res.status(400).json({ error: 'Missing style parameter' });
    return;
  }

  const db = loadDatabase();
  db.analytics.preferredStyleName = preferredStyleName;
  saveDatabase(db);
  res.json({ success: true, analytics: db.analytics });
});

// --- NEW FEATURE ENDPOINTS ---

// 1. AI Tutor Chat with RAG search and citations
app.post('/api/tutor/chat', async (req, res) => {
  const { question, activeMaterialId } = req.body;
  if (!question) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }

  const db = loadDatabase();
  let context = '';
  let citations: { source: string; snippet: string }[] = [];

  if (activeMaterialId && activeMaterialId !== 'all') {
    const mat = db.materials.find(m => m.id === activeMaterialId);
    if (mat) {
      context = `Source Material [${mat.title}]:\n${mat.content}`;
      citations.push({ source: mat.title, snippet: mat.content.substring(0, 150) + '...' });
    }
  } else {
    // RAG-style: Find relevant materials by checking keyword matching
    const keywords = question.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const relevantMaterials = db.materials.filter(mat => {
      return keywords.some((kw: string) => mat.content.toLowerCase().includes(kw) || mat.title.toLowerCase().includes(kw));
    });

    const targets = relevantMaterials.length > 0 ? relevantMaterials : db.materials;
    context = targets.map(mat => `Source Material [${mat.title}]:\n${mat.content}`).join('\n\n');
    targets.forEach(mat => {
      citations.push({ source: mat.title, snippet: mat.summary || mat.content.substring(0, 100) + '...' });
    });
  }

  try {
    const ai = getGemini();
    const prompt = `You are an elite RAG-enabled university AI tutor. Answer the student's question directly based on the provided course materials. 
Always include citations formatted clearly as "[Source: Title of Material]". At the end of your answer, list the exact files used to formulate the response.

Provided Course Materials:
${context}

Student's Question: "${question}"

Formulate a supportive, clear response in Markdown format. Citing source material strictly where appropriate.`;

    let answerText = '';
    let sarvamFailed = false;

    if (process.env.SARVAM_API_KEY) {
      try {
        console.log('Attempting tutor chat with Sarvam AI...');
        answerText = await callSarvamAI(prompt, false);
        console.log('Successfully completed tutor chat with Sarvam AI.');
      } catch (error) {
        console.error('Sarvam AI failed or timed out:', error);
        sarvamFailed = true;
      }
    } else {
      sarvamFailed = true;
    }

    if (sarvamFailed || !answerText) {
      console.log('Falling back to Gemini for tutor chat...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          temperature: 0.3
        }
      });
      answerText = response.text || '';
    }

    // Award active recall points
    db.analytics.totalTimeMinutes += 2;
    saveDatabase(db);

    res.json({ answer: answerText, citations, sarvamFailed });
  } catch (error: any) {
    console.error('Tutor chat error:', error);
    res.status(500).json({ error: error.message || 'Error communicating with Gemini' });
  }
});

// 2. Syllabus / Deadline Auto-Sync Scanner
app.post('/api/planner/deadline-sync', async (req, res) => {
  const { syllabusText } = req.body;
  if (!syllabusText) {
    res.status(400).json({ error: 'Syllabus text is required' });
    return;
  }

  const db = loadDatabase();

  try {
    const ai = getGemini();
    const prompt = `You are an academic advisor. Analyze this course syllabus, lecture schedule, or assignments details, and extract all upcoming due dates, exams, or homework assignments. 
Return exactly 3 or 4 actionable revision or study tasks for the Revision Planner.
Format the output as a JSON array matching the required schema. Ensure the date is in 'YYYY-MM-DD' format and is in the near future (e.g., relative to today: ${new Date().toISOString().split('T')[0]}).

Syllabus/Course Content:
${syllabusText}`;

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Actionable study or assignment task title, e.g. "Prepare for Midterm on Limits"' },
          dueDate: { type: Type.STRING, description: 'YYYY-MM-DD date' },
          subject: { type: Type.STRING, description: 'Subject of the course, e.g. Calculus, Physics, Machine Learning' },
          type: { type: Type.STRING, description: 'One of: practice, quiz, review' }
        },
        required: ['title', 'dueDate', 'subject', 'type']
      }
    };

    let resultText = '';
    let sarvamFailed = false;

    if (process.env.SARVAM_API_KEY) {
      try {
        console.log('Attempting syllabus sync with Sarvam AI...');
        const sarvamPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a raw JSON string matching the required structure. Do not use markdown blocks or backticks.`;
        const rawText = await callSarvamAI(sarvamPrompt, true);
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        JSON.parse(cleanedText); // Validate JSON format
        resultText = cleanedText;
        console.log('Successfully completed syllabus sync with Sarvam AI.');
      } catch (error) {
        console.error('Sarvam AI failed or timed out:', error);
        sarvamFailed = true;
      }
    } else {
      sarvamFailed = true;
    }

    if (sarvamFailed || !resultText) {
      console.log('Falling back to Gemini for syllabus sync...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.2
        }
      });
      resultText = response.text || '';
    }

    const parsedTasks = JSON.parse(resultText || '[]');
    const addedTasks: RevisionTask[] = parsedTasks.map((t: any, idx: number) => ({
      id: `task-sync-${Date.now()}-${idx}`,
      title: t.title,
      dueDate: t.dueDate,
      subject: t.subject || 'General',
      completed: false,
      isAutoScheduled: true,
      type: t.type || 'review'
    }));

    db.revisionTasks.push(...addedTasks);
    saveDatabase(db);

    res.json({ success: true, addedTasks, sarvamFailed });
  } catch (error: any) {
    console.error('Deadline sync error:', error);
    res.status(500).json({ error: error.message || 'Error processing syllabus' });
  }
});

// 3. Practice Exam Past-Paper Generator
app.post('/api/quizzes/generate-past-paper', async (req, res) => {
  const { subject } = req.body;
  if (!subject) {
    res.status(400).json({ error: 'Subject is required' });
    return;
  }

  const db = loadDatabase();
  const relevantContent = db.materials
    .filter(m => (m.summary || '').toLowerCase().includes(subject.toLowerCase()) || m.title.toLowerCase().includes(subject.toLowerCase()))
    .map(m => m.content)
    .join('\n\n') || 'General advanced academic topics.';

  try {
    const ai = getGemini();
    const prompt = `You are a university exam administrator. Generate a rigorous, past-paper style Mock Exam for the subject "${subject}" based on this context content:
${relevantContent}

Generate a set of exactly 4 advanced multiple choice questions with formal past-paper style headings, Section Allocations (e.g., "Section A: [5 Marks]"), and strict difficulty. Each question must have exactly 4 choices, one correct choice, and a deep learning explanation.

Format response strictly as JSON.`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Formal name of the mock exam, e.g., "Calculus I: 2025 Past-Paper Simulation"' },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: 'Formal, rigorous past-paper styled question, e.g., "[5 Marks] Consider the limit..."' },
              options: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Exactly 4 multiple choice options.' },
              correctIndex: { type: Type.INTEGER, description: '0-based index of correct option.' },
              explanation: { type: Type.STRING, description: 'Rigorous step-by-step math or reasoning explanation.' }
            },
            required: ['question', 'options', 'correctIndex', 'explanation']
          }
        }
      },
      required: ['title', 'questions']
    };

    let resultText = '';
    let sarvamFailed = false;

    if (process.env.SARVAM_API_KEY) {
      try {
        console.log('Attempting past paper generation with Sarvam AI...');
        const sarvamPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a raw JSON string matching the required structure. Do not use markdown blocks or backticks.`;
        const rawText = await callSarvamAI(sarvamPrompt, true);
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        JSON.parse(cleanedText); // Validate JSON format
        resultText = cleanedText;
        console.log('Successfully completed past paper generation with Sarvam AI.');
      } catch (error) {
        console.error('Sarvam AI failed or timed out:', error);
        sarvamFailed = true;
      }
    } else {
      sarvamFailed = true;
    }

    if (sarvamFailed || !resultText) {
      console.log('Falling back to Gemini for past paper generation...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.3
        }
      });
      resultText = response.text || '';
    }

    const parsedPaper = JSON.parse(resultText || '{}');
    const newQuiz: Quiz = {
      id: `quiz-past-${Date.now()}`,
      materialId: 'past-paper',
      materialTitle: 'Past Paper Simulation',
      title: parsedPaper.title || `${subject} Past-Paper Simulation`,
      questions: parsedPaper.questions || [],
      isAdaptive: false,
      subject
    };

    db.quizzes.push(newQuiz);
    saveDatabase(db);

    res.json({ success: true, quiz: newQuiz, sarvamFailed });
  } catch (error: any) {
    console.error('Past paper generation error:', error);
    res.status(500).json({ error: error.message || 'Error generating past paper' });
  }
});

// 4. TTS recap generator
app.post('/api/materials/tts-summary', async (req, res) => {
  const { materialId } = req.body;
  if (!materialId) {
    res.status(400).json({ error: 'Material ID is required' });
    return;
  }

  const db = loadDatabase();
  const mat = db.materials.find(m => m.id === materialId);
  if (!mat) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }

  try {
    const ai = getGemini();
    const prompt = `You are a professional academic narrator. Provide a clear, highly structured and spoken audio summary of this course material: "${mat.title}". Summarize the key concepts concisely. 

Content to summarize:
${mat.summary || mat.content}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' } // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('Could not generate speech data.');
    }

    res.json({ success: true, base64Audio });
  } catch (error: any) {
    console.error('TTS Generation error:', error);
    res.status(500).json({ error: error.message || 'Error generating TTS audio summary' });
  }
});

// --- Vite Middleware Server Setup ---
async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
