import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { 
  Send, User, Search, RefreshCw, MessageSquare, 
  ShieldCheck, Phone, Video, Info, MoreVertical, 
  Image, Paperclip, Smile, Edit3, Star, Play, 
  MoreHorizontal, ChevronDown, CheckSquare, ExternalLink, FileText
} from 'lucide-react';

const MessagingWorkspace = ({ initialRecipient = null }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('Focused');
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  // File sending states
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Connection Gate states
  const [canMessage, setCanMessage] = useState(true);
  const [checkingGate, setCheckingGate] = useState(false);

  // 1. Initialize and load dynamic active recipients (connections + message threads)
  useEffect(() => {
    const initializeChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      setCurrentUser(user);

      try {
        // Fetch accepted connections
        const { data: activeConns } = await supabase
          .from('connections')
          .select('*')
          .eq('status', 'accepted')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

        // Fetch distinct message partners from public.chat_messages
        const { data: sentMsgs } = await supabase
          .from('chat_messages')
          .select('receiver_id')
          .eq('sender_id', user.id);
        const { data: recMsgs } = await supabase
          .from('chat_messages')
          .select('sender_id')
          .eq('receiver_id', user.id);

        const partnerIds = new Set();
        if (activeConns) {
          activeConns.forEach(c => {
            partnerIds.add(c.sender_id === user.id ? c.receiver_id : c.sender_id);
          });
        }
        if (sentMsgs) sentMsgs.forEach(m => partnerIds.add(m.receiver_id));
        if (recMsgs) recMsgs.forEach(m => partnerIds.add(m.sender_id));

        // Resolve profiles for all partnerIds
        const idsArray = Array.from(partnerIds);
        let resolvedRecipients = [];

        // Always fetch all database profiles for sidebar lookup
        const { data: cands } = await supabase
          .from('user_profiles')
          .select('id, full_name, service_branch, trade, raw_profile_data, veer_score');
        
        const { data: emps } = await supabase
          .from('employer_profiles')
          .select('id, company_name, contact_name, designation');

        const lookup = {};
        if (cands) {
          cands.forEach(c => {
            lookup[c.id] = {
              id: c.id,
              full_name: c.full_name || 'Unnamed Candidate',
              headline: `${c.trade || 'Veteran'} • ${c.service_branch}`,
              role: 'candidate',
              veer_score: c.veer_score || 85,
              initials: (c.full_name || 'C').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            };
          });
        }
        if (emps) {
          emps.forEach(e => {
            lookup[e.id] = {
              id: e.id,
              full_name: e.contact_name || 'Unnamed Recruiter',
              headline: `${e.designation || 'Partner'} at ${e.company_name}`,
              role: 'employer',
              veer_score: 95,
              initials: (e.contact_name || 'E').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            };
          });
        }

        if (idsArray.length > 0) {
          resolvedRecipients = idsArray.map(id => {
            return lookup[id] || {
              id,
              full_name: 'VeerNXT Member',
              headline: 'Transitioning Member',
              role: 'unknown',
              veer_score: 80,
              initials: 'VM'
            };
          });
        }

        // Fallback: if user has no connections/messages yet, populate with first few completing user_profiles as suggestions
        if (resolvedRecipients.length === 0) {
          if (cands) {
            resolvedRecipients = cands.slice(0, 5).map(c => lookup[c.id]);
          }
        }

        setConversations(resolvedRecipients);

        if (initialRecipient) {
          setSelectedRecipient(initialRecipient);
        } else if (resolvedRecipients.length > 0) {
          setSelectedRecipient(resolvedRecipients[0]);
        }
      } catch (err) {
        console.error("Error initializing conversations list:", err);
      }
    };
    initializeChat();
  }, [initialRecipient]);

  // 2. Check Connection Limit Guard for Selected Recipient
  useEffect(() => {
    const checkConnectionAndMessages = async () => {
      if (!currentUser || !selectedRecipient) return;
      if (currentUser.id === '00000000-0000-0000-0000-000000000000') {
        setCanMessage(true);
        return;
      }
      setCheckingGate(true);
      try {
        // 1. Check if they are connected (accepted)
        const { data: conn } = await supabase
          .from('connections')
          .select('*')
          .eq('status', 'accepted')
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedRecipient.id}),and(sender_id.eq.${selectedRecipient.id},receiver_id.eq.${currentUser.id})`)
          .maybeSingle();

        if (conn) {
          setCanMessage(true);
          return;
        }

        // 2. If not connected, check if a message has already been sent
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', currentUser.id)
          .eq('receiver_id', selectedRecipient.id);

        if (count && count >= 1) {
          setCanMessage(false);
        } else {
          setCanMessage(true);
        }
      } catch (err) {
        console.error("Error checking connection messages limit:", err);
        setCanMessage(true);
      } finally {
        setCheckingGate(false);
      }
    };
    checkConnectionAndMessages();
  }, [selectedRecipient, currentUser]);

  // 3. Load message logs for selected user from actual Supabase chat_messages table
  useEffect(() => {
    if (!selectedRecipient || !currentUser) return;

    const fetchRealMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedRecipient.id}),and(sender_id.eq.${selectedRecipient.id},receiver_id.eq.${currentUser.id})`)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (err) {
        console.warn('Fallback to local memory dialogue feed:', err.message);
      }
      scrollToBottom();
    };

    fetchRealMessages();
  }, [selectedRecipient, currentUser]);

  // 4. Realtime subscription for incoming messages
  useEffect(() => {
    if (!currentUser || !selectedRecipient) return;
    if (currentUser.id === '00000000-0000-0000-0000-000000000000') return;

    const channel = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, payload => {
        const newMsg = payload.new;
        const isFromRecipient = newMsg.sender_id === selectedRecipient.id && newMsg.receiver_id === currentUser.id;
        const isToRecipient = newMsg.sender_id === currentUser.id && newMsg.receiver_id === selectedRecipient.id;
        
        if (isFromRecipient || isToRecipient) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRecipient, currentUser]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      setAttachedFile({
        name: file.name,
        url: publicUrl,
        type: file.type
      });
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Failed to upload attachment: " + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend : inputText;
    if ((!text.trim() && !attachedFile) || !selectedRecipient || !currentUser) return;

    const userMessage = {
      sender_id: currentUser.id,
      receiver_id: selectedRecipient.id,
      content: text,
      file_url: attachedFile?.url || null,
      file_name: attachedFile?.name || null,
      file_type: attachedFile?.type || null,
      created_at: new Date().toISOString()
    };

    // Optimistically update the UI
    const tempId = `msg-${Date.now()}`;
    setMessages(prev => [...prev, { ...userMessage, id: tempId }]);
    
    if (typeof textToSend !== 'string') {
      setInputText('');
    }
    setAttachedFile(null);
    scrollToBottom();

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([userMessage])
        .select()
        .single();
      
      if (error) throw error;

      // Replace optimistic message with actual db record
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));

      // After sending, re-check connection limits (which will block future messages if limit reached)
      const { data: conn } = await supabase
        .from('connections')
        .select('*')
        .eq('status', 'accepted')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedRecipient.id}),and(sender_id.eq.${selectedRecipient.id},receiver_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (!conn) {
        setCanMessage(false);
      }

    } catch (err) {
      console.error('Failed to send database message:', err.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const renderLinkPreview = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text ? text.match(urlRegex) : null;
    if (!urls) return null;
    const url = urls[0];
    let domain = 'link';
    try {
      domain = new URL(url).hostname;
    } catch (e) {}

    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', transition: 'all 0.2s ease', cursor: 'pointer' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eef2f6', color: 'var(--ios-olive)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ExternalLink size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Visit {domain}
            </h4>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {url}
            </p>
          </div>
        </div>
      </a>
    );
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
                  <span className="partner-name">{partner.full_name}</span>
                  <span className="partner-date-tag" style={{ textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800, color: 'var(--ios-olive)', background: 'rgba(75,107,50,0.08)', padding: '0.1rem 0.4rem', borderRadius: '100px' }}>
                    {partner.role === 'employer' ? 'Recruiter' : 'Veteran'}
                  </span>
                </div>
                <p className="partner-snippet" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                  {partner.headline}
                </p>
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
                const timeString = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '8:59 AM';
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
                        <span className="msg-time-stamp">• {timeString}</span>
                      </div>
                      
                      {msg.content && <p className="msg-text-paragraph">{msg.content}</p>}

                      {/* Display image attachments */}
                      {msg.file_url && msg.file_type?.startsWith('image/') && (
                        <div style={{ marginTop: '0.5rem', maxWidth: '250px' }}>
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                            <img src={msg.file_url} alt="Attachment" style={{ width: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }} />
                          </a>
                        </div>
                      )}

                      {/* Display PDF attachments */}
                      {msg.file_url && msg.file_type === 'application/pdf' && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', borderRadius: '8px', textDecoration: 'none', color: '#0f172a', width: 'fit-content' }}>
                            <FileText size={16} color="var(--ios-olive)" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{msg.file_name || 'View PDF document'}</span>
                            <ExternalLink size={12} color="#64748b" />
                          </a>
                        </div>
                      )}

                      {/* Display other attachments */}
                      {msg.file_url && !msg.file_type?.startsWith('image/') && msg.file_type !== 'application/pdf' && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 0.75rem', borderRadius: '8px', textDecoration: 'none', color: '#0f172a', width: 'fit-content' }}>
                            <Paperclip size={16} color="#64748b" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{msg.file_name || 'Download file'}</span>
                            <ExternalLink size={12} color="#64748b" />
                          </a>
                        </div>
                      )}

                      {/* URL Link Previews */}
                      {msg.content && renderLinkPreview(msg.content)}

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

            {/* Attachment preview panel */}
            {attachedFile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Paperclip size={16} color="var(--ios-olive)" />
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>
                    {attachedFile.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    (Ready to send)
                  </span>
                </div>
                <button type="button" onClick={() => setAttachedFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                  Remove
                </button>
              </div>
            )}

            {uploadingFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                <RefreshCw size={14} className="animate-spin" color="var(--ios-olive)" />
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Uploading file attachment...</span>
              </div>
            )}

            {/* Hidden Input Files */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
            <input 
              type="file" 
              accept="image/*" 
              ref={imageInputRef} 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />

            {!canMessage ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                <ShieldCheck size={36} color="var(--ios-olive)" style={{ marginBottom: '0.5rem', opacity: 0.8 }} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1F3A2E' }}>Connection Request Required</h4>
                <p style={{ margin: '0.25rem 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b', maxWidth: '400px', lineHeight: 1.4 }}>
                  You are not connected with {selectedRecipient.full_name} yet. You can only send 1 introductory message before they accept your connection request.
                </p>
                <Link to="/network" className="btn-primary ios-pill" style={{ textDecoration: 'none', padding: '0.55rem 1.5rem', fontSize: '0.85rem' }}>
                  Manage Network
                </Link>
              </div>
            ) : (
              /* Input Action Panel */
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="chat-input-form-bar">
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

                {/* Footer toolbar actions menu */}
                <div className="input-toolbar-menu">
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button type="button" onClick={() => imageInputRef.current?.click()} className="toolbar-btn" title="Add Image attachment"><Image size={18} /></button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="toolbar-btn" title="Add Documents attachment"><Paperclip size={18} /></button>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span className="press-enter-hint">Press Enter to Send</span>
                    <button type="submit" className="toolbar-btn"><Send size={18} color="var(--ios-olive)" /></button>
                  </div>
                </div>
              </form>
            )}
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
