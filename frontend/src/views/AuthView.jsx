import React, { useState } from 'react';
import { AlertTriangle, Check, User, Stethoscope, Link as LinkIcon, Eye, EyeOff } from 'lucide-react';
import { LogoIcon, ArrowRightIcon } from '../components/Icons';
import { api, storage } from '../api';

export function AuthView({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('patient'); // 'patient' | 'caregiver'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'register') {
        // Register API call: POST /api/auth/register
        await api.register(name, email, password, role, caregiverEmail);

        setSuccessMsg('Account created successfully! Logging you in...');

        // Auto-login after registration
        const loginRes = await api.login(email, password);
        if (loginRes?.user) {
          setTimeout(() => {
            onAuthSuccess(loginRes.user);
          }, 800);
        }
      } else {
        // Login API call: POST /api/auth/login
        const res = await api.login(email, password);
        if (res?.user) {
          onAuthSuccess(res.user);
        } else {
          throw new Error('Invalid email or password.');
        }
      }
    } catch (err) {
      console.error('[SmritiRoots Auth Error]:', err);
      let msg = err.message || 'Authentication error. Please try again.';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        msg = 'Cannot connect to Flask backend at http://127.0.0.1:5000. Is the backend server running? (Run `python run.py` in the backend folder)';
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="auth-view-container animate-fade-in">
      {/* Brand Header */}
      <div className="auth-brand-center">
        <LogoIcon className="auth-logo-large" />
        <h1 className="auth-brand-name">SmritiRoots</h1>
        <p className="auth-brand-tagline">Play · Remember · Live Better</p>
      </div>

      {/* Auth Card */}
      <div className="auth-card">
        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="auth-tabs-toggle">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
          >
            Create Account
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="auth-alert error animate-fade-in" role="alert">
            <span className="alert-icon"><AlertTriangle size={16} /></span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success animate-fade-in" role="status">
            <span className="alert-icon"><Check size={16} /></span>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Role Selector (visible in Register mode and optional in Login mode) */}
          <div className="form-group">
            <label className="form-label">I am using this app as a:</label>
            <div className="role-selector-grid">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`role-card-btn ${role === 'patient' ? 'selected' : ''}`}
              >
                <span className="role-avatar-emoji" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={22} color="#166534" />
                </span>
                <div className="role-text-col">
                  <strong className="role-name">Patient</strong>
                  <span className="role-sub">Play games & reminders</span>
                </div>
                <div className={`role-radio-dot ${role === 'patient' ? 'checked' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setRole('caregiver')}
                className={`role-card-btn ${role === 'caregiver' ? 'selected' : ''}`}
              >
                <span className="role-avatar-emoji" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stethoscope size={22} color="#1E40AF" />
                </span>
                <div className="role-text-col">
                  <strong className="role-name">Caregiver</strong>
                  <span className="role-sub">Monitor & set reminders</span>
                </div>
                <div className={`role-radio-dot ${role === 'caregiver' ? 'checked' : ''}`} />
              </button>
            </div>
          </div>

          {/* Full Name (Registration only) */}
          {mode === 'register' && (
            <div className="form-group animate-fade-in">
              <label className="form-label" htmlFor="auth-name">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                placeholder={role === 'patient' ? 'e.g., Maya Sharma' : 'e.g., Dr. Rajesh Sharma'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="form-input"
              />
            </div>
          )}

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              autoComplete="email"
            />
          </div>

          {/* Caregiver Email (Optional for Patient Registration) */}
          {mode === 'register' && role === 'patient' && (
            <div className="form-group animate-fade-in">
              <label className="form-label" htmlFor="auth-caregiver-email">
                Caregiver's Email (Optional)
              </label>
              <input
                id="auth-caregiver-email"
                type="email"
                placeholder="caregiver@example.com"
                value={caregiverEmail}
                onChange={(e) => setCaregiverEmail(e.target.value)}
                className="form-input"
              />
              <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <LinkIcon size={12} style={{ flexShrink: 0 }} />
                <span>Enter your caregiver or family member's email so they can monitor your progress and set daily reminders.</span>
              </span>
            </div>
          )}

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input password-input"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="card-btn auth-submit-btn"
          >
            <span>{isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRightIcon className="btn-arrow-icon" />
          </button>
        </form>
      </div>
    </div>
  );
}
