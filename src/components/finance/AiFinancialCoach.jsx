import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Globe,
  HelpCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'Can I withdraw from my Liquid Fund anytime without penalty?',
  'Why should I not buy land or a plot right now?',
  'How will my monthly SIP grow over 5 to 10 years?',
  'What type of Term Insurance should I buy for my family?'
];

export default function AiFinancialCoach({ profile, corpusAmount, allocation, answers }) {
  const [language, setLanguage] = useState('hinglish'); // 'hinglish', 'hi', 'en'
  const [analysis, setAnalysis] = useState('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const chatBottomRef = useRef(null);

  // Fetch initial AI Analysis on mount or when language/profile changes
  useEffect(() => {
    let isCancelled = false;

    const fetchAnalysis = async () => {
      setLoadingAnalysis(true);
      try {
        const res = await fetch('/api/v1/finance-coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile,
            corpusAmount,
            allocation: allocation?.items || allocation || [],
            answers,
            language,
          }),
        });

        if (!res.ok) throw new Error('Failed to fetch coach analysis');
        const data = await res.json();
        if (!isCancelled && data.text) {
          setAnalysis(data.text);
        }
      } catch (err) {
        console.warn('AI Coach fetch error:', err.message);
      } finally {
        if (!isCancelled) setLoadingAnalysis(false);
      }
    };

    fetchAnalysis();

    return () => {
      isCancelled = true;
    };
  }, [profile, corpusAmount, allocation, answers, language]);

  // Scroll chat into view on new message
  useEffect(() => {
    if (chatMessages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, loadingChat]);

  const handleAskQuestion = async (questionText) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || loadingChat) return;

    setInputQuestion('');
    const newHistory = [...chatMessages, { sender: 'user', text: q }];
    setChatMessages(newHistory);
    setLoadingChat(true);

    try {
      const res = await fetch('/api/v1/finance-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          corpusAmount,
          allocation: allocation?.items || allocation || [],
          answers,
          language,
          userQuestion: q,
          history: newHistory,
        }),
      });

      if (!res.ok) throw new Error('Coach chat error');
      const data = await res.json();
      setChatMessages(prev => [...prev, { sender: 'coach', text: data.text }]);
    } catch (err) {
      console.warn('AI Coach question failed:', err);
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'coach',
          text: language === 'hi'
            ? 'क्षमा करें, नेटवर्क में देरी हुई है। कृपया पुनः प्रयास करें या आपातकालीन फंड को प्राथमिकता दें।'
            : 'Apologies, connectivity issue aaya. Lekin yaad rakhein: Emergency fund and term cover aapka primary shield hai.',
        },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Helper to render basic markdown without pulling in heavy parser
  const renderFormattedContent = (content) => {
    if (!content) return null;
    return content.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} style={{ height: '8px' }} />;
      if (trimmed === '---' || trimmed === '***') {
        return <hr key={idx} style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '12px 0' }} />;
      }

      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} style={{ fontSize: '18px', fontWeight: '700', color: '#0F3A1A', margin: '14px 0 6px 0' }}>
            {trimmed.replace('### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('#### ')) {
        return (
          <h5 key={idx} style={{ fontSize: '15px', fontWeight: '700', color: '#0F3A1A', margin: '12px 0 4px 0' }}>
            {trimmed.replace('#### ', '')}
          </h5>
        );
      }
      if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.replace(/^[-•*]\s*/, '');
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '4px 0', fontSize: '14px', lineHeight: '1.5', color: '#1E293B' }}>
            <span style={{ color: '#C9A84C', fontWeight: 'bold' }}>•</span>
            <span style={{ color: '#1E293B' }} dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0F3A1A">$1</strong>') }} />
          </div>
        );
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', margin: '4px 0', fontSize: '14px', lineHeight: '1.5', color: '#1E293B' }}>
            <span style={{ color: '#0F3A1A', fontWeight: 'bold' }}>{trimmed.slice(0, 2)}</span>
            <span style={{ color: '#1E293B' }} dangerouslySetInnerHTML={{ __html: trimmed.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0F3A1A">$1</strong>') }} />
          </div>
        );
      }
      return (
        <p key={idx} style={{ margin: '6px 0', fontSize: '14px', lineHeight: '1.6', color: '#1E293B' }}
          dangerouslySetInnerHTML={{ __html: trimmed.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0F3A1A">$1</strong>') }}
        />
      );
    });
  };

  return (
    <div className="fg-ai-coach-container animate-fade-in" style={{
      marginTop: '36px',
      background: 'linear-gradient(180deg, #F9FAF8 0%, #FFFFFF 100%)',
      borderRadius: '16px',
      border: '1.5px solid #E2E8F0',
      boxShadow: '0 8px 30px rgba(15, 58, 26, 0.05)',
      overflow: 'hidden'
    }}>
      {/* Top Banner */}
      <div style={{
        padding: '20px 24px',
        background: 'linear-gradient(90deg, #0F3A1A 0%, #174E25 100%)',
        color: '#FFFFFF',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(201, 168, 76, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #C9A84C'
          }}>
            <Sparkles size={22} color="#C9A84C" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                VeerNXT AI Financial Coach
              </h3>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#C9A84C',
                color: '#0F3A1A',
                fontWeight: '700',
                letterSpacing: '0.5px'
              }}>
                वीर साथी
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: '2px 0 0 0' }}>
              Personalized strategy rationale & instant answers for your calculated allocation
            </p>
          </div>
        </div>

        {/* Language Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '4px', borderRadius: '8px' }}>
          <Globe size={14} color="#C9A84C" style={{ marginLeft: '4px' }} />
          {[
            { id: 'hinglish', label: 'Hinglish' },
            { id: 'hi', label: 'हिंदी' },
            { id: 'en', label: 'English' },
          ].map(lang => (
            <button
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              style={{
                border: 'none',
                background: language === lang.id ? '#C9A84C' : 'transparent',
                color: language === lang.id ? '#0F3A1A' : '#FFFFFF',
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '24px' }}>
        {/* Guardrail Callout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#166534',
          marginBottom: '20px'
        }}>
          <ShieldCheck size={16} color="#166534" style={{ flexShrink: 0 }} />
          <span>
            <strong>Deterministic Math Verified:</strong> All Rupee amounts and percentages are 100% computed by military financial rules. AI only explains the rationale and provides guidance.
          </span>
        </div>

        {/* AI Briefing Card */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          {loadingAnalysis ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', color: '#0F3A1A' }} />
              <p style={{ fontSize: '14px', fontWeight: '500' }}>
                Analyzing your {profile?.name || 'Agniveer'} profile & generating coach guidance...
              </p>
            </div>
          ) : (
            renderFormattedContent(analysis)
          )}
        </div>

        {/* Ask AI Coach Q&A Section */}
        <div style={{ marginTop: '28px', borderTop: '1px dashed #E2E8F0', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0F3A1A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <HelpCircle size={18} color="#C9A84C" />
              Ask Your AI Coach About This Plan
            </h4>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Instant, unbiased responses</span>
          </div>

          {/* Suggested Quick Questions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(q)}
                disabled={loadingChat}
                style={{
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#334155',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0F3A1A'; e.currentTarget.style.color = '#0F3A1A'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#334155'; }}
              >
                💬 {q}
              </button>
            ))}
          </div>

          {/* Conversation History */}
          {chatMessages.length > 0 && (
            <div style={{
              background: '#F8FAFC',
              borderRadius: '10px',
              padding: '16px',
              maxHeight: '280px',
              overflowY: 'auto',
              marginBottom: '16px',
              border: '1px solid #E2E8F0'
            }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    background: msg.sender === 'user' ? '#0F3A1A' : '#FFFFFF',
                    color: msg.sender === 'user' ? '#FFFFFF' : '#1E293B',
                    border: msg.sender === 'user' ? 'none' : '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    {msg.sender === 'user' ? (
                      <div style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '13.5px', lineHeight: '1.5' }}>
                        {msg.text}
                      </div>
                    ) : (
                      renderFormattedContent(msg.text)
                    )}
                  </div>
                </div>
              ))}
              {loadingChat && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '8px 12px', background: '#FFFFFF', borderRadius: '10px', fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={14} className="animate-spin" /> Coach is reviewing your allocation...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
          )}

          {/* Input Box */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
              placeholder="e.g. Can I put this into an FD instead of a Debt Fund?"
              disabled={loadingChat}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid #CBD5E1',
                fontSize: '14px',
                outline: 'none',
                background: '#FFFFFF',
                color: '#0F172A'
              }}
            />
            <button
              onClick={() => handleAskQuestion()}
              disabled={loadingChat || !inputQuestion.trim()}
              style={{
                background: inputQuestion.trim() ? '#0F3A1A' : '#94A3B8',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0 18px',
                cursor: inputQuestion.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'background 0.2s'
              }}
            >
              <Send size={15} />
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
