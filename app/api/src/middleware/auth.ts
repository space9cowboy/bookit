import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { Role } from '../domain/bookingRules';
import { forbidden, unauthorized } from '../errors';
import * as usersRepo from '../repositories/users';
import type { User } from '../repositories/users';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(user: User): string {
  const payload: TokenPayload = { sub: String(user.id), role: user.role };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresInSeconds });
}

/**
 * Exige un header `Authorization: Bearer <jwt>`.
 * L'utilisateur est relu en base à chaque requête (rôle à jour, compte supprimé → 401).
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw unauthorized();
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as unknown as TokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw unauthorized('TOKEN_EXPIRED', 'Authentication token has expired');
    }
    throw unauthorized('INVALID_TOKEN', 'Authentication token is invalid');
  }

  const user = await usersRepo.findById(Number(payload.sub));
  if (!user) throw unauthorized('INVALID_TOKEN', 'Authentication token is invalid');

  req.user = user;
  next();
};

export const requireRole =
  (role: Role): RequestHandler =>
  (req, _res, next) => {
    if (req.user?.role !== role) throw forbidden();
    next();
  };

/** Utilisateur courant (à utiliser derrière requireAuth). */
export function currentUser(req: Request): User {
  if (!req.user) throw unauthorized();
  return req.user;
}
