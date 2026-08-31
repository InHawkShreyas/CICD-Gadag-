import { useState } from "react";
import { Receipt, ShieldCheck } from "lucide-react";

import AppLayout from "../../components/layouts/AppLayout";
import FeeStructureTab from "./fee-structure";
import ConditionalChargeTab from "./admission-fee-conditional-charge";

/* ─── Tabs config ─────────────────────────────────────── */

type TabKey = "structure" | "conditional";

const TABS: { key: TabKey; label: string; icon: typeof Receipt }[] = [
  { key: "structure", label: "Fee Structure", icon: Receipt },
  { key: "conditional", label: "Conditional Charges", icon: ShieldCheck },
];

/* ─── Main page ───────────────────────────────────────── */

export default function AdmissionFeeMasterPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("structure");

  return (
    <AppLayout pageTitle="Admission Fee">
      <div className="space-y-6" data-testid="admission-fee-page">
        {/* ── Tab switcher ── */}
        <div className="inline-flex p-1 border rounded-2xl bg-slate-100 border-slate-200">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                data-testid={`admission-fee-tab-${key}`}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
                  active
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Active tab content ── */}
        {activeTab === "structure" ? <FeeStructureTab /> : <ConditionalChargeTab />}
      </div>
    </AppLayout>
  );
}