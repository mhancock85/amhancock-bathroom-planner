import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Transformer, Group, Text, Line, Ellipse, Arc, Circle } from 'react-konva';
import { MousePointer2, Move, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';

const GRID_SIZE = 50;
const PIXELS_PER_MM = 0.5;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const pxToMm = (px) => Math.round(px / PIXELS_PER_MM);

export function CanvasEditor({ items, setItems, selectedIds, setSelectedIds, pushHistory, isRoomLocked, theme }) {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectionRect, setSelectionRect] = useState(null);
  const isSelecting = useRef(false);
  const selectionStart = useRef({ x: 0, y: 0 });

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Multi-drag state
  const dragStartPositions = useRef({});

  // Panning state (spacebar + drag)
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Fixed light colors for fixtures (realistic - fixtures are always white)
  // Room and grid adapt to theme
  const isDark = theme === 'dark';
  const colors = {
    // Fixtures always light (like real bathroom fixtures)
    shapeFill: '#ffffff',
    shapeStroke: '#e2e8f0',
    shapeShadow: 'rgba(0,0,0,0.1)',
    innerFill: '#f8fafc',
    textColor: '#64748b',
    accentBlue: '#bae6fd',
    accentBlueBorder: '#7dd3fc',
    // Room fill adapts to theme (grey in dark mode = floor)
    roomFill: isDark ? '#3a3a5a' : '#f8fafc',
    roomStroke: isDark ? '#5a5a7a' : '#64748b',
    // Grid adapts for visibility on dark canvas
    gridColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle mouse wheel for zooming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      // Only zoom if Ctrl/Cmd is held or it's a pinch gesture
      if (!e.ctrlKey && !e.metaKey) return;
      
      e.preventDefault();
      
      const stage = stageRef.current;
      if (!stage) return;

      const oldZoom = zoom;
      const pointer = stage.getPointerPosition();
      
      // Determine zoom direction
      const direction = e.deltaY < 0 ? 1 : -1;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom + direction * ZOOM_STEP));
      
      if (newZoom === oldZoom) return;

      // Calculate new position to zoom towards pointer
      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldZoom,
        y: (pointer.y - stagePos.y) / oldZoom,
      };

      const newPos = {
        x: pointer.x - mousePointTo.x * newZoom,
        y: pointer.y - mousePointTo.y * newZoom,
      };

      setZoom(newZoom);
      setStagePos(newPos);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, stagePos]);

  // Handle scrolling/panning when zoomed in (middle mouse or Shift+drag)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isPanningLocal = false;
    let lastPos = { x: 0, y: 0 };

    const handleMouseDown = (e) => {
      // Middle mouse button (button 1) or Shift+left click to pan
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        isPanningLocal = true;
        lastPos = { x: e.clientX, y: e.clientY };
        container.style.cursor = 'grabbing';
        e.preventDefault();
      }
    };

    const handleMouseMove = (e) => {
      if (!isPanningLocal) return;
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      lastPos = { x: e.clientX, y: e.clientY };
      setStagePos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const handleMouseUp = () => {
      if (isPanningLocal) {
        isPanningLocal = false;
        container.style.cursor = '';
      }
    };

    // Also allow regular scroll on canvas to pan (when not holding Ctrl/Cmd)
    const handleScroll = (e) => {
      if (e.ctrlKey || e.metaKey) return; // Let zoom handler deal with this
      // Use scroll to pan
      setStagePos(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('wheel', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      container.removeEventListener('wheel', handleScroll);
    };
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    // Zoom towards center
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const mousePointTo = {
      x: (centerX - stagePos.x) / zoom,
      y: (centerY - stagePos.y) / zoom,
    };
    setStagePos({
      x: centerX - mousePointTo.x * newZoom,
      y: centerY - mousePointTo.y * newZoom,
    });
    setZoom(newZoom);
  }, [zoom, stagePos, dimensions]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const mousePointTo = {
      x: (centerX - stagePos.x) / zoom,
      y: (centerY - stagePos.y) / zoom,
    };
    setStagePos({
      x: centerX - mousePointTo.x * newZoom,
      y: centerY - mousePointTo.y * newZoom,
    });
    setZoom(newZoom);
  }, [zoom, stagePos, dimensions]);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setStagePos({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (items.length === 0) {
      handleResetZoom();
      return;
    }

    // Calculate bounding box of all items (accounting for rotation)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    items.forEach(item => {
      const rotation = (item.rotation || 0) * Math.PI / 180;
      const cos = Math.abs(Math.cos(rotation));
      const sin = Math.abs(Math.sin(rotation));
      
      // Calculate rotated bounding box size
      const rotatedWidth = item.width * cos + item.height * sin;
      const rotatedHeight = item.width * sin + item.height * cos;
      
      // Center of the item
      const centerX = item.x + item.width / 2;
      const centerY = item.y + item.height / 2;
      
      // Bounding box of rotated item
      const itemMinX = centerX - rotatedWidth / 2;
      const itemMinY = centerY - rotatedHeight / 2;
      const itemMaxX = centerX + rotatedWidth / 2;
      const itemMaxY = centerY + rotatedHeight / 2;
      
      minX = Math.min(minX, itemMinX);
      minY = Math.min(minY, itemMinY);
      maxX = Math.max(maxX, itemMaxX);
      maxY = Math.max(maxY, itemMaxY);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padding = 60; // Padding around content

    // Calculate zoom to fit (use smaller scale to ensure everything fits)
    const availableWidth = dimensions.width - padding * 2;
    const availableHeight = dimensions.height - padding * 2;
    
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    let newZoom = Math.min(scaleX, scaleY);
    
    // Clamp to zoom limits
    newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));

    // Calculate center of content
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    
    // Calculate position to center content in viewport
    const viewportCenterX = dimensions.width / 2;
    const viewportCenterY = dimensions.height / 2;
    
    const newPosX = viewportCenterX - contentCenterX * newZoom;
    const newPosY = viewportCenterY - contentCenterY * newZoom;

    setZoom(newZoom);
    setStagePos({ x: newPosX, y: newPosY });
  }, [items, dimensions, handleResetZoom]);

  // Cursor handling for better UX
  const setCursor = (cursor) => {
    if (containerRef.current) {
      containerRef.current.style.cursor = cursor;
    }
  };

  const handleMouseOverShape = (e) => {
    const node = e.target;
    // Check if it's a transformer anchor
    if (node.getClassName() === 'Rect' && node.getParent()?.getClassName() === 'Transformer') {
      const name = node.name();
      if (name.includes('rotater')) {
        setCursor('grab');
      } else if (name.includes('top-left') || name.includes('bottom-right')) {
        setCursor('nwse-resize');
      } else if (name.includes('top-right') || name.includes('bottom-left')) {
        setCursor('nesw-resize');
      } else if (name.includes('top-center') || name.includes('bottom-center')) {
        setCursor('ns-resize');
      } else if (name.includes('middle-left') || name.includes('middle-right')) {
        setCursor('ew-resize');
      }
    } else if (node.draggable && node.draggable()) {
      setCursor('move');
    }
  };

  const handleMouseOutShape = () => {
    setCursor('default');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    stage.setPointersPositions(e);
    const pointerPos = stage.getPointerPosition() || { x: 100, y: 100 };
    
    // Adjust for zoom and pan
    const pos = {
      x: (pointerPos.x - stagePos.x) / zoom,
      y: (pointerPos.y - stagePos.y) / zoom,
    };
    
    const itemData = e.dataTransfer.getData('application/json');
    if (itemData) {
      pushHistory();
      const item = JSON.parse(itemData);
      const newItem = {
        ...item,
        id: crypto.randomUUID(),
        x: pos.x,
        y: pos.y,
        rotation: 0,
      };
      setItems((prev) => [...prev, newItem]);
      setSelectedIds([newItem.id]);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleStageMouseDown = (e) => {
    if (e.target === e.target.getStage()) {
      const pointerPos = e.target.getStage().getPointerPosition();
      // Convert to stage coordinates
      const pos = {
        x: (pointerPos.x - stagePos.x) / zoom,
        y: (pointerPos.y - stagePos.y) / zoom,
      };
      isSelecting.current = true;
      selectionStart.current = pos;
      setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      if (!e.evt.shiftKey) setSelectedIds([]);
    }
  };

  const handleStageMouseMove = (e) => {
    // Handle selection rectangle
    if (isSelecting.current) {
      const pointerPos = e.target.getStage().getPointerPosition();
      const pos = {
        x: (pointerPos.x - stagePos.x) / zoom,
        y: (pointerPos.y - stagePos.y) / zoom,
      };
      const x = Math.min(pos.x, selectionStart.current.x);
      const y = Math.min(pos.y, selectionStart.current.y);
      const width = Math.abs(pos.x - selectionStart.current.x);
      const height = Math.abs(pos.y - selectionStart.current.y);
      setSelectionRect({ x, y, width, height });
      return;
    }

    // Update cursor based on what's under the mouse
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    const shape = stage.getIntersection(pointerPos);

    if (!shape) {
      setCursor('default');
      return;
    }

    const name = shape.name() || '';

    // Transformer anchors
    if (name.includes('_anchor')) {
      if (name.includes('rotater')) {
        setCursor('grab');
      } else if (name.includes('top-left') || name.includes('bottom-right')) {
        setCursor('nwse-resize');
      } else if (name.includes('top-right') || name.includes('bottom-left')) {
        setCursor('nesw-resize');
      } else if (name.includes('top') || name.includes('bottom')) {
        setCursor('ns-resize');
      } else if (name.includes('left') || name.includes('right')) {
        setCursor('ew-resize');
      } else {
        setCursor('move');
      }
    } else if (shape.draggable && shape.draggable()) {
      setCursor('move');
    } else {
      setCursor('default');
    }
  };

  const handleStageMouseUp = () => {
    if (isSelecting.current && selectionRect && selectionRect.width > 5 && selectionRect.height > 5) {
      const selected = items.filter(item => {
        // If room is locked, it cannot be selected via box
        if (isRoomLocked && item.type.startsWith('room')) return false;

        const r = { x: item.x, y: item.y, width: item.width, height: item.height };
        const s = selectionRect;
        return !(r.x + r.width < s.x || r.x > s.x + s.width || r.y + r.height < s.y || r.y > s.y + s.height);
      }).map(i => i.id);
      setSelectedIds(prev => [...new Set([...prev, ...selected])]);
    }
    isSelecting.current = false;
    setSelectionRect(null);
  };

  // Multi-drag Logic
  const handleItemDragStart = (e) => {
    const id = e.target.id();
    if (!selectedIds.includes(id)) {
      setSelectedIds([id]);
    }

    const positions = {};
    selectedIds.forEach(itemId => {
      const node = stageRef.current.findOne('#' + itemId);
      if (node) {
        positions[itemId] = { x: node.x(), y: node.y() };
      }
    });
    if (!positions[id]) {
      positions[id] = { x: e.target.x(), y: e.target.y() };
    }
    dragStartPositions.current = positions;
  };

  const handleItemDragMove = (e) => {
    const id = e.target.id();
    const startPos = dragStartPositions.current[id];
    if (!startPos) return;

    const dx = e.target.x() - startPos.x;
    const dy = e.target.y() - startPos.y;

    selectedIds.forEach(itemId => {
      if (itemId !== id) {
        const node = stageRef.current.findOne('#' + itemId);
        const itemStart = dragStartPositions.current[itemId];
        if (node && itemStart) {
          node.x(itemStart.x + dx);
          node.y(itemStart.y + dy);
        }
      }
    });
  };

  const handleItemDragEnd = (e) => {
    pushHistory();
    const id = e.target.id();
    const startPos = dragStartPositions.current[id];
    if (startPos) {
      const dx = e.target.x() - startPos.x;
      const dy = e.target.y() - startPos.y;

      setItems(prev => prev.map(item => {
        if (selectedIds.includes(item.id) || item.id === id) {
          return {
            ...item,
            x: dragStartPositions.current[item.id] ? dragStartPositions.current[item.id].x + dx : item.x,
            y: dragStartPositions.current[item.id] ? dragStartPositions.current[item.id].y + dy : item.y,
          };
        }
        return item;
      }));
    }
    dragStartPositions.current = {};
  };


  const sortedItems = [...items].sort((a, b) => {
    const getOrder = (t) => {
      if (t.startsWith('room')) return 0;
      if (['shower-head', 'mirror'].includes(t)) return 2;
      return 1;
    };
    return getOrder(a.type) - getOrder(b.type);
  });

  // Calculate grid for current zoom
  const scaledGridSize = GRID_SIZE;
  const gridStartX = Math.floor(-stagePos.x / zoom / scaledGridSize) * scaledGridSize;
  const gridStartY = Math.floor(-stagePos.y / zoom / scaledGridSize) * scaledGridSize;
  const gridEndX = gridStartX + Math.ceil(dimensions.width / zoom / scaledGridSize + 2) * scaledGridSize;
  const gridEndY = gridStartY + Math.ceil(dimensions.height / zoom / scaledGridSize + 2) * scaledGridSize;

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden rounded-tl-3xl"
      style={{
        background: 'var(--canvas-bg)',
        boxShadow: 'inset 0 2px 20px rgba(0, 0, 0, 0.03)',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Subtle corner decoration */}
      <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-[var(--primary)]/10 rounded-tr-3xl pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-[var(--secondary)]/10 rounded-bl-3xl pointer-events-none" />

      {/* Zoom Controls - n8n style */}
      <div 
        className="zoom-toolbar"
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 10,
        }}
      >
        <button
          className="zoom-btn"
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          title="Zoom Out"
        >
          <ZoomOut style={{ width: '16px', height: '16px' }} />
        </button>
        
        <div className="zoom-percentage">
          {Math.round(zoom * 100)}%
        </div>
        
        <button
          className="zoom-btn"
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          title="Zoom In"
        >
          <ZoomIn style={{ width: '16px', height: '16px' }} />
        </button>
        
        <div className="zoom-divider" />
        
        <button
          className="zoom-btn"
          onClick={handleFitToScreen}
          title="Fit to Screen"
        >
          <Maximize style={{ width: '16px', height: '16px' }} />
        </button>
        
        <button
          className="zoom-btn"
          onClick={handleResetZoom}
          title="Reset Zoom (100%)"
        >
          <RotateCcw style={{ width: '16px', height: '16px' }} />
        </button>
      </div>

      {/* Zoom hint */}
      <div 
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 10,
          fontSize: '12px',
          padding: '6px 12px',
          borderRadius: '8px',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(10px)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-glass)',
        }}
      >
        <span style={{ opacity: 0.7 }}>Scroll to pan • ⌘/Ctrl + Scroll to zoom</span>
      </div>

      <Stage
        width={dimensions.width}
        height={dimensions.height}
        ref={stageRef}
        scaleX={zoom}
        scaleY={zoom}
        x={stagePos.x}
        y={stagePos.y}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseOver={handleMouseOverShape}
        onMouseOut={handleMouseOutShape}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
      >
        <Layer>
          {/* Grid - Subtle and elegant */}
          <Group>
            {Array.from({ length: Math.ceil((gridEndX - gridStartX) / scaledGridSize) + 1 }).map((_, i) => (
              <Line
                key={`v-${i}`}
                points={[gridStartX + i * scaledGridSize, gridStartY, gridStartX + i * scaledGridSize, gridEndY]}
                stroke={colors.gridColor}
                strokeWidth={1 / zoom}
                listening={false}
              />
            ))}
            {Array.from({ length: Math.ceil((gridEndY - gridStartY) / scaledGridSize) + 1 }).map((_, i) => (
              <Line
                key={`h-${i}`}
                points={[gridStartX, gridStartY + i * scaledGridSize, gridEndX, gridStartY + i * scaledGridSize]}
                stroke={colors.gridColor}
                strokeWidth={1 / zoom}
                listening={false}
              />
            ))}
          </Group>

          {sortedItems.map((item) => {
            const isLocked = isRoomLocked && item.type.startsWith('room');
            return (
              <DraggableItem
                key={item.id}
                item={item}
                isSelected={selectedIds.includes(item.id)}
                isLocked={isLocked}
                colors={colors}
                onSelect={(e) => {
                  if (isLocked) return;
                  if (e.evt.shiftKey) setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
                  else setSelectedIds([item.id]);
                }}
                onDragStart={handleItemDragStart}
                onDragMove={handleItemDragMove}
                onDragEnd={handleItemDragEnd}
                onChange={(newAttrs) => {
                  pushHistory();
                  setItems(prev => prev.map(i => (i.id === item.id ? { ...i, ...newAttrs } : i)));
                }}
              />
            );
          })}

          {selectionRect && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(255, 102, 0, 0.08)"
              stroke="#ff6600"
              strokeWidth={1.5 / zoom}
              dash={[6, 4]}
              cornerRadius={4}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      {/* Empty State - Modern & Friendly */}
      {items.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-sm px-8 py-10 glass-card rounded-3xl shadow-2xl animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[var(--primary-light)] to-white flex items-center justify-center border border-[var(--primary)]/10">
              <Move className="w-7 h-7 text-[var(--primary)]" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Start Planning
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Drag elements from the sidebar or click to add them to your bathroom design
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
              <MousePointer2 className="w-3.5 h-3.5" />
              <span>Click and drag to select multiple</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Shapes & Renderers --- */
/* Theme-aware with configurable colors */

const BathShape = ({ width, height, colors }) => (
  <Group>
    {/* Clean White Ceramic with soft shadow */}
    <Rect
      width={width}
      height={height}
      fill={colors.shapeFill}
      stroke={colors.shapeStroke}
      strokeWidth={2}
      cornerRadius={10}
      shadowColor={colors.shapeShadow}
      shadowBlur={15}
      shadowOffsetY={4}
    />
    <Rect
      x={10}
      y={10}
      width={width - 20}
      height={height - 20}
      fill={colors.innerFill}
      stroke={colors.shapeStroke}
      strokeWidth={1}
      cornerRadius={6}
    />
    <Ellipse x={width - 28} y={height / 2} radiusX={8} radiusY={8} fill={colors.shapeStroke} />
    <Group x={14} y={height / 2}>
      <Rect y={-8} width={10} height={4} fill={colors.textColor} cornerRadius={2} />
      <Rect y={4} width={10} height={4} fill={colors.textColor} cornerRadius={2} />
    </Group>
  </Group>
);

const ToiletShape = ({ width, height, colors }) => (
  <Group>
    <Rect
      x={width * 0.15}
      y={0}
      width={width * 0.7}
      height={height * 0.3}
      fill={colors.shapeFill}
      stroke={colors.shapeStroke}
      strokeWidth={2}
      cornerRadius={4}
      shadowColor={colors.shapeShadow}
      shadowBlur={10}
      shadowOffsetY={2}
    />
    <Ellipse
      x={width / 2}
      y={height * 0.65}
      radiusX={width * 0.4}
      radiusY={height * 0.32}
      fill={colors.shapeFill}
      stroke={colors.shapeStroke}
      strokeWidth={2}
      shadowColor={colors.shapeShadow}
      shadowBlur={10}
      shadowOffsetY={2}
    />
    <Ellipse
      x={width / 2}
      y={height * 0.65}
      radiusX={width * 0.28}
      radiusY={height * 0.22}
      fill={colors.innerFill}
      stroke={colors.shapeStroke}
      strokeWidth={1}
    />
  </Group>
);

const ShowerShape = ({ width, height, colors }) => (
  <Group>
    <Rect
      width={width}
      height={height}
      fill={colors.shapeFill}
      stroke={colors.shapeStroke}
      strokeWidth={2}
      cornerRadius={8}
      shadowColor={colors.shapeShadow}
      shadowBlur={15}
      shadowOffsetY={4}
    />
    <Rect
      x={6}
      y={6}
      width={width - 12}
      height={height - 12}
      fill={colors.accentBlue}
      stroke={colors.accentBlueBorder}
      strokeWidth={1}
      cornerRadius={4}
    />
    <Line points={[0, 0, width, height]} stroke={colors.accentBlueBorder} strokeWidth={1} opacity={0.5} />
    <Line points={[width, 0, 0, height]} stroke={colors.accentBlueBorder} strokeWidth={1} opacity={0.5} />
    <Circle x={width / 2} y={height / 2} radius={10} fill={colors.shapeFill} stroke={colors.shapeStroke} strokeWidth={2} />
  </Group>
);

const SinkShape = ({ width, height, colors }) => (
  <Group>
    <Rect
      width={width}
      height={height}
      fill={colors.shapeFill}
      stroke={colors.shapeStroke}
      strokeWidth={2}
      cornerRadius={8}
      shadowColor={colors.shapeShadow}
      shadowBlur={12}
      shadowOffsetY={3}
    />
    <Ellipse
      x={width / 2}
      y={height / 2 + 5}
      radiusX={width * 0.35}
      radiusY={height * 0.28}
      fill={colors.innerFill}
      stroke={colors.shapeStroke}
      strokeWidth={1}
    />
    <Circle x={width / 2} y={height / 2 + 5} radius={5} fill={colors.shapeStroke} />
    <Rect x={width / 2 - 4} y={2} width={8} height={12} fill={colors.textColor} cornerRadius={2} />
  </Group>
);

const getLShapePoints = (width, height) => {
  const cutWidth = width * 0.4;
  const cutHeight = height * 0.4;
  return [0, 0, width, 0, width, height - cutHeight, width - cutWidth, height - cutHeight, width - cutWidth, height, 0, height];
};

const DraggableItem = ({ item, isSelected, isLocked, colors, onSelect, onDragStart, onDragMove, onDragEnd, onChange }) => {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && !isLocked && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected, isLocked]);

  const isRoom = item.type?.startsWith('room');
  const isLShape = item.type === 'room-l';
  const widthMm = pxToMm(item.width);
  const heightMm = pxToMm(item.height);

  const renderShape = () => {
    if (item.type === 'bath') return <BathShape width={item.width} height={item.height} colors={colors} />;
    if (item.type === 'toilet') return <ToiletShape width={item.width} height={item.height} colors={colors} />;
    if (item.type === 'shower') return <ShowerShape width={item.width} height={item.height} colors={colors} />;
    if (item.type === 'sink') return <SinkShape width={item.width} height={item.height} colors={colors} />;
    if (item.type === 'radiator') return (
      <Group>
        <Rect
          width={item.width}
          height={item.height}
          fill={colors.shapeFill}
          stroke="#f59e0b"
          strokeWidth={2}
          cornerRadius={3}
          shadowColor="rgba(245,158,11,0.2)"
          shadowBlur={8}
          shadowOffsetY={2}
        />
        <Text
          text="RADIATOR"
          x={0}
          y={-14}
          width={item.width}
          align="center"
          fontSize={9}
          fontStyle="bold"
          fill="#f59e0b"
        />
      </Group>
    );
    if (item.type === 'cupboard') return (
      <Group>
        <Rect
          width={item.width}
          height={item.height}
          fill={colors.shapeFill}
          stroke="#8b5cf6"
          strokeWidth={2}
          cornerRadius={4}
          shadowColor="rgba(139,92,246,0.2)"
          shadowBlur={8}
          shadowOffsetY={2}
        />
        <Line
          points={[item.width * 0.5, 4, item.width * 0.5, item.height - 4]}
          stroke={colors.shapeStroke}
          strokeWidth={1}
        />
        <Circle x={item.width * 0.35} y={item.height / 2} radius={3} fill={colors.shapeStroke} />
        <Circle x={item.width * 0.65} y={item.height / 2} radius={3} fill={colors.shapeStroke} />
        <Text
          text="CUPBOARD"
          x={0}
          y={-14}
          width={item.width}
          align="center"
          fontSize={9}
          fontStyle="bold"
          fill="#8b5cf6"
        />
      </Group>
    );
    if (item.type === 'door') return (
      <Group>
        <Arc
          x={0}
          y={item.height}
          innerRadius={0}
          outerRadius={item.width}
          angle={90}
          rotation={-90}
          fill="rgba(255,102,0,0.05)"
          stroke={colors.textColor}
          strokeWidth={1}
          dash={[4, 4]}
        />
        <Rect
          y={item.height - 5}
          width={item.width}
          height={6}
          fill={colors.shapeFill}
          stroke={colors.textColor}
          strokeWidth={2}
          rotation={-45}
          cornerRadius={2}
          shadowColor={colors.shapeShadow}
          shadowBlur={5}
          shadowOffsetY={2}
        />
      </Group>
    );
    if (item.type === 'mirror') return (
      <Group>
        <Rect
          width={item.width}
          height={item.height}
          fill={colors.accentBlue}
          stroke={colors.accentBlueBorder}
          strokeWidth={2}
          cornerRadius={2}
          shadowColor="rgba(14,165,233,0.3)"
          shadowBlur={15}
          shadowOffsetY={2}
        />
        <Text
          text="MIRROR"
          x={0}
          y={-14}
          width={item.width}
          align="center"
          fontSize={9}
          fontStyle="bold"
          fill="#0ea5e9"
        />
      </Group>
    );
    if (item.type === 'shower-head') return (
      <Circle
        x={item.width / 2}
        y={item.height / 2}
        radius={item.width / 2}
        fill="transparent"
        stroke={colors.textColor}
        strokeWidth={2}
        dash={[6, 4]}
      />
    );
    if (item.type === 'bath-taps') return (
      <Group>
        {/* Mounting bar */}
        <Rect
          width={item.width}
          height={item.height}
          fill={colors.shapeFill}
          stroke="#94a3b8"
          strokeWidth={2}
          cornerRadius={3}
          shadowColor={colors.shapeShadow}
          shadowBlur={4}
          shadowOffsetY={1}
        />
        {/* Hot tap (left) */}
        <Circle
          x={item.width * 0.25}
          y={item.height / 2}
          radius={4}
          fill="#ef4444"
          stroke="#dc2626"
          strokeWidth={1}
        />
        {/* Cold tap (right) */}
        <Circle
          x={item.width * 0.75}
          y={item.height / 2}
          radius={4}
          fill="#3b82f6"
          stroke="#2563eb"
          strokeWidth={1}
        />
        {/* Label */}
        <Text
          text="TAPS"
          x={0}
          y={-12}
          width={item.width}
          align="center"
          fontSize={8}
          fontStyle="bold"
          fill={colors.textColor}
        />
      </Group>
    );
    return null;
  }

  return (
    <React.Fragment>
      <Group
        id={item.id}
        draggable={!isLocked}
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        rotation={item.rotation || 0}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(15, Math.round(item.width * scaleX)),
            height: Math.max(3, Math.round(item.height * scaleY)),
            rotation: node.rotation(),
          });
        }}
        listening={!isLocked}
      >
        {isRoom ? (
          isLShape ? (
            // L-Shape Room: Clean outline with subtle fill
            <Line
              points={getLShapePoints(item.width, item.height)}
              closed
              fill={colors.roomFill}
              stroke={isSelected ? '#ff6600' : colors.roomStroke}
              strokeWidth={isSelected ? 3 : 2}
              shadowColor={colors.shapeShadow}
              shadowBlur={20}
              shadowOffsetY={4}
              cornerRadius={4}
            />
          ) : (
            // Square Room
            <Rect
              width={item.width}
              height={item.height}
              fill={colors.roomFill}
              stroke={isSelected ? '#ff6600' : colors.roomStroke}
              strokeWidth={isSelected ? 3 : 2}
              cornerRadius={4}
              shadowColor={colors.shapeShadow}
              shadowBlur={20}
              shadowOffsetY={4}
            />
          )
        ) : (
          renderShape()
        )}

        {/* Dimensions - Clean and readable */}
        {!isLocked && (
          <Text
            text={`${widthMm} × ${heightMm} mm`}
            y={item.height + 10}
            width={item.width}
            align="center"
            fontSize={11}
            fontFamily="Plus Jakarta Sans, system-ui, sans-serif"
            fill={colors.textColor}
          />
        )}

        {/* Rotation indicator below dimensions when rotated */}
        {isSelected && !isLocked && item.rotation !== 0 && (
          <Text
            text={`↻ ${Math.round(item.rotation || 0)}°`}
            y={item.height + 24}
            width={item.width}
            align="center"
            fontSize={10}
            fontStyle="bold"
            fill="#ff6600"
          />
        )}
      </Group>

      {isSelected && !isLocked && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Allow thin items like mirror (min 5px height) but keep reasonable width
            if (newBox.width < 15 || newBox.height < 3) return oldBox;
            return newBox;
          }}
          anchorFill="#ff6600"
          anchorStroke="#ffffff"
          anchorSize={14}
          anchorCornerRadius={4}
          anchorStrokeWidth={2}
          borderStroke="#ff6600"
          borderStrokeWidth={2}
          borderDash={[6, 4]}
          rotateEnabled={true}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          rotationSnapTolerance={5}
          rotateAnchorOffset={30}
          rotateAnchorCursor="grab"
          enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-right', 'bottom-right', 'bottom-center', 'bottom-left', 'middle-left']}
        />
      )}
    </React.Fragment>
  );
};
