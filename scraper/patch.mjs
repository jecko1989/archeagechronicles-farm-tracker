import * as cheerio from 'cheerio';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// html: pagina "Patch Notes" di MetaForge (le voci hanno un titolo tipo "November 25, 2026 Latest", la più recente per prima).
// Restituisce la data della prima voce come YYYY-MM-DD, oppure null se la pagina non ha il formato atteso.
export function latestPatchDate(html) {
  const $ = cheerio.load(html);
  for (const h of $('h2').get()) {
    const m = /^([A-Za-z]+) (\d{1,2}), (\d{4})\b/.exec($(h).text().replace(/\s+/g, ' ').trim());
    const month = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
    if (month >= 0) return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  return null;
}
