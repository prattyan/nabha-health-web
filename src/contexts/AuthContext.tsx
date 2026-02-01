import React, { createContext, useContext, useReducer, useEffect } from "react";
import { User, AuthState, LoginCredentials, RegisterData } from "../types/auth";
import { AuthService } from "../services/authService";
import { logger } from "../utils/logger";

interface AuthContextType extends AuthState {
  login: (
    credentials: LoginCredentials
  ) => Promise<{ success: boolean; message: string }>;
  register: (
    data: RegisterData
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_USER"; payload: User | null }
  | { type: "LOGOUT" };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
        isLoading: false,
      };
    case "LOGOUT":
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const authService = AuthService.getInstance();

  // 🔹 App load / sync
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const integrity = authService.validateStorageIntegrity();

        if (!integrity.isValid) {
          logger.warn("Auth storage integrity issue", integrity.issues);
        }

        const currentUser = authService.getCurrentUser();
        dispatch({ type: "SET_USER", payload: currentUser });

        logger.info("Auth initialized", {
          hasCurrentUser: !!currentUser,
          storageInfo: integrity.storageInfo,
          registrationStats: authService.getRegistrationStats(),
        });
      } catch (error) {
        logger.error("Auth initialization failed", error);
        dispatch({ type: "SET_USER", payload: null });
      }
    };

    initializeAuth();
  }, []);

  // 🔹 Login (sync failure logging)
  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const result = await authService.login(credentials);

      if (result.success && result.user) {
        dispatch({ type: "SET_USER", payload: result.user });
      } else {
        dispatch({ type: "SET_LOADING", payload: false });
        logger.warn("Login failed", {
          email: credentials.email,
          message: result.message,
        });
      }

      return { success: result.success, message: result.message };
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      logger.error("Login sync error", error);

      return {
        success: false,
        message: "Unexpected error during login",
      };
    }
  };

  // 🔹 Register (sync failure logging)
  const register = async (data: RegisterData) => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const result = await authService.register(data);

      if (result.success && result.user) {
        dispatch({ type: "SET_USER", payload: result.user });
      } else {
        dispatch({ type: "SET_LOADING", payload: false });
        logger.warn("Registration failed", {
          email: data.email,
          message: result.message,
        });
      }

      return { success: result.success, message: result.message };
    } catch (error) {
      dispatch({ type: "SET_LOADING", payload: false });
      logger.error("Registration sync error", error);

      return {
        success: false,
        message: "Unexpected error during registration",
      };
    }
  };

  // 🔹 Logout
  const logout = () => {
    authService.logout();
    logger.info("User logged out");
    dispatch({ type: "LOGOUT" });
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
