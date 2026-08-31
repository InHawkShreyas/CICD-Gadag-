import api from "../utils/client";

/* ================= TYPES ================= */

export type ReceiptResponse = {
  receiptNo: string;
};

/* ================= API ================= */

// ✅ GENERATE RECEIPT NUMBER
export const generateReceiptNumber = async (): Promise<string> => {
  const response = await api.get("/ReceiptSequence/generate");
  return response.data.receiptNo;
};