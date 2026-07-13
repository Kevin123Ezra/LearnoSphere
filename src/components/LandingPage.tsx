import React, { useState } from 'react';
import Button from './ui/Button';
import { 
  Sparkles, 
  GraduationCap, 
  ArrowRight, 
  Zap, 
  Brain, 
  Clock, 
  Users, 
  Check, 
  ChevronRight, 
  Layers, 
  TrendingUp, 
  Star,
  Compass,
  Award,
  BookOpen
} from 'lucide-react';

interface LandingPageProps {
  onEnterPortal: () => void;
  onNavigateTab: (tab: string) => void;
}

export default function LandingPage({ onEnterPortal, onNavigateTab }: LandingPageProps) {
  // Simulator Sandbox States
  const [activeSandbox, setActiveSandbox] = useState<'extract' | 'graph' | 'merge'>('extract');
  const [sandboxPastedText, setSandboxPastedText] = useState(
    "Active recall is a learning technique that involves testing your memory. Unlike passive review (rereading notes), it forces the brain to retrieve information, strengthening neural pathways."
  );
  const [simulatorStep, setSimulatorStep] = useState<'idle' | 'processing' | 'done'>('idle');
  const [simulatorResults, setSimulatorResults] = useState<{
    summary: string;
    cards: Array<{ q: string; a: string }>;
  } | null>(null);

  // Pricing Slider States
  const [hoursPerWeek, setHoursPerWeek] = useState(15);
  const [pricingPlan, setPricingPlan] = useState<'monthly' | 'annually'>('monthly');

  // Run Sandbox simulation
  const handleSimulateEngine = () => {
    setSimulatorStep('processing');
    setTimeout(() => {
      setSimulatorResults({
        summary: "Active recall replaces passive reading with deliberate memory retrieval. This cognitive effort strengthens synaptic connections, drastically slowing down memory decay rates.",
        cards: [
          { q: "What is Active Recall?", a: "A learning method where you actively retrieve information from memory rather than passively rereading." },
          { q: "How does it affect neural pathways?", a: "It forces the brain to retrieve information, which structurally strengthens synaptic connections." }
        ]
      });
      setSimulatorStep('done');
    }, 1500);
  };

  // Calculate estimated time saved
  const estimatedHoursSaved = Math.round(hoursPerWeek * 0.4); // 40% efficiency boost

  return (
    <div className="space-y-20 pb-20 font-sans text-zinc-100 animate-in fade-in duration-500 relative overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 text-center max-w-4xl mx-auto space-y-8 z-10 px-4">
        
        {/* Glow badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 tracking-wider uppercase animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 fill-current animate-pulse" />
          The AI-Powered Cognitive Study Hub
        </div>

        <h1 className="text-4xl sm:text-6xl font-display font-black text-white tracking-tight leading-[1.05] max-w-3xl mx-auto">
          Translate Your Syllabus into <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Cognitive Mastery</span>
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-sans font-medium">
          Upload slides, lecture transcripts, or classmate notes. Learnosphere immediately drafts adaptive Leitner flashcards, personalized mock papers, and neural knowledge networks synchronized to your university calendar.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onEnterPortal}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto px-8 py-4 font-bold shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transform hover:scale-[1.02] transition"
          >
            Launch Study Portal
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              const el = document.getElementById('sandbox');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-8 py-4"
          >
            Try Interactive Sandbox
          </Button>
        </div>

        {/* Feature Pill Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-12 max-w-3xl mx-auto">
          {[
            { label: "Active Recall", value: "Leitner Box System", color: "text-indigo-400" },
            { label: "Exam Prep", value: "Adaptive MCQ Papers", color: "text-[#14B8A6]" },
            { label: "AI Tutor", value: "Powered by Gemini 2.5", color: "text-purple-400" },
            { label: "Cooperative", value: "Classmate Note Merger", color: "text-pink-400" }
          ].map((item, idx) => (
            <div key={idx} className="bg-[#0D0F14]/70 border border-zinc-900/80 p-4 rounded-2xl text-center space-y-1 backdrop-blur-md">
              <span className={`text-[10px] font-bold font-mono tracking-wider uppercase ${item.color}`}>{item.label}</span>
              <p className="text-xs font-bold text-white truncate">{item.value}</p>
            </div>
          ))}
        </div>

      </section>

      {/* Feature Bento Grid Section */}
      <section className="space-y-12 px-4">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wider">PRODUCT ARCHITECTURE</span>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
            Engineered for Academic Peak Performance
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto font-sans font-medium">
            Standard review methods are passive and slow. Learnosphere shifts you to active, systematic retrieval.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto">
          
          {/* Bento Block 1: Neural Knowledge Maps (Span 7) */}
          <div className="md:col-span-7 bg-[#0D0F14] border border-zinc-900 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col justify-between group hover:border-zinc-800 transition shadow-xl min-h-[340px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
            
            <div className="space-y-3 max-w-md">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl w-fit">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Interactive Knowledge Mapping</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans font-medium">
                Map complex subjects as a unified neural network of interconnected nodes (e.g. Limits, Continuity, Derivatives). Track your exact syllabus readiness percentage in real time and see what topic to solve next to unlock advanced modules.
              </p>
            </div>

            <div className="mt-6 p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#6366F1] animate-ping" />
                <span className="text-xs font-bold text-zinc-300">Limits & Continuity: 84% Synced</span>
              </div>
              <button 
                onClick={() => onNavigateTab('dashboard')}
                className="text-xs font-mono font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                Explore Map <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bento Block 2: Adaptive Active Recall Cards (Span 5) */}
          <div className="md:col-span-5 bg-[#0D0F14] border border-zinc-900 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col justify-between group hover:border-zinc-800 transition shadow-xl min-h-[340px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/5 rounded-full blur-[60px] group-hover:bg-teal-500/10 transition-colors pointer-events-none" />

            <div className="space-y-3">
              <div className="p-2.5 bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6]/90 rounded-xl w-fit">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Smart Leitner Recall System</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans font-medium">
                Syllabus items are dynamically loaded into an adaptive Leitner box schedule. Boxes 1, 2, and 3 schedule reminders right before you forget, ensuring permanent memory retention.
              </p>
            </div>

            <div className="mt-6 flex gap-1.5 pt-4 border-t border-zinc-900">
              {['Box 1 (Daily)', 'Box 2 (3d)', 'Box 3 (Weekly)'].map((box, bIdx) => (
                <div key={bIdx} className="flex-1 bg-zinc-950/50 p-2 text-center rounded-xl border border-zinc-900/60">
                  <span className="text-[10px] font-bold text-zinc-400 block">{box}</span>
                  <span className="text-[10px] font-mono font-bold text-teal-400 mt-0.5 block">{bIdx === 0 ? '14' : bIdx === 1 ? '42' : '86'} cards</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bento Block 3: Dynamic Past Paper Generator (Span 5) */}
          <div className="md:col-span-5 bg-[#0D0F14] border border-zinc-900 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col justify-between group hover:border-zinc-800 transition shadow-xl min-h-[340px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-[60px] group-hover:bg-purple-500/10 transition-colors pointer-events-none" />

            <div className="space-y-3">
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl w-fit">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Adaptive Exam Workspace</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans font-medium">
                Generate tailored multiple-choice tests or conceptual questions instantly from your course notes. Learnosphere grades your answers automatically and displays detailed AI explanations explaining the core concepts.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('quizzes')}
              className="mt-6 cursor-pointer w-full text-center py-2.5 bg-zinc-950/80 hover:bg-[#6366F1]/10 text-xs font-mono font-bold text-white border border-zinc-900 hover:border-indigo-500/30 rounded-xl transition-all"
            >
              COMPILE PAST PAPER
            </button>
          </div>

          {/* Bento Block 4: Collective Classmate Merger (Span 7) */}
          <div className="md:col-span-7 bg-[#0D0F14] border border-zinc-900 rounded-3xl p-6 md:p-8 relative overflow-hidden flex flex-col justify-between group hover:border-zinc-800 transition shadow-xl min-h-[340px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-[80px] group-hover:bg-pink-500/10 transition-colors pointer-events-none" />

            <div className="space-y-3 max-w-md">
              <div className="p-2.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl w-fit">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Study Groups & Cognitive Merge</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans font-medium">
                Stitch classmates' notes, lecture slides, and personal bookmarks together. The merger tool reviews individual notes, highlights overlapping concepts, resolves differences, and compiles one Master Study Guide for the whole group.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 p-4.5 bg-[#121419]/50 border border-zinc-900 rounded-2xl">
              <div className="flex -space-x-2.5 overflow-hidden">
                {['YS', 'JV', 'MC', 'SP'].map((init, iIdx) => (
                  <div key={iIdx} className="inline-block h-7 w-7 rounded-full bg-indigo-500/20 border-2 border-zinc-950 text-indigo-400 text-[10px] font-black flex items-center justify-center font-mono">
                    {init}
                  </div>
                ))}
              </div>
              <span className="text-[11px] font-mono text-zinc-500 font-bold">Collaborators active in Limits Corridor</span>
              <button 
                onClick={() => onNavigateTab('group')}
                className="cursor-pointer text-xs font-bold text-[#6366F1] hover:text-indigo-400"
              >
                Join Corridor
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Interactive Simulator Sandbox Section */}
      <section id="sandbox" className="bg-[#090B0E] border-y border-zinc-900 py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Description (5-cols) */}
          <div className="lg:col-span-5 space-y-5">
            <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-wider">LIVE PLAYGROUND</span>
            <h2 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">
              Test Our Spaced Repetition Engine
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans font-medium">
              Experience the power of cognitive synthesis right here. Paste some textbook notes into the playground, and watch our simulator extract concepts and draft flashcards in seconds.
            </p>

            {/* Selector buttons */}
            <div className="flex gap-2 bg-zinc-950/60 p-1 rounded-xl border border-zinc-900 w-fit">
              <button 
                onClick={() => {
                  setActiveSandbox('extract');
                  setSandboxPastedText("Active recall is a learning technique that involves testing your memory. Unlike passive review (rereading notes), it forces the brain to retrieve information, strengthening neural pathways.");
                  setSimulatorStep('idle');
                }}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition ${activeSandbox === 'extract' ? 'bg-[#6366F1]/10 text-white border border-[#6366F1]/20' : 'text-zinc-500 hover:text-white'}`}
              >
                Concept Extractor
              </button>
              <button 
                onClick={() => {
                  setActiveSandbox('graph');
                  setSandboxPastedText("Indeterminate limit limits: when evaluating the limit of f(x)/g(x) results in 0/0 or inf/inf, use L'Hopital's Rule to take derivatives of top and bottom separately.");
                  setSimulatorStep('idle');
                }}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition ${activeSandbox === 'graph' ? 'bg-[#6366F1]/10 text-white border border-[#6366F1]/20' : 'text-zinc-500 hover:text-white'}`}
              >
                Derivative Limits
              </button>
            </div>
          </div>

          {/* Sandbox Box UI (7-cols) */}
          <div className="lg:col-span-7 bg-[#0D0F14] border border-zinc-900 rounded-2xl p-5 md:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Learnosphere Sandbox Terminal</span>
              </div>
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase">Interactive simulation</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold font-mono text-zinc-500 uppercase">Input Coursework Text</label>
              <textarea
                value={sandboxPastedText}
                onChange={(e) => setSandboxPastedText(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-200 outline-none focus:border-indigo-500/40 font-sans resize-none"
              />
            </div>

            {simulatorStep === 'idle' && (
              <Button
                variant="primary"
                onClick={handleSimulateEngine}
                leftIcon={<Sparkles className="w-3.5 h-3.5 fill-current" />}
                className="w-full py-2.5 font-mono text-[11px] font-bold"
              >
                RUN SYNTHESIS SIMULATOR
              </Button>
            )}

            {simulatorStep === 'processing' && (
              <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-center gap-2.5 text-xs text-indigo-400">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Drafting recall cards & summaries...</span>
              </div>
            )}

            {simulatorStep === 'done' && simulatorResults && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold font-mono text-teal-400 uppercase">Core Summary Abstract</span>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-[#121419]/40 p-3 rounded-lg border border-zinc-900/60 font-sans">
                    {simulatorResults.summary}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-bold font-mono text-indigo-400 uppercase block">Extracted Leitner Flashcards ({simulatorResults.cards.length})</span>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                    {simulatorResults.cards.map((card, cIdx) => (
                      <div key={cIdx} className="p-3 bg-[#121419] border border-zinc-900 rounded-lg space-y-1">
                        <span className="text-[9px] font-mono font-bold text-zinc-500 block">CARD {cIdx + 1}</span>
                        <h5 className="text-xs font-bold text-white leading-relaxed">{card.q}</h5>
                        <p className="text-xs text-zinc-400 leading-relaxed font-medium pt-1 border-t border-zinc-900/40">{card.a}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => setSimulatorStep('idle')}
                    className="flex-1 font-mono text-[10px] font-bold py-2"
                  >
                    RESET SIMULATION
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onEnterPortal}
                    className="flex-1 font-mono text-[10px] font-bold py-2"
                  >
                    SAVE & LAUNCH PORTAL
                  </Button>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* Pricing / Savings Interactive Section */}
      <section className="max-w-5xl mx-auto px-4 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wider">SAVINGS CALCULATOR</span>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
            Estimate Your Study Savings
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto font-sans font-medium">
            Learnosphere active retrieval reduces study time while boosting retention grades.
          </p>
        </div>

        {/* Interactive Savings Widget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#0D0F14] border border-zinc-900 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white font-display tracking-tight">How many hours do you study per week?</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-zinc-400 font-mono">My Study Hours:</span>
                <span className="text-2xl font-black text-indigo-400 font-mono">{hoursPerWeek} hrs</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-bold font-mono">
                <span>5 HRS</span>
                <span>25 HRS</span>
                <span>50 HRS</span>
              </div>
            </div>

            <div className="p-4 bg-zinc-950/50 border border-zinc-900 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-[#14B8A6]" />
                <span className="text-xs font-bold text-white">Estimated Study Time Saved:</span>
              </div>
              <p className="text-2xl font-black text-[#14B8A6] font-mono pl-6">
                {estimatedHoursSaved} <span className="text-xs font-light text-zinc-500">hours / week</span>
              </p>
              <p className="text-[10px] text-zinc-500 pl-6 leading-relaxed">
                By focusing purely on weak topics flagged by our adaptive engine rather than rereading.
              </p>
            </div>
          </div>

          {/* Plans Tiers Display */}
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-zinc-950/60 p-1 rounded-xl border border-zinc-900 w-fit mx-auto md:mr-0">
              <button 
                onClick={() => setPricingPlan('monthly')}
                className={`text-[10px] font-bold px-3 py-1 rounded-lg transition ${pricingPlan === 'monthly' ? 'bg-[#6366F1]/10 text-white border border-[#6366F1]/20' : 'text-zinc-500 hover:text-white'}`}
              >
                Monthly Billing
              </button>
              <button 
                onClick={() => setPricingPlan('annually')}
                className={`text-[10px] font-bold px-3 py-1 rounded-lg transition ${pricingPlan === 'annually' ? 'bg-[#6366F1]/10 text-white border border-[#6366F1]/20' : 'text-zinc-500 hover:text-white'}`}
              >
                Annually (Save 20%)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Free Plan */}
              <div className="bg-[#121419]/60 border border-zinc-900 rounded-2xl p-4.5 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold font-mono text-zinc-500 uppercase tracking-wider">STANDARD</span>
                  <h4 className="text-sm font-bold text-white">Free Scholar</h4>
                  <div className="text-xl font-black text-white font-mono">$0</div>
                  <ul className="space-y-1 pt-2">
                    {['2 active courses', '10 AI Tutor queries/day', 'Standard study planner'].map((item, i) => (
                      <li key={i} className="text-[10px] text-zinc-400 flex items-center gap-1.5 leading-tight">
                        <Check className="w-3 h-3 text-emerald-400 stroke-[3.5] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="glass" size="sm" onClick={onEnterPortal} className="w-full text-[10px] font-mono">
                  LAUNCH FREE PORTAL
                </Button>
              </div>

              {/* Premium Plan */}
              <div className="bg-gradient-to-b from-[#13161E] to-[#0D0F14] border border-[#6366F1]/40 rounded-2xl p-4.5 flex flex-col justify-between space-y-4 relative shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                <div className="absolute -top-2 right-4 bg-gradient-to-r from-indigo-500 to-purple-600 px-2 py-0.5 rounded text-[8px] font-bold font-mono text-white uppercase tracking-wider">
                  RECOMMENDED
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold font-mono text-indigo-400 uppercase tracking-wider">INFINITY SCHOLAR</span>
                  <h4 className="text-sm font-bold text-white">Infinity Scholar</h4>
                  <div className="text-xl font-black text-white font-mono">
                    {pricingPlan === 'monthly' ? '$8' : '$6'} <span className="text-[10px] text-zinc-500">/ month</span>
                  </div>
                  <ul className="space-y-1 pt-2">
                    {['Unlimited active courses', 'Unlimited Gemini AI queries', 'Classmate Guide Merger', 'Interactive Knowledge Maps', 'Adaptive Revision Timelines'].map((item, i) => (
                      <li key={i} className="text-[10px] text-zinc-300 flex items-center gap-1.5 leading-tight font-medium">
                        <Check className="w-3 h-3 text-[#14B8A6] stroke-[3.5] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="primary" size="sm" onClick={onEnterPortal} className="w-full text-[10px] font-mono shadow-md">
                  UPGRADE NOW
                </Button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Landing CTA Footer */}
      <section className="bg-gradient-to-tr from-[#0D0F14] via-[#0E1116] to-[#12151D] border border-zinc-900 rounded-3xl p-8 md:p-12 text-center max-w-5xl mx-auto space-y-6 relative overflow-hidden shadow-2xl px-4">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent" />
        
        <h2 className="text-2xl md:text-4xl font-display font-black text-white tracking-tight leading-tight">
          Supercharge Your Lecture Recalls Today
        </h2>
        
        <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed font-sans font-medium">
          Ditch raw rereading and passive slide reviews. Connect your university calendars, invite classmates, and let Gemini 2.5 Flash transform your notes into a personalized learning universe.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
          <Button
            variant="primary"
            onClick={onEnterPortal}
            rightIcon={<Sparkles className="w-4 h-4 fill-current text-indigo-200" />}
            className="w-full sm:w-auto px-10 py-3.5 font-bold text-xs font-mono tracking-wider shadow-lg"
          >
            ENTER THE SYLLABUS PORTAL
          </Button>
        </div>

        <div className="pt-6 text-zinc-600 text-[10px] font-semibold font-mono tracking-wide uppercase">
          TRUSTED BY STUDENTS AT STANFORD, MIT, AND UC BERKELEY
        </div>
      </section>

    </div>
  );
}
