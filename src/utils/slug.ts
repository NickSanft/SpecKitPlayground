const MAX_SLUG_LENGTH = 40;

export function slugify(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length === 0) return 'feature';

  if (normalized.length <= MAX_SLUG_LENGTH) return normalized;
  return normalized.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '') || 'feature';
}

export function formatFeatureNumber(n: number): string {
  return String(n).padStart(3, '0');
}

export function featureDirName(number: number, slug: string): string {
  return `${formatFeatureNumber(number)}-${slug}`;
}
