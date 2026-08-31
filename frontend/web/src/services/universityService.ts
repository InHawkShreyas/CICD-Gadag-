import api from "../utils/client";

// TYPES
export type University = {
  id: string;
  name: string;
  address?: string;
  phoneNo?: string;
  email?: string;
};

export type CreateUniversityDto = {
  name: string;
  address?: string;
  phoneNo?: string;
  email?: string;
};

export type UpdateUniversityDto = {
  id: string;
  name: string;
  address?: string;
  phoneNo?: string;
  email?: string;
};


// ✅ CREATE UNIVERSITY
export const createUniversity = async (data: CreateUniversityDto) => {
  const response = await api.post<University>("/university", data);
  return response.data;
};


// ✅ GET ALL UNIVERSITIES
export const getUniversities = async () => {
  const response = await api.get<University[]>("/university");
  return response.data;
};


// ✅ GET BY ID
export const getUniversityById = async (id: string) => {
  const response = await api.get<University>(`/university/${id}`);
  return response.data;
};


// ✅ UPDATE UNIVERSITY
export const updateUniversity = async (data: UpdateUniversityDto) => {
  const response = await api.put<{ success: boolean }>("/university", data);
  return response.data;
};


// ✅ SOFT DELETE
export const deleteUniversity = async (id: string) => {
  const response = await api.delete<{ success: boolean }>(
    `/university/${id}`
  );
  return response.data;
};