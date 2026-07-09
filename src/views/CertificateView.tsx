import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ChevronLeft, Printer, Award, CheckCircle, Share2, Copy, ExternalLink, Star } from 'lucide-react'

interface CertificateViewProps {
  session: any
  onNavigate: (view: string) => void
}

export const CertificateView: React.FC<CertificateViewProps> = ({ session, onNavigate }) => {
  const [profile, setProfile] = useState<any>(null)
  const [certificate, setCertificate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const sealRef = useRef<SVGSVGElement>(null)
  const certRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchOrGenerateCert = async () => {
      try {
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profData)

        const { data: certData } = await supabase
          .from('certificates')
          .select('*')
          .eq('student_id', session.user.id)
          .eq('course_id', 'wd101')
          .maybeSingle()

        if (certData) {
          setCertificate(certData)
        } else {
          const uniqueCode = `CDM-HTML-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          const { data: newCert, error: insertError } = await supabase
            .from('certificates')
            .insert({
              student_id: session.user.id,
              course_id: 'wd101',
              certificate_code: uniqueCode
            })
            .select()
            .single()
          if (insertError) throw insertError
          setCertificate(newCert)
        }
      } catch (err) {
        console.error('Error fetching or generating certificate:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrGenerateCert()
  }, [session])

  useEffect(() => {
    if (!loading && certRef.current) {
      gsap.fromTo(certRef.current, 
        { opacity: 0, y: 40, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out', delay: 0.2 }
      )
    }
  }, [loading])

  const handlePrint = () => window.print()

  const handleCopyCode = () => {
    if (certificate?.certificate_code) {
      navigator.clipboard.writeText(certificate.certificate_code).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  const handleShare = () => {
    const verifyUrl = `${window.location.origin}${window.location.pathname}#/verify-certificate?id=${certificate?.certificate_code}`
    if (navigator.share) {
      navigator.share({
        title: 'My CodeMe Academy Certificate',
        text: `I just completed WD101: Introduction to HTML at CodeMe Academy! 🎉 Verify my credential:`,
        url: verifyUrl
      })
    } else {
      navigator.clipboard.writeText(verifyUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  const handleWhatsAppShare = () => {
    const verifyUrl = `${window.location.origin}${window.location.pathname}#/verify-certificate?id=${certificate?.certificate_code}`
    const text = `🎓 I just earned my *CodeMe Technology Academy* certificate!\n\n📚 Course: *Web Development — HTML Fundamentals (WD101)*\n🆔 Student ID: *${profile?.student_id}*\n\n🔗 Verify my certificate here:\n${verifyUrl}\n\n#CodeMeAcademy #Nigeria #WebDev #TechCareer`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#8B2FA6', borderRightColor: '#0C4A8C', animation: 'spin 1s linear infinite' }} />
          <Award size={30} style={{ color: '#29D6E8', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
        <p style={{ fontFamily: 'var(--font-headings)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Generating your credential...
        </p>
      </div>
    )
  }

  const issueDate = certificate
    ? new Date(certificate.issued_at || certificate.created_at || Date.now()).toLocaleDateString('en-NG', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })

  const verifyUrl = `${window.location.origin}${window.location.pathname}#/verify-certificate?id=${certificate?.certificate_code}`

  return (
    <div className="cert-page">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-certificate-container, #print-certificate-container * { visibility: visible; }
          #print-certificate-container {
            position: fixed; left: 0; top: 0;
            width: 100vw; height: 100vh;
            display: flex !important;
            align-items: center; justify-content: center;
            background: #FFFFFF !important;
            padding: 20px !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => onNavigate('course')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={24} />
        </button>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>My Credential</h4>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>WD101: Introduction to HTML</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleShare} className="badge badge-blue" style={{ cursor: 'pointer', padding: '6px 10px' }}>
            <Share2 size={13} style={{ marginRight: '4px' }} /> Share
          </button>
          <button onClick={handlePrint} className="badge badge-purple" style={{ cursor: 'pointer', padding: '6px 10px', color: 'var(--color-purple)' }}>
            <Printer size={13} style={{ marginRight: '4px' }} /> Print
          </button>
        </div>
      </div>

      <div className="app-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
        
        {/* ★ PREMIUM CERTIFICATE ★ */}
        <div ref={certRef} id="print-certificate-container" className="cert-paper" style={{ opacity: 0 }}>
          {/* Watermark */}
          <div className="cert-watermark">CODEME</div>
          
          {/* Corner accents */}
          <div className="cert-corner cert-corner-tl" />
          <div className="cert-corner cert-corner-tr" />
          <div className="cert-corner cert-corner-bl" />
          <div className="cert-corner cert-corner-br" />

          {/* Header glow decoration */}
          <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(12,74,140,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Logo + Institution */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '2px' }}
          >
            <div style={{ position: 'relative' }}>
              <img src="/codeme.jpg" alt="CodeMe" style={{ width: '48px', height: '48px', borderRadius: '12px', border: '2px solid #0C4A8C', boxShadow: '0 4px 12px rgba(12,74,140,0.2)' }} />
              <div style={{ position: 'absolute', inset: '-3px', borderRadius: '14px', border: '1px solid rgba(12,74,140,0.2)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-headings)', fontSize: '1rem', fontWeight: 900, color: '#0C4A8C', letterSpacing: '2px', marginTop: '4px' }}>
              CODEME ACADEMY
            </h2>
            <span style={{ fontSize: '0.5rem', color: '#8B2FA6', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' }}>
              Nigeria Tech Education Network
            </span>
          </motion.div>

          {/* Ribbon */}
          <div className="cert-ribbon" style={{ marginTop: '12px' }}>
            Certificate of Completion
          </div>

          {/* Body */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 0' }}
          >
            <p style={{ fontSize: '0.62rem', fontStyle: 'italic', color: '#6B7280', letterSpacing: '0.5px' }}>
              This is to officially certify that
            </p>

            <h1 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.7rem', fontWeight: 900, color: '#111827', margin: '4px 0', lineHeight: 1.2, textShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
              {profile?.full_name || 'CodeMe Student'}
            </h1>

            {/* Decorative divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
              <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, transparent, #8B2FA6)' }} />
              <Star size={10} fill="#8B2FA6" color="#8B2FA6" />
              <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, #8B2FA6, transparent)' }} />
            </div>

            <p style={{ fontSize: '0.62rem', color: '#6B7280', maxWidth: '260px', lineHeight: 1.5, margin: '2px 0' }}>
              has successfully completed all assignments, projects, and examinations for the course
            </p>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0C4A8C', margin: '6px 0 2px 0', letterSpacing: '0.5px' }}>
              WD101: Introduction to HTML
            </h3>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#8B2FA6', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Frontend Web Developer Track · CodeMe Academy
            </span>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            style={{ display: 'flex', justifyContent: 'space-around', width: '100%', margin: '10px 0', padding: '8px', background: 'rgba(12,74,140,0.04)', borderRadius: '12px', border: '1px solid rgba(12,74,140,0.1)' }}
          >
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0C4A8C' }}>6</p>
              <p style={{ fontSize: '0.5rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Modules</p>
            </div>
            <div style={{ width: '1px', background: '#E5E7EB' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0C4A8C' }}>30+</p>
              <p style={{ fontSize: '0.5rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Lessons</p>
            </div>
            <div style={{ width: '1px', background: '#E5E7EB' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0C4A8C' }}>100%</p>
              <p style={{ fontSize: '0.5rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>Completed</p>
            </div>
          </motion.div>

          {/* Signatures & Seal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: '14px', padding: '0 12px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: '"Dancing Script", "Courier New", cursive', fontWeight: 'bold', color: '#111827', transform: 'rotate(-3deg)', display: 'block' }}>
                Olamide.A.O
              </span>
              <div style={{ width: '80px', height: '1px', backgroundColor: '#9CA3AF', margin: '4px 0' }} />
              <span style={{ fontSize: '0.5rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>Director, CodeMe</span>
            </div>

            {/* Animated Seal */}
            <div className="cert-seal">
              <svg ref={sealRef} width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer starburst */}
                <path d="M28 2L32 10L40 8L39 16L47 20L42 27L47 34L39 38L40 46L32 44L28 52L24 44L16 46L17 38L9 34L14 27L9 20L17 16L16 8L24 10L28 2Z" fill="url(#certGrad)" stroke="#0C4A8C" strokeWidth="1.5"/>
                {/* Inner circle */}
                <circle cx="28" cy="27" r="13" fill="#FFFFFF" stroke="#0C4A8C" strokeWidth="1.5"/>
                {/* Check mark */}
                <path d="M22 27L26 31L34 23" stroke="#0C4A8C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="certGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#8B2FA6"/>
                    <stop offset="0.5" stopColor="#29D6E8"/>
                    <stop offset="1" stopColor="#0C4A8C"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#111827' }}>
                {issueDate}
              </span>
              <div style={{ width: '80px', height: '1px', backgroundColor: '#9CA3AF', margin: '4px 0' }} />
              <span style={{ fontSize: '0.5rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>Date Issued</span>
            </div>
          </motion.div>

          {/* Verification Code */}
          <div style={{ width: '100%', marginTop: '14px', padding: '8px 10px', background: 'rgba(12,74,140,0.04)', borderRadius: '8px', borderTop: '1px dashed rgba(12,74,140,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.5rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Verification ID:</span>
              <span style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0C4A8C', letterSpacing: '1px' }}>
                {certificate?.certificate_code || 'N/A'}
              </span>
            </div>
            <p style={{ fontSize: '0.45rem', color: '#9CA3AF', textAlign: 'center', marginTop: '3px' }}>
              Verify at: codeme.academy/verify
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div
          className="no-print"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} /> Print / Save PDF Certificate
          </button>

          <button className="btn btn-secondary" onClick={handleShare}>
            <Share2 size={18} /> Share Credential Link
          </button>

          <button
            onClick={handleWhatsAppShare}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            📲 Share via WhatsApp
          </button>
        </motion.div>

        {/* Copy verification code card */}
        <motion.div
          className="no-print"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
          style={{ background: 'linear-gradient(135deg, rgba(12,74,140,0.05), rgba(139,47,166,0.05))', border: '1px solid rgba(12,74,140,0.15)', borderRadius: '16px', padding: '16px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <CheckCircle size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>Your credential is live & verifiable</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Employers can verify this certificate without a login.
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-blue)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {certificate?.certificate_code}
            </div>
            <button onClick={handleCopyCode} className="badge badge-blue" style={{ cursor: 'pointer', padding: '8px 12px', flexShrink: 0, transition: 'all 0.2s ease' }}>
              {copied ? <><CheckCircle size={12} /> Copied!</> : <><Copy size={12} /> Copy ID</>}
            </button>
          </div>

          <button
            onClick={() => { window.location.hash = `/verify-certificate?id=${certificate?.certificate_code}` }}
            style={{ marginTop: '10px', background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <ExternalLink size={13} /> Preview Public Verification Page
          </button>
        </motion.div>

        {/* Achievements unlocked */}
        <motion.div
          className="no-print"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
        >
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>🏆 Achievements Unlocked</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { emoji: '🎓', label: 'HTML Graduate', desc: 'Completed WD101 in full' },
              { emoji: '⚡', label: 'Fast Learner', desc: 'All 6 modules done' },
              { emoji: '🏅', label: 'First Certificate', desc: 'Earned your first credential' },
            ].map(a => (
              <div key={a.label} className="achievement-card unlocked">
                <div className="achievement-icon unlocked">{a.emoji}</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.label}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{a.desc}</p>
                </div>
                <CheckCircle size={16} style={{ color: 'var(--color-success)', marginLeft: 'auto', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}
