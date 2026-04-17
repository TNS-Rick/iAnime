const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
  'no',
  'ni',
  'wa',
  'ga',
  'de',
  'da',
]);

const DESCRIPTOR_WORDS = new Set([
  'movie',
  'movies',
  'season',
  'seasons',
  'special',
  'ova',
  'oad',
  'episode',
  'episodes',
  'part',
  'parts',
  'cour',
  'volume',
  'vol',
  'edition',
  'version',
  'ver',
  'zero',
  'final',
  'finale',
  'remake',
  'brotherhood',
]);

const RELATION_PRIORITY = new Map([
  ['prequel', 0],
  ['sequel', 1],
  ['alternative_version', 2],
  ['summary', 3],
  ['other', 4],
]);

const stripDiacritics = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeForTokens = (value) => {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^\)]*\)|\{[^}]*\}/g, ' ')
    .replace(/[:–—\-_/|]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const scoreCandidate = (value, relationType) => {
  const normalized = normalizeForTokens(value);
  if (!normalized) {
    return Number.POSITIVE_INFINITY;
  }

  const tokens = normalized.split(' ').filter(Boolean);
  const descriptorCount = tokens.filter((token) => DESCRIPTOR_WORDS.has(token)).length;
  const stopwordCount = tokens.filter((token) => STOPWORDS.has(token)).length;
  const numericCount = tokens.filter((token) => /^\d+$/.test(token)).length;
  const relationPenalty = RELATION_PRIORITY.has(relationType)
    ? RELATION_PRIORITY.get(relationType)
    : 5;

  return (
    tokens.length +
    descriptorCount * 2 +
    stopwordCount * 0.5 +
    numericCount * 1.5 +
    relationPenalty
  );
};

const collectCandidateTitles = (anime = {}) => {
  const candidates = [];

  const addCandidate = (value, relationType = null) => {
    if (!value) return;

    const text = String(value).trim();
    if (!text) return;

    candidates.push({ value: text, relationType });
  };

  addCandidate(anime.title_english);
  addCandidate(anime.title);
  addCandidate(anime.title_japanese);

  if (Array.isArray(anime.titles)) {
    anime.titles.forEach((titleEntry) => {
      addCandidate(titleEntry?.title);
    });
  }

  if (Array.isArray(anime.title_synonyms)) {
    anime.title_synonyms.forEach((title) => addCandidate(title));
  }

  if (Array.isArray(anime.relations)) {
    anime.relations.forEach((relation) => {
      const relationType = String(relation?.relation || '').toLowerCase();
      const entries = Array.isArray(relation?.entry) ? relation.entry : [];

      entries.forEach((entry) => {
        addCandidate(entry?.name, relationType);
      });
    });
  }

  return candidates;
};

const pickCanonicalTitle = (anime = {}) => {
  const candidates = collectCandidateTitles(anime);

  if (candidates.length === 0) {
    return '';
  }

  return candidates
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate.value, candidate.relationType),
    }))
    .sort((left, right) => left.score - right.score || left.value.length - right.value.length)[0]
    .value;
};

const buildTagsFromSeed = (seed) => {
  const normalized = normalizeForTokens(seed);
  if (!normalized) {
    return [];
  }

  const tokens = normalized
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token) && !DESCRIPTOR_WORDS.has(token) && !/^\d+$/.test(token));

  if (tokens.length === 0) {
    const fallback = normalized.replace(/\s+/g, '');
    return fallback ? [fallback] : [];
  }

  const acronym = tokens.map((token) => token[0]).join('');
  const slug = tokens.join('');
  const tags = [];

  if (acronym) {
    tags.push(acronym);
  }

  if (slug && slug !== acronym) {
    tags.push(slug);
  }

  return [...new Set(tags)];
};

export const deriveAnimeTags = (anime = {}) => {
  const canonicalTitle = pickCanonicalTitle(anime) || anime.title || '';
  return buildTagsFromSeed(canonicalTitle);
};
