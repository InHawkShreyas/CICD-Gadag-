import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export const SlideOverDrawer = ({
  icon,
  eyebrow,
  title,
  onClose,
  testId,
  children,
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  onClose: () => void;
  testId?: string;
  children: (closeAnimated: () => void) => ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const closeAnimated = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" data-testid={testId}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={closeAnimated}
      />

      {/* Sliding panel */}
      <div
        className={`absolute top-0 right-0 flex flex-col w-full max-w-md h-full bg-white shadow-xl transition-transform duration-200 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between flex-shrink-0 gap-3 p-5 border-b border-gray-100">
          <div className="flex items-start min-w-0 gap-3">
            {icon && (
              <div className="flex items-center justify-center flex-shrink-0 rounded-lg bg-primary/10 w-9 h-9">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && <p className="text-xs font-semibold text-primary">{eyebrow}</p>}
              <h3 className="mt-0.5 text-base font-bold leading-snug text-gray-800">{title}</h3>
            </div>
          </div>
          <button
            onClick={closeAnimated}
            data-testid={testId ? `${testId}-close` : undefined}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body / footer — supplied by the caller */}
        {children(closeAnimated)}
      </div>
    </div>,
    document.body
  );
};