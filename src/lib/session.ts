const ACCESS = 'aa_access';

export interface SessionUser {
  userId: string;
  email: string;
  role: string;
  accessToken: string;
}

export function readAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(ACCESS);
}

export function writeAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS, token);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS);
}
