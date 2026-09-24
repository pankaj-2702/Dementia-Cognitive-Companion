import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  RotateCw,
  BarChart3,
  User,
  Clock,
  Camera,
  LogOut,
  Check,
  CheckCircle2,
  AlertTriangle,
  Users,
  Sprout,
  Pill,
  Droplets,
  Activity,
  Stethoscope,
  Plus,
  Trash2,
  Image as ImageIcon,
  ImagePlus,
  Link as LinkIcon
} from 'lucide-react';
import { LogoIcon, BellIcon, BrainIcon, ArrowRightIcon, CheckIcon } from '../components/Icons';
import { api } from '../api';

export function CaregiverView({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'patient_profile' | 'reminders' | 'memories'
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [modalTab, setModalTab] = useState('register'); // 'register' | 'link'
  const [linkEmail, setLinkEmail] = useState('');
  const [modalError, setModalError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Forms State
  const [patientForm, setPatientForm] = useState({
    preferred_name: '',
    age: '',
    preferred_language: 'English',
    family: '',
    favorite_things: '',
    daily_routine: '',
    important_places: ''
  });

  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    email: '',
    password: '',
    preferred_name: '',
    age: '',
    preferred_language: 'English'
  });

  const [newReminderForm, setNewReminderForm] = useState({
    title: '',
    category: 'medicine',
    scheduled_time: '09:00 AM'
  });

  const [newMemoryForm, setNewMemoryForm] = useState({
    title: '',
    description: '',
    category: 'family',
    image_url: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch patients list for this caregiver
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const pts = await api.getCaregiverPatients();
      const list = Array.isArray(pts) ? pts : [];
      setPatients(list);
      if (list.length > 0) {
        setSelectedPatientId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev;
          return list[0].id;
        });
      } else {
        setSelectedPatientId('');
        setDashboardData(null);
      }
    } catch (err) {
      console.error('Failed to load caregiver patients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual or automatic refresh of dashboard data
  const refreshCurrentData = async (showSpinner = false) => {
    if (!selectedPatientId) return;
    if (showSpinner) setIsRefreshing(true);
    try {
      const data = await api.getCaregiverDashboard(selectedPatientId);
      if (data) setDashboardData(data);
    } catch (err) {
      console.warn('Dashboard live refresh:', err.message);
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  };

  // 2. Fetch Dashboard & Patient Data when selected patient changes
  useEffect(() => {
    if (!selectedPatientId) {
      setDashboardData(null);
      return;
    }

    let isMounted = true;
    async function loadDashboard(showSpinner = true) {
      if (showSpinner) setIsLoading(true);
      try {
        const data = await api.getCaregiverDashboard(selectedPatientId);
        if (!isMounted) return;
        setDashboardData(data);

        // Pre-fill patient edit form on primary load
        if (data?.patient && showSpinner) {
          setPatientForm({
            preferred_name: data.patient.preferred_name || '',
            age: data.patient.age ?? '',
            preferred_language: data.patient.preferred_language || 'English',
            family: Array.isArray(data.patient.family) ? data.patient.family.join(', ') : (data.patient.family || ''),
            favorite_things: Array.isArray(data.patient.favorite_things) ? data.patient.favorite_things.join(', ') : (data.patient.favorite_things || ''),
            daily_routine: Array.isArray(data.patient.daily_routine) ? data.patient.daily_routine.join(', ') : (data.patient.daily_routine || ''),
            important_places: Array.isArray(data.patient.important_places) ? data.patient.important_places.join(', ') : (data.patient.important_places || '')
          });
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load dashboard:', err);
      } finally {
        if (isMounted && showSpinner) setIsLoading(false);
      }
    }

    loadDashboard(true);

    // Auto-poll every 15s so game results and activities played by patient update dynamically
    const pollInterval = setInterval(() => {
      loadDashboard(false);
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [selectedPatientId]);

  // Handle Save Patient Profile Changes
  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    setIsSubmitting(true);
    setActionSuccess('');
    setActionError('');

    try {
      const familyArr = typeof patientForm.family === 'string'
        ? patientForm.family.split(',').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(patientForm.family) ? patientForm.family : []);

      const favArr = typeof patientForm.favorite_things === 'string'
        ? patientForm.favorite_things.split(',').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(patientForm.favorite_things) ? patientForm.favorite_things : []);

      const routineArr = typeof patientForm.daily_routine === 'string'
        ? patientForm.daily_routine.split(',').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(patientForm.daily_routine) ? patientForm.daily_routine : []);

      const placesArr = typeof patientForm.important_places === 'string'
        ? patientForm.important_places.split(',').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(patientForm.important_places) ? patientForm.important_places : []);

      const ageVal = patientForm.age !== '' ? parseInt(patientForm.age, 10) : null;

      const updates = {
        preferred_name: (patientForm.preferred_name || '').trim(),
        age: !isNaN(ageVal) ? ageVal : null,
        preferred_language: patientForm.preferred_language || 'English',
        family: familyArr,
        favorite_things: favArr,
        daily_routine: routineArr,
        important_places: placesArr
      };

      await api.updatePatient(selectedPatientId, updates);
      setActionSuccess('Patient profile updated successfully!');

      // Refresh dashboard
      const updated = await api.getCaregiverDashboard(selectedPatientId);
      if (updated) setDashboardData(updated);
    } catch (err) {
      setActionError(err.message || 'Failed to update patient profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create New Patient
  const handleCreateNewPatient = async (e) => {
    e.preventDefault();
    setModalError('');
    setActionError('');
    setActionSuccess('');

    // Pre-validation to avoid crashing or submitting invalid data
    const name = newPatientForm.name?.trim() || '';
    if (!name) {
      setModalError('Please enter the patient full legal name.');
      return;
    }

    const email = newPatientForm.email?.trim().toLowerCase() || '';
    if (!email || !email.includes('@')) {
      setModalError('Please enter a valid email address.');
      return;
    }

    const password = newPatientForm.password?.trim() || '';
    if (!password || password.length < 4) {
      setModalError('Please set a password of at least 4 characters.');
      return;
    }

    const ageRaw = String(newPatientForm.age || '').trim();
    const ageNum = parseInt(ageRaw, 10);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setModalError('Please enter a valid age between 1 and 120.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.createPatient({
        name,
        email,
        password,
        preferred_name: (newPatientForm.preferred_name || name).trim(),
        age: ageNum,
        preferred_language: newPatientForm.preferred_language || 'English'
      });

      setShowAddPatientModal(false);
      setModalError('');
      setActionSuccess('New patient account created successfully!');
      setNewPatientForm({
        name: '',
        email: '',
        password: '',
        preferred_name: '',
        age: '',
        preferred_language: 'English'
      });

      // Reload patients from database
      const pts = await api.getCaregiverPatients();
      const list = Array.isArray(pts) ? pts : [];
      setPatients(list);

      const createdId = res?.patient?.id || res?.patient?.patient_id || (list.length > 0 ? list[list.length - 1].id : '');
      if (createdId) {
        setSelectedPatientId(createdId);
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create patient account. Please verify input.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Linking an Existing Patient by Email
  const handleLinkPatient = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!linkEmail.trim()) {
      setModalError('Please enter the patient’s registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.linkPatient(linkEmail.trim());
      setShowAddPatientModal(false);
      setActionSuccess(res?.message || 'Patient successfully linked to your caregiver account!');
      setLinkEmail('');

      // Reload patients
      const pts = await api.getCaregiverPatients();
      const list = Array.isArray(pts) ? pts : [];
      setPatients(list);

      const linkedId = res?.patient?.id || res?.patient?.patient_id;
      if (linkedId) {
        setSelectedPatientId(linkedId);
      } else if (list.length > 0) {
        setSelectedPatientId(list[list.length - 1].id);
      }
    } catch (err) {
      setModalError(err.message || 'Failed to link patient. Please verify the email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Reminder
  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !newReminderForm.title.trim()) return;

    setIsSubmitting(true);
    setActionSuccess('');
    setActionError('');

    try {
      await api.createReminder({
        patient_id: selectedPatientId,
        title: newReminderForm.title.trim(),
        category: newReminderForm.category,
        scheduled_time: newReminderForm.scheduled_time.trim()
      });

      setActionSuccess('Reminder scheduled successfully!');
      setNewReminderForm({ title: '', category: 'medicine', scheduled_time: '09:00 AM' });

      // Refresh dashboard
      const updated = await api.getCaregiverDashboard(selectedPatientId);
      if (updated) setDashboardData(updated);
    } catch (err) {
      setActionError(err.message || 'Failed to schedule reminder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Reminder
  const handleDeleteReminder = async (reminderId) => {
    if (!confirm('Are you sure you want to remove this reminder?')) return;
    try {
      await api.deleteReminder(reminderId);
      const updated = await api.getCaregiverDashboard(selectedPatientId);
      if (updated) setDashboardData(updated);
      setActionSuccess('Reminder removed.');
    } catch (err) {
      setActionError(err.message || 'Failed to delete reminder.');
    }
  };

  // Handle Add Memory
  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !newMemoryForm.title.trim()) return;

    setIsSubmitting(true);
    setActionSuccess('');
    setActionError('');

    try {
      await api.createMemory({
        patient_id: selectedPatientId,
        title: newMemoryForm.title.trim(),
        description: newMemoryForm.description.trim(),
        category: newMemoryForm.category,
        image_url: newMemoryForm.image_url.trim() || null
      });

      setActionSuccess('Special memory added successfully!');
      setNewMemoryForm({ title: '', description: '', category: 'family', image_url: '' });

      // Refresh dashboard
      const updated = await api.getCaregiverDashboard(selectedPatientId);
      if (updated) setDashboardData(updated);
    } catch (err) {
      setActionError(err.message || 'Failed to add memory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Memory
  const handleDeleteMemory = async (memoryId) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    try {
      await api.deleteMemory(memoryId);
      const updated = await api.getCaregiverDashboard(selectedPatientId);
      if (updated) setDashboardData(updated);
      setActionSuccess('Memory removed.');
    } catch (err) {
      setActionError(err.message || 'Failed to delete memory.');
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || dashboardData?.patient;

  return (
    <div className="caregiver-portal animate-fade-in">
      {/* 1. Caregiver Header Bar */}
      <header className="caregiver-header">
        <div className="caregiver-header-main">
          {/* Left: Hamburger Menu Button & Brand */}
          <div className="caregiver-header-left">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="caregiver-hamburger-btn"
              aria-label="Open Caregiver Menu"
              title="Open Menu"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>

            <div className="caregiver-brand">
              <LogoIcon className="caregiver-brand-icon" />
              <span className="caregiver-brand-title">SmritiRoots</span>
            </div>
          </div>

          {/* Right: Caregiver Name Pill (opens menu on click) */}
          <div className="caregiver-user-actions">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="caregiver-name-btn"
              title={`Caregiver: ${currentUser?.name || 'Caregiver'} (Click to open menu)`}
            >
              <span className="caregiver-avatar-dot"></span>
              <span className="caregiver-name-text">{currentUser?.name || 'Caregiver'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hamburger Slide-over Drawer & Backdrop Overlay */}
      {isMenuOpen && (
        <div className="caregiver-drawer-overlay animate-fade-in" onClick={() => setIsMenuOpen(false)}>
          <div className="caregiver-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="drawer-header">
              <div className="drawer-brand">
                <LogoIcon className="caregiver-brand-icon" />
                <span className="caregiver-brand-title">SmritiRoots</span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="drawer-close-btn"
                aria-label="Close Menu"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Caregiver Profile Card */}
            <div className="drawer-profile-card">
              <div className="drawer-avatar">
                {(currentUser?.name || 'C').charAt(0).toUpperCase()}
              </div>
              <div className="drawer-profile-info">
                <div className="drawer-user-name">{currentUser?.name || 'Caregiver'}</div>
                <div className="drawer-user-email">{currentUser?.email || 'caregiver@smritiroots.org'}</div>
                <span className="drawer-role-badge">Caregiver Account</span>
              </div>
            </div>

            {/* Managing Patient & Actions Section (Shifted from Header) */}
            <div className="drawer-patient-section">
              <div className="drawer-section-title">Managing Patient</div>
              <div className="drawer-patient-selector-box">
                {patients.length > 0 ? (
                  <select
                    id="drawer-patient-select"
                    value={selectedPatientId}
                    onChange={(e) => {
                      setSelectedPatientId(e.target.value);
                      setIsMenuOpen(false);
                    }}
                    className="drawer-patient-dropdown"
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.preferred_name || p.name} {p.age ? `(Age ${p.age})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="no-patients-text" style={{ padding: '8px 12px', fontSize: '13px' }}>
                    No patients assigned yet
                  </div>
                )}
              </div>

              {/* Action Buttons: Add / Link Patient & Refresh Data */}
              <div className="drawer-patient-action-row">
                <button
                  onClick={() => {
                    setModalError('');
                    setModalTab('register');
                    setShowAddPatientModal(true);
                    setIsMenuOpen(false);
                  }}
                  className="drawer-action-btn primary"
                  title="Add or link patient"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <UserPlus size={15} />
                  <span>Add / Link Patient</span>
                </button>

                <button
                  onClick={() => {
                    refreshCurrentData(true);
                    setIsMenuOpen(false);
                  }}
                  disabled={isRefreshing || !selectedPatientId}
                  className="drawer-action-btn secondary"
                  title="Fetch latest game scores and activity updates"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <RotateCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                  <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
              </div>
            </div>

            {/* Drawer Navigation Links */}
            <div className="drawer-menu-section">
              <div className="drawer-section-title">Navigation</div>
              <button
                onClick={() => { setActiveTab('overview'); setIsMenuOpen(false); }}
                className={`drawer-menu-item ${activeTab === 'overview' ? 'active' : ''}`}
              >
                <span className="drawer-item-icon"><BarChart3 size={18} /></span>
                <span>Cognitive Overview</span>
              </button>
              <button
                onClick={() => { setActiveTab('patient_profile'); setIsMenuOpen(false); }}
                className={`drawer-menu-item ${activeTab === 'patient_profile' ? 'active' : ''}`}
              >
                <span className="drawer-item-icon"><User size={18} /></span>
                <span>Patient Profile & AI Data</span>
              </button>
              <button
                onClick={() => { setActiveTab('reminders'); setIsMenuOpen(false); }}
                className={`drawer-menu-item ${activeTab === 'reminders' ? 'active' : ''}`}
              >
                <span className="drawer-item-icon"><Clock size={18} /></span>
                <span>Daily Reminders</span>
              </button>
              <button
                onClick={() => { setActiveTab('memories'); setIsMenuOpen(false); }}
                className={`drawer-menu-item ${activeTab === 'memories' ? 'active' : ''}`}
              >
                <span className="drawer-item-icon"><Camera size={18} /></span>
                <span>Cherished Memories</span>
              </button>
            </div>

            {/* Drawer Footer with Sign Out */}
            <div className="drawer-footer">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                className="drawer-logout-btn"
                title="Sign out"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="caregiver-alert success animate-fade-in">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </span>
          <button onClick={() => setActionSuccess('')} className="alert-close">×</button>
        </div>
      )}
      {actionError && (
        <div className="caregiver-alert error animate-fade-in">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} />
            <span>{actionError}</span>
          </span>
          <button onClick={() => setActionError('')} className="alert-close">×</button>
        </div>
      )}

      {/* 2. Empty State if Caregiver has 0 Patients */}
      {patients.length === 0 && !isLoading && (
        <div className="caregiver-empty-state">
          <div className="empty-card">
            <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <Users size={48} color="#0D9488" />
            </div>
            <h2>Welcome to Your Caregiver Dashboard</h2>
            <p>You have not registered any elders or patients to monitor yet.</p>
            <button
              onClick={() => {
                setModalError('');
                setShowAddPatientModal(true);
              }}
              className="card-btn btn-primary"
            >
              Register Your First Patient Now
            </button>
          </div>
        </div>
      )}

      {/* 3. Caregiver Navigation Tabs */}
      {patients.length > 0 && (
        <>
          <nav className="caregiver-tabs-nav">
            <button
              onClick={() => setActiveTab('overview')}
              className={`caregiver-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <BarChart3 size={16} />
              <span>Cognitive Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('patient_profile')}
              className={`caregiver-tab-item ${activeTab === 'patient_profile' ? 'active' : ''}`}
            >
              <User size={16} />
              <span>Patient Profile & Personalization</span>
            </button>
            <button
              onClick={() => setActiveTab('reminders')}
              className={`caregiver-tab-item ${activeTab === 'reminders' ? 'active' : ''}`}
            >
              <Clock size={16} />
              <span>Scheduled Reminders</span>
              <span className="caregiver-tab-badge">
                {dashboardData?.reminders?.count || 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('memories')}
              className={`caregiver-tab-item ${activeTab === 'memories' ? 'active' : ''}`}
            >
              <Camera size={16} />
              <span>Personal Memories</span>
              <span className="caregiver-tab-badge">
                {dashboardData?.memories?.count || 0}
              </span>
            </button>
          </nav>

          {/* 4. Tab Content Area */}
          <main className="caregiver-main-content">
            {isLoading ? (
              <div className="caregiver-loading">Loading patient analytics...</div>
            ) : !dashboardData ? (
              <div className="table-empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p>Could not load cognitive dashboard data for {selectedPatient?.preferred_name || 'this patient'}.</p>
                <button
                  onClick={() => {
                    if (selectedPatientId) {
                      setIsLoading(true);
                      api.getCaregiverDashboard(selectedPatientId).then(d => {
                        setDashboardData(d);
                      }).finally(() => setIsLoading(false));
                    }
                  }}
                  className="card-btn btn-secondary"
                  style={{ maxWidth: '200px', margin: '16px auto 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span>Retry Loading</span>
                  <RotateCw size={14} />
                </button>
              </div>
            ) : (
              <>
                {/* ========================================================
                    TAB 1: COGNITIVE OVERVIEW & ANALYTICS
                ======================================================== */}
                {activeTab === 'overview' && (
                  <div className="tab-pane animate-fade-in">
                    {/* Patient Banner */}
                    <div className="caregiver-patient-banner">
                      <div className="patient-avatar-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={24} color="#0D9488" />
                      </div>
                      <div className="patient-banner-info">
                        <h2>{selectedPatient?.preferred_name || 'Patient'}</h2>
                        <p>
                          {selectedPatient?.age ? `Age ${selectedPatient.age} · ` : ''}
                          Language: {selectedPatient?.preferred_language || 'English'}
                        </p>
                      </div>
                    </div>

                    {/* Vitals & Cognitive Stat Cards */}
                    <div className="caregiver-metrics-grid">
                      <div className="metric-box bg-purple">
                        <span className="metric-label">Total Brain Games Played</span>
                        <span className="metric-val">{dashboardData?.games?.total_games || 0}</span>
                        <span className="metric-sub">Session records</span>
                      </div>

                      <div className="metric-box bg-green">
                        <span className="metric-label">Average Cognitive Accuracy</span>
                        <span className="metric-val">
                          {dashboardData?.games?.average_accuracy != null ? `${dashboardData.games.average_accuracy}%` : 'N/A'}
                        </span>
                        <span className="metric-sub">Across all quizzes</span>
                      </div>

                      <div className="metric-box bg-amber">
                        <span className="metric-label">Highest Score Achieved</span>
                        <span className="metric-val">{dashboardData?.games?.highest_score || 0}</span>
                        <span className="metric-sub">Points scored</span>
                      </div>

                      <div className="metric-box bg-teal">
                        <span className="metric-label">Recommended Next Difficulty</span>
                        <span className="metric-val text-capitalize" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span>{dashboardData?.games?.next_difficulty || 'Easy'}</span>
                          <Sprout size={16} color="#16A34A" />
                        </span>
                        <span className="metric-sub">Dynamic AI progression</span>
                      </div>
                    </div>

                    {/* Game Sessions Table */}
                    <section className="caregiver-section-card">
                      <div className="section-card-header">
                        <h3 className="section-card-title">Recent Cognitive Workout Sessions</h3>
                        <span className="section-count">{(dashboardData?.games?.results || []).length} sessions</span>
                      </div>

                      {(dashboardData?.games?.results || []).length > 0 ? (
                        <div className="table-responsive">
                          <table className="caregiver-table">
                            <thead>
                              <tr>
                                <th>Game ID</th>
                                <th>Score</th>
                                <th>Accuracy</th>
                                <th>Time Taken</th>
                                <th>Difficulty</th>
                                <th>Recorded Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(dashboardData?.games?.results || []).map((r) => (
                                <tr key={r.id || `${r.game_id}-${r.created_at}`}>
                                  <td><strong>{r.game_id}</strong></td>
                                  <td>{r.score ?? 0}</td>
                                  <td>
                                    <span className={`accuracy-pill ${(r.accuracy ?? 0) >= 80 ? 'high' : (r.accuracy ?? 0) >= 50 ? 'mid' : 'low'}`}>
                                      {r.accuracy != null ? `${r.accuracy}%` : 'N/A'}
                                    </span>
                                  </td>
                                  <td>{r.time_taken ?? 0}s</td>
                                  <td><span className="diff-badge">{r.difficulty || 'Easy'}</span></td>
                                  <td>{r.created_at ? new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="table-empty">
                          <p>No games played yet by {selectedPatient?.preferred_name || 'patient'}.</p>
                          <small>As the patient answers daily quizzes on their mobile app, performance trends will populate here automatically.</small>
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {/* ========================================================
                    TAB 2: EDIT PATIENT PROFILE & PERSONALIZATION
                ======================================================== */}
                {activeTab === 'patient_profile' && (
                  <div className="tab-pane animate-fade-in">
                    <div className="caregiver-section-card">
                      <div className="section-card-header">
                        <h3 className="section-card-title">Edit Patient Profile & Cognitive Context</h3>
                        <span className="section-subtitle">Information here personalizes AI quiz questions for comfort and familiar recall.</span>
                      </div>

                      <form onSubmit={handleUpdatePatient} className="caregiver-edit-form">
                        <div className="form-row">
                          <div className="form-group flex-1">
                            <label className="form-label">Preferred Name (e.g. Maya Ji / Dadiji)</label>
                            <input
                              type="text"
                              className="form-input"
                              value={patientForm.preferred_name}
                              onChange={(e) => setPatientForm({ ...patientForm, preferred_name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="form-group flex-1">
                            <label className="form-label">Age</label>
                            <input
                              type="number"
                              className="form-input"
                              min="1"
                              max="120"
                              value={patientForm.age}
                              onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                            />
                          </div>
                          <div className="form-group flex-1">
                            <label className="form-label">Preferred Language</label>
                            <select
                              className="form-input"
                              value={patientForm.preferred_language}
                              onChange={(e) => setPatientForm({ ...patientForm, preferred_language: e.target.value })}
                            >
                              <option value="English">English</option>
                              <option value="Hindi">Hindi</option>
                              <option value="Gujarati">Gujarati</option>
                              <option value="Bengali">Bengali</option>
                              <option value="Tamil">Tamil</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Family Members (Comma separated)</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Ramesh (Spouse), Ananya (Granddaughter), Aarav (Grandson)"
                            value={patientForm.family}
                            onChange={(e) => setPatientForm({ ...patientForm, family: e.target.value })}
                          />
                          <small className="field-hint">Used to craft heartwarming, comforting memory questions.</small>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Favorite Things & Comfort Hobbies (Comma separated)</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Classical Sitar, Cardamom Tea, Tulsi Gardening, Jalebi"
                            value={patientForm.favorite_things}
                            onChange={(e) => setPatientForm({ ...patientForm, favorite_things: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Comforting Daily Routines (Comma separated)</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Morning balcony sit-out at 7am, Evening bhajans at 6pm"
                            value={patientForm.daily_routine}
                            onChange={(e) => setPatientForm({ ...patientForm, daily_routine: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Cherished Places (Comma separated)</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Varanasi Ghats, Shimla Ridge, Old Ancestral Home in Jaipur"
                            value={patientForm.important_places}
                            onChange={(e) => setPatientForm({ ...patientForm, important_places: e.target.value })}
                          />
                        </div>

                        <div className="form-submit-row">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="form-submit-btn"
                          >
                            <Check size={16} />
                            <span>{isSubmitting ? 'Saving to Database...' : 'Save Patient Profile'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* ========================================================
                    TAB 3: MANAGE SCHEDULED REMINDERS
                ======================================================== */}
                {activeTab === 'reminders' && (
                  <div className="tab-pane animate-fade-in">
                    {/* Add Reminder Card */}
                    <div className="caregiver-section-card mb-4">
                      <div className="section-card-header">
                        <h3 className="section-card-title">Schedule New Reminder for {selectedPatient?.preferred_name || 'Patient'}</h3>
                      </div>

                      <form onSubmit={handleAddReminder} className="reminder-add-form">
                        <div className="form-row">
                          <div className="form-group flex-2">
                            <label className="form-label">Reminder Title</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. Morning Blood Pressure Tablet"
                              value={newReminderForm.title}
                              onChange={(e) => setNewReminderForm({ ...newReminderForm, title: e.target.value })}
                              required
                            />
                          </div>

                          <div className="form-group flex-1">
                            <label className="form-label">Category</label>
                            <select
                              className="form-input"
                              value={newReminderForm.category}
                              onChange={(e) => setNewReminderForm({ ...newReminderForm, category: e.target.value })}
                            >
                              <option value="medicine">Medicine</option>
                              <option value="hydration">Hydration / Water</option>
                              <option value="activity">Activity / Exercise</option>
                              <option value="appointment">Doctor / Visit</option>
                              <option value="other">Routine / Other</option>
                            </select>
                          </div>

                          <div className="form-group flex-1">
                            <label className="form-label">Scheduled Time</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. 09:00 AM"
                              value={newReminderForm.scheduled_time}
                              onChange={(e) => setNewReminderForm({ ...newReminderForm, scheduled_time: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="form-submit-row">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="form-submit-btn"
                          >
                            <Plus size={16} />
                            <span>{isSubmitting ? 'Scheduling...' : 'Schedule Reminder'}</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Active Reminders List */}
                    <div className="caregiver-section-card">
                      <div className="section-card-header">
                        <h3 className="section-card-title">Current Reminders ({dashboardData?.reminders?.count || 0})</h3>
                      </div>

                      {(dashboardData?.reminders?.items || []).length > 0 ? (
                        <div className="caregiver-reminders-list">
                          {(dashboardData?.reminders?.items || []).map((rem) => (
                            <div key={rem.id} className="caregiver-reminder-row">
                              <div className="reminder-left">
                                <span className={`category-tag ${rem.category}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {rem.category === 'medicine' ? <><Pill size={12} /> Medicine</> :
                                   rem.category === 'hydration' ? <><Droplets size={12} /> Hydration</> :
                                   rem.category === 'activity' ? <><Activity size={12} /> Activity</> :
                                   rem.category === 'appointment' ? <><Stethoscope size={12} /> Appointment</> :
                                   <><Clock size={12} /> Routine</>}
                                </span>
                                <h4 className="reminder-name">{rem.title}</h4>
                                <span className="reminder-time-label">Scheduled for: {rem.scheduled_time}</span>
                              </div>

                              <div className="reminder-right">
                                <span className={`status-pill ${rem.completed ? 'completed' : 'pending'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {rem.completed ? (
                                    <><CheckCircle2 size={12} /> Completed</>
                                  ) : (
                                    <><Clock size={12} /> Pending</>
                                  )}
                                </span>
                                <button
                                  onClick={() => handleDeleteReminder(rem.id)}
                                  className="delete-item-btn"
                                  title="Delete reminder"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Trash2 size={13} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="table-empty">No reminders scheduled for this patient.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* ========================================================
                    TAB 4: MANAGE PERSONAL MEMORIES
                ======================================================== */}
                {activeTab === 'memories' && (
                  <div className="tab-pane animate-fade-in">
                    {/* Add Memory Card */}
                    <div className="caregiver-section-card mb-4">
                      <div className="section-card-header">
                        <h3 className="section-card-title">Add Cherished Memory for {selectedPatient?.preferred_name || 'Patient'}</h3>
                      </div>

                      <form onSubmit={handleAddMemory} className="memory-add-form">
                        <div className="form-row">
                          <div className="form-group flex-2">
                            <label className="form-label">Memory Title</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. Family Trip to Ooty, 1994"
                              value={newMemoryForm.title}
                              onChange={(e) => setNewMemoryForm({ ...newMemoryForm, title: e.target.value })}
                              required
                            />
                          </div>

                          <div className="form-group flex-1">
                            <label className="form-label">Category</label>
                            <select
                              className="form-input"
                              value={newMemoryForm.category}
                              onChange={(e) => setNewMemoryForm({ ...newMemoryForm, category: e.target.value })}
                            >
                              <option value="family">Family</option>
                              <option value="place">Cherished Place</option>
                              <option value="person">Dear Person / Friend</option>
                              <option value="event">Special Event / Celebration</option>
                              <option value="object">Meaningful Keepsake</option>
                              <option value="other">Other Memory</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Story / Emotional Description</label>
                          <textarea
                            className="form-input"
                            rows="3"
                            placeholder="Write a warm memory narrative to prompt recollection..."
                            value={newMemoryForm.description}
                            onChange={(e) => setNewMemoryForm({ ...newMemoryForm, description: e.target.value })}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Photo URL (Optional)</label>
                          <input
                            type="url"
                            className="form-input"
                            placeholder="https://example.com/photo.jpg"
                            value={newMemoryForm.image_url}
                            onChange={(e) => setNewMemoryForm({ ...newMemoryForm, image_url: e.target.value })}
                          />
                        </div>

                        <div className="form-submit-row">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="form-submit-btn"
                          >
                            <ImagePlus size={16} />
                            <span>{isSubmitting ? 'Saving Memory...' : 'Save to Memories'}</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Memories Grid */}
                    <div className="caregiver-section-card">
                      <div className="section-card-header">
                        <h3 className="section-card-title">Saved Memories ({dashboardData?.memories?.count || 0})</h3>
                      </div>

                      {(dashboardData?.memories?.items || []).length > 0 ? (
                        <div className="caregiver-memories-grid">
                          {(dashboardData?.memories?.items || []).map((mem) => (
                            <div key={mem.id} className="caregiver-memory-card">
                              <div className="memory-card-top">
                                <span className="memory-cat-pill">{mem.category}</span>
                                <button
                                  onClick={() => handleDeleteMemory(mem.id)}
                                  className="memory-del-btn"
                                  title="Delete memory"
                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <h4 className="memory-card-title">{mem.title}</h4>
                              <p className="memory-card-desc">{mem.description}</p>
                              {mem.image_url && (
                                <img
                                  src={mem.image_url}
                                  alt={mem.title}
                                  className="memory-card-img"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="table-empty">No personal memories created yet.</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </>
      )}

      {/* 5. Add New Patient Modal Dialog */}
      {showAddPatientModal && (
        <div className="caregiver-modal-overlay">
          <div className="caregiver-modal-card animate-fade-in">
            <div className="modal-header">
              <h3>{modalTab === 'register' ? 'Register New Patient / Elder' : 'Connect Existing Patient'}</h3>
              <button
                onClick={() => {
                  setShowAddPatientModal(false);
                  setModalError('');
                }}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            {/* Modal Tabs: Register vs Link Existing */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setModalTab('register');
                  setModalError('');
                }}
                className={`auth-tab-btn ${modalTab === 'register' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Register New Elder</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab('link');
                  setModalError('');
                }}
                className={`auth-tab-btn ${modalTab === 'link' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <LinkIcon size={14} />
                <span>Link Existing by Email</span>
              </button>
            </div>

            {/* Modal Inline Error Alert */}
            {modalError && (
              <div style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            {modalTab === 'register' ? (
              <form onSubmit={handleCreateNewPatient} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Full Legal Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Maya Sharma"
                    value={newPatientForm.name}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Name (e.g. Maya Ji / Nani)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Maya Ji"
                    value={newPatientForm.preferred_name}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, preferred_name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Age</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="120"
                      placeholder="e.g. 72"
                      value={newPatientForm.age}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, age: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group flex-1">
                    <label className="form-label">Preferred Language</label>
                    <select
                      className="form-input"
                      value={newPatientForm.preferred_language}
                      onChange={(e) => setNewPatientForm({ ...newPatientForm, preferred_language: e.target.value })}
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Gujarati">Gujarati</option>
                      <option value="Bengali">Bengali</option>
                      <option value="Tamil">Tamil</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Patient Login Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="patient@example.com"
                    value={newPatientForm.email}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Patient Login Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Set initial password for the patient app"
                    value={newPatientForm.password}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, password: e.target.value })}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPatientModal(false);
                      setModalError('');
                    }}
                    className="card-btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="form-submit-btn"
                  >
                    <Plus size={16} />
                    <span>{isSubmitting ? 'Creating...' : 'Create Patient'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLinkPatient} className="modal-form">
                <div style={{ padding: '4px 0 14px', color: '#4B5563', fontSize: '13px', lineHeight: '1.5' }}>
                  If the patient has already registered their own account (e.g., from their personal phone), enter their registered email address below. Connecting them will assign your caregiver ID to their profile so you can monitor quiz scores and set reminders.
                </div>

                <div className="form-group">
                  <label className="form-label">Patient Registered Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. patient@example.com"
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPatientModal(false);
                      setModalError('');
                    }}
                    className="card-btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="form-submit-btn"
                  >
                    <LinkIcon size={15} />
                    <span>{isSubmitting ? 'Connecting...' : 'Link Patient'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
