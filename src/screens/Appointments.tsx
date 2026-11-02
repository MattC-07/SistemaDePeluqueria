import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { getService, getStylist, formatPrice, formatDuration, CATEGORY_CONFIG, STATUS_CONFIG, type Appointment } from '../data';
import { StatusBadge, Button, Card, PageHeader, EmptyState } from '../ui';
import { EmptyAppointmentsIllustration, MemphisStylistAvatar } from '../illustrations';
import { AppointmentAccessError, AppointmentActionError, canManageAppointment, cancelMyAppointment, getMyAppointment, getMyAppointments, requestAppointmentReschedule } from '../services/bookingService';

// ─── MY APPOINTMENTS ───────────────────────────────────────────────────────────

export function MyAppointments({ onBook, onViewDetail, onReschedule, onCancel, onBack }: {
  onBook: () => void;
  onViewDetail?: (id: string) => void;
  onReschedule?: (appointmentId: string, serviceId: string) => void;
  onCancel?: (id: string) => void;
  onBack?: () => void;
}) {
  const currentTimestamp = useCurrentTimestamp();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'access' | 'generic' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'cancel' | 'reschedule' | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getMyAppointments()
      .then(result => { if (active) setAppointments(result); })
      .catch(reason => {
        if (!active) return;
        setError(reason instanceof AppointmentAccessError ? 'access' : 'generic');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const upcoming = appointments.filter(a =>
    isAppointmentFuture(a, currentTimestamp) && (a.status === 'confirmed' || a.status === 'pending'),
  );
  const past = appointments.filter(a => !isAppointmentFuture(a, currentTimestamp) || a.status === 'completed' || a.status === 'cancelled');
  const list = activeTab === 'upcoming' ? upcoming : past;

  useEffect(() => {
    if (!selectedAppointment) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const focusable = () => dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelectedAppointment(null); return; }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (!elements?.length) return;
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === firstElement || document.activeElement === dialogRef.current)) {
        event.preventDefault(); lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault(); firstElement.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [selectedAppointment]);

  const openDetail = (appointment: Appointment) => {
    setActionError(null);
    setSelectedAppointment(appointment);
  };

  const handleCancel = async () => {
    if (!selectedAppointment) return;
    if (onCancel) {
      const appointmentId = selectedAppointment.id;
      setSelectedAppointment(null);
      onCancel(appointmentId);
      return;
    }
    setActionLoading('cancel'); setActionError(null);
    try {
      await cancelMyAppointment(selectedAppointment.id);
      setAppointments(current => current.map(item =>
        item.id === selectedAppointment.id ? { ...item, status: 'cancelled' } : item,
      ));
      setSelectedAppointment(null);
    } catch (reason) {
      setActionError(getAppointmentActionMessage(reason, 'cancel'));
    } finally { setActionLoading(null); }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment) return;
    setActionLoading('reschedule'); setActionError(null);
    try {
      await requestAppointmentReschedule(selectedAppointment.id);
      setSelectedAppointment(null);
      if (onReschedule) onReschedule(selectedAppointment.id, selectedAppointment.serviceId);
      else onViewDetail?.(selectedAppointment.id);
    } catch (reason) {
      setActionError(getAppointmentActionMessage(reason, 'reschedule'));
    } finally { setActionLoading(null); }
  };

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, tab: 'upcoming' | 'past') => {
    const tabs = ['upcoming', 'past'] as const;
    const index = tabs.indexOf(tab);
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? tabs.length - 1
      : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    setActiveTab(tabs[nextIndex]);
    document.getElementById(`${tabs[nextIndex]}-appointments-tab`)?.focus();
  };

  return (
    <main aria-label="Mis citas" className="flex flex-col h-full bg-[#FBF3E9]">
      <header className="bg-white px-5 pt-10 pb-0 shadow-[0_2px_12px_rgba(107,66,38,0.06)]">
        <PageHeader title="Mis Citas" subtitle="Gestiona todas tus reservas" onBack={onBack} />

        {/* Tabs */}
        <div className="flex px-5 gap-1" role="tablist" aria-label="Filtrar citas">
          {(['upcoming', 'past'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              onKeyDown={event => handleTabKeyDown(event, tab)}
              role="tab"
              aria-label={tab === 'upcoming' ? `Próximas citas, ${upcoming.length}` : `Historial de citas, ${past.length}`}
              aria-selected={activeTab === tab}
              aria-controls={`${tab}-appointments-panel`}
              id={`${tab}-appointments-tab`}
              tabIndex={activeTab === tab ? 0 : -1}
              className={`
                flex-1 py-3 text-sm font-bold transition-all duration-200 border-b-2
                ${activeTab === tab
                  ? 'text-[#87371E] border-[#87371E]'
                  : 'text-[#6B4226] border-transparent hover:text-[#3D2415]'
                }
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D2415]
              `}
            >
              {tab === 'upcoming' ? `Próximas (${upcoming.length})` : `Historial (${past.length})`}
            </button>
          ))}
        </div>
      </header>

      <section
        id={`${activeTab}-appointments-panel`}
        role="tabpanel"
        aria-label={activeTab === 'upcoming' ? 'Próximas citas' : 'Historial de citas'}
        aria-labelledby={`${activeTab}-appointments-tab`}
        aria-busy={loading}
        tabIndex={0}
        className="flex-1 overflow-y-auto px-5 py-5 pb-24"
      >
        {loading ? (
          <AppointmentSkeletonList />
        ) : error ? (
          <SecureAppointmentsError accessDenied={error === 'access'} />
        ) : list.length === 0 ? (
          <EmptyState
            illustration={<EmptyAppointmentsIllustration />}
            title={activeTab === 'upcoming' ? 'Sin citas próximas' : 'Sin historial aún'}
            subtitle={activeTab === 'upcoming'
              ? 'Aún no tienes ninguna cita reservada. ¡Anímate a reservar ahora!'
              : 'Aquí aparecerán tus citas pasadas una vez las tengas.'
            }
            action={
              activeTab === 'upcoming'
                ? <Button onClick={onBook} variant="primary" size="md" ariaLabel="Reservar mi primera cita">Reservar mi primera cita</Button>
                : undefined
            }
          />
        ) : (
          <ul role="list" aria-label={activeTab === 'upcoming' ? 'Próximas citas' : 'Historial de citas'} className="flex flex-col gap-3">
            {list.map(appointment => (
              <li key={appointment.id}>
                <AppointmentCard
                  appointment={appointment}
                  now={currentTimestamp}
                  onClick={() => openDetail(appointment)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      {selectedAppointment && (
        <AppointmentDialog
          appointment={selectedAppointment}
          dialogRef={dialogRef}
          actionError={actionError}
          actionLoading={actionLoading}
          canManage={canManageAppointment(selectedAppointment, currentTimestamp)}
          onClose={() => setSelectedAppointment(null)}
          onCancel={upcoming.some(item => item.id === selectedAppointment.id) ? handleCancel : undefined}
          onReschedule={upcoming.some(item => item.id === selectedAppointment.id) ? handleReschedule : undefined}
        />
      )}
    </main>
  );
}

// ─── APPOINTMENT CARD ──────────────────────────────────────────────────────────

function AppointmentCard({ appointment, now, onClick }: { appointment: Appointment; now: number; onClick: () => void }) {
  const service = getService(appointment.serviceId);
  const stylist = getStylist(appointment.stylistId);
  if (!service || !stylist) return null;

  const [y, m, d] = appointment.date.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayNum = dateObj.getDate();
  const month = dateObj.toLocaleDateString('es-ES', { month: 'short' });
  const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
  const relativeCreatedAt = getRelativeTime(appointment.createdAt);
  const startsAt = new Date(`${appointment.date}T${appointment.time}:00-05:00`).getTime();
  const isActive = (appointment.status === 'confirmed' || appointment.status === 'pending') && startsAt > now;
  const countdown = formatCountdown(startsAt - now);

  return (
    <Card padding={false}>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left rounded-[20px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D2415]"
        aria-label={`Ver detalle de la cita ${service.name}, ${dateObj.toLocaleDateString('es-ES')} a las ${appointment.time}${isActive ? `, faltan ${countdown}` : ''}`}
      >
      <div className="p-4 flex items-start gap-3">
        {/* Date block */}
        <div className="flex-shrink-0 w-14 bg-[#FBF3E9] rounded-2xl flex flex-col items-center justify-center py-2 px-1">
          <span className="text-[10px] font-bold text-[#6B4226] uppercase">{month}</span>
          <span className="text-2xl font-black text-[#A84425] leading-none">{dayNum}</span>
          <span className="text-[10px] font-bold text-[#6B4226] capitalize">{dayName}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="font-black font-display text-[#6B4226] text-base leading-tight">{service.name}</span>
            <StatusBadge status={appointment.status} />
          </div>
          {isActive && (
            <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-xl border border-[#87371E] bg-[#FFF7F0] px-3 py-2 text-sm font-bold text-[#662A17]">
              <span aria-hidden="true">⏳</span>
              <span>Tu cita empieza en</span>
              <time
                dateTime={`${appointment.date}T${appointment.time}:00-05:00`}
                aria-label={`Tiempo restante: ${countdown}`}
                aria-live="off"
                role="timer"
                className="font-mono tabular-nums"
              >
                {countdown}
              </time>
            </div>
          )}
          {relativeCreatedAt && (
            <p className="mt-1 text-[11px] font-semibold text-[#6B4226]">
              Hace: {relativeCreatedAt}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <MemphisStylistAvatar name={stylist.name} color={stylist.color} size={22} />
            <span className="text-xs text-[#6B4226] font-medium">{stylist.name}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs font-semibold text-[#6B4226]">
            <span className="flex items-center gap-1">🕐 {appointment.time}</span>
            <span className="flex items-center gap-1">⏱ {formatDuration(service.duration)}</span>
            <span className="flex items-center gap-1 text-[#A84425]">💰 {formatPrice(service.price)}</span>
          </div>
        </div>
      </div>
      </button>
    </Card>
  );
}

function getRelativeTime(createdAt?: string): string | null {
  if (!createdAt) return null;
  const elapsedMilliseconds = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds < 0) return "unos segundos";
  const minutes = Math.floor(elapsedMilliseconds / 60_000);
  if (minutes < 1) return "menos de un minuto";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "día" : "días"}`;
}

function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  return days > 0 ? `${days} d ${clock}` : clock;
}

function useCurrentTimestamp(): number {
  const [timestamp, setTimestamp] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setTimestamp(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return timestamp;
}

function isAppointmentFuture(appointment: Pick<Appointment, 'date' | 'time'>, now = Date.now()): boolean {
  return new Date(`${appointment.date}T${appointment.time}:00-05:00`).getTime() > now;
}

function getAppointmentRestrictionMessage(appointment: Appointment, now = Date.now()): string {
  const startsAt = new Date(`${appointment.date}T${appointment.time}:00-05:00`).getTime();
  if (startsAt <= now) return 'Esta cita ya comenzó o pasó y no se puede gestionar desde la web.';
  return 'Para cancelar o reprogramar, deben faltar al menos 2 horas. Si falta menos tiempo, comunícate directamente por teléfono con la peluquería.';
}

function getAppointmentActionMessage(reason: unknown, action: 'cancel' | 'reschedule'): string {
  if (reason instanceof AppointmentAccessError) return 'No tienes permisos para gestionar esta información.';
  if (reason instanceof AppointmentActionError) return reason.message;
  return action === 'cancel'
    ? 'No fue posible cancelar la cita. Inténtalo nuevamente.'
    : 'No fue posible reprogramar la cita. Inténtalo nuevamente.';
}

function AppointmentSkeletonList() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Cargando tus citas" aria-busy="true">
      <span className="sr-only">Cargando tus citas</span>
      {[1, 2, 3].map(item => (
        <div key={item} aria-hidden="true" className="h-32 rounded-[20px] bg-white motion-safe:animate-pulse shadow-[0_4px_24px_-4px_rgba(107,66,38,0.12)]" />
      ))}
    </div>
  );
}

function ActionSpinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin motion-reduce:animate-none"
    />
  );
}

function SecureAppointmentsError({ accessDenied }: { accessDenied: boolean }) {
  return (
    <div role="alert" className="rounded-[20px] bg-white p-6 text-center shadow-[0_4px_24px_-4px_rgba(107,66,38,0.12)]">
      <p className="text-3xl mb-3" aria-hidden="true">🔒</p>
      <h2 className="font-black text-[#6B4226] font-display">No podemos mostrar tus citas</h2>
      <p className="mt-2 text-sm text-[#6B4226]">
        {accessDenied ? 'No tienes permisos para consultar esta información.' : 'No fue posible cargar tus reservas. Inténtalo nuevamente.'}
      </p>
    </div>
  );
}

function AppointmentDialog({
  appointment, dialogRef, actionError, actionLoading, canManage, onClose, onCancel, onReschedule,
}: {
  appointment: Appointment;
  dialogRef: RefObject<HTMLDivElement | null>;
  actionError: string | null;
  actionLoading: 'cancel' | 'reschedule' | null;
  canManage: boolean;
  onClose: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
}) {
  const service = getService(appointment.serviceId);
  const stylist = getStylist(appointment.stylistId);
  if (!service || !stylist) return null;
  const [year, month, day] = appointment.date.split('-').map(Number);
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D2415]/60 p-4">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="appointment-dialog-title" tabIndex={-1} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl focus:outline-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#6B4226]">Reserva {appointment.id}</p>
            <h2 id="appointment-dialog-title" className="mt-1 font-black font-display text-xl text-[#6B4226]">{service.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="rounded-full p-2 text-xl text-[#6B4226] hover:bg-[#FBF3E9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6B4226]">×</button>
        </div>
        <section className="mt-4" aria-label={`Estado de la cita: ${STATUS_CONFIG[appointment.status].label}`}><StatusBadge status={appointment.status} /></section>
        <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <DetailItem label="Estilista" value={stylist.name} />
          <DetailItem label="Servicio" value={service.name} />
          <DetailItem label="Precio" value={formatPrice(service.price)} />
          <DetailItem label="Fecha" value={formattedDate} />
          <DetailItem label="Hora" value={appointment.time} />
          <DetailItem label="Duración" value={formatDuration(service.duration)} />
        </dl>
        {(onCancel || onReschedule) && !canManage && (
          <p id="appointment-action-restriction" role="status" className="mt-4 rounded-xl bg-[#FFF5F5] p-3 text-sm font-semibold text-[#7C2C20]">
            {getAppointmentRestrictionMessage(appointment)}
          </p>
        )}
        {actionError && <p id="appointment-action-error" role="alert" className="mt-4 rounded-xl bg-[#FFF5F5] p-3 text-sm font-semibold text-[#7C2C20]">{actionError}</p>}
        {actionLoading && <p className="sr-only" role="status" aria-live="polite">
          {actionLoading === 'cancel' ? 'Cancelando la cita...' : 'Validando la reprogramación...'}
        </p>}
        {(onCancel || onReschedule) && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {onReschedule && <Button onClick={onReschedule} variant="secondary" fullWidth ariaLabel="Reprogramar esta cita" disabled={Boolean(actionLoading) || !canManage} ariaBusy={actionLoading === 'reschedule'} ariaDescribedBy={!canManage ? 'appointment-action-restriction' : undefined}>
              {actionLoading === 'reschedule' ? <><ActionSpinner /> Validando...</> : 'Reprogramar'}
            </Button>}
            {onCancel && <Button onClick={onCancel} variant="danger" fullWidth ariaLabel="Cancelar esta cita" disabled={Boolean(actionLoading) || !canManage} ariaBusy={actionLoading === 'cancel'} ariaDescribedBy={!canManage ? 'appointment-action-restriction' : undefined}>
              {actionLoading === 'cancel' ? <><ActionSpinner /> Cancelando...</> : 'Cancelar'}
            </Button>}
          </div>
        )}
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-bold uppercase tracking-wide text-[#6B4226]">{label}</dt><dd className="mt-1 font-semibold text-[#6B4226]">{value}</dd></div>;
}

// ─── APPOINTMENT DETAIL ────────────────────────────────────────────────────────

export function AppointmentDetail({ appointmentId, onReschedule, onCancel, onRebook, onBack }: {
  appointmentId: string;
  onReschedule: (serviceId: string) => void;
  onCancel: () => void;
  onRebook: (serviceId: string) => void;
  onBack: () => void;
}) {
  const currentTimestamp = useCurrentTimestamp();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [tipCustom, setTipCustom] = useState('');
  const [tipSent, setTipSent] = useState(false);
  const [tipLoading, setTipLoading] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [appointmentLoadError, setAppointmentLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setAppointment(null);
    setAppointmentLoadError(false);
    getMyAppointment(appointmentId)
      .then(result => { if (active) setAppointment(result); })
      .catch(() => {
        if (active) {
          setAppointment(null);
          setAppointmentLoadError(true);
        }
      });
    return () => { active = false; };
  }, [appointmentId]);

  const handleReviewSubmit = () => {
    if (reviewRating === 0) return;
    setReviewLoading(true);
    setTimeout(() => { setReviewLoading(false); setReviewSubmitted(true); }, 800);
  };

  const handleTip = () => {
    const amount = tipAmount === 'custom' ? tipCustom : tipAmount;
    if (!amount) return;
    setTipLoading(true);
    setTimeout(() => { setTipLoading(false); setTipSent(true); }, 800);
  };

  if (!appointment) {
    return (
      <main aria-label="Detalle de la cita" className="flex h-full flex-col bg-[#FBF3E9]">
        <header className="bg-white px-5 pt-10 pb-4 shadow-[0_2px_12px_rgba(107,66,38,0.06)]">
          <PageHeader title="Detalle de Cita" onBack={onBack} />
        </header>
        <p className="m-5 rounded-2xl bg-white p-5 text-center text-sm font-semibold text-[#6B4226]" role={appointmentLoadError ? 'alert' : 'status'}>
          {appointmentLoadError ? 'No pudimos cargar los detalles de esta cita. Vuelve a Mis Citas e inténtalo nuevamente.' : 'Cargando los detalles de tu cita...'}
        </p>
      </main>
    );
  }

  const service = getService(appointment.serviceId);
  const stylist = getStylist(appointment.stylistId);
  if (!service || !stylist) return null;

  const [y, m, d] = appointment.date.split('-').map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const isActive = appointment.status === 'confirmed' || appointment.status === 'pending';
  const canManage = canManageAppointment(appointment, currentTimestamp);

  return (
    <main aria-label={`Detalle de la cita ${service.name}`} className="flex flex-col h-full bg-[#FBF3E9]">
      <header className="bg-white px-5 pt-10 pb-4 shadow-[0_2px_12px_rgba(107,66,38,0.06)]">
        <PageHeader title="Detalle de Cita" onBack={onBack} />
      </header>

      <section aria-label={`Información de la cita ${service.name}`} className="flex-1 overflow-y-auto px-5 py-5 pb-28">
        {/* Status header */}
        <section aria-label={`Estado de la cita: ${STATUS_CONFIG[appointment.status].label}`} className="rounded-[20px] p-5 mb-5 flex items-center gap-4"
          style={{ background: STATUS_CONFIG[appointment.status].bg }}>
          <div aria-hidden="true" className="w-14 h-14 rounded-2xl bg-white/60 flex items-center justify-center text-3xl flex-shrink-0">
            {CATEGORY_CONFIG[service.category].emoji}
          </div>
          <div className="flex-1">
            <div className="font-black font-display text-[#6B4226] text-lg">{service.name}</div>
            <StatusBadge status={appointment.status} />
            </div>
        </section>

        {/* Details */}
        <Card className="mb-5">
          <h3 className="font-black text-[#6B4226] font-display mb-4">Información de la cita</h3>
          {[
            { icon: '📅', label: 'Fecha', value: formattedDate },
            { icon: '🕐', label: 'Hora', value: appointment.time },
            { icon: '⏱', label: 'Duración', value: formatDuration(service.duration) },
            { icon: '💰', label: 'Precio', value: formatPrice(service.price) },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 mb-3">
              <div aria-hidden="true" className="w-9 h-9 bg-[#FBF3E9] rounded-xl flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div>
              <div className="text-[10px] font-semibold text-[#6B4226] uppercase tracking-wide">{item.label}</div>
                <div className="font-semibold text-[#6B4226] text-sm capitalize">{item.value}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Stylist card */}
        <Card className="mb-5">
          <h3 className="font-black text-[#6B4226] font-display mb-3">Tu estilista</h3>
          <div className="flex items-center gap-3">
            <MemphisStylistAvatar name={stylist.name} color={stylist.color} size={52} />
            <div className="flex-1">
              <div className="font-black text-[#6B4226] font-display">{stylist.name}</div>
              <div className="text-sm text-[#6B4226]">{stylist.specialty}</div>
              <div className="flex items-center gap-1 mt-1">
                <span aria-hidden="true" className="text-[#F2A950] text-sm">★</span>
                <span className="text-sm font-bold text-[#6B4226]">{stylist.rating}</span>
                <span className="text-xs text-[#6B4226]">({stylist.reviewCount} reseñas)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Completed: review + tip */}
        {appointment.status === 'completed' && (
          <>
            {/* Review card */}
            <Card className="mb-4">
              {reviewSubmitted ? (
                <div className="text-center py-3">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-black text-[#6B4226] font-display">¡Gracias por tu reseña!</p>
                  <p className="text-sm text-[#6B4226] mt-1">Tu opinión ayuda a mejorar el servicio</p>
                  <div className="flex justify-center gap-0.5 mt-2" role="img" aria-label={`Calificación enviada: ${reviewRating} de 5 estrellas`}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} aria-hidden="true" className={`text-lg ${s <= reviewRating ? 'text-[#F2A950]' : 'text-[#EDD8BC]'}`}>★</span>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <h4 className="font-black text-[#6B4226] font-display mb-1">¿Cómo fue tu experiencia?</h4>
                  <p className="text-sm text-[#6B4226] mb-3">Tu reseña es muy valiosa para nosotros</p>
                  {/* Star selector */}
                  <div className="flex gap-1 mb-3" role="group" aria-label="Califica tu experiencia del 1 al 5">
                    {[1,2,3,4,5].map(star => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`${star} de 5 estrellas`}
                        aria-pressed={reviewRating === star}
                        onClick={() => setReviewRating(star)}
                        className={`min-h-11 min-w-11 rounded-lg text-3xl transition-all hover:scale-110 active:scale-95 motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D2415] ${star <= reviewRating ? 'text-[#A66A16]' : 'text-[#6B4226]'}`}
                      >
                        <span aria-hidden="true">★</span>
                      </button>
                    ))}
                    {reviewRating > 0 && (
                      <span className="text-sm text-[#6B4226] self-center ml-1 font-medium" aria-live="polite">
                        {['','Muy malo','Malo','Regular','Bueno','¡Excelente!'][reviewRating]}
                      </span>
                    )}
                  </div>
                  {/* Comment */}
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    aria-label="Comentario de la reseña, opcional"
                    placeholder="Cuéntanos tu experiencia (opcional)..."
                    rows={3}
                    className="w-full rounded-[14px] border-2 border-[#EDD8BC] bg-[#FBF3E9] px-4 py-3 text-sm text-[#6B4226] placeholder-[#6B4226] focus:border-[#87371E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3D2415] resize-none transition-colors mb-3"
                  />
                  {reviewRating === 0 && (
                    <div className="flex items-center gap-2 bg-[#FEF5E4] rounded-xl p-2.5 mb-3">
                      <span aria-hidden="true" className="text-sm">⚠️</span>
                      <p className="text-xs text-[#8B6914] font-medium">Selecciona al menos una estrella para enviar</p>
                    </div>
                  )}
                  <Button onClick={handleReviewSubmit} variant="primary" size="md" fullWidth ariaLabel="Enviar reseña" disabled={reviewRating === 0 || reviewLoading} ariaBusy={reviewLoading}>
                    {reviewLoading ? <><ActionSpinner /> Enviando...</> : '✉️ Enviar reseña'}
                  </Button>
                </>
              )}
            </Card>

            {/* Tip card */}
            <Card className="mb-4 bg-[#FBF3E9] border-2 border-[#EDD8BC]">
              {tipSent ? (
                <div className="text-center py-2">
                  <div className="text-3xl mb-1">💛</div>
                  <p className="font-black text-[#6B4226] font-display">¡Propina enviada!</p>
                  <p className="text-sm text-[#6B4226]">
                    ${tipAmount === 'custom' ? tipCustom : tipAmount} enviados a {stylist.name}. Muy amable de tu parte.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-black text-[#6B4226] font-display">Dejar propina 💛</h4>
                      <p className="text-xs text-[#6B4226]">100% va al estilista</p>
                    </div>
                    {!showTip && (
                      <Button onClick={() => setShowTip(true)} variant="secondary" size="sm" ariaLabel={`Dejar propina a ${stylist.name}`}>
                        Dejar propina
                      </Button>
                    )}
                  </div>
                  {showTip && (
                    <>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {['2', '5', '10', 'custom'].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            aria-pressed={tipAmount === amt}
                            aria-label={amt === 'custom' ? 'Elegir monto personalizado' : `Elegir propina de $${amt}`}
                            onClick={() => setTipAmount(amt)}
                            className={`min-h-11 rounded-2xl px-2 text-sm font-bold transition-all motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D2415] ${
                              tipAmount === amt
                                ? 'bg-[#A84425] text-white shadow-[0_4px_12px_rgba(135,55,30,0.3)]'
                                : 'bg-white border-2 border-[#EDD8BC] text-[#6B4226] hover:border-[#87371E]'
                            }`}
                          >
                            {amt === 'custom' ? '✏️' : `$${amt}`}
                          </button>
                        ))}
                      </div>
                      {tipAmount === 'custom' && (
                        <div className="mb-3 relative">
                          <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B4226] font-bold">$</span>
                          <input
                            type="number"
                            aria-label="Monto personalizado de propina"
                            min="1"
                            value={tipCustom}
                            onChange={e => setTipCustom(e.target.value)}
                            placeholder="Escribe el monto"
                            className="w-full rounded-[14px] border-2 border-[#EDD8BC] bg-white pl-8 pr-4 py-3 text-sm text-[#6B4226] focus:border-[#87371E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3D2415] motion-reduce:transition-none transition-colors"
                          />
                        </div>
                      )}
                      {tipAmount && (
                        <Button onClick={handleTip} variant="primary" size="md" fullWidth ariaLabel="Enviar propina" disabled={tipLoading || (tipAmount === 'custom' && !tipCustom)} ariaBusy={tipLoading}>
                          {tipLoading ? <><ActionSpinner /> Procesando...</> : `Enviar $${tipAmount === 'custom' ? tipCustom || '—' : tipAmount} de propina`}
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </Card>
          </>
        )}
      </section>

      {/* Action buttons */}
      <footer aria-label="Acciones de la cita" className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#F5E6D3] p-5 pb-safe">
        {isActive ? (
          <div className="flex flex-col gap-2">
            <Button onClick={() => onReschedule(appointment.serviceId)} variant="secondary" size="lg" fullWidth ariaLabel="Reprogramar esta cita" disabled={!canManage}>
              📅 Reprogramar cita
            </Button>
            <Button onClick={onCancel} variant="danger" size="md" fullWidth ariaLabel="Cancelar esta cita" disabled={!canManage}>
              Cancelar cita
            </Button>
            {!canManage && (
              <p role="status" className="rounded-[14px] border-2 border-[#F0C0BE] bg-[#FFF5F5] p-3 text-center text-xs font-semibold leading-relaxed text-[#7C2C20]">
                {getAppointmentRestrictionMessage(appointment, currentTimestamp)}
              </p>
            )}
          </div>
        ) : appointment.status === 'completed' ? (
          <Button onClick={() => onRebook(appointment.serviceId)} variant="primary" size="lg" fullWidth ariaLabel={`Reservar de nuevo el servicio ${service.name}`}>
            🔄 Reservar de nuevo
          </Button>
        ) : (
          <Button onClick={() => onRebook(appointment.serviceId)} variant="primary" size="lg" fullWidth ariaLabel={`Reservar otra cita para ${service.name}`}>
            ✂️ Reservar otra cita
          </Button>
        )}
      </footer>
    </main>
  );
}

// ─── CANCEL APPOINTMENT ────────────────────────────────────────────────────────

export function CancelAppointment({ appointmentId, onConfirm, onBack }: {
  appointmentId: string;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const currentTimestamp = useCurrentTimestamp();
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setAppointment(null);
    setAppointmentLoading(true);
    setError(null);
    getMyAppointment(appointmentId)
      .then(result => { if (active) setAppointment(result); })
      .catch(reason => {
        if (active) setError(getAppointmentActionMessage(reason, 'cancel'));
      })
      .finally(() => { if (active) setAppointmentLoading(false); });
    return () => { active = false; };
  }, [appointmentId]);
  const service = appointment ? getService(appointment.serviceId) : null;
  const canCancel = appointment !== null && canManageAppointment(appointment, currentTimestamp);

  const reasons = [
    'Cambio de planes',
    'Problema de salud',
    'Trabajo / compromisos',
    'Encontré otra barbería',
    'Otro motivo',
  ];

  const handleConfirm = async () => {
    if (!appointment || !canCancel) return;
    setLoading(true);
    setError(null);
    try {
      await cancelMyAppointment(appointmentId, undefined, selectedReason === 'Otro motivo' ? reason : selectedReason);
      onConfirm();
    } catch (reason) {
      setError(getAppointmentActionMessage(reason, 'cancel'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main aria-label="Cancelar cita" className="flex flex-col h-full bg-[#FBF3E9]">
      <header className="bg-white px-5 pt-10 pb-4 shadow-[0_2px_12px_rgba(107,66,38,0.06)]">
        <PageHeader title="Cancelar Cita" onBack={onBack} />
      </header>

      <section aria-label="Confirmación de cancelación" className="flex-1 overflow-y-auto px-5 py-5 pb-28">
        {/* Warning */}
        <section aria-labelledby="cancel-warning-title" className="bg-[#F8D7DA] border border-[#F0C0BE] rounded-2xl p-4 mb-5 flex items-start gap-3">
          <span aria-hidden="true" className="text-2xl flex-shrink-0">⚠️</span>
          <div>
            <h2 id="cancel-warning-title" className="font-bold text-[#7C2C20] mb-1">¿Seguro que quieres cancelar?</h2>
            <p className="text-sm text-[#7C2C20]">
              Puedes cancelar desde la web con al menos 2 horas de anticipación. Para cambios más próximos, comunícate directamente por teléfono.
            </p>
          </div>
        </section>

        {appointmentLoading && (
          <div className="mb-5 rounded-2xl bg-white p-5 text-center text-sm font-semibold text-[#6B4226]" role="status" aria-live="polite">
            <ActionSpinner /> <span className="ml-2">Cargando los detalles de tu cita...</span>
          </div>
        )}
        {service && (
          <section aria-label="Cita a cancelar">
          <Card className="mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FBF3E9] rounded-2xl flex items-center justify-center text-xl flex-shrink-0">
                {CATEGORY_CONFIG[service.category].emoji}
              </div>
              <div>
                <div className="font-black font-display text-[#6B4226]">{service.name}</div>
                <div className="text-sm text-[#6B4226]">
                  {appointment?.date} a las {appointment?.time}
                </div>
              </div>
            </div>
          </Card>
          </section>
        )}
        {appointment && !canCancel && (
          <p role="alert" className="mb-5 rounded-2xl border border-[#F0C0BE] bg-[#FFF5F5] p-4 text-sm font-semibold text-[#7C2C20]">
            {getAppointmentRestrictionMessage(appointment, currentTimestamp)}
          </p>
        )}
        {error && <p id="cancel-action-error" role="alert" className="mb-5 rounded-2xl bg-[#FFF5F5] p-4 text-sm font-semibold text-[#7C2C20]">{error}</p>}

        <section aria-label="Motivo de cancelación">
          <Card>
          <fieldset disabled={loading || appointmentLoading || !canCancel} aria-describedby={error ? 'cancel-action-error' : undefined}>
          <legend className="font-black text-[#6B4226] font-display mb-3">Motivo (opcional)</legend>
          <div className="flex flex-col gap-2 mb-3">
            {reasons.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedReason(r === selectedReason ? '' : r)}
                aria-label={`Motivo de cancelación: ${r}`}
                aria-pressed={selectedReason === r}
                className={`
                  flex min-h-11 items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all text-left
                  ${selectedReason === r
                    ? 'border-[#87371E] bg-[#FBF3E9] text-[#662A17]'
                    : 'border-[#D8C4B0] text-[#59351F] hover:border-[#87371E]'
                  }
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D2415]
                `}
              >
                <div aria-hidden="true" className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedReason === r ? 'border-[#87371E] bg-[#87371E]' : 'border-[#6B4226]'}`}>
                  {selectedReason === r && <span className="text-white text-[8px] font-black">•</span>}
                </div>
                {r}
              </button>
            ))}
          </div>

          {selectedReason === 'Otro motivo' && (
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              aria-label="Describe otro motivo para cancelar"
              placeholder="Cuéntanos más..."
              rows={3}
              className="w-full rounded-[14px] border-2 border-[#EDD8BC] bg-white px-4 py-3 text-sm text-[#6B4226] placeholder-[#6B4226] focus:border-[#87371E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3D2415] resize-none transition-colors"
            />
          )}
          </fieldset>
          </Card>
        </section>
      </section>

      <footer aria-label="Acciones de cancelación" className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#F5E6D3] p-5 pb-safe flex flex-col gap-2">
        <Button onClick={handleConfirm} variant="danger" size="lg" fullWidth ariaLabel="Confirmar cancelación de la cita" disabled={loading || !canCancel} ariaBusy={loading} ariaDescribedBy={error ? 'cancel-action-error' : undefined}>
          {loading ? <><ActionSpinner /> Cancelando...</> : 'Confirmar cancelación'}
        </Button>
        <Button onClick={onBack} variant="ghost" size="md" fullWidth ariaLabel="Mantener la cita y volver" disabled={loading}>
          Mantener mi cita
        </Button>
      </footer>
    </main>
  );
}
