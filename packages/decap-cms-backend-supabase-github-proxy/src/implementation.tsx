import * as React from 'react';
import { GitHubBackend } from 'decap-cms-backend-github';
import {
  type Config,
  type User,
  type Credentials,
  filterByExtension,
  entriesByFolder,
  type Cursor,
  CURSOR_COMPATIBILITY_SYMBOL,
} from 'decap-cms-lib-util';
import { API_NAME } from 'decap-cms-backend-github/src/API';
import { path } from 'lodash/fp';

import { SupabaseClient } from './supabase';

export default class SupabaseGitHubProxyBackend extends GitHubBackend {
  supabaseAnonKey: string;
  supabaseId: string;
  siteId: string;

  supabase: SupabaseClient;

  constructor(config: Config, options = {}) {
    super(config, options);
    this.supabaseAnonKey = (config.backend.anon_key || config.backend.app_id || '') as string;
    this.supabaseId = (config.backend.app_id || '') as string;
    this.siteId = (config.backend.site_id || '') as string;

    this.supabase = new SupabaseClient(
      `https://${this.supabaseId}.supabase.co/rest/v1/data`,
      this.supabaseAnonKey,
      this.branch,
      this.originRepo,
      this.siteId,
    );
  }

  async allEntriesByFolder(
    folder: string,
    extension: string,
    depth: number,
    pathRegex?: RegExp,
    searchTerm?: string,
  ) {
    const repoURL = this.api!.originRepoURL;
    const collection = `${folder}:${extension}:${depth}:${pathRegex?.toString() || 'all'}`;

    const files = (
      await this.api!.listFiles(folder, {
        repoURL,
        depth,
      })
    ).filter(
      file => (!pathRegex || pathRegex.test(file.path)) && filterByExtension(file, extension),
    );

    const readFile = (path: string, id: string | null | undefined) =>
      this.api!.readFile(path, id, { repoURL }) as Promise<string>;

    await this.supabase.validateFiles(
      collection,
      files,
      readFile,
      this.api!.readFileMetadata.bind(this.api),
    );

    const entries = await this.supabase.fetchEntries(collection, searchTerm);
    const fileIdToIndex = new Map(files.map((file, index) => [file.id, index]));
    entries.sort((a, b) => {
      const indexA = fileIdToIndex.get(a.file.id) ?? Number.MAX_SAFE_INTEGER;
      const indexB = fileIdToIndex.get(b.file.id) ?? Number.MAX_SAFE_INTEGER;
      return indexA - indexB;
    });

    return entries;
  }
}
