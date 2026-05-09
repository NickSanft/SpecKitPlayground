import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { commitSetActiveDoc, workspaceSignal } from '../core/state';
import { SEARCH_RESULT_CAP, searchWorkspace, type SearchResult } from '../utils/search';

export interface SearchPanelProps {
  onClose: () => void;
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const workspace = workspaceSignal.value;

  const results = useMemo(() => searchWorkspace(workspace, query), [workspace, query]);

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function open(result: SearchResult) {
    commitSetActiveDoc(result.target);
    onClose();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) open(r);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div class="modal-backdrop" onClick={onClose} role="presentation">
      <div
        class="modal modal-wide search-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="search-title" class="modal-title">
          Search workspace
        </h2>

        <input
          ref={inputRef}
          class="modal-input search-input"
          type="search"
          placeholder="Search across constitution + every feature's docs…"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          onKeyDown={onKey}
          aria-label="Search query"
        />

        <p class="modal-hint search-hint">
          {query.trim().length === 0
            ? 'Substring match, case-insensitive. Use ↑/↓ to move, Enter to open.'
            : results.length === 0
              ? 'No matches.'
              : `${results.length}${results.length === SEARCH_RESULT_CAP ? '+' : ''} match${
                  results.length === 1 ? '' : 'es'
                }.`}
        </p>

        {results.length > 0 && (
          <ol class="search-results" role="listbox" aria-label="Search results">
            {results.map((r, idx) => (
              <li class="search-result" role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === activeIndex ? 'true' : 'false'}
                  class={`search-result-button ${idx === activeIndex ? 'is-active' : ''}`}
                  onClick={() => open(r)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <span class="search-result-target">{r.targetLabel}</span>
                  <span class="search-result-snippet">
                    <span class="search-snippet-side">{r.snippet.before}</span>
                    <mark class="search-snippet-match">{r.snippet.match}</mark>
                    <span class="search-snippet-side">{r.snippet.after}</span>
                  </span>
                  <span class="search-result-line" aria-label={`line ${r.line}`}>
                    L{r.line}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
