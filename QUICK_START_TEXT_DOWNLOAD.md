# Text File Download Feature - Quick Start

## 🚀 Installation Complete

The text file download feature has been implemented and is ready to use!

## 📦 What Was Added

### Core Files
1. **[src/lib/utils.ts](src/lib/utils.ts)** - `downloadTextFile()` function
2. **[src/hooks/useTextDownload.ts](src/hooks/useTextDownload.ts)** - React hook
3. **[src/components/ExportButton.tsx](src/components/ExportButton.tsx)** - Ready-to-use components

### Documentation & Examples
4. **[src/components/TextFileDownloadDemo.tsx](src/components/TextFileDownloadDemo.tsx)** - Interactive demo
5. **[src/lib/exportExamples.ts](src/lib/exportExamples.ts)** - Shogi-specific examples
6. **[TEXT_DOWNLOAD_FEATURE.md](TEXT_DOWNLOAD_FEATURE.md)** - Complete documentation

## ⚡ Quick Usage

### Option 1: Direct Function (Simplest)
```typescript
import { downloadTextFile } from '@/lib/utils';

// In any event handler
const handleExport = () => {
  const text = 'Hello World!';
  downloadTextFile(text, 'greeting.txt');
};
```

### Option 2: Using the Hook
```typescript
import { useTextDownload } from '@/hooks/useTextDownload';

function MyComponent() {
  const { download, downloadWithTimestamp } = useTextDownload();
  
  return (
    <button onClick={() => download('Data...', 'file.txt')}>
      Export
    </button>
  );
}
```

### Option 3: Pre-built Component
```typescript
import { ExportButton } from '@/components/ExportButton';

function MyComponent() {
  const gameData = { moves: [], captures: [] };
  
  return (
    <ExportButton 
      data={gameData}
      filename="game-export"
      label="Export Game"
    />
  );
}
```

## 🎯 Common Use Cases

### Export Game State
```typescript
import { quickExportGame } from '@/lib/exportExamples';

quickExportGame(moveHistory, captures);
```

### Export Move History
```typescript
import { exportMoveHistory } from '@/lib/exportExamples';

exportMoveHistory([
  { moveNumber: 1, player: 'black', notation: '7g7f', timestamp: new Date() }
]);
```

### Export Complete Report
```typescript
import { exportCompleteGameReport } from '@/lib/exportExamples';

exportCompleteGameReport({
  startTime: new Date(),
  endTime: new Date(),
  winner: 'black',
  totalMoves: 42,
  averageMoveTime: 15.5,
  moveHistory: ['7g7f', '3c3d'],
  captures: { black: ['歩'], white: [] }
});
```

## 🧪 Test It Out

View the interactive demo:
```typescript
import TextFileDownloadDemo from '@/components/TextFileDownloadDemo';

// Add to your app
<TextFileDownloadDemo />
```

## 📝 Key Features

✅ Client-side only (no server needed)  
✅ Instant download  
✅ Automatic .txt extension  
✅ Memory cleanup  
✅ TypeScript support  
✅ Zero dependencies (uses native browser APIs)

## 🔧 Integration Points

Add export buttons to:
- **ShogiBoard** - Export board state
- **AIAssistant** - Export analysis
- **PlayerPanel** - Export game stats
- **Index page** - Export complete game

## 📖 Full Documentation

See [TEXT_DOWNLOAD_FEATURE.md](TEXT_DOWNLOAD_FEATURE.md) for:
- Complete API reference
- Advanced examples
- Best practices
- Browser compatibility
- Troubleshooting

---

**Ready to use!** Start with the simplest option and upgrade as needed.
