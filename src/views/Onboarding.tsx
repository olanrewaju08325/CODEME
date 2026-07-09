import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { User, Award, BookOpen, Check, ArrowRight, Loader2 } from 'lucide-react'

interface OnboardingProps {
  session: any
  onComplete: () => void
}

export const Onboarding: React.FC<OnboardingProps> = ({ session, onComplete }) => {
  const [step, setStep] = useState(1) // 1: Welcome, 2: Name input, 5: Avatar Picker, 3: Show ID, 4: Course Selection
  const [fullName, setFullName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [waitlisted, setWaitlisted] = useState(false)
  
  const [selectedAvatar, setSelectedAvatar] = useState('Lagos Developer')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const PRESET_AVATARS = [
    { name: 'Lagos Developer', emoji: '🇳🇬👨‍💻', color: 'var(--color-blue)' },
    { name: 'Abuja Coder', emoji: '🇳🇬👩‍💻', color: 'var(--color-cyan)' },
    { name: 'Ibadan Hacker', emoji: '🇳🇬🚀', color: 'var(--color-purple)' },
    { name: 'Benin Techie', emoji: '🇳🇬💡', color: '#F59E0B' }
  ]
  
  const stepContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // GSAP step transition indicator flash
    if (stepContainerRef.current) {
      gsap.fromTo(stepContainerRef.current,
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
      )
    }
  }, [step])

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return
    setLoading(true)
    setError(null)

    try {
      // 1. Update full name in profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', session.user.id)
      
      if (updateError) throw updateError

      // 2. Fetch the updated profile to get the auto-assigned student_id
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('student_id')
        .eq('id', session.user.id)
        .single()
      
      if (fetchError) throw fetchError

      if (profileData && profileData.student_id) {
        setStudentId(profileData.student_id)
      } else {
        // Fallback in case trigger takes a microsecond or profile was already set
        setStudentId('CDM250001')
      }

      setStep(5) // Navigate to Avatar Picker next
    } catch (err: any) {
      setError(err.message || 'Error setting name. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be under 2MB')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedAvatar(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveAvatar = async () => {
    setLoading(true)
    setError(null)
    try {
      let finalAvatarUrl = selectedAvatar
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const filePath = `${session.user.id}-${Math.random()}.${fileExt}`
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true })
        if (uploadErr) throw uploadErr

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)
        if (urlData) {
          finalAvatarUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: finalAvatarUrl })
        .eq('id', session.user.id)
      
      if (error) throw error
      setStep(3) // Proceed to Student ID card step
    } catch (err: any) {
      setError(err.message || 'Error saving avatar.')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoEnroll = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch max_batch_size from settings
      const { data: settingData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'max_batch_size')
        .single()
      
      const maxBatchSize = settingData ? parseInt(settingData.value) : 25

      // 2. Count enrollments for batch 1 & 2
      const { count: batch1Count } = await supabase
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', 'wd101')
        .eq('batch', 1)
        .eq('status', 'enrolled')
      
      const { count: batch2Count } = await supabase
        .from('student_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', 'wd101')
        .eq('batch', 2)
        .eq('status', 'enrolled')

      let selectedBatch: number | null = 1
      let enrollmentStatus = 'enrolled'

      if ((batch1Count || 0) < maxBatchSize) {
        selectedBatch = 1
      } else if ((batch2Count || 0) < maxBatchSize) {
        selectedBatch = 2
      } else {
        selectedBatch = null
        enrollmentStatus = 'waitlisted'
      }

      // 3. Enroll student
      const { error: enrollError } = await supabase
        .from('student_enrollments')
        .insert({
          student_id: session.user.id,
          course_id: 'wd101',
          batch: selectedBatch,
          status: enrollmentStatus
        })
      
      if (enrollError && enrollError.code !== '23505') {
        throw enrollError
      }

      if (enrollmentStatus === 'waitlisted') {
        setWaitlisted(true)
      } else {
        onComplete()
      }
    } catch (err: any) {
      setError(err.message || 'Error enrolling in course. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="full-screen-view theme-dark" style={{ background: 'radial-gradient(circle at center, #1b1030 0%, #07060d 100%)', minHeight: '100%' }}>
      <div ref={stepContainerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}
            >
              <img src="/codeme.jpg" alt="Logo" className="splash-logo" style={{ width: '120px', height: '120px' }} />
              <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 800 }}>Welcome to CodeMe</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Nigeria's premier tech education platform. Let's set up your student profile and kickstart your career.
              </p>
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                Get Started <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="name-input"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }} className="gradient-text">What is your name?</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Please enter your full official name. This name will appear exactly as typed on your certificates.
              </p>

              {error && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleUpdateName} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="fullname">FULL NAME</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                      id="fullname"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Halimot Abdul"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading || !fullName.trim()}>
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <>Next <ArrowRight size={18} /></>}
                </button>
              </form>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="avatar-select"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }} className="gradient-text">Choose Your Avatar</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Select a Nigeria-themed preset avatar or upload your own profile photo.
              </p>

              {error && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              {/* Presets Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {PRESET_AVATARS.map((av) => (
                  <div 
                    key={av.name}
                    onClick={() => setSelectedAvatar(av.name)}
                    style={{
                      cursor: 'pointer',
                      padding: '16px',
                      borderRadius: '16px',
                      border: selectedAvatar === av.name ? `2.5px solid ${av.color}` : '1.5px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '2.5rem' }}>{av.emoji}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{av.name}</span>
                  </div>
                ))}
              </div>

              {/* Upload Input */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>OR UPLOAD CUSTOM PHOTO</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                />
                {selectedAvatar.startsWith('data:image') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <img src={selectedAvatar} alt="Upload Preview" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>Custom photo loaded!</span>
                  </div>
                )}
              </div>

              <button className="btn btn-primary" onClick={handleSaveAvatar} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <>Continue <ArrowRight size={18} /></>}
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="show-id"
              initial={{ opacity: 0, scale: 0.9, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ type: 'spring', stiffness: 120, damping: 13 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '24px' }}
            >
              <div 
                style={{ 
                  background: 'linear-gradient(135deg, rgba(12, 74, 140, 0.2) 0%, rgba(139, 47, 166, 0.2) 100%)',
                  padding: '24px',
                  borderRadius: '24px',
                  border: '1.5px dashed var(--color-cyan)',
                  boxShadow: '0 0 15px rgba(41, 214, 232, 0.2)',
                  width: '100%'
                }}
              >
                <Award size={48} style={{ color: 'var(--color-cyan)', marginBottom: '12px' }} />
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase' }}>Official Student ID Assigned</h4>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FFFFFF', margin: '8px 0', fontFamily: 'var(--font-headings)' }}>
                  {studentId}
                </h1>
                <p style={{ color: 'var(--color-cyan)', fontSize: '0.85rem', fontWeight: 600 }}>
                  CodeMe Academy class of 2026
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Congratulations, {fullName}!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>
                  Your profile has been created successfully. You are now officially a student at CodeMe.
                </p>
              </div>

              <button className="btn btn-primary" onClick={() => setStep(4)}>
                Continue to Courses <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="course-select"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }} className="gradient-text">
                {waitlisted ? 'Waitlist Active' : 'Start Your Path'}
              </h2>
              
              {waitlisted ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '14px', borderRadius: '12px', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    <p style={{ fontWeight: 700, color: '#FBBF24', marginBottom: '6px' }}>All active class batches are currently full.</p>
                    <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                      You have been successfully added to the waitlist. As soon as a new batch opens, our administrator will move you in and activate your learning dashboard.
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={onComplete}>
                    Proceed to Dashboard <ArrowRight size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    For V1, you will be auto-enrolled in our free foundational course: <strong>WD101: Introduction to HTML</strong>.
                  </p>

                  {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }}>
                      {error}
                    </div>
                  )}

                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', border: '1.5px solid var(--color-cyan)' }}>
                    <div style={{ backgroundColor: 'rgba(41, 214, 232, 0.15)', padding: '12px', borderRadius: '12px', color: 'var(--color-cyan)' }}>
                      <BookOpen size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ color: '#FFFFFF' }}>WD101: Introduction to HTML</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>6 Modules • Foundations • Lifetime Free Access</p>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-success)', color: '#FFFFFF', borderRadius: '50%', padding: '4px' }}>
                      <Check size={16} />
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleAutoEnroll} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <>Enroll and Enter Dashboard <ArrowRight size={18} /></>}
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
