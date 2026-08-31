import api from "../utils/client";

// TYPES
export type Degree = {
  id: string;
  universityId: string;
  degreeName: string;
  duration?: string;
  description?: string;
  degreeTypeId?: string;
};

export type CreateDegreeDto = {
  universityId: string;
  degreeName: string;
  duration?: string;
  description?: string;
  degreeTypeId?: string;
};

export type UpdateDegreeDto = {
  id: string;
  universityId: string;
  degreeName: string;
  duration?: string;
  description?: string;
  degreeTypeId?: string;
};


// ✅ CREATE DEGREE
export const createDegree = async (data: CreateDegreeDto) => {
  const response = await api.post<Degree>("/degree", data);
  return response.data;
};


// ✅ GET ALL
export const getDegrees = async () => {
  const response = await api.get<Degree[]>("/degree");
  return response.data;
};


// ✅ GET BY UNIVERSITY (🔥 important)
export const getDegreesByUniversity = async (universityId: string) => {
  const response = await api.get<Degree[]>(
    `/degree/by-university/${universityId}`
  );
  return response.data;
};


// ✅ GET BY ID
export const getDegreeById = async (id: string) => {
  const response = await api.get<Degree>(`/degree/${id}`);
  return response.data;
};


// ✅ UPDATE DEGREE
export const updateDegree = async (data: UpdateDegreeDto) => {
  const response = await api.put<{ success: boolean }>("/degree", data);
  return response.data;
};


// ✅ SOFT DELETE
export const deleteDegree = async (id: string) => {
  const response = await api.delete<{ success: boolean }>(
    `/degree/${id}`
  );
  return response.data;
};