import { useState, useRef, useEffect } from "react";

type Option = {
  label: string;
  value: string;
  color?: string;
};

type Props = {
  label: string;
  placeholder?: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
};

export default function MultiSelectFilter({
  label,
  placeholder,
  options,
  values,
  onChange
}: Props) {

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleValue = (value: string) => {

    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }

  };

  const toggleAll = () => {

    if (values.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(o => o.value));
    }

  };

  return (

    <div className="relative" ref={containerRef}>

      {/* SELECT BUTTON */}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white border rounded-lg"
      >
        <span className={values.length === 0 ? "text-slate-400" : "text-slate-700"}>
          {values.length === 0
            ? (placeholder ?? label)
            : `${values.length} selected`}
        </span>

        <span>▾</span>
      </button>

      {/* DROPDOWN */}

      {open && (

        <div className="absolute z-50 w-full mt-2 overflow-y-auto bg-white border shadow-lg rounded-xl max-h-64">

          {options.map((opt) => (

            <label
              key={opt.value}
              className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50"
            >

              <input
                type="checkbox"
                checked={values.includes(opt.value)}
                onChange={() => toggleValue(opt.value)}
              />

              <span
                className="px-2 py-1 text-xs font-medium rounded"
                style={{ background: opt.color }}
              >
                {opt.label}
              </span>

            </label>

          ))}

          {/* SELECT ALL */}

          <div className="flex items-center justify-between px-4 py-2 text-sm border-t">

            <span>Select All</span>

            <input
              type="checkbox"
              checked={values.length === options.length}
              onChange={toggleAll}
            />

          </div>

        </div>

      )}

    </div>

  );

}