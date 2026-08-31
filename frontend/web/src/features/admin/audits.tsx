import { useState, useEffect, useMemo } from "react";
import { Search, Download } from "lucide-react";
import Input from "../../components/ui/Input";
import FilterPanel from "../../components/ui/FilterPanel";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import AppLayout from "../../components/layouts/AppLayout";
import { getAuditLogs, type AuditLog } from "../../services/auditLogService";

/* ---------------- COMPONENT ---------------- */
type AuditGroup = {
  date: string;
  logs: AuditLog[];
};

function groupByPerformedDate(logs: AuditLog[]): AuditGroup[] {
  const map = new Map<string, AuditGroup>();

  logs.forEach((log) => {
    const date = log.performedOn
      ? new Date(log.performedOn).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })
      : "Unknown";

    if (!map.has(date)) {
      map.set(date, {
        date,
        logs: [],
      });
    }

    map.get(date)!.logs.push(log);
  });

  return [...map.values()];
}

function AuditGroupRow({
  group,
  isOpen,
  onToggle,
  columns,
}: {
  group: AuditGroup;
  isOpen: boolean;
  onToggle: () => void;
  columns: any;
}) {
  return (
    <>
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-5 py-4 transition border-b cursor-pointer bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">
            {isOpen ? "▼" : "▶"}
          </span>

          <div>
            <p className="font-semibold text-text">
              {group.date}
            </p>

            <p className="text-xs text-gray-500">
              {group.logs.length} audit log{group.logs.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="px-4 py-4">
          <Table
            columns={columns}
            data={group.logs}
          />
        </div>
      )}
    </>
  );
}

export default function AuditsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [page, setPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({
    action: [],
    tableName: [],
  });

  /* ── fetch on mount ── */
  useEffect(() => {
    setLoading(true);

    getAuditLogs(page, pageSize)
      .then((res) => {
        setAuditLogs(res.items);
        setTotalCount(res.totalCount);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  /* ── derive unique filter options from data ── */
  const uniqueActions = useMemo(
    () => [...new Set(auditLogs.map((l) => l.action).filter(Boolean))] as string[],
    [auditLogs]
  );
  const uniqueTables = useMemo(
    () => [...new Set(auditLogs.map((l) => l.tableName).filter(Boolean))] as string[],
    [auditLogs]
  );

  const filterSections = useMemo(
    () => [
      {
        title: "Action",
        key: "action",
        options: uniqueActions.map((a) => ({ label: a, value: a })),
      },
      {
        title: "Table / Module",
        key: "tableName",
        options: uniqueTables.map((t) => ({ label: t, value: t })),
      },
    ],
    [uniqueActions, uniqueTables]
  );

  /* ── filter + search ── */
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (log.performedBy ?? "").toLowerCase().includes(q) ||
        (log.tableName ?? "").toLowerCase().includes(q) ||
        (log.action ?? "").toLowerCase().includes(q) ||
        (log.ipAddress ?? "").toLowerCase().includes(q) ||
        (log.recordId ?? "").toLowerCase().includes(q);

      const matchesAction =
        filters.action.length === 0 ||
        filters.action.includes(log.action ?? "");

      const matchesTable =
        filters.tableName.length === 0 ||
        filters.tableName.includes(log.tableName ?? "");

      return matchesSearch && matchesAction && matchesTable;
    });
  }, [searchQuery, filters, auditLogs]);

  const groupedLogs = useMemo(
  () => groupByPerformedDate(filteredLogs),
  [filteredLogs]
);

  const handleFilterChange = (key: string, values: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
  };

  const toggleGroup = (date: string) => {
  setExpandedGroups((prev) => {
    const next = new Set(prev);

    if (next.has(date))
      next.delete(date);
    else
      next.add(date);

    return next;
  });
};

  /* ── action badge colour ── */
  const actionColor = (action?: string) => {
    const map: Record<string, string> = {
      create: "bg-green-100 text-green-800",
      insert: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      delete: "bg-red-100 text-red-800",
      login: "bg-purple-100 text-purple-800",
      download: "bg-cyan-100 text-cyan-800",
    };
    return map[(action ?? "").toLowerCase()] ?? "bg-gray-100 text-gray-700";
  };

  /* ── table columns ── */
  const columns = [
    {
      header: "Performed On",
      accessor: "performedOn" as const,
      render: (row: AuditLog) => (
        <span className="text-sm font-semibold whitespace-nowrap">
          {row.performedOn
            ? new Date(row.performedOn).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Kolkata",
            })
            : "—"}
        </span>
      ),
    },
    {
      header: "Performed By",
      accessor: "performedBy" as const,
      render: (row: AuditLog) => (
        <span className="text-sm font-medium">{row.performedBy ?? "—"}</span>
      ),
    },
    {
      header: "Action",
      accessor: "action" as const,
      render: (row: AuditLog) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${actionColor(row.action)}`}>
          {row.action ?? "—"}
        </span>
      ),
    },
    {
      header: "Table / Module",
      accessor: "tableName" as const,
      render: (row: AuditLog) => (
        <span className="text-sm">{row.tableName ?? "—"}</span>
      ),
    },
    {
      header: "Record ID",
      accessor: "recordId" as const,
      render: (row: AuditLog) => (
        <span className="font-mono text-xs text-gray-500">{row.recordId ?? "—"}</span>
      ),
    },
    {
      header: "IP Address",
      accessor: "ipAddress" as const,
      render: (row: AuditLog) => (
        <span className="font-mono text-sm">{row.ipAddress ?? "—"}</span>
      ),
    },
    {
      header: "Changes",
      accessor: "newData" as const,
      render: (row: AuditLog) => {
        const hasData = row.oldData || row.newData;
        if (!hasData) return <span className="text-xs text-gray-400">—</span>;
        return (
          <div className="text-xs space-y-0.5 max-w-xs">
            {row.oldData && (
              <p className="text-red-600 truncate" title={row.oldData}>
                <span className="font-semibold">Before: </span>{row.oldData}
              </p>
            )}
            {row.newData && (
              <p className="text-green-700 truncate" title={row.newData}>
                <span className="font-semibold">After: </span>{row.newData}
              </p>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout pageTitle="Audits">
      <div data-testid="audits-page" className="pb-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text">Audit Logs</h1>
          <p className="mt-2 text-gray-600">
            Track all system activities, user actions, and changes for compliance and security
          </p>
        </div>

        {/* Search & Filters */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
          <div className="flex flex-col items-end gap-4 md:flex-row">
            <div className="flex-1 min-w-0">
              <Input
                label="Search"
                placeholder="Search by user, action, table, IP, or record ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <FilterPanel
              sections={filterSections}
              values={filters}
              onChange={handleFilterChange}
            />

            {(searchQuery || Object.values(filters).some((f) => f.length > 0)) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setFilters({ action: [], tableName: [] });
                }}
              >
                Clear All
              </Button>
            )}

            <Button variant="secondary" onClick={() => console.log("Export")}>
              <Download size={18} />
              Export
            </Button>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Showing {filteredLogs.length} of {totalCount} audit logs
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-gray-400 bg-white border border-gray-200 rounded-lg">
            Loading audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="mb-2 text-lg font-semibold text-gray-700">No audit logs found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div data-testid="audit-table" className="pb-4 overflow-hidden bg-white border border-gray-200 rounded-lg">
            <Table
              columns={columns}
              data={filteredLogs}
              serverPagination
              page={page}
              pageSize={pageSize}
              totalRecords={totalCount}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}