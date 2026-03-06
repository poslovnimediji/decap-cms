import { BunnyManagementApi } from '../api/managementApi';

describe('BunnyManagementApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it('fetches storage zone password by zone name', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { Id: 1, Name: 'Zone-A', Password: 'pass-a', Region: 'DE' },
        { Id: 2, Name: 'My-Zone', Password: 'zone-password', Region: 'UK' },
      ],
    });

    const password = await BunnyManagementApi.fetchStorageZonePassword('account-key', 'my-zone');

    expect(password).toBe('zone-password');
    expect(global.fetch).toHaveBeenCalledWith('https://api.bunny.net/storagezone', {
      method: 'GET',
      headers: {
        AccessKey: 'account-key',
        'Content-Type': 'application/json',
      },
    });
  });

  it('throws a helpful error when storage zone is not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ Id: 1, Name: 'Other-Zone', Password: 'pass-a', Region: 'DE' }],
    });

    await expect(
      BunnyManagementApi.fetchStorageZonePassword('account-key', 'missing-zone'),
    ).rejects.toThrow('Storage zone "missing-zone" not found. Available zones: Other-Zone');
  });

  it('throws API error when listing zones fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(BunnyManagementApi.fetchStorageZonePassword('bad-key', 'zone')).rejects.toThrow(
      'Failed to fetch storage zones: 401 - Unauthorized',
    );
  });

  it('fetches a storage zone by id', async () => {
    const zone = { Id: 7, Name: 'Zone-7', Password: 'zone-7-pass', Region: 'DE' };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => zone,
    });

    const result = await BunnyManagementApi.fetchStorageZoneById('account-key', 7);

    expect(result).toEqual(zone);
    expect(global.fetch).toHaveBeenCalledWith('https://api.bunny.net/storagezone/7', {
      method: 'GET',
      headers: {
        AccessKey: 'account-key',
        'Content-Type': 'application/json',
      },
    });
  });

  it('throws API error when fetching zone by id fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not found',
    });

    await expect(BunnyManagementApi.fetchStorageZoneById('account-key', 42)).rejects.toThrow(
      'Failed to fetch storage zone: 404 - Not found',
    );
  });
});
