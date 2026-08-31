import api from "../utils/client";

/* ================= TYPES ================= */

export type CreateFeeCollectionDto = {
  applicationId: string;
  applicationNo?: string;
  name?: string;
  email?: string;
  mobile?: string;

  feeType: string;

  degreeId?: string;
  courseId?: string;

  amount: number;
  platformCharges: number;

  receiptNumber: string;
};

export type UpdatePaymentDto = {
  receiptNumber: string;

  orderId?: string;
  transactionId?: string;

  paidAmount: number;
  status: string;

  paymentDate: string;
};

export type RefundPaymentDto = {
  receiptNumber: string;

  refundId: string;

  refundDate: string;

  status: string;
};

export type FeeCollectionResponse = {
  id: string;

  applicationId: string;
  applicationNo?: string;

  name?: string;

  feeType?: string;

  degreeId?: string;
  courseId?: string;

  amount: number;
  platformCharges: number;
  paidAmount: number;

  paymentDate?: string;
  status?: string;

  transactionId?: string;
  orderId?: string;

  receiptNumber?: string;

  settlementId?: string;
  settlementDate?: string;

  refundId?: string;
  refundDate?: string;

  email?: string;
  mobile?: string;
};

export type FeeTotals = {
  total: number;
  applicationFees: number;
  admissionFees: number;
};

export type PagedFeeCollectionResponse = {
  items: FeeCollectionResponse[];
  totalGroups: number;
  page: number;
  pageSize: number;
  totals: FeeTotals;
};

export type GetPagedFeeCollectionsParams = {
  search?: string;
  feeType?: string[];
  page: number;
  pageSize: number;
};

/* ================= CREATE ================= */

export const createFeeCollection = async (
  data: CreateFeeCollectionDto
) => {
  const response = await api.post(
    "/FeeCollection",
    data
  );

  return response.data as FeeCollectionResponse;
};

/* ================= PAYMENT UPDATE ================= */

export const updatePayment = async (
  data: UpdatePaymentDto
) => {
  const response = await api.put(
    "/FeeCollection/payment",
    data
  );

  return response.data;
};

/* ================= REFUND UPDATE ================= */

export const updateRefund = async (
  data: RefundPaymentDto
) => {
  const response = await api.put(
    "/FeeCollection/refund",
    data
  );

  return response.data;
};

/* ================= GET BY ID ================= */

export const getFeeCollectionById = async (
  id: string
) => {
  const response = await api.get(
    `/FeeCollection/${id}`
  );

  return response.data as FeeCollectionResponse;
};


export const getAllFeeCollections = async () => {
  const response = await api.get(
    "/FeeCollection"
  );

  return response.data as FeeCollectionResponse[];
};

/* ================= GET PAGED (NEW) ================= */

export const getPagedFeeCollections = async (
  params: GetPagedFeeCollectionsParams
) => {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  searchParams.set("page", String(params.page));
  searchParams.set("pageSize", String(params.pageSize));
  for (const ft of params.feeType ?? []) {
    searchParams.append("feeType", ft);
  }

  const response = await api.get(
    `/FeeCollection/paged?${searchParams.toString()}`
  );

  return response.data as PagedFeeCollectionResponse;
};

/* ================= GET FEE TYPES (NEW, for filter panel) ================= */

export const getFeeTypes = async () => {
  const response = await api.get("/FeeCollection/fee-types");
  return response.data as string[];
};

/* ================= GET BY RECEIPT ================= */

export const getFeeByReceipt = async (
  receiptNumber: string
) => {
  const response = await api.get(
    `/FeeCollection/receipt/${receiptNumber}`
  );

  return response.data as FeeCollectionResponse;
};

/* ================= GET BY RECEIPT ADMIN ================= */

export const getFeeByReceiptAdmin = async (
  receiptNumber: string
) => {
  const response = await api.get(
    `/FeeCollection/admin/receipt/${receiptNumber}`
  );

  return response.data as FeeCollectionResponse;
};

/* ================= GET BY APPLICATION ================= */

export const getFeesByApplicationId = async (
  applicationId: string
) => {
  const response = await api.get(
    `/FeeCollection/application/${applicationId}`
  );

  return response.data as FeeCollectionResponse[];
};