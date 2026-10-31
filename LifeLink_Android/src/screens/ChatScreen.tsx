// src/screens/ChatScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

interface Message {
  _id: string;
  sender: { _id: string; name: string } | string;
  content: string;
  createdAt: string;
}

export default function ChatScreen({ route, navigation }: any) {
  const { chatId: initialChatId, requestId, recipientId, recipientName } = route.params || {};
  const { user } = useAuthStore();
  const { socket } = useSocketStore();

  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    initChat();
  }, [initialChatId, requestId, recipientId]);

  const initChat = async () => {
    setLoading(true);
    let targetChatId = initialChatId;

    try {
      if (!targetChatId && (recipientId || requestId)) {
        const { data } = await api.post('/chat/start', {
          participantId: recipientId,
          requestId: requestId,
        });
        if (data.chat?._id) {
          targetChatId = data.chat._id;
          setActiveChatId(targetChatId);
        }
      }

      if (targetChatId) {
        const { data } = await api.get(`/chat/${targetChatId}/messages`);
        setMessages(data.messages || []);
        socket?.emit('join_chat', targetChatId);
      }
    } catch (err: any) {
      console.log('Error initializing chat:', err.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socket || !activeChatId) return;

    const handleNewMessage = (data: any) => {
      const msg = data.message || data;
      if (data.chatId === activeChatId || !data.chatId) {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, activeChatId]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !activeChatId) return;
    setText('');

    // Emit via Socket.IO
    socket?.emit('send_message', {
      chatId: activeChatId,
      content: trimmed,
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const senderId = typeof item.sender === 'object' ? item.sender?._id : item.sender;
    const senderName = typeof item.sender === 'object' ? item.sender?.name : 'User';
    const isMe = senderId?.toString() === user?._id?.toString();

    return (
      <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
        {!isMe && <Text style={styles.senderName}>{senderName}</Text>}
        <Text style={[styles.msgText, isMe && styles.myMsgText]}>{item.content}</Text>
        <Text style={[styles.time, isMe && styles.myTime]}>
          {new Date(item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{recipientName || 'LifeLink Chat'}</Text>
          <Text style={styles.subTitle}>Emergency Blood Coordination</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#ef4444" style={{ flex: 1 }} size="large" />
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.empty}>No messages yet. Send a message to coordinate donation.</Text>
          }
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor="#475569"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || !activeChatId) && { opacity: 0.4 }]}
            onPress={sendMessage}
            disabled={!text.trim() || !activeChatId}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { padding: 8 },
  backText: { color: '#ef4444', fontSize: 22, fontWeight: '700' },
  headerTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  subTitle: { color: '#64748b', fontSize: 12, textAlign: 'center' },
  msgList: { padding: 16, gap: 8 },
  bubble: {
    maxWidth: '78%', borderRadius: 18, padding: 12, marginVertical: 2,
  },
  myBubble: {
    alignSelf: 'flex-end', backgroundColor: '#ef4444',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: 'flex-start', backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  senderName: { color: '#94a3b8', fontSize: 11, marginBottom: 2, fontWeight: '600' },
  msgText: { color: '#cbd5e1', fontSize: 15, lineHeight: 20 },
  myMsgText: { color: '#fff' },
  time: { color: '#64748b', fontSize: 10, marginTop: 4, textAlign: 'right' },
  myTime: { color: 'rgba(255,255,255,0.6)' },
  empty: { color: '#475569', textAlign: 'center', marginTop: 60, fontSize: 14, paddingHorizontal: 20 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#111118',
  },
  input: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#f8fafc', fontSize: 15, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  sendIcon: { color: '#fff', fontSize: 18 },
});
