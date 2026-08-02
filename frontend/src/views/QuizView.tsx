import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import apiClient from '../apiClient'
import { ChevronLeft, HelpCircle, Check, AlertTriangle, Upload, Eye, Loader2, DollarSign } from 'lucide-react'

const getExplanationForQuestion = (text: string): string => {
  const t = text.toLowerCase()
  if (t.includes('what does html stand for')) {
    return 'HTML stands for HyperText Markup Language. It is the core framework used to define webpage structural templates.'
  }
  if (t.includes('acts as the wrapper')) {
    return 'The <body> tag acts as the parent container holding all visible layout graphics (headings, forms, text, panels).'
  }
  if (t.includes('doctype html')) {
    return 'False. <!DOCTYPE html> is an instruction (or document declaration type) informing browsers that the document is written in HTML5. It is not an HTML tag.'
  }
  if (t.includes('represents the highest importance')) {
    return '<h1> represents the main primary heading of a document, while <h6> has the lowest visual layout hierarchy weight.'
  }
  if (t.includes('designates the target url')) {
    return 'The href (Hypertext Reference) attribute houses the link destination target url.'
  }
  if (t.includes('strong')) {
    return 'True. <strong> is an inline element that formats font layouts (boldface) without breaking paragraphs into new block spaces.'
  }
  if (t.includes('display an image')) {
    return 'The <img> element pulls a media link or asset file to render images inline on the page.'
  }
  if (t.includes('entering passwords securely')) {
    return 'type="password" masks characters dynamically in input boxes, keeping user sessions secure.'
  }
  if (t.includes('img /> element require')) {
    return 'False. <img> is a self-closing (or void) tag. It does not require a closing </img> partner.'
  }
  if (t.includes('table cell data item')) {
    return '<td> stands for "table data" which is used to hold standard cells of rows.'
  }
  if (t.includes('block-level element')) {
    return '<div> is a block-level element. It stacks vertically and occupies 100% of the available layout width by default.'
  }
  if (t.includes('ordered lists')) {
    return 'True. <ol> automatically increments counting values (numbers, letters) alongside nested <li> children.'
  }
  if (t.includes('binds a label element')) {
    return 'The "for" attribute matches the target input control\'s unique "id" attribute to bind them together.'
  }
  if (t.includes('identifies critical, unique')) {
    return 'The <main> semantic layout tag houses the primary content of the page which should not be duplicated across pages.'
  }
  if (t.includes('strictly required for browsers to render')) {
    return 'False. Browsers will still paint layout boxes for poorly structured HTML, but semantic markup is crucial for SEO ranking indexers and screen readers.'
  }
  if (t.includes('inside the document head')) {
    return 'All of them (<meta>, <link>, and <style>) belong in the document head block to load resources, styles, and configurations.'
  }
  if (t.includes('graphics interface rendering client scripting')) {
    return 'The <canvas> element provides scripts with a drawable area to render graphs, animations, and designs.'
  }
  if (t.includes('meta description')) {
    return 'True. Although meta descriptions do not directly shift keyword ranking metrics, they summarize pages to search bots and serve as organic search snippets.'
  }
  return 'Review your syllabus study guides and documentation to master this core HTML programming standard.'
}

interface QuizViewProps {
  session: any
  quizId: string
  onNavigate: (view: string) => void
}

export const QuizView: React.FC<QuizViewProps> = ({ session, quizId, onNavigate }) => {
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [attempts, setAttempts] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  
  // State for exam taking
  const [isBlocked, setIsBlocked] = useState(false)
  const [activeStep, setActiveStep] = useState(0) // 0: Start Screen, 1: Taking Quiz, 2: Result Screen, 3: Payment Upload
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [score, setScore] = useState(0)
  const [passed, setPassed] = useState(false)
  
  // State for payment upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [base64Image, setBase64Image] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      // 1. Fetch quiz via API
      const quizData = await apiClient.courses.getQuiz(quizId)
      setQuiz(quizData)

      // 2. Fetch questions via API (they come with the quiz data)
      setQuestions(quizData.questions || [])

      // 3. Fetch attempts via API
      const attData = await apiClient.courses.getQuizAttempts(quizId)
      const attemptsList = attData || []
      setAttempts(attemptsList)

      // 4. Fetch payments via API
      const paymentsList = await apiClient.payments.getMyPayments(quizId)
      setPayments(paymentsList || [])

      // 5. Evaluate blocks
      const attemptsTaken = attemptsList.length
      const hasPassed = attemptsList.some(a => a.passed)
      const approvedPayments = (paymentsList || []).filter((p: any) => p.status === 'approved').length

      // Max attempts = 1 (free) + 2 * (approved payments)
      const totalAllowedAttempts = 1 + (approvedPayments * 2)

      if (hasPassed) {
        setIsBlocked(false) // Passed already, no block, can view results
      } else if (attemptsTaken >= totalAllowedAttempts) {
        setIsBlocked(true)
      } else {
        setIsBlocked(false)
      }
    } catch (err) {
      console.error('Error fetching quiz data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [quizId, session])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate is image
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file.')
      return
    }

    setSelectedFile(file)
    setBase64Image('') // Clear Base64 when using file upload
    setUploadError(null)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setUploadError('Please select a payment receipt image first.')
      return
    }
    setUploading(true)
    setUploadError(null)

    try {
      // Generate file path: student_id/timestamp_quizId.jpg
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}_${quizId}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`

      // Upload to Supabase Storage (keeps direct call to storage)
      const { error: uploadError } = await supabase
        .storage
        .from('payment_receipts')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Insert database record via API
      await apiClient.payments.submitPayment({
        quiz_id: quizId,
        receipt_file_path: filePath,
        amount: 2000
      })

      setUploadSuccess('Receipt uploaded! Admin will verify and unlock 2 attempts soon. WhatsApp support: 09032517376')
      setSelectedFile(null)
      // Refresh payments state
      fetchData()
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading receipt. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const startQuiz = () => {
    if (isBlocked) {
      setActiveStep(3) // Go to payment
    } else {
      setSelectedAnswers({})
      setCurrentQuestionIdx(0)
      setActiveStep(1)
    }
  }

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: answer
    })
  }

  const submitQuizAnswers = async () => {
    setLoading(true)
    try {
      // Security Check: Re-fetch database attempts & payments count securely
      const attData = await apiClient.courses.getQuizAttempts(quizId)
      
      const { count } = await apiClient.payments.getApprovedCount(quizId)

      const attemptsTaken = attData ? attData.length : 0
      const hasPassed = attData ? attData.some(a => a.passed) : false
      const approvedPayments = count || 0
      const totalAllowedAttempts = 1 + (approvedPayments * 2)

      if (!hasPassed && attemptsTaken >= totalAllowedAttempts) {
        alert("Security Block: You have exceeded the maximum allowed free attempts. Please upload a payment verification receipt to unlock retakes.")
        setIsBlocked(true)
        setActiveStep(3)
        setLoading(false)
        return
      }

      let correctCount = 0
      questions.forEach(q => {
        const userAnswer = selectedAnswers[q.id] || ''
        if (q.question_type === 'fill_blank') {
          // Case-insensitive, trimmed match for fill-in-the-blank
          if (userAnswer.trim().toLowerCase() === (q.blank_answer || q.correct_answer || '').trim().toLowerCase()) {
            correctCount++
          }
        } else {
          if (userAnswer === q.correct_answer) {
            correctCount++
          }
        }
      })

      const finalScore = Math.round((correctCount / questions.length) * 100)
      const didPass = finalScore >= 66 // 2 out of 3 is passing

      // Record attempt via API
      await apiClient.courses.submitQuiz(quizId, {
        answers: selectedAnswers
      })

      setScore(finalScore)
      setPassed(didPass)
      setActiveStep(2) // Go to results
    } catch (err) {
      console.error('Error submitting quiz attempt:', err)
    } finally {
      setLoading(false)
      fetchData() // Refresh details
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <p>Loading exam...</p>
      </div>
    )
  }

  const hasPassedAlready = attempts.some(a => a.passed)
  const currentQuestion = questions[currentQuestionIdx]

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
        <div>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-blue)', fontWeight: 700, textTransform: 'uppercase' }}>
            Module Test
          </span>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
            {quiz?.title || 'Syllabus Quiz'}
          </h4>
        </div>
      </div>

      <div className="app-content">
        
        {/* STEP 0: START SCREEN */}
        {activeStep === 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', padding: '32px 20px' }}>
            <HelpCircle size={48} style={{ color: 'var(--color-purple)' }} />
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Ready for Module Test?</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                You must score at least <strong>66%</strong> (2 out of 3 questions) to pass and unlock the next module.
              </p>
            </div>

            <div 
              style={{ 
                width: '100%', 
                backgroundColor: 'var(--bg-primary)', 
                padding: '14px', 
                borderRadius: '12px', 
                fontSize: '0.8rem', 
                textAlign: 'left',
                border: '1px solid var(--border-color)' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>Status:</span>
                <span style={{ fontWeight: 700, color: hasPassedAlready ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                  {hasPassedAlready ? 'PASSED' : 'NOT PASSED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>Attempts Taken:</span>
                <span>{attempts.length} attempts</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>Attempts Remaining:</span>
                <span style={{ fontWeight: 700, color: isBlocked ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {isBlocked ? '0 (Locked)' : hasPassedAlready ? 'Unlimited practice' : `${1 + (payments.filter(p => p.status === 'approved').length * 2) - attempts.length} left`}
                </span>
              </div>
            </div>

            {isBlocked ? (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '12px', color: 'var(--color-danger)', fontSize: '0.8rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '4px' }}>
                  <AlertTriangle size={18} />
                  <span>Free attempt failed.</span>
                </div>
                Please complete a retake payment of ₦2,000 to unlock 2 additional attempts.
              </div>
            ) : null}

            <button 
              className="btn btn-primary"
              onClick={startQuiz}
            >
              {isBlocked ? 'Unlock Additional Retake' : 'Start Assessment'}
            </button>
          </div>
        )}

        {/* STEP 1: TAKING QUIZ */}
        {activeStep === 1 && currentQuestion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <span>Question {currentQuestionIdx + 1} of {questions.length}</span>
              <div className="progress-container" style={{ width: '100px', height: '6px' }}>
                <div className="progress-bar-fill" style={{ width: `${Math.round(((currentQuestionIdx) / questions.length) * 100)}%` }}></div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{currentQuestion.question_text}</h3>

              {/* Fill-in-the-blank question type */}
              {currentQuestion.question_type === 'fill_blank' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Type your answer below:</p>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Your answer..."
                    value={selectedAnswers[currentQuestion.id] || ''}
                    onChange={e => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    style={{ fontSize: '1rem', padding: '14px 16px' }}
                    autoFocus
                  />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Tip: spelling doesn't need to be exact — capitalisation doesn't matter.</p>
                </div>
              ) : (
                /* MCQ / True-False options */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentQuestion.options && JSON.parse(JSON.stringify(currentQuestion.options)).map((option: string) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === option
                    return (
                      <button
                        key={option}
                        onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid var(--color-blue)' : '1.5px solid var(--border-color)',
                          backgroundColor: isSelected ? 'rgba(12, 74, 140, 0.05)' : 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 600 : 500,
                          fontSize: '0.9rem',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        {option}
                        {isSelected && (
                          <div style={{ backgroundColor: 'var(--color-blue)', color: '#FFFFFF', borderRadius: '50%', padding: '2px' }}>
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              {currentQuestionIdx > 0 && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                  style={{ width: '100px' }}
                >
                  Back
                </button>
              )}
              
              {currentQuestionIdx < questions.length - 1 ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                  disabled={!selectedAnswers[currentQuestion.id]}
                >
                  Next Question
                </button>
              ) : (
                <button 
                  className="btn btn-primary"
                  onClick={submitQuizAnswers}
                  disabled={Object.keys(selectedAnswers).length < questions.length}
                  style={{ backgroundColor: 'var(--color-success)' }}
                >
                  Submit Exam
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: RESULT SCREEN */}
        {activeStep === 2 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', padding: '32px 20px' }}>
            {passed ? (
              <Check size={48} style={{ color: 'var(--color-success)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '50%', width: '72px', height: '72px' }} />
            ) : (
              <AlertTriangle size={48} style={{ color: 'var(--color-danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '50%', width: '72px', height: '72px' }} />
            )}

            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {passed ? 'You Passed!' : 'Exam Failed'}
              </h2>
              <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: '8px 0', color: passed ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {score}%
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {passed 
                  ? 'Excellent job! You have fully unlocked the next module in your roadmap.' 
                  : 'You scored below the 66% passing grade. Go back, review lessons, and try again.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '12px' }}>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setActiveStep(4) // Move to review step
                }}
              >
                Review Exam Questions
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setActiveStep(0)
                  fetchData()
                }}
              >
                Close Results
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT SCREEN (Blocked) */}
        {activeStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DollarSign size={24} style={{ color: 'var(--color-purple)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Retake Exam Payment</h3>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Please perform a manual bank transfer of <strong>₦2,000</strong> to the account below. After completing the payment, upload a screenshot of your transaction receipt for approval.
              </p>

              <div 
                style={{ 
                  backgroundColor: 'var(--bg-primary)', 
                  border: '1.5px solid var(--border-color)', 
                  borderRadius: '12px', 
                  padding: '14px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, display: 'block' }}>BANK NAME</span>
                  <strong style={{ color: 'var(--text-primary)' }}>Moniepoint</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, display: 'block' }}>ACCOUNT NUMBER</span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>09032517376</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, display: 'block' }}>ACCOUNT HOLDER</span>
                  <strong style={{ color: 'var(--text-primary)' }}>Olamide Abdulmuiz Olanrewaju</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, display: 'block' }}>AMOUNT</span>
                  <strong style={{ color: 'var(--color-blue)' }}>₦2,000</strong>
                </div>
              </div>
            </div>

            {uploadError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }}>
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#A7F3D0', padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }}>
                {uploadSuccess}
              </div>
            )}

            {/* Receipt Form */}
            {!uploadSuccess && (
              <form onSubmit={handlePaymentSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Upload Payment Receipt</h4>
                
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  />
                  {base64Image ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Eye size={28} style={{ color: 'var(--color-blue)' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Image loaded! Tap to change</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Upload size={28} style={{ color: 'var(--text-tertiary)' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select screenshot / receipt image</span>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={uploading || !base64Image}
                >
                  {uploading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Receipt for Verification'}
                </button>
              </form>
            )}

            <button 
              className="btn btn-secondary"
              onClick={() => {
                setActiveStep(0)
                fetchData()
              }}
            >
              Back to Start
            </button>
          </div>
        )}

        {/* STEP 4: QUIZ EXAM QUESTIONS REVIEW */}
        {activeStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Exam Review</h3>
              <span className="badge badge-purple">{score}% Score</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {questions.map((q, idx) => {
                const studentAnswer = selectedAnswers[q.id]
                const isCorrect = studentAnswer === q.correct_answer
                const optionsList = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]')
                
                return (
                  <div key={q.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-blue)', fontWeight: 700 }}>QUESTION {idx + 1}</span>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{q.question_text}</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                      {optionsList.map((opt: string) => {
                        const isStudentChoice = studentAnswer === opt
                        const isCorrectAnswer = q.correct_answer === opt
                        
                        let borderStyle = '1px solid var(--border-color)'
                        let bgStyle = 'transparent'
                        let textColor = 'var(--text-primary)'
                        
                        if (isCorrectAnswer) {
                          borderStyle = '1.5px solid var(--color-success)'
                          bgStyle = 'rgba(16, 185, 129, 0.08)'
                          textColor = 'var(--color-success)'
                        } else if (isStudentChoice && !isCorrect) {
                          borderStyle = '1.5px solid var(--color-danger)'
                          bgStyle = 'rgba(239, 68, 68, 0.08)'
                          textColor = 'var(--color-danger)'
                        }
                        
                        return (
                          <div 
                            key={opt}
                            style={{ 
                              padding: '10px 12px', 
                              borderRadius: '8px', 
                              border: borderStyle, 
                              backgroundColor: bgStyle,
                              color: textColor,
                              fontSize: '0.8rem',
                              fontWeight: isStudentChoice || isCorrectAnswer ? 600 : 500
                            }}
                          >
                            <span style={{ marginRight: '6px' }}>
                              {isCorrectAnswer ? '✅' : isStudentChoice ? '❌' : '○'}
                            </span>
                            {opt}
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '8px', fontSize: '0.75rem', borderLeft: '3px solid var(--color-blue)', marginTop: '6px', color: 'var(--text-secondary)' }}>
                      <strong>💡 Explanatory Tip:</strong> {getExplanationForQuestion(q.question_text)}
                    </div>
                  </div>
                )
              })}
            </div>

            <button 
              className="btn btn-primary"
              onClick={() => {
                setActiveStep(0)
                fetchData()
              }}
            >
              Back to Start
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
