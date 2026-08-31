import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  X,
  ShieldCheck,
  MapPin,
  Briefcase,
  Tag,
  Pencil,
  Trash2,
  Info,
} from "lucide-react";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Toast from "../../components/ui/Toast";
import Loader from "../../components/ui/Loader";
import EmptyState from "../../components/ui/EmptyState";

import { getLookupsByType } from "../../services/lookupService";
import type { LookupResponse } from "../../services/lookupService";
import {
  getConditionalCharges,
  createConditionalCharge,
  updateConditionalCharge,
  deleteConditionalCharge,
  type AdmissionFeeConditionalCharge,
} from "../../services/admissionFeeConditionalChargeService";

/* ─── Helpers ─────────────────────────────────────────── */

function formatCurrency(amount: number | undefined) {
  return `₹${(amount ?? 0).toLocaleString("en-IN")}`;
}

// Visual treatment per condition — extend this map as new AdmissionFeeCondition
// lookup rows (type2 values) are introduced; unknown ones fall back gracefully.
function conditionVisuals(code?: string) {
  switch (code) {
    case "NonKarnataka":
      return { icon: MapPin, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" };
    case "PgInService":
      return { icon: Briefcase, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" };
    default:
      return { icon: Tag, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" };
  }
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold border rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
        <span className="relative flex w-2 h-2">
          <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-emerald-400" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
        </span>
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold border rounded-full bg-slate-100 text-slate-500 border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  );
}

/* ─── Form state ──────────────────────────────────────── */

const EMPTY_FORM: AdmissionFeeConditionalCharge = {
  conditionId: "",
  particularName: "",
  amount: 0,
  description: "",
  status: true,
};

function validateForm(form: AdmissionFeeConditionalCharge) {
  const e: Record<string, string> = {};
  if (!form.conditionId) e.conditionId = "Select a condition";
  if (!form.particularName.trim()) e.particularName = "Enter a particular name";
  if (!form.amount || form.amount <= 0) e.amount = "Enter a valid amount";
  return e;
}

/* ─── Main component ──────────────────────────────────── */

export default function ConditionalChargeTab() {
  const [charges, setCharges] = useState<AdmissionFeeConditionalCharge[]>([]);
  const [conditions, setConditions] = useState<LookupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdmissionFeeConditionalCharge | null>(null);
  const [form, setForm] = useState<AdmissionFeeConditionalCharge>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdmissionFeeConditionalCharge | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [chargeData, conditionData] = await Promise.all([
        getConditionalCharges(),
        getLookupsByType("AdmissionFeeCondition", ""),
      ]);
      setCharges(chargeData);
      setConditions(conditionData);
    } catch {
      showToast("Failed to load conditional charges.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ── Derived ── */
  const conditionName = (id: string) => conditions.find((c) => c.id === id)?.name ?? "—";
  const conditionCode = (id: string) => conditions.find((c) => c.id === id)?.type2;

  const filteredCharges = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return charges;
    return charges.filter(
      (c) =>
        c.particularName.toLowerCase().includes(q) ||
        (c.conditionName ?? conditionName(c.conditionId)).toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charges, search, conditions]);

  // Grouped by condition, in order of first appearance — always shown expanded.
  const groupedCharges = useMemo(() => {
    const groups: { conditionId: string; items: AdmissionFeeConditionalCharge[] }[] = [];
    const index = new Map<string, number>();
    for (const c of filteredCharges) {
      const key = c.conditionId;
      if (!index.has(key)) {
        index.set(key, groups.length);
        groups.push({ conditionId: key, items: [] });
      }
      groups[index.get(key)!].items.push(c);
    }
    return groups;
  }, [filteredCharges]);

  /* ── Add / edit modal ── */
  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: AdmissionFeeConditionalCharge) => {
    setEditing(c);
    setForm(c);
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    const v = validateForm(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSaving(true);
    try {
      if (editing?.id) {
        await updateConditionalCharge({ ...form, id: editing.id });
        showToast("Conditional charge updated.", "success");
      } else {
        await createConditionalCharge(form);
        showToast("Conditional charge added.", "success");
      }
      setModalOpen(false);
      load();
    } catch {
      showToast("Save failed. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteConditionalCharge(deleteTarget.id);
      showToast("Conditional charge deleted.", "success");
      setDeleteTarget(null);
      load();
    } catch {
      showToast("Delete failed. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader />
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60]">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <div className="space-y-6" data-testid="admission-fee-conditional-charge-page">
        {/* ── Page header ── */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 text-white shadow-sm bg-primary rounded-2xl shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="mt-1 text-sm italic font-semibold text-gray-500 sm:text-base">
                Extra fee particulars automatically added to a student's admission fee based on
                their application data — e.g. non-Karnataka domicile, PG in-service candidates
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={openAdd}
            testId="btn-new-conditional-charge"
            className="inline-flex items-center justify-center w-full gap-2 sm:w-auto whitespace-nowrap"
          >
            <Plus size={18} className="shrink-0" />
            Add Conditional Charge
          </Button>
        </div>

        {/* ── Toolbar ── */}
        <Card className="rounded-2xl border-slate-200">
          <div className="relative flex-1 min-w-0 sm:max-w-sm">
            <Search size={15} className="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by condition, particular or description…"
              className="w-full py-2.5 pr-8 text-sm transition border rounded-xl pl-9 border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute -translate-y-1/2 right-2 top-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </Card>

        {/* ── Empty state ── */}
        {filteredCharges.length === 0 && (
          <Card className="border border-slate-200 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
            <EmptyState
              title={charges.length === 0 ? "No conditional charges added yet" : "No matches found"}
              description={
                charges.length === 0
                  ? "Add a conditional charge to automatically apply extra fee particulars for students matching a condition, like non-Karnataka domicile or PG in-service."
                  : "Try a different search term."
              }
              actionLabel={charges.length === 0 ? "Add Conditional Charge" : undefined}
              onAction={charges.length === 0 ? openAdd : undefined}
            />
          </Card>
        )}

        {/* ── Grouped by condition ── */}
        {filteredCharges.length > 0 && (
          <div className="space-y-5">
            {groupedCharges.map(({ conditionId, items }) => {
              const code = items[0]?.conditionCode ?? conditionCode(conditionId);
              const { icon: Icon, color, bg, border } = conditionVisuals(code);
              const name = items[0]?.conditionName ?? conditionName(conditionId);
              return (
                <Card key={conditionId} className="p-0 overflow-hidden border rounded-2xl border-slate-200">
                  {/* Group header */}
                  <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${bg} ${border}`}>
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${color} bg-white/70`}>
                      <Icon size={14} />
                    </span>
                    <span className={`text-sm font-bold ${color}`}>{name}</span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/70 text-slate-600 border border-white">
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2.5 text-xs font-semibold text-left text-slate-500 min-w-[180px]">Particular Name</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-center text-slate-500 min-w-[100px]">Amount</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-left text-slate-500 min-w-[220px]">Description</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-center text-slate-500 min-w-[90px]">Status</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-center text-slate-500 min-w-[90px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((c) => (
                          <tr key={c.id} className="transition border-t border-slate-100 hover:bg-primary/[0.03]">
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{c.particularName}</td>
                            <td className="px-4 py-3 text-sm font-bold text-center text-emerald-700">
                              {formatCurrency(c.amount)}
                            </td>
                            <td className="px-4 py-3 text-xs leading-relaxed break-words text-slate-500">
                              {c.description || "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge active={c.status} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEdit(c)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-primary text-primary hover:border-primary/40 hover:bg-primary/5 transition"
                                  aria-label="Edit conditional charge"
                                >
                                  <Pencil size={13} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(c)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 transition"
                                  aria-label="Delete conditional charge"
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add / edit modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Conditional Charge" : "Add Conditional Charge"}
        size="md"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-2.5 px-4 py-3 border rounded-xl border-blue-100 bg-blue-50">
            <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-blue-800">
              This charge is added automatically to a matching student's admission fee — it isn't tied
              to a specific degree or course.
            </p>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-800">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={form.conditionId}
              onChange={(e) => setForm({ ...form, conditionId: e.target.value })}
              className={`w-full px-3 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 ${
                errors.conditionId ? "border-red-300" : "border-slate-300"
              }`}
            >
              <option value="">Select condition</option>
              {conditions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.type2}
                </option>
              ))}
            </select>
            {errors.conditionId && <p className="mt-1 text-xs font-medium text-red-500">{errors.conditionId}</p>}
          </div>

          <Input
            label="Particular Name"
            required
            value={form.particularName}
            error={errors.particularName}
            onChange={(e) => setForm({ ...form, particularName: e.target.value })}
            placeholder="e.g. Eligibility Fee"
          />

          <Input
            label="Amount (₹)"
            type="number"
            required
            min="0"
            value={String(form.amount || "")}
            error={errors.amount}
            onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
          />

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-gray-800">Description (optional)</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Internal note about when this charge applies"
              className="w-full px-3 py-2.5 text-sm bg-white border rounded-xl border-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none"
            />
          </div>

          <label className="flex items-center gap-2.5 px-3 py-2.5 border rounded-xl border-slate-200 bg-slate-50/60 cursor-pointer">
            <input
              type="checkbox"
              checked={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary/30"
            />
            <span className="text-sm font-semibold text-slate-700">
              Active — apply this charge to matching students
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add charge"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Conditional Charge" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Remove <span className="font-semibold text-slate-800">{deleteTarget?.particularName}</span> from
            the {deleteTarget ? (deleteTarget.conditionName ?? conditionName(deleteTarget.conditionId)) : ""}{" "}
            condition? Students who match this condition will no longer be charged this amount.
          </p>
          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}