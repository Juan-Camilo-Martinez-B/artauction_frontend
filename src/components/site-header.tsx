import Link from 'next/link';
import { AccountMenu } from './account/account-menu';
import { MainNav } from './main-nav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <nav aria-label="Principal" className="relative mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3.5">
        <Link href="/" className="font-serif text-xl tracking-tight">
          ArtAuction
        </Link>
        <div className="flex items-center gap-3 md:gap-6">
          <MainNav />
          <AccountMenu />
        </div>
      </nav>
    </header>
  );
}
