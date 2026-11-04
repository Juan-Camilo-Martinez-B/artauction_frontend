import { artApi } from '@/lib/api/client';
import { browserSession } from './browser-session';

/** Saldo disponible y retenido del bolsillo de quien tiene la sesion. */
export interface BalanceSnapshot {
  balance: number;
  held: number;
}

type Listener = (snapshot: BalanceSnapshot | null) => void;

/**
 * Saldo compartido entre el encabezado y las pantallas que lo cambian. Lo pide
 * una sola vez aunque varias partes lo necesiten a la vez, y quien puja,
 * compra o recarga llama a refresh() para que el encabezado no quede atrasado.
 */
class WalletBalance {
  private snapshot: BalanceSnapshot | null = null;
  private readonly listeners = new Set<Listener>();
  private inFlight: Promise<void> | null = null;

  current(): BalanceSnapshot | null {
    return this.snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Vuelve a pedir el saldo; sin sesion lo olvida. */
  refresh(): Promise<void> {
    this.inFlight ??= this.load().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  clear(): void {
    this.publish(null);
  }

  private async load(): Promise<void> {
    const token = await browserSession.accessToken();
    if (!token) {
      this.publish(null);
      return;
    }
    try {
      const wallet = await artApi.wallet(token);
      this.publish({ balance: wallet.balance, held: wallet.held });
    } catch {
      // Un fallo pasajero no borra el ultimo saldo conocido.
    }
  }

  private publish(snapshot: BalanceSnapshot | null): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export const walletBalance = new WalletBalance();
