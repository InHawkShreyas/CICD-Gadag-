import api from "../utils/client";

export type PgEntryMode = "sem" | "year";
export type PgPeriodType = "sem" | "year";

export interface PgEducationPeriodPayload {
  periodType: PgPeriodType;
  periodIndex: number;
  instituteName?: string;
  registrationNumber?: string; 
  maxMarks?: number;
  obtainedMarks?: number;
  sgpa?: number;
  percentage?: number;
  cgpa?: number;
}

export interface PgEducationPeriodResponse extends PgEducationPeriodPayload {
  id: string;
}

export type PgExamLevel =
  | "10th"
  | "12th"
  | "Diploma"
  | "Sem 1"
  | "Sem 2"
  | "Sem 3"
  | "Sem 4"
  | "Sem 5"
  | "Sem 6";

export interface SaveTraditionalExamPayload {
  applicationId: string;
  appNo?: string;
  examLevel: PgExamLevel;
  instituteName?: string;
  registrationNumber?: string;
  year?: number;
  maxMarks?: number;
  obtainedMarks?: number;
  percentage?: number;
  cgpa?: number;
  // Subjects studied at this level (currently used for "12th" and
  // "Diploma" — drives PG eligibility subject-matching). Same column
  // name as SaveDegreeMarksPayload.ugSubject, just also present on the
  // 12th/Diploma rows now. Optional, and meaningless for "10th"/Sem
  // levels, but kept on the shared payload type since every
  // traditional-exam level goes through this same save call.
  ugSubject?: string;
}

export interface SaveDegreeMarksPayload {
  applicationId: string;
  appNo?: string;
  sameInstitution: boolean;
  entryMode: PgEntryMode;
  year?: number; // year of passing for the UG/Degree — same convention as SaveTraditionalExamPayload.year
  instituteName?: string; // only when sameInstitution = true
  registrationNumber?: string; // only when sameInstitution = true
  ugSubject?: string;
  overallPercentage?: number;
  periods: PgEducationPeriodPayload[];
}

export interface PgEducationDetailResponse {
  id: string;
  applicationId: string;
  appNo?: string;
  examLevel: string; // '10th' | '12th' | 'Diploma' | 'Sem 1'..'Sem 6' | 'Degree Marks'
  instituteName?: string;
  registrationNumber?: string;
  year?: number;
  maxMarks?: number;
  obtainedMarks?: number;
  percentage?: number;
  cgpa?: number;
  sameInstitution?: boolean;
  entryMode?: PgEntryMode;
  ugSubject?: string;
  overallPercentage?: number;
  periods: PgEducationPeriodResponse[];
}

export const getPgEducationByApplicationId = async (
  applicationId: string
): Promise<PgEducationDetailResponse[]> => {
  const res = await api.get(`/pg-education/${applicationId}`);
  return res.data;
};

export const savePgTraditionalExam = async (
  payload: SaveTraditionalExamPayload
): Promise<PgEducationDetailResponse> => {
  const res = await api.post(`/pg-education/exam`, payload);
  return res.data;
};

export const savePgDegreeMarks = async (
  payload: SaveDegreeMarksPayload
): Promise<PgEducationDetailResponse> => {
  const res = await api.post(`/pg-education/degree-marks`, payload);
  return res.data;
};

export const deletePgExam = async (pgEducationDetailId: string): Promise<void> => {
  await api.delete(`/pg-education/exam/${pgEducationDetailId}`);
};

export const deletePgDegreeMarks = async (applicationId: string): Promise<void> => {
  await api.delete(`/pg-education/degree-marks/${applicationId}`);
};