/**
 * SmritiRoots Unified API Client
 * Connects to Flask backend routes and provides graceful fallback for interactive preview.
 */

const API_BASE = '/api';

// Token storage key
const TOKEN_KEY = 'smritiroots_token';
const USER_KEY = 'smritiroots_user';
const PATIENT_KEY = 'smritiroots_patient';

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  getPatient: () => {
    try {
      return JSON.parse(localStorage.getItem(PATIENT_KEY));
    } catch {
      return null;
    }
  },
  setPatient: (patient) => localStorage.setItem(PATIENT_KEY, JSON.stringify(patient)),
};

// Initial default demo state for Maya Ji
export const DEFAULT_PATIENT = {
  id: 'patient_maya_01',
  user_id: 'user_maya_01',
  preferred_name: 'Maya Ji',
  name: 'Maya Sharma',
  age: 72,
  preferred_language: 'Hindi / English',
  caregiver_name: 'Dr. Rajesh Sharma',
  caregiver_id: 'caregiver_01',
  family: ['Son (Rajesh)', 'Granddaughter (Ananya)', 'Grandson (Aarav)'],
  favorite_things: ['Morning ginger tea', 'Marigold flowers', 'Classical devotional songs'],
  daily_routine: ['Morning tea at 8:00 AM', 'Medicine at 9:00 AM', 'Garden walk at 5:00 PM'],
  important_places: ['Home garden in Jaipur', 'Vrindavan temple', 'Shimla summer cottage'],
  personal_memories: [
    'Walking in the rose garden every spring',
    'Cooking kheer with grandchildren during Diwali',
    'Morning walks with tea under the banyan tree'
  ]
};

export const DEFAULT_REMINDERS = [
  {
    id: 'rem_1',
    patient_id: 'patient_maya_01',
    title: 'Take Medicine',
    category: 'medicine',
    scheduled_time: 'Today, 9:00 AM',
    completed: false,
    subtitle: 'Blood pressure & vitamins after breakfast'
  },
  {
    id: 'rem_2',
    patient_id: 'patient_maya_01',
    title: 'Drink Warm Water',
    category: 'hydration',
    scheduled_time: 'Today, 11:30 AM',
    completed: false,
    subtitle: 'Stay hydrated with warm lemon water'
  },
  {
    id: 'rem_3',
    patient_id: 'patient_maya_01',
    title: 'Evening Garden Walk',
    category: 'activity',
    scheduled_time: 'Today, 5:00 PM',
    completed: false,
    subtitle: '15-minute gentle stroll in the courtyard'
  },
  {
    id: 'rem_4',
    patient_id: 'patient_maya_01',
    title: 'Evening Medicine',
    category: 'medicine',
    scheduled_time: 'Today, 8:30 PM',
    completed: false,
    subtitle: 'Post-dinner tablet'
  }
];

export const DEFAULT_QUESTIONS = [
  {
    id: 'q1',
    category: 'memory',
    difficulty: 'easy',
    question: 'Which fruit is usually yellow when ripe?',
    options: ['Apple', 'Banana', 'Grape', 'Watermelon'],
    answer: 'Banana'
  },
  {
    id: 'q2',
    category: 'memory',
    difficulty: 'easy',
    question: 'Which animal is known for saying "meow"?',
    options: ['Cat', 'Dog', 'Cow', 'Bird'],
    answer: 'Cat'
  },
  {
    id: 'q3',
    category: 'attention',
    difficulty: 'easy',
    question: 'Which of these items would you normally find in a kitchen?',
    options: ['Spoon', 'Pillow', 'Shoes', 'Bicycle'],
    answer: 'Spoon'
  },
  {
    id: 'q4',
    category: 'routine',
    difficulty: 'easy',
    question: 'What is a healthy routine to do after waking up in the morning?',
    options: ['Brush your teeth & drink water', 'Go straight to sleep', 'Turn off all lights', 'Skip breakfast entirely'],
    answer: 'Brush your teeth & drink water'
  },
  {
    id: 'q5',
    category: 'memory',
    difficulty: 'easy',
    question: 'What season brings blooming flowers and gentle warm breezes?',
    options: ['Spring', 'Heavy Blizzard', 'Late Midnight', 'Deep Winter'],
    answer: 'Spring'
  }
];

export const DEFAULT_MEMORIES = [
  {
    id: 'mem_1',
    title: 'Diwali Celebration with Family',
    description: 'Gathered in the courtyard lighting diyas with Ananya and Aarav.',
    category: 'family',
    date: 'November 2025',
    image_emoji: ''
  },
  {
    id: 'mem_2',
    title: 'Morning in the Rose Garden',
    description: 'Sitting under the shade sipping hot ginger tea and listening to morning birds.',
    category: 'place',
    date: 'Every Morning',
    image_emoji: ''
  },
  {
    id: 'mem_3',
    title: 'Trip to Shimla Hills',
    description: 'Crisp mountain air, watching snow peaks with family.',
    category: 'event',
    date: 'Summer 2024',
    image_emoji: ''
  }
];

export const DEFAULT_GAMES = [
  {
    id: 'brain-boost',
    name: 'Brain Boost Quiz',
    description: 'Gentle question and answer puzzles to keep your mind sharp and active.',
    category: 'memory',
    default_difficulty: 'easy',
    badge: 'Daily Favorite'
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    description: 'Match simple familiar cards to exercise short-term memory.',
    category: 'memory',
    default_difficulty: 'easy',
    badge: 'Popular'
  },
  {
    id: 'attention-focus',
    name: 'Attention Focus',
    description: 'Find the right item and improve gentle concentration.',
    category: 'attention',
    default_difficulty: 'easy',
    badge: 'Focus'
  },
  {
    id: 'daily-routine',
    name: 'Daily Routine Recall',
    description: 'Recall comforting daily activities in the right natural sequence.',
    category: 'routine',
    default_difficulty: 'easy',
    badge: 'Comfort'
  }
];

/**
 * Helper to make authenticated fetch calls
 */
async function fetchWithAuth(url, options = {}) {
  const token = storage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.warn(`API request to ${url} fallback:`, err.message);
    throw err;
  }
}

export const api = {
  // Health check
  checkHealth: async () => {
    try {
      return await fetchWithAuth(`${API_BASE}/health`);
    } catch {
      return { status: 'mock', message: 'Running in frontend preview mode' };
    }
  },

  // Auth: Register (creates real document in MongoDB users collection)
  register: async (name, email, password, role, caregiverEmail = null) => {
    console.log('[SmritiRoots API] → POST /api/auth/register', { name, email, role, caregiverEmail });
    const data = await fetchWithAuth(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role: role,
        ...(caregiverEmail ? { caregiver_email: caregiverEmail.trim().toLowerCase() } : {})
      })
    });
    console.log('[SmritiRoots API] ← POST /api/auth/register Success:', data);
    return data;
  },

  // Auth: Login (verifies bcrypt hash in MongoDB users collection)
  login: async (email, password) => {
    console.log('[SmritiRoots API] → POST /api/auth/login', { email: email.trim().toLowerCase() });
    const data = await fetchWithAuth(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password: password.trim()
      })
    });
    console.log('[SmritiRoots API] ← POST /api/auth/login Success:', data);
    if (data?.token) {
      storage.setToken(data.token);
      storage.setUser(data.user);
    }
    return data;
  },

  // Get current patient profile
  getMyProfile: async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/patients/me`);
      if (data?.patient) {
        storage.setPatient(data.patient);
        return data.patient;
      }
    } catch {
      // Fallback to currently logged in user info
    }

    const storedUser = storage.getUser();
    if (storedUser) {
      const fallbackUserPatient = {
        id: storedUser.id || 'patient_current',
        user_id: storedUser.id,
        name: storedUser.name,
        preferred_name: storedUser.preferred_name || storedUser.name,
        email: storedUser.email,
        age: storedUser.age || null,
        preferred_language: 'English',
        caregiver_name: null,
        family: [],
        favorite_things: [],
        daily_routine: [],
        important_places: [],
        personal_memories: []
      };
      storage.setPatient(fallbackUserPatient);
      return fallbackUserPatient;
    }

    return storage.getPatient() || DEFAULT_PATIENT;
  },

  // Get patient reminders
  getReminders: async (patientId) => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/reminders/${patientId}`);
      if (data?.reminders && data.reminders.length > 0) {
        return data.reminders;
      }
    } catch {
      // Return local fallback
    }
    return DEFAULT_REMINDERS;
  },

  // Complete reminder (Mark as Done)
  completeReminder: async (reminderId) => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/reminders/${reminderId}/complete`, {
        method: 'PUT'
      });
      return data;
    } catch {
      return { status: 'success', message: 'Marked as completed locally' };
    }
  },

  // Get memories
  getMemories: async (patientId) => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/memories/${patientId}`);
      if (data?.memories && data.memories.length > 0) {
        return data.memories;
      }
    } catch {
      // Return local fallback
    }
    return DEFAULT_MEMORIES;
  },

  // Get games catalog
  getGames: async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/games/`);
      if (data?.games && data.games.length > 0) {
        return data.games;
      }
    } catch {
      // Return local fallback
    }
    return DEFAULT_GAMES;
  },

  // Get Questions (Personalized if patient has personal info, else fixed backup questions)
  getQuestions: async (category = null, difficulty = null, patientId = null) => {
    try {
      let url = `${API_BASE}/questions/general`;
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (difficulty) params.append('difficulty', difficulty);
      if (patientId) params.append('patient_id', patientId);
      if (params.toString()) url += `?${params.toString()}`;

      const data = await fetchWithAuth(url);
      if (data?.questions && data.questions.length > 0) {
        return data.questions;
      }
    } catch (err) {
      console.warn('Questions fetch error, using default backup:', err.message);
    }
    return DEFAULT_QUESTIONS;
  },

  // Check Answer
  checkAnswer: async (questionId, selectedAnswer) => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/quiz/check-answer`, {
        method: 'POST',
        body: JSON.stringify({ question_id: questionId, selected_answer: selectedAnswer })
      });
      return data;
    } catch {
      // Local evaluation against DEFAULT_QUESTIONS
      const q = DEFAULT_QUESTIONS.find(item => item.id === questionId);
      const isCorrect = q ? q.answer === selectedAnswer : true;
      return { status: 'success', correct: isCorrect };
    }
  },

  // Submit Game Results
  submitGameResult: async (payload) => {
    console.log('[SmritiRoots API] → POST /api/game-results/', payload);
    const data = await fetchWithAuth(`${API_BASE}/game-results/`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    console.log('[SmritiRoots API] ← POST /api/game-results/ Success:', data);
    return data;
  },

  // ==========================================
  // CAREGIVER PORTAL API METHODS
  // ==========================================

  // Link an existing registered patient to caregiver by email
  linkPatient: async (email) => {
    console.log('[SmritiRoots API] → POST /api/caregiver/link-patient', { email });
    const data = await fetchWithAuth(`${API_BASE}/caregiver/link-patient`, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
    console.log('[SmritiRoots API] ← POST /api/caregiver/link-patient Success:', data);
    return data;
  },

  // Get Caregiver Dashboard for a specific patient
  getCaregiverDashboard: async (patientId) => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/caregiver/dashboard/${patientId}`);
      return data?.dashboard || null;
    } catch (err) {
      console.warn('Dashboard fetch error:', err.message);
      return null;
    }
  },

  // Get all patients assigned to this caregiver
  getCaregiverPatients: async () => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/patients/`);
      return data?.patients || [];
    } catch (err) {
      console.warn('Patients fetch error:', err.message);
      return [];
    }
  },

  // Get single patient details
  getPatientById: async (patientId) => {
    const data = await fetchWithAuth(`${API_BASE}/patients/${patientId}`);
    return data?.patient || null;
  },

  // Create a new patient (Caregiver only)
  createPatient: async (patientData) => {
    const data = await fetchWithAuth(`${API_BASE}/patients/`, {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
    return data;
  },

  // Update existing patient profile (Caregiver only)
  updatePatient: async (patientId, updates) => {
    const data = await fetchWithAuth(`${API_BASE}/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return data;
  },

  // Create a reminder for patient
  createReminder: async ({ patient_id, title, category, scheduled_time }) => {
    const data = await fetchWithAuth(`${API_BASE}/reminders/`, {
      method: 'POST',
      body: JSON.stringify({ patient_id, title, category, scheduled_time })
    });
    return data;
  },

  // Delete a reminder
  deleteReminder: async (reminderId) => {
    const data = await fetchWithAuth(`${API_BASE}/reminders/${reminderId}`, {
      method: 'DELETE'
    });
    return data;
  },

  // Create a memory for patient
  createMemory: async ({ patient_id, title, description, category, image_url }) => {
    const data = await fetchWithAuth(`${API_BASE}/memories/`, {
      method: 'POST',
      body: JSON.stringify({ patient_id, title, description, category, image_url })
    });
    return data;
  },

  // Delete a memory
  deleteMemory: async (memoryId) => {
    const data = await fetchWithAuth(`${API_BASE}/memories/${memoryId}`, {
      method: 'DELETE'
    });
    return data;
  },

  // Get patient game results history
  getPatientResults: async (patientId) => {
    try {
      const data = await fetchWithAuth(`${API_BASE}/game-results/${patientId}`);
      return data?.results || [];
    } catch {
      return [];
    }
  },

  // Voice AI Companion API
  sendCompanionMessage: async ({ conversationId, message, language = 'en-IN' }) => {
    return await fetchWithAuth(`${API_BASE}/companion/message`, {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
        language
      })
    });
  },

  getCompanionConversation: async (conversationId) => {
    return await fetchWithAuth(`${API_BASE}/companion/conversations/${conversationId}`);
  },

  createCompanionConversation: async (language = 'en-IN') => {
    return await fetchWithAuth(`${API_BASE}/companion/conversations`, {
      method: 'POST',
      body: JSON.stringify({ language })
    });
  },

  getCompanionConversations: async () => {
    return await fetchWithAuth(`${API_BASE}/companion/conversations`);
  }
};

