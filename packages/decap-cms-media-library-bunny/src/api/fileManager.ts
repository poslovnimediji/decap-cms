/**
 * File Manager for Bunny.net
 * Provides high-level operations for file management
 */

import { BunnyClient } from './client';

import type { BunnyFile, AddressedMediaFile } from '../types';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'];

export interface FileManagerOptions {
  edgeBaseUrl: string;
  getAccessToken: () => Promise<string | null>;
  getActiveSiteId: () => Promise<string | null>;
  cdnUrlPrefix: string;
}

export class BunnyFileManager {
  private client: BunnyClient;
  private cdnUrlPrefix: string;

  constructor({ edgeBaseUrl, getAccessToken, getActiveSiteId, cdnUrlPrefix }: FileManagerOptions) {
    this.client = new BunnyClient({ edgeBaseUrl, getAccessToken, getActiveSiteId });
    this.cdnUrlPrefix = cdnUrlPrefix;
  }

  /**
   * List files and directories in a given path
   */
  async listFiles(path = '/'): Promise<BunnyFile[]> {
    try {
      const files = await this.client.listFiles(path);
      return files;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Filter files to only include images
   */
  filterImageFiles(files: BunnyFile[]): BunnyFile[] {
    return files.filter(file => {
      if (file.IsDirectory) return false;
      const ext = file.ObjectName.split('.').pop()?.toLowerCase();
      return ext && IMAGE_EXTENSIONS.includes(ext);
    });
  }

  /**
   * Get files with public URLs
   */
  async getFilesWithUrls(path = '/', imagesOnly = false): Promise<AddressedMediaFile[]> {
    const files = await this.listFiles(path);
    const filtered = imagesOnly ? this.filterImageFiles(files) : files;

    return filtered.map(file => ({
      ...file,
      publicUrl: this.client.generatePublicUrl(
        this.cdnUrlPrefix,
        `${path === '/' ? '' : path}/${file.ObjectName}`.replace(/\/+/g, '/'),
      ),
    }));
  }

  /**
   * Upload a file to a specific path
   */
  async uploadFile(filePath: string, file: Blob, fileName: string): Promise<string> {
    try {
      const fullPath = `${filePath}/${fileName}`.replace(/\/+/g, '/');
      await this.client.uploadFile(fullPath, file);
      return this.client.generatePublicUrl(this.cdnUrlPrefix, fullPath);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Delete a file inside `path`.
   *
   * Takes the directory and the object name separately, and joins them with
   * exactly the same expression `uploadFile` uses, deliberately: the storage
   * API addresses objects relative to the storage zone, but the LIST response
   * reports each entry's `Path` as zone-QUALIFIED (`/cmt-sites/`). Callers
   * that built a delete target out of the listing therefore sent
   * `/cmt-sites/photo.jpg`, the adapter prefixed the zone a second time, and
   * every delete came back `404 Object Not Found` — silently, since the widget
   * only surfaced it as an error banner and never removed the tile.
   *
   * Keeping the join here means upload and delete cannot disagree about it
   * again; a caller passes a directory and a name, never a pre-built path.
   */
  async deleteFile(path: string, fileName: string): Promise<void> {
    const fullPath = `${path}/${fileName}`.replace(/\/+/g, '/');
    try {
      await this.client.deleteFile(fullPath);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get parent directory path
   */
  getParentPath(currentPath: string): string {
    if (currentPath === '/') return '/';
    const parts = currentPath.split('/').filter(p => p);
    parts.pop();
    return parts.length === 0 ? '/' : `/${parts.join('/')}/`;
  }

  /**
   * Normalize a path
   */
  normalizePath(path: string): string {
    if (!path || path === '') return '/';
    if (!path.startsWith('/')) path = '/' + path;
    if (path !== '/' && !path.endsWith('/')) path = path + '/';
    return path.replace(/\/+/g, '/');
  }
}
