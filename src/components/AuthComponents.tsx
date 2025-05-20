import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://hmwrlhepsmyvqwkfleck.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhtd3JsaGVwc215dnF3a2ZsZWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMDExNDAsImV4cCI6MjA2MDc3NzE0MH0.oyMGM5NGU2mLFDYxwuzXxXXVeKojzhdcbRimgME3Ogc";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Water Bar logo as SVG component
export function WaterBarLogo() {
  return (
    <svg width="180" height="60" viewBox="0 0 180 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 10L25 45L30 10H40L45 45L50 10H60L50 50H40L35 15L30 50H20L10 10H20Z" fill="#22B8CF"/>
      <path d="M70 10H80V30C80 35 82.5 40 90 40C97.5 40 100 35 100 30V10H110V30C110 40 105 50 90 50C75 50 70 40 70 30V10Z" fill="#6741D9"/>
      <path d="M120 10H150V20H130V25H145V35H130V40H150V50H120V10Z" fill="#22B8CF"/>
      <circle cx="160" cy="25" r="10" fill="#22B8CF" fillOpacity="0.7"/>
      <circle cx="170" cy="15" r="5" fill="#6741D9" fillOpacity="0.7"/>
    </svg>
  );
}

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onToggleRegister: () => void;
  onToggleReset: () => void;
  error: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onLogin, 
  onToggleRegister, 
  onToggleReset, 
  error 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
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
          <button type="button" className="text-button" onClick={onToggleReset}>
            Forgot Password?
          </button>
          <button type="button" className="text-button" onClick={onToggleRegister}>
            Create Account
          </button>
        </div>
      </form>
    </div>
  );
};

interface RegisterFormProps {
  onRegister: (email: string, password: string, confirmPassword: string) => Promise<void>;
  onToggleLogin: () => void;
  error: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onRegister, 
  onToggleLogin, 
  error 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRegister(email, password, confirmPassword);
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
          <button type="button" className="text-button" onClick={onToggleLogin}>
            Already have an account? Login
          </button>
        </div>
      </form>
    </div>
  );
};

interface ResetPasswordFormProps {
  onReset: (email: string) => Promise<void>;
  onToggleLogin: () => void;
  resetSent: boolean;
  error: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ 
  onReset, 
  onToggleLogin, 
  resetSent,
  error 
}) => {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onReset(email);
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
          <button className="button primary" onClick={onToggleLogin} style={{ marginTop: '20px' }}>
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
            <button type="button" className="text-button" onClick={onToggleLogin}>
              Back to Login
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

interface UpdatePasswordFormProps {
  onUpdatePassword: (password: string) => Promise<void>;
  error: string;
}

export const UpdatePasswordForm: React.FC<UpdatePasswordFormProps> = ({ 
  onUpdatePassword, 
  error 
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      // This can be handled by the parent component
      return;
    }
    await onUpdatePassword(password);
  };

  return (
    <div className="card auth-card">
      <h2 className="auth-title">Reset Your Password</h2>
      
      {error && (
        <div className="error-message" style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">New Password</label>
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
          <label htmlFor="confirmPassword">Confirm New Password</label>
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
          Update Password
        </button>
      </form>
    </div>
  );
};

export default {
  LoginForm,
  RegisterForm,
  ResetPasswordForm,
  UpdatePasswordForm,
  WaterBarLogo
};
