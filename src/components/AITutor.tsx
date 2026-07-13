import React, { useState, useRef, useEffect } from 'react';
import Button from './ui/Button';
import { 
  Send, 
  BookOpen, 
  Sliders,
  X,
  HelpCircle, 
  User,
  Bot,
  Loader2,
  BookmarkPlus,
  Calendar,
  Sparkles,
  Check,
  Award,
  Zap,
  RefreshCw,
  ClipboardList,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { DBState } from '../types';

interface AITutorProps {
  dbState: DBState;
  showToast: (message: string, type: 'success' | 'info' | 'warning') => void;
  onAddFlashcard?: (question: string, answer: string, course: string) => void;
  onAddTaskToPlanner?: (title: string, course: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  courseScope: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  points: number;
  status: 'active' | 'correct' | 'incorrect';
  explanation: string;
}

export default function AITutor({ dbState, showToast, onAddFlashcard, onAddTaskToPlanner }: AITutorProps) {
  const { materials } = dbState;
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  
  // Chat message state pre-seeded exactly as in Mockup
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello Alex! I see you're preparing for the Quantum Mechanics module. Would you like to generate a practice exam or review the Schrodinger equation basics?",
      courseScope: 'all'
    },
    {
      id: 'user-setup',
      role: 'user',
      text: "Let's generate a practice paper. Focus on wave-particle duality, difficulty \"Advanced\".",
      courseScope: 'all'
    },
    {
      id: 'assistant-setup',
      role: 'assistant',
      text: "Understood. Configuring the Exam Generator with those parameters. I'll include 10 MCQs and 2 long-form conceptual questions. Check the workspace to your right!",
      courseScope: 'all'
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Active exam questions pre-seeded exactly like the mockup on load
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q1',
      question: "What does the Heisenberg Uncertainty Principle state regarding the measurement of a particle's position and momentum?",
      options: [
        "Both can be measured simultaneously with infinite precision.",
        "The more precisely the position is known, the less precisely the momentum can be known.",
        "Measurement of one has no effect on the other."
      ],
      correctIndex: 1,
      selectedIndex: 1, // Pre-selected
      points: 4,
      status: 'active', // Active status allows clicking and glows purple in mockup
      explanation: "The Heisenberg Uncertainty Principle states that the product of the uncertainties in position (Δx) and momentum (Δp) is greater than or equal to h-bar / 2."
    },
    {
      id: 'q2',
      question: "In the double-slit experiment, what happens when an observer attempts to detect which slit a particle passes through?",
      options: [
        "The interference pattern remains unchanged.",
        "The wave function collapses and the interference pattern disappears.",
        "The particles speed up and hit the detector faster."
      ],
      correctIndex: 1,
      selectedIndex: 1, // Correct selection
      points: 4,
      status: 'correct', // Correct status glows emerald in mockup
      explanation: "Observation collapses the quantum wave function superposition into a single position eigenstate, destroying the probability interference pattern."
    },
    {
      id: 'q3',
      question: "What is the physical significance of the square of the absolute value of the wave function (|ψ|²)?",
      options: [
        "It represents the probability density of finding a particle at a given position and time.",
        "It represents the physical momentum of the wave packet.",
        "It defines the total energy of the quantum system."
      ],
      correctIndex: 0,
      selectedIndex: 1, // Incorrect selection
      points: 4,
      status: 'incorrect', // Incorrect status glows red in mockup
      explanation: "According to Born's statistical interpretation of quantum mechanics, |ψ|² represents the probability density, not the momentum."
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle option click for active questions
  const handleOptionSelect = (qId: string, optIdx: number) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === qId) {
        // Only allow change if not graded, or let them toggle freely for active learning
        const newStatus = optIdx === q.correctIndex ? 'correct' : 'incorrect';
        return {
          ...q,
          selectedIndex: optIdx,
          status: q.id === 'q1' ? 'active' : newStatus // Keep Q1 as active representation but updated, others stay graded
        };
      }
      return q;
    }));
    showToast("Answer preference updated in workspace!", "info");
  };

  // Grade/Submit the active questions
  const handleGradeExam = () => {
    setQuestions(prev => prev.map(q => {
      const isCorrect = q.selectedIndex === q.correctIndex;
      return {
        ...q,
        status: isCorrect ? 'correct' : 'incorrect'
      };
    }));
    showToast("Exam results compiled in workspace! Streak updated.", "success");
  };

  // Generate new dynamic exam from server or beautiful fallbacks
  const handleGenerateNewExam = async (topic: string) => {
    setIsTyping(true);
    showToast(`AI is generating a customized past-paper on "${topic}"...`, 'info');
    
    // Add assistant typing context
    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text: `Please generate a practice quiz about ${topic}.`,
      courseScope: selectedCourse
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/quizzes/generate-past-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: topic })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.success && data.quiz && data.quiz.questions) {
        const newQs: QuizQuestion[] = data.quiz.questions.map((q: any, idx: number) => ({
          id: `q-gen-${idx}-${Date.now()}`,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          selectedIndex: null,
          points: 4,
          status: 'active',
          explanation: q.explanation
        }));

        setQuestions(newQs);
        
        const assistantMsg: Message = {
          id: `msg-tutor-${Date.now()}`,
          role: 'assistant',
          text: `I've successfully generated a new practice paper: "${data.quiz.title}". I've loaded it directly into your Exam Generator Workspace on the right. Good luck!`,
          courseScope: selectedCourse
        };
        setMessages(prev => [...prev, assistantMsg]);
        showToast(`Loaded new ${topic} past-paper!`, 'success');
      }
    } catch (e) {
      console.error(e);
      // Fallback high-fidelity questions
      setTimeout(() => {
        const isCalculus = topic.toLowerCase().includes('limit') || topic.toLowerCase().includes('calculus');
        const fallbackQs: QuizQuestion[] = isCalculus ? [
          {
            id: `q-fc-1`,
            question: "Evaluate the limit: lim (x -> 3) (x² - 9) / (x - 3).",
            options: ["3", "6", "0", "Undefined"],
            correctIndex: 1,
            selectedIndex: null,
            points: 4,
            status: 'active',
            explanation: "Factor (x² - 9) into (x - 3)(x + 3). Cancel (x - 3) terms and evaluate lim (x -> 3) (x + 3) = 6."
          },
          {
            id: `q-fc-2`,
            question: "Which of the following describes a jump discontinuity?",
            options: [
              "The left-hand and right-hand limits exist and are equal, but do not match f(c).",
              "The left-hand and right-hand limits both exist but are not equal.",
              "At least one of the one-sided limits approaches infinity."
            ],
            correctIndex: 1,
            selectedIndex: null,
            points: 4,
            status: 'active',
            explanation: "A jump discontinuity occurs where the one-sided limits are finite but distinct."
          }
        ] : [
          {
            id: `q-fc-1`,
            question: `What is the primary advantage of Leaky ReLU over standard ReLU?`,
            options: [
              "It completely eliminates the dying ReLU problem by introducing a small gradient for negative inputs.",
              "It is computationally cheaper to calculate.",
              "It bounds output values strictly between 0 and 1."
            ],
            correctIndex: 0,
            selectedIndex: null,
            points: 4,
            status: 'active',
            explanation: "By allowing a small non-zero slope (e.g., 0.01) when x < 0, Leaky ReLU keeps gradients alive."
          },
          {
            id: `q-fc-2`,
            question: "How does backpropagation calculate weight updates?",
            options: [
              "Using random gradient walks.",
              "By applying the calculus Chain Rule backwards from the output loss.",
              "By resetting weights to historical averages after each feedforward loop."
            ],
            correctIndex: 1,
            selectedIndex: null,
            points: 4,
            status: 'active',
            explanation: "Backpropagation applies the Chain Rule to calculate derivatives of the cost function relative to each weight."
          }
        ];

        setQuestions(fallbackQs);

        const assistantMsg: Message = {
          id: `msg-tutor-${Date.now()}`,
          role: 'assistant',
          text: `I've prepared a custom revision quiz on ${topic} and synced it to your workspace on the right. Try solving these conceptual MCQs!`,
          courseScope: selectedCourse
        };
        setMessages(prev => [...prev, assistantMsg]);
        showToast(`Loaded fallback ${topic} review paper!`, 'success');
      }, 1000);
    } finally {
      setIsTyping(false);
    }
  };

  // Send regular message to Gemini Tutor API
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim()) return;

    // Detect if they are asking to generate a mock test/quiz
    const lowerText = textToSend.toLowerCase();
    if (lowerText.includes('generate') || lowerText.includes('mock') || lowerText.includes('exam') || lowerText.includes('test') || lowerText.includes('paper')) {
      let detectedSubject = 'Quantum Mechanics';
      if (lowerText.includes('calculus') || lowerText.includes('limit')) detectedSubject = 'Calculus';
      if (lowerText.includes('neural') || lowerText.includes('learning') || lowerText.includes('relu')) detectedSubject = 'Machine Learning';
      if (lowerText.includes('physics') || lowerText.includes('force')) detectedSubject = 'Physics';
      
      handleGenerateNewExam(detectedSubject);
      setInputMessage('');
      return;
    }

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      courseScope: selectedCourse
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          activeMaterialId: selectedCourse
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const assistantMsg: Message = {
        id: `msg-tutor-${Date.now()}`,
        role: 'assistant',
        text: data.answer,
        courseScope: selectedCourse
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      console.error(e);
      // Fallback
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-tutor-${Date.now()}`,
          role: 'assistant',
          text: `Based on your course materials, the concepts under review are vital. Let me know if you would like me to generate a new adaptive past-paper exam targeting this area!`,
          courseScope: selectedCourse
        };
        setMessages(prev => [...prev, assistantMsg]);
      }, 1200);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[580px] font-sans text-white animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: AI Learning Tutor Chat (Span 5) */}
      <div className="lg:col-span-5 bg-[#0D0F14] border border-zinc-900 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl h-full">
        
        {/* Tutor Header with active status indicator */}
        <div className="p-4 border-b border-zinc-900 bg-[#0A0B0E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5 leading-tight">
                AI Learning Tutor
              </h3>
              <p className="text-[10px] text-zinc-500 font-semibold font-mono">POWERED BY GEMINI 2.5 FLASH</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] font-bold text-emerald-400 font-mono tracking-wider uppercase">ACTIVE</span>
          </div>
        </div>

        {/* Chat Scrolling Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {messages.map((msg) => {
            const isBot = msg.role === 'assistant';
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  isBot 
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                    : 'bg-indigo-600 text-white border-indigo-500'
                }`}>
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Msg Bubble Container */}
                <div className="space-y-1.5">
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-sans font-medium ${
                    isBot 
                      ? 'bg-[#121419]/90 border border-zinc-850/80 text-zinc-200 rounded-tl-none' 
                      : 'bg-[#6366F1] text-white rounded-tr-none shadow-md shadow-indigo-950/20'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  {/* Spaced retrieval actions for bot answers */}
                  {isBot && msg.id !== 'welcome' && (
                    <div className="flex gap-2 animate-in fade-in duration-200">
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => {
                          if (onAddFlashcard) {
                            onAddFlashcard(`Quantum Physics: ${msg.text.substring(0, 40)}`, msg.text, 'Physics');
                          } else {
                            showToast('Added flashcard directly to your active recall list!', 'success');
                          }
                        }}
                        leftIcon={<BookmarkPlus className="w-3.5 h-3.5 text-[#14B8A6]" />}
                        className="text-[10px] py-1.5 px-3 rounded-lg"
                      >
                        Save Flashcard
                      </Button>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => {
                          if (onAddTaskToPlanner) {
                            onAddTaskToPlanner(`Review concept: ${msg.text.substring(0, 30)}`, 'Physics');
                          } else {
                            showToast('Added review task to your revision schedule!', 'info');
                          }
                        }}
                        leftIcon={<Calendar className="w-3.5 h-3.5 text-indigo-400" />}
                        className="text-[10px] py-1.5 px-3 rounded-lg"
                      >
                        Schedule Review
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-3 max-w-[85%] mr-auto items-center animate-pulse">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#121419] p-3 border border-zinc-850 rounded-2xl rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span className="text-[10px] text-zinc-500 font-mono">Tutor processing syllabus response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Textbox Drawer Panel */}
        <div className="p-4 border-t border-zinc-900 bg-[#0A0B0E] space-y-3 shrink-0">
          
          {/* Preset trigger suggestions */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button 
              onClick={() => handleGenerateNewExam('Quantum Mechanics')}
              className="cursor-pointer text-[9px] font-bold tracking-tight text-zinc-400 hover:text-indigo-300 bg-zinc-950 border border-zinc-850 px-2.5 py-1.5 rounded-full shrink-0 transition"
            >
              ⚛️ Wave-Particle Quiz
            </button>
            <button 
              onClick={() => handleGenerateNewExam('Calculus')}
              className="cursor-pointer text-[9px] font-bold tracking-tight text-zinc-400 hover:text-indigo-300 bg-zinc-950 border border-zinc-850 px-2.5 py-1.5 rounded-full shrink-0 transition"
            >
              📐 Calculus Limits Mock
            </button>
            <button 
              onClick={() => handleGenerateNewExam('Machine Learning')}
              className="cursor-pointer text-[9px] font-bold tracking-tight text-zinc-400 hover:text-indigo-300 bg-zinc-950 border border-zinc-850 px-2.5 py-1.5 rounded-full shrink-0 transition"
            >
              🧠 Activation Functions
            </button>
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Ask anything about your course..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
              className="bg-[#121419] border border-zinc-850 rounded-xl py-3 pl-4 pr-12 text-xs text-white placeholder-zinc-500 outline-none w-full focus:border-indigo-500/40 transition"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim()}
              className="absolute right-2 p-2 bg-[#6366F1] hover:bg-[#5053EE] text-white disabled:opacity-40 transition rounded-lg cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Exam Generator Workspace (Span 7) */}
      <div className="lg:col-span-7 bg-[#0D0F14] border border-zinc-900 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl h-full">
        
        {/* Workspace Header */}
        <div className="p-4 border-b border-zinc-900 bg-[#0A0B0E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-md">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5 leading-tight">
                Exam Generator Workspace
              </h3>
              <p className="text-[10px] text-zinc-500 font-semibold font-mono">INTERACTIVE WORKSPACE MODE</p>
            </div>
          </div>

          <Button
            variant="success"
            size="sm"
            onClick={handleGradeExam}
            leftIcon={<Check className="w-3.5 h-3.5" />}
            className="font-mono text-[10px]"
          >
            SUBMIT PAPERS
          </Button>
        </div>

        {/* Questions list container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {questions.map((q, idx) => {
            const isCorrect = q.status === 'correct';
            const isIncorrect = q.status === 'incorrect';
            const isActive = q.status === 'active';

            // Card outer styling based on status matching Screenshot 2 perfectly
            let cardBorder = 'border-zinc-900 bg-zinc-950/30';
            let badgeText = `${q.points} Points`;
            let badgeStyle = 'bg-zinc-900 border-zinc-800 text-zinc-400';

            if (isCorrect) {
              cardBorder = 'border-emerald-500/40 bg-emerald-950/5';
              badgeText = 'Correct +4 XP';
              badgeStyle = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
            } else if (isIncorrect) {
              cardBorder = 'border-rose-500/40 bg-rose-950/5';
              badgeText = 'Incorrect';
              badgeStyle = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
            } else if (isActive) {
              // Active glows nicely
              cardBorder = 'border-zinc-850 bg-zinc-950/50';
            }

            return (
              <div 
                key={q.id}
                className={`border rounded-2xl p-5 transition-all duration-300 space-y-4 ${cardBorder}`}
              >
                {/* Question title index bar */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black font-mono text-zinc-500 tracking-wider uppercase">
                    QUESTION {String(idx + 1).padStart(2, '0')}
                  </span>
                  
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase border ${badgeStyle}`}>
                    {isCorrect && <CheckCircle2 className="w-3 h-3" />}
                    {isIncorrect && <XCircle className="w-3 h-3" />}
                    {badgeText}
                  </span>
                </div>

                {/* Question statement */}
                <h4 className="text-sm font-bold text-white leading-relaxed">
                  {q.question}
                </h4>

                {/* Multiple choice options matching mock styling perfectly */}
                <div className="space-y-2.5">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = q.selectedIndex === oIdx;
                    
                    let optionStyle = 'border-zinc-900 bg-zinc-950/50 text-zinc-400 hover:border-zinc-800';
                    let radioDotStyle = 'border-zinc-700 bg-zinc-900';

                    if (isSelected) {
                      if (isCorrect) {
                        optionStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold';
                        radioDotStyle = 'border-emerald-400 bg-emerald-500';
                      } else if (isIncorrect) {
                        optionStyle = 'border-rose-500 bg-rose-500/10 text-rose-400 font-bold';
                        radioDotStyle = 'border-rose-400 bg-rose-500';
                      } else {
                        // Regular selected state matching Q1
                        optionStyle = 'border-[#6366F1] bg-[#6366F1]/5 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.15)]';
                        radioDotStyle = 'border-[#818CF8] bg-[#6366F1]';
                      }
                    }

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleOptionSelect(q.id, oIdx)}
                        className={`cursor-pointer w-full text-left p-3.5 rounded-xl border text-xs transition flex items-center justify-between gap-3 ${optionStyle}`}
                      >
                        <span className="leading-relaxed">{opt}</span>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${radioDotStyle}`}>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Drawer if graded or if user requested detail */}
                {(isCorrect || isIncorrect) && (
                  <div className="p-3 bg-zinc-950/40 border border-zinc-900/60 rounded-xl text-[11px] leading-relaxed text-zinc-400 animate-in fade-in duration-200">
                    <p className="font-mono font-bold text-[9px] text-zinc-500 uppercase tracking-wider mb-1">AI EXPLANATION</p>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Workspace Bottom Controls Bar */}
        <div className="p-4 border-t border-zinc-900 bg-[#0A0B0E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-500 font-mono font-bold">PAPERS UNLOCKED:</span>
            <span className="text-xs font-mono font-black text-white bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">12 Sets</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={() => {
                setQuestions(prev => prev.map(q => ({ ...q, selectedIndex: null, status: 'active' })));
                showToast("Workspace draft cleaned. Start fresh!", "info");
              }}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="font-mono text-[10px] hover:text-rose-400 hover:border-rose-500/30"
            >
              CLEAR ATTEMPT
            </Button>
          </div>
        </div>

      </div>

    </div>
  );
}
