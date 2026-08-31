import React from "react";

type CardProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
  testId?: string;
};

export default function Card({
  title,
  children,
  className = "",
  testId,
}: CardProps) {
  return (
    <div
      data-testid={testId}
      className={`
        bg-white
        border
        border-gray-200
        rounded-xl
        shadow-sm
        p-6
        ${className}
      `}
    >
      {title && (
        <h3 className="text-lg font-semibold text-text mb-4">
          {title}
        </h3>
      )}

      {children}
    </div>
  );
}