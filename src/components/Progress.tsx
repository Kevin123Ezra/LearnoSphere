import React from 'react';
import { 
  Award, 
  TrendingUp, 
  Brain, 
  Compass, 
  Clock, 
  BookOpen, 
  Zap, 
  Flame, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { DBState } from '../types';

interface ProgressProps {
  dbState: DBState;
  onSetStyle: (styleName: string) => void;
}

export default function Progress({ dbState, onSetStyle }: ProgressProps) {
  const { analytics, materials, quizzes, attempts } = dbState;

  const styles = [
    { 
      name: 'Active Analytical Learner', 
      desc: 'Masters complex mathematical models through reasoning, rigorous proofs, and formula derivations.' 
    },
    { 
      name: 'Visual Synthesizer', 
      desc: 'Absorbs course material best through structured mind-maps, diagrams, and video walkthroughs.' 
    },
    { 
      name: 'Active Recall Practitioner', 
      desc: 'Thrives on flashcard loops, rapid quizzes, and teaching core theories back to peers.' 
    }
  ];

  const totalTasks = dbState.revisionTasks.length;
  const completedTasks = dbState.revisionTasks.filter(t => t.completed).length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" /> Academic Progress & Cognitive Diagnostics
        </h2>
        <p className="text-xs text-zinc-400">Detailed AI diagnostics tracking your university syllabus retention and style metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Readiness Forecast & Style override */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Exam Readiness Card */}
          <div className="bg-[#18181B] p-5 rounded-2xl border border-zinc-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Exam Readiness Forecast</h3>
              <p className="text-xs text-zinc-400">AI predictions of your comprehensive material mastery</p>
            </div>

            <div className="space-y-4 pt-2">
              {Object.entries(analytics.examReadiness).map(([subject, val]) => {
                const isLow = val < 50;
                const isMed = val >= 50 && val < 80;
                const barColor = isLow ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500';
                const textColor = isLow ? 'text-rose-400 bg-rose-500/10 border-rose-900/30' : isMed ? 'text-amber-400 bg-amber-500/10 border-amber-900/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-900/30';

                return (
                  <div key={subject} className="space-y-1.5 p-3 rounded-xl border border-zinc-800/60 bg-[#1e1e22]/30">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-zinc-100">{subject}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400 font-mono">Readiness:</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${textColor}`}>
                          {val}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className={`${barColor} h-2 rounded-full transition-all duration-500`} style={{ width: `${val}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Override learning style */}
          <div className="bg-[#18181B] p-5 rounded-2xl border border-zinc-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Override Learning Style</h3>
              <p className="text-xs text-zinc-400">Customize the cognitive response engine optimization presets</p>
            </div>

            <div className="space-y-2.5">
              {styles.map((style) => {
                const isSelected = analytics.preferredStyleName === style.name;
                return (
                  <button
                    key={style.name}
                    onClick={() => onSetStyle(style.name)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-white font-semibold'
                        : 'border-zinc-800 bg-[#1e1e22]/20 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <span className="font-bold text-white">{style.name}</span>
                    <span className="text-[10px] text-zinc-400 font-normal leading-relaxed">{style.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: AI Learning Profile Radar metrics & History timeline */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Learning Profile Card */}
          <div className="bg-[#18181B] p-5 rounded-2xl border border-zinc-800 shadow-xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-white font-display">AI Learning Profile</h3>
                <p className="text-xs text-zinc-400">Current neural metric breakdown</p>
              </div>
              <span className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                <Compass className="w-4 h-4" />
              </span>
            </div>

            <div className="bg-[#111113] p-4 rounded-xl border border-zinc-800/80 space-y-3">
              <h4 className="text-xs font-bold text-indigo-400 font-mono tracking-wider uppercase">Active Preset</h4>
              <div className="space-y-1">
                <span className="text-xs font-bold text-zinc-100">{analytics.preferredStyleName}</span>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  {styles.find(s => s.name === analytics.preferredStyleName)?.desc || "Active recall and deep derivations keep your knowledge base sticky."}
                </p>
              </div>

              {/* Bar charts for learning profile */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/60 text-[10px]">
                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Analytical Skills</span>
                    <span className="font-mono text-indigo-400">{analytics.learningStyle.analyticalScore}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-400 h-full" style={{ width: `${analytics.learningStyle.analyticalScore}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Retrieval Practice</span>
                    <span className="font-mono text-amber-400">{analytics.learningStyle.retrievalScore}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full" style={{ width: `${analytics.learningStyle.retrievalScore}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Active Recall</span>
                    <span className="font-mono text-emerald-400">{analytics.learningStyle.activeRecallScore}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full" style={{ width: `${analytics.learningStyle.activeRecallScore}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Visual Synthesis</span>
                    <span className="font-mono text-rose-400">{analytics.learningStyle.visualScore}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-rose-400 h-full" style={{ width: `${analytics.learningStyle.visualScore}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline of Quiz attempts */}
          <div className="bg-[#18181B] p-5 rounded-2xl border border-zinc-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white font-display">Syllabus Attempts History</h3>
              <p className="text-xs text-zinc-400">Past quiz performances and diagnostic milestones</p>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {attempts.length > 0 ? (
                attempts.slice().reverse().map((att, idx) => {
                  const percentage = Math.round((att.score / att.total) * 100);
                  const isFail = percentage < 65;
                  
                  return (
                    <div key={idx} className="p-3 bg-[#1e1e22]/30 rounded-xl border border-zinc-800/80 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-zinc-200 line-clamp-1 flex-1">{att.quizTitle}</span>
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                          isFail ? 'bg-rose-500/10 text-rose-400 border-rose-900/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-900/30'
                        }`}>
                          {att.score}/{att.total}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                        <span>{new Date(att.date).toLocaleDateString()}</span>
                        <span>{percentage}% score</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-zinc-500">
                  No quizzes attempted yet. Complete a checkpoint to sync your history.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
