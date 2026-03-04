import styled from '@emotion/styled';
import { css } from '@emotion/react';

// Design system tokens
export const designTokens = {
  colors: {
    primary: '#0066cc',
    primaryLight: '#e3f2fd',
    secondary: '#e0e0e0',
    background: '#f9f9f9',
    foreground: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#e0e0e0',
    error: '#fee',
    errorText: '#c33',
    hover: '#f5f5f5',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
  },
  font: {
    family:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    size: {
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '20px',
      xxl: '24px',
    },
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  shadow: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  transition: '0.2s ease',
  zIndex: {
    modal: 99999,
    backdrop: -1,
  },
};

// Modal widget styles
export const StyledWidget = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${designTokens.zIndex.modal};
  font-family: ${designTokens.font.family};
`;

export const StyledBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: ${designTokens.zIndex.backdrop};
`;

export const StyledContainer = styled.div`
  position: relative;
  width: 90%;
  max-width: 1200px;
  height: 90vh;
  background: ${designTokens.colors.foreground};
  border-radius: ${designTokens.radius.lg};
  box-shadow: ${designTokens.shadow.lg};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

// Header styles
export const StyledHeader = styled.div`
  padding: ${designTokens.spacing.xl} ${designTokens.spacing.xxl};
  border-bottom: 1px solid ${designTokens.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${designTokens.colors.background};
`;

export const StyledHeaderTitle = styled.h2`
  margin: 0;
  font-size: ${designTokens.font.size.xl};
  font-weight: ${designTokens.font.weight.semibold};
  color: ${designTokens.colors.text};
`;

export const StyledCloseButton = styled.button`
  background: none;
  border: none;
  font-size: ${designTokens.font.size.xxl};
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${designTokens.colors.textSecondary};
  transition: color ${designTokens.transition};

  &:hover {
    color: ${designTokens.colors.text};
  }
`;

// Error message
export const StyledError = styled.div`
  padding: ${designTokens.spacing.md} ${designTokens.spacing.xxl};
  background-color: ${designTokens.colors.error};
  color: ${designTokens.colors.errorText};
  border-bottom: 1px solid ${designTokens.colors.border};
  font-size: ${designTokens.font.size.base};
`;

// File grid container
export const StyledFileGridContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${designTokens.spacing.xl} ${designTokens.spacing.xxl};
  background: ${designTokens.colors.foreground};
`;

export const StyledFileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: ${designTokens.spacing.lg};
  width: 100%;
`;

export const StyledLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${designTokens.colors.textTertiary};
  font-size: ${designTokens.font.size.lg};
`;

export const StyledEmpty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${designTokens.colors.textTertiary};
  font-size: ${designTokens.font.size.lg};
`;

// Footer & buttons
export const StyledFooter = styled.div`
  padding: ${designTokens.spacing.lg} ${designTokens.spacing.xxl};
  border-top: 1px solid ${designTokens.colors.border};
  background: ${designTokens.colors.background};
  display: flex;
  justify-content: flex-end;
  gap: ${designTokens.spacing.md};
`;

export const baseButtonStyles = css`
  padding: ${designTokens.spacing.sm} ${designTokens.spacing.lg};
  border: none;
  border-radius: ${designTokens.radius.sm};
  font-size: ${designTokens.font.size.base};
  font-weight: ${designTokens.font.weight.medium};
  cursor: pointer;
  transition: all ${designTokens.transition};
  outline: none;

  &:focus {
    outline: 2px solid ${designTokens.colors.primary};
    outline-offset: 2px;
  }
`;

export const StyledButtonPrimary = styled.button`
  ${baseButtonStyles}
  background-color: ${designTokens.colors.primary};
  color: ${designTokens.colors.foreground};

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    background-color: ${designTokens.colors.secondary};
    cursor: not-allowed;
  }
`;

export const StyledButtonSecondary = styled.button`
  ${baseButtonStyles}
  background-color: ${designTokens.colors.secondary};
  color: ${designTokens.colors.text};

  &:hover:not(:disabled) {
    background-color: #d0d0d0;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

// File grid item styles
export const StyledFileGridItem = styled.div<{ selected?: boolean; isDirectory?: boolean }>`
  display: flex;
  flex-direction: column;
  cursor: ${props => (props.isDirectory ? 'pointer' : 'pointer')};
  border-width: 2px;
  border-style: solid;
  border-color: ${props => (props.selected ? designTokens.colors.primary : 'transparent')};
  border-radius: ${designTokens.radius.md};
  padding: ${designTokens.spacing.sm};
  transition: all ${designTokens.transition};
  background-color: ${props =>
    props.selected ? designTokens.colors.primaryLight : designTokens.colors.foreground};

  &:hover {
    background-color: ${designTokens.colors.hover};
    border-color: ${designTokens.colors.border};
  }
`;

export const StyledFileThumbnail = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background-color: #f0f0f0;
  border-radius: ${designTokens.radius.sm};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${designTokens.spacing.sm};
`;

export const StyledFileImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const StyledFileIcon = styled.div`
  font-size: 32px;
  color: ${designTokens.colors.textTertiary};
`;

export const StyledFileName = styled.div`
  font-size: ${designTokens.font.size.sm};
  color: ${designTokens.colors.text};
  text-align: center;
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

// File browser styles
export const StyledFileBrowser = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${designTokens.spacing.md};
`;

export const StyledBreadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: ${designTokens.spacing.sm};
  font-size: ${designTokens.font.size.base};
  color: ${designTokens.colors.textSecondary};
  padding-bottom: ${designTokens.spacing.md};
  border-bottom: 1px solid ${designTokens.colors.border};
`;

export const StyledBreadcrumbItem = styled.button`
  background: none;
  border: none;
  color: ${designTokens.colors.primary};
  cursor: pointer;
  font-size: ${designTokens.font.size.base};
  padding: 0;
  transition: color ${designTokens.transition};

  &:hover {
    text-decoration: underline;
  }
`;

export const StyledBreadcrumbSeparator = styled.span`
  color: ${designTokens.colors.textTertiary};
  margin: 0 ${designTokens.spacing.xs};
`;

// Login prompt styles
export const StyledLoginPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: ${designTokens.spacing.lg};
  padding: ${designTokens.spacing.xxl};
  text-align: center;
`;

export const StyledLoginPromptTitle = styled.h2`
  margin: 0;
  font-size: ${designTokens.font.size.xl};
  font-weight: ${designTokens.font.weight.semibold};
  color: ${designTokens.colors.text};
`;

export const StyledLoginPromptMessage = styled.p`
  margin: 0;
  font-size: ${designTokens.font.size.base};
  color: ${designTokens.colors.textSecondary};
  max-width: 400px;
`;

export const StyledLoginButton = styled(StyledButtonPrimary)`
  margin-top: ${designTokens.spacing.md};
  padding: ${designTokens.spacing.md} ${designTokens.spacing.xl};
`;

// File upload styles
export const StyledFileUpload = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${designTokens.spacing.md};
  padding: ${designTokens.spacing.lg};
  background: ${designTokens.colors.background};
  border-radius: ${designTokens.radius.md};
`;

export const StyledUploadArea = styled.div<{ isDragActive?: boolean }>`
  border: 2px dashed
    ${props => (props.isDragActive ? designTokens.colors.primary : designTokens.colors.border)};
  border-radius: ${designTokens.radius.md};
  padding: ${designTokens.spacing.xl};
  text-align: center;
  cursor: pointer;
  transition: all ${designTokens.transition};
  background-color: ${props =>
    props.isDragActive ? designTokens.colors.primaryLight : 'transparent'};

  &:hover {
    border-color: ${designTokens.colors.primary};
    background-color: ${designTokens.colors.primaryLight};
  }
`;

export const StyledUploadText = styled.p`
  margin: 0;
  font-size: ${designTokens.font.size.base};
  color: ${designTokens.colors.textSecondary};
`;

export const StyledUploadInput = styled.input`
  display: none;
`;

export const StyledProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background-color: ${designTokens.colors.border};
  border-radius: 2px;
  overflow: hidden;
`;

export const StyledProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  background-color: ${designTokens.colors.primary};
  width: ${props => props.progress}%;
  transition: width ${designTokens.transition};
`;
