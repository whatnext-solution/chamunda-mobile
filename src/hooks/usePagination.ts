import { useState, useEffect, useMemo } from 'react';

interface UsePaginationProps {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
}

interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setItemsPerPage: (items: number) => void;
  getPageNumbers: () => number[];
}

export function usePagination({
  totalItems,
  itemsPerPage = 25,
  initialPage = 1,
}: UsePaginationProps): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(itemsPerPage);

  const totalPages = Math.ceil(totalItems / perPage);

  // Reset to first page when total items or items per page changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalItems, perPage, currentPage, totalPages]);

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, totalItems);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  const setItemsPerPage = (items: number) => {
    setPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Generate page numbers for pagination display
  const getPageNumbers = useMemo(() => {
    return () => {
      const pages: number[] = [];
      const maxVisiblePages = 5;
      
      if (totalPages <= maxVisiblePages) {
        // Show all pages if total pages is less than or equal to max visible
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first page
        pages.push(1);
        
        // Calculate start and end of middle pages
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);
        
        // Adjust if we're near the beginning
        if (currentPage <= 3) {
          end = 4;
        }
        
        // Adjust if we're near the end
        if (currentPage >= totalPages - 2) {
          start = totalPages - 3;
        }
        
        // Add ellipsis if there's a gap after first page
        if (start > 2) {
          pages.push(-1); // -1 represents ellipsis
        }
        
        // Add middle pages
        for (let i = start; i <= end; i++) {
          if (i > 1 && i < totalPages) {
            pages.push(i);
          }
        }
        
        // Add ellipsis if there's a gap before last page
        if (end < totalPages - 1) {
          pages.push(-1); // -1 represents ellipsis
        }
        
        // Show last page
        if (totalPages > 1) {
          pages.push(totalPages);
        }
      }
      
      return pages;
    };
  }, [currentPage, totalPages]);

  return {
    currentPage,
    totalPages,
    itemsPerPage: perPage,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setItemsPerPage,
    getPageNumbers,
  };
}