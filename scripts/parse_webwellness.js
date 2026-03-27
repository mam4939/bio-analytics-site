#!/usr/bin/env node
/**
 * parse_webwellness.js
 *
 * Пример: node scripts/parse_webwellness.js https://profi-ru.webwellness.net/report/look-report?... 
 * Создаёт JSON /data/dist_{timestamp}.json + data/latest.json
 */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const outDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/parse_webwellness.js <URL or path-to-json>');
  process.exit(1);
}

function maybeParseJSON(value) {
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function pickBestJsonFromText(text) {
  // Ищем наиболее длинный JSON-подобный фрагмент
  const re = /({[\s\S]*})/g;
  let best = null;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1].length < 50) continue;
    const q = maybeParseJSON(m[1]);
    if (q) {
      if (!best || m[1].length > best.text.length) {
        best = { obj: q, text: m[1] };
      }
    }
  }
  return best && best.obj;
}

function normalizeRow(item) {
  if (!item) return null;
  return {
    name: item.name || item.pathogen || item.title || item.key || 'неизвестно',
    prob: Number(item.prob || item.probability || item.value || item.score || 0),
    target: item.target || item.organ || item.location || item.zone || 'не указано',
    category: item.category || item.type || item.group || 'не задано',
    source: item.source || item.description || item.note || '',
    raw: item,
  };
}

function flattenData(data) {
  if (Array.isArray(data)) {
    return data.map(normalizeRow).filter(Boolean);
  }

  if (data && typeof data === 'object') {
    // Ищем массивы с признаками патогенов
    const candidates = [];
    const scan = (obj, prefix = '') => {
      if (Array.isArray(obj)) {
        const candidate = obj.filter(i => i && (i.name || i.pathogen || i.title || i.prob));
        if (candidate.length) candidates.push(candidate);
        obj.forEach((x, i) => scan(x, `${prefix}[${i}]`));
      } else if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => scan(obj[key], `${prefix}.${key}`));
      }
    };
    scan(data);
    if (candidates.length) {
      const best = candidates.sort((a, b) => b.length - a.length)[0];
      return best.map(normalizeRow).filter(Boolean);
    }
    // direct map object
    if (data.records && Array.isArray(data.records)) return data.records.map(normalizeRow).filter(Boolean);
    if (data.analysis && Array.isArray(data.analysis)) return data.analysis.map(normalizeRow).filter(Boolean);
  }

  return [];
}

(async () => {
  let text;

  if (/^https?:\/\//.test(url)) {
    console.log('Fetching URL:', url);
    const res = await fetch(url, { timeout: 30000 });
    if (!res.ok) {
      console.error('HTTP error', res.status, res.statusText);
      process.exit(2);
    }
    text = await res.text();
  } else {
    text = fs.readFileSync(path.resolve(url), 'utf-8');
  }

  let parsed = maybeParseJSON(text);
  if (!parsed) {
    parsed = pickBestJsonFromText(text);
  }

  if (!parsed) {
    console.error('Не удалось распознать JSON из входного источника.');
    process.exit(3);
  }

  const records = flattenData(parsed);
  if (!records.length) {
    console.error('Найден JSON, но не удалось извлечь записи. Возможно нестандартный формат.');
    process.exit(4);
  }

  records.sort((a, b) => (b.prob || 0) - (a.prob || 0));

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `parsed_${ts}.json`);
  const latestFile = path.join(outDir, 'latest.json');

  fs.writeFileSync(outFile, JSON.stringify(records, null, 2), 'utf-8');
  fs.writeFileSync(latestFile, JSON.stringify(records, null, 2), 'utf-8');

  console.log('Успех! Записано', records.length, 'строк. Файлы:', outFile, latestFile);
})();
