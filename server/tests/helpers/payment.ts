import request from "supertest";
import { app } from "../../src/app";
import { bearer, type TestSession } from "./auth";

export const confirmPayment = async (
  appointmentId: string,
  patient: TestSession,
): Promise<void> => {
  const res = await request(app)
    .post(`/api/appointments/${appointmentId}/payment/confirm`)
    .set("Authorization", bearer(patient));
  if (res.status !== 200) {
    throw new Error(
      `confirmPayment failed: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
};
