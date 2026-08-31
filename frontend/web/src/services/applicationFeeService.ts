import api from "../utils/client";
import { getLookupsByType } from "./lookupService";

export type ApplicationFee = {
  id: string;
  degreeTypeId?: string;
  degreeTypeName?: string;
  degreeId: string;
  degreeName?: string;

  courseId: string;
  courseName?: string;

  batchTypeId?: string;
  batchTypeName?: string;

  academicYearId: string;
  academicYearName?: string;

  categoryId: string;
  categoryName?: string;

  startDate?: string;
  endDate?: string;
  amount: number;
  platformCharges: number;
  totalAmount: number;

  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ApplicationFeePayload = {
  id?: string;
  degreeId: string;
  courseId: string;
  batchTypeId?: string;
  academicYearId: string;
  categoryId: string;
  startDate?: string;
  endDate?: string;
  amount: number;
  platformCharges: number;
  totalAmount: number;
};

export type ApplicationFeeBulkPayload = {
  degreeTypeIds: string[];
  degreeIds: string[];
  courseIds: string[];
  batchTypeIds: string[];
  academicYearIds: string[];
  categoryIds: string[];
  startDate?: string;
  endDate?: string;
  amount: number;
  platformCharges: number;
  totalAmount: number;
};

const BASE_URL = "/ApplicationFee";

/** Fetch all application fee rules. Pass isActive to filter, omit for all. */
export async function getApplicationFees(
  isActive?: boolean
): Promise<ApplicationFee[]> {
  const { data } = await api.get(BASE_URL, {
    params: isActive === undefined ? {} : { isActive },
  });
  return data;
}

export async function getApplicationFeeById(
  id: string
): Promise<ApplicationFee> {
  const { data } = await api.get(`${BASE_URL}/${id}`);
  return data;
}

export async function createApplicationFee(
  payload: ApplicationFeePayload
): Promise<ApplicationFee> {
  const { data } = await api.post(`${BASE_URL}/upsert`, {
    ...payload,
    isActive: true,
  });
  return data;
}

/** Bulk-create: one record per cartesian combo of the ID lists. */
export async function bulkCreateApplicationFees(
  payload: ApplicationFeeBulkPayload
): Promise<ApplicationFee[]> {
  const { data } = await api.post(`${BASE_URL}/bulk-upsert`, payload);
  return data;
}

export async function updateApplicationFee(
  id: string,
  payload: ApplicationFeePayload,
  isActive: boolean
): Promise<ApplicationFee> {
  const { data } = await api.post(`${BASE_URL}/upsert`, {
    ...payload,
    id,
    isActive,
  });
  return data;
}

export async function setApplicationFeeStatus(
  fee: ApplicationFee,
  isActive: boolean
): Promise<ApplicationFee> {
  const { data } = await api.post(`${BASE_URL}/upsert`, {
    id: fee.id,
    degreeId: fee.degreeId,
    courseId: fee.courseId,
    batchTypeId: fee.batchTypeId,
    academicYearId: fee.academicYearId,
    categoryId: fee.categoryId,
    startDate: fee.startDate,
    endDate: fee.endDate,
    amount: fee.amount,
    platformCharges: fee.platformCharges,
    totalAmount: fee.totalAmount,
    status: isActive,
  });

  return data;
}

export async function resolveApplicationFee(criteria: {
  degreeId?: string | null;
  courseId?: string | null;
  categoryId?: string | null;
  academicYearId?: string | null;
  batchTypeId?: string | null;
  isCertificateCourse?: boolean;
}): Promise<ApplicationFee | undefined> {
  const fees = await getApplicationFees(true);

  const matches = (categoryId?: string | null) =>
    fees.find(
      (f) =>
        f.degreeId === criteria.degreeId &&
        f.courseId === criteria.courseId &&
        f.categoryId === categoryId &&
        f.academicYearId === criteria.academicYearId &&
        (!criteria.isCertificateCourse || (f.batchTypeId ?? null) === (criteria.batchTypeId ?? null))
    );

  // 1. Try the exact category first.
  const exact = matches(criteria.categoryId);
  if (exact) return exact;

  // 2. Fallback — no fee rule for this category, so resolve GM's id and retry.
  try {
    const categories = await getLookupsByType("Category", "");
    const gmCategory = categories.find((c) => c.name?.toUpperCase() === "GM");
    if (gmCategory?.id && gmCategory.id !== criteria.categoryId) {
      return matches(gmCategory.id);
    }
  } catch { /* lookup failed — nothing more we can do, fall through to undefined */ }

  return undefined;
}