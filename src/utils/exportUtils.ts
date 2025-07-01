import { Episode } from '../types/transcript';

export class ExportUtils {
  static exportAsText(episode: Episode, includeTimestamps: boolean = true): string {
    let content = `${episode.title}\n`;
    content += `Podcast: ${episode.podcastTitle}\n`;
    content += `Published: ${new Date(episode.publishDate).toLocaleDateString()}\n`;
    content += `Duration: ${this.formatDuration(episode.duration)}\n\n`;
    
    if (episode.description) {
      content += `Description:\n${episode.description}\n\n`;
    }
    
    content += 'TRANSCRIPT\n' + '='.repeat(50) + '\n\n';
    
    episode.transcript.forEach(segment => {
      if (includeTimestamps) {
        content += `[${this.formatTime(segment.timestamp)}] `;
      }
      
      if (segment.speaker) {
        content += `${segment.speaker}: `;
      }
      
      content += `${segment.text}\n\n`;
    });
    
    return content;
  }

  static exportAsMarkdown(episode: Episode, includeTimestamps: boolean = true): string {
    let content = `# ${episode.title}\n\n`;
    content += `**Podcast:** ${episode.podcastTitle}  \n`;
    content += `**Published:** ${new Date(episode.publishDate).toLocaleDateString()}  \n`;
    content += `**Duration:** ${this.formatDuration(episode.duration)}  \n\n`;
    
    if (episode.description) {
      content += `## Description\n\n${episode.description}\n\n`;
    }
    
    content += '## Transcript\n\n';
    
    episode.transcript.forEach((segment, index) => {
      if (includeTimestamps) {
        content += `**[${this.formatTime(segment.timestamp)}]** `;
      }
      
      if (segment.speaker) {
        content += `**${segment.speaker}:** `;
      }
      
      content += `${segment.text}\n\n`;
    });
    
    return content;
  }

  static downloadFile(content: string, filename: string, type: 'text' | 'markdown' = 'text'): void {
    const mimeType = type === 'markdown' ? 'text/markdown' : 'text/plain';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  static copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      return new Promise((resolve, reject) => {
        if (document.execCommand('copy')) {
          textArea.remove();
          resolve();
        } else {
          textArea.remove();
          reject(new Error('Unable to copy to clipboard'));
        }
      });
    }
  }

  private static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  }
}