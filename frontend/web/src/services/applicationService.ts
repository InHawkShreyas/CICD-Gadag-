import api from "../utils/client";

/* ================= TYPES ================= */

export type CreateApplicationDto = {
  academicYearId?: string;
  appNo?: string;
  name: string;
  dob?: string; 
  phone?: string;
  email?: string;
  placeOfBirth?: string;
  gender?: string;
  nationalityId?: string;
  karnatakaYn?: boolean;
  aadharNo?: string;
  passportNo?: string;
  visaNo?: string;
  passportExpiryDate?: string;
  visaExpiryDate?: string;
  religion?: string;
  categoryId?: string | null;
  caste?: string;
  annualIncome?: number;
  rdNumber?: string;
  casteRdNumber?: string;
  apaarId?: string;
  statsId?: string;
  fatherName?: string;
  fatherNo?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherNo?: string;
  motherOccupation?: string;
  guardianName?: string;
  guardianNo?: string;
  permanentAddressLine1?: string;
  permanentAddressLine2?: string;
  permanentCity?: string;
  permanentState?: string;
  permanentCountry?: string;
  permanentPostalCode?: string;
  presentAddressLine1?: string;
  presentAddressLine2?: string;
  presentCity?: string;
  presentState?: string;
  presentCountry?: string;
  presentPostalCode?: string;
  sameAsPermanet?: boolean;
};

export type ApplicationResponse = {
  id: string;
  appNo: string;
  name: string;
  phone?: string;
  email?: string;
  dob?: string;
  categoryId?: string;
  caste?: string;
  aadharNo?: string;
  passportNo?: string;
  visaNo?: string;
  passportExpiryDate?: string;
  visaExpiryDate?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianNo?: string;
  apaarId?: string;
  statsId?: string;
  insertOn?: string;
  academicYearId?: string;
  karnatakaYn?: boolean;
};

/* ================= API ================= */

// ✅ CREATE
export const createApplication = async (data: CreateApplicationDto) => {
  const response = await api.post("/Application", data);
  return response.data as ApplicationResponse;
};

// ✅ GET ALL
export const getApplications = async () => {
  const response = await api.get("/Application");
  return response.data as ApplicationResponse[];
};

// ✅ GET BY ID
export const getApplicationById = async (id: string) => {
  const response = await api.get(`/Application/${id}`);
  return response.data as ApplicationResponse;
};

// ✅ UPDATE
export type UpdateApplicationDto = CreateApplicationDto;

export const updateApplication = async (appNo: string, data: UpdateApplicationDto) => {
  const response = await api.put(`/Application/${appNo}`, data);
  return response.data as ApplicationResponse;
};

// ✅ DELETE
export const deleteApplication = async (id: string) => {
  await api.delete(`/Application/${id}`);
};