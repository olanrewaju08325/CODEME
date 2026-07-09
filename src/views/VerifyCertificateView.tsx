import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, ShieldCheck, ShieldAlert, Award, ArrowLeft, Loader2, CheckCircle, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export const VerifyCertificateView: React.FC = () => {
  const [certCode, setCertCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Auto-fill from URL param if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1])
    const id = urlParams.get('id')
    if (id) {
      setCertCode(id)
      verifyCode(id)
    }
  }, [])

  const verifyCode = async (code: string) => {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Simulate slight delay for premium verification feel
      await new Promise(r => setTimeout(r, 800))

      const { data, error: certError } = await supabase
        .from('certificates')
        .select('*, profiles:profiles!certificates_student_id_fkey(full_name), courses:courses!certificates_course_id_fkey(title)')
        .eq('certificate_code', code.trim().toUpperCase())
        .maybeSingle()

      if (certError) throw certError

      if (data) {
        setResult(data)
      } else {
        setError('No certificate found matching this verification code. Please check for typing mistakes.')
      }
    } catch (err: any) {
      setError(err.message || 'Error executing certificate lookup.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    verifyCode(certCode)
  }

  return (
    <div className="full-screen-view theme-dark" style={{ background: 'radial-gradient(circle at top right, #1b1030 0%, #07060d 100%)', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      
      {/* Background ambient glow */}
      <div style={{ position: 'absolute', top: '10%', right: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(139,47,166,0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(41,214,232,0.1) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* Back Button */}
      <a 
        href="#" 
        onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.location.reload(); }}
        style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', zIndex: 10, background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <ArrowLeft size={16} /> Back to Home
      </a>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: '420px', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        
        {/* Header section */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            style={{ display: 'inline-flex', backgroundColor: 'rgba(41, 214, 232, 0.1)', border: '1px solid rgba(41, 214, 232, 0.3)', padding: '16px', borderRadius: '50%', color: 'var(--color-cyan)', marginBottom: '16px', boxShadow: '0 0 20px rgba(41,214,232,0.2)' }}
          >
            <ShieldCheck size={40} />
          </motion.div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-headings)' }} className="gradient-text">Verify Credential</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', lineHeight: 1.5 }}>
            Enter the unique ID to verify the authenticity of a CodeMe Academy certificate.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleVerify} style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. CDM-HTML-XXXXXX" 
                value={certCode}
                onChange={(e) => setCertCode(e.target.value)}
                required
                style={{ paddingLeft: '42px', height: '48px', minHeight: '48px', textTransform: 'uppercase', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 700, letterSpacing: '1px' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '48px', minHeight: '48px', padding: '0 24px', borderRadius: '10px', fontWeight: 700 }} disabled={loading}>
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify'}
            </button>
          </div>
        </form>

        {/* Results area */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="card" 
              style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px', borderRadius: '14px' }}
            >
              <ShieldAlert size={24} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#FCA5A5', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Verification Failed</strong>
                <p style={{ fontSize: '0.75rem', color: 'rgba(252, 165, 165, 0.8)' }}>{error}</p>
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              style={{ 
                background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.05) 0%, rgba(12, 74, 140, 0.1) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '16px',
                padding: '2px', // for gradient border effect
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Premium glimmer effect */}
              <div style={{ position: 'absolute', top: 0, left: '-100%', width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', transform: 'skewX(-20deg)', animation: 'glimmer 3s infinite' }} />

              <div style={{ background: '#0F111A', borderRadius: '14px', padding: '24px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-success)', marginBottom: '20px' }}>
                  <CheckCircle size={28} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Verified Authentic</h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Awarded to</p>
                    <strong style={{ fontSize: '1.4rem', color: '#FFFFFF', fontFamily: 'var(--font-headings)' }}>{result.profiles?.full_name || 'Anonymous Student'}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(12, 74, 140, 0.2)', color: 'var(--color-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Award size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Course Completed</p>
                      <strong style={{ fontSize: '0.9rem', color: '#FFFFFF' }}>{result.courses?.title || 'WD101: Introduction to HTML'}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 47, 166, 0.2)', color: 'var(--color-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Star size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Date Issued</p>
                      <strong style={{ fontSize: '0.9rem', color: '#FFFFFF' }}>{new Date(result.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Certificate ID</p>
                      <strong style={{ fontSize: '0.75rem', color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>{result.certificate_code}</strong>
                    </div>
                    <span className="badge badge-success" style={{ padding: '6px 12px', fontWeight: 700 }}>Valid</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <button 
            type="button"
            className="btn"
            onClick={() => window.location.hash = ''}
            style={{ fontSize: '0.8rem', padding: '10px 20px', minHeight: '40px', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px' }}
          >
            <ArrowLeft size={16} /> Back to CodeMe Academy
          </button>
        </div>

      </motion.div>

      {/* Required CSS for glimmer animation */}
      <style>{`
        @keyframes glimmer {
          0% { left: -100%; }
          20% { left: 200%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  )
}
