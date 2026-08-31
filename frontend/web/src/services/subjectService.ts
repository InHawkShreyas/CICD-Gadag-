import api from "../utils/client";

/* ================= TYPES ================= */

export type Subject = {
  id: string;
  name: string;
  code: string;
  maxMarks: number;
  minMarks: number;
};

export type CreateSubjectDto = {
  name: string;
  code: string;
  maxMarks: number;
  minMarks: number;
};

export type UpdateSubjectDto = {
  id: string;
  name: string;
  code: string;
  maxMarks: number;
  minMarks: number;
};

/* ================= CREATE ================= */

export const createSubject = async (
  data: CreateSubjectDto
) => {
  const response = await api.post<Subject>(
    "/Subject",
    data
  );

  return response.data;
};

/* ================= GET ALL ================= */

export const getSubjects = async () => {
  const response = await api.get<Subject[]>(
    "/Subject"
  );

  return response.data;
};

/* ================= GET BY ID ================= */

export const getSubjectById = async (
  id: string
) => {
  const response = await api.get<Subject>(
    `/Subject/${id}`
  );

  return response.data;
};

/* ================= UPDATE ================= */

export const updateSubject = async (
  data: UpdateSubjectDto
) => {
  const response = await api.put<{
    message: string;
  }>(
    "/Subject",
    data
  );

  return response.data;
};

/* ================= DELETE ================= */

export const deleteSubject = async (
  id: string
) => {
  const response = await api.delete<{
    message: string;
  }>(
    `/Subject/${id}`
  );

  return response.data;
};