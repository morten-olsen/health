import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod/v4';

import { ConfigService } from '../config/config.ts';
import { DatabaseService } from '../database/database.ts';
import type { UserRole, UsersTable } from '../database/database.types.ts';
import { Services } from '../services/services.ts';

import type { UserResponse } from './auth.schemas.ts';

const scrypt = promisify(scryptCb);
const SCRYPT_KEYLEN = 64;
const JWT_ISSUER = 'health';
const JWT_ALG = 'HS256';

const tokenPayloadSchema = z.object({
  sub: z.string().min(1),
  username: z.string().nullable(),
  role: z.enum(['admin', 'user']),
});

type TokenPayload = z.infer<typeof tokenPayloadSchema>;

class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
};

const verifyPasswordHash = async (password: string, stored: string): Promise<boolean> => {
  const [saltHex, keyHex] = stored.split(':');
  if (!saltHex || !keyHex) {
    return false;
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(keyHex, 'hex');
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
};

class AuthService {
  #services: Services;
  #secretBytes: Uint8Array | null = null;

  constructor(services: Services) {
    this.#services = services;
  }

  // Reconcile the env-var-bootstrapped admin on startup. Creates if missing,
  // forces role=admin, resets password if it diverges. No-op when the env
  // vars aren't both set.
  bootstrapAdmin = async (): Promise<void> => {
    const { auth } = this.#services.get(ConfigService).config;
    if (!auth.adminUsername || !auth.adminPassword) {
      return;
    }
    const db = await this.#services.get(DatabaseService).getInstance();
    const existing = await db
      .selectFrom('users')
      .selectAll()
      .where('username', '=', auth.adminUsername)
      .executeTakeFirst();
    if (!existing) {
      await this.createUser({ username: auth.adminUsername, password: auth.adminPassword, role: 'admin' });
      return;
    }
    const passwordOk =
      existing.password_hash !== null && (await verifyPasswordHash(auth.adminPassword, existing.password_hash));
    const updates: Partial<UsersTable> = {};
    if (!passwordOk) {
      updates.password_hash = await hashPassword(auth.adminPassword);
    }
    if (existing.role !== 'admin') {
      updates.role = 'admin';
    }
    if (Object.keys(updates).length === 0) {
      return;
    }
    updates.updated_at = new Date().toISOString();
    await db.updateTable('users').where('id', '=', existing.id).set(updates).execute();
  };

  // Internal user creation — the only path to a new user in v1, used by the
  // bootstrap and by tests. Public registration is intentionally absent.
  createUser = async (input: { username: string; password: string; role: UserRole }): Promise<UsersTable> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const now = new Date().toISOString();
    const row: UsersTable = {
      id: crypto.randomUUID(),
      username: input.username,
      password_hash: await hashPassword(input.password),
      role: input.role,
      created_at: now,
      updated_at: now,
    };
    await db.insertInto('users').values(row).execute();
    return row;
  };

  login = async (username: string, password: string): Promise<{ user: UsersTable; token: string }> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const user = await db.selectFrom('users').selectAll().where('username', '=', username).executeTakeFirst();
    if (!user || !user.password_hash) {
      throw new InvalidCredentialsError();
    }
    if (!(await verifyPasswordHash(password, user.password_hash))) {
      throw new InvalidCredentialsError();
    }
    const token = await this.#signToken({ sub: user.id, username: user.username, role: user.role });
    return { user, token };
  };

  verifyToken = async (token: string): Promise<TokenPayload> => {
    try {
      const { payload } = await jwtVerify(token, this.#secret(), { issuer: JWT_ISSUER });
      return tokenPayloadSchema.parse(payload);
    } catch {
      throw new InvalidTokenError('Token verification failed');
    }
  };

  getUserById = async (id: string): Promise<UsersTable | null> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const row = await db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst();
    return row ?? null;
  };

  toResponse = (row: UsersTable): UserResponse => ({
    id: row.id,
    username: row.username,
    role: row.role,
    created_at: row.created_at,
  });

  #signToken = async (payload: TokenPayload): Promise<string> =>
    await new SignJWT({ username: payload.username, role: payload.role })
      .setProtectedHeader({ alg: JWT_ALG })
      .setIssuer(JWT_ISSUER)
      .setSubject(payload.sub)
      .setIssuedAt()
      .sign(this.#secret());

  #secret = (): Uint8Array => {
    if (!this.#secretBytes) {
      const { auth } = this.#services.get(ConfigService).config;
      const value = auth.jwtSecret ?? randomBytes(32).toString('hex');
      this.#secretBytes = new TextEncoder().encode(value);
    }
    return this.#secretBytes;
  };
}

export type { TokenPayload };
export { AuthService, InvalidCredentialsError, InvalidTokenError, hashPassword, verifyPasswordHash };
