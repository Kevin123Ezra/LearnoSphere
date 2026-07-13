import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  HelpCircle, 
  Award, 
  Calendar, 
  Users, 
  Sparkles, 
  TrendingUp,
  Info,
  Loader2,
  X,
  Sliders,
  Brain,
  Timer,
  Coffee,
  Play,
  Pause,
  RotateCcw,
  Sun,
  Moon,
  ArrowRight
} from 'lucide-react';
import Button from './components/ui/Button';
import { DBState, Material, Flashcard, Quiz, QuizAttempt, RevisionTask, GroupStudy } from './types';

// Child view components
import Dashboard from './components/Dashboard';
import Materials from './components/Materials';
import Flashcards from './components/Flashcards';
import Quizzes from './components/Quizzes';
import AITutor from './components/AITutor';
import GroupStudyMode from './components/GroupStudy';
import RevisionPlanner from './components/RevisionPlanner';
import Progress from './components/Progress';
import LandingPage from './components/LandingPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [dbState, setDbState] = useState<DBState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Custom Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Pomodoro Study Session Timer
  const [pomodoroTime, setPomodoroTime] = useState(1500); // 25 min in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerType, setTimerType] = useState<'focus' | 'break'>('focus');
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);

  // Dark/Light Theme persistent state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
  };

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setPomodoroTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            if (timerType === 'focus') {
              setShowBreakModal(true);
              showToast('Focus session complete! Time to take a break.', 'success');
            } else {
              showToast("Break complete! Let's get back to studying.", 'success');
              setTimerType('focus');
              return 1500; // Reset to 25 mins
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerType]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startTimer = () => setIsTimerRunning(true);
  const pauseTimer = () => setIsTimerRunning(false);
  const resetTimer = (durationSeconds = 1500, type: 'focus' | 'break' = 'focus') => {
    setIsTimerRunning(false);
    setTimerType(type);
    setPomodoroTime(durationSeconds);
  };

  // Fetch full data on mount
  const fetchState = async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to load database state');
      const data = await res.json();
      setDbState(data);
    } catch (e) {
      console.error('Error fetching data from server', e);
      showToast('Error connecting to university server.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Safely intercept fetch responses to show Sarvam AI failure pings
  useEffect(() => {
    let intercepted = false;
    const originalFetch = window.fetch;
    if (!originalFetch) return;

    const customFetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      try {
        const cloned = response.clone();
        const contentType = cloned.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await cloned.json();
          if (data && data.sarvamFailed) {
            showToast("sarvam ai cudnt be reached", "warning");
          }
        }
      } catch (e) {
        // Safe to ignore
      }
      return response;
    };

    try {
      // Try direct assignment
      (window as any).fetch = customFetch;
      intercepted = true;
    } catch (e) {
      try {
        // Try Object.defineProperty if direct assignment fails
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          configurable: true,
          writable: true
        });
        intercepted = true;
      } catch (err) {
        console.warn('Could not intercept window.fetch globally:', err);
      }
    }

    return () => {
      if (intercepted) {
        try {
          (window as any).fetch = originalFetch;
        } catch (e) {
          try {
            Object.defineProperty(window, 'fetch', {
              value: originalFetch,
              configurable: true,
              writable: true
            });
          } catch (err) {
            // Safe to ignore
          }
        }
      }
    };
  }, []);

  // Sync state modifications locally & trigger UI responses
  const handleMaterialUploaded = (data: {
    material: Material;
    flashcards: Flashcard[];
    quiz: Quiz;
    revisionTask: RevisionTask;
  }) => {
    setDbState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        materials: [...prev.materials, data.material],
        flashcards: [...prev.flashcards, ...data.flashcards],
        quizzes: [...prev.quizzes, data.quiz],
        revisionTasks: [...prev.revisionTasks, data.revisionTask]
      };
    });
    showToast(`"${data.material.title}" analyzed successfully. Spaced cards and quizzes generated!`, 'success');
  };

  const handleCardReviewed = (updatedCard: Flashcard) => {
    setDbState(prev => {
      if (!prev) return null;
      
      // Update specific card in the list
      const updatedFlashcards = prev.flashcards.map(c => c.id === updatedCard.id ? updatedCard : c);
      
      // Recalculate study minutes
      const updatedAnalytics = {
        ...prev.analytics,
        totalTimeMinutes: prev.analytics.totalTimeMinutes + 2,
        learningStyle: {
          ...prev.analytics.learningStyle,
          activeRecallScore: Math.min(100, prev.analytics.learningStyle.activeRecallScore + 1)
        }
      };

      return {
        ...prev,
        flashcards: updatedFlashcards,
        analytics: updatedAnalytics
      };
    });
    showToast('Spaced repetition box promoted.', 'success');
  };

  const handleQuizSubmitted = (data: {
    attempt: QuizAttempt;
    percentage: number;
    isWeak: boolean;
    subjectReadiness: number;
    weaknessReinforcements: any;
  }) => {
    // Re-fetch the full DB state since the adaptive remediation engine on the server
    // generates a complex net of new revision tasks, flashcards, quizzes and triggers.
    // Re-fetching avoids sync drift!
    fetchState();

    if (data.isWeak) {
      showToast(`Review completed. Adaptive Reinforcement activated for ${data.attempt.quizTitle}!`, 'warning');
    } else {
      showToast(`Quiz completed! You scored ${data.attempt.score}/${data.attempt.total} (${Math.round(data.percentage)}%)`, 'success');
    }
  };

  const handleGroupStudyMerged = (mergedGuide: GroupStudy) => {
    setDbState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        groupStudies: [...prev.groupStudies, mergedGuide],
        analytics: {
          ...prev.analytics,
          totalTimeMinutes: prev.analytics.totalTimeMinutes + 30
        }
      };
    });
    showToast(`Merged guide "${mergedGuide.title}" compiled successfully!`, 'success');
  };

  const handleTaskToggled = (updatedTask: RevisionTask) => {
    setDbState(prev => {
      if (!prev) return null;
      const updatedTasks = prev.revisionTasks.map(t => t.id === updatedTask.id ? updatedTask : t);
      
      // Award time if newly completed
      const timeAdded = updatedTask.completed ? 15 : 0;
      const updatedAnalytics = {
        ...prev.analytics,
        totalTimeMinutes: prev.analytics.totalTimeMinutes + timeAdded,
        learningStyle: {
          ...prev.analytics.learningStyle,
          retrievalScore: updatedTask.completed 
            ? Math.min(100, prev.analytics.learningStyle.retrievalScore + 2)
            : prev.analytics.learningStyle.retrievalScore
        }
      };

      return {
        ...prev,
        revisionTasks: updatedTasks,
        analytics: updatedAnalytics
      };
    });
    showToast(updatedTask.completed ? 'Revision task marked done! (+15m study time)' : 'Task reopened.', 'info');
  };

  const handleNewQuizGenerated = (quiz: any) => {
    setDbState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        quizzes: [...prev.quizzes, quiz]
      };
    });
    showToast(`Past paper "${quiz.title}" compiled successfully!`, 'success');
  };

  const handleNewTasksAdded = (tasks: any[]) => {
    setDbState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        revisionTasks: [...prev.revisionTasks, ...tasks]
      };
    });
    showToast(`${tasks.length} tasks synced to calendar!`, 'success');
  };

  const handleOverrideStyle = async (styleName: string) => {
    try {
      const res = await fetch('/api/analytics/style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredStyleName: styleName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDbState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          analytics: {
            ...prev.analytics,
            preferredStyleName: styleName
          }
        };
      });
      showToast(`Learning style overridden: "${styleName}"`, 'info');
    } catch (e) {
      console.error('Error updating style', e);
    }
  };

  // Main render of matching view
  const renderActiveView = () => {
    if (!dbState) return null;

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            dbState={dbState} 
            onNavigate={(tab) => setActiveTab(tab)} 
            onTaskToggled={handleTaskToggled}
          />
        );
      case 'materials':
        return (
          <Materials 
            dbState={dbState} 
            onMaterialUploaded={handleMaterialUploaded}
          />
        );
      case 'flashcards':
        return (
          <Flashcards 
            dbState={dbState} 
            onCardReviewed={handleCardReviewed}
          />
        );
      case 'quizzes':
        return (
          <AITutor 
            dbState={dbState} 
            showToast={showToast}
            onAddFlashcard={(question, answer, course) => {
              setDbState(prev => {
                if (!prev) return null;
                const newCard = {
                  id: `card-tutor-${Date.now()}`,
                  materialId: 'tutor-chat',
                  materialTitle: 'AI Tutor Notes',
                  question,
                  answer,
                  difficulty: 'medium' as const,
                  box: 1,
                  nextReviewDate: new Date().toISOString()
                };
                return {
                  ...prev,
                  flashcards: [newCard, ...prev.flashcards]
                };
              });
              showToast('Flashcard saved successfully from tutor chat!', 'success');
            }}
            onAddTaskToPlanner={(title, course) => {
              setDbState(prev => {
                if (!prev) return null;
                const newTask = {
                  id: `task-tutor-${Date.now()}`,
                  title,
                  materialTitle: 'AI Tutor Discussion',
                  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  subject: course,
                  completed: false,
                  type: 'review' as const
                };
                return {
                  ...prev,
                  revisionTasks: [newTask, ...prev.revisionTasks]
                };
              });
              showToast('Review session added to your study planner!', 'info');
            }}
          />
        );
      case 'planner':
        return (
          <RevisionPlanner 
            dbState={dbState} 
            onTaskToggled={handleTaskToggled}
            onNewTasksAdded={handleNewTasksAdded}
            showToast={showToast}
          />
        );
      case 'group':
        return (
          <GroupStudyMode 
            dbState={dbState} 
            onGroupStudyMerged={handleGroupStudyMerged}
            showToast={showToast}
          />
        );
      case 'progress':
        return (
          <Progress 
            dbState={dbState} 
            onSetStyle={handleOverrideStyle}
          />
        );
      case 'landing':
        return (
          <LandingPage 
            onEnterPortal={() => setActiveTab('dashboard')}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        );
      default:
        return null;
    }
  };

  // Nav item list exactly matching the mockup's sidebar
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'materials', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'quizzes', label: 'AI Tutor', icon: <Award className="w-4 h-4" /> },
    { id: 'flashcards', label: 'Flashcards', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'group', label: 'Study Groups', icon: <Users className="w-4 h-4" /> },
    { id: 'planner', label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
    { id: 'progress', label: 'Progress', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07080A] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="p-5 bg-[#13161E] text-[#6366F1] rounded-2xl border border-zinc-800 shadow-[0_0_30px_rgba(99,102,241,0.2)] animate-pulse">
              <svg className="w-10 h-10 text-[#6366F1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
            </span>
          </div>
          <div className="text-center space-y-1.5">
            <h2 className="text-lg font-bold text-white font-display tracking-tight">Learnosphere AI Tutor</h2>
            <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5 font-sans font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Grounding syllabus weights...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const userStreak = dbState?.analytics?.streak || 5;

  if (activeTab === 'landing') {
    return (
      <div className={`min-h-screen w-screen bg-[#07080A] text-[#F3F4F6] font-sans antialiased overflow-y-auto overflow-x-hidden relative ${theme}`}>
        
        {/* Decorative ambient background glows */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 rounded-full filter blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full filter blur-[150px] pointer-events-none z-0"></div>

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-5 z-0" style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}></div>

        {/* Standalone Landing Top Header */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-[#07080A]/80 border-b border-zinc-900/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6366F1]/10 rounded-xl text-[#818CF8] border border-[#6366F1]/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] shrink-0">
              <svg className="w-5 h-5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeDasharray="3 3" opacity="0.3" />
                <path d="M12 6a6 6 0 0 1 6 6c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3z" />
                <path d="M12 18a6 6 0 0 1-6-6c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3z" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <span className="text-lg font-display font-black text-white tracking-tight flex items-center gap-1">
              Learnosphere <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded mt-0.5">AI+</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <button 
              onClick={() => {
                const el = document.getElementById('sandbox');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="cursor-pointer text-xs font-bold text-zinc-400 hover:text-white transition"
            >
              Sandbox
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('dashboard')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="font-bold text-xs tracking-wide shadow-[0_0_15px_rgba(99,102,241,0.2)] px-4 py-2"
            >
              Launch Study Portal
            </Button>
          </div>
        </header>

        {/* Main landing container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
          <LandingPage 
            onEnterPortal={() => setActiveTab('dashboard')}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen bg-[#07080A] text-[#F3F4F6] flex flex-row font-sans antialiased overflow-hidden relative ${theme}`}>
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 rounded-full filter blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full filter blur-[150px] pointer-events-none z-0"></div>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 z-0" style={{
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>
      
      {/* Navigation Sidebar (Glassmorphic) */}
      <aside className="w-16 md:w-64 bg-[#0F1116]/95 border-r border-zinc-850/80 p-3 md:p-6 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-35 backdrop-blur-xl overflow-y-auto">
        <div className="space-y-7">
          
          {/* Learnosphere Brand Logo */}
          <button 
            onClick={() => setActiveTab('landing')}
            className="cursor-pointer flex items-center justify-center md:justify-start gap-3 px-1.5 pt-2 text-left hover:opacity-95 transition w-full"
            title="Go to Landing Page"
          >
            <div className="p-2 bg-[#6366F1]/10 rounded-xl text-[#818CF8] border border-[#6366F1]/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] shrink-0">
              {/* Brain icon neural network */}
              <svg className="w-5 h-5 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" strokeDasharray="3 3" opacity="0.3" />
                <path d="M12 6a6 6 0 0 1 6 6c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3z" />
                <path d="M12 18a6 6 0 0 1-6-6c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3z" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="hidden md:block">
              <span className="text-lg font-display font-black text-white tracking-tight flex items-center gap-1">
                Learnosphere <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded mt-0.5">AI+</span>
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1.5 flex flex-col">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`cursor-pointer flex items-center justify-center md:justify-start gap-3 px-3 py-3 text-xs font-semibold rounded-xl transition w-full cursor-pointer ${
                    isActive 
                      ? 'bg-[#6366F1]/10 text-white border-l-2 border-[#6366F1] font-bold' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/20'
                  }`}
                >
                  <span className={`${isActive ? 'text-[#818CF8]' : 'text-zinc-500'} shrink-0`}>
                    {item.icon}
                  </span>
                  <span className="hidden md:block">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Diagnostic Status Button at bottom of sidebar */}
        <div className="pt-4 border-t border-zinc-850/40">
          <button
            onClick={() => setShowDiagnostics(true)}
            className="cursor-pointer flex items-center justify-center md:justify-start gap-3 px-3 py-3 text-xs font-semibold rounded-xl transition w-full text-zinc-400 hover:text-white hover:bg-zinc-800/20"
          >
            <span className="text-zinc-500 shrink-0">
              <Sliders className="w-4 h-4" />
            </span>
            <span className="hidden md:block">Diagnostic Status</span>
          </button>
        </div>
      </aside>

      {/* Primary Workspace Content Area */}
      <div className="flex-1 flex flex-col h-screen relative z-10 w-full overflow-hidden">
        
        {/* Global Workspace Top Header */}
        <header className="h-16 border-b border-zinc-900/60 bg-[#07080A]/80 backdrop-blur-md px-6 flex items-center justify-between gap-4 shrink-0">
          
          {/* Study Session Timer (Pomodoro Technique) */}
          <div className="relative">
            <button 
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className="cursor-pointer flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-xl transition-all text-left"
            >
              <div className={`p-1 rounded-lg ${timerType === 'focus' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {timerType === 'focus' ? <Timer className={`w-3.5 h-3.5 ${isTimerRunning ? 'animate-pulse' : ''}`} /> : <Coffee className="w-3.5 h-3.5" />}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase block leading-none">
                  {timerType === 'focus' ? 'Study Focus' : 'Break Time'}
                </span>
                <span className="text-xs font-bold text-white font-mono leading-none">
                  {formatTime(pomodoroTime)}
                </span>
              </div>
              <div className="text-zinc-500 hover:text-white shrink-0 pl-1">
                {isTimerRunning ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-ping"></span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block"></span>
                )}
              </div>
            </button>

            {/* Micro Timer Control Popover */}
            {showTimerMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTimerMenu(false)}></div>
                <div className="absolute left-0 mt-2 w-56 bg-[#0F1116] border border-zinc-800 rounded-2xl p-4 shadow-2xl z-50 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-xs font-bold text-white">Focus Session</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${timerType === 'focus' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {timerType === 'focus' ? 'FOCUS' : 'BREAK'}
                    </span>
                  </div>

                  <div className="text-center py-1">
                    <div className="text-2xl font-mono font-bold text-white">{formatTime(pomodoroTime)}</div>
                    <p className="text-[10px] text-zinc-500 mt-1">Goal: 25 min session</p>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    {isTimerRunning ? (
                      <button
                        onClick={() => {
                          pauseTimer();
                          showToast('Timer paused', 'info');
                        }}
                        className="cursor-pointer p-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 rounded-xl transition flex-1 flex justify-center items-center gap-1.5 text-xs font-bold"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          startTimer();
                          showToast('Focus session started!', 'success');
                        }}
                        className="cursor-pointer p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex-1 flex justify-center items-center gap-1.5 text-xs font-bold shadow-lg shadow-indigo-950/40"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Start
                      </button>
                    )}

                    <button
                      onClick={() => {
                        resetTimer();
                        showToast('Timer reset to 25m', 'info');
                      }}
                      title="Reset focus session"
                      className="cursor-pointer p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition border border-zinc-800"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-zinc-900 grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        resetTimer(1500, 'focus');
                        startTimer();
                        setShowTimerMenu(false);
                        showToast('25m Focus session started!', 'success');
                      }}
                      className="cursor-pointer text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 p-1.5 rounded-lg text-left"
                    >
                      🎯 25m Focus
                    </button>
                    <button
                      onClick={() => {
                        resetTimer(300, 'break');
                        startTimer();
                        setShowTimerMenu(false);
                        showToast('5m Short break started!', 'info');
                      }}
                      className="cursor-pointer text-[10px] font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 p-1.5 rounded-lg text-left"
                    >
                      ☕ 5m Break
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search Box in Header */}
          <div className="flex-1 max-w-md relative">
            <input 
              type="text" 
              placeholder="Search Courses, Formulas & Concepts..." 
              className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl py-1.5 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            <svg className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </div>

          {/* Utility Controls & Alex R. Profile Dropdown */}
          <div className="flex items-center gap-4">
            
            {/* Study Streak Badge in Header */}
            <div className="hidden md:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.2 rounded-xl text-xs font-bold text-amber-400">
              <span>{userStreak} Days</span>
              <span className="text-sm">🔥</span>
            </div>

            {/* Dark/Light mode toggle */}
            <button 
              onClick={toggleTheme}
              className="cursor-pointer p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-amber-400" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-400" />
              )}
            </button>

            {/* Notification bell with glowing alert badge */}
            <button className="cursor-pointer p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors relative">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            </button>

            {/* Profile Avatar Capsule */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-850">
              <div className="relative">
                <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-display font-black text-white text-xs shadow-lg shadow-indigo-950/40">
                  AR
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#07080A] rounded-full"></span>
              </div>
              <div className="hidden lg:block text-left">
                <h4 className="text-xs font-black text-white tracking-tight flex items-center gap-1 leading-none">
                  Alex R.
                  <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </h4>
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block mt-0.5">Level 14 Scholar</span>
              </div>
            </div>

          </div>

        </header>

        {/* Primary Workspace Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto overflow-x-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Dynamic Floating Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#13161E]/95 border border-zinc-800 p-4 rounded-2xl shadow-2xl flex gap-3.5 items-start justify-between animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex gap-2.5 items-start">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : toast.type === 'warning'
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white">System Sync</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                {toast.message}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-zinc-500 hover:text-white p-1 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Learnosphere Diagnostic Status Modal */}
      {showDiagnostics && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#0F1116] border border-zinc-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 relative">
            <button 
              onClick={() => setShowDiagnostics(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display tracking-tight flex items-center gap-2">
                  Learnosphere System Diagnostics
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                </h3>
                <p className="text-[11px] text-zinc-500 font-medium">Calibrated state of syllabus recall weights and indexing maps.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950/50 border border-zinc-900 p-3 rounded-xl space-y-1">
                <span className="text-[9px] text-zinc-500 font-mono block">COGNITIVE SYNC</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">84% Synchronized</span>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-900 p-3 rounded-xl space-y-1">
                <span className="text-[9px] text-zinc-500 font-mono block">ACTIVE RECALL NODES</span>
                <span className="text-xs font-bold text-indigo-400 font-mono">142 Data Points</span>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-900 p-3 rounded-xl space-y-1">
                <span className="text-[9px] text-zinc-500 font-mono block">LATENCY PROFILER</span>
                <span className="text-xs font-bold text-white font-mono">14ms Server Latency</span>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-900 p-3 rounded-xl space-y-1">
                <span className="text-[9px] text-zinc-500 font-mono block">MODEL BACKEND</span>
                <span className="text-xs font-bold text-amber-500 font-mono">Gemini 2.5 Flash</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">System Engine Log Stream</h4>
              <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-xl font-mono text-[9px] text-zinc-400 space-y-1 h-36 overflow-y-auto leading-relaxed">
                <p className="text-zinc-600">[10:45:10] Loaded user profile context: Alex R. (Lvl 14 Scholar)</p>
                <p className="text-zinc-600">[10:45:11] Mapped active neural nodes (8 syllabus junctions verified)</p>
                <p className="text-zinc-600">[10:45:11] Syncing retention decay thresholds for "Calculus III"</p>
                <p className="text-indigo-400">[10:45:12] Grounding model instructions with latest @google/genai specifications</p>
                <p className="text-indigo-400">[10:45:13] Retained active user streak at 12 continuous days</p>
                <p className="text-emerald-400">[10:45:14] Diagnostic system: ALL CHANNELS CALIBRATED & ACTIVE</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  showToast("Calibrating memory decay rates & active weights...", "info");
                  setTimeout(() => {
                    showToast("Calibration complete! Syllabus recall weights grounded.", "success");
                  }, 1200);
                }}
                className="cursor-pointer flex-1 bg-[#6366F1] hover:bg-[#5053EE] text-white py-2 px-4 rounded-xl text-xs font-bold transition text-center"
              >
                Recalibrate Weights
              </button>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="cursor-pointer border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white py-2 px-4 rounded-xl text-xs font-bold transition text-center"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Break Prompt Modal (Pomodoro completed state) */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#0F1116] border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 relative">
            <button 
              onClick={() => setShowBreakModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 border-b border-zinc-900 pb-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <Coffee className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display tracking-tight">Focus Session Complete!</h3>
                <p className="text-[11px] text-zinc-400">Awesome job focusing. Take a break to restore your attention span!</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  resetTimer(300, 'break');
                  startTimer();
                  setShowBreakModal(false);
                  showToast('5-minute short break started!', 'info');
                }}
                className="cursor-pointer bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-2.5 px-4 rounded-xl text-xs border border-zinc-800 transition text-center"
              >
                5m Short Break
              </button>
              <button
                onClick={() => {
                  resetTimer(900, 'break');
                  startTimer();
                  setShowBreakModal(false);
                  showToast('15-minute long break started!', 'info');
                }}
                className="cursor-pointer bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-2.5 px-4 rounded-xl text-xs border border-zinc-800 transition text-center"
              >
                15m Long Break
              </button>
            </div>
            <button
              onClick={() => {
                resetTimer(1500, 'focus');
                setShowBreakModal(false);
              }}
              className="cursor-pointer w-full bg-[#6366F1] hover:bg-[#5053EE] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
            >
              Skip Break & Focus Again
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
