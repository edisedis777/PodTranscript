import React, { useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { SearchBar } from './components/SearchBar';
import { TranscriptViewer } from './components/TranscriptViewer';
import { FileParser } from './utils/fileParser';
import { SearchEngine } from './utils/searchEngine';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Episode, SearchResult } from './types/transcript';
import { AlertCircle, CheckCircle, X, Folder, Mouse, Eye, MoreHorizontal, Command } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

function App() {
  const [episodes, setEpisodes] = useLocalStorage<Episode[]>('podtranscript-episodes', []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasProcessedFiles, setHasProcessedFiles] = useState(false);

  const searchEngine = useMemo(() => {
    const engine = new SearchEngine();
    engine.setEpisodes(episodes);
    return engine;
  }, [episodes]);

  const addNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleFilesProcessed = useCallback(async (files: FileList) => {
    setIsProcessing(true);
    setHasProcessedFiles(true);
    
    try {
      const parser = new FileParser();
      const result = await parser.processFiles(files);
      
      if (result.episodes.length > 0) {
        setEpisodes(prev => [...prev, ...result.episodes]);
        addNotification('success', `Successfully processed ${result.episodes.length} episode(s)`);
      }
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          addNotification('error', error);
        });
      }
      
      if (result.episodes.length === 0 && result.errors.length === 0) {
        addNotification('info', 'No transcript data found in the uploaded files');
      }
    } catch (error) {
      addNotification('error', `Failed to process files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [setEpisodes, addNotification]);

  const handleSearch = useCallback((query: string, options: any) => {
    setSearchQuery(query);
    const results = searchEngine.search(query, options);
    setSearchResults(results);
  }, [searchEngine]);

  const clearAllData = useCallback(() => {
    setEpisodes([]);
    setSearchResults([]);
    setSearchQuery('');
    setHasProcessedFiles(false);
    addNotification('info', 'All data cleared');
  }, [setEpisodes, addNotification]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <Header />
      
      {/* Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`
              flex items-center space-x-3 p-4 rounded-lg shadow-lg backdrop-blur-sm border
              ${notification.type === 'success' ? 'bg-green-50/90 border-green-200 text-green-800' : ''}
              ${notification.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : ''}
              ${notification.type === 'info' ? 'bg-blue-50/90 border-blue-200 text-blue-800' : ''}
              animate-in slide-in-from-right duration-300
            `}
          >
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
            {notification.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-600" />}
            
            <span className="text-sm font-medium">{notification.message}</span>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {episodes.length === 0 ? (
          <>
            {/* Welcome Section */}
            <div className="text-center py-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Access Your Podcast Transcripts
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                Upload your Apple Podcast data to search, read, and export transcripts. 
                All processing happens locally in your browser for complete privacy.
              </p>
            </div>
            
            {/* No Transcripts Found Message */}
            {hasProcessedFiles && (
              <div className="max-w-4xl mx-auto mb-8">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <div className="flex items-start space-x-4">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-800 mb-3">
                        No podcast transcripts found
                      </h3>
                      <p className="text-red-700 mb-4">
                        Make sure you followed step 1 to locally cache the transcript data so it can be read.
                      </p>
                      <div className="bg-white/50 rounded-lg p-4 border border-red-200">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            1
                          </div>
                          <div>
                            <p className="text-red-800 font-medium mb-1">
                              Go to the episode in the MacOS Podcasts app and click where it says 'Transcript' 
                              (or the triple dots <MoreHorizontal className="inline w-4 h-4" /> &gt; 'View Transcript').
                            </p>
                            <p className="text-red-700 text-sm">
                              This step is crucial - it downloads and caches the transcript data locally on your Mac.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* File Upload */}
            <FileUpload 
              onFilesProcessed={handleFilesProcessed}
              isProcessing={isProcessing}
            />
            
            {/* Enhanced Instructions */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  How to Get Your Podcast Data
                </h3>
                <p className="text-purple-100">
                  Follow these simple steps to access your podcast transcripts from macOS
                </p>
              </div>
              
              <div className="p-8">
                {/* Step-by-step instructions */}
                <div className="space-y-8">
                  {/* Step 1 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Open Transcript in Podcasts App
                      </h4>
                      <p className="text-gray-600 mb-3">
                        Go to any episode in the macOS Podcasts app and click where it says <strong>'Transcript'</strong> 
                        (or click the triple dots <MoreHorizontal className="inline w-4 h-4" /> and select <strong>'View Transcript'</strong>).
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 text-blue-700">
                          <Eye className="w-4 h-4" />
                          <span className="text-sm font-medium">This step ensures transcript data is cached locally</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Navigate to Podcast Data Folder
                      </h4>
                      <p className="text-gray-600 mb-3">
                        Open a <Folder className="inline w-4 h-4" /> Finder window and access the hidden podcast data folder:
                      </p>
                      
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Method 1:</strong> Using the menu
                          </p>
                          <ol className="text-sm text-gray-600 space-y-1 ml-4">
                            <li>• Select <strong>Go</strong> → <strong>Go to Folder</strong> from the Finder menu</li>
                          </ol>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Method 2:</strong> Using keyboard shortcut
                          </p>
                          <div className="flex items-center space-x-2 text-sm">
                            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                              <Command className="inline w-3 h-3" /> + Shift + G
                            </kbd>
                            <span className="text-gray-600">Press this key combination</span>
                          </div>
                        </div>
                        
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-sm text-amber-800 mb-2">
                            <strong>Then enter this exact path:</strong>
                          </p>
                          <code className="block bg-gray-900 text-green-400 p-3 rounded font-mono text-sm break-all">
                            ~/Library/Group Containers/243LU875E5.groups.com.apple.podcasts
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Upload the Data Files
                      </h4>
                      <p className="text-gray-600 mb-3">
                        Drag and drop <strong>all the contents</strong> of that folder into the upload area above.
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 text-green-700">
                          <Mouse className="w-4 h-4" />
                          <span className="text-sm font-medium">Select all files (Cmd+A) and drag them to the upload zone</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Supported File Types
                      </h4>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>JSON transcript files</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>PLIST/XML data exports</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>SQLite database files</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>ZIP archives containing podcast data</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        Troubleshooting Tips
                      </h4>
                      <ul className="space-y-2 text-gray-600 text-sm">
                        <li>• Make sure you've viewed transcripts in the Podcasts app first</li>
                        <li>• The folder path is case-sensitive - copy it exactly</li>
                        <li>• If the folder doesn't exist, try listening to an episode with transcripts</li>
                        <li>• You can upload multiple files at once</li>
                        <li>• All processing happens locally - no data leaves your device</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Privacy Notice */}
                <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-800 mb-2">
                        🔒 Complete Privacy Protection
                      </h4>
                      <p className="text-sm text-purple-700 leading-relaxed">
                        Your podcast data never leaves your device. All file processing, transcript extraction, 
                        and search functionality happens entirely in your browser. No uploads, no tracking, 
                        no data collection - just local, private access to your own podcast transcripts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Search Bar */}
            <SearchBar onSearch={handleSearch} />
            
            {/* Clear Data Button */}
            <div className="text-center">
              <button
                onClick={clearAllData}
                className="text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                Clear all data
              </button>
            </div>
            
            {/* Transcript Viewer */}
            <TranscriptViewer
              episodes={episodes}
              searchResults={searchResults}
              onSearch={handleSearch}
              searchQuery={searchQuery}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;