import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';
import { MessageSquare, Send, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ChatMessage, Profile } from '../../types';

export const Chat = () => {
  const { user } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const query = supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!sender_id(username, avatar_url)
        `)
        .order('created_at', { ascending: true });

      if (selectedUser) {
        query.or(`and(sender_id.eq.${user?.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user?.id})`);
      } else {
        query.is('receiver_id', null);
      }

      const { data } = await query;
      if (data) setMessages(data);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (
            (!selectedUser && !newMessage.receiver_id) ||
            (selectedUser &&
              ((newMessage.sender_id === user?.id && newMessage.receiver_id === selectedUser.id) ||
                (newMessage.sender_id === selectedUser.id && newMessage.receiver_id === user?.id)))
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser, user?.id]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;

    const message = {
      sender_id: user.id,
      receiver_id: selectedUser?.id || null,
      message: newMessage.trim(),
      is_global: !selectedUser,
    };

    const { error } = await supabase.from('chat_messages').insert([message]);

    if (!error) {
      setNewMessage('');
    }
  };

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">Please sign in to chat</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-4 z-50 w-96">
      <div className="rounded-t-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">
              {selectedUser ? `Chat with ${selectedUser.username}` : 'Global Chat'}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUser(null)}
              className={!selectedUser ? 'bg-blue-50 text-blue-600' : ''}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {/* Toggle users list */}}
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="h-96 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender_id === user.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.sender_id === user.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  {message.sender_id !== user.id && (
                    <p className="mb-1 text-xs font-medium text-gray-500">
                      {message.sender?.username}
                    </p>
                  )}
                  <p>{message.message}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <Button onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};