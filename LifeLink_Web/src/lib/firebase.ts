// src/lib/firebase.ts -> Routed through Supabase
import { supabase, signInWithGoogle as sbSignInWithGoogle } from './supabase';

export const signInWithGoogle = async () => {
  if (supabase) {
    return sbSignInWithGoogle();
  }
  throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
};

export const getFCMToken = async () => {
  return null;
};

export const onFCMMessage = (callback: (payload: any) => void) => {
  return () => {};
};
