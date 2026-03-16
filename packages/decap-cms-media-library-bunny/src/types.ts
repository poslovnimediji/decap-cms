/**
 * Bunny.net Storage API Types
 */

export interface BunnyFile {
  Guid: string;
  StorageZoneName: string;
  Path: string;
  ObjectName: string;
  Length: number;
  LastChanged: string;
  IsDirectory: boolean;
  DateCreated: string;
  StorageZoneId: number;
}

export interface BunnyListResponse {
  files: BunnyFile[];
}

export interface BunnyConfig {
  cdn_url_prefix: string;
  root_path?: string;
}

export interface MediaLibraryContext {
  backendName?: string;
  backendConfig?: Record<string, unknown>;
  authUser?: Record<string, unknown>;
  token?: string;
  activeSiteId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  apiKey: string | null;
  error: string | null;
}

export interface BunnyIntegrationOptions {
  config: BunnyConfig;
  images_only?: boolean;
}

export interface BunnyInitOptions {
  options?: BunnyIntegrationOptions & Record<string, unknown>;
  handleInsert?: (value: string | string[]) => void;
  getMediaLibraryContext?: () => Promise<MediaLibraryContext>;
}

export interface MediaLibraryInstance {
  show: (args?: {
    id?: string;
    value?: string | string[];
    config?: Record<string, unknown>;
    allowMultiple?: boolean;
    imagesOnly?: boolean;
  }) => void;
  hide: () => void;
  onClearControl?: (args: { id: string }) => void;
  onRemoveControl?: (args: { id: string }) => void;
  enableStandalone: () => boolean;
}

export interface BunnyMediaLibrary {
  name: 'bunny';
  init: (options: BunnyInitOptions) => Promise<MediaLibraryInstance>;
}

export interface AddressedMediaFile extends BunnyFile {
  publicUrl: string;
}
