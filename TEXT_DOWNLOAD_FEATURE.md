# Text File Download Feature

A simple, lightweight implementation for generating and downloading text files client-side without server storage.

## Features

- ✅ Pure client-side implementation (no server required)
- ✅ Files created in memory and downloaded instantly
- ✅ Automatic .txt extension handling
- ✅ Memory cleanup (URL revocation)
- ✅ TypeScript support
- ✅ Simple API with multiple usage patterns

## Implementation Files

1. **Core Utility** - `src/lib/utils.ts`
   - `downloadTextFile()` function

2. **Custom Hook** - `src/hooks/useTextDownload.ts`
   - Convenient React hook for downloads

3. **Demo Component** - `src/components/TextFileDownloadDemo.tsx`
   - Interactive examples and usage patterns

## Usage

### Method 1: Direct Function Call

```typescript
import { downloadTextFile } from '@/lib/utils';

// Simple usage
downloadTextFile('Hello World!', 'greeting.txt');

// With dynamic content
const gameData = {
  date: new Date().toISOString(),
  winner: 'Player 1',
  moves: 42
};

const content = `Game Report
Date: ${gameData.date}
Winner: ${gameData.winner}
Total Moves: ${gameData.moves}`;

downloadTextFile(content, 'game-report.txt');
```

### Method 2: Using the Custom Hook

```typescript
import { useTextDownload } from '@/hooks/useTextDownload';

function MyComponent() {
  const { download, downloadWithTimestamp, downloadJSON } = useTextDownload();

  const handleExport = () => {
    const data = generateGameData();
    download(data, 'export.txt');
  };

  const handleExportWithTime = () => {
    const data = generateGameData();
    // Filename: game-export_2026-01-29T10-30-45.txt
    downloadWithTimestamp(data, 'game-export');
  };

  const handleExportJSON = () => {
    const gameState = { moves: [], players: [] };
    downloadJSON(gameState, 'game-state.txt');
  };

  return (
    <div>
      <button onClick={handleExport}>Download</button>
      <button onClick={handleExportWithTime}>Download with Timestamp</button>
      <button onClick={handleExportJSON}>Download JSON</button>
    </div>
  );
}
```

### Method 3: Event-Triggered Downloads

```typescript
// On form submission
const handleSubmit = (event: React.FormEvent) => {
  event.preventDefault();
  const formData = collectFormData();
  downloadTextFile(formData, 'form-data.txt');
};

// On game end
const handleGameEnd = () => {
  const gameLog = generateGameLog();
  downloadTextFile(gameLog, `game-${gameId}.txt`);
};

// On timer/interval
useEffect(() => {
  const interval = setInterval(() => {
    const autoSave = generateAutoSave();
    downloadTextFile(autoSave, 'autosave.txt');
  }, 300000); // Every 5 minutes

  return () => clearInterval(interval);
}, []);
```

## API Reference

### `downloadTextFile(content, filename?)`

Downloads a text string as a .txt file.

**Parameters:**
- `content` (string) - The text content to download
- `filename` (string, optional) - The filename (default: 'download.txt')
  - `.txt` extension is automatically added if missing

**Returns:** void

**Example:**
```typescript
downloadTextFile('My content', 'myfile'); // Downloads as 'myfile.txt'
downloadTextFile('My content', 'myfile.txt'); // Downloads as 'myfile.txt'
```

### `useTextDownload()` Hook

Returns an object with download utilities.

**Returns:**
```typescript
{
  download: (content: string, filename?: string) => void;
  downloadWithTimestamp: (content: string, baseFilename?: string) => void;
  downloadJSON: (data: any, filename?: string) => void;
}
```

## Demo Component

To see the feature in action, import and use the demo component:

```typescript
import TextFileDownloadDemo from '@/components/TextFileDownloadDemo';

function App() {
  return <TextFileDownloadDemo />;
}
```

The demo includes:
1. Predefined sample text download
2. Custom user input download
3. Dynamic game statistics download
4. Code examples

## Technical Details

### How It Works

1. **Blob Creation**: Text content is wrapped in a Blob object with MIME type `text/plain;charset=utf-8`
2. **URL Generation**: `URL.createObjectURL()` creates a temporary URL pointing to the blob
3. **Download Trigger**: A hidden anchor (`<a>`) element is created and programmatically clicked
4. **Cleanup**: The temporary URL is revoked and the anchor element is removed

### Browser Compatibility

✅ Modern browsers (Chrome, Firefox, Safari, Edge)
✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Memory Management

The implementation automatically:
- Cleans up temporary URLs with `URL.revokeObjectURL()`
- Removes temporary DOM elements
- No memory leaks from repeated downloads

## Common Use Cases

### 1. Game State Export
```typescript
const exportGameState = () => {
  const state = {
    board: gameBoard,
    moves: moveHistory,
    captures: capturedPieces
  };
  const content = JSON.stringify(state, null, 2);
  downloadTextFile(content, 'game-state.txt');
};
```

### 2. Move History Log
```typescript
const exportMoveHistory = () => {
  const log = moves.map((move, i) => 
    `${i + 1}. ${move.notation} (${move.timestamp})`
  ).join('\n');
  downloadTextFile(log, 'move-history.txt');
};
```

### 3. Error Reporting
```typescript
const downloadErrorReport = (error: Error) => {
  const report = `
Error Report
Time: ${new Date().toISOString()}
Message: ${error.message}
Stack: ${error.stack}
User Agent: ${navigator.userAgent}
  `.trim();
  downloadTextFile(report, 'error-report.txt');
};
```

### 4. Configuration Export
```typescript
const exportSettings = (settings: Settings) => {
  const config = Object.entries(settings)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  downloadTextFile(config, 'settings.txt');
};
```

## Best Practices

1. **Filename Sanitization**: Avoid special characters in filenames
2. **Content Size**: For very large files (>10MB), consider chunking or compression
3. **User Feedback**: Show a toast/notification after successful download
4. **Error Handling**: Wrap in try-catch for production use
5. **Accessibility**: Ensure download buttons are keyboard accessible

## Example: Complete Implementation

```typescript
import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadTextFile } from '@/lib/utils';

function GameExporter() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Generate content
      const content = await generateGameReport();
      
      // Download file
      const filename = `shogi-game-${Date.now()}.txt`;
      downloadTextFile(content, filename);
      
      // Show success message
      alert('Game exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      <Download className="w-4 h-4" />
      {isExporting ? 'Exporting...' : 'Export Game'}
    </button>
  );
}

async function generateGameReport(): Promise<string> {
  // Your game data generation logic
  return `Game Report
Generated: ${new Date().toLocaleString()}
...`;
}
```

## License

Part of the Shogi Companion project.
