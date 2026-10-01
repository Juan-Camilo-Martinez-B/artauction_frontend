import { expect, test } from '@playwright/test';

const auctionId = '11111111-1111-4111-8111-111111111111';

test('envía una puja y muestra que fue aceptada', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('aa_access', 'token-de-prueba-para-la-sala');
  });
  await page.route('**/auctions/**', async (route) => {
    const url = route.request().url();
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: {
          auction: {
            id: auctionId,
            lotId: '22222222-2222-4222-8222-222222222222',
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
  await expect(page.getByRole('heading', { name: 'La puja' })).toBeVisible();
  await page.getByLabel('Tu puja').fill('120.00');
  await page.getByRole('button', { name: 'Pujar' }).click();
  await expect(page.getByRole('status')).toContainText('Puja aceptada');
  await expect(page.getByText(/120/)).toBeVisible();
});
