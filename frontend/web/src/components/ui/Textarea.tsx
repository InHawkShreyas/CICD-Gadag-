import React from "react";

type TextareaProps = {
  label?: string;
  placeholder?: string;
  value?: string;
  rows?: number;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  required?: boolean;
  className?: string;
  testId?: string;
};

export default function Textarea({
  label,
  placeholder,
  value,
  rows = 4,
  onChange,
  error,
  required = false,
  className = "",
  testId,
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-1 w-full">

      {label && (
        <label className="text-sm font-medium text-text">
          {label} {required && <span className="text-accent">*</span>}
        </label>
      )}

      <textarea
        data-testid={testId}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`
          w-full
          px-4 py-2.5
          rounded-lg
          border
          border-gray-300
          bg-white
          text-text
          placeholder-gray-400
          resize-none
          transition
          duration-200
          focus:outline-none
          focus:border-primary
          focus:ring-2
          focus:ring-primary/30
          ${error ? "border-red-400 focus:ring-red-200" : ""}
          ${className}
        `}
      />

      {error && (
        <span className="text-sm text-red-500">
          {error}
        </span>
      )}
    </div>
  );
}