import api from "../utils/client";

/* ================= TYPES ================= */

export type ApplicationVerification = {
  id?: string;
  applicationId: string;
  appNo?: string;

  verificationStatus?: string;
  remark?: string;
  installment?: number;
  feesEnabled?: boolean;
  postPaymentEdit?: boolean;
  insertOn?: string;
  updateOn?: string;
  insertBy?: string;
  updateBy?: string;
  status?: boolean;
};

/* ================= CREATE ================= */

export const createApplicationVerification = async (
  data: ApplicationVerification
) => {
  const response = await api.post<ApplicationVerification>(
    "/ApplicationVerification",
    data
  );
  return response.data;
};

/* ================= UPDATE ================= */

export const updateApplicationVerification = async (
  data: ApplicationVerification
) => {
  const response = await api.put<{ success: boolean }>(
    "/ApplicationVerification",
    data
  );
  return response.data;
};

/* ================= GET ALL ================= */

export const getApplicationVerifications = async () => {
  const response = await api.get<ApplicationVerification[]>(
    "/ApplicationVerification"
  );
  return response.data;
};

/* ================= GET BY ID ================= */

export const getApplicationVerificationById = async (id: string) => {
  const response = await api.get<ApplicationVerification>(
    `/ApplicationVerification/${id}`
  );
  return response.data;
};

/* ================= GET BY APP NO ================= */

export const getApplicationVerificationByAppNo = async (appNo: string) => {
  const response = await api.get<ApplicationVerification>(
    `/ApplicationVerification/by-app-no/${appNo}`
  );
  return response.data;
};

/* ================= DELETE (SOFT) ================= */

export const deleteApplicationVerification = async (id: string) => {
  const response = await api.delete<{ success: boolean }>(
    `/ApplicationVerification/${id}`
  );
  return response.data;
};