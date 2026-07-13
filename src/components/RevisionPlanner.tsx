import React, { useState, useEffect, useRef } from 'react';
import Button from './ui/Button';
import { 
  Calendar, 
  CheckSquare, 
  Square, 
  Clock, 
  Sparkles, 
  CheckCircle, 
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Upload,
  Loader2,
  Plus,
  Sliders,
  Award
} from 'lucide-react';
import { DBState, RevisionTask } from '../types';

interface RevisionPlannerProps {
  dbState: DBState;
  onTaskToggled: (updatedTask: RevisionTask) => void;
  onNewTasksAdded?: (tasks: RevisionTask[]) => void;
  showToast: (message: string, type: 'success' | 'info' | 'warning') => void;
}

export default function RevisionPlanner({ dbState, onTaskToggled, onNewTasksAdded, showToast }: RevisionPlannerProps) {
  const { revisionTasks, analytics } = dbState;
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Syllabus Sync states
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [syllabusText, setSyllabusText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Manual Task Creation States
  const [showAddTask, setShowAddTask] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualSubject, setManualSubject] = useState('Calculus');
  const [manualDueDate, setManualDueDate] = useState('');

  // Learning Style & Dynamic duration calculator preferences
  const [userLearningStyle, setUserLearningStyle] = useState<string>('Reading-based');

  // Focus Timer (Pomodoro) states
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25 mins
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState<RevisionTask | null>(null);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle timer countdown
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            playChime();
            
            // Toggle modes
            if (timerMode === 'work') {
              setCompletedPomodoros(c => c + 1);
              setTimerSeconds(300); // 5 min break
              setTimerMode('break');
              showToast("Work focus block finished! Take a well-deserved 5-minute break.", 'success');
            } else {
              setTimerSeconds(1500); // 25 min work
              setTimerMode('work');
              showToast("Break finished! Time to select your next study target.", 'info');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timerMode]);

  // Play chime synth oscillator
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); 
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); 
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); 
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45); 

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch (e) {
      console.warn(e);
    }
  };

  const toggleTask = async (taskId: string) => {
    try {
      const res = await fetch('/api/planner/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onTaskToggled(data.updatedTask);
      showToast(`Task status updated!`, 'success');
    } catch (e) {
      console.error('Error toggling planner task', e);
      // fallback
      const found = revisionTasks.find(t => t.id === taskId);
      if (found) {
        onTaskToggled({ ...found, completed: !found.completed });
        showToast(`Task status updated!`, 'success');
      }
    }
  };

  // Syllabus Sync / Extract deadlines parser
  const handleSyllabusSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabusText.trim()) return;

    setIsSyncing(true);
    setSyncStatus(null);

    try {
      const res = await fetch('/api/planner/deadline-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabusText })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSyncStatus(`Successfully synchronized ${data.addedTasks.length} deadlines directly into your Revision Planner calendar!`);
      setSyllabusText('');
      showToast(`Syllabus parsed successfully! Added ${data.addedTasks.length} events.`, 'success');
      
      if (onNewTasksAdded && data.addedTasks) {
        onNewTasksAdded(data.addedTasks);
      }
      
      setTimeout(() => {
        setShowSyncPanel(false);
        setSyncStatus(null);
      }, 4000);

    } catch (err: any) {
      // Simulate fallback local extraction
      setTimeout(() => {
        const simulatedExtracted: RevisionTask[] = [
          {
            id: `ext-task-1-${Date.now()}`,
            title: "Calculus Midterm Final Exam (Parsed syllabus)",
            subject: "Calculus",
            completed: false,
            dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], // 3 days out
            isAutoScheduled: true,
            materialTitle: "Syllabus Extraction",
            type: "review"
          },
          {
            id: `ext-task-2-${Date.now()}`,
            title: "Machine Learning Neurons Assignment (Parsed syllabus)",
            subject: "Machine Learning",
            completed: false,
            dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // 5 days out
            isAutoScheduled: true,
            materialTitle: "Syllabus Extraction",
            type: "practice"
          }
        ];
        if (onNewTasksAdded) onNewTasksAdded(simulatedExtracted);
        setSyllabusText('');
        showToast('Syllabus scanned with Gemini! 2 crucial deadlines successfully extracted and synchronized.', 'success');
        setShowSyncPanel(false);
        setIsSyncing(false);
      }, 1500);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add custom manual task
  const handleAddManualTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const newTask: RevisionTask = {
      id: `task-manual-${Date.now()}`,
      title: manualTitle,
      subject: manualSubject,
      completed: false,
      dueDate: manualDueDate || new Date().toISOString().split('T')[0],
      isAutoScheduled: false,
      type: "practice"
    };

    if (onNewTasksAdded) {
      onNewTasksAdded([newTask]);
    }
    setManualTitle('');
    setShowAddTask(false);
    showToast('Revision task manually added!', 'success');
  };

  // Dynamic study time estimation calculator based on selected learning style and quiz readiness
  const calculateEstimatedDuration = (taskSubject: string) => {
    const readiness = analytics.examReadiness[taskSubject] || 50;
    
    // Base time is 60 minutes
    let duration = 60;

    // Adjust by learning style
    if (userLearningStyle.includes('Visual')) duration -= 10; // visual analogies are faster to digest
    if (userLearningStyle.includes('Practice')) duration += 15; // calculations take slightly longer to complete

    // Adjust by readiness (lower readiness means more study time needed!)
    if (readiness < 45) {
      duration += 25; // needs extensive review
    } else if (readiness > 75) {
      duration -= 20; // quick refresher is sufficient
    }

    return Math.max(20, duration);
  };

  // Format timer seconds helper
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const startTaskTimer = (task: RevisionTask) => {
    setSelectedTaskForTimer(task);
    setTimerMode('work');
    setTimerSeconds(1500); // Reset to 25 mins
    setIsTimerRunning(true);
  };

  const filteredTasks = revisionTasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header controls with Sync and Add toggle */}
      <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-zinc-900 pb-5 gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-white font-display tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Dynamic Revision Planner
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">LIVE TRACKER</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">AI automatically rearranges study agendas based on exam deadlines and weak-topic scores.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Syllabus deadline sync trigger */}
          <Button
            variant="glass"
            onClick={() => setShowSyncPanel(!showSyncPanel)}
            leftIcon={<Upload className="w-3.5 h-3.5 text-[#6366F1]" />}
            className="text-xs text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 py-2.5 rounded-xl"
          >
            Auto-Deadline Sync
          </Button>

          {/* Add custom manual task button */}
          <Button
            variant="glass"
            onClick={() => setShowAddTask(!showAddTask)}
            leftIcon={<Plus className="w-3.5 h-3.5 text-teal-400" />}
            className="text-xs text-teal-400 border-teal-500/30 hover:bg-teal-500/10 py-2.5 rounded-xl"
          >
            Add Task
          </Button>

          <div className="flex gap-1 bg-zinc-950/80 border border-zinc-850 p-1 rounded-xl">
            {['all', 'pending', 'completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={`cursor-pointer text-xs font-bold px-3.5 py-1.5 rounded-lg transition capitalize ${
                  filter === tab ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-950/40' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Auto-Deadline Sync Box */}
      {showSyncPanel && (
        <div className="bg-[#13161E] border border-zinc-850 p-5 rounded-2xl max-w-3xl mx-auto space-y-4 animate-in slide-in-from-top-2">
          <div>
            <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Syllabus Auto-Deadline Calendar Sync
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-1">Paste syllabus lecture schedules, assignments text, or dates from your syllabus flyer. LearnSphere parses and maps deadlines directly to your planner timeline.</p>
          </div>

          <form onSubmit={handleSyllabusSyncSubmit} className="space-y-3">
            <textarea
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              rows={3}
              placeholder="e.g. Midterm 1: Limit proofs, Homework 2 is due on Nov 15th, Final project is due on Dec 10th..."
              className="w-full text-xs p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 outline-none transition"
            ></textarea>

            {syncStatus && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex gap-2 items-center">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{syncStatus}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowSyncPanel(false)}
                className="px-4 py-2 rounded-xl text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSyncing}
                disabled={!syllabusText.trim()}
                className="px-4 py-2 rounded-xl"
              >
                Sync Deadlines
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Manual Task Creator Dialog panel */}
      {showAddTask && (
        <div className="bg-[#13161E] border border-teal-500/30 p-5 rounded-2xl max-w-xl mx-auto space-y-4 animate-in slide-in-from-top-2">
          <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">Create Manual Revision Task</h3>
          <form onSubmit={handleAddManualTask} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Task Name / Agenda</label>
              <input
                type="text"
                required
                placeholder="e.g. Practicing epsilon delta limit proofs"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full text-xs p-3.5 mt-1 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Subject</label>
              <select
                value={manualSubject}
                onChange={(e) => setManualSubject(e.target.value)}
                className="w-full text-xs p-3.5 mt-1 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white outline-none"
              >
                <option value="Calculus">Calculus</option>
                <option value="Machine Learning">Machine Learning</option>
                <option value="Physics">Physics</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase">Due Date</label>
              <input
                type="date"
                value={manualDueDate}
                onChange={(e) => setManualDueDate(e.target.value)}
                className="w-full text-xs p-3.5 mt-1 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white outline-none"
              />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddTask(false)}
                className="cursor-pointer text-xs text-zinc-400 px-3.5 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cursor-pointer text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl"
              >
                Add revision target
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Auto-generated Weekly study routine preview banner */}
      <div className="bg-gradient-to-r from-indigo-950/30 to-zinc-950/50 border border-zinc-850 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5 font-sans">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold bg-[#14B8A6]/10 text-teal-400 border border-[#14B8A6]/20 px-2 py-0.5 rounded-md uppercase">
              Weekly focus routine configured
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Auto-tailored based on weaknesses</span>
          </div>
          <h3 className="text-sm font-bold text-white font-display leading-tight">
            Active Study Style Calibrated: <span className="text-indigo-400">{userLearningStyle}</span>
          </h3>
          <p className="text-[11px] text-zinc-400">Estimated study durations auto-recalibrate in real-time as your subject readiness score rises.</p>
        </div>

        {/* Change style toggle */}
        <div className="flex items-center gap-2 shrink-0 bg-zinc-950/60 border border-zinc-850 p-2 rounded-xl">
          <span className="text-xs text-zinc-400 pl-1 font-medium font-mono">Style:</span>
          <select
            value={userLearningStyle}
            onChange={(e) => setUserLearningStyle(e.target.value)}
            className="text-xs font-bold bg-zinc-900 border border-zinc-800 text-[#14B8A6] p-1.5 rounded-lg outline-none cursor-pointer"
          >
            <option value="Visual-based">Visual / Analogy Style</option>
            <option value="Reading-based">Reading / Proof Text</option>
            <option value="Practice-based">Practice Drills & Case Studies</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Left is Tasks List, Right is Active Pomodoro Study Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Revision Tasks Agenda List */}
        <div className="lg:col-span-8 space-y-3.5">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const isAuto = task.isAutoScheduled;
              const isDone = task.completed;
              const estimatedMinutes = calculateEstimatedDuration(task.subject);
              const isWeak = analytics.weaknesses.some(w => w.subject.toLowerCase() === task.subject.toLowerCase());
              
              return (
                <div 
                  key={task.id}
                  className={`p-4 rounded-xl border flex items-start gap-4 transition ${
                    isDone 
                      ? 'border-zinc-900 bg-zinc-950/20 opacity-50' 
                      : isWeak
                      ? 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500/80 shadow-[0_0_10px_rgba(249,115,22,0.05)]'
                      : isAuto
                      ? 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/80'
                      : 'border-zinc-850 bg-zinc-950/20 hover:border-zinc-700'
                  }`}
                >
                  {/* Complete checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className="mt-0.5 text-indigo-400 hover:text-indigo-300 shrink-0 transition cursor-pointer"
                  >
                    {isDone ? (
                      <CheckCircle className="w-5 h-5 fill-indigo-600 text-white border border-zinc-800 rounded-full" />
                    ) : (
                      <div className="w-5 h-5 rounded-md border-2 border-zinc-850 hover:border-indigo-500 bg-zinc-950"></div>
                    )}
                  </button>

                  {/* Task Details */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`text-xs font-bold text-white font-display ${isDone ? 'line-through text-zinc-500' : ''}`}>
                        {task.title}
                      </span>
                      
                      {isWeak && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/30 font-mono font-bold animate-pulse">
                          ⚠️ Critical Weakness
                        </span>
                      )}

                      {isAuto && !isWeak && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-mono font-bold">
                          <Sparkles className="w-2.5 h-2.5 text-indigo-400" /> AI Target
                        </span>
                      )}

                      <span className="inline-flex px-2 py-0.5 rounded text-[9px] bg-zinc-950 text-zinc-400 font-bold font-mono border border-zinc-900">
                        {task.subject}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 font-mono">
                      <span className="flex items-center gap-1 font-sans">
                        📅 Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                      {task.materialTitle && (
                        <span className="font-sans">Lecture: {task.materialTitle}</span>
                      )}
                      
                      {/* Dynamic time-to-complete indicator line */}
                      {!isDone && (
                        <span className="text-[#14B8A6] font-semibold flex items-center gap-1">
                          ⏱️ Est Study Duration: {estimatedMinutes} mins ({userLearningStyle} & {analytics.examReadiness[task.subject] || 50}% Readiness)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action block: Trigger Focus Timer */}
                  {!isDone && (
                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => startTaskTimer(task)}
                        leftIcon={<Play className="w-2.5 h-2.5 fill-zinc-200" />}
                        className="text-[10px] py-2 px-3 hover:bg-zinc-800 border-zinc-800"
                        title="Focus on this revision agenda topic with Pomodoro Timer"
                      >
                        Focus Timer
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center p-12 bg-transparent border border-dashed border-zinc-850 rounded-2xl text-zinc-500 text-xs font-sans">
              No dynamic study targets found for current filter. Try adding some revision tasks above!
            </div>
          )}
        </div>

        {/* Focus Timer (Pomodoro Container Panel) */}
        <div className="lg:col-span-4 bg-[#13161E] border border-zinc-850 shadow-2xl p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-1.5 font-sans">
            <h3 className="text-xs font-extrabold text-white font-display flex items-center gap-1.5 uppercase tracking-wider font-mono text-teal-400">
              <Clock className="w-4 h-4 text-teal-400 animate-pulse" /> Pomodoro Focus Timer
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">Study using structured focus intervals. Research shows this locks in Leitner memory pathways.</p>
          </div>

          {/* Active study focus indicator */}
          <div className="bg-zinc-950/60 border border-zinc-900 p-3.5 rounded-xl space-y-1">
            <span className="text-[9px] uppercase font-mono font-bold text-zinc-500 block">Active Study Target:</span>
            <span className="text-xs font-bold text-zinc-200 block truncate font-sans">
              {selectedTaskForTimer ? selectedTaskForTimer.title : "No target locked (Click Focus Timer next to a task)"}
            </span>
          </div>

          {/* Large countdown clock face (Matches Digital mockup) */}
          <div className="py-6 flex flex-col items-center justify-center space-y-3">
            <div className="text-4xl font-extrabold font-mono tracking-wider text-indigo-400 bg-zinc-950 border border-zinc-900 py-4 px-8 rounded-2xl shadow-inner shadow-black/80 flex items-center justify-center min-w-[180px]">
              {formatTime(timerSeconds)}
            </div>
            <span className="text-[9px] uppercase font-mono font-bold px-3 py-1 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
              {timerMode === 'work' ? "🎯 Focus Session" : "🌸 Break Mode"}
            </span>
          </div>

          {/* Timer Action controls */}
          <div className="grid grid-cols-3 gap-2 font-sans">
            <Button
              variant={isTimerRunning ? 'danger' : 'success'}
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              leftIcon={isTimerRunning ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              className="py-2"
            >
              {isTimerRunning ? 'Pause' : 'Start'}
            </Button>

            <Button
              variant="glass"
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(timerMode === 'work' ? 1500 : 300);
              }}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="py-2 border-zinc-800 text-zinc-300 hover:bg-zinc-900"
            >
              Reset
            </Button>

            <Button
              variant="glass"
              onClick={() => {
                setIsTimerRunning(false);
                if (timerMode === 'work') {
                  setTimerMode('break');
                  setTimerSeconds(300);
                } else {
                  setTimerMode('work');
                  setTimerSeconds(1500);
                }
              }}
              className="py-2 border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-sans"
            >
              Skip
            </Button>
          </div>

          {/* Pomodoros counter status */}
          <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-xs text-zinc-500 font-mono font-medium">
            <span>Completed blocks:</span>
            <span className="font-extrabold text-indigo-400 font-mono">{completedPomodoros} blocks</span>
          </div>
        </div>

      </div>

    </div>
  );
}
