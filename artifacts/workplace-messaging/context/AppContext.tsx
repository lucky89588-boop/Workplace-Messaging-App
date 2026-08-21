import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
  resetLocalData: () => Promise<boolean>;
  sendMessage: (conversationId: string, text: string) => void;
  requestAccess: (name: string, email: string) => void;
  getAccountStatus: (email: string) => AccountStatus | undefined;
  createGroup: (details: { name: string; houseReference: string; description: string; accent: string; members: string[] }) => string;
  createPoll: (conversationId: string, question: string, options: string[]) => void;
  createEvent: (conversationId: string, event: { title: string; date: string; time: string; location?: string; details?: string }) => void;
  votePoll: (messageId: string, optionId: string) => void;
  respondToEvent: (messageId: string, response: EventResponse) => void;
  approveAccount: (id: string) => void;
  rejectAccount: (id: string) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const STORAGE_KEY = 'workplace:app-state';
const STORAGE_VERSION = 1;

interface PersistedAppState {
  version: number;
  isDark: boolean;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  pending: PendingAccount[];
  accountStatuses: Record<string, AccountStatus>;
  user: UserProfile;
}

function getInitialAccountStatuses(): Record<string, AccountStatus> {
  return {
    [currentUser.email.toLowerCase()]: 'active',
    ...Object.fromEntries(pendingAccounts.map((account) => [account.email.toLowerCase(), 'pending' as AccountStatus])),
  };
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [isDark, setIsDark] = useState(false);
  const [conversationState, setConversationState] = useState(initialConversations);
  const [messageState, setMessageState] = useState(initialMessages);
  const [pendingState, setPendingState] = useState(pendingAccounts);
  const [accountStatusState, setAccountStatusState] = useState<Record<string, AccountStatus>>(getInitialAccountStatuses);
  const [userState, setUserState] = useState(currentUser);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const restoreState = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored || !mounted) return;
        const saved = JSON.parse(stored) as Partial<PersistedAppState>;
        if (saved.version !== STORAGE_VERSION || !saved.conversations || !saved.messages || !saved.pending || !saved.accountStatuses || !saved.user) return;
        setIsDark(saved.isDark === true);
        setConversationState(saved.conversations);
        setMessageState(saved.messages);
        setPendingState(saved.pending);
        setAccountStatusState(saved.accountStatuses);
        setUserState(saved.user);
      } catch (error) {
        console.warn('Unable to restore local workplace data.', error);
      } finally {
        if (mounted) setIsHydrated(true);
      }
    };

    void restoreState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const snapshot: PersistedAppState = {
      version: STORAGE_VERSION,
      isDark,
      conversations: conversationState,
      messages: messageState,
      pending: pendingState,
      accountStatuses: accountStatusState,
      user: userState,
    };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch((error) => {
      console.warn('Unable to save local workplace data.', error);
    });
  }, [accountStatusState, conversationState, isDark, isHydrated, messageState, pendingState, userState]);

  const value = useMemo<AppContextValue>(() => ({
    user: userState,
    staff,
    conversations: conversationState,
    messages: messageState,
    pending: pendingState,
    isDark,
    toggleTheme: () => setIsDark((value) => !value),
    resetLocalData: async () => {
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Unable to reset local workplace data.', error);
        return false;
      }
      setIsDark(false);
      setConversationState(initialConversations);
      setMessageState(initialMessages);
      setPendingState(pendingAccounts);
      setAccountStatusState(getInitialAccountStatuses());
      setUserState(currentUser);
      return true;
    },
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
    createGroup: ({ name, houseReference, description, accent, members }) => {
      const id = createLocalId('group');
      const memberIds = ['me', ...members.filter((member) => member !== 'me')];
      const nextConversation: Conversation = {
        id,
        kind: 'group',
        name,
        subtitle: `${memberIds.length} members${houseReference ? ` · ${houseReference}` : ''}`,
        avatar: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        lastMessage: 'Group created. Start the conversation.',
        time: 'Now',
        unread: 0,
        members: memberIds,
        houseReference,
        description,
        accent,
      };
      setConversationState((existing) => [nextConversation, ...existing]);
      setMessageState((existing) => ({ ...existing, [id]: [] }));
      return id;
    },
    sendMessage: (conversationId, text) => {
      const next: Message = { id: createLocalId('message'), conversationId, senderId: 'me', text, time: 'Now', outgoing: true, status: 'sent' };
      setMessageState((existing) => ({ ...existing, [conversationId]: [...(existing[conversationId] ?? []), next] }));
      setConversationState((existing) => existing.map((conversation) => conversation.id === conversationId ? { ...conversation, lastMessage: text, time: 'Now' } : conversation));
    },
    createPoll: (conversationId, question, options) => {
      const pollOptions: PollOption[] = options.map((label, index) => ({ id: `option-${index}-${Date.now()}`, label, votes: 0 }));
      const next: Message = {
        id: createLocalId('poll'),
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
        id: createLocalId('event'),
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

  return <AppContext.Provider value={value}>{isHydrated ? children : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}

export async function persistPreference(key: string, value: string) {
  await AsyncStorage.setItem(`workplace:${key}`, value);
}