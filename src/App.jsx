import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { CanvasEditor } from './components/CanvasEditor'
import { Undo2, Download, Trash2, Lock, Unlock, Upload, Sparkles } from 'lucide-react'

function App() {
  const [items, setItems] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isRoomLocked, setIsRoomLocked] = useState(false)

  const pushHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.stringify(items));
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [items, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex >= 0) {
      const prevState = JSON.parse(history[historyIndex]);
      setItems(prevState);
      setHistoryIndex(prev => prev - 1);
      setSelectedIds([]);
    }
  }, [history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Undo: Cmd+Z / Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Delete: Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        // Don't delete if user is typing in an input
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          pushHistory();
          setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
          setSelectedIds([]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, selectedIds, pushHistory]);

  const handleDelete = () => {
    if (selectedIds.length > 0) {
      pushHistory();
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
    }
  };

  const handleClearAll = () => {
    if (items.length > 0 && confirm('Are you sure you want to clear the entire plan?')) {
      pushHistory();
      setItems([]);
      setSelectedIds([]);
    }
  };

  const handleAddItem = (item) => {
    pushHistory();
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
      x: 300,
      y: 300,
      rotation: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedIds([newItem.id]);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden font-sans">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--primary)] opacity-[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[var(--secondary)] opacity-[0.03] rounded-full blur-3xl" />
      </div>

      {/* Header - Glassmorphism */}
      <header className="glass h-16 border-b border-white/20 flex items-center px-4 sm:px-6 justify-between z-20 relative">
        {/* Left Section - Logo & Brand */}
        <div className="flex items-center gap-3">
          {/* Small Logo */}
          <img
            src="/logo.png"
            alt="AM Hancock & Son"
            style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
          />

          {/* Divider */}
          <div className="hidden sm:block h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

          {/* Element Count Badge - styled better */}
          {items.length > 0 && (
            <div style={{
              padding: '6px 14px',
              background: 'white',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#1a1a2e',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {items.length} {items.length === 1 ? 'element' : 'elements'}
            </div>
          )}

          {/* Lock Room Toggle - near logo */}
          <button
            onClick={() => setIsRoomLocked(!isRoomLocked)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isRoomLocked ? '#ff6600' : 'white',
              color: isRoomLocked ? 'white' : '#64748b',
              border: isRoomLocked ? 'none' : '1px solid rgba(0,0,0,0.08)',
              boxShadow: isRoomLocked ? '0 2px 8px rgba(255,102,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
            }}
            title={isRoomLocked ? "Click to unlock rooms" : "Click to lock rooms in place"}
          >
            {isRoomLocked ? <Lock style={{ width: '14px', height: '14px' }} /> : <Unlock style={{ width: '14px', height: '14px' }} />}
            <span>Lock Room</span>
          </button>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* Import Template */}
          <button
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/60 rounded-xl transition-all duration-200 border border-transparent hover:border-black/5"
            title="Import Template (Coming Soon)"
            onClick={() => alert('Import Template feature coming soon!')}
          >
            <Upload className="w-4.5 h-4.5" />
          </button>

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex < 0}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/60 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-black/5"
            title="Undo (Cmd+Z)"
          >
            <Undo2 className="w-4.5 h-4.5" />
          </button>

          {/* Clear */}
          <button
            onClick={handleClearAll}
            disabled={items.length === 0}
            className="p-2.5 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-red-100"
            title="Clear All"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>

          {/* Export Button - Primary CTA */}
          <button
            className="btn-primary flex items-center gap-2 ml-1 sm:ml-2"
            onClick={() => alert('Exporting design... (Simulated)')}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar selectedIds={selectedIds} onDelete={handleDelete} onAdd={handleAddItem} />
        <CanvasEditor
          items={items}
          setItems={setItems}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          pushHistory={pushHistory}
          isRoomLocked={isRoomLocked}
        />
      </div>
    </div>
  )
}

export default App
