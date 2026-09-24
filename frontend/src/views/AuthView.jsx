import React, { useState } from 'react';
import { AlertTriangle, Check, User, Stethoscope, Link as LinkIcon, Eye, EyeOff, Lightbulb, Edit3 } from 'lucide-react';
import { LogoIcon, ArrowRightIcon } from '../components/Icons';
import { api, storage, DEFAULT_PATIENT } from '../api';

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

  // Quick Demo Logins for instant evaluation
  const handleQuickDemoLogin = (demoRole) => {
    if (demoRole === 'patient') {
      const demoUser = {
        id: 'user_maya_01',
        name: 'Maya Sharma',
        preferred_name: 'Maya Ji',
        email: 'maya@smritiroots.org',
        role: 'patient'
      };
      storage.setToken('mock_jwt_token_maya_ji');
      storage.setUser(demoUser);
      storage.setPatient(DEFAULT_PATIENT);
      onAuthSuccess(demoUser);
    } else {
      const demoUser = {
        id: 'user_rajesh_caregiver',
        name: 'Dr. Rajesh Sharma',
        email: 'dr.rajesh@smritiroots.org',
        role: 'caregiver'
      };
      storage.setToken('mock_jwt_token_caregiver');
      storage.setUser(demoUser);
      onAuthSuccess(demoUser);
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

        {/* Divider */}
        <div className="auth-divider">
          <span>OR QUICK ACTIONS</span>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#6B7280', textAlign: 'center', margin: '2px 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Lightbulb size={14} color="#F59E0B" />
          <span>To register your account, submit the form above.</span>
        </p>

        {/* Quick Helper and Demo Buttons */}
        <div className="quick-demo-buttons">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setName('Pankaj Kumar');
              setEmail('pankaj.kumar@example.com');
              setPassword('SecretPass123!');
              setErrorMsg('');
              setSuccessMsg('Filled test user! Click "Create Account" above to submit.');
            }}
            className="demo-pill-btn"
            style={{ background: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><Edit3 size={15} /></span>
            <span>Fill Form with <strong>Test User</strong></span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setRole('caregiver');
              setName('Dr. Rajesh Sharma');
              setEmail('dr.rajesh@example.com');
              setPassword('DoctorPass123!');
              setErrorMsg('');
              setSuccessMsg('Filled Caregiver details! Click "Create Account" above to submit.');
            }}
            className="demo-pill-btn"
            style={{ background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><Stethoscope size={15} /></span>
            <span>Fill Form with <strong>Caregiver (Dr. Rajesh)</strong></span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('patient')}
            className="demo-pill-btn patient"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><User size={15} /></span>
            <span>Offline Preview: <strong>Maya Ji (Patient)</strong></span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('caregiver')}
            className="demo-pill-btn caregiver"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center' }}><Stethoscope size={15} /></span>
            <span>Offline Preview: <strong>Dr. Rajesh (Caregiver)</strong></span>
          </button>
        </div>
      </div>
    </div>
  );
}
