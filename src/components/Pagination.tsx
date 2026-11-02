import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  pageSizeOptions = [5, 10, 20, 50],
  onPageSizeChange,
  itemLabel = 'items'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let leftBound = Math.max(2, validCurrentPage - 1);
      let rightBound = Math.min(totalPages - 1, validCurrentPage + 1);

      if (validCurrentPage <= 3) {
        rightBound = 4;
      }
      if (validCurrentPage >= totalPages - 2) {
        leftBound = totalPages - 3;
      }

      if (leftBound > 2) pages.push('...');
      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }
      if (rightBound < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.75rem 0.25rem',
        fontSize: '0.82rem',
        color: 'var(--text-secondary)'
      }}
    >
      {/* Left: Item Counter & Page Size Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{startItem}</strong> -{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{endItem}</strong> of{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem' }}>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Select items per page"
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          onClick={() => onPageChange(1)}
          disabled={validCurrentPage === 1}
          aria-label="First page"
          className="btn-secondary"
          style={{
            padding: '0.3rem 0.45rem',
            opacity: validCurrentPage === 1 ? 0.4 : 1,
            cursor: validCurrentPage === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          onClick={() => onPageChange(validCurrentPage - 1)}
          disabled={validCurrentPage === 1}
          aria-label="Previous page"
          className="btn-secondary"
          style={{
            padding: '0.3rem 0.45rem',
            opacity: validCurrentPage === 1 ? 0.4 : 1,
            cursor: validCurrentPage === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronLeft size={14} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', margin: '0 0.2rem' }}>
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{ padding: '0.25rem 0.4rem', color: 'var(--text-muted)' }}
                >
                  …
                </span>
              );
            }
            const isCurrent = p === validCurrentPage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                aria-label={`Page ${p}`}
                aria-current={isCurrent ? 'page' : undefined}
                style={{
                  minWidth: '28px',
                  height: '28px',
                  padding: '0 0.4rem',
                  fontSize: '0.78rem',
                  fontWeight: isCurrent ? 700 : 500,
                  borderRadius: 'var(--radius-sm)',
                  border: isCurrent
                    ? '1px solid var(--color-primary)'
                    : '1px solid var(--border-subtle)',
                  backgroundColor: isCurrent ? 'var(--color-primary)' : 'var(--bg-surface)',
                  color: isCurrent ? 'var(--text-inverse, #fff)' : 'var(--text-primary)',
                  cursor: isCurrent ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(validCurrentPage + 1)}
          disabled={validCurrentPage === totalPages}
          aria-label="Next page"
          className="btn-secondary"
          style={{
            padding: '0.3rem 0.45rem',
            opacity: validCurrentPage === totalPages ? 0.4 : 1,
            cursor: validCurrentPage === totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronRight size={14} />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={validCurrentPage === totalPages}
          aria-label="Last page"
          className="btn-secondary"
          style={{
            padding: '0.3rem 0.45rem',
            opacity: validCurrentPage === totalPages ? 0.4 : 1,
            cursor: validCurrentPage === totalPages ? 'not-allowed' : 'pointer'
          }}
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

