import { AppError } from '../utils/apiResponse.js';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate registration request payload
 */
export function validateRegister(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request payload', 400, 'INVALID_PAYLOAD');
  }

  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!username) {
    errors.push({ field: 'username', message: 'Username is required' });
  } else if (!USERNAME_REGEX.test(username)) {
    errors.push({
      field: 'username',
      message: 'Username must be 3-30 characters and contain only letters, numbers, and underscores'
    });
  }

  if (!email) {
    errors.push({ field: 'email', message: 'Email address is required' });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  } else if (password.length > 128) {
    errors.push({ field: 'password', message: 'Password cannot exceed 128 characters' });
  }

  if (name.length > 60) {
    errors.push({ field: 'name', message: 'Name cannot exceed 60 characters' });
  }

  if (errors.length > 0) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  return {
    username,
    email,
    password,
    name
  };
}

/**
 * Validate login request payload
 */
export function validateLogin(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    throw new AppError('Invalid request payload', 400, 'INVALID_PAYLOAD');
  }

  const emailOrUsername = typeof body.email === 'string'
    ? body.email.trim()
    : typeof body.username === 'string'
      ? body.username.trim()
      : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!emailOrUsername) {
    errors.push({ field: 'email', message: 'Email or username is required' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  if (errors.length > 0) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors);
  }

  return {
    emailOrUsername: emailOrUsername.toLowerCase(),
    password
  };
}
