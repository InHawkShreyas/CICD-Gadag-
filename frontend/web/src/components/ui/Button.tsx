import React from "react";
import { Upload } from "lucide-react";

type ButtonProps = {
  children?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "accent" | "outline" | "upload";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  testId?: string;
};

export default function Button({
  children,
  type = "button",
  variant = "primary",
  disabled = false,
  onClick,
  className = "",
  testId,
}: ButtonProps) {

  const variants = {
    primary:
      "bg-primary text-white shadow-md hover:shadow-lg hover:-translate-y-[1px] hover:brightness-110",

    secondary:
      "bg-secondary text-text shadow-sm hover:shadow-md hover:-translate-y-[1px] text-white",

    accent:
      "bg-accent text-black shadow-md hover:shadow-lg hover:-translate-y-[1px] hover:brightness-110",

    outline:
      "border border-primary text-primary bg-transparent hover:bg-primary hover:text-white",

    upload:
      "bg-secondary text-text border border-secondary hover:bg-primary hover:text-white shadow-sm",
  };

  return (
    <button
      data-testid={testId}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        px-5 py-2.5
        rounded-xl
        font-semibold
        text-sm
        tracking-wide
        transition-all
        duration-200
        ease-in-out
        focus:outline-none
        focus:ring-primary
        focus:ring-offset-2
        disabled:opacity-50
        disabled:cursor-not-allowed
        flex
        items-center
        justify-center
        gap-2
        ${variants[variant]}
        ${className}
      `}
    >
      {variant === "upload" && <Upload size={16} />}
      {children || (variant === "upload" && "Upload")}
    </button>
  );
}