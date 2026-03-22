import { useCallback } from 'react';
import { downloadTextFile } from '@/lib/utils';

/**
 * Custom hook for handling text file downloads
 * Provides a convenient interface for downloading dynamically generated text files
 * 
 * @example
 * const { download, downloadWithTimestamp } = useTextDownload();
 * 
 * // Simple download
 * download('Hello World!', 'greeting.txt');
 * 
 * // Download with automatic timestamp
 * downloadWithTimestamp('Game data...', 'game-export');
 */
export const useTextDownload = () => {
  /**
   * Download text content as a file
   */
  const download = useCallback((content: string, filename: string = 'download.txt') => {
    downloadTextFile(content, filename);
  }, []);

  /**
   * Download text content with automatic timestamp in filename
   */
  const downloadWithTimestamp = useCallback((content: string, baseFilename: string = 'download') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${baseFilename}_${timestamp}.txt`;
    downloadTextFile(content, filename);
  }, []);

  /**
   * Download JSON data as formatted text file
   */
  const downloadJSON = useCallback((data: unknown, filename: string = 'data.txt') => {
    const content = JSON.stringify(data, null, 2);
    downloadTextFile(content, filename);
  }, []);

  return {
    download,
    downloadWithTimestamp,
    downloadJSON,
  };
};
