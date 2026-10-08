-- BookIt — données de seed reproductibles
-- Idempotent : peut être rejoué à volonté (utilisé par POST /api/test/reset).
-- Les IDs sont déterministes grâce à RESTART IDENTITY + ordre d'insertion.
-- Les dates sont relatives à now() et arrondies (jour/minute) pour rester lisibles.
--
-- Comptes : admin@bookit.test / Admin123!
--           user1@bookit.test, user2@bookit.test, user3@bookit.test / User123!

BEGIN;

TRUNCATE bookings, rooms, users RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------- users
-- Hash bcrypt ($2a$, coût 8) généré par pgcrypto, compatible bcryptjs.
INSERT INTO users (email, password_hash, name, role) VALUES
  ('admin@bookit.test', crypt('Admin123!', gen_salt('bf', 8)), 'Admin BookIt', 'admin'), -- id 1
  ('user1@bookit.test', crypt('User123!',  gen_salt('bf', 8)), 'Alice Martin', 'user'),  -- id 2
  ('user2@bookit.test', crypt('User123!',  gen_salt('bf', 8)), 'Bruno Petit',  'user'),  -- id 3
  ('user3@bookit.test', crypt('User123!',  gen_salt('bf', 8)), 'Chloé Durand', 'user');  -- id 4

-- ---------------------------------------------------------------- rooms
INSERT INTO rooms (name, capacity, equipment, is_active) VALUES
  ('Cabine Focus',   2,  '{screen}',                                true),  -- id 1
  ('Salle Lovelace', 4,  '{screen,whiteboard}',                     true),  -- id 2
  ('Salle Turing',   8,  '{projector,whiteboard,videoconference}',  true),  -- id 3
  ('Salle Hopper',   12, '{projector,whiteboard,videoconference}',  false), -- id 4 (INACTIVE)
  ('Auditorium',     20, '{projector,microphone,videoconference}',  true);  -- id 5

-- ---------------------------------------------------------------- bookings
-- D = début du jour courant (UTC). Les heures sont en UTC.
WITH d AS (SELECT date_trunc('day', now()) AS day0, date_trunc('minute', now()) AS min0)
INSERT INTO bookings (room_id, user_id, title, start_at, end_at, attendees, status, cancelled_at)
SELECT v.room_id, v.user_id, v.title, v.start_at, v.end_at, v.attendees, v.status::booking_status, v.cancelled_at
FROM d, LATERAL (VALUES
  -- Passées
  (3, 2, 'Rétro sprint 41',        d.day0 - interval '2 days' + interval '9 hours',  d.day0 - interval '2 days' + interval '10 hours',        6,  'completed', NULL::timestamptz), -- id 1
  (2, 3, 'Point client Acme',      d.day0 - interval '1 day'  + interval '14 hours', d.day0 - interval '1 day'  + interval '15 hours 30 minutes', 3, 'completed', NULL), -- id 2
  (5, 2, 'All hands Q3',           d.day0 - interval '3 days' + interval '10 hours', d.day0 - interval '3 days' + interval '12 hours',        18, 'cancelled', d.day0 - interval '4 days'), -- id 3
  (1, 4, 'Entretien téléphonique', d.day0 - interval '1 day'  + interval '9 hours',  d.day0 - interval '1 day'  + interval '9 hours 30 minutes', 1, 'completed', NULL), -- id 4
  (4, 4, 'Atelier design',         d.day0 - interval '5 days' + interval '9 hours',  d.day0 - interval '5 days' + interval '10 hours',        10, 'completed', NULL), -- id 5 (salle devenue inactive)
  -- Futures
  (3, 2, 'Daily équipe Alpha',     d.day0 + interval '1 day'  + interval '10 hours', d.day0 + interval '1 day'  + interval '11 hours',        5,  'confirmed', NULL), -- id 6  (cible chevauchement : Turing J+1 10:00-11:00)
  (2, 2, 'Revue de code',          d.day0 + interval '1 day'  + interval '14 hours', d.day0 + interval '1 day'  + interval '15 hours',        3,  'pending',   NULL), -- id 7
  (3, 3, 'Formation sécurité',     d.day0 + interval '1 day'  + interval '14 hours', d.day0 + interval '1 day'  + interval '16 hours',        8,  'pending',   NULL), -- id 8
  (5, 3, 'Séminaire produit',      d.day0 + interval '2 days' + interval '9 hours',  d.day0 + interval '2 days' + interval '13 hours',        20, 'confirmed', NULL), -- id 9  (4 h pile, capacité pleine)
  (1, 4, 'Appel fournisseur',      d.day0 + interval '3 days' + interval '11 hours', d.day0 + interval '3 days' + interval '11 hours 30 minutes', 2, 'pending', NULL), -- id 10 (30 min pile)
  (2, 4, 'Brainstorm marketing',   d.day0 + interval '2 days' + interval '10 hours', d.day0 + interval '2 days' + interval '11 hours',        4,  'cancelled', now()), -- id 11
  -- Commence dans ~30 min : annulation refusée pour un user (règle 5)
  (1, 2, 'Call imminent',          d.min0 + interval '30 minutes',                   d.min0 + interval '90 minutes',                          2,  'confirmed', NULL)  -- id 12
) AS v (room_id, user_id, title, start_at, end_at, attendees, status, cancelled_at);

COMMIT;
