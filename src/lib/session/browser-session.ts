import { artApi } from '@/lib/api/client';
import type { AuthUser, TokenPair } from '@/lib/api/types';
import { clearAccessToken, readAccessToken, writeAccessToken } from '@/lib/session';

export interface AccountProfile {
  userId: string;
  email: string;
  role: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface SessionSnapshot {
  status: 'unknown' | 'anonymous' | 'authenticated';
  profile: AccountProfile | null;
}

type Listener = (snapshot: SessionSnapshot) => void;

class BrowserSession {
  private snapshot: SessionSnapshot = { status: 'unknown', profile: null };
  private readonly listeners = new Set<Listener>();
  private pending: Promise<void> | null = null;

  current(): SessionSnapshot {
    return this.snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async accessToken(): Promise<string | null> {
    await this.restore();
    return readAccessToken();
  }

  restore(): Promise<void> {
    if (this.snapshot.status === 'authenticated' && readAccessToken()) {
      return Promise.resolve();
    }
    this.pending ??= this.resolve().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  async establish(tokens: TokenPair): Promise<void> {
    await fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    writeAccessToken(tokens.accessToken);
    await this.loadProfile(tokens.accessToken);
  }

  replace(profile: AccountProfile): void {
    this.publish({ status: 'authenticated', profile });
  }

  async signOut(): Promise<void> {
    clearAccessToken();
    await fetch('/api/session', { method: 'DELETE' });
    this.publish({ status: 'anonymous', profile: null });
  }

  private async resolve(): Promise<void> {
    const existing = readAccessToken();
    if (existing) {
      await this.loadProfile(existing);
      return;
    }
    const response = await fetch('/api/session/refresh', { method: 'POST' });
    if (!response.ok) {
      if (!readAccessToken()) {
        this.publish({ status: 'anonymous', profile: null });
      }
      return;
    }
    const body: unknown = await response.json();
    const accessToken = typeof body === 'object' && body !== null && 'accessToken' in body ? body.accessToken : null;
    if (typeof accessToken !== 'string') {
      this.publish({ status: 'anonymous', profile: null });
      return;
    }
    writeAccessToken(accessToken);
    await this.loadProfile(accessToken);
  }

  private async loadProfile(token: string): Promise<void> {
    try {
      const profile = toProfile(await artApi.me(token));
      this.publish({ status: 'authenticated', profile });
    } catch {
      clearAccessToken();
      this.publish({ status: 'anonymous', profile: null });
    }
  }

  private publish(snapshot: SessionSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

function toProfile(user: AuthUser): AccountProfile {
  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    displayName: user.displayName?.trim() || user.email,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export const browserSession = new BrowserSession();
