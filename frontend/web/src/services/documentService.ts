import api from "../utils/client";

/* ================= TYPES ================= */

export type ApplicationDocument = {
  id: string;
  applicationId: string;
  applicationNo: string;
  documentName: string;
  fileName?: string;
  fileUrl?: string;
};

/* ================= CREATE ================= */

export const createDocument = async (data: {
  applicationNo: string;   // ✅ ONLY THIS
  documentName: string;
  file?: File;
  insertBy?: string;
}) => {
  const formData = new FormData();

  formData.append("ApplicationNo", data.applicationNo); // ✅ FIXED
  formData.append("DocumentName", data.documentName);

  if (data.file) formData.append("File", data.file);
  if (data.insertBy) formData.append("InsertBy", data.insertBy);

  const response = await api.post<ApplicationDocument>(
    "/application-documents",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return response.data;
};

/* ================= GET ALL ================= */

export const getDocuments = async () => {
  const response = await api.get<ApplicationDocument[]>("/application-documents");
  return response.data;
};

/* ================= GET BY ID ================= */

export const getDocumentById = async (id: string) => {
  const response = await api.get<ApplicationDocument>(
    `/application-documents/${id}`
  );
  return response.data;
};

/* ================= UPDATE ================= */

export const updateDocument = async (data: {
  id: string;
  documentName: string;
  file?: File;
  updateBy?: string;
}) => {
  const formData = new FormData();

  formData.append("Id", data.id);
  formData.append("DocumentName", data.documentName);

  if (data.file) formData.append("File", data.file);
  if (data.updateBy) formData.append("UpdateBy", data.updateBy);

  const response = await api.put<{ success: boolean }>(
    "/application-documents",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return response.data;
};

/* ================= DELETE ================= */

export const deleteDocument = async (id: string) => {
  const response = await api.delete<{ success: boolean }>(
    `/application-documents/${id}`
  );
  return response.data;
};

/* ================= VIEW FILE ================= */

export const openDocumentFile = async (id: string) => {
  try {
    const response = await api.get(
      `/application-documents/download/${id}`,
      {
        responseType: "blob",
      }
    );

    const blob = response.data;
    const url = URL.createObjectURL(blob);

    window.open(url, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Failed to open document:", error);
  }
};

/* ================= GET BY APPLICATION ID ================= */

export const getDocumentsByAppId = async (applicationId: string) => {
  const response = await api.get<ApplicationDocument[]>(
    `/application-documents/by-app-id/${applicationId}`
  );
  return response.data;
};

/* ================= DOWNLOAD FILE ================= */

export const downloadDocumentFile = async (id: string) => {
  const response = await api.get(`/application-documents/download/${id}`, {
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"];
  let fileName = "document";

  if (disposition) {

    const rfc5987Match = disposition.match(/filename\*=UTF-8''([^;\n]+)/i);
    if (rfc5987Match) {
      fileName = decodeURIComponent(rfc5987Match[1].trim());
    } else {

      const plainMatch = disposition.match(/filename="?([^";\n]+)"?/i);
      if (plainMatch) {
        fileName = plainMatch[1].trim();
      }
    }
  }

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};