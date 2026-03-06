/**
 * Login Prompt Component for Bunny.net Authentication
 * Shows when user needs to authenticate with Bunny
 */

import React from 'react';

import {
  StyledLoginButton,
  StyledLoginCard,
  StyledLoginContainer,
  StyledLoginDescription,
  StyledLoginIcon,
  StyledLoginTitle,
} from './styles';

interface LoginPromptProps {
  onLogin: () => void;
}

export function LoginPrompt({ onLogin }: LoginPromptProps) {
  return (
    <StyledLoginContainer>
      <StyledLoginCard>
        <StyledLoginIcon>🔐</StyledLoginIcon>
        <StyledLoginTitle>Authenticate with Bunny</StyledLoginTitle>
        <StyledLoginDescription>
          Sign in to your Bunny.net account to access and manage your storage files.
        </StyledLoginDescription>
        <StyledLoginButton onClick={onLogin}>Login with Bunny</StyledLoginButton>
      </StyledLoginCard>
    </StyledLoginContainer>
  );
}

export default LoginPrompt;
