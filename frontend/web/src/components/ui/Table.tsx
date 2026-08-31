import { useState } from "react";
import Button from "./Button";
import Pagination from "./Pagination";
import { Eye, Pencil, Trash2 } from "lucide-react";

/* ---------------- TYPES ---------------- */

type Column<T> = {
  header: string;
  accessor: keyof T;
  render?: (row: T) => React.ReactNode;
};

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  testId?: string;
  pageSize?: number;

  // Optional Server-side Pagination
  serverPagination?: boolean;
  page?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
};

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  selectable = false,
  onView,
  onEdit,
  onDelete,
  testId,
  pageSize = 10,

  serverPagination = false,
  page = 1,
  totalRecords = 0,
  onPageChange,
}: TableProps<T>) {
  // Used only for client-side pagination
  const [localPage, setLocalPage] = useState(1);

  const currentPage = serverPagination ? page : localPage;

  const totalPages = Math.max(
    1,
    Math.ceil(
      (serverPagination ? totalRecords : data.length) / pageSize
    )
  );

  const showPagination = totalPages > 1;

  const paginatedData = serverPagination
    ? data
    : data.slice(
        (localPage - 1) * pageSize,
        localPage * pageSize
      );

  return (
    <div data-testid={testId}>
      <div className="overflow-x-auto">
        <table className="min-w-full overflow-hidden border border-gray-200 rounded-lg">

          {/* HEADER */}

          <thead className="text-white bg-primary">
            <tr>

              {selectable && (
                <th className="px-4 py-2 text-left">
                  <input type="checkbox" />
                </th>
              )}

              {columns.map((col, i) => (
                <th
                  key={`${String(col.accessor)}-${i}`}
                  className="px-4 py-2 text-sm font-semibold text-left"
                >
                  {col.header}
                </th>
              ))}

              {(onView || onEdit || onDelete) && (
                <th className="px-4 py-2 text-sm font-semibold text-left">
                  Actions
                </th>
              )}

            </tr>
          </thead>

          {/* BODY */}

          <tbody>

            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="py-6 text-center text-gray-400"
                >
                  No data available
                </td>
              </tr>
            )}

            {paginatedData.map((row, index) => (
              <tr
                key={index}
                className="transition border-t hover:bg-gray-50"
              >

                {selectable && (
                  <td className="px-4 py-2">
                    <input type="checkbox" />
                  </td>
                )}

                {columns.map((col, i) => (
                  <td
                    key={`${String(col.accessor)}-${i}`}
                    className="px-4 py-2 text-sm text-text"
                  >
                    {col.render
                      ? col.render(row)
                      : String(row[col.accessor] ?? "")}
                  </td>
                ))}

                {(onView || onEdit || onDelete) && (
                  <td className="px-4 py-2">

                    <div className="flex gap-2">

                      {onView && (
                        <Button
                          variant="secondary"
                          className="p-2"
                          onClick={() => onView(row)}
                        >
                          <Eye size={16} />
                        </Button>
                      )}

                      {onEdit && (
                        <Button
                          variant="accent"
                          className="p-2"
                          onClick={() => onEdit(row)}
                        >
                          <Pencil size={16} />
                        </Button>
                      )}

                      {onDelete && (
                        <Button
                          variant="outline"
                          className="p-2 text-red-500 border-red-400 hover:bg-red-500 hover:text-white"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}

                    </div>

                  </td>
                )}

              </tr>
            ))}

          </tbody>

        </table>
      </div>

      {/* PAGINATION */}

      {showPagination && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={(newPage) => {
            if (serverPagination) {
              onPageChange?.(newPage);
            } else {
              setLocalPage(newPage);
            }
          }}
        />
      )}

    </div>
  );
}