import api from "../utils/client";

/* ───────────────── TYPES ───────────────── */

export type Student = {
  id: string;
  studentName: string;
  registrationNumber: string;
  degreeId: string;
  courseId: string;
  academicYearId: string;
};

export type StudentUploadPayload = {
  file: File;
  degreeId: string;
  courseId: string;
  academicYearId: string;
};

export type StudentUploadResponse = {
  success: boolean;
  count: number;
  message: string;
};

/* ───────────────── API CALLS ───────────────── */

/* ✅ UPLOAD EXCEL */
export const uploadStudents = async (
  payload: StudentUploadPayload
): Promise<StudentUploadResponse> => {
  const formData = new FormData();

  formData.append("file", payload.file);
  formData.append("degreeId", payload.degreeId);
  formData.append("courseId", payload.courseId);
  formData.append("academicYearId", payload.academicYearId);

  const res = await api.post("/Student/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

/* ✅ GET ALL */
export const getStudents = async (): Promise<Student[]> => {
  const res = await api.get("/Student");
  return res.data;
};

/* ✅ GET BY ID */
export const getStudentById = async (id: string): Promise<Student> => {
  const res = await api.get(`/Student/${id}`);
  return res.data;
};

/* ✅ UPDATE */
export const updateStudent = async (
  payload: Student
): Promise<{ success: boolean; message: string }> => {
  const res = await api.put("/Student", payload);
  return res.data;
};

/* ✅ DELETE */
export const deleteStudent = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const res = await api.delete(`/Student/${id}`);
  return res.data;
};