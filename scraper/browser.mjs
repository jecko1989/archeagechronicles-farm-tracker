import { chromium } from 'playwright';

export const BASE = 'https://metaforge.app/archeage-chronicles';
export const USER_AGENT = 'archeage-farm-tracker (github.com/jecko1989/archeagechronicles-farm-tracker)';

// Apre Chromium headless e passa a fn una getHtml(url) che restituisce l'HTML renderizzato.
// PW_CHANNEL=msedge usa il Edge installato (utile in locale senza scaricare Chromium).
export async function withBrowser(fn) {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
  try {
    const page = await (await browser.newContext({ userAgent: USER_AGENT })).newPage();
    const getHtml = async (url) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('main h1');
      return page.content();
    };
    return await fn(getHtml);
  } finally {
    await browser.close();
  }
}
