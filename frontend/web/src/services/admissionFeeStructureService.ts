/* eslint-disable @typescript-eslint/no-explicit-any */

import api from "../utils/client";

/* =========================================================
   TYPES
========================================================= */

export type AdmissionFeeStructureDetail = {
  id?: string;
  headerId?: string;

  particularName?: string;

  amount?: number;

  installment1?: boolean;

  installment2?: boolean;

  installment1Amount?: number;

  installment2Amount?: number;
};

export type AdmissionFeeStructure = {
  id?: string;

  feeName?: string;

  totalAmount?: number;
  feeId?: string
  degreeTypeId?: string;

  degreeId?: string;

  courseId?: string;

  categoryId?: string;

  academicYearId?: string;

  annualIncomeId?: string;

  deductionYn?: boolean;

  fineAmount?: number;

  deductionAmount?: number;
  
  payAmount?: number;

  startDate?: string | null;

  endDate?: string | null;

  fineEndDate?: string | null;

  details?: AdmissionFeeStructureDetail[];
};

/* =========================================================
   CREATE
========================================================= */

export const createAdmissionFeeStructure = async (
  data: AdmissionFeeStructure
): Promise<AdmissionFeeStructure> => {
  const response = await api.post<AdmissionFeeStructure>(
    "/AdmissionFeeStructure",
    data
  );

  return response.data;
};

/* =========================================================
   GET ALL
========================================================= */

export const getAdmissionFeeStructures = async (): Promise<
  AdmissionFeeStructure[]
> => {
  const response = await api.get<AdmissionFeeStructure[]>(
    "/AdmissionFeeStructure"
  );

  return response.data;
};

/* =========================================================
   GET BY ID
========================================================= */

export const getAdmissionFeeStructureById = async (
  id: string
): Promise<AdmissionFeeStructure> => {
  const response = await api.get<AdmissionFeeStructure>(
    `/AdmissionFeeStructure/${id}`
  );

  return response.data;
};

/* =========================================================
   UPDATE
========================================================= */

export const updateAdmissionFeeStructure = async (
  data: AdmissionFeeStructure
): Promise<{ success: boolean }> => {
  const response = await api.put<{ success: boolean }>(
    "/AdmissionFeeStructure",
    data
  );

  return response.data;
};

/* =========================================================
   DELETE
========================================================= */

export const deleteAdmissionFeeStructure = async (
  id: string
): Promise<{ success: boolean }> => {
  const response = await api.delete<{ success: boolean }>(
    `/AdmissionFeeStructure/${id}`
  );

  return response.data;
};

/* =========================================================
   GET BY FILTERS
========================================================= */

export const getFeeByFilters = async (
  degreeId: string,
  courseId: string,
  categoryId?: string | null,
  academicYearId?: string | null
): Promise<AdmissionFeeStructure | null> => {
  try {
    const params: Record<string, string> = {
      degreeId,
      courseId,
    };

    if (categoryId) {
      params.categoryId = categoryId;
    }

    if (academicYearId) {
      params.academicYearId = academicYearId;
    }

    const response = await api.get<AdmissionFeeStructure>(
      "/AdmissionFeeStructure/by-filters",
      {
        params,
      }
    );

    return response.data;
  } catch (err: any) {
    if (err.response?.status === 404) {
      return null;
    }

    console.error("Fee fetch error:", err);

    throw err;
  }
};

/* =========================================================
   INSTALLMENT HELPERS
========================================================= */

export const getInstallment1Details = (
  fee: AdmissionFeeStructure | null
): AdmissionFeeStructureDetail[] => {
  return fee?.details?.filter((x) => x.installment1) ?? [];
};

export const getInstallment2Details = (
  fee: AdmissionFeeStructure | null
): AdmissionFeeStructureDetail[] => {
  return fee?.details?.filter((x) => x.installment2) ?? [];
};

export const getInstallment1Total = (
  fee: AdmissionFeeStructure | null
): number => {
  return (
    fee?.details
      ?.filter((x) => x.installment1)
      .reduce((sum, x) => sum + (x.amount ?? 0), 0) ?? 0
  );
};

export const getInstallment2Total = (
  fee: AdmissionFeeStructure | null
): number => {
  return (
    fee?.details
      ?.filter((x) => x.installment2)
      .reduce((sum, x) => sum + (x.amount ?? 0), 0) ?? 0
  );
};

export const getFullFeeTotal = (
  fee: AdmissionFeeStructure | null
): number => {
  return (
    fee?.totalAmount ??
    fee?.details?.reduce((sum, x) => sum + (x.amount ?? 0), 0) ??
    0
  );
};

/* =========================================================
   PARTICULAR HELPERS
========================================================= */

export const getParticularAmount = (
  detail?: AdmissionFeeStructureDetail
): number => {
  return detail?.amount ?? 0;
};

export const formatFeeAmount = (
  amount?: number
): string => {
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
};