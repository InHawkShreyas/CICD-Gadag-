import  { useEffect, useRef, useState, useCallback } from "react";
import {
  Upload, FileText, Trash2, CheckCircle, Clock,
  AlertCircle, X, Eye, Download, Loader2, ShieldAlert,
} from "lucide-react";

import Button    from "../../components/ui/Button";
import AppLayout from "../../components/layouts/AppLayout";
import Modal     from "../../components/ui/Modal";
import Toast     from "../../components/ui/Toast";

import { getMyFullApplication }         from "../../services/applicationQueryService";
import { getLookupsByType }             from "../../services/lookupService";
import { getSeatTypesByApplicationId }  from "../../services/seatTypeService";
import { getEducationByApplicationId }  from "../../services/educationService";
import { getRegistrationByUsername }    from "../../services/registrationService";
import { getPgEducationByApplicationId } from "../../services/pgEducationService";
import {
  createDocument,
  deleteDocument,
  downloadDocumentFile,
  getDocumentsByAppId,
} from "../../services/documentService";
import type { ApplicationDocument } from "../../services/documentService";
import api from "../../utils/client";
import {
  resolveRequiredDocuments,
  DEGREE_MARKS_DOC_NAME,
  type ApplicantDocumentContext,
  type ResolvedDocument,
} from "../../services/documentRequirementService";
import { useAdmissionLock } from "../../hooks/useAdmissionLock";

type UploadedDoc = {
  id: string;
  type: string;
  fileName: string;
  uploadDate: string;
  status: "uploaded" | "verified" | "pending" | "rejected";
};

type PreviewState = {
  document: UploadedDoc;
  blobUrl: string | null;
  mimeType: string | null;
  loading: boolean;
  error: string | null;
};

async function readBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await new Response(blob).arrayBuffer());
}

async function detectFileType(file: File): Promise<string | null> {
  if (file.size < 4) return null;

  const head = await readBytes(file.slice(0, 8));
  const tail  = await readBytes(file.slice(Math.max(0, file.size - 16)));

 
  const isPDF =
    head[0] === 0x25 && head[1] === 0x50 &&
    head[2] === 0x44 && head[3] === 0x46;

  if (isPDF) {
    const tailStr = String.fromCharCode(...tail);
    return tailStr.includes("%%EOF") ? "application/pdf" : null;
  }

 
  const isJPEG = head[0] === 0xFF && head[1] === 0xD8;

  if (isJPEG) {
    const last = tail.length;
    return (tail[last - 2] === 0xFF && tail[last - 1] === 0xD9)
      ? "image/jpeg"
      : null;
  }

 
  const isPNG =
    head[0] === 0x89 && head[1] === 0x50 &&
    head[2] === 0x4E && head[3] === 0x47;

  if (isPNG) {
    const IEND = [0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82];
    const last8 = Array.from(tail.slice(tail.length - 8));
    return IEND.every((b, i) => b === last8[i]) ? "image/png" : null;
  }

  return null; 
}


const mapApiDoc = (d: ApplicationDocument): UploadedDoc => ({
  id:         d.id,
  type:       d.documentName,
  fileName:   d.fileName || d.documentName,
  uploadDate: new Date().toISOString().split("T")[0],
  status:     "uploaded",
});

const STATUS_MAP = {
  uploaded: { color: "bg-blue-100 text-blue-800",     Icon: FileText,    label: "Uploaded" },
  verified: { color: "bg-green-100 text-green-800",   Icon: CheckCircle, label: "Verified" },
  pending:  { color: "bg-yellow-100 text-yellow-800", Icon: Clock,       label: "Pending"  },
  rejected: { color: "bg-red-100 text-red-800",       Icon: AlertCircle, label: "Rejected" },
} as const;



type DocCardProps = {
  doc: ResolvedDocument;
  uploadedDoc: UploadedDoc | undefined;
  uploadingType: string | null;
  deletingId: string | null;
  downloadingId: string | null;
  locked: boolean;
  onUpload: (docName: string, file: File) => void;
  onView: (doc: UploadedDoc) => void;
  onDownload: (doc: UploadedDoc) => void;
  onDelete: (id: string) => void;
};

function DocCard({
  doc,
  uploadedDoc,
  uploadingType,
  deletingId,
  downloadingId,
  locked,
  onUpload,
  onView,
  onDownload,
  onDelete,
}: DocCardProps) {
  const statusInfo    = uploadedDoc ? STATUS_MAP[uploadedDoc.status] : null;
  const isUploading   = uploadingType  === doc.documentName;
  const isDeleting    = uploadedDoc ? deletingId    === uploadedDoc.id : false;
  const isDownloading = uploadedDoc ? downloadingId === uploadedDoc.id : false;

  return (
    <div data-testid={`doc-card-${doc.id}`} className="p-5 transition bg-white border shadow-sm rounded-xl hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-800">{doc.documentName}</h3>
          </div>
          {doc.triggerLabel && (
            <p className="text-xs text-gray-400">{doc.triggerLabel}</p>
          )}
        </div>

        {uploadedDoc && statusInfo && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
            <statusInfo.Icon size={13} />
            {statusInfo.label}
          </div>
        )}
      </div>

      {uploadedDoc ? (
        <div data-testid={`doc-uploaded-${doc.id}`} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center min-w-0 gap-3">
            <div className="p-2 bg-white border rounded-lg">
              <FileText size={18} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p data-testid="doc-filename" className="text-sm font-medium text-gray-800 truncate">{uploadedDoc.fileName}</p>
              <p data-testid="doc-date" className="text-xs text-gray-500">{uploadedDoc.uploadDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button data-testid="btn-preview" onClick={() => onView(uploadedDoc)} title="Preview"
              className="p-2 text-blue-600 transition rounded-lg hover:bg-blue-50">
              <Eye size={17} />
            </button>
            <button data-testid="btn-download" onClick={() => onDownload(uploadedDoc)} disabled={isDownloading} title="Download"
              className="p-2 text-green-600 transition rounded-lg hover:bg-green-50 disabled:opacity-40">
              {isDownloading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
            </button>
            <button data-testid="btn-delete" onClick={() => onDelete(uploadedDoc.id)} disabled={isDeleting || locked} title={locked ? "Locked after admission fee payment" : "Delete"}
              className="p-2 text-red-600 transition rounded-lg hover:bg-red-50 disabled:opacity-40">
              {isDeleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
            </button>
          </div>
        </div>
      ) : (
        <div data-testid={`doc-upload-area-${doc.id}`} className="flex flex-col items-center p-6 text-center border-2 border-gray-300 border-dashed rounded-lg bg-gray-50">
          <Upload className="mb-2 text-gray-400" size={26} />
          <p className="mb-1 text-sm font-medium">Upload {doc.documentName}</p>
          <p className="mb-4 text-xs text-gray-400">PDF, JPG, PNG · max 20 MB</p>
          <input
            id={`file-${doc.id}`}
            data-testid={`input-file-${doc.id}`}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={locked}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(doc.documentName, f);
              e.target.value = "";
            }}
          />
          <Button
            data-testid={`btn-choose-file-${doc.id}`}
            onClick={() => document.getElementById(`file-${doc.id}`)?.click()}
            disabled={isUploading || locked}
            className="flex items-center gap-2"
          >
            {isUploading
              ? <><Loader2 size={15} className="animate-spin" /> Uploading...</>
              : <><Upload size={15} /> Choose File</>}
          </Button>
          {locked && (
            <p className="mt-2 text-xs text-amber-600">Locked after admission fee payment</p>
          )}
        </div>
      )}
    </div>
  );
}


type DegreeMarksCardProps = {
  mode: "sem" | "year" | "";
  periodCount: number;
  uploadedDoc: UploadedDoc | undefined;
  uploadingType: string | null;
  downloadingId: string | null;
  deletingId: string | null;
  locked: boolean;
  onUpload: (docName: string, file: File) => void;
  onView: (doc: UploadedDoc) => void;
  onDownload: (doc: UploadedDoc) => void;
  onDelete: (id: string) => void;
};

function DegreeMarksCard({
  mode,
  periodCount,
  uploadedDoc,
  uploadingType,
  downloadingId,
  deletingId,
  locked,
  onUpload,
  onView,
  onDownload,
  onDelete,
}: DegreeMarksCardProps) {
  const statusInfo    = uploadedDoc ? STATUS_MAP[uploadedDoc.status] : null;
  const isUploading   = uploadingType === DEGREE_MARKS_DOC_NAME;
  const isDeleting    = uploadedDoc ? deletingId    === uploadedDoc.id : false;
  const isDownloading = uploadedDoc ? downloadingId === uploadedDoc.id : false;

  const infoText = (mode === "sem"
    ? `You selected Semester-wise marks entry${periodCount ? ` (${periodCount} semesters)` : ""}. Please combine all your semester mark cards into a single PDF yourself and upload that one file here.`
    : mode === "year"
      ? `You selected Year-wise marks entry${periodCount ? ` (${periodCount} years)` : ""}. Please combine all your year mark cards into a single PDF yourself and upload that one file here.`
      : "Please combine all your UG degree mark cards into a single PDF yourself and upload that one file here.")
    + " Only PDF files are accepted for this document — JPG/PNG uploads will be rejected.";

  return (
    <div data-testid="doc-card-degree-marks" className="p-5 transition bg-white border shadow-sm rounded-xl hover:shadow-md">
      <div className="flex items-start justify-between mb-2">
        <div className="space-y-0.5">
          <h3 className="text-base font-semibold text-gray-800">{DEGREE_MARKS_DOC_NAME}</h3>
          <p className="text-xs text-gray-400">Required since you registered for a PG program</p>
        </div>
        {uploadedDoc && statusInfo && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
            <statusInfo.Icon size={13} />
            {statusInfo.label}
          </div>
        )}
      </div>

      {!uploadedDoc && (
        <div className="flex items-start gap-2 px-3 py-2 mb-4 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg bg-blue-50">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>{infoText}</span>
        </div>
      )}

      {uploadedDoc ? (
        <div data-testid="doc-uploaded-degree-marks" className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center min-w-0 gap-3">
            <div className="p-2 bg-white border rounded-lg">
              <FileText size={18} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{uploadedDoc.fileName}</p>
              <p className="text-xs text-gray-500">{uploadedDoc.uploadDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onView(uploadedDoc)} title="Preview"
              className="p-2 text-blue-600 transition rounded-lg hover:bg-blue-50">
              <Eye size={17} />
            </button>
            <button onClick={() => onDownload(uploadedDoc)} disabled={isDownloading} title="Download"
              className="p-2 text-green-600 transition rounded-lg hover:bg-green-50 disabled:opacity-40">
              {isDownloading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
            </button>
            <button onClick={() => onDelete(uploadedDoc.id)} disabled={isDeleting || locked} title={locked ? "Locked after admission fee payment" : "Delete"}
              className="p-2 text-red-600 transition rounded-lg hover:bg-red-50 disabled:opacity-40">
              {isDeleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
            </button>
          </div>
        </div>
      ) : (
        <div data-testid="doc-upload-area-degree-marks" className="flex flex-col items-center p-6 text-center border-2 border-gray-300 border-dashed rounded-lg bg-gray-50">
          <Upload className="mb-2 text-gray-400" size={26} />
          <p className="mb-1 text-sm font-medium">Upload {DEGREE_MARKS_DOC_NAME}</p>
          <p className="mb-4 text-xs text-gray-400">PDF only (all mark cards combined into one file) · max 20 MB</p>
          <input
            id="file-degree-marks"
            data-testid="input-file-degree-marks"
            type="file"
            className="hidden"
            accept=".pdf"
            disabled={locked}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(DEGREE_MARKS_DOC_NAME, f);
              e.target.value = "";
            }}
          />
          <Button
            data-testid="btn-choose-file-degree-marks"
            onClick={() => document.getElementById("file-degree-marks")?.click()}
            disabled={isUploading || locked}
            className="flex items-center gap-2"
          >
            {isUploading
              ? <><Loader2 size={15} className="animate-spin" /> Uploading...</>
              : <><Upload size={15} /> Choose File</>}
          </Button>
          {locked && (
            <p className="mt-2 text-xs text-amber-600">Locked after admission fee payment</p>
          )}
        </div>
      )}
    </div>
  );
}


export default function DocumentsPage() {
  const { locked, checking: lockChecking } = useAdmissionLock();
  const appIdRef = useRef("");
  const appNoRef = useRef("");

  const [docTypes, setDocTypes] = useState<ResolvedDocument[]>([]);
  const [uploaded, setUploaded] = useState<UploadedDoc[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [isPG, setIsPG] = useState(false);
  const [degreeMarksMode, setDegreeMarksMode] = useState<"sem" | "year" | "">("");
  const [degreeMarksPeriodCount, setDegreeMarksPeriodCount] = useState(0);

  const [uploadingType,  setUploadingType]  = useState<string | null>(null);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [downloadingId,  setDownloadingId]  = useState<string | null>(null);
  const [preview,        setPreview]        = useState<PreviewState | null>(null);

  const [toast, setToast] = useState<{
    message: string; type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info") =>
    setToast({ message, type });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Bootstrap ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const fullResult = await getMyFullApplication();
        const app = fullResult?.application;
        if (!app?.id) {
          showToast("No application found.", "error");
          setLoading(false);
          return;
        }

        const { id, appNo } = { id: app.id, appNo: app.appNo };
        appIdRef.current = id;
        appNoRef.current = appNo;

        const username = localStorage.getItem("username") ?? "";
        let hasUsn = false;
        let pg = false;
        if (username) {
          try {
            const reg = await getRegistrationByUsername(username);
            hasUsn = !!reg?.usnNo;
            if (reg?.degreeTypeName) {
              const s = String(reg.degreeTypeName).toLowerCase();
              pg = s.includes("pg") || s.includes("post");
            }
          } catch { /* no registration record */ }
        }
        setIsPG(pg);

        let has12thFromPg = false;
        let hasDiplomaFromPg = false;

        if (pg) {
          try {
            const pgRecords = await getPgEducationByApplicationId(id);

            const degreeRec = pgRecords.find((r) => r.examLevel === "Degree Marks");
            if (degreeRec) {
              setDegreeMarksMode((degreeRec.entryMode as "sem" | "year") || "");
              setDegreeMarksPeriodCount(degreeRec.periods?.length ?? 0);
            }

            // PG applicants record their prior SSLC/12th/Diploma history in the
            // PG education table, not the general education table — so has12th /
            // hasDiploma must also check here, or those doc cards never appear.
            has12thFromPg    = pgRecords.some((r) => r.examLevel?.startsWith("12th"));
            hasDiplomaFromPg = pgRecords.some((r) => r.examLevel?.startsWith("Diploma"));
          } catch {
            // Degree Marks step not filled in yet — card still shows with generic wording.
          }
        }

        const natLookups = await getLookupsByType("Nationality", " ");
        const selNat     = natLookups.find((n) => n.id === app.nationalityId);
        const natCode    = selNat?.code ?? "001";

        const isKarnataka = app.karnatakaYn === true;

        const catLookups = await getLookupsByType("Category", "");
        const selCat     = catLookups.find((c) => c.id === app.categoryId);
        const isNonGm    = !!selCat && (selCat.code ?? "") !== "008";

        const seatTypes             = await getSeatTypesByApplicationId(id);
        const selectedSeatTypeNames = seatTypes.map((s: { seatTypeName: string }) => s.seatTypeName);

        const eduRecords = await getEducationByApplicationId(id);
        const has12th    = eduRecords.some((r: { examName: string }) => r.examName.startsWith("12th")) || has12thFromPg;
        const hasDiploma = eduRecords.some((r: { examName: string }) => r.examName.startsWith("Diploma")) || hasDiplomaFromPg;

        const docLookups = await getLookupsByType("Document", "");

        const ctx: ApplicantDocumentContext = {
          nationalityCode: natCode,
          isKarnataka,
          isNonGmCategory: isNonGm,
          selectedSeatTypeNames,
          has12th,
          hasDiploma,
        };

        const conditionDocs = resolveRequiredDocuments(docLookups, ctx);

        if (hasUsn) {
          const usnDocs = await getLookupsByType("Document", "ONLY_USN");
          const usnResolved: ResolvedDocument[] = usnDocs.map((l) => ({
            id:           l.id,
            documentName: l.name ?? "",
            triggerRule:  l.type2 ?? "",
            triggerLabel: "Required — USN enrolled student",
          }));
          const seen   = new Set(conditionDocs.map((d) => d.id));
          const merged = [...conditionDocs, ...usnResolved.filter((d) => !seen.has(d.id))];
          setDocTypes(merged);
        } else {
          setDocTypes(conditionDocs);
        }

        const apiDocs = await getDocumentsByAppId(id);
        setUploaded(apiDocs.map(mapApiDoc));
      } catch (err) {
        console.error("[Bootstrap] error:", err);
        showToast("Failed to load documents.", "error");
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const refreshUploaded = useCallback(async (appId: string) => {
    if (!appId) return;
    try {
      const apiDocs = await getDocumentsByAppId(appId);
      setUploaded(apiDocs.map(mapApiDoc));
    } catch (err) {
      console.error("[refreshUploaded] error:", err);
    }
  }, []);

 
  const getUploadedByType   = (name: string) => uploaded.find((d) => d.type === name);
  const degreeMarksUploaded = getUploadedByType(DEGREE_MARKS_DOC_NAME);
  const totalDocs           = docTypes.length + (isPG ? 1 : 0);
  const doneDocs            = docTypes.filter((d) => !!getUploadedByType(d.documentName)).length
                             + (isPG && degreeMarksUploaded ? 1 : 0);


  const handleView = async (doc: UploadedDoc) => {
    if (preview?.blobUrl) window.URL.revokeObjectURL(preview.blobUrl);
    setPreview({ document: doc, blobUrl: null, mimeType: null, loading: true, error: null });
    try {
      const res        = await api.get(`/application-documents/download/${doc.id}`, { responseType: "blob" });
      const blob: Blob = res.data;
      setPreview({
        document: doc,
        blobUrl:  window.URL.createObjectURL(blob),
        mimeType: blob.type || "application/octet-stream",
        loading:  false,
        error:    null,
      });
    } catch {
      setPreview((p) => p ? { ...p, loading: false, error: "Could not load preview." } : null);
    }
  };

  const handleClosePreview = () => {
    if (preview?.blobUrl) window.URL.revokeObjectURL(preview.blobUrl);
    setPreview(null);
  };

  const handleDownload = async (doc: UploadedDoc) => {
    try {
      setDownloadingId(doc.id);
      await downloadDocumentFile(doc.id);
    } catch {
      showToast("Download failed.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUpload = useCallback(async (docName: string, file: File) => {

   
    if (file.size === 0) {
      showToast("The selected file is empty. Please choose a valid file.", "error");
      return;
    }

   
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 20) {
      showToast(`File size is ${fileSizeMB.toFixed(1)} MB. Maximum allowed is 20 MB.`, "error");
      return;
    }

    let detectedType: string | null = null;
    try {
      detectedType = await detectFileType(file);
    } catch {
      detectedType = null;
    }

    if (!detectedType) {
      showToast(
        "File is corrupted or not a valid PDF/JPG/PNG. Please choose a different file.",
        "error",
      );
      return;
    }

    if (docName === DEGREE_MARKS_DOC_NAME && detectedType !== "application/pdf") {
      showToast(
        "Only PDF files are accepted for the Degree Marks Card. Please combine your mark cards into a single PDF and upload that.",
        "error",
      );
      return;
    }

 
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const validExtensions: Record<string, string[]> = {
      "application/pdf": ["pdf"],
      "image/jpeg":      ["jpg", "jpeg"],
      "image/png":       ["png"],
    };
    if (!validExtensions[detectedType]?.includes(ext)) {
      showToast(
        `File extension (.${ext}) does not match its actual content. Please rename it correctly.`,
        "error",
      );
      return;
    }

    const currentAppId = appIdRef.current;
    const currentAppNo = appNoRef.current;

    if (!currentAppNo) {
      showToast("No application found.", "error");
      return;
    }

    try {
      setUploadingType(docName);

      await createDocument({
        applicationNo: currentAppNo,
        documentName:  docName,
        file,
      });

    
      await new Promise((res) => setTimeout(res, 500));

      
      let success = false;
      for (let i = 0; i < 3; i++) {
        const apiDocs = await getDocumentsByAppId(currentAppId);
        if (apiDocs.length > 0) {
          setUploaded(apiDocs.map(mapApiDoc));
          success = true;
          break;
        }
        await new Promise((res) => setTimeout(res, 400));
      }

      if (!success) {
        await refreshUploaded(currentAppId);
      }

      showToast("Uploaded successfully!", "success");
    } catch (error) {
      console.error("[handleUpload] error:", error);
      showToast("Upload failed.", "error");
    } finally {
      setUploadingType(null);
    }
  }, [refreshUploaded]);

 
  const handleDelete = useCallback(async (id: string) => {
    try {
      setDeletingId(id);
      await deleteDocument(id);
      setUploaded((prev) => prev.filter((d) => d.id !== id));
      await refreshUploaded(appIdRef.current);
      showToast("Document deleted.", "success");
    } catch {
      showToast("Delete failed.", "error");
    } finally {
      setDeletingId(null);
    }
  }, [refreshUploaded]);

  
  if (lockChecking) {
    return (
      <AppLayout pageTitle="Documents">
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">
          Loading...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Documents">
      <div data-testid="documents-page" className="pb-8 space-y-6">

        {toast && (
          <div className="fixed z-50 top-4 right-4">
            <Toast message={toast.message} type={toast.type} />
          </div>
        )}

        {locked && (
          <div className="flex items-center gap-3 px-4 py-3 border rounded-lg bg-amber-50 border-amber-200 text-amber-700">
            <ShieldAlert size={15} className="shrink-0" />
            <p className="text-sm font-medium">
              Your admission fee has been paid. Documents can be viewed and downloaded but not uploaded, replaced, or deleted.
            </p>
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold">
            Document Upload{" "}
            <span className="text-2xl font-normal text-gray-400">(ದಾಖಲೆ ಅಪ್ಲೋಡ್)</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Documents shown are based on your nationality, education, and seat type selections.
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-sm text-center text-gray-400">
            Loading your required documents...
          </div>
        ) : (
          <>
            <div className="p-4 bg-white border shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-600">Upload Progress</span>
                <span data-testid="upload-progress-label" className="text-sm font-bold text-primary">
                  {doneDocs} / {totalDocs} uploaded
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full transition-all duration-500 bg-primary"
                  style={{ width: totalDocs ? `${(doneDocs / totalDocs) * 100}%` : "0%" }}
                />
              </div>
              {doneDocs < totalDocs && (
                <p className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                  <ShieldAlert size={12} />
                  {totalDocs - doneDocs} document(s) still pending
                </p>
              )}
            </div>

            {isPG && (
              <DegreeMarksCard
                mode={degreeMarksMode}
                periodCount={degreeMarksPeriodCount}
                uploadedDoc={degreeMarksUploaded}
                uploadingType={uploadingType}
                downloadingId={downloadingId}
                deletingId={deletingId}
                locked={locked}
                onUpload={handleUpload}
                onView={handleView}
                onDownload={handleDownload}
                onDelete={handleDelete}
              />
            )}

            {docTypes.length > 0 ? (
              <div className="space-y-4">
                {docTypes.map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    uploadedDoc={getUploadedByType(doc.documentName)}
                    uploadingType={uploadingType}
                    deletingId={deletingId}
                    downloadingId={downloadingId}
                    locked={locked}
                    onUpload={handleUpload}
                    onView={handleView}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-sm text-center text-gray-400">
                No documents required based on your application details.
              </div>
            )}
          </>
        )}

        <div className="p-5 border border-blue-200 bg-blue-50 rounded-xl">
          <h3 className="mb-3 text-sm font-semibold text-blue-900">
            Important Information (ಪ್ರಮುಖ ಮಾಹಿತಿ)
          </h3>
          <ul className="text-sm text-blue-800 space-y-1.5">
            <li>✓ Documents displayed are specific to your application profile</li>
            <li>✓ II PUC Marks Card required only if you filled 12th in education section</li>
            <li>✓ Diploma Marks Card required only if you filled Diploma in education section</li>
            <li>✓ All documents must be clear and readable · max 20 MB each</li>
            <li>✓ Supported formats: PDF, JPEG, PNG (Degree Marks Card: PDF only)</li>
            <li>✓ Rejected documents can be re-uploaded after correction</li>
            <li>✓ All documents must be uploaded before final submission</li>
            <li>✓ If the official semester result sheet from the university is not available, please upload a screenshot or photo of the page where your result was declared.</li>
            <li>✓ PG applicants: combine all your semester (or year) UG mark cards into a single PDF yourself before uploading the Degree Marks Card.</li>
          </ul>
        </div>

        {preview && (
          <Modal open={!!preview} onClose={handleClosePreview}>
            <div className="w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="pr-4 text-lg font-semibold text-gray-800 truncate">
                  {preview.document.fileName}
                </h2>
                <button onClick={handleClosePreview} className="p-2 rounded-lg hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-gray-100 rounded-xl h-[420px] flex items-center justify-center overflow-hidden">
                {preview.loading ? (
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <Loader2 size={36} className="text-blue-500 animate-spin" />
                    <p className="text-sm">Loading preview...</p>
                  </div>
                ) : preview.error ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileText size={48} className="text-gray-300" />
                    <p className="text-sm text-red-500">{preview.error}</p>
                    <Button onClick={() => handleDownload(preview.document)} className="flex items-center gap-2 text-sm">
                      <Download size={14} /> Download instead
                    </Button>
                  </div>
                ) : preview.blobUrl && preview.mimeType?.startsWith("image/") ? (
                  <img src={preview.blobUrl} alt={preview.document.fileName} className="object-contain max-w-full max-h-full" />
                ) : preview.blobUrl && preview.mimeType === "application/pdf" ? (
                  <iframe src={preview.blobUrl} className="w-full h-full rounded-xl" title={preview.document.fileName} />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <FileText size={48} className="text-gray-300" />
                    <p className="text-sm text-gray-500">Preview not available</p>
                    <Button onClick={() => handleDownload(preview.document)} className="flex items-center gap-2 text-sm">
                      <Download size={14} /> Download to view
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                {([ ["Date", preview.document.uploadDate], ["Status", preview.document.status] ] as const).map(
                  ([label, val]) => (
                    <div key={label} className="p-3 rounded-lg bg-gray-50">
                      <p className="text-gray-400">{label}</p>
                      <p className="font-medium capitalize">{val}</p>
                    </div>
                  )
                )}
              </div>

              <div className="flex gap-3 mt-5">
                <Button
                  onClick={() => handleDownload(preview.document)}
                  disabled={downloadingId === preview.document.id}
                  className="flex items-center justify-center flex-1 gap-2"
                >
                  {downloadingId === preview.document.id
                    ? <><Loader2 size={15} className="animate-spin" /> Downloading...</>
                    : <><Download size={15} /> Download</>}
                </Button>
                <Button onClick={handleClosePreview} className="flex-1">Close</Button>
              </div>
            </div>
          </Modal>
        )}

      </div>
    </AppLayout>
  );
}