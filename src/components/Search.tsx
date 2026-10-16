import React, { useState } from 'react';
import type { SearchResponse } from '../types';
import { searchVectorKnowledge } from '../api/client';
import { Search as SearchIcon } from 'lucide-react';

export const Search: React.FC = () => {
  const [query, setQuery] = useState('digital inclusion initiatives in Birmingham');
  const [topK, setTopK] = useState(4);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const data = await searchVectorKnowledge(query, topK);
      setResults(data);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Semantic Vector Search</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Query the PostgreSQL pgvector store directly to view retrieved past proposal evidence chunks.
        </p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search proposal evidence..."
          style={{ flex: 1, minWidth: '220px' }}
        />

        <select
          value={topK}
          onChange={(e) => setTopK(Number(e.target.value))}
          style={{ width: 'auto' }}
        >
          <option value={3}>3 Chunks</option>
          <option value={5}>5 Chunks</option>
          <option value={8}>8 Chunks</option>
        </select>

        <button type="submit" className="btn-primary" disabled={isSearching}>
          <SearchIcon size={14} />
          <span>{isSearching ? 'Searching...' : 'Search'}</span>
        </button>
      </form>

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {results.results.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)'
              }}
            >
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
                No relevant evidence chunks found for "{results.query}"
              </p>
              <p style={{ fontSize: '0.8125rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
                The uploaded documents do not contain information related to this topic. Try searching for tender topics like <em>"Digital Inclusion"</em>, <em>"Youth Employment"</em>, <em>"Birmingham"</em>, or <em>"Apprenticeships"</em>.
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {results.results.length} evidence chunk(s) retrieved for "{results.query}"
              </div>

              {results.results.map((res, i) => (
                <div
                  key={i}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{res.filename}</strong>
                    <span
                      style={{
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: (res.similarity ?? 0) >= 0.5 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        color: (res.similarity ?? 0) >= 0.5 ? '#16a34a' : '#ca8a04'
                      }}
                    >
                      Similarity: {Math.round((res.similarity ?? 0) * 100)}%
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    "{res.content}"
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
