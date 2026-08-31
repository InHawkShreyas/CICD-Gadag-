import api from "../utils/client";

/* ───────────────── TYPES ───────────────── */

export type AdmittedStudent = {
  id: string;
  applicationId: string;
  applicationNo: string;
  name: string;
  admitYn: boolean;
  remarks?: string;
};

export type CreateAdmittedStudentDto = {
  applicationId: string;
  applicationNo: string;
  name: string;
  remarks?: string;
};

export type UpdateAdmittedStudentDto = {
  id: string;
  admitYn: boolean;
  remarks?: string;
};
/* ───────────────── API CALLS ───────────────── */

/* ✅ CREATE (Admit student) */
export const admitStudent = async (
  payload: CreateAdmittedStudentDto
): Promise<AdmittedStudent> => {
  const res = await api.post<AdmittedStudent>(
    "/AdmittedStudent",
    payload
  );

  return res.data;
};

/* ✅ GET ALL admitted students */
export const getAdmittedStudents = async (): Promise<AdmittedStudent[]> => {
  const res = await api.get<AdmittedStudent[]>(
    "/AdmittedStudent"
  );

  return res.data;
};

/* ✅ GET by Application ID */
export const getAdmittedStudentByApplication = async (
  applicationId: string
): Promise<AdmittedStudent | null> => {
  try {
    const res = await api.get<AdmittedStudent>(
      `/AdmittedStudent/application/${applicationId}`
    );

    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }

    throw err;
  }
};

/* ✅ UPDATE (remarks / admit toggle) */
export const updateAdmittedStudent = async (
  payload: UpdateAdmittedStudentDto
): Promise<boolean> => {
  const res = await api.put<{ success: boolean }>(
    "/AdmittedStudent",
    payload
  );

  return res.data?.success === true;
};