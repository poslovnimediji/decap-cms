/**
 * HTTP Client for Bunny.net Storage API
 * Handles authentication and request/response formatting
 */

import type { BunnyFile } from '../types';

const BUNNY_STORAGE_ENDPOINTS = {
  us: 'https://storage.bunnycdn.com',
  eu: 'https://storage.eu.bunnycdn.com',
  asia: 'https://storage.asia.bunnycdn.com',
  sydney: 'https://storage.sg.bunnycdn.com',
};

export type BunnyRegion = keyof typeof BUNNY_STORAGE_ENDPOINTS;

interface BunnyClientOptions {
  storageZoneName: string;
  apiKey?: string;
  region?: BunnyRegion;
}

export class BunnyClient {
  private storageZoneName: string;
  private apiKey: string | null;
  private baseUrl: string;

  constructor({ storageZoneName, apiKey, region = 'us' }: BunnyClientOptions) {
    this.storageZoneName = storageZoneName;
    this.apiKey = apiKey || null;
    this.baseUrl = BUNNY_STORAGE_ENDPOINTS[region];
    console.log('[Bunny Client] Initialized with:', { 
      storageZoneName, 
      hasApiKey: !!apiKey, 
      apiKeyLength: apiKey ? apiKey.length : 0,
      region 
    });
  }

  /**
   * Update the API key at runtime
   */
  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.apiKey;
  }

  private getHeaders(): HeadersInit {
    if (!this.apiKey) {
      console.error('[Bunny Client] getHeaders called but API key is not set!');
      throw new Error('API key not set. Please authenticate first.');
    }
    console.log('[Bunny Client] getHeaders called, API key length:', this.apiKey.length);
    return {
      AccessKey: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(path: string): string {
    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    // URL format: https://storage.bunnycdn.com/{storageZoneName}{path}
    const url = `${this.baseUrl}/${this.storageZoneName}${normalizedPath}`;
    console.log('[Bunny Client] Built URL:', url);
    return url;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Bunny Client] API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Bunny.net API error: ${response.status} - ${errorBody}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.text() as unknown as T;
  }

  async listFiles(path = '/'): Promise<BunnyFile[]> {
    const url = this.buildUrl(path);
    const headers = this.getHeaders();
    console.log('[Bunny Client] Listing files from:', url);
    const maskedKey =
      this.apiKey && this.apiKey.length > 16
        ? `${this.apiKey.slice(0, 8)}...${this.apiKey.slice(-8)}`
        : 'NOT SET';
    console.log('[Bunny Client] Request headers:', {
      'Content-Type': 'application/json',
      AccessKey: maskedKey,
    });
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await this.handleResponse<BunnyFile[]>(response);
    console.log(
      '[Bunny Client] Listed files, count:',
      Array.isArray(data) ? data.length : 0,
    );
    return Array.isArray(data) ? data : [];
  }

  async uploadFile(filePath: string, file: Blob): Promise<void> {
    if (!this.apiKey) {
      throw new Error('API key not set. Please authenticate first.');
    }

    const url = this.buildUrl(filePath);
    console.log('[Bunny Client] Uploading file to:', url);
    const arrayBuffer = await file.arrayBuffer();

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        AccessKey: this.apiKey,
      },
      body: arrayBuffer,
    });

    console.log('[Bunny Client] File uploaded successfully');
    await this.handleResponse<void>(response);
  }

  async deleteFile(filePath: string): Promise<void> {
    const url = this.buildUrl(filePath);
    console.log('[Bunny Client] Deleting file from:', url);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    console.log('[Bunny Client] File deleted successfully');
    await this.handleResponse<void>(response);
  }

  /**
   * Generates a public CDN URL for a file
   */
  generatePublicUrl(cdnPrefix: string, filePath: string): string {
    // Remove leading slash from filePath for URL construction
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const cleanPrefix = cdnPrefix.endsWith('/') ? cdnPrefix.slice(0, -1) : cdnPrefix;
    return `${cleanPrefix}/${cleanPath}`;
  }
}
