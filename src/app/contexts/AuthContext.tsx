import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'TENANT';
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch user profile from custom users table or metadata
  const fetchUserProfile = async (supabaseUserId: string): Promise<User | null> => {
    try {
      // Try to get user from Supabase auth metadata first
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser?.user_metadata) {
        return {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata.name || '',
          role: authUser.user_metadata.role || 'OWNER',
          phone: authUser.user_metadata.phone
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };
  
  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.warn('Auth initialization timeout');
      setIsLoading(false);
    }, 3000); // 3 second timeout

    // Check current session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        clearTimeout(loadingTimeout);
        
        if (error) {
          console.error('Error getting session:', error);
          setIsLoading(false);
          return;
        }
        
        if (session?.user) {
          setSupabaseUser(session.user);
          // Set user immediately from metadata without waiting for profile fetch
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 'User',
            role: session.user.user_metadata?.role || 'OWNER',
            phone: session.user.user_metadata?.phone
          });
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      }
    };
    
    initAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (session?.user) {
        setSupabaseUser(session.user);
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || 'User',
          role: session.user.user_metadata?.role || 'OWNER',
          phone: session.user.user_metadata?.phone
        });
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      
      setIsLoading(false);
    });
    
    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);
  
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (data.user && data.session) {
        setSupabaseUser(data.user);
        const profile = await fetchUserProfile(data.user.id);
        if (profile) {
          setUser(profile);
          return { success: true };
        } else {
          // If profile fetch fails, still allow login with basic info
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || 'User',
            role: data.user.user_metadata?.role || 'OWNER',
            phone: data.user.user_metadata?.phone
          });
          return { success: true };
        }
      }
      
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };
  
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSupabaseUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role: 'OWNER', // New registrations are always owners
          },
        },
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (data.user) {
        // Check if email confirmation is required
        if (data.session) {
          // User is immediately logged in (email confirmation disabled)
          setSupabaseUser(data.user);
          const profile = await fetchUserProfile(data.user.id);
          setUser(profile);
        } else {
          // Email confirmation required - don't set user state
          console.log('Email confirmation required');
        }
        return { success: true };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, supabaseUser, login, logout, register, isLoading }}>
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
