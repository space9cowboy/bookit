import { Router } from 'express';
import { isBug } from '../bugs';
import { currentUser, requireAuth, requireRole } from '../middleware/auth';
import { createBookingBody, idParams, listBookingsQuery } from '../schemas';
import * as bookingService from '../services/bookingService';

export const bookingsRouter = Router();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

bookingsRouter.use(requireAuth);

// GET /api/bookings — user : les siennes ; admin : toutes (filtre userId possible).
bookingsRouter.get('/', async (req, res) => {
  const query = listBookingsQuery.parse(req.query);

  // BUG SLOW : +800 ms de latence sur la liste des réservations.
  if (isBug('SLOW')) await sleep(800);

  res.json(await bookingService.listBookings(currentUser(req), query));
});

bookingsRouter.post('/', async (req, res) => {
  const body = createBookingBody.parse(req.body);
  const booking = await bookingService.createBooking(currentUser(req), body);

  // BUG STATUS_CODE : la création renvoie 200 au lieu de 201.
  const status = isBug('STATUS_CODE') ? 200 : 201;

  res.status(status).location(`/api/bookings/${booking.id}`).json(booking);
});

bookingsRouter.get('/:id', async (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json(await bookingService.getBooking(currentUser(req), id));
});

bookingsRouter.post('/:id/cancel', async (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json(await bookingService.cancelBooking(currentUser(req), id));
});

bookingsRouter.post('/:id/confirm', requireRole('admin'), async (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json(await bookingService.confirmBooking(id));
});

bookingsRouter.post('/:id/complete', requireRole('admin'), async (req, res) => {
  const { id } = idParams.parse(req.params);
  res.json(await bookingService.completeBooking(id));
});
