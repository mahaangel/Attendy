import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '../components/Layout/AppLayout';
import { Spinner } from '../components/Common';
import { analyticsService } from '../services';
import useSubjectStore from '../store/subjectStore';
import useAuthStore from '../store/authStore';

const SUGGESTED = [
  "Can I skip tomorrow?",
  "What's my attendance status?",
  "How many classes can I miss?",
  "Help me recover my attendance",
  "Am I safe to take a leave this week?",
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`chat-message ${isUser ? 'user' : ''}`}>
      <div className="chat-avatar" style={{ background: isUser ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : '#F1F5F9', color: isUser ? '#fff' : '#64748B', fontSize: 18 }}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
        {msg.content}
        {msg.risk_level && (
          <div style={{ marginTop: 8, display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: msg.risk_level === 'Safe' ? '#D1FAE5' : msg.risk_level === 'Danger' ? '#FEE2E2' : '#FEF3C7',
            color: msg.risk_level === 'Safe' ? '#10B981' : msg.risk_level === 'Danger' ? '#EF4444' : '#F59E0B' }}>
            {msg.risk_level}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatbotPage() {
  const { user } = useAuthStore();
  const { subjects, fetchSubjects } = useSubjectStore();
  const [messages, setMessages] = useState([{
    role: 'ai',
    content: `Hi ${user?.name || 'there'}! 👋 I'm your SmartAttend AI assistant. Ask me anything about your attendance — like "Can I skip tomorrow?" or "What's my risk level?" Select a subject below for personalized answers!`,
  }]);
  const [input, setInput] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { if (subjects.length === 0) fetchSubjects(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const sendMessage = async (text = input) => {
    const msg = text.trim();
    if (!msg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setTyping(true);
    try {
      const res = await analyticsService.chatbot(msg, selectedId || null);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: res.reply,
        risk_level: res.risk_level,
        suggestion: res.suggestion,
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <AppLayout title="AI Chatbot" subtitle="Ask SmartAttend AI anything about your attendance">
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, height: 'calc(100vh - 160px)' }}>
        {/* Left: Subject + Suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}><div className="card-title">Select Subject</div></div>
            <select id="chatbot-subject-select" className="form-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">General</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.attendance_percentage?.toFixed(1)}%)</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Select a subject for personalized advice</p>
          </div>

          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}><div className="card-title">Quick Questions</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTED.map(q => (
                <button key={q} className="btn btn-ghost btn-sm" style={{ textAlign: 'left', justifyContent: 'flex-start', fontSize: '12px', whiteSpace: 'normal', height: 'auto', padding: '8px 12px' }}
                  onClick={() => sendMessage(q)}>
                  💬 {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Chat */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Chat header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #2563EB, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>SmartAttend AI</p>
              <p style={{ fontSize: 11, color: '#10B981' }}>● Online — AI Powered</p>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {typing && (
              <div className="chat-message">
                <div className="chat-avatar" style={{ background: '#F1F5F9', fontSize: 18 }}>🤖</div>
                <div className="chat-bubble chat-bubble-ai">
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width: 8, height: 8, background: '#94A3B8', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-input-bar">
            <input
              id="chat-input"
              className="form-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask me anything about your attendance..."
              style={{ flex: 1 }}
            />
            <button id="chat-send-btn" className="btn btn-primary btn-icon" onClick={() => sendMessage()} disabled={!input.trim() || typing}>
              {typing ? <Spinner /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
