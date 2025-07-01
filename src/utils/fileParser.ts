import JSZip from 'jszip';
import { Episode, TranscriptSegment, FileProcessingResult } from '../types/transcript';

export class FileParser {
  async processFiles(files: FileList): Promise<FileProcessingResult> {
    const result: FileProcessingResult = {
      episodes: [],
      errors: []
    };

    console.log(`Processing ${files.length} files...`);

    for (const file of Array.from(files)) {
      try {
        console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);
        
        // Check if this is a directory (directories have empty type and size 0)
        if (file.type === '' && file.size === 0) {
          console.log(`Skipping directory: ${file.name}`);
          result.errors.push(`Cannot process directory "${file.name}". Please select individual files instead.`);
          continue;
        }
        
        if (file.name.endsWith('.zip')) {
          const zipResult = await this.processZipFile(file);
          result.episodes.push(...zipResult.episodes);
          result.errors.push(...zipResult.errors);
        } else if (file.name.endsWith('.json')) {
          const episode = await this.processJsonFile(file);
          if (episode) result.episodes.push(episode);
        } else if (file.name.endsWith('.plist') || file.name.endsWith('.xml')) {
          const episode = await this.processPlistFile(file);
          if (episode) result.episodes.push(episode);
        } else if (file.name.endsWith('.sqlite') || file.name.endsWith('.db')) {
          // Apple Podcasts often stores data in SQLite databases
          console.log(`SQLite file detected: ${file.name}`);
          result.errors.push(`SQLite files (${file.name}) cannot be processed in the browser. Please look for JSON or PLIST files in the podcast data folder.`);
        } else if (file.name.includes('transcript') || file.name.includes('Transcript')) {
          // Try to process any file that might contain transcript data
          const episode = await this.processGenericFile(file);
          if (episode) result.episodes.push(episode);
        } else {
          console.log(`Attempting to process unknown file type: ${file.name}`);
          // Try to process as text/JSON anyway
          const episode = await this.processGenericFile(file);
          if (episode) {
            result.episodes.push(episode);
          } else {
            console.log(`No transcript data found in: ${file.name}`);
          }
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        result.errors.push(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Processing complete. Found ${result.episodes.length} episodes, ${result.errors.length} errors`);
    return result;
  }

  private async processGenericFile(file: File): Promise<Episode | null> {
    try {
      const content = await file.text();
      
      // Try JSON first
      try {
        const episode = this.parseJsonContent(content, file.name);
        if (episode) return episode;
      } catch (e) {
        // Not JSON, continue
      }
      
      // Try XML/PLIST
      try {
        const episode = this.parsePlistContent(content, file.name);
        if (episode) return episode;
      } catch (e) {
        // Not XML, continue
      }
      
      // Try to extract any text that might be transcript content
      if (content.length > 100 && this.looksLikeTranscript(content)) {
        return this.createEpisodeFromText(content, file.name);
      }
      
    } catch (error) {
      console.error(`Error reading file ${file.name}:`, error);
    }
    
    return null;
  }

  private looksLikeTranscript(content: string): boolean {
    // Check if content looks like transcript data
    const transcriptIndicators = [
      'transcript',
      'speaker',
      'timestamp',
      'time',
      'text',
      'dialogue',
      'conversation'
    ];
    
    const lowerContent = content.toLowerCase();
    const indicatorCount = transcriptIndicators.filter(indicator => 
      lowerContent.includes(indicator)
    ).length;
    
    return indicatorCount >= 2;
  }

  private createEpisodeFromText(content: string, filename: string): Episode {
    // Split content into segments based on common patterns
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const segments: TranscriptSegment[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 10) { // Filter out very short lines
        segments.push({
          id: `segment-${index}`,
          text: trimmedLine,
          timestamp: index * 5, // Approximate timing
        });
      }
    });

    return {
      id: this.generateId(),
      title: filename.replace(/\.[^/.]+$/, ''),
      podcastTitle: 'Imported Podcast',
      duration: segments.length * 5,
      publishDate: new Date().toISOString(),
      transcript: segments
    };
  }

  private async processZipFile(file: File): Promise<FileProcessingResult> {
    const result: FileProcessingResult = {
      episodes: [],
      errors: []
    };

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);

      console.log(`ZIP file contains ${Object.keys(contents.files).length} files`);

      for (const [filename, zipEntry] of Object.entries(contents.files)) {
        if (zipEntry.dir) continue;

        console.log(`Processing ZIP entry: ${filename}`);

        try {
          const content = await zipEntry.async('text');
          
          if (filename.endsWith('.json')) {
            const episode = this.parseJsonContent(content, filename);
            if (episode) result.episodes.push(episode);
          } else if (filename.endsWith('.plist') || filename.endsWith('.xml')) {
            const episode = this.parsePlistContent(content, filename);
            if (episode) result.episodes.push(episode);
          } else if (filename.includes('transcript') || this.looksLikeTranscript(content)) {
            const episode = this.createEpisodeFromText(content, filename);
            if (episode.transcript.length > 0) result.episodes.push(episode);
          }
        } catch (error) {
          console.error(`Error processing ZIP entry ${filename}:`, error);
          result.errors.push(`Error processing ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error reading ZIP file:', error);
      result.errors.push(`Error reading ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async processJsonFile(file: File): Promise<Episode | null> {
    const content = await file.text();
    return this.parseJsonContent(content, file.name);
  }

  private async processPlistFile(file: File): Promise<Episode | null> {
    const content = await file.text();
    return this.parsePlistContent(content, file.name);
  }

  private parseJsonContent(content: string, filename: string): Episode | null {
    try {
      const data = JSON.parse(content);
      console.log(`Parsing JSON content from ${filename}:`, Object.keys(data));
      
      // Handle Apple Podcasts specific structures
      if (data.MTEpisode || data.episode) {
        return this.extractApplePodcastEpisode(data, filename);
      }
      
      // Handle various JSON structures that might contain podcast data
      if (data.episodes && Array.isArray(data.episodes)) {
        // Multiple episodes format
        const episode = this.extractEpisodeFromData(data.episodes[0], filename);
        if (episode) return episode;
      }
      
      if (data.transcript || data.segments || data.lines) {
        // Single episode format
        return this.extractEpisodeFromData(data, filename);
      }
      
      if (Array.isArray(data)) {
        // Array of transcript segments or episodes
        if (data.length > 0) {
          if (data[0].text || data[0].content) {
            // Array of transcript segments
            return this.createEpisodeFromSegments(data, filename);
          } else if (data[0].transcript || data[0].segments) {
            // Array of episodes
            return this.extractEpisodeFromData(data[0], filename);
          }
        }
      }
      
      // Look for any property that might contain transcript data
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 0) {
          const firstItem = value[0];
          if (typeof firstItem === 'object' && (firstItem.text || firstItem.content)) {
            console.log(`Found potential transcript data in property: ${key}`);
            return this.createEpisodeFromSegments(value, filename);
          }
        }
      }
      
    } catch (error) {
      console.error('JSON parsing error:', error);
    }
    
    return null;
  }

  private extractApplePodcastEpisode(data: any, filename: string): Episode | null {
    const episodeData = data.MTEpisode || data.episode || data;
    
    // Look for transcript data in Apple Podcasts format
    const transcriptData = episodeData.transcript || 
                          episodeData.transcriptSegments || 
                          episodeData.segments ||
                          episodeData.lines;
    
    if (!transcriptData) {
      console.log('No transcript data found in Apple Podcasts format');
      return null;
    }

    const segments = this.extractSegments({ segments: transcriptData });
    if (segments.length === 0) return null;

    return {
      id: this.generateId(),
      title: episodeData.title || episodeData.name || filename,
      podcastTitle: episodeData.podcastTitle || episodeData.showTitle || episodeData.podcast || 'Unknown Podcast',
      duration: episodeData.duration || this.calculateDuration(segments),
      publishDate: episodeData.publishDate || episodeData.date || episodeData.pubDate || new Date().toISOString(),
      description: episodeData.description || episodeData.summary,
      transcript: segments
    };
  }

  private parsePlistContent(content: string, filename: string): Episode | null {
    try {
      console.log(`Parsing PLIST content from ${filename}`);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('XML parsing error:', parserError.textContent);
        return null;
      }
      
      // Look for transcript data in plist structure
      const transcriptData = this.extractTranscriptFromPlist(xmlDoc);
      if (transcriptData && transcriptData.length > 0) {
        return this.createEpisodeFromSegments(transcriptData, filename);
      }
      
      // Try to extract any text content that might be transcript data
      const allTextNodes = xmlDoc.querySelectorAll('string');
      const textSegments: TranscriptSegment[] = [];
      
      allTextNodes.forEach((node, index) => {
        const text = node.textContent?.trim();
        if (text && text.length > 20) { // Filter out short metadata strings
          textSegments.push({
            id: `segment-${index}`,
            text,
            timestamp: index * 5,
          });
        }
      });
      
      if (textSegments.length > 0) {
        return this.createEpisodeFromSegments(textSegments, filename);
      }
      
    } catch (error) {
      console.error('Plist parsing error:', error);
    }
    
    return null;
  }

  private extractTranscriptFromPlist(xmlDoc: Document): TranscriptSegment[] | null {
    const segments: TranscriptSegment[] = [];
    
    // Look for various plist structures that might contain transcript data
    const dictElements = xmlDoc.querySelectorAll('dict');
    
    dictElements.forEach((dict, dictIndex) => {
      const keys = dict.querySelectorAll('key');
      const values = dict.querySelectorAll('string, real, integer');
      
      let segmentData: any = {};
      
      for (let i = 0; i < keys.length && i < values.length; i++) {
        const key = keys[i].textContent?.toLowerCase();
        const value = values[i].textContent;
        
        if (key && value) {
          segmentData[key] = value;
        }
      }
      
      // Check if this dict contains transcript-like data
      if (segmentData.text || segmentData.content || segmentData.transcript) {
        segments.push({
          id: `segment-${dictIndex}`,
          text: segmentData.text || segmentData.content || segmentData.transcript,
          timestamp: parseFloat(segmentData.timestamp || segmentData.time || dictIndex * 5),
          speaker: segmentData.speaker || segmentData.name
        });
      }
    });
    
    // If no structured data found, try to extract any meaningful text
    if (segments.length === 0) {
      const textElements = xmlDoc.querySelectorAll('string');
      textElements.forEach((element, index) => {
        const text = element.textContent?.trim();
        if (text && text.length > 20 && this.looksLikeTranscriptText(text)) {
          segments.push({
            id: `segment-${index}`,
            text,
            timestamp: index * 5,
          });
        }
      });
    }
    
    return segments.length > 0 ? segments : null;
  }

  private looksLikeTranscriptText(text: string): boolean {
    // Check if text looks like spoken content rather than metadata
    const metadataPatterns = [
      /^https?:\/\//,  // URLs
      /^\d+$/,         // Just numbers
      /^[A-Z_]+$/,     // All caps (likely constants)
      /^\w+\.\w+$/,    // File extensions
    ];
    
    return !metadataPatterns.some(pattern => pattern.test(text)) && 
           text.split(' ').length > 3; // Has multiple words
  }

  private extractEpisodeFromData(data: any, filename: string): Episode | null {
    console.log('Extracting episode from data:', Object.keys(data));
    const segments = this.extractSegments(data);
    if (segments.length === 0) {
      console.log('No segments found in episode data');
      return null;
    }

    return {
      id: this.generateId(),
      title: data.title || data.episodeTitle || data.name || filename,
      podcastTitle: data.podcastTitle || data.showTitle || data.podcast || 'Unknown Podcast',
      duration: data.duration || this.calculateDuration(segments),
      publishDate: data.publishDate || data.date || data.pubDate || new Date().toISOString(),
      description: data.description || data.summary,
      transcript: segments
    };
  }

  private createEpisodeFromSegments(segments: any[], filename: string): Episode | null {
    const transcriptSegments = this.extractSegments({ segments });
    if (transcriptSegments.length === 0) return null;

    return {
      id: this.generateId(),
      title: filename.replace(/\.[^/.]+$/, ''),
      podcastTitle: 'Imported Podcast',
      duration: this.calculateDuration(transcriptSegments),
      publishDate: new Date().toISOString(),
      transcript: transcriptSegments
    };
  }

  private extractSegments(data: any): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    
    // Handle various segment structures
    const transcriptData = data.transcript || 
                          data.segments || 
                          data.lines || 
                          data.transcriptSegments ||
                          data.items ||
                          [];
    
    console.log(`Extracting segments from data with ${Array.isArray(transcriptData) ? transcriptData.length : 0} items`);
    
    if (Array.isArray(transcriptData)) {
      transcriptData.forEach((segment: any, index: number) => {
        let text = '';
        let timestamp = 0;
        let speaker = undefined;

        if (typeof segment === 'string') {
          text = segment;
          timestamp = index * 5; // Approximate timing
        } else if (typeof segment === 'object' && segment !== null) {
          // Handle various property names for text content
          text = segment.text || 
                 segment.content || 
                 segment.transcript || 
                 segment.body ||
                 segment.message ||
                 '';
          
          // Handle various property names for timestamp
          timestamp = parseFloat(segment.timestamp || 
                                segment.time || 
                                segment.start || 
                                segment.startTime ||
                                index * 5);
          
          // Handle speaker information
          speaker = segment.speaker || 
                   segment.name || 
                   segment.author ||
                   undefined;
        }

        if (text && text.trim()) {
          segments.push({
            id: `segment-${index}`,
            text: text.trim(),
            timestamp,
            speaker,
            confidence: segment.confidence
          });
        }
      });
    }

    console.log(`Extracted ${segments.length} segments`);
    return segments;
  }

  private calculateDuration(segments: TranscriptSegment[]): number {
    if (segments.length === 0) return 0;
    const lastSegment = segments[segments.length - 1];
    return lastSegment.timestamp + 30; // Estimate 30 seconds for last segment
  }

  private generateId(): string {
    return `episode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}