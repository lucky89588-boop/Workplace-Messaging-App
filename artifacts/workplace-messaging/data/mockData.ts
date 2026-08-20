import { Conversation, Message, PendingAccount, UserProfile } from '@/types/app';

export const currentUser: UserProfile = {
  id: 'me',
  name: 'Maya Chen',
  email: 'maya.chen@northstar.co',
  title: 'Operations Director',
  department: 'Operations',
  about: 'Making work feel a little more human.',
  avatar: 'MC',
  role: 'admin',
  status: 'active',
};

export const staff: UserProfile[] = [
  currentUser,
  { id: 'alex', name: 'Alex Morgan', email: 'alex.morgan@northstar.co', title: 'Product Designer', department: 'Design', about: 'Designing calm, clear experiences.', avatar: 'AM', role: 'staff', status: 'active', lastActive: 'Online now' },
  { id: 'riley', name: 'Riley Jones', email: 'riley.jones@northstar.co', title: 'People & Culture Lead', department: 'People', about: 'Here to help the team do their best work.', avatar: 'RJ', role: 'manager', status: 'active', lastActive: 'Active 12m ago' },
  { id: 'sam', name: 'Sam Wilson', email: 'sam.wilson@northstar.co', title: 'Warehouse Coordinator', department: 'Operations', about: 'Coffee, logistics, and good systems.', avatar: 'SW', role: 'staff', status: 'active', lastActive: 'Active 1h ago' },
  { id: 'jordan', name: 'Jordan Lee', email: 'jordan.lee@northstar.co', title: 'Finance Manager', department: 'Finance', about: 'Keeping the numbers moving.', avatar: 'JL', role: 'manager', status: 'active', lastActive: 'Active yesterday' },
];

export const conversations: Conversation[] = [
  { id: 'announcements', kind: 'announcement', name: 'Company Announcements', subtitle: 'Broadcast channel', avatar: 'AN', lastMessage: 'Q3 all-hands is next Thursday at 10am.', time: '9:42 AM', unread: 2, important: true, pinned: true },
  { id: 'alex-chat', kind: 'direct', name: 'Alex Morgan', subtitle: 'Product Designer', avatar: 'AM', lastMessage: 'The new screens are ready for review.', time: '9:18 AM', unread: 3 },
  { id: 'ops', kind: 'group', name: 'Operations team', subtitle: '8 members', avatar: 'OP', lastMessage: 'Sam: Delivery window moved to Friday.', time: 'Yesterday', unread: 0, members: ['me', 'sam', 'riley'] },
  { id: 'leadership', kind: 'group', name: 'Leadership circle', subtitle: '5 members', avatar: 'LC', lastMessage: 'Riley: I have added the agenda.', time: 'Tue', unread: 0, members: ['me', 'riley', 'jordan'] },
];

export const messages: Record<string, Message[]> = {
  announcements: [
    { id: 'a1', conversationId: 'announcements', senderId: 'riley', text: 'Q3 all-hands is next Thursday at 10am. We’ll share progress, priorities, and a few team celebrations.', time: '9:42 AM' },
    { id: 'a2', conversationId: 'announcements', senderId: 'riley', text: 'Please add your questions to the shared agenda before Wednesday afternoon.', time: '9:44 AM' },
  ],
  'alex-chat': [
    { id: 'm1', conversationId: 'alex-chat', senderId: 'me', text: 'How are the new onboarding screens feeling?', time: '9:08 AM', outgoing: true, status: 'read' },
    { id: 'm2', conversationId: 'alex-chat', senderId: 'alex', text: 'Much better. I tightened the first-time flow and softened the empty states.', time: '9:12 AM' },
    { id: 'm3', conversationId: 'alex-chat', senderId: 'alex', text: 'The new screens are ready for review.', time: '9:18 AM' },
  ],
  ops: [
    { id: 'o1', conversationId: 'ops', senderId: 'sam', text: 'Quick update: delivery window moved to Friday.', time: 'Yesterday' },
    { id: 'o2', conversationId: 'ops', senderId: 'me', text: 'Thanks Sam — I’ll update the supplier notes.', time: 'Yesterday', outgoing: true, status: 'delivered' },
  ],
  leadership: [
    { id: 'l1', conversationId: 'leadership', senderId: 'riley', text: 'I have added the agenda for Tuesday.', time: 'Tue' },
  ],
};

export const pendingAccounts: PendingAccount[] = [
  { id: 'pending-1', name: 'Taylor Reed', email: 'taylor.reed@northstar.co', requestedRole: 'Staff member', date: '21 Aug 2026', avatar: 'TR' },
  { id: 'pending-2', name: 'Casey Patel', email: 'casey.patel@northstar.co', requestedRole: 'Team lead', date: '20 Aug 2026', avatar: 'CP' },
];