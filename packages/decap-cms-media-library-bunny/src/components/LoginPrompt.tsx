/**
 * Login Prompt Component for Bunny.net Authentication
 * Shows when user needs to authenticate with Bunny
 */

import React from 'react';

const styles = {
  container: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: '100%',
    padding: '20px',
  },
  card: {
    textAlign: 'center' as const,
    padding: '40px 60px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '20px',
    color: '#0066cc',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '24px',
    fontWeight: 600 as const,
    color: '#333',
  },
  description: {
    margin: '0 0 30px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.5,
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

interface LoginPromptProps {
  onLogin: () => void;
}

export function LoginPrompt({ onLogin }: LoginPromptProps) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🔐</div>
        <h2 style={styles.title}>Authenticate with Bunny</h2>
        <p style={styles.description}>
          Sign in to your Bunny.net account to access and manage your storage files.
        </p>
        <button style={styles.button} onClick={onLogin}>
          Login with Bunny
        </button>
      </div>
    </div>
  );
}

export default LoginPrompt;
