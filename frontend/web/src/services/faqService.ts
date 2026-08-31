import api from "../utils/client";

/* ================= TYPES ================= */

export type FaqResponse = {
  id: string;
  category: string;
  question: string;
  answer: string;
  active: boolean;
  insertBy?: string;
  insertOn?: string;
};

export type CreateFaqDto = {
  category: string;
  question: string;
  answer: string;
  insertBy?: string;
};

export type UpdateFaqDto = {
  category: string;
  question: string;
  answer: string;
};



export const getFaqs = async (includeInactive = false) => {
  const response = await api.get("/Faqs", { params: { includeInactive } });
  return response.data as FaqResponse[];
};

// ✅ GET BY ID
export const getFaqById = async (id: string) => {
  const response = await api.get(`/Faqs/${id}`);
  return response.data as FaqResponse;
};

// ✅ CREATE
export const createFaq = async (data: CreateFaqDto) => {
  const response = await api.post("/Faqs", data);
  return response.data as FaqResponse;
};

// ✅ UPDATE
export const updateFaq = async (id: string, data: UpdateFaqDto) => {
  const response = await api.put(`/Faqs/${id}`, data);
  return response.data as FaqResponse;
};

// ✅ TOGGLE ACTIVE
export const toggleFaqActive = async (id: string) => {
  await api.patch(`/Faqs/${id}/toggle-active`);
};

// ✅ DELETE
export const deleteFaq = async (id: string) => {
  await api.delete(`/Faqs/${id}`);
};