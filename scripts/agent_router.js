#!/usr/bin/env node
/**
 * agent_router.js
 * Пример запуска через env token OPENAI_API_KEY и GEMINI_API_KEY.
 * node scripts/agent_router.js "Что-то спросить"\n
 * Идея: простой роутинг по слову, комбинирование ответа.
 * Пишем историю в data/chat_history.json.
 */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const openaiKey = process.env.OPENAI_API_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

if (!openaiKey && !geminiKey) {
  console.error('Нужен хотя бы один ключ: OPENAI_API_KEY или GEMINI_API_KEY.');
  process.exit(1);
}

const prompt = process.argv.slice(2).join(' ').trim();
if (!prompt) {
  console.error('Usage: node scripts/agent_router.js "Напиши что-нибудь"');
  process.exit(1);
}

const historyPath = path.resolve(__dirname, '..', 'data', 'chat_history.json');
if (!fs.existsSync(path.dirname(historyPath))) fs.mkdirSync(path.dirname(historyPath), { recursive: true });

const saveHistory = async (item) => {
  let history = [];
  if (fs.existsSync(historyPath)) {
    try { history = JSON.parse(fs.readFileSync(historyPath, 'utf-8') || '[]'); } catch {};
  }
  history.push(item);
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
};

const callOpenAI = async (q) => {
  if (!openaiKey) return null;
  const body = {
    model: 'gpt-5-nano',
    input: q,
    store: false,
  };

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  const text = data.output?.[0]?.content?.map(c => c.text || '').join('') || JSON.stringify(data.output || {});
  return text;
};

const callGemini = async (q) => {
  if (!geminiKey) return null;
  const body = {
    prompt: q,
    temperature: 0.7,
    max_output_tokens: 256,
  };
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate?key=' + geminiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data?.candidates?.[0]?.output || JSON.stringify(data);
};

(async () => {
  const isHealth = /кишеч|здоров|патоген|анализ/.test(prompt.toLowerCase());
  const plans = [];

  if (isHealth) {
    if (geminiKey) plans.push(callGemini(prompt));
    if (openaiKey) plans.push(callOpenAI(prompt));
  } else {
    if (openaiKey) plans.push(callOpenAI(prompt));
    if (geminiKey) plans.push(callGemini(prompt));
  }

  const answers = await Promise.all(plans.map(p => p.catch(err => `ERROR: ${err.message}`)));

  const final = answers.filter(Boolean).join('\n---\n');
  console.log('Prompt:', prompt);
  console.log('Response:\n', final);

  await saveHistory({
    timestamp: new Date().toISOString(),
    prompt,
    answers,
    final,
  });
})();
