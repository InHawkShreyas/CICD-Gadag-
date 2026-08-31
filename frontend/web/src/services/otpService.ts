import api from "../utils/client";

// ✅ SEND OTP
export const sendOtp = async (data: {
  username: string;
  mobile: string;
}) => {
  const response = await api.post("/otp/send", data);
  return response.data;
};

// ✅ VERIFY OTP
export const verifyOtp = async (data: {
  username: string;
  otp: string;
}) => {
  const response = await api.post("/otp/verify", data);
  return response.data;
};

// ✅ RESEND OTP
export const resendOtp = async (data: {
  username: string;
  mobile: string;
}) => {
  const response = await api.post("/otp/resend", data);
  return response.data;
};