import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

// Import our components
import { LoginForm, RegisterForm, ResetPasswordForm, UpdatePasswordForm, WaterBarLogo } from './components/AuthComponents';
import NavBar, { ViewTabs } from './components/NavBar';
import LogsView from './components/views/LogsView';
import RecommendationsView from './components/views/RecommendationsView';
import ActionsView from './components/views/ActionsView';

// Import API client
import { fetchHydrationData, logHydration, fetchRecommendations, selectRecommendation, completeAction } from './api/api-client';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hmwrlhepsmyvqwkfleck.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd3JsaGVwc215dnF3a2ZsZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDExNDAsImV4cCI6MjA2MDc3NzE0MH0.oyMGM5NGU2mLFDYxwuzXxXXVeKojzhdcbRimgME3Ogc";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  // Authentication state
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loginError, setLoginError] = useState('');
  
  // Authentication view state
  const [authView, setAuthView] = useState<'sign_in' | 'sign_up' | 'forgotten_password' | 'update_password'>('sign_in');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);
  
  // Main app state
  const [view, setView] = useState<'logs' | 'recommendations' | 'actions'>('logs');
  const [hydrationData, setHydrationData] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [selectedActions, setSelectedActions] = useState<any[]>([]);
  const [previousResponseId, setPreviousResponseId] = useState<string | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [nearbyVenues, setNearbyVenues] = useState<any[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [userPoints, setUserPoints] = useState(0);

  // Handle session management
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      setLoadingSession(true);
      
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error.message);
        } else if (data?.session) {
          setSession(data.session);
          setUser(data.session.user);
          
          // Fetch initial hydration data
          try {
            const hydrationResponse = await fetchHydrationData(data.session.access_token);
            setHydrationData(hydrationResponse);
            setPreviousResponseId(hydrationResponse.response_id);
            setSessionId(hydrationResponse.session_id);
          
          // For demo purposes, set some sample data
          setUserPoints(750);
          setNearbyVenues([
            {
              id: 'venue_1',
              name: 'The Water Bar',
              type: 'Hydration Station',
              rating: 4.8,
              distance: '500m'
            },
            {
              id: 'venue_2',
              name: 'Hydration Hub',
              type: 'Wellness Café',
              rating: 4.5,
              distance: '800m'
            }
          ]);
          setRecommendedProducts([
            {
              id: 'product_1',
              name: 'Premium Mineral Water',
              brand: 'Perrier',
              price: 15,
              points: 15,
              description: 'Naturally carbonated mineral water with a refreshing taste.'
            },
            {
              id: 'product_2',
              name: 'Hydration Bundle',
              brand: 'Water Bar',
              price: 60,
              points: 75,
              description: 'Complete hydration pack with water, electrolytes, and protein.'
            }
          ]);
          } catch (error) {
            console.error('Error fetching initial data:', error);
          }
        }
      } catch (error) {
        console.error('Error in session management:', error);
      } finally {
        setLoadingSession(false);
      }
    };
    
    getInitialSession();
    
    // Add window beforeunload event listener for auto-logout
    const handleBeforeUnload = () => {
      if (sessionStorage.getItem('auto-logout') === 'true') {
        supabase.auth.signOut();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession);
        setUser(newSession.user);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setHydrationData(null);
      }
    });
    
    // Check URL for reset password params
    async function checkForRecovery() {
      const hash = window.location.hash;
      
      if (hash && hash.substring(1).includes('type=recovery')) {
        setAuthView('update_password');
      }
    }
    
    checkForRecovery();
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Authentication handlers
  const handleLogin = async (email: string, password: string, rememberMe: boolean) => {
    try {
      setLoading(true);
      setLoginError('');
      
      // Sign in the user
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      // If "Remember me" is not checked, we'll clear the session when the browser closes
      if (!rememberMe) {
        // Store this in session storage so we know to log out on window close
        sessionStorage.setItem('auto-logout', 'true');
      } else {
        sessionStorage.removeItem('auto-logout');
      }
      
      // Set session and user state
      setSession(data.session);
      setUser(data.user);
    } catch (error: any) {
      console.error('Error logging in:', error);
      setLoginError(error.message || 'Error logging in');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegistration = async (email: string, password: string, confirmPassword: string) => {
    if (password !== confirmPassword) {
      setLoginError("Passwords don't match");
      return;
    }
    
    try {
      setLoading(true);
      setLoginError('');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) {
        setLoginError(error.message);
        return;
      }
      
      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        setLoginError('This email is already registered');
        return;
      }
      
      // Success - either logged in or confirmation email sent
      if (data?.user?.confirmed_at) {
        // User is confirmed, session will be set by onAuthStateChange
      } else {
        setLoginError('Please check your email for confirmation link');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setLoginError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async (email: string) => {
    try {
      setLoading(true);
      setLoginError('');
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        setLoginError(error.message);
        return;
      }
      
      // Success - reset email sent
      setResetSent(true);
    } catch (error) {
      console.error('Password reset error:', error);
      setLoginError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdatePassword = async (password: string) => {
    try {
      setLoading(true);
      setLoginError('');
      
      const { data, error } = await supabase.auth.updateUser({
        password
      });
      
      if (error) {
        setLoginError(error.message);
        return;
      }
      
      // Success - password updated
      setAuthView('sign_in');
    } catch (error) {
      console.error('Password update error:', error);
      setLoginError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Session will be cleared by onAuthStateChange
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      setLoginError('');
      
      // First sign in to verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      
      if (signInError) {
        setLoginError('Current password is incorrect');
        setLoading(false);
        return;
      }
      
      // Then update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        setLoginError(updateError.message);
        setLoading(false);
        return;
      }
      
      // Success - password updated
      setChangeSuccess(true);
      setTimeout(() => {
        setIsChangingPassword(false);
        setChangeSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Password change error:', error);
      setLoginError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // View toggle handlers
  const handleViewChange = (newView: 'logs' | 'recommendations' | 'actions') => {
    setView(newView);
    
    // Fetch data for the selected view
    if (newView === 'recommendations' && session) {
      fetchRecommendations(session.access_token, previousResponseId || undefined, sessionId || undefined)
        .then(data => {
          setRecommendations(data.recommendations || []);
          setPreviousResponseId(data.response_id);
        })
        .catch(error => console.error('Error fetching recommendations:', error));
    }
  };
  
  // Action handlers
  const handleLogHydration = async (amount: number, type: string) => {
    if (!session) return;
    
    try {
      const response = await logHydration(
        session.access_token, 
        amount, 
        type, 
        previousResponseId || undefined, 
        sessionId || undefined
      );
      
      setHydrationData(response);
      setPreviousResponseId(response.response_id);
    } catch (error) {
      console.error('Error logging hydration:', error);
    }
  };
  
  const handleLogActivity = async (activity: string, duration: number) => {
    // Similar to handleLogHydration but for activities
    console.log(`Logging activity: ${activity} for ${duration} minutes`);
  };
  
  const handleSelectRecommendation = async (recommendation: any) => {
    if (!session) return;
    
    try {
      const response = await selectRecommendation(
        session.access_token,
        recommendation.id,
        previousResponseId || undefined,
        sessionId || undefined
      );
      
      // Add the selected recommendation to the actions
      setSelectedActions(prev => [...prev, {
        ...recommendation,
        completed: false
      }]);
      
      setPreviousResponseId(response.response_id);
      
      // Automatically switch to the actions view
      setView('actions');
    } catch (error) {
      console.error('Error selecting recommendation:', error);
    }
  };
  
  const handleCompleteAction = async (actionId: string) => {
    if (!session) return;
    
    try {
      const response = await completeAction(
        session.access_token,
        actionId,
        previousResponseId || undefined,
        sessionId || undefined
      );
      
      // Mark the action as completed
      setSelectedActions(prev => prev.map(action => 
        action.id === actionId ? { ...action, completed: true } : action
      ));
      
      // Update hydration data
      setHydrationData(response.hydrationData || hydrationData);
      setPreviousResponseId(response.response_id);
    } catch (error) {
      console.error('Error completing action:', error);
    }
  };
  
  const handlePurchaseProduct = async (productId: string) => {
    // In a real app, this would process the purchase
    console.log(`Purchasing product: ${productId}`);
    
    // For demo purposes, just add it to selected actions
    const product = recommendedProducts.find(p => p.id === productId);
    if (product) {
      setSelectedActions(prev => [...prev, {
        id: `action_${Date.now()}`,
        type: 'buy_product',
        title: `Buy ${product.name}`,
        description: product.description,
        price: product.price,
        points: product.points,
        completed: false
      }]);
    }
  };
  
  // Login/Registration view
  if (!session) {
    if (authView === 'update_password') {
      return (
        <div className="container">
          <div className="auth-container">
            <WaterBarLogo />
            <UpdatePasswordForm 
              onUpdatePassword={handleUpdatePassword}
              error={loginError}
            />
          </div>
        </div>
      );
    }
    
    return (
      <div className="container">
        <div className="auth-container">
          <WaterBarLogo />
          
          {isRegistering ? (
            <RegisterForm 
              onRegister={handleRegistration}
              onToggleLogin={() => {
                setIsRegistering(false);
                setLoginError('');
              }}
              error={loginError}
            />
          ) : isResetting ? (
            <ResetPasswordForm 
              onReset={handleResetPassword}
              onToggleLogin={() => {
                setIsResetting(false);
                setResetSent(false);
                setLoginError('');
              }}
              resetSent={resetSent}
              error={loginError}
            />
          ) : (
            <LoginForm 
              onLogin={(email, password, rememberMe) => handleLogin(email, password, rememberMe)}
              onToggleRegister={() => {
                setIsRegistering(true);
                setLoginError('');
              }}
              onToggleReset={() => {
                setIsResetting(true);
                setLoginError('');
              }}
              error={loginError}
            />
          )}
        </div>
      </div>
    );
  }
  
  // Loading state
  if (loadingSession) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your hydration data...</p>
      </div>
    );
  }
  
  // Main application view
  return (
    <div className="container">
      <NavBar 
        currentView={view}
        onChangeView={handleViewChange}
        onLogout={handleLogout}
        onChangePassword={() => setIsChangingPassword(!isChangingPassword)}
        userEmail={user?.email}
      />
      
      {/* Password Change Form */}
      {isChangingPassword && (
        <div className="card" style={{ maxWidth: '500px', margin: '20px auto 30px' }}>
          <h2 className="auth-title">Change Password</h2>
          
          {loginError && (
            <div className="error-message" style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>
              {loginError}
            </div>
          )}
          
          {changeSuccess && (
            <div className="success-message" style={{ color: 'var(--success)', marginBottom: '1rem', textAlign: 'center' }}>
              Password updated successfully!
            </div>
          )}
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const currentPassword = (e.target as any).currentPassword.value;
            const newPassword = (e.target as any).newPassword.value;
            const confirmNewPassword = (e.target as any).confirmNewPassword.value;
            
            if (newPassword !== confirmNewPassword) {
              setLoginError("New passwords don't match");
              return;
            }
            
            handleChangePassword(currentPassword, newPassword);
          }}>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                required
                minLength={6}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmNewPassword">Confirm New Password</label>
              <input
                id="confirmNewPassword"
                type="password"
                required
                minLength={6}
              />
            </div>
            
            <div className="form-buttons">
              <button type="button" className="button text" onClick={() => setIsChangingPassword(false)}>
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* View Tabs */}
      <ViewTabs 
        currentView={view}
        onChangeView={handleViewChange}
      />
      
      {/* View Components */}
      {view === 'logs' && (
        <LogsView 
          sessionId={sessionId || ''}
          userProfile={user}
          hydrationData={hydrationData}
          onLogHydration={handleLogHydration}
          onLogActivity={handleLogActivity}
        />
      )}
      
      {view === 'recommendations' && (
        <RecommendationsView 
          userProfile={user}
          hydrationData={hydrationData}
          weatherData={{ location: 'Dubai Marina', temperature: '35°C', humidity: '65%' }}
          recommendations={recommendations}
          onSelectRecommendation={handleSelectRecommendation}
        />
      )}
      
      {view === 'actions' && (
        <ActionsView 
          userProfile={user}
          selectedActions={selectedActions}
          nearbyVenues={nearbyVenues}
          recommendedProducts={recommendedProducts}
          userPoints={userPoints}
          onCompleteAction={handleCompleteAction}
          onPurchaseProduct={handlePurchaseProduct}
        />
      )}
    </div>
  );
}

export default App;
