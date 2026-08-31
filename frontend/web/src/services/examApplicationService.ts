import api from "../utils/client";

/* ================= TYPES ================= */

export type CreateExamApplicationDto = {
  name: string;
  regisNumber: string;
  degreeId: string;
  courseId: string;
  semId: string;
  academicYearId: string;
  semesterNumber: number;
  mobile?: string;
  email?: string;
  declarationYn: boolean;
  subjectIds: string[];
};

export type ExamApplication = {
  id: string;
  applicationNo: string;
  semId: string;
  academicYearId: string;

  academicApproval: boolean;
  attendanceApproval: boolean;
  otherApproval: boolean;

  name: string;
  regisNumber: string;

  degreeId: string;
  courseId: string;

  mobile?: string;
  email?: string;

  status: boolean;
};

export type CreateExamApplicationResponse = {
  id: string;
  message: string;
};

/* ================= CREATE ================= */

export const createExamApplication = async (
  data: CreateExamApplicationDto
) => {
  const response =
    await api.post<CreateExamApplicationResponse>(
      "/ExamApplication",
      data
    );

  return response.data;
};

/* ================= GET ALL ================= */

export const getExamApplications = async () => {
  const response =
    await api.get<ExamApplication[]>(
      "/ExamApplication"
    );

  return response.data;
};

/* ================= GET BY ID ================= */

export const getExamApplicationById = async (
  id: string
) => {
  const response =
    await api.get<ExamApplication>(
      `/ExamApplication/${id}`
    );

  return response.data;
};

/* ================= TYPES — DETAILS ================= */

export type ExamApplicationDetail = {
  id: string;
  examApplicationId: string;
  subjectId: string;
  attendancePercentage: number | null;
  iaMarks: number | null;
};

export type SubjectMarkDto = {
  subjectId: string;
  iaMarks: number | null;
  attendancePercentage: number | null;
};

export type AcademicApproveDto = {
  subjectMarks: SubjectMarkDto[];
};

export type FinalApproveDto = {
  attendanceApproval: boolean;
  otherApproval: boolean;
};

/* ================= GET DETAILS ================= */

export const getExamApplicationDetails = async (
  applicationId: string
) => {
  const response =
    await api.get<ExamApplicationDetail[]>(
      `/ExamApplication/${applicationId}/details`
    );

  return response.data;
};

/* ================= ACADEMIC APPROVE ================= */

export const academicApprove = async (
  applicationId: string,
  dto: AcademicApproveDto
) => {
  const response = await api.patch<{ message: string }>(
    `/ExamApplication/${applicationId}/academic-approve`,
    dto
  );

  return response.data;
};

/* ================= FINAL APPROVE ================= */

export const finalApprove = async (
  applicationId: string,
  dto: FinalApproveDto
) => {
  const response = await api.patch<{ message: string }>(
    `/ExamApplication/${applicationId}/final-approve`,
    dto
  );

  return response.data;
};