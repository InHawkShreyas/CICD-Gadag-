import API from "../utils/client";

// ================= TYPES =================

export type LookupResponse = {
  id: string;
  code?: string;
  name?: string;
  type?: string;
  type2?: string;
  extraInt1?: number;
  extraInt2?: number;
  startDate?: string | null;
  endDate?: string | null;
  extraDescription?: string;
  [key: string]: unknown;
};

export type CreateLookupRequest = {
  code?: string;
  name?: string;
  description?: string;
  type?: string;
  type2?: string;
  extraInt1?: number;
  extraInt2?: number;
  startDate?: string | null;
  endDate?: string | null;
  extraDescription?: string;
};

// ================= API CALLS =================

export const getLookups = async (): Promise<LookupResponse[]> => {
  const res = await API.get<LookupResponse[]>("/Lookup");
  return res.data;
};

export const getLookupsByType = async (
  type: string,
  type2?: string
): Promise<LookupResponse[]> => {
  const url = type2
    ? `/Lookup/type/${type}?type2=${type2}`
    : `/Lookup/type/${type}`;
  const res = await API.get<LookupResponse[]>(url);
  return res.data;
};



// 🔥 CREATE
export const createLookup = async (
  data: CreateLookupRequest
): Promise<LookupResponse> => {
  const res = await API.post<LookupResponse>("/Lookup", data);
  return res.data;
};

export const updateLookup = async (
  id: string,
  data: CreateLookupRequest
): Promise<void> => {
  await API.put(`/Lookup/${id}`, data);
};

export const deleteLookup = async (id: string): Promise<void> => {
  await API.delete(`/Lookup/${id}`);
};