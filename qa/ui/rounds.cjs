const { chromium } = require('playwright');
const binary = require('@sparticuz/chromium').default;
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({
    executablePath: await binary.executablePath(),
    args: binary.args,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  const rounds = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:5178');
  await page.getByText('Referencia personal: 2820 kcal', { exact: false }).waitFor();
  for (let i = 1; i <= 100; i++) {
    const start = Date.now();
    await page.getByRole('button', { name: 'home', exact: true }).click();
    const amount = i % 2 ? 250 : 500;
    await page.getByText(`+${amount} ml`, { exact: true }).click();
    const expected = Math.floor(i / 2) * 750 + (i % 2 ? 250 : 0);
    await page
      .getByText(`${expected.toLocaleString('es-AR')} / 2.500 ml`, { exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Registrar comida', exact: true }).first().click();
    await page.getByRole('button', { name: 'Escribir qué comí', exact: true }).click();
    await page.getByTestId('route').filter({ hasText: '/meal/text' }).waitFor();
    await page.getByRole('button', { name: 'profile', exact: true }).click();
    await page.getByText('Objetivos y peso', { exact: true }).click();
    await page.getByTestId('route').filter({ hasText: '/settings/nutrition' }).waitFor();
    await page.getByRole('button', { name: 'progress', exact: true }).click();
    await page.getByText('Hoy', { exact: true }).click();
    await page.getByText('Mes', { exact: true }).click();
    await page.getByText('Semana', { exact: true }).click();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw Error('Horizontal overflow');
    rounds.push({
      round: i,
      status: 'passed',
      milliseconds: Date.now() - start,
      waterMl: expected,
    });
    if (i % 20 === 0) console.log('PASSED', i);
  }
  await page.screenshot({ path: __dirname + '/progress.png', fullPage: true });
  await page.getByRole('button', { name: 'profile', exact: true }).click();
  await page.screenshot({ path: __dirname + '/profile.png', fullPage: true });
  fs.writeFileSync(
    __dirname + '/results.json',
    JSON.stringify(
      {
        environment:
          'Chromium React Native Web with simulated services; actual source screens; no hardware/billing/auth verification',
        rounds,
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (errors.length) throw Error(errors.join('\n'));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
