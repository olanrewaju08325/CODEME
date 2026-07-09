import React from 'react'
import { Download, X } from 'lucide-react'

interface PWAInstallBannerProps {
  onInstall: () => void
  onDismiss: () => void
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onInstall, onDismiss }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px', // sits above bottom nav bar on mobile
        left: '12px',
        right: '12px',
        zIndex: 9999,
        background: 'linear-gradient(135deg, #1b1030 0%, #0c0a1e 100%)',
        border: '1px solid rgba(139,92,246,0.4)',
        borderRadius: '16px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <img src="/codeme.jpg" alt="CodeMe" style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', margin: 0 }}>Install CodeMe App</p>
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', margin: '2px 0 0', lineHeight: 1.3 }}>
          Add to home screen for faster access — no App Store needed!
        </p>
      </div>
      <button
        onClick={onInstall}
        style={{
          background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          padding: '8px 12px',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <Download size={14} /> Install
      </button>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
