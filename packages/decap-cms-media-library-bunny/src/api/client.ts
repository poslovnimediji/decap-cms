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
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await this.handleResponse<BunnyFile[]>(response);
    return Array.isArray(data) ? data : [];
  }

  async uploadFile(filePath: string, file: Blob): Promise<void> {
    if (!this.apiKey) {
      throw new Error('API key not set. Please authenticate first.');
    }

    const url = this.buildUrl(filePath);
    const arrayBuffer = await file.arrayBuffer();

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        AccessKey: this.apiKey,
      },
      body: arrayBuffer,
    });

    await this.handleResponse<void>(response);
  }

  async deleteFile(filePath: string): Promise<void> {
    const url = this.buildUrl(filePath);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

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
