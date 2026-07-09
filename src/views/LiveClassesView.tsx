import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { motion } from 'framer-motion'
import { ChevronLeft, Video, Calendar, Clock, Users, ExternalLink, Bell, CheckCircle } from 'lucide-react'

interface LiveClassesViewProps {
  onNavigate: (view: string) => void
}

const upcomingClasses = [
  {
    id: 1,
    title: 'HTML Forms & Validation Deep Dive',
    instructor: 'CodeMe Academy Team',
    date: 'Every Saturday',
    time: '10:00 AM – 11:30 AM WAT',
    description: 'Live walkthrough of Module 3 — building and validating real-world HTML forms. Includes a Q&A session.',
    course: 'WD101',
    courseColor: 'var(--color-blue)',
    meetLink: 'https://meet.google.com',
    students: 24,
    status: 'upcoming'
  },
  {
    id: 2,
    title: 'Semantic HTML & Accessibility',
    instructor: 'CodeMe Academy Team',
    date: 'Every Wednesday',
    time: '06:00 PM – 07:00 PM WAT',
    description: 'We cover how to write HTML that is accessible to all users and explain why semantic tags matter.',
    course: 'WD101',
    courseColor: 'var(--color-blue)',
    meetLink: 'https://meet.google.com',
    students: 18,
    status: 'upcoming'
  },
  {
    id: 3,
    title: 'CSS Flexbox & Grid Masterclass',
    instructor: 'CodeMe Academy Team',
    date: 'Coming Soon — Q3 2026',
    time: 'TBD',
    description: 'An in-depth hands-on session where we will build a full responsive webpage from scratch using CSS Flexbox and Grid.',
    course: 'WD102',
    courseColor: 'var(--color-purple)',
    meetLink: '#',
    students: 0,
    status: 'soon'
  },
  {
    id: 4,
    title: 'JavaScript DOM Manipulation',
    instructor: 'CodeMe Academy Team',
    date: 'Coming Soon — Q3 2026',
    time: 'TBD',
    description: 'Live coding session on selecting, modifying, and creating HTML elements with JavaScript.',
    course: 'WD103',
    courseColor: 'var(--color-cyan)',
    meetLink: '#',
    students: 0,
    status: 'soon'
  }
]



export const LiveClassesView: React.FC<LiveClassesViewProps> = ({ onNavigate }) => {
  const [reminders, setReminders] = useState<Set<number>>(new Set())
  const [recordings, setRecordings] = useState<any[]>([])

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const { data } = await supabase
          .from('recording_library')
          .select('*')
          .order('created_at', { ascending: false })
        setRecordings(data || [])
      } catch (e) {
        console.error('Error fetching recordings:', e)
      }
    }
    fetchRecordings()
  }, [])

  const toggleReminder = (id: number) => {
    setReminders(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => onNavigate('dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={24} />
        </button>
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Video size={18} style={{ color: 'var(--color-cyan)' }} /> Live Classes
          </h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Join real-time webinars with instructors</span>
        </div>
      </div>

      <div className="app-content" style={{ padding: '20px' }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >

          {/* Live Banner */}
          <motion.div variants={itemVariants} style={{ background: 'linear-gradient(135deg, rgba(12,74,140,0.2), rgba(41,214,232,0.1))', borderRadius: '16px', padding: '20px', border: '1px solid rgba(41,214,232,0.2)', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444', boxShadow: '0 0 8px #EF4444', animation: 'pulse 2s infinite' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '4px' }}>Saturday Live Class — HTML Forms</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Every Saturday at <strong>10:00 AM WAT</strong>. Join the Google Meet link below to attend. All sessions are recorded.
              </p>
              <a href="https://meet.google.com" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-cyan)', textDecoration: 'none' }}>
                Join Saturday Class <ExternalLink size={14} />
              </a>
            </div>
          </motion.div>

          {/* Upcoming Schedule */}
          <motion.div variants={itemVariants}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-headings)' }}>Class Schedule</h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>All times in WAT</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingClasses.map(cls => (
                <div key={cls.id} className="card" style={{ opacity: cls.status === 'soon' ? 0.7 : 1, position: 'relative', overflow: 'hidden' }}>
                  {/* Course tag stripe */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: cls.courseColor }} />
                  <div style={{ paddingLeft: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <span className="badge" style={{ fontSize: '0.6rem', backgroundColor: cls.courseColor + '22', color: cls.courseColor, border: `1px solid ${cls.courseColor}44`, marginBottom: '6px' }}>{cls.course}</span>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{cls.title}</h4>
                      </div>
                      {cls.status === 'upcoming' ? (
                        <button
                          onClick={() => toggleReminder(cls.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: reminders.has(cls.id) ? 'var(--color-cyan)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 600 }}
                        >
                          {reminders.has(cls.id) ? <CheckCircle size={16} /> : <Bell size={16} />}
                          {reminders.has(cls.id) ? 'Reminded' : 'Remind Me'}
                        </button>
                      ) : (
                        <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>Coming Soon</span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>{cls.description}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} />{cls.date}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} />{cls.time}</span>
                      {cls.students > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} />{cls.students} enrolled</span>}
                    </div>

                    {cls.status === 'upcoming' && (
                      <a
                        href={cls.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', padding: '8px 16px', fontSize: '0.8rem', textDecoration: 'none' }}
                      >
                        <Video size={14} /> Join Class <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recorded Sessions */}
          <motion.div variants={itemVariants}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-headings)', marginBottom: '12px' }}>Recorded Sessions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recordings.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No recordings uploaded yet.</div>
              ) : (
                recordings.map(sess => (
                  <div key={sess.id} className="card" style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '10px', backgroundColor: 'rgba(41,214,232,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(41,214,232,0.2)' }}>
                      <Video size={22} style={{ color: 'var(--color-cyan)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sess.title}</h4>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {sess.duration_mins && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={11} />{sess.duration_mins} min</span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={11} />{new Date(sess.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <a href={sess.recording_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', flexShrink: 0, textDecoration: 'none' }}>
                      Watch
                    </a>
                  </div>
                ))
              )}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  )
}
