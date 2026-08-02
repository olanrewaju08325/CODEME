import React from 'react'
import { ChevronLeft, Calendar, Video, Clock, CheckCircle } from 'lucide-react'

interface LiveClassesProps {
  onNavigate: (view: string) => void
}

export const LiveClasses: React.FC<LiveClassesProps> = ({ onNavigate }) => {
  const classes = [
    {
      id: '1',
      title: 'Module 1-3: HTML Basics Q&A Clinic',
      description: 'Get help with your standard templates, text forms, image formatting, and lists structure. Bring your code blocks for debugging.',
      date: 'Saturday, July 11, 2026',
      time: '4:00 PM - 5:00 PM',
      timezone: 'West Africa Time (Lagos WAT)',
      url: 'https://meet.google.com/abc-defg-hij',
      instructor: 'Olamide Abdulmuiz Olanrewaju',
      status: 'upcoming'
    },
    {
      id: '2',
      title: 'Semantic landmarks & Web accessibility',
      description: 'Deep dive into structural markup elements and ARIA roles. Understand screen readers and SEO indexing requirements.',
      date: 'Tuesday, July 14, 2026',
      time: '7:00 PM - 8:00 PM',
      timezone: 'West Africa Time (Lagos WAT)',
      url: 'https://meet.google.com/abc-defg-hij',
      instructor: 'Olamide Abdulmuiz Olanrewaju',
      status: 'upcoming'
    },
    {
      id: '3',
      title: 'Final Certificate Review & Grading Q&A',
      description: 'Review checklist for project submissions, quiz retakes payment verification details, and final developer certificate validation.',
      date: 'Saturday, July 18, 2026',
      time: '4:00 PM - 5:30 PM',
      timezone: 'West Africa Time (Lagos WAT)',
      url: 'https://meet.google.com/abc-defg-hij',
      instructor: 'Olamide Abdulmuiz Olanrewaju',
      status: 'upcoming'
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '16px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          gap: '12px'
        }}
      >
        <button 
          onClick={() => onNavigate('dashboard')} 
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-purple)', fontWeight: 700, textTransform: 'uppercase' }}>
            Interactive Timetable
          </span>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
            Live Classes Schedule
          </h4>
        </div>
      </div>

      <div className="app-content">
        {/* Info Banner */}
        <div style={{ display: 'flex', gap: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px', borderRadius: '12px', color: '#166534', fontSize: '0.8rem' }}>
          <CheckCircle size={18} style={{ color: '#15803d', flexShrink: 0 }} />
          <p>
            <strong>Lagos WAT Timezone:</strong> All webinars are calibrated in Lagos WAT. Join the Meet link at the scheduled time. Record links will post below afterward.
          </p>
        </div>

        {/* Classes list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {classes.map(cl => (
            <div key={cl.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="badge badge-purple" style={{ fontSize: '0.6rem' }}>Live Meet</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  <Clock size={12} />
                  <span>WAT</span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{cl.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>{cl.description}</p>
              </div>

              <div 
                style={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  padding: '10px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px', 
                  fontSize: '0.75rem' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} style={{ color: 'var(--color-blue)' }} />
                  <strong>{cl.date}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} style={{ color: 'var(--color-blue)' }} />
                  <span>{cl.time} ({cl.timezone})</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px' }}>
                  Instructor: <strong>{cl.instructor}</strong>
                </div>
              </div>

              <a 
                href={cl.url} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none', padding: '10px', fontSize: '0.85rem', gap: '6px' }}
              >
                <Video size={16} /> Join Google Meet
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
