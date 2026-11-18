// Guardie prima di scrivere i dati: restituisce la lista degli errori (vuota = ok).
export function validate(next, prev) {
  const errors = [];
  const n = Object.keys(next).length;
  const p = Object.keys(prev).length;
  if (p > 0 && n < p * 0.8) errors.push(`count:${n}/${p}`);
  for (const [id, item] of Object.entries(next)) {
    for (const craft of item.crafts) {
      if (!craft.ingredients.length) errors.push(`empty-recipe:${id}`);
      if (!craft.profession) errors.push(`missing-profession:${id}`);
      for (const ing of craft.ingredients) if (!next[ing.id]) errors.push(`unknown-ingredient:${ing.id}`);
    }
  }
  return [...new Set(errors)];
}
