import React from 'react';
import { Bath, Droplet, Square, CornerDownRight, Heater, DoorOpen, Trash2, ShowerHead, ScanFace } from 'lucide-react';

// Simple toilet icon since lucide doesn't have one
const ToiletIcon = ({ style }) => (
  <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="14" rx="7" ry="5" />
    <path d="M5 14V9a7 4 0 0 1 14 0v5" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
  </svg>
);

const ROOM_ITEMS = [
  { type: 'room-square', label: 'Room', icon: Square, width: 500, height: 500 },
  { type: 'room-l', label: 'L-Shape Room', icon: CornerDownRight, width: 500, height: 500 },
];

const FIXTURE_ITEMS = [
  { type: 'bath', label: 'Bath', icon: Bath, width: 200, height: 90 },
  { type: 'shower', label: 'Shower', icon: Droplet, width: 120, height: 120 },
  { type: 'toilet', label: 'Toilet', icon: ToiletIcon, width: 65, height: 85 },
  { type: 'sink', label: 'Basin', icon: Droplet, width: 80, height: 65 },
  { type: 'cupboard', label: 'Cupboard', icon: Square, width: 80, height: 60 },
  { type: 'radiator', label: 'Radiator', icon: Heater, width: 80, height: 15 },
  { type: 'door', label: 'Door', icon: DoorOpen, width: 100, height: 15 },
  { type: 'shower-head', label: 'Shower Head', icon: ShowerHead, width: 40, height: 40 },
  { type: 'mirror', label: 'Mirror', icon: ScanFace, width: 80, height: 5 },
];

export function Sidebar({ selectedIds, onDelete, onAdd }) {
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      style={{
        width: '280px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(0,0,0,0.06)'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #ff6600 0%, #e55a00 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(255, 102, 0, 0.3)',
        }}>
          <Bath style={{ width: '22px', height: '22px', color: 'white' }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>Elements</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Click or drag to add</p>
        </div>
      </div>

      {/* Room Shapes */}
      <div>
        <h3 style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff6600' }} />
          Room Shapes
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ROOM_ITEMS.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onClick={() => onAdd(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'white',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 102, 0, 0.3)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 102, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(0,0,0,0.04)',
              }}>
                <item.icon style={{ width: '20px', height: '20px', color: '#64748b' }} />
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a2e' }}>{item.label}</span>
                <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>Drag to canvas</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixtures */}
      <div>
        <h3 style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#005bab' }} />
          Fixtures & Details
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px'
        }}>
          {FIXTURE_ITEMS.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onClick={() => onAdd(item)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 8px',
                background: 'white',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 91, 171, 0.3)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 91, 171, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(0,0,0,0.04)',
              }}>
                <item.icon style={{ width: '22px', height: '22px', color: '#64748b' }} />
              </div>
              <span style={{
                fontWeight: 500,
                fontSize: '11px',
                color: '#64748b',
                textAlign: 'center',
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Delete Button */}
      {selectedIds.length > 0 && (
        <button
          onClick={onDelete}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px',
            background: '#fef2f2',
            color: '#ef4444',
            border: '1px solid #fecaca',
            borderRadius: '14px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Trash2 style={{ width: '16px', height: '16px' }} />
          Delete {selectedIds.length > 1 ? `${selectedIds.length} Items` : 'Selected'}
        </button>
      )}

      {/* Footer Tips */}
      <div style={{
        paddingTop: '16px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#94a3b8' }}>
          <kbd style={{
            background: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            border: '1px solid rgba(0,0,0,0.1)',
            fontFamily: 'monospace',
          }}>Shift</kbd> to select multiple
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
          <kbd style={{
            background: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            border: '1px solid rgba(0,0,0,0.1)',
            fontFamily: 'monospace',
          }}>Delete</kbd> to remove selected
        </p>
      </div>
    </div>
  );
}
