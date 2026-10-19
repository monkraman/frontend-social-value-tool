import React, { useState } from 'react';
import { useDocumentManager } from '../hooks/useDocumentManager';
import { formatDate } from '../utils/formatters';
import type { DocumentItem, DocumentChunkItem } from '../types';
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
  Layers
} from 'lucide-react';

export const Documents: React.FC = () => {
  const {
    documents,
    isUploading,
    statusMessage,
    totalChunks,
    uploadFile,
    getChunksForDocument,
    archiveDocument,
    restoreDocument,
    hardDeleteDocument,
    clearStatus
  } = useDocumentManager();

  const [activeFilter, setActiveFilter] = useState<'active' | 'archived'>('active');
  const [isDragging, setIsDragging] = useState(false);

  // Chunk inspection state
  const [inspectingDoc, setInspectingDoc] = useState<DocumentItem | null>(null);
  const [docChunks, setDocChunks] = useState<DocumentChunkItem[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunkFilterQuery, setChunkFilterQuery] = useState('');
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  const activeDocs = documents.filter((d) => !d.is_archived);
  const archivedDocs = documents.filter((d) => d.is_archived);
  const displayedDocs = activeFilter === 'active' ? activeDocs : archivedDocs;

  // Handle files
  const processFiles = async (files: FileList | File[]) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await uploadFile(file);
      } catch (err: any) {
        console.error('File upload failed:', err);
      }
    }
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

  const handleArchive = async (id: string, filename: string) => {
    if (!window.confirm(`Archive "${filename}"? It will be excluded from RAG vector searches, but audit records remain.`)) return;
    await archiveDocument(id, filename);
  };

  const handleRestore = async (id: string, filename: string) => {
    await restoreDocument(id, filename);
  };

  const handleHardDelete = async (id: string, filename: string) => {
    if (
      !window.confirm(
        `PERMANENT DELETION WARNING: Are you sure you want to permanently delete "${filename}"? All chunks and vector embeddings will be completely erased from PostgreSQL.`
      )
    ) {
      return;
    }
    await hardDeleteDocument(id, filename);
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
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Knowledge Documents</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {activeDocs.length} active documents • {totalChunks} vector chunks stored in pgvector. Soft-deleted documents are strictly excluded from RAG vector search.
        </p>
      </div>

      {/* Upload Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.25rem 1.5rem',
          border: isDragging ? '2px dashed var(--color-primary, #3b82f6)' : '1px dashed var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-surface)',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
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
        <UploadCloud size={30} style={{ color: isDragging ? 'var(--color-primary, #3b82f6)' : 'var(--text-secondary)', marginBottom: '0.6rem' }} />
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {isUploading ? 'Ingesting, chunking & vectorizing file...' : isDragging ? 'Drop tender documents here' : 'Click or Drag & Drop tender documents here'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          Supports PDF, Word (DOCX), Excel (XLSX), Markdown & Text files • Auto-indexed into PostgreSQL pgvector
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            backgroundColor: statusMessage.isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            border: `1px solid ${statusMessage.isError ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            color: statusMessage.isError ? '#ef4444' : '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {statusMessage.isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={clearStatus}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
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
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Indexed Document Repository
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveFilter('active')}
              style={{
                background: activeFilter === 'active' ? 'var(--bg-active, rgba(59, 130, 246, 0.15))' : 'transparent',
                color: activeFilter === 'active' ? 'var(--color-primary, #3b82f6)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm, 4px)',
                padding: '0.25rem 0.65rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: activeFilter === 'active' ? 600 : 400
              }}
            >
              Active ({activeDocs.length})
            </button>
            <button
              onClick={() => setActiveFilter('archived')}
              style={{
                background: activeFilter === 'archived' ? 'var(--bg-active, rgba(239, 68, 68, 0.15))' : 'transparent',
                color: activeFilter === 'archived' ? '#ef4444' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'var(--radius-sm, 4px)',
                padding: '0.25rem 0.65rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: activeFilter === 'archived' ? 600 : 400
              }}
            >
              Archived ({archivedDocs.length})
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {displayedDocs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              {activeFilter === 'active' ? 'No active documents in repository.' : 'No archived documents.'}
            </div>
          ) : (
            displayedDocs.map((doc, idx) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1.25rem',
                  borderBottom: idx !== displayedDocs.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  fontSize: '0.8125rem',
                  opacity: doc.is_archived ? 0.75 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <FileText size={16} style={{ color: doc.is_archived ? 'var(--text-muted)' : 'var(--text-secondary)' }} />
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {doc.filename}
                      {doc.is_archived && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '3px'
                          }}
                        >
                          ARCHIVED (Excluded from RAG)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {doc.document_type.toUpperCase()} • {doc.chunks_count} chunks • {formatDate(doc.created_at)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {/* View Chunks Button */}
                  <button
                    onClick={() => handleOpenChunkInspector(doc)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm, 4px)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      padding: '0.25rem 0.55rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem'
                    }}
                    title="Audit and inspect parsed text chunks"
                  >
                    <Eye size={13} />
                    <span>View Chunks</span>
                  </button>

                  {!doc.is_archived ? (
                    <button
                      onClick={() => handleArchive(doc.id, doc.filename)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm, 4px)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '0.25rem 0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem'
                      }}
                      title="Soft delete (exclude from RAG search while preserving audit)"
                    >
                      <Archive size={13} />
                      <span>Archive</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestore(doc.id, doc.filename)}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm, 4px)',
                          color: 'var(--color-primary, #3b82f6)',
                          cursor: 'pointer',
                          padding: '0.25rem 0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem'
                        }}
                        title="Restore document to active search"
                      >
                        <RotateCcw size={13} />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handleHardDelete(doc.id, doc.filename)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: 'var(--radius-sm, 4px)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.25rem 0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem'
                        }}
                        title="Permanently erase document & vector chunks from PostgreSQL"
                      >
                        <Trash2 size={13} />
                        <span>Hard Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chunk Inspector Modal */}
      {inspectingDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
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
                <div
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm, 6px)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--color-primary, #3b82f6)'
                  }}
                >
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {inspectingDoc.filename}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {docChunks.length} chunks indexed in pgvector • Format: {inspectingDoc.document_type.toUpperCase()}
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
                placeholder="Search within this document's chunks..."
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
                  Loading vectorized chunks from PostgreSQL...
                </div>
              ) : filteredChunks.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {chunkFilterQuery ? `No chunks match "${chunkFilterQuery}"` : 'No chunks found for this document.'}
                </div>
              ) : (
                filteredChunks.map((chunk) => {
                  const wordCount = chunk.content.trim().split(/\s+/).filter(Boolean).length;
                  const isCopied = copiedChunkId === chunk.id;

                  return (
                    <div
                      key={chunk.id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm, 6px)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      {/* Chunk Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              color: 'var(--color-primary, #3b82f6)',
                              fontWeight: 700,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem'
                            }}
                          >
                            Chunk #{chunk.chunk_index + 1}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{wordCount} words</span>
                          {chunk.metadata?.page_number && (
                            <span style={{ color: 'var(--text-muted)' }}>• Page {chunk.metadata.page_number}</span>
                          )}
                        </div>

                        <button
                          onClick={() => handleCopyChunk(chunk.id, chunk.content)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '4px',
                            color: isCopied ? '#16a34a' : 'var(--text-secondary)',
                            padding: '0.2rem 0.45rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.7rem'
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
                          fontSize: '0.8125rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
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
              <span>Showing {filteredChunks.length} of {docChunks.length} chunks</span>
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
    </div>
  );
};
