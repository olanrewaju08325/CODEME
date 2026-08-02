import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import apiClient from '../apiClient'
import { motion } from 'framer-motion'
import { BookOpen, Bell, Flame, Award, Calendar, Volume2, ChevronRight, LogOut, AlertTriangle, Sun, Moon, Trophy, Star, Zap, Lock, Users, Settings, Fingerprint, CheckCircle } from 'lucide-react'

interface DashboardProps {
  session: any
  onNavigate: (view: string) => void
  onSignOut: () => void
  isDarkMode?: boolean
  onToggleDarkMode?: () => void
  setSelectedCourseId?: (id: string) => void
}

const renderAvatar = (avatarUrl: string | null, size = 44) => {
  if (!avatarUrl) return <span style={{ fontSize: `${size * 0.55}px` }}>🇳🇬👨‍💻</span>;
  if (avatarUrl.startsWith('data:image') || avatarUrl.startsWith('http')) {
    return <img src={avatarUrl} alt="Avatar" style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  const presets: Record<string, string> = {
    'Lagos Developer': '🇳🇬👨‍💻',
    'Abuja Coder': '🇳🇬👩‍💻',
    'Ibadan Hacker': '🇳🇬🚀',
    'Benin Techie': '🇳🇬💡'
  };
  return <span style={{ fontSize: `${size * 0.55}px` }}>{presets[avatarUrl] || '🇳🇬👨‍💻'}</span>;
};

export const Dashboard: React.FC<DashboardProps> = ({ session, onNavigate, onSignOut, isDarkMode, onToggleDarkMode, setSelectedCourseId }) => {
  const [profile, setProfile] = useState<any>(null)
  const [enrollment, setEnrollment] = useState<any>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [announcement, setAnnouncement] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [allCourses, setAllCourses] = useState<any[]>([])
  const [liveClasses, setLiveClasses] = useState<any[]>([])
  
  const [showBugModal, setShowBugModal] = useState(false)
  const [bugText, setBugText] = useState('')
  const [bugSuccess, setBugSuccess] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({ email: true, push: true, inApp: true })
  const [recommendations, setRecommendations] = useState<any[]>([])

  // Check WebAuthn / biometrics support
  useEffect(() => {
    if (window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setBiometricSupported(available))
        .catch(() => setBiometricSupported(false))
    }
  }, [])

  const handleReportBug = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bugText.trim()) return
    try {
      const { error } = await supabase
        .from('bug_reports')
        .insert({ student_id: session.user.id, feedback: bugText })
      if (error) throw error
      setBugSuccess(true)
      setBugText('')
      setTimeout(() => {
        setShowBugModal(false)
        setBugSuccess(false)
      }, 1500)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch profile via API
        const profileData = await apiClient.auth.getProfile()
        setProfile(profileData)

        // 2. Fetch enrollment - use existing data from profile for now
        // The enrollment is typically part of the profile or separate
        // For now, we'll keep enrollment as null since we don't have a direct API call for it in the current implementation
        setEnrollment(null)

        // 3. Fetch completed lessons count via API
        const progressData = await apiClient.courses.getProgress()
        setCompletedCount(progressData.length)

        // 4. Fetch latest announcement via API
        try {
          const latestAnn = await apiClient.announcements.getLatest()
          setAnnouncement(latestAnn)
        } catch {
          setAnnouncement(null)
        }

        // 5. Fetch live notifications via API
        const notifData = await apiClient.auth.getNotifications(10)
        setNotifications(notifData)

        // 6. Fetch earned badges via API
        const badgeData = await apiClient.courses.getUserAchievements()
        setBadges(badgeData)

        // 7. Fetch gamification stats via API
        const statsData = await apiClient.courses.getGamificationStats()
        // Use stats for streak count
        if (statsData && profileData) {
          profileData.streak_count = statsData.streak_count
          setProfile(profileData)
        }

        // 8. Fetch all courses via API
        const coursesData = await apiClient.courses.getCourses()
        setAllCourses(coursesData)

        // 9. Fetch upcoming live classes via API
        const liveClassesData = await apiClient.courses.getUpcomingClasses(5)
        setLiveClasses(liveClassesData)

        // Leaderboard - skip for now (not implemented in backend yet)
        setLeaderboard([])

        // Recommendations - skip for now (not implemented in backend yet)
        setRecommendations([])

      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [session])

  const totalLessons = 12 // 6 modules * 2 lessons
  const progressPercent = Math.round((completedCount / totalLessons) * 100)

  const markAllRead = async () => {
    try {
      await apiClient.auth.markNotificationsRead()
    } catch (e) {
      console.error(e)
    }
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 14 } }
  } as const

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <p>Loading Dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '16px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/codeme.jpg" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid var(--color-blue)' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>CodeMe Academy</h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>NIGERIA • v2.0.0</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Dark Mode Toggle */}
          <button
            className="theme-toggle-btn"
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
          
          <motion.div 
            className="notification-bell-container" 
            onClick={() => setShowNotifications(!showNotifications)}
            animate={unreadCount > 0 ? {
              rotate: [0, -12, 12, -12, 12, 0],
            } : {}}
            transition={unreadCount > 0 ? {
              repeat: Infinity,
              repeatDelay: 2.5,
              duration: 0.6
            } : {}}
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <Bell size={22} style={{ color: 'var(--text-secondary)' }} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </motion.div>
          <button 
            onClick={onSignOut} 
            style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Notifications Popover */}
      {showNotifications && (
        <div 
          style={{ 
            position: 'absolute', 
            top: '60px', 
            right: '16px', 
            width: '280px', 
            backgroundColor: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px', 
            boxShadow: 'var(--shadow-lg)', 
            zIndex: 100, 
            padding: '12px' 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Notifications</span>
            <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--color-blue)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Mark read</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textAlign: 'center', padding: '10px 0' }}>No notifications yet.</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: n.read ? 'transparent' : 'rgba(12, 74, 140, 0.05)', fontSize: '0.75rem' }}>
                  <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{n.title}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>
                      {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main content scroll container */}
      <motion.div 
        className="app-content"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Welcome card */}
        <motion.div 
          variants={itemVariants}
          className="card" 
          style={{ 
            background: 'linear-gradient(135deg, var(--color-blue) 0%, var(--color-purple) 100%)', 
            color: '#FFFFFF',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {renderAvatar(profile?.avatar_url, 48)}
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-cyan)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Student Profile</span>
              <h2 style={{ color: '#FFFFFF', fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
                {profile?.full_name || 'Student'}
              </h2>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF' }}>
                  ID: {profile?.student_id || 'Generating...'}
                </span>
                <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF' }}>
                  {enrollment?.status === 'waitlisted' ? 'Waitlisted' : `Batch ${enrollment?.batch || 1}`}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '8px 12px', borderRadius: '12px', flexShrink: 0 }}>
            <Flame size={20} style={{ color: '#F59E0B' }} />
            <span style={{ fontSize: '1rem', fontWeight: 800 }}>{profile?.streak_count || 1}</span>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.7)' }}>DAY STREAK</span>
          </div>
        </motion.div>

        {/* Announcement Box */}
        <motion.div 
          variants={itemVariants}
          style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'rgba(12, 74, 140, 0.1)', border: '1px solid rgba(12, 74, 140, 0.3)', padding: '12px', borderRadius: '12px' }}
        >
          <Volume2 size={20} style={{ color: 'var(--color-blue)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--color-blue)', fontWeight: 500 }}>
            <strong>Announcement:</strong> {announcement ? announcement.content : 'Welcome to CodeMe Academy Nigeria! Select your syllabus modules below to start learning.'}
          </p>
        </motion.div>

        {enrollment?.status === 'waitlisted' && (
          <motion.div 
            variants={itemVariants}
            style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', padding: '12px', borderRadius: '12px' }}
          >
            <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0 }} />
            <div style={{ fontSize: '0.75rem', color: '#92400E', lineHeight: 1.4 }}>
              <strong>Waitlist Active:</strong> All active class batches are currently full. You will unlock learning modules as soon as an administrator activates your slot.
            </div>
          </motion.div>
        )}

        {/* Community & Networking Section */}
        <motion.div variants={itemVariants}>
          <div 
            className="card" 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderLeft: '4px solid var(--color-purple)' }}
            onClick={() => onNavigate('forum')}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ backgroundColor: 'rgba(139, 47, 166, 0.1)', color: 'var(--color-purple)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Community Forum</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Ask questions, share code, and learn together</p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        </motion.div>

        {/* Live Classes Card */}
        <motion.div variants={itemVariants}>
          <div 
            className="card" 
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderLeft: '4px solid var(--color-cyan)' }}
            onClick={() => onNavigate('live-classes')}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ backgroundColor: 'rgba(41, 214, 232, 0.1)', color: 'var(--color-cyan)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Live Classes</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Join webinars, watch recordings, set reminders</p>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: 'var(--text-tertiary)' }} />
          </div>
        </motion.div>

        {/* Active Courses Section */}
        <motion.div variants={itemVariants}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '10px', fontFamily: 'var(--font-headings)' }}>My Enrolled Program</h3>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(12, 74, 140, 0.1)', color: 'var(--color-blue)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', flexShrink: 0, justifyContent: 'center' }}>
                <BookOpen size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>WD101: Web Development Basics (HTML)</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Standard Web Layouts, text templates, lists & Forms</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>Course Progress</span>
                <span>{progressPercent}% ({completedCount}/{totalLessons} lessons)</span>
              </div>
              <div className="progress-container">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={() => {
                if (enrollment?.status !== 'waitlisted') {
                  onNavigate('course')
                }
              }}
              disabled={enrollment?.status === 'waitlisted'}
              style={{ padding: '10px', backgroundColor: enrollment?.status === 'waitlisted' ? '#9CA3AF' : undefined }}
            >
              {enrollment?.status === 'waitlisted' ? 'Waitlist Active (Awaiting Admin)' : 'Resume Learning'} <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>

        {/* Locked / Roadmap Section */}
        <motion.div variants={itemVariants}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-headings)' }}>Syllabus Path Roadmap</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>FRONTEND PATH</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {allCourses.filter(c => c.id !== 'wd101').map(course => (
              <div 
                key={course.id} 
                onClick={() => {
                  setSelectedCourseId?.(course.id)
                  onNavigate('course')
                }}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px', borderRadius: '12px', cursor: 'pointer', hover: { transform: 'translateY(-2px)' } }}
              >
                <div style={{ color: 'var(--color-blue)' }}><BookOpen size={20} /></div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{course.title}</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{course.language} · {course.level} · {course.duration_weeks} weeks</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-cyan)' }}>
                    {course.currency || 'NGN'} {Number(course.price || 0).toLocaleString()}
                  </span>
                  <span className="badge" style={{ fontSize: '0.6rem', backgroundColor: 'rgba(41,214,232,0.1)', color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Enroll & Study
                  </span>
                </div>
              </div>
            ))}
            {allCourses.filter(c => c.id !== 'wd101').length === 0 && (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>More courses coming from instructors soon!</div>
            )}
          </div>
        </motion.div>

        {/* Live Classes Card */}
        <motion.div 
          variants={itemVariants}
          onClick={() => onNavigate('live-classes')}
          className="card" 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
        >
          <Calendar size={20} style={{ color: 'var(--color-purple)' }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-purple)', textTransform: 'uppercase' }}>Live Schedule</span>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {liveClasses.length > 0 ? liveClasses[0].title : 'Meet with Instructor (Webinar)'}
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {liveClasses.length > 0 ? new Date(liveClasses[0].scheduled_at).toLocaleString() : 'Saturday at 4:00 PM (West Africa Time)'}
            </p>
          </div>
          <button className="badge badge-purple" style={{ border: 'none', cursor: 'pointer' }}>View Details</button>
        </motion.div>

        {/* Badges Earned Section */}
        <motion.div variants={itemVariants}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '10px', fontFamily: 'var(--font-headings)' }}>My Achievements</h3>
          <div className="card" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '16px', scrollbarWidth: 'none' }}>
            {badges.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>No achievements earned yet. Complete your quizzes to unlock achievements!</p>
            ) : (
              badges.map((b, idx) => (
                <div key={idx} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '70px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-purple) 0%, var(--color-blue) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: 'var(--shadow-sm)' }}>
                    <Award size={20} />
                  </div>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, textAlign: 'center', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%' }}>{b.achievement?.name || 'Achievement'}</span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Leaderboard Section */}
        <motion.div variants={itemVariants}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '10px', fontFamily: 'var(--font-headings)' }}>Class Leaderboard</h3>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px' }}>
            {leaderboard.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Leaderboard updates loading...</p>
            ) : (
              leaderboard.map((lead, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx < leaderboard.length - 1 ? '1px solid var(--border-color)' : 'none', padding: '8px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: idx === 0 ? '#F59E0B' : idx === 1 ? '#9CA3AF' : idx === 2 ? '#B45309' : 'var(--text-secondary)' }}>
                      #{idx + 1}
                    </span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {renderAvatar(lead.avatarUrl, 32)}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>{lead.fullName}</h4>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>ID: {lead.studentId}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-blue)' }}>{lead.passedCount} / 6 Exams</span>
                    <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Streak: {lead.streak} days</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* V9: Adaptive Recommendations */}
        {recommendations.length > 0 && (
          <motion.div variants={itemVariants}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '10px', fontFamily: 'var(--font-headings)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} style={{ color: '#F59E0B' }} /> Recommended For You
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recommendations.map((course: any) => (
                <div
                  key={course.id}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderLeft: '4px solid #F59E0B', cursor: 'pointer' }}
                  onClick={() => { setSelectedCourseId?.(course.id); onNavigate('course') }}
                >
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={20} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.65rem', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested Next Step</p>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '2px' }}>{course.title}</h4>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Based on your current progress — you're ready for this!</p>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── AI Tutor Coming Soon Card ── */}
        <motion.div variants={itemVariants} className="card" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.06))', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={24} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h4 style={{ fontWeight: 800, fontSize: '0.95rem' }}>AI Code Tutor</h4>
                <span style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', letterSpacing: '0.05em' }}>COMING SOON</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                Get AI-powered hints and guidance when you're stuck on a lesson — without spoiling the answer.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <div style={{ flex: 1, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              💬 Chat-based Q&amp;A
            </div>
            <div style={{ flex: 1, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              🧠 Personalised hints
            </div>
            <div style={{ flex: 1, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              🇳🇬 Hausa/Yoruba/Igbo
            </div>
          </div>
        </motion.div>

        {/* ── Upcoming Deadlines ── */}
        <motion.div variants={itemVariants} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Calendar size={16} style={{ color: 'var(--color-cyan)' }} /> Upcoming Deadlines
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Module Quiz', course: 'HTML Fundamentals', due: 'Friday', icon: '📝', color: '#F59E0B' },
              { label: 'Assignment Submission', course: 'CSS Styling', due: 'Next Monday', icon: '📎', color: '#EF4444' },
              { label: 'Live Class Session', course: 'JavaScript Basics', due: 'Saturday 10AM', icon: '📺', color: '#8B5CF6' },
            ].map(({ label, course, due, icon, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                <span style={{ fontSize: '1.3rem' }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.82rem' }}>{label}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{course}</p>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color, background: `${color}15`, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                  {due}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom padding for mobile nav */}
        <div style={{ height: '80px' }} />
      </motion.div>

      {/* Bug Report Modal */}
      {showBugModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <form onSubmit={handleReportBug} className="card" style={{ backgroundColor: 'var(--bg-secondary)', width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Report a Problem</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Describe the issue or bug you encountered. Our support admin will review it.</p>
            {bugSuccess ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600, padding: '10px 0', textAlign: 'center' }}>Thank you! Your feedback has been sent.</div>
            ) : (
              <>
                <textarea 
                  className="input-field" 
                  value={bugText} 
                  onChange={(e) => setBugText(e.target.value)} 
                  placeholder="Type bug details here..." 
                  required 
                  style={{ minHeight: '80px', resize: 'none' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px' }}>Send</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBugModal(false)} style={{ flex: 1, padding: '8px' }}>Cancel</button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Settings Modal (V6: Biometrics + Notification Controls) */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}>
          <div className="card" style={{ backgroundColor: 'var(--bg-secondary)', width: '100%', maxWidth: '480px', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 10px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontFamily: 'var(--font-headings)', fontWeight: 800, fontSize: '1.1rem' }}>⚙️ Settings & Preferences</h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.4rem', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Biometric Login (V6) */}
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Fingerprint size={18} style={{ color: 'var(--color-cyan)' }} /> Biometric Login
                </h4>
                <div style={{ padding: '14px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', opacity: 0.6 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>Fingerprint / Face ID</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Coming in a future update</p>
                </div>
                          }
                        }}
                        style={{ width: '18px', height: '18px', accentColor: '#10B981' }}
                      />
                    </label>
                  </div>
                ) : (
                  <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Biometric authentication is not available on this device or browser.
                  </div>
                )}
              </div>

              {/* Notification Controls (V6) */}
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={18} style={{ color: 'var(--color-purple)' }} /> Notification Preferences
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { key: 'email', label: 'Email Notifications', sub: 'Course updates and announcements', icon: '📧' },
                    { key: 'push', label: 'Push Notifications', sub: 'Live class reminders and deadlines', icon: '🔔' },
                    { key: 'inApp', label: 'In-App Alerts', sub: 'Badge awards and quiz results', icon: '💬' },
                  ].map(({ key, label, sub, icon }) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.83rem' }}>{label}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '1px' }}>{sub}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={(notifPrefs as any)[key]}
                        onChange={(e) => setNotifPrefs(prev => ({ ...prev, [key]: e.target.checked }))}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-purple)', cursor: 'pointer' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => setShowSettingsModal(false)} className="btn btn-primary" style={{ marginTop: '4px' }}>
                <CheckCircle size={16} /> Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
