/**
 * Main Bunny.net Media Library Widget Component
 * Provides file browser interface integrated with Decap CMS
 */

import React, { useState, useEffect, useRef } from 'react';

import { BunnyFileManager } from '../api/fileManager';
import FileGrid from './FileGrid';
import FileBrowser from './FileBrowser';
import FileUpload from './FileUpload';

import type { AddressedMediaFile } from '../types';

const styles = {
  widget: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 99999,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  backdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: -1,
  },
  container: {
    position: 'relative' as const,
    width: '90%',
    maxWidth: '1200px',
    height: '90vh',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    background: '#f9f9f9',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: 0,
    width: '32px',
    height: '32px',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: '#666',
    transition: 'color 0.2s',
  },
  error: {
    padding: '12px 24px',
    backgroundColor: '#fee',
    color: '#c33',
    borderBottom: '1px solid #e0e0e0',
    fontSize: '14px',
  },
  fileGridContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '20px 24px',
    background: 'white',
  },
  loading: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: '100%',
    color: '#999',
    fontSize: '16px',
  },
  empty: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    height: '100%',
    color: '#999',
    fontSize: '16px',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e0e0e0',
    background: '#f9f9f9',
    display: 'flex' as const,
    justifyContent: 'flex-end' as const,
    gap: '12px',
  },
  buttonPrimary: {
    padding: '8px 16px',
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500 as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonPrimaryDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  buttonSecondary: {
    padding: '8px 16px',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500 as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

interface BunnyWidgetProps {
  config: {
    storage_zone_name: string;
    api_key: string;
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
  const [currentPath, setCurrentPath] = useState<string>(config.root_path || '/');
  const [files, setFiles] = useState<AddressedMediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const fileManagerRef = useRef<BunnyFileManager | null>(null);

  // Initialize file manager
  useEffect(() => {
    try {
      fileManagerRef.current = new BunnyFileManager({
        storageZoneName: config.storage_zone_name,
        apiKey: config.api_key,
        cdnUrlPrefix: config.cdn_url_prefix,
      });
    } catch (err) {
      setError(`Failed to initialize: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [config]);

  // Load files when path changes
  useEffect(() => {
    if (!fileManagerRef.current) return;

    async function loadFiles() {
      try {
        setIsLoading(true);
        setError(null);
        const filesData = await fileManagerRef.current!.getFilesWithUrls(currentPath, imagesOnly);
        setFiles(filesData);
      } catch (err) {
        setError(`Failed to load files: ${err instanceof Error ? err.message : String(err)}`);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadFiles();
  }, [currentPath, imagesOnly]);

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

  return (
    <div style={styles.widget}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Bunny.net Media Library</h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            title="Close"
            onMouseEnter={e => (e.currentTarget.style.color = '#333')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
          >
            ✕
          </button>
        </div>

        {/* Error Message */}
        {error && <div style={styles.error}>{error}</div>}

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
        <div style={styles.fileGridContainer}>
          {isLoading ? (
            <div style={styles.loading}>Loading files...</div>
          ) : files.length === 0 ? (
            <div style={styles.empty}>No files found</div>
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
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          <button
            style={styles.buttonSecondary}
            onClick={onClose}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#d0d0d0')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
          >
            Cancel
          </button>
          {selectedFiles.size > 0 && (
            <button
              style={{
                ...styles.buttonPrimary,
                ...(isUploading || isLoading ? styles.buttonPrimaryDisabled : {}),
              }}
              onClick={handleInsertSelected}
              disabled={isUploading || isLoading}
              onMouseEnter={
                isUploading || isLoading
                  ? undefined
                  : e => (e.currentTarget.style.backgroundColor = '#0052a3')
              }
              onMouseLeave={
                isUploading || isLoading
                  ? undefined
                  : e => (e.currentTarget.style.backgroundColor = '#0066cc')
              }
            >
              Insert ({selectedFiles.size})
            </button>
          )}
        </div>
      </div>

      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />
    </div>
  );
}

export default BunnyWidget;
