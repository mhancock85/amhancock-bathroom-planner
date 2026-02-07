import React, { useState, useEffect } from 'react';
import { X, RotateCw } from 'lucide-react';

export function PropertiesPanel({ selectedItem, onUpdate, onClose }) {
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [rotation, setRotation] = useState('');

  // Sync local state when selected item changes
  useEffect(() => {
    if (selectedItem) {
      setWidth(Math.round(selectedItem.width).toString());
      setHeight(Math.round(selectedItem.height).toString());
      setRotation(Math.round(selectedItem.rotation || 0).toString());
    }
  }, [selectedItem?.id, selectedItem?.width, selectedItem?.height, selectedItem?.rotation]);

  if (!selectedItem) return null;

  const handleApply = () => {
    const newWidth = parseInt(width) || selectedItem.width;
    const newHeight = parseInt(height) || selectedItem.height;
    const newRotation = parseInt(rotation) || 0;
    
    onUpdate({
      ...selectedItem,
      width: Math.max(10, newWidth),
      height: Math.max(10, newHeight),
      rotation: newRotation % 360,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  const isRoom = selectedItem.type?.startsWith('room-');

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid var(--border-item)',
    background: 'var(--bg-item)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: 500,
    outline: 'none',
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  };

  return (
    <div
      style={{
        width: '200px',
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderLeft: '1px solid var(--border-light)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--text-primary)',
        }}>
          {isRoom ? 'Room Size' : 'Dimensions'}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
          }}
        >
          <X style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Item Type */}
      <div style={{
        padding: '8px 12px',
        background: isRoom ? 'rgba(255, 102, 0, 0.1)' : 'rgba(0, 91, 171, 0.1)',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: isRoom ? '#ff6600' : '#005bab',
        textAlign: 'center',
      }}>
        {selectedItem.label || selectedItem.type}
      </div>

      {/* Width */}
      <div>
        <label style={labelStyle}>Width (mm)</label>
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          onBlur={handleApply}
          onKeyDown={handleKeyDown}
          style={inputStyle}
          min="10"
          step="10"
        />
      </div>

      {/* Height */}
      <div>
        <label style={labelStyle}>
          {isRoom ? 'Depth (mm)' : 'Height (mm)'}
        </label>
        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          onBlur={handleApply}
          onKeyDown={handleKeyDown}
          style={inputStyle}
          min="10"
          step="10"
        />
      </div>

      {/* Rotation */}
      <div>
        <label style={labelStyle}>Rotation (°)</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            value={rotation}
            onChange={(e) => setRotation(e.target.value)}
            onBlur={handleApply}
            onKeyDown={handleKeyDown}
            style={{ ...inputStyle, flex: 1 }}
            min="0"
            max="360"
            step="15"
          />
          <button
            onClick={() => {
              const newRot = ((parseInt(rotation) || 0) + 90) % 360;
              setRotation(newRot.toString());
              onUpdate({ ...selectedItem, rotation: newRot });
            }}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid var(--border-item)',
              background: 'var(--bg-item)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Rotate 90°"
          >
            <RotateCw style={{ width: '16px', height: '16px', color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Quick Sizes for Rooms */}
      {isRoom && (
        <div>
          <label style={labelStyle}>Quick Sizes</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: 'Small (2m × 1.5m)', w: 200, h: 150 },
              { label: 'Medium (2.5m × 2m)', w: 250, h: 200 },
              { label: 'Large (3m × 2.5m)', w: 300, h: 250 },
            ].map((size) => (
              <button
                key={size.label}
                onClick={() => {
                  setWidth((size.w * 10).toString());
                  setHeight((size.h * 10).toString());
                  onUpdate({ ...selectedItem, width: size.w * 10, height: size.h * 10 });
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-item)',
                  background: 'var(--bg-item)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  textAlign: 'left',
                }}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <div style={{
        marginTop: 'auto',
        padding: '10px',
        background: 'var(--bg-item)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        lineHeight: 1.4,
      }}>
        💡 Press Enter or click outside to apply changes
      </div>
    </div>
  );
}
