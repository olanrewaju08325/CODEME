import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { motion } from 'framer-motion'
import { ChevronLeft, Check, Lock, PlayCircle, FileText, HelpCircle, Trophy } from 'lucide-react'

interface CourseViewProps {
  session: any
  selectedCourseId: string
  onNavigate: (view: string) => void
  setSelectedLessonId: (id: string) => void
  setSelectedQuizId: (id: string) => void
  onSelectCertificate: () => void
}

export const CourseView: React.FC<CourseViewProps> = ({ 
  session, 
  selectedCourseId,
  onNavigate, 
  setSelectedLessonId, 
  setSelectedQuizId,
  onSelectCertificate
}) => {
  const [modules, setModules] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [progress, setProgress] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [attempts, setAttempts] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      // 1. Fetch modules for the selected course
      const { data: moduleData } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', selectedCourseId)
        .order('order_index', { ascending: true })
      const modulesList = moduleData || []
      setModules(modulesList)

      if (modulesList.length > 0) {
        const moduleIds = modulesList.map(m => m.id)

        // 2. Fetch lessons
        const { data: lessonData } = await supabase
          .from('lessons')
          .select('*')
          .in('module_id', moduleIds)
          .order('order_index', { ascending: true })
        setLessons(lessonData || [])

        // 3. Fetch quizzes
        const { data: quizData } = await supabase
          .from('quizzes')
          .select('*')
          .in('module_id', moduleIds)
        setQuizzes(quizData || [])

        // Fetch assignments
        const { data: assignData } = await supabase
          .from('assignments')
          .select('*')
          .in('module_id', moduleIds)
        setAssignments(assignData || [])
      }

      // 4. Fetch progress
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', session.user.id)
      setProgress(progressData || [])

      // 5. Fetch assignment submissions
      const { data: subData } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', session.user.id)
      setSubmissions(subData || [])

      // 6. Fetch quiz attempts
      const { data: attemptData } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('student_id', session.user.id)
      setAttempts(attemptData || [])

    } catch (err) {
      console.error('Error fetching course view data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [session, selectedCourseId])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <p>Loading course content...</p>
      </div>
    )
  }

  // Helper check if lesson is read
  const isLessonCompleted = (lessonId: string) => {
    return progress.some(p => p.lesson_id === lessonId)
  }

  // Helper check assignment status
  const getAssignmentStatus = (moduleId: string) => {
    const assign = assignments.find(a => a.module_id === moduleId)
    if (!assign) return 'not_submitted'
    const sub = submissions.find(s => s.assignment_id === assign.id)
    return sub ? sub.status : 'not_submitted'
  }

  // Calculate certificate availability
  // Certificate unlocked if all 6 quizzes have a passing attempt
  // Check if at least one passed attempt exists for each quiz in all 6 modules
  const quizPassedCount = modules.filter(m => {
    const moduleQuiz = quizzes.find(q => q.module_id === m.id)
    if (!moduleQuiz) return false
    return attempts.some(a => a.quiz_id === moduleQuiz.id && a.passed)
  }).length

  const allPassed = quizPassedCount === 6

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
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
  } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
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
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>WD101 Syllabus Map</h4>
      </div>

      <div className="app-content">
        {/* Certificate Unlocked Banner */}
        {allPassed ? (
          <div 
            className="card animate-pulse"
            style={{ 
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <Trophy size={40} />
            <div>
              <h3 style={{ color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 800 }}>Frontend Certificate Earned!</h3>
              <p style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '4px' }}>
                You have passed all 6 module examinations. Claim your official credentials now.
              </p>
            </div>
            <button 
              className="btn" 
              onClick={onSelectCertificate}
              style={{ backgroundColor: '#FFFFFF', color: '#059669', padding: '10px', fontSize: '0.85rem' }}
            >
              Generate Certificate PDF
            </button>
          </div>
        ) : (
          <div className="card" style={{ backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px' }}>
            <Trophy size={28} style={{ color: quizPassedCount > 0 ? 'var(--color-purple)' : 'var(--text-tertiary)' }} />
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '0.85rem' }}>Digital Certificate Progress</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pass all 6 quizzes: {quizPassedCount}/6 passed</p>
            </div>
            <div className="progress-container" style={{ width: '80px', height: '6px' }}>
              <div className="progress-bar-fill" style={{ width: `${Math.round((quizPassedCount / 6) * 100)}%` }}></div>
            </div>
          </div>
        )}

        {/* Modules List */}
        <motion.div 
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {modules.map((m, idx) => {
            const moduleLessons = lessons.filter(l => l.module_id === m.id)
            const moduleQuiz = quizzes.find(q => q.module_id === m.id)
            const quizAttempt = moduleQuiz ? attempts.filter(a => a.quiz_id === moduleQuiz.id) : []
            const isQuizPassed = quizAttempt.some(a => a.passed)
            
            // Check if previous module is passed to implement sequence lock
            // The first module is always unlocked. Subsequent modules require previous module's quiz to be passed.
            const isUnlocked = idx === 0 || (() => {
              const prevModule = modules[idx - 1]
              const prevQuiz = quizzes.find(q => q.module_id === prevModule.id)
              return prevQuiz ? attempts.some(a => a.quiz_id === prevQuiz.id && a.passed) : false
            })()

            return (
              <motion.div 
                key={m.id} 
                className="card" 
                variants={itemVariants}
                style={{ 
                  opacity: isUnlocked ? 1 : 0.65,
                  pointerEvents: isUnlocked ? 'auto' : 'none',
                  borderColor: isUnlocked ? 'var(--border-color)' : 'transparent',
                  backgroundColor: isUnlocked ? 'var(--bg-secondary)' : '#E5E7EB'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-blue)', fontWeight: 700, textTransform: 'uppercase' }}>Module {m.order_index}</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{m.title}</h3>
                  </div>
                  {!isUnlocked ? (
                    <Lock size={18} style={{ color: 'var(--text-tertiary)' }} />
                  ) : isQuizPassed ? (
                    <div style={{ backgroundColor: 'var(--color-success)', color: '#FFFFFF', borderRadius: '50%', padding: '4px' }}>
                      <Check size={14} />
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Lessons */}
                  {moduleLessons.map(l => {
                    const completed = isLessonCompleted(l.id)
                    return (
                      <div 
                        key={l.id} 
                        onClick={() => {
                          setSelectedLessonId(l.id)
                          onNavigate('lesson')
                        }}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          padding: '10px', 
                          borderRadius: '8px', 
                          backgroundColor: 'var(--bg-primary)', 
                          cursor: 'pointer',
                          border: '1px solid transparent'
                        }}
                        className="lesson-row"
                      >
                        {completed ? (
                          <Check size={18} style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <PlayCircle size={18} style={{ color: 'var(--color-blue)' }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <h5 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.title}</h5>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Lesson {l.order_index} • Ready to Read</span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Assignment submission status */}
                  {isUnlocked && (() => {
                    const assign = assignments.find(a => a.module_id === m.id)
                    const status = getAssignmentStatus(m.id)
                    return (
                      <div 
                        onClick={() => {
                          if (assign) {
                            setSelectedLessonId(moduleLessons[0]?.id || '') // Redir to lesson to submit
                            onNavigate('lesson')
                          }
                        }}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          padding: '10px', 
                          borderRadius: '8px', 
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px dashed var(--border-color)',
                          cursor: 'pointer'
                        }}
                      >
                        <FileText size={18} style={{ color: 'var(--color-purple)' }} />
                        <div style={{ flex: 1 }}>
                          <h5 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Module {m.order_index} Assignment</h5>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Status: {status === 'approved' ? 'Approved (Graded)' : status === 'rejected' ? 'Rejected (Resubmit)' : status === 'pending' ? 'Pending Review' : 'Not submitted'}
                          </span>
                        </div>
                        {status === 'approved' && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Approved</span>}
                        {status === 'rejected' && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Rejected</span>}
                        {status === 'pending' && <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Pending</span>}
                      </div>
                    )
                  })()}

                  {/* Quiz */}
                  {moduleQuiz && isUnlocked && (
                    <div 
                      onClick={() => {
                        setSelectedQuizId(moduleQuiz.id)
                        onNavigate('quiz')
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '10px', 
                        borderRadius: '8px', 
                        backgroundColor: isQuizPassed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 47, 166, 0.08)', 
                        cursor: 'pointer',
                        border: isQuizPassed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                      }}
                    >
                      <HelpCircle size={18} style={{ color: isQuizPassed ? 'var(--color-success)' : 'var(--color-purple)' }} />
                      <div style={{ flex: 1 }}>
                        <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: isQuizPassed ? 'var(--color-success)' : 'var(--text-primary)' }}>
                          {moduleQuiz.title}
                        </h5>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {isQuizPassed 
                            ? 'Exam Passed Successfully' 
                            : quizAttempt.length > 0 
                              ? `Failed (${quizAttempt[quizAttempt.length - 1].score}%) • Tap to Retake` 
                              : 'Test Locked Until Lessons Complete'}
                        </span>
                      </div>
                      {isQuizPassed && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Passed</span>}
                    </div>
                  )}

                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Locked future curriculums roadmap */}
        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '4px' }}>
            Future Curriculums Roadmap
          </h4>
          
          {[
            { title: 'CSS3: Responsive Web Layouts', track: 'Frontend Path' },
            { title: 'JavaScript Essentials: Logic & DOM', track: 'Frontend Path' },
            { title: 'React JS Framework: Single Page Apps', track: 'Frontend Path' },
            { title: 'Git & GitHub Version Control', track: 'Engineering Basics' },
            { title: 'Backend Logic with Python & Django', track: 'Backend Path' },
            { title: 'Full Stack Engineering Capstone', track: 'Full Stack Path' },
            { title: 'Introduction to Data Analytics & SQL', track: 'Data Path' },
            { title: 'Data Science & Machine Learning Basics', track: 'Data Path' }
          ].map((course, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '12px 16px', 
                borderRadius: '12px', 
                backgroundColor: 'rgba(156, 163, 175, 0.08)', 
                border: '1px solid var(--border-color)'
              }}
            >
              <div>
                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{course.title}</h5>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{course.track}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(156, 163, 175, 0.15)', padding: '4px 8px', borderRadius: '8px' }}>
                <Lock size={12} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Coming Soon</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CourseView
