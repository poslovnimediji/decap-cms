/**
 * File Grid Component
 * Displays files and directories in a grid layout
 */

import React, { useMemo } from 'react';

import type { AddressedMediaFile } from '../types';

const styles = {
  grid: {
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '16px',
    width: '100%',
  },
  item: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    cursor: 'pointer',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderRadius: '6px',
    padding: '8px',
    transition: 'all 0.2s',
    backgroundColor: 'white',
    position: 'relative' as const,
  },
  itemHover: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  itemSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#0066cc',
  },
  thumbnail: {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '1',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    overflow: 'hidden' as const,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: '8px',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  folderIcon: {
    fontSize: '48px',
    color: '#999',
  },
  fileIcon: {
    fontSize: '48px',
    color: '#999',
  },
  checkbox: {
    position: 'absolute' as const,
    top: '4px',
    left: '4px',
    backgroundColor: 'white',
    borderRadius: '3px',
    padding: '2px',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  checkboxVisible: {
    opacity: 1,
  },
  checkboxInput: {
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  },
  deleteButton: {
    position: 'absolute' as const,
    top: '4px',
    right: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    borderRadius: '3px',
    width: '28px',
    height: '28px',
    fontSize: '16px',
    cursor: 'pointer',
    opacity: 0,
    transition: 'opacity 0.2s',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 0,
  },
  deleteButtonVisible: {
    opacity: 1,
  },
  name: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#333',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    marginBottom: '4px',
  },
  info: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    fontSize: '11px',
    color: '#999',
    gap: '2px',
  },
  size: {
    fontWeight: 500,
  },
  date: {
    color: '#bbb',
  },
};

interface FileGridProps {
  files: AddressedMediaFile[];
  selectedFiles: Set<string>;
  onSelectFile: (fileUrl: string) => void;
  onDoubleClick: (file: AddressedMediaFile) => void;
  onDelete: (filePath: string) => void;
  allowMultiple?: boolean;
}

// Image extensions for preview
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'];

export function FileGrid({
  files,
  selectedFiles,
  onSelectFile,
  onDoubleClick,
  onDelete,
  allowMultiple,
}: FileGridProps) {
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);

  function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  function isImageFile(filename: string): boolean {
    const ext = getFileExtension(filename);
    return IMAGE_EXTENSIONS.includes(ext);
  }

  const sortedFiles = useMemo(() => {
    // Directories first, then files, sorted alphabetically
    return [...files].sort((a, b) => {
      if (a.IsDirectory !== b.IsDirectory) {
        return a.IsDirectory ? -1 : 1;
      }
      return a.ObjectName.localeCompare(b.ObjectName);
    });
  }, [files]);

  return (
    <div style={styles.grid}>
      {sortedFiles.map(file => {
        const isSelected = selectedFiles.has(file.publicUrl);
        const isImage = !file.IsDirectory && isImageFile(file.ObjectName);
        const itemKey = `${file.Path}${file.ObjectName}`;
        const isHovered = hoveredItem === itemKey;

        return (
          <div
            key={itemKey}
            style={{
              ...styles.item,
              ...(isHovered ? styles.itemHover : {}),
              ...(isSelected ? styles.itemSelected : {}),
            }}
            onDoubleClick={() => onDoubleClick(file)}
            onClick={() => {
              if (!file.IsDirectory) {
                onSelectFile(file.publicUrl);
              }
            }}
            onMouseEnter={() => setHoveredItem(itemKey)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {/* Thumbnail */}
            <div style={styles.thumbnail}>
              {file.IsDirectory ? (
                <div style={styles.folderIcon}>📁</div>
              ) : isImage ? (
                <img
                  src={file.publicUrl}
                  alt={file.ObjectName}
                  style={styles.image}
                  loading="lazy"
                />
              ) : (
                <div style={styles.fileIcon}>📄</div>
              )}

              {/* Selection Checkbox */}
              {!file.IsDirectory && (
                <div
                  style={{
                    ...styles.checkbox,
                    ...(isHovered || isSelected ? styles.checkboxVisible : {}),
                  }}
                >
                  <input
                    type={allowMultiple ? 'checkbox' : 'radio'}
                    checked={isSelected}
                    onChange={() => onSelectFile(file.publicUrl)}
                    onClick={e => e.stopPropagation()}
                    style={styles.checkboxInput}
                  />
                </div>
              )}

              {/* Delete Button */}
              {!file.IsDirectory && (
                <button
                  style={{
                    ...styles.deleteButton,
                    ...(isHovered ? styles.deleteButtonVisible : {}),
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(`${file.Path}${file.ObjectName}`);
                  }}
                  title="Delete file"
                  onMouseEnter={e =>
                    (e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.1)')
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)')
                  }
                >
                  🗑️
                </button>
              )}
            </div>

            {/* File Name */}
            <div style={styles.name} title={file.ObjectName}>
              {file.ObjectName}
            </div>

            {/* File Info */}
            <div style={styles.info}>
              {!file.IsDirectory && <span style={styles.size}>{formatFileSize(file.Length)}</span>}
              <span style={styles.date}>{formatDate(file.LastChanged)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return '';
  }
}

export default FileGrid;
