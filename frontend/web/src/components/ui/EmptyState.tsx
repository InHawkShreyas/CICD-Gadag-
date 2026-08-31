import Button from "./Button";
import Stethoscope from "../../assets/document.png";

type EmptyStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testId?: string;
};

export default function EmptyState({
  title = "No Data Found",
  description = "There is nothing to display here yet.",
  actionLabel,
  onAction,
  testId
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center text-center py-16 px-6"
    >
      {/* Illustration */}
      <img
        src={Stethoscope}
        alt="empty"
        className="w-24 h-24 mb-6 opacity-80 "
      />

      {/* Title */}
      <h3 className="text-xl font-semibold text-text mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-400 max-w-sm mb-6">
        {description}
      </p>

      {/* Optional Action */}
      {actionLabel && (
        <Button variant="accent" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}