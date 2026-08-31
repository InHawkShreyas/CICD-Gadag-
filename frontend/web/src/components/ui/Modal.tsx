import React from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  testId?: string;
};

export default function Modal({
  open,
  title,
  children,
  onClose,
  size = "md",
  testId,
}: ModalProps) {

  if (!open) return null;

  const sizeClass = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-3xl",
    xl: "max-w-6xl",
  }[size];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      data-testid={testId}
    >
      <div
        className={`
        bg-white
        rounded-xl
        shadow-xl
        w-full
        ${sizeClass}
        p-6
        max-h-[90vh]
        overflow-y-auto
        animate-fadeIn
      `}
      >

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2 className="text-lg font-semibold text-text">
              {title}
            </h2>
          )}

          <button
            onClick={onClose}
            className="text-xl text-gray-400 hover:text-text"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>

      </div>
    </div>,
    document.body
  );
}