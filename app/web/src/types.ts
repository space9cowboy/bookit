export type Role = 'user' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
  user: User;
}

export const EQUIPMENT = [
  'screen',
  'projector',
  'whiteboard',
  'videoconference',
  'microphone',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export interface Room {
  id: number;
  name: string;
  capacity: number;
  equipment: Equipment[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface Booking {
  id: number;
  roomId: number;
  roomName: string;
  userId: number;
  userEmail: string;
  userName: string;
  title: string;
  startAt: string;
  endAt: string;
  attendees: number;
  status: BookingStatus;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}
