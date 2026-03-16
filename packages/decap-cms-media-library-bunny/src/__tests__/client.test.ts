/**
 * Tests for Bunny.net API Client
 */

import { BunnyClient } from '../api/client';

// Mock fetch
global.fetch = jest.fn();

describe('BunnyClient', () => {
  const getAccessToken = jest.fn(async () => 'test-access-token');
  const getActiveSiteId = jest.fn(async () => 'test-site-id');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct parameters', () => {
    const client = new BunnyClient({
      edgeBaseUrl: 'https://edge.example.test/functions/v1/bunny',
      getAccessToken,
      getActiveSiteId,
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
      edgeBaseUrl: 'https://edge.example.test/functions/v1/bunny',
      getAccessToken,
      getActiveSiteId,
    });

    const files = await client.listFiles('/');

    expect(files).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://edge.example.test/functions/v1/bunny/',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-access-token',
          'x-site-id': 'test-site-id',
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
      edgeBaseUrl: 'https://edge.example.test/functions/v1/bunny',
      getAccessToken,
      getActiveSiteId,
    });

    await expect(client.listFiles('/')).rejects.toThrow('Bunny.net API error: 401');
  });

  it('should generate public URL correctly', () => {
    const client = new BunnyClient({
      edgeBaseUrl: 'https://edge.example.test/functions/v1/bunny',
      getAccessToken,
      getActiveSiteId,
    });

    const url = client.generatePublicUrl('https://cdn.example.com', '/folder/file.jpg');

    expect(url).toBe('https://cdn.example.com/folder/file.jpg');
  });

  it('should handle URL generation with trailing slash', () => {
    const client = new BunnyClient({
      edgeBaseUrl: 'https://edge.example.test/functions/v1/bunny',
      getAccessToken,
      getActiveSiteId,
    });

    const url = client.generatePublicUrl('https://cdn.example.com/', '/folder/file.jpg');

    expect(url).toBe('https://cdn.example.com/folder/file.jpg');
  });
});
