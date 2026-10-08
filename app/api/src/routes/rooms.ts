import { Router } from 'express';
import { notFound } from '../errors';
import { requireAuth, requireRole } from '../middleware/auth';
import * as roomsRepo from '../repositories/rooms';
import { createRoomBody, idParams, listRoomsQuery, updateRoomBody } from '../schemas';

export const roomsRouter = Router();

const roomNotFound = () => notFound('ROOM_NOT_FOUND', 'Room not found');

roomsRouter.use(requireAuth);

// GET /api/rooms?active=true|false — toutes les salles (actives et inactives) par défaut.
roomsRouter.get('/', async (req, res) => {
  const query = listRoomsQuery.parse(req.query);
  res.json(await roomsRepo.list({ active: query.active }));
});

roomsRouter.get('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params);
  const room = await roomsRepo.findById(id);
  if (!room) throw roomNotFound();
  res.json(room);
});

roomsRouter.post('/', requireRole('admin'), async (req, res) => {
  const body = createRoomBody.parse(req.body);
  const room = await roomsRepo.create(body);
  res.status(201).location(`/api/rooms/${room.id}`).json(room);
});

// Désactivation d'une salle : PATCH { "isActive": false } (pas de DELETE).
roomsRouter.patch('/:id', requireRole('admin'), async (req, res) => {
  const { id } = idParams.parse(req.params);
  const patch = updateRoomBody.parse(req.body);
  const room = await roomsRepo.update(id, patch);
  if (!room) throw roomNotFound();
  res.json(room);
});
