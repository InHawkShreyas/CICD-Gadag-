import React from "react";
import { Search, X } from "lucide-react";

type InputMode = "alpha" | "numeric" | "alphanumeric" | "text";

type InputModeConfig = {
  pattern: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
};

const INPUT_MODE_CONFIG: Record<InputMode, InputModeConfig> = {
  alpha: {
    pattern: "[A-Za-z]*",
    onKeyDown: (e) => {
      const allowedKeys = [
        "Backspace", "Delete", "Tab",
        "ArrowLeft", "ArrowRight", "Home", "End",
      ];
      if (!allowedKeys.includes(e.key) && !/^[A-Za-z\s]$/.test(e.key)) {
        e.preventDefault();
      }
    },
    onPaste: (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text").replace(/[^A-Za-z ]/g, "");
      document.execCommand("insertText", false, text);
    },
  },
  numeric: {
    pattern: "[0-9]*",
    onKeyDown: (e) => {
      const allowedKeys = [
        "Backspace", "Delete", "Tab",
        "ArrowLeft", "ArrowRight", "Home", "End",
      ];
      if (!allowedKeys.includes(e.key) && !/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    },
    onPaste: (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
      document.execCommand("insertText", false, text);
    },
  },
  alphanumeric: {
    pattern: "[A-Za-z0-9]*",
    onKeyDown: (e) => {
      const allowedKeys = [
        "Backspace", "Delete", "Tab",
        "ArrowLeft", "ArrowRight", "Home", "End",
      ];
      if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9\s]$/.test(e.key)) {
        e.preventDefault();
      }
    },
    onPaste: (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text").replace(/[^A-Za-z0-9 ]/g, "");
      document.execCommand("insertText", false, text);
    },
  },

  text: {
  pattern: "[A-Za-z0-9._\\- ]*",
  onKeyDown: (e) => {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ];

    if (
      !allowedKeys.includes(e.key) &&
      !/^[A-Za-z0-9._\-\s]$/.test(e.key)
    ) {
      e.preventDefault();
    }
  },
  onPaste: (e) => {
    e.preventDefault();
    const text = e.clipboardData
      .getData("text")
      .replace(/[^A-Za-z0-9._\- ]/g, "");
    document.execCommand("insertText", false, text);
  },
},
};

type InputProps = {
  label?: string;
  name?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  step?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
  variant?: "default" | "search";
  onClear?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  autoComplete?: string;
  max?: string;
  min?: string;
  inputMode?: InputMode;
};

export default function Input({
  label,
  name,
  placeholder,
  type = "text",
  value,
  onChange,
  onKeyDown,
  onBlur,
  error,
  required = false,
  disabled = false,
  step,
  className = "",
  testId,
  variant = "default",
  onClear,
  leftIcon,
  rightIcon,
  autoComplete,
  max,
  min,
  inputMode,
}: InputProps) {
  const isSearch = variant === "search";
  const hasLeftIcon = isSearch || !!leftIcon;
  const hasRightIcon = (isSearch && value && onClear) || !!rightIcon;

  const modeConfig = inputMode ? INPUT_MODE_CONFIG[inputMode] : null;

  // "john smith" -> "John Smith", "abc123 def456" -> "Abc123 Def456".
  // Capitalizes the first character of each word (split on spaces) and
  // lowercases the rest of the word. Digits are untouched by upper/lowerCase,
  // so this works the same for "alpha" and "alphanumeric" modes — a word
  // that starts with a letter gets that letter capitalized, any numbers in
  // the word just pass through as-is.
  const formatCapitalized = (value: string) =>
    value
      .split(" ")
      .map((word) =>
        word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(" ");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (inputMode === "alpha" || inputMode === "alphanumeric") {
      const formatted = formatCapitalized(e.target.value);
      if (formatted !== e.target.value) {
        e.target.value = formatted;
      }
    }
    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    modeConfig?.onKeyDown(e);
    if (!e.defaultPrevented) {
      onKeyDown?.(e);
    }
  };

  return (
    <div className="flex flex-col w-full gap-1">

      {/* LABEL */}
      {label && (
        <label className="flex items-center gap-1 text-sm font-medium text-text">
          {label}
          {required && <span className="text-red-600">*</span>}
        </label>
      )}

      {/* INPUT WRAPPER */}
      <div className="relative w-full">

        {/* LEFT ICON */}
        {isSearch ? (
          <Search
            size={18}
            className="absolute z-10 text-gray-400 -translate-y-1/2 pointer-events-none left-3 top-1/2"
          />
        ) : leftIcon ? (
          <span className="absolute z-10 -translate-y-1/2 pointer-events-none left-4 top-1/2">
            {leftIcon}
          </span>
        ) : null}

        {/* INPUT */}
        <input
          data-testid={testId}
          name={name}
          type={type}
          step={step}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          onPaste={modeConfig?.onPaste}
          autoComplete={autoComplete}
          max={max}
          min={min}
          pattern={modeConfig?.pattern}
          inputMode={inputMode === "numeric" ? "numeric" : "text"}
          className={`
            w-full
            px-3 py-2.5
            ${isSearch ? "bg-gray-50 border-gray-200" : ""}
            ${hasLeftIcon ? "pl-11" : ""}
            ${hasRightIcon ? "pr-11" : ""}
            rounded-xl
            border
            text-sm
            text-text
            placeholder-gray-400
            transition duration-200
            focus:outline-none
            focus:border-primary
            focus:ring-2
            focus:ring-primary/30
            focus:bg-white
            ${error ? "border-red-400 focus:ring-red-200" : ""}
            ${className}
          `}
        />

        {/* RIGHT ICON */}
        {isSearch && value && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute z-10 text-gray-400 transition -translate-y-1/2 right-3 top-1/2 hover:text-red-500"
          >
            <X size={16} />
          </button>
        ) : rightIcon ? (
          <span className="absolute z-10 -translate-y-1/2 right-4 top-1/2">
            {rightIcon}
          </span>
        ) : null}
      </div>

      {/* ERROR */}
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  );
}