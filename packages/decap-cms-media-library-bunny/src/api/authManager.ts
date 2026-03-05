/**
 * Authentication Manager for Bunny.net
 * Handles OAuth-style authentication flow and credential storage
 */

const STORAGE_API_KEY = 'bunny_auth_key';
const ACCOUNT_API_KEY = 'bunny_account_api_key';
const STORAGE_ZONE_NAME_KEY = 'bunny_storage_zone_name';
const RETURN_URL_KEY = 'bunny_return_url';

// Helper functions for safe localStorage access
function safeGetItem(key: string, errorMsg: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(errorMsg, e);
    return null;
  }
}

function safeSetItem(key: string, value: string, errorMsg: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(errorMsg, e);
  }
}

function safeRemoveItem(key: string, errorMsg: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(errorMsg, e);
  }
}

export class BunnyAuthManager {
  static getStoredApiKey(): string | null {
    return safeGetItem(STORAGE_API_KEY, 'Failed to retrieve stored API key:');
  }

  static setStoredApiKey(apiKey: string): void {
    safeSetItem(STORAGE_API_KEY, apiKey, '[Bunny Auth] Failed to store Storage Zone Password:');
  }

  static getStoredAccountApiKey(): string | null {
    return safeGetItem(ACCOUNT_API_KEY, '[Bunny Auth] Failed to retrieve Account API Key:');
  }

  static setStoredAccountApiKey(apiKey: string): void {
    safeSetItem(ACCOUNT_API_KEY, apiKey, '[Bunny Auth] Failed to store Account API Key:');
  }

  static getStoredStorageZoneName(): string | null {
    return safeGetItem(STORAGE_ZONE_NAME_KEY, 'Failed to retrieve storage zone name:');
  }

  static setStoredStorageZoneName(zoneName: string): void {
    safeSetItem(STORAGE_ZONE_NAME_KEY, zoneName, 'Failed to store storage zone name:');
  }

  static clearStoredApiKey(): void {
    try {
      localStorage.removeItem(STORAGE_API_KEY);
      localStorage.removeItem(ACCOUNT_API_KEY);
      localStorage.removeItem(STORAGE_ZONE_NAME_KEY);
    } catch (e) {
      console.error('Failed to clear stored credentials:', e);
    }
  }

  static saveReturnUrl(url: string = window.location.href): void {
    const sanitizedUrl = this.sanitizeReturnUrl(url);
    safeSetItem(RETURN_URL_KEY, sanitizedUrl, '[Bunny Auth] Failed to save return URL:');
  }

  static getReturnUrl(): string | null {
    return safeGetItem(RETURN_URL_KEY, '[Bunny Auth] Failed to retrieve return URL:');
  }

  static clearReturnUrl(): void {
    safeRemoveItem(RETURN_URL_KEY, '[Bunny Auth] Failed to clear return URL:');
  }

  // Auth parameter names to check in URLs
  private static AUTH_PARAM_NAMES = [
    'accessKey',
    'apiKey',
    'api_key',
    'password',
    'token',
    'storageName',
    'storage_name',
    'storageZoneName',
    'storage_zone_name',
    'zoneName',
    'zone_name',
  ];

  // Helper to parse URL parameters from search and hash
  private static parseUrlParams(url: URL = new URL(window.location.href)) {
    const searchParams = new URLSearchParams(url.search);
    const hashContent = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const hashQueryIndex = hashContent.indexOf('?');
    const hashRoute = hashQueryIndex >= 0 ? hashContent.slice(0, hashQueryIndex) : hashContent;
    const hashQueryParams =
      hashQueryIndex >= 0
        ? new URLSearchParams(hashContent.slice(hashQueryIndex + 1))
        : hashContent.includes('=')
        ? new URLSearchParams(hashContent)
        : new URLSearchParams();

    return { searchParams, hashRoute, hashQueryParams };
  }

  // Helper to get param value from multiple sources
  private static getParamValue(
    paramNames: string[],
    searchParams: URLSearchParams,
    hashQueryParams: URLSearchParams,
  ): string | null {
    for (const name of paramNames) {
      const value = searchParams.get(name) || hashQueryParams.get(name);
      if (value) return value;
    }
    return null;
  }

  // Helper to remove auth parameters from URLSearchParams
  private static removeAuthParams(params: URLSearchParams): boolean {
    let removed = false;
    this.AUTH_PARAM_NAMES.forEach(param => {
      if (params.has(param)) {
        params.delete(param);
        removed = true;
      }
    });
    return removed;
  }

  // Helper to rebuild URL from components
  private static rebuildUrl(
    pathname: string,
    searchParams: URLSearchParams,
    hashRoute: string,
    hashQueryParams: URLSearchParams,
  ): string {
    const searchQuery = searchParams.toString();
    const hashQuery = hashQueryParams.toString();
    const hashPrefix = hashRoute ? `#${hashRoute}` : hashQuery ? '#' : '';
    const hashSuffix = hashQuery ? `${hashRoute ? '?' : ''}${hashQuery}` : '';
    return `${pathname}${searchQuery ? `?${searchQuery}` : ''}${hashPrefix}${hashSuffix}`;
  }

  /**
   * Generate the Bunny authentication URL
   */
  static generateAuthUrl(): string {
    const currentDomain = window.location.origin;
    // TODO: Once Bunny fixes callbackUrl support, use: currentDomain + window.location.pathname
    const callbackUrl = currentDomain + window.location.pathname;
    const authUrl = 'https://dash.bunny.net/auth/login';
    const params = new URLSearchParams({
      source: 'decap',
      domain: currentDomain,
      callbackUrl,
    });
    return `${authUrl}?${params.toString()}`;
  }

  static resolveReturnUrl(): string | null {
    return this.getReturnUrl();
  }

  static redirectToAuth(): void {
    this.saveReturnUrl();
    window.location.href = this.generateAuthUrl();
  }

  /**
   * Extract Account API key and storage zone name from URL parameters
   */
  static extractCredentialsFromUrl(): { apiKey: string | null; storageName: string | null } {
    const { searchParams, hashQueryParams } = this.parseUrlParams();

    const apiKeyNames = ['accessKey', 'apiKey', 'api_key', 'password', 'token'];
    const storageNames = [
      'storageName',
      'storage_name',
      'storageZoneName',
      'storage_zone_name',
      'zoneName',
      'zone_name',
    ];

    return {
      apiKey: this.getParamValue(apiKeyNames, searchParams, hashQueryParams),
      storageName: this.getParamValue(storageNames, searchParams, hashQueryParams),
    };
  }

  /**
   * Clean URL by removing auth parameters
   */
  static cleanAuthParamsFromUrl(): void {
    const { searchParams, hashRoute, hashQueryParams } = this.parseUrlParams();

    const searchRemoved = this.removeAuthParams(searchParams);
    const hashRemoved = this.removeAuthParams(hashQueryParams);

    if (searchRemoved || hashRemoved) {
      const newUrl = this.rebuildUrl(
        window.location.pathname,
        searchParams,
        hashRoute,
        hashQueryParams,
      );
      window.history.replaceState({}, '', newUrl);
    }
  }

  /**
   * Remove auth parameters from an arbitrary URL while preserving hash routes
   */
  static sanitizeReturnUrl(url: string): string {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      const { searchParams, hashRoute, hashQueryParams } = this.parseUrlParams(parsedUrl);

      this.removeAuthParams(searchParams);
      this.removeAuthParams(hashQueryParams);

      return this.rebuildUrl(parsedUrl.pathname, searchParams, hashRoute, hashQueryParams);
    } catch (e) {
      console.warn('[Bunny Auth] Failed to sanitize return URL, using raw value');
      return url;
    }
  }

  /**
   * Check if fully authenticated
   */
  static isAuthenticated(): boolean {
    return !!(this.getStoredApiKey() && this.getStoredStorageZoneName());
  }
}
