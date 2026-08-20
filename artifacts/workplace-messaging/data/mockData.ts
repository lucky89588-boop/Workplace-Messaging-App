import { Conversation, Message, PendingAccount, UserProfile } from '@/types/app';

export const currentUser: UserProfile = {
  id: 'me',
  name: 'Maya Chen',
  email: 'maya.chen@bridgingabilities.com.au',
  title: 'Service Delivery Manager',
  department: 'Service Delivery',
  about: 'Supporting clear, safe communication across our services.',
  avatar: 'MC',
  role: 'admin',
  status: 'active',
};

export const staff: UserProfile[] = [
  currentUser,
  { id: 'alex', name: 'Alex Morgan', email: 'alex.morgan@bridgingabilities.com.au', title: 'Support Worker', department: 'Supported Independent Living', about: 'Helping people build confident, connected lives.', avatar: 'AM', role: 'staff', status: 'active', lastActive: 'Online now' },
  { id: 'riley', name: 'Riley Jones', email: 'riley.jones@bridgingabilities.com.au', title: 'People & Culture Lead', department: 'People & Culture', about: 'Here to help the team do their best work.', avatar: 'RJ', role: 'manager', status: 'active', lastActive: 'Active 12m ago' },
  { id: 'sam', name: 'Sam Wilson', email: 'sam.wilson@bridgingabilities.com.au', title: 'Senior Support Worker', department: 'Supported Independent Living', about: 'Keeping each shift safe, clear, and connected.', avatar: 'SW', role: 'staff', status: 'active', lastActive: 'Active 1h ago' },
  { id: 'jordan', name: 'Jordan Lee', email: 'jordan.lee@bridgingabilities.com.au', title: 'Operations Manager', department: 'Operations', about: 'Supporting reliable, person-centred service delivery.', avatar: 'JL', role: 'manager', status: 'active', lastActive: 'Active yesterday' },
];

export const conversations: Conversation[] = [
  { id: 'announcements', kind: 'announcement', name: 'Organisation Announcements', subtitle: 'Broadcast channel', avatar: 'AN', lastMessage: 'Staff forum is next Thursday at 10am.', time: '9:42 AM', unread: 2, important: true, pinned: true },
  { id: 'alex-chat', kind: 'direct', name: 'Alex Morgan', subtitle: 'Support Worker', avatar: 'AM', lastMessage: 'I have finished the handover notes.', time: '9:18 AM', unread: 3 },
  { id: 'ops', kind: 'group', name: 'Ashfield House team', subtitle: '3 members · ASH-01', avatar: 'AH', lastMessage: 'Sam: Handover notes are ready for Friday.', time: 'Yesterday', unread: 0, members: ['me', 'sam', 'riley'] },
  { id: 'leadership', kind: 'group', name: 'Leadership team', subtitle: '3 members', avatar: 'LT', lastMessage: 'Riley: I have added the agenda.', time: 'Tue', unread: 0, members: ['me', 'riley', 'jordan'] },
];

export const messages: Record<string, Message[]> = {
  announcements: [
    { id: 'a1', conversationId: 'announcements', senderId: 'riley', text: 'Our next staff forum is Thursday at 10am. We will share service updates, priorities, and team celebrations.', time: '9:42 AM' },
    { id: 'a2', conversationId: 'announcements', senderId: 'riley', text: 'Please add your questions to the shared agenda before Wednesday afternoon.', time: '9:44 AM' },
  ],
  'alex-chat': [
    { id: 'm1', conversationId: 'alex-chat', senderId: 'me', text: 'How did the afternoon shift handover go?', time: '9:08 AM', outgoing: true, status: 'read' },
    { id: 'm2', conversationId: 'alex-chat', senderId: 'alex', text: 'Really smoothly. The notes are complete and the team is across the plan.', time: '9:12 AM' },
    { id: 'm3', conversationId: 'alex-chat', senderId: 'alex', text: 'I have finished the handover notes.', time: '9:18 AM' },
  ],
  ops: [
    { id: 'o1', conversationId: 'ops', senderId: 'sam', text: 'Quick update: handover notes are ready for Friday.', time: 'Yesterday' },
    { id: 'o2', conversationId: 'ops', senderId: 'me', text: 'Thanks Sam — I will update the shift notes.', time: 'Yesterday', outgoing: true, status: 'delivered' },
  ],
  leadership: [
    { id: 'l1', conversationId: 'leadership', senderId: 'riley', text: 'I have added the agenda for Tuesday.', time: 'Tue' },
  ],
};

export const pendingAccounts: PendingAccount[] = [
  { id: 'pending-1', name: 'Taylor Reed', email: 'taylor.reed@bridgingabilities.com.au', requestedRole: 'Support worker', date: '21 Aug 2026', avatar: 'TR' },
  { id: 'pending-2', name: 'Casey Patel', email: 'casey.patel@bridgingabilities.com.au', requestedRole: 'Team leader', date: '20 Aug 2026', avatar: 'CP' },
];