import React from "react";
import { ChevronDown } from "lucide-react";

type Option = {
  label: string;
  value: string | number;
};

type SelectProps = {
  label?: string;
  name?: string;
  options: Option[];
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  className?: string;
  testId?: string;
   disabled?: boolean; 
};

export default function Select({
  label,
  name,
  options,
  value,
  onChange,
  placeholder = "Select option",
  error,
  required = false,
  className = "",
  testId,
}: SelectProps) {
  return (
    <div className="flex flex-col w-full gap-1">
      {label && (
        <label className="text-sm font-medium text-text">
          {label} {required && <span className="text-accent">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          data-testid={testId}
          name={name}
          value={value}
          onChange={onChange}
          className={`
            w-full
            px-3 pr-10 py-2.5
            rounded-lg
            border
            border-gray-300
            bg-white
            text-sm text-text
            appearance-none
            transition
            focus:outline-none
            focus:border-primary
            focus:ring-2
            focus:ring-primary/30
            ${error ? "border-red-400 focus:ring-red-200" : ""}
            ${className}
          `}
        >
          <option value="">{placeholder}</option>

          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={18}
          className="absolute text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2"
        />
      </div>

      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}