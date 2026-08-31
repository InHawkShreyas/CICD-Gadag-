import React from "react";

type RadioOption = {
  label: string;
  value: string | number;
};

type RadioProps = {
  label?: string;
  options: RadioOption[];
  value?: string | number;
  name: string;
  onChange?: (value: string | number) => void;
  required?: boolean;
  className?: string;
  testId?: string;
};

export default function Radio({
  label,
  options,
  value,
  name,
  onChange,
  required = false,
  className = "",
  testId,
}: RadioProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>

      {label && (
        <span className="text-sm font-medium text-text">
          {label} {required && <span className="text-accent">*</span>}
        </span>
      )}

      <div className="flex flex-wrap gap-4">
        {options.map((option) => {
          const isChecked = value === option.value;
          return (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer text-text group"
            >
              <span className="relative flex items-center justify-center w-5 h-5 shrink-0">
                <input
                  data-testid={testId ? `${testId}-${option.value}` : undefined}
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={isChecked}
                  onChange={() => onChange?.(option.value)}
                  className="sr-only peer"
                />
                {/* Outer ring */}
                <span
                  className={`
                    absolute inset-0 rounded-full border-2
                    transition-all duration-200 ease-out
                    ${isChecked ? "border-primary" : "border-gray-300 group-hover:border-primary/50"}
                    peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2
                  `}
                />
                {/* Inner dot */}
                <span
                  className={`
                    rounded-full bg-primary
                    transition-all duration-200 ease-out
                    ${isChecked ? "w-2.5 h-2.5 scale-100 opacity-100" : "w-2.5 h-2.5 scale-0 opacity-0"}
                  `}
                />
              </span>

              <span
                className={`
                  text-sm font-semibold transition-colors duration-200
                  ${isChecked ? "text-primary" : "text-text"}
                `}
              >
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}