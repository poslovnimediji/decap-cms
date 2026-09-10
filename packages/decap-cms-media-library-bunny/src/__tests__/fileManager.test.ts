/**
 * Tests for Bunny.net File Manager
 */

import { BunnyFileManager } from '../api/fileManager';

// Mock the BunnyClient
jest.mock('../api/client', () => {
  return {
    BunnyClient: jest.fn().mockImplementation(() => ({
      listFiles: jest.fn(),
      uploadFile: jest.fn(async () => undefined),
      deleteFile: jest.fn(async () => undefined),
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

  /**
   * Regression: cmt-sites#261 (the delete half).
   *
   * Bunny's storage API addresses objects RELATIVE to the storage zone, but
   * its LIST response reports each entry's `Path` zone-QUALIFIED — literally
   * `/cmt-sites/` for every row. The grid built its delete target from that
   * field, so a file uploaded to `/photo.jpg` was deleted at
   * `/cmt-sites/photo.jpg`; the adapter prefixed the zone again and Bunny
   * answered `404 Object Not Found` every single time. Delete had never once
   * worked, and the widget surfaced it only as a banner, leaving the tile in
   * place — which is what it was reported as ("deleting does not remove it").
   *
   * The guard that matters is not "delete calls the client" but "delete and
   * upload address the SAME object", so these assert them against each other.
   */
  it('deletes at the same zone-relative path that upload writes to', async () => {
    const manager = new BunnyFileManager(mockConfig);
    const client = (manager as unknown as { client: Record<string, jest.Mock> }).client;

    await manager.uploadFile('/', new Blob(['x']), 'photo.jpg');
    await manager.deleteFile('/', 'photo.jpg');

    const uploaded = client.uploadFile.mock.calls[0][0];
    const deleted = client.deleteFile.mock.calls[0][0];

    expect(deleted).toBe(uploaded);
    expect(deleted).toBe('/photo.jpg');
    // The specific shape that produced the 404.
    expect(deleted).not.toContain('cmt-sites');
  });

  it('joins nested directories the same way for upload and delete', async () => {
    const manager = new BunnyFileManager(mockConfig);
    const client = (manager as unknown as { client: Record<string, jest.Mock> }).client;

    await manager.uploadFile('/gallery/2026/', new Blob(['x']), 'photo.jpg');
    await manager.deleteFile('/gallery/2026/', 'photo.jpg');

    expect(client.deleteFile.mock.calls[0][0]).toBe(client.uploadFile.mock.calls[0][0]);
    // Collapsed, not doubled, on the directory/name boundary.
    expect(client.deleteFile.mock.calls[0][0]).toBe('/gallery/2026/photo.jpg');
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
