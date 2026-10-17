import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env if present, otherwise root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number.parseInt(process.env.PORT, 10) || 5000;
const CLIENT_ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codearena';
const JWT_SECRET = process.env.JWT_SECRET || (NODE_ENV === 'production' ? null : 'dev_jwt_secret_change_in_prod');
const COOKIE_SECRET = process.env.COOKIE_SECRET || (NODE_ENV === 'production' ? null : 'dev_cookie_secret_change_in_prod');

// Warn in production if essential secrets are missing
if (NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
  }
  if (!process.env.COOKIE_SECRET) {
    throw new Error('FATAL: COOKIE_SECRET environment variable is required in production.');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('FATAL: MONGODB_URI environment variable is required in production.');
  }
}

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || '';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || (JUDGE0_API_URL.includes('rapidapi.com') ? 'judge0-ce.p.rapidapi.com' : '');

let judge0ConfigOverride = null;

export function setJudge0ConfigOverride(val) {
  judge0ConfigOverride = val;
}

export function checkIsJudge0Configured() {
  if (judge0ConfigOverride !== null) return judge0ConfigOverride;
  if (NODE_ENV === 'test') return true;
  if (!JUDGE0_API_URL) return false;
  if (JUDGE0_API_URL.includes('rapidapi.com') && !JUDGE0_API_KEY) {
    return false;
  }
  return true;
}

export const env = Object.freeze({
  NODE_ENV,
  PORT,
  CLIENT_ORIGIN,
  MONGODB_URI,
  JWT_SECRET,
  COOKIE_SECRET,
  JUDGE0_API_URL,
  JUDGE0_API_KEY,
  JUDGE0_API_HOST,
  isJudge0Configured: checkIsJudge0Configured,
  isProduction: NODE_ENV === 'production',
  isDevelopment: NODE_ENV === 'development',
  isTest: NODE_ENV === 'test'
});
