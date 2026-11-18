import * as cheerio from 'cheerio';
import { BASE } from './browser.mjs';
import { parseItemPage } from './parse.mjs';

export const CATEGORIES = ['weapons', 'armor', 'accessories', 'bags', 'gliders', 'consumables', 'materials', 'tools'];

// Slug unici degli oggetti elencati in una pagina di categoria (esclude paginazione e altre categorie).
export function listItemLinks(html, category) {
  const $ = cheerio.load(html);
  const prefix = `/archeage-chronicles/database/${category}/`;
  const slugs = [];
  $('main a[href]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href.startsWith(prefix)) return;
    const slug = href.slice(prefix.length);
    if (!slug || /[/?#]/.test(slug)) return;
    if (!slugs.includes(slug)) slugs.push(slug);
  });
  return slugs;
}

// {slug: nome file dell'icona} per gli oggetti di una pagina di categoria (l'<img> sta nel primo link della riga).
export function listItemIcons(html, category) {
  const $ = cheerio.load(html);
  const prefix = `/archeage-chronicles/database/${category}/`;
  const icons = {};
  $('main a[href]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href.startsWith(prefix)) return;
    const slug = href.slice(prefix.length);
    const src = $(a).find('img[src*="/icons/"]').first().attr('src');
    if (slug && !/[/?#]/.test(slug) && src) icons[slug] = src.split('/').pop();
  });
  return icons;
}

// Numero di pagina più alto presente nella paginazione.
export function maxPage(html) {
  const $ = cheerio.load(html);
  let max = 1;
  $('main a[href*="/page/"]').each((_, a) => {
    const m = $(a).attr('href').match(/\/page\/(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max;
}

// Percorre le categorie, apre ogni oggetto e segue gli ingredienti non ancora noti.
// ponytail: l'id è lo slug; due categorie con lo stesso slug si sovrascrivono (vince la prima).
export async function crawlAll(getHtml, opts = {}) {
  const delayMs = opts.delayMs ?? 1000;
  const log = opts.log ?? (() => {});
  const categories = opts.categories ?? CATEGORIES;
  let fetched = 0;
  const fetchPage = async (url) => {
    let html;
    try { html = await getHtml(url); } catch (e) { html = await getHtml(url); } // un solo nuovo tentativo
    await new Promise((r) => setTimeout(r, delayMs));
    if (++fetched % 25 === 0) log(`${fetched} pagine…`);
    return html;
  };

  const queue = [];
  const icons = {};
  for (const category of categories) {
    const seen = new Set();
    let page = 1;
    let max = 1;
    while (page <= max) {
      const html = await fetchPage(`${BASE}/database/${category}/page/${page}`);
      const fresh = listItemLinks(html, category).filter((s) => !seen.has(s));
      if (!fresh.length) break; // pagina vuota o ripetuta: stop (evita loop su redirect)
      fresh.forEach((s) => { seen.add(s); queue.push({ id: s, category }); });
      Object.assign(icons, listItemIcons(html, category));
      max = Math.max(max, maxPage(html));
      page++;
    }
    log(`${category}: ${seen.size} oggetti`);
  }

  const items = {};
  const visited = new Set();
  while (queue.length) {
    const { id, category } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const { item, refs } = parseItemPage(await fetchPage(`${BASE}/database/${category}/${id}`), { slug: id, category });
    items[id] = icons[id] ? { ...item, icon: icons[id] } : item;
    for (const ref of refs) if (!visited.has(ref.id)) queue.push(ref);
  }
  return items;
}
