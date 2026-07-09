import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import {
  BookOpen, Users, Award, Bell, CheckSquare, PenTool, Loader2,
  Video, Send, BarChart2, GraduationCap, Plus, Eye, Clock, Upload, Trash2
} from 'lucide-react'
import { ContentManager } from './ContentManager'

interface TeacherDashboardProps {
  session: any
  onNavigate: (view: string) => void
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ session, onNavigate }) => {
  const [profile, setProfile] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'gradebook' | 'content' | 'announcements' | 'recordings' | 'roster'>('overview')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Gradebook state
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [gradeVal, setGradeVal] = useState('')
  const [feedbackVal, setFeedbackVal] = useState('')
  const [gradeLoading, setGradeLoading] = useState(false)

  // Announcement state
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [annLoading, setAnnLoading] = useState(false)

  // Live class link state
  const [liveLink, setLiveLink] = useState('')
  const [liveLinkTitle, setLiveLinkTitle] = useState('')
  const [liveLoading, setLiveLoading] = useState(false)

  // Recordings state
  const [recordings, setRecordings] = useState<any[]>([])
  const [newRecTitle, setNewRecTitle] = useState('')
  const [newRecUrl, setNewRecUrl] = useState('')
  const [newRecDuration, setNewRecDuration] = useState('')
  const [recLoading, setRecLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [session])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setProfile(profileData)

      // Fetch all courses (teacher manages all assigned courses)
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*, modules(count)')
        .eq('is_active', true)
      setCourses(coursesData || [])

      // Fetch enrolled students
      const { data: enrollData } = await supabase
        .from('student_enrollments')
        .select('*, profiles(id, full_name, student_id, email, avatar_url, streak_count)')
        .eq('status', 'enrolled')
      setStudents(enrollData || [])

      // Fetch pending assignment submissions (ungraded)
      const { data: subData } = await supabase
        .from('assignment_submissions')
        .select('*, profiles!assignment_submissions_student_id_fkey(full_name, student_id), assignments(title, module_id)')
        .is('grade', null)
        .order('submitted_at', { ascending: false })
      setPendingSubmissions(subData || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubmission || !gradeVal) return
    setGradeLoading(true)
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({ grade: gradeVal, feedback: feedbackVal })
        .eq('id', selectedSubmission.id)
      if (error) throw error

      // Send notification to student
      await supabase.from('notifications').insert({
        user_id: selectedSubmission.student_id,
        title: 'Assignment Graded!',
        message: `Your submission for "${selectedSubmission.assignments?.title}" has been graded: ${gradeVal}`,
        type: 'grade',
      })

      setMessage({ type: 'success', text: `Grade ${gradeVal} submitted successfully!` })
      setSelectedSubmission(null)
      setGradeVal('')
      setFeedbackVal('')
      fetchData()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setGradeLoading(false)
    }
  }

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!announcementText.trim() || !announcementTitle.trim()) return
    setAnnLoading(true)
    try {
      const { error } = await supabase.from('announcements').insert({
        title: announcementTitle,
        body: announcementText,
        created_by: session.user.id,
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'Announcement sent to all students!' })
      setAnnouncementTitle('')
      setAnnouncementText('')
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setAnnLoading(false)
    }
  }

  const handleSaveLiveLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!liveLink.trim()) return
    setLiveLoading(true)
    try {
      const { error } = await supabase.from('announcements').insert({
        title: liveLinkTitle || '📅 Live Class Today!',
        body: `Join our live session here: ${liveLink}`,
        created_by: session.user.id,
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'Live class link posted to students!' })
      setLiveLink('')
      setLiveLinkTitle('')
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setLiveLoading(false)
    }
  }

  const handleUploadRecording = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRecTitle.trim() || !newRecUrl.trim()) return
    setRecLoading(true)
    try {
      const { error } = await supabase.from('recording_library').insert({
        title: newRecTitle,
        recording_url: newRecUrl,
        duration_mins: newRecDuration ? parseInt(newRecDuration) : null,
        uploaded_by: session.user.id,
        course_id: 'wd101' // default for now
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'Recording added to library!' })
      setNewRecTitle('')
      setNewRecUrl('')
      setNewRecDuration('')
      // refresh recordings
      const { data } = await supabase.from('recording_library').select('*').order('created_at', { ascending: false })
      setRecordings(data || [])
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setRecLoading(false)
    }
  }

  const handleDeleteRecording = async (id: string) => {
    if (!confirm('Delete this recording?')) return
    try {
      await supabase.from('recording_library').delete().eq('id', id)
      setRecordings(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-purple)' }} />
    </div>
  )

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart2 },
    { key: 'gradebook', label: 'Gradebook', icon: CheckSquare },
    { key: 'content', label: 'Content', icon: BookOpen },
    { key: 'announcements', label: 'Announce', icon: Bell },
    { key: 'recordings', label: 'Recordings', icon: Video },
    { key: 'roster', label: 'Roster', icon: Users },
  ]

  return (
    <div className="full-screen-view" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="gradient-card" style={{ padding: '20px', marginBottom: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, #1b1030, #0c0a1e)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Teacher Panel</h2>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
              {profile?.full_name} · {profile?.student_id || 'Instructor'}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px' }}>
          {[
            { label: 'Courses', value: courses.length, icon: BookOpen },
            { label: 'Students', value: students.length, icon: Users },
            { label: 'To Grade', value: pendingSubmissions.length, icon: PenTool },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card" style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.06)' }}>
              <Icon size={18} style={{ color: 'var(--color-purple)', marginBottom: '4px' }} />
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{value}</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications / message */}
      {message && (
        <div style={{ padding: '12px', borderRadius: '10px', marginBottom: '12px', backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2', color: message.type === 'success' ? '#065F46' : '#991B1B', border: message.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FCA5A5' }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '16px' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`badge ${activeTab === key ? 'badge-purple' : ''}`}
            style={{ cursor: 'pointer', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <Icon size={13} /> {label}
            {key === 'gradebook' && pendingSubmissions.length > 0 && (
              <span style={{ background: '#EF4444', color: '#fff', borderRadius: '9999px', padding: '0 5px', fontSize: '0.65rem', fontWeight: 700 }}>
                {pendingSubmissions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Ungraded Submissions</h3>
          {pendingSubmissions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CheckSquare size={28} style={{ marginBottom: '8px', opacity: 0.4 }} />
              <p>All caught up! No pending submissions.</p>
            </div>
          ) : (
            pendingSubmissions.slice(0, 5).map(sub => (
              <div key={sub.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sub.profiles?.full_name}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{sub.assignments?.title}</p>
                </div>
                <button
                  onClick={() => { setSelectedSubmission(sub); setActiveTab('gradebook') }}
                  className="btn"
                  style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'var(--color-purple)', color: '#fff' }}
                >
                  Grade
                </button>
              </div>
            ))
          )}

          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '8px' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Post Announcement', icon: Bell, action: () => setActiveTab('announcements') },
              { label: 'Add Live Class Link', icon: Video, action: () => setActiveTab('announcements') },
              { label: 'Build Content', icon: Plus, action: () => setActiveTab('content') },
              { label: 'View Roster', icon: Eye, action: () => setActiveTab('roster') },
            ].map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                onClick={action}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', cursor: 'pointer', background: 'none', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'center' }}
              >
                <Icon size={22} style={{ color: 'var(--color-purple)' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── GRADEBOOK TAB ── */}
      {activeTab === 'gradebook' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {selectedSubmission ? (
            <form onSubmit={handleGradeSubmission} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontWeight: 700 }}>Grade Submission</h3>
              <div className="card" style={{ background: 'var(--bg-secondary)', fontSize: '0.82rem' }}>
                <p><strong>Student:</strong> {selectedSubmission.profiles?.full_name} ({selectedSubmission.profiles?.student_id})</p>
                <p><strong>Assignment:</strong> {selectedSubmission.assignments?.title}</p>
                {selectedSubmission.file_url && (
                  <a href={selectedSubmission.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-blue)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '0.8rem' }}>
                    📎 View Submitted File
                  </a>
                )}
                {selectedSubmission.submitted_code && (
                  <pre style={{ marginTop: '8px', padding: '10px', background: '#0d0d1a', borderRadius: '8px', fontSize: '0.75rem', overflowX: 'auto', color: '#a5f3fc', maxHeight: '200px' }}>
                    {selectedSubmission.submitted_code}
                  </pre>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>GRADE (e.g. 85/100, A, Pass)</label>
                <input className="input-field" placeholder="85/100" value={gradeVal} onChange={e => setGradeVal(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>FEEDBACK (optional)</label>
                <textarea className="input-field" placeholder="Great job on the structure! Consider improving..." value={feedbackVal} onChange={e => setFeedbackVal(e.target.value)} style={{ minHeight: '80px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn-primary" disabled={gradeLoading}>
                  {gradeLoading ? <Loader2 size={14} className="animate-spin" /> : 'Submit Grade'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedSubmission(null)}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <h3 style={{ fontWeight: 700 }}>All Pending Submissions</h3>
              {pendingSubmissions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>
                  <CheckSquare size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                  <p>All submissions graded! Great work.</p>
                </div>
              ) : (
                pendingSubmissions.map(sub => (
                  <div key={sub.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{sub.profiles?.full_name}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{sub.assignments?.title}</p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                        <Clock size={11} /> {new Date(sub.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedSubmission(sub)}
                      className="btn"
                      style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'var(--color-purple)', color: '#fff', flexShrink: 0 }}
                    >
                      Grade
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      )}

      {/* ── CONTENT TAB ── */}
      {activeTab === 'content' && <ContentManager />}

      {/* ── ANNOUNCEMENTS TAB ── */}
      {activeTab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Post Announcement */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} style={{ color: 'var(--color-yellow)' }} /> Post Announcement
            </h3>
            <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input className="input-field" placeholder="Title (e.g. Quiz due tomorrow!)" value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} required />
              <textarea className="input-field" placeholder="Write your announcement..." value={announcementText} onChange={e => setAnnouncementText(e.target.value)} required style={{ minHeight: '80px' }} />
              <button type="submit" className="btn btn-primary" disabled={annLoading}>
                {annLoading ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send to All Students</>}
              </button>
            </form>
          </div>

          {/* Post Live Class Link */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} style={{ color: 'var(--color-blue)' }} /> Add Live Class Link
            </h3>
            <form onSubmit={handleSaveLiveLink} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input className="input-field" placeholder="Title (e.g. Tuesday CSS Session)" value={liveLinkTitle} onChange={e => setLiveLinkTitle(e.target.value)} />
              <input className="input-field" placeholder="https://meet.google.com/... or Zoom link" value={liveLink} onChange={e => setLiveLink(e.target.value)} required type="url" />
              <button type="submit" className="btn" disabled={liveLoading} style={{ background: 'var(--color-blue)', color: '#fff' }}>
                {liveLoading ? <Loader2 size={14} className="animate-spin" /> : <><Video size={14} /> Post Live Link</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ROSTER TAB ── */}
      {activeTab === 'roster' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={{ fontWeight: 700 }}>Student Roster</h3>
            <span className="badge badge-blue">{students.length} students</span>
          </div>
          {students.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No enrolled students yet.</div>
          ) : (
            students.map((enroll) => {
              const st = enroll.profiles
              if (!st) return null
              return (
                <div key={enroll.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#8B5CF6,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                    {st.full_name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.full_name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{st.student_id} · 🔥 {st.streak_count || 0} day streak</p>
                  </div>
                  <span className="badge" style={{ fontSize: '0.65rem', background: enroll.status === 'enrolled' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: enroll.status === 'enrolled' ? '#10B981' : '#EF4444' }}>
                    {enroll.status}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── RECORDINGS TAB ── */}
      {activeTab === 'recordings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Video size={18} style={{ color: 'var(--color-cyan)' }} /> Class Recordings
          </h3>
          
          <form className="card" onSubmit={handleUploadRecording} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Upload New Session</h4>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Session Title (e.g. Intro to HTML Forms)" 
              value={newRecTitle} 
              onChange={e => setNewRecTitle(e.target.value)} 
              required 
            />
            <input 
              type="url" 
              className="input-field" 
              placeholder="Recording URL (Google Drive, Zoom link, YouTube)" 
              value={newRecUrl} 
              onChange={e => setNewRecUrl(e.target.value)} 
              required 
            />
            <input 
              type="number" 
              className="input-field" 
              placeholder="Duration in mins (e.g. 90)" 
              value={newRecDuration} 
              onChange={e => setNewRecDuration(e.target.value)} 
            />
            <button type="submit" className="btn btn-primary" disabled={recLoading} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {recLoading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              Save Recording
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            {recordings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No recordings uploaded yet.</div>
            ) : (
              recordings.map(rec => (
                <div key={rec.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(41,214,232,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Video size={20} style={{ color: 'var(--color-cyan)' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(rec.created_at).toLocaleDateString()} • {rec.duration_mins ? `${rec.duration_mins} mins` : 'Length unspecified'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a href={rec.recording_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                      Watch
                    </a>
                    <button onClick={() => handleDeleteRecording(rec.id)} className="btn btn-secondary" style={{ padding: '6px', color: 'var(--color-danger)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
