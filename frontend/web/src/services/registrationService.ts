import api from "../utils/client";

// ✅ CREATE REGISTRATION
export const createRegistration = async (data: {
  username: string;
  name?: string;
  nationalityId?: string;
  degreeTypeId?: string;
  mobile?: string;
  email?: string;
  aadharNo?: string;
  academicYearDescription?: string;
  degreeTypeName?: string;
  passportNo?: string;
  dob?: string;
  usnNo?: string;
  examRegistration?: boolean;
}) => {
  const response = await api.post("/registration", data);
  return response.data;
};

export const checkIdentityExists = async (
  documentType: "aadhar" | "passport",
  value: string
): Promise<{
  exists: boolean;
  completed: boolean;
  username: string | null;
  allowedDegreeTypeIds: string[] | null;
  prefill: {
    name?: string | null;
    mobile?: string | null;
    email?: string | null;
    dob?: string | null;
    nationalityId?: string | null;
    degreeTypeId?: string | null;
    usnNo?: string | null;
  } | null;
}> => {
  const response = await api.get(
    `/registration/check-identity/${documentType}/${encodeURIComponent(value)}`
  );
  return response.data;
};

export const resumeIncompleteRegistration = async (
  existingUsername: string,
  data: {
    username: string;
    name?: string;
    nationalityId?: string;
    degreeTypeId?: string;
    mobile?: string;
    email?: string;
    aadharNo?: string;
    passportNo?: string;
    dob?: string;
    usnNo?: string;
    examRegistration?: boolean;
  }
) => {
  const response = await api.patch(`/registration/${existingUsername}/resume`, data);
  return response.data;
};

// ✅ GET ALL REGISTRATIONS
export const getAllRegistrations = async () => {
  const response = await api.get("/registration");
  return response.data;
};

// ✅ GET BY USERNAME
export const getRegistrationByUsername = async (username: string) => {
  const response = await api.get(`/registration/${username}`);
  return response.data;
};

// ✅ SOFT DELETE
export const deleteRegistration = async (username: string) => {
  const response = await api.delete(`/registration/${username}`);
  return response.data;
};

// ✅ UPDATE EXAM REGISTRATION FLAG
export const updateExamRegistration = async (
  username: string,
  examRegistration: boolean
): Promise<{ message: string }> => {
  const response = await api.patch(`/registration/${username}/exam-registration`, {
    examRegistration,
  });
  return response.data;
};