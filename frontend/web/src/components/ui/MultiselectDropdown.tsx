import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, ChevronDown, Check, CheckCheck } from "lucide-react";

export type MultiSelectOption = { id: string; name: string };

export default function MultiSelectDropdown({
  label,
  required,
  options,
  selectedIds,
  onChange,
  error,
  disabled,
  helperText,
  disabledPlaceholder,
}: {
  label: string;
  required?: boolean;
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  disabled?: boolean;
  helperText?: string;
  /** Placeholder shown on the trigger when `disabled` is true. */
  disabledPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedOptions = useMemo(
    () => options.filter((o) => selectedSet.has(o.id)),
    [options, selectedSet]
  );

  const toggleOption = (id: string) => {
    if (selectedSet.has(id)) onChange(selectedIds.filter((sid) => sid !== id));
    else onChange([...selectedIds, id]);
  };

  const removeOption = (id: string) => onChange(selectedIds.filter((sid) => sid !== id));

  const allFilteredSelected =
    filteredOptions.length > 0 && filteredOptions.every((o) => selectedSet.has(o.id));

  const selectAllFiltered = () => {
    const filteredIds = filteredOptions.map((o) => o.id);
    const merged = new Set([...selectedIds, ...filteredIds]);
    onChange(Array.from(merged));
  };

  const clearAll = () => onChange([]);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-gray-800">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {selectedOptions.length > 0 && (
          <span className="text-[11px] font-semibold text-primary">
            {selectedOptions.length} selected
          </span>
        )}
      </div>

      {/* Trigger / chip well */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full px-3 py-2 text-left bg-white border rounded-xl transition flex flex-wrap items-center gap-1.5 ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "cursor-pointer hover:border-primary/40"
          } ${error ? "border-red-300" : open ? "border-primary ring-2 ring-primary/15" : "border-slate-300"}`}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-sm text-slate-400">
            {disabled ? (disabledPlaceholder ?? "Select degree first") : `Select ${label.toLowerCase()}…`}
          </span>
        ) : (
          selectedOptions.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary"
            >
              {o.name}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  removeOption(o.id);
                }}
                className="flex items-center justify-center w-4 h-4 transition rounded-full hover:bg-primary/20"
              >
                <X size={11} />
              </span>
            </span>
          ))
        )}
        <ChevronDown
          size={15}
          className={`ml-auto shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}

      {/* Dropdown panel */}
      {open && !disabled && (
        <div className="absolute z-30 w-full mt-1.5 overflow-hidden bg-white border shadow-lg border-slate-300 rounded-xl">
          <div className="p-2 border-b border-slate-200">
            <div className="relative">
              <Search size={13} className="absolute -translate-y-1/2 pointer-events-none left-2.5 top-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full py-1.5 pl-7 pr-2 text-xs border rounded-lg border-slate-300 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-slate-50/70 border-slate-200">
            <button
              type="button"
              onClick={allFilteredSelected ? () => onChange(selectedIds.filter((id) => !filteredOptions.some((o) => o.id === id))) : selectAllFiltered}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <CheckCheck size={12} />
              {allFilteredSelected ? "Unselect all" : "Select all"}
            </button>
            {selectedOptions.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-semibold text-slate-400 hover:text-red-500"
              >
                Clear
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-56">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-xs text-center text-slate-400">No matches found</p>
            ) : (
              filteredOptions.map((o) => {
                const checked = selectedSet.has(o.id);
                return (
                  <label
                    key={o.id}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${checked ? "bg-primary/5" : ""
                      }`}
                  >
                    <span
                      className={`flex items-center justify-center w-4 h-4 rounded border-2 shrink-0 transition ${checked ? "bg-primary border-primary" : "border-slate-400"
                        }`}
                    >
                      {checked && <Check size={11} className="text-white" />}
                    </span>
                    <input type="checkbox" checked={checked} onChange={() => toggleOption(o.id)} className="hidden" />
                    <span className={`truncate ${checked ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                      {o.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}