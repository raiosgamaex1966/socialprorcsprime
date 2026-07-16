import { useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const TablePagination = forwardRef<HTMLDivElement, TablePaginationProps>(({ currentPage, totalPages, totalItems, pageSize, onPageChange }, ref) => {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const rangeStart = Math.max(2, currentPage - 1);
      const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div ref={ref} className="flex items-center justify-between gap-4 pt-4">
      <p className="text-xs text-muted-foreground shrink-0">
        Exibindo {start}–{end} de {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        {getPageNumbers().map((page, idx) =>
          page === "..." ? (
            <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0 text-xs"
              onClick={() => onPageChange(page as number)}
            >
              {page}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
});

TablePagination.displayName = "TablePagination";

export default TablePagination;

export const usePagination = <T,>(items: T[], pageSize = 15) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  if (safeCurrentPage !== currentPage) setCurrentPage(safeCurrentPage);
  const paginatedItems = items.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  return {
    currentPage: safeCurrentPage,
    totalPages,
    totalItems: items.length,
    pageSize,
    paginatedItems,
    setCurrentPage,
  };
};
