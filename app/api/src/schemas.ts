import { z } from 'zod';
import { BOOKING_STATUSES } from './domain/bookingStatus';
import { EQUIPMENT } from './repositories/rooms';

/** Identifiant entier positif (INTEGER PostgreSQL), passé en paramètre d'URL. */
const id = z
  .string()
  .regex(/^\d+$/, 'Must be a positive integer')
  .transform(Number)
  .refine((n) => n >= 1 && n <= 2_147_483_647, 'Must be a positive integer');

export const idParams = z.object({ id });

const email = z.string().trim().toLowerCase().email().max(254);

// Les corps de requête sont `.strict()` : un champ inconnu (ex. "role") → 400.
export const registerBody = z
  .object({
    email,
    password: z.string().min(8).max(72), // 72 = limite bcrypt
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export const loginBody = z
  .object({
    email,
    password: z.string().min(1),
  })
  .strict();

const roomFields = {
  name: z.string().trim().min(1).max(100),
  capacity: z.number().int().min(1).max(500),
  equipment: z.array(z.enum(EQUIPMENT)).max(EQUIPMENT.length),
  isActive: z.boolean(),
};

export const createRoomBody = z
  .object({
    ...roomFields,
    equipment: roomFields.equipment.default([]),
    isActive: roomFields.isActive.default(true),
  })
  .strict();

export const updateRoomBody = z
  .object(roomFields)
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, 'At least one field is required');

export const listRoomsQuery = z.object({
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// ISO 8601 avec fuseau obligatoire (Z ou +02:00) pour éviter toute ambiguïté.
const isoDateTime = z
  .string()
  .datetime({ offset: true, message: 'Must be an ISO 8601 date-time with timezone' })
  .transform((value) => new Date(value));

export const createBookingBody = z
  .object({
    roomId: z.number().int().positive(),
    title: z.string().trim().min(1).max(120),
    startAt: isoDateTime,
    endAt: isoDateTime,
    attendees: z.number().int().min(1),
  })
  .strict();

const queryId = z
  .string()
  .regex(/^\d+$/, 'Must be a positive integer')
  .transform(Number)
  .optional();

export const listBookingsQuery = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  roomId: queryId,
  userId: queryId, // pris en compte pour l'admin uniquement
});
