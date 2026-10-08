import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { config } from '../config';
import { unauthorized } from '../errors';
import { signToken } from '../middleware/auth';
import * as usersRepo from '../repositories/users';
import { loginBody, registerBody } from '../schemas';

export const authRouter = Router();

const BCRYPT_ROUNDS = 10;

// POST /api/auth/register — crée toujours un compte de rôle "user".
authRouter.post('/register', async (req, res) => {
  const body = registerBody.parse(req.body);
  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
  const user = await usersRepo.create({ email: body.email, name: body.name, passwordHash });
  res.status(201).json({ token: signToken(user), expiresIn: config.jwtExpiresInSeconds, user });
});

// POST /api/auth/login — même erreur pour email inconnu et mauvais mot de passe.
authRouter.post('/login', async (req, res) => {
  const body = loginBody.parse(req.body);
  const found = await usersRepo.findByEmailWithPassword(body.email);
  if (!found || !(await bcrypt.compare(body.password, found.passwordHash))) {
    throw unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const { passwordHash, ...user } = found;
  res.json({ token: signToken(user), expiresIn: config.jwtExpiresInSeconds, user });
});
