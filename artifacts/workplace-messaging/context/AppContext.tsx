import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { File } from 'expo-file-system';
import { createConversationMessage } from '@workspace/api-client-react';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { currentUser, conversations as initialConversations, messages as initialMessages, pendingAccounts, staff } from '@/data/mockData';
import { AccountStatus, Conversation, EventResponse, FileAttachment, Message, PendingAccount, PollOption, UserProfile } from '@/types/app';
import { useAuth } from '@/context/AuthContext';
import { getCurrentAccessToken } from '@/context/AuthContext';

interface AppContextValue {
  user: UserProfile;
  staff: UserProfile[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  pending: PendingAccount[];
  isDark: boolean;
  isOnline: boolean;
  queuedMessageCount: number;
  notificationsEnabled: boolean;
  toggleTheme: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  resetLocalData: () => Promise<boolean>;
  sendMessage: (conversationId: string, text: string) => void;
  sendAttachment: (conversationId: string, attachment: FileAttachment) => void;
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
const STORAGE_VERSION = 2;

interface PersistedAppState {
  version: number;
  isDark: boolean;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  pending: PendingAccount[];
  accountStatuses: Record<string, AccountStatus>;
  user: UserProfile;
  queuedMessageIds: string[];
  notificationsEnabled: boolean;
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

function isPermanentDeliveryFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('status' in error)) return false;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 429;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [isDark, setIsDark] = useState(false);
  const [conversationState, setConversationState] = useState(initialConversations);
  const [messageState, setMessageState] = useState(initialMessages);
  const [pendingState, setPendingState] = useState(pendingAccounts);
  const [accountStatusState, setAccountStatusState] = useState<Record<string, AccountStatus>>(getInitialAccountStatuses);
  const [userState, setUserState] = useState(currentUser);
  const [queuedMessageIds, setQueuedMessageIds] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [outboxRetry, setOutboxRetry] = useState(0);
  const deliveryInProgress = useRef(false);
  const messageStateRef = useRef(messageState);
  const queuedMessageIdsRef = useRef(queuedMessageIds);
  const { phase, profile } = useAuth();

  useEffect(() => {
    messageStateRef.current = messageState;
  }, [messageState]);
  useEffect(() => {
    queuedMessageIdsRef.current = queuedMessageIds;
  }, [queuedMessageIds]);

  useEffect(() => {
    let mounted = true;

    const restoreState = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored || !mounted) return;
        const saved = JSON.parse(stored) as Partial<PersistedAppState>;
        if ((saved.version !== 1 && saved.version !== STORAGE_VERSION) || !saved.conversations || !saved.messages || !saved.pending || !saved.accountStatuses || !saved.user) return;
        setIsDark(saved.isDark === true);
        setConversationState(saved.conversations);
        setMessageState(saved.messages);
        setPendingState(saved.pending);
        setAccountStatusState(saved.accountStatuses);
        setUserState(saved.user);
        setQueuedMessageIds(
          Array.isArray(saved.queuedMessageIds)
            ? saved.queuedMessageIds
            : Object.values(saved.messages).flat().filter((message) => message.status === 'queued').map((message) => message.id),
        );
        setNotificationsEnabled(saved.notificationsEnabled === true);
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

  useEffect(() => NetInfo.addEventListener((state) => {
    setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
  }), []);

  useEffect(() => {
    if (!isHydrated || !isOnline || phase !== 'ready') return;
    let active = true;
    const syncServerMessages = async () => {
      const token = getCurrentAccessToken();
      if (!token) return;
      const apiBase = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '';
      const response = await fetch(`${apiBase}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Unable to load workplace conversations.');
      const loaded = await response.json() as { conversations: Array<{ id: string; kind: Conversation['kind']; name: string; description: string; house_reference: string; accent_colour: string | null }> };
      if (!active) return;
      const serverConversations: Conversation[] = loaded.conversations.map((item) => ({
        id: item.id,
        kind: item.kind === 'announcement' ? 'group' : item.kind,
        name: item.name,
        subtitle: item.description || item.house_reference || 'Workplace conversation',
        avatar: item.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        lastMessage: '',
        time: '',
        unread: 0,
        members: [],
        houseReference: item.house_reference,
        description: item.description,
        accent: item.accent_colour ?? undefined,
      }));
      setConversationState(serverConversations);
      const serverMessages = await Promise.all(serverConversations.map(async (conversation) => {
        const messagesResponse = await fetch(`${apiBase}/api/conversations/${encodeURIComponent(conversation.id)}/messages`, { headers: { Authorization: `Bearer ${token}` } });
        if (!messagesResponse.ok) return [conversation.id, []] as const;
        const payload = await messagesResponse.json() as { messages: Array<{ id: string; conversation_id: string; sender_id: string | null; body: string; metadata: { attachment?: FileAttachment }; created_at: string }> };
        return [conversation.id, payload.messages.reverse().map((item): Message => ({
          id: `server-${item.id}`,
          serverMessageId: item.id,
          conversationId: item.conversation_id,
          senderId: item.sender_id ?? 'system',
          text: item.body,
          time: new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          outgoing: item.sender_id === profile?.id,
          status: 'sent',
          attachment: item.metadata?.attachment,
        }))] as const;
      }));
      if (!active) return;
      setMessageState((existing) => {
        const next = { ...existing };
        for (const [conversationId, remote] of serverMessages) {
          const localPending = (existing[conversationId] ?? []).filter((message) => message.status !== 'sent' || !message.serverMessageId);
          next[conversationId] = [...remote, ...localPending.filter((message) => !remote.some((server) => server.serverMessageId === message.serverMessageId || server.id === `server-${message.serverMessageId}`))];
        }
        return next;
      });
    };
    void syncServerMessages().catch((error) => console.warn('Unable to sync workplace messages.', error));
    const interval = setInterval(() => { void syncServerMessages().catch(() => undefined); }, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [isHydrated, isOnline, phase, profile?.id]);

  useEffect(() => {
    if (!isHydrated || !isOnline || phase !== 'ready' || queuedMessageIds.length === 0 || deliveryInProgress.current) return;
    const queuedIds = new Set(queuedMessageIds);
    const pendingMessages = Object.values(messageStateRef.current).flat().filter((message) => queuedIds.has(message.id));
    if (!pendingMessages.length) {
      setQueuedMessageIds([]);
      return;
    }

    deliveryInProgress.current = true;
    const flushOutbox = async () => {
      for (const message of pendingMessages) {
        setMessageState((existing) => Object.fromEntries(Object.entries(existing).map(([conversationId, items]) => [
          conversationId,
          items.map((item) => item.id === message.id ? { ...item, status: 'queued', deliveryError: undefined } : item),
        ])));
        try {
          let storagePath: string | undefined;
          if (message.attachment?.type === 'image' || message.attachment?.type === 'document') {
            storagePath = message.attachment.storagePath;
          }
          if ((message.attachment?.type === 'image' || message.attachment?.type === 'document') && !storagePath) {
            if (!message.attachment.uri) {
              throw new Error('Attachment data is unavailable on this device.');
            }
            const source = new File(message.attachment.uri);
            const size = source.size;
            if (size <= 0 || size > 25 * 1024 * 1024) {
              throw new Error('Attachments must be smaller than 25 MB.');
            }
            const token = getCurrentAccessToken();
            if (!token) throw new Error('Your session has ended. Please sign in again.');
            const apiBase = process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : '';
            const upload = await fetch(
              `${apiBase}/api/conversations/${encodeURIComponent(message.conversationId)}/attachments/${encodeURIComponent(message.id)}`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': message.attachment.mimeType || 'application/octet-stream',
                  'X-Attachment-Name': message.attachment.name,
                },
                body: await source.arrayBuffer(),
              },
            );
            if (!upload.ok) throw new Error('Attachment upload is waiting to retry.');
            const uploaded = await upload.json() as { storagePath?: unknown };
            if (typeof uploaded.storagePath !== 'string') throw new Error('Attachment storage did not return a file reference.');
            storagePath = uploaded.storagePath;
            setMessageState((existing) => Object.fromEntries(Object.entries(existing).map(([conversationId, items]) => [
              conversationId,
              items.map((item) => item.id === message.id && item.attachment && (item.attachment.type === 'image' || item.attachment.type === 'document')
                ? { ...item, attachment: { ...item.attachment, storagePath } }
                : item),
            ])));
          }
          const result = await createConversationMessage(message.conversationId, {
            body: message.text,
            clientMessageId: message.id,
            ...(message.attachment?.type === 'image' || message.attachment?.type === 'document'
              ? {
                  attachment: {
                    type: message.attachment.type,
                    name: message.attachment.name,
                    mimeType: message.attachment.mimeType ?? null,
                    size: message.attachment.size ?? null,
                    storagePath,
                  },
                }
              : {}),
          });
          setMessageState((existing) => Object.fromEntries(Object.entries(existing).map(([conversationId, items]) => [
            conversationId,
            items.map((item) => item.id === message.id
              ? { ...item, status: 'sent', serverMessageId: result.message.id, deliveryError: undefined }
              : item),
          ])));
          setQueuedMessageIds((existing) => existing.filter((id) => id !== message.id));
        } catch (error) {
          const messageText = error instanceof Error ? error.message : 'Waiting to retry delivery.';
          const permanentlyRejected = isPermanentDeliveryFailure(error);
          setMessageState((existing) => Object.fromEntries(Object.entries(existing).map(([conversationId, items]) => [
            conversationId,
            items.map((item) => item.id === message.id
              ? { ...item, status: permanentlyRejected ? 'failed' : 'queued', deliveryError: messageText }
              : item),
          ])));
          if (permanentlyRejected) {
            setQueuedMessageIds((existing) => existing.filter((id) => id !== message.id));
          }
        }
      }
      deliveryInProgress.current = false;
      if (queuedMessageIdsRef.current.length > 0) {
        setTimeout(() => setOutboxRetry((value) => value + 1), 10_000);
      }
    };
    void flushOutbox();
  }, [isHydrated, isOnline, outboxRetry, phase, queuedMessageIds]);

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
      queuedMessageIds,
      notificationsEnabled,
    };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch((error) => {
      console.warn('Unable to save local workplace data.', error);
    });
  }, [accountStatusState, conversationState, isDark, isHydrated, messageState, notificationsEnabled, pendingState, queuedMessageIds, userState]);

  const value = useMemo<AppContextValue>(() => ({
    user: userState,
    staff,
    conversations: conversationState,
    messages: messageState,
    pending: pendingState,
    isDark,
    isOnline,
    queuedMessageCount: queuedMessageIds.length,
    notificationsEnabled,
    toggleTheme: () => setIsDark((value) => !value),
    setNotificationsEnabled,
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
      setQueuedMessageIds([]);
      setNotificationsEnabled(false);
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
      const next: Message = { id: createLocalId('message'), conversationId, senderId: 'me', text, time: 'Now', outgoing: true, status: 'queued' };
      setMessageState((existing) => ({ ...existing, [conversationId]: [...(existing[conversationId] ?? []), next] }));
      setConversationState((existing) => existing.map((conversation) => conversation.id === conversationId ? { ...conversation, lastMessage: text, time: 'Now' } : conversation));
      setQueuedMessageIds((existing) => [...existing, next.id]);
    },
    sendAttachment: (conversationId, attachment) => {
      const description = attachment.type === 'image' ? `Photo: ${attachment.name}` : `Document: ${attachment.name}`;
      const next: Message = {
        id: createLocalId('attachment'),
        conversationId,
        senderId: 'me',
        text: description,
        time: 'Now',
        outgoing: true,
        status: 'queued',
        attachment,
      };
      setMessageState((existing) => ({ ...existing, [conversationId]: [...(existing[conversationId] ?? []), next] }));
      setConversationState((existing) => existing.map((conversation) => conversation.id === conversationId ? { ...conversation, lastMessage: description, time: 'Now' } : conversation));
      setQueuedMessageIds((existing) => [...existing, next.id]);
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
  }), [accountStatusState, conversationState, isDark, isOnline, messageState, notificationsEnabled, pendingState, queuedMessageIds.length, userState]);

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