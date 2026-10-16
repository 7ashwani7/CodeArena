#!/usr/bin/env node

/**
 * Secure Administrator Provisioning Script
 * 
 * Allows creating the initial system administrator or promoting an existing
 * user account to 'admin' without hardcoding credentials in repository files.
 * 
 * Usage options:
 * 1. Environment variables:
 *    ADMIN_EMAIL=admin@example.com ADMIN_USERNAME=sysadmin ADMIN_PASSWORD=StrongPassword123! node src/scripts/createAdmin.js
 * 
 * 2. Command-line flags:
 *    node src/scripts/createAdmin.js --email admin@example.com --username sysadmin --password StrongPassword123! --name "System Admin"
 */

import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--') && i + 1 < argv.length) {
      const key = arg.slice(2);
      const val = argv[++i];
      args[key] = val;
    }
  }
  return args;
}

export async function createOrPromoteAdmin({ email, username, password, name = 'CodeArena Administrator' } = {}) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const normalizedUsername = (username || '').toLowerCase().trim();

  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new Error('A valid email address is required (--email or ADMIN_EMAIL)');
  }

  if (!normalizedUsername || normalizedUsername.length < 3) {
    throw new Error('A valid username (at least 3 characters) is required (--username or ADMIN_USERNAME)');
  }

  let user = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
  });

  if (user) {
    // Promote existing user
    user.role = 'admin';
    if (password && password.length >= 8) {
      user.passwordHash = await User.hashPassword(password);
    }
    await user.save();

    await AuditLog.create({
      action: 'CREATE_ADMIN',
      targetType: 'User',
      targetId: user._id,
      targetTitle: user.username,
      adminId: user._id,
      adminUsername: user.username,
      details: {
        note: 'Existing user promoted to administrator role via secure CLI script',
        email: user.email
      }
    });

    logger.info(`Successfully promoted existing user '${user.username}' (${user.email}) to role 'admin'.`);
    return { user: user.toJSON(), action: 'promoted' };
  }

  // Create new admin user
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long (--password or ADMIN_PASSWORD)');
  }

  const passwordHash = await User.hashPassword(password);
  user = await User.create({
    name,
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash,
    role: 'admin'
  });

  await AuditLog.create({
    action: 'CREATE_ADMIN',
    targetType: 'User',
    targetId: user._id,
    targetTitle: user.username,
    adminId: user._id,
    adminUsername: user.username,
    details: {
      note: 'New administrator created via secure CLI provisioning script',
      email: user.email
    }
  });

  logger.info(`Successfully created new administrator '${user.username}' (${user.email}).`);
  return { user: user.toJSON(), action: 'created' };
}

async function runCli() {
  const cliArgs = parseArgs(process.argv);
  const email = cliArgs.email || process.env.ADMIN_EMAIL;
  const username = cliArgs.username || process.env.ADMIN_USERNAME;
  const password = cliArgs.password || process.env.ADMIN_PASSWORD;
  const name = cliArgs.name || process.env.ADMIN_NAME || 'CodeArena Administrator';

  try {
    await connectDB();
    const result = await createOrPromoteAdmin({ email, username, password, name });
    console.log(`\n✔ Administrator provisioning completed successfully: [${result.action.toUpperCase()}]`);
    console.log(`  Username: ${result.user.username}`);
    console.log(`  Email:    ${result.user.email}`);
    console.log(`  Role:     ${result.user.role}\n`);
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error(`\n✖ Administrator provisioning failed: ${error.message}\n`);
    try {
      await disconnectDB();
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('createAdmin.js')) {
  runCli();
}
