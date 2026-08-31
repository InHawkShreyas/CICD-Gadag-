import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

type Option = {
  label: string;
  value: string | number;
};

type SelectProps = {
  label?: string;
  options: Option[];
  value?: string | number;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  testId?: string;
  onChange?: (value: string | number) => void;
};

export default function SearchableSelect({
  label,
  options,
  value,
  placeholder = "Select option",
  error,
  required = false,
  disabled = false,
  className = "",
  testId,
  onChange,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close if the field becomes disabled while open
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div ref={ref} className="relative flex flex-col w-full gap-1">
      {label && (
        <label className="text-sm font-medium text-text">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Selected */}
      <div
        data-testid={testId}
        aria-disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(!open);
        }}
        className={`
          w-full
          px-3 py-2.5
          rounded-lg
          border
          border-gray-300
          text-sm
          flex items-center justify-between
          transition
          ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-400" : "bg-white cursor-pointer hover:border-primary"}
          ${error ? "border-red-400" : ""}
          ${className}
        `}
      >
        <span className={disabled ? "text-gray-400" : selected ? "text-text" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>

        <ChevronDown
          size={18}
          className={`text-gray-400 transition ${open ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg top-full">

          {/* Search */}
          <div className="flex items-center gap-2 p-2 border-b">
            <Search size={16} className="text-gray-400" />
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm placeholder-gray-400 outline-none "
            />
          </div>

          {/* Options */}
          <div className="overflow-y-auto max-h-60">
            {filtered.length === 0 && (
              <div className="p-3 text-sm text-gray-400">
                No results found
              </div>
            )}

            {filtered.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange?.(option.value);
                  setOpen(false);
                  setSearch("");
                }}
                className="px-4 py-2 text-sm transition cursor-pointer  hover:bg-primary hover:text-white"
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}