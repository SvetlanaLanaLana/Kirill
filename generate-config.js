/**
 * Читает .env и создаёт form-config.js
 * Запуск: node generate-config.js
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const envPath = path.join(root, '.env');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('Файл .env не найден. Скопируйте .env.example в .env и заполните ключи.');
    process.exit(1);
  }

  const env = {};
  fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      env[key] = value;
    });
  return env;
}

function escapeJsString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const env = parseEnv(envPath);

const formConfig = `// Сгенерировано из .env — не редактируйте вручную. Запуск: node generate-config.js
window.FORM_CONFIG = {
  web3formsKey: '${escapeJsString(env.WEB3FORMS_KEY || '')}',
  recipientEmail: '${escapeJsString(env.RECIPIENT_EMAIL || 'kirill.heikkinen@ya.ru')}',
  siteName: '${escapeJsString(env.SITE_NAME || 'Сайт «Две судьбы»')}',
};
`;

fs.writeFileSync(path.join(root, 'form-config.js'), formConfig, 'utf8');

const parentDir = path.join(root, '..');
if (fs.existsSync(path.join(parentDir, 'index.html'))) {
  fs.writeFileSync(path.join(parentDir, 'form-config.js'), formConfig, 'utf8');
}

console.log('Готово: form-config.js');
