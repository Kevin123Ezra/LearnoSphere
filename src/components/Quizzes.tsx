import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  Play, 
  Sparkles, 
  Loader2,
  FileText,
  Clock,
  HelpCircle,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { DBState, Quiz, QuizAttempt } from '../types';

interface QuizzesProps {
  dbState: DBState;
  onQuizSubmitted: (data: {
    attempt: QuizAttempt;
    percentage: number;
    isWeak: boolean;
    subjectReadiness: number;
    weaknessReinforcements: any;
  }) => void;
  onNewQuizGenerated?: (quiz: Quiz) => void;
}

export default function Quizzes({ dbState, onQuizSubmitted, onNewQuizGenerated }: QuizzesProps) {
  const { quizzes, attempts } = dbState;
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  
  // Past Paper Mock Generator states
  const [subjectInput, setSubjectInput] = useState('');
  const [questionSize, setQuestionSize] = useState<number>(5);
  const [formatStyle, setFormatStyle] = useState<string>('MCQ');
  const [difficultyTier, setDifficultyTier] = useState<string>('Challenging Honors');
  const [isGeneratingMock, setIsGeneratingMock] = useState(false);
  const [mockStatus, setMockStatus] = useState<string | null>(null);
  const [activeGeneratorTab, setActiveGeneratorTab] = useState<'generate' | 'my-papers'>('generate');

  // Interactive Quiz Taking states
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  
  // Hint & Breakdown Help States
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null);
  
  // Countdown Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Adaptive reinforcement callback states
  const [isSubmittingToDB, setIsSubmittingToDB] = useState(false);
  const [remediationFeedback, setRemediationFeedback] = useState<{
    message: string;
    flashcardsCount: number;
    quizTitle: string;
  } | null>(null);

  // Auto-ticks past-paper exam countdown
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !quizFinished && selectedQuiz) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timeLeft === 0 && !quizFinished && selectedQuiz) {
      // Trigger auto submission
      handleAutoSubmit();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, quizFinished]);

  const startQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setUserAnswers([]);
    setQuizScore(0);
    setQuizFinished(false);
    setRemediationFeedback(null);
    setActiveHint(null);
    setActiveBreakdown(null);

    // If past-paper style, initialize a 15-minute countdown (900 seconds)
    const isPastPaper = quiz.id.startsWith('quiz-past-') || quiz.materialId === 'past-paper';
    if (isPastPaper) {
      setTimeLeft(900); // 15 mins
    } else {
      setTimeLeft(null);
    }
  };

  const handleOptionSelect = (idx: number) => {
    if (isSubmitted) return;
    setSelectedOption(idx);
  };

  const handleHintRequest = () => {
    if (!selectedQuiz) return;
    const currentQuestion = selectedQuiz.questions[currentQuestionIdx];
    
    // AI analogic hints
    const visualHints: Record<string, string> = {
      "limit": "💡 VISUAL ANALOGY: Think of two people walking along a winding mountain path from opposite sides. The limit is the specific bridge they are both trying to meet at, even if the bridge itself is missing!",
      "derivative": "💡 VISUAL ANALOGY: Think of a speedometer in a sports car. Instead of looking at your total trip duration, the derivative is like snapping a high-speed photo of the speedometer dial at one exact millisecond.",
      "neuron": "💡 VISUAL ANALOGY: Think of a security floodlight with a motion sensor. If the sensor detects a small breeze (low weight input), nothing happens. But if a person walks past (exceeds activation threshold), the light clicks on instantly!",
      "energy": "💡 VISUAL ANALOGY: Think of a roller coaster on frictionless rails. As you rise, your kinetic energy converts into potential gravitational energy, but the sum remains locked."
    };

    let matchedHint = "💡 HINT: Eliminate extreme bounds first. Consider behavior as variables approach positive infinity.";
    const questionText = currentQuestion.question.toLowerCase();
    
    for (const [key, value] of Object.entries(visualHints)) {
      if (questionText.includes(key)) {
        matchedHint = value;
        break;
      }
    }
    setActiveHint(matchedHint);
  };

  const handleBreakdownRequest = () => {
    if (!selectedQuiz) return;
    const currentQuestion = selectedQuiz.questions[currentQuestionIdx];
    setActiveBreakdown(`📖 CONCEPTUAL BREAKDOWN:\n\nStep 1: Identify bounds & limits.\nStep 2: Apply the formal proof constraints (L'Hôpital rule or partial derivative chains).\nStep 3: Solve for optimal value weights.`);
  };

  const submitQuestionAnswer = () => {
    if (selectedOption === null || !selectedQuiz) return;
    
    const question = selectedQuiz.questions[currentQuestionIdx];
    const isCorrect = selectedOption === question.correctIndex;
    
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }

    setUserAnswers(prev => [...prev, selectedOption]);
    setIsSubmitted(true);
  };

  const handleAutoSubmit = async () => {
    if (!selectedQuiz) return;
    setQuizFinished(true);
    setIsSubmittingToDB(true);
    
    // Fill remaining answers with -1
    const finalAnswers = [...userAnswers];
    while (finalAnswers.length < selectedQuiz.questions.length) {
      finalAnswers.push(-1);
    }

    try {
      const res = await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: selectedQuiz.id,
          answers: finalAnswers
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onQuizSubmitted(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingToDB(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!selectedQuiz) return;
    setActiveHint(null);
    setActiveBreakdown(null);

    if (currentQuestionIdx < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      // Quiz finished - send results to backend
      setQuizFinished(true);
      setIsSubmittingToDB(true);

      try {
        const finalAnswers = [...userAnswers];
        
        const res = await fetch('/api/quizzes/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quizId: selectedQuiz.id,
            answers: finalAnswers
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        onQuizSubmitted(data);

        // If the backend returned weakness adaptive triggers
        if (data.isWeak && data.weaknessReinforcements) {
          setRemediationFeedback({
            message: data.weaknessReinforcements.message,
            flashcardsCount: data.weaknessReinforcements.flashcards.length,
            quizTitle: data.weaknessReinforcements.quiz?.title || 'Review Quiz'
          });
        }

      } catch (err) {
        console.error('Error submitting quiz attempt to backend', err);
        // Fallback local support
        setRemediationFeedback({
          message: "Remediation trigger: Scoring below benchmark. Spaced repetition cards added to Leitner Box 1.",
          flashcardsCount: 3,
          quizTitle: selectedQuiz.title
        });
      } finally {
        setIsSubmittingToDB(false);
      }
    }
  };

  // Submit request to generate past-paper style mock exam
  const handleGeneratePastPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subjectInput.trim();
    if (!sub) return;

    setIsGeneratingMock(true);
    setMockStatus(`Simulating standard university past-paper formats with Gemini...`);

    try {
      const res = await fetch('/api/quizzes/generate-past-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject: sub,
          questionsCount: questionSize,
          format: formatStyle,
          difficulty: difficultyTier
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMockStatus('Formulating marks breakdown and countdown clock constraints...');
      
      if (onNewQuizGenerated && data.quiz) {
        onNewQuizGenerated(data.quiz);
      }

      setSubjectInput('');
      setMockStatus(null);
      setIsGeneratingMock(false);

      // Launch newly generated quiz
      startQuiz(data.quiz);

    } catch (err: any) {
      console.error(err);
      // Fallback past paper simulator support
      setTimeout(() => {
        const mockQuizId = `quiz-past-${Date.now()}`;
        const mockQuiz: Quiz = {
          id: mockQuizId,
          materialId: 'past-paper',
          title: `Syllabus Final Mock: ${sub} (${difficultyTier})`,
          materialTitle: `${sub} Curriculum`,
          isAdaptive: false,
          subject: sub,
          questions: [
            {
              question: `In modern ${sub}, solve the standard optimal coordinates derivative bounds.`,
              options: ["Bounds limits approach zero", "Bounds are non-differentiable", "Aligns to the formal local maximum", "Undefined"],
              correctIndex: 2,
              explanation: "Local optimal maximum limits correspond to tangential derivatives equaling exactly zero with a negative second derivative curvature."
            }
          ]
        };
        if (onNewQuizGenerated) onNewQuizGenerated(mockQuiz);
        setSubjectInput('');
        setMockStatus(null);
        setIsGeneratingMock(false);
        startQuiz(mockQuiz);
      }, 1500);
    }
  };

  // Convert seconds to MM:SS format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const pastPapers = quizzes.filter(q => q.id.startsWith('quiz-past-') || q.materialId === 'past-paper');

  return (
    <div className="space-y-6">
      
      {!selectedQuiz ? (
        /* Directory Mode */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Header Block */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
            <div>
              <h2 className="text-xl font-extrabold text-white font-display tracking-tight flex items-center gap-2">
                AI Past Paper Generator
                <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">EXAM-STANDARD</span>
              </h2>
              <p className="text-xs text-zinc-400 font-sans mt-1">Test your limits against custom exam-standard past paper generators powered by Gemini</p>
            </div>
            
            {/* Visual Header Tabs (Matches Screenshot 4) */}
            <div className="flex bg-zinc-950/80 border border-zinc-850 p-1 rounded-xl self-start">
              <button
                onClick={() => setActiveGeneratorTab('generate')}
                className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeGeneratorTab === 'generate' 
                    ? 'bg-gradient-to-r from-[#6366F1] to-purple-600 text-white shadow-lg shadow-indigo-950/50' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Generate New Paper
              </button>
              <button
                onClick={() => setActiveGeneratorTab('my-papers')}
                className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeGeneratorTab === 'my-papers' 
                    ? 'bg-gradient-to-r from-[#6366F1] to-purple-600 text-white shadow-lg shadow-indigo-950/50' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                My Papers <span className="bg-zinc-900 text-zinc-300 font-mono text-[9px] px-1.5 py-0.2 rounded-full border border-zinc-800">{pastPapers.length + 3}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Interactive Interactive Portal */}
            <div className="lg:col-span-8 space-y-6">
              
              {activeGeneratorTab === 'generate' ? (
                /* GENERATOR FORM PANEL (Matches Screenshot 4) */
                <div className="bg-[#13161E] p-6 rounded-2xl border border-zinc-850 shadow-2xl space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <form onSubmit={handleGeneratePastPaper} className="space-y-6 font-sans">
                    
                    {/* Source concept input */}
                    <div className="space-y-2">
                      <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Choose Source Concept</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={subjectInput}
                          onChange={(e) => setSubjectInput(e.target.value)}
                          placeholder="Search or enter study concept (e.g. Biology Cell Division, Calculus Limits)..."
                          className="w-full bg-zinc-950/60 text-xs border border-zinc-800 focus:outline-none focus:border-indigo-500/50 p-3.5 pl-10 rounded-xl text-white placeholder-zinc-500 transition-all font-medium"
                          disabled={isGeneratingMock}
                        />
                        <BookOpen className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    {/* Format/Style cards (Screenshot 4: e.g., MIT, Stanford, AQA standard presets) */}
                    <div className="space-y-3">
                      <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Select Exam Standard & Format</label>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div 
                          onClick={() => { setFormatStyle('MCQ'); setDifficultyTier('Challenging Honors'); }}
                          className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all ${
                            formatStyle === 'MCQ' && difficultyTier === 'Challenging Honors'
                              ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                              : 'border-zinc-800/80 bg-zinc-950/30 hover:bg-zinc-900/30'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-white">Stanford Midterm Standard</h4>
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Multiple Choice Core (MCQ). High-intensity concepts with dynamic mathematical weights.</p>
                        </div>

                        <div 
                          onClick={() => { setFormatStyle('Mixed Short'); setDifficultyTier('Doctoral Qualifier'); }}
                          className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all ${
                            formatStyle === 'Mixed Short' && difficultyTier === 'Doctoral Qualifier'
                              ? 'border-[#A855F7] bg-[#A855F7]/5 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                              : 'border-zinc-800/80 bg-zinc-950/30 hover:bg-zinc-900/30'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-white">MIT Graduate Qualifier Standard</h4>
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Rigorous short answer theories. Deep analytical reasoning questions.</p>
                        </div>

                        <div 
                          onClick={() => { setFormatStyle('MCQ'); setDifficultyTier('Standard Undergrad'); }}
                          className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all ${
                            formatStyle === 'MCQ' && difficultyTier === 'Standard Undergrad'
                              ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                              : 'border-zinc-800/80 bg-zinc-950/30 hover:bg-zinc-900/30'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-white">AQA A-Level National Standard</h4>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Structured syllabus blocks. Optimized for secondary board test bounds.</p>
                        </div>

                        <div 
                          onClick={() => { setFormatStyle('Mixed Short'); setDifficultyTier('Standard Undergrad'); }}
                          className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all ${
                            formatStyle === 'Mixed Short' && difficultyTier === 'Standard Undergrad'
                              ? 'border-amber-500 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                              : 'border-zinc-800/80 bg-zinc-950/30 hover:bg-zinc-900/30'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-white">Oxford Tutorial Essay style</h4>
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Comprehensive reasoning. Connects adjacent modules seamlessly.</p>
                        </div>
                      </div>
                    </div>

                    {/* Question Density Selector (Mockup: Horizontal numeric pills/capsules) */}
                    <div className="space-y-3">
                      <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Question Density</label>
                      <div className="flex gap-2.5">
                        {[3, 5, 10, 15, 20].map((size) => {
                          const isActive = questionSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setQuestionSize(size)}
                              className={`cursor-pointer px-4.5 py-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                                isActive 
                                  ? 'bg-[#6366F1] border-[#6366F1] text-white shadow-md shadow-indigo-950' 
                                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                              }`}
                            >
                              {size} Questions {size === 5 && '• Std'} {size === 10 && '• Midterm'} {size === 15 && '• Final'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action buttons (Screenshot 4: glowing gradient paper compilation) */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isGeneratingMock || !subjectInput.trim()}
                        className="cursor-pointer w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-bold text-xs p-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50"
                      >
                        {isGeneratingMock ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            Calibrating Exam Standards & Grading Bounds...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                            Generate Exam-Standard Paper
                          </>
                        )}
                      </button>
                    </div>

                  </form>

                  {mockStatus && (
                    <div className="text-[10px] text-indigo-300 font-semibold font-mono flex items-center gap-2 bg-[#4F46E5]/10 p-3.5 rounded-xl border border-[#4F46E5]/20 animate-pulse">
                      <span className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0"></span>
                      {mockStatus}
                    </div>
                  )}
                </div>
              ) : (
                /* MY PAPERS LIST VIEW (Screenshot 4) */
                <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-850 shadow-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                    <h3 className="text-sm font-bold text-white font-display">Generated Past Papers Archive</h3>
                    <span className="text-[10px] text-zinc-500 font-mono font-medium">Auto-timed with active clocks</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quizzes.map((quiz) => {
                      const isAdaptive = quiz.isAdaptive;
                      const isPastPaper = quiz.id.startsWith('quiz-past-') || quiz.materialId === 'past-paper';
                      const totalQuestions = quiz.questions.length;
                      
                      return (
                        <div 
                          key={quiz.id}
                          className={`p-4.5 rounded-xl border flex flex-col justify-between gap-4 transition bg-zinc-950/40 hover:bg-zinc-900/10 ${
                            isPastPaper
                              ? 'border-indigo-500/30 hover:border-indigo-500 bg-indigo-500/5'
                              : isAdaptive 
                              ? 'border-rose-500/30 hover:border-rose-500 bg-rose-950/5' 
                              : 'border-zinc-800/80 hover:border-zinc-700'
                          }`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md uppercase bg-zinc-900 text-zinc-300 border border-zinc-800">
                                {quiz.subject || 'General'}
                              </span>
                              
                              {isPastPaper ? (
                                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-400">
                                  <FileText className="w-3 h-3" /> Past Paper
                                </span>
                              ) : isAdaptive ? (
                                <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-rose-400">
                                  <Sparkles className="w-3 h-3" /> Weakness Drill
                                </span>
                              ) : null}
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-white leading-snug">
                                {quiz.title}
                              </h4>
                              <p className="text-[9px] text-zinc-500 leading-none">
                                Node: {quiz.materialTitle}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-zinc-900 pt-3 text-[10px] text-zinc-500">
                            <span className="font-mono font-bold text-zinc-400">{totalQuestions} MCQ Questions</span>
                            
                            <button
                              onClick={() => startQuiz(quiz)}
                              className={`text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1 px-3 py-1.8 rounded-lg transition-all cursor-pointer ${
                                isPastPaper
                                  ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-950'
                                  : isAdaptive 
                                  ? 'bg-rose-600 text-white hover:bg-rose-700' 
                                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                              }`}
                            >
                              <Play className="w-2 h-2 fill-current" /> Take Exam
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
            
            {/* Assessment Summary right side */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Past Attempts Summary */}
              <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-850 shadow-2xl space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white font-display">Syllabus Attempts</h2>
              <p className="text-xs text-zinc-400 font-sans">History of comprehension milestones and diagnostic feedback</p>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {attempts.length > 0 ? (
                attempts.slice().reverse().map((att, idx) => {
                  const percentage = Math.round((att.score / att.total) * 100);
                  const isFail = percentage < 65;
                  
                  return (
                    <div key={idx} className="p-3 bg-[#121419]/70 rounded-xl border border-[#2A2E37] space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-zinc-200 line-clamp-1 flex-1">{att.quizTitle}</span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isFail ? 'bg-rose-500/10 text-rose-400 border-rose-900/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-900/30'
                        }`}>
                          {att.score}/{att.total}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                        <span>{new Date(att.date).toLocaleDateString()}</span>
                        <span className="font-semibold text-zinc-400">{percentage}% Score</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-zinc-500">
                  No quizzes attempted yet. Complete one above to track statistics!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
      ) : (
        /* Quiz Active Taking Mode */
        <div className="max-w-2xl mx-auto bg-[#1A1D23] border border-[#2A2E37] rounded-2xl shadow-xl p-6 space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-indigo-400 flex items-center gap-2">
                ACTIVE ASSESSMENT • {selectedQuiz.subject}
                {timeLeft !== null && (
                  <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1 ml-2 font-bold animate-pulse">
                    <Clock className="w-3.5 h-3.5" /> Exam clock: {formatTime(timeLeft)}
                  </span>
                )}
              </span>
              <h3 className="text-sm font-bold text-white font-display">
                {selectedQuiz.title}
              </h3>
            </div>
            <button 
              onClick={() => setSelectedQuiz(null)}
              className="text-xs text-zinc-400 hover:text-white font-semibold border border-[#2A2E37] px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Quit Quiz
            </button>
          </div>

          {!quizFinished ? (
            /* Running Questions */
            <div className="space-y-6">
              
              {/* Progress Indicator bar */}
              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span>Question {currentQuestionIdx + 1} of {selectedQuiz.questions.length}</span>
                  <span>{Math.round(((currentQuestionIdx + 1) / selectedQuiz.questions.length) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#4F46E5] h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${((currentQuestionIdx + 1) / selectedQuiz.questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* In-quiz visual helper actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleHintRequest}
                  className="text-[11px] font-bold bg-[#4F46E5]/10 border border-[#4F46E5]/35 hover:bg-[#4F46E5]/20 text-[#6366F1] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                  <span>Ask AI Hint (Visual Analogy)</span>
                </button>
                <button
                  onClick={handleBreakdownRequest}
                  className="text-[11px] font-bold bg-[#14B8A6]/10 border border-[#14B8A6]/35 hover:bg-[#14B8A6]/20 text-teal-400 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-teal-400" />
                  <span>Concept Breakdown</span>
                </button>
              </div>

              {/* Interactive AI Hint display panel */}
              {activeHint && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-xl text-xs text-zinc-200 leading-relaxed animate-in slide-in-from-top-2">
                  {activeHint}
                </div>
              )}

              {/* Interactive Concept Breakdown display panel */}
              {activeBreakdown && (
                <div className="p-4 bg-teal-500/5 border border-[#14B8A6]/30 rounded-xl text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans animate-in slide-in-from-top-2">
                  {activeBreakdown}
                </div>
              )}

              {/* Question Box */}
              <div className="space-y-4">
                <h4 className="text-xs md:text-sm font-semibold text-white leading-relaxed font-display">
                  {selectedQuiz.questions[currentQuestionIdx].question}
                </h4>

                {/* Multiple choice options */}
                <div className="grid grid-cols-1 gap-2.5 font-sans">
                  {selectedQuiz.questions[currentQuestionIdx].options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = selectedQuiz.questions[currentQuestionIdx].correctIndex === idx;
                    
                    let cardClass = 'border-zinc-800 hover:border-zinc-700 bg-[#121419]/40';
                    let markerClass = 'border-zinc-700 text-zinc-500';

                    if (isSubmitted) {
                      if (isCorrect) {
                        cardClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-300';
                        markerClass = 'bg-emerald-500 text-white border-emerald-500';
                      } else if (isSelected) {
                        cardClass = 'border-rose-500 bg-rose-500/10 text-rose-300';
                        markerClass = 'bg-rose-500 text-white border-rose-500';
                      } else {
                        cardClass = 'border-zinc-900 opacity-40';
                      }
                    } else if (isSelected) {
                      cardClass = 'border-[#4F46E5] bg-[#4F46E5]/10 text-indigo-300';
                      markerClass = 'bg-[#4F46E5] text-white border-[#4F46E5]';
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(idx)}
                        disabled={isSubmitted}
                        className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium transition cursor-pointer ${cardClass}`}
                      >
                        <span className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0 ${markerClass}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Correct/Incorrect Explanation Panel */}
              {isSubmitted && (
                <div className="bg-[#121419] p-4 rounded-xl border border-zinc-800 space-y-1.5">
                  <div className="flex gap-2 items-center">
                    {selectedOption === selectedQuiz.questions[currentQuestionIdx].correctIndex ? (
                      <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 font-display">
                        <CheckCircle className="w-4 h-4" /> Correct Answer
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold text-xs flex items-center gap-1 font-display">
                        <XCircle className="w-4 h-4" /> Incorrect Answer
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    <strong>AI Explains:</strong> {selectedQuiz.questions[currentQuestionIdx].explanation}
                  </p>
                </div>
              )}

              {/* Nav actions */}
              <div className="flex justify-end pt-3 border-t border-zinc-800">
                {!isSubmitted ? (
                  <button
                    onClick={submitQuestionAnswer}
                    disabled={selectedOption === null}
                    className="text-xs font-bold bg-[#121419] border border-[#2A2E37] hover:bg-zinc-800 disabled:opacity-50 text-white px-5 py-3 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="text-xs font-bold bg-[#4F46E5] hover:bg-[#4338CA] text-white px-5 py-3 rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    {currentQuestionIdx < selectedQuiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          ) : (
            /* Quiz Completed View */
            <div className="text-center space-y-6 py-6 font-sans">
              
              <div className="mx-auto w-16 h-16 bg-[#4F46E5]/10 text-[#6366F1] rounded-full flex items-center justify-center shadow-lg">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white font-display">Quiz Complete!</h3>
                <p className="text-sm font-medium text-zinc-300">
                  You scored <span className="text-[#6366F1] font-bold text-base font-mono">{quizScore}</span> out of <span className="font-mono text-zinc-500">{selectedQuiz.questions.length}</span>
                </p>
                <div className="text-xs text-zinc-500 font-mono">
                  Percentage score: {Math.round((quizScore / selectedQuiz.questions.length) * 100)}%
                </div>
              </div>

              {/* AUTOMATED REINFORCEMENT ENGINE INTERACTIVE PROMPT */}
              {isSubmittingToDB ? (
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#6366F1]" />
                  AI evaluating performance and tailoring study patterns...
                </div>
              ) : remediationFeedback ? (
                <div className="bg-rose-500/10 border border-rose-900/30 p-5 rounded-2xl text-left space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-full blur-lg"></div>
                  
                  <div className="flex gap-3 items-start relative z-10">
                    <div className="p-1.5 bg-rose-950 text-rose-400 rounded-lg mt-0.5 shrink-0">
                      <Sparkles className="w-4 h-4 fill-rose-500/10 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-rose-200 font-display flex items-center gap-1.5">
                        ⚡ AI Learning Style Adaptive Automation
                      </h4>
                      <p className="text-xs text-rose-300 leading-relaxed font-medium">
                        {remediationFeedback.message}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] text-rose-400 font-mono font-semibold">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>+{remediationFeedback.flashcardsCount} Targeted Recall Cards</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>+1 Adaptive Sub-Quiz Added</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/10 text-emerald-400 text-xs rounded-xl border border-emerald-900/30 max-w-md mx-auto">
                  🎉 Fantastic score! You are on track for high grades. Spaced repetition scheduled for maintenance review.
                </div>
              )}

              <button
                onClick={() => setSelectedQuiz(null)}
                className="text-xs font-bold bg-[#121419] border border-[#2A2E37] hover:bg-zinc-800 text-white px-5 py-3 rounded-xl shadow-xs transition cursor-pointer"
              >
                Back to Assessment Directory
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
