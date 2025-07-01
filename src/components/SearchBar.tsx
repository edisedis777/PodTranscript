import React, { useState, useEffect } from 'react';
import { Search, X, Settings } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, options: SearchOptions) => void;
  placeholder?: string;
}

interface SearchOptions {
  caseSensitive?: boolean;
  wholeWords?: boolean;
}

export function SearchBar({ onSearch, placeholder = "Search transcripts..." }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWords: false
  });

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearch(query, options);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, options, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('', options);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="
            block w-full pl-12 pr-16 py-4 border border-gray-300 
            rounded-xl shadow-sm bg-white 
            text-gray-900 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
            transition-all duration-200
          "
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 space-x-2">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          
          <button
            onClick={() => setShowOptions(!showOptions)}
            className={`
              p-1 rounded-full transition-colors
              ${showOptions 
                ? 'bg-purple-100 text-purple-600' 
                : 'hover:bg-gray-100 text-gray-400'
              }
            `}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Options */}
      {showOptions && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Search Options
          </h4>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={options.caseSensitive}
                onChange={(e) => setOptions(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">
                Case sensitive
              </span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={options.wholeWords}
                onChange={(e) => setOptions(prev => ({ ...prev, wholeWords: e.target.checked }))}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">
                Whole words only
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      {query && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to clear search
        </div>
      )}
    </div>
  );
}