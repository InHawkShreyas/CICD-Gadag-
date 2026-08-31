import { useState, useEffect } from "react";
import { Upload, Download, ImageIcon, PenLine, Users, Eye, X, Lock } from "lucide-react";
import AppLayout from "../../components/layouts/AppLayout";
import Toast from "../../components/ui/Toast";
import { getMyFullApplication } from "../../services/applicationQueryService";
import {
  uploadApplicationPhoto,
  getApplicationPhoto,
  getApplicationPhotoFile,
  getApplicationSignatureFile,
  getApplicationParentSignatureFile,
} from "../../services/applicationPhotoService";
import type { ApplicationPhotoResponse } from "../../services/applicationPhotoService";
import { useAdmissionLock } from "../../hooks/useAdmissionLock";

/* ─── Types ───────────────────────────────────────────────────────────────── */

type SlotKey = "photo" | "signature" | "parentSignature";

type SlotConfig = {
  key: SlotKey;
  label: string;
  description: string;
  requirements: string;
  icon: React.ReactNode;
};

/* ─── Config ──────────────────────────────────────────────────────────────── */

const SLOTS: SlotConfig[] = [
  {
    key: "photo",
    label: "Student Photo (ವಿದ್ಯಾರ್ಥಿಯ ಫೋಟೋ)",
    description: "Clear passport-sized photo (ಸ್ಪಷ್ಟ ಪಾಸ್‌ಪೋರ್ಟ್ ಗಾತ್ರದ ಫೋಟೋ)",
    requirements: "JPEG / PNG · max 5 MB · face clearly visible",
    icon: <ImageIcon size={20} className="text-gray-400" />,
  },
  {
    key: "signature",
    label: "Student Signature (ವಿದ್ಯಾರ್ಥಿಯ ಸಹಿ)",
    description: "Digital or scanned signature (ಡಿಜಿಟಲ್ ಅಥವಾ ಸ್ಕ್ಯಾನ್ ಸಹಿ)",
    requirements: "JPEG / PNG · max 5 MB · clear signature",
    icon: <PenLine size={20} className="text-gray-400" />,
  },
  {
    key: "parentSignature",
    label: "Parent / Guardian Signature (ಪೋಷಕರ ಸಹಿ)",
    description: "Digital or scanned parent/guardian signature (ಪೋಷಕರ ಡಿಜಿಟಲ್ ಸಹಿ)",
    requirements: "JPEG / PNG · max 5 MB · clear signature",
    icon: <Users size={20} className="text-gray-400" />,
  },
];

const MAX_MB = 5;

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function PhotoUploadPage() {
  const { locked, checking: lockChecking } = useAdmissionLock();
  const [applicationId, setApplicationId] = useState("");
  const [appNo, setAppNo]                 = useState("");
  const [existing, setExisting]           = useState<ApplicationPhotoResponse | null>(null);

  // Local previews (File objects selected but not yet uploaded)
  const [preview, setPreview] = useState<Partial<Record<SlotKey, string>>>({});
  const [uploading, setUploading] = useState<Partial<Record<SlotKey, boolean>>>({});

  // ✅ NEW — authenticated blob URLs fetched via the API (replaces buildFileUrl + raw <img src>)
  const [photoUrls, setPhotoUrls] = useState<Partial<Record<SlotKey, string>>>({});

  const [downloading, setDownloading] = useState<Partial<Record<SlotKey, boolean>>>({});
  const [toast, setToast]             = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [fetching, setFetching]       = useState(true);
  const [viewModal, setViewModal]     = useState<{ url: string; label: string } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Load on mount ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const fullResult = await getMyFullApplication();
        const app = fullResult.application;
        if (!app) return;
        setApplicationId(app.id);
        setAppNo(app.appNo);
        try {
          const data = await getApplicationPhoto(app.id);
          setExisting(data);
        } catch {
          // No photo record yet
        }
      } catch {
        showToast("Failed to load application details.", "error");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);

  /* ── Fetch authenticated blob URLs whenever `existing` changes ──────────── */
  useEffect(() => {
    if (!existing || !applicationId) return;

    let cancelled = false;
    const createdUrls: string[] = [];

    const fetchAll = async () => {
      const entries: [SlotKey, string | undefined][] = [
        ["photo", existing.photoUrl],
        ["signature", existing.signatureUrl],
        ["parentSignature", existing.parentSignUrl],
      ];

      for (const [key, url] of entries) {
        if (!url) continue;
        try {
          let blob: Blob;
          if (key === "photo") blob = await getApplicationPhotoFile(applicationId);
          else if (key === "signature") blob = await getApplicationSignatureFile(applicationId);
          else blob = await getApplicationParentSignatureFile(applicationId);

          if (cancelled) return;
          const objectUrl = URL.createObjectURL(blob);
          createdUrls.push(objectUrl);
          setPhotoUrls((p) => ({ ...p, [key]: objectUrl }));
        } catch {
          // Leave slot empty on failure; upload area will show instead of a broken image
        }
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [existing, applicationId]);

  /* ── Upload ────────────────────────────────────────────────────────────── */
  const handleFile = async (key: SlotKey, file: File) => {
    const valid = ["image/jpeg", "image/png"];
    if (!valid.includes(file.type)) {
      showToast("Please upload a JPEG or PNG file.", "error");
      return;
    }
    if (file.size / (1024 * 1024) > MAX_MB) {
      showToast(`File must be under ${MAX_MB} MB.`, "error");
      return;
    }

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview((p) => ({ ...p, [key]: objectUrl }));

    if (!applicationId) {
      showToast("No application found. Complete Personal Details first.", "error");
      return;
    }

    try {
      setUploading((u) => ({ ...u, [key]: true }));
      const result = await uploadApplicationPhoto({
        applicationId,
        appNo,
        photo:           key === "photo"            ? file : undefined,
        signature:       key === "signature"        ? file : undefined,
        parentSignature: key === "parentSignature"  ? file : undefined,
      });
      setExisting(result);
      setPreview((p) => ({ ...p, [key]: undefined }));
      showToast("Uploaded successfully!", "success");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(e?.response?.data?.message ?? e?.message ?? "Upload failed.", "error");
      setPreview((p) => ({ ...p, [key]: undefined }));
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  /* ── Download ─────────────────────────────────────────────────────────── */
  const handleDownload = async (key: SlotKey, label: string) => {
    if (!applicationId) return;
    try {
      setDownloading((d) => ({ ...d, [key]: true }));
      let blob: Blob;
      if (key === "photo")                blob = await getApplicationPhotoFile(applicationId);
      else if (key === "signature")       blob = await getApplicationSignatureFile(applicationId);
      else                                blob = await getApplicationParentSignatureFile(applicationId);
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href     = url;
      a.download = `${label.replace(/[^a-z0-9]/gi, "_")}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Download failed.", "error");
    } finally {
      setDownloading((d) => ({ ...d, [key]: false }));
    }
  };

  /* ── Helpers ───────────────────────────────────────────────────────────── */

  // ✅ UPDATED — prefer local preview, then the authenticated fetched blob URL
  const getUrl = (key: SlotKey): string | undefined => {
    if (preview[key]) return preview[key];
    return photoUrls[key];
  };

  const uploadedCount = SLOTS.filter((s) => !!getUrl(s.key)).length;

  /* ── UI ─────────────────────────────────────────────────────────────────── */
  if (lockChecking || fetching) {
    return (
      <AppLayout pageTitle="Photos & Signatures">
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          Loading...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Photos & Signatures">
      {toast && (
        <div className="fixed z-50 top-5 right-5">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}

      <div data-testid="photo-page" className="pb-8 space-y-4">

        {locked && (
          <div className="flex items-center gap-3 px-4 py-3 border rounded-lg bg-amber-50 border-amber-200 text-amber-700">
            <Lock size={15} className="shrink-0" />
            <p className="text-sm font-medium">
              Your admission fee has been paid. Photos and signatures can be viewed and downloaded but not uploaded or replaced.
            </p>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-text">
            Photos &amp; Signatures
            <span className="ml-2 text-lg font-normal text-gray-400">(ಫೋಟೋಗಳು ಮತ್ತು ಸಹಿಗಳು)</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload your photo and signature for official documents.
          </p>
        </div>

        {/* ── Progress ───────────────────────────────────────────────────── */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600">Upload Progress</span>
            <span className="text-xs font-semibold text-primary">{uploadedCount} / {SLOTS.length} uploaded</span>
          </div>
          <div className="w-full h-2 overflow-hidden bg-gray-100 rounded-full">
            <div
              className="h-full transition-all duration-500 bg-primary"
              style={{ width: `${(uploadedCount / SLOTS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Upload cards ───────────────────────────────────────────────── */}
        <div className="space-y-3">
          {SLOTS.map((slot) => {
            const url        = getUrl(slot.key);
            const isUploading = !!uploading[slot.key];

            return (
              <div key={slot.key} data-testid={`photo-card-${slot.key}`} className="p-4 bg-white border border-gray-200 rounded-lg">
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2">
                    {slot.icon}
                    <div>
                      <h3 className="text-sm font-semibold text-text">{slot.label}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{slot.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{slot.requirements}</p>
                    </div>
                  </div>
                  {url && (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                      Uploaded
                    </span>
                  )}
                </div>

                {url ? (
                  /* ── Uploaded state ── */
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center min-w-0 gap-3">
                      <img
                        src={url}
                        alt={slot.label}
                        className="flex-shrink-0 object-cover w-12 h-12 border border-gray-200 rounded"
                      />
                      <p className="text-xs text-gray-500 truncate">
                        {isUploading ? "Uploading..." : "Saved"}
                      </p>
                    </div>
                    <div className="flex items-center flex-shrink-0 gap-1">
                      <button
                        data-testid={`btn-view-${slot.key}`}
                        onClick={() => setViewModal({ url: url!, label: slot.label })}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded transition"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        data-testid={`btn-download-${slot.key}`}
                        onClick={() => handleDownload(slot.key, slot.label)}
                        disabled={!!downloading[slot.key]}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded transition disabled:opacity-40"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      {/* Re-upload */}
                      <label
                        data-testid={`btn-reupload-${slot.key}`}
                        className={`p-1.5 rounded transition ${
                          locked
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-primary hover:text-primary/70 hover:bg-primary/10 cursor-pointer"
                        }`}
                        title={locked ? "Locked after admission fee payment" : "Replace"}
                      >
                        <Upload size={16} />
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          className="hidden"
                          disabled={locked}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFile(slot.key, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  /* ── Upload area ── */
                  <label
                    data-testid={`upload-area-${slot.key}`}
                    className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 transition
                      ${locked
                        ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                        : isUploading
                          ? "border-primary/40 bg-primary/5 cursor-wait"
                          : "border-gray-300 hover:border-primary hover:bg-primary/5 cursor-pointer"}`}
                  >
                    {locked ? (
                      <p className="text-xs font-medium text-gray-400">Locked after admission fee payment</p>
                    ) : isUploading ? (
                      <p className="text-xs font-medium text-primary">Uploading...</p>
                    ) : (
                      <>
                        <Upload size={22} className="text-gray-400" />
                        <p className="text-xs font-medium text-center text-gray-600">
                          Drag &amp; drop or click to upload
                          <span className="block font-normal text-gray-400">(ಡ್ರ್ಯಾಗ್ ಮಾಡಿ ಅಥವಾ ಕ್ಲಿಕ್ ಮಾಡಿ)</span>
                        </p>
                        <span className="text-xs text-gray-400">JPEG, PNG · max 5 MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      disabled={isUploading || locked}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(slot.key, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Info box ───────────────────────────────────────────────────── */}
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="mb-2 text-xs font-semibold text-blue-900">
            Important Information (ಪ್ರಮುಖ ಮಾಹಿತಿ)
          </h3>
          <ul className="space-y-1 text-xs text-blue-800">
            <li>✓ Files must be JPEG or PNG format</li>
            <li>✓ Maximum file size: 5 MB per file</li>
            <li>✓ Photo: clear face visible, passport-sized</li>
            <li>✓ Signature: clean background, no smudges</li>
            <li>✓ You can re-upload to replace an existing file</li>
          </ul>
        </div>
      </div>

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      {viewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setViewModal(null)}
        >
          <div
            className="relative w-full max-w-lg p-4 bg-white shadow-xl rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="pr-4 text-sm font-semibold text-gray-800 truncate">{viewModal.label}</p>
              <button
                onClick={() => setViewModal(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={viewModal.url}
              alt={viewModal.label}
              className="w-full max-h-[70vh] object-contain rounded-lg border border-gray-200"
            />
          </div>
        </div>
      )}

    </AppLayout>
  );
}