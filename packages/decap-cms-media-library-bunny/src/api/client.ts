/**
 * HTTP Client for Bunny.net Storage API
 * Handles authentication and request/response formatting
 */

import type { BunnyFile } from '../types';

interface BunnyClientOptions {
  edgeBaseUrl: string;
  getAccessToken: () => Promise<string | null>;
  getActiveSiteId: () => Promise<string | null>;
}

export class BunnyClient {
  private edgeBaseUrl: string;
  private getAccessToken: () => Promise<string | null>;
  private getActiveSiteId: () => Promise<string | null>;

  constructor({ edgeBaseUrl, getAccessToken, getActiveSiteId }: BunnyClientOptions) {
    this.edgeBaseUrl = edgeBaseUrl.replace(/\/+$/, '');
    this.getAccessToken = getAccessToken;
    this.getActiveSiteId = getActiveSiteId;
  }

  private async getHeaders(contentType?: string): Promise<HeadersInit> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      throw new Error('Session token not found. Please authenticate first.');
    }

    const activeSiteId = await this.getActiveSiteId();
    if (!activeSiteId) {
      throw new Error('Active site id not found.');
    }

    return {
      Authorization: `Bearer ${accessToken}`,
      'x-site-id': activeSiteId,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    };
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.replace(/^\/+/, '');
    return `${this.edgeBaseUrl}/${normalizedPath}`;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Bunny Client] API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        headers: Object.fromEntries(response.headers.entries()),
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
    const headers = await this.getHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await this.handleResponse<BunnyFile[]>(response);
    return Array.isArray(data) ? data : [];
  }

  async uploadFile(filePath: string, file: Blob): Promise<void> {
    const url = this.buildUrl(filePath);
    const arrayBuffer = await file.arrayBuffer();

    const response = await fetch(url, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: arrayBuffer,
    });

    await this.handleResponse<void>(response);
  }

  async deleteFile(filePath: string): Promise<void> {
    const url = this.buildUrl(filePath);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: await this.getHeaders(),
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
