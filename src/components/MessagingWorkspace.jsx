import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import {
  Send, Search, RefreshCw, MessageSquare,
  ShieldCheck, ArrowLeft, Users,
  Image, Paperclip, Edit3, Star,
  MoreHorizontal, ChevronDown, ExternalLink, FileText
} from 'lucide-react';

const MessagingWorkspace = ({ initialRecipient = null }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState('Focused');
  const [currentUser, setCurrentUser] = useState(null);
  const [isEmployer, setIsEmployer] = useState(false);
  const messagesEndRef = useRef(null);

  // Mobile master-detail: which pane is showing on narrow widths — desktop
  // ignores this entirely and always shows both panes (see CSS).
  const [mobileView, setMobileView] = useState('list');

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

      const metadataRole = user.user_metadata?.role;
      if (metadataRole === 'candidate') {
        localStorage.removeItem('employer_session');
      }
      setIsEmployer(metadataRole === 'employer' || (metadataRole !== 'candidate' && !!localStorage.getItem('employer_session')));

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

        // No fallback here on purpose — conversations only ever contains
        // real accepted connections or people already messaged. Anyone else
        // is found via the "Find Contacts" empty-state CTA, not shown as if
        // already a contact.
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
    <div className={`messaging-workspace-container animate-fade-in mobile-${mobileView}`}>
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
          {conversations.length === 0 ? (
            <div className="no-contacts-empty-state">
              <Users size={36} style={{ opacity: 0.25 }} />
              <h4>No conversations yet</h4>
              <p>Messages only show up here once you&apos;re connected with someone. Find people to connect with first.</p>
              <Link to={isEmployer ? '/find-candidates' : '/network'} className="btn-primary ios-pill find-contacts-btn">
                <Users size={14} /> Find Contacts
              </Link>
            </div>
          ) : conversations.map(partner => (
            <div
              key={partner.id}
              className={`conversation-partner-item ${selectedRecipient?.id === partner.id ? 'active' : ''}`}
              onClick={() => { setSelectedRecipient(partner); setMobileView('chat'); }}
            >
              <div className="partner-avatar-wrapper">
                <div className="partner-avatar">
                  {getInitials(partner.full_name)}
                </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button type="button" className="back-to-list-btn" onClick={() => setMobileView('list')} aria-label="Back to conversations">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="partner-header-title">{selectedRecipient.full_name}</h3>
              </div>

              <div className="header-actions-row">
                <button className="icon-action-btn"><MoreHorizontal size={18} /></button>
                <button className="icon-action-btn"><Star size={18} /></button>
              </div>
            </div>

            {/* Message Dialogue History */}
            <div className="chat-history-container">
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
                        {selectedRecipient.role === 'candidate' && selectedRecipient.veer_score > 90 && !isMe && <ShieldCheck size={12} color="#1F3A2E" />}
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
        .back-to-list-btn {
          display: none;
          background: none;
          border: none;
          color: #0f172a;
          cursor: pointer;
          padding: 0.4rem;
          margin: -0.4rem;
          border-radius: 8px;
          align-items: center;
          justify-content: center;
        }
        .back-to-list-btn:hover {
          background: #f1f5f9;
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

        .no-contacts-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.5rem;
          padding: 3rem 1.5rem;
          color: #64748b;
        }
        .no-contacts-empty-state h4 {
          margin: 0.25rem 0 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
        }
        .no-contacts-empty-state p {
          margin: 0;
          font-size: 0.82rem;
          line-height: 1.5;
          max-width: 260px;
        }
        .find-contacts-btn {
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.5rem;
          padding: 0.65rem 1.25rem;
          font-size: 0.85rem;
        }

        /* Mobile: master-detail — one pane fills the screen at a time,
           switched by the mobile-list/mobile-chat class on the
           container (set from mobileView state). Desktop is untouched;
           both panes always render side by side above this breakpoint. */
        @media (max-width: 768px) {
          .messaging-workspace-container {
            grid-template-columns: 1fr;
            height: auto;
            min-height: 70vh;
            margin: 0;
            border-radius: 0;
            border: none;
            box-shadow: none;
            max-width: 100%;
          }
          .mobile-list .dialogue-chat-panel {
            display: none;
          }
          .mobile-chat .conversations-sidebar-panel {
            display: none;
          }
          .back-to-list-btn {
            display: flex;
          }
          .conversation-partner-item {
            min-height: 44px;
            padding: 0.85rem 1.25rem;
          }
          .small-action-btn,
          .icon-action-btn,
          .toolbar-btn {
            min-width: 44px;
            min-height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .category-toggle-chip {
            min-height: 36px;
          }
        }
      `}} />
    </div>
  );
};

export default MessagingWorkspace;
