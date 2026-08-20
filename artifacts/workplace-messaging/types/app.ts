export type Role = 'admin' | 'manager' | 'staff';
export type AccountStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type ConversationKind = 'direct' | 'group' | 'announcement';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  about: string;
  avatar: string;
  role: Role;
  status: AccountStatus;
  lastActive?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  time: string;
  outgoing?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  attachment?: PollAttachment | EventAttachment;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface PollAttachment {
  type: 'poll';
  question: string;
  options: PollOption[];
  selectedOptionId?: string;
}

export type EventResponse = 'going' | 'maybe' | 'not-going';

export interface EventAttachment {
  type: 'event';
  title: string;
  date: string;
  time: string;
  location?: string;
  details?: string;
  responseCounts: Record<EventResponse, number>;
  selectedResponse?: EventResponse;
}

export interface Conversation {
  id: string;
  kind: ConversationKind;
  name: string;
  subtitle: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  important?: boolean;
  members?: string[];
  muted?: boolean;
  pinned?: boolean;
}

export interface PendingAccount {
  id: string;
  name: string;
  email: string;
  requestedRole: string;
  date: string;
  avatar: string;
}