import api from "../utils/client";

// TYPES
export type Course = {
  id: string;
  degreeId: string;
  name: string;
  code?: string;
  totalSeats: number;
};

export type CreateCourseDto = {
  degreeId: string;
  name: string;
  code?: string;
  totalSeats: number;
};

export type UpdateCourseDto = {
  id: string;
  degreeId: string;
  name: string;
  code?: string;
  totalSeats: number;
};


// ✅ CREATE COURSE
export const createCourse = async (data: CreateCourseDto) => {
  const response = await api.post<Course>("/courses", data);
  return response.data;
};


// ✅ GET ALL COURSES
export const getCourses = async () => {
  const response = await api.get<Course[]>("/courses");
  return response.data;
};


// ✅ GET BY ID
export const getCourseById = async (id: string) => {
  const response = await api.get<Course>(`/courses/${id}`);
  return response.data;
};


// ✅ GET BY DEGREE ID
export const getCoursesByDegree = async (degreeId: string) => {
  const response = await api.get<Course[]>(
    `/courses/by-degree/${degreeId}` // ✅ FIXED
  );
  return response.data;
};


// ✅ UPDATE COURSE
export const updateCourse = async (data: UpdateCourseDto) => {
  const response = await api.put<{ success: boolean }>("/courses", data);
  return response.data;
};


// ✅ SOFT DELETE
export const deleteCourse = async (id: string) => {
  const response = await api.delete<{ success: boolean }>(
    `/courses/${id}`
  );
  return response.data;
};