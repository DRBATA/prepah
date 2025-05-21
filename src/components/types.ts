import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthFormProps {
  supabase: SupabaseClient;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error?: string;
  setError?: (error: string) => void;
}

export interface LoginFormProps extends AuthFormProps {
  onRegister: () => void;
  onForgotPassword: () => void;
}

export interface RegisterFormProps extends AuthFormProps {
  onSignIn: () => void;
}

export interface ResetPasswordFormProps extends AuthFormProps {
  onSignIn: () => void;
  onSuccess: () => void;
}

export interface WaterBarLogoProps {
  className?: string;
}

export interface ProfileSectionProps {
  userId: string;
  supabase: SupabaseClient;
}
