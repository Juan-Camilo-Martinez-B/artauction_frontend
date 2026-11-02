'use client';

import { Component, type ReactNode } from 'react';

/**
 * Aisla una pieza de la escena: si su textura no carga (red, CORS), se muestra
 * `fallback` en su lugar y el resto de la sala sigue funcionando.
 */
export class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
