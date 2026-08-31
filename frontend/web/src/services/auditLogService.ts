import api from "../utils/client";

/* ================= TYPES ================= */

export type AuditLog = {
  id: string;
  tableName?: string;
  recordId?: string;
  action?: string;

  oldData?: string; // JSON string
  newData?: string; // JSON string

  performedBy?: string;
  performedOn?: string;
  ipAddress?: string;
};

/* ================= GET ALL ================= */

export const getAuditLogs = async (
  page = 1,
  pageSize = 100
) => {
  const response = await api.get<AuditLogResponse>(
    `/AuditLog?page=${page}&pageSize=${pageSize}`
  );

  return response.data;
};

/* ================= GET BY RECORD ================= */

export const getAuditLogsByRecord = async (recordId: string) => {
  const response = await api.get<AuditLog[]>(
    `/AuditLog/record/${recordId}`
  );
  return response.data;
};

export type AuditLogResponse = {
  totalCount: number;
  items: AuditLog[];
};
