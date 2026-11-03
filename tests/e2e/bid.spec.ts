import { expect, test } from '@playwright/test';

const auctionId = '11111111-1111-4111-8111-111111111111';

test('envía una oferta y muestra que fue aceptada', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('aa_access', 'token-de-prueba-para-la-sala');
  });
  // La sesion valida el token con /auth/me; sin respuesta lo descarta y la sala
  // trata al visitante como anonimo.
  await page.route('**/auth/me', (route) =>
    route.fulfill({
      json: { userId: '44444444-4444-4444-8444-444444444444', email: 'postor@artauction.test', role: 'USER', displayName: 'Postor', avatarUrl: null },
    }),
  );
  await page.route('**/wallet', (route) => route.fulfill({ json: { balance: 500, held: 0, entries: [] } }));
  await page.route('**/lots/22222222-2222-4222-8222-222222222222', (route) =>
    route.fulfill({
      json: {
        id: '22222222-2222-4222-8222-222222222222',
        sellerId: '55555555-5555-4555-8555-555555555555',
        title: 'Retrato de la costa',
        description: 'Marina al óleo.',
        artistName: 'Elena Vásquez',
        creationYear: 1925,
        visibility: 'PUBLIC',
        materials: 'Óleo sobre lienzo',
        status: 'EN_SUBASTA',
        authenticityScore: 82,
        suggestedPriceMin: null,
        suggestedPriceMax: null,
        currency: 'ATC',
        images: [],
      },
    }),
  );
  await page.route('**/auctions/**', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          auction: {
            id: auctionId,
            lotId: '22222222-2222-4222-8222-222222222222',
            sellerId: '55555555-5555-4555-8555-555555555555',
            startPrice: '100.00',
            currentPrice: '100.00',
            minIncrement: '10.00',
            endsAt: new Date(Date.now() + 120_000).toISOString(),
            status: 'ACTIVA',
            winnerId: null,
            bids: [],
          },
          serverTime: new Date().toISOString(),
        },
      });
      return;
    }
    if (url.endsWith('/bids') && route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { amount: string; idempotencyKey: string };
      expect(body.idempotencyKey.length).toBeGreaterThan(8);
      await route.fulfill({
        json: {
          bidId: '33333333-3333-4333-8333-333333333333',
          auctionId,
          amount: body.amount,
          endsAt: new Date(Date.now() + 90_000).toISOString(),
          extended: false,
          idempotent: false,
          currentPrice: body.amount,
        },
      });
      return;
    }
    await route.continue();
  });

  await page.goto(`/subasta/${auctionId}`);
  await expect(page.getByRole('heading', { name: 'Retrato de la costa' })).toBeVisible();
  // Sin pujas, la oferta minima es la salida.
  await expect(page.getByText('Mínimo 100 artacoins.')).toBeVisible();
  // Las ofertas son en artacoins enteras.
  await page.getByLabel('Tu oferta en artacoins').fill('120');
  await page.getByRole('button', { name: /^Ofertar/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Oferta aceptada' })).toBeVisible();
  // El precio de la sala y el historial muestran la oferta nueva.
  await expect(page.getByText('Oferta más alta')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Tú' })).toContainText('120 artacoins');
});
