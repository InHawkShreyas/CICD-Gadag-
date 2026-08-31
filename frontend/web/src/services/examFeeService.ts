import api from "../utils/client";

export type ExamFee = {
  id: string;
  degreeId: string;
  courseId: string;
  academicYearId: string;
  examFeeAmount: number;
  platformCharges: number;
  totalAmount: number;
  startDate: string;
  endDate: string;
  fineEndDate: string;
  fineAmount: number;
  status: boolean;
};

export type ExamFeePayload = Omit<ExamFee, "id" | "status">;

export const createExamFee = async (
  data: ExamFeePayload
): Promise<ExamFee> => {
  const response = await api.post<ExamFee>("/ExamFee", {
    ...data,
    status: true,
  });

  return response.data;
};

export const updateExamFee = async (
  id: string,
  data: ExamFeePayload,
  status: boolean
): Promise<ExamFee> => {
  const response = await api.post<ExamFee>("/ExamFee", {
    id,
    ...data,
    status,
  });

  return response.data;
};

export const getExamFees = async (): Promise<ExamFee[]> => {
  const response = await api.get<ExamFee[]>("/ExamFee/all");

  return response.data;
};

export const getExamFeeById = async (id: string): Promise<ExamFee> => {
  const response = await api.get<ExamFee>(`/ExamFee/${id}`);

  return response.data;
};

export const setExamFeeStatus = async (
  fee: ExamFee,
  status: boolean
): Promise<ExamFee> => {
  try {
    const response = await api.post<ExamFee>("/ExamFee", {
      id: fee.id,
      degreeId: fee.degreeId,
      courseId: fee.courseId,
      academicYearId: fee.academicYearId,
      examFeeAmount: fee.examFeeAmount,
      platformCharges: fee.platformCharges,
      totalAmount: fee.totalAmount,
      startDate: fee.startDate,
      endDate: fee.endDate,
      fineEndDate: fee.fineEndDate,
      fineAmount: fee.fineAmount,
      status,
    });

    return response.data;
  } catch (err: any) {
    console.error(
      status ? "Exam fee activation error:" : "Exam fee deactivation error:",
      err
    );

    throw err;
  }
};

export const formatFeeAmount = (amount?: number): string => {
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
};