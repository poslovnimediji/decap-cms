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
  storage_zone_name: string;
  api_key: string;
  cdn_url_prefix: string;
  root_path?: string;
}

export interface BunnyIntegrationOptions {
  config: BunnyConfig;
  images_only?: boolean;
}

export interface BunnyInitOptions {
  options?: BunnyIntegrationOptions & Record<string, any>;
  handleInsert?: (value: string | string[]) => void;
}

export interface MediaLibraryInstance {
  show: (args?: {
    id?: string;
    value?: string | string[];
    config?: Record<string, any>;
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
