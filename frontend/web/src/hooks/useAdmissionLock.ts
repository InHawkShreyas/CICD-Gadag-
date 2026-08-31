import { useState, useEffect, useCallback } from "react";
import { getMyFullApplication } from "../services/applicationQueryService";
import { getFeesByApplicationId } from "../services/feeCollectionService";
import { getFeeCollectionManualByAppNo } from "../services/feecollectionmanualService";
import { getApplicationVerificationByAppNo } from "../services/applicationVerificationService";

const ADMISSION_FEE_TYPES = [
  "admission fee",
  "admission fee - installment 1",
  "admission fee - installment 2",
];

export function useAdmissionLock() {
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const result = await getMyFullApplication();
      const app = result.application;
      if (!app) {
        setLocked(false);
        return;
      }
      const applicationId = app.id;
      const appNo = app.appNo;

      const [feesResult, manualResult, verificationResult] = await Promise.allSettled([
        getFeesByApplicationId(applicationId),
        getFeeCollectionManualByAppNo(appNo),
        getApplicationVerificationByAppNo(appNo),   // NEW
      ]);

      const onlinePaid =
        feesResult.status === "fulfilled" &&
        feesResult.value.some(
          (f) =>
            (f.status ?? "").toLowerCase() === "success" &&
            ADMISSION_FEE_TYPES.some((t) =>
              (f.feeType ?? "").toLowerCase().includes(t),
            ),
        );

      const manualPaid =
        manualResult.status === "fulfilled" &&
        manualResult.value.some((f) =>
          (f.feeName ?? "").toLowerCase().includes("admission fee"),
        );

      // NEW — admin override. If no verification record exists yet, treat as no override.
      const overrideAllowed =
        verificationResult.status === "fulfilled" &&
        verificationResult.value?.postPaymentEdit === true;

      setLocked((onlinePaid || manualPaid) && !overrideAllowed);
    } catch {
      setLocked(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { locked, checking, recheck: check };
}