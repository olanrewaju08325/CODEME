import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import apiClient from '../apiClient'
import { BarChart2, CheckSquare, CreditCard, Users, BookOpen, Volume2, Search, ArrowLeft, Loader2, Eye, ShieldAlert, LogOut, MessageCircle, UserCheck, UserX, UserPlus, Key, Settings, Award } from 'lucide-react'
import { ContentManager } from './ContentManager'

interface AdminPortalProps {
  session: any
  onSignOut: () => void
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ session, onSignOut }) => {
  const [role, setRole] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('analytics')
  const [loading, setLoading] = useState(true)

  // Analytics states
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    activeWD101: 0,
    pendingPayments: 0,
    pendingGrading: 0
  })

  // Data queues
  const [gradingQueue, setGradingQueue] = useState<any[]>([])
  const [paymentsQueue, setPaymentsQueue] = useState<any[]>([])
  const [studentsList, setStudentsList] = useState<any[]>([])
  const [announcementsList, setAnnouncementsList] = useState<any[]>([])
  const [forumQueue, setForumQueue] = useState<any[]>([])
  const [modulesList, setModulesList] = useState<any[]>([])
  const [enrollmentApplications, setEnrollmentApplications] = useState<any[]>([])
  
  const [waitlistQueue, setWaitlistQueue] = useState<any[]>([])
  const [courseCapacities, setCourseCapacities] = useState<any[]>([])
  const [newPasswordVal, setNewPasswordVal] = useState('')

  // Create student account from admin
  const [newStudentEmail, setNewStudentEmail] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentPassword, setNewStudentPassword] = useState('')
  const [newStudentCourse, setNewStudentCourse] = useState('wd101')
  const [createAccountLoading, setCreateAccountLoading] = useState(false)
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null)

  const fetchEnrollmentApplications = async () => {
    try {
      const data = await apiClient.admin.getEnrollmentApplications()
      setEnrollmentApplications(data || [])
    } catch (e) { console.error(e) }
  }

  const handleApproveApplication = async (app: any) => {
    setActionLoading(true)
    setMessage(null)
    try {
      // Auto-generate a strong temporary password
      const tempPassword = 'Cdm@' + Math.random().toString(36).slice(2, 8).toUpperCase()
      const data = await apiClient.admin.createStudentAccount({
        email: app.email,
        password: tempPassword,
        full_name: app.full_name,
        course_id: app.course_id || 'wd101'
      })
      // Mark application as approved
      await apiClient.admin.updateEnrollmentApplication(app.id, { status: 'approved' })
      setMessage({ type: 'success', text: `✅ Account created! Student ID: ${data.student_id}. Temp password: ${tempPassword} — Send this to ${app.email} / ${app.phone}` })
      fetchEnrollmentApplications()
      fetchAnalytics()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error creating account' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectApplication = async (id: string) => {
    setActionLoading(true)
    try {
      await apiClient.admin.updateEnrollmentApplication(id, { status: 'rejected' })
      setMessage({ type: 'success', text: 'Application rejected.' })
      fetchEnrollmentApplications()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateStudentAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateAccountLoading(true)
    setMessage(null)
    try {
      const data = await apiClient.admin.createStudentAccount({
        email: newStudentEmail,
        password: newStudentPassword,
        full_name: newStudentName,
        course_id: newStudentCourse
      })
      setCreatedStudentId(data.student_id)
      setMessage({ type: 'success', text: `Account created! Student ID: ${data.student_id}` })
      setNewStudentEmail('')
      setNewStudentName('')
      setNewStudentPassword('')
      fetchAnalytics()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setCreateAccountLoading(false)
    }
  }

  const fetchWaitlistData = async () => {
    try {
      const waitlistData = await apiClient.admin.getWaitlist()
      setWaitlistQueue(waitlistData.waitlist || waitlistData || [])

      if (waitlistData.course_capacities) {
        setCourseCapacities(Object.entries(waitlistData.course_capacities).map(([id, cap]: any) => ({ course_id: id, ...cap })))
      } else {
        try {
          const capacities = await apiClient.admin.getCourseCapacities()
          setCourseCapacities(capacities || [])
        } catch (_) {}
      }
    } catch (e) {
      console.error('Error fetching waitlist data:', e)
    }
  }

  const handlePromoteStudent = async (enrollmentId: string, targetBatch: number) => {
    setActionLoading(true)
    setMessage(null)
    try {
      await apiClient.admin.promoteStudent(enrollmentId, targetBatch)
      setMessage({ type: 'success', text: `Student successfully promoted to Batch ${targetBatch}!` })
      fetchWaitlistData()
      fetchAnalytics()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error promoting student' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleAdminResetPassword = async (email: string) => {
    if (!email) {
      setMessage({ type: 'error', text: 'Student email is not registered.' })
      return
    }
    if (!newPasswordVal.trim()) return
    setActionLoading(true)
    setMessage(null)
    try {
      const data = await apiClient.admin.resetPassword(email, newPasswordVal)
      if (data) {
        setMessage({ type: 'success', text: 'Student password reset successfully!' })
        setNewPasswordVal('')
      } else {
        setMessage({ type: 'error', text: 'Failed to reset password. Check email match.' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error resetting password' })
    } finally {
      setActionLoading(false)
    }
  }

  // Promote / Demote a student to teacher role
  const handleSetRole = async (profileId: string, newRole: 'teacher' | 'student') => {
    setActionLoading(true)
    setMessage(null)
    try {
      await apiClient.admin.updateUserRole(profileId, newRole)
      setMessage({ type: 'success', text: `User role updated to ${newRole.toUpperCase()} successfully!` })
      setSelectedStudent((prev: any) => prev ? { ...prev, role: newRole } : prev)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error updating role' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleFlagAI = async (id: string, isFlagged: boolean) => {
    try {
      await apiClient.admin.updateAssignmentSubmission(id, { is_ai_flagged: isFlagged })
      fetchQueues()
      setMessage({ type: 'success', text: isFlagged ? 'Submission flagged for suspected AI!' : 'AI flag removed.' })
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
  }

  // Search/Filter states
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [studentHistory, setStudentHistory] = useState<any>({ progress: [], attempts: [], certificates: [] })

  // Cert Templates State
  const [certTemplates, setCertTemplates] = useState<any[]>([])
  const [certForm, setCertForm] = useState({ course_id: '', template_name: '', primary_color: '#0C4A8C', signatory_name: 'Olamide A.O' })
  const [courses, setCourses] = useState<any[]>([])
  const [showCertTemplateModal, setShowCertTemplateModal] = useState(false)
  const [certTemplateForm, setCertTemplateForm] = useState<any>(null)

  const fetchCertTemplates = async () => {
    try {
      const { data } = await supabase.from('certificate_templates').select('*, courses(title)')
      setCertTemplates(data || [])
      const { data: coursesData } = await supabase.from('courses').select('id, title').order('id')
      setCourses(coursesData || [])
    } catch(e) { console.error(e) }
  }

  const handleSaveCertTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!certForm.course_id || !certForm.template_name) return
    setActionLoading(true)
    setMessage(null)
    try {
      await apiClient.admin.upsertCertificateTemplate(certForm)
      setMessage({ type: 'success', text: 'Certificate template saved!' })
      fetchCertTemplates()
    } catch(e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'certificates') {
      fetchCertTemplates()
    }
  }, [activeTab])

  // Modal / Form states
  const [feedbackText, setFeedbackText] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [announcementText, setAnnouncementText] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null) // Holds payment ID to reject

  // Content form states
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonContent, setLessonContent] = useState('')
  const [lessonVideo, setLessonVideo] = useState('')
  const [lessonOrder, setLessonOrder] = useState('1')
  
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const verifyRole = async () => {
    try {
      const profile = await apiClient.auth.getProfile()
      if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
        setRole('student')
      } else {
        setRole(profile.role)
      }
    } catch (e) {
      setRole('student')
    }
  }

  const fetchAnalytics = async () => {
    try {
      const analytics = await apiClient.admin.getAnalytics()
      setMetrics({
        totalStudents: analytics.total_students || 0,
        activeWD101: analytics.active_wd101 || 0,
        pendingPayments: analytics.pending_payments || 0,
        pendingGrading: analytics.pending_grading || 0
      })
    } catch (e) {
      console.error(e)
    }
  }

  const fetchQueues = async () => {
    try {
      // Fetch grading queue via API
      const gradData = await apiClient.admin.getPendingGrading()
      setGradingQueue(gradData || [])

      // Fetch payment queue via API
      const payData = await apiClient.admin.getPendingPayments()
      
      // Generate signed URLs for receipt images
      const paymentsWithUrls = await Promise.all(
        (payData || []).map(async (payment: any) => {
          let signedUrl = null
          if (payment.receipt_file_path) {
            // Generate signed URL for new Storage-based receipts
            const { data: { signedUrl: url } } = await supabase
              .storage
              .from('payment_receipts')
              .createSignedUrl(payment.receipt_file_path, 60) // 60 second expiry
            signedUrl = url
          } else if (payment.receipt_url && payment.receipt_url.startsWith('data:image')) {
            // Legacy Base64 receipts
            signedUrl = payment.receipt_url
          }
          return { ...payment, signedUrl }
        })
      )
      setPaymentsQueue(paymentsWithUrls || [])

      // Fetch announcements via API
      const annData = await apiClient.announcements.getAll()
      setAnnouncementsList(annData || [])

      // Fetch forum held posts via API
      const forumData = await apiClient.admin.getHeldForumPosts()
      setForumQueue(forumData || [])

      // Fetch modules for syllabus assignment via API
      const modData = await apiClient.courses.getCourseModules('wd101')
      setModulesList(modData || [])
      if (modData && modData.length > 0) {
        setSelectedModuleId(modData[0].id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      await verifyRole()
    }
    initialize()
  }, [session])

  useEffect(() => {
    if (role === 'admin' || role === 'teacher') {
      fetchAnalytics()
      fetchQueues()
      fetchWaitlistData()
      setLoading(false)
    } else if (role === 'student') {
      setLoading(false)
    }
  }, [role, activeTab])

  const handleGradeSubmission = async (id: string, status: 'approved' | 'rejected') => {
    setActionLoading(true)
    setMessage(null)
    try {
      await apiClient.admin.gradeAssignment(id, {
        status,
        feedback: feedbackText
      })
      setMessage({ type: 'success', text: `Submission marked as ${status.toUpperCase()}!` })
      setFeedbackText('')
      fetchQueues()
      fetchAnalytics()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error grading assignment' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprovePayment = async (id: string) => {
    setActionLoading(true)
    setMessage(null)
    try {
      await apiClient.admin.updatePayment(id, { status: 'approved' })
      setMessage({ type: 'success', text: 'Payment approved! Student retakes unlocked.' })
      fetchQueues()
      fetchAnalytics()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error approving payment' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectPayment = async () => {
    if (!showRejectModal || !rejectReason.trim()) return
    setActionLoading(true)
    setMessage(null)
    try {
      await apiClient.admin.updatePayment(showRejectModal!, {
        status: 'rejected',
        rejection_reason: rejectReason
      })
      setMessage({ type: 'success', text: 'Payment receipt rejected.' })
      setRejectReason('')
      setShowRejectModal(null)
      fetchQueues()
      fetchAnalytics()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error rejecting payment' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleModeratePost = async (id: string, action: 'approve' | 'delete') => {
    setActionLoading(true)
    setMessage(null)
    try {
      if (action === 'approve') {
        await apiClient.admin.moderateForumPost(id, { status: 'approved' })
        setMessage({ type: 'success', text: 'Post approved.' })
      } else {
        await apiClient.admin.deleteForumPost(id)
        setMessage({ type: 'success', text: 'Post deleted.' })
      }
      fetchQueues()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!announcementText.trim()) return
    setActionLoading(true)
    setMessage(null)
    try {
      await apiClient.announcements.create({ content: announcementText })
      setMessage({ type: 'success', text: 'Announcement broadcasted!' })
      setAnnouncementText('')
      fetchQueues()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error creating announcement' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonTitle.trim() || !lessonContent.trim() || !selectedModuleId) return
    setActionLoading(true)
    setMessage(null)
    try {
      await apiClient.admin.createLesson({
        module_id: selectedModuleId,
        title: lessonTitle,
        content: lessonContent,
        video_url: lessonVideo.trim() || null,
        order_index: parseInt(lessonOrder) || 1
      })
      setMessage({ type: 'success', text: 'Lesson added successfully!' })
      setLessonTitle('')
      setLessonContent('')
      setLessonVideo('')
      setLessonOrder('1')
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error inserting lesson' })
    } finally {
      setActionLoading(false)
    }
  }

  const searchStudents = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentSearch.trim()) return
    setLoading(true)
    try {
      const data = await apiClient.admin.searchStudents(studentSearch)
      setStudentsList(data || [])
      setSelectedStudent(null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentHistory = async (studentId: string) => {
    try {
      const progress = await apiClient.courses.getProgress()
      const attempts = await apiClient.courses.getQuizAttempts()
      const certs = await apiClient.certificates.getUserCertificates()

      setStudentHistory({
        progress: progress.filter(p => p.student_id === studentId) || [],
        attempts: attempts.filter(a => a.student_id === studentId) || [],
        certificates: certs.filter(c => c.student_id === studentId) || []
      })
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="splash-container">
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-cyan)' }} />
        <p>Verifying Access Rights...</p>
      </div>
    )
  }

  if (role === 'student') {
    return (
      <div className="full-screen-view theme-dark" style={{ background: '#07060D', color: '#FFFFFF', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <ShieldAlert size={64} style={{ color: 'var(--color-danger)' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '300px' }}>
          This area is restricted to administrators and teachers only. Student accounts are unauthorized.
        </p>
        <button className="btn btn-primary" onClick={() => window.location.hash = ''} style={{ maxWidth: '200px' }}>
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>
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
          <img src="/codeme.jpg" alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>CodeMe Special</h4>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-purple)', fontWeight: 700, textTransform: 'uppercase' }}>
              {role.toUpperCase()} PORTAL
            </span>
          </div>
        </div>

        <button 
          onClick={onSignOut} 
          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Responsive Horizontal Menu Tabs for Mobile */}
      <div 
        style={{ 
          display: 'flex', 
          backgroundColor: 'var(--bg-secondary)', 
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          padding: '8px 12px',
          gap: '8px',
          scrollbarWidth: 'none'
        }}
      >
        <button 
          onClick={() => { setActiveTab('analytics'); setMessage(null); }}
          className="badge" 
          style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'analytics' ? 'var(--color-blue)' : 'var(--bg-primary)', color: activeTab === 'analytics' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
        >
          <BarChart2 size={14} style={{ marginRight: '6px' }} />
          Analytics
        </button>

        <button 
          onClick={() => { setActiveTab('grading'); setMessage(null); }}
          className="badge" 
          style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'grading' ? 'var(--color-blue)' : 'var(--bg-primary)', color: activeTab === 'grading' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
        >
          <CheckSquare size={14} style={{ marginRight: '6px' }} />
          Projects ({metrics.pendingGrading})
        </button>

        {role === 'admin' && (
          <button 
            onClick={() => { setActiveTab('payments'); setMessage(null); }}
            className="badge" 
            style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'payments' ? 'var(--color-blue)' : 'var(--bg-primary)', color: activeTab === 'payments' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
          >
            <CreditCard size={14} style={{ marginRight: '6px' }} />
            Payments ({metrics.pendingPayments})
          </button>
        )}

        <button 
          onClick={() => { setActiveTab('students'); setMessage(null); }}
          className="badge" 
          style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'students' ? 'var(--color-blue)' : 'var(--bg-primary)', color: activeTab === 'students' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
        >
          <Users size={14} style={{ marginRight: '6px' }} />
          Students
        </button>

        <button 
          onClick={() => { setActiveTab('content'); setMessage(null); }}
          className="badge" 
          style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'content' ? 'var(--color-blue)' : 'var(--bg-primary)', color: activeTab === 'content' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
        >
          <BookOpen size={14} style={{ marginRight: '6px' }} />
          Curriculum
        </button>

        <button 
          onClick={() => { setActiveTab('announcements'); setMessage(null); }}
          className="badge" 
          style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'announcements' ? 'var(--color-blue)' : 'var(--bg-primary)', color: activeTab === 'announcements' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
        >
          <Volume2 size={14} style={{ marginRight: '6px' }} />
          Announce
        </button>

        <button 
          onClick={() => { setActiveTab('forum'); setMessage(null); }}
          className="badge" 
          style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'forum' ? 'var(--color-blue)' : 'var(--bg-primary)', color: activeTab === 'forum' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
        >
          <MessageCircle size={14} style={{ marginRight: '6px' }} />
          Forum Mod ({forumQueue.length})
        </button>

        {role === 'admin' && (
          <button 
            onClick={() => { setActiveTab('waitlist'); setMessage(null); }}
            className="badge" 
            style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'waitlist' ? 'var(--color-blue)' : 'var(--bg-primary)', color: activeTab === 'waitlist' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
          >
            <Users size={14} style={{ marginRight: '6px' }} />
            Waitlist ({waitlistQueue.length})
          </button>
        )}

        {role === 'admin' && (
          <button 
            onClick={() => { setActiveTab('applications'); setMessage(null); fetchEnrollmentApplications(); }}
            className="badge" 
            style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'applications' ? 'var(--color-purple)' : 'var(--bg-primary)', color: activeTab === 'applications' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
          >
            <UserPlus size={14} style={{ marginRight: '6px' }} />
            Applications ({enrollmentApplications.filter(a => a.status === 'pending').length})
          </button>
        )}

        {role === 'admin' && (
          <button 
            onClick={() => { setActiveTab('certificates'); setMessage(null); }}
            className="badge" 
            style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'certificates' ? 'var(--color-purple)' : 'var(--bg-primary)', color: activeTab === 'certificates' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
          >
            <Award size={14} style={{ marginRight: '6px' }} />
            Cert Templates
          </button>
        )}

        {role === 'admin' && (
          <button 
            onClick={() => { setActiveTab('teachers'); setMessage(null); }}
            className="badge" 
            style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'teachers' ? 'var(--color-blue)' : 'var(--bg-primary)', color: activeTab === 'teachers' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
          >
            <UserCheck size={14} style={{ marginRight: '6px' }} />
            Instructors
          </button>
        )}

        {role === 'admin' && (
          <button 
            onClick={() => { setActiveTab('enterprise'); setMessage(null); }}
            className="badge" 
            style={{ border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'enterprise' ? '#10B981' : 'var(--bg-primary)', color: activeTab === 'enterprise' ? '#FFFFFF' : 'var(--text-secondary)', padding: '8px 14px' }}
          >
            <Settings size={14} style={{ marginRight: '6px' }} />
            Enterprise
          </button>
        )}
      </div>

      {/* Main Panel Workspaces */}
      <div className="app-content" style={{ padding: '16px' }}>

        {message && (
          <div 
            style={{ 
              padding: '12px 16px', 
              borderRadius: '12px', 
              fontSize: '0.85rem',
              backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              color: message.type === 'success' ? '#065F46' : '#991B1B',
              border: message.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FCA5A5',
              marginBottom: '16px'
            }}
          >
            {message.text}
          </div>
        )}

        {/* 1. ANALYTICS VIEW */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.25rem', fontWeight: 800 }}>Overview Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="card">
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL STUDENTS</span>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '4px' }}>{metrics.totalStudents}</h1>
              </div>
              <div className="card">
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>WD101 ENROLLMENTS</span>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-blue)', marginTop: '4px' }}>{metrics.activeWD101}</h1>
              </div>
              <div className="card">
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>UNGRADED PROJECTS</span>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-purple)', marginTop: '4px' }}>{metrics.pendingGrading}</h1>
              </div>
              <div className="card">
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PENDING RETAKES</span>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-cyan)', marginTop: '4px' }}>{metrics.pendingPayments}</h1>
              </div>
            </div>
            
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Nigeria Intake Batches</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Each batch is capped at 25 students. Newly registered students route to next batches.</p>
            </div>
          </div>
        )}

        {/* 2. GRADING QUEUE */}
        {activeTab === 'grading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.25rem', fontWeight: 800 }}>Project Submission Reviews</h3>
            {gradingQueue.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No pending assignments to grade.</div>
            ) : (
              gradingQueue.map(sub => (
                <div key={sub.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{sub.profiles?.full_name || 'Anonymous'}</h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {sub.profiles?.student_id || 'N/A'}</span>
                    </div>
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                      M{sub.assignments?.modules?.order_index || 1}
                    </span>
                  </div>
                  
                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Assignment: {sub.assignments?.title}</p>
                    {sub.submission_text && (
                      <p style={{ fontFamily: '"Courier New", Courier, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: '8px' }}>{sub.submission_text}</p>
                    )}
                    {sub.submission_file && (
                      <div style={{ marginTop: '8px', padding: '6px 0', borderTop: '1px solid var(--border-color)' }}>
                        <a 
                          href={sub.submission_file} 
                          download={sub.submission_file.startsWith('data:text/html') ? 'student_project.html' : 'student_project.zip'}
                          style={{ fontSize: '0.75rem', color: 'var(--color-blue)', fontWeight: 600, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          📥 Download Submitted File
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Feedback field */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>FEEDBACK NOTES</label>
                    <textarea 
                      className="input-field" 
                      placeholder="Write feedback remarks for the student..." 
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      style={{ minHeight: '60px', padding: '8px', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                      className="btn" 
                      onClick={() => handleGradeSubmission(sub.id, 'approved')}
                      disabled={actionLoading}
                      style={{ backgroundColor: 'var(--color-success)', color: '#FFFFFF', padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {actionLoading ? <Loader2 className="animate-spin" size={14} /> : 'Approve & Grade'}
                    </button>
                    <button 
                      className="btn" 
                      onClick={() => handleGradeSubmission(sub.id, 'rejected')}
                      disabled={actionLoading}
                      style={{ backgroundColor: 'var(--color-danger)', color: '#FFFFFF', padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Reject (Resubmit)
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleFlagAI(sub.id, !sub.is_ai_flagged)}
                      className="btn"
                      style={{ 
                        padding: '8px 12px', 
                        fontSize: '0.8rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '4px',
                        backgroundColor: sub.is_ai_flagged ? 'var(--color-danger)' : 'var(--bg-primary)',
                        color: sub.is_ai_flagged ? '#FFFFFF' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }}
                    >
                      <ShieldAlert size={14} />
                      {sub.is_ai_flagged ? 'Suspected AI (Flagged)' : 'Flag suspected AI'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. PAYMENT VERIFICATION QUEUE */}
        {activeTab === 'payments' && role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.25rem', fontWeight: 800 }}>Pending Payment verifications</h3>
            {paymentsQueue.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No pending bank payments in queue.</div>
            ) : (
              paymentsQueue.map(p => (
                <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{p.profiles?.full_name || 'Anonymous'}</h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {p.profiles?.student_id || 'N/A'}</span>
                    </div>
                    <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>₦{p.amount}</span>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Target Exam: {p.quizzes?.title}</p>
                  
                  {/* Image render */}
                  <div style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedReceipt(p.signedUrl)}
                      className="btn btn-secondary"
                      style={{ padding: '8px', fontSize: '0.75rem', gap: '6px' }}
                      disabled={!p.signedUrl}
                    >
                      <Eye size={14} /> View Receipt Screen
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn" 
                      onClick={() => handleApprovePayment(p.id)}
                      disabled={actionLoading}
                      style={{ backgroundColor: 'var(--color-success)', color: '#FFFFFF', padding: '8px', fontSize: '0.8rem' }}
                    >
                      Approve Transfer
                    </button>
                    <button 
                      className="btn" 
                      onClick={() => setShowRejectModal(p.id)}
                      disabled={actionLoading}
                      style={{ backgroundColor: 'var(--color-danger)', color: '#FFFFFF', padding: '8px', fontSize: '0.8rem' }}
                    >
                      Reject Transfer
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Receipt Modal Overlay */}
            {selectedReceipt && (
              <div 
                onClick={() => setSelectedReceipt(null)}
                style={{ 
                  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
                  backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}
              >
                <img 
                  src={selectedReceipt} 
                  alt="Payment Receipt" 
                  style={{ maxWidth: '100%', maxHeight: '80%', borderRadius: '8px', objectFit: 'contain' }}
                />
              </div>
            )}

            {/* Reject Payment Reason Modal */}
            {showRejectModal && (
              <div 
                style={{ 
                  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
                  backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}
              >
                <div className="card" style={{ width: '100%', maxWidth: '320px', backgroundColor: 'var(--bg-secondary)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Enter Rejection Reason</h4>
                  <textarea 
                    className="input-field" 
                    placeholder="e.g. Reference missing / incomplete transfer amount" 
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    style={{ minHeight: '80px', fontSize: '0.8rem' }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={handleRejectPayment}
                      className="btn"
                      style={{ backgroundColor: 'var(--color-danger)', color: '#FFFFFF', padding: '8px' }}
                    >
                      Submit Reject
                    </button>
                    <button 
                      onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                      className="btn btn-secondary"
                      style={{ padding: '8px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. STUDENT MANAGEMENT */}
        {activeTab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.25rem', fontWeight: 800 }}>Student Management</h3>
            
            <form onSubmit={searchStudents} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Search by ID or name..." 
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{ paddingLeft: '38px', height: '42px', minHeight: '42px' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '80px', height: '42px', minHeight: '42px', padding: 0 }}>Search</button>
            </form>

            {/* Results */}
            {!selectedStudent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {studentsList.map(st => (
                  <div 
                    key={st.id} 
                    onClick={() => {
                      setSelectedStudent(st)
                      fetchStudentHistory(st.id)
                    }}
                    className="card" 
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{st.full_name}</h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {st.student_id}</span>
                    </div>
                    <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>View Files</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Detail student history view */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  className="btn btn-secondary" 
                  style={{ gap: '6px', padding: '8px', fontSize: '0.75rem', maxWidth: '100px' }}
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="card" style={{ background: 'linear-gradient(135deg, var(--color-blue) 0%, rgba(139, 47, 166, 0.7) 100%)', color: '#FFFFFF', border: 'none' }}>
                  <h3 style={{ color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 800 }}>{selectedStudent.full_name}</h3>
                  <p style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '2px' }}>Student ID: {selectedStudent.student_id}</p>
                  <p style={{ fontSize: '0.75rem', opacity: 0.9 }}>Created: {new Date(selectedStudent.created_at).toLocaleDateString()}</p>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Academic Performance</h4>
                  
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Lessons Read ({studentHistory.progress.length}/12)</span>
                    <div className="progress-container" style={{ height: '6px', marginTop: '4px' }}>
                      <div className="progress-bar-fill" style={{ width: `${Math.round((studentHistory.progress.length / 12) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Exam Retake Attempts</span>
                    {studentHistory.attempts.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>No exams attempted yet.</p>
                    ) : (
                      studentHistory.attempts.map((att: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderBottom: '1px solid var(--border-color)', padding: '4px 0' }}>
                          <span>{att.quizzes?.title}</span>
                          <span style={{ color: att.passed ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 }}>
                            {att.score}% ({att.passed ? 'Passed' : 'Failed'})
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Certificates Issued</span>
                    {studentHistory.certificates.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>No certificates generated.</p>
                    ) : (
                      studentHistory.certificates.map((cert: any, idx: number) => (
                        <div key={idx} className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                          HTML Complete: {cert.certificate_code}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--color-danger)', marginTop: '8px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-danger)' }}>Danger Zone: Reset Student Password</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      This overrides the student's encrypted login credentials. Hand the new password directly to the student.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '0.7rem' }}>NEW PASSWORD</label>
                        <input 
                          type="password" 
                          className="input-field" 
                          placeholder="e.g. Pass123!" 
                          value={newPasswordVal}
                          onChange={(e) => setNewPasswordVal(e.target.value)}
                          style={{ height: '36px', minHeight: '36px', padding: '8px', fontSize: '0.8rem' }}
                        />
                      </div>
                      <button 
                        onClick={() => handleAdminResetPassword(selectedStudent.email)}
                        className="btn"
                        style={{ backgroundColor: 'var(--color-danger)', color: '#FFFFFF', height: '36px', minHeight: '36px', padding: '0 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                        disabled={actionLoading || !newPasswordVal.trim()}
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Management — Admin Only */}
                {role === 'admin' && (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--color-purple)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-purple)' }}>⚡ Staff Role Management</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Current Role: <strong>{selectedStudent.role || 'student'}</strong>. Promoting to Teacher grants Admin Portal access.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {(!selectedStudent.role || selectedStudent.role === 'student') ? (
                        <button
                          onClick={() => handleSetRole(selectedStudent.id, 'teacher')}
                          className="btn"
                          style={{ backgroundColor: 'var(--color-purple)', color: '#FFFFFF', padding: '8px 14px', fontSize: '0.8rem', cursor: 'pointer' }}
                          disabled={actionLoading}
                        >
                          ⬆️ Promote to Teacher
                        </button>
                      ) : selectedStudent.role === 'teacher' ? (
                        <>
                          <span className="badge badge-purple" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>✦ Currently a Teacher</span>
                          <button
                            onClick={() => handleSetRole(selectedStudent.id, 'student')}
                            className="btn btn-secondary"
                            style={{ padding: '8px 14px', fontSize: '0.8rem', cursor: 'pointer' }}
                            disabled={actionLoading}
                          >
                            ⬇️ Demote to Student
                          </button>
                        </>
                      ) : (
                        <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>Admin — Cannot Change</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. CONTENT MANAGEMENT */}
        {activeTab === 'content' && (
          <ContentManager />
        )}

        {/* 5.5 FORUM MODERATION */}
        {activeTab === 'forum' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.25rem', fontWeight: 800 }}>Forum Moderation Queue</h3>
            {forumQueue.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No posts held for moderation.</div>
            ) : (
              forumQueue.map(post => (
                <div key={post.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{post.profiles?.full_name || 'Anonymous'}</h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {post.profiles?.student_id || 'N/A'}</span>
                    </div>
                    <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>HELD (Auto-Flagged)</span>
                  </div>
                  
                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <h5 style={{ fontWeight: 700, marginBottom: '6px' }}>{post.title}</h5>
                    <p style={{ fontFamily: 'var(--font-main)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{post.content}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                      className="btn" 
                      onClick={() => handleModeratePost(post.id, 'approve')}
                      disabled={actionLoading}
                      style={{ backgroundColor: 'var(--color-success)', color: '#FFFFFF', padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {actionLoading ? <Loader2 className="animate-spin" size={14} /> : 'Approve Post'}
                    </button>
                    <button 
                      className="btn" 
                      onClick={() => handleModeratePost(post.id, 'delete')}
                      disabled={actionLoading}
                      style={{ backgroundColor: 'var(--color-danger)', color: '#FFFFFF', padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Delete (Ban Term)
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 6. ANNOUNCEMENT BROADCASTER */}
        {activeTab === 'announcements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.25rem', fontWeight: 800 }}>Broadcast Composers</h3>
            
            <form onSubmit={handlePostAnnouncement} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Publish Announcement Banner</h4>
              <div className="form-group">
                <label htmlFor="announce">ANNOUNCEMENT TEXT</label>
                <textarea 
                  id="announce"
                  className="input-field" 
                  placeholder="e.g. Module 3 test has been updated! Please review the forms section..." 
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  required
                  style={{ minHeight: '100px' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="animate-spin" size={20} /> : 'Broadcast to Student Dashboards'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Broadcasting History</h4>
              {announcementsList.map((ann, idx) => (
                <div key={idx} className="card" style={{ padding: '12px' }}>
                  <p style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{ann.content}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    <span>By: {ann.profiles?.full_name || 'Admin'}</span>
                    <span>{new Date(ann.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. WAITLIST MANAGER */}
        {activeTab === 'waitlist' && role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.1rem', fontWeight: 800 }}>Per-Course Batch Capacities</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {courseCapacities.map((cap: any) => (
                  <div key={cap.course_id} style={{ padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px' }}>{cap.title || cap.course_id}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      WhatsApp: {cap.whatsapp_group_cap} | Platform: {cap.platform_access_cap} | Batches: {cap.total_batches} {cap.single_batch_only ? '(Single)' : ''}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Enrolled: {cap.enrolled_count || 0} | Platform: {cap.platform_access_count || 0} | Waitlisted: {cap.waitlist_count || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.25rem', fontWeight: 800 }}>Waitlisted Students ({waitlistQueue.length})</h3>
            {waitlistQueue.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No students currently on the waitlist.</div>
            ) : (
              waitlistQueue.map(item => (
                <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{item.full_name || 'Anonymous'}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {item.student_display_id || 'N/A'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email: {item.email || 'N/A'}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-cyan)' }}>Course: {item.course_id} | Platform: {item.has_platform_access ? 'Yes' : 'No'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handlePromoteStudent(item.id, 1)}
                      className="btn"
                      style={{ backgroundColor: 'var(--color-blue)', color: '#FFFFFF', padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                      disabled={actionLoading}
                    >
                      Promote to Batch 1
                    </button>
                    <button 
                      onClick={() => handlePromoteStudent(item.id, 2)}
                      className="btn"
                      style={{ backgroundColor: 'var(--color-purple)', color: '#FFFFFF', padding: '6px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                      disabled={actionLoading}
                    >
                      Promote to Batch 2
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ENROLLMENT APPLICATIONS TAB */}
        {activeTab === 'applications' && role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.1rem', fontWeight: 800 }}>Enrollment Applications</h3>
              <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                {enrollmentApplications.filter(a => a.status === 'pending').length} pending
              </span>
            </div>

            {/* ── Application Cards ── */}
            {enrollmentApplications.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                <UserCheck size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <p>No enrollment applications yet. Share the landing page for students to apply.</p>
              </div>
            ) : (
              enrollmentApplications.map(app => (
                <div key={app.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{app.full_name}</h4>
                        <span className={`badge ${app.status === 'pending' ? 'badge-blue' : app.status === 'approved' ? '' : 'badge-danger'}`}
                          style={{ fontSize: '0.65rem', backgroundColor: app.status === 'approved' ? 'rgba(16,185,129,0.15)' : undefined, color: app.status === 'approved' ? '#10B981' : undefined }}>
                          {app.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>📧 {app.email}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>📱 {app.phone}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>📚 {app.courses?.title || app.course_id}</p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    {app.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => handleApproveApplication(app)}
                          disabled={actionLoading}
                          className="btn"
                          style={{ background: '#10B981', color: '#fff', padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          <UserCheck size={14} /> Approve & Create Account
                        </button>
                        <button
                          onClick={() => handleRejectApplication(app.id)}
                          disabled={actionLoading}
                          className="btn btn-secondary"
                          style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                        >
                          <UserX size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* ── Manually Create Student Account ── */}
            <div className="card" style={{ border: '1px solid var(--color-purple)', marginTop: '8px' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-purple)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <UserPlus size={16} /> Manually Create Student Account
              </h4>
              {createdStudentId && (
                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.85rem' }}>
                  <strong>Success!</strong> Account created with Student ID: {createdStudentId}. The student is automatically enrolled in Batch 1 (or 2 if full).
                </div>
              )}
              <form onSubmit={handleCreateStudentAccount} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>FULL NAME</label>
                    <input className="input-field" placeholder="Fatima Abdullahi" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>EMAIL ADDRESS</label>
                    <input type="email" className="input-field" placeholder="fatima@gmail.com" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>TEMPORARY PASSWORD</label>
                    <input className="input-field" placeholder="Min 8 characters" value={newStudentPassword} onChange={e => setNewStudentPassword(e.target.value)} required minLength={8} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>COURSE</label>
                    <select title="Select course" aria-label="Select course for enrollment" className="input-field" value={newStudentCourse} onChange={e => setNewStudentCourse(e.target.value)}>
                      <option value="wd101">HTML Fundamentals (WD101)</option>
                      <option value="css">CSS & Responsive Design</option>
                      <option value="js">JavaScript Programming</option>
                      <option value="react">React Framework</option>
                      <option value="backend">Backend Development</option>
                      <option value="fullstack">Full Stack Bootcamp</option>
                      <option value="analytics">Data Analytics</option>
                      <option value="science">Data Science & AI</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={createAccountLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
                  {createAccountLoading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                  Create Account & Enroll
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CERTIFICATE TEMPLATES TAB */}
        {activeTab === 'certificates' && role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.25rem', fontWeight: 800 }}>Certificate Templates</h3>

            <div className="card" style={{ padding: '20px' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                Manage the default certificate template. Each course uses this template when issuing certificates.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {courses.map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>{c.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {c.id}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {certTemplates.find((t: any) => t.course_id === c.id) ? '✅ Custom' : '📄 Default'}
                      </span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          const existing = certTemplates.find((t: any) => t.course_id === c.id)
                          if (existing) {
                            setCertTemplateForm(existing)
                          } else {
                            setCertTemplateForm({ course_id: c.id, template_name: 'Standard Template', primary_color: '#0d182e', logo_url: '', signatory_name: 'CODEME Director', signatory_title: 'Director of Education' })
                          }
                          setShowCertTemplateModal(true)
                        }}
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        <Settings size={14} style={{ marginRight: '5px' }} /> Edit
                      </button>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '16px' }}>No courses found.</p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>Saved Custom Templates</h4>
              {certTemplates.map((t: any) => (
                <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{t.courses?.title || t.course_id}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.template_name} • Signatory: {t.signatory_name}</p>
                  </div>
                  <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: t.primary_color }} title={t.primary_color}></div>
                </div>
              ))}
              {certTemplates.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No custom templates set yet.</p>}
            </div>
          </div>
        )}

        {/* TEACHER MANAGEMENT TAB */}
        {activeTab === 'teachers' && role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.25rem', fontWeight: 800 }}>Instructor Management</h3>
            </div>
            <div className="card" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Use the Student Management tab to promote existing users to 'teacher'. This suite allows you to oversee instructor assignments.
              </p>
              <div style={{ padding: '16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px' }}>
                <strong style={{ color: 'var(--color-blue)' }}>System Note:</strong> 
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Instructor granular batch assignments are handled automatically via their associated courses. Instructors can see all batches for courses they have access to.</p>
              </div>
            </div>
          </div>
        )}

        {/* ENTERPRISE TAB */}
        {activeTab === 'enterprise' && role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.25rem', fontWeight: 800 }}>Enterprise Settings</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#10B981' }}>
                  <Key size={18} />
                  <strong style={{ fontSize: '1.1rem' }}>API Integration</strong>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  Generate API keys to integrate CODEME Academy with your HR or internal systems.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" className="input-field" readOnly value="cdm_live_x892jklms..." style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.7 }} />
                  <button className="btn btn-secondary" style={{ padding: '8px 12px' }}>Regenerate</button>
                </div>
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-purple)' }}>
                  <BookOpen size={18} />
                  <strong style={{ fontSize: '1.1rem' }}>White-Label Options</strong>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  Customise the platform's appearance for enterprise clients.
                </p>
                <button className="btn btn-secondary" style={{ width: '100%' }}>Configure Branding (Locked)</button>
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-danger)' }}>
                  <ShieldAlert size={18} />
                  <strong style={{ fontSize: '1.1rem' }}>Security & Rate Limits</strong>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  Strict rate-limiting is currently active (5 attempts / 15 mins).
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked readOnly /> Enforce 2FA for Instructors
                </label>
              </div>

              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-blue)' }}>
                  <BarChart2 size={18} />
                  <strong style={{ fontSize: '1.1rem' }}>Enterprise Reporting</strong>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  Export full compliance and progress reports.
                </p>
                <button className="btn btn-primary" style={{ width: '100%' }}>Export CSV Report</button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
