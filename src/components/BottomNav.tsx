import React from 'react'
import { Home, BookOpen, Video, Bell, User } from 'lucide-react'

interface BottomNavProps {
  currentView: string
  onNavigate: (view: string) => void
  unreadCount?: number
}

const tabs = [
  { key: 'dashboard', label: 'Home',      icon: Home },
  { key: 'course',    label: 'Courses',   icon: BookOpen },
  { key: 'live',      label: 'Live',      icon: Video },
  { key: 'notifications', label: 'Alerts', icon: Bell },
  { key: 'profile',   label: 'Profile',   icon: User },
]

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, unreadCount = 0 }) => {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(11,10,20,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const active = currentView === key
        const isNotif = key === 'notifications'
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '10px 4px 8px',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
              color: active ? '#8B5CF6' : 'rgba(255,255,255,0.4)',
            }}
          >
            {/* Active pill indicator */}
            {active && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '32px',
                  height: '3px',
                  borderRadius: '0 0 4px 4px',
                  background: 'linear-gradient(90deg, #8B5CF6, #6366F1)',
                }}
              />
            )}
            <span style={{ position: 'relative' }}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {isNotif && unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-6px',
                    background: '#EF4444',
                    color: '#fff',
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span style={{ fontSize: '0.62rem', fontWeight: active ? 700 : 400, letterSpacing: '0.02em' }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
