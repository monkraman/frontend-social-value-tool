import React from 'react';
import { useDocumentManager } from '../hooks/useDocumentManager';
import { formatDate } from '../utils/formatters';
import { UploadCloud, Trash2, FileText } from 'lucide-react';

export const Documents: React.FC = () => {
  const {
    documents,
    isUploading,
    statusMessage,
    totalChunks,
    uploadFile,
    deleteDocument
  } = useDocumentManager();

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

  const handleDelete = async (id: string, filename: string) => {
    if (!window.confirm(`Delete "${filename}"?`)) return;
    await deleteDocument(id, filename);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Knowledge Documents</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {documents.length} documents indexed • {totalChunks} vector chunks stored in pgvector.
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
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            color: 'var(--text-primary)'
          }}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Document Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Indexed Document Repository
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {documents.map((doc, idx) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1.25rem',
                borderBottom: idx !== documents.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                fontSize: '0.8125rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FileText size={16} style={{ color: 'var(--text-secondary)' }} />
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{doc.filename}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {doc.document_type.toUpperCase()} • {doc.chunks_count} chunks • {formatDate(doc.created_at)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(doc.id, doc.filename)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.35rem'
                }}
                title="Delete document"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
