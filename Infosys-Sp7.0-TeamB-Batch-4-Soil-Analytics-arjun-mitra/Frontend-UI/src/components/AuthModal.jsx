
import { useState } from 'react'
import {
  X,
  Eye,
  EyeOff,
  Sprout,
  Mail,
  Lock,
  UserRound,
  ArrowRight,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react'
import './AuthModal.css'

const API_URL = 'http://localhost:5000/api/auth'

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [otp, setOtp] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  })

  if (!isOpen) return null

  const isSignup = mode === 'signup'
  const isOtp = mode === 'otp'
  const isForgot = mode === 'forgot'
  const isReset = mode === 'reset'

  function updateForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
    setError('')
    setSuccess('')
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setSuccess('')
    setOtp('')
  }

  async function request(url, body) {
    const response = await fetch(`${API_URL}/${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.')
    }

    return data
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isOtp) {
        const data = await request('verify-otp', {
          email: form.email.trim().toLowerCase(),
          otp
        })

        setSuccess(data.message || 'Email verified successfully.')

        if (onSuccess) onSuccess(data.user)
        return
      }

      if (isForgot) {
        const data = await request('forgot-password', {
          email: form.email.trim().toLowerCase()
        })

        setMode('reset')
        setOtp('')
        setSuccess(data.message || 'If an account exists for that email, a password reset code has been sent.')
        return
      }

      if (isReset) {
        const data = await request('reset-password', {
          email: form.email.trim().toLowerCase(),
          otp,
          newPassword: form.password
        })

        setMode('signin')
        setForm({ ...form, password: '' })
        setOtp('')
        setSuccess(data.message || 'Password reset successfully. Sign in with your new password.')
        return
      }

      if (isSignup) {
        const data = await request('signup', {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password
        })

        if (data.requiresVerification) {
          setMode('otp')
          setOtp('')
          setSuccess(data.message || 'Verification code sent to your email.')
          return
        }

        setSuccess(data.message || 'Account created successfully.')

        if (onSuccess) onSuccess(data.user)
        return
      }

      const data = await request('signin', {
        email: form.email.trim().toLowerCase(),
        password: form.password
      })

      setSuccess(data.message || 'Signed in successfully.')

      if (onSuccess) onSuccess(data.user)
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the server. Check that your backend is running.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="auth-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !loading) onClose()
      }}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          type="button"
          className="auth-close"
          onClick={onClose}
          aria-label="Close authentication"
        >
          <X size={21} />
        </button>

        <div className="auth-brand">
          <span className="auth-brand-icon">
            <Sprout size={25} />
          </span>
          <span>Agri<span>Sync</span></span>
        </div>

        <div className="auth-heading">
          <p className="auth-eyebrow">
            {isOtp ? 'EMAIL VERIFICATION' : isForgot || isReset ? 'ACCOUNT RECOVERY' : 'GROW SMARTER WITH US'}
          </p>

          <h2 id="auth-title">
            {isOtp
              ? 'Verify your email.'
              : isForgot
                ? 'Forgot your password?'
                : isReset
                  ? 'Reset your password.'
              : isSignup
                ? 'Join the harvest.'
                : 'Welcome back.'}
          </h2>

          <p>
            {isOtp
              ? `Enter the six-digit code sent to ${form.email}.`
              : isForgot
                ? 'Enter your email address and we will send you a reset code.'
                : isReset
                  ? `Enter the six-digit code sent to ${form.email} and choose a new password.`
              : isSignup
                ? 'Create your account and grow with confidence.'
                : 'Your smarter farming journey starts here.'}
          </p>
        </div>

        {!isOtp && !isForgot && !isReset && (
          <div className="auth-tabs">
            <button
              type="button"
              className={!isSignup ? 'active' : ''}
              onClick={() => switchMode('signin')}
            >
              Sign In
            </button>

            <button
              type="button"
              className={isSignup ? 'active' : ''}
              onClick={() => switchMode('signup')}
            >
              Create Account
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isOtp ? (
            <>
              <div className="auth-otp-icon">
                <ShieldCheck size={30} />
              </div>

              <label className="auth-field">
                <span>Six-digit verification code</span>
                <div className="auth-input-wrap">
                  <Mail size={18} />
                  <input
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={event => {
                      setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                      setError('')
                      setSuccess('')
                    }}
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </div>
              </label>

              <p className="auth-otp-note">
                Your code expires in 5 minutes. Check your inbox and spam folder.
              </p>
            </>
          ) : (
            <>
              {isSignup && (
                <label className="auth-field">
                  <span>Full name</span>
                  <div className="auth-input-wrap">
                    <UserRound size={18} />
                    <input
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={updateForm}
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>
              )}

              <label className="auth-field">
                <span>Email address</span>
                <div className="auth-input-wrap">
                  <Mail size={18} />
                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={updateForm}
                    autoComplete="email"
                    maxLength={255}
                    required
                  />
                </div>
              </label>

              {isReset && (
                <label className="auth-field">
                  <span>Six-digit password reset code</span>
                  <div className="auth-input-wrap">
                    <ShieldCheck size={18} />
                    <input
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={event => {
                        setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                        setError('')
                        setSuccess('')
                      }}
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </div>
                </label>
              )}

              {!isForgot && (
                <label className="auth-field">
                  <span>{isReset ? 'New password' : 'Password'}</span>
                  <div className="auth-input-wrap">
                    <Lock size={18} />
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={
                        isSignup
                          ? 'At least 8 characters'
                          : isReset
                            ? 'Enter a new password'
                            : 'Enter your password'
                      }
                      value={form.password}
                      onChange={updateForm}
                      minLength={isReset ? 12 : isSignup ? 8 : undefined}
                      maxLength={72}
                      autoComplete={isSignup || isReset ? 'new-password' : 'current-password'}
                      required
                    />

                    <button
                      type="button"
                      className="auth-eye"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              )}
            </>
          )}

          {error && (
            <p className="auth-message auth-error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="auth-message auth-success" role="status">
              {success}
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            <span>
              {loading
                ? 'Please wait...'
                : isOtp
                  ? 'Verify and continue'
                  : isForgot
                    ? 'Send reset code'
                    : isReset
                      ? 'Reset password'
                  : isSignup
                    ? 'Create my account'
                    : 'Sign in to AgriSync'}
            </span>

            {!loading && <ArrowRight size={19} />}
          </button>
        </form>

        {isOtp ? (
          <p className="auth-switch">
            Didn't receive the code? Check your spam folder.
            <br />
            <button
              type="button"
              onClick={() => switchMode('signup')}
              disabled={loading}
            >
              <ArrowLeft size={14} /> Back to sign up
            </button>
          </p>
        ) : (
          <p className="auth-switch">
            {isForgot || isReset ? (
              <>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  disabled={loading}
                >
                  <ArrowLeft size={14} /> Back to sign in
                </button>
              </>
            ) : (
              <>
                {!isSignup && (
                  <>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                    <br />
                  </>
                )}
                {isSignup ? 'Already growing with us?' : 'New to AgriSync?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(isSignup ? 'signin' : 'signup')}
                  disabled={loading}
                >
                  {isSignup ? 'Sign in' : 'Create an account'}
                </button>
              </>
            )}
          </p>
        )}

        <p className="auth-footer">
          Built for healthier soil and smarter harvests.
        </p>
      </section>
    </div>
  )
}
