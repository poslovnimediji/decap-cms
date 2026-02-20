/**
 * HTTP Client for Bunny.net Storage API
 * Handles authentication and request/response formatting
 */

const BUNNY_STORAGE_ENDPOINTS = {
  us: 'https://storage.bunnycdn.com',
  eu: 'https://storage.eu.bunnycdn.com',
  asia: 'https://storage.asia.bunnycdn.com',
  sydney: 'https://storage.sg.bunnycdn.com',
};

export type BunnyRegion = keyof typeof BUNNY_STORAGE_ENDPOINTS;

interface BunnyClientOptions {
  storageZoneName: string;
  apiKey: string;
  region?: BunnyRegion;
}

export class BunnyClient {
  private storageZoneName: string;
  private apiKey: string;
  private baseUrl: string;

  constructor({ storageZoneName, apiKey, region = 'us' }: BunnyClientOptions) {
    this.storageZoneName = storageZoneName;
    this.apiKey = apiKey;
    this.baseUrl = BUNNY_STORAGE_ENDPOINTS[region];
  }

  private getHeaders(): HeadersInit {
    return {
      AccessKey: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private buildUrl(path: string): string {
    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}/${this.storageZoneName}${normalizedPath}`;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Bunny.net API error: ${response.status} - ${errorBody}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.text() as unknown as T;
  }

  async listFiles(path = '/'): Promise<any[]> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await this.handleResponse<any[]>(response);
    return Array.isArray(data) ? data : [];
  }

  async uploadFile(filePath: string, file: Blob): Promise<void> {
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
