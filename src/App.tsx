import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './styles.css'

// Water Bar logo as SVG component
function WaterBarLogo() {
  return (
    <svg width="180" height="60" viewBox="0 0 180 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10L25 45L30 10H40L45 45L50 10H60L50 50H40L35 15L30 50H20L10 10H20Z" fill="#22B8CF"/>
      <path d="M70 10H80V30C80 35 82.5 40 90 40C97.5 40 100 35 100 30V10H110V30C110 40 105 50 90 50C75 50 70 40 70 30V10Z" fill="#6741D9"/>
      <path d="M120 10H150V20H130V25H145V35H130V40H150V50H120V10Z" fill="#22B8CF"/>
      <circle cx="160" cy="25" r="10" fill="#22B8CF" fillOpacity="0.7"/>
      <circle cx="170" cy="15" r="5" fill="#6741D9" fillOpacity="0.7"/>
    </svg>
  )
}

// Initialize Supabase client
const supabaseUrl = "https://hmwrlhepsmyvqwkfleck.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd3JsaGVwc215dnF3a2ZsZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDExNDAsImV4cCI6MjA2MDc3NzE0MH0.oyMGM5NGU2mLFDYxwuzXxXXVeKojzhdcbRimgME3Ogc"
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function App() {
  // State management
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{content: string, type: 'user' | 'bot'}>>([])  
  const [loading, setLoading] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [changeSuccess, setChangeSuccess] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [resetSession, setResetSession] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [hydrationData, setHydrationData] = useState<any>(null)
  const [view, setView] = useState<'chat' | 'dashboard'>('chat')
  
  // Handle session management
  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      try {
        setLoadingSession(true)
        const { data, error } = await supabase.auth.getSession()
        
        if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
          fetchDashboardData(data.session)
        }
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setLoadingSession(false)
      }
    }
    
    getSession()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user || null)
      
      if (newSession) {
        fetchDashboardData(newSession)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  // Fetch dashboard data
  const fetchDashboardData = async (currentSession: any) => {
    if (!currentSession?.access_token) return
    
    try {
      const result = await fetch('/api/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({})
      })
      
      const data = await result.json()
      
      if (!data.error) {
        setHydrationData(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    }
  }
  
  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setLoginError('Please enter both email and password')
      return
    }
    
    try {
      setLoading(true)
      setLoginError('')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        throw error
      }
      
      setSession(data.session)
      setUser(data.user)
    } catch (error: any) {
      setLoginError(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }
  
  // Handle registration
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setLoginError('Please enter both email and password')
      return
    }
    
    if (password !== confirmPassword) {
      setLoginError('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      setLoginError('Password must be at least 6 characters')
      return
    }
    
    try {
      setLoading(true)
      setLoginError('')
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            weight_kg: 70 // Default weight, can be updated later
          }
        }
      })
      
      if (error) {
        throw error
      }
      
      if (data.user?.identities?.length === 0) {
        setLoginError('This email is already registered. Please sign in instead.')
        return
      }
      
      // On successful registration
      setIsRegistering(false)
      setLoginError('')
      alert('Registration successful! Please check your email to verify your account.')
    } catch (error: any) {
      setLoginError(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }
  
  // Toggle between login and registration forms
  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering)
    setIsResetting(false)
    setResetSent(false)
    setLoginError('')
  }
  
  // Toggle password reset mode
  const toggleResetMode = () => {
    setIsResetting(!isResetting)
    setIsRegistering(false)
    setResetSent(false)
    setLoginError('')
  }
  
  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setLoginError('Please enter your email address')
      return
    }
    
    try {
      setLoading(true)
      setLoginError('')
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      
      if (error) {
        throw error
      }
      
      setResetSent(true)
    } catch (error: any) {
      setLoginError(error.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setMessages([])
      setHydrationData(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }
  
  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input || !session) return
    
    // Add user message to chat
    const userMessage = { content: input, type: 'user' as const }
    setMessages(prev => [...prev, userMessage])
    
    setLoading(true)
    setInput('')
    
    try {
      // Call the API with auth token
      const result = await fetch('/api/pure-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: input,
          resetSession: resetSession
        })
      })
      
      const data = await result.json()
      
      // Add bot message to chat
      if (data.error) {
        setMessages(prev => [...prev, { content: `Error: ${data.error}`, type: 'bot' }])
      } else if (data.message) {
        setMessages(prev => [...prev, { content: data.message, type: 'bot' }])
        // Update dashboard data after bot response
        fetchDashboardData(session)
      } else {
        setMessages(prev => [...prev, { content: 'Sorry, I could not process your request.', type: 'bot' }])
      }
      
      // Reset the resetSession flag after use
      if (resetSession) {
        setResetSession(false)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setMessages(prev => [...prev, { content: `Error: ${errorMessage}`, type: 'bot' }])
    } finally {
      setLoading(false)
    }
  }
  
  // Handle password change for logged-in users
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password || !newPassword || !confirmPassword) {
      setLoginError('Please fill in all password fields')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setLoginError('New passwords do not match')
      return
    }
    
    if (newPassword.length < 6) {
      setLoginError('New password must be at least 6 characters')
      return
    }
    
    try {
      setLoading(true)
      setLoginError('')
      
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session?.user?.email || '',
        password
      })
      
      if (signInError) {
        setLoginError('Current password is incorrect')
        setLoading(false)
        return
      }
      
      // Then update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        throw error
      }
      
      // Success
      setChangeSuccess(true)
      setPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setIsChangingPassword(false)
        setChangeSuccess(false)
      }, 3000)
    } catch (error: any) {
      setLoginError(error.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }
  
  // Login/Registration form
  if (!session) {
    return (
      <div className="container">
        <div className="auth-container">
          <WaterBarLogo />
          <div className="card auth-card">
            <h2 className="auth-title">
              {isRegistering ? 'Create an Account' : isResetting ? 'Reset Password' : 'Login to The Water Bar'}
            </h2>
            
            {loginError && (
              <div className="error-message" style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>
                {loginError}
              </div>
            )}
            
            {resetSent && (
              <div className="success-message" style={{ color: 'var(--success, #28a745)', marginBottom: '1rem', textAlign: 'center' }}>
                Password reset email sent! Check your inbox.
              </div>
            )}
            
            <form onSubmit={isRegistering ? handleRegistration : isResetting ? handleResetPassword : handleLogin}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  disabled={loading}
                />
              </div>
              
              {!isResetting && (
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="password-input-container" style={{ position: 'relative' }}>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '5px',
                        boxShadow: 'none',
                        color: '#666'
                      }}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {isRegistering && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="password-input-container" style={{ position: 'relative' }}>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '5px',
                        boxShadow: 'none',
                        color: '#666'
                      }}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={loading}
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                {loading ? 
                  (isRegistering ? 'Creating Account...' : isResetting ? 'Sending Reset Link...' : 'Signing In...') : 
                  (isRegistering ? 'Create Account' : isResetting ? 'Send Reset Link' : 'Sign In')
                }
              </button>
              
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {!isResetting && (
                  <button 
                    type="button"
                    onClick={toggleAuthMode}
                    className="text"
                    style={{ boxShadow: 'none', padding: '5px' }}
                  >
                    {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                  </button>
                )}
                
                {!isRegistering && (
                  <button 
                    type="button"
                    onClick={toggleResetMode}
                    className="text"
                    style={{ boxShadow: 'none', padding: '5px' }}
                  >
                    {isResetting ? 'Back to Login' : 'Forgot password?'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }
  
  // Loading state
  if (loadingSession) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="card">
          <h2>Loading your hydration data...</h2>
        </div>
      </div>
    )
  }
  
  // Main application
  return (
    <div className="container">
      <header className="flex justify-between items-center" style={{ padding: '1rem 0' }}>
        <WaterBarLogo />
        
        <div className="flex gap-4 items-center">
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{user?.email}</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              {hydrationData?.sessionId ? 'Session active' : 'No active session'}
            </p>
          </div>
          
          <button 
            onClick={() => setIsChangingPassword(!isChangingPassword)} 
            className="text" 
            style={{ marginRight: '10px' }}
          >
            {isChangingPassword ? 'Cancel' : 'Change Password'}
          </button>
          
          <button onClick={handleLogout} className="text">
            Sign Out
          </button>
        </div>
      </header>
      
      {isChangingPassword && (
        <div className="card" style={{ maxWidth: '500px', margin: '20px auto 30px' }}>
          <h2 className="auth-title">Change Password</h2>
          
          {loginError && (
            <div className="error-message" style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>
              {loginError}
            </div>
          )}
          
          {changeSuccess && (
            <div className="success-message" style={{ color: 'var(--success, #28a745)', marginBottom: '1rem', textAlign: 'center' }}>
              Password changed successfully!
            </div>
          )}
          
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <div className="password-input-container" style={{ position: 'relative' }}>
                <input
                  id="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '5px',
                    boxShadow: 'none',
                    color: '#666'
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-container" style={{ position: 'relative' }}>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '5px',
                    boxShadow: 'none',
                    color: '#666'
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmNewPassword">Confirm New Password</label>
              <div className="password-input-container" style={{ position: 'relative' }}>
                <input
                  id="confirmNewPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '5px',
                    boxShadow: 'none',
                    color: '#666'
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}
      
      <div className="flex gap-2" style={{ marginBottom: '1.5rem' }}>
        <button 
          className={view === 'chat' ? '' : 'text'} 
          onClick={() => setView('chat')}
        >
          Hydration Coach
        </button>
        <button 
          className={view === 'dashboard' ? '' : 'text'} 
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
      </div>
      
      {/* Session info */}
      {hydrationData && (
        <div className="session-indicator fadeIn">
          <div className="water-drop"></div>
          <span>
            Session: <span className="session-time">
              {hydrationData.timeRemaining} remaining
            </span>
          </span>
        </div>
      )}
      
      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div className="dashboard-grid fadeIn">
          <div className="card dashboard-card">
            <h3>Hydration Overview</h3>
            
            {hydrationData ? (
              <>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Progress</span>
                    <span style={{ fontWeight: 'bold' }}>{hydrationData.hydrationPercentage}%</span>
                  </div>
                  
                  <div className="hydration-progress">
                    <div 
                      className="hydration-bar" 
                      style={{ width: `${hydrationData.hydrationPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="stats-card">
                  <div className="stat-item">
                    <span className="stat-label">Recommended intake</span>
                    <span className="stat-value">{hydrationData.recommendedIntake}ml</span>
                  </div>
                  
                  <div className="stat-item">
                    <span className="stat-label">Session start</span>
                    <span className="stat-value">
                      {new Date(hydrationData.sessionStarted).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  
                  <div className="stat-item">
                    <span className="stat-label">Session end</span>
                    <span className="stat-value">
                      {new Date(hydrationData.sessionEndsAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
                
                <p style={{ marginTop: '1rem' }}>{hydrationData.todaySummary}</p>
              </>
            ) : (
              <p>No dashboard data available. Start a conversation with your hydration coach.</p>
            )}
          </div>
          
          <div className="card dashboard-card">
            <h3>Recent Activity</h3>
            
            {hydrationData?.recentEvents?.length > 0 ? (
              <div style={{ marginTop: '1rem' }}>
                {hydrationData.recentEvents.map((event: any, index: number) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '0.75rem 0',
                    borderBottom: index < hydrationData.recentEvents.length - 1 ? '1px solid var(--border)' : 'none'
                  }}>
                    <span>{event.message}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>{event.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>No recent activity. Your hydration events will appear here.</p>
            )}
            
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <label className="flex items-center justify-center gap-2">
                <input 
                  type="checkbox" 
                  checked={resetSession} 
                  onChange={(e) => setResetSession(e.target.checked)} 
                /> 
                Reset 24-hour session
              </label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                Check this and send a message to start a new 24-hour period
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Chat View */}
      {view === 'chat' && (
        <div className="card fadeIn">
          <h3>Your Hydration Coach</h3>
          
          <div className="chat-container">
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', margin: 'auto' }}>
                  <p>No messages yet. Start the conversation with your hydration coach!</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.type}`}>
                    {msg.content}
                  </div>
                ))
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="chat-input">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your hydration..."
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input}>
                {loading ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={resetSession} 
                onChange={(e) => setResetSession(e.target.checked)} 
              /> 
              Reset 24-hour session
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: '1rem' }}>
              Start fresh with a new hydration period
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App