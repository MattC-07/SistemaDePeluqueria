import { type ReactNode, type Ref, useEffect, useState } from 'react';
import { CATEGORY_CONFIG, STATUS_CONFIG, type AppointmentStatus, type ServiceCategory } from './data';
import { LANDING_SERVICE_IMAGES } from './mockData';

// ─── BUTTON ────────────────────────────────────────────────────────────────────

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  type?: 'button' | 'submit';
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, fullWidth, icon, type = 'button' }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 select-none rounded-[14px]';

  const variants = {
    primary: disabled
      ? 'bg-[#E8C4B0] text-[#B8906A] cursor-not-allowed'
      : 'bg-[#E8734A] text-white hover:bg-[#C85A31] active:scale-[0.97] shadow-[0_4px_16px_-2px_rgba(232,115,74,0.4)] cursor-pointer',
    secondary: disabled
      ? 'bg-[#F5E6D3] text-[#C8A88A] cursor-not-allowed border-2 border-[#EDD8BC]'
      : 'bg-[#FBF3E9] text-[#E8734A] border-2 border-[#E8734A] hover:bg-[#F5E6D3] active:scale-[0.97] cursor-pointer',
    ghost: 'bg-transparent text-[#6B4226] hover:bg-[#F5E6D3] active:scale-[0.97] cursor-pointer',
    danger: disabled
      ? 'bg-[#F8D7DA] text-[#C8A0A0] cursor-not-allowed'
      : 'bg-[#C45C4C] text-white hover:bg-[#A84A3A] active:scale-[0.97] cursor-pointer',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm md:px-6 md:py-3 md:text-base',
    lg: 'px-5 py-3 text-sm md:px-8 md:py-4 md:text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

const ACCESSIBILITY_STORAGE_KEY = 'bb_accessibility_preferences';

type ColorVisionMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

interface AccessibilityPreferences {
  largeText: boolean;
  zoom: boolean;
  magnifier: boolean;
  highContrast: boolean;
  darkMode: boolean;
  invertColors: boolean;
  colorVisionMode: ColorVisionMode;
}

const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  largeText: false,
  zoom: false,
  magnifier: false,
  highContrast: false,
  darkMode: false,
  invertColors: false,
  colorVisionMode: 'none',
};

function readAccessibilityPreferences(): AccessibilityPreferences {
  const stored = sessionStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
  if (!stored) return DEFAULT_ACCESSIBILITY_PREFERENCES;
  const parsed = JSON.parse(stored) as Partial<AccessibilityPreferences>;
  return {
    ...DEFAULT_ACCESSIBILITY_PREFERENCES,
    ...parsed,
    colorVisionMode: ['none', 'protanopia', 'deuteranopia', 'tritanopia'].includes(parsed.colorVisionMode ?? '')
      ? parsed.colorVisionMode as ColorVisionMode
      : 'none',
  };
}

export function resetAccessibilityPreferences(): void {
  sessionStorage.removeItem(ACCESSIBILITY_STORAGE_KEY);
  document.body.classList.remove(
    'accessibility-large-text',
    'accessibility-zoom',
    'accessibility-magnifier',
    'accessibility-high-contrast',
    'accessibility-dark-mode',
    'accessibility-invert',
    'accessibility-color-vision',
  );
  delete document.body.dataset.colorVision;
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(readAccessibilityPreferences);

  useEffect(() => {
    sessionStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(preferences));
    document.body.classList.toggle('accessibility-large-text', preferences.largeText);
    document.body.classList.toggle('accessibility-zoom', preferences.zoom);
    document.body.classList.toggle('accessibility-magnifier', preferences.magnifier);
    document.body.classList.toggle('accessibility-high-contrast', preferences.highContrast);
    document.body.classList.toggle('accessibility-dark-mode', preferences.darkMode);
    document.body.classList.toggle('accessibility-invert', preferences.invertColors);
    document.body.classList.toggle('accessibility-color-vision', preferences.colorVisionMode !== 'none');
    document.body.dataset.colorVision = preferences.colorVisionMode;
  }, [preferences]);

  useEffect(() => {
    const syncPreferences = (event: StorageEvent) => {
      if (event.key === ACCESSIBILITY_STORAGE_KEY) {
        setPreferences(readAccessibilityPreferences());
      }
    };
    window.addEventListener('storage', syncPreferences);
    return () => window.removeEventListener('storage', syncPreferences);
  }, []);

  const updatePreference = <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K],
  ) => {
    setPreferences(current => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed bottom-5 right-5 z-[120]">
      {open && (
        <section
          aria-label="Opciones de accesibilidad"
          className="mb-3 w-72 rounded-2xl border-2 border-[#6B4226] bg-white p-4 shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black text-[#6B4226]">Accesibilidad</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar opciones de accesibilidad"
              className="rounded-full px-2 text-xl text-[#6B4226] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6B4226]"
            >
              ×
            </button>
          </div>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            <button type="button" aria-pressed={preferences.magnifier} onClick={() => updatePreference('magnifier', !preferences.magnifier)} className="accessibility-option">
              {preferences.magnifier ? "✓ " : ""}Lupa
            </button>
            <button type="button" aria-pressed={preferences.highContrast} onClick={() => updatePreference('highContrast', !preferences.highContrast)} className="accessibility-option">
              {preferences.highContrast ? "✓ " : ""}Contraste alto
            </button>
            <button type="button" aria-pressed={preferences.darkMode} onClick={() => updatePreference('darkMode', !preferences.darkMode)} className="accessibility-option">
              {preferences.darkMode ? "✓ " : ""}Modo oscuro
            </button>
            <button type="button" aria-pressed={preferences.invertColors} onClick={() => updatePreference('invertColors', !preferences.invertColors)} className="accessibility-option">
              {preferences.invertColors ? "✓ " : ""}Invertir colores
            </button>
            <button type="button" aria-pressed={preferences.zoom} onClick={() => updatePreference('zoom', !preferences.zoom)} className="accessibility-option">
              {preferences.zoom ? "✓ " : ""}Agrandar toda la interfaz
            </button>
            <button
              type="button"
              aria-pressed={preferences.largeText}
              onClick={() => updatePreference('largeText', !preferences.largeText)}
              className="accessibility-option"
            >
              {preferences.largeText ? "✓ " : ""}Agrandar texto
            </button>
            <label htmlFor="color-vision-profile" className="text-xs font-bold text-[#6B4226]">Paleta para daltonismo</label>
            <select id="color-vision-profile" value={preferences.colorVisionMode} onChange={event => updatePreference('colorVisionMode', event.target.value as ColorVisionMode)} className="accessibility-option">
              <option value="none">Sin paleta</option>
              <option value="protanopia">Protanopia (rojo)</option>
              <option value="deuteranopia">Deuteranopia (verde)</option>
              <option value="tritanopia">Tritanopia (azul)</option>
            </select>
            <a
              href="https://wa.me/573123025035?text=Hola%2C%20necesito%20ayuda%20con%20mi%20reserva"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-[#168C4B] px-3 py-2 text-center text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6B4226]"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label={open ? "Cerrar accesibilidad" : "Abrir opciones de accesibilidad"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C45C4C] text-2xl text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#6B4226]"
      >
        <span aria-hidden="true">♿</span>
      </button>
      {preferences.magnifier && <div className="pointer-events-none fixed bottom-5 left-5 z-[120] rounded-full border-4 border-[#6B4226] bg-white/95 px-4 py-2 text-xs font-bold text-[#6B4226] shadow-lg">Lupa activa · mueve el cursor</div>}
    </div>
  );
}

// ─── INPUT ─────────────────────────────────────────────────────────────────────

interface InputProps {
  label: string;
  id?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  rightAdornment?: ReactNode;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
}

export function Input({ label, id, type = 'text', value, onChange, placeholder, autoComplete, required, error, hint, icon, rightAdornment, onBlur, inputRef }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-[#6B4226]">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A67850]">
            {icon}
          </span>
        )}
        <input
          ref={inputRef}
          type={type}
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          className={`
            w-full rounded-[14px] border-2 bg-white px-4 py-3 text-[#6B4226] placeholder-[#C8A88A]
            font-medium text-sm transition-all duration-150 outline-none
            ${icon ? 'pl-10' : ''}
            ${rightAdornment ? 'pr-12' : ''}
            ${error
              ? 'border-[#C45C4C] focus:border-[#C45C4C] bg-[#FFF5F5]'
              : 'border-[#EDD8BC] focus:border-[#E8734A] hover:border-[#D4B896]'
            }
          `}
        />
        {rightAdornment && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightAdornment}
          </span>
        )}
      </div>
      {error && <p className="text-xs font-medium text-[#C45C4C]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#A67850]">{hint}</p>}
    </div>
  );
}

export function ServicePhoto({ serviceId, category, className = '', alt }: {
  serviceId: string;
  category: ServiceCategory;
  className?: string;
  alt?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = LANDING_SERVICE_IMAGES[serviceId];

  return (
    <div className={`relative overflow-hidden bg-[#FBF3E9] ${className}`}>
      {image && !imageFailed ? (
        <img
          src={image}
          alt={alt ?? ''}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-2xl">
          {CATEGORY_CONFIG[category].emoji}
        </span>
      )}
    </div>
  );
}

// ─── BADGE ─────────────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

export function CategoryBadge({ label, icon }: { label: string; icon: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F5E6D3] text-[#8B5E3C]">
      <span>{icon}</span>
      {label}
    </span>
  );
}

export function PopularBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E8734A] text-white">
      ⭐ Popular
    </span>
  );
}

// ─── CARD ──────────────────────────────────────────────────────────────────────

export function Card({ children, onClick, className = '', padding = true }: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-[20px] shadow-[0_4px_24px_-4px_rgba(107,66,38,0.12)]
        ${onClick ? 'cursor-pointer hover:shadow-[0_8px_32px_-4px_rgba(107,66,38,0.2)] active:scale-[0.98] transition-all duration-200' : ''}
        ${padding ? 'p-5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ─── PROGRESS STEPS ────────────────────────────────────────────────────────────

export function BookingProgress({ step, total = 4 }: { step: number; total?: number }) {
  const labels = ['Servicio', 'Estilista', 'Horario', 'Confirmar'];
  return (
    <div className="flex items-center gap-1 w-full">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-1 flex-1">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
              ${i + 1 < step ? 'bg-[#8B9D77] text-white' : i + 1 === step ? 'bg-[#E8734A] text-white shadow-[0_4px_12px_rgba(232,115,74,0.4)]' : 'bg-[#F5E6D3] text-[#C8A88A]'}
            `}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] font-semibold whitespace-nowrap ${i + 1 === step ? 'text-[#E8734A]' : 'text-[#C8A88A]'}`}>
              {labels[i]}
            </span>
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 flex-1 mb-4 transition-all duration-300 ${i + 1 < step ? 'bg-[#8B9D77]' : 'bg-[#EDD8BC]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── BOTTOM NAV ────────────────────────────────────────────────────────────────

type ClientTab = 'home' | 'book' | 'appointments' | 'profile';

export function BottomNav({ active, onNavigate }: { active: ClientTab; onNavigate: (t: ClientTab) => void }) {
  const items: { id: ClientTab; label: string; icon: string }[] = [
    { id: 'home', label: 'Inicio', icon: '🏠' },
    { id: 'book', label: 'Reservar', icon: '📅' },
    { id: 'appointments', label: 'Mis Citas', icon: '✂️' },
    { id: 'profile', label: 'Perfil', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t-2 border-[#F5E6D3] px-2 pb-safe">
      <div className="flex items-stretch h-16 max-w-md mx-auto">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200
              ${active === item.id ? 'text-[#E8734A]' : 'text-[#C8A88A]'}
            `}
          >
            {active === item.id && (
              <span className="text-xl">{item.icon}</span>
            )}
            {active !== item.id && (
              <span className="text-xl opacity-60">{item.icon}</span>
            )}
            <span className={`text-[10px] font-semibold ${active === item.id ? 'text-[#E8734A]' : 'text-[#C8A88A]'}`}>
              {item.label}
            </span>
            {active === item.id && (
              <span className="w-1 h-1 rounded-full bg-[#E8734A]" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─── SIDE NAV ──────────────────────────────────────────────────────────────────

type AdminTab = 'dashboard' | 'services' | 'team' | 'schedule' | 'clients' | 'reports';

export function SideNav({ active, role, onNavigate, onLogout }: {
  active: AdminTab;
  role: 'admin' | 'stylist';
  onNavigate: (t: AdminTab) => void;
  onLogout: () => void;
}) {
  const adminItems: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'services', label: 'Servicios', icon: '✂️' },
    { id: 'team', label: 'Equipo', icon: '👥' },
    { id: 'clients', label: 'Clientes', icon: '👤' },
    { id: 'reports', label: 'Reportes', icon: '📈' },
  ];

  const stylistItems: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'schedule', label: 'Mi Agenda', icon: '📅' },
    { id: 'clients', label: 'Mis Clientes', icon: '👤' },
    { id: 'reports', label: 'Mi Desempeño', icon: '📈' },
  ];

  const items = role === 'admin' ? adminItems : stylistItems;

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-60 bg-white border-r-2 border-[#F5E6D3] flex-col h-full shrink-0">
        {/* Logo */}
        <div className="p-6 pb-4 border-b border-[#F5E6D3]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E8734A] rounded-xl flex items-center justify-center text-white font-black text-lg">
              ✂
            </div>
            <div>
              <div className="font-black text-[#6B4226] font-display leading-none text-base">BarberBook</div>
              <div className="text-[10px] text-[#A67850] font-medium capitalize">{role === 'admin' ? 'Administrador' : 'Estilista'}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm font-semibold w-full text-left transition-all duration-200
                  ${active === item.id
                    ? 'bg-[#E8734A] text-white shadow-[0_4px_12px_rgba(232,115,74,0.3)]'
                    : 'text-[#8B5E3C] hover:bg-[#FBF3E9]'
                  }
                `}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-[#F5E6D3]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] bg-[#FBF3E9] mb-2">
            <div className="w-8 h-8 rounded-full bg-[#E8734A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {role === 'admin' ? 'A' : 'E'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#6B4226] truncate">
                {role === 'admin' ? 'Administrador' : 'Carlos Ruiz'}
              </div>
              <div className="text-[10px] text-[#A67850]">{role === 'admin' ? 'Panel de admin' : 'Estilista'}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-[12px] text-[#C45C4C] hover:bg-[#FFF5F5] transition-colors text-xs font-semibold cursor-pointer"
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar (hidden on desktop) ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b-2 border-[#F5E6D3] px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E8734A] rounded-xl flex items-center justify-center text-white font-black text-base">✂</div>
          <div>
            <div className="font-black text-[#6B4226] font-display text-sm leading-none">BarberBook</div>
            <div className="text-[10px] text-[#A67850]">{role === 'admin' ? 'Administrador' : 'Estilista'}</div>
          </div>
        </div>
        <div className="text-xs font-semibold text-[#A67850] capitalize">
          {items.find(i => i.id === active)?.label ?? ''}
        </div>
      </div>

      {/* ── Mobile bottom tab bar (hidden on desktop) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-[#F5E6D3]">
        <div className="flex items-stretch h-16">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
                ${active === item.id ? 'text-[#E8734A]' : 'text-[#C8A88A]'}
              `}
            >
              <span className={items.length >= 4 ? 'text-lg' : 'text-xl'}>{item.icon}</span>
              {items.length < 4 && <span className="text-[9px] font-semibold leading-none">{item.label}</span>}
              {active === item.id && <span className="w-1 h-1 rounded-full bg-[#E8734A]" />}
            </button>
          ))}
          <button
            onClick={onLogout}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[#C45C4C]"
          >
            <span className={items.length >= 4 ? 'text-lg' : 'text-xl'}>🚪</span>
            {items.length < 4 && <span className="text-[9px] font-semibold leading-none">Salir</span>}
          </button>
        </div>
      </nav>
    </>
  );
}

// ─── PAGE HEADER ───────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, onBack, action }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      {onBack && (
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white shadow-[0_2px_12px_rgba(107,66,38,0.1)] flex items-center justify-center text-[#6B4226] hover:bg-[#F5E6D3] transition-colors"
        >
          ←
        </button>
      )}
      <div className="flex-1">
        <h1 className="text-lg font-black text-[#6B4226] font-display leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[#A67850] font-medium">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── STAR RATING ───────────────────────────────────────────────────────────────

export function StarRating({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[#F2A950] text-sm">★</span>
      <span className="text-sm font-bold text-[#6B4226]">{value.toFixed(1)}</span>
      <span className="text-xs text-[#A67850]">({count})</span>
    </div>
  );
}

// ─── EMPTY STATE ───────────────────────────────────────────────────────────────

export function EmptyState({ title, subtitle, action, illustration }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  illustration?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      {illustration && <div className="w-52 h-40">{illustration}</div>}
      <div>
        <h3 className="font-black text-lg text-[#6B4226] font-display">{title}</h3>
        {subtitle && <p className="text-sm text-[#A67850] mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
