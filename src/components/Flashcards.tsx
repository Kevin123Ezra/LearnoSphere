import React, { useState } from 'react';
import { 
  HelpCircle, 
  RefreshCcw, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  Download,
  FileText,
  Inbox,
  Award,
  Filter,
  Check
} from 'lucide-react';
import { DBState, Flashcard } from '../types';

interface FlashcardsProps {
  dbState: DBState;
  onCardReviewed: (updatedCard: Flashcard) => void;
}

export default function Flashcards({ dbState, onCardReviewed }: FlashcardsProps) {
  const { flashcards } = dbState;
  const [activeTab, setActiveTab] = useState<'study' | 'all'>('study');
  
  // Study session states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  
  // Filters for All Cards
  const [materialFilter, setMaterialFilter] = useState('all');
  const [weaknessOnlyFilter, setWeaknessOnlyFilter] = useState(false);
  const [tagFilter, setTagFilter] = useState('all');

  // Leitner Boxes stats calculation
  const box1Count = flashcards.filter(c => c.box === 1).length;
  const box2Count = flashcards.filter(c => c.box === 2).length;
  const box3Count = flashcards.filter(c => c.box === 3 || c.box === undefined).length;
  const adaptiveWeaknessCount = flashcards.filter(c => c.isWeaknessCard).length;

  // Find cards due today or due now
  const dueCards = flashcards.filter(c => {
    // If we're filtering due cards specifically, we filter by box 1 or outdated review dates
    return new Date(c.nextReviewDate).getTime() <= Date.now() || c.box === 1;
  });

  const handleReview = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (dueCards.length === 0) return;
    const currentCard = dueCards[currentIndex];

    // Map new rating schema to backend standard endpoints
    // 'again' resets box to 1
    // 'hard' resets box to 1 or keeps
    // 'good' promotes
    // 'easy' promotes
    let backendRating: 'easy' | 'medium' | 'hard' = 'medium';
    if (rating === 'again') backendRating = 'hard'; // reset/hard treatment
    if (rating === 'hard') backendRating = 'hard';
    if (rating === 'good') backendRating = 'medium';
    if (rating === 'easy') backendRating = 'easy';

    try {
      const res = await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: currentCard.id, rating: backendRating })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onCardReviewed(data.updatedCard);

      // Advance to next card or complete
      if (currentIndex < dueCards.length - 1) {
        setIsFlipped(false);
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, 150);
      } else {
        setSessionCompleted(true);
      }

    } catch (e) {
      console.error('Error recording flashcard review', e);
      // Fallback local support
      const simulatedUpdatedCard = { ...currentCard };
      if (rating === 'again') simulatedUpdatedCard.box = 1;
      else if (rating === 'easy') simulatedUpdatedCard.box = Math.min((currentCard.box || 1) + 1, 5);
      
      onCardReviewed(simulatedUpdatedCard);
      
      if (currentIndex < dueCards.length - 1) {
        setIsFlipped(false);
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, 150);
      } else {
        setSessionCompleted(true);
      }
    }
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
  };

  // List of unique materials for filtering
  const uniqueMaterials = Array.from(new Set(flashcards.map(c => c.materialTitle)));

  // Filtered Cards list
  const filteredCards = flashcards.filter(c => {
    if (materialFilter !== 'all' && c.materialTitle !== materialFilter) return false;
    if (weaknessOnlyFilter && !c.isWeaknessCard) return false;
    
    // Tag filter (simulate logic: e.g. 'Theory' if card length is > 50, otherwise 'Formula')
    if (tagFilter !== 'all') {
      const isFormula = c.question.toLowerCase().includes('formula') || c.question.toLowerCase().includes('equation') || c.question.toLowerCase().includes('calculate');
      if (tagFilter === 'Formula' && !isFormula) return false;
      if (tagFilter === 'Theory' && isFormula) return false;
    }
    return true;
  });

  // Export to Anki TXT (tab-separated standard file)
  const exportToAnki = () => {
    if (flashcards.length === 0) return;
    const headers = "#separator:tab\n#html:true\n#tags:learnsphere flashcards\n";
    const rows = flashcards.map(c => `${c.question}\t${c.answer}`).join("\n");
    const content = headers + rows;
    
    const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "learnsphere-anki-deck.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Print-Friendly HTML (which easily exports or prints as PDF)
  const exportToPDF = () => {
    if (flashcards.length === 0) return;
    
    let htmlContent = `
      <html>
      <head>
        <title>LearnSphere Study Guide PDF Export</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111827; }
          h1 { border-bottom: 2px solid #4F46E5; padding-bottom: 10px; color: #1F2937; }
          .card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
          .question { font-weight: bold; color: #4F46E5; font-size: 14px; margin-bottom: 8px; }
          .answer { color: #4B5563; font-size: 13px; line-height: 1.5; }
          .meta { font-size: 11px; color: #9CA3AF; margin-top: 10px; font-family: monospace; }
        </style>
      </head>
      <body>
        <h1>LearnSphere Active Recall Flashcards Guide</h1>
        <p>Total Study Deck Size: ${flashcards.length} cards</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
        <div style="margin-top: 30px;">
    `;

    flashcards.forEach((c, idx) => {
      htmlContent += `
        <div class="card">
          <div class="question">Q [${idx + 1}]: ${c.question}</div>
          <div class="answer">Answer: ${c.answer}</div>
          <div class="meta">Subject: ${c.materialTitle} • Leitner Box: Level ${c.box || 1} ${c.isWeaknessCard ? '• (Weakness topic)' : ''}</div>
        </div>
      `;
    });

    htmlContent += `
        </div>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      win.print();
    } else {
      alert("Popup blocked! Please allow popups to view the print-optimized PDF study guide.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sub navigation header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-800 pb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Active Recall & Leitner Flashcards</h2>
          <p className="text-xs text-zinc-400">Spaced repetition optimizes cognitive consolidation</p>
        </div>
        
        <div className="flex gap-2 bg-zinc-900/60 border border-zinc-800/80 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('study');
              restartSession();
            }}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'study' ? 'bg-[#4F46E5]/10 text-[#6366F1] font-bold border border-[#4F46E5]/20' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Study Due ({dueCards.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'all' ? 'bg-[#4F46E5]/10 text-[#6366F1] font-bold border border-[#4F46E5]/20' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Flashcards ({flashcards.length})
          </button>
        </div>
      </div>

      {/* Spaced Repetition Leitner Progress Bar Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1D23] p-4 rounded-xl border border-[#2A2E37] shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold text-rose-400">Box 1 (Daily Review)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white font-display">{box1Count}</span>
            <span className="text-[10px] text-zinc-500 font-mono">cards</span>
          </div>
        </div>
        <div className="bg-[#1A1D23] p-4 rounded-xl border border-[#2A2E37] shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold text-amber-400">Box 2 (3 Days)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white font-display">{box2Count}</span>
            <span className="text-[10px] text-zinc-500 font-mono">cards</span>
          </div>
        </div>
        <div className="bg-[#1A1D23] p-4 rounded-xl border border-[#2A2E37] shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold text-indigo-400">Box 3 (7 Days)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white font-display">{box3Count}</span>
            <span className="text-[10px] text-zinc-500 font-mono">cards</span>
          </div>
        </div>
        <div className="bg-[#1A1D23] p-4 rounded-xl border border-[#2A2E37] shadow-sm space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold text-rose-400 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-rose-400" /> Weakness Deck
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-rose-400 font-display">{adaptiveWeaknessCount}</span>
            <span className="text-[10px] text-rose-500 font-mono">flagged</span>
          </div>
        </div>
      </div>

      {activeTab === 'study' ? (
        <div className="max-w-xl mx-auto space-y-6 py-2">
          {dueCards.length > 0 && !sessionCompleted ? (
            <div className="space-y-6">
              
              {/* Phone-styled Progress Capsule (Exactly as shown in Screenshot 3) */}
              <div className="bg-[#13161E] border border-zinc-800/80 p-5 rounded-2xl shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-mono font-semibold">
                  <span>Today's Progress: <strong className="text-white font-bold">{currentIndex} / {dueCards.length}</strong> Cards</span>
                  <span className="text-indigo-400 font-bold">{Math.round((currentIndex / dueCards.length) * 100)}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-zinc-950/60 h-2.5 rounded-full border border-zinc-900 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(currentIndex / dueCards.length) * 100 || 5}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-mono">Curriculum Node:</span>
                  <span className="text-[10px] text-zinc-300 font-bold font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                    {dueCards[currentIndex].materialTitle}
                  </span>
                </div>
              </div>

              {/* Interactive 3D Card Stage */}
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className="perspective-1000 h-[290px] w-full cursor-pointer relative"
              >
                <div className={`w-full h-full duration-500 transform-style-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}>
                  
                  {/* Front Side (Matches visual mockup layout) */}
                  <div className="absolute w-full h-full bg-[#13161E] border-2 border-zinc-800/80 rounded-2xl shadow-2xl p-6 flex flex-col justify-between backface-hidden">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-wider">
                        Subject: {dueCards[currentIndex].materialTitle.split(':')[0]} (Level {dueCards[currentIndex].box || 1})
                      </span>
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase">
                        Active Recall
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center my-4 space-y-2">
                      <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Query Target</span>
                      <p className="text-sm sm:text-base font-extrabold font-display text-white leading-relaxed px-2">
                        {dueCards[currentIndex].question}
                      </p>
                    </div>

                    <div className="text-center text-[10px] text-zinc-500 flex items-center justify-center gap-1.5 font-mono tracking-tight font-bold">
                      <RefreshCcw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> Click or tap card to flip & reveal key
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="absolute w-full h-full bg-[#0A0C10] text-white border-2 border-zinc-800/80 rounded-2xl shadow-2xl p-6 flex flex-col justify-between backface-hidden rotate-y-180">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#A855F7] font-mono font-bold tracking-wider">
                        BACK • ANSWER EXPLANATION
                      </span>
                      <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase">
                        Syllabus Key
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center overflow-y-auto my-3 pr-1">
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed px-4 whitespace-pre-line font-sans font-medium">
                        {dueCards[currentIndex].answer}
                      </p>
                    </div>

                    <div className="text-center text-[10px] text-zinc-500 font-mono font-bold tracking-tight">
                      Grade accuracy bounds using recall rating controls below
                    </div>
                  </div>

                </div>
              </div>

              {/* Quality Rating Control Buttons (Exactly matching Leitner Flashcards controls in Screenshot 3) */}
              <div className="space-y-3">
                {isFlipped ? (
                  <div className="grid grid-cols-4 gap-2.5">
                    
                    {/* Again Button (Red) */}
                    <button
                      onClick={() => handleReview('again')}
                      className="cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 p-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-0.5"
                    >
                      <span className="flex items-center gap-1">
                        <span className="text-[11px]">⚠️</span> Again
                      </span>
                      <span className="text-[9px] text-rose-500/60 font-mono font-semibold">&lt; 1 min</span>
                    </button>

                    {/* Hard Button (Orange) */}
                    <button
                      onClick={() => handleReview('hard')}
                      className="cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 p-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-0.5"
                    >
                      <span className="flex items-center gap-1">
                        <span className="text-[11px]">◆</span> Hard
                      </span>
                      <span className="text-[9px] text-amber-500/60 font-mono font-semibold">&lt; 10 min</span>
                    </button>

                    {/* Good Button (Blue) */}
                    <button
                      onClick={() => handleReview('good')}
                      className="cursor-pointer bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 p-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-0.5"
                    >
                      <span className="flex items-center gap-1">
                        <span className="text-[11px]">👍</span> Good
                      </span>
                      <span className="text-[9px] text-indigo-400/60 font-mono font-semibold">1 Day</span>
                    </button>

                    {/* Easy Button (Green) */}
                    <button
                      onClick={() => handleReview('easy')}
                      className="cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 p-3 rounded-xl text-xs font-bold transition flex flex-col items-center gap-0.5"
                    >
                      <span className="flex items-center gap-1">
                        <span className="text-[11px]">★</span> Easy
                      </span>
                      <span className="text-[9px] text-emerald-500/60 font-mono font-semibold">4 Days</span>
                    </button>

                  </div>
                ) : (
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="w-full text-xs font-bold bg-[#13161E] border border-zinc-800/80 hover:bg-zinc-800/40 text-white p-4 rounded-xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer font-mono uppercase tracking-wider"
                  >
                    Tap to Show Answer <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          ) : sessionCompleted ? (
            <div className="bg-[#1A1D23] border border-[#2A2E37] p-8 rounded-2xl text-center space-y-4 shadow-xl">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-display">Daily Active Recall Completed!</h3>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                  Splendid work! You have cleared all pending active cards scheduled for Leitner promotion. Memory pathways consolidated.
                </p>
              </div>
              <button
                onClick={restartSession}
                className="text-xs font-semibold border border-zinc-700 bg-transparent hover:bg-zinc-800/30 text-zinc-300 px-4 py-2 rounded-lg transition cursor-pointer"
              >
                Re-Study Cards
              </button>
            </div>
          ) : (
            <div className="bg-[#1A1D23] border border-[#2A2E37] p-10 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-zinc-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">No Flashcards Due For Review</h3>
                <p className="text-xs text-zinc-400">Your spaced-repetition deck is completely clear right now. Good job!</p>
              </div>
              <button
                onClick={() => setActiveTab('all')}
                className="text-xs font-semibold bg-transparent border border-zinc-700 hover:bg-zinc-800/30 text-zinc-300 px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
              >
                Browse All Cards
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Browse All Mode with Advanced Filters & Multi-Exporters */
        <div className="space-y-4">
          
          {/* Controls with advanced filters & exporters */}
          <div className="flex flex-col xl:flex-row justify-between xl:items-center bg-[#1A1D23] p-4 rounded-xl border border-[#2A2E37] shadow-sm gap-4">
            
            {/* Filter group */}
            <div className="flex flex-wrap gap-4 items-center">
              
              <div className="flex gap-2 items-center">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Course:</span>
                <select
                  value={materialFilter}
                  onChange={(e) => setMaterialFilter(e.target.value)}
                  className="text-xs bg-[#121419] border border-[#2A2E37] p-2 rounded-lg outline-none text-zinc-200"
                >
                  <option value="all">Show All Courses</option>
                  {uniqueMaterials.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 items-center">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Type:</span>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="text-xs bg-[#121419] border border-[#2A2E37] p-2 rounded-lg outline-none text-zinc-200"
                >
                  <option value="all">All Cognitive Tags</option>
                  <option value="Theory">Theory & Proofs</option>
                  <option value="Formula">Formulas & Drills</option>
                </select>
              </div>

              {/* Weakness flag filter toggle */}
              <button
                onClick={() => setWeaknessOnlyFilter(!weaknessOnlyFilter)}
                className={`text-[11px] font-semibold px-3 py-2 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                  weaknessOnlyFilter 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-bold' 
                    : 'bg-[#121419] border-[#2A2E37] text-zinc-400'
                }`}
              >
                {weaknessOnlyFilter && <Check className="w-3.5 h-3.5" />}
                <span>⚠️ Weaknesses Only</span>
              </button>

            </div>

            {/* Anki and Markdown cheat sheet exporters */}
            <div className="flex gap-2 self-end xl:self-auto shrink-0">
              <button
                onClick={exportToAnki}
                className="text-xs font-bold border border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800/30 px-3 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                title="Export cards to a tab-separated file for native Anki Desktop/Mobile import"
              >
                <Download className="w-3.5 h-3.5" /> Export Anki (TXT)
              </button>
              
              <button
                onClick={exportToPDF}
                className="text-xs font-bold bg-[#4F46E5] text-white hover:bg-[#4338CA] px-3 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                title="Generate a print-optimized, saveable study guide PDF"
              >
                <FileText className="w-3.5 h-3.5" /> Export PDF Guide
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map((card) => {
              const isFormula = card.question.toLowerCase().includes('formula') || card.question.toLowerCase().includes('equation') || card.question.toLowerCase().includes('calculate');
              return (
                <div 
                  key={card.id} 
                  className="bg-[#1A1D23] border border-[#2A2E37] rounded-xl p-4 shadow-sm hover:border-[#4F46E5]/40 transition flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-[#121419] text-zinc-400 border border-[#2A2E37] font-mono capitalize font-bold">
                        Leitner Box {card.box || 1}
                      </span>
                      <div className="flex gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-zinc-900 text-[#14B8A6] border border-[#2A2E37] font-mono font-bold">
                          {isFormula ? 'Formula' : 'Theory'}
                        </span>
                        {card.isWeaknessCard && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-amber-500/10 text-amber-400 border border-amber-900/30 font-mono font-bold">
                            ⚠️ Weakness
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
                        {card.materialTitle}
                      </h5>
                      <p className="text-xs font-bold text-white leading-relaxed">
                        {card.question}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#121419] border border-[#2A2E37]/80 p-3 rounded-lg text-xs text-zinc-300">
                    <strong className="text-zinc-400 block text-[10px] uppercase font-mono tracking-wider font-bold mb-1">Answer key:</strong>
                    {card.answer}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
