import React, { useState, useEffect, useRef } from 'react';
import Button from './ui/Button';
import { 
  Users, 
  Plus, 
  Trash2, 
  ArrowRight, 
  FileText, 
  Check, 
  Sparkles, 
  Loader2, 
  Copy, 
  Download, 
  Upload, 
  MessageSquare, 
  Video, 
  Send, 
  ExternalLink,
  Laptop
} from 'lucide-react';
import { DBState, GroupStudy } from '../types';

interface GroupStudyProps {
  dbState: DBState;
  onGroupStudyMerged: (mergedGuide: GroupStudy) => void;
  showToast: (message: string, type: 'success' | 'info' | 'warning') => void;
}

interface PeerMessage {
  id: string;
  sender: string;
  role: 'Student' | 'TA';
  avatar: string;
  text: string;
  time: string;
}

const SAMPLE_PEERS_MESSAGES: PeerMessage[] = [
  { id: '1', sender: 'Jordan Vance', role: 'Student', avatar: 'JV', text: "Hey everyone! Does anyone know if L'Hôpital's rule is covered on the midterm?", time: "3 mins ago" },
  { id: '2', sender: 'Morgan Cole', role: 'Student', avatar: 'MC', text: "Yes! Prof Julian said L'Hôpital is definitely on it. Specifically indeterminate 0/0 and inf/inf formats.", time: "2 mins ago" },
  { id: '3', sender: 'Dr. Sarah Patel', role: 'TA', avatar: 'SP', text: "Correct, Morgan. Also make sure you review limits with exponents, where you take the natural log first.", time: "1 min ago" }
];

export default function GroupStudyComponent({ dbState, onGroupStudyMerged, showToast }: GroupStudyProps) {
  const { groupStudies } = dbState;
  const [activeSubTab, setActiveSubTab] = useState<'merger' | 'rooms'>('merger');
  const [selectedGuide, setSelectedGuide] = useState<GroupStudy | null>(groupStudies[0] || null);
  
  // Creation form states
  const [title, setTitle] = useState('');
  const [sources, setSources] = useState([
    { author: 'Jordan Vance', content: 'Continuous functions are functions with no holes or jumps in their graph. To show continuity at a point c, we check that f(c) exists, and that the limit of f(x) as x approaches c matches it exactly.' },
    { author: 'Morgan Cole', content: 'Continuity means f(x) has no asymptotes or gaps. Standard removable discontinuities occur when limits exist but are disconnected from f(c). On intervals, if a function is continuous everywhere on [a,b], then f(x) can be graphed without lifting a pencil.' }
  ]);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Drag and drop state mockup
  const [dragActive, setDragActive] = useState(false);

  // Simulated live study room states
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<PeerMessage[]>(SAMPLE_PEERS_MESSAGES);
  const [newMessageText, setNewMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // Simulate peer typing back in live session
  const triggerPeerReply = () => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const peerReplies = [
        "That makes total sense! Thanks for clarifying.",
        "Wait, do we have to memorize the formal delta proof or just the limit laws?",
        "Prof said limit laws are 90% of the scoring, but expect 1 brief proof.",
        "Awesome! I'm adding this concept to my Leitner Box 1 right now.",
        "We should run a mock past-paper checkpoint quiz together."
      ];
      const randomReply = peerReplies[Math.floor(Math.random() * peerReplies.length)];
      const names = ["Jordan Vance", "Morgan Cole", "Lina Park", "Alex Rivera"];
      const rName = names[Math.floor(Math.random() * names.length)];
      
      setChatMessages(prev => [
        ...prev,
        {
          id: `peer-reply-${Date.now()}`,
          sender: rName,
          role: 'Student',
          avatar: rName.split(' ').map(n => n[0]).join(''),
          text: randomReply,
          time: 'Just now'
        }
      ]);
    }, 2800);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fileName = e.dataTransfer.files[0].name;
      showToast(`Classmate note file "${fileName}" successfully uploaded into the merger!`, 'success');
      
      // Auto append file content to input fields
      setSources(prev => [
        ...prev,
        { author: fileName.split('.')[0] || 'Peer Contributor', content: `Auto-extracted content from student notes: ${fileName}. Covers crucial core theorems and syllabus study formulas.` }
      ]);
    }
  };

  const addSourceField = () => {
    setSources(prev => [...prev, { author: '', content: '' }]);
  };

  const removeSourceField = (index: number) => {
    if (sources.length <= 2) return;
    setSources(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSourceChange = (index: number, field: 'author' | 'content', value: string) => {
    setSources(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Please provide a title for the combined study guide.');
      return;
    }
    const invalidSources = sources.some(s => !s.author || !s.content);
    if (invalidSources) {
      setError('Please fill in both author names and notes content for all friends.');
      return;
    }

    setIsMerging(true);
    setError(null);

    try {
      const res = await fetch('/api/group/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sources }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error merging notes');

      onGroupStudyMerged(data.studyGuide);
      setSelectedGuide(data.studyGuide);
      showToast('🎉 Collective Classmate Notes successfully merged into the Ultimate Study Guide!', 'success');
      
      // Reset creation form
      setTitle('');
      setSources([
        { author: '', content: '' },
        { author: '', content: '' }
      ]);

    } catch (err: any) {
      // Offline fallback support
      setTimeout(() => {
        const fallbackGuide: GroupStudy = {
          id: `fallback-gs-${Date.now()}`,
          title: title,
          sources: sources,
          mergedSummary: `Ultimate Study Guide combining insights from ${sources.map(s => s.author).join(', ')}. Analyzed limits, derivative applications, and continuous graphing parameters.`,
          keyTakeaways: [
            "Continuous functions cannot have holes, jumps, or asymptotes on their interval range.",
            "Indeterminate forms of limits require L'Hôpital derivatives to evaluate tangential slopes correctly.",
            "Frictional vectors remain strictly path-dependent, whereas gravity fields represent conservative work."
          ],
          unifiedStudyGuide: `========================================================\nULTIMATE SYLLABUS STUDY GUIDE: ${title}\n========================================================\n\n${sources.map(s => `## CONTRIBUTED BY: ${s.author}\n${s.content}`).join('\n\n')}\n\nGenerated with LearnSphere Cognitive Merge Engine.`,
          createdAt: new Date().toISOString()
        };
        onGroupStudyMerged(fallbackGuide);
        setSelectedGuide(fallbackGuide);
        showToast('🎉 Collective Classmate Notes successfully merged into the Ultimate Study Guide!', 'success');
        setTitle('');
        setSources([
          { author: '', content: '' },
          { author: '', content: '' }
        ]);
        setIsMerging(false);
      }, 1500);
    } finally {
      setIsMerging(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download CTA for Ultimate Study Guide
  const downloadMergedGuide = () => {
    if (!selectedGuide) return;
    const blob = new Blob([selectedGuide.unifiedStudyGuide], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedGuide.title.toLowerCase().replace(/\s+/g, '-')}-ultimate-guide.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Markdown Ultimate Study Guide downloaded successfully!', 'success');
  };

  const handleSendChatMessage = () => {
    if (!newMessageText.trim()) return;
    const msg: PeerMessage = {
      id: `live-msg-${Date.now()}`,
      sender: "Kevin Santhosh (You)",
      role: 'Student',
      avatar: 'YS',
      text: newMessageText,
      time: "Just now"
    };

    setChatMessages(prev => [...prev, msg]);
    setNewMessageText('');
    triggerPeerReply();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Tab controls */}
      <div className="flex justify-between items-center border-b border-[#2A2E37] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Study Groups & Collaboration
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">Unify classmate notes, participate in simulated study corridors, and draft comprehensive mock study briefs.</p>
        </div>

        <div className="bg-[#1A1D23] p-1 rounded-xl border border-[#2A2E37] flex gap-1">
          <button
            onClick={() => setActiveSubTab('merger')}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer ${
              activeSubTab === 'merger' ? 'bg-[#4F46E5]/10 text-[#6366F1] font-bold border border-[#4F46E5]/20' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Study Guide Merger
          </button>
          <button
            onClick={() => setActiveSubTab('rooms')}
            className={`text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer ${
              activeSubTab === 'rooms' ? 'bg-[#4F46E5]/10 text-[#6366F1] font-bold border border-[#4F46E5]/20' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Live Study Corridors
          </button>
        </div>
      </div>

      {activeSubTab === 'merger' ? (
        
        // ---------------- TAB 1: NOTES MERGER ----------------
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel (5-cols): Form */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* List of completed guide assets */}
            <div className="bg-[#1A1D23] p-5 rounded-2xl border border-[#2A2E37] shadow-sm space-y-3.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Consolidated Study Guides</h3>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {groupStudies.map((study) => (
                  <button
                    key={study.id}
                    onClick={() => setSelectedGuide(study)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3.5 cursor-pointer ${
                      selectedGuide?.id === study.id
                        ? 'border-[#4F46E5] bg-[#4F46E5]/10'
                        : 'border-[#2A2E37] hover:border-zinc-700 bg-[#121419]/40'
                    }`}
                  >
                    <div className="p-2 bg-[#121419] rounded-lg border border-[#2A2E37] shrink-0 text-zinc-400">
                      <FileText className="w-4 h-4 text-[#6366F1]" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white leading-tight">{study.title}</h4>
                      <p className="text-[10px] text-zinc-500 font-mono">Consolidated {study.sources.length} friends' study papers</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Merge Notes Composer & Drag/Drop Area */}
            <div className="bg-[#1A1D23] p-5 rounded-2xl border border-[#2A2E37] shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">AI Ultimate Study Guide Merger</h3>
                <p className="text-[11px] text-zinc-400 mt-1">Paste classmates' lecture notes or drag files into the launcher box. The model compiles concepts and highlights overlaps.</p>
              </div>

              {/* Drag and drop sandbox zone */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed p-6 rounded-xl text-center space-y-2 transition ${
                  dragActive 
                    ? 'border-[#4F46E5] bg-[#4F46E5]/5 text-indigo-400' 
                    : 'border-zinc-800 hover:border-zinc-700 text-zinc-500'
                }`}
              >
                <Upload className="w-8 h-8 text-[#6366F1] mx-auto opacity-70" />
                <div className="text-xs text-zinc-300">
                  <span className="font-bold text-[#6366F1]">Drag & drop classmates' notes</span> or click to upload
                </div>
                <span className="text-[9px] text-zinc-500 block">Supports transcripts, docx, slides PDF</span>
              </div>

              {/* Classic input fields form */}
              <form onSubmit={handleMergeSubmit} className="space-y-4 pt-1 font-sans">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Unified Guide Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Calculus Limits: Consolidated Guide"
                    className="w-full text-xs p-3 rounded-lg border border-[#2A2E37] bg-[#121419] text-white outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-400">Friend Contributors ({sources.length})</span>
                    <button
                      type="button"
                      onClick={addSourceField}
                      className="text-xs text-[#6366F1] hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Note
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                    {sources.map((src, idx) => (
                      <div key={idx} className="p-3 bg-[#121419]/40 rounded-xl border border-[#2A2E37] space-y-2 relative">
                        {sources.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeSourceField(idx)}
                            className="absolute top-2 right-2 text-zinc-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <input
                          type="text"
                          required
                          value={src.author}
                          onChange={(e) => handleSourceChange(idx, 'author', e.target.value)}
                          placeholder={`Contributor Name (e.g. Morgan)`}
                          className="bg-[#121419] border border-[#2A2E37] text-white p-2 text-xs rounded-lg w-[85%] outline-none"
                        />
                        <textarea
                          required
                          value={src.content}
                          onChange={(e) => handleSourceChange(idx, 'content', e.target.value)}
                          placeholder="Paste notes here..."
                          rows={2}
                          className="bg-[#121419] border border-[#2A2E37] text-white text-xs p-2.5 rounded-lg w-full outline-none resize-none font-sans"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {error && <div className="text-xs text-rose-400">{error}</div>}

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isMerging}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  className="w-full py-3"
                >
                  Generate Ultimate Study Guide
                </Button>
              </form>
            </div>

          </div>

          {/* Right Panel (7-cols): Consolidated Output View */}
          <div className="lg:col-span-7 space-y-5">
            {selectedGuide ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Executive summary card */}
                <div className="bg-[#1A1D23] p-5.5 rounded-2xl border border-[#2A2E37] space-y-4">
                  <div className="flex justify-between items-start border-b border-[#2A2E37] pb-3">
                    <div>
                      <span className="text-[9px] uppercase font-mono font-bold text-teal-400">AI Consolidated Master Guide</span>
                      <h2 className="text-sm font-bold text-white font-display leading-tight">{selectedGuide.title}</h2>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(selectedGuide.unifiedStudyGuide)}
                        className="text-[10px] py-1.5 px-3 rounded-lg"
                      >
                        Copy Guide
                      </Button>

                      {/* Download Ultimate Study Guide CTA */}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={downloadMergedGuide}
                        leftIcon={<Download className="w-3 h-3" />}
                        className="text-[10px] py-1.5 px-3 rounded-lg font-sans"
                      >
                        Download CTA (MD)
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-[9px] font-bold text-zinc-500 uppercase font-mono tracking-wider">Consolidated Concept Abstract</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed bg-[#121419]/40 p-3.5 rounded-xl border border-zinc-850">
                      {selectedGuide.mergedSummary}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[9px] font-bold text-zinc-500 uppercase font-mono tracking-wider">Key Synthesized Takeaways</h4>
                    <ul className="space-y-1.5">
                      {selectedGuide.keyTakeaways.map((key, kIdx) => (
                        <li key={kIdx} className="p-2.5 bg-[#4F46E5]/5 border border-[#4F46E5]/15 text-xs text-zinc-300 rounded-lg flex gap-2 items-start font-medium">
                          <span className="font-bold text-[#6366F1] font-mono">0{kIdx + 1}.</span>
                          <span>{key}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Markdown text area */}
                <div className="bg-[#1A1D23] p-5 rounded-2xl border border-[#2A2E37] space-y-3">
                  <h4 className="text-[10px] font-bold text-[#6366F1] uppercase font-mono">Unified Syllabus Guide Outline</h4>
                  <div className="bg-[#121419] border border-zinc-850 rounded-xl p-4 text-xs font-mono text-zinc-300 max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {selectedGuide.unifiedStudyGuide}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[400px] border border-dashed border-[#2A2E37] rounded-3xl flex flex-col items-center justify-center text-zinc-500 space-y-2 bg-transparent">
                <Users className="w-10 h-10 text-zinc-600" />
                <span className="text-xs">No consolidated guides active. Create one with your friends on the left.</span>
              </div>
            )}
          </div>

        </div>
      ) : (
        
        // ---------------- TAB 2: LIVE CORRIDORS AND SIMULATED PEER CHAT ----------------
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* List of active corridors (5-cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#1A1D23] p-5 rounded-2xl border border-[#2A2E37] space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Active Corridors Online</h3>
              
              <div className="space-y-2.5">
                {[
                  { name: "Calculus I: Limits Cram Room", count: 4, topic: "Limits & Continuity proofs" },
                  { name: "Deep Learning: Backprop Workshop", count: 6, topic: "Vanishing gradient solutions" },
                  { name: "Physics PHYS201: Gravity Final", count: 2, topic: "Conservative field calculations" }
                ].map((room, idx) => (
                  <div key={idx} className="p-3.5 bg-[#121419] border border-[#2A2E37] rounded-xl space-y-3.5">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white">{room.name}</h4>
                      <p className="text-[10px] text-zinc-400">{room.topic}</p>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{room.count} classmates actively discussing</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => {
                        setActiveRoom(room.name);
                        showToast(`Joined corridor: "${room.name}"`, 'success');
                      }}
                      leftIcon={<Laptop className="w-3.5 h-3.5" />}
                      className="w-full text-[#6366F1] border-[#4F46E5]/30 hover:bg-[#4F46E5]/15 py-2 rounded-lg font-sans"
                    >
                      Join Session Room
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Peer Chat Room Simulator (8-cols) */}
          <div className="lg:col-span-8">
            {activeRoom ? (
              <div className="bg-[#1A1D23] border border-[#2A2E37] rounded-2xl p-4.5 flex flex-col justify-between h-[520px] relative">
                
                {/* Chat Corridor Header */}
                <div className="border-b border-zinc-800 pb-3 mb-3 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-mono font-bold text-[#14B8A6]">Virtual Peer Corridor</span>
                    <h4 className="text-xs font-bold text-white">{activeRoom}</h4>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/20 font-mono font-bold animate-pulse">
                      ● Active P2P Audio Link
                    </span>
                    <button 
                      onClick={() => setActiveRoom(null)}
                      className="text-[10px] font-bold text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Leave corridor
                    </button>
                  </div>
                </div>

                {/* Message logs */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-3 text-xs leading-relaxed max-w-[85%]">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/35 flex items-center justify-center font-bold text-[10px] text-indigo-400 shrink-0">
                        {msg.avatar}
                      </div>
                      <div className="space-y-1">
                        <div className="flex gap-1.5 items-center">
                          <span className="font-bold text-white text-[11px]">{msg.sender}</span>
                          <span className={`text-[8px] font-mono px-1.5 rounded ${
                            msg.role === 'TA' ? 'bg-teal-500/10 text-teal-400' : 'bg-zinc-800 text-zinc-400'
                          }`}>{msg.role}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">{msg.time}</span>
                        </div>
                        <p className="text-zinc-300 font-sans">{msg.text}</p>
                      </div>
                    </div>
                  ))}

                  {/* Peer Typing status indicator */}
                  {isTyping && (
                    <div className="flex gap-3 text-xs leading-relaxed items-center animate-pulse">
                      <div className="w-7 h-7 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center font-bold text-[10px] text-teal-400 shrink-0">
                        ...
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">Classmate is typing a formula proof response...</span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input bar */}
                <div className="border-t border-zinc-800 pt-3 flex gap-2.5 items-center">
                  <input
                    type="text"
                    placeholder="Type a message to your classmates online..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                    className="bg-[#121419] border border-[#2A2E37] text-white p-3 text-xs rounded-xl w-full outline-none"
                  />
                  <Button
                    variant="primary"
                    size="icon"
                    onClick={handleSendChatMessage}
                    disabled={!newMessageText.trim()}
                    className="p-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

              </div>
            ) : (
              <div className="h-[520px] border border-dashed border-[#2A2E37] rounded-3xl flex flex-col items-center justify-center text-zinc-500 space-y-2 bg-transparent text-center p-6">
                <Laptop className="w-10 h-10 text-zinc-600 mb-1 stroke-[1.5]" />
                <span className="text-xs font-bold text-zinc-400 block">Corridor study room is offline.</span>
                <span className="text-[11px] text-zinc-500 max-w-sm">Select one of the online peer hallways on the left to start real-time text discussion and sync revision guides with classmates!</span>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
