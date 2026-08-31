import api from "../utils/client";

/* ================= TYPES ================= */

export type SeatTypeDto = {
  id?: string;

  applicationId: string;
  applicationNo?: string;

  seatTypeId: string;   // 🔥 lookup id
  seatTypeName: string; // optional but you are using
};

/* ================= API ================= */

// ✅ CREATE
export const createSeatType = async (data: SeatTypeDto) => {
  const response = await api.post("/SeatType", data);
  return response.data;
};

// ✅ GET BY APPLICATION
export const getSeatTypesByApplicationId = async (applicationId: string) => {
  const response = await api.get(`/SeatType/application/${applicationId}`);
  return response.data as SeatTypeDto[];
};

// ✅ UPDATE
export const updateSeatType = async (data: SeatTypeDto) => {
  const response = await api.put("/SeatType", data);
  return response.data;
};

// ✅ DELETE
export const deleteSeatType = async (id: string) => {
  await api.delete(`/SeatType/${id}`);
};