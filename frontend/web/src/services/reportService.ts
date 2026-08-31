import api from "../utils/client";

/* ------------------------------------------------------------------ */
/*  TYPES                                                               */
/* ------------------------------------------------------------------ */

export type DocumentVerificationRow = {
  sl: number;
  appNo: string;
  name: string;
  category: string;
  seatType: string[];
  karnataka: string;
  status: string;
  remark?: string;
};

export type DocumentVerificationParams = {
  degreeId?: string;
  courseId?: string;
  academicYearId?: string;
  category?: string;
  seatType?: string;
  karnataka?: string;
  status?: string;
};

/* ---- Merit List ---- */

export type MeritListRow = {
  rank: number;
  appNo: string;
  name: string;
  fatherName: string;
  category: string;
  seatTypes: string[];
  studentType: string;
  gender: string;
  phone?: string;
  percentage: number;
  meritScore: number;
  status: string;
};

export type CategoryBreakdownRow = {
  category: string;
  reservationPct: number;
  reservedSeats: number;
  appliedCount: number;
  selectedCount: number;
  waitlistCount: number;
  cutoffScore: number;
};

export type CategoryCutoffRow = {
  category: string;
  reservedSeats: number;
  filledSeats: number;
  highestScore: number;
  cutoffScore: number;
  lowestScore: number;
  studentType: string;
};

export type SeatAllocationSummary = {
  totalIntake: number;
  karnatakaSeats: number;
  hyderabadKarnatakaSeats: number;
  nonKarnatakaSeats: number;
  differentlyAbledSeats: number;
  karnatakaFilled: number;
  hyderabadKarnatakaFilled: number;
  nonKarnatakaFilled: number;
};

export type MeritListResult = {
  karnataka: MeritListRow[];
  hyderabadKarnataka: MeritListRow[];
  nonKarnataka: MeritListRow[];
  omnibus: MeritListRow[];
};

export type MeritListParams = {
  degreeId?: string;
  courseId?: string;
  academicYearId?: string;
  category?: string;
  seatType?: string;
  listType?: string;
  karnataka?: string;
};

export type MeritListPdfParams = MeritListParams & {
  karnataka?: string;
  listType?: string;
  download?: boolean;
};

/* ---- Fee Payment ---- */

export type FeeCollectionRow = {
  sl: number;
  appNo: string;
  name: string;

  feeType?: string;

  // ✅ Amount from fee structure
  feeStructureAmount: number;

  // ✅ Platform fee (Application Fee only)
  platformFee: number;

  // ✅ Actual paid amount
  paidAmount: number;

  // ✅ Remaining balance (Admission Fee only)
  balance: number;

  paymentDate?: string;

  status: string;

  transactionId?: string;
  orderId?: string;

  receiptNumber?: string;

  email?: string;
  mobile?: string;

  settlementDate?: string;
  settlementId?: string;
};

export type FeeStructureRow = {
  feeName: string;
  totalAmount: number;
  category?: string;
  degreeName?: string;
  courseName?: string;
  academicYear?: string;
  isActive: boolean;
  deductionYn: boolean;
  particulars: { particularName: string; amount: number }[];
};

export type FeePaymentSummary = {
  totalApplications: number;
  totalCollected: number;
  totalPending: number;
  
};

export type FeePaymentResult = {
  summary: FeePaymentSummary;
  feeStructures: FeeStructureRow[];
  collections: FeeCollectionRow[];
};

export type FeePaymentParams = {
  degreeId?: string;
  courseId?: string;
  academicYearId?: string;
  categoryId?: string;
  status?: string;
  feeType?: string;
};

/* ---- Facility (Hostel / Transport) ---- */

export type FacilityReportRow = {
  sl: number;
  appNo: string;
  name: string;
  fatherName: string;
  gender: string;
  category: string;
  degreeName: string;
  courseName: string;
  phone?: string;
  address?: string;
  hostelFacility: boolean;
  transportFacility: boolean;
  verificationStatus: string;
};

export type FacilityReportResult = {
  rows: FacilityReportRow[];
  totalMale: number;
  totalFemale: number;
  totalOther: number;
};

export type FacilityReportParams = {
  degreeId?: string;
  courseId?: string;
  academicYearId?: string;
  facilityType: "Hostel" | "Transport";
  gender?: string;
  status?: string;
};


/* ---- Manual Fee Collection ---- */

export type ManualFeeCollectionRow = {
  sl: number;
  appNo?: string;
  
  receiptNo: string;
  feeName: string;
  feeAmount: number;
  transactionId?: string;
  orderId?: string;
  paymentMode?: string;
  paymentDate?: string;
};

export type ManualFeeSummary = {
  totalRecords: number;
  totalCollected: number;
};

export type ManualFeeResult = {
  summary: ManualFeeSummary;
  collections: ManualFeeCollectionRow[];
};

export type ManualFeeParams = {
  degreeId?: string;
  courseId?: string;
  academicYearId?: string;
  feeType?: string;
};
/* ---- Admitted Students ---- */

export type AdmittedStudentRow = {
  sl: number;
  appNo: string;
  applicationNo: string;
  name: string;
  category: string;
  degreeName: string;
  courseName: string;
  admitYn: boolean;
};

export type AdmittedStudentsResult = AdmittedStudentRow[];

export type AdmittedStudentsParams = {
  degreeId?: string;
  courseId?: string;
  academicYearId?: string;
  category?: string;
  admitYn?: boolean;
};

export type SelectedListParams = {
  degreeTypeId?: string;
  degreeId?: string;
  courseId?: string;
  academicYearId?: string;
  category?: string;
};
export type SelectedListRow = {
  sl: number;
  appNo: string;
  name: string;
  category: string;
  qualification: string;
  meritScore: number;
};

export type SelectedListResult = SelectedListRow[];

export type PgInServiceParams = {
  degreeTypeId?: string;
  category?: string;
};

export type PgInServiceApplicantRow = {
  rank: number;
  appNo: string;
  name: string;
  category: string;
  preference: string;
  meritScore: number;
};

export type PgInServiceCourseGroupResult = {
  degreeName: string;
  courseName: string;
  applicants: PgInServiceApplicantRow[];
};

export type PgInServiceResult = PgInServiceCourseGroupResult[];
/* ------------------------------------------------------------------ */
/*  HELPER — buildQuery                                                 */
/* ------------------------------------------------------------------ */

function buildQuery(
  params: Record<string, string | boolean | undefined>
): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      qs.append(key, String(val));
    }
  });
  return qs.toString();
}



function extractFileName(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: Record<string, any>,
  fallback: string
): string {
  const disposition: string = headers["content-disposition"] ?? "";

 
  const match = disposition.match(/filename[^;=\n]*=([^;\n]*)/);
  if (match) {
    return match[1].trim().replace(/['"]/g, "");
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/*  HELPER — triggerDownload                                            */
/* ------------------------------------------------------------------ */

function triggerDownload(blob: Blob, fileName: string): void {
  const url  = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}



export const getMyApplicationPdf = async (
  download = false
): Promise<Blob> => {
  const res = await api.get("/Report/application-pdf", {
    params: { download },
    responseType: "blob",
  });

  return res.data;
};

export const previewMyApplicationPdf = async () => {
  const blob = await getMyApplicationPdf(false);
  window.open(window.URL.createObjectURL(blob), "_blank");
};

export const downloadMyApplicationPdf = async () => {
  const res = await api.get("/Report/application-pdf", {
    params: { download: true },
    responseType: "blob",
  });

  const fileName = extractFileName(
    res.headers,
    `ApplicationReport.pdf`
  );

  triggerDownload(res.data, fileName);
};

/* ================================================================== */
/*  APPLICATION PDF (ADMIN)                                           */
/* ================================================================== */

export const getApplicationPdfAdmin = async (
  appNo: string,
  download = false
): Promise<Blob> => {
  const res = await api.get("/Report/application-pdf-admin", {
    params: { appNo, download },
    responseType: "blob",
  });

  return res.data;
};

export const previewApplicationPdfAdmin = async (appNo: string) => {
  const blob = await getApplicationPdfAdmin(appNo, false);
  window.open(window.URL.createObjectURL(blob), "_blank");
};

export const downloadApplicationPdfAdmin = async (appNo: string) => {
  const res = await api.get("/Report/application-pdf-admin", {
    params: { appNo, download: true },
    responseType: "blob",
  });

  const fileName = extractFileName(
    res.headers,
    `ApplicationReport_${appNo}.pdf`
  );

  triggerDownload(res.data, fileName);
};

/* ================================================================== */
/*  DOCUMENT VERIFICATION — JSON LIST                                   */
/* ================================================================== */

export const getDocumentVerificationList = async (
  params: DocumentVerificationParams
): Promise<DocumentVerificationRow[]> => {
  const query = buildQuery(params as Record<string, string | undefined>);
  const res   = await api.get(`/Report/document-verification-list?${query}`);
  return res.data;
};

/* ================================================================== */
/*  DOCUMENT VERIFICATION — PDF                                         */
/* ================================================================== */

export const getDocumentVerificationPdf = async (
  params: DocumentVerificationParams,
  download = false
): Promise<Blob> => {
  const query = buildQuery({ ...params, format: "pdf", download });
  const res = await api.get(`/Report/document-verification-list?${query}`, {
    responseType: "blob",
  });
  return res.data;
};

export const previewDocumentVerificationPdf = async (
  params: DocumentVerificationParams
) => {
  const blob = await getDocumentVerificationPdf(params, false);
  window.open(window.URL.createObjectURL(blob), "_blank");
};

export const downloadDocumentVerificationPdf = async (
  params: DocumentVerificationParams
) => {
  const query = buildQuery({ ...params, format: "pdf", download: true });
  const res = await api.get(`/Report/document-verification-list?${query}`, {
    responseType: "blob",
  });
  const fileName = extractFileName(
    res.headers,
    `DocumentVerificationReport_${Date.now()}.pdf`
  );
  triggerDownload(res.data, fileName);
};

/* ================================================================== */
/*  MERIT LIST — JSON                                                   */
/* ================================================================== */

export const getMeritList = async (
  params: MeritListParams
): Promise<MeritListResult> => {
  const query = buildQuery(params as Record<string, string | undefined>);
  const res   = await api.get(`/Report/merit-list?${query}`);
  return res.data;
};

/* ================================================================== */
/*  MERIT LIST — PDF                                                    */
/* ================================================================== */

export const getMeritListPdf = async (
  params: MeritListPdfParams,
  download = false
): Promise<Blob> => {
  const query = buildQuery({ ...params, download });
  const res   = await api.get(`/Report/merit-list-pdf?${query}`, {
    responseType: "blob",
  });
  return res.data;
};

export const previewMeritListPdf = async (params: MeritListPdfParams) => {
  const blob = await getMeritListPdf(params, false);
  window.open(window.URL.createObjectURL(blob), "_blank");
};

export const downloadMeritListPdf = async (params: MeritListPdfParams) => {
  const query = buildQuery({ ...params, download: true });
  const res   = await api.get(`/Report/merit-list-pdf?${query}`, {
    responseType: "blob",
  });
  const fileName = extractFileName(res.headers, `MeritList_${Date.now()}.pdf`);
  triggerDownload(res.data, fileName);
};

export const getSelectedListPdf = async (
  params: SelectedListParams,
  download = false
): Promise<Blob> => {
  const query = buildQuery({ ...params, format: "pdf", download } as Record<string, string | boolean | undefined>);
  const res = await api.get(`/Report/selected-list?${query}`, { 
    responseType: "blob",
  });
  return res.data;
};

export const previewSelectedListPdf = async (params: SelectedListParams) => {
  const blob = await getSelectedListPdf(params, false);
  window.open(window.URL.createObjectURL(blob), "_blank");
};

export const downloadSelectedListPdf = async (params: SelectedListParams) => {
  const query = buildQuery({ ...params, format: "pdf", download: true } as Record<string, string | boolean | undefined>);
  const res = await api.get(`/Report/selected-list?${query}`, {
    responseType: "blob",
  });
  const fileName = extractFileName(res.headers, `SelectedList_${Date.now()}.pdf`);
  triggerDownload(res.data, fileName);
};
export const getSelectedList = async (
  params: SelectedListParams
): Promise<SelectedListResult> => {
  const query = buildQuery(params as Record<string, string | undefined>);
  const res = await api.get(`/Report/selected-list?${query}`);
  return res.data;
};

export const getPgInServiceList = async (
  params: PgInServiceParams
): Promise<PgInServiceResult> => {
  const query = buildQuery(params as Record<string, string | undefined>);
  const res = await api.get(`/Report/pg-inservice-course-wise-list?${query}`);
  return res.data;
};

export const getPgInServicePdf = async (
  params: PgInServiceParams,
  download = false
): Promise<Blob> => {
  const query = buildQuery({ ...params, format: "pdf", download } as Record<string, string | boolean | undefined>);
  const res = await api.get(`/Report/pg-inservice-course-wise-list?${query}`, {
    responseType: "blob",
  });
  return res.data;
};

export const downloadPgInServicePdf = async (params: PgInServiceParams) => {
  const query = buildQuery({ ...params, format: "pdf", download: true } as Record<string, string | boolean | undefined>);
  const res = await api.get(`/Report/pg-inservice-course-wise-list?${query}`, {
    responseType: "blob",
  });
  const fileName = extractFileName(res.headers, `PgInServiceCourseWise_${Date.now()}.pdf`);
  triggerDownload(res.data, fileName);
};
/* ================================================================== */
/*  FEE PAYMENT — JSON LIST                                             */
/* ================================================================== */

export const getFeePaymentList = async (
  params: FeePaymentParams
): Promise<FeePaymentResult> => {
  const query = buildQuery(params as Record<string, string | undefined>);
  const res   = await api.get(`/Report/fee-payment-list?${query}`);
  return res.data;
};

/* ================================================================== */
/*  FEE PAYMENT — PDF                                                   */
/* ================================================================== */

export const getFeePaymentPdf = async (
  params: FeePaymentParams,
  download = false
): Promise<Blob> => {
  const query = buildQuery({ ...params, download });
  const res   = await api.get(`/Report/fee-payment-pdf?${query}`, {
    responseType: "blob",
  });
  return res.data;
};

export const previewFeePaymentPdf = async (params: FeePaymentParams) => {
  const blob = await getFeePaymentPdf(params, false);
  window.open(window.URL.createObjectURL(blob), "_blank");
};

export const downloadFeePaymentPdf = async (params: FeePaymentParams) => {
  const query = buildQuery({ ...params, download: true });
  const res   = await api.get(`/Report/fee-payment-pdf?${query}`, {
    responseType: "blob",
  });
  const fileName = extractFileName(
    res.headers,
    `FeePaymentReport_${Date.now()}.pdf`
  );
  triggerDownload(res.data, fileName);
};

/* ================================================================== */
/*  FACILITY REPORT (HOSTEL / TRANSPORT) — JSON LIST                   */
/* ================================================================== */

export const getFacilityReportList = async (
  params: FacilityReportParams
): Promise<FacilityReportResult> => {
  const query = buildQuery(params as Record<string, string | undefined>);
  const res   = await api.get(`/Report/facility-report-list?${query}`);
  return res.data;
};

/* ================================================================== */
/*  FACILITY REPORT (HOSTEL / TRANSPORT) — PDF                         */
/* ================================================================== */

export const getFacilityReportPdf = async (
  params: FacilityReportParams,
  download = false
): Promise<Blob> => {
  const query = buildQuery({
    degreeId: params.degreeId,
    courseId: params.courseId,
    academicYearId: params.academicYearId,
    facilityType: params.facilityType,
    gender: params.gender,
    status: params.status,
    format: "pdf",
    download,
  });
  const res = await api.get(`/Report/facility-report-list?${query}`, {
    responseType: "blob",
  });
  return res.data;
};

export const previewFacilityReportPdf = async (params: FacilityReportParams) => {
  const blob = await getFacilityReportPdf(params, false);
  window.open(window.URL.createObjectURL(blob), "_blank");
};

export const downloadFacilityReportPdf = async (params: FacilityReportParams) => {
  const query = buildQuery({
    degreeId: params.degreeId,
    courseId: params.courseId,
    academicYearId: params.academicYearId,
    facilityType: params.facilityType,
    gender: params.gender,
    status: params.status,
    format: "pdf",
    download: true,
  });
  const res = await api.get(`/Report/facility-report-list?${query}`, {
    responseType: "blob",
  });
  const fileName = extractFileName(
    res.headers,
    `${params.facilityType}Report_${Date.now()}.pdf`
  );
  triggerDownload(res.data, fileName);
};

/* ================================================================== */
/*  ADMITTED STUDENTS — JSON LIST                                       */
/* ================================================================== */

export const getAdmittedStudentsList = async (
  params: AdmittedStudentsParams
): Promise<AdmittedStudentsResult> => {
  const query = buildQuery(params as Record<string, string | boolean | undefined>);
  const res   = await api.get(`/Report/admitted-students-list?${query}`);
  return res.data;
};


/* ================================================================== */
/*  MANUAL FEE COLLECTION — JSON LIST                                  */
/* ================================================================== */

export const getManualFeeList = async (
  params: ManualFeeParams
): Promise<ManualFeeResult> => {
  const query = buildQuery(params as Record<string, string | undefined>);
  const res   = await api.get(`/Report/manual-fee-list?${query}`);
  return res.data;
};

/* ================================================================== */
/*  MANUAL FEE COLLECTION — PDF                                        */
/* ================================================================== */

export const getManualFeePdf = async (
  params: ManualFeeParams,
  download = false
): Promise<Blob> => {
  const query = buildQuery({ ...params, format: "pdf", download });
  const res = await api.get(`/Report/manual-fee-list?${query}`, {
    responseType: "blob",
  });
  return res.data;
};

export const previewManualFeePdf = async (params: ManualFeeParams) => {
  const blob = await getManualFeePdf(params, false);
  window.open(window.URL.createObjectURL(blob), "_blank");
};

export const downloadManualFeePdf = async (params: ManualFeeParams) => {
  const query = buildQuery({ ...params, format: "pdf", download: true });
  const res = await api.get(`/Report/manual-fee-list?${query}`, {
    responseType: "blob",
  });
  const fileName = extractFileName(
    res.headers,
    `ManualFeeReport_${Date.now()}.pdf`
  );
  triggerDownload(res.data, fileName);
};

/* ================================================================== */
/*  ADMITTED STUDENTS — PDF                                             */
/* ================================================================== */

export const getAdmittedStudentsPdf = async (
  params: AdmittedStudentsParams,
  download = false
): Promise<Blob> => {
  const query = buildQuery({
    ...params,
    format: "pdf",
    download,
  } as Record<string, string | boolean | undefined>);
  const res = await api.get(`/Report/admitted-students-list?${query}`, {
    responseType: "blob",
  });
  return res.data;
};

export const previewAdmittedStudentsPdf = async (
  params: AdmittedStudentsParams
) => {
  const blob = await getAdmittedStudentsPdf(params, false);
  window.open(window.URL.createObjectURL(blob), "_blank");
};

export const downloadAdmittedStudentsPdf = async (
  params: AdmittedStudentsParams
) => {
  const query = buildQuery({
    ...params,
    format: "pdf",
    download: true,
  } as Record<string, string | boolean | undefined>);
  const res = await api.get(`/Report/admitted-students-list?${query}`, {
    responseType: "blob",
  });
  const fileName = extractFileName(
    res.headers,
    `AdmittedStudents_${Date.now()}.pdf`
  );
  triggerDownload(res.data, fileName);
};