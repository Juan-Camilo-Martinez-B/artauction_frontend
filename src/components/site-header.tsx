import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AccountMenu } from './account/account-menu';
import { BalanceBadge } from './account/balance-badge';
import { MainNav } from './main-nav';

export async function SiteHeader() {
  const t = await getTranslations('Layout');
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <nav aria-label={t('mainNavigation')} className="relative mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3.5">
        <Link href="/" className="font-serif text-xl tracking-tight">
          ArtAuction
        </Link>
        <div className="flex items-center gap-3 md:gap-6">
          <MainNav />
          <BalanceBadge />
          <AccountMenu />
        </div>
      </nav>
    </header>
  );
}
