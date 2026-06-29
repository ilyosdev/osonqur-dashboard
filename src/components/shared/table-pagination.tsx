import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type TablePaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  summary?: string;
  maxVisible?: number;
};

function getVisiblePages(page: number, totalPages: number, maxVisible: number) {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, page - half);
  let end = start + maxVisible - 1;

  if (end > totalPages) {
    end = totalPages;
    start = end - maxVisible + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function TablePagination({
  page,
  totalPages,
  onPageChange,
  summary,
  maxVisible = 5,
}: TablePaginationProps) {
  const safeTotalPages = Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 1;
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const visiblePages = getVisiblePages(safePage, safeTotalPages, maxVisible);
  const showLeadingDots = visiblePages[0] > 1;
  const showTrailingDots = visiblePages[visiblePages.length - 1] < safeTotalPages;

  return (
    <div className="flex items-center justify-between border-t border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
      <p className="text-[12px] font-medium text-[#85b7eb]">{summary || `Sahifa ${safePage} / ${safeTotalPages}`}</p>
      <div className="flex items-center gap-2 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-[7px] text-[#378add] hover:bg-[#f0f7ff]"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {showLeadingDots && <span className="px-1 text-[#85b7eb]">...</span>}

        {visiblePages.map((value) => (
          <Button
            key={value}
            variant="ghost"
            size="sm"
            className={
              value === safePage
                ? "h-9 min-w-9 rounded-[7px] border border-[#dbe7f3] bg-white px-3 text-[#0c447c]"
                : "h-9 min-w-9 rounded-[7px] px-3 text-[#378add] hover:bg-[#f0f7ff]"
            }
            onClick={() => onPageChange(value)}
            disabled={safeTotalPages <= 1}
          >
            {String(value).padStart(2, "0")}
          </Button>
        ))}

        {showTrailingDots && <span className="px-1 text-[#85b7eb]">...</span>}

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-[7px] text-[#378add] hover:bg-[#f0f7ff]"
          onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
          disabled={safePage >= safeTotalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
