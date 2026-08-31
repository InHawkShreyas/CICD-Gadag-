import api from "../utils/client";

/* ================= TYPES ================= */

export type AcademicDate = {
  status: boolean;
  id: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
};

export type CreateAcademicDateDto = {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
};

export type UpdateAcademicDateDto = {
  id: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
};

/* ================= CREATE ================= */

export const createAcademicDate = async (
  data: CreateAcademicDateDto
) => {
  const response = await api.post<AcademicDate>(
    "/AcademicDate",
    data
  );
  return response.data;
};

/* ================= GET ALL ================= */

export const getAcademicDates = async () => {
  const response = await api.get<AcademicDate[]>(
    "/AcademicDate"
  );
  return response.data;
};

/* ================= GET BY ID ================= */

export const getAcademicDateById = async (id: string) => {
  const response = await api.get<AcademicDate>(
    `/AcademicDate/${id}`
  );
  return response.data;
};

/* ================= UPDATE ================= */

export const updateAcademicDate = async (
  data: UpdateAcademicDateDto
) => {
  const response = await api.put<{ success: boolean }>(
    "/AcademicDate",
    data
  );
  return response.data;
};

/* ================= DELETE ================= */

export const deleteAcademicDate = async (id: string) => {
  const response = await api.delete<{ success: boolean }>(
    `/AcademicDate/${id}`
  );
  return response.data;
};