
import api from "../utils/client";

/* ================= CONFIG ================= */

// 🔥 Always use env (VERY IMPORTANT for prod)
const API_BASE = import.meta.env.VITE_API_BASE_URL

/* ================= TYPES ================= */

export type ApplicationPhotoResponse = {
  id: string;
  applicationId: string;
  appNo: string;
  photoUrl?: string;
  signatureUrl?: string;
  parentSignUrl?: string;
};

/* ================= HELPERS ================= */

// ✅ Convert relative → full URL
export const buildFileUrl = (path?: string) => {
  if (!path) return undefined;
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
};

/* ================= API ================= */

// ✅ UPLOAD / UPDATE
export const uploadApplicationPhoto = async ({
  applicationId,
  appNo,
  photo,
  signature,
  parentSignature,
}: {
  applicationId: string;
  appNo: string;
  photo?: File;
  signature?: File;
  parentSignature?: File;
}) => {
  const formData = new FormData();

  formData.append("applicationId", applicationId);
  formData.append("appNo", appNo);

  if (photo) formData.append("photo", photo);
  if (signature) formData.append("signature", signature);
  if (parentSignature) formData.append("parentSignature", parentSignature);

  return api.post("/ApplicationPhoto", formData, {
    headers: {
      // ❗ DO NOT force application/json
      "Content-Type": "multipart/form-data",
    },
  }).then(res => res.data);
};

// ✅ GET BY APPLICATION ID
export const getApplicationPhoto = async (applicationId: string) => {
  const response = await api.get(`/ApplicationPhoto/${applicationId}`);
  return response.data as ApplicationPhotoResponse;
};

/* ================= FILE DOWNLOAD ================= */

// ✅ PHOTO
export const getApplicationPhotoFile = async (applicationId: string) => {
  const response = await api.get(
    `/ApplicationPhoto/${applicationId}/photo`,
    { responseType: "blob" }
  );
  return response.data as Blob;
};

// ✅ SIGNATURE
export const getApplicationSignatureFile = async (applicationId: string) => {
  const response = await api.get(
    `/ApplicationPhoto/${applicationId}/signature`,
    { responseType: "blob" }
  );
  return response.data as Blob;
};

// ✅ 🔥 NEW — PARENT SIGNATURE
export const getApplicationParentSignatureFile = async (applicationId: string) => {
  const response = await api.get(
    `/ApplicationPhoto/${applicationId}/parent-signature`,
    { responseType: "blob" }
  );
  return response.data as Blob;
};