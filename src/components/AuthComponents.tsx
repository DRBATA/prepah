import React, { useState } from 'react';
import type { LoginFormProps, RegisterFormProps, ResetPasswordFormProps, WaterBarLogoProps } from './types';

// Water Bar logo as SVG component
function WaterBarLogo({ className }: WaterBarLogoProps) {
  return (
    <svg className={className} width="180" height="60" viewBox="0 0 180 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10L25 45L30 10H40L45 45L50 10H60L50 50H40L35 15L30 50H20L10 10H20Z" fill="#22B8CF"/>
      <path d="M70 10H80V30C80 35 82.5 40 90 40C97.5 40 100 35 100 30V10H110V30C110 40 105 50 90 50C75 50 70 40 70 30V10Z" fill="#6741D9"/>
      <path d="M120 10H150V20H130V25H145V35H130V40H150V50H120V10Z" fill="#22B8CF"/>
      <circle cx="160" cy="25" r="10" fill="#22B8CF" fillOpacity="0.7"/>
      <circle cx="170" cy="15" r="5" fill="#6741D9" fillOpacity="0.7"/>
    </svg>
  );
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  supabase,
  loading,
  setLoading,
  onRegister,
  onForgotPassword,
  error,
  setError
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      setError?.(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <h2 className="auth-title">Login to The Water Bar</h2>
      
      {error && (
        <div className="error-message" style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-container" style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
                color: 'var(--text-secondary)'
              }}
            >
              {showPassword ? '🔒' : '👁️'}
            </button>
          </div>
        </div>
        
        
        <button type="submit" className="button primary full-width">
          Login
        </button>
        
        <div className="auth-links">
          <button type="button" className="text-button" onClick={onForgotPassword}>
            Forgot Password?
          </button>
          <button type="button" className="text-button" onClick={onRegister}>
            Create Account
          </button>
        </div>
      </form>
    </div>
  );
};

const RegisterForm: React.FC<RegisterFormProps> = ({ 
  supabase,
  loading,
  setLoading,
  onSignIn
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <h2 className="auth-title">Create an Account</h2>
      
      {error && (
        <div className="error-message" style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-container" style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
                color: 'var(--text-secondary)'
              }}
            >
              {showPassword ? '🔒' : '👁️'}
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="password-input-container" style={{ position: 'relative' }}>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>
        
        <button type="submit" className="button primary full-width">
          Create Account
        </button>
        
        <div className="auth-links">
          <button type="button" className="text-button" onClick={onSignIn}>
            Already have an account? Login
          </button>
        </div>
      </form>
    </div>
  );
};

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ 
  supabase,
  loading,
  setLoading,
  onSignIn,
  onSuccess
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      
      setResetSent(true);
      onSuccess();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <h2 className="auth-title">Reset Password</h2>
      
      {error && (
        <div className="error-message" style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>
          {error}
        </div>
      )}
      
      {resetSent ? (
        <div className="success-message" style={{ textAlign: 'center', margin: '20px 0' }}>
          <p>Password reset link has been sent to your email.</p>
          <button className="button primary" onClick={onSignIn} style={{ marginTop: '20px' }}>
            Back to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="button primary full-width">
            Send Reset Link
          </button>
          
          <div className="auth-links">
            <button type="button" className="text-button" onClick={onSignIn}>
              Back to Login
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export { LoginForm, RegisterForm, ResetPasswordForm, WaterBarLogo };
