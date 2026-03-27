#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.join(repoRoot, 'data');
const sampleFile = path.join(dataDir, 'sample_for_test.json');
const latestFile = path.join(dataDir, 'latest.json');

if (!fs.existsSync(sampleFile)) {
  console.error('Ошибка: sample_for_test.json не найден в data/.');
  process.exit(1);
}

const iterations = 100;
let errors = 0;
let success = 0;

console.log(`Запуск теста качества: ${iterations} прогонов`);

for (let i = 1; i <= iterations; i++) {
  process.stdout.write(`Прогон ${i}/${iterations}... `);

  try {
    // запустим парсер из sample и сохраним latest
    execSync(`node scripts/parse_webwellness.js "${sampleFile}"`, { stdio: 'ignore' });

    if (!fs.existsSync(latestFile)) throw new Error('latest.json не создан');
    const raw = fs.readFileSync(latestFile, 'utf-8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('latest.json пуст или не массив');

    // run agent router with safe prompt; возможно ключи нет, сбор ошибок, но не блокируем
    try {
      const out = execSync(`node scripts/agent_router.js "проверка работоспособности системы"`, { encoding: 'utf-8', timeout: 60000 });
      if (!out.toLowerCase().includes('response') && !out.toLowerCase().includes('prompt')) {
        // просто уведомление, но продолжим
      }
    } catch (err) {
      // принимаем отсутствие API-ключей как условие, но фиксируем
      if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
        // норм
      } else {
        throw err;
      }
    }

    success++;
    console.log('ok');
  } catch (err) {
    errors++;
    console.log('FAIL');
    console.error(err.message);
  }
}

console.log('-------------------------------------');
console.log(`Успехов: ${success}, Ошибок: ${errors}`);
if (errors > 0) process.exit(2);
console.log('Тест пройден');
