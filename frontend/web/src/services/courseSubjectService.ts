import api from "../utils/client";

/* ================= TYPES ================= */

export type CourseSubject = {
  id: string;
  degreeId: string;
  courseId: string;
  semId: string;
  subjectId: string;
};

export type CreateCourseSubjectDto = {
  degreeId: string;
  courseId: string;
  semId: string;
  subjectId: string;
};

export type UpdateCourseSubjectDto = {
  id: string;
  degreeId: string;
  courseId: string;
  semId: string;
  subjectId: string;
};

/* ================= CREATE ================= */

export const createCourseSubject = async (
  data: CreateCourseSubjectDto
) => {
  const response = await api.post<CourseSubject>(
    "/CourseSubject",
    data
  );

  return response.data;
};

/* ================= GET ALL ================= */

export const getCourseSubjects = async () => {
  const response = await api.get<CourseSubject[]>(
    "/CourseSubject"
  );

  return response.data;
};

/* ================= GET BY ID ================= */

export const getCourseSubjectById = async (
  id: string
) => {
  const response = await api.get<CourseSubject>(
    `/CourseSubject/${id}`
  );

  return response.data;
};

/* ================= UPDATE ================= */

export const updateCourseSubject = async (
  data: UpdateCourseSubjectDto
) => {
  const response = await api.put<{
    message: string;
  }>(
    "/CourseSubject",
    data
  );

  return response.data;
};

/* ================= DELETE ================= */

export const deleteCourseSubject = async (
  id: string
) => {
  const response = await api.delete<{
    message: string;
  }>(
    `/CourseSubject/${id}`
  );

  return response.data;
};