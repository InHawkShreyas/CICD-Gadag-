import api from "../utils/client";

/* ================= TYPES ================= */

export type ApplicationDto = {
  id: string;
  appNo: string;
  academicYearId?: string;

  name: string;

  phone?: string;
  email?: string;

  dob?: string;
  gender?: string;

  aadharNo?: string;
  passportNo?: string;
  visaNo?: string;
  passportExpiryDate?: string;
  visaExpiryDate?: string;

  fatherName?: string;
  motherName?: string;
  guardianName?: string;

  fatherNo?: string;
  motherNo?: string;
  guardianNo?: string;

  fatherOccupation?: string;
  motherOccupation?: string;

  religion?: string;

  categoryId?: string;
  nationalityId?: string;

  caste?: string;

  rdNumber?: string;
  casteRdNumber?: string;

  annualIncome?: number;

  placeOfBirth?: string;

  karnatakaYn?: boolean;

  apaarId?: string;
  statsId?: string;

  permanentAddress?: string;
  communicationAddress?: string;
};

/* ================= NEW TYPES ================= */

export type ApplicationDocument = {
  id: string;
  applicationId: string;
  applicationNo: string;

  documentName?: string;

  fileName?: string;
  fileUrl?: string;
};

export type FeeCollectionResponse = {
  id: string;

  applicationId: string;
  applicationNo: string;

  name?: string;

  feeType?: string;

  degreeId?: string;
  courseId?: string;

  email?: string;
  mobile?: string;

  amount: number;

  platformCharges?: number;
  paidAmount?: number;

  paymentDate?: string;

  status?: string;

  transactionId?: string;
  orderId?: string;

  receiptNumber?: string;

  settlementDate?: string;
  settlementId?: string;
};

export type FeeCollectionManualDetail = {
  id: string;

  particularName?: string;

  particularAmt?: number;
};

export type FeeCollectionManualResponse = {
  id: string;

  receiptNo?: string;

  feeName?: string;

  feeAmount?: number;

  transactionId?: string;
  orderId?: string;

  paymentMode?: string;

  paymentDate?: string;

  appNo?: string;
  appId?: string;

  degreeId?: string;
  courseId?: string;

  details: FeeCollectionManualDetail[];
};

export type ApplicationVerification = {
  id?: string;

  applicationId?: string;

  appNo?: string;

  verificationStatus?: string;

  remark?: string;

  installment?: number;

  insertBy?: string;
  updateBy?: string;
};

/* ================= FULL RESPONSE ================= */

export type FullApplicationResponse = {
  application: ApplicationDto;

  educationDetails: unknown[];

  courseDetails: unknown[];

  seatTypes: unknown[];

  documents: ApplicationDocument[];

  feePayments: FeeCollectionResponse[];

  manualFeePayments: FeeCollectionManualResponse[];

  verification?: ApplicationVerification | null;
};

export type ApplicationFilterRequest = {
  degreeId?: string;

  courseId?: string;

  categoryId?: string;

  academicYearId?: string;

  seatTypeId?: string;
};

export type ApplicationFilterResponse = {
  application: ApplicationDto;

  educationDetails: unknown[];

  courseDetails: unknown[];

  seatTypes: unknown[];

  documents: ApplicationDocument[];

  feePayments: FeeCollectionResponse[];

  manualFeePayments: FeeCollectionManualResponse[];

  verification?: ApplicationVerification | null;
};

/* ================= DOCUMENT VERIFICATION LIST ================= */

export type DocumentVerificationListItemDto = {
  id: string;

  appNo: string;

  name?: string;

  email?: string;
  phone?: string;

  permanentAddress?: string;

  categoryId?: string;
  academicYearId?: string;

  degreeId?: string;
  courseId?: string;
  batchId?: string;

  previousRegistrationNo?: string;

  verificationId?: string;
  verificationStatus?: string;
  verificationRemark?: string;

  // Who verified this application — mirrors ApplicationVerification.InsertBy /
  // UpdateBy, surfaced flat on the list DTO so the grid doesn't need a
  // separate fetch per row. Backend: add these to the list query/projection.
  verificationInsertBy?: string;
  verificationUpdateBy?: string;

  installment?: number;
  feesEnabled?: boolean;
  postPaymentEdit?: boolean;
  preferenceCount?: number;
  isAppFeePaid?:string;
  // Admission fee payment status — drives auto-admit on the Admit Students
  // page and unlocks post-payment "Edit Access" on Document Verification.
  isAdmissionFeePaid?: boolean;

};

/* ================= API ================= */

// ✅ STUDENT → MY APPLICATION
export const getMyFullApplication = async () => {
  const response = await api.get(
    "/ApplicationQuery/my"
  );

  return response.data as FullApplicationResponse;
};

// ✅ ADMIN → GET BY APP NO
export const getFullApplicationByAppNo = async (
  appNo: string
): Promise<FullApplicationResponse> => {
  const response = await api.get(
    "/ApplicationQuery/full",
    {
      params: { appNo },
    }
  );

  return response.data;
};

// ✅ FILTER
export const filterApplications = async (
  data: ApplicationFilterRequest
): Promise<ApplicationFilterResponse[]> => {
  const response = await api.post(
    "/ApplicationQuery/filter",
    data
  );

  return response.data;
};

export const getDocumentVerificationList = async (): Promise<
  DocumentVerificationListItemDto[]
> => {
  const response = await api.get(
    "/ApplicationQuery/document-verification"
  );

  return response.data;
};