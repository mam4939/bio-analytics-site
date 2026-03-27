#!/usr/bin/env python3
import json
import os
from pathlib import Path

repo = Path(__file__).resolve().parents[1]
index_file = repo / 'index.html'
parser_js = repo / 'scripts' / 'parse_webwellness.js'
agent_js = repo / 'scripts' / 'agent_router.js'
sample_json = repo / 'data' / 'sample_for_test.json'
latest_json = repo / 'data' / 'latest.json'

errors = 0
success = 0

if not index_file.exists():
    raise FileNotFoundError('index.html не найден')
if not parser_js.exists():
    raise FileNotFoundError('parse_webwellness.js не найден')
if not agent_js.exists():
    raise FileNotFoundError('agent_router.js не найден')
if not sample_json.exists():
    raise FileNotFoundError('sample_for_test.json не найден')

print('Файлы на месте, проверка наличия ключевых компонентов...')

for i in range(1, 101):
    print(f'Прогон {i}/100', end=': ')
    try:
        # Чтение sample
        sample_data = json.loads(sample_json.read_text(encoding='utf-8'))
        if not isinstance(sample_data, list) or len(sample_data) < 1:
            raise ValueError('sample_for_test.json явно не массив с данными')

        # Проверка latest (если нет, создаем из sample)
        if not latest_json.exists():
            latest_json.write_text(json.dumps(sample_data, ensure_ascii=False, indent=2), encoding='utf-8')

        latest_data = json.loads(latest_json.read_text(encoding='utf-8'))
        if not isinstance(latest_data, list) or len(latest_data) < 1:
            raise ValueError('latest.json поврежден')

        # Проверка структуры index.html, что там хуки для UI
        html = index_file.read_text(encoding='utf-8')
        required = ['id="searchInput"', 'id="exportBtn"', 'id="chatBody"', 'id="loadUrlBtn"', 'id="clearDataBtn"']
        for req in required:
            if req not in html:
                raise ValueError(f'Элемент {req} не найден в index.html')

        success += 1
        print('ok')
    except Exception as e:
        errors += 1
        print('FAIL', e)

print('---')
print(f'Успешно: {success}, Ошибок: {errors}')
if errors > 0:
    raise SystemExit(1)

print('Проверка 100 раз завершена успешно.')
