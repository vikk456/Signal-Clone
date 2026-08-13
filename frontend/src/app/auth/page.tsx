'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

type Step = 'login' | 'register' | 'otp';

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [loading, setLoading] = useState(false);

  // Form state
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.login({ username, password });
      localStorage.setItem('signal_token', res.access_token);
      localStorage.setItem('signal_user', JSON.stringify(res.user));
      toast.success(`Welcome back, ${res.user.display_name}!`);
      router.replace('/conversations');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.register({ phone_number: phone, username, display_name: displayName, password });
      setOtpHint(res.hint);
      setStep('otp');
      toast.success('OTP sent! (Check the hint below)');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp({ phone_number: phone, otp });
      localStorage.setItem('signal_token', res.access_token);
      localStorage.setItem('signal_user', JSON.stringify(res.user));
      toast.success(`Welcome to Signal, ${res.user.display_name}!`);
      router.replace('/conversations');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 2C6.477 2 2 6.163 2 11.282c0 2.714 1.23 5.15 3.196 6.862L4 22l4.547-2.168A11.286 11.286 0 0 0 12 20.564c5.523 0 10-4.163 10-9.282C22 6.163 17.523 2 12 2z"/>
            </svg>
          </div>
          <span className="auth-logo-text">Signal</span>
        </div>

        {step === 'login' && (
          <>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to continue to Signal</p>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Username or Phone</label>
                <input
                  id="login-username"
                  className="form-input"
                  placeholder="alice or +1 (555) 001-0001"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  id="login-password"
                  className="form-input"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="otp-hint" style={{ marginBottom: 20 }}>
                💡 <strong>Demo accounts</strong>: username <strong>alice</strong>, <strong>bob</strong>, <strong>carol</strong>, etc. — password: <strong>password123</strong>
              </div>
              <button
                id="login-submit"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <div className="auth-switch">
              New to Signal? <a onClick={() => setStep('register')}>Create account</a>
            </div>
          </>
        )}

        {step === 'register' && (
          <>
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">Register with your phone number to get started</p>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  id="reg-phone"
                  className="form-input"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  id="reg-username"
                  className="form-input"
                  placeholder="Choose a username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  id="reg-name"
                  className="form-input"
                  placeholder="Your full name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  id="reg-password"
                  className="form-input"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                id="reg-submit"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Sending OTP…' : 'Continue'}
              </button>
            </form>
            <div className="auth-switch">
              Already have an account? <a onClick={() => setStep('login')}>Sign in</a>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <h1 className="auth-title">Verify your number</h1>
            <p className="auth-subtitle">Enter the 6-digit code sent to {phone}</p>
            {otpHint && <div className="otp-hint">🔑 {otpHint}</div>}
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label className="form-label">OTP Code</label>
                <input
                  id="otp-input"
                  className="form-input"
                  placeholder="123456"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  maxLength={6}
                  required
                  autoFocus
                  style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
                />
              </div>
              <button
                id="otp-submit"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
            </form>
            <div className="auth-switch">
              <a onClick={() => setStep('register')}>← Back</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
