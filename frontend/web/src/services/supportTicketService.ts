import api from "../utils/client";

/* ================= TYPES ================= */

export type SupportTicketMessageResponse = {
  id: string;
  ticketId: string;
  senderType: "student" | "admin";
  senderName?: string;
  message: string;
  insertOn: string;
  updateOn?: string;
  updatedBy?: string;
};

export type SupportTicketResponse = {
  id: string;
  ticketNo: string;
  username: string;
  issueId: string;
  issueName?: string;
  statusId: string;
  statusName?: string;
  solvedBy?: string;
  insertOn: string;
  updateOn?: string;
};

export type SupportTicketDetailResponse = SupportTicketResponse & {
  messages: SupportTicketMessageResponse[];
};

export type CreateSupportTicketDto = {
  username: string;
  issueId: string;
  description: string;
};

export type UpdateSupportTicketStatusDto = {
  statusId: string;
  solvedBy?: string;
  solution?: string;
};

export type CreateSupportTicketMessageDto = {
  ticketId: string;
  senderType: "student" | "admin";
  senderName?: string;
  message: string;
};

export type UpdateSupportTicketMessageDto = {
  message: string;
  updatedBy?: string;
};

/* ================= API ================= */

// ✅ GET ALL (admin console — every ticket)
export const getTickets = async () => {
  const response = await api.get("/support-tickets");
  return response.data as SupportTicketResponse[];
};

// ✅ GET MY TICKETS (student support page — filtered by logged-in username)
export const getMyTickets = async (username: string) => {
  const response = await api.get("/support-tickets", { params: { username } });
  return response.data as SupportTicketResponse[];
};

// ✅ GET BY ID (includes full conversation thread)
export const getTicketById = async (id: string) => {
  const response = await api.get(`/support-tickets/${id}`);
  return response.data as SupportTicketDetailResponse;
};

// ✅ CREATE (student raises a new ticket — "New Ticket" button)
export const createTicket = async (data: CreateSupportTicketDto) => {
  const response = await api.post("/support-tickets", data);
  return response.data as SupportTicketDetailResponse;
};

// ✅ UPDATE STATUS (admin "Send Response" — updates status and/or posts a solution message)
export const updateTicketStatus = async (id: string, data: UpdateSupportTicketStatusDto) => {
  const response = await api.put(`/support-tickets/${id}/status`, data);
  return response.data as SupportTicketDetailResponse;
};

// ✅ ADD MESSAGE (either side replying within an existing conversation)
export const addTicketMessage = async (data: CreateSupportTicketMessageDto) => {
  const response = await api.post("/support-tickets/messages", data);
  return response.data as SupportTicketMessageResponse;
};

// ✅ UPDATE MESSAGE (editing an existing message — records who last edited it)
export const updateTicketMessage = async (messageId: string, data: UpdateSupportTicketMessageDto) => {
  const response = await api.put(`/support-tickets/messages/${messageId}`, data);
  return response.data as SupportTicketMessageResponse;
};