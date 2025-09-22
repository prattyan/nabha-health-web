import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, AuthState, LoginCredentials, RegisterData } from '../types/auth';
import { AuthService } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'LOGOUT' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const authService = AuthService.getInstance();

  useEffect(() => {
    const initializeAuth = async () => {
      // Check storage integrity
      const integrity = authService.validateStorageIntegrity();
      if (!integrity.isValid) {
        console.warn('Storage integrity issues detected:', integrity.issues);
        // Could implement repair logic here
      }

      // Check for existing user on app load
      const currentUser = authService.getCurrentUser();
      dispatch({ type: 'SET_USER', payload: currentUser });

      // Log storage info for debugging
      console.log('Auth initialized:', {
        hasCurrentUser: !!currentUser,
        storageInfo: integrity.storageInfo,
        registrationStats: authService.getRegistrationStats()
      });
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const result = await authService.login(credentials);
    
    if (result.success && result.user) {
      dispatch({ type: 'SET_USER', payload: result.user });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
    
    return { success: result.success, message: result.message };
  };

  const register = async (data: RegisterData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const result = await authService.register(data);
    
    if (result.success && result.user) {
      dispatch({ type: 'SET_USER', payload: result.user });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
    
    return { success: result.success, message: result.message };
  };

  const logout = () => {
    authService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};