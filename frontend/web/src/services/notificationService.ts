import api from "../utils/client";

/* ================= TYPES ================= */

export type Notification = {
  id: string;
  title: string;
  description?: string;
  fileName?: string;
  fileUrl?: string;
  date?: string;
};

/* ================= CREATE ================= */

export const createNotification = async (data: {
  title: string;
  description?: string;
  date?: string;
  file?: File;
  insertBy?: string;
}) => {
  const formData = new FormData();

  formData.append("Title", data.title);
  if (data.description) formData.append("Description", data.description);
  if (data.date) formData.append("Date", data.date);
  if (data.file) formData.append("File", data.file);
  if (data.insertBy) formData.append("InsertBy", data.insertBy);

  const response = await api.post<Notification>(
    "/Notification",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return response.data;
};

/* ================= GET ALL ================= */

export const getNotifications = async () => {
  const response = await api.get<Notification[]>("/Notification");
  return response.data;
};

/* ================= GET BY ID ================= */

export const getNotificationById = async (id: string) => {
  const response = await api.get<Notification>(`/Notification/${id}`);
  return response.data;
};

/* ================= UPDATE ================= */

export const updateNotification = async (data: {
  id: string;
  title: string;
  description?: string;
  date?: string;
  file?: File;
  updateBy?: string;
}) => {
  const formData = new FormData();

  formData.append("Id", data.id);
  formData.append("Title", data.title);
  if (data.description) formData.append("Description", data.description);
  if (data.date) formData.append("Date", data.date);
  if (data.file) formData.append("File", data.file);
  if (data.updateBy) formData.append("UpdateBy", data.updateBy);

  const response = await api.put<{ success: boolean }>(
    "/Notification",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return response.data;
};

/* ================= DELETE ================= */

export const deleteNotification = async (id: string) => {
  const response = await api.delete<{ success: boolean }>(
    `/Notification/${id}`
  );
  return response.data;
};

/* ================= VIEW FILE (OPEN IN NEW TAB) ================= */

export const openNotificationFile = (id: string) => {
  window.open(
    `http://localhost:5063/api/Notification/${id}/file`,
    "_blank"
  );
};

/* ================= DOWNLOAD FILE ================= */

export const downloadNotificationFile = async (id: string) => {
  const response = await api.get(`/Notification/${id}/file`, {
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] ?? "";
  let fileName = "notification.pdf"; 

  
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    fileName = decodeURIComponent(utf8Match[1].trim());
  } else {

    const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (plainMatch) {
      fileName = decodeURIComponent(plainMatch[1].trim());
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