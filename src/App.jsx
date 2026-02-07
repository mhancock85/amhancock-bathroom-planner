import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { CanvasEditor } from './components/CanvasEditor'
import { PropertiesPanel } from './components/PropertiesPanel'
import { Undo2, Redo2, Download, Trash2, Lock, Unlock, Upload, Sun, Moon, HelpCircle } from 'lucide-react'

function App() {
  const [items, setItems] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isRoomLocked, setIsRoomLocked] = useState(false)
  const [theme, setTheme] = useState(() => {
    // Check for saved preference or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bathroom-planner-theme')
      if (saved) return saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('bathroom-planner-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

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

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = JSON.parse(history[historyIndex + 1]);
      setItems(nextState);
      setHistoryIndex(prev => prev + 1);
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
      // Redo: Cmd+Shift+Z / Ctrl+Shift+Z or Cmd+Y / Ctrl+Y
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
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
  }, [handleUndo, handleRedo, selectedIds, pushHistory]);

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
    // Calculate approximate center of visible canvas area
    // Sidebar is ~260px, header is ~64px, so canvas starts around there
    const canvasWidth = window.innerWidth - 260 - 200; // minus sidebar and potential properties panel
    const canvasHeight = window.innerHeight - 64; // minus header
    const centerX = 260 + (canvasWidth / 2) - (item.width / 2);
    const centerY = 64 + (canvasHeight / 2) - (item.height / 2);
    
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
      x: Math.max(50, centerX - 260), // Convert to canvas coordinates (remove sidebar offset)
      y: Math.max(50, centerY - 64),  // Convert to canvas coordinates (remove header offset)
      rotation: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedIds([newItem.id]);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden font-sans">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--primary)] opacity-[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[var(--secondary)] opacity-[0.03] rounded-full blur-3xl" />
      </div>

      {/* Header - Glassmorphism */}
      <header className="glass h-16 border-b border-white/20 flex items-center px-4 sm:px-6 justify-between z-20 relative">
        {/* Left Section - Logo centred in sidebar area (260px) */}
        <div style={{ 
          width: '260px', 
          height: '64px',
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          borderRight: '1px solid var(--border-color)', // match sidebar border
          marginLeft: '-8px', // offset parent padding (px-4 = 16px). -8px gives 8px visual padding.
          marginRight: '16px',
        }}>
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="AM Hancock & Son"
            style={{ 
              height: '100%', 
              width: '100%', 
              objectFit: 'cover',
              objectPosition: 'center',
              // Dark Mode: Screen blends black BG away, white text remains
              // Light Mode: Invert turns black BG->white (transparent in multiply), white text->black. Hue-rotate fixes orange.
              mixBlendMode: theme === 'light' ? 'multiply' : 'screen',
              filter: theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none',
              transition: 'all 0.3s ease',
            }}
          />
        </div>

        {/* Center Section - Lock Room Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRoomLocked(!isRoomLocked)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isRoomLocked ? '#ff6600' : 'var(--bg-item)',
              color: isRoomLocked ? 'white' : 'var(--text-secondary)',
              border: isRoomLocked ? 'none' : '1px solid var(--border-item)',
              boxShadow: isRoomLocked ? '0 2px 8px rgba(255,102,0,0.3)' : 'var(--shadow-sm)',
            }}
          >
            {isRoomLocked ? <Lock style={{ width: '14px', height: '14px' }} /> : <Unlock style={{ width: '14px', height: '14px' }} />}
            <span>{isRoomLocked ? 'Room Locked' : 'Lock Room'}</span>
          </button>
          <span style={{ 
            fontSize: '10px', 
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}>
            {isRoomLocked ? '(fixtures still moveable)' : '(prevents room drag)'}
          </span>
        </div>


        {/* Right Section - Actions */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/60 rounded-xl transition-all duration-200 border border-transparent hover:border-black/5"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{ background: theme === 'dark' ? 'var(--border-light)' : 'transparent' }}
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </button>

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
            title="Undo (⌘Z)"
          >
            <Undo2 className="w-4.5 h-4.5" />
          </button>

          {/* Redo */}
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/60 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-black/5"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="w-4.5 h-4.5" />
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
        <Sidebar selectedIds={selectedIds} onDelete={handleDelete} onAdd={handleAddItem} theme={theme} />
        <CanvasEditor
          items={items}
          setItems={setItems}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          pushHistory={pushHistory}
          isRoomLocked={isRoomLocked}
          theme={theme}
        />
        {/* Properties Panel - shows when single item selected */}
        {selectedIds.length === 1 && (
          <PropertiesPanel
            selectedItem={items.find(item => item.id === selectedIds[0])}
            onUpdate={(updatedItem) => {
              pushHistory();
              setItems(prev => prev.map(item => 
                item.id === updatedItem.id ? updatedItem : item
              ));
            }}
            onClose={() => setSelectedIds([])}
          />
        )}
      </div>
    </div>
  )
}

export default App
