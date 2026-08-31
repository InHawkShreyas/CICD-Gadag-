import React from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  onClose?: () => void;
};

export default function Toast({
  message,
  type = "info",
  onClose,
}: ToastProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      bg: "bg-gradient-to-r from-emerald-500 to-emerald-600"
    },

    error: {
      icon: AlertCircle,
      bg: "bg-gradient-to-r from-red-500 to-rose-600",
    },

    info: {
      icon: Info,
      bg: "bg-gradient-to-r from-blue-500 to-indigo-600",
    },
  };

  const Icon = config[type].icon;

  return (
    <div
      className={`
        flex items-center gap-3

        min-w-[280px]
        max-w-[90vw]
        sm:max-w-[360px]

        px-4 py-3

        rounded-2xl

        text-white

        shadow-xl

        ${config[type].bg}

        animate-[toast_0.25s_ease]
      `}
    >
      {/* Icon */}

      <div className="flex items-center justify-center rounded-full h-9 w-9 shrink-0 bg-white/20">
        <Icon size={18} />
      </div>

      {/* Message */}

      <p className="flex-1 text-sm font-medium leading-5">
        {message}
      </p>

      {/* Close */}

      {onClose && (
        <button
          onClick={onClose}
          className="
            shrink-0

            rounded-full

            p-1.5

            text-white/80

            transition

            hover:bg-white/20
            hover:text-white
          "
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}