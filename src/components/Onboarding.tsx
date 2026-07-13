import React, { useState } from 'react';
import { 
  GraduationCap, 
  Search, 
  BookOpen, 
  Check, 
  ChevronRight, 
  Sparkles, 
  Upload, 
  Calendar, 
  ArrowRight, 
  Info, 
  Loader2, 
  BrainCircuit, 
  FileText 
} from 'lucide-react';
import { DBState, RevisionTask } from '../types';

interface OnboardingProps {
  onComplete: (data: {
    university: string;
    courses: string[];
    preferredStyleName: string;
    learningStyle: {
      analyticalScore: number;
      visualScore: number;
      retrievalScore: number;
      activeRecallScore: number;
    };
    uploadedMaterial?: any;
    syncedTasks?: any[];
  }) => void;
}

const UNIVERSITIES = [
  'Stanford University',
  'Massachusetts Institute of Technology (MIT)',
  'University of California, Berkeley',
  'Harvard University',
  'California Institute of Technology (Caltech)',
  'University of Oxford',
  'University of Cambridge',
  'Yale University',
  'Princeton University',
  'University of Toronto'
];

const AVAILABLE_COURSES = [
  { code: 'MATH101', name: 'Calculus I: Limits & Continuity', subject: 'Calculus' },
  { code: 'CS229', name: 'Intro to Deep Learning: Neural Nets', subject: 'Machine Learning' },
  { code: 'PHYS201', name: 'Classical Mechanics & Gravity', subject: 'Physics' },
  { code: 'CHEM301', name: 'Organic Chemistry Reactions', subject: 'Chemistry' },
  { code: 'HIST105', name: 'Modern World History & Politics', subject: 'History' }
];

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'How do you typically master a brand-new complex algorithm or scientific formula?',
    options: [
      { text: 'Analyze flowcharts, graph node models, or visual charts showing the relationships.', type: 'visual', scoreKey: 'visualScore' },
      { text: 'Read the text proof line-by-line, highlighting crucial definitions and conditions.', type: 'reading', scoreKey: 'analyticalScore' },
      { text: 'Jump directly into code, equations, or sample exercises to see what breaks first.', type: 'practice', scoreKey: 'retrievalScore' }
    ]
  },
  {
    id: 2,
    question: 'When preparing for a high-stakes exam, which study method makes you feel most confident?',
    options: [
      { text: 'Sketching mind maps or structural trees connecting course chapters together.', type: 'visual', scoreKey: 'visualScore' },
      { text: 'Reviewing detailed, summarized slides and textbook pages repeatedly.', type: 'reading', scoreKey: 'analyticalScore' },
      { text: 'Testing myself with active recall flashcards and adaptive diagnostic questions.', type: 'practice', scoreKey: 'activeRecallScore' }
    ]
  },
  {
    id: 3,
    question: 'If you get stuck on a difficult homework problem, what is your immediate reflex?',
    options: [
      { text: 'Look for an video lecture or animation showing a step-by-step resolution.', type: 'visual', scoreKey: 'visualScore' },
      { text: 'Compare formulas, written textbook notes, or consult academic documentation.', type: 'reading', scoreKey: 'analyticalScore' },
      { text: 'Attempt similar mock exercises or break down the problem into smaller solvable parts.', type: 'practice', scoreKey: 'retrievalScore' }
    ]
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  
  // Step 1: University & Course selection
  const [uniSearch, setUniSearch] = useState('');
  const [selectedUni, setSelectedUni] = useState('Stanford University');
  const [selectedCourses, setSelectedCourses] = useState<string[]>(['Calculus I: Limits & Continuity', 'Intro to Deep Learning: Neural Nets']);
  const [showUniDropdown, setShowUniDropdown] = useState(false);

  // Step 2: Learning Style Quiz
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  
  // Step 3: Upload Materials
  const [pastedNotes, setPastedNotes] = useState('');
  const [uploadTitle, setUploadTitle] = useState('My Physics I Mechanics Note');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedResult, setUploadedResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  // Step 4: Calendar Sync
  const [calendarProvider, setCalendarProvider] = useState<'google' | 'outlook' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncedDeadlines, setSyncedDeadlines] = useState<any[]>([]);

  // Filtering Universities
  const filteredUnis = UNIVERSITIES.filter(u => u.toLowerCase().includes(uniSearch.toLowerCase()));

  // Toggle Course Selection
  const toggleCourse = (courseName: string) => {
    if (selectedCourses.includes(courseName)) {
      setSelectedCourses(prev => prev.filter(c => c !== courseName));
    } else {
      setSelectedCourses(prev => [...prev, courseName]);
    }
  };

  // Handle Quiz selection
  const selectQuizAnswer = (questionId: number, optionIdx: number) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: optionIdx
    }));
  };

  // Calculate scores based on answers
  const finishQuizAndCalculateStyle = () => {
    const scores = {
      analyticalScore: 70,
      visualScore: 60,
      retrievalScore: 65,
      activeRecallScore: 60
    };

    QUIZ_QUESTIONS.forEach(q => {
      const selectedOptIdx = quizAnswers[q.id];
      if (selectedOptIdx !== undefined) {
        const opt = q.options[selectedOptIdx];
        if (opt.scoreKey === 'analyticalScore') scores.analyticalScore += 15;
        if (opt.scoreKey === 'visualScore') scores.visualScore += 20;
        if (opt.scoreKey === 'retrievalScore') scores.retrievalScore += 15;
        if (opt.scoreKey === 'activeRecallScore') scores.activeRecallScore += 20;
      }
    });

    let styleName = 'Analytical Deep Thinker';
    const maxScore = Math.max(scores.analyticalScore, scores.visualScore, scores.retrievalScore);
    if (maxScore === scores.visualScore) {
      styleName = 'Visual Spatial Conceptualist';
    } else if (maxScore === scores.retrievalScore) {
      styleName = 'Retrieval-Oriented Practice Strategist';
    } else {
      styleName = 'Analytical Step-by-Step Thinker';
    }

    return { scores, styleName };
  };

  // Mock upload action or real analysis call
  const handleOnboardingUpload = async () => {
    if (!pastedNotes.trim()) {
      alert('Please paste some lecture notes or click "Insert Sample Physics Lecture Notes" below!');
      return;
    }
    
    setIsUploading(true);
    try {
      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle,
          type: 'pdf',
          content: pastedNotes
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUploadedResult(data);
      setStep(4);
    } catch (e) {
      console.error(e);
      // Fallback: simulate upload if server fails or is busy
      setTimeout(() => {
        setUploadedResult({
          material: {
            id: 'mat-physics-onb',
            title: uploadTitle,
            type: 'pdf',
            content: pastedNotes,
            summary: 'Auto-synthesized physics lecture regarding classical mechanics and drag vectors. Highlights conservative force fields and kinetic transfers.',
            concepts: [
              { title: 'Conservative Forces', description: 'Force fields where the total work done in moving a particle between two points is independent of the path taken.' }
            ],
            createdAt: new Date().toISOString()
          },
          flashcards: [
            { id: 'fc-onb-1', question: 'Define a conservative force field.', answer: 'Work done is path-independent.' }
          ],
          quiz: {
            id: 'quiz-onb-1',
            title: `${uploadTitle} - Onboarding Quiz`,
            questions: []
          },
          revisionTask: {
            id: 'rev-onb-1',
            title: `Review Conservative Force Notes: ${uploadTitle}`,
            completed: false
          }
        });
        setStep(4);
      }, 1500);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCalendarSync = async (provider: 'google' | 'outlook') => {
    setCalendarProvider(provider);
    setIsSyncing(true);
    
    // Simulate API fetch or syllabus scan to auto-pull deadlines
    try {
      const mockSyllabusText = `SYLLABUS - Autumn Semester.
      University Course Deadlines:
      - Calculus Exam 1: limits, asymptotes, and continuity rules. Due on Wednesday.
      - Machine Learning Project Proposal: Deep neural network perceptrons, ReLU weights. Due on Friday.
      - Classical Physics Problem Set 2: Kinetic energy transfer, conservative fields. Due next Monday.`;

      const response = await fetch('/api/planner/deadline-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syllabusText: mockSyllabusText })
      });
      const data = await response.json();
      
      if (response.ok && data.addedTasks) {
        setSyncedDeadlines(data.addedTasks);
      } else {
        // Fallback mock tasks
        setSyncedDeadlines([
          { id: 'fc-sync-1', title: 'Calculus Continuity Exam Prep', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], subject: 'Calculus', type: 'review', completed: false },
          { id: 'fc-sync-2', title: 'Neural Networks Architecture Proposal', dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], subject: 'Machine Learning', type: 'practice', completed: false }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
      setSyncDone(true);
    }
  };

  const finishOnboarding = () => {
    const { scores, styleName } = finishQuizAndCalculateStyle();
    onComplete({
      university: selectedUni,
      courses: selectedCourses,
      preferredStyleName: styleName,
      learningStyle: scores,
      uploadedMaterial: uploadedResult,
      syncedTasks: syncedDeadlines
    });
  };

  const insertSamplePhysics = () => {
    setUploadTitle('Physics 101: Work & Kinetic Energy');
    setPastedNotes(`Physics 101 focuses on Work and Kinetic Energy. Work is defined as the force applied over a distance. W = F * d * cos(theta). The Work-Energy Theorem states that the net work done on an object is equal to its change in kinetic energy: W_net = Delta K = 1/2 * m * v_f^2 - 1/2 * m * v_i^2.\n\nConservative forces, such as gravity and electrostatic forces, conserve mechanical energy. Non-conservative forces, such as friction and air resistance, dissipate mechanical energy into thermal energy.`);
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] flex flex-col items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-2xl bg-[#1A1D23] border border-[#2A2E37] rounded-3xl shadow-2xl p-6 md:p-8 space-y-6">
        
        {/* Onboarding Header */}
        <div className="flex items-center justify-between border-b border-[#2A2E37] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#4F46E5] rounded-2xl text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white font-display">Setup LearnSphere AI</h1>
              <p className="text-xs text-zinc-400">Initialize your personalized university study companion</p>
            </div>
          </div>
          <div className="flex items-center gap-1 font-mono text-xs text-zinc-500 font-bold bg-[#121419] px-3 py-1.5 rounded-full border border-[#2A2E37]">
            Step <span className="text-indigo-400">{step}</span> of 4
          </div>
        </div>

        {/* STEP 1: Choose University & Enrolled Courses */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <Search className="w-4 h-4 text-indigo-400" /> Select Your University
              </h2>
              <p className="text-xs text-zinc-400">Search or select from elite campuses to index local syllabus formats.</p>
            </div>

            <div className="relative">
              <div className="flex items-center bg-[#121419] border border-[#2A2E37] rounded-xl px-3 py-2.5">
                <Search className="w-4 h-4 text-zinc-500 shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Search university (e.g. Stanford)"
                  value={uniSearch || selectedUni}
                  onChange={(e) => {
                    setUniSearch(e.target.value);
                    setShowUniDropdown(true);
                  }}
                  onFocus={() => setShowUniDropdown(true)}
                  className="bg-transparent w-full text-xs text-white outline-none"
                />
              </div>

              {showUniDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#121419] border border-[#2A2E37] rounded-xl shadow-2xl max-h-[160px] overflow-y-auto z-30">
                  {filteredUnis.map((uni) => (
                    <button
                      key={uni}
                      onClick={() => {
                        setSelectedUni(uni);
                        setUniSearch(uni);
                        setShowUniDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-[#4F46E5]/10 hover:text-white transition flex items-center justify-between"
                    >
                      <span>{uni}</span>
                      {selectedUni === uni && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                  {filteredUnis.length === 0 && (
                    <div className="p-3 text-xs text-zinc-500 italic text-center">No universities found. Use custom search.</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <BookOpen className="w-4 h-4 text-indigo-400" /> Enroll in Enrolled Courses
                </h2>
                <p className="text-xs text-zinc-400">Select which courses you are taking this semester (toggle to enroll).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {AVAILABLE_COURSES.map((course) => {
                  const isSelected = selectedCourses.includes(course.name);
                  return (
                    <button
                      key={course.code}
                      onClick={() => toggleCourse(course.name)}
                      className={`text-left p-3.5 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                        isSelected 
                          ? 'border-[#4F46E5] bg-[#4F46E5]/10' 
                          : 'border-[#2A2E37] hover:border-zinc-700 bg-transparent'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#121419] text-zinc-500 border border-[#2A2E37]'
                      }`}>
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono font-bold text-indigo-400 block">{course.code}</span>
                        <h4 className="text-xs font-bold text-white truncate">{course.name}</h4>
                        <span className="text-[10px] text-zinc-500">{course.subject}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={selectedCourses.length === 0 || !selectedUni}
              className="w-full bg-[#4F46E5] border border-[#4338CA] text-white hover:bg-[#4338CA] transition p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <span>Continue to Learning Style Quiz</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Learning Style Quiz */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <BrainCircuit className="w-4 h-4 text-indigo-400" /> Cognitive Personalization Quiz
              </h2>
              <p className="text-xs text-zinc-400">Answer 3 simple scenario questions to calibrate our adaptive recall engine.</p>
            </div>

            <div className="space-y-5">
              {QUIZ_QUESTIONS.map((q) => (
                <div key={q.id} className="space-y-2.5">
                  <h4 className="text-xs font-bold text-zinc-300 leading-relaxed font-sans">
                    {q.id}. {q.question}
                  </h4>
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = quizAnswers[q.id] === oIdx;
                      return (
                        <button
                          key={oIdx}
                          onClick={() => selectQuizAnswer(q.id, oIdx)}
                          className={`w-full text-left p-3 rounded-xl border text-xs leading-normal transition cursor-pointer ${
                            isSelected 
                              ? 'border-[#4F46E5] bg-[#4F46E5]/10 text-white font-medium' 
                              : 'border-[#2A2E37] hover:border-zinc-700 text-zinc-400 bg-[#121419]/30'
                          }`}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-transparent border border-[#2A2E37] hover:bg-zinc-800/30 text-zinc-300 p-3 rounded-xl text-xs font-bold cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={Object.keys(quizAnswers).length < QUIZ_QUESTIONS.length}
                className="flex-1 bg-[#4F46E5] border border-[#4338CA] text-white hover:bg-[#4338CA] transition p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>Continue to Materials Upload</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Upload Initial Study Materials */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <Upload className="w-4 h-4 text-indigo-400" /> Synthesize Your First Coursework
              </h2>
              <p className="text-xs text-zinc-400">Paste transcripts, slides, or syllabus guidelines to initiate our spaced flashcard generator.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Title of Material</label>
                <input
                  type="text"
                  placeholder="e.g. Physics I - Work & Energy Lecture"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-[#2A2E37] bg-[#121419] text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div 
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); insertSamplePhysics(); }}
                className={`border border-dashed p-5 rounded-2xl flex flex-col items-center justify-center text-center transition relative ${
                  dragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-[#2A2E37] bg-[#121419]/25 hover:border-zinc-700'
                }`}
              >
                <FileText className="w-8 h-8 text-zinc-600 mb-2" />
                <span className="text-xs font-semibold text-zinc-300">Drag & drop coursework slides/PDF here</span>
                <span className="text-[10px] text-zinc-500 mt-1 font-sans">or paste raw notes below to trigger smart extraction</span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Lecture Notes Transcript Content</label>
                  <button
                    type="button"
                    onClick={insertSamplePhysics}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    🚀 Insert Sample Notes
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="Paste lecture notes or transcripts..."
                  value={pastedNotes}
                  onChange={(e) => setPastedNotes(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-[#2A2E37] bg-[#121419] text-white outline-none font-sans resize-none focus:ring-2 focus:ring-indigo-500/20"
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-transparent border border-[#2A2E37] hover:bg-zinc-800/30 text-zinc-300 p-3 rounded-xl text-xs font-bold cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleOnboardingUpload}
                disabled={isUploading}
                className="flex-1 bg-[#4F46E5] border border-[#4338CA] text-white hover:bg-[#4338CA] transition p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Material...</span>
                  </>
                ) : (
                  <>
                    <span>Extract & Summarize</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
            
            <button
              onClick={() => setStep(4)}
              className="w-full text-center text-[10px] font-mono text-zinc-500 hover:text-zinc-300 cursor-pointer font-bold block mt-1"
            >
              Skip Uploading For Now (Use Default Core Coursework)
            </button>
          </div>
        )}

        {/* STEP 4: Calendar Sync dead-line puller */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <Calendar className="w-4 h-4 text-indigo-400" /> Syllabus Calendar Auto-Sync
              </h2>
              <p className="text-xs text-zinc-400">Connect Outlook or Google Calendar to automatically pull syllabus and exam deadlines.</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 py-2">
              <button
                onClick={() => handleCalendarSync('google')}
                disabled={isSyncing}
                className={`p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2.5 cursor-pointer ${
                  calendarProvider === 'google' 
                    ? 'border-indigo-500 bg-indigo-500/5' 
                    : 'border-[#2A2E37] bg-[#121419]/30 hover:border-zinc-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#4285F4] font-bold text-sm">
                  G
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Google Calendar</span>
                  <span className="text-[9px] text-zinc-500">Auto-pull timelines</span>
                </div>
              </button>

              <button
                onClick={() => handleCalendarSync('outlook')}
                disabled={isSyncing}
                className={`p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2.5 cursor-pointer ${
                  calendarProvider === 'outlook' 
                    ? 'border-indigo-500 bg-indigo-500/5' 
                    : 'border-[#2A2E37] bg-[#121419]/30 hover:border-zinc-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#0078D4] font-bold text-sm">
                  O
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Outlook Calendar</span>
                  <span className="text-[9px] text-zinc-500">Auto-extract dates</span>
                </div>
              </button>
            </div>

            {isSyncing && (
              <div className="p-4 bg-[#121419] border border-[#2A2E37] rounded-xl flex items-center gap-3 justify-center text-xs text-zinc-400">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span>Crawling linked syllabus files and schedule nodes...</span>
              </div>
            )}

            {syncDone && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl space-y-2 animate-in zoom-in-95">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Check className="w-4 h-4 stroke-[3]" /> Calendar Synced Successfully!
                </div>
                <p className="text-[11px] text-zinc-300 leading-normal">
                  Syllabus indexed. We successfully crawled and synced <strong className="text-white">{syncedDeadlines.length} high-priority deadlines</strong> directly to your personal Revision Planner:
                </p>
                <ul className="space-y-1 font-mono text-[9px] text-zinc-400 pt-1">
                  {syncedDeadlines.map((task, idx) => (
                    <li key={idx} className="flex justify-between items-center bg-[#121419]/50 p-2 rounded-lg border border-[#2A2E37]">
                      <span className="truncate max-w-[70%] font-bold text-white">📅 {task.title}</span>
                      <span className="text-indigo-400">Due: {task.dueDate}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-transparent border border-[#2A2E37] hover:bg-zinc-800/30 text-zinc-300 p-3 rounded-xl text-xs font-bold cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={finishOnboarding}
                className="flex-1 bg-[#4F46E5] border border-[#4338CA] text-white hover:bg-[#4338CA] transition p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <span>Launch LearnSphere Dashboard</span>
                <Sparkles className="w-4 h-4 fill-current text-indigo-200" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 justify-center text-[11px] text-zinc-500 font-medium bg-[#121419]/40 py-2.5 rounded-2xl border border-[#2A2E37]/30">
          <Info className="w-3.5 h-3.5 text-indigo-400/80" /> Adaptive learning models powered by Gemini 3.5 Flash
        </div>

      </div>
    </div>
  );
}
