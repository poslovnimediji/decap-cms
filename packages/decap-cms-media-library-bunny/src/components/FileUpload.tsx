/**
 * File Upload Component
 * Handles file uploads with drag-and-drop support
 */

import React, { useRef, useState } from 'react';

const styles = {
  uploadContainer: {
    padding: '16px 24px 0',
  },
  dropZone: {
    borderWidth: '2px',
    borderStyle: 'dashed',
    borderColor: '#ddd',
    borderRadius: '6px',
    padding: '24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#fafafa',
  },
  dropZoneHover: {
    borderColor: '#0066cc',
    backgroundColor: '#f5f9ff',
  },
  dropZoneDragging: {
    borderColor: '#0066cc',
    backgroundColor: '#e3f2fd',
  },
  dropZoneUploading: {
    borderColor: '#ccc',
    backgroundColor: '#f0f0f0',
    cursor: 'default' as const,
  },
  dropContent: {
    pointerEvents: 'none' as const,
  },
  dropIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  dropText: {
    margin: '8px 0 4px',
    fontSize: '14px',
    fontWeight: 500 as const,
    color: '#333',
  },
  dropSubtext: {
    margin: 0,
    fontSize: '12px',
    color: '#999',
  },
  uploadingContent: {
    pointerEvents: 'none' as const,
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e0e0e0',
    borderRadius: '3px',
    overflow: 'hidden' as const,
    marginBottom: '16px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0066cc',
    transition: 'width 0.3s ease',
    borderRadius: '3px',
  },
  uploadingText: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 500 as const,
    color: '#0066cc',
  },
  hiddenInput: {
    display: 'none' as const,
  },
};

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  isUploading: boolean;
  uploadProgress: number;
  currentPath: string;
}

export function FileUpload({
  onUpload,
  isUploading,
  uploadProgress,
  currentPath,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0 && !isUploading) {
      onUpload(droppedFiles);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleClick() {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function getDropZoneStyle() {
    let style = { ...styles.dropZone };
    if (isUploading) {
      style = { ...style, ...styles.dropZoneUploading };
    } else if (isDragging) {
      style = { ...style, ...styles.dropZoneDragging };
    } else if (isHovering) {
      style = { ...style, ...styles.dropZoneHover };
    }
    return style;
  }

  return (
    <div style={styles.uploadContainer}>
      <div
        style={getDropZoneStyle()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          style={styles.hiddenInput}
          disabled={isUploading}
        />

        {isUploading ? (
          <div style={styles.uploadingContent}>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
            <p style={styles.uploadingText}>Uploading... {uploadProgress}%</p>
          </div>
        ) : (
          <div style={styles.dropContent}>
            <div style={styles.dropIcon}>📤</div>
            <p style={styles.dropText}>Drag files here or click to upload</p>
            <p style={styles.dropSubtext}>Uploading to: {currentPath}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileUpload;
