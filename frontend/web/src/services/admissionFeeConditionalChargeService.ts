import api from "../utils/client";

export type AdmissionFeeConditionalCharge = {
  id?: string;
  conditionId: string;
  conditionCode?: string;
  conditionName?: string;
  particularName: string;
  amount: number;
  description?: string;
  status: boolean;
};

export const getConditionalCharges = async (): Promise<AdmissionFeeConditionalCharge[]> => {
  const res = await api.get<AdmissionFeeConditionalCharge[]>("/AdmissionFeeConditionalCharge");
  return res.data;
};

export const createConditionalCharge = async (
  data: AdmissionFeeConditionalCharge
): Promise<AdmissionFeeConditionalCharge> => {
  const res = await api.post<AdmissionFeeConditionalCharge>("/AdmissionFeeConditionalCharge", data);
  return res.data;
};

export const updateConditionalCharge = async (
  data: AdmissionFeeConditionalCharge
): Promise<{ success: boolean }> => {
  const res = await api.put<{ success: boolean }>("/AdmissionFeeConditionalCharge", data);
  return res.data;
};

export const deleteConditionalCharge = async (id: string): Promise<{ success: boolean }> => {
  const res = await api.delete<{ success: boolean }>(`/AdmissionFeeConditionalCharge/${id}`);
  return res.data;
};