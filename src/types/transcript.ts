export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
  confidence?: number;
}

export interface Episode {
  id: string;
  title: string;
  podcastTitle: string;
  duration: number;
  publishDate: string;
  description?: string;
  transcript: TranscriptSegment[];
}

export interface SearchResult {
  segmentId: string;
  episodeId: string;
  text: string;
  timestamp: number;
  highlightedText: string;
}

export interface FileProcessingResult {
  episodes: Episode[];
  errors: string[];
}