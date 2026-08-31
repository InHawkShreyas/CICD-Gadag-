import api from "../utils/client";

export interface CreateDocumentCoordinatorDto {
  loginId: string;
  degreeTypeId: string;
  degreeId: string;
  courseId: string;
}

export type UpdateDocumentCoordinatorDto = {
  id: string;
  loginId: string;
  degreeTypeId: string;
  degreeId: string;
  courseId: string;
  status?: boolean;
};

export type DocumentCoordinatorMapping = {
  id: string;
  loginId: string;
  degreeTypeId: string;
  username: string;
  degreeId: string;
  courseId: string;
  degreeName?: string | null;
  courseName?: string | null;
  status?: boolean;
};

const BASE_URL = "/DocumentCoordinator";

export const createDocumentCoordinators = async (
  payload: CreateDocumentCoordinatorDto[]
): Promise<DocumentCoordinatorMapping[]> => {
  const response = await api.post<DocumentCoordinatorMapping[]>(
    BASE_URL,
    payload
  );
  return response.data;
};

export const getDocumentCoordinators = async (): Promise<
  DocumentCoordinatorMapping[]
> => {
  const response = await api.get<DocumentCoordinatorMapping[]>(BASE_URL);
  return response.data;
};

export const getDocumentCoordinatorById = async (
  id: string
): Promise<DocumentCoordinatorMapping> => {
  const response = await api.get<DocumentCoordinatorMapping>(
    `${BASE_URL}/${id}`
  );
  return response.data;
};

export const updateDocumentCoordinator = async (
  payload: UpdateDocumentCoordinatorDto
): Promise<DocumentCoordinatorMapping> => {
  const response = await api.put<DocumentCoordinatorMapping>(
    BASE_URL,
    payload
  );
  return response.data;
};

export function isCoordinatorMappingActive(status: unknown): boolean {
  if (status === false || status === 0) return false;
 
  if (typeof status === "string") {
    const normalized = status.trim().toLowerCase();
    if (normalized === "false" || normalized === "0" || normalized === "inactive" || normalized === "no") {
      return false;
    }
  }
  return true;
}