import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { currentUser, conversations as initialConversations, messages as initialMessages, pendingAccounts, staff } from '@/data/mockData';
import { AccountStatus, Conversation, Message, PendingAccount, UserProfile } from '@/types/app';

interface AppContextValue {
  user: UserProfile;
  staff: UserProfile[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  pending: PendingAccount[];
  isDark: boolean;
  toggleTheme: () => void;
  sendMessage: (conversationId: string, text: string) => void;
  approveAccount: (id: string) => void;
  rejectAccount: (id: string) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [isDark, setIsDark] = useState(false);
  const [conversationState, setConversationState] = useState(initialConversations);
  const [messageState, setMessageState] = useState(initialMessages);
  const [pendingState, setPendingState] = useState(pendingAccounts);
  const [userState, setUserState] = useState(currentUser);

  const value = useMemo<AppContextValue>(() => ({
    user: userState,
    staff,
    conversations: conversationState,
    messages: messageState,
    pending: pendingState,
    isDark,
    toggleTheme: () => setIsDark((value) => !value),
    sendMessage: (conversationId, text) => {
      const next: Message = { id: `${Date.now()}`, conversationId, senderId: 'me', text, time: 'Now', outgoing: true, status: 'sent' };
      setMessageState((existing) => ({ ...existing, [conversationId]: [...(existing[conversationId] ?? []), next] }));
      setConversationState((existing) => existing.map((conversation) => conversation.id === conversationId ? { ...conversation, lastMessage: text, time: 'Now' } : conversation));
    },
    approveAccount: (id) => setPendingState((existing) => existing.filter((account) => account.id !== id)),
    rejectAccount: (id) => setPendingState((existing) => existing.filter((account) => account.id !== id)),
    updateUser: (updates) => setUserState((existing) => ({ ...existing, ...updates })),
  }), [conversationState, isDark, messageState, pendingState, userState]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}

export async function persistPreference(key: string, value: string) {
  await AsyncStorage.setItem(`workplace:${key}`, value);
}