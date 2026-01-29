import { Download } from 'lucide-react';
import { useTextDownload } from '@/hooks/useTextDownload';

/**
 * Simple Export Button Component
 * Drop-in component for exporting game data
 * 
 * @example
 * <ExportButton
 *   data={gameData}
 *   filename="my-game"
 *   label="Export Game"
 * />
 */
interface ExportButtonProps {
  data: string | object;
  filename?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function ExportButton({
  data,
  filename = 'export',
  label = 'Export',
  className = '',
  disabled = false
}: ExportButtonProps) {
  const { download, downloadJSON } = useTextDownload();

  const handleExport = () => {
    if (typeof data === 'string') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      download(data, `${filename}_${timestamp}.txt`);
    } else {
      downloadJSON(data, `${filename}_${Date.now()}.txt`);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 
        px-4 py-2 
        bg-amber-600 hover:bg-amber-700 
        text-white font-medium 
        rounded-lg 
        transition-colors 
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <Download className="w-4 h-4" />
      {label}
    </button>
  );
}

/**
 * Export Icon Button (compact version)
 */
interface ExportIconButtonProps {
  data: string | object;
  filename?: string;
  title?: string;
}

export function ExportIconButton({
  data,
  filename = 'export',
  title = 'Export'
}: ExportIconButtonProps) {
  const { download, downloadJSON } = useTextDownload();

  const handleExport = () => {
    if (typeof data === 'string') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      download(data, `${filename}_${timestamp}.txt`);
    } else {
      downloadJSON(data, `${filename}_${Date.now()}.txt`);
    }
  };

  return (
    <button
      onClick={handleExport}
      title={title}
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Download className="w-5 h-5 text-gray-700" />
    </button>
  );
}

/**
 * Example usage in a Shogi game component
 */
export function GameExportExample() {
  const gameData = {
    moves: ['7g7f', '3c3d', '2g2f'],
    captures: { black: ['歩'], white: [] },
    date: new Date().toISOString()
  };

  const gameText = `Shogi Game
Date: ${new Date().toLocaleString()}
Moves: ${gameData.moves.join(', ')}
`;

  return (
    <div className="flex gap-2">
      {/* String export */}
      <ExportButton 
        data={gameText}
        filename="shogi-game"
        label="Export as Text"
      />
      
      {/* JSON export */}
      <ExportButton 
        data={gameData}
        filename="shogi-game-data"
        label="Export as JSON"
      />
      
      {/* Icon button */}
      <ExportIconButton
        data={gameData}
        filename="quick-export"
      />
    </div>
  );
}
