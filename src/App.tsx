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
  
  // Login form
  if (!session) {
    return (
      <div className="container">
        <div className="auth-container">
          <WaterBarLogo />
          <div className="card auth-card">
            <h2 className="auth-title">Login to The Water Bar</h2>
            
            {loginError && (
              <div className="error-message" style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>
                {loginError}
              </div>
            )}
            
            <form onSubmit={handleLogin}>
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
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
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
          
          <button onClick={handleLogout} className="text">
            Sign Out
          </button>
        </div>
      </header>
      
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