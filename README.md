# bio-analytics-site

Это проект анализов здоровья на основе данных в виде патогенов + интерактивный веб-интерфейс.

## Что мы добавили

- тёмная тема
- поиск по всем полям
- CSV-экспорт
- локальная база (localStorage)
- импорт данных: файл JSON + URL
- ручное добавление/удаление/сброс
- простой чат ИИ (бот локальный)
- Node.js парсер WebWellness (сценарий)
- Node.js "агент-роутер" OpenAI + Gemini

## Сценарий: распарсить анализ из URL

1. Установите зависимости:
   ```bash
   npm install node-fetch@2
   ```
2. Запустите:
   ```bash
   node scripts/parse_webwellness.js "https://profi-ru.webwellness.net/report/look-report?..."
   ```
3. Результат сохранится в `data/parsed_<timestamp>.json` и `data/latest.json`

## Сценарий: запрос к ИИ агенту

1. Установите ключи в окружение:
   ```bash
   export OPENAI_API_KEY="ваш_ключ"
   export GEMINI_API_KEY="ваш_ключ"
   ```
2. Запрос:
   ```bash
   node scripts/agent_router.js "Какой риск для кишечника у текущих данных?"
   ```
3. История сохраняется в `data/chat_history.json`

## IDEA

- Реализация парсера WebWellness зависит от структуры результата (HTML с JSON). В скрипте используется эвристика: ищем JSON, берём массив и приводим к стандарту `{name, prob, target, category, source}`.
- Можно добавить cron-скрипт для автоматического сабмита ссылок и создания новых JSON-файлов.
- Можно подключить `Github Actions` на каждый `parse` и пушить новые JSON-файлы.
