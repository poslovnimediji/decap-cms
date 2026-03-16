import { GitHubBackend } from 'decap-cms-backend-github';
import { type Config, type User, type Credentials, filterByExtension } from 'decap-cms-lib-util';
import React from 'react';

import { SupabaseClient } from './supabase';
import SupabaseAuthenticationPage from './AuthenticationPage';
import { resolveCommitAuthorFromSupabaseUser } from './commitAuthor';

import type { GitHubUser } from 'decap-cms-backend-github/src/implementation';

interface SupabaseUser extends User {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user_name?: string;
  user_email?: string;
  email?: string;
  user_metadata?: {
    display_name?: string;
    full_name?: string;
    name?: string;
  };
}

export default class DecapTurboBackend extends GitHubBackend {
  supabaseAccessToken: string | null = null;
  supabaseRefreshToken: string | null = null;
  supabaseExpiresAt: number | null = null;
  supabaseAnonKey: string;
  supabaseId: string;
  siteId: string;
  commitAuthorEmailFallback?: string;
  updateUserCredentials: (credentials: Credentials) => void;
  refreshedTokenPromise?: Promise<string>;

  supabase: SupabaseClient;

  constructor(config: Config, options: any = {}) {
    super(config, options);
    this.supabaseAnonKey = (config.backend.anon_key || config.backend.app_id || '') as string;
    this.supabaseId = (config.backend.app_id || '') as string;
    this.siteId = (config.backend.site_id || '') as string;
    this.commitAuthorEmailFallback =
      ((config.backend as Record<string, unknown>).commit_author_email as string | undefined) ||
      ((config.backend as Record<string, unknown>).noreply_email as string | undefined);

    this.updateUserCredentials = options.updateUserCredentials || (() => {});

    this.bypassWriteAccessCheckForAppTokens = true;
    this.tokenKeyword = 'Bearer';

    this.supabase = new SupabaseClient(
      `https://${this.supabaseId}.supabase.co/rest/v1/data`,
      this.supabaseAnonKey,
      this.branch,
      this.originRepo,
      this.siteId,
    );
  }

  async status() {
    // Check Supabase authentication status
    let auth = false;

    if (this.supabaseAccessToken) {
      // Try to verify the token is still valid by checking if we can get user info
      try {
        const now = Math.floor(Date.now() / 1000);
        const tokenExpired = this.supabaseExpiresAt && this.supabaseExpiresAt <= now;

        if (tokenExpired && this.supabaseRefreshToken) {
          // Try to refresh if expired
          await this.getRefreshedAccessToken();
          auth = true;
        } else if (!tokenExpired) {
          auth = true;
        }
      } catch (e) {
        console.warn('Failed checking Supabase auth status', e);
        auth = false;
      }
    }

    // Get parent GitHub API status
    const parentStatus = await super.status();

    return {
      auth: { status: auth },
      api: parentStatus.api,
    };
  }

  authComponent() {
    const wrappedAuthenticationPage = (props: Record<string, unknown>) => {
      const allProps = { ...props, backend: this };
      return <SupabaseAuthenticationPage {...allProps} />;
    };
    wrappedAuthenticationPage.displayName = 'AuthenticationPage';
    return wrappedAuthenticationPage;
  }

  restoreUser(user: User) {
    const supabaseUser = user as SupabaseUser;
    if (supabaseUser.access_token) {
      this.supabaseAccessToken = supabaseUser.access_token;
    }
    if (supabaseUser.refresh_token) {
      this.supabaseRefreshToken = supabaseUser.refresh_token;
    }
    if (supabaseUser.expires_at) {
      this.supabaseExpiresAt = supabaseUser.expires_at;
    }
    return this.authenticate(user);
  }

  async authenticate(state: Credentials) {
    if ('access_token' in state) {
      this.supabaseAccessToken = state.access_token as string;
    }
    if ('refresh_token' in state) {
      this.supabaseRefreshToken = state.refresh_token as string;
    }
    if ('expires_at' in state) {
      this.supabaseExpiresAt = state.expires_at as number;
    }

    const user = await super.authenticate(state);

    this.api!.commitAuthor = resolveCommitAuthorFromSupabaseUser(
      state as SupabaseUser,
      this.commitAuthorEmailFallback,
    );

    // Include access_token in the returned user object so it gets stored in auth store
    return {
      ...user,
      ...('access_token' in state && { access_token: state.access_token }),
      ...('refresh_token' in state && { refresh_token: state.refresh_token }),
      ...('expires_at' in state && { expires_at: state.expires_at }),
      ...('user_name' in state && { user_name: (state as SupabaseUser).user_name }),
      ...('user_email' in state && { user_email: (state as SupabaseUser).user_email }),
      ...('email' in state && { email: (state as SupabaseUser).email }),
      ...('user_metadata' in state && { user_metadata: (state as SupabaseUser).user_metadata }),
    };
  }

  async getRefreshedAccessToken(): Promise<string> {
    if (this.refreshedTokenPromise) {
      return this.refreshedTokenPromise;
    }

    if (!this.supabaseRefreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshedTokenPromise = fetch(
      `https://${this.supabaseId}.supabase.co/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.supabaseAnonKey,
        },
        body: JSON.stringify({
          refresh_token: this.supabaseRefreshToken,
        }),
      },
    ).then(async (res: Response) => {
      if (!res.ok) {
        this.refreshedTokenPromise = undefined;
        throw new Error('Failed to refresh Supabase token');
      }

      const data = await res.json();
      this.supabaseAccessToken = data.access_token;
      this.supabaseRefreshToken = data.refresh_token;
      this.supabaseExpiresAt = data.expires_at;
      this.refreshedTokenPromise = undefined;

      // Update stored credentials
      this.updateUserCredentials({
        token: this.token!,
        refresh_token: data.refresh_token,
        access_token: data.access_token,
        expires_at: data.expires_at,
      } as any);

      return data.access_token;
    });

    return this.refreshedTokenPromise;
  }

  async currentUser({ token }: { token: string }): Promise<GitHubUser> {
    if (!this._currentUserPromise) {
      this._currentUserPromise = (async () => {
        // Check if token needs refresh (5 minute buffer)
        const now = Math.floor(Date.now() / 1000);
        if (this.supabaseExpiresAt && this.supabaseExpiresAt - now < 300) {
          try {
            await this.getRefreshedAccessToken();
          } catch (error) {
            console.error('Failed to refresh token:', error);
            this.logout();
            throw new Error('Session expired. Please log in again.');
          }
        }

        // Return mocked GitHub user
        const owner = this.originRepo.split('/')[0];

        return {
          name: owner,
          login: owner,
          avatar_url: `https://github.com/${owner}.png`,
          token,
          access_token: this.supabaseAccessToken || undefined,
          refresh_token: this.supabaseRefreshToken || undefined,
          expires_at: this.supabaseExpiresAt || undefined,
        } as any as GitHubUser;
      })() as any;
    }
    return this._currentUserPromise!;
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
