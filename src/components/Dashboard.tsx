import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { 
  Check, 
  ArrowUpRight, 
  Zap, 
  Users,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Lock,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Clock,
  TrendingUp,
  ChevronRight,
  Flame,
  Info,
  HelpCircle
} from 'lucide-react';
import { DBState, RevisionTask } from '../types';

interface DashboardProps {
  dbState: DBState;
  onNavigate: (tab: string) => void;
  onTaskToggled: (task: RevisionTask) => void;
}

interface MapNode {
  id: string;
  label: string;
  subject: string;
  status: 'completed' | 'active' | 'locked';
  x: number; // percentage coordinate inside SVG
  y: number;
  readiness: number;
  subtopics: string[];
}

export default function Dashboard({ dbState, onNavigate, onTaskToggled }: DashboardProps) {
  const { analytics, materials, revisionTasks, flashcards } = dbState;
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  
  // Timer state for Focus Session (25:00)
  const [timerSeconds, setTimerSeconds] = useState(1500); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(1500);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // State calculations
  const calcReadiness = analytics.examReadiness.Calculus || 84;
  const mlReadiness = analytics.examReadiness['Machine Learning'] || 78;
  const physReadiness = analytics.examReadiness.Physics || 85;
  const studyStreak = analytics.streak || 12;
  const totalKP = 12450; // Aligns perfectly with mockup's total XP of 12,450 KP

  // Mock-up / High fidelity Nodes definition aligned exactly to Screenshot 1
  const knowledgeNodes: MapNode[] = [
    { 
      id: 'limits', 
      label: 'Limits', 
      subject: 'Mathematics', 
      status: 'completed', 
      x: 18, 
      y: 18, 
      readiness: 94, 
      subtopics: ['Squeeze theorem', 'One-sided limits', 'Infinite limits'] 
    },
    { 
      id: 'continuity', 
      label: 'Continuity', 
      subject: 'Mathematics', 
      status: 'active', 
      x: 52, 
      y: 25, 
      readiness: 84, 
      subtopics: ['Intermediate Value Theorem', 'Types of Discontinuity', 'Continuity on Intervals'] 
    },
    { 
      id: 'derivatives', 
      label: 'Derivatives', 
      subject: 'Mathematics', 
      status: 'active', 
      x: 48, 
      y: 52, 
      readiness: 62, 
      subtopics: ['Partial derivatives', 'Chain rule', 'Implicit differentiation'] 
    },
    { 
      id: 'perceptrons', 
      label: 'Perceptrons', 
      subject: 'AI Theory', 
      status: 'active', 
      x: 65, 
      y: 30, 
      readiness: 76, 
      subtopics: ['Weight matrices', 'Activation thresholds', 'Single-layer bounds'] 
    },
    { 
      id: 'relu', 
      label: 'ReLU', 
      subject: 'AI Theory', 
      status: 'active', 
      x: 78, 
      y: 50, 
      readiness: 89, 
      subtopics: ['Leaky ReLU', 'Vanishing gradients', 'Non-linear rectifiers'] 
    },
    { 
      id: 'forces', 
      label: 'Forces', 
      subject: 'Physics', 
      status: 'completed', 
      x: 82, 
      y: 18, 
      readiness: 90, 
      subtopics: ['Newton\'s laws', 'Equilibrium conditions', 'Friction vectors'] 
    }
  ];

  // Map the agenda tasks based on mockup, but integrate completion support if they exist in state!
  const agendaItems = [
    {
      id: 'agenda-math',
      subject: 'MATHEMATICS',
      time: '09:00 AM',
      title: 'Limits and Continuous Functions Review',
      color: 'from-purple-500/10 to-indigo-500/10 text-[#A78BFA] border-[#A78BFA]/20',
      iconBg: 'bg-[#A78BFA]/10 text-[#A78BFA]',
      completed: revisionTasks.find(t => t.title.toLowerCase().includes('limit'))?.completed || false,
      rawTask: revisionTasks.find(t => t.title.toLowerCase().includes('limit'))
    },
    {
      id: 'agenda-ai',
      subject: 'AI THEORY',
      time: '11:30 AM',
      title: 'Activation Functions: Sigmoid vs ReLU',
      color: 'from-blue-500/10 to-cyan-500/10 text-[#60A5FA] border-[#60A5FA]/20',
      iconBg: 'bg-[#60A5FA]/10 text-[#60A5FA]',
      completed: revisionTasks.find(t => t.title.toLowerCase().includes('activation'))?.completed || false,
      rawTask: revisionTasks.find(t => t.title.toLowerCase().includes('activation'))
    },
    {
      id: 'agenda-physics',
      subject: 'PHYSICS',
      time: '02:00 PM',
      title: 'Forces and Equilibrium Problem Set',
      color: 'from-emerald-500/10 to-teal-500/10 text-[#34D399] border-[#34D399]/20',
      iconBg: 'bg-[#34D399]/10 text-[#34D399]',
      completed: revisionTasks.find(t => t.title.toLowerCase().includes('force'))?.completed || false,
      rawTask: revisionTasks.find(t => t.title.toLowerCase().includes('force'))
    }
  ];

  const handleAgendaToggle = (item: typeof agendaItems[0]) => {
    if (item.rawTask) {
      onTaskToggled({ ...item.rawTask, completed: !item.completed });
    } else {
      // Create a temporary task toggle or just alert
      const mockTask: RevisionTask = {
        id: item.id,
        title: item.title,
        subject: item.subject === 'MATHEMATICS' ? 'Calculus' : item.subject === 'AI THEORY' ? 'Machine Learning' : 'Physics',
        dueDate: 'Today',
        completed: !item.completed,
        type: 'practice'
      };
      onTaskToggled(mockTask);
    }
  };

  const [insightAlert, setInsightAlert] = useState(false);

  return (
    <div className="space-y-6 pb-12 font-sans text-white">
      
      {/* 1. Mastery Graph (Neural Knowledge Network) Card - Large Header Card */}
      <div className="relative overflow-hidden bg-[#0D0F14] border border-zinc-900 rounded-3xl p-6 md:p-8 shadow-2xl min-h-[360px] md:min-h-[400px] flex flex-col justify-between">
        
        {/* SVG Decorative Network Connectors in Card Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Glowing node trails */}
          <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 1000 400" preserveAspectRatio="none">
            <defs>
              <linearGradient id="glowLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {/* Limit -> Continuity */}
            <line x1="180" y1="72" x2="520" y2="100" stroke="url(#glowLineGrad)" strokeWidth="1.5" strokeDasharray="5 5" />
            {/* Continuity -> Derivatives */}
            <line x1="520" y1="100" x2="480" y2="208" stroke="url(#glowLineGrad)" strokeWidth="1.5" strokeDasharray="3 3" />
            {/* Continuity -> Perceptrons */}
            <line x1="520" y1="100" x2="650" y2="120" stroke="url(#glowLineGrad)" strokeWidth="1.5" strokeDasharray="4 4" />
            {/* Perceptrons -> Forces */}
            <line x1="650" y1="120" x2="820" y2="72" stroke="url(#glowLineGrad)" strokeWidth="1.5" strokeDasharray="5 5" />
            {/* Perceptrons -> ReLU */}
            <line x1="650" y1="120" x2="780" y2="200" stroke="url(#glowLineGrad)" strokeWidth="1.5" strokeDasharray="3 3" />
            {/* Derivatives -> ReLU */}
            <line x1="480" y1="208" x2="780" y2="200" stroke="url(#glowLineGrad)" strokeWidth="1.5" strokeDasharray="2 2" />
          </svg>

          {/* Radial visual accent highlight */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]" />
        </div>

        {/* Content Layout */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
          
          {/* Text and Actions (Left, Span 5) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-center h-full pt-4 md:pt-8">
            <div className="space-y-4">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase bg-[#181C26] border border-indigo-500/30 text-indigo-400 tracking-wider">
                  MASTERY GRAPH
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight leading-tight">
                Neural Knowledge Network
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed font-sans font-medium">
                Your cognitive map is <strong className="text-indigo-400">84% synchronized</strong>. AI tutor suggests focusing on <span className="text-zinc-200 underline decoration-indigo-400 underline-offset-4 font-bold">Partial Derivatives</span> to unlock advanced Machine Learning modules.
              </p>
            </div>

            <div className="flex flex-row items-center gap-3.5 pt-2">
              <Button
                variant="primary"
                onClick={() => onNavigate('quizzes')}
                leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
              >
                Continue Session
              </Button>
              <Button
                variant="secondary"
                onClick={() => onNavigate('progress')}
              >
                Explore Graph
              </Button>
            </div>
          </div>

          {/* Interactive Graph Plot (Right, Span 7) */}
          <div className="lg:col-span-7 relative w-full h-[240px] md:h-[280px] bg-transparent rounded-2xl flex items-center justify-center">
            
            {/* SVG Rendered Interactive Graph Nodes */}
            <div className="absolute inset-0 w-full h-full">
              {knowledgeNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 group z-20 focus:outline-none"
                  >
                    <span className="relative flex flex-col items-center">
                      
                      {/* Outer Pulse/Glow Ring */}
                      <span className={`absolute inline-flex h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition duration-300 ${
                        node.status === 'completed' 
                          ? 'bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.5)]'
                          : 'bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                      }`} />

                      {/* Actual visual dot */}
                      <span className={`relative flex h-4.5 w-4.5 rounded-full border-2 transition-all duration-300 items-center justify-center ${
                        isSelected ? 'scale-125 ring-4 ring-indigo-500/20' : ''
                      } ${
                        node.status === 'completed'
                          ? 'bg-[#6366F1] border-indigo-300 shadow-[0_0_12px_#6366F1]'
                          : 'bg-[#10B981] border-emerald-300 shadow-[0_0_12px_#10B981] animate-pulse'
                      }`}>
                        {/* Micro checkmark for completed */}
                        {node.status === 'completed' && <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />}
                      </span>

                      {/* Labeled text exactly matching layout */}
                      <span className={`mt-2 font-mono text-[10px] font-bold tracking-tight rounded px-2 py-0.5 whitespace-nowrap transition-all duration-200 pointer-events-none ${
                        isSelected 
                          ? 'bg-[#1A1F2E] text-indigo-300 border border-indigo-500/20 opacity-100' 
                          : node.id === 'derivatives' || node.id === 'relu'
                          ? 'text-[#10B981]/90 opacity-90'
                          : 'text-zinc-400 group-hover:text-white'
                      }`}>
                        {node.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Float details panel overlay if node is selected */}
            {selectedNode && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#0F1116] border border-zinc-850 p-3.5 rounded-2xl w-80 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">{selectedNode.subject}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedNode(null)} 
                    className="text-zinc-500 hover:text-white text-[10px] font-bold font-mono px-1 hover:bg-zinc-900 rounded"
                  >
                    CLOSE
                  </button>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-white">{selectedNode.label}</h4>
                  <p className="text-[10px] text-zinc-400 mt-1 font-sans">
                    Readiness indexing currently calibrated at <strong className="text-indigo-400 font-mono">{selectedNode.readiness}%</strong> mastery score.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => onNavigate('quizzes')}
                    className="flex-1 font-mono text-[9px] text-indigo-400 border-indigo-500/20 hover:bg-indigo-600/10 py-1.5"
                  >
                    TAKE AI MOCK
                  </Button>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => onNavigate('flashcards')}
                    className="flex-1 font-mono text-[9px] text-emerald-400 border-emerald-500/20 hover:bg-emerald-600/10 py-1.5"
                  >
                    REVIEW CARDS
                  </Button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* 2. Row of 3 Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Syllabus Mastery */}
        <div className="bg-[#0D0F14]/90 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between shadow-xl min-h-[140px] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 font-sans">Syllabus Mastery</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-black text-white leading-none tracking-tight">
              {calcReadiness} <span className="text-lg font-light text-zinc-500">%</span>
            </h3>
            {/* Visual gradient progress slider bar underneath */}
            <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-4 overflow-hidden border border-zinc-900">
              <div 
                className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 h-full rounded-full transition-all duration-700" 
                style={{ width: `${calcReadiness}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Total Study XP */}
        <div className="bg-[#0D0F14]/90 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between shadow-xl min-h-[140px] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 font-sans">Total Study XP</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <h3 className="text-3xl font-display font-black text-white leading-none tracking-tight flex items-baseline gap-1.5">
              {totalKP.toLocaleString()} <span className="text-xs font-mono font-bold text-zinc-500">KP</span>
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wide block">Next level in 1,200 KP</span>
          </div>
        </div>

        {/* Card 3: Weekly Streaks */}
        <div className="bg-[#0D0F14]/90 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between shadow-xl min-h-[140px] relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 font-sans">Weekly Streaks</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-black text-white leading-none tracking-tight">
              {studyStreak} <span className="text-base font-light text-zinc-500">weeks</span>
            </h3>
            {/* Horizontal indicators representing weeks */}
            <div className="flex gap-1.5 mt-4">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 flex-1 rounded-full border border-zinc-900 transition-all ${
                    idx <= 3 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' 
                      : 'bg-zinc-950'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Two-Column Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Column Left (Span 8) - Today's Revision Agenda */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-bold text-zinc-300 font-display uppercase tracking-wider">Today's Revision Agenda</h3>
            <button
              onClick={() => onNavigate('planner')}
              className="cursor-pointer text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              <span>View Full Timeline</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {agendaItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => handleAgendaToggle(item)}
                className="cursor-pointer group flex items-center justify-between bg-[#0D0F14] border border-zinc-900 rounded-2xl p-4.5 hover:border-zinc-800 transition-all shadow-md active:scale-[0.995]"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Square color placeholder */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold text-indigo-400 tracking-wider">
                        {item.subject}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">{item.time}</span>
                    </div>
                    <h4 className={`text-sm font-bold text-white leading-snug truncate ${item.completed ? 'line-through text-zinc-500' : ''}`}>
                      {item.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-3 shrink-0">
                  {/* Complete/Checkbox toggle */}
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    item.completed 
                      ? 'bg-indigo-500 border-indigo-400 text-white' 
                      : 'border-zinc-800 bg-zinc-950 text-transparent group-hover:border-zinc-700'
                  }`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column Right (Span 4) - Coach & Focus Session */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: AI Coach Observation */}
          <div className="bg-[#0D0F14] border border-zinc-900 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 font-display uppercase tracking-wider">AI Coach Observation</h3>
            
            <p className="text-zinc-400 text-xs leading-relaxed font-sans font-medium italic">
              "You tend to solve Physics problems <span className="text-emerald-400 font-bold font-mono">20% faster</span> when you start after a Mathematics session. I've adjusted your agenda to optimize this flow."
            </p>

            <Button
              variant="glass"
              onClick={() => {
                setInsightAlert(true);
                setTimeout(() => setInsightAlert(false), 5000);
              }}
              className="w-full font-mono font-bold py-2.5"
            >
              VIEW INSIGHTS
            </Button>

            {insightAlert && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-zinc-300 animate-in fade-in duration-200">
                🚀 Multi-modal affinity scoring suggests maximum retention when blending sequential recall drills. Diagnostic maps are 100% updated.
              </div>
            )}
          </div>

          {/* Card 2: Focus Sessions (Timer widget) */}
          <div className="bg-[#0D0F14] border border-zinc-900 rounded-2xl p-5 shadow-xl space-y-5 flex flex-col items-center">
            <div className="w-full text-left">
              <h3 className="text-xs font-bold text-zinc-300 font-display uppercase tracking-wider">Focus Sessions</h3>
            </div>

            {/* Circular Countdown Progress Ring */}
            <div className="relative flex items-center justify-center w-36 h-36">
              
              {/* SVG Ring */}
              <svg className="w-full h-full transform -rotate-90">
                {/* Background path */}
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-zinc-950 fill-none"
                  strokeWidth="6"
                />
                {/* Active path */}
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-[#3B82F6] fill-none transition-all duration-1000"
                  strokeWidth="6"
                  strokeDasharray="390"
                  strokeDashoffset={390 - (390 * (timerSeconds / 1500))}
                  strokeLinecap="round"
                />
              </svg>

              {/* Central Time Label */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-mono font-black text-white tracking-tight">
                  {formatTime(timerSeconds)}
                </span>
                {isTimerRunning && (
                  <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase tracking-wider animate-pulse mt-0.5">
                    ACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex gap-2.5 w-full">
              <Button
                variant={isTimerRunning ? 'danger' : 'success'}
                onClick={toggleTimer}
                leftIcon={isTimerRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                className="flex-1"
              >
                {isTimerRunning ? 'PAUSE SESS' : 'START DEEP WORK'}
              </Button>
              
              <Button
                variant="glass"
                size="icon"
                onClick={resetTimer}
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
