import { Episode, SearchResult, TranscriptSegment } from '../types/transcript';

export class SearchEngine {
  private episodes: Episode[] = [];

  setEpisodes(episodes: Episode[]) {
    this.episodes = episodes;
  }

  search(query: string, options: { caseSensitive?: boolean; wholeWords?: boolean } = {}): SearchResult[] {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const searchQuery = options.caseSensitive ? query : query.toLowerCase();
    
    this.episodes.forEach(episode => {
      episode.transcript.forEach(segment => {
        const text = options.caseSensitive ? segment.text : segment.text.toLowerCase();
        
        if (this.matchesQuery(text, searchQuery, options.wholeWords)) {
          results.push({
            segmentId: segment.id,
            episodeId: episode.id,
            text: segment.text,
            timestamp: segment.timestamp,
            highlightedText: this.highlightMatches(segment.text, query, options.caseSensitive)
          });
        }
      });
    });

    return results.sort((a, b) => {
      // Sort by relevance (number of matches) and then by timestamp
      const aMatches = this.countMatches(a.text, searchQuery, options.wholeWords);
      const bMatches = this.countMatches(b.text, searchQuery, options.wholeWords);
      
      if (aMatches !== bMatches) {
        return bMatches - aMatches;
      }
      
      return a.timestamp - b.timestamp;
    });
  }

  private matchesQuery(text: string, query: string, wholeWords?: boolean): boolean {
    if (wholeWords) {
      const regex = new RegExp(`\\b${this.escapeRegex(query)}\\b`, 'gi');
      return regex.test(text);
    }
    
    return text.includes(query);
  }

  private countMatches(text: string, query: string, wholeWords?: boolean): number {
    const searchText = text.toLowerCase();
    const searchQuery = query.toLowerCase();
    
    if (wholeWords) {
      const regex = new RegExp(`\\b${this.escapeRegex(searchQuery)}\\b`, 'gi');
      const matches = searchText.match(regex);
      return matches ? matches.length : 0;
    }
    
    let count = 0;
    let pos = 0;
    while ((pos = searchText.indexOf(searchQuery, pos)) !== -1) {
      count++;
      pos += searchQuery.length;
    }
    
    return count;
  }

  private highlightMatches(text: string, query: string, caseSensitive?: boolean): string {
    if (!query.trim()) return text;
    
    const flags = caseSensitive ? 'g' : 'gi';
    const escapedQuery = this.escapeRegex(query);
    const regex = new RegExp(`(${escapedQuery})`, flags);
    
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600 px-1 rounded">$1</mark>');
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getEpisodeById(episodeId: string): Episode | undefined {
    return this.episodes.find(episode => episode.id === episodeId);
  }

  getSegmentById(episodeId: string, segmentId: string): TranscriptSegment | undefined {
    const episode = this.getEpisodeById(episodeId);
    return episode?.transcript.find(segment => segment.id === segmentId);
  }
}