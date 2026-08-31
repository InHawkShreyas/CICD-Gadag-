import api from "../utils/client";

// ✅ SET PASSWORD (create login record)
export const setPassword = async (data: {
  username: string;
  password: string;
  registrationId: string;
  roleId?: string;
}): Promise<{ success: boolean }> => {
  const response = await api.post<{ success: boolean }>(
    "/login/set-password",
    data
  );
  return response.data;
};

// ✅ LOGIN
export const login = async (data: {
  username: string;
  password: string;
}): Promise<{ success: boolean; token?: string; username?: string; roleId?: string }> => {
  const response = await api.post<{ success: boolean; token?: string; username?: string; roleId?: string }>(
    "/login",
    data
  );
  return response.data;
};

// ✅ GET LOGIN BY USERNAME
export const getLoginByUsername = async (
  username: string
): Promise<{ username: string; roleId: string; ipAddress: string | null }> => {
  const response = await api.get<{ username: string; roleId: string; ipAddress: string | null }>(
    `/login/${username}`
  );
  return response.data;
};

// ✅ GET LOGINS BY ROLE ID (e.g. all usernames with the Document-Admin role)
export const getLoginsByRoleId = async (
  roleId: string
): Promise<{ id: string; username: string; roleId: string }[]> => {
  const response = await api.get<{ id: string; username: string; roleId: string }[]>(
    `/login/by-role/${roleId}`
  );
  return response.data;
};

// ✅ UPDATE ROLE
export const updateRole = async (data: {
  username: string;
  roleId: string;
}): Promise<{ success: boolean }> => {
  const response = await api.post<{ success: boolean }>(
    "/login/update-role",
    data
  );
  return response.data;
};

// ✅ RESET PASSWORD (forgot password flow)
export const resetPassword = async (data: {
  username: string;
  newPassword: string;
}): Promise<{ success: boolean }> => {
  const response = await api.post<{ success: boolean }>(
    "/login/reset-password",
    data
  );
  return response.data;
};

// ✅ FORGOT USERNAME — STEP 1: verify Aadhaar/Passport + Mobile, send OTP
export const sendUsernameOtp = async (data: {
  idType: "aadhaar" | "passport";
  idNumber: string;
  mobile: string;
}): Promise<{ success: boolean; message?: string }> => {
  const response = await api.post<{ success: boolean; message?: string }>(
    "/login/forgot-username/send-otp",
    data
  );
  return response.data;
};

// ✅ FORGOT USERNAME — RESEND OTP
export const resendUsernameOtp = async (data: {
  idType: "aadhaar" | "passport";
  idNumber: string;
  mobile: string;
}): Promise<{ success: boolean; message?: string }> => {
  const response = await api.post<{ success: boolean; message?: string }>(
    "/login/forgot-username/resend-otp",
    data
  );
  return response.data;
};

// ✅ FORGOT USERNAME — STEP 2: verify OTP (username is sent via SMS by the backend)
export const verifyUsernameOtp = async (data: {
  idType: "aadhaar" | "passport";
  idNumber: string;
  mobile: string;
  otp: string;
}): Promise<{ success: boolean; message?: string; username?: string }> => {
  const response = await api.post<{
    success: boolean;
    message?: string;
    username?: string;
  }>("/login/forgot-username/verify-otp", data);
  return response.data;
};