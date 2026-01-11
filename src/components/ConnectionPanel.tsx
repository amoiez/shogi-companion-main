import { useState } from 'react';
import { Copy, Check, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { ConnectionStatus, PlayerRole } from '@/hooks/useMultiplayer';

interface ConnectionPanelProps {
  gameId: string | null;
  role: PlayerRole;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  onHost: () => void;
  onJoin: (gameId: string) => void;
  onDisconnect: () => void;
}

const ConnectionPanel = ({
  gameId,
  role,
  connectionStatus,
  errorMessage,
  onHost,
  onJoin,
  onDisconnect,
}: ConnectionPanelProps) => {
  const [joinId, setJoinId] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    if (gameId) {
      await navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoin = () => {
    if (joinId.trim()) {
      onJoin(joinId.trim());
    }
  };

  // If connected, show minimal status
  if (connectionStatus === 'connected') {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 shadow-xl border border-green-200 md:px-4 md:gap-3 md:bg-white">
        <div className="flex items-center gap-2 text-green-600">
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">接続中</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {role === 'host' ? '先手 (ホスト)' : '後手 (ゲスト)'}
        </span>
        <button
          onClick={onDisconnect}
          className="text-xs text-red-500 hover:text-red-600 underline"
        >
          切断
        </button>
      </div>
    );
  }

  // If hosting and waiting for guest
  if (role === 'host' && connectionStatus === 'disconnected' && gameId) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 w-64 shadow-xl border border-amber-200 md:p-4 md:w-80 md:bg-white">
        <div className="text-center mb-3">
          <h3 className="font-bold text-lg">ゲームを作成しました</h3>
          <p className="text-sm text-muted-foreground">このIDを相手に伝えてください</p>
        </div>
        
        <div className="flex items-center gap-2 bg-amber-100/50 rounded-lg px-4 py-3 mb-3">
          <code className="flex-1 text-xl font-bold text-center tracking-wider">
            {gameId}
          </code>
          <button
            onClick={handleCopyId}
            className="p-2 hover:bg-amber-200/50 rounded-lg transition-colors"
            title="コピー"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">相手の接続を待っています...</span>
        </div>
        
        <button
          onClick={onDisconnect}
          className="mt-3 w-full text-sm text-red-500 hover:text-red-600"
        >
          キャンセル
        </button>
      </div>
    );
  }

  // Default: Show host/join options
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 w-64 shadow-xl border border-amber-200 md:p-4 md:w-80 md:bg-white">
      <h3 className="font-bold text-lg text-center mb-4">オンライン対戦</h3>
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {errorMessage}
        </div>
      )}
      
      <div className="space-y-4">
        {/* Host Option */}
        <div className="border border-amber-300/50 rounded-lg p-3">
          <h4 className="font-medium mb-2">新しいゲームを作成</h4>
          <p className="text-xs text-muted-foreground mb-3">
            あなたが先手（黒）になります
          </p>
          <button
            onClick={onHost}
            disabled={connectionStatus === 'connecting'}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {connectionStatus === 'connecting' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                接続中...
              </>
            ) : (
              'ゲームを作成'
            )}
          </button>
        </div>
        
        {/* Join Option */}
        <div className="border border-amber-300/50 rounded-lg p-3">
          <h4 className="font-medium mb-2">ゲームに参加</h4>
          <p className="text-xs text-muted-foreground mb-3">
            あなたが後手（白）になります
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value.toUpperCase())}
              placeholder="SHOGI-XXXX"
              className="flex-1 px-3 py-2 rounded-lg border border-amber-300/50 bg-white/50 text-center font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={connectionStatus === 'connecting'}
            />
            <button
              onClick={handleJoin}
              disabled={!joinId.trim() || connectionStatus === 'connecting'}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              参加
            </button>
          </div>
        </div>
      </div>
      
      {/* Single Player Option */}
      <div className="mt-4 pt-4 border-t border-amber-300/30 text-center">
        <p className="text-xs text-muted-foreground">
          または、接続せずに一人で練習できます
        </p>
      </div>
    </div>
  );
};

export default ConnectionPanel;
