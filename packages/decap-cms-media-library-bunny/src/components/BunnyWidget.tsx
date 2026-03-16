/**
 * Main Bunny.net Media Library Widget Component
 * Provides file browser interface integrated with Decap CMS
 */

import React, { useState, useEffect, useRef } from 'react';

import { BunnyFileManager } from '../api/fileManager';
import BunnyFileGrid from './FileGrid';
import BunnyFileBrowser from './FileBrowser';
import BunnyFileUpload from './FileUpload';
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
    cdn_url_prefix: string;
    root_path?: string;
  };
  resolveRequestContext: () => Promise<{
    accessToken: string | null;
    activeSiteId: string | null;
    edgeBaseUrl: string | null;
  }>;
  onInsert: (value: string | string[]) => void;
  onClose: () => void;
  allowMultiple?: boolean;
  imagesOnly?: boolean;
  value?: string | string[];
}

export function BunnyWidget({
  config,
  resolveRequestContext,
  onInsert,
  onClose,
  allowMultiple = false,
  imagesOnly = false,
}: BunnyWidgetProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [currentPath, setCurrentPath] = useState<string>(config.root_path || '/');
  const [files, setFiles] = useState<AddressedMediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isManagerReady, setIsManagerReady] = useState(false);

  const fileManagerRef = useRef<BunnyFileManager | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function validateContext() {
      try {
        const context = await resolveRequestContext();
        if (!isMounted) {
          return;
        }

        if (!context.accessToken) {
          throw new Error('Session token not found. Please log in again.');
        }

        if (!context.activeSiteId) {
          throw new Error('Active site id is missing in backend configuration.');
        }

        if (!context.edgeBaseUrl) {
          throw new Error('Backend base URL is missing. Configure backend.base_url.');
        }

        setError(null);
        setIsAuthenticated(true);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setIsAuthenticated(false);
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    validateContext();

    return () => {
      isMounted = false;
    };
  }, [resolveRequestContext]);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated) {
      fileManagerRef.current = null;
      setIsManagerReady(false);
      return;
    }

    async function initializeFileManager() {
      try {
        const context = await resolveRequestContext();
        if (!isMounted || !context.edgeBaseUrl) {
          return;
        }
        fileManagerRef.current = new BunnyFileManager({
          edgeBaseUrl: context.edgeBaseUrl,
          getAccessToken: async () => (await resolveRequestContext()).accessToken,
          getActiveSiteId: async () => (await resolveRequestContext()).activeSiteId,
          cdnUrlPrefix: config.cdn_url_prefix,
        });
        setIsManagerReady(true);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('[Bunny Widget] Failed to initialize file manager:', errorMsg);
        setError(`Failed to initialize: ${errorMsg}`);
        setIsManagerReady(false);
      }
    }

    initializeFileManager();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, config.cdn_url_prefix, resolveRequestContext]);

  // Load files when path changes (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !isManagerReady || !fileManagerRef.current) {
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
  }, [currentPath, imagesOnly, isAuthenticated, isManagerReady]);

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
          <StyledEmpty>{error || 'Please authenticate in Decap CMS first.'}</StyledEmpty>
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
        <BunnyFileBrowser
          currentPath={currentPath}
          onNavigate={handleNavigate}
          onParentDirectory={handleParentDirectory}
        />

        {/* Upload Area */}
        <BunnyFileUpload
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
            <BunnyFileGrid
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
