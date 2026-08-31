import api from "../utils/client";

/* ───────────────── TYPES ───────────────── */

export type PhonePeCreateRequest = {
  receiptNumber: string;
  amount: number;
  applicationNo: string;
};

export type PhonePeCreateResponse = {
  success: boolean;
  redirectUrl: string;
  receiptNumber: string;
};

export type PhonePeVerifyResponse = {
  status: "SUCCESS" | "FAILED" | "PENDING";
  orderId: string;
  transactionId?: string | null;
  amount: number;
};

/* ───────────────── API CALLS ───────────────── */

/* ✅ CREATE PAYMENT */
export const createPhonePePayment = async (
  payload: PhonePeCreateRequest
): Promise<PhonePeCreateResponse> => {
  const res = await api.post("/PhonePe/create", payload);
  return res.data;
};

/* ✅ VERIFY PAYMENT */
export const verifyPhonePePayment = async (
  receiptNo: string
): Promise<PhonePeVerifyResponse> => {
  const res = await api.get(`/PhonePe/verify/${receiptNo}`);
  return res.data;
};