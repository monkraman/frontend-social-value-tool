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
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {results.results.length} evidence chunks retrieved for "{results.query}"
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
                <span>Similarity: {Math.round((res.similarity || 0.85) * 100)}%</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                "{res.content}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
