import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, 
  Upload, 
  FileText, 
  PlayCircle, 
  Clipboard, 
  ArrowRight, 
  Brain, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  MessageSquare,
  Volume2,
  Pause,
  GitFork,
  Info,
  SlidersHorizontal,
  Plus,
  ArrowUpRight,
  User,
  Send,
  HelpCircle,
  FileCode,
  GraduationCap,
  Search
} from 'lucide-react';
import { DBState, Material, Flashcard, Quiz, QuizAttempt } from '../types';

interface MaterialsProps {
  dbState: DBState;
  onMaterialUploaded: (data: {
    material: Material;
    flashcards: any[];
    quiz: any;
    revisionTask: any;
  }) => void;
}

// Map standard subjects to mock prerequisites & cross-links
const CROSS_COURSE_LINKS: Record<string, { target: string; reason: string }[]> = {
  'Calculus': [
    { target: 'Machine Learning', reason: 'Derivative limit rules underpin the Chain Rule in backpropagation.' },
    { target: 'Physics', reason: 'Instantaneous rates of change define velocity vectors in gravity wells.' }
  ],
  'Machine Learning': [
    { target: 'Calculus', reason: 'Requires partial derivatives to calculate gradient descent vectors.' }
  ],
  'Physics': [
    { target: 'Calculus', reason: 'Differential integrals are used to compute total work in path-independent conservative fields.' }
  ]
};

const SAMPLE_DISCUSSION: Record<string, { author: string; role: 'Student' | 'TA' | 'Professor'; content: string; date: string }[]> = {
  'Calculus': [
    { author: 'Prof. Julian Sterling', role: 'Professor', content: 'Welcome to Calculus I! Please make sure to review the limit laws in the first set of slides before next Tuesday\'s workshop. Focus on the formal definition of continuity.', date: '2 hours ago' },
    { author: 'Alex Rivera', role: 'Student', content: 'For the epsilon-delta proof on question 4, can we assume delta is epsilon divided by the constant coefficient?', date: '1 hour ago' },
    { author: 'Dr. Sarah Patel', role: 'TA', content: 'Yes, Alex! In general, choosing delta = epsilon / |m| works for linear functions f(x) = mx + b. We will outline the proof structures on the board tomorrow.', date: '45 mins ago' }
  ],
  'Machine Learning': [
    { author: 'Prof. Alan Turing', role: 'Professor', content: 'Our focus this week is backpropagation. Make sure you understand the difference between standard ReLU and Leaky ReLU in mitigating dying nodes.', date: '1 day ago' },
    { author: 'Lina Park', role: 'Student', content: 'Does the learning rate influence the vanishing gradient rate directly, or is it purely a weight adjustment multiplier?', date: '5 hours ago' }
  ],
  'Physics': [
    { author: 'Prof. Richard Feynman', role: 'Professor', content: 'Welcome to Classical Mechanics! Remember that conservative forces allow us to represent potential fields elegantly. Path independence is key.', date: '3 days ago' }
  ]
};

export default function Materials({ dbState, onMaterialUploaded }: MaterialsProps) {
  const { materials, flashcards, quizzes, attempts, analytics } = dbState;

  // Active view control: 'list' | 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  
  // Selected course subject name (e.g. 'Calculus', 'Machine Learning')
  const [selectedCourse, setSelectedCourse] = useState<string>('Calculus');
  
  // Course Detail Tab: 'materials' | 'summaries' | 'flashcards' | 'quizzes' | 'notes' | 'discussion'
  const [detailTab, setDetailTab] = useState<'materials' | 'summaries' | 'flashcards' | 'quizzes' | 'notes' | 'discussion'>('materials');

  // Filters & Sorting for Courses List
  const [sortBy, setSortBy] = useState<'readiness' | 'deadline' | 'recent'>('readiness');
  const [filterQuery, setFilterQuery] = useState('');
  
  // New Course Creator State
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseSubject, setNewCourseSubject] = useState('General');
  const [customCourses, setCustomCourses] = useState<{ name: string; code: string; subject: string; readiness: number; deadline: string; dateAdded: string }[]>([]);

  // Notes state
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({
    'Calculus': 'My notes: The epsilon-delta limit proof is the trickiest part. Make sure to double check limits from left and right side!',
    'Machine Learning': 'My notes: Activations introduce non-linearity. ReLU is max(0, x). Dying ReLU happens when values are negative.',
    'Physics': 'My notes: Path independence means work is 0 over any closed loop.'
  });
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Discussion state
  const [newForumPost, setNewForumPost] = useState('');
  const [forumPosts, setForumPosts] = useState<Record<string, any[]>>(SAMPLE_DISCUSSION);

  // Concept Map modal / states
  const [isConceptMapExpanded, setIsConceptMapExpanded] = useState(false);
  const [selectedMapNode, setSelectedMapNode] = useState<{ title: string; description: string } | null>(null);

  // Summaries "Explain this differently" tone state
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationResult, setExplanationResult] = useState<string | null>(null);
  const [explanationStyle, setExplanationStyle] = useState<'visual' | 'reading' | 'practice'>('visual');

  // TTS states
  const [isTtsGenerating, setIsTtsGenerating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form states for uploading coursework
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<'slides' | 'pdf' | 'video' | 'assignment'>('pdf');
  const [uploadContent, setUploadContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Extract core subjects from database materials
  const dbSubjects = Array.from(new Set(materials.map(m => {
    // deduce subject from title
    if (m.title.toLowerCase().includes('calculus') || m.title.toLowerCase().includes('limits')) return 'Calculus';
    if (m.title.toLowerCase().includes('deep learning') || m.title.toLowerCase().includes('neuron') || m.title.toLowerCase().includes('machine')) return 'Machine Learning';
    if (m.title.toLowerCase().includes('physics') || m.title.toLowerCase().includes('mechanics')) return 'Physics';
    return 'General Study';
  })));

  // Combine default course catalog with newly added courses
  const defaultCourses = [
    { name: 'Calculus I: Limits & Continuity', code: 'MATH101', subject: 'Calculus', readiness: analytics.examReadiness['Calculus'] || 42, deadline: 'In 3 days', dateAdded: '2026-06-30' },
    { name: 'Intro to Deep Learning: Neurons', code: 'CS229', subject: 'Machine Learning', readiness: analytics.examReadiness['Machine Learning'] || 78, deadline: 'In 5 days', dateAdded: '2026-07-01' },
    { name: 'Classical Mechanics & Gravity', code: 'PHYS201', subject: 'Physics', readiness: analytics.examReadiness['Physics'] || 85, deadline: 'In 1 week', dateAdded: '2026-06-28' }
  ];

  const allCourses = [...defaultCourses, ...customCourses];

  // Filter & sort course catalog
  const filteredCourses = allCourses.filter(c => {
    return c.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
           c.subject.toLowerCase().includes(filterQuery.toLowerCase()) ||
           c.code.toLowerCase().includes(filterQuery.toLowerCase());
  }).sort((a, b) => {
    if (sortBy === 'readiness') return a.readiness - b.readiness; // weakest first
    if (sortBy === 'deadline') return a.deadline.localeCompare(b.deadline);
    return b.dateAdded.localeCompare(a.dateAdded); // recently added first
  });

  // Handle adding custom course
  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;

    const code = newCourseCode.trim() || `CRS-${Math.floor(100 + Math.random() * 900)}`;
    const newCourseObj = {
      name: newCourseName,
      code: code,
      subject: newCourseSubject,
      readiness: 50, // default initial
      deadline: 'Not scheduled yet',
      dateAdded: new Date().toISOString().split('T')[0]
    };

    setCustomCourses(prev => [...prev, newCourseObj]);
    setNewCourseName('');
    setNewCourseCode('');
    setShowAddCourse(false);
  };

  // Find materials belonging to selected course
  const currentCourseMaterials = materials.filter(m => {
    const titleLower = m.title.toLowerCase();
    const subjectLower = selectedCourse.toLowerCase();
    return titleLower.includes(subjectLower) || 
           (selectedCourse === 'Calculus' && (titleLower.includes('calc') || titleLower.includes('limits'))) ||
           (selectedCourse === 'Machine Learning' && (titleLower.includes('ml') || titleLower.includes('neuron') || titleLower.includes('deep')));
  });

  // Fallback to general if empty
  const activeMaterial = currentCourseMaterials[0] || materials[0];

  // Filter flashcards for active course
  const currentCourseFlashcards = flashcards.filter(c => {
    return c.materialTitle.toLowerCase().includes(selectedCourse.toLowerCase()) || 
           (selectedCourse === 'Calculus' && c.materialTitle.toLowerCase().includes('calculus')) ||
           (selectedCourse === 'Machine Learning' && c.materialTitle.toLowerCase().includes('deep learning'));
  });

  // Filter quizzes for active course
  const currentCourseQuizzes = quizzes.filter(q => {
    return (q.subject && q.subject.toLowerCase() === selectedCourse.toLowerCase()) ||
           q.materialTitle.toLowerCase().includes(selectedCourse.toLowerCase());
  });

  // Filter attempts for active course
  const currentCourseAttempts = attempts.filter(att => {
    return att.quizTitle.toLowerCase().includes(selectedCourse.toLowerCase());
  });

  // Check if active course is registered as a weakness
  const activeWeakness = analytics.weaknesses.find(w => w.subject.toLowerCase() === selectedCourse.toLowerCase());

  // Handle uploading of materials for specific course
  const handleFormUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadContent.trim()) {
      setUploadError('Please fill out all fields.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle,
          type: uploadType,
          content: uploadContent
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      onMaterialUploaded(data);
      setUploadTitle('');
      setUploadContent('');
    } catch (err: any) {
      setUploadError(err.message || 'Connection failure. Simulating analyze coursework locally.');
      // Simulating local analysis
      setTimeout(() => {
        const matId = `mat-sim-${Date.now()}`;
        const simulatedMaterial: Material = {
          id: matId,
          title: uploadTitle,
          type: uploadType,
          content: uploadContent,
          summary: `Self-extracted summary for ${uploadTitle}. Highlights key definitions, procedural formulas, and practical test cases.`,
          concepts: [
            { title: 'Core Principle', description: 'Elementary baseline rule extracted from your study documents.' }
          ],
          createdAt: new Date().toISOString()
        };
        onMaterialUploaded({
          material: simulatedMaterial,
          flashcards: [{ id: `sim-fc-${Date.now()}`, question: `Explain core concept of ${uploadTitle}`, answer: 'Extracted definition', box: 1, nextReviewDate: new Date().toISOString(), materialTitle: uploadTitle }],
          quiz: { id: `sim-qz-${Date.now()}`, title: `${uploadTitle} - Quiz`, questions: [] },
          revisionTask: { id: `sim-rev-${Date.now()}`, title: `Revision: ${uploadTitle}`, completed: false, subject: selectedCourse, dueDate: new Date().toISOString().split('T')[0] }
        });
        setUploadTitle('');
        setUploadContent('');
      }, 1500);
    } finally {
      setIsUploading(false);
    }
  };

  // Explain concept differently based on learning style
  const explainDifferently = async (conceptTitle: string) => {
    if (!activeMaterial) return;
    setIsExplaining(true);
    setExplanationResult(null);

    const styleInstructions: Record<'visual' | 'reading' | 'practice', string> = {
      visual: "Provide a rich, highly visual analogy, ASCII schematic flow diagram, or conceptual node map representation to break down the concept.",
      reading: "Provide an extremely clear, authoritative textbook style step-by-step written proof or standard encyclopedic summary.",
      practice: "Provide a concrete real-world case study or practical problem example with a step-by-step solved calculation drill."
    };

    try {
      const response = await fetch('/api/materials/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: activeMaterial.id,
          conceptTitle: conceptTitle,
          question: `Explain this using a ${explanationStyle} style: ${styleInstructions[explanationStyle]}`
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setExplanationResult(data.explanation);
    } catch (e) {
      console.error(e);
      setExplanationResult(`## Simulated ${explanationStyle.toUpperCase()} Explanation: ${conceptTitle}\n\nSince this is an offline or simulated sandbox, we have generated this fallback:\n\n1. **Analogy/Concept**: It is like a biological relay node passing inputs.\n2. **Breakdown**: Active weight adjustments happen dynamically.\n3. **Quick Test**: Do limits always exist? No, left and right bounds must align.`);
    } finally {
      setIsExplaining(false);
    }
  };

  // Play audio summary (TTS preview)
  const playAudioSummary = async () => {
    if (!activeMaterial) return;
    
    if (audioUrl) {
      if (isPlayingAudio) {
        audioRef.current?.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current?.play();
        setIsPlayingAudio(true);
      }
      return;
    }

    setIsTtsGenerating(true);
    try {
      const response = await fetch('/api/materials/tts-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: activeMaterial.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.audioContent) {
        const audioBlob = await (await fetch(`data:audio/mp3;base64,${data.audioContent}`)).blob();
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play();
        setIsPlayingAudio(true);
        
        audio.onended = () => {
          setIsPlayingAudio(false);
        };
      }
    } catch (err) {
      console.error('TTS Audio summary failed', err);
      alert('Text-to-Speech preview generation is simulated. The TTS reader requires a valid Gemini TTS API subscription.');
    } finally {
      setIsTtsGenerating(false);
    }
  };

  // Save student notes
  const handleSaveNotes = () => {
    setIsSavingNotes(true);
    setTimeout(() => {
      setIsSavingNotes(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  // Submit new discussion post
  const handlePostForum = () => {
    if (!newForumPost.trim()) return;
    const newPost = {
      author: 'Kevin Santhosh (You)',
      role: 'Student' as const,
      content: newForumPost,
      date: 'Just now'
    };

    setForumPosts(prev => ({
      ...prev,
      [selectedCourse]: [...(prev[selectedCourse] || []), newPost]
    }));
    setNewForumPost('');
  };

  return (
    <div className="space-y-6">
      
      {/* ----------------- COURSE DIRECTORY LIST VIEW ----------------- */}
      {viewMode === 'list' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Top Bar Actions */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight text-white">
                My Enrolled Courses
              </h1>
              <p className="text-zinc-400 text-xs mt-1">
                Select a course to view lectures, spaced repetition cards, quizzes, notes, and professor discussion boards.
              </p>
            </div>

            <button
              onClick={() => setShowAddCourse(true)}
              className="cursor-pointer self-start sm:self-center bg-indigo-600 hover:bg-indigo-700 text-white transition py-2.5 px-4.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Add course</span>
            </button>
          </div>

          {/* Add Course Popover Panel */}
          {showAddCourse && (
            <div className="bg-[#13161E] p-5 rounded-2xl border border-indigo-500/30 shadow-2xl space-y-4 max-w-lg animate-in zoom-in-95">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono text-indigo-400">Create New Enrolled Course</h3>
              <form onSubmit={handleCreateCourse} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Course Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Molecular Biology"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      className="w-full text-xs p-3 mt-1 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Course Code</label>
                    <input
                      type="text"
                      placeholder="e.g. BIO102"
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                      className="w-full text-xs p-3 mt-1 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Primary Subject</label>
                  <select
                    value={newCourseSubject}
                    onChange={(e) => setNewCourseSubject(e.target.value)}
                    className="w-full text-xs p-3 mt-1 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white outline-none cursor-pointer"
                  >
                    <option value="Calculus">Calculus</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="History">History</option>
                    <option value="Biology">Biology</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddCourse(false)}
                    className="cursor-pointer bg-transparent border border-zinc-850 text-zinc-400 text-[11px] px-4 py-2 rounded-xl hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer bg-[#4F46E5] text-white text-[11px] px-4 py-2 rounded-xl font-bold"
                  >
                    Enroll Course
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtering and Search Controls */}
          <div className="bg-[#13161E] p-4 rounded-xl border border-zinc-900 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex items-center bg-zinc-950/60 border border-zinc-850 rounded-xl px-3.5 py-2 w-full md:max-w-md">
              <Search className="w-4 h-4 text-zinc-500 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Filter courses by name, subject, or code..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-zinc-500 outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
              <span className="text-xs text-zinc-400">Sort by:</span>
              <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-1 flex gap-1">
                <button
                  onClick={() => setSortBy('readiness')}
                  className={`cursor-pointer text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${sortBy === 'readiness' ? 'bg-[#4F46E5]/10 text-indigo-400 border border-[#4F46E5]/20 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Readiness %
                </button>
                <button
                  onClick={() => setSortBy('deadline')}
                  className={`cursor-pointer text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${sortBy === 'deadline' ? 'bg-[#4F46E5]/10 text-indigo-400 border border-[#4F46E5]/20 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Deadline
                </button>
                <button
                  onClick={() => setSortBy('recent')}
                  className={`cursor-pointer text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${sortBy === 'recent' ? 'bg-[#4F46E5]/10 text-indigo-400 border border-[#4F46E5]/20 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Recently Updated
                </button>
              </div>
            </div>
          </div>

          {/* Courses grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => {
              const isWeak = analytics.weaknesses.some(w => w.subject.toLowerCase() === course.subject.toLowerCase());
              return (
                <div
                  key={course.code}
                  onClick={() => {
                    setSelectedCourse(course.subject);
                    setViewMode('detail');
                  }}
                  className="bg-[#13161E] border border-zinc-900 rounded-2xl p-5 hover:border-indigo-500/50 transition cursor-pointer flex flex-col justify-between min-h-[190px] group hover:shadow-[0_0_15px_rgba(99,102,241,0.05)] relative overflow-hidden"
                >
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md">
                        {course.code}
                      </span>
                      {isWeak && (
                        <span className="text-[9px] font-mono font-bold bg-[#EA580C]/10 border border-[#EA580C]/20 text-[#EA580C] px-2 py-1 rounded-md animate-pulse">
                          ⚠️ Weak Topic
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition font-display leading-snug">
                        {course.name}
                      </h3>
                      <span className="text-[10px] text-zinc-500 font-mono">Primary Subject: {course.subject}</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-900 pt-4 mt-4 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-500 font-medium block">Exam Readiness</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">{course.readiness}%</span>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="text-[10px] text-zinc-500 font-medium block">Next Deadline</span>
                      <span className="text-xs font-bold text-zinc-300">{course.deadline}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        
        // ----------------- INDIVIDUAL COURSE DETAIL VIEW -----------------
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header Area */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#13161E] p-5 rounded-2xl border border-zinc-900">
            <div className="space-y-1.5">
              <button
                onClick={() => setViewMode('list')}
                className="cursor-pointer text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                ← Back to Course Directory
              </button>
              <h2 className="text-xl md:text-2xl font-display font-extrabold text-white">
                {selectedCourse} Workspace
              </h2>
              <div className="flex flex-wrap gap-2.5 items-center pt-1 font-mono text-[10px] text-zinc-400">
                <span>Readiness:</span>
                <span className="text-xs font-bold text-emerald-400">{analytics.examReadiness[selectedCourse] || 50}%</span>
                <span className="text-zinc-800">|</span>
                <span>Next Deadline:</span>
                <span className="text-xs font-bold text-zinc-200">In 3 days</span>
                {activeWeakness && (
                  <>
                    <span className="text-zinc-800">|</span>
                    <span className="text-[9px] font-mono font-bold text-orange-400 animate-pulse bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">Weak Area</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsConceptMapExpanded(true)}
              className="cursor-pointer bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              <GitFork className="w-4 h-4 text-[#14B8A6]" />
              <span>Full Concept Map</span>
            </button>
          </div>

          {/* Sub-tabs Navigation */}
          <div className="bg-[#13161E] p-1 rounded-xl border border-zinc-900 flex flex-wrap gap-1">
            {[
              { id: 'materials', label: 'Uploaded Materials', icon: <FileText className="w-4 h-4" /> },
              { id: 'summaries', label: 'Lecture Summaries', icon: <Volume2 className="w-4 h-4" /> },
              { id: 'flashcards', label: 'Spaced Flashcards', icon: <Brain className="w-4 h-4" /> },
              { id: 'quizzes', label: 'AI Quizzes', icon: <HelpCircle className="w-4 h-4" /> },
              { id: 'notes', label: 'Custom Study Notes', icon: <Clipboard className="w-4 h-4" /> },
              { id: 'discussion', label: 'Q&A Discussion Board', icon: <MessageSquare className="w-4 h-4" /> }
            ].map((tab) => {
              const isActive = detailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setDetailTab(tab.id as any);
                    setExplanationResult(null); // Reset explanation state
                  }}
                  className={`cursor-pointer text-xs font-bold px-4 py-2.5 rounded-lg transition flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-950/40' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Core Multi-tab Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Main Content Area (8-cols) */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* TAB 1: MATERIALS */}
              {detailTab === 'materials' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-900 space-y-4">
                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">Course Syllabus & Handouts</h3>
                    <p className="text-xs text-zinc-400">All lectures, textbooks, and transcripts mapped by syllabus nodes.</p>

                    <div className="space-y-2.5 pt-1">
                      {currentCourseMaterials.length === 0 ? (
                        <div className="text-center p-6 bg-zinc-950/40 rounded-xl border border-zinc-850 text-zinc-500 italic text-xs">
                          No materials uploaded for this course yet. Use the sidebar panel to synthesize initial materials!
                        </div>
                      ) : (
                        currentCourseMaterials.map((mat, idx) => (
                          <div key={mat.id} className="p-3.5 bg-zinc-950/40 border border-zinc-850 rounded-xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-white">{mat.title}</h4>
                                <span className="text-[9px] font-mono text-zinc-500 uppercase">Week {idx + 1} • {mat.type} Handout</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setDetailTab('summaries');
                              }}
                              className="cursor-pointer text-[10px] font-bold text-[#6366F1] bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition"
                            >
                              Syllabus Summary
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Course Handout Upload Form */}
                  <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-900 space-y-4">
                    <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">Upload Course Materials</h3>
                    <form onSubmit={handleFormUpload} className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Lecture Title / Week Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Week 4 Limits workshop"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          className="w-full text-xs p-3 mt-1 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase">Format Type</label>
                          <select
                            value={uploadType}
                            onChange={(e) => setUploadType(e.target.value as any)}
                            className="w-full text-xs p-3 mt-1 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white outline-none cursor-pointer"
                          >
                            <option value="pdf">PDF Text/Handout</option>
                            <option value="slides">Lecture Slides</option>
                            <option value="video">Video Transcript</option>
                            <option value="assignment">Assignment</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase">Course Target</label>
                          <input
                            type="text"
                            disabled
                            value={selectedCourse}
                            className="w-full text-xs p-3 mt-1 rounded-xl border border-zinc-800 bg-zinc-950/30 text-zinc-500 outline-none font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Paste Notes or Transcripts Content</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Paste lecture notes or handouts text..."
                          value={uploadContent}
                          onChange={(e) => setUploadContent(e.target.value)}
                          className="w-full text-xs p-3 mt-1 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white outline-none font-sans"
                        />
                      </div>

                      {uploadError && <div className="text-xs text-rose-400 font-mono">{uploadError}</div>}

                      <button
                        type="submit"
                        disabled={isUploading}
                        className="cursor-pointer w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-teal-950/30"
                      >
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>Extract & Sync with Course</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: SUMMARIES WITH EXPLAIN DIFFERENTLY & TTS */}
              {detailTab === 'summaries' && (
                <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-900 space-y-5 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono text-indigo-400">Lecture Summary & Audio Recap</h3>
                      <p className="text-[11px] text-zinc-400">Spoken audio narration + custom study guide adjustments.</p>
                    </div>

                    <button
                      onClick={playAudioSummary}
                      disabled={isTtsGenerating}
                      className="cursor-pointer text-xs font-bold bg-[#4F46E5]/10 border border-[#4F46E5]/30 hover:bg-[#4F46E5]/20 text-indigo-400 py-2 px-3.5 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                    >
                      {isTtsGenerating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Narrating...
                        </>
                      ) : isPlayingAudio ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                          Pause Recap
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          Listen to Recap
                        </>
                      )}
                    </button>
                  </div>

                  {activeMaterial ? (
                    <div className="space-y-4">
                      <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-900 text-xs text-zinc-300 leading-relaxed space-y-2">
                        <span className="text-[9px] uppercase font-mono text-[#6366F1] font-bold">Auto-Generated Summary</span>
                        <p className="font-sans leading-relaxed">{activeMaterial.summary}</p>
                      </div>

                      {/* Concepts and "Explain differently" button */}
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-white">Highlighted Concept Nodes</h4>
                          
                          {/* Learning style customization selector */}
                          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 p-1.5 rounded-xl">
                            <span className="text-[10px] text-zinc-500 pl-1">Style:</span>
                            <select
                              value={explanationStyle}
                              onChange={(e) => setExplanationStyle(e.target.value as any)}
                              className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-indigo-400 p-1.5 rounded-lg outline-none cursor-pointer"
                            >
                              <option value="visual">Visual Analogy</option>
                              <option value="reading">Text Proof Summary</option>
                              <option value="practice">Case & Calculations</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {activeMaterial.concepts.map((concept, idx) => (
                            <div key={idx} className="p-3.5 bg-zinc-950/40 rounded-xl border border-zinc-900 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-white font-display">💡 {concept.title}</span>
                                <button
                                  onClick={() => explainDifferently(concept.title)}
                                  className="cursor-pointer text-[10px] font-bold text-[#6366F1] bg-[#4F46E5]/15 hover:bg-[#4F46E5]/25 border border-[#4F46E5]/30 px-3 py-1 rounded-lg transition"
                                >
                                  Explain This Differently
                                </button>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{concept.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Gemini Explain Differently Loading / Output Box */}
                      {isExplaining && (
                        <div className="p-4 bg-zinc-950/60 border border-zinc-900 rounded-xl text-center space-y-2 animate-pulse">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mx-auto" />
                          <span className="text-xs text-zinc-400 font-mono block">Recalibrating content model to fit "{explanationStyle}" style...</span>
                        </div>
                      )}

                      {explanationResult && (
                        <div className="p-4.5 bg-indigo-500/5 border border-indigo-500/30 rounded-xl space-y-2 text-xs leading-relaxed animate-in zoom-in-95">
                          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                            <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" /> Customized Personalization Resolved
                            </span>
                            <span className="text-[9px] uppercase font-mono text-zinc-500 font-bold">Style: {explanationStyle}</span>
                          </div>
                          <div className="text-zinc-200 text-[11.5px] prose prose-invert font-sans whitespace-pre-wrap leading-relaxed">
                            {explanationResult}
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="text-center text-xs text-zinc-500 italic p-6">Syllabus analysis is empty.</div>
                  )}
                </div>
              )}

              {/* TAB 3: SPACED FLASHCARDS FOR THIS COURSE */}
              {detailTab === 'flashcards' && (
                <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-900 space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono text-indigo-400">Course Recall Deck</h3>
                  <p className="text-xs text-zinc-400">Review generated flashcards. Difficulty ratings will automatically calibrate active recall intervals.</p>

                  <div className="space-y-2.5 pt-1">
                    {currentCourseFlashcards.length === 0 ? (
                      <div className="text-center p-6 bg-zinc-950/40 rounded-xl border border-zinc-850 text-zinc-500 italic text-xs">
                        No flashcards active for this course. Complete syllabus parsing to initialize cards!
                      </div>
                    ) : (
                      currentCourseFlashcards.map((card) => (
                        <div key={card.id} className="p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-2.5">
                          <div className="flex justify-between items-center font-mono text-[9px]">
                            <span className="text-indigo-400 font-bold">Leitner Box: Level {card.box}</span>
                            <span className={`px-2 py-0.5 rounded-full uppercase ${
                              card.difficulty === 'hard' ? 'bg-rose-500/15 text-rose-400' :
                              card.difficulty === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                              'bg-emerald-500/15 text-emerald-400'
                            }`}>{card.difficulty}</span>
                          </div>
                          <p className="text-xs font-bold text-white">{card.question}</p>
                          <div className="bg-zinc-950 p-2.5 rounded text-[11px] text-zinc-400 font-mono border border-zinc-900">
                            <strong>A:</strong> {card.answer}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: QUIZZES AND PAST ATTEMPTS */}
              {detailTab === 'quizzes' && (
                <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-900 space-y-5 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono text-indigo-400">Quiz Library & History</h3>
                    <p className="text-xs text-zinc-400">Practice questions generated by AI. Difficulty automatically adjusts to historical attempts.</p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Active Quizzes Available</h4>
                    {currentCourseQuizzes.length === 0 ? (
                      <div className="text-center p-6 bg-zinc-950/40 rounded-xl border border-zinc-850 text-zinc-500 italic text-xs">
                        No mock quizzes available. Generate mock paper inside Planner or Quizzes!
                      </div>
                    ) : (
                      currentCourseQuizzes.map((quiz) => (
                        <div key={quiz.id} className="p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#14B8A6]/10 text-[#14B8A6] rounded-lg">
                              <HelpCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white">{quiz.title}</h4>
                              <span className="text-[9px] font-mono text-zinc-500 uppercase">{quiz.questions.length} questions • MCQ Format</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 font-semibold">Auto-adjust active</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Past Attempt History */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Past Attempt Logs</h4>
                    {currentCourseAttempts.length === 0 ? (
                      <div className="p-3 text-[11px] text-zinc-500 italic">No historical submissions recorded for this subject.</div>
                    ) : (
                      currentCourseAttempts.map((attempt) => {
                        const scorePct = Math.round((attempt.score / attempt.total) * 100);
                        return (
                          <div key={attempt.id} className="flex justify-between items-center p-2.5 bg-zinc-950/40 border border-zinc-900 rounded-xl text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-white block">{attempt.quizTitle}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">{new Date(attempt.date).toLocaleString()}</span>
                            </div>
                            <span className={`font-mono font-bold ${scorePct >= 70 ? 'text-emerald-400' : 'text-orange-500'}`}>
                              {attempt.score}/{attempt.total} ({scorePct}%)
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: STUDY NOTES & SIDEBAR CORE CONCEPTS */}
              {detailTab === 'notes' && (
                <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-900 space-y-4 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono text-indigo-400">My Custom Lecture Notes</h3>
                      <p className="text-xs text-zinc-400">Jot down thoughts. The AI will cross-reference terms and highlight important formulas.</p>
                    </div>

                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="cursor-pointer text-xs font-bold bg-indigo-600 text-white py-1.5 px-3.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-950/20"
                    >
                      {isSavingNotes ? 'Saving Notes...' : 'Save Draft'}
                    </button>
                  </div>

                  {saveSuccess && (
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 rounded-xl font-bold font-mono">
                      ✓ Study notes synced to local database file successfully!
                    </div>
                  )}

                  <textarea
                    rows={8}
                    value={studentNotes[selectedCourse] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudentNotes(prev => ({ ...prev, [selectedCourse]: val }));
                    }}
                    placeholder="Type or paste your study notes here..."
                    className="w-full text-xs p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white outline-none font-sans"
                  />
                </div>
              )}

              {/* TAB 6: DISCUSSION THREAD */}
              {detailTab === 'discussion' && (
                <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-900 space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono text-indigo-400">Professor & TA Q&A Feed</h3>
                  <p className="text-xs text-zinc-400">Join discussion channels. TA answers are augmented with direct citations from uploaded slides.</p>

                  <div className="space-y-3 pt-1 max-h-[300px] overflow-y-auto pr-1">
                    {(forumPosts[selectedCourse] || []).map((post, idx) => (
                      <div key={idx} className="p-3.5 bg-zinc-950/40 rounded-xl border border-zinc-900 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{post.author}</span>
                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              post.role === 'Professor' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' :
                              post.role === 'TA' ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20' :
                              'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                            }`}>{post.role}</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-mono">{post.date}</span>
                        </div>
                        <p className="text-zinc-300 leading-relaxed text-[11px] font-sans whitespace-pre-wrap">{post.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add discussion post */}
                  <div className="flex gap-2.5 pt-2 border-t border-zinc-900">
                    <input
                      type="text"
                      placeholder="Ask professor or TA a question..."
                      value={newForumPost}
                      onChange={(e) => setNewForumPost(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePostForum(); }}
                      className="bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none w-full"
                    />
                    <button
                      onClick={handlePostForum}
                      className="p-2.5 bg-indigo-600 text-white hover:bg-indigo-750 transition rounded-xl shrink-0 cursor-pointer shadow-md shadow-indigo-950/20"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Sidebar Column within course (4-cols) */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Box A: Mini Concept Map */}
              <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-900 space-y-3.5">
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <h4 className="text-xs font-bold text-white font-display flex items-center gap-1.5 uppercase tracking-wider font-mono text-[#14B8A6]">
                    <GitFork className="w-4 h-4 text-[#14B8A6]" /> Concept Map
                  </h4>
                  <button
                    onClick={() => setIsConceptMapExpanded(true)}
                    className="cursor-pointer text-[10px] font-bold text-indigo-400 hover:text-indigo-300 font-mono"
                  >
                    Expand
                  </button>
                </div>

                {/* SVG Visual graph container */}
                <div className="bg-zinc-950/60 h-36 rounded-xl border border-zinc-900 flex flex-col items-center justify-center p-3 text-center relative overflow-hidden">
                  <div className="absolute top-1 right-2 text-[8px] font-mono text-zinc-500 font-bold">Interactive Nodes</div>
                  
                  {selectedCourse === 'Calculus' ? (
                    <div className="space-y-3.5">
                      <div className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-mono rounded-lg border border-indigo-500/30 font-bold animate-pulse">
                        Limits & Continuity
                      </div>
                      <div className="flex gap-2 justify-center">
                        <div className="px-2 py-1 bg-zinc-900 text-zinc-400 text-[9px] font-mono rounded border border-zinc-800">
                          Epsilon Proof
                        </div>
                        <div className="px-2 py-1 bg-zinc-900 text-zinc-400 text-[9px] font-mono rounded border border-zinc-800">
                          Derivative Rates
                        </div>
                      </div>
                    </div>
                  ) : selectedCourse === 'Machine Learning' ? (
                    <div className="space-y-3.5">
                      <div className="inline-block px-3 py-1 bg-[#14B8A6]/20 text-[#14B8A6] text-[10px] font-mono rounded-lg border border-[#14B8A6]/30 font-bold animate-pulse">
                        Neurons & Activations
                      </div>
                      <div className="flex gap-2 justify-center">
                        <div className="px-2 py-1 bg-zinc-900 text-zinc-400 text-[9px] font-mono rounded border border-zinc-800">
                          ReLU Function
                        </div>
                        <div className="px-2 py-1 bg-zinc-900 text-zinc-400 text-[9px] font-mono rounded border border-zinc-800">
                          Backprop Chain
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 text-[10px] font-mono rounded-lg border border-purple-500/30 font-bold animate-pulse">
                        Work & Kinetic Energy
                      </div>
                      <div className="flex gap-2 justify-center">
                        <div className="px-2 py-1 bg-zinc-900 text-zinc-400 text-[9px] font-mono rounded border border-zinc-800">
                          Force Vectors
                        </div>
                        <div className="px-2 py-1 bg-zinc-900 text-zinc-400 text-[9px] font-mono rounded border border-zinc-800">
                          Conservative fields
                        </div>
                      </div>
                    </div>
                  )}

                  <span className="text-[8px] text-zinc-500 mt-2 font-mono">Click full view to interact and explore linkages.</span>
                </div>
              </div>

              {/* Box B: Cross-course links */}
              <div className="bg-[#13161E] p-5 rounded-2xl border border-zinc-900 space-y-3.5">
                <h4 className="text-xs font-bold text-white font-display border-b border-zinc-900 pb-2 flex items-center gap-1.5 uppercase tracking-wider font-mono text-indigo-400">
                  <ArrowUpRight className="w-4 h-4 text-indigo-400" /> Cross-Course Relations
                </h4>

                <div className="space-y-2 font-sans">
                  {(CROSS_COURSE_LINKS[selectedCourse] || []).map((link, idx) => (
                    <div key={idx} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between items-center font-mono">
                        <span className="font-bold text-white text-[11px]">{link.target}</span>
                        <span className="text-[9px] text-indigo-400 font-bold">Relates directly</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">{link.reason}</p>
                    </div>
                  ))}
                  {(CROSS_COURSE_LINKS[selectedCourse] || []).length === 0 && (
                    <span className="text-[10px] text-zinc-500 italic block font-mono">No cross-links mapped yet for this subject.</span>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* ---------------- CONCEPT MAP EXPANDED MODAL ---------------- */}
          {isConceptMapExpanded && (
            <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-[#13161E] border border-zinc-800 rounded-3xl w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
                
                <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                      <GitFork className="w-5 h-5 text-[#14B8A6]" /> Academic Concept & Syllabus Map
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Interactive syllabus nodes and their mathematical prerequisites.</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsConceptMapExpanded(false);
                      setSelectedMapNode(null);
                    }}
                    className="cursor-pointer text-xs text-zinc-400 hover:text-white font-mono bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800"
                  >
                    Close Map
                  </button>
                </div>

                {/* Simulated Mindmap flow */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Nodes diagram */}
                  <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-900 flex flex-col justify-center space-y-3 min-h-[220px]">
                    <div className="text-center">
                      <span className="text-[8px] uppercase font-mono text-zinc-500 block mb-1">Root Node</span>
                      <button
                        onClick={() => setSelectedMapNode({ title: 'Limits & Continuity', description: 'The absolute core foundation of calculus, describing behavior of coordinates infinitely close to a target point.' })}
                        className="px-3.5 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/35 hover:bg-indigo-500/35 transition cursor-pointer"
                      >
                        Limits & Continuity
                      </button>
                    </div>

                    <div className="flex justify-between gap-4">
                      <div className="text-center flex-1">
                        <span className="text-[8px] uppercase font-mono text-zinc-500 block mb-1">Sub-concept</span>
                        <button
                          onClick={() => setSelectedMapNode({ title: 'Derivative Slopes', description: 'Instantaneous rate of change representing tangential gradients in spatial dimensions.' })}
                          className="w-full px-3 py-2 rounded-xl bg-teal-500/20 text-teal-300 font-mono text-[11px] font-bold border border-teal-500/35 hover:bg-teal-500/35 transition cursor-pointer"
                        >
                          Derivatives
                        </button>
                      </div>

                      <div className="text-center flex-1">
                        <span className="text-[8px] uppercase font-mono text-zinc-500 block mb-1">Cross-requisite</span>
                        <button
                          onClick={() => setSelectedMapNode({ title: 'Sigmoid / ReLU Nodes', description: 'Mathematical limits defining step barriers inside biological perceptrons.' })}
                          className="w-full px-3 py-2 rounded-xl bg-purple-500/20 text-purple-300 font-mono text-[11px] font-bold border border-purple-500/35 hover:bg-purple-500/35 transition cursor-pointer"
                        >
                          Activations
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detail Panel */}
                  <div className="bg-zinc-950/40 p-4.5 rounded-2xl border border-zinc-900 flex flex-col justify-between min-h-[220px]">
                    {selectedMapNode ? (
                      <div className="space-y-2.5 animate-in fade-in">
                        <span className="text-[9px] font-mono uppercase bg-[#14B8A6]/20 text-[#14B8A6] px-2 py-0.5 rounded border border-[#14B8A6]/30">Active Node Selected</span>
                        <h4 className="text-xs font-bold text-white font-display">{selectedMapNode.title}</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{selectedMapNode.description}</p>
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 text-xs italic m-auto font-sans">
                        Click on any node in the left diagram to view detailed syllabus links and prerequisite descriptions.
                      </div>
                    )}

                    <div className="text-[9px] font-mono text-zinc-500 border-t border-zinc-900 pt-3">
                      🔗 Connected to Stanford CS229 standard academic map nodes.
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
