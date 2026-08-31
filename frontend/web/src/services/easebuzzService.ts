import api from "../utils/client";

/* ================= TYPES ================= */

export type EasebuzzInitRequest = {
  receiptNo: string;
  applicationId?: string;
  name: string;
  email: string;
  phone: string;

  collegePayable: number;
  serviceCharge: number;

  feeType: string; // 🔥 REQUIRED (e.g. "MGRDPU")
};

export type EasebuzzResponse = {
  paymentUrl: string;
};

/* ================= API ================= */

// ✅ CREATE PAYMENT LINK
export const createPaymentLink = async (
  data: EasebuzzInitRequest
): Promise<EasebuzzResponse> => {
  const response = await api.post("/Easebuzz/create-payment-link", data);
  return response.data;
};