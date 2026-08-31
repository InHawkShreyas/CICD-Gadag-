import api from "../utils/client";

/* ================= TYPES ================= */

export type ApplicationCourseDetailDto = {
  id?: string;

  applicationId: string;
  applicationNo?: string;

  degreeId: string;
  courseId: string;
  preference?: string;
  acceptedYn?: boolean;

  hostelFacilityYn?: boolean;
  transportFacilityYn?: boolean;
  previousRegistrationNo?: string;
  batchId?: string;
  batchTypeId? : string;
  inserviceYn?: boolean;
  department?: string;
  designation?: string;
  officeAddress?: string;
  dateOfJoin?: string;
  serviceYears?: number;
};

export interface CourseDegreePair {
  degreeId: string;
  courseId: string;
  preference?: string;
}
 
export interface CreateBulkCourseDetailPayload {
  applicationId: string;
  applicationNo?: string;
  hostelFacilityYn?: boolean;
  transportFacilityYn?: boolean;
  previousRegistrationNo?: string;
  batchId?: string;
  batchTypeId?: string;
  selections: CourseDegreePair[];
  inserviceYn?: boolean;
  department?: string;
  designation?: string;
  officeAddress?: string;
  dateOfJoin?: string;
  serviceYears?: number;
}

/* ================= API ================= */

// ✅ CREATE
export const createCourseDetail = async (data: ApplicationCourseDetailDto) => {
  const response = await api.post("/ApplicationCourseDetail", data);
  return response.data;
};

// ✅ GET ALL — bulk fetch, use instead of per-student calls
export const getAllApplicationCourseDetails = async (): Promise<ApplicationCourseDetailDto[]> => {
  const response = await api.get("/ApplicationCourseDetail");
  return response.data as ApplicationCourseDetailDto[];
};

// ✅ GET BY APPLICATION
export const getCourseDetailsByApplicationId = async (applicationId: string) => {
  const response = await api.get(`/ApplicationCourseDetail/application/${applicationId}`);
  return response.data as ApplicationCourseDetailDto[];
};

// ✅ UPDATE
export const updateCourseDetail = async (data: ApplicationCourseDetailDto) => {
  const response = await api.put("/ApplicationCourseDetail", data);
  return response.data;
};

// ✅ DELETE
export const deleteCourseDetail = async (id: string) => {
  await api.delete(`/ApplicationCourseDetail/${id}`);
};

export const createBulkCourseDetail = async (payload: CreateBulkCourseDetailPayload) => {
  const res = await api.post("/applicationcoursedetail/bulk", payload);
  return res.data;
};

export async function acceptCourseDetailPreference(applicationId: string, courseDetailId: string) {
  const response = await api.patch(`/ApplicationCourseDetail/${applicationId}/accept/${courseDetailId}`);
  return response.data;
}