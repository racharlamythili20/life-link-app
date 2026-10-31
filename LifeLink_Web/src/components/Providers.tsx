// src/components/Providers.tsx
'use client';
import { useEffect } from 'react';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';

export function Providers({ children }: { children: React.ReactNode }) {
  const { connect, disconnect } = useSocketStore();
  const { token } = useAuthStore();

  useEffect(() => {
    connect(token || undefined);
    return () => disconnect();
  }, [token]);

  return <>{children}</>;
}
