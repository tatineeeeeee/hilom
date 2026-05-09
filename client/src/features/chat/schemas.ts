export interface Conversation {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface MessagesPage {
  messages: Message[];
  hasMore: boolean;
}

export interface ConversationListItem {
  id: string;
  appointmentId: string;
  otherPartyId: string;
  otherPartyName: string;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ConversationsResponse {
  conversations: ConversationListItem[];
  total: number;
  page: number;
  pageSize: number;
}
