import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useLocation } from 'react-router';
import type { UserRole, BookingState } from './data';
import { APPOINTMENTS } from './data';
import { AccessibilityWidget, BottomNav, resetAccessibilityPreferences, SideNav } from './ui';

// Onboarding
import { LoginScreen, RegisterScreen, RoleSelectScreen, ForgotPasswordScreen, SplashScreen } from './screens/Onboarding';
import Landing from './screens/Landing';
import { liberarTurno } from './services/bookingService';

// Booking
import { BookStep1, BookStep2, BookStep3, BookStep4, BookSuccess } from './screens/Booking';

// Services
import { ClientHome, ServiceCatalog, ServiceDetail } from './screens/Services';
import AdminServices from './screens/AdminServices';

// Appointments
import { MyAppointments, AppointmentDetail, CancelAppointment } from './screens/Appointments';

// Admin
import { AdminDashboard, AdminTeam, AdminReports } from './screens/Admin';

// Stylist
import { StylistSchedule, StylistClients, StylistPerformance } from './screens/Stylist';

// ─── URL ↔ SCREEN MAPPING ─────────────────────────────────────────────────────

type Screen =
  | 'splash' | 'login' | 'register' | 'role-select' | 'forgot-password'
  | 'client-home' | 'service-catalog' | 'service-detail'
  | 'book-1' | 'book-2' | 'book-3' | 'book-4' | 'book-success'
  | 'my-appointments' | 'appointment-detail' | 'cancel-appointment'
  | 'admin-dashboard' | 'admin-services' | 'admin-team' | 'admin-reports'
  | 'stylist-schedule' | 'stylist-clients' | 'stylist-reports'
  | 'profile';

type ClientTab = 'home' | 'book' | 'appointments' | 'profile';
type AdminTab = 'dashboard' | 'services' | 'team' | 'schedule' | 'clients' | 'reports';

const SCREEN_TO_PATH: Record<Screen, string> = {
  'splash':               '/',
  'login':                '/login',
  'forgot-password':      '/olvide-contrasena',
  'register':             '/registro',
  'role-select':          '/elegir-rol',
  'client-home':          '/cliente/inicio',
  'service-catalog':      '/cliente/servicios',
  'service-detail':       '/cliente/servicios/detalle',
  'book-1':               '/cliente/reservar',
  'book-2':               '/cliente/reservar/estilista',
  'book-3':               '/cliente/reservar/horario',
  'book-4':               '/cliente/reservar/confirmar',
  'book-success':         '/cliente/reservar/exito',
  'my-appointments':      '/cliente/citas',
  'appointment-detail':   '/cliente/citas/detalle',
  'cancel-appointment':   '/cliente/citas/cancelar',
  'profile':              '/cliente/perfil',
  'admin-dashboard':      '/admin/dashboard',
  'admin-services':       '/admin/servicios',
  'admin-team':           '/admin/equipo',
  'admin-reports':        '/admin/reportes',
  'stylist-schedule':     '/estilista/mi-agenda',
  'stylist-clients':      '/estilista/clientes',
  'stylist-reports':      '/estilista/desempeno',
};

const PATH_TO_SCREEN: Record<string, Screen> = Object.fromEntries(
  (Object.entries(SCREEN_TO_PATH) as [Screen, string][]).map(([s, p]) => [p, s])
);

// Admin clients reuses the stylist clients screen
PATH_TO_SCREEN['/admin/clientes'] = 'stylist-clients';

const PROTECTED_PREFIXES = ['/cliente', '/admin', '/estilista'];
const SESSION_KEY_ROLE = 'bb_role';
const SESSION_KEY_AUTH = 'bb_auth';
const SESSION_KEY_USER_NAME = 'bb_user_name';

const INITIAL_BOOKING: BookingState = {
  serviceId: null,
  stylistId: null,
  date: null,
  time: null,
};

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Auth state — persisted to sessionStorage so F5 restores the session
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    sessionStorage.getItem(SESSION_KEY_AUTH) === 'true'
  );
  const [role, setRole] = useState<UserRole>(() =>
    (sessionStorage.getItem(SESSION_KEY_ROLE) as UserRole) ?? 'client'
  );
  const [userName, setUserName] = useState(() =>
    sessionStorage.getItem(SESSION_KEY_USER_NAME) ?? 'Juan García'
  );

  // Ephemeral state — lost on F5 (by design for multi-step flows)
  const [booking, setBooking] = useState<BookingState>(INITIAL_BOOKING);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState<string | null>(null);
  const [reservationCode, setReservationCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dismissToast = useCallback(() => setToastMessage(null), []);

  // Derive current screen from URL path
  const screen: Screen = PATH_TO_SCREEN[location.pathname] ?? 'splash';

  // Derive active bottom tab for client
  const clientTab: ClientTab = (() => {
    if (screen === 'client-home' || screen === 'service-catalog' || screen === 'service-detail') return 'home';
    if (screen.startsWith('book-')) return 'book';
    if (screen === 'my-appointments' || screen === 'appointment-detail' || screen === 'cancel-appointment') return 'appointments';
    if (screen === 'profile') return 'profile';
    return 'home';
  })();

  // Derive active tab for admin/stylist side nav
  const activeAdminTab: AdminTab = (() => {
    if (role === 'admin') {
      if (screen === 'admin-services') return 'services';
      if (screen === 'admin-team') return 'team';
      if (screen === 'stylist-clients') return 'clients';
      if (screen === 'admin-reports') return 'reports';
      return 'dashboard';
    }
    if (screen === 'stylist-clients') return 'clients';
    if (screen === 'stylist-reports') return 'reports';
    return 'schedule';
  })();

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      location.pathname.startsWith('/admin') &&
      (!isLoggedIn || role !== 'admin')
    ) {
      navigate('/cliente/inicio', { replace: true });
      return;
    }
    if (
      location.pathname.startsWith('/estilista') &&
      (!isLoggedIn || role !== 'stylist')
    ) {
      navigate('/cliente/inicio', { replace: true });
      return;
    }
    const isProtected = PROTECTED_PREFIXES.some(p => location.pathname.startsWith(p));
    if (isProtected && !isLoggedIn && location.pathname !== '/cliente/inicio') {
      navigate('/login', { replace: true });
    }
  }, [location.pathname, isLoggedIn, navigate, role]);

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const nav = (s: Screen) => navigate(SCREEN_TO_PATH[s]);

  const handleLogin = (r: UserRole, name = 'Juan García') => {
    setRole(r);
    setUserName(name);
    setIsLoggedIn(true);
    sessionStorage.setItem(SESSION_KEY_ROLE, r);
    sessionStorage.setItem(SESSION_KEY_AUTH, 'true');
    sessionStorage.setItem(SESSION_KEY_USER_NAME, name);
    if (r === 'admin') navigate('/admin/dashboard', { replace: true });
    else if (r === 'stylist') navigate('/estilista/mi-agenda', { replace: true });
    else navigate('/cliente/inicio', { replace: true });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    resetAccessibilityPreferences();
    sessionStorage.removeItem(SESSION_KEY_AUTH);
    sessionStorage.removeItem(SESSION_KEY_ROLE);
    sessionStorage.removeItem(SESSION_KEY_USER_NAME);
    navigate('/', { replace: true });
  };

  const startBooking = (serviceId?: string) => {
    setReschedulingAppointmentId(null);
    if (serviceId) {
      setBooking({ ...INITIAL_BOOKING, serviceId });
      nav('book-2');
    } else {
      setBooking(INITIAL_BOOKING);
      nav('book-1');
    }
  };

  const startRescheduling = (appointmentId: string, serviceId: string) => {
    setSelectedAppointmentId(appointmentId);
    setReschedulingAppointmentId(appointmentId);
    setBooking({ ...INITIAL_BOOKING, serviceId });
    nav('book-2');
  };

  const handleClientTab = (tab: ClientTab) => {
    if (tab === 'home') nav('client-home');
    else if (tab === 'book') { setBooking(INITIAL_BOOKING); nav('book-1'); }
    else if (tab === 'appointments') nav('my-appointments');
    else if (tab === 'profile') nav('profile');
  };

  const handleAdminTab = (tab: AdminTab) => {
    if (tab === 'dashboard') nav('admin-dashboard');
    else if (tab === 'services') nav('admin-services');
    else if (tab === 'team') nav('admin-team');
    else if (tab === 'clients') nav('stylist-clients');
    else if (tab === 'reports') nav('admin-reports');
  };

  const handleStylistTab = (tab: AdminTab) => {
    if (tab === 'schedule') nav('stylist-schedule');
    else if (tab === 'clients') nav('stylist-clients');
    else if (tab === 'reports') nav('stylist-reports');
  };

  // ── Determine layout ──────────────────────────────────────────────────────
  const onboardingScreens: Screen[] = ['splash', 'login', 'register', 'role-select', 'forgot-password'];
  const isAdminOrStylist = role !== 'client' && isLoggedIn && !onboardingScreens.includes(screen);
  const isClientWithNav = role === 'client' && isLoggedIn &&
    !onboardingScreens.includes(screen) &&
    screen !== 'splash' &&
    screen !== 'book-success' &&
    !screen.startsWith('book-');

  // ── Render screen ─────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen) {
      // ── Onboarding ──────────────────────────────────────────────────────────
      case 'splash':
        return (
          <Landing
            isLoggedIn={isLoggedIn}
            userName={userName}
            onLogin={() => nav('login')}
            onRegister={() => nav('register')}
            onBook={serviceId => {
              if (isLoggedIn) startBooking(serviceId);
              else nav('register');
            }}
            onProfile={() => nav('profile')}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onLogin={handleLogin}
            onRegister={() => nav('register')}
            onBack={() => nav('splash')}
            onForgotPassword={() => nav('forgot-password')}
          />
        );

      case 'forgot-password':
        return <ForgotPasswordScreen onBack={() => nav('login')} />;

      case 'register':
        return (
          <RegisterScreen
            onRegister={() => handleLogin('client')}
            onLogin={() => nav('login')}
            onBack={() => nav('splash')}
          />
        );

      case 'role-select':
        return <RoleSelectScreen onSelect={r => handleLogin(r)} />;

      // ── Client: Home / Catalog / Detail ──────────────────────────────────────
      case 'client-home':
        return (
          <ClientHome
            onBook={id => startBooking(id)}
            onViewService={id => { setSelectedServiceId(id); nav('service-detail'); }}
            userName={userName}
          />
        );

      case 'service-catalog':
        return (
          <ServiceCatalog
            onViewService={id => { setSelectedServiceId(id); nav('service-detail'); }}
            onBook={id => startBooking(id)}
            onBack={() => nav('client-home')}
          />
        );

      case 'service-detail':
        return selectedServiceId ? (
          <ServiceDetail
            serviceId={selectedServiceId}
            onBook={id => startBooking(id)}
            onBack={() => nav('service-catalog')}
          />
        ) : (() => { nav('service-catalog'); return null; })();

      // ── Booking Flow ──────────────────────────────────────────────────────────
      case 'book-1':
        return (
          <BookStep1
            onNext={id => { setBooking(b => ({ ...b, serviceId: id })); nav('book-2'); }}
            onBack={() => nav('client-home')}
          />
        );

      case 'book-2':
        if (!booking.serviceId) { nav('book-1'); return null; }
        return (
          <BookStep2
            serviceId={booking.serviceId}
            onNext={id => { setBooking(b => ({ ...b, stylistId: id })); nav('book-3'); }}
            onBack={() => nav('book-1')}
          />
        );

      case 'book-3':
        if (!booking.serviceId || !booking.stylistId) { nav('book-1'); return null; }
        return (
          <BookStep3
            serviceId={booking.serviceId}
            stylistId={booking.stylistId}
            initialDate={booking.date}
            onNext={(date, time, hold) => {
              setBooking(b => ({
                ...b,
                stylistId: hold.stylistId,
                date,
                time,
                holdId: hold.id,
                holdExpiresAt: hold.expiresAt,
              }));
              nav('book-4');
            }}
            onBack={() => nav('book-2')}
            onConflict={message => setToastMessage(message)}
          />
        );

      case 'book-4':
        if (!booking.serviceId || !booking.stylistId || !booking.date || !booking.time) {
          nav('book-1'); return null;
        }
        return (
          <BookStep4
            booking={booking}
            appointmentId={reschedulingAppointmentId}
            onConfirm={code => {
              if (reschedulingAppointmentId) {
                setReschedulingAppointmentId(null);
                setBooking(INITIAL_BOOKING);
                setToastMessage('Cita reprogramada exitosamente');
                nav('my-appointments');
                return;
              }
              setReservationCode(code);
              nav('book-success');
            }}
            onBack={() => {
              if (booking.holdId) void liberarTurno(booking.holdId);
              setBooking(current => ({ ...current, holdId: undefined, holdExpiresAt: undefined }));
              nav('book-3');
            }}
            onConflict={message => setToastMessage(message)}
            onChooseNewTime={() => {
              if (booking.holdId) void liberarTurno(booking.holdId);
              flushSync(() => {
                setBooking({ ...booking, time: null, holdId: undefined, holdExpiresAt: undefined });
                setReservationCode(null);
              });
              nav('book-3');
            }}
          />
        );

      case 'book-success':
        if (!booking.serviceId || !reservationCode) { nav('client-home'); return null; }
        return (
          <BookSuccess
            booking={booking}
            reservationCode={reservationCode}
            onGoToAppointments={() => nav('my-appointments')}
            onGoHome={() => nav('client-home')}
          />
        );

      // ── My Appointments ────────────────────────────────────────────────────
      case 'my-appointments':
        return (
          <MyAppointments
            onBook={() => startBooking()}
            onViewDetail={id => { setSelectedAppointmentId(id); nav('appointment-detail'); }}
            onReschedule={startRescheduling}
            onCancel={id => { setSelectedAppointmentId(id); nav('cancel-appointment'); }}
          />
        );

      case 'appointment-detail':
        return selectedAppointmentId ? (
          <AppointmentDetail
            appointmentId={selectedAppointmentId}
            onReschedule={serviceId => startRescheduling(selectedAppointmentId, serviceId)}
            onCancel={() => nav('cancel-appointment')}
            onRebook={id => startBooking(id)}
            onBack={() => nav('my-appointments')}
          />
        ) : (() => { nav('my-appointments'); return null; })();

      case 'cancel-appointment':
        return selectedAppointmentId ? (
          <CancelAppointment
            appointmentId={selectedAppointmentId}
            onConfirm={() => {
              setToastMessage('Cita cancelada');
              nav('my-appointments');
            }}
            onBack={() => nav('my-appointments')}
          />
        ) : (() => { nav('my-appointments'); return null; })();

      // ── Admin ──────────────────────────────────────────────────────────────
      case 'admin-dashboard':
        return <AdminDashboard />;

      case 'admin-services':
        return <AdminServices onBack={() => nav('admin-dashboard')} />;

      case 'admin-team':
        return <AdminTeam onBack={() => nav('admin-dashboard')} />;

      case 'admin-reports':
        return <AdminReports />;

      // ── Stylist ────────────────────────────────────────────────────────────
      case 'stylist-schedule':
        return <StylistSchedule />;

      case 'stylist-clients':
        return <StylistClients />;

      case 'stylist-reports':
        return <StylistPerformance />;

      // ── Profile ────────────────────────────────────────────────────────────
      case 'profile':
        return (
          <ProfileScreen
            role={role}
            onChangeRole={() => nav('role-select')}
            onLogout={handleLogout}
          />
        );

      default:
        return <SplashScreen onLogin={() => nav('login')} onRegister={() => nav('register')} />;
    }
  };

  // ── Layout wrappers ────────────────────────────────────────────────────────

  if (isAdminOrStylist) {
    return (
      <div className="flex h-full bg-[#FBF3E9]">
        <SideNav
          active={activeAdminTab}
          role={role as 'admin' | 'stylist'}
          onNavigate={role === 'admin' ? handleAdminTab : handleStylistTab}
          onLogout={handleLogout}
        />
        {/* Content: on mobile add top/bottom padding for fixed mobile bars */}
        <div className="flex-1 flex flex-col overflow-hidden pt-14 pb-16 md:pt-0 md:pb-0">
          {renderScreen()}
        </div>
        <GlobalToast message={toastMessage} onDismiss={dismissToast} />
        <AccessibilityWidget />
      </div>
    );
  }

  if (isClientWithNav) {
    return (
      <div className="flex flex-col h-full bg-[#FBF3E9]">
        <div className="flex-1 overflow-hidden">
          {renderScreen()}
        </div>
        <GlobalToast message={toastMessage} onDismiss={dismissToast} />
        <BottomNav active={clientTab} onNavigate={handleClientTab} />
        <AccessibilityWidget />
      </div>
    );
  }

  return (
    <div className="h-full bg-[#FBF3E9] overflow-hidden">
      {renderScreen()}
      <GlobalToast message={toastMessage} onDismiss={dismissToast} />
      <AccessibilityWidget />
    </div>
  );
}

function GlobalToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 3500);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div
      className="fixed bottom-24 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-xl"
      role="alert"
    >
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} aria-label="Cerrar notificación" className="font-bold">×</button>
    </div>
  );
}

// ─── PROFILE SCREEN ────────────────────────────────────────────────────────────

const MOCK_POINTS = 1240;
const MOCK_TOTAL_VISITS = 5;
const IS_VIP = MOCK_TOTAL_VISITS >= 20;

const REWARDS = [
  { id: 1, title: 'Descuento 10%', subtitle: 'En tu próximo servicio', points: 500, icon: '🏷️', available: true },
  { id: 2, title: 'Corte gratis', subtitle: 'Corte Clásico de regalo', points: 2000, icon: '✂️', available: false },
  { id: 3, title: 'Afeitado gratis', subtitle: 'Afeitado con navaja', points: 1500, icon: '🪒', available: true },
  { id: 4, title: 'Combo con 20%', subtitle: 'Corte + Barba con descuento', points: 1000, icon: '🎁', available: true },
];

function ProfileScreen({ role, onChangeRole, onLogout }: {
  role: UserRole;
  onChangeRole: () => void;
  onLogout: () => void;
}) {
  const [showReferral, setShowReferral] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [activeReward, setActiveReward] = useState<number | null>(null);
  const [rewardRedeemed, setRewardRedeemed] = useState<number | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('Juan García');
  const [editPhone, setEditPhone] = useState('+34 600 123 456');
  const [profileName, setProfileName] = useState('Juan García');
  const [profilePhone, setProfilePhone] = useState('+34 600 123 456');
  const [editSaved, setEditSaved] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const hasActiveAppointments = APPOINTMENTS.some(
    a => a.status === 'confirmed' || a.status === 'pending'
  );

  const handleRequestDelete = () => {
    setDeletePassword('');
    setDeletePasswordError('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deletePassword.length < 8) {
      setDeletePasswordError('Ingresa tu contraseña (mínimo 8 caracteres).');
      return;
    }
    setDeleteSuccess(true);
    setTimeout(() => onLogout(), 2200);
  };

  const handleCopyCode = () => {
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const referralCode = 'JUAN-BB2026';

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9] overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-[#E8734A] pt-12 pb-8 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/4" />
        <div className="flex flex-col items-center relative z-10">
          <div className="relative mb-3">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl border-4 border-white/30">
              👤
            </div>
            {IS_VIP && (
              <div className="absolute -top-1 -right-1 w-7 h-7 bg-[#F2A950] rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <span className="text-sm">👑</span>
              </div>
            )}
          </div>
          <h2 className="text-white font-black font-display text-xl">{profileName}</h2>
          <p className="text-white/80 text-sm">juan@correo.com</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-bold capitalize">
              {role === 'client' ? 'Cliente' : role === 'stylist' ? 'Estilista' : 'Administrador'}
            </span>
            {IS_VIP && (
              <span className="bg-[#F2A950] text-white text-xs px-3 py-1 rounded-full font-black flex items-center gap-1">
                👑 Cliente VIP
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        {role === 'client' && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Citas totales', value: MOCK_TOTAL_VISITS, color: '#E8734A' },
              { label: 'Este año', value: '3', color: '#F2A950' },
              { label: 'Completadas', value: '2', color: '#8B9D77' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-3 text-center shadow-[0_2px_12px_rgba(107,66,38,0.08)]">
                <div className="font-black text-xl font-display" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-[#C8A88A] font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {role === 'client' && !IS_VIP && (
          <div className="bg-white rounded-[20px] p-4 mb-5 shadow-[0_4px_20px_rgba(107,66,38,0.1)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">👑</span>
              <div className="flex-1">
                <div className="font-black text-[#6B4226] font-display text-sm">Camino al Cliente VIP</div>
                <div className="text-xs text-[#A67850]">{20 - MOCK_TOTAL_VISITS} citas más para desbloquear</div>
              </div>
              <span className="text-xs font-bold text-[#F2A950]">{MOCK_TOTAL_VISITS}/20</span>
            </div>
            <div className="h-2.5 bg-[#F5E6D3] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F2A950] to-[#E8734A] transition-all"
                style={{ width: `${(MOCK_TOTAL_VISITS / 20) * 100}%` }}
              />
            </div>
          </div>
        )}

        {role === 'client' && (
          <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(107,66,38,0.1)] overflow-hidden mb-5">
            <div className="bg-gradient-to-r from-[#6B4226] to-[#8B5E3C] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/70 text-xs font-semibold">TUS PUNTOS</div>
                  <div className="text-white font-black font-display text-2xl">{MOCK_POINTS.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl">🎁</div>
                  <div className="text-white/60 text-[10px] mt-1">+10 pts/visita</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
                <span>💡</span>
                <span>Gana puntos por cada servicio y al referir amigos</span>
              </div>
            </div>
            <div className="p-4">
              <h4 className="font-black text-[#6B4226] font-display text-sm mb-3">Canjear recompensas</h4>
              <div className="flex flex-col gap-2">
                {REWARDS.map(reward => {
                  const canRedeem = MOCK_POINTS >= reward.points;
                  const isRedeemed = rewardRedeemed === reward.id;
                  return (
                    <div
                      key={reward.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${canRedeem && !isRedeemed ? 'bg-[#FBF3E9] hover:bg-[#F5E6D3] cursor-pointer' : 'bg-[#F5E6D3] opacity-60'}`}
                      onClick={() => canRedeem && !isRedeemed && setActiveReward(reward.id)}
                    >
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                        {reward.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#6B4226] text-sm">{reward.title}</div>
                        <div className="text-xs text-[#A67850]">{reward.subtitle}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {isRedeemed ? (
                          <span className="text-xs font-bold text-[#4A7C59] bg-[#EAF2E3] px-2 py-1 rounded-full">✓ Canjeado</span>
                        ) : (
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${canRedeem ? 'text-[#E8734A] bg-[#FBF3E9]' : 'text-[#C8A88A] bg-[#F5E6D3]'}`}>
                            {reward.points.toLocaleString()} pts
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {role === 'client' && (
          <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(107,66,38,0.1)] overflow-hidden mb-5">
            <button
              onClick={() => setShowReferral(!showReferral)}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-[#FBF3E9] transition-colors cursor-pointer"
            >
              <span className="w-8 h-8 rounded-xl bg-[#FEF5E4] flex items-center justify-center text-base flex-shrink-0">🎁</span>
              <div className="flex-1">
                <span className="font-semibold text-[#6B4226] text-sm block">Referir a un amigo</span>
                <span className="text-xs text-[#A67850]">Gana 200 puntos por cada amigo</span>
              </div>
              <span className="text-[#C8A88A] text-lg">{showReferral ? '∧' : '›'}</span>
            </button>
            {showReferral && (
              <div className="px-4 pb-4">
                <p className="text-xs text-[#A67850] mb-3">Comparte tu código. Cuando tu amigo reserve su primera cita, ¡ambos ganan 200 puntos!</p>
                <div className="flex items-center gap-2 bg-[#FBF3E9] rounded-2xl p-3 mb-3">
                  <span className="flex-1 text-center font-black text-[#E8734A] text-lg tracking-widest">{referralCode}</span>
                  <button
                    onClick={handleCopyCode}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${referralCopied ? 'bg-[#EAF2E3] text-[#4A7C59]' : 'bg-[#E8734A] text-white'}`}
                  >
                    {referralCopied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 rounded-2xl bg-[#E8734A] text-white text-xs font-bold hover:bg-[#C85A31] transition-colors cursor-pointer">
                    📤 Compartir código
                  </button>
                  <button className="flex-1 py-2.5 rounded-2xl bg-[#25D366] text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer">
                    💬 WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(107,66,38,0.1)] overflow-hidden mb-4">
          {[
            { icon: '✏️', label: 'Editar perfil', action: () => { setEditName(profileName); setEditPhone(profilePhone); setEditSaved(false); setShowEditModal(true); } },
            { icon: '🔔', label: 'Notificaciones' },
            { icon: '🔒', label: 'Cambiar contraseña' },
            { icon: '📍', label: 'Dirección favorita' },
            { icon: '💳', label: 'Métodos de pago' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={'action' in item ? item.action : undefined}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-[#FBF3E9] transition-colors border-b border-[#F5E6D3] last:border-0 cursor-pointer"
            >
              <span className="w-8 h-8 rounded-xl bg-[#FBF3E9] flex items-center justify-center text-base flex-shrink-0">{item.icon}</span>
              <span className="font-semibold text-[#6B4226] text-sm flex-1">{item.label}</span>
              <span className="text-[#C8A88A] text-lg">›</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(107,66,38,0.1)] overflow-hidden mb-4">
          <button
            onClick={onChangeRole}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-[#FBF3E9] transition-colors cursor-pointer"
          >
            <span className="w-8 h-8 rounded-xl bg-[#FBF3E9] flex items-center justify-center">🔐</span>
            <span className="font-semibold text-[#6B4226] text-sm flex-1">Cambiar rol (demo)</span>
            <span className="text-[#C8A88A] text-lg">›</span>
          </button>
        </div>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[20px] bg-[#FFF5F5] border-2 border-[#F0C0BE] text-[#C45C4C] font-bold text-sm hover:bg-[#FFE8E8] transition-colors cursor-pointer mb-3"
        >
          🚪 Cerrar sesión
        </button>

        {role === 'client' && (
          <button
            onClick={handleRequestDelete}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[20px] text-[#A67850] font-semibold text-xs hover:text-[#C45C4C] transition-colors cursor-pointer"
          >
            🗑 Solicitar eliminación de cuenta
          </button>
        )}
      </div>

      {/* Reward redeem confirmation modal */}
      {activeReward !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl">
            {(() => {
              const reward = REWARDS.find(r => r.id === activeReward);
              if (!reward) return null;
              return (
                <>
                  <div className="text-center mb-5">
                    <div className="text-4xl mb-2">{reward.icon}</div>
                    <h3 className="font-black text-[#6B4226] font-display text-xl">{reward.title}</h3>
                    <p className="text-[#A67850] text-sm mt-1">{reward.subtitle}</p>
                    <div className="mt-3 inline-flex items-center gap-1 bg-[#FBF3E9] px-3 py-1.5 rounded-full">
                      <span className="text-sm font-black text-[#E8734A]">{reward.points.toLocaleString()} pts</span>
                      <span className="text-xs text-[#A67850]">de {MOCK_POINTS.toLocaleString()} disponibles</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setRewardRedeemed(reward.id); setActiveReward(null); }}
                      className="w-full py-3.5 bg-[#E8734A] text-white font-black rounded-[14px] hover:bg-[#C85A31] transition-colors shadow-[0_4px_16px_rgba(232,115,74,0.4)] cursor-pointer"
                    >
                      ✅ Confirmar canje
                    </button>
                    <button
                      onClick={() => setActiveReward(null)}
                      className="w-full py-3 text-[#A67850] font-semibold text-sm cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Edit profile modal — HU-04 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl">
            {editSaved ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="font-black text-[#6B4226] font-display text-xl">Perfil actualizado</h3>
                <p className="text-[#A67850] text-sm mt-1">Tus datos han sido guardados correctamente.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-[#FBF3E9] rounded-2xl flex items-center justify-center text-xl">✏️</div>
                  <h3 className="font-black text-[#6B4226] font-display text-xl">Editar perfil</h3>
                </div>
                <div className="flex flex-col gap-4 mb-5">
                  <div>
                    <label className="text-sm font-semibold text-[#6B4226] block mb-1.5">Nombre completo</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full rounded-[14px] border-2 border-[#EDD8BC] focus:border-[#E8734A] bg-white px-4 py-3 text-[#6B4226] font-medium text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#6B4226] block mb-1.5">Teléfono móvil</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      className="w-full rounded-[14px] border-2 border-[#EDD8BC] focus:border-[#E8734A] bg-white px-4 py-3 text-[#6B4226] font-medium text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setProfileName(editName);
                      setProfilePhone(editPhone);
                      setEditSaved(true);
                      setTimeout(() => setShowEditModal(false), 1500);
                    }}
                    className="w-full py-3.5 bg-[#E8734A] text-white font-black rounded-[14px] hover:bg-[#C85A31] transition-colors cursor-pointer shadow-[0_4px_16px_rgba(232,115,74,0.4)]"
                  >
                    Guardar cambios
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="w-full py-3 text-[#A67850] font-semibold text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl">
            {deleteSuccess ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="font-black text-[#6B4226] font-display text-xl mb-2">Cuenta eliminada</h3>
                <p className="text-[#A67850] text-sm">Tus datos han sido anonimizados. Cerrando sesión...</p>
              </div>
            ) : hasActiveAppointments ? (
              <>
                <div className="text-center mb-5">
                  <div className="text-4xl mb-3">⚠️</div>
                  <h3 className="font-black text-[#6B4226] font-display text-xl">No puedes eliminar tu cuenta</h3>
                  <p className="text-[#A67850] text-sm mt-3 leading-relaxed">
                    Tienes citas activas pendientes. Cancela tus citas primero antes de solicitar la eliminación de tu cuenta.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-3.5 bg-[#E8734A] text-white font-black rounded-[14px] hover:bg-[#C85A31] transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 bg-[#FFF5F5] rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                    🗑
                  </div>
                  <h3 className="font-black text-[#6B4226] font-display text-xl">Eliminar cuenta</h3>
                  <p className="text-[#A67850] text-sm mt-2 leading-relaxed">
                    Esta acción es irreversible. Tu correo y teléfono serán anonimizados. El historial de citas se conservará de forma anónima.
                  </p>
                </div>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-[#6B4226] block mb-1.5">
                    Confirma tu contraseña
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={e => { setDeletePassword(e.target.value); setDeletePasswordError(''); }}
                    placeholder="Tu contraseña actual"
                    className={`w-full rounded-[14px] border-2 bg-white px-4 py-3 text-[#6B4226] placeholder-[#C8A88A] font-medium text-sm outline-none transition-all ${deletePasswordError ? 'border-[#C45C4C] bg-[#FFF5F5]' : 'border-[#EDD8BC] focus:border-[#E8734A]'}`}
                  />
                  {deletePasswordError && (
                    <p className="text-xs font-medium text-[#C45C4C] mt-1">{deletePasswordError}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleConfirmDelete}
                    className="w-full py-3.5 bg-[#C45C4C] text-white font-black rounded-[14px] hover:bg-[#A84A3A] transition-colors cursor-pointer"
                  >
                    Sí, eliminar mi cuenta
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="w-full py-3 text-[#A67850] font-semibold text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🚪</div>
              <h3 className="font-black text-[#6B4226] font-display text-xl">¿Cerrar sesión?</h3>
              <p className="text-[#A67850] text-sm mt-2">Tendrás que volver a iniciar sesión para acceder a tu cuenta.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={onLogout}
                className="w-full py-3.5 bg-[#C45C4C] text-white font-black rounded-[14px] hover:bg-[#A84A3A] transition-colors cursor-pointer"
              >
                Sí, cerrar sesión
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-3 text-[#A67850] font-semibold text-sm cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
