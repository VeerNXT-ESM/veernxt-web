import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Send, User, Search, RefreshCw, MessageSquare, 
  ShieldCheck, Phone, Video, Info, MoreVertical, 
  Image, Paperclip, Smile, Edit3, Star, Play, 
  MoreHorizontal, ChevronDown, CheckSquare
} from 'lucide-react';

const MessagingWorkspace = ({ initialRecipient = null }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('Focused');
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  // Initialize and load mock/active partners list
  useEffect(() => {
    const initializeChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || { id: '00000000-0000-0000-0000-000000000000', email: 'test@veernxt.in' };
      setCurrentUser(user);

      // Generate list aligning exactly with the candidates database
      const baseRecipients = [
        {
          id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
          full_name: 'Rahul Kumar (Clerk SD)',
          snippet: 'Melany: The darkness of their souls. Terrible.',
          date: 'May 28',
          service_branch: 'Indian Army',
          trade: 'Clerk SD',
          veer_score: 94,
          active: true
        },
        {
          id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
          full_name: 'Amit Singh',
          snippet: 'Amit: Just a reminder, I am still available for the free...',
          date: 'May 24',
          service_branch: 'Indian Navy',
          trade: 'Seaman Branch',
          veer_score: 87,
          active: true
        },
        {
          id: '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
          full_name: 'Vikram Vardhan',
          snippet: 'Vikram: ok great',
          date: 'May 1',
          service_branch: 'Indian Air Force',
          trade: 'Mechanical Fitter',
          veer_score: 91,
          active: false
        },
        {
          id: '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
          full_name: 'Deepak Sharma',
          snippet: 'Deepak sent a post',
          date: 'Apr 18',
          service_branch: 'Indian Army',
          trade: 'Signals Branch',
          veer_score: 89,
          active: true
        },
        {
          id: '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
          full_name: 'Sandhya Rani',
          snippet: 'You: Good Morning. Sorry I was on a project and then...',
          date: 'Apr 13',
          service_branch: 'Indian Air Force',
          trade: 'Meteorological Branch',
          veer_score: 93,
          active: false
        }
      ];

      setConversations(baseRecipients);

      if (initialRecipient) {
        setSelectedRecipient(initialRecipient);
      } else {
        setSelectedRecipient(baseRecipients[0]);
      }
    };
    initializeChat();
  }, [initialRecipient]);

  // Load message logs for selected user from actual Supabase messages table
  useEffect(() => {
    if (!selectedRecipient || !currentUser) return;

    const fetchRealMessages = async () => {
      if (currentUser.id === '00000000-0000-0000-0000-000000000000') {
        // Instant mock dialogue fallback to skip remote table lookup
        setMessages([
          {
            id: 'msg-1',
            sender_id: selectedRecipient.id,
            content: `Thank you for sharing this transition pathway opportunity. I'm ready to review the details and submit my service verification certificate.`,
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            hasArticle: true
          }
        ]);
        scrollToBottom();
        return;
      }

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedRecipient.id}),and(sender_id.eq.${selectedRecipient.id},receiver_id.eq.${currentUser.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        if (data && data.length > 0) {
          setMessages(data);
        } else {
          // Standard starting conversation threads fallback
          setMessages([
            {
              id: 'msg-1',
              sender_id: selectedRecipient.id,
              content: `Thank you for sharing this transition pathway opportunity. I'm ready to review the details and submit my service verification certificate.`,
              created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
              hasArticle: true
            }
          ]);
        }
      } catch (err) {
        console.warn('Fallback to local memory dialogue feed:', err.message);
        setMessages([
          {
            id: 'msg-1',
            sender_id: selectedRecipient.id,
            content: `Thank you for sharing this transition pathway opportunity. I'm ready to review the details and submit my service verification certificate.`,
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            hasArticle: true
          }
        ]);
      }
      scrollToBottom();
    };

    fetchRealMessages();
  }, [selectedRecipient, currentUser]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleSendMessage = async (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend : inputText;
    if (!text.trim() || !selectedRecipient || !currentUser) return;

    const userMessage = {
      sender_id: currentUser.id,
      receiver_id: selectedRecipient.id,
      content: text,
      created_at: new Date().toISOString()
    };

    // Optimistically update the UI
    setMessages(prev => [...prev, { ...userMessage, id: `msg-${Date.now()}` }]);
    if (typeof textToSend !== 'string') {
      setInputText('');
    }
    scrollToBottom();

    if (currentUser.id !== '00000000-0000-0000-0000-000000000000') {
      try {
        const { error } = await supabase.from('messages').insert([userMessage]);
        if (error) throw error;
      } catch (err) {
        console.warn('Saved message to memory thread (schema migration pending):', err.message);
      }
    } else {
      console.log('Saved message to local memory thread (mock session).');
    }

    // Simulates quick responses from candidates
    setTimeout(() => {
      const candidateReply = {
        id: `reply-${Date.now()}`,
        sender_id: selectedRecipient.id,
        receiver_id: currentUser.id,
        content: `Yes, completely agree. I am reviewing the transition resources right now.`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, candidateReply]);
      scrollToBottom();
    }, 1200);
  };

  const getInitials = (name) => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="messaging-workspace-container animate-fade-in">
      {/* Sidebar: Conversation contacts & filter tabs */}
      <div className="conversations-sidebar-panel">
        {/* Search header bar */}
        <div className="sidebar-top-branding">
          <span className="brand-title">Messaging</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className="small-action-btn"><MoreHorizontal size={16} /></button>
            <button className="small-action-btn"><Edit3 size={16} /></button>
          </div>
        </div>

        <div className="sidebar-search-box">
          <Search size={16} className="search-icon-inside" />
          <input type="text" placeholder="Search messages" className="sidebar-search-input" />
        </div>

        {/* LinkedIn-styled Category Toggles Bar */}
        <div className="category-toggles-bar">
          {['Focused', 'Connections', 'Jobs', 'Unread', 'InMail', 'Starred'].map(tab => (
            <button 
              key={tab} 
              className={`category-toggle-chip ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === 'Focused' && <ChevronDown size={12} style={{ marginLeft: '2px' }} />}
            </button>
          ))}
        </div>

        <div className="conversations-feed-list">
          {conversations.map(partner => (
            <div 
              key={partner.id} 
              className={`conversation-partner-item ${selectedRecipient?.id === partner.id ? 'active' : ''}`}
              onClick={() => setSelectedRecipient(partner)}
            >
              <div className="partner-avatar-wrapper">
                <div className="partner-avatar">
                  {getInitials(partner.full_name)}
                </div>
                {partner.active && <span className="active-dot-indicator"></span>}
              </div>
              
              <div className="partner-details">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="partner-name">{partner.full_name.split(' (')[0]}</span>
                  <span className="partner-date-tag">{partner.date}</span>
                </div>
                <p className="partner-snippet">{partner.snippet}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Dialogue view */}
      <div className="dialogue-chat-panel">
        {selectedRecipient ? (
          <>
            {/* Header */}
            <div className="chat-header-bar">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <h3 className="partner-header-title">{selectedRecipient.full_name}</h3>
                  <span className="mobile-active-bullet">• Mobile • 6m ago</span>
                </div>
              </div>

              <div className="header-actions-row">
                <button className="icon-action-btn"><MoreHorizontal size={18} /></button>
                <button className="icon-action-btn"><Star size={18} /></button>
              </div>
            </div>

            {/* Message Dialogue History */}
            <div className="chat-history-container">
              {/* Mock Dosa Chain Valuation Image watermarked above */}
              <div className="dosa-chain-valuation-box">
                <span className="valuation-bold-heading">Agniveer Transition Pathways: Over 10,000+ candidates placed in corporate security & logistics roles</span>
              </div>

              <div className="history-date-divider">THURSDAY</div>

              {messages.map(msg => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id} className={`message-bubble-wrapper ${isMe ? 'sent' : 'received'}`}>
                    {!isMe && (
                      <div className="bubble-avatar-small">
                        {getInitials(selectedRecipient.full_name)}
                      </div>
                    )}
                    <div className="message-content-block">
                      <div className="message-meta-row">
                        <span className="sender-name-bold">{isMe ? 'You' : selectedRecipient.full_name}</span>
                        {selectedRecipient.veer_score > 90 && !isMe && <ShieldCheck size={12} color="#1F3A2E" />}
                        <span className="msg-time-stamp">• 8:59 AM</span>
                      </div>
                      <p className="msg-text-paragraph">{msg.content}</p>

                      {/* Case Article mock card as shown in the screenshot */}
                      {msg.hasArticle && (
                        <div className="times-of-india-case-card">
                          <div className="card-top-branding">
                            <div className="toi-avatar">VNXT</div>
                            <div>
                              <h4 className="card-source-title">VeerNXT Transitions</h4>
                              <p className="card-followers-info">52,794 active recruiters • 1d • 🌐</p>
                            </div>
                          </div>
                          
                          <p className="case-card-hashtags">
                            <strong>#TransitionSuccess</strong> | A proud day for <strong>#VeerNXT</strong>! The transition team has successfully placed candidate <strong>Rahul Kumar (ex-Agniveer Clerk SD)</strong> in corporate operations support... <span className="more-link">more</span>
                          </p>

                          {/* Interactive video placeholder player with play button */}
                          <div className="case-card-video-box">
                            <div className="video-overlay-play-circle">
                              <Play size={20} color="white" fill="white" />
                            </div>
                            <div className="video-bottom-caption">
                              <strong>'Tri-Service Transition':</strong> Real-time placement metrics for ex-servicemen quota reservation matching
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* LinkedIn Quick suggestion chips menu */}
            <div className="suggestion-chips-row">
              {["Exactly", "Agreed", "Thanks for sharing"].map((chipText, index) => (
                <button 
                  key={index} 
                  className="suggestion-reply-chip"
                  onClick={() => handleSendMessage(chipText)}
                >
                  {chipText}
                </button>
              ))}
            </div>

            {/* Input Action Panel */}
            <form onSubmit={handleSendMessage} className="chat-input-form-bar">
              <div className="input-textarea-wrapper">
                <textarea 
                  placeholder="Write a message..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="chat-keyboard-textarea"
                  rows="2"
                />
              </div>

              {/* Footer toolbar actions menu (Strict professional military parameters: Attachments and Images only) */}
              <div className="input-toolbar-menu">
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button type="button" className="toolbar-btn" title="Add Image attachment"><Image size={18} /></button>
                  <button type="button" className="toolbar-btn" title="Add Documents attachment"><Paperclip size={18} /></button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span className="press-enter-hint">Press Enter to Send</span>
                  <button type="submit" className="toolbar-btn"><MoreHorizontal size={18} /></button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className="no-chat-selected-wrapper">
            <MessageSquare size={48} style={{ opacity: 0.2 }} />
            <h3>Start a Connection</h3>
            <p>Select a contact from the Focused categories list to review transit pathway dialogue threads.</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .messaging-workspace-container {
          display: grid;
          grid-template-columns: 340px 1fr;
          height: calc(100vh - 120px);
          max-width: 1200px;
          margin: 2rem auto;
          background: white;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: var(--shadow-ios);
        }
        .conversations-sidebar-panel {
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          background: white;
          overflow: hidden;
        }
        .sidebar-top-branding {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.25rem 0.5rem 1.25rem;
        }
        .brand-title {
          font-size: 1.1rem;
          font-weight: 850;
          color: #0f172a;
        }
        .small-action-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .small-action-btn:hover {
          background: #f1f5f9;
        }
        .sidebar-search-box {
          padding: 0.5rem 1.25rem;
          position: relative;
        }
        .search-icon-inside {
          position: absolute;
          left: 2rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }
        .sidebar-search-input {
          width: 100%;
          background: #edf3f8;
          border: none;
          padding: 0.55rem 1rem 0.55rem 2.5rem;
          border-radius: 6px;
          font-size: 0.82rem;
          font-family: inherit;
        }
        .sidebar-search-input:focus {
          outline: none;
        }
        .category-toggles-bar {
          display: flex;
          gap: 0.35rem;
          overflow-x: auto;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          scrollbar-width: none;
        }
        .category-toggles-bar::-webkit-scrollbar {
          display: none;
        }
        .category-toggle-chip {
          background: white;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 700;
          font-size: 0.75rem;
          padding: 0.3rem 0.75rem;
          border-radius: 99px;
          cursor: pointer;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
        }
        .category-toggle-chip.active {
          background: #1F3A2E; /* VeerNXT Brand Olive Green */
          color: white;
          border-color: #1F3A2E;
        }
        
        .conversations-feed-list {
          flex: 1;
          overflow-y: auto;
        }
        .conversation-partner-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.2s;
          position: relative;
          text-align: left;
        }
        .conversation-partner-item:hover {
          background: #f8fafc;
        }
        .conversation-partner-item.active {
          background: #eef2eb;
          border-left: 4px solid #1F3A2E;
        }
        .partner-avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }
        .partner-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #f1f5f9;
          color: #1F3A2E;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.95rem;
          border: 1px solid #cbd5e1;
        }
        .active-dot-indicator {
          width: 10px;
          height: 10px;
          background: #16a34a;
          border-radius: 50%;
          border: 2px solid white;
          position: absolute;
          bottom: 2px;
          right: 2px;
        }
        .partner-details {
          flex: 1;
          min-width: 0;
        }
        .partner-name {
          font-weight: 750;
          font-size: 0.88rem;
          color: #0f172a;
        }
        .partner-date-tag {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 550;
        }
        .partner-snippet {
          font-size: 0.78rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.2rem;
          font-weight: 550;
        }
        
        .dialogue-chat-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: white;
          overflow: hidden;
        }
        .chat-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          background: white;
          z-index: 10;
        }
        .partner-header-title {
          font-size: 0.95rem;
          margin: 0;
          font-weight: 850;
          color: #0f172a;
        }
        .mobile-active-bullet {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 550;
        }
        .partner-header-subtitle {
          font-size: 0.72rem;
          color: #64748b;
        }
        .header-actions-row {
          display: flex;
          gap: 0.5rem;
        }
        .icon-action-btn {
          background: none;
          border: none;
          color: #64748b;
          padding: 0.4rem;
          cursor: pointer;
          border-radius: 8px;
        }
        .icon-action-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        
        .chat-history-container {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          background: white;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .dosa-chain-valuation-box {
          background: #000000ea;
          border-radius: 12px;
          padding: 1.5rem;
          color: white;
          text-align: left;
        }
        .valuation-bold-heading {
          font-size: 1.35rem;
          font-weight: 850;
          letter-spacing: -0.01em;
          line-height: 1.3;
          background: linear-gradient(90deg, #93c5fd, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .history-date-divider {
          text-align: center;
          font-size: 0.7rem;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #f1f5f9;
          line-height: 0.1em;
          margin: 1rem 0;
        }
        
        .message-bubble-wrapper {
          display: flex;
          align-items: start;
          gap: 0.75rem;
          max-width: 85%;
          text-align: left;
        }
        .message-bubble-wrapper.sent {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .bubble-avatar-small {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #f1f5f9;
          color: #1F3A2E;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.78rem;
          font-weight: 800;
          flex-shrink: 0;
          border: 1px solid #cbd5e1;
        }
        .message-content-block {
          flex: 1;
        }
        .message-meta-row {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-bottom: 0.25rem;
        }
        .sender-name-bold {
          font-size: 0.85rem;
          font-weight: 800;
          color: #0f172a;
        }
        .msg-time-stamp {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 550;
        }
        .msg-text-paragraph {
          font-size: 0.88rem;
          color: #334155;
          line-height: 1.5;
        }
        
        /* Times of India Article post card styling */
        .times-of-india-case-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem;
          background: white;
          margin-top: 1rem;
          max-width: 500px;
        }
        .card-top-branding {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .toi-avatar {
          width: 38px;
          height: 38px;
          background: #ee1c24;
          color: white;
          font-weight: 900;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .card-source-title {
          font-size: 0.88rem;
          font-weight: 850;
          color: #0f172a;
          margin: 0;
        }
        .card-followers-info {
          font-size: 0.72rem;
          color: #64748b;
        }
        .case-card-hashtags {
          font-size: 0.82rem;
          color: #1e293b;
          line-height: 1.45;
          margin-top: 1rem;
        }
        .case-card-hashtags strong {
          color: #1F3A2E;
          font-weight: 600;
        }
        .more-link {
          color: #64748b;
          cursor: pointer;
        }
        .case-card-video-box {
          height: 240px;
          background: linear-gradient(180deg, #64748b, #1e293b);
          border-radius: 8px;
          margin-top: 1rem;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: inset 0 0 100px rgba(0,0,0,0.5);
        }
        .video-overlay-play-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .video-overlay-play-circle:hover {
          transform: scale(1.08);
        }
        .video-bottom-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 0.75rem 1rem;
          font-size: 0.78rem;
          line-height: 1.35;
          text-align: left;
        }
        
        .suggestion-chips-row {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-top: 1px solid #f1f5f9;
          flex-wrap: wrap;
        }
        .suggestion-reply-chip {
          background: white;
          border: 1px solid #1F3A2E;
          color: #1F3A2E;
          font-weight: 700;
          font-size: 0.8rem;
          padding: 0.4rem 1.25rem;
          border-radius: 99px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .suggestion-reply-chip:hover {
          background: rgba(31, 58, 46, 0.05);
        }
        
        .chat-input-form-bar {
          display: flex;
          flex-direction: column;
          background: white;
          border-top: 1px solid #e2e8f0;
          padding: 1rem;
        }
        .input-textarea-wrapper {
          width: 100%;
        }
        .chat-keyboard-textarea {
          width: 100%;
          border: none;
          resize: none;
          font-size: 0.88rem;
          font-family: inherit;
          padding: 0.5rem;
        }
        .chat-keyboard-textarea:focus {
          outline: none;
        }
        .input-toolbar-menu {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 0.5rem;
          border-top: 1px solid #f1f5f9;
          padding-top: 0.75rem;
        }
        .toolbar-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          transition: background 0.2s, color 0.2s;
        }
        .toolbar-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .press-enter-hint {
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 550;
        }
        
        .no-chat-selected-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          color: #64748b;
        }
        
        @media (max-width: 768px) {
          .conversations-sidebar-panel {
            width: 80px;
          }
          .category-toggles-bar, .sidebar-search-box, .sidebar-top-branding, .partner-details, .partner-date-tag {
            display: none;
          }
          .conversation-partner-item {
            justify-content: center;
          }
        }
      `}} />
    </div>
  );
};

export default MessagingWorkspace;
