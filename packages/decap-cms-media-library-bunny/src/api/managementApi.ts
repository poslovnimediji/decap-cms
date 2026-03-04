/**
 * Bunny.net Management API Client
 * Used to fetch storage zone details including passwords
 */

const BUNNY_API_BASE = 'https://api.bunny.net';

interface StorageZone {
  Id: number;
  Name: string;
  Password: string;
  ReadOnlyPassword: string;
  Region: string;
  ReplicationZones: string[];
  // ... other fields
}

export class BunnyManagementApi {
  /**
   * Fetch storage zone password using Account API Key
   * @param accountApiKey - The account-level API key from OAuth
   * @param storageZoneName - Name of the storage zone
   * @returns Storage zone password for Storage API
   */
  static async fetchStorageZonePassword(
    accountApiKey: string,
    storageZoneName: string,
  ): Promise<string> {
    try {
      // First, list all storage zones to find the one we need
      const listUrl = `${BUNNY_API_BASE}/storagezone`;

      const response = await fetch(listUrl, {
        method: 'GET',
        headers: {
          AccessKey: accountApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Bunny Management API] Error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
        });
        throw new Error(
          `Failed to fetch storage zones: ${response.status} - ${errorBody}`,
        );
      }

      const storageZones: StorageZone[] = await response.json();

      // Find the storage zone by name
      const targetZone = storageZones.find(
        zone => zone.Name.toLowerCase() === storageZoneName.toLowerCase(),
      );

      if (!targetZone) {
        console.error('[Bunny Management API] Storage zone not found:', storageZoneName);
        console.error('[Bunny Management API] Available zones:', storageZones.map(z => z.Name));
        throw new Error(
          `Storage zone "${storageZoneName}" not found. Available zones: ${storageZones.map(z => z.Name).join(', ')}`,
        );
      }

      if (!targetZone.Password) {
        throw new Error(`Storage zone "${storageZoneName}" has no password set`);
      }

      return targetZone.Password;
    } catch (error) {
      console.error('[Bunny Management API] Failed to fetch storage zone password:', error);
      throw error;
    }
  }

  /**
   * Fetch storage zone details by ID
   */
  static async fetchStorageZoneById(
    accountApiKey: string,
    storageZoneId: number,
  ): Promise<StorageZone> {
    const url = `${BUNNY_API_BASE}/storagezone/${storageZoneId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        AccessKey: accountApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to fetch storage zone: ${response.status} - ${errorBody}`);
    }

    return response.json();
  }
}
