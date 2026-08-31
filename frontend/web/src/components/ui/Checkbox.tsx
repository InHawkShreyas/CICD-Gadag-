import React from "react";

type CheckboxProps = {
  label?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  testId?: string;
  color?: "primary" | "secondary";
  /** Exact custom color (e.g. "#820000") for the checked state. Overrides `color`. */
  colorHex?: string;
};

export default function Checkbox({
  label,
  checked,
  onChange,
  required = false,
  disabled = false,
  className = "",
  testId,
  color = "primary",
  colorHex,
}: CheckboxProps) {
  const colorClass = colorHex
    ? ""
    : color === "secondary"
      ? "text-secondary focus:ring-secondary"
      : "text-primary focus:ring-primary";

  return (
    <label
      className={`flex items-center gap-2 cursor-pointer text-text ${className}`}
    >
      <input
        data-testid={testId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={colorHex ? { accentColor: colorHex } : undefined}
        className={`
          w-4 h-4
          rounded
          border-gray-300
          ${colorClass}
        `}
      />

      {label && (
        <span className="text-sm font-medium">
          {label} {required && <span className="text-accent">*</span>}
        </span>
      )}
    </label>
  );
}