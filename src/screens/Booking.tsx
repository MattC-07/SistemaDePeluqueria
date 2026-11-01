import { useState, useEffect, useRef } from 'react';
import {
  SERVICES, STYLISTS,
  getStylistsForService, getService, getStylist,
  formatPrice, formatDuration, formatDate,
  CATEGORY_CONFIG, type BookingState,
} from '../data';
import {
  BookingServiceError,
  confirmReservation,
  getAvailabilityForMonth,
  getDisponibilidad,
  liberarTurno,
  reservarTurno,
  saveTestAppointment,
  type AvailableSlot,
  type SlotHold,
} from '../services/bookingService';
import { SuccessIllustration, MemphisStylistAvatar } from '../illustrations';
import { Button, BookingProgress, Card, PopularBadge, StarRating, PageHeader, ServicePhoto } from '../ui';
import { LANDING_STYLIST_IMAGES } from '../mockData';

// ─── STEP 1 — Choose Service ───────────────────────────────────────────────────

export function BookStep1({ onNext, onBack }: {
  onNext: (serviceId: string) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const categories = ['cut', 'beard', 'color', 'treatment'] as const;

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9]">
      <div className="bg-white px-5 pt-10 pb-4 shadow-[0_2px_12px_rgba(107,66,38,0.06)]">
        <PageHeader title="Reservar Cita" subtitle="Elige un servicio para continuar" onBack={onBack} />
        <div className="px-5 pt-2 pb-4">
          <BookingProgress step={1} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-28">
        {categories.map(cat => {
          const catServices = SERVICES.filter(s => s.category === cat);
          if (!catServices.length) return null;
          const cfg = CATEGORY_CONFIG[cat];
          return (
            <div key={cat} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{cfg.emoji}</span>
                <h3 className="font-black text-[#6B4226] font-display">{cfg.label}</h3>
              </div>
              <div className="flex flex-col gap-3">
                {catServices.map(service => (
                  <button
                    key={service.id}
                    onClick={() => setSelected(service.id)}
                    className={`
                      flex items-start gap-4 p-4 rounded-[20px] text-left w-full transition-all duration-200
                      ${selected === service.id
                        ? 'bg-[#E8734A] shadow-[0_4px_20px_rgba(232,115,74,0.35)] scale-[1.01]'
                        : 'bg-white shadow-[0_2px_12px_rgba(107,66,38,0.08)] hover:shadow-[0_4px_20px_rgba(107,66,38,0.14)] hover:scale-[1.01]'
                      }
                    `}
                  >
                    {/* Service icon area */}
                    <ServicePhoto serviceId={service.id} category={service.category} className="h-12 w-12 shrink-0 rounded-2xl" alt={service.name} />

                    {/* Service info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <span className={`font-black font-display text-base leading-tight ${selected === service.id ? 'text-white' : 'text-[#6B4226]'}`}>
                          {service.name}
                        </span>
                        {service.popular && <PopularBadge />}
                      </div>
                      <p className={`text-sm mt-1 leading-relaxed line-clamp-2 ${selected === service.id ? 'text-white/80' : 'text-[#A67850]'}`}>
                        {service.description}
                      </p>
                      <div className={`flex items-center gap-3 mt-2 text-sm font-semibold ${selected === service.id ? 'text-white' : 'text-[#E8734A]'}`}>
                        <span className="flex items-center gap-1">
                          <span>⏱</span> {formatDuration(service.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>💰</span> {formatPrice(service.price)}
                        </span>
                      </div>
                    </div>

                    {selected === service.id && (
                      <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#F5E6D3] p-5 pb-safe">
        <Button
          onClick={() => selected && onNext(selected)}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selected}
        >
          {selected ? `Continuar con ${getService(selected)?.name}` : 'Selecciona un servicio'}
        </Button>
      </div>
    </div>
  );
}

// ─── STEP 2 — Choose Stylist ───────────────────────────────────────────────────

export function BookStep2({ serviceId, onNext, onBack }: {
  serviceId: string;
  onNext: (stylistId: string) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const service = getService(serviceId);
  const stylists = getStylistsForService(serviceId);

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9]">
      <div className="bg-white px-5 pt-10 pb-4 shadow-[0_2px_12px_rgba(107,66,38,0.06)]">
        <PageHeader title="Elige tu Estilista" subtitle={`Para: ${service?.name}`} onBack={onBack} />
        <div className="px-5 pt-2 pb-4">
          <BookingProgress step={2} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-28">
        {/* "Any available" option */}
        <button
          onClick={() => setSelected('any')}
          className={`
            flex items-center gap-4 w-full p-4 rounded-[20px] text-left mb-4 transition-all duration-200
            ${selected === 'any'
              ? 'bg-[#E8734A] shadow-[0_4px_20px_rgba(232,115,74,0.35)]'
              : 'bg-white shadow-[0_2px_12px_rgba(107,66,38,0.08)] hover:shadow-[0_4px_20px_rgba(107,66,38,0.14)]'
            }
          `}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${selected === 'any' ? 'bg-white/20' : 'bg-[#F5E6D3]'}`}>
            🎲
          </div>
          <div className="flex-1">
            <div className={`font-black font-display text-base ${selected === 'any' ? 'text-white' : 'text-[#6B4226]'}`}>
              Cualquiera disponible
            </div>
            <div className={`text-sm font-medium ${selected === 'any' ? 'text-white/80' : 'text-[#A67850]'}`}>
              Te asignamos el primer profesional libre
            </div>
          </div>
          {selected === 'any' && (
            <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
          )}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#EDD8BC]" />
          <span className="text-xs font-semibold text-[#C8A88A]">o elige un estilista</span>
          <div className="flex-1 h-px bg-[#EDD8BC]" />
        </div>

        <div className="flex flex-col gap-3">
          {stylists.map(stylist => (
            <button
              key={stylist.id}
              onClick={() => setSelected(stylist.id)}
              className={`
                flex items-center gap-4 w-full p-4 rounded-[20px] text-left transition-all duration-200
                ${selected === stylist.id
                  ? 'bg-[#E8734A] shadow-[0_4px_20px_rgba(232,115,74,0.35)]'
                  : 'bg-white shadow-[0_2px_12px_rgba(107,66,38,0.08)] hover:shadow-[0_4px_20px_rgba(107,66,38,0.14)]'
                }
              `}
            >
              <div className="flex-shrink-0">
                <MemphisStylistAvatar name={stylist.name} color={stylist.color} size={56} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-black font-display text-base ${selected === stylist.id ? 'text-white' : 'text-[#6B4226]'}`}>
                  {stylist.name}
                </div>
                <div className={`text-sm font-medium ${selected === stylist.id ? 'text-white/80' : 'text-[#A67850]'}`}>
                  {stylist.specialty}
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className={`text-xs font-bold ${selected === stylist.id ? 'text-white' : 'text-[#F2A950]'}`}>
                    ★ {stylist.rating.toFixed(1)}
                  </span>
                  <span className={`text-xs ${selected === stylist.id ? 'text-white/60' : 'text-[#C8A88A]'}`}>
                    ({stylist.reviewCount} reseñas)
                  </span>
                </div>
              </div>
              {selected === stylist.id && (
                <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#F5E6D3] p-5 pb-safe">
        <Button
          onClick={() => selected && onNext(selected)}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selected}
        >
          {selected ? 'Elegir horario →' : 'Selecciona un estilista'}
        </Button>
      </div>
    </div>
  );
}

// ─── STEP 3 — Choose Date & Time ───────────────────────────────────────────────

function Calendar({ serviceId, stylistId, selected, onSelect }: {
  serviceId: string;
  stylistId: string;
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const today = new Date();
  const selectedParts = selected?.split('-').map(Number);
  const [viewYear, setViewYear] = useState(selectedParts?.[0] ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedParts ? selectedParts[1] - 1 : today.getMonth());
  const [availabilityDays, setAvailabilityDays] = useState<Map<string, boolean>>(new Map());
  const [availabilityStatus, setAvailabilityStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dayLabels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  useEffect(() => {
    let active = true;
    setAvailabilityStatus('loading');
    getAvailabilityForMonth({ serviceId, stylistId, year: viewYear, month: viewMonth })
      .then(days => {
        if (!active) return;
        setAvailabilityDays(new Map(days.map(day => [day.date, day.hasAvailability])));
        setAvailabilityStatus('success');
      })
      .catch(() => {
        if (active) setAvailabilityStatus('error');
      });

    return () => { active = false; };
  }, [retryCount, serviceId, stylistId, viewMonth, viewYear]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const getDateStr = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${viewYear}-${mm}-${dd}`;
  };

  const isPast = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < todayMidnight;
  };

  return (
    <Card className="mb-5">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-full bg-[#F5E6D3] hover:bg-[#EDD8BC] flex items-center justify-center text-[#6B4226] transition-colors font-bold"
        >
          ‹
        </button>
        <span className="font-black text-[#6B4226] font-display capitalize">{monthName}</span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-full bg-[#F5E6D3] hover:bg-[#EDD8BC] flex items-center justify-center text-[#6B4226] transition-colors font-bold"
        >
          ›
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-2">
        {dayLabels.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-[#C8A88A] py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: adjustedFirstDay }).map((_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = getDateStr(day);
          const past = isPast(day);
          const hasAvailability = availabilityDays.get(dateStr) === true;
          const isSelected = selected === dateStr;
          const disabled = past;

          return (
            <button
              key={day}
              onClick={() => !disabled && onSelect(dateStr)}
              disabled={disabled}
              className={`
                flex flex-col items-center justify-center h-10 rounded-xl text-sm font-semibold transition-all duration-150
                ${isSelected ? 'relative z-10 bg-[#E8734A] text-white shadow-[0_4px_12px_rgba(232,115,74,0.4)] scale-[1.1]' : 'relative z-[1]'}
                ${!isSelected && !disabled && hasAvailability ? 'bg-[#EAF2E3] text-[#4A7C59] hover:bg-[#DCEBD1] hover:scale-[1.05]' : ''}
                ${!isSelected && !disabled && availabilityStatus === 'success' && !hasAvailability ? 'bg-[#F5E6D3] text-[#A67850] hover:bg-[#EED9C1]' : ''}
                ${!isSelected && !disabled && availabilityStatus === 'loading' ? 'text-[#6B4226] hover:bg-[#FBF3E9]' : ''}
                ${disabled ? 'text-[#D8C4B0] cursor-not-allowed' : ''}
              `}
              aria-label={`${day} ${monthName}${hasAvailability ? ', con horarios disponibles' : availabilityStatus === 'success' ? ', sin horarios disponibles' : ''}`}
              title={availabilityStatus === 'success' ? (hasAvailability ? 'Hay horarios disponibles' : 'Sin horarios disponibles') : undefined}
            >
              {day}
              {hasAvailability && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#4A7C59]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F5E6D3] pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#A67850]">
            <span className="h-3 w-3 rounded-full bg-[#EAF2E3] ring-1 ring-[#4A7C59]" />
            Disponible
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#A67850]">
            <span className="h-3 w-3 rounded-full bg-[#F5E6D3]" />
            Sin disponibilidad
          </span>
        </div>
        {availabilityStatus === 'loading' && (
          <span className="text-[10px] text-[#A67850]" role="status">Consultando disponibilidad...</span>
        )}
        {availabilityStatus === 'error' && (
          <button onClick={() => setRetryCount(count => count + 1)} className="text-[10px] font-bold text-red-700 underline">
            Error al cargar. Reintentar
          </button>
        )}
      </div>
    </Card>
  );
}

export function BookStep3({ serviceId, stylistId, initialDate, onNext, onBack, onConflict }: {
  serviceId: string;
  stylistId: string;
  initialDate?: string | null;
  onNext: (date: string, time: string, hold: SlotHold) => void;
  onBack: () => void;
  onConflict: (message: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate ?? null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availability, setAvailability] = useState<
    | { status: 'idle' | 'loading'; slots: AvailableSlot[] }
    | { status: 'success'; slots: AvailableSlot[] }
    | { status: 'error'; slots: AvailableSlot[]; message: string }
  >({ status: 'idle', slots: [] });
  const [retryCount, setRetryCount] = useState(0);
  const [hold, setHold] = useState<SlotHold | null>(null);
  const [holdStatus, setHoldStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [holdMessage, setHoldMessage] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const requestVersion = useRef(0);
  const activeHold = useRef<SlotHold | null>(null);
  const transferredHold = useRef(false);
  const service = getService(serviceId);

  const releaseCurrentHold = async () => {
    const current = activeHold.current;
    activeHold.current = null;
    setHold(null);
    if (current) await liberarTurno(current.id);
  };

  const selectSlot = async (slot: AvailableSlot) => {
    if (hold?.time === slot.time && hold.stylistId === slot.stylistId) return;
    const currentVersion = ++requestVersion.current;
    setSelectedTime(slot.time);
    setHoldStatus('loading');
    setHoldMessage(null);

    try {
      await releaseCurrentHold();
      if (!selectedDate || currentVersion !== requestVersion.current) return;
      const nextHold = await reservarTurno({
        serviceId,
        stylistId: slot.stylistId,
        date: selectedDate,
        time: slot.time,
      });
      if (currentVersion !== requestVersion.current) {
        await liberarTurno(nextHold.id);
        return;
      }
      activeHold.current = nextHold;
      setHold(nextHold);
      setHoldStatus('idle');
    } catch (error) {
      if (currentVersion !== requestVersion.current) return;
      setSelectedTime(null);
      setHoldStatus('error');
      const message = error instanceof Error
        ? error.message
        : 'No se pudo bloquear el horario. Inténtalo de nuevo.';
      setHoldMessage(message);
      if (error instanceof BookingServiceError && error.status === 409) {
        onConflict(error.response.message);
        setConflictMessage(error.response.message);
      }
      setRetryCount(count => count + 1);
    }
  };

  useEffect(() => () => {
    if (!transferredHold.current && activeHold.current) {
      void liberarTurno(activeHold.current.id);
    }
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      setAvailability({ status: 'idle', slots: [] });
      return;
    }
    let active = true;
    setAvailability({ status: 'loading', slots: [] });
    getDisponibilidad({ serviceId, stylistId, date: selectedDate, holdId: hold?.id })
      .then(response => {
        if (!active) return;
        setAvailability({ status: 'success', slots: response.slots });
        setSelectedTime(time =>
          response.slots.some(slot =>
            slot.time === time && (!hold || slot.stylistId === hold.stylistId)
          )
            ? time
            : null
        );
      })
      .catch(error => {
        if (!active) return;
        setAvailability({
          status: 'error',
          slots: [],
          message: error instanceof Error ? error.message : 'No fue posible consultar los horarios.',
        });
      });
    return () => { active = false; };
  }, [hold?.id, hold?.stylistId, retryCount, serviceId, selectedDate, stylistId]);

  useEffect(() => {
    if (!selectedDate || hold) return;
    const timer = window.setInterval(() => setRetryCount(count => count + 1), 30_000);
    return () => window.clearInterval(timer);
  }, [hold, selectedDate]);

  useEffect(() => {
    if (!hold) {
      setRemainingMs(0);
      return;
    }
    const update = () => {
      const remaining = hold.expiresAt - Date.now();
      setRemainingMs(Math.max(0, remaining));
      if (remaining <= 0) {
        activeHold.current = null;
        setHold(null);
        setSelectedTime(null);
        setHoldStatus('error');
        setHoldMessage('El bloqueo venció. Selecciona nuevamente un horario.');
        setRetryCount(count => count + 1);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [hold]);

  const selectedSlot = availability.slots.find(
    slot => slot.time === selectedTime && slot.stylistId === hold?.stylistId,
  );

  return (
    <div className="isolate flex h-full flex-col bg-[#FBF3E9]">
      <div className="bg-white px-5 pt-10 pb-4 shadow-[0_2px_12px_rgba(107,66,38,0.06)]">
        <PageHeader title="Elige el Horario" subtitle={service?.name} onBack={() => {
          requestVersion.current += 1;
          void releaseCurrentHold();
          onBack();
        }} />
        <div className="px-5 pt-2 pb-4">
          <BookingProgress step={3} />
        </div>
      </div>

      <div className="relative z-0 flex-1 overflow-y-auto px-5 py-5 pb-36">
        {/* Duration info */}
        <div className="flex items-center gap-2 mb-5 p-3 bg-white rounded-2xl border border-[#F5E6D3]">
          <span className="text-lg">⏱</span>
          <span className="text-sm font-semibold text-[#6B4226]">
            Duración del servicio: <span className="text-[#E8734A]">{formatDuration(service?.duration ?? 30)}</span>
          </span>
        </div>

        {/* Calendar */}
        <h3 className="font-black text-[#6B4226] font-display mb-3">Selecciona el día</h3>
        <Calendar
          serviceId={serviceId}
          stylistId={stylistId}
          selected={selectedDate}
          onSelect={date => {
            requestVersion.current += 1;
            void releaseCurrentHold();
            setSelectedDate(date);
            setSelectedTime(null);
            setHoldStatus('idle');
            setHoldMessage(null);
          }}
        />

        {/* Time slots */}
        {selectedDate && (
          <div>
            <h3 className="font-black text-[#6B4226] font-display mb-3">
              Horarios disponibles
              <span className="ml-2 text-sm text-[#A67850] font-medium">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </h3>

            {availability.status === 'loading' && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="status" aria-label="Cargando horarios">
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded-2xl bg-[#F5E6D3]" />
                ))}
              </div>
            )}
            {availability.status === 'error' && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center" role="alert">
                <p className="text-sm text-red-700">{availability.message}</p>
                <button onClick={() => setRetryCount(count => count + 1)} className="mt-2 text-sm font-bold underline">
                  Reintentar
                </button>
              </div>
            )}
            {availability.status === 'success' && availability.slots.length === 0 && (
              <p className="rounded-2xl bg-white p-4 text-center text-sm font-medium text-[#A67850]">
                No hay turnos disponibles para esta fecha. Intenta con otro barbero o selecciona el siguiente día disponible.
              </p>
            )}
            {availability.status === 'success' && availability.slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availability.slots.map(slot => (
                  <button
                    key={`${slot.time}-${slot.stylistId}`}
                    onClick={() => void selectSlot(slot)}
                    disabled={holdStatus === 'loading'}
                    className={`relative min-h-10 rounded-2xl border-2 px-2 py-2 text-sm font-bold transition-all ${
                      selectedSlot?.time === slot.time && selectedSlot.stylistId === slot.stylistId
                        ? 'z-10 border-[#E8734A] bg-[#E8734A] text-white shadow-[0_4px_12px_rgba(232,115,74,0.28)]'
                        : 'z-[1] border-[#E8734A] bg-white text-[#E8734A] hover:bg-[#FBF3E9]'
                    } ${holdStatus === 'loading' ? 'cursor-wait opacity-60' : ''}`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
            {holdStatus === 'loading' && (
              <p className="mt-3 text-center text-sm text-[#A67850]" role="status">Bloqueando horario...</p>
            )}
            {holdStatus === 'error' && holdMessage && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700" role="alert">{holdMessage}</p>
            )}
            {hold && (
              <p className="mt-3 text-center text-sm font-semibold text-[#4A7C59]" role="status">
                Turno bloqueado por {Math.floor(remainingMs / 60_000)}:{String(Math.floor((remainingMs % 60_000) / 1000)).padStart(2, '0')} min
              </p>
            )}
            {selectedSlot && stylistId === 'any' && (
              <p className="mt-2 text-center text-xs text-[#A67850]">
                Estilista asignado: {getStylist(selectedSlot.stylistId)?.name}
              </p>
            )}
          </div>
        )}

        {!selectedDate && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-[#A67850] font-medium text-sm">Selecciona una fecha en el calendario para ver los horarios disponibles</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t-2 border-[#F5E6D3] px-4 py-3 pb-safe">
        {selectedDate && selectedTime && (
          <div className="flex min-h-9 items-center gap-2 mb-2 px-3 py-2 bg-[#FBF3E9] rounded-xl">
            <span className="text-base">📍</span>
            <div className="flex-1">
              <span className="text-xs font-semibold text-[#6B4226]">
                {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                {' '}a las {selectedTime}
              </span>
            </div>
          </div>
        )}
        <Button
          onClick={() => {
            if (!selectedDate || !selectedSlot || !hold) return;
            transferredHold.current = true;
            onNext(selectedDate, selectedSlot.time, hold);
          }}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selectedDate || !selectedSlot || !hold || holdStatus !== 'idle' || availability.status !== 'success'}
        >
          {selectedDate && selectedSlot && hold ? 'Revisar reserva →' : 'Elige fecha y hora'}
        </Button>
      </div>
      {conflictMessage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#24160F]/55 p-5" role="presentation">
          <div className="w-full max-w-md rounded-3xl border border-[#F2A950]/50 bg-white p-6 text-center shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="booking-conflict-title">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF3CD] text-3xl text-[#A66A16]" aria-hidden="true">!</span>
            <h2 id="booking-conflict-title" className="mt-4 font-display text-xl font-black text-[#6B4226]">Turno no disponible</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8B6A52]">{conflictMessage}</p>
            <Button
              onClick={() => {
                setConflictMessage(null);
                setSelectedTime(null);
              }}
              size="lg"
              fullWidth
            >
              Elegir nuevo horario
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STEP 4 — Confirm ──────────────────────────────────────────────────────────

export function BookStep4({ booking, onConfirm, onBack, onConflict, onChooseNewTime }: {
  booking: BookingState;
  onConfirm: (reservationCode: string) => void;
  onBack: () => void;
  onConflict: (message: string) => void;
  onChooseNewTime: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const confirming = useRef(false);
  const [remainingMs, setRemainingMs] = useState(
    Math.max(0, (booking.holdExpiresAt ?? 0) - Date.now()),
  );
  const service = getService(booking.serviceId!);
  const stylist = booking.stylistId === 'any' ? null : getStylist(booking.stylistId!);

  useEffect(() => {
    if (!booking.holdExpiresAt) return;
    const updateRemaining = () => setRemainingMs(Math.max(0, booking.holdExpiresAt! - Date.now()));
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [booking.holdExpiresAt]);

  const handleConfirm = async () => {
    if (confirming.current) return;
    if (!booking.holdId || remainingMs <= 0) {
      setConfirmationError('El bloqueo venció. Regresa y selecciona nuevamente un horario.');
      return;
    }
    confirming.current = true;
    setLoading(true);
    setConfirmationError(null);
    try {
      const confirmation = await confirmReservation({
        servicioId: booking.serviceId!,
        estilistaId: booking.stylistId!,
        fecha: booking.date!,
        horaInicio: booking.time!,
      });
      // Prueba temporal: guarda la cita en una lista de strings; debe conectarse con el backend.
      saveTestAppointment({
        id: confirmation.reservationCode,
        serviceId: booking.serviceId!,
        stylistId: booking.stylistId === 'any'
          ? getStylistsForService(booking.serviceId!)[0]?.id ?? booking.stylistId!
          : booking.stylistId!,
        date: booking.date!,
        time: booking.time!,
        createdAt: new Date().toISOString(),
      });
      onConfirm(confirmation.reservationCode);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo confirmar la reserva.';
      setConfirmationError(message);
      if (error instanceof BookingServiceError && error.status === 409) {
        onConflict(error.response.message);
        setConflictMessage(error.response.message);
      }
    } finally {
      confirming.current = false;
      setLoading(false);
    }
  };

  if (!service || !booking.date || !booking.time) return null;

  const formattedDate = (() => {
    const [y, m, d] = booking.date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  })();
  const endTime = (() => {
    const [hours, minutes] = booking.time!.split(':').map(Number);
    const end = hours * 60 + minutes + service.duration;
    return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  })();

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9]">
      <div className="bg-white px-5 pt-10 pb-4 shadow-[0_2px_12px_rgba(107,66,38,0.06)]">
        <PageHeader title="Confirmar Reserva" subtitle="Revisa los detalles antes de confirmar" onBack={onBack} />
        <div className="px-5 pt-2 pb-4">
          <BookingProgress step={4} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-36">
        <p className={`mb-4 rounded-2xl p-3 text-center text-sm font-semibold ${
          remainingMs > 0 ? 'bg-[#EAF2E3] text-[#4A7C59]' : 'bg-red-50 text-red-700'
        }`} role="status">
          {remainingMs > 0
            ? `Turno bloqueado durante ${Math.floor(remainingMs / 60_000)}:${String(Math.floor((remainingMs % 60_000) / 1000)).padStart(2, '0')} min`
            : 'El bloqueo temporal venció.'}
        </p>
        {confirmationError && (
          <p className="mb-4 rounded-2xl bg-red-50 p-3 text-center text-sm text-red-700" role="alert">
            {confirmationError}
          </p>
        )}
        {/* Summary card */}
        <Card className="mb-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F5E6D3]">
            <ServicePhoto serviceId={service.id} category={service.category} className="h-14 w-14 shrink-0 rounded-2xl" alt={service.name} />
            <div className="flex-1">
              <div className="font-black text-[#6B4226] font-display text-lg leading-tight">{service.name}</div>
              <div className="text-sm text-[#A67850] font-medium">{formatDuration(service.duration)} de servicio</div>
            </div>
            <div className="text-xl font-black text-[#E8734A]">{formatPrice(service.price)}</div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FBF3E9] flex items-center justify-center flex-shrink-0">
                <span className="text-base">📅</span>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#C8A88A] uppercase tracking-wide">Fecha</div>
                <div className="font-semibold text-[#6B4226] capitalize text-sm">{formattedDate}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FBF3E9] flex items-center justify-center flex-shrink-0">
                <span className="text-base">🕐</span>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#C8A88A] uppercase tracking-wide">Hora</div>
                <div className="font-semibold text-[#6B4226] text-sm">{booking.time} - {endTime}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FBF3E9] flex items-center justify-center flex-shrink-0">
                <span className="text-base">✂️</span>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#C8A88A] uppercase tracking-wide">Estilista</div>
                <div className="font-semibold text-[#6B4226] text-sm">
                  {stylist ? stylist.name : 'Cualquiera disponible'}
                </div>
                {stylist && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-[#A67850]">
                    <img src={LANDING_STYLIST_IMAGES[stylist.id]} alt="" className="h-8 w-8 rounded-full object-cover" />
                    <span>{stylist.specialty}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Price breakdown */}
        <Card className="mb-5">
          <h4 className="font-black text-[#6B4226] font-display mb-3">Resumen de pago</h4>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A67850]">{service.name}</span>
              <span className="font-semibold text-[#6B4226] text-sm">{formatPrice(service.price)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#A67850]">Gestión de reserva</span>
              <span className="font-semibold text-[#8B9D77] text-sm">Gratis</span>
            </div>
            <div className="h-px bg-[#F5E6D3] my-1" />
            <div className="flex justify-between items-center">
              <span className="font-black text-[#6B4226] font-display">Total a pagar</span>
              <span className="font-black text-[#E8734A] text-xl">{formatPrice(service.price)}</span>
            </div>
          </div>
          <div className="mt-3 p-3 bg-[#EAF2E3] rounded-xl">
            <p className="text-xs text-[#4A7C59] font-semibold text-center">
              💳 Pago al momento de la cita — no se cobra ahora
            </p>
          </div>
        </Card>

        {/* Cancellation policy */}
        <div className="bg-[#FEF5E4] border border-[#F2A950]/30 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-[#8B6914]">Política de cancelación</p>
              <p className="text-xs text-[#A67850] mt-1 leading-relaxed">
                Puedes cancelar sin coste hasta 2 horas antes de tu cita. Cancelaciones tardías pueden suponer un cargo del 20%.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#F5E6D3] p-5 pb-safe">
        <Button onClick={() => void handleConfirm()} variant="primary" size="lg" fullWidth disabled={loading || !booking.holdId || remainingMs <= 0}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
              Confirmando reserva...
            </span>
          ) : (
            'Confirmar Reserva'
          )}
        </Button>
        <p className="text-center text-xs text-[#A67850] mt-2">
          Recibirás una confirmación por correo
        </p>
      </div>
      {conflictMessage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#24160F]/55 p-5" role="presentation">
          <div className="w-full max-w-md rounded-3xl border border-[#F2A950]/50 bg-white p-6 text-center shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-conflict-title">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF3CD] text-3xl text-[#A66A16]" aria-hidden="true">!</span>
            <h2 id="confirmation-conflict-title" className="mt-4 font-display text-xl font-black text-[#6B4226]">Turno no disponible</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8B6A52]">{conflictMessage}</p>
            <Button onClick={onChooseNewTime} size="lg" fullWidth>
              Elegir nuevo horario
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SUCCESS ───────────────────────────────────────────────────────────────────

export function BookSuccess({ booking, reservationCode, onGoToAppointments, onGoHome }: {
  booking: BookingState;
  reservationCode: string;
  onGoToAppointments: () => void;
  onGoHome: () => void;
}) {
  const service = getService(booking.serviceId!);
  const stylist = booking.stylistId === 'any' ? null : getStylist(booking.stylistId!);

  if (!service || !booking.date || !booking.time) return null;

  const formattedDate = (() => {
    const [y, m, d] = booking.date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  })();

  return (
    <div className="flex flex-col h-full bg-[#FBF3E9] overflow-y-auto">
      {/* Top decoration blobs */}
      <div className="absolute top-0 right-0 w-52 h-52 bg-[#F5E6D3] rounded-full -translate-y-1/3 translate-x-1/3" />
      <div className="absolute top-20 left-0 w-32 h-32 bg-[#EDD8BC] rounded-full -translate-x-1/2 opacity-50" />

      {/* Illustration */}
      <div className="relative z-10 flex-shrink-0 h-64 flex items-center justify-center px-8 pt-12">
        <SuccessIllustration />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 px-6 pb-10">
        {/* Success badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 bg-[#EAF2E3] px-4 py-2 rounded-full border border-[#A8BB92]">
            <span className="animate-pulse text-[#4A7C59] text-sm">✓</span>
            <span className="text-sm font-bold text-[#4A7C59]">¡Reserva confirmada!</span>
          </div>
        </div>

        <h1 className="text-3xl font-black text-[#6B4226] font-display text-center leading-tight mb-2">
          ¡Todo listo!
        </h1>
        <p className="text-center text-[#A67850] text-sm leading-relaxed mb-6">
          Tu cita ha sido reservada con éxito. Te esperamos pronto.
        </p>

        {/* Booking summary card */}
        <Card className="mb-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 pb-3 border-b border-[#F5E6D3]">
              <div className="w-10 h-10 rounded-2xl bg-[#FBF3E9] flex items-center justify-center text-xl flex-shrink-0">
                {CATEGORY_CONFIG[service.category].emoji}
              </div>
              <div className="flex-1">
                <div className="font-black text-[#6B4226] font-display">{service.name}</div>
                <div className="text-xs text-[#A67850]">{formatDuration(service.duration)}</div>
              </div>
              <div className="font-black text-[#E8734A]">{formatPrice(service.price)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FBF3E9] rounded-xl p-3">
                <div className="text-[10px] font-semibold text-[#C8A88A] uppercase tracking-wide mb-1">Fecha</div>
                <div className="font-bold text-[#6B4226] text-sm capitalize">{formattedDate}</div>
              </div>
              <div className="bg-[#FBF3E9] rounded-xl p-3">
                <div className="text-[10px] font-semibold text-[#C8A88A] uppercase tracking-wide mb-1">Hora</div>
                <div className="font-bold text-[#6B4226] text-sm">{booking.time}</div>
              </div>
            </div>

            <div className="bg-[#FBF3E9] rounded-xl p-3">
              <div className="text-[10px] font-semibold text-[#C8A88A] uppercase tracking-wide mb-1">Estilista</div>
              <div className="font-bold text-[#6B4226] text-sm">{stylist?.name ?? 'Cualquiera disponible'}</div>
            </div>
          </div>
        </Card>

        {/* Confirmation number */}
        <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-white rounded-2xl border-2 border-dashed border-[#EDD8BC]">
          <span className="text-sm text-[#A67850]">Nº de reserva:</span>
          <span className="font-black text-[#E8734A] text-sm tracking-widest">#{reservationCode}</span>
        </div>
        <p className="mb-6 text-center text-xs leading-relaxed text-[#8B6A52]">
          Hemos enviado los detalles de tu cita y la dirección a tu correo electrónico.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Button onClick={onGoToAppointments} variant="primary" size="lg" fullWidth>
            Ver mis citas
          </Button>
          <Button onClick={onGoHome} variant="secondary" size="lg" fullWidth>
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
