'use client';

import { Toaster } from 'react-hot-toast';

export default function NotificationProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#ffffff',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          fontSize: '14px',
          fontWeight: '500',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
          style: {
            border: '1px solid #10b981',
            background: '#f0fdf4',
            color: '#065f46',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
          style: {
            border: '1px solid #ef4444',
            background: '#fef2f2',
            color: '#991b1b',
          },
        },
        loading: {
          iconTheme: {
            primary: '#2880CA',
            secondary: '#ffffff',
          },
          style: {
            border: '1px solid #2880CA',
            background: '#eff6ff',
            color: '#1e40af',
          },
        },
      }}
    />
  );
}
