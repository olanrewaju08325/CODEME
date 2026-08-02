import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import apiClient from '../apiClient'
import { ChevronLeft, CheckCircle, FileText, Send, Loader2, Play, RotateCcw, Code2, Terminal, Maximize2, Download } from 'lucide-react'
import { AIChatWidget } from '../components/AIChatWidget'

interface LessonViewProps {
  session: any
  lessonId: string
  onNavigate: (view: string) => void
}

export const LessonView: React.FC<LessonViewProps> = ({ session, lessonId, onNavigate }) => {
  const [lesson, setLesson] = useState<any>(null)
  const [assignment, setAssignment] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submissionText, setSubmissionText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submissionFile, setSubmissionFile] = useState<string | null>(null)
  const [submissionFileName, setSubmissionFileName] = useState('')
  const [rawFile, setRawFile] = useState<File | null>(null)
  const [courseId, setCourseId] = useState<string>('wd101')
  const [pyodideReady, setPyodideReady] = useState(false)
  const [pyodideLoading, setPyodideLoading] = useState(false)
  const [sqlReady, setSqlReady] = useState(false)
  const [sqlLoading, setSqlLoading] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<Array<{type: 'output'|'error'|'info', text: string}>>([]
  )
  const pyodideRef = useRef<any>(null)
  const sqlDbRef = useRef<any>(null)

  const handleAssignmentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('File size exceeds 2MB limit.')
      return
    }
    setError(null)
    setSubmissionFileName(file.name)
    setRawFile(file)
  }

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'text' | 'sandbox'>('text')

  // Sandbox state: different default code per language type
  const getSandboxDefaults = () => {
    const cId = courseId || 'wd101'
    if (cId === 'js') {
      return `// JavaScript Sandbox\nconsole.log('Hello, CodeMe!');\n\nconst name = 'Student';\nconst greeting = \`Welcome to CodeMe, \${name}!\`;\nconsole.log(greeting);\n\n// Try anything: loops, functions, arrays...\nconst numbers = [1, 2, 3, 4, 5];\nconsole.log('Sum:', numbers.reduce((a, b) => a + b, 0));`
    }
    if (cId === 'backend' || cId === 'science') {
      return `# Python Sandbox\nprint('Hello from Python!')\n\nname = 'Student'\nprint(f'Welcome to CodeMe, {name}!')\n\n# Try lists, loops, functions...\nnumbers = [1, 2, 3, 4, 5]\nprint('Sum:', sum(numbers))`
    }
    if (cId === 'analytics') {
      return `-- SQL Sandbox\n-- A sample table 'students' is preloaded\n\nSELECT * FROM students;\n\n-- Try:\n-- SELECT name, score FROM students WHERE score > 70;`
    }
    return `<!-- HTML Sandbox -->\n<div style="font-family: sans-serif; text-align: center; margin-top: 2rem;">\n  <h1 style="color: #0C4A8C;">Hello, CodeMe!</h1>\n  <p>Start writing HTML, CSS, and JS here.</p>\n  <button onclick="alert('Great job!')" style="padding: 10px 20px; background: #8B2FA6; color: white; border: none; border-radius: 8px; cursor: pointer;">Click Me</button>\n</div>`
  }

  const handleDownloadNotes = () => {
    if (lesson?.pdf_url) {
      window.open(lesson.pdf_url, '_blank')
    } else {
      const element = document.createElement("a");
      const file = new Blob([`# ${lesson?.title}\n\n${lesson?.content}`], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${lesson?.title?.replace(/\\s+/g, '_')}_Notes.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  }

  const [sandboxCode, setSandboxCode] = useState('')

  useEffect(() => {
    setSandboxCode(getSandboxDefaults())
  }, [courseId])
  const [lintWarnings, setLintWarnings] = useState<string[]>([])

  const runCodeValidator = (codeText: string) => {
    const warnings: string[] = []
    if (!codeText.trim()) {
      setLintWarnings([])
      return
    }

    // 1. Check tag closures (rough balance)
    const openTags = (codeText.match(/<[a-zA-Z0-9]+/g) || []).length
    const closeTags = (codeText.match(/<\/[a-zA-Z0-9]+/g) || []).length
    const selfClosingMatches = (codeText.match(/<(img|br|hr|input|meta|link)[^>]*>/g) || []).length
    
    if (openTags - selfClosingMatches !== closeTags) {
      warnings.push("⚠️ Tag structure warning: Check your HTML brackets. Some tags might be unclosed or mismatched.")
    }

    // 2. Check alt in img
    const imgTags = codeText.match(/<img[^>]*>/g) || []
    for (const img of imgTags) {
      if (!/alt\s*=\s*['"][^'"]*['"]/i.test(img)) {
        warnings.push("⚠️ Accessibility: Found an <img> tag without a descriptive 'alt' attribute.")
      }
    }

    // 3. Check href in anchors
    const anchorTags = codeText.match(/<a[^>]*>/g) || []
    for (const a of anchorTags) {
      if (!/href\s*=\s*['"][^'"]*['"]/i.test(a)) {
        warnings.push("⚠️ Code quality: Found an <a> anchor tag without a destination 'href' attribute.")
      }
    }

    setLintWarnings(warnings)
  }

  useEffect(() => {
    runCodeValidator(submissionText)
  }, [submissionText])

  // ── Python (Pyodide) loader ──
  const loadPyodide = async () => {
    if (pyodideRef.current || pyodideLoading) return
    setPyodideLoading(true)
    setTerminalOutput([{ type: 'info', text: '⏳ Loading Python runtime (Pyodide)...' }])
    try {
      // Dynamically load the Pyodide script from CDN
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js'
      script.async = true
      document.head.appendChild(script)
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Pyodide script'))
      })
      const pyodide = await (window as any).loadPyodide()
      pyodideRef.current = pyodide
      setPyodideReady(true)
      setTerminalOutput([{ type: 'info', text: '✅ Python runtime ready! Click Run to execute your code.' }])
    } catch (e: any) {
      setTerminalOutput([{ type: 'error', text: `❌ Failed to load Python: ${e.message}` }])
    } finally {
      setPyodideLoading(false)
    }
  }

  // ── SQL (sql.js) loader ──
  const loadSql = async () => {
    if (sqlDbRef.current || sqlLoading) return
    setSqlLoading(true)
    setTerminalOutput([{ type: 'info', text: '⏳ Loading SQL engine...' }])
    try {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js'
      script.async = true
      document.head.appendChild(script)
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load sql.js'))
      })
      const SQL = await (window as any).initSqlJs({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
      })
      const db = new SQL.Database()
      // Seed a sample table
      db.run(`CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, score INTEGER, course TEXT);
        INSERT INTO students VALUES (1, 'Amara Okonkwo', 92, 'WD101');
        INSERT INTO students VALUES (2, 'Bolaji Adeyemi', 78, 'WD101');
        INSERT INTO students VALUES (3, 'Chidinma Nwosu', 85, 'WD101');
        INSERT INTO students VALUES (4, 'Dayo Fashola', 61, 'WD101');
        INSERT INTO students VALUES (5, 'Emeka Eze', 95, 'WD101');`)
      sqlDbRef.current = db
      setSqlReady(true)
      setTerminalOutput([{ type: 'info', text: '✅ SQL engine ready! A sample "students" table is preloaded. Click Run.' }])
    } catch (e: any) {
      setTerminalOutput([{ type: 'error', text: `❌ Failed to load SQL engine: ${e.message}` }])
    } finally {
      setSqlLoading(false)
    }
  }

  // ── Run Code ──
  const runCode = async () => {
    const cId = courseId || 'wd101'

    if (cId === 'js') {
      // JavaScript execution: capture console.log
      const logs: Array<{type: 'output'|'error', text: string}> = []
      const originalLog = console.log
      const originalError = console.error
      console.log = (...args: any[]) => logs.push({ type: 'output', text: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') })
      console.error = (...args: any[]) => logs.push({ type: 'error', text: args.join(' ') })
      try {
        // eslint-disable-next-line no-new-func
        new Function(sandboxCode)()
      } catch (e: any) {
        logs.push({ type: 'error', text: `RuntimeError: ${e.message}` })
      } finally {
        console.log = originalLog
        console.error = originalError
      }
      setTerminalOutput(logs.length ? logs : [{ type: 'info', text: 'No output.' }])
      return
    }

    if (cId === 'backend' || cId === 'science') {
      if (!pyodideRef.current) {
        await loadPyodide()
        return
      }
      const logs: Array<{type: 'output'|'error', text: string}> = []
      try {
        pyodideRef.current.setStdout({ batched: (s: string) => logs.push({ type: 'output', text: s }) })
        pyodideRef.current.setStderr({ batched: (s: string) => logs.push({ type: 'error', text: s }) })
        await pyodideRef.current.runPythonAsync(sandboxCode)
      } catch (e: any) {
        logs.push({ type: 'error', text: e.message })
      }
      setTerminalOutput(logs.length ? logs : [{ type: 'info', text: 'No output.' }])
      return
    }

    if (cId === 'analytics') {
      if (!sqlDbRef.current) {
        await loadSql()
        return
      }
      try {
        const results = sqlDbRef.current.exec(sandboxCode)
        if (results.length === 0) {
          setTerminalOutput([{ type: 'info', text: 'Query executed successfully. No rows returned.' }])
        } else {
          // Convert to HTML table string for rendering
          const cols = results[0].columns
          const rows = results[0].values
          const tableStr = JSON.stringify({ cols, rows })
          setTerminalOutput([{ type: 'output', text: `__TABLE__${tableStr}` }])
        }
      } catch (e: any) {
        setTerminalOutput([{ type: 'error', text: `SQL Error: ${e.message}` }])
      }
      return
    }

    // HTML: handled by live iframe, nothing extra needed
  }

  const fetchData = async () => {
    try {
      // 1. Fetch lesson details via API
      const lessonData = await apiClient.courses.getLesson(lessonId)
      setLesson(lessonData)
      
      // Extract course_id from lesson or its module
      if (lessonData?.module?.course_id) {
        setCourseId(lessonData.module.course_id)
      } else if (lessonData?.module_id) {
        // Fallback: try to get module separately
        try {
          const moduleData = await apiClient.courses.getModule(lessonData.module_id)
          if (moduleData?.course_id) {
            setCourseId(moduleData.course_id)
          }
        } catch (e) {
          console.log('Could not fetch module for course_id')
        }
      }

      // 2. Check if completed via API
      const progressData = await apiClient.courses.getProgress()
      const isCompleted = progressData.some(p => p.lesson_id === lessonId)
      setCompleted(isCompleted)

      if (lessonData?.module_id) {
        // 3. Fetch assignment for this module via API
        const assignData = await apiClient.courses.getModuleAssignments(lessonData.module_id)
        if (assignData.length > 0) {
          setAssignment(assignData[0])

          // 4. Fetch existing submission via API
          const subData = await apiClient.courses.getAssignmentSubmissions()
          const lessonSubmission = subData.find(s => s.assignment_id === assignData[0].id)
          
          setSubmission(lessonSubmission || null)
          if (lessonSubmission) {
            setSubmissionText(lessonSubmission.submission_text || '')
            setSubmissionFile(lessonSubmission.submission_file || null)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching lesson view data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [lessonId, session])

  const handleMarkCompleted = async () => {
    if (completed) return
    setLoading(true)

    try {
      await apiClient.courses.markLessonComplete(lessonId)
      setCompleted(true)
    } catch (err) {
      console.error('Error marking lesson complete:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignment) return
    if (!submissionText.trim() && !rawFile && !submissionFile) {
      setError("Please upload a file or write a submission text (GitHub link/code).")
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      let finalFileUrl = submissionFile

      if (rawFile) {
        const fileExt = submissionFileName.split('.').pop()
        const filePath = `${session.user.id}/${assignment.id}_${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(filePath, rawFile)
        
        if (uploadError) throw uploadError
        
        const { data: publicUrlData } = supabase.storage
          .from('assignments')
          .getPublicUrl(filePath)
          
        finalFileUrl = publicUrlData.publicUrl
      }

      if (submission) {
        // Update existing submission if rejected via API
        const data = await apiClient.courses.submitAssignment(assignment.id, {
          submission_text: submissionText || null,
          submission_file: finalFileUrl || null
        })
        setSubmission(data)
        setSuccess('Assignment updated and resubmitted successfully!')
      } else {
        // Create new submission via API
        const data = await apiClient.courses.submitAssignment(assignment.id, {
          submission_text: submissionText || null,
          submission_file: finalFileUrl || null
        })
        setSubmission(data)
        setSuccess('Assignment submitted successfully!')
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting assignment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <p>Loading lesson...</p>
      </div>
    )
  }

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
          onClick={() => onNavigate('course')} 
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={24} />
        </button>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-blue)', fontWeight: 700, textTransform: 'uppercase' }}>
            Module {lesson?.module?.order_index || 1} • Lesson {lesson?.order_index}
          </span>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
            {lesson?.title}
          </h4>
        </div>
        <button
          onClick={handleDownloadNotes}
          className="btn"
          title="Download Notes"
          style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)' }}
        >
          <Download size={16} /> <span className="hide-on-mobile">Notes</span>
        </button>
      </div>

      <div className="app-content" style={{ backgroundColor: 'var(--bg-secondary)', padding: '20px' }}>
        {/* Workspace Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', gap: '16px' }}>
          <button 
            onClick={() => setActiveWorkspaceTab('text')}
            style={{ 
              background: 'none', border: 'none', padding: '10px 4px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              color: activeWorkspaceTab === 'text' ? 'var(--color-blue)' : 'var(--text-secondary)',
              borderBottom: activeWorkspaceTab === 'text' ? '2.5px solid var(--color-blue)' : '2.5px solid transparent'
            }}
          >
            Lesson Text
          </button>
          <button 
            onClick={() => setActiveWorkspaceTab('sandbox')}
            style={{ 
              background: 'none', border: 'none', padding: '10px 4px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              color: activeWorkspaceTab === 'sandbox' ? 'var(--color-blue)' : 'var(--text-secondary)',
              borderBottom: activeWorkspaceTab === 'sandbox' ? '2.5px solid var(--color-blue)' : '2.5px solid transparent'
            }}
          >
            Practice Sandbox
          </button>
        </div>

        {/* WORKSPACE TAB 1: TEXT */}
        {activeWorkspaceTab === 'text' && (
          <>
            {/* Video Embed */}
            {lesson?.video_url && (
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', boxShadow: 'var(--shadow-md)' }}>
                <iframe 
                  src={lesson.video_url} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                ></iframe>
              </div>
            )}

            {/* Lesson Content Text */}
            <div 
              style={{ 
                fontSize: '0.95rem', 
                color: 'var(--text-primary)', 
                lineHeight: 1.7, 
                whiteSpace: 'pre-line',
                fontFamily: 'var(--font-main)',
                marginBottom: '28px'
              }}
            >
              {lesson?.content}
            </div>
          </>
        )}

        {/* WORKSPACE TAB 2: DATACAMP-STYLE MULTI-LANGUAGE SANDBOX */}
        {activeWorkspaceTab === 'sandbox' && (() => {
          const cId = courseId || 'wd101'
          const isHTML = !['js', 'backend', 'science', 'analytics'].includes(cId)
          const isJS = cId === 'js'
          const isPython = cId === 'backend' || cId === 'science'
          const isSQL = cId === 'analytics'
          const needsTerminal = isJS || isPython || isSQL
          const langLabel = isHTML ? 'HTML/CSS' : isJS ? 'JavaScript' : isPython ? 'Python' : 'SQL'
          const langColor = isHTML ? '#F59E0B' : isJS ? '#F0DB4F' : isPython ? '#3776AB' : '#336791'
          const isRunLoading = (isPython && pyodideLoading) || (isSQL && sqlLoading)

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '28px' }}>
              {/* Editor Header */}
              <div className="code-editor-container">
                <div className="code-editor-header">
                  <div className="dots">
                    <div className="dot dot-red" />
                    <div className="dot dot-yellow" />
                    <div className="dot dot-green" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code2 size={12} />
                    <span style={{ color: langColor, fontWeight: 700 }}>{langLabel}</span>
                    <span>sandbox.{isHTML ? 'html' : isJS ? 'js' : isPython ? 'py' : 'sql'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => setSandboxCode(getSandboxDefaults())}
                      style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <RotateCcw size={10} /> Reset
                    </button>
                    {needsTerminal && (
                      <button
                        className="sandbox-run-btn"
                        onClick={runCode}
                        disabled={isRunLoading}
                      >
                        {isRunLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                        {isRunLoading ? 'Loading...' : 'Run'}
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  className="code-editor-textarea"
                  value={sandboxCode}
                  onChange={(e) => setSandboxCode(e.target.value)}
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const start = e.currentTarget.selectionStart
                      const end = e.currentTarget.selectionEnd
                      const newVal = sandboxCode.substring(0, start) + '  ' + sandboxCode.substring(end)
                      setSandboxCode(newVal)
                      setTimeout(() => e.currentTarget.setSelectionRange(start + 2, start + 2), 0)
                    }
                  }}
                />

                {/* Output area: live preview for HTML, terminal for others */}
                {isHTML ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 14px', backgroundColor: '#1A1A2A', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#28C840' }} />
                        LIVE PREVIEW
                      </span>
                    </div>
                    <div style={{ height: '220px', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                      <iframe
                        title="CodeMe HTML Live Preview"
                        srcDoc={sandboxCode}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        sandbox="allow-scripts"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 14px', backgroundColor: '#1A1A2A', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Terminal size={10} /> OUTPUT
                      </span>
                      {terminalOutput.length > 0 && (
                        <button onClick={() => setTerminalOutput([])} style={{ background: 'none', border: 'none', color: '#6E7681', cursor: 'pointer', fontSize: '0.6rem' }}>Clear</button>
                      )}
                    </div>
                    <div className="code-terminal">
                      {terminalOutput.length === 0 && (
                        <span className="terminal-prompt">
                          {isPython && !pyodideReady ? '> Click "Run" to load Python runtime...' : 
                           isSQL && !sqlReady ? '> Click "Run" to load SQL engine...' :
                           '> Ready. Click Run ▶ to execute.'}
                        </span>
                      )}
                      {terminalOutput.map((line, i) => {
                        if (line.text.startsWith('__TABLE__')) {
                          // Render SQL results as table
                          const tableData = JSON.parse(line.text.replace('__TABLE__', ''))
                          return (
                            <div key={i} style={{ overflowX: 'auto', marginTop: '4px' }}>
                              <table className="sql-results-table">
                                <thead>
                                  <tr>{tableData.cols.map((c: string) => <th key={c}>{c}</th>)}</tr>
                                </thead>
                                <tbody>
                                  {tableData.rows.map((row: any[], ri: number) => (
                                    <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{String(cell)}</td>)}</tr>
                                  ))}
                                </tbody>
                              </table>
                              <p style={{ fontSize: '0.6rem', color: '#6E7681', marginTop: '4px' }}>{tableData.rows.length} row(s) returned</p>
                            </div>
                          )
                        }
                        return (
                          <div key={i} className={`terminal-${line.type}`}>
                            {line.type === 'error' ? '❌ ' : ''}{line.text}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Load runtime hint */}
              {isPython && !pyodideReady && !pyodideLoading && (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(55,118,171,0.1)', border: '1px solid rgba(55,118,171,0.3)', borderRadius: '8px', fontSize: '0.75rem', color: '#93C5FD' }}>
                  💡 Python runs fully in your browser via Pyodide. Click <strong>Run</strong> to load it (first load ~5s).
                </div>
              )}
              {isSQL && !sqlReady && !sqlLoading && (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(51,103,145,0.1)', border: '1px solid rgba(51,103,145,0.3)', borderRadius: '8px', fontSize: '0.75rem', color: '#93C5FD' }}>
                  💡 SQL runs in your browser via sql.js. A "students" practice table is preloaded. Click <strong>Run</strong>.
                </div>
              )}
            </div>
          )
        })()}

        {/* Completed Checkbox */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <button 
            className="btn" 
            onClick={handleMarkCompleted}
            disabled={completed}
            style={{ 
              backgroundColor: completed ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-blue)', 
              color: completed ? 'var(--color-success)' : '#FFFFFF',
              border: completed ? '1.5px solid var(--color-success)' : 'none',
              maxWidth: '240px'
            }}
          >
            {completed ? (
              <>
                <CheckCircle size={18} />
                Completed
              </>
            ) : (
              'Mark Lesson Read'
            )}
          </button>
        </div>

        <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

        {/* Assignment Section (Show only if assignment exists for this module) */}
        {assignment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} style={{ color: 'var(--color-purple)' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Module {lesson?.modules?.order_index} Assignment</h3>
            </div>
            
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '14px', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>{assignment.title}</p>
              <p style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>{assignment.description}</p>
            </div>

            {/* Submission Status Indicator */}
            {submission && (
              <div 
                style={{ 
                  padding: '12px 14px', 
                  borderRadius: '12px', 
                  fontSize: '0.8rem',
                  backgroundColor: 
                    submission.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 
                    submission.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 
                    'rgba(12, 74, 140, 0.08)',
                  border: 
                    submission.status === 'approved' ? '1px solid rgba(16, 185, 129, 0.3)' : 
                    submission.status === 'rejected' ? '1px solid rgba(239, 68, 68, 0.3)' : 
                    '1px solid rgba(12, 74, 140, 0.2)',
                  color: 
                    submission.status === 'approved' ? 'var(--color-success)' : 
                    submission.status === 'rejected' ? 'var(--color-danger)' : 
                    'var(--color-blue)',
                  fontWeight: 500
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>
                    Submission Status: {submission.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                    {submission.graded_at ? new Date(submission.graded_at).toLocaleDateString() : 'Pending'}
                  </span>
                </div>
                {submission.feedback && (
                  <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.75rem', borderLeft: '3px solid', paddingLeft: '8px', fontStyle: 'italic' }}>
                    <strong>Instructor feedback:</strong> "{submission.feedback}"
                  </p>
                )}
                {submission.submission_file && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <a 
                      href={submission.submission_file} 
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.75rem', color: 'var(--color-blue)', fontWeight: 600, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      📥 Download Submitted File
                    </a>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#A7F3D0', padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }}>
                {success}
              </div>
            )}

            {/* Submission Form */}
            {(!submission || submission.status === 'rejected') && (
              <form onSubmit={handleAssignmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="assignmentFile" style={{ fontWeight: 600 }}>UPLOAD DIRECT FILE (.HTML OR .ZIP) - RECOMMENDED</label>
                  <input
                    id="assignmentFile"
                    type="file"
                    accept=".html,.zip"
                    onChange={handleAssignmentFile}
                    style={{ 
                      display: 'block', 
                      width: '100%', 
                      padding: '8px', 
                      border: '1.5px dashed var(--border-color)', 
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-primary)'
                    }}
                  />
                  {submissionFileName && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-blue)', fontWeight: 600, marginTop: '4px', display: 'inline-block' }}>
                      Selected file: {submissionFileName}
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="submissionText">GITHUB LINK OR CODE TEXT (OPTIONAL)</label>
                  <textarea
                    id="submissionText"
                    className="input-field"
                    placeholder="https://github.com/username/project OR paste your HTML code here"
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'var(--font-main)' }}
                  />
                </div>

                {/* Real-time HTML code validator tips */}
                {lintWarnings.length > 0 && (
                  <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {lintWarnings.map((warn, idx) => (
                      <span key={idx} style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 500 }}>{warn}</span>
                    ))}
                  </div>
                )}
                <button type="submit" className="btn btn-primary" disabled={submitting || (!submissionText.trim() && !rawFile)}>
                  {submitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Send size={16} />
                      {submission ? 'Resubmit Assignment' : 'Submit Assignment'}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
      {/* AI Chat Widget — always present in lesson view */}
      <AIChatWidget currentCode={sandboxCode} />
    </div>
  )
}
