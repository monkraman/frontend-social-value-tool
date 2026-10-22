import React, { useState } from 'react';
import { useDocumentManager } from '../hooks/useDocumentManager';
import { formatDate } from '../utils/formatters';
import type { DocumentItem, DocumentChunkItem } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import {
  UploadCloud,
  Trash2,
  FileText,
  Archive,
  RotateCcw,
  AlertTriangle,
  Eye,
  X,
  Search,
  Copy,
  Check,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const Documents: React.FC = () => {
  const {
    documents,
    isUploading,
    statusMessage,
    uploadFile,
    getChunksForDocument,
    archiveDocument,
    restoreDocument,
    hardDeleteDocument,
    clearStatus
  } = useDocumentManager();

  const [activeFilter, setActiveFilter] = useState<'active' | 'archived'>('active');
  const [isDragging, setIsDragging] = useState(false);
  const [batchStatus, setBatchStatus] = useState<{ current: number; total: number; filename: string } | null>(null);

  // Chunk inspection state
  const [inspectingDoc, setInspectingDoc] = useState<DocumentItem | null>(null);
  const [docChunks, setDocChunks] = useState<DocumentChunkItem[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunkFilterQuery, setChunkFilterQuery] = useState('');
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Custom Confirmation Modal State (replaces window.confirm)
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    variant: 'danger' | 'warning' | 'info';
    badge?: string;
    isLoading?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'warning',
    onConfirm: async () => {}
  });

  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const activeDocs = documents.filter((d) => !d.is_archived);
  const archivedDocs = documents.filter((d) => d.is_archived);
  const baseDocs = activeFilter === 'active' ? activeDocs : archivedDocs;

  const filteredDocs = baseDocs.filter((doc) => {
    if (docTypeFilter !== 'all' && doc.document_type.toLowerCase() !== docTypeFilter.toLowerCase()) {
      return false;
    }
    if (docSearchQuery.trim()) {
      const q = docSearchQuery.toLowerCase();
      return doc.filename.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDocs = filteredDocs.slice(startIndex, startIndex + pageSize);

  const handleTabChange = (tab: 'active' | 'archived') => {
    setActiveFilter(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setDocSearchQuery(query);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (type: string) => {
    setDocTypeFilter(type);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Handle batch & single files
  const processFiles = async (files: FileList | File[]) => {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const file = files[i];
      if (total > 1) {
        setBatchStatus({ current: i + 1, total, filename: file.name });
      }
      try {
        await uploadFile(file);
      } catch (err: any) {
        console.error(`File upload failed for ${file.name}:`, err);
      }
    }
    setBatchStatus(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  const handleArchive = (id: string, filename: string) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Archive Document',
      badge: 'Can be restored',
      variant: 'warning',
      confirmText: 'Archive Document',
      message: (
        <div>
          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            Are you sure you want to archive <strong>"{filename}"</strong>?
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            It will stop being used in searches and proposals straight away. Its details and audit history are kept, so you can restore it later.
          </p>
        </div>
      ),
      onConfirm: async () => {
        setConfirmModalState((prev) => ({ ...prev, isLoading: true }));
        try {
          await archiveDocument(id, filename);
        } finally {
          setConfirmModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  const handleRestore = async (id: string, filename: string) => {
    await restoreDocument(id, filename);
  };

  const handleHardDelete = (id: string, filename: string) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Permanently Delete Document',
      badge: 'Cannot be undone',
      variant: 'danger',
      confirmText: 'Delete permanently',
      message: (
        <div>
          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            Are you sure you want to permanently delete <strong>"{filename}"</strong>?
          </p>
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: 'var(--bg-muted)',
              borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid var(--border-medium)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.45
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>This is permanent.</strong> Everything extracted from this document will be erased from the repository, and it can't be restored afterwards.
          </div>
        </div>
      ),
      onConfirm: async () => {
        setConfirmModalState((prev) => ({ ...prev, isLoading: true }));
        try {
          await hardDeleteDocument(id, filename);
        } finally {
          setConfirmModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  // Inspect chunks handler
  const handleOpenChunkInspector = async (doc: DocumentItem) => {
    setInspectingDoc(doc);
    setIsLoadingChunks(true);
    setChunkFilterQuery('');
    try {
      const chunks = await getChunksForDocument(doc.id);
      setDocChunks(chunks);
    } catch (err: any) {
      console.error('Failed to load document chunks:', err);
      setDocChunks([]);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const handleCopyChunk = (chunkId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedChunkId(chunkId);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  // Filter chunks by keyword
  const filteredChunks = docChunks.filter((chunk) => {
    if (!chunkFilterQuery.trim()) return true;
    return chunk.content.toLowerCase().includes(chunkFilterQuery.toLowerCase());
  });

  return (
    <div style={{ width: '100%', maxWidth: '1440px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <div className="eyebrow" style={{ marginBottom: '0.3rem' }}>Knowledge</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>Repository</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
          Your tender evidence, case studies and reference material, {activeDocs.length} {activeDocs.length === 1 ? 'file' : 'files'} in use.
        </p>
      </div>

      {/* Upload Drop Zone - Compact & Clean */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1.4rem 1.5rem',
          border: isDragging ? '2px dashed var(--color-primary)' : '1.5px dashed var(--color-primary-border)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isDragging ? 'var(--color-primary-subtle)' : 'var(--bg-surface)',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          position: 'relative'
        }}
      >
        <input
          id="file-upload-input"
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md"
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: isUploading ? 'not-allowed' : 'pointer', width: '100%', height: '100%' }}
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        <span className="icon-badge" style={{ width: '44px', height: '44px' }}>
          <UploadCloud size={22} />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {batchStatus ? (
              <span>Uploading {batchStatus.current} of {batchStatus.total}: {batchStatus.filename}...</span>
            ) : isUploading ? (
              'Processing document...'
            ) : isDragging ? (
              'Drop files here'
            ) : (
              'Upload reference documents'
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Drag files here or click to browse. PDF, Word, Excel and Markdown are supported.
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            backgroundColor: 'var(--color-primary-subtle)',
            border: '1px solid var(--color-primary-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.84rem',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {statusMessage.isError ? <AlertTriangle size={15} style={{ color: '#D64545' }} /> : <CheckCircle2 size={15} style={{ color: 'var(--color-primary)' }} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={clearStatus}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Document Table & Filters */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Documents
          </h3>
          <div className="segmented" role="tablist" aria-label="Document status">
            <button
              onClick={() => handleTabChange('active')}
              className={activeFilter === 'active' ? 'is-active' : ''}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
            >
              Active ({activeDocs.length})
            </button>
            <button
              onClick={() => handleTabChange('archived')}
              className={activeFilter === 'archived' ? 'is-active' : ''}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
            >
              Archived ({archivedDocs.length})
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div
          style={{
            padding: '0.65rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by file name…"
                value={docSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.65rem 0.4rem 1.9rem',
                  fontSize: '0.78rem',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              {docSearchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Document format dropdown */}
            <select
              value={docTypeFilter}
              onChange={(e) => handleTypeFilterChange(e.target.value)}
              style={{
                padding: '0.4rem 0.65rem',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm, 4px)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Formats</option>
              <option value="pdf">PDF only</option>
              <option value="docx">Word (DOCX)</option>
              <option value="xlsx">Excel (XLSX)</option>
              <option value="txt">Text & Markdown</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              style={{
                padding: '0.25rem 0.45rem',
                fontSize: '0.75rem',
                borderRadius: 'var(--radius-sm, 4px)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredDocs.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              {docSearchQuery || docTypeFilter !== 'all'
                ? `No documents matching "${docSearchQuery || docTypeFilter}".`
                : activeFilter === 'active'
                ? 'No active documents in repository.'
                : 'No archived documents.'}
            </div>
          ) : (
            paginatedDocs.map((doc, idx) => (
              <div
                key={doc.id}
                className="row-hover"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.85rem 1.25rem',
                  borderBottom: idx !== paginatedDocs.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  fontSize: '0.8125rem',
                  opacity: doc.is_archived ? 0.75 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span
                    className="icon-badge"
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-md)',
                      opacity: doc.is_archived ? 0.6 : 1
                    }}
                  >
                    <FileText size={16} />
                  </span>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {doc.filename}
                      {doc.is_archived && (
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            backgroundColor: 'var(--bg-muted)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-muted)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px'
                          }}
                        >
                          Archived
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.1rem' }}>
                      <span className="tag-mono" style={{ fontSize: '0.66rem', padding: '0.05rem 0.4rem' }}>{doc.document_type.toUpperCase()}</span>
                      <span>{doc.chunks_count} sections</span>
                      <span>·</span>
                      <span>Added {formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* Preview Button */}
                  <button
                    onClick={() => handleOpenChunkInspector(doc)}
                    className="btn-secondary"
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', gap: '0.35rem', borderRadius: 'var(--radius-sm)' }}
                    title="Preview what was extracted from this file"
                  >
                    <Eye size={13} />
                    <span>Preview</span>
                  </button>

                  {!doc.is_archived ? (
                    <button
                      onClick={() => handleArchive(doc.id, doc.filename)}
                      className="btn-secondary"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', gap: '0.35rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}
                      title="Stop using this file in searches and proposals (can be restored)"
                    >
                      <Archive size={13} />
                      <span>Archive</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestore(doc.id, doc.filename)}
                        className="btn-secondary"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', gap: '0.35rem', borderRadius: 'var(--radius-sm)' }}
                        title="Put this file back into use"
                      >
                        <RotateCcw size={13} />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handleHardDelete(doc.id, doc.filename)}
                        className="btn-secondary"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', gap: '0.35rem', borderRadius: 'var(--radius-sm)', color: '#C53B3B' }}
                        title="Erase this file and everything extracted from it"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Navigation Footer */}
        {filteredDocs.length > 0 && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.78rem'
            }}
          >
            <div style={{ color: 'var(--text-secondary)' }}>
              Showing{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {filteredDocs.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredDocs.length)}
              </strong>{' '}
              of <strong style={{ color: 'var(--text-primary)' }}>{filteredDocs.length}</strong>{' '}
              {activeFilter === 'active' ? 'active' : 'archived'} documents
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary"
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.75rem',
                  opacity: currentPage === 1 ? 0.4 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                if (
                  totalPages <= 6 ||
                  pg === 1 ||
                  pg === totalPages ||
                  Math.abs(pg - currentPage) <= 1
                ) {
                  const isActive = pg === currentPage;
                  return (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      style={{
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.75rem',
                        fontWeight: isActive ? 700 : 500,
                        borderRadius: 'var(--radius-sm, 4px)',
                        border: 'none',
                        backgroundColor: isActive ? 'var(--btn-primary-bg)' : 'transparent',
                        color: isActive ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {pg}
                    </button>
                  );
                } else if (pg === currentPage - 2 || pg === currentPage + 2) {
                  return (
                    <span key={pg} style={{ color: 'var(--text-muted)', padding: '0 0.15rem' }}>
                      …
                    </span>
                  );
                }
                return null;
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary"
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.75rem',
                  opacity: currentPage === totalPages ? 0.4 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chunk Inspector Modal */}
      {inspectingDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
            backdropFilter: 'blur(3px)'
          }}
          onClick={() => setInspectingDoc(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg, 10px)',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="icon-badge" style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)' }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {inspectingDoc.filename}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {docChunks.length} passages extracted · {inspectingDoc.document_type.toUpperCase()}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectingDoc(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Search within chunks */}
            <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search within this document…"
                value={chunkFilterQuery}
                onChange={(e) => setChunkFilterQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.8125rem',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              {chunkFilterQuery && (
                <button
                  onClick={() => setChunkFilterQuery('')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Chunks Content Area */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                flex: 1
              }}
            >
              {isLoadingChunks ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading passages…
                </div>
              ) : filteredChunks.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {chunkFilterQuery ? `No passages match "${chunkFilterQuery}"` : 'Nothing was extracted from this document.'}
                </div>
              ) : (
                filteredChunks.map((chunk) => {
                  const wordCount = chunk.content.trim().split(/\s+/).filter(Boolean).length;
                  const isCopied = copiedChunkId === chunk.id;

                  return (
                    <div
                      key={chunk.id}
                      className="card-accent"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem 1.15rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      {/* Chunk Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="tag-mono" style={{ fontSize: '0.7rem' }}>
                            Passage {chunk.chunk_index + 1}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{wordCount} words</span>
                          {chunk.metadata?.page_number && (
                            <span style={{ color: 'var(--text-muted)' }}>• Page {chunk.metadata.page_number}</span>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopyChunk(chunk.id, chunk.content)}
                          className="btn-secondary"
                          style={{
                            padding: '0.2rem 0.5rem',
                            gap: '0.3rem',
                            fontSize: '0.72rem',
                            borderRadius: 'var(--radius-sm)',
                            color: isCopied ? 'var(--color-primary-text)' : undefined
                          }}
                        >
                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* Chunk Content */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.65,
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit'
                        }}
                      >
                        {chunk.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '0.75rem 1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}
            >
              <span>Showing {filteredChunks.length} of {docChunks.length} passages</span>
              <button
                onClick={() => setInspectingDoc(null)}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Reusable Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        variant={confirmModalState.variant}
        badge={confirmModalState.badge}
        isLoading={confirmModalState.isLoading}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
