import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";

export default function AdmissionLockedScreen() {
  const navigate = useNavigate();

  return (
    <div
      data-testid="admission-locked-screen"
      className="flex flex-col items-center justify-center h-[calc(100vh-56px)] gap-3 p-6 text-center"
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full text-amber-600 bg-amber-50">
        <Lock size={20} />
      </div>
      <p className="text-sm font-semibold text-gray-800">This section is locked</p>
      <p className="max-w-sm text-sm text-gray-500">
        Your admission fee has been paid, so this page can no longer be viewed or edited.
      </p>
      <Button onClick={() => navigate("/student/admission-fee")}>
        Go to Admission Fee
      </Button>
    </div>
  );
}