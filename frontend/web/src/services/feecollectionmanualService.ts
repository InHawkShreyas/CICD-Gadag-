import api from "../utils/client";

/* ================= TYPES ================= */

export type FeeCollectionManualDetailDto = {
  id?: string;

  particularName: string;

  particularAmt: number;
};

export type CreateFeeCollectionManualDto = {
  receiptNo: string;

  feeName: string;

  feeAmount: number;

  transactionId?: string;

  orderId?: string;

  paymentMode?: string;

  paymentDate?: string;

  appNo?: string;

  appId?: string;

  degreeId?: string;

  courseId?: string;

  // ✅ DETAILS
  details: FeeCollectionManualDetailDto[];
};

export type UpdateFeeCollectionManualDto = {
  receiptNo: string;

  feeName: string;

  feeAmount: number;

  transactionId?: string;

  orderId?: string;

  paymentMode?: string;

  paymentDate?: string;

  appNo?: string;

  appId?: string;

  degreeId?: string;

  courseId?: string;

  // ✅ DETAILS
  details: FeeCollectionManualDetailDto[];
};

export type FeeCollectionManualResponseDto = {
  id: string;

  receiptNo: string;

  feeName: string;

  feeAmount: number;

  transactionId?: string;

  orderId?: string;

  paymentMode?: string;

  paymentDate?: string;

  appNo?: string;

  appId?: string;

  degreeId?: string;

  courseId?: string;

  // ✅ DETAILS
  details: FeeCollectionManualDetailDto[];
};

export type PagedFeeCollectionManualResult = {
  items: FeeCollectionManualResponseDto[];
  totalCount: number;
  page: number;
  pageSize: number;
};

/* ================= API ================= */

// ✅ CREATE
export const createFeeCollectionManual = async (
  data: CreateFeeCollectionManualDto
) => {
  const response = await api.post(
    "/FeeCollectionManual",
    data
  );

  return response.data as FeeCollectionManualResponseDto;
};

// ✅ GET ALL
export const getAllFeeCollectionManuals =
  async () => {
    const response = await api.get(
      "/FeeCollectionManual"
    );

    return response.data as FeeCollectionManualResponseDto[];
  };

// ✅ GET PAGED
export const getPagedFeeCollectionManuals = async (
  page: number,
  pageSize: number
) => {
  const response = await api.get("/FeeCollectionManual/paged", {
    params: { page, pageSize },
  });

  return response.data as PagedFeeCollectionManualResult;
};

// ✅ GET ALL, VIA PAGED REQUESTS
// Same end result as getAllFeeCollectionManuals (every manual receipt),
// but fetched as a series of bounded /paged calls instead of one
// unbounded request — keeps each round trip cheap on the backend while
// still giving callers that need the full history (dashboard totals,
// per-course fee-paid lookups, duplicate-transaction checks) everything.
export const getAllFeeCollectionManualsPaged = async (
  pageSize = 200
) => {
  const all: FeeCollectionManualResponseDto[] = [];
  let page = 1;

  while (true) {
    const { items, totalCount } = await getPagedFeeCollectionManuals(
      page,
      pageSize
    );

    all.push(...items);

    if (items.length === 0 || all.length >= totalCount) break;

    page += 1;
  }

  return all;
};

// ✅ GET BY ID
export const getFeeCollectionManualById =
  async (id: string) => {
    const response = await api.get(
      `/FeeCollectionManual/${id}`
    );

    return response.data as FeeCollectionManualResponseDto;
  };

// ✅ GET BY APP NO
export const getFeeCollectionManualByAppNo =
  async (appNo: string) => {
    const response = await api.get(
      `/FeeCollectionManual/app-no/${appNo}`
    );

    return response.data as FeeCollectionManualResponseDto[];
  };

// ✅ UPDATE
export const updateFeeCollectionManual =
  async (
    id: string,
    data: UpdateFeeCollectionManualDto
  ) => {
    const response = await api.put(
      `/FeeCollectionManual/${id}`,
      data
    );

    return response.data;
  };