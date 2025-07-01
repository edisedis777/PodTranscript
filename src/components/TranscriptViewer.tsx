import React, { useState, useMemo } from 'react';
import { Episode, SearchResult } from '../types/transcript';
import { Clock, User, Download, Copy, Search, Settings } from 'lucide-react';
import { ExportUtils } from '../utils/exportUtils';

interface TranscriptViewerProps {
  episodes: Episode[];
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
  searchQuery: string;
}

export function TranscriptViewer({ episodes, searchResults, onSearch, searchQuery }: TranscriptViewerProps) {
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [exportIncludeTimestamps, setExportIncludeTimestamps] = useState(true);

  const displayEpisode = selectedEpisode || episodes[0];

  const filteredSegments = useMemo(() => {
    if (!displayEpisode) return [];
    
    if (searchQuery && searchResults.length > 0) {
      const episodeResults = searchResults.filter(result => result.episodeId === displayEpisode.id);
      return displayEpisode.transcript.filter(segment => 
        episodeResults.some(result => result.segmentId === segment.id)
      );
    }
    
    return displayEpisode.transcript;
  }, [displayEpisode, searchQuery, searchResults]);

  const handleExport = async (format: 'text' | 'markdown') => {
    if (!displayEpisode) return;
    
    const content = format === 'markdown' 
      ? ExportUtils.exportAsMarkdown(displayEpisode, exportIncludeTimestamps)
      : ExportUtils.exportAsText(displayEpisode, exportIncludeTimestamps);
    
    const extension = format === 'markdown' ? 'md' : 'txt';
    const filename = `${displayEpisode.title.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
    
    ExportUtils.downloadFile(content, filename, format);
  };

  const handleCopy = async () => {
    if (!displayEpisode) return;
    
    try {
      const content = ExportUtils.exportAsText(displayEpisode, exportIncludeTimestamps);
      await ExportUtils.copyToClipboard(content);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (episodes.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Episodes Found
        </h3>
        <p className="text-gray-600">
          Upload some podcast data files to get started
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Episode Selection */}
      {episodes.length > 1 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Episodes ({episodes.length})
          </h3>
          <div className="grid gap-3">
            {episodes.map(episode => (
              <button
                key={episode.id}
                onClick={() => setSelectedEpisode(episode)}
                className={`
                  text-left p-4 rounded-lg border-2 transition-all duration-200
                  ${selectedEpisode?.id === episode.id || (!selectedEpisode && episode === episodes[0])
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                  }
                `}
              >
                <h4 className="font-medium text-gray-900">{episode.title}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {episode.podcastTitle} • {formatTime(episode.duration)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Episode Header */}
      {displayEpisode && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg text-white p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-2xl font-bold mb-2">{displayEpisode.title}</h2>
              <p className="text-purple-100 mb-2">{displayEpisode.podcastTitle}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-purple-100">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(displayEpisode.duration)}
                </div>
                <span>•</span>
                <span>{new Date(displayEpisode.publishDate).toLocaleDateString()}</span>
                <span>•</span>
                <span>{displayEpisode.transcript.length} segments</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleExport('text')}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-6 p-4 bg-white/10 rounded-lg">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showTimestamps}
                    onChange={(e) => setShowTimestamps(e.target.checked)}
                    className="rounded"
                  />
                  <span>Show timestamps</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportIncludeTimestamps}
                    onChange={(e) => setExportIncludeTimestamps(e.target.checked)}
                    className="rounded"
                  />
                  <span>Include timestamps in exports</span>
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleExport('text')}
                  className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  Export as TXT
                </button>
                <button
                  onClick={() => handleExport('markdown')}
                  className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  Export as Markdown
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Info */}
      {searchQuery && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            Found {searchResults.length} results for "<strong>{searchQuery}</strong>"
            {filteredSegments.length !== displayEpisode?.transcript.length && 
              ` (showing ${filteredSegments.length} segments)`
            }
          </p>
        </div>
      )}

      {/* Transcript */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Transcript
          </h3>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {filteredSegments.map((segment, index) => {
            const searchResult = searchResults.find(r => r.segmentId === segment.id);
            const displayText = searchResult?.highlightedText || segment.text;
            
            return (
              <div
                key={segment.id}
                className={`
                  p-6 border-b border-gray-100 last:border-b-0
                  ${searchResult ? 'bg-yellow-50' : ''}
                  hover:bg-gray-50 transition-colors
                `}
              >
                <div className="flex items-start space-x-4">
                  {showTimestamps && (
                    <div className="flex-shrink-0 text-sm text-gray-500 font-mono">
                      {formatTime(segment.timestamp)}
                    </div>
                  )}
                  
                  <div className="flex-1">
                    {segment.speaker && (
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          {segment.speaker}
                        </span>
                      </div>
                    )}
                    
                    <p 
                      className="text-gray-900 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: displayText }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}