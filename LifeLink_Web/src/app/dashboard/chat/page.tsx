// src/app/dashboard/chat/page.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, MessageSquare, Droplets } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { user } = useAuthStore();
  const { socket, joinChat } = useSocketStore();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (data: any) => {
      if (activeChat && data.chatId === activeChat._id) {
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
      // Update chat list last message
      setChats(prev => prev.map(c =>
        c._id === data.chatId
          ? { ...c, lastMessage: { content: data.message.content, timestamp: new Date() } }
          : c
      ));
    });

    socket.on('user_typing', (data: any) => {
      if (data.userId !== user?._id) setOtherTyping(true);
    });

    socket.on('user_stop_typing', () => setOtherTyping(false));

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket, activeChat]);

  useEffect(() => {
    if (activeChat) {
      joinChat(activeChat._id);
      fetchMessages(activeChat._id);
    }
  }, [activeChat]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchChats = async () => {
    try {
      const { data } = await api.get('/chat');
      setChats(data.chats || []);
    } catch { toast.error('Failed to load chats'); }
    setLoading(false);
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data } = await api.get(`/chat/${chatId}/messages`);
      setMessages(data.messages || []);
    } catch {}
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeChat || sending) return;
    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic update
    const optimistic = {
      _id: Date.now().toString(),
      sender: { _id: user?._id, name: user?.name },
      content: text,
      createdAt: new Date(),
      optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      socket?.emit('send_message', { chatId: activeChat._id, content: text });
    } catch { toast.error('Failed to send'); }
    setSending(false);
  };

  const handleTyping = () => {
    if (!typing) {
      setTyping(true);
      socket?.emit('typing', { chatId: activeChat?._id });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      socket?.emit('stop_typing', { chatId: activeChat?._id });
    }, 1500);
  };

  const getOtherParticipant = (chat: any) => {
    return chat.participants?.find((p: any) => p._id !== user?._id) || chat.participants?.[0];
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-5">
      {/* ── Chat List ── */}
      <div className="w-72 flex-shrink-0 glass-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="font-display font-bold text-white mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              placeholder="Search conversations..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/30 text-sm transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 p-2">
                  <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
              <MessageSquare size={32} className="mb-3 opacity-40" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Accept a request to start chatting</p>
            </div>
          ) : (
            chats.map(chat => {
              const other = getOtherParticipant(chat);
              const isActive = activeChat?._id === chat._id;
              return (
                <button
                  key={chat._id}
                  onClick={() => setActiveChat(chat)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-all hover:bg-white/5 ${isActive ? 'bg-red-500/10 border-r-2 border-red-500' : ''}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-400 font-bold">{other?.name?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-medium text-sm truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>{other?.name || 'Unknown'}</span>
                    </div>
                    {chat.bloodRequest && (
                      <div className="flex items-center gap-1 text-xs text-red-400">
                        <Droplets size={10} />
                        <span>{chat.bloodRequest?.bloodGroup} Request</span>
                      </div>
                    )}
                    {chat.lastMessage && (
                      <p className="text-slate-500 text-xs truncate mt-0.5">{chat.lastMessage.content}</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Message Area ── */}
      {activeChat ? (
        <div className="flex-1 glass-card flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/20 flex items-center justify-center">
              <span className="text-red-400 font-bold">
                {getOtherParticipant(activeChat)?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-white">{getOtherParticipant(activeChat)?.name}</p>
              {otherTyping && (
                <p className="text-green-400 text-xs animate-pulse">typing...</p>
              )}
            </div>
            {activeChat.bloodRequest && (
              <div className="ml-auto blood-badge text-xs">
                {activeChat.bloodRequest?.bloodGroup}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {messages.map((msg, i) => {
                const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
                return (
                  <motion.div
                    key={msg._id || i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${isMe ? 'order-1' : ''}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-gradient-to-br from-red-600 to-red-700 text-white rounded-br-sm'
                          : 'bg-white/8 text-slate-200 rounded-bl-sm border border-white/10'
                      } ${msg.optimistic ? 'opacity-70' : ''}`}>
                        {msg.content}
                      </div>
                      <p className={`text-slate-600 text-xs mt-1 ${isMe ? 'text-right' : ''}`}>
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {otherTyping && (
              <div className="flex justify-start">
                <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 0.2, 0.4].map(d => (
                      <motion.div
                        key={d}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                        className="w-2 h-2 rounded-full bg-slate-500"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/5">
            <div className="flex gap-3 items-end">
              <input
                value={inputText}
                onChange={e => { setInputText(e.target.value); handleTyping(); }}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/40 text-sm transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
                className="btn-emergency py-3 px-4 disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 glass-card flex items-center justify-center">
          <div className="text-center text-slate-500">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose a chat from the left to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
