import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  getPageNumbers: () => number[];
  showItemsPerPage?: boolean;
  itemsPerPageOptions?: number[];
  className?: string;
}

export function DataPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onItemsPerPageChange,
  onFirstPage,
  onLastPage,
  onNextPage,
  onPreviousPage,
  getPageNumbers,
  showItemsPerPage = true,
  itemsPerPageOptions = [10, 25, 50, 100],
  className = '',
}: DataPaginationProps) {
  const pageNumbers = getPageNumbers();

  if (totalItems === 0) {
    return (
      <div className={`flex items-center justify-center py-4 px-2 ${className}`}>
        <div className="text-sm text-muted-foreground">
          No items to display
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-4 px-2 py-4 ${className}`}>
      {/* Top Row - Items per page and info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        {showItemsPerPage && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium whitespace-nowrap">Rows per page</p>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={itemsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {itemsPerPageOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {endIndex} of {totalItems} entries
        </div>
      </div>

      {/* Bottom Row - Page navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="flex items-center justify-center sm:justify-start">
          <div className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        <div className="flex items-center justify-center space-x-1">
          {/* First Page Button */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={onFirstPage}
            disabled={!hasPreviousPage}
            title="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous Page Button */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={onPreviousPage}
            disabled={!hasPreviousPage}
            title="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page Numbers - Simplified for mobile */}
          <div className="flex items-center space-x-1">
            {pageNumbers.slice(0, 5).map((pageNumber, index) => (
              <React.Fragment key={index}>
                {pageNumber === -1 ? (
                  <span className="px-2 text-muted-foreground">...</span>
                ) : (
                  <Button
                    variant={pageNumber === currentPage ? "default" : "outline"}
                    className="h-8 w-8 p-0"
                    onClick={() => onPageChange(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Next Page Button */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={onNextPage}
            disabled={!hasNextPage}
            title="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last Page Button */}
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={onLastPage}
            disabled={!hasNextPage}
            title="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}