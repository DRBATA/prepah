import React from 'react';
import { WaterBarLogo } from './AuthComponents';

interface NavBarProps {
  currentView: 'logs' | 'recommendations' | 'actions';
  onChangeView: (view: 'logs' | 'recommendations' | 'actions') => void;
  onLogout: () => void;
  onChangePassword: () => void;
  userEmail?: string;
}

const NavBar: React.FC<NavBarProps> = ({
  currentView,
  onChangeView,
  onLogout,
  onChangePassword,
  userEmail
}) => {
  return (
    <header className="flex justify-between items-center" style={{ padding: '1rem 0' }}>
      <WaterBarLogo />
      
      <div className="flex gap-4 items-center">
        {userEmail && (
          <div className="user-info" style={{ color: 'var(--text-secondary)', marginRight: '1rem' }}>
            {userEmail}
          </div>
        )}
        
        <button 
          className="button text" 
          onClick={onChangePassword}
        >
          Change Password
        </button>
        
        <button 
          className="button secondary"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export const ViewTabs: React.FC<{
  currentView: 'logs' | 'recommendations' | 'actions';
  onChangeView: (view: 'logs' | 'recommendations' | 'actions') => void;
}> = ({ currentView, onChangeView }) => {
  return (
    <div className="flex gap-2" style={{ marginBottom: '1.5rem' }}>
      <button 
        className={currentView === 'logs' ? 'button' : 'button text'} 
        onClick={() => onChangeView('logs')}
      >
        Hydration Logs
      </button>
      <button 
        className={currentView === 'recommendations' ? 'button' : 'button text'}
        onClick={() => onChangeView('recommendations')}
      >
        Recommendations
      </button>
      <button 
        className={currentView === 'actions' ? 'button' : 'button text'}
        onClick={() => onChangeView('actions')}
      >
        Action Panel
      </button>
    </div>
  );
};

export default NavBar;
