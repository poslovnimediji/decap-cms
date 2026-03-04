/**
 * Authentication Manager for Bunny.net
 * Handles OAuth-style authentication flow and credential storage
 */

const STORAGE_API_KEY = 'bunny_auth_key';
const ACCOUNT_API_KEY = 'bunny_account_api_key';
const STORAGE_ZONE_NAME_KEY = 'bunny_storage_zone_name';
const RETURN_URL_KEY = 'bunny_return_url';
const AUTO_OPEN_FLAG_KEY = 'bunny_auto_open';

export class BunnyAuthManager {
  /**
   * Get stored API key (storage zone password) from localStorage
   */
  static getStoredApiKey(): string | null {
    try {
      return localStorage.getItem(STORAGE_API_KEY);
    } catch (e) {
      console.error('Failed to retrieve stored API key:', e);
      return null;
    }
  }

  /**
   * Set (store) Storage Zone Password (for Storage API) in localStorage
   */
  static setStoredApiKey(apiKey: string): void {
    try {
      localStorage.setItem(STORAGE_API_KEY, apiKey);
    } catch (e) {
      console.error('[Bunny Auth] Failed to store Storage Zone Password:', e);
    }
  }

  /**
   * Get stored Account API Key from localStorage
   */
  static getStoredAccountApiKey(): string | null {
    try {
      return localStorage.getItem(ACCOUNT_API_KEY);
    } catch (e) {
      console.error('[Bunny Auth] Failed to retrieve Account API Key:', e);
      return null;
    }
  }

  /**
   * Set (store) Account API Key (from OAuth) in localStorage
   */
  static setStoredAccountApiKey(apiKey: string): void {
    try {
      localStorage.setItem(ACCOUNT_API_KEY, apiKey);
    } catch (e) {
      console.error('[Bunny Auth] Failed to store Account API Key:', e);
    }
  }

  /**
   * Get stored storage zone name from localStorage
   */
  static getStoredStorageZoneName(): string | null {
    try {
      return localStorage.getItem(STORAGE_ZONE_NAME_KEY);
    } catch (e) {
      console.error('Failed to retrieve storage zone name:', e);
      return null;
    }
  }

  /**
   * Set (store) storage zone name in localStorage
   */
  static setStoredStorageZoneName(zoneName: string): void {
    try {
      localStorage.setItem(STORAGE_ZONE_NAME_KEY, zoneName);
    } catch (e) {
      console.error('Failed to store storage zone name:', e);
    }
  }

  /**
   * Clear stored credentials from localStorage
   */
  static clearStoredApiKey(): void {
    try {
      localStorage.removeItem(STORAGE_API_KEY);
      localStorage.removeItem(ACCOUNT_API_KEY);
      localStorage.removeItem(STORAGE_ZONE_NAME_KEY);
    } catch (e) {
      console.error('Failed to clear stored credentials:', e);
    }
  }

  /**
   * Save the current page URL before redirecting to authentication
   * This allows us to return to the exact page after login
   */
  static saveReturnUrl(url: string = window.location.href): void {
    try {
      const sanitizedUrl = this.sanitizeReturnUrl(url);
      localStorage.setItem(RETURN_URL_KEY, sanitizedUrl);
    } catch (e) {
      console.error('[Bunny Auth] Failed to save return URL:', e);
    }
  }

  /**
   * Get the saved return URL
   */
  static getReturnUrl(): string | null {
    try {
      return localStorage.getItem(RETURN_URL_KEY);
    } catch (e) {
      console.error('[Bunny Auth] Failed to retrieve return URL:', e);
      return null;
    }
  }

  /**
   * Clear the saved return URL
   */
  static clearReturnUrl(): void {
    try {
      localStorage.removeItem(RETURN_URL_KEY);
    } catch (e) {
      console.error('[Bunny Auth] Failed to clear return URL:', e);
    }
  }

  /**
   * Set flag to auto-open media library after authentication
   */
  static setAutoOpenFlag(): void {
    try {
      localStorage.setItem(AUTO_OPEN_FLAG_KEY, 'true');
    } catch (e) {
      console.error('[Bunny Auth] Failed to set auto-open flag:', e);
    }
  }

  /**
   * Check if media library should auto-open after auth
   */
  static shouldAutoOpen(): boolean {
    try {
      return localStorage.getItem(AUTO_OPEN_FLAG_KEY) === 'true';
    } catch (e) {
      console.error('[Bunny Auth] Failed to check auto-open flag:', e);
      return false;
    }
  }

  /**
   * Clear auto-open flag
   */
  static clearAutoOpenFlag(): void {
    try {
      localStorage.removeItem(AUTO_OPEN_FLAG_KEY);
    } catch (e) {
      console.error('[Bunny Auth] Failed to clear auto-open flag:', e);
    }
  }

  /**
   * Generate the Bunny authentication URL
   * Redirects back to CMS root after authentication
   */
  static generateAuthUrl(): string {
    const currentDomain = window.location.origin;
    // Callback URL is the CMS root - Bunny will redirect there with API key in params
    const callbackUrl = currentDomain;

    const authUrl = 'https://dash.bunny.net/auth/login';
    const params = new URLSearchParams({
      source: 'decap',
      domain: currentDomain,
      callbackUrl,
    });

    return `${authUrl}?${params.toString()}`;
  }

  /**
   * Resolve return URL from stored value
   */
  static resolveReturnUrl(): string | null {
    return this.getReturnUrl();
  }

  /**
   * Redirect to Bunny authentication in the same window
   */
  static redirectToAuth(): void {
    // Save current location before redirecting
    this.saveReturnUrl();
    // Set flag to auto-open media library after auth
    this.setAutoOpenFlag();
    const authUrl = this.generateAuthUrl();
    window.location.href = authUrl;
  }

  /**
   * Extract Account API key and storage zone name from URL parameters
   * Bunny OAuth returns the Account API Key (not Storage Zone Password)
   * We'll use this Account API Key to fetch the actual Storage Zone Password
   */
  static extractCredentialsFromUrl(): { apiKey: string | null; storageName: string | null } {
    const searchParams = new URLSearchParams(window.location.search);
    const hashContent = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashQueryIndex = hashContent.indexOf('?');
    const hashParams = new URLSearchParams(hashContent);
    const hashQueryParams =
      hashQueryIndex >= 0 ? new URLSearchParams(hashContent.slice(hashQueryIndex + 1)) : null;

    // Try multiple parameter names for API key
    const apiKey =
      searchParams.get('accessKey') ||
      searchParams.get('apiKey') ||
      searchParams.get('api_key') ||
      searchParams.get('password') ||
      searchParams.get('token') ||
      hashParams.get('accessKey') ||
      hashParams.get('apiKey') ||
      hashParams.get('api_key') ||
      hashParams.get('password') ||
      hashParams.get('token') ||
      hashQueryParams?.get('accessKey') ||
      hashQueryParams?.get('apiKey') ||
      hashQueryParams?.get('api_key') ||
      hashQueryParams?.get('password') ||
      hashQueryParams?.get('token') ||
      null;

    // Try multiple parameter names for storage zone name
    const storageName =
      searchParams.get('storageName') ||
      searchParams.get('storage_name') ||
      searchParams.get('storageZoneName') ||
      searchParams.get('storage_zone_name') ||
      searchParams.get('zoneName') ||
      searchParams.get('zone_name') ||
      hashParams.get('storageName') ||
      hashParams.get('storage_name') ||
      hashParams.get('storageZoneName') ||
      hashParams.get('storage_zone_name') ||
      hashParams.get('zoneName') ||
      hashParams.get('zone_name') ||
      hashQueryParams?.get('storageName') ||
      hashQueryParams?.get('storage_name') ||
      hashQueryParams?.get('storageZoneName') ||
      hashQueryParams?.get('storage_zone_name') ||
      hashQueryParams?.get('zoneName') ||
      hashQueryParams?.get('zone_name') ||
      null;

    if (apiKey || storageName) {
      // Credentials found in URL
    }

    return { apiKey, storageName };
  }

  /**
   * Clean URL by removing auth parameters
   */
  static cleanAuthParamsFromUrl(): void {
    const searchParams = new URLSearchParams(window.location.search);
    const hashContent = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashQueryIndex = hashContent.indexOf('?');
    const hasHashQuery = hashQueryIndex >= 0;
    const hashRoute = hasHashQuery ? hashContent.slice(0, hashQueryIndex) : hashContent;
    const hashQueryParams = hasHashQuery
      ? new URLSearchParams(hashContent.slice(hashQueryIndex + 1))
      : hashContent.includes('=')
      ? new URLSearchParams(hashContent)
      : new URLSearchParams();
    const authParamNames = [
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
    let hasAuthParams = false;

    authParamNames.forEach(param => {
      if (searchParams.has(param)) {
        searchParams.delete(param);
        hasAuthParams = true;
      }
      if (hashQueryParams.has(param)) {
        hashQueryParams.delete(param);
        hasAuthParams = true;
      }
    });

    if (hasAuthParams) {
      const searchQuery = searchParams.toString();
      const hashQuery = hashQueryParams.toString();
      const hashPrefix = hashRoute ? `#${hashRoute}` : hashQuery ? '#' : '';
      const hashSuffix = hashQuery ? `${hashRoute ? '?' : ''}${hashQuery}` : '';
      const newUrl = `${window.location.pathname}${
        searchQuery ? `?${searchQuery}` : ''
      }${hashPrefix}${hashSuffix}`;
      window.history.replaceState({}, '', newUrl);
    }
  }

  /**
   * Remove auth parameters from an arbitrary URL while preserving hash routes
   */
  static sanitizeReturnUrl(url: string): string {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      const searchParams = new URLSearchParams(parsedUrl.search);
      const hashContent = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash;
      const hashQueryIndex = hashContent.indexOf('?');
      const hashRoute = hashQueryIndex >= 0 ? hashContent.slice(0, hashQueryIndex) : hashContent;
      const hashQueryParams =
        hashQueryIndex >= 0
          ? new URLSearchParams(hashContent.slice(hashQueryIndex + 1))
          : hashContent.includes('=')
          ? new URLSearchParams(hashContent)
          : new URLSearchParams();

      const authParamNames = [
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

      authParamNames.forEach(param => {
        if (searchParams.has(param)) {
          searchParams.delete(param);
        }
        if (hashQueryParams.has(param)) {
          hashQueryParams.delete(param);
        }
      });

      const searchQuery = searchParams.toString();
      const hashQuery = hashQueryParams.toString();
      const hashPrefix = hashRoute ? `#${hashRoute}` : hashQuery ? '#' : '';
      const hashSuffix = hashQuery ? `${hashRoute ? '?' : ''}${hashQuery}` : '';

      return `${parsedUrl.pathname}${
        searchQuery ? `?${searchQuery}` : ''
      }${hashPrefix}${hashSuffix}`;
    } catch (e) {
      console.warn('[Bunny Auth] Failed to sanitize return URL, using raw value');
      return url;
    }
  }

  /**
   * Check if fully authenticated (both API key and storage zone name)
   */
  static isAuthenticated(): boolean {
    const hasKey = !!this.getStoredApiKey();
    const hasZoneName = !!this.getStoredStorageZoneName();
    const isAuth = hasKey && hasZoneName;
    return isAuth;
  }
}
