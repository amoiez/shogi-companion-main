import { useState } from 'react';
import { Copy, Check, Wifi, Loader2, X } from 'lucide-react';
import { ConnectionStatus, PlayerRole } from '@/hooks/useMultiplayer';

interface ConnectionPanelProps {
  gameId: string | null;
  role: PlayerRole;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  onHost: () => void;
  onJoin: (gameId: string) => void;
  onDisconnect: () => void;
  onSoloMode: () => void;
}

const ConnectionPanel = ({
  gameId,
  role,
  connectionStatus,
  errorMessage,
  onHost,
  onJoin,
  onDisconnect,
  onSoloMode,
}: ConnectionPanelProps) => {
  const [joinId, setJoinId] = useState('');
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

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

  // ========== CONNECTED STATE: Show small status badge ==========
  if (connectionStatus === 'connected') {
    return (
      <div className="connection-status-badge fixed top-4 left-4 z-50 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold flex items-center gap-2">
        <Wifi className="w-4 h-4" />
        <span>接続中</span>
        <span className="text-green-100 text-xs">
          ({role === 'host' ? '先手' : '後手'})
        </span>
        <button
          onClick={onDisconnect}
          className="ml-1 hover:bg-green-600 rounded-full p-1 transition-colors"
          title="切断"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // ========== HOSTING STATE: Waiting for guest - show modal with game ID ==========
  // Only show this modal if host is still waiting (not yet connected)
  if (role === 'host' && gameId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4">
          <div className="text-center mb-4">
            <h3 className="font-bold text-xl mb-2">ゲームを作成しました</h3>
            <p className="text-muted-foreground">このIDを相手に伝えてください</p>
          </div>
          
          <div className="flex items-center gap-2 bg-amber-100 rounded-lg px-4 py-4 mb-4">
            <code className="flex-1 text-2xl font-bold text-center tracking-widest text-amber-900">
              {gameId}
            </code>
            <button
              onClick={handleCopyId}
              className="p-2 hover:bg-amber-200 rounded-lg transition-colors"
              title="コピー"
            >
              {copied ? (
                <Check className="w-6 h-6 text-green-600" />
              ) : (
                <Copy className="w-6 h-6 text-amber-700" />
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>相手の接続を待っています...</span>
          </div>
          
          <button
            onClick={onDisconnect}
            className="w-full py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  // ========== DISMISSED STATE: Show small "Connect" button ==========
  if (dismissed) {
    return (
      <div className="online-lobby-button fixed top-4 left-4 z-50">
        <button
          onClick={() => setDismissed(false)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <Wifi className="w-4 h-4" />
          <span>オンライン対戦</span>
        </button>
      </div>
    );
  }

  // ========== DEFAULT STATE: Full screen lobby modal ==========
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 relative">
        <h3 className="font-bold text-xl text-center mb-6">ゲームモードを選択</h3>
        
        {errorMessage && (
          <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {errorMessage}
          </div>
        )}
        
        <div className="space-y-4">
          {/* Host Option */}
          <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50">
            <h4 className="font-semibold mb-1">新しいゲームを作成</h4>
            <p className="text-sm text-muted-foreground mb-3">
              あなたが先手（黒）になります
            </p>
            <button
              onClick={() => {
                setDismissed(true);
                onHost();
              }}
              disabled={connectionStatus === 'connecting'}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          
          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-muted-foreground">または</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          
          {/* Join Option */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
            <h4 className="font-semibold mb-1">ゲームに参加</h4>
            <p className="text-sm text-muted-foreground mb-3">
              あなたが後手（白）になります
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                placeholder="SHOGI-XXXX"
                className="flex-1 px-4 py-3 rounded-lg border border-blue-200 bg-white text-center font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={connectionStatus === 'connecting'}
              />
              <button
                onClick={() => {
                  setDismissed(true);
                  handleJoin();
                }}
                disabled={!joinId.trim() || connectionStatus === 'connecting'}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                参加
              </button>
            </div>
          </div>
          
          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-muted-foreground">または</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          
          {/* Solo Practice Option */}
          <div className="border border-green-200 rounded-lg p-4 bg-green-50/50">
            <h4 className="font-semibold mb-1">一人で練習する</h4>
            <p className="text-sm text-muted-foreground mb-3">
              自由に駒を動かして練習できます
            </p>
            <button
              onClick={() => {
                setDismissed(true);
                onSoloMode();
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              ソロ練習を始める
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionPanel;
