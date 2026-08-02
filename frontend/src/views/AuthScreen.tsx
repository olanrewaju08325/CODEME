import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { gsap } from 'gsap'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

interface AuthScreenProps {
  onAuthSuccess: (session: any) => void
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [ageConfirm, setAgeConfirm] = useState(false)
  
  const logoRef = useRef<HTMLImageElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // GSAP Cinematic Entrance Animation
    if (logoRef.current && formRef.current) {
      gsap.fromTo(logoRef.current, 
        { scale: 0.8, opacity: 0, y: -30 }, 
        { scale: 1, opacity: 1, y: 0, duration: 1.2, ease: 'back.out(1.7)' }
      )
      gsap.fromTo(formRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.15, delay: 0.4, ease: 'power2.out' }
      )
    }
  }, [isSignUp])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.')
          setLoading(false)
          return
        }
        if (!ageConfirm) {
          setError('You must confirm you are 13 years of age or older.')
          setLoading(false)
          return
        }
        if (!consent) {
          setError('You must consent to CodeMe Academy\'s data use policy.')
          setLoading(false)
          return
        }
        // Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: '', // Will be updated during onboarding
            }
          }
        })
        if (signUpError) throw signUpError
        
        if (data.session) {
          onAuthSuccess(data.session)
        } else {
          setError("Account created! Please check your email for the confirmation link, or log in if auto-confirm is enabled.")
        }
      } else {
        // Sign In
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (signInError) throw signInError
        if (data.session) {
          onAuthSuccess(data.session)
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="full-screen-view theme-dark" style={{ background: 'radial-gradient(circle at center, #1b1030 0%, #07060d 100%)', minHeight: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
        <img 
          ref={logoRef}
          src="/codeme.jpg" 
          alt="CodeMe Logo" 
          className="splash-logo" 
        />
        <h2 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.75rem', fontWeight: 800, marginTop: '16px' }} className="gradient-text">
          {isSignUp ? 'Join CodeMe' : 'Welcome Back'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
          {isSignUp ? 'Start your tech journey in Nigeria' : 'Sign in to access your dashboard'}
        </p>
      </div>

      <div ref={formRef} style={{ width: '100%' }}>
        {error && (
          <div 
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.15)', 
              color: '#FCA5A5', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              fontSize: '0.85rem', 
              marginBottom: '16px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="email">EMAIL ADDRESS</label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-tertiary)' 
                }} 
              />
              <input 
                id="email"
                type="email" 
                className="input-field" 
                placeholder="email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-tertiary)' 
                }} 
              />
              <input 
                id="password"
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          {!isSignUp && (
            <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '8px' }}>
              <a 
                href="https://wa.me/2349032517376?text=Hello%20CodeMe%20Admin,%20I%20forgot%20my%20password.%20My%20email%20is:" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ fontSize: '0.75rem', color: 'var(--color-cyan)', textDecoration: 'none', fontWeight: 600 }}
              >
                Forgot Password? Contact Admin
              </a>
            </div>
          )}

          {isSignUp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <input 
                  id="ageConfirm"
                  type="checkbox" 
                  checked={ageConfirm}
                  onChange={(e) => setAgeConfirm(e.target.checked)}
                  required
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <label htmlFor="ageConfirm" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, cursor: 'pointer' }}>
                  I confirm I am 13 years of age or older.
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <input 
                  id="consent"
                  type="checkbox" 
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <label htmlFor="consent" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, cursor: 'pointer' }}>
                  I agree to CodeMe Academy's use of my name, submitted work, and profile information for learning and academy purposes.
                </label>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || (isSignUp && (!consent || !ageConfirm))}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-cyan)',
              fontFamily: 'var(--font-headings)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create Account"}
          </button>
        </div>
      </div>
    </div>
  )
}
