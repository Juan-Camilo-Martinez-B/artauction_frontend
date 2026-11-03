import type { ReactNode } from 'react';

/** Marco comun de entrar y crear cuenta: una tarjeta centrada. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center py-6 md:py-12">
      <div className="w-full max-w-md rounded-panel border border-line bg-surface p-8 shadow-panel">{children}</div>
    </div>
  );
}
