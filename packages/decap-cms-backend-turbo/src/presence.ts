import { RealtimeClient } from '@supabase/realtime-js';

import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/realtime-js';
import type { PresenceEditor } from 'decap-cms-lib-util';

type TrackedPresence = {
  user_id: string;
  name: string;
  joined_at: string;
};

function entryTopic(siteId: string, collection: string, slug: string) {
  return `presence:${siteId}:${collection}:${slug}`;
}

/**
 * Thin wrapper around a single Supabase Realtime connection, scoped to one
 * DecapTurboBackend instance. Presence channels are joined lazily (one per
 * open entry) and left again when the editor unmounts or a new entry is
 * subscribed to — mirroring the GitHub backend's one-entry-at-a-time notes
 * polling manager.
 */
export class PresenceClient {
  private client: RealtimeClient | null = null;
  private channels = new Map<string, RealtimeChannel>();

  constructor(
    private baseUrl: string,
    private supabaseAnonKey: string,
    private siteId: string,
    private userId: string,
    private userName: string,
  ) {}

  setAccessToken(token: string | null) {
    this.client?.setAuth(token);
  }

  private getClient(): RealtimeClient {
    if (!this.client) {
      const wsUrl = `${this.baseUrl.replace(/^http/, 'ws')}/realtime/v1`;
      this.client = new RealtimeClient(wsUrl, {
        params: { apikey: this.supabaseAnonKey },
      });
    }
    return this.client;
  }

  private buildEmitter(channel: RealtimeChannel, onUpdate: (editors: PresenceEditor[]) => void) {
    return () => {
      const state = channel.presenceState<TrackedPresence>();
      const editors: PresenceEditor[] = Object.entries(state)
        .filter(([id]) => id !== this.userId)
        .map(([id, entries]) => {
          const latest = entries[0];
          return {
            id,
            name: latest?.name || 'A collaborator',
            joinedAt: latest?.joined_at || new Date(0).toISOString(),
          };
        });
      onUpdate(editors);
    };
  }

  async subscribe(
    collection: string,
    slug: string,
    onUpdate: (editors: PresenceEditor[]) => void,
  ): Promise<void> {
    const key = entryTopic(this.siteId, collection, slug);
    if (this.channels.has(key)) {
      return;
    }

    const client = this.getClient();
    const channel = client.channel(key, {
      config: { presence: { key: this.userId } },
    });

    const emitPresence = this.buildEmitter(channel, onUpdate);
    channel.on('presence', { event: 'sync' }, emitPresence);

    channel.subscribe(async (status: `${REALTIME_SUBSCRIBE_STATES}`) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: this.userId,
          name: this.userName,
          joined_at: new Date().toISOString(),
        } as TrackedPresence);
      }
    });

    this.channels.set(key, channel);
  }

  async unsubscribe(collection: string, slug: string): Promise<void> {
    const key = entryTopic(this.siteId, collection, slug);
    const channel = this.channels.get(key);
    if (!channel) {
      return;
    }
    this.channels.delete(key);
    await channel.untrack();
    await this.client?.removeChannel(channel);
  }

  async disconnect(): Promise<void> {
    await this.client?.removeAllChannels();
    this.client?.disconnect();
    this.client = null;
    this.channels.clear();
  }
}
