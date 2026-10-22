import React, { useState, useEffect } from 'react';
import type { SearchResponse, DocumentItem } from '../types';
import { searchVectorKnowledge, fetchDocuments } from '../api/client';
import { Search as SearchIcon, Filter, AlertTriangle, Copy, Check, FileText } from 'lucide-react';

export const Search: React.FC = () => {
  const [query, setQuery] = useState('digital inclusion initiatives in Birmingham');
  const [topK, setTopK] = useState(4);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Load available documents for filtering
  useEffect(() => {
    fetchDocuments()
      .then((docs) => setDocuments(docs.filter((d) => !d.is_archived)))
      .catch((err) => console.error('Failed to load documents for search filter:', err));
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const data = await searchVectorKnowledge(query, topK, selectedDocId || null);
      setResults(data);
    } catch (err: any) {
      console.error('Vector search error:', err);
      setSearchError(err.message || 'Semantic search failed');
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyChunk = (chunkId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedChunkId(chunkId);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  const suggestedQueries = [
    'Digital inclusion clinics East Birmingham',
    'Youth apprenticeships and careers mentoring',
    'Local SME supply chain spend commitments',
    'Net zero carbon reduction initiatives'
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1440px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: '0.3rem' }}>Repository</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>Evidence Search</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '680px' }}>
          Find passages in the repository that support a bid, such as case studies, past responses and partner evidence.
        </p>
      </div>

      {/* Search Bar & Controls */}
      <form
        onSubmit={handleSearch}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          padding: '1.1rem 1.25rem',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <SearchIcon size={16} style={{ position: 'absolute', left: '0.85rem', color: 'var(--color-primary)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What evidence are you looking for? For example: digital inclusion, apprenticeships"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Document Scope Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              style={{ width: 'auto', minWidth: '160px', fontSize: '0.8125rem' }}
              title="Filter by specific document"
            >
              <option value="">All Documents ({documents.length})</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename.length > 28 ? d.filename.slice(0, 26) + '…' : d.filename}
                </option>
              ))}
            </select>
          </div>

          {/* Top K Selector */}
          <select
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            style={{ width: 'auto', fontSize: '0.8125rem' }}
            title="Number of passages to show"
          >
            <option value={3}>3 results</option>
            <option value={5}>5 results</option>
            <option value={8}>8 results</option>
            <option value={12}>12 results</option>
          </select>

          <button type="submit" className="btn-primary" disabled={isSearching}>
            <SearchIcon size={14} />
            <span>{isSearching ? 'Searching…' : 'Search'}</span>
          </button>
        </div>

        {/* Suggested Quick Queries */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
            Try:
          </span>
          {suggestedQueries.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(q);
              }}
              className="btn-secondary"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '0.2rem 0.7rem',
                fontSize: '0.76rem',
                fontWeight: 500
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </form>

      {/* Error state */}
      {searchError && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.85rem'
          }}
        >
          <AlertTriangle size={18} />
          <div>
            <strong>Retrieval Error: </strong>
            <span>{searchError}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {results.results.length === 0 ? (
            <div
              style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)'
              }}
            >
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
                Nothing in the repository matches "{results.query}" yet
              </p>
              <p style={{ fontSize: '0.8125rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
                {selectedDocId
                  ? 'Nothing matched in the selected document. Try "All Documents" or different wording.'
                  : 'The uploaded documents do not contain matching text. Try keywords like "Digital Inclusion", "Youth", "Birmingham", or upload relevant RFP documents.'}
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <span>
                  <strong style={{ color: 'var(--text-primary)' }}>{results.results.length}</strong> passages found for <em>"{results.query}"</em>
                </span>
                {selectedDocId && (
                  <span className="badge-mono" style={{ fontSize: '0.72rem' }}>
                    Filtered to selected document
                  </span>
                )}
              </div>

              {results.results.map((res, i) => {
                const simScore = Math.round((res.similarity ?? 0) * 100);
                const isHighMatch = simScore >= 50;
                const isCopied = copiedChunkId === res.chunk_id;

                return (
                  <div
                    key={res.chunk_id || i}
                    className="card-accent"
                    style={{
                      padding: '1.1rem 1.25rem',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      animation: 'fadeIn 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={15} style={{ color: 'var(--color-primary)' }} />
                        <strong style={{ color: 'var(--text-primary)' }}>{res.filename}</strong>
                        {res.chunk_id && (
                          <span className="tag-mono" style={{ fontSize: '0.65rem' }}>
                            {res.chunk_id.slice(0, 12)}…
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            padding: '0.15rem 0.55rem',
                            borderRadius: 'var(--radius-full, 9999px)',
                            backgroundColor: isHighMatch ? 'var(--color-primary-subtle)' : 'var(--bg-muted)',
                            color: isHighMatch ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                            border: `1px solid ${isHighMatch ? 'var(--color-primary-border)' : 'var(--border-subtle)'}`,
                            fontSize: '0.74rem'
                          }}
                          title="How closely this passage matches your search"
                        >
                          {simScore}% match
                        </span>

                        <button
                          onClick={() => handleCopyChunk(res.chunk_id || String(i), res.content)}
                          className="btn-secondary"
                          style={{
                            padding: '0.2rem 0.5rem',
                            gap: '0.3rem',
                            fontSize: '0.72rem',
                            borderRadius: 'var(--radius-sm)',
                            color: isCopied ? 'var(--color-primary-text)' : undefined
                          }}
                          title="Copy passage text"
                        >
                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.65,
                        margin: 0,
                        paddingLeft: '0.85rem',
                        borderLeft: '2px solid var(--color-primary-border)'
                      }}
                    >
                      {res.content}
                    </p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};
