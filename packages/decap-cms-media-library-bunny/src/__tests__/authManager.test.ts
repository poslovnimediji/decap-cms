import { BunnyAuthManager } from '../api/authManager';

describe('BunnyAuthManager', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    jest.restoreAllMocks();
  });

  it('stores and retrieves storage credentials', () => {
    BunnyAuthManager.setStoredApiKey('storage-password');
    BunnyAuthManager.setStoredStorageZoneName('my-zone');

    expect(BunnyAuthManager.getStoredApiKey()).toBe('storage-password');
    expect(BunnyAuthManager.getStoredStorageZoneName()).toBe('my-zone');
    expect(BunnyAuthManager.isAuthenticated()).toBe(true);
  });

  it('clears all stored credentials', () => {
    BunnyAuthManager.setStoredApiKey('storage-password');
    BunnyAuthManager.setStoredAccountApiKey('account-key');
    BunnyAuthManager.setStoredStorageZoneName('my-zone');

    BunnyAuthManager.clearStoredApiKey();

    expect(BunnyAuthManager.getStoredApiKey()).toBeNull();
    expect(BunnyAuthManager.getStoredAccountApiKey()).toBeNull();
    expect(BunnyAuthManager.getStoredStorageZoneName()).toBeNull();
  });

  it('extracts credentials from search params', () => {
    window.history.replaceState({}, '', '/admin/?accessKey=test-key&storageName=test-zone');

    expect(BunnyAuthManager.extractCredentialsFromUrl()).toEqual({
      apiKey: 'test-key',
      storageName: 'test-zone',
    });
  });

  it('extracts credentials from hash query params', () => {
    window.history.replaceState(
      {},
      '',
      '/admin/#/collections/posts/new?api_key=hash-key&storage_zone_name=hash-zone',
    );

    expect(BunnyAuthManager.extractCredentialsFromUrl()).toEqual({
      apiKey: 'hash-key',
      storageName: 'hash-zone',
    });
  });

  it('sanitizes auth params while preserving route and other params', () => {
    const sanitized = BunnyAuthManager.sanitizeReturnUrl(
      'http://localhost:8080/admin/?foo=1&accessKey=secret#/collections/posts/new?storageName=zone&bar=2',
    );

    expect(sanitized).toBe('/admin/?foo=1#/collections/posts/new?bar=2');
  });

  it('cleans auth params from current URL', () => {
    const replaceSpy = jest.spyOn(window.history, 'replaceState');
    window.history.replaceState(
      {},
      '',
      '/admin/?apiKey=secret&keep=1#/collections/posts/new?storage_name=zone&ok=2',
    );

    BunnyAuthManager.cleanAuthParamsFromUrl();

    expect(replaceSpy).toHaveBeenCalledWith({}, '', '/admin/?keep=1#/collections/posts/new?ok=2');
  });

  it('stores and clears auto-open flag', () => {
    expect(BunnyAuthManager.shouldAutoOpen()).toBe(false);

    BunnyAuthManager.setAutoOpenFlag();
    expect(BunnyAuthManager.shouldAutoOpen()).toBe(true);

    BunnyAuthManager.clearAutoOpenFlag();
    expect(BunnyAuthManager.shouldAutoOpen()).toBe(false);
  });

  it('saves and resolves sanitized return URL', () => {
    BunnyAuthManager.saveReturnUrl(
      'http://localhost:8080/admin/?x=1&token=secret#/collections/posts/new?storageZoneName=zone&y=2',
    );

    expect(BunnyAuthManager.resolveReturnUrl()).toBe('/admin/?x=1#/collections/posts/new?y=2');

    BunnyAuthManager.clearReturnUrl();
    expect(BunnyAuthManager.resolveReturnUrl()).toBeNull();
  });
});
