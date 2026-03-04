/**
 * Tests for Bunny.net API Client
 */

import { BunnyClient } from '../api/client';

// Mock fetch
global.fetch = jest.fn();

describe('BunnyClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct parameters', () => {
    const client = new BunnyClient({
      storageZoneName: 'test-zone',
      apiKey: 'test-key',
      region: 'us',
    });

    expect(client).toBeTruthy();
  });

  it('should list files successfully', async () => {
    const mockResponse = [
      {
        Guid: '123',
        StorageZoneName: 'test-zone',
        Path: '/',
        ObjectName: 'file.jpg',
        Length: 1024,
        LastChanged: '2024-01-01T00:00:00Z',
        IsDirectory: false,
        DateCreated: '2024-01-01T00:00:00Z',
        StorageZoneId: 1,
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => mockResponse,
    });

    const client = new BunnyClient({
      storageZoneName: 'test-zone',
      apiKey: 'test-key',
    });

    const files = await client.listFiles('/');

    expect(files).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('test-zone'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          AccessKey: 'test-key',
        }),
      }),
    );
  });

  it('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: {
        entries: () => [],
      },
      text: async () => 'Unauthorized',
    });

    const client = new BunnyClient({
      storageZoneName: 'test-zone',
      apiKey: 'invalid-key',
    });

    await expect(client.listFiles('/')).rejects.toThrow('Bunny.net API error: 401');
  });

  it('should generate public URL correctly', () => {
    const client = new BunnyClient({
      storageZoneName: 'test-zone',
      apiKey: 'test-key',
    });

    const url = client.generatePublicUrl('https://cdn.example.com', '/folder/file.jpg');

    expect(url).toBe('https://cdn.example.com/folder/file.jpg');
  });

  it('should handle URL generation with trailing slash', () => {
    const client = new BunnyClient({
      storageZoneName: 'test-zone',
      apiKey: 'test-key',
    });

    const url = client.generatePublicUrl('https://cdn.example.com/', '/folder/file.jpg');

    expect(url).toBe('https://cdn.example.com/folder/file.jpg');
  });
});
