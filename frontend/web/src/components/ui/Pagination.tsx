import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

/**
 * Builds a windowed list of page numbers with "…" gaps instead of
 * rendering every page. Always shows first, last, current, and one
 * neighbour on each side of current.
 */
function buildPageList(page: number, totalPages: number): (number | "ellipsis")[] {
  const siblingCount = 1;
  const totalNumbers = siblingCount * 2 + 5; // first + last + current + 2 siblings + 2 ellipses

  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  const pages: (number | "ellipsis")[] = [1];

  if (showLeftEllipsis) {
    pages.push("ellipsis");
  } else {
    for (let p = 2; p < leftSibling; p++) pages.push(p);
  }

  for (let p = leftSibling; p <= rightSibling; p++) {
    if (p !== 1 && p !== totalPages) pages.push(p);
  }

  if (showRightEllipsis) {
    pages.push("ellipsis");
  } else {
    for (let p = rightSibling + 1; p < totalPages; p++) pages.push(p);
  }

  pages.push(totalPages);

  return pages;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages = buildPageList(page, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <div className="flex items-center gap-2 p-1.5 bg-gray-50/80 border border-gray-200/80 rounded-2xl">
      {/* Prev */}
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-full group text-text hover:bg-primary/10 hover:text-primary disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
        Prev
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1 px-1">
        {pages.map((p, idx) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="inline-flex items-center justify-center text-gray-400 w-9 h-9"
            >
              <MoreHorizontal size={16} />
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`
                inline-flex items-center justify-center w-9 h-9
                rounded-full text-sm font-semibold
                transition-colors duration-200
                ${
                  p === page
                    ? "text-white bg-gradient-to-br from-primary to-primary/80"
                    : "text-text hover:bg-gray-100"
                }
              `}
            >
              {p}
            </button>
          )
        )}
      </div>

      {/* Next */}
      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-all duration-200 rounded-full group text-text hover:bg-primary/10 hover:text-primary disabled:opacity-30 disabled:pointer-events-none"
      >
        Next
        <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>
      </div>
    </div>
  );
}