import React, { useState } from 'react';
import { Bath, Droplet, Square, CornerDownRight, Heater, DoorOpen, Trash2, ShowerHead, ScanFace, ChevronDown, ChevronUp, Pipette } from 'lucide-react';

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
  { type: 'bath-taps', label: 'Bath Taps', icon: Pipette, width: 30, height: 15 },
  { type: 'shower', label: 'Shower', icon: Droplet, width: 120, height: 120 },
  { type: 'toilet', label: 'Toilet', icon: ToiletIcon, width: 65, height: 85 },
  { type: 'sink', label: 'Basin', icon: Droplet, width: 80, height: 65 },
  { type: 'cupboard', label: 'Cupboard', icon: Square, width: 80, height: 60 },
  { type: 'radiator', label: 'Radiator', icon: Heater, width: 80, height: 15 },
  { type: 'door', label: 'Door', icon: DoorOpen, width: 100, height: 15 },
  { type: 'shower-head', label: 'Shower Head', icon: ShowerHead, width: 40, height: 40 },
  { type: 'mirror', label: 'Mirror', icon: ScanFace, width: 80, height: 5 },
];

export function Sidebar({ selectedIds, onDelete, onAdd, theme }) {
  const [roomsExpanded, setRoomsExpanded] = useState(true);
  const [fixturesExpanded, setFixturesExpanded] = useState(true);

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const CollapsibleHeader = ({ title, expanded, onToggle, color, id }) => (
    <button
      id={id}
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 0',
        marginBottom: expanded ? '12px' : '0',
      }}
    >
      <span style={{
        fontSize: '10px',
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
        {title}
      </span>
      {expanded ? (
        <ChevronUp style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
      ) : (
        <ChevronDown style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
      )}
    </button>
  );

  return (
    <div
      id="sidebar"
      style={{
        width: '260px',
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border-light)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Minimal Header */}
      <p style={{
        margin: 0,
        fontSize: '12px',
        color: 'var(--text-muted)',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border-light)',
      }}>
        Click or drag to add
      </p>

      {/* Room Shapes - Collapsible */}
      <div id="room-shapes-section">
        <CollapsibleHeader
          id="room-shapes-header"
          title="Room Shapes"
          expanded={roomsExpanded}
          onToggle={() => setRoomsExpanded(!roomsExpanded)}
          color="#ff6600"
        />
        {roomsExpanded && (
          <div id="room-items" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ROOM_ITEMS.map((item, index) => (
              <div
                key={item.type}
                id={`room-item-${item.type}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={() => onAdd(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  background: 'var(--bg-item)',
                  border: '1px solid var(--border-item)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 102, 0, 0.3)';
                  e.currentTarget.style.background = 'var(--bg-item-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-item)';
                  e.currentTarget.style.background = 'var(--bg-item)';
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--bg-item-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border-item)',
                }}>
                  <item.icon style={{ width: '16px', height: '16px', color: 'var(--text-secondary)' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixtures - Collapsible */}
      <div id="fixtures-section">
        <CollapsibleHeader
          id="fixtures-header"
          title="Fixtures & Details"
          expanded={fixturesExpanded}
          onToggle={() => setFixturesExpanded(!fixturesExpanded)}
          color="#005bab"
        />
        {fixturesExpanded && (
          <div id="fixture-items" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px'
          }}>
            {FIXTURE_ITEMS.map((item) => (
              <div
                key={item.type}
                id={`fixture-item-${item.type}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={() => onAdd(item)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 6px',
                  background: 'var(--bg-item)',
                  border: '1px solid var(--border-item)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0, 91, 171, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-item)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--bg-item-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border-item)',
                }}>
                  <item.icon style={{ width: '18px', height: '18px', color: 'var(--text-secondary)' }} />
                </div>
                <span style={{
                  fontWeight: 500,
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Delete Button - Always visible */}
      <button
        id="btn-delete"
        onClick={onDelete}
        disabled={selectedIds.length === 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px',
          background: selectedIds.length > 0 ? '#fef2f2' : 'var(--bg-item)',
          color: selectedIds.length > 0 ? '#ef4444' : 'var(--text-muted)',
          border: selectedIds.length > 0 ? '1px solid #fecaca' : '1px solid var(--border-item)',
          borderRadius: '10px',
          fontWeight: 600,
          fontSize: '13px',
          cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
          opacity: selectedIds.length > 0 ? 1 : 0.5,
          transition: 'all 0.2s ease',
        }}
      >
        <Trash2 style={{ width: '16px', height: '16px' }} />
        {selectedIds.length > 0 
          ? `Delete ${selectedIds.length > 1 ? `${selectedIds.length} Items` : 'Selected'}`
          : 'Delete Selected'
        }
      </button>
    </div>
  );
}
