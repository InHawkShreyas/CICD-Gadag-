import api from "../utils/client";

/* ================= TYPES ================= */

export type EducationDetailDto = {
  id?: string;

  applicationId: string;
  appNo?: string;

  examName: string;
  maxMarks?: number;
  obtainedMarks?: number;

  registrationNumber?: string;
  percentage?: number;
  cgpa?: number;
  year?: number;
};

/* ================= API ================= */

// ✅ CREATE (single)
export const createEducationDetail = async (data: EducationDetailDto) => {
  const response = await api.post("/EducationDetail", data);
  return response.data;
};

// ✅ CREATE MULTIPLE (frontend loop instead of bulk API)
export const createEducationDetails = async (data: EducationDetailDto[]) => {
  const results = [];

  for (const item of data) {
    const res = await api.post("/EducationDetail", item);
    results.push(res.data);
  }

  return results;
};

// ✅ GET BY APPLICATION
export const getEducationByApplicationId = async (applicationId: string) => {
  const response = await api.get(`/EducationDetail/application/${applicationId}`);
  return response.data as EducationDetailDto[];
};

// ✅ UPDATE
export const updateEducationDetail = async (data: EducationDetailDto) => {
  const response = await api.put("/EducationDetail", data);
  return response.data;
};

// ✅ DELETE
export const deleteEducationDetail = async (id: string) => {
  await api.delete(`/EducationDetail/${id}`);
};