/**
 * Tests for Bunny.net File Manager
 */

import { BunnyFileManager } from '../api/fileManager';

// Mock the BunnyClient
jest.mock('../api/client', () => {
  return {
    BunnyClient: jest.fn().mockImplementation(() => ({
      listFiles: jest.fn(),
      generatePublicUrl: jest.fn((prefix, path) => `${prefix}${path}`),
    })),
  };
});

describe('BunnyFileManager', () => {
  const mockConfig = {
    edgeBaseUrl: 'https://edge.example.test/functions/v1/bunny',
    getAccessToken: jest.fn(async () => 'test-access-token'),
    getActiveSiteId: jest.fn(async () => 'test-site-id'),
    cdnUrlPrefix: 'https://cdn.example.com',
  };

  it('should initialize with correct parameters', () => {
    const manager = new BunnyFileManager(mockConfig);
    expect(manager).toBeTruthy();
  });

  it('should filter image files correctly', () => {
    const manager = new BunnyFileManager(mockConfig);

    const files = [
      {
        Guid: '1',
        StorageZoneName: 'test-zone',
        Path: '/',
        ObjectName: 'image.jpg',
        Length: 1024,
        LastChanged: '2024-01-01T00:00:00Z',
        IsDirectory: false,
        DateCreated: '2024-01-01T00:00:00Z',
        StorageZoneId: 1,
      },
      {
        Guid: '2',
        StorageZoneName: 'test-zone',
        Path: '/',
        ObjectName: 'document.pdf',
        Length: 2048,
        LastChanged: '2024-01-01T00:00:00Z',
        IsDirectory: false,
        DateCreated: '2024-01-01T00:00:00Z',
        StorageZoneId: 1,
      },
      {
        Guid: '3',
        StorageZoneName: 'test-zone',
        Path: '/',
        ObjectName: 'video.png',
        Length: 512,
        LastChanged: '2024-01-01T00:00:00Z',
        IsDirectory: false,
        DateCreated: '2024-01-01T00:00:00Z',
        StorageZoneId: 1,
      },
    ];

    const filtered = manager.filterImageFiles(files);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].ObjectName).toBe('image.jpg');
    expect(filtered[1].ObjectName).toBe('video.png');
  });

  it('should normalize paths correctly', () => {
    const manager = new BunnyFileManager(mockConfig);

    expect(manager.normalizePath('/')).toBe('/');
    expect(manager.normalizePath('folder')).toBe('/folder/');
    expect(manager.normalizePath('/folder')).toBe('/folder/');
    expect(manager.normalizePath('/folder/')).toBe('/folder/');
    expect(manager.normalizePath('')).toBe('/');
  });

  it('should get parent path correctly', () => {
    const manager = new BunnyFileManager(mockConfig);

    expect(manager.getParentPath('/')).toBe('/');
    expect(manager.getParentPath('/folder/')).toBe('/');
    expect(manager.getParentPath('/folder/subfolder/')).toBe('/folder/');
  });
});
