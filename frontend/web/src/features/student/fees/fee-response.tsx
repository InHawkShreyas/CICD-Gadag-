import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { XCircle, Loader2 } from "lucide-react";
import { updatePayment } from "../../../services/feeCollectionService";

export default function FeeResponsePage() {
  const [params] = useSearchParams();

  const receiptNumber = params.get("receipt") ?? "";
  const statusParam = (params.get("status") ?? "").toLowerCase();

  const orderId = params.get("order_id") ?? receiptNumber;
  const transactionId = params.get("easepayid") ?? "";
  const amount = Number(params.get("amount") ?? 0);

  const [state, setState] = useState<"loading" | "error">("loading");
  const [error, setError] = useState("");

  const executed = useRef(false);
  
useEffect(() => {
  if (executed.current) return;
  executed.current = true;

  const run = async () => {
    if (!receiptNumber) {
      setState("error");
      setError("Missing receipt number.");
      return;
    }

    try {
      let finalStatus: "SUCCESS" | "FAILED" | "PENDING";

      if (statusParam === "success") {
        finalStatus = "SUCCESS";
      } else if (
        statusParam === "failure" ||
        statusParam === "failed" ||
        statusParam === "dropped"
      ) {
        finalStatus = "FAILED";
      } else {
        finalStatus = "PENDING";
      }

      // ✅ Update payment in DB
      await updatePayment({
        receiptNumber,
        orderId,
        transactionId,
        paidAmount: amount,
        status: finalStatus,
        paymentDate: new Date().toISOString(),
      });

      // 🔥 Redirect to the receipt page, pinned to this exact receipt
      // (works for any fee type — Application Fee, Admission Fee, Exam Fees, …)
      window.location.replace(`/student/fee-receipt?receipt=${encodeURIComponent(receiptNumber)}`);

    } catch (err) {
      console.error("UPDATE ERROR:", err);

      setState("error");
      setError("Payment update failed. Please contact support.");
    }
  };

  run();
}, [receiptNumber, statusParam]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-5">
        <div
          className={`rounded-2xl border p-6 text-center space-y-3 ${
            state === "loading"
              ? "border-gray-200 bg-white"
              : "border-red-200 bg-red-50"
          }`}
        >
          {state === "loading" ? (
            <Loader2 size={40} className="mx-auto text-primary animate-spin" />
          ) : (
            <XCircle size={40} className="mx-auto text-red-500" />
          )}

          <p
            className={`text-lg font-bold ${
              state === "loading" ? "text-gray-600" : "text-red-700"
            }`}
          >
            {state === "loading"
              ? "Processing payment…"
              : "Payment Failed"}
          </p>

          {state === "error" && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}