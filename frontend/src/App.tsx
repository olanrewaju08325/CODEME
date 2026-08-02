import React, { useState, useEffect, lazy, Suspense } from 'react'
import { supabase } from './supabaseClient'
import apiClient from './apiClient'
import { AuthScreen } from './views/AuthScreen'
import { Onboarding } from './views/Onboarding'
import { Dashboard } from './views/Dashboard'
import { CourseView } from './views/CourseView'
import { LessonView } from './views/LessonView'
import { LandingView } from './views/LandingView'
import { BottomNav } from './components/BottomNav'
import { PWAInstallBanner } from './components/PWAInstallBanner'
import { usePWAInstall } from './hooks/usePWA'
import { Award, Loader2, Bell } from 'lucide-react'

const QuizView = lazy(() => import('./views/QuizView').then(m => ({ default: m.QuizView })))
const CertificateView = lazy(() => import('./views/CertificateView').then(m => ({ default: m.CertificateView })))
const AdminPortal = lazy(() => import('./views/AdminPortal').then(m => ({ default: m.AdminPortal })))
const ForumView = lazy(() => import('./views/ForumView').then(m => ({ default: m.ForumView })))
const LiveClassesView = lazy(() => import('./views/LiveClassesView').then(m => ({ default: m.LiveClassesView })))
const VerifyCertificateView = lazy(() => import('./views/VerifyCertificateView').then(m => ({ default: m.VerifyCertificateView })))
const TeacherDashboard = lazy(() => import('./views/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })))

function App() {
  const [session, setSession] = useState<any>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [currentView, setCurrentView] = useState<string>('landing')
  const [profile, setProfile] = useState<any>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string>('')
  const [selectedQuizId, setSelectedQuizId] = useState<string>('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('wd101')
  const [allPassed, setAllPassed] = useState(false)
  const [isAdminRoute, setIsAdminRoute] = useState(window.location.hash.startsWith('#/codeme-special'))
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('codeme_theme') === 'dark')
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [showPWABannerAfterLogin, setShowPWABannerAfterLogin] = useState(false)

  // PWA install hook
  const { showBanner: showInstallBanner, installApp, dismissBanner } = usePWAInstall()

  // Dark mode
  useEffect(() => {
    const rootEl = document.getElementById('root')
    if (rootEl) {
      if (isDarkMode) rootEl.setAttribute('data-theme', 'dark')
      else rootEl.removeAttribute('data-theme')
    }
    localStorage.setItem('codeme_theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleDarkMode = () => setIsDarkMode(prev => !prev)

  // Hash routing
  useEffect(() => {
    const handleHash = () => {
      setIsAdminRoute(window.location.hash.startsWith('#/codeme-special'))
      if (window.location.hash.startsWith('#/verify-certificate')) {
        setCurrentView('verify-cert')
      }
    }
    window.addEventListener('hashchange', handleHash)
    handleHash()
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // View-level theme class
  useEffect(() => {
    const rootEl = document.getElementById('root')
    if (rootEl) {
      if (currentView === 'auth' || currentView === 'onboarding') {
        rootEl.className = 'theme-dark'
      } else {
        rootEl.className = 'theme-light'
      }
    }
  }, [currentView])

  // Session tracking
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        if (!session.user.email_confirmed_at) {
          setCurrentView('unverified')
          setLoadingSession(false)
        } else {
          checkUserProfile(session)
        }
      } else {
        if (window.location.hash.startsWith('#/verify-certificate')) {
          setCurrentView('verify-cert')
        } else {
          setCurrentView('landing')
        }
        setLoadingSession(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        if (!session.user.email_confirmed_at) {
          setCurrentView('unverified')
          setLoadingSession(false)
        } else {
          checkUserProfile(session)
          // Show PWA banner once after first login
          const dismissed = localStorage.getItem('codeme_pwa_dismissed')
          if (!dismissed) setShowPWABannerAfterLogin(true)
        }
      } else {
        setCurrentView('landing')
        setLoadingSession(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch unread notification count
  const fetchUnreadCount = async (userId: string) => {
    try {
      const data = await apiClient.auth.getUnreadCount()
      setUnreadNotifications(data.count)
    } catch (e) { /* silent */ }
  }

  // Check certificate status
  const checkCertificateStatus = async (userId: string) => {
    try {
      const data = await apiClient.auth.getCertificateStatus('wd101')
      setAllPassed(data.can_generate)
    } catch (e) {
      console.error(e)
    }
  }

  // Profile check
  const checkUserProfile = async (activeSession: any) => {
    if (!activeSession.user.email_confirmed_at) {
      setCurrentView('unverified')
      setLoadingSession(false)
      return
    }
    try {
      // Fetch profile via API
      let updatedProfile = await apiClient.auth.getProfile()
      
      // Update streak via API
      try {
        updatedProfile = await apiClient.auth.updateStreak()
      } catch (e) {
        // Streak update might fail if already updated today, that's okay
        console.log('Streak update:', e)
      }

      setProfile(updatedProfile)
      checkCertificateStatus(activeSession.user.id)
      fetchUnreadCount(activeSession.user.id)

      if (window.location.hash.startsWith('#/codeme-special')) {
        if (updatedProfile && updatedProfile.role === 'admin') {
          setCurrentView('admin')
          setLoadingSession(false)
          return
        } else if (updatedProfile && updatedProfile.role === 'teacher') {
          setCurrentView('teacher-panel')
          setLoadingSession(false)
          return
        } else {
          alert('Access Denied: You do not have staff permissions.')
          window.location.hash = ''
          setIsAdminRoute(false)
        }
      }

      if (!updatedProfile || !updatedProfile.full_name) {
        setCurrentView('onboarding')
      } else {
        // Handle normal routing
        if (updatedProfile.role === 'teacher' && window.location.hash.startsWith('#/codeme-special')) {
          setCurrentView('teacher-panel')
        } else if (updatedProfile.role === 'admin' && window.location.hash.startsWith('#/codeme-special')) {
          setCurrentView('admin')
        } else {
          setCurrentView('dashboard')
        }
      }
    } catch (err) {
      console.error('Profile check error:', err)
      setCurrentView('onboarding')
    } finally {
      setLoadingSession(false)
    }
  }

  const handleSignOut = async () => {
    setLoadingSession(true)
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setCurrentView('landing')
    setLoadingSession(false)
  }

  const navigate = (view: string) => {
    setCurrentView(view)
    if (session) {
      checkCertificateStatus(session.user.id)
      fetchUnreadCount(session.user.id)
    }
  }

  useEffect(() => {
    if (session && isAdminRoute) checkUserProfile(session)
  }, [session, isAdminRoute])

  if (loadingSession) {
    return (
      <div className="splash-container">
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-cyan)' }} />
        <p style={{ fontFamily: 'var(--font-headings)', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.5px' }}>
          LOADING CODEME ACADEMY...
        </p>
      </div>
    )
  }

  // Bottom nav shows for logged-in student views
  const studentViews = ['dashboard', 'course', 'lesson', 'quiz', 'live-classes', 'notifications', 'profile', 'forum', 'certificate']
  const showBottomNav = session && studentViews.includes(currentView) && !isAdminRoute && profile?.role === 'student'

  return (
    <>
      <Suspense fallback={
        <div className="splash-container">
          <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-cyan)' }} />
          <p style={{ fontFamily: 'var(--font-headings)', fontWeight: 600, fontSize: '1rem' }}>LOADING...</p>
        </div>
      }>

        {/* ── Public Routes ── */}
        {currentView === 'verify-cert' && <VerifyCertificateView />}

        {isAdminRoute && !session && (
          <AuthScreen onAuthSuccess={(s) => { setSession(s); checkUserProfile(s) }} />
        )}

        {currentView === 'landing' && !isAdminRoute && (
          <LandingView onNavigateToAuth={() => setCurrentView('auth')} />
        )}

        {currentView === 'auth' && !isAdminRoute && (
          <AuthScreen onAuthSuccess={(s) => { setSession(s); checkUserProfile(s) }} />
        )}

        {/* ── Admin / Teacher Portal ── */}
        {currentView === 'admin' && (
          <AdminPortal session={session} onSignOut={handleSignOut} />
        )}

        {/* ── Email Verification Pending ── */}
        {currentView === 'unverified' && (
          <div className="full-screen-view theme-dark" style={{ background: 'radial-gradient(circle at center, #0C4A8C 0%, #07060d 100%)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <Award size={64} style={{ color: 'var(--color-cyan)' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }} className="gradient-text">Verify Your Email</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '320px', lineHeight: 1.5 }}>
              We've sent a verification link to <strong>{session?.user?.email}</strong>. Check your inbox and spam folder.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px', marginTop: '16px' }}>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>I've Verified My Email</button>
              <button className="btn btn-secondary" onClick={handleSignOut}>Sign Out / Back to Login</button>
            </div>
          </div>
        )}

        {/* ── Onboarding ── */}
        {currentView === 'onboarding' && (
          <Onboarding session={session} onComplete={() => checkUserProfile(session)} />
        )}

        {/* ── Student Views ── */}
        {currentView === 'dashboard' && (
          <Dashboard
            session={session}
            onNavigate={navigate}
            onSignOut={handleSignOut}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            setSelectedCourseId={setSelectedCourseId}
          />
        )}

        {currentView === 'course' && (
          <CourseView
            session={session}
            selectedCourseId={selectedCourseId}
            onNavigate={navigate}
            setSelectedLessonId={setSelectedLessonId}
            setSelectedQuizId={setSelectedQuizId}
            onSelectCertificate={() => setCurrentView('certificate')}
          />
        )}

        {currentView === 'lesson' && (
          <LessonView session={session} lessonId={selectedLessonId} onNavigate={navigate} />
        )}

        {currentView === 'quiz' && (
          <QuizView session={session} quizId={selectedQuizId} onNavigate={navigate} />
        )}

        {currentView === 'certificate' && (
          <CertificateView session={session} onNavigate={navigate} />
        )}

        {currentView === 'forum' && (
          <ForumView session={session} onNavigate={navigate} />
        )}

        {currentView === 'live-classes' && (
          <LiveClassesView onNavigate={navigate} />
        )}

        {/* ── Teacher Dashboard (accessed via teacher panel link) ── */}
        {currentView === 'teacher-panel' && session && (
          <TeacherDashboard session={session} onNavigate={navigate} />
        )}

        {/* ── Notifications View (simple inline feed) ── */}
        {currentView === 'notifications' && session && (
          <NotificationsView session={session} onNavigate={navigate} onRead={() => setUnreadNotifications(0)} />
        )}

        {/* ── Profile View ── */}
        {currentView === 'profile' && session && (
          <ProfileView
            session={session}
            profile={profile}
            onNavigate={navigate}
            onSignOut={handleSignOut}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            allPassed={allPassed}
          />
        )}

        {/* ── Mobile Bottom Navigation ── */}
        {showBottomNav && (
          <BottomNav
            currentView={currentView}
            onNavigate={navigate}
            unreadCount={unreadNotifications}
          />
        )}

        {/* ── PWA Install Banner ── */}
        {(showInstallBanner || showPWABannerAfterLogin) && session && (
          <PWAInstallBanner
            onInstall={() => { installApp(); setShowPWABannerAfterLogin(false) }}
            onDismiss={() => { dismissBanner(); setShowPWABannerAfterLogin(false) }}
          />
        )}
      </Suspense>
    </>
  )
}

// ─────────────────────────────────────────────
// Inline Notifications View
// ─────────────────────────────────────────────
function NotificationsView({ session, onNavigate, onRead }: { session: any; onNavigate: (v: string) => void; onRead: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await apiClient.auth.getNotifications(50)
        setNotifications(data)
        // Mark all as read
        await apiClient.auth.markNotificationsRead()
        onRead()
      } catch (e) {
        console.error('Failed to fetch notifications:', e)
      }
      setLoading(false)
    }
    fetch()
  }, [])

  return (
    <div className="full-screen-view" style={{ paddingBottom: '80px', paddingTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '0 4px' }}>
        <button onClick={() => onNavigate('dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>←</button>
        <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>Notifications</h2>
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔔</div>
          <p>No notifications yet. You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map((n: any) => (
            <div key={n.id} className="card" style={{ borderLeft: `3px solid ${n.read ? 'var(--border-color)' : 'var(--color-purple)'}`, opacity: n.read ? 0.7 : 1 }}>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{n.title}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{n.message}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Inline Profile View
// ─────────────────────────────────────────────
function ProfileView({ session, profile, onNavigate, onSignOut, isDarkMode, onToggleDarkMode, allPassed }: any) {
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null)

  const shareWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div className="full-screen-view" style={{ paddingBottom: '80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => onNavigate('dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontWeight: 800, fontSize: '1.1rem' }}>My Profile</h2>
      </div>

      {/* Profile Card */}
      <div className="gradient-card" style={{ padding: '24px', marginBottom: '16px', textAlign: 'center', borderRadius: '16px', background: 'linear-gradient(135deg, #0C4A8C, #8B2FA6)' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#8B5CF6,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '2rem', border: '3px solid rgba(139,92,246,0.4)' }}>
          {profile?.avatar_url ? '👨‍💻' : (profile?.full_name?.[0] || '?')}
        </div>
        <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{profile?.full_name}</h3>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{profile?.email || session?.user?.email}</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', padding: '6px 14px', marginTop: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-purple)' }}>🪪 {profile?.student_id}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#fff' }}>🔥 {profile?.streak_count || 0}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Day Streak</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#fff' }}>{profile?.role || 'student'}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Role</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Certificate Share */}
        {allPassed && (
          <div className="card" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
            <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10B981', marginBottom: '10px' }}>🎓 My Certificate</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => onNavigate('certificate')} style={{ fontSize: '0.8rem', padding: '8px 14px' }}>View Certificate</button>
              <button className="btn btn-secondary" onClick={() => shareWhatsApp(`I just earned my CodeMe Academy certificate! Verify it here: ${window.location.origin}#/verify-certificate`)} style={{ fontSize: '0.8rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                📲 Share via WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="card">
          <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>⚙️ Settings</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.88rem' }}>Dark Mode</span>
            <button
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{ background: isDarkMode ? 'var(--color-purple)' : 'var(--border-color)', border: 'none', borderRadius: '9999px', width: '44px', height: '24px', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
            >
              <span style={{ position: 'absolute', top: '2px', left: isDarkMode ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <span style={{ fontSize: '0.88rem' }}>Forum</span>
            <button onClick={() => onNavigate('forum')} className="badge badge-blue" style={{ cursor: 'pointer', fontSize: '0.72rem' }}>Open</button>
          </div>
        </div>

        {/* Sign Out */}
        <button onClick={onSignOut} className="btn" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', padding: '12px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default App
