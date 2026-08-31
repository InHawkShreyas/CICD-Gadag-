import api from "../utils/client";

/* ================= TYPES ================= */

export type AcademicYear = {
  id: string;
  description?: string;
  batchYear?: string;
  startDate?: string;
  endDate?: string;
  insertBy?: string;
  updateBy?: string;
  insertOn?: string;
  updateOn?: string;
  status?: boolean;
};

export type CreateAcademicYearDto = {
  description?: string;
  batchYear?: string;
  startDate?: string;
  endDate?: string;
};

export type UpdateAcademicYearDto = {
  id: string;
  description?: string;
  batchYear?: string;
  startDate?: string;
  endDate?: string;
};

/* ================= CREATE ================= */

export const createAcademicYear = async (
  data: CreateAcademicYearDto
) => {
  const response = await api.post<AcademicYear>(
    "/AcademicYear",
    data
  );
  return response.data;
};

/* ================= GET ALL ================= */

export const getAcademicYears = async () => {
  const response = await api.get<AcademicYear[]>(
    "/AcademicYear"
  );
  return response.data;
};

/* ================= GET BY ID ================= */

export const getAcademicYearById = async (id: string) => {
  const response = await api.get<AcademicYear>(
    `/AcademicYear/${id}`
  );
  return response.data;
};

/* ================= UPDATE ================= */

export const updateAcademicYear = async (
  data: UpdateAcademicYearDto
) => {
  const response = await api.put<{ success: boolean }>(
    "/AcademicYear",
    data
  );
  return response.data;
};

/* ================= DELETE ================= */

export const deleteAcademicYear = async (id: string) => {
  const response = await api.delete<{ success: boolean }>(
    `/AcademicYear/${id}`
  );
  return response.data;
};