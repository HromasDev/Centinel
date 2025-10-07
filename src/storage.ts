import fs from 'fs';
import path from 'path';
import { AppState, Product } from './types.ts';

const DATA_FILE = path.join(process.cwd(), 'data.json');

const defaultState: AppState = {
  limit: 99999,
  compact: false,
  lastKnownProducts: [],
};

export function readState(): AppState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(rawData);
    }
  } catch (error) {
    console.error('Ошибка чтения файла состояния, будет использовано состояние по умолчанию:', error);
  }
  return defaultState;
}

export function writeState(state: AppState): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Ошибка записи файла состояния:', error);
  }
}
