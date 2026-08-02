import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Loader2, Plus, Edit2, Trash2, Layout, BookOpen, PenTool, CheckSquare, DollarSign, Settings, Globe } from 'lucide-react'

const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin English']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const CURRENCIES = ['NGN', 'USD', 'GBP']

export const ContentManager: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('wd101')
  const [modules, setModules] = useState<any[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Sub-views: 'course-settings', 'modules', 'lessons', 'projects', 'quizzes', 'new-course'
  const [activeView, setActiveView] = useState<string>('modules')

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)

  // Module form
  const [moduleTitle, setModuleTitle] = useState('')
  const [moduleOrder, setModuleOrder] = useState('1')

  // Lesson form
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonContent, setLessonContent] = useState('')
  const [lessonVideo, setLessonVideo] = useState('')
  const [lessonOrder, setLessonOrder] = useState('1')

  // Project/Assignment form
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDesc, setProjectDesc] = useState('')

  // Quiz form
  const [quizTitle, setQuizTitle] = useState('')

  // Course settings / new course form
  const [courseId, setCourseId] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [coursePrice, setCoursePrice] = useState('0')
  const [courseCurrency, setCourseCurrency] = useState('NGN')
  const [courseLanguage, setCourseLanguage] = useState('English')
  const [courseLevel, setCourseLevel] = useState('Beginner')
  const [courseDuration, setCourseDuration] = useState('4')

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: coursesData } = await supabase.from('courses').select('*').order('id')
      setCourses(coursesData || [])

      if (selectedCourseId) {
        const { data: modsData } = await supabase
          .from('modules')
          .select('*, lessons(*), assignments(*), quizzes(*)')
          .eq('course_id', selectedCourseId)
          .order('order_index')
        setModules(modsData || [])
        if (modsData && modsData.length > 0 && !selectedModuleId) {
          setSelectedModuleId(modsData[0].id)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedCourseId])

  const resetForms = () => {
    setEditTarget(null)
    setModuleTitle(''); setModuleOrder('1')
    setLessonTitle(''); setLessonContent(''); setLessonVideo(''); setLessonOrder('1')
    setProjectTitle(''); setProjectDesc('')
    setQuizTitle('')
    setShowForm(false)
  }

  const loadCourseIntoForm = (course: any) => {
    setCourseTitle(course.title || '')
    setCourseDesc(course.description || '')
    setCoursePrice(course.price?.toString() || '0')
    setCourseCurrency(course.currency || 'NGN')
    setCourseLanguage(course.language || 'English')
    setCourseLevel(course.level || 'Beginner')
    setCourseDuration(course.duration_weeks?.toString() || '4')
  }

  const handleDelete = async (table: string, id: string) => {
    if (!window.confirm(`Are you sure you want to delete this item? This cannot be undone.`)) return
    setActionLoading(true)
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      setMessage({ type: 'success', text: 'Item deleted.' })
      fetchData()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveCourseSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const payload = {
        title: courseTitle,
        description: courseDesc,
        price: parseFloat(coursePrice),
        currency: courseCurrency,
        language: courseLanguage,
        level: courseLevel,
        duration_weeks: parseInt(courseDuration),
        is_active: true
      }

      if (activeView === 'new-course') {
        const id = courseId.trim().toLowerCase().replace(/\s+/g, '-')
        if (!id) throw new Error('Course ID is required.')
        const { error } = await supabase.from('courses').insert({ id, ...payload })
        if (error) throw error
        setMessage({ type: 'success', text: `Course "${courseTitle}" created!` })
        setSelectedCourseId(id)
        setActiveView('modules')
      } else {
        const { error } = await supabase.from('courses').update(payload).eq('id', selectedCourseId)
        if (error) throw error
        setMessage({ type: 'success', text: 'Course settings saved!' })
      }
      fetchData()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handlePublishToggle = async (moduleId: string, currentStatus: boolean) => {
    setActionLoading(true)
    try {
      const { error } = await supabase.from('modules').update({ is_published: !currentStatus }).eq('id', moduleId)
      if (error) throw error
      fetchData()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      if (editTarget) {
        const { error } = await supabase.from('modules').update({ title: moduleTitle, order_index: parseInt(moduleOrder) }).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('modules').insert({ course_id: selectedCourseId, title: moduleTitle, order_index: parseInt(moduleOrder) })
        if (error) throw error
      }
      setMessage({ type: 'success', text: 'Module saved.' })
      fetchData(); resetForms()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const payload = { module_id: selectedModuleId, title: lessonTitle, content: lessonContent, video_url: lessonVideo || null, order_index: parseInt(lessonOrder) }
      if (editTarget) {
        const { error } = await supabase.from('lessons').update(payload).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('lessons').insert(payload)
        if (error) throw error
      }
      setMessage({ type: 'success', text: 'Lesson saved.' })
      fetchData(); resetForms()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const payload = { module_id: selectedModuleId, title: projectTitle, description: projectDesc }
      if (editTarget) {
        const { error } = await supabase.from('assignments').update(payload).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('assignments').insert(payload)
        if (error) throw error
      }
      setMessage({ type: 'success', text: 'Assignment saved.' })
      fetchData(); resetForms()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const payload = { module_id: selectedModuleId, title: quizTitle }
      if (editTarget) {
        const { error } = await supabase.from('quizzes').update(payload).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('quizzes').insert(payload)
        if (error) throw error
      }
      setMessage({ type: 'success', text: 'Quiz saved.' })
      fetchData(); resetForms()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const renderCourseSettingsForm = (isNew: boolean) => (
    <form onSubmit={handleSaveCourseSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{isNew ? '➕ Create New Course' : `⚙️ Settings: ${courses.find(c => c.id === selectedCourseId)?.title}`}</h3>

      {isNew && (
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>COURSE ID (short, no spaces e.g. "css3" or "python-basics")</label>
          <input className="input-field" placeholder="e.g. css3" value={courseId} onChange={e => setCourseId(e.target.value)} required />
        </div>
      )}

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>COURSE TITLE</label>
        <input className="input-field" placeholder="e.g. CSS3: Responsive Layouts" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} required />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>DESCRIPTION</label>
        <textarea className="input-field" placeholder="What will students learn?" value={courseDesc} onChange={e => setCourseDesc(e.target.value)} style={{ minHeight: '80px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>LANGUAGE</label>
          <select className="input-field" value={courseLanguage} onChange={e => setCourseLanguage(e.target.value)}>
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>LEVEL</label>
          <select className="input-field" value={courseLevel} onChange={e => setCourseLevel(e.target.value)}>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>PRICE</label>
          <input type="number" className="input-field" placeholder="25000" value={coursePrice} onChange={e => setCoursePrice(e.target.value)} required min="0" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>CURRENCY</label>
          <select className="input-field" value={courseCurrency} onChange={e => setCourseCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>DURATION (weeks)</label>
          <input type="number" className="input-field" placeholder="4" value={courseDuration} onChange={e => setCourseDuration(e.target.value)} required min="1" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ flex: 1 }}>
          {actionLoading ? <Loader2 className="animate-spin" size={16} /> : isNew ? 'Create Course' : 'Save Settings'}
        </button>
        {isNew && <button type="button" className="btn btn-secondary" onClick={() => setActiveView('modules')}>Cancel</button>}
      </div>
    </form>
  )

  const renderModulesList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <button className="btn btn-primary" onClick={() => { resetForms(); setShowForm(true); }} style={{ width: 'fit-content', display: 'flex', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}>
        <Plus size={16} /> New Module
      </button>

      {showForm && (
        <form onSubmit={handleSaveModule} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4>{editTarget ? 'Edit Module' : 'Create Module'}</h4>
          <input className="input-field" placeholder="Module Title" value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} required />
          <input type="number" className="input-field" placeholder="Order Index (1, 2, 3...)" value={moduleOrder} onChange={e => setModuleOrder(e.target.value)} required />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={resetForms}>Cancel</button>
          </div>
        </form>
      )}

      {modules.map(mod => (
        <div key={mod.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem' }}>M{mod.order_index}: {mod.title}</h4>
            <span style={{ fontSize: '0.7rem', color: mod.is_published ? 'var(--color-success)' : 'var(--text-secondary)' }}>
              {mod.is_published ? '✓ Published' : 'Draft'} · {mod.lessons?.length || 0} lessons
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => handlePublishToggle(mod.id, mod.is_published)} className="badge" style={{ cursor: 'pointer' }}>
              {mod.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <button onClick={() => { setEditTarget(mod); setModuleTitle(mod.title); setModuleOrder(mod.order_index.toString()); setShowForm(true); }} className="badge badge-blue" style={{ cursor: 'pointer' }}><Edit2 size={12} /></button>
            <button onClick={() => handleDelete('modules', mod.id)} className="badge badge-danger" style={{ cursor: 'pointer' }}><Trash2 size={12} /></button>
          </div>
        </div>
      ))}
    </div>
  )

  const renderLessonsList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <select className="input-field" value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)}>
        {modules.map(mod => <option key={mod.id} value={mod.id}>M{mod.order_index}: {mod.title}</option>)}
      </select>
      <button className="btn btn-primary" onClick={() => { resetForms(); setShowForm(true); }} style={{ width: 'fit-content', display: 'flex', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}>
        <Plus size={16} /> New Lesson
      </button>
      {showForm && (
        <form onSubmit={handleSaveLesson} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4>{editTarget ? 'Edit Lesson' : 'Create Lesson'}</h4>
          <input className="input-field" placeholder="Lesson Title" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} required />
          <textarea className="input-field" placeholder="Lesson content..." value={lessonContent} onChange={e => setLessonContent(e.target.value)} required style={{ minHeight: '120px' }} />
          <input className="input-field" placeholder="YouTube Embed URL (optional)" value={lessonVideo} onChange={e => setLessonVideo(e.target.value)} />
          <input type="number" className="input-field" placeholder="Order Index" value={lessonOrder} onChange={e => setLessonOrder(e.target.value)} required />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={resetForms}>Cancel</button>
          </div>
        </form>
      )}
      {modules.find(m => m.id === selectedModuleId)?.lessons?.sort((a: any, b: any) => a.order_index - b.order_index).map((ls: any) => (
        <div key={ls.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.9rem' }}>L{ls.order_index}: {ls.title}</h4>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => { setEditTarget(ls); setLessonTitle(ls.title); setLessonContent(ls.content); setLessonVideo(ls.video_url || ''); setLessonOrder(ls.order_index.toString()); setShowForm(true); }} className="badge badge-blue" style={{ cursor: 'pointer' }}><Edit2 size={12} /></button>
            <button onClick={() => handleDelete('lessons', ls.id)} className="badge badge-danger" style={{ cursor: 'pointer' }}><Trash2 size={12} /></button>
          </div>
        </div>
      ))}
    </div>
  )

  const renderProjectsList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <select className="input-field" value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)}>
        {modules.map(mod => <option key={mod.id} value={mod.id}>M{mod.order_index}: {mod.title}</option>)}
      </select>
      <button className="btn btn-primary" onClick={() => { resetForms(); setShowForm(true); }} style={{ width: 'fit-content', display: 'flex', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}>
        <Plus size={16} /> New Assignment
      </button>
      {showForm && (
        <form onSubmit={handleSaveAssignment} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4>{editTarget ? 'Edit Assignment' : 'Create Assignment'}</h4>
          <input className="input-field" placeholder="Assignment Title" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} required />
          <textarea className="input-field" placeholder="Description/Scenario..." value={projectDesc} onChange={e => setProjectDesc(e.target.value)} required style={{ minHeight: '100px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={resetForms}>Cancel</button>
          </div>
        </form>
      )}
      {modules.find(m => m.id === selectedModuleId)?.assignments?.map((asg: any) => (
        <div key={asg.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.9rem' }}>{asg.title}</h4>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => { setEditTarget(asg); setProjectTitle(asg.title); setProjectDesc(asg.description); setShowForm(true); }} className="badge badge-blue" style={{ cursor: 'pointer' }}><Edit2 size={12} /></button>
            <button onClick={() => handleDelete('assignments', asg.id)} className="badge badge-danger" style={{ cursor: 'pointer' }}><Trash2 size={12} /></button>
          </div>
        </div>
      ))}
    </div>
  )

  const renderQuizzesList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <select className="input-field" value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)}>
        {modules.map(mod => <option key={mod.id} value={mod.id}>M{mod.order_index}: {mod.title}</option>)}
      </select>
      <button className="btn btn-primary" onClick={() => { resetForms(); setShowForm(true); }} style={{ width: 'fit-content', display: 'flex', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}>
        <Plus size={16} /> New Quiz
      </button>
      {showForm && (
        <form onSubmit={handleSaveQuiz} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4>{editTarget ? 'Edit Quiz' : 'Create Quiz'}</h4>
          <input className="input-field" placeholder="Quiz Title" value={quizTitle} onChange={e => setQuizTitle(e.target.value)} required />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>Save</button>
            <button type="button" className="btn btn-secondary" onClick={resetForms}>Cancel</button>
          </div>
        </form>
      )}
      {modules.find(m => m.id === selectedModuleId)?.quizzes?.map((qz: any) => (
        <div key={qz.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.9rem' }}>{qz.title}</h4>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => { setEditTarget(qz); setQuizTitle(qz.title); setShowForm(true); }} className="badge badge-blue" style={{ cursor: 'pointer' }}><Edit2 size={12} /></button>
            <button onClick={() => handleDelete('quizzes', qz.id)} className="badge badge-danger" style={{ cursor: 'pointer' }}><Trash2 size={12} /></button>
          </div>
        </div>
      ))}
    </div>
  )

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {message && (
        <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2', color: message.type === 'success' ? '#065F46' : '#991B1B', border: message.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FCA5A5' }}>
          {message.text}
        </div>
      )}

      {/* Course Selector + Create New Button */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
          <label style={{ fontSize: '0.65rem' }}>SELECT COURSE</label>
          <select className="input-field" value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setActiveView('modules'); }}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setCourseId(''); setCourseTitle(''); setCourseDesc(''); setCoursePrice('0')
            setCourseCurrency('NGN'); setCourseLanguage('English'); setCourseLevel('Beginner'); setCourseDuration('4')
            setActiveView('new-course')
          }}
          style={{ flexShrink: 0, height: '40px', minHeight: '40px', padding: '0 12px', fontSize: '0.8rem', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={14} /> New Course
        </button>
      </div>

      {/* Pricing Info Strip */}
      {activeView !== 'new-course' && (() => {
        const c = courses.find(x => x.id === selectedCourseId)
        return c ? (
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>💰 Price: <strong>{c.currency || 'NGN'} {Number(c.price || 0).toLocaleString()}</strong></span>
            <span>🌐 Language: <strong>{c.language || 'English'}</strong></span>
            <span>📊 Level: <strong>{c.level || 'Beginner'}</strong></span>
            <span>🕐 Duration: <strong>{c.duration_weeks || '?'} weeks</strong></span>
            <span>✅ Status: <strong style={{ color: c.is_active ? 'var(--color-success)' : 'var(--color-danger)' }}>{c.is_active ? 'Active' : 'Inactive'}</strong></span>
          </div>
        ) : null
      })()}

      {/* Tab Navigation */}
      {activeView !== 'new-course' && (
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', overflowX: 'auto' }}>
          <button className={`badge ${activeView === 'modules' ? 'badge-blue' : ''}`} onClick={() => setActiveView('modules')} style={{ cursor: 'pointer', padding: '6px 12px' }}>
            <Layout size={14} style={{ marginRight: '4px' }} /> Modules
          </button>
          <button className={`badge ${activeView === 'lessons' ? 'badge-blue' : ''}`} onClick={() => setActiveView('lessons')} style={{ cursor: 'pointer', padding: '6px 12px' }}>
            <BookOpen size={14} style={{ marginRight: '4px' }} /> Lessons
          </button>
          <button className={`badge ${activeView === 'projects' ? 'badge-blue' : ''}`} onClick={() => setActiveView('projects')} style={{ cursor: 'pointer', padding: '6px 12px' }}>
            <PenTool size={14} style={{ marginRight: '4px' }} /> Assignments
          </button>
          <button className={`badge ${activeView === 'quizzes' ? 'badge-blue' : ''}`} onClick={() => setActiveView('quizzes')} style={{ cursor: 'pointer', padding: '6px 12px' }}>
            <CheckSquare size={14} style={{ marginRight: '4px' }} /> Quizzes
          </button>
          <button
            className={`badge ${activeView === 'course-settings' ? 'badge-blue' : ''}`}
            onClick={() => { loadCourseIntoForm(courses.find(c => c.id === selectedCourseId) || {}); setActiveView('course-settings') }}
            style={{ cursor: 'pointer', padding: '6px 12px' }}
          >
            <Settings size={14} style={{ marginRight: '4px' }} /> Settings & Pricing
          </button>
        </div>
      )}

      {/* Content Panels */}
      <div style={{ marginTop: '4px' }}>
        {activeView === 'modules' && renderModulesList()}
        {activeView === 'lessons' && renderLessonsList()}
        {activeView === 'projects' && renderProjectsList()}
        {activeView === 'quizzes' && renderQuizzesList()}
        {activeView === 'course-settings' && renderCourseSettingsForm(false)}
        {activeView === 'new-course' && renderCourseSettingsForm(true)}
      </div>
    </div>
  )
}
