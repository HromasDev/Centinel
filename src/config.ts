import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Отсутствует обязательная переменная окружения: ${key}`);
  }
  return value;
}

export const config = {
  botToken: getEnvVar('TELEGRAM_BOT_TOKEN'),
  receiverId: parseInt(getEnvVar('TELEGRAM_RECEIVER_ID'), 10),
  platiMarketCategoryId: getEnvVar('PLATI_CATEGORY_ID'),
  checkIntervalSec: parseInt(process.env.CHECK_INTERVAL_SEC ?? '300', 10),
};

if (isNaN(config.receiverId)) {
  throw new Error('TELEGRAM_RECEIVER_ID должен быть числом.');
}

if (isNaN(config.checkIntervalSec) || config.checkIntervalSec < 1) {
  throw new Error('CHECK_INTERVAL_SEC должен быть положительным числом.');
}
