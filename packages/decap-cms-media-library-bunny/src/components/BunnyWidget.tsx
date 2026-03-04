/**
 * Main Bunny.net Media Library Widget Component
 * Provides file browser interface integrated with Decap CMS
 */

import React, { useState, useEffect, useRef } from 'react';

import { BunnyFileManager } from '../api/fileManager';
import { BunnyAuthManager } from '../api/authManager';
import FileGrid from './FileGrid';
import FileBrowser from './FileBrowser';
import FileUpload from './FileUpload';
import LoginPrompt from './LoginPrompt';
import {
  StyledWidget,
  StyledBackdrop,
  StyledContainer,
  StyledHeader,
  StyledHeaderTitle,
  StyledCloseButton,
  StyledError,
  StyledFileGridContainer,
  StyledLoading,
  StyledEmpty,
  StyledFooter,
  StyledButtonPrimary,
  StyledButtonSecondary,
} from './styles';

import type { AddressedMediaFile } from '../types';

interface BunnyWidgetProps {
  config: {
    storage_zone_name: string;
    cdn_url_prefix: string;
    root_path?: string;
  };
  onInsert: (value: string | string[]) => void;
  onClose: () => void;
  allowMultiple?: boolean;
  imagesOnly?: boolean;
  value?: string | string[];
}

export function BunnyWidget({
  config,
  onInsert,
  onClose,
  allowMultiple = false,
  imagesOnly = false,
}: BunnyWidgetProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [storageZoneName, setStorageZoneName] = useState<string | null>(null);

  const [currentPath, setCurrentPath] = useState<string>(config.root_path || '/');
  const [files, setFiles] = useState<AddressedMediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileManagerRef = useRef<BunnyFileManager | null>(null);

  // Check for authentication on mount (from localStorage or URL params after redirect)
  useEffect(() => {
    // Check if index.js is still processing OAuth callback
    // If we have URL params, the index.js will handle them and redirect
    const { apiKey: urlApiKey } = BunnyAuthManager.extractCredentialsFromUrl();
    if (urlApiKey) {
      // Don't do anything, let index.js handle the OAuth flow
      return;
    }

    // Check for existing stored credentials (Storage Zone Password)
    const storedKey = BunnyAuthManager.getStoredApiKey();
    const storedZoneName = BunnyAuthManager.getStoredStorageZoneName();
    if (storedKey && storedZoneName) {
      setApiKey(storedKey);
      setStorageZoneName(storedZoneName);
      setIsAuthenticated(true);
    }
  }, []);

  // Initialize file manager when authenticated
  useEffect(() => {
    if (!isAuthenticated || !apiKey || !storageZoneName) {
      fileManagerRef.current = null;
      return;
    }

    try {
      fileManagerRef.current = new BunnyFileManager({
        storageZoneName,
        apiKey,
        cdnUrlPrefix: config.cdn_url_prefix,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Bunny Widget] Failed to initialize file manager:', errorMsg);
      setError(`Failed to initialize: ${errorMsg}`);
    }
  }, [isAuthenticated, apiKey, storageZoneName, config.cdn_url_prefix]);

  // Load files when path changes (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !fileManagerRef.current) {
      setIsLoading(false);
      return;
    }

    async function loadFiles() {
      try {
        setIsLoading(true);
        setError(null);
        const filesData = await fileManagerRef.current!.getFilesWithUrls(currentPath, imagesOnly);
        setFiles(filesData);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[Bunny Widget] Failed to load files:', errorMsg);
        setError(`Failed to load files: ${errorMsg}`);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadFiles();
  }, [currentPath, imagesOnly, isAuthenticated]);

  function handleLogin() {
    // Redirect to Bunny authentication in the same window
    BunnyAuthManager.redirectToAuth();
  }

  function handleLogout() {
    BunnyAuthManager.clearStoredApiKey();
    BunnyAuthManager.clearReturnUrl();
    setApiKey(null);
    setIsAuthenticated(false);
    setFiles([]);
    setSelectedFiles(new Set());
    setCurrentPath(config.root_path || '/');
  }

  function handleNavigate(path: string) {
    setCurrentPath(path);
    setSelectedFiles(new Set());
  }

  function handleParentDirectory() {
    if (!fileManagerRef.current) return;
    const parentPath = fileManagerRef.current.getParentPath(currentPath);
    handleNavigate(parentPath);
  }

  function handleSelectFile(filePath: string) {
    if (allowMultiple) {
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(filePath)) {
        newSelected.delete(filePath);
      } else {
        newSelected.add(filePath);
      }
      setSelectedFiles(newSelected);
    } else {
      setSelectedFiles(new Set([filePath]));
    }
  }

  function handleFileDoubleClick(file: AddressedMediaFile) {
    if (file.IsDirectory) {
      handleNavigate(`${currentPath}${file.ObjectName}/`.replace(/\/+/g, '/'));
    } else if (!allowMultiple) {
      // Auto-insert on double-click if single select
      onInsert(file.publicUrl);
      onClose();
    }
  }

  async function handleDeleteFile(filePath: string) {
    if (!fileManagerRef.current) return;
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      setError(null);
      await fileManagerRef.current.deleteFile(filePath);
      // Reload files after deletion
      const filesData = await fileManagerRef.current.getFilesWithUrls(currentPath, imagesOnly);
      setFiles(filesData);
      setSelectedFiles(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(filePath);
        return newSelected;
      });
    } catch (err) {
      setError(`Failed to delete file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleUpload(uploadedFiles: File[]) {
    if (!fileManagerRef.current) return;

    setIsUploading(true);
    setUploadProgress(0);
    const urls: string[] = [];

    try {
      setError(null);
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const url = await fileManagerRef.current.uploadFile(currentPath, file, file.name);
        urls.push(url);
        setUploadProgress(Math.round(((i + 1) / uploadedFiles.length) * 100));
      }

      // Reload files after upload
      const filesData = await fileManagerRef.current.getFilesWithUrls(currentPath, imagesOnly);
      setFiles(filesData);

      // Auto-insert if single file uploaded in single-select mode
      if (uploadedFiles.length === 1 && !allowMultiple) {
        onInsert(urls[0]);
        onClose();
      }
    } catch (err) {
      setError(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  function handleInsertSelected() {
    const selectedUrls = Array.from(selectedFiles)
      .map(path => files.find(f => f.publicUrl === path))
      .filter(Boolean)
      .map(f => (f as AddressedMediaFile).publicUrl);

    if (selectedUrls.length === 0) {
      setError('Please select at least one file');
      return;
    }

    onInsert(allowMultiple ? selectedUrls : selectedUrls[0]);
    onClose();
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <StyledWidget>
        <StyledContainer>
          <StyledHeader>
            <StyledHeaderTitle>Bunny.net Media Library</StyledHeaderTitle>
            <StyledCloseButton onClick={onClose} title="Close">
              ✕
            </StyledCloseButton>
          </StyledHeader>
          <LoginPrompt onLogin={handleLogin} />
        </StyledContainer>
        <StyledBackdrop onClick={onClose} />
      </StyledWidget>
    );
  }

  // Main widget UI (after authentication)
  return (
    <StyledWidget>
      <StyledContainer>
        {/* Header */}
        <StyledHeader>
          <StyledHeaderTitle>Bunny.net Media Library</StyledHeaderTitle>
          <StyledCloseButton onClick={onClose} title="Close">
            ✕
          </StyledCloseButton>
        </StyledHeader>

        {/* Error Message */}
        {error && <StyledError>{error}</StyledError>}

        {/* Navigation */}
        <FileBrowser
          currentPath={currentPath}
          onNavigate={handleNavigate}
          onParentDirectory={handleParentDirectory}
        />

        {/* Upload Area */}
        <FileUpload
          onUpload={handleUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          currentPath={currentPath}
        />

        {/* File Grid */}
        <StyledFileGridContainer>
          {isLoading ? (
            <StyledLoading>Loading files...</StyledLoading>
          ) : files.length === 0 ? (
            <StyledEmpty>No files found</StyledEmpty>
          ) : (
            <FileGrid
              files={files}
              selectedFiles={selectedFiles}
              onSelectFile={handleSelectFile}
              onDoubleClick={handleFileDoubleClick}
              onDelete={handleDeleteFile}
              allowMultiple={allowMultiple}
            />
          )}
        </StyledFileGridContainer>

        {/* Footer Actions */}
        <StyledFooter>
          <StyledButtonSecondary onClick={handleLogout} title="Logout from Bunny">
            Logout
          </StyledButtonSecondary>
          <StyledButtonSecondary onClick={onClose}>Cancel</StyledButtonSecondary>
          {selectedFiles.size > 0 && (
            <StyledButtonPrimary onClick={handleInsertSelected} disabled={isUploading || isLoading}>
              Insert ({selectedFiles.size})
            </StyledButtonPrimary>
          )}
        </StyledFooter>
      </StyledContainer>

      {/* Backdrop */}
      <StyledBackdrop onClick={onClose} />
    </StyledWidget>
  );
}

export default BunnyWidget;
