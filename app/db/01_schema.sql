-- BookIt — schéma PostgreSQL 16
-- Exécuté automatiquement au premier démarrage du conteneur db
-- (monté dans /docker-entrypoint-initdb.d, ordre alphabétique).
--
-- NOTE : les règles métier (chevauchement, durée, capacité, passé…) ne sont
-- volontairement PAS des contraintes SQL. Elles vivent dans
-- app/api/src/domain/bookingRules.ts, ce qui permet de les désactiver via
-- les bugs injectables (BUG=OVERLAP, etc.). La base ne garde que l'intégrité
-- structurelle.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- crypt()/gen_salt('bf') pour le seed

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS booking_status;
DROP TYPE IF EXISTS user_role;

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  role          user_role   NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL UNIQUE,
  capacity   INTEGER     NOT NULL CHECK (capacity > 0),
  equipment  TEXT[]      NOT NULL DEFAULT '{}',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id           SERIAL PRIMARY KEY,
  room_id      INTEGER        NOT NULL REFERENCES rooms (id),
  user_id      INTEGER        NOT NULL REFERENCES users (id),
  title        TEXT           NOT NULL,
  start_at     TIMESTAMPTZ    NOT NULL,
  end_at       TIMESTAMPTZ    NOT NULL,
  attendees    INTEGER        NOT NULL CHECK (attendees > 0),
  status       booking_status NOT NULL DEFAULT 'pending',
  cancelled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE INDEX bookings_room_time_idx ON bookings (room_id, start_at, end_at);
CREATE INDEX bookings_user_idx ON bookings (user_id);
