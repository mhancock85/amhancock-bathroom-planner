import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer, Group, Text, Line, Ellipse, Arc, Circle } from 'react-konva';
import { MousePointer2, Move } from 'lucide-react';

const GRID_SIZE = 50;
const PIXELS_PER_MM = 0.5;

const pxToMm = (px) => Math.round(px / PIXELS_PER_MM);

export function CanvasEditor({ items, setItems, selectedIds, setSelectedIds, pushHistory, isRoomLocked }) {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectionRect, setSelectionRect] = useState(null);
  const isSelecting = useRef(false);
  const selectionStart = useRef({ x: 0, y: 0 });

  // Multi-drag state
  const dragStartPositions = useRef({});

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
    const pos = stage.getPointerPosition() || { x: 100, y: 100 };
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
      const pos = e.target.getStage().getPointerPosition();
      isSelecting.current = true;
      selectionStart.current = { x: pos.x, y: pos.y };
      setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      if (!e.evt.shiftKey) setSelectedIds([]);
    }
  };

  const handleStageMouseMove = (e) => {
    // Handle selection rectangle
    if (isSelecting.current) {
      const pos = e.target.getStage().getPointerPosition();
      const x = Math.min(pos.x, selectionStart.current.x);
      const y = Math.min(pos.y, selectionStart.current.y);
      const width = Math.abs(pos.x - selectionStart.current.x);
      const height = Math.abs(pos.y - selectionStart.current.y);
      setSelectionRect({ x, y, width, height });
      return;
    }

    // Update cursor based on what's under the mouse
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const shape = stage.getIntersection(pos);

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

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden rounded-tl-3xl"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: 'inset 0 2px 20px rgba(0, 0, 0, 0.03)',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Subtle corner decoration */}
      <div className="absolute top-4 right-4 w-20 h-20 border-t-2 border-r-2 border-[var(--primary)]/10 rounded-tr-3xl pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-20 h-20 border-b-2 border-l-2 border-[var(--secondary)]/10 rounded-bl-3xl pointer-events-none" />

      <Stage
        width={dimensions.width}
        height={dimensions.height}
        ref={stageRef}
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
            {Array.from({ length: Math.ceil(dimensions.width / GRID_SIZE) + 1 }).map((_, i) => (
              <Line
                key={`v-${i}`}
                points={[i * GRID_SIZE, 0, i * GRID_SIZE, dimensions.height]}
                stroke="rgba(0,0,0,0.04)"
                strokeWidth={1}
                listening={false}
              />
            ))}
            {Array.from({ length: Math.ceil(dimensions.height / GRID_SIZE) + 1 }).map((_, i) => (
              <Line
                key={`h-${i}`}
                points={[0, i * GRID_SIZE, dimensions.width, i * GRID_SIZE]}
                stroke="rgba(0,0,0,0.04)"
                strokeWidth={1}
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
              strokeWidth={1.5}
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
/* Optimized for LIGHT MODE with soft shadows and clean design */

const BathShape = ({ width, height }) => (
  <Group>
    {/* Clean White Ceramic with soft shadow */}
    <Rect
      width={width}
      height={height}
      fill="#ffffff"
      stroke="#e2e8f0"
      strokeWidth={2}
      cornerRadius={10}
      shadowColor="rgba(0,0,0,0.1)"
      shadowBlur={15}
      shadowOffsetY={4}
    />
    <Rect
      x={10}
      y={10}
      width={width - 20}
      height={height - 20}
      fill="#f8fafc"
      stroke="#e2e8f0"
      strokeWidth={1}
      cornerRadius={6}
    />
    <Ellipse x={width - 28} y={height / 2} radiusX={8} radiusY={8} fill="#cbd5e1" />
    <Group x={14} y={height / 2}>
      <Rect y={-8} width={10} height={4} fill="#94a3b8" cornerRadius={2} />
      <Rect y={4} width={10} height={4} fill="#94a3b8" cornerRadius={2} />
    </Group>
  </Group>
);

const ToiletShape = ({ width, height }) => (
  <Group>
    <Rect
      x={width * 0.15}
      y={0}
      width={width * 0.7}
      height={height * 0.3}
      fill="#ffffff"
      stroke="#e2e8f0"
      strokeWidth={2}
      cornerRadius={4}
      shadowColor="rgba(0,0,0,0.08)"
      shadowBlur={10}
      shadowOffsetY={2}
    />
    <Ellipse
      x={width / 2}
      y={height * 0.65}
      radiusX={width * 0.4}
      radiusY={height * 0.32}
      fill="#ffffff"
      stroke="#e2e8f0"
      strokeWidth={2}
      shadowColor="rgba(0,0,0,0.08)"
      shadowBlur={10}
      shadowOffsetY={2}
    />
    <Ellipse
      x={width / 2}
      y={height * 0.65}
      radiusX={width * 0.28}
      radiusY={height * 0.22}
      fill="#f8fafc"
      stroke="#e2e8f0"
      strokeWidth={1}
    />
  </Group>
);

const ShowerShape = ({ width, height }) => (
  <Group>
    <Rect
      width={width}
      height={height}
      fill="#ffffff"
      stroke="#e2e8f0"
      strokeWidth={2}
      cornerRadius={8}
      shadowColor="rgba(0,0,0,0.1)"
      shadowBlur={15}
      shadowOffsetY={4}
    />
    <Rect
      x={6}
      y={6}
      width={width - 12}
      height={height - 12}
      fill="#f0f9ff"
      stroke="#bae6fd"
      strokeWidth={1}
      cornerRadius={4}
    />
    <Line points={[0, 0, width, height]} stroke="#bae6fd" strokeWidth={1} opacity={0.5} />
    <Line points={[width, 0, 0, height]} stroke="#bae6fd" strokeWidth={1} opacity={0.5} />
    <Circle x={width / 2} y={height / 2} radius={10} fill="#ffffff" stroke="#cbd5e1" strokeWidth={2} />
  </Group>
);

const SinkShape = ({ width, height }) => (
  <Group>
    <Rect
      width={width}
      height={height}
      fill="#ffffff"
      stroke="#e2e8f0"
      strokeWidth={2}
      cornerRadius={8}
      shadowColor="rgba(0,0,0,0.08)"
      shadowBlur={12}
      shadowOffsetY={3}
    />
    <Ellipse
      x={width / 2}
      y={height / 2 + 5}
      radiusX={width * 0.35}
      radiusY={height * 0.28}
      fill="#f8fafc"
      stroke="#e2e8f0"
      strokeWidth={1}
    />
    <Circle x={width / 2} y={height / 2 + 5} radius={5} fill="#cbd5e1" />
    <Rect x={width / 2 - 4} y={2} width={8} height={12} fill="#94a3b8" cornerRadius={2} />
  </Group>
);

const getLShapePoints = (width, height) => {
  const cutWidth = width * 0.4;
  const cutHeight = height * 0.4;
  return [0, 0, width, 0, width, height - cutHeight, width - cutWidth, height - cutHeight, width - cutWidth, height, 0, height];
};

const DraggableItem = ({ item, isSelected, isLocked, onSelect, onDragStart, onDragMove, onDragEnd, onChange }) => {
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
    if (item.type === 'bath') return <BathShape width={item.width} height={item.height} />;
    if (item.type === 'toilet') return <ToiletShape width={item.width} height={item.height} />;
    if (item.type === 'shower') return <ShowerShape width={item.width} height={item.height} />;
    if (item.type === 'sink') return <SinkShape width={item.width} height={item.height} />;
    if (item.type === 'radiator') return (
      <Group>
        <Rect
          width={item.width}
          height={item.height}
          fill="#ffffff"
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
          fill="#ffffff"
          stroke="#8b5cf6"
          strokeWidth={2}
          cornerRadius={4}
          shadowColor="rgba(139,92,246,0.2)"
          shadowBlur={8}
          shadowOffsetY={2}
        />
        <Line
          points={[item.width * 0.5, 4, item.width * 0.5, item.height - 4]}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        <Circle x={item.width * 0.35} y={item.height / 2} radius={3} fill="#cbd5e1" />
        <Circle x={item.width * 0.65} y={item.height / 2} radius={3} fill="#cbd5e1" />
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
          stroke="#94a3b8"
          strokeWidth={1}
          dash={[4, 4]}
        />
        <Rect
          y={item.height - 5}
          width={item.width}
          height={6}
          fill="#ffffff"
          stroke="#64748b"
          strokeWidth={2}
          rotation={-45}
          cornerRadius={2}
          shadowColor="rgba(0,0,0,0.1)"
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
          fill="#bae6fd"
          stroke="#7dd3fc"
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
        stroke="#64748b"
        strokeWidth={2}
        dash={[6, 4]}
      />
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
              fill="rgba(248, 250, 252, 0.8)"
              stroke={isSelected ? '#ff6600' : '#94a3b8'}
              strokeWidth={isSelected ? 3 : 2}
              shadowColor="rgba(0,0,0,0.1)"
              shadowBlur={20}
              shadowOffsetY={4}
              cornerRadius={4}
            />
          ) : (
            // Square Room
            <Rect
              width={item.width}
              height={item.height}
              fill="rgba(248, 250, 252, 0.8)"
              stroke={isSelected ? '#ff6600' : '#94a3b8'}
              strokeWidth={isSelected ? 3 : 2}
              cornerRadius={4}
              shadowColor="rgba(0,0,0,0.1)"
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
            fill="#64748b"
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
