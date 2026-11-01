export type UserRole = 'client' | 'stylist' | 'admin';
export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';
export type ServiceCategory = 'cut' | 'beard' | 'color' | 'treatment';

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // minutes
  category: ServiceCategory;
  popular?: boolean;
}

export interface Stylist {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  serviceIds: string[];
  color: string;
  initials: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Appointment {
  id: string;
  clientName: string;
  serviceId: string;
  stylistId: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt?: string;
}

export interface BookingState {
  serviceId: string | null;
  stylistId: string | null;
  date: string | null;
  time: string | null;
  holdId?: string;
  holdExpiresAt?: number;
}

export const SERVICES: Service[] = [
  {
    id: 's1',
    name: 'Corte Clásico',
    description: 'Corte profesional adaptado a tu estilo. Incluye lavado, corte con tijera o máquina y peinado final con productos premium.',
    price: 25,
    duration: 30,
    category: 'cut',
    popular: true,
  },
  {
    id: 's2',
    name: 'Arreglo de Barba',
    description: 'Perfilado y arreglo completo de barba. Incluye recorte preciso, perfilado con navaja y aceite hidratante artesanal.',
    price: 20,
    duration: 20,
    category: 'beard',
  },
  {
    id: 's3',
    name: 'Corte + Barba',
    description: 'El combo perfecto para lucir impecable. Corte de cabello y arreglo completo de barba a precio especial. El más elegido.',
    price: 40,
    duration: 50,
    category: 'cut',
    popular: true,
  },
  {
    id: 's4',
    name: 'Color y Tinte',
    description: 'Coloración profesional con productos sin amoniaco. Incluye consulta de color, aplicación y tratamiento post-tinte.',
    price: 55,
    duration: 90,
    category: 'color',
  },
  {
    id: 's5',
    name: 'Tratamiento Capilar',
    description: 'Hidratación profunda y nutrición capilar. Recupera el brillo natural y fortalece tu cabello desde la raíz.',
    price: 45,
    duration: 60,
    category: 'treatment',
  },
  {
    id: 's6',
    name: 'Afeitado con Navaja',
    description: 'Afeitado tradicional con navaja recta. Toalla caliente, crema artesanal y bálsamo post-afeitado. Una experiencia única.',
    price: 30,
    duration: 30,
    category: 'beard',
    popular: true,
  },
  {
    id: 's7',
    name: 'Degradado Premium',
    description: 'Degradado a medida con transiciones precisas, contornos definidos y acabado profesional.',
    price: 35,
    duration: 40,
    category: 'cut',
    popular: true,
  },
  {
    id: 's8',
    name: 'Diseño y Perfilado de Cejas',
    description: 'Diseño personalizado y perfilado cuidadoso para equilibrar y realzar tus facciones.',
    price: 12,
    duration: 15,
    category: 'beard',
  },
  {
    id: 's9',
    name: 'Corte + Color',
    description: 'Renueva tu look con un corte personalizado y coloración profesional en una sola visita.',
    price: 70,
    duration: 120,
    category: 'color',
    popular: true,
  },
  {
    id: 's10',
    name: 'Alisado y Control de Frizz',
    description: 'Tratamiento de control de frizz que facilita el peinado y deja el cabello suave y manejable.',
    price: 65,
    duration: 90,
    category: 'treatment',
  },
  {
    id: 's11',
    name: 'Corte + Barba Premium',
    description: 'Corte detallado, arreglo de barba y acabado con toalla caliente para una renovación completa.',
    price: 50,
    duration: 65,
    category: 'cut',
    popular: true,
  },
  {
    id: 's12',
    name: 'Lavado y Peinado',
    description: 'Lavado relajante con productos profesionales y peinado final para cualquier ocasión.',
    price: 18,
    duration: 25,
    category: 'treatment',
  },
];

export const STYLISTS: Stylist[] = [
  {
    id: 'st1',
    name: 'Carlos Ruiz',
    specialty: 'Cortes Clásicos',
    rating: 4.9,
    reviewCount: 234,
    serviceIds: ['s1', 's3', 's6'],
    color: '#E8734A',
    initials: 'CR',
  },
  {
    id: 'st2',
    name: 'Miguel Torres',
    specialty: 'Barbero Experto',
    rating: 4.8,
    reviewCount: 189,
    serviceIds: ['s2', 's3', 's6'],
    color: '#F2A950',
    initials: 'MT',
  },
  {
    id: 'st3',
    name: 'David Sánchez',
    specialty: 'Colorista & Estilista',
    rating: 4.9,
    reviewCount: 156,
    serviceIds: ['s4', 's5', 's1'],
    color: '#8B9D77',
    initials: 'DS',
  },
  {
    id: 'st4',
    name: 'Luis Mora',
    specialty: 'Estilista Integral',
    rating: 4.7,
    reviewCount: 142,
    serviceIds: ['s1', 's2', 's3', 's4', 's5'],
    color: '#6B4226',
    initials: 'LM',
  },
  {
    id: 'st5',
    name: 'Andrés Castaño',
    specialty: 'Experto en Degradados',
    rating: 4.9,
    reviewCount: 118,
    serviceIds: ['s1', 's3', 's7', 's11'],
    color: '#547C8A',
    initials: 'AC',
  },
  {
    id: 'st6',
    name: 'Santiago Vélez',
    specialty: 'Color y Cuidado Capilar',
    rating: 4.8,
    reviewCount: 96,
    serviceIds: ['s4', 's5', 's9', 's10', 's12'],
    color: '#9B6C91',
    initials: 'SV',
  },
];

export const APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    clientName: 'Juan García',
    serviceId: 's3',
    stylistId: 'st1',
    date: '2026-09-05',
    time: '10:00',
    status: 'confirmed',
  },
  {
    id: 'a2',
    clientName: 'Juan García',
    serviceId: 's1',
    stylistId: 'st2',
    date: '2026-09-15',
    time: '14:00',
    status: 'pending',
  },
  {
    id: 'a3',
    clientName: 'Juan García',
    serviceId: 's2',
    stylistId: 'st3',
    date: '2026-08-20',
    time: '11:30',
    status: 'completed',
  },
  {
    id: 'a4',
    clientName: 'Juan García',
    serviceId: 's4',
    stylistId: 'st4',
    date: '2026-08-10',
    time: '16:00',
    status: 'cancelled',
  },
  {
    id: 'a5',
    clientName: 'Juan García',
    serviceId: 's6',
    stylistId: 'st1',
    date: '2026-07-28',
    time: '09:30',
    status: 'completed',
  },
];

export const TIME_SLOTS: TimeSlot[] = [
  { time: '09:00', available: false },
  { time: '09:30', available: true },
  { time: '10:00', available: true },
  { time: '10:30', available: false },
  { time: '11:00', available: true },
  { time: '11:30', available: true },
  { time: '12:00', available: false },
  { time: '12:30', available: false },
  { time: '14:00', available: true },
  { time: '14:30', available: true },
  { time: '15:00', available: false },
  { time: '15:30', available: true },
  { time: '16:00', available: true },
  { time: '16:30', available: false },
  { time: '17:00', available: true },
  { time: '17:30', available: true },
  { time: '18:00', available: true },
];

export const UNAVAILABLE_DATES = ['2026-09-07', '2026-09-08', '2026-09-14', '2026-09-21', '2026-09-28'];

export const BUSY_DATES = ['2026-09-03', '2026-09-09', '2026-09-17'];

export function getService(id: string): Service | undefined {
  return SERVICES.find(s => s.id === id);
}

export function getStylist(id: string): Stylist | undefined {
  return STYLISTS.find(s => s.id === id);
}

export function getStylistsForService(serviceId: string): Stylist[] {
  return STYLISTS.filter(st => st.serviceIds.includes(serviceId));
}

export function formatPrice(price: number): string {
  return `$${price}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

export const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmada', color: '#4A7C59', bg: '#D4EDDA' },
  pending: { label: 'Pendiente', color: '#8B6914', bg: '#FFF3CD' },
  cancelled: { label: 'Cancelada', color: '#C45C4C', bg: '#F8D7DA' },
  completed: { label: 'Completada', color: '#6B4226', bg: '#F5E6D3' },
};

export const CATEGORY_CONFIG: Record<ServiceCategory, { label: string; emoji: string }> = {
  cut: { label: 'Corte', emoji: '✂️' },
  beard: { label: 'Barba', emoji: '🪒' },
  color: { label: 'Color', emoji: '🎨' },
  treatment: { label: 'Tratamiento', emoji: '💆' },
};
