const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname));

// Обслуживаем index.html по умолчанию
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const openaiKey = process.env.OPENAI_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

async function askOpenAI(prompt) {
  if (!openaiKey) return null;
  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-5-nano',
      input: prompt,
      temperature: 0.7,
      max_output_tokens: 300,
      store: false
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error('OpenAI: ' + JSON.stringify(data));
  const text = (data.output || []).map((u) => u.content?.map(c => c.text || '').join('')).join('\n');
  return text || null;
}

async function askGemini(prompt) {
  if (!geminiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate?key=${geminiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({prompt: prompt, temperature: 0.7, max_output_tokens: 300})
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error('Gemini: ' + JSON.stringify(data));
  return data.candidates?.[0]?.output || null;
}

function normalizeUserPrompt(prompt, data) {
  const prepared = `Данные в программе: ${data.length} строк (патогены + риски). Вопрос: ${prompt}`;
  return prepared;
}

app.post('/api/chat', async (req, res) => {
  const { prompt, data } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const normalized = normalizeUserPrompt(prompt, Array.isArray(data) ? data : []);

  let openaiAnswer = null;
  let geminiAnswer = null;
  const timeStart = Date.now();

  try {
    if (openaiKey) openaiAnswer = await askOpenAI(normalized);
  } catch (err) {
    console.error('openai error', err);
  }

  try {
    if (geminiKey) geminiAnswer = await askGemini(normalized);
  } catch (err) {
    console.error('gemini error', err);
  }

  let answer = null;
  if (openaiAnswer && geminiAnswer) {
    answer = `OpenAI: ${openaiAnswer.trim()}\n---\nGemini: ${geminiAnswer.trim()}`;
  } else if (openaiAnswer) {
    answer = `OpenAI: ${openaiAnswer.trim()}`;
  } else if (geminiAnswer) {
    answer = `Gemini: ${geminiAnswer.trim()}`;
  } else {
    answer = 'Нет доступных ИИ-ответов (проверьте доступность ключей).';
  }

  res.json({ answer, openaiAnswer, geminiAnswer, elapsedMs: Date.now() - timeStart });
});

app.listen(port, () => {
  console.log(`Server started on ${port}. OPENAI_KEY=${Boolean(openaiKey)} GEMINI_KEY=${Boolean(geminiKey)}`);
});
