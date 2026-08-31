import { useState, useEffect, useRef } from "react";

type Option = {
  label: string;
  value: string;
  color?: string;
};

type Section = {
  title: string;
  key: string;
  options: Option[];
};

type Props = {
  sections: Section[];
  values: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
};

export default function FilterPanel({ sections, values, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── Close panel when clicking outside ── */
  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const toggleSection = (key: string) => {
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleValue = (key: string, value: string) => {
    const current = values[key] || [];
    onChange(
      key,
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  };

  const toggleAll = (key: string, options: Option[]) => {
    const current = values[key] || [];
    onChange(
      key,
      current.length === options.length ? [] : options.map((o) => o.value)
    );
  };

  const selectedCount = Object.values(values).reduce((a, b) => a + b.length, 0);

  return (
    <div className="relative" ref={panelRef}>

      {/* FILTER BUTTON */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="border px-4 py-2 rounded-lg bg-white text-sm flex items-center gap-2"
      >
        Filters
        {selectedCount > 0 && (
          <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
            {selectedCount}
          </span>
        )}
      </button>

      {/* PANEL */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[320px] max-h-[420px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50">
          {sections.map((section) => {
            const isExpanded = expanded.includes(section.key);
            const selected = values[section.key] || [];

            return (
              <div key={section.key} className="border-b last:border-b-0">

                {/* SECTION HEADER */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex justify-between items-center px-4 py-3 text-sm font-medium hover:bg-gray-50 transition"
                >
                  <span className="flex items-center gap-2">
                    {section.title}
                    {selected.length > 0 && (
                      <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                        {selected.length}
                      </span>
                    )}
                  </span>
                  <span
                    className="text-gray-400 transition-transform duration-200"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    ▾
                  </span>
                </button>

                {/* OPTIONS */}
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2">
                    {section.options.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Loading...</p>
                    ) : (
                      <>
                        {section.options.map((opt) => (
                          <label
                            key={opt.value}
                            className="flex items-center gap-2 cursor-pointer"
                            // ✅ stop click from bubbling up and triggering outside-click
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(opt.value)}
                              onChange={() => toggleValue(section.key, opt.value)}
                            />
                            <span
                              className="px-2 py-1 rounded text-xs"
                              style={{ background: opt.color }}
                            >
                              {opt.label}
                            </span>
                          </label>
                        ))}

                        {/* SELECT ALL */}
                        <div
                          className="flex justify-between items-center text-xs pt-2 border-t"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Select All</span>
                          <input
                            type="checkbox"
                            checked={selected.length === section.options.length}
                            onChange={() => toggleAll(section.key, section.options)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
