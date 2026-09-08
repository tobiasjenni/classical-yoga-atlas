export const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export const matchesSearch = (text: string, query: string) => {
  const normalized = normalizeSearch(text);
  return normalizeSearch(query)
    .split(' ')
    .every((word) => normalized.includes(word) || normalized.replace(/ /g, '').includes(word));
};
