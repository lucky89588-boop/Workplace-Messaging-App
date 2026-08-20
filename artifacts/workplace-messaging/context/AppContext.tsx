import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { currentUser, conversations as initialConversations, messages as initialMessages, pendingAccounts, staff } from '@/data/mockData';
import { AccountStatus, Conversation, EventResponse, Message, PendingAccount, PollOption, UserProfile } from '@/types/app';

interface AppContextValue {
  user: UserProfile;
  staff: UserProfile[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  pending: PendingAccount[];
  isDark: boolean;
  toggleTheme: () => void;
  sendMessage: (conversationId: string, text: string) => void;
  requestAccess: (name: string, email: string) => void;
  getAccountStatus: (email: string) => AccountStatus | undefined;
  createPoll: (conversationId: string, question: string, options: string[]) => void;
  createEvent: (conversationId: string, event: { title: string; date: string; time: string; location?: string; details?: string }) => void;
  votePoll: (messageId: string, optionId: string) => void;
  respondToEvent: (messageId: string, response: EventResponse) => void;
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
  const [accountStatusState, setAccountStatusState] = useState<Record<string, AccountStatus>>(() => ({
    [currentUser.email.toLowerCase()]: 'active',
    ...Object.fromEntries(pendingAccounts.map((account) => [account.email.toLowerCase(), 'pending' as AccountStatus])),
  }));
  const [userState, setUserState] = useState(currentUser);

  const value = useMemo<AppContextValue>(() => ({
    user: userState,
    staff,
    conversations: conversationState,
    messages: messageState,
    pending: pendingState,
    isDark,
    toggleTheme: () => setIsDark((value) => !value),
    requestAccess: (name, email) => {
      const id = `request-${Date.now()}`;
      const next: PendingAccount = {
        id,
        name,
        email,
        requestedRole: 'Staff member',
        date: 'Today',
        avatar: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      };
      setPendingState((existing) => [...existing, next]);
      setAccountStatusState((existing) => ({ ...existing, [email.toLowerCase()]: 'pending' }));
    },
    getAccountStatus: (email) => accountStatusState[email.trim().toLowerCase()],
    sendMessage: (conversationId, text) => {
      const next: Message = { id: `${Date.now()}`, conversationId, senderId: 'me', text, time: 'Now', outgoing: true, status: 'sent' };
      setMessageState((existing) => ({ ...existing, [conversationId]: [...(existing[conversationId] ?? []), next] }));
      setConversationState((existing) => existing.map((conversation) => conversation.id === conversationId ? { ...conversation, lastMessage: text, time: 'Now' } : conversation));
    },
    createPoll: (conversationId, question, options) => {
      const pollOptions: PollOption[] = options.map((label, index) => ({ id: `option-${index}-${Date.now()}`, label, votes: 0 }));
      const next: Message = {
        id: `poll-${Date.now()}`,
        conversationId,
        senderId: 'me',
        text: `Poll: ${question}`,
        time: 'Now',
        outgoing: true,
        status: 'sent',
        attachment: { type: 'poll', question, options: pollOptions },
      };
      setMessageState((existing) => ({ ...existing, [conversationId]: [...(existing[conversationId] ?? []), next] }));
      setConversationState((existing) => existing.map((conversation) => conversation.id === conversationId ? { ...conversation, lastMessage: `Poll: ${question}`, time: 'Now' } : conversation));
    },
    createEvent: (conversationId, event) => {
      const next: Message = {
        id: `event-${Date.now()}`,
        conversationId,
        senderId: 'me',
        text: `Event: ${event.title}`,
        time: 'Now',
        outgoing: true,
        status: 'sent',
        attachment: { type: 'event', ...event, responseCounts: { going: 0, maybe: 0, 'not-going': 0 } },
      };
      setMessageState((existing) => ({ ...existing, [conversationId]: [...(existing[conversationId] ?? []), next] }));
      setConversationState((existing) => existing.map((conversation) => conversation.id === conversationId ? { ...conversation, lastMessage: `Event: ${event.title}`, time: 'Now' } : conversation));
    },
    votePoll: (messageId, optionId) => setMessageState((existing) => {
      const nextMessages = Object.fromEntries(Object.entries(existing).map(([conversationId, conversationMessages]) => [conversationId, conversationMessages.map((message) => {
        if (message.id !== messageId || message.attachment?.type !== 'poll') return message;
        const previousOptionId = message.attachment.selectedOptionId;
        if (previousOptionId === optionId) return message;
        return {
          ...message,
          attachment: {
            ...message.attachment,
            selectedOptionId: optionId,
            options: message.attachment.options.map((option) => ({
              ...option,
              votes: option.votes + (option.id === optionId ? 1 : option.id === previousOptionId ? -1 : 0),
            })),
          },
        };
      })]));
      return nextMessages;
    }),
    respondToEvent: (messageId, response) => setMessageState((existing) => {
      const nextMessages = Object.fromEntries(Object.entries(existing).map(([conversationId, conversationMessages]) => [conversationId, conversationMessages.map((message) => {
        if (message.id !== messageId || message.attachment?.type !== 'event') return message;
        const previousResponse = message.attachment.selectedResponse;
        if (previousResponse === response) return message;
        return {
          ...message,
          attachment: {
            ...message.attachment,
            selectedResponse: response,
            responseCounts: {
              ...message.attachment.responseCounts,
              [response]: message.attachment.responseCounts[response] + 1,
              ...(previousResponse ? { [previousResponse]: message.attachment.responseCounts[previousResponse] - 1 } : {}),
            },
          },
        };
      })]));
      return nextMessages;
    }),
    approveAccount: (id) => setPendingState((existing) => {
      const account = existing.find((item) => item.id === id);
      if (account) setAccountStatusState((statuses) => ({ ...statuses, [account.email.toLowerCase()]: 'active' }));
      return existing.filter((account) => account.id !== id);
    }),
    rejectAccount: (id) => setPendingState((existing) => {
      const account = existing.find((item) => item.id === id);
      if (account) setAccountStatusState((statuses) => ({ ...statuses, [account.email.toLowerCase()]: 'rejected' }));
      return existing.filter((account) => account.id !== id);
    }),
    updateUser: (updates) => setUserState((existing) => ({ ...existing, ...updates })),
  }), [accountStatusState, conversationState, isDark, messageState, pendingState, userState]);

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