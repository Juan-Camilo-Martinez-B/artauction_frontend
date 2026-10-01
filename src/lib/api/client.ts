import type {
  ActivityItem,
  AuctionView,
  AuthUser,
  GalleryItem,
  Lot,
  NotificationItem,
  PlacedBid,
  SignedUpload,
  TokenPair,
} from './types';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function publicApiUrl(): string {
  return process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
}

export function publicWsUrl(): string {
  return process.env['NEXT_PUBLIC_WS_URL'] ?? publicApiUrl();
}

export async function api<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  if (init.token) {
    headers.set('authorization', `Bearer ${init.token}`);
  }
  const response = await fetch(`${publicApiUrl()}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const body: unknown = JSON.parse(text);
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = body.message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message)) {
        return message.filter((item) => typeof item === 'string').join(' ');
      }
    }
  } catch {
    return text || 'No se pudo completar la solicitud';
  }
  return text || 'No se pudo completar la solicitud';
}

export const artApi = {
  register(input: { email: string; password: string; displayName: string; role?: 'USER' | 'SELLER' }) {
    return api<AuthUser>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
  },
  login(email: string, password: string) {
    return api<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  refresh(refreshToken: string) {
    return api<TokenPair>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  },
  me(token: string) {
    return api<AuthUser>('/auth/me', { token });
  },
  lots() {
    return api<Lot[]>('/lots');
  },
  lot(id: string, token?: string | null) {
    return api<Lot>(`/lots/${id}`, { token });
  },
  createLot(
    token: string,
    input: { title: string; description: string; materials: string; artistName?: string; creationYear?: number },
  ) {
    return api<Lot>('/lots', { method: 'POST', token, body: JSON.stringify(input) });
  },
  signUpload(token: string, lotId: string, contentType: string, position: number) {
    return api<SignedUpload>(`/lots/${lotId}/uploads`, {
      method: 'POST',
      token,
      body: JSON.stringify({ contentType, position }),
    });
  },
  registerImage(token: string, lotId: string, input: { objectKey: string; position: number; perceptualHash?: string }) {
    return api<Lot>(`/lots/${lotId}/images`, { method: 'POST', token, body: JSON.stringify(input) });
  },
  submitLot(token: string, lotId: string) {
    return api<{ status: string }>(`/lots/${lotId}/submit`, { method: 'POST', token });
  },
  auction(id: string) {
    return api<AuctionView>(`/auctions/${id}`);
  },
  openAuction(
    token: string,
    input: { lotId: string; startPrice: string; minIncrement: string; startsAt: string; endsAt: string },
  ) {
    return api<AuctionView['auction']>('/auctions', { method: 'POST', token, body: JSON.stringify(input) });
  },
  placeBid(token: string, auctionId: string, amount: string, idempotencyKey: string) {
    return api<PlacedBid>(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      token,
      body: JSON.stringify({ amount, idempotencyKey }),
    });
  },
  gallery(ownerId: string, token?: string | null) {
    return api<GalleryItem[]>(`/galleries/${ownerId}`, { token });
  },
  follow(token: string, userId: string) {
    return api<{ status: string }>(`/users/${userId}/follow`, { method: 'POST', token });
  },
  feed(token: string) {
    return api<ActivityItem[]>('/feed', { token });
  },
  notifications(token: string) {
    return api<NotificationItem[]>('/notifications', { token });
  },
  resolveLot(token: string, lotId: string, verdict: 'APROBADO' | 'BORRADOR') {
    return api<Lot>(`/admin/lots/${lotId}/resolve`, { method: 'POST', token, body: JSON.stringify({ verdict }) });
  },
};
