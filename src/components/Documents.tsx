import React, { useState } from 'react';
import { useDocumentManager } from '../hooks/useDocumentManager';
import { formatDate } from '../utils/formatters';
import { UploadCloud, Trash2, FileText, Archive, RotateCcw, AlertTriangle } from 'lucide-react';

export const Documents: React.FC = () => {
  const {
    documents,
    isUploading,
    statusMessage,
    totalChunks,
    uploadFile,
    archiveDocument,
    restoreDocument,
    hardDeleteDocument
  } = useDocumentManager();

  const [activeFilter, setActiveFilter] = useState<'active' | 'archived'>('active');

  const activeDocs = documents.filter((d) => !d.is_archived);
  const archivedDocs = documents.filter((d) => d.is_archived);
  const displayedDocs = activeFilter === 'active' ? activeDocs : archivedDocs;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile(file);
    } catch {
      // handled in hook
    } finally {
      e.target.value = '';
    }
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

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Knowledge Documents</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {activeDocs.length} active documents • {totalChunks} vector chunks stored in pgvector. Soft-deleted documents are strictly excluded from RAG vector search.
        </p>
      </div>

      {/* Upload Box */}
      <label
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          border: '1px dashed var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-surface)',
          cursor: isUploading ? 'not-allowed' : 'pointer'
        }}
      >
        <input
          type="file"
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        <UploadCloud size={24} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          {isUploading ? 'Ingesting & vectorizing file...' : 'Click to upload tender proposal or rate card'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          PDF, Word (DOCX), Excel (XLSX), Markdown & Text
        </div>
      </label>

      {statusMessage && (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            backgroundColor: statusMessage.isError ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-surface)',
            border: `1px solid ${statusMessage.isError ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            color: statusMessage.isError ? '#ef4444' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {statusMessage.isError && <AlertTriangle size={15} />}
          <span>{statusMessage.text}</span>
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
    </div>
  );
};
