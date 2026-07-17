import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { apiKeysApi } from "../api/apiKeys";
import { memoryApi } from "../api/memory";
import { toast } from "../store/toastStore";
import { useForm } from "react-hook-form";
import {
  User as UserIcon,
  Key,
  Database,
  Save,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Lock,
  Search,
  Shield,
  AlertTriangle,
  Zap,
  CheckCircle2,
  RefreshCw,
  History,
  Activity,
  LogOut,
  CreditCard,
  Sparkles,
  X,
  ChevronRight,
  Brain,
  Pencil,
  Cpu,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  UpdateProfileRequest,
  ChangePasswordRequest,
  UserResponse,
  NewApiKeyResponse,
  AiProvider,
} from "../types";
import { providerKeysApi } from "../api/providerKeys";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "keys" | "providers" | "memory" | "plan">("profile");
  const { user } = useAuthStore();

  const tabs = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "plan", label: "Plan", icon: CreditCard },
    { id: "keys", label: "API Keys", icon: Key },
    { id: "providers", label: "AI Providers", icon: Cpu },
    { id: "memory", label: "Agent Memory", icon: Database },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-wise-fade-up">
      {/* Page Title */}
      <div className="wise-card">
        <h1
          style={{
            fontFamily: 'Manrope, sans-serif', fontWeight: 900,
            fontSize: '28px', lineHeight: '1.2', color: '#0e0f0c',
          }}
        >
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: '#454745' }}>
          Manage your account, plan, security, and AI memory preferences.
        </p>
      </div>

      {/* Primary Navigation Tabs */}
      <div
        className="flex flex-wrap p-1.5 rounded-2xl w-fit gap-1"
        style={{ background: '#e8ebe6' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-150"
              style={{
                background: isActive ? '#9fe870' : 'transparent',
                color:      isActive ? '#0e0f0c' : '#454745',
              }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-300 min-h-[500px]">
        {activeTab === "profile" && <ProfileTab user={user} />}
        {activeTab === "plan" && <PlanTab user={user} />}
        {activeTab === "keys" && <ApiKeysTab />}
        {activeTab === "providers" && <ProviderKeysTab />}
        {activeTab === "memory" && <MemoryTab />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Profile Tab ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { from: "from-indigo-500", to: "to-purple-600", label: "Indigo" },
  { from: "from-blue-500", to: "to-cyan-500", label: "Blue" },
  { from: "from-emerald-500", to: "to-teal-600", label: "Emerald" },
  { from: "from-rose-500", to: "to-pink-600", label: "Rose" },
  { from: "from-amber-500", to: "to-orange-600", label: "Amber" },
  { from: "from-slate-600", to: "to-slate-800", label: "Slate" },
];

function ProfileTab({ user }: { user: UserResponse | null }) {
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [avatarColor, setAvatarColor] = useState(0);

  const profileForm = useForm<UpdateProfileRequest>({
    defaultValues: { username: user?.username || "" },
  });

  const passwordForm = useForm<ChangePasswordRequest & { confirm: string }>();

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success("Profile updated!");
    },
    onError: () => toast.error("Failed to update profile."),
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ confirm: _, ...payload }: ChangePasswordRequest & { confirm: string }) =>
      authApi.changePassword(payload),
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Password changed successfully!");
    },
    onError: () => toast.error("Failed to change password."),
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  const ac = AVATAR_COLORS[avatarColor];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Info Card */}
      <div className="space-y-4 lg:sticky lg:top-8">
        <div className="wise-card">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black"
              style={{ background: '#9fe870', color: '#0e0f0c', fontFamily: 'Manrope,sans-serif' }}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#0e0f0c' }}>{user.username}</h2>
              <p className="text-xs font-mono mt-0.5" style={{ color: '#868685' }}>{user.email}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
                style={{ background: '#e2f6d5', color: '#054d28' }}
              >
                {user.tier} Plan
              </span>
              <span
                className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest"
                style={{ background: '#e8ebe6', color: '#454745' }}
              >
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Avatar color picker */}
        <div className="wise-card">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#868685' }}>Avatar Color</p>
          <div className="flex gap-2 flex-wrap">
            {AVATAR_COLORS.map((c, i) => (
              <button
                key={c.label}
                onClick={() => setAvatarColor(i)}
                title={c.label}
                className={`w-7 h-7 rounded-full bg-gradient-to-br ${c.from} ${c.to} transition-all ${
                  avatarColor === i ? "ring-2 ring-[#9fe870] ring-offset-2 ring-offset-white scale-110" : "opacity-60 hover:opacity-100"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full wise-card flex items-center gap-3 p-4 transition-colors duration-150"
          style={{ color: '#868685' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fde8e9'; (e.currentTarget as HTMLButtonElement).style.color = '#d03238'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; (e.currentTarget as HTMLButtonElement).style.color = '#868685'; }}
        >
          <LogOut size={15} />
          <span className="text-sm font-semibold">Sign Out</span>
        </button>
      </div>

      {/* Forms Area */}
      <div className="lg:col-span-2 space-y-5">
        {/* Username Update */}
        <section className="wise-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e2f6d5' }}>
              <UserIcon size={15} style={{ color: '#2ead4b' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: '#0e0f0c' }}>General Information</h3>
          </div>
          <form
            onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#868685' }}>
                  Username
                </label>
                <input
                  {...profileForm.register("username", {
                    required: "Username is required",
                    minLength: 3,
                  })}
                  className="wise-input"
                />
                {profileForm.formState.errors.username && (
                  <p className="text-xs" style={{ color: '#d03238' }}>{profileForm.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#868685' }}>
                  Email (read-only)
                </label>
                <input
                  value={user.email}
                  disabled
                  className="wise-input opacity-60 cursor-not-allowed"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="btn-wise-primary flex items-center gap-2"
              style={{ fontSize: '14px', padding: '10px 20px' }}
            >
              {updateProfileMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save Changes
            </button>
          </form>
        </section>

        {/* Password Update */}
        <section className="wise-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e2f6d5' }}>
              <Lock size={15} style={{ color: '#2ead4b' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: '#0e0f0c' }}>Security & Password</h3>
          </div>
          <form
            onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-full">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#868685' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register("current_password", { required: "Required" })}
                  className="wise-input"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#868685' }}>
                  New Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register("new_password", {
                    required: "Required",
                    minLength: 8,
                  })}
                  className="wise-input"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#868685' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  {...passwordForm.register("confirm", {
                    required: "Required",
                    validate: (val) =>
                      val === passwordForm.getValues("new_password") ||
                      "Passwords don't match",
                  })}
                  className="wise-input"
                />
                {passwordForm.formState.errors.confirm && (
                  <p className="text-xs" style={{ color: '#d03238' }}>
                    {passwordForm.formState.errors.confirm.message}
                  </p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="btn-wise-primary flex items-center gap-2"
              style={{ fontSize: '14px', padding: '10px 20px' }}
            >
              {changePasswordMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Shield size={14} />
              )}
              Update Password
            </button>
          </form>
        </section>

        {/* Account info */}
        <section className="wise-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e2f6d5' }}>
              <Activity size={15} style={{ color: '#2ead4b' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: '#0e0f0c' }}>Account Info</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "User ID", value: user.id.slice(0, 16) + "…" },
              { label: "Role", value: user.role },
              { label: "Plan", value: user.tier },
              { label: "Email Verified", value: user.email_verified ? "Yes" : "No" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3" style={{ background: '#e8ebe6' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#868685' }}>{item.label}</p>
                <p className="text-sm font-mono font-semibold" style={{ color: '#0e0f0c' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Plan Tab ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "For personal exploration",
    features: [
      "10 tasks / month",
      "2 concurrent agents",
      "1,000 memory vectors",
      "Community support",
    ],
    cta: "Current Plan",
    highlight: false,
    tier: "free" as const,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "per month",
    tagline: "For serious builders",
    features: [
      "500 tasks / month",
      "10 concurrent agents",
      "100,000 memory vectors",
      "Priority email support",
      "API access",
      "Advanced analytics",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
    tier: "pro" as const,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    tagline: "For teams & organizations",
    features: [
      "Unlimited tasks",
      "Unlimited agents",
      "Unlimited memory",
      "Dedicated support",
      "SSO / custom auth",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    highlight: false,
    tier: "enterprise" as const,
  },
];

function PlanTab({ user }: { user: UserResponse | null }) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[0] | null>(null);
  const setUser = useAuthStore((s) => s.setUser);

  // currentTier is derived from user so it re-renders when setUser is called
  const currentTier = user?.tier ?? "free";

  const handleUpgraded = (newTier: "free" | "pro" | "enterprise") => {
    if (user) {
      setUser({ ...user, tier: newTier });
    }
    setShowPayModal(false);
    setSelectedPlan(null);
    toast.success(`You're now on the ${newTier.charAt(0).toUpperCase() + newTier.slice(1)} plan!`);
  };

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      <div className="wise-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e2f6d5' }}>
            <CreditCard size={18} style={{ color: '#2ead4b' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#868685' }}>Current Plan</p>
            <p className="text-xl font-black capitalize" style={{ fontFamily: 'Manrope,sans-serif', color: '#0e0f0c' }}>{currentTier}</p>
          </div>
        </div>
        {currentTier === "free" && (
          <span className="text-xs rounded-full px-3 py-1.5 font-semibold" style={{ background: '#e8ebe6', color: '#454745' }}>
            Upgrade to unlock more
          </span>
        )}
        {currentTier === "pro" && (
          <span className="text-xs rounded-full px-3 py-1.5 font-semibold" style={{ background: '#e2f6d5', color: '#054d28' }}>
            ✓ Pro features active
          </span>
        )}
        {currentTier === "enterprise" && (
          <span className="text-xs rounded-full px-3 py-1.5 font-semibold" style={{ background: '#e2f6d5', color: '#054d28' }}>
            ✓ Enterprise active
          </span>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          return (
            <div
              key={plan.id}
              className="wise-card flex flex-col relative transition-shadow duration-200"
              style={{
                border: plan.highlight ? '2px solid #9fe870' : '1px solid rgba(14,15,12,0.06)',
                boxShadow: isCurrent ? '0 0 0 2px #9fe870' : 'none',
              }}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1"
                    style={{ background: '#9fe870', color: '#0e0f0c' }}
                  >
                    <Sparkles size={10} /> Most Popular
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-3 right-3">
                  <span
                    className="text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: '#e2f6d5', color: '#054d28' }}
                  >Active</span>
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-base font-black" style={{ fontFamily: 'Manrope,sans-serif', color: '#0e0f0c' }}>{plan.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: '#454745' }}>{plan.tagline}</p>
              </div>
              <div className="mb-5">
                <span className="text-3xl font-black" style={{ fontFamily: 'JetBrains Mono,monospace', color: '#0e0f0c' }}>{plan.price}</span>
                <span className="text-xs ml-1.5" style={{ color: '#868685' }}>{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: '#454745' }}>
                    <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#2ead4b' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent}
                onClick={() => {
                  if (!isCurrent) {
                    setSelectedPlan(plan);
                    setShowPayModal(true);
                  }
                }}
                className="w-full py-2.5 rounded-[24px] text-sm font-bold transition-all"
                style={{
                  background: isCurrent ? '#e8ebe6' : plan.highlight ? '#9fe870' : '#0e0f0c',
                  color: isCurrent ? '#868685' : plan.highlight ? '#0e0f0c' : '#ffffff',
                  cursor: isCurrent ? 'default' : 'pointer',
                }}
              >
                {isCurrent ? '✓ Current Plan' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature comparison note */}
      <div className="wise-card flex items-start gap-3">
        <Zap size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#9fe870' }} />
        <p className="text-sm" style={{ color: '#454745' }}>
          All plans include end-to-end encryption, audit logs, and 99.9% uptime SLA. Billing is monthly with no contracts — cancel anytime.
        </p>
      </div>

      {/* Payment Modal */}
      {showPayModal && selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => { setShowPayModal(false); setSelectedPlan(null); }}
          onUpgraded={handleUpgraded}
        />
      )}
    </div>
  );
}

function PaymentModal({
  plan,
  onClose,
  onUpgraded,
}: {
  plan: typeof PLANS[0];
  onClose: () => void;
  onUpgraded: (tier: "free" | "pro" | "enterprise") => void;
}) {
  const [payMethod, setPayMethod] = useState<"card" | "upi">("card");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Controlled inputs
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [upiId, setUpiId] = useState("");

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (payMethod === "card") {
      const digits = cardNumber.replace(/\s/g, "");
      if (digits.length < 16) errs.cardNumber = "Enter a valid 16-digit card number";
      if (!expiry.match(/^\d{2}\/\d{2}$/)) errs.expiry = "Format: MM/YY";
      if (cvv.length < 3) errs.cvv = "Enter 3-digit CVV";
      if (!cardName.trim()) errs.cardName = "Enter name on card";
    } else {
      if (!upiId.includes("@")) errs.upiId = "Enter a valid UPI ID (e.g. name@upi)";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePay = () => {
    if (!validate()) return;
    setSubmitting(true);
    // Simulate payment processing
    setTimeout(() => {
      setSubmitting(false);
      onUpgraded(plan.tier);
    }, 1600);
  };

  const formatCard = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-7 space-y-5 shadow-[0_0_80px_rgba(99,102,241,0.15)] ring-1 ring-white/15">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Upgrade to {plan.name}</h3>
            <p className="text-slate-500 text-xs mt-0.5">{plan.price} · {plan.period}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Payment method toggle */}
        <div className="flex gap-2">
          {(["card", "upi"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setPayMethod(m); setErrors({}); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                payMethod === m
                  ? "bg-indigo-500/20 border border-indigo-500/40 text-indigo-300"
                  : "bg-white/[0.03] border border-white/10 text-slate-500 hover:text-white"
              }`}
            >
              {m === "card" ? "💳 Card" : "🇮🇳 UPI"}
            </button>
          ))}
        </div>

        {payMethod === "card" ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Card Number</label>
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCard(e.target.value))}
                placeholder="1234 5678 9012 3456"
                className={`w-full bg-white/[0.03] border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono transition-all ${errors.cardNumber ? "border-red-500/50" : "border-white/10"}`}
              />
              {errors.cardNumber && <p className="text-red-400 text-[11px]">{errors.cardNumber}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expiry</label>
                <input
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  className={`w-full bg-white/[0.03] border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono transition-all ${errors.expiry ? "border-red-500/50" : "border-white/10"}`}
                />
                {errors.expiry && <p className="text-red-400 text-[11px]">{errors.expiry}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CVV</label>
                <input
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="•••"
                  className={`w-full bg-white/[0.03] border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono transition-all ${errors.cvv ? "border-red-500/50" : "border-white/10"}`}
                />
                {errors.cvv && <p className="text-red-400 text-[11px]">{errors.cvv}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name on Card</label>
              <input
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Full name"
                className={`w-full bg-white/[0.03] border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${errors.cardName ? "border-red-500/50" : "border-white/10"}`}
              />
              {errors.cardName && <p className="text-red-400 text-[11px]">{errors.cardName}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">UPI ID</label>
            <input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className={`w-full bg-white/[0.03] border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono transition-all ${errors.upiId ? "border-red-500/50" : "border-white/10"}`}
            />
            {errors.upiId && <p className="text-red-400 text-[11px]">{errors.upiId}</p>}
            <p className="text-xs text-slate-500">A payment request will be sent to your UPI app.</p>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <Shield size={13} className="text-slate-600 flex-shrink-0" />
          <p className="text-[11px] text-slate-600">256-bit encryption. We never store card details.</p>
        </div>

        <button
          onClick={handlePay}
          disabled={submitting}
          className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
          {submitting ? "Processing…" : `Pay ${plan.price}`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── API Keys Tab ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState<NewApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: apiKeysApi.getKeys,
  });

  const createMutation = useMutation({
    mutationFn: apiKeysApi.createKey,
    onSuccess: (data) => {
      setNewKey(data);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: () => toast.error("Failed to create API key."),
  });

  const revokeMutation = useMutation({
    mutationFn: apiKeysApi.revokeKey,
    onSuccess: () => {
      setRevokingId(null);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Key revoked.");
    },
    onError: () => {
      setRevokingId(null);
      toast.error("Failed to revoke key.");
    },
  });

  const handleCopy = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey.full_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="wise-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fff5c2' }}>
            <Key size={18} style={{ color: '#4a3b1c' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: '#0e0f0c' }}>API Keys</h2>
            <p className="text-xs mt-0.5" style={{ color: '#454745' }}>Authenticate automated workflows and external systems</p>
          </div>
        </div>
        <button
          onClick={() => { setNewKey(null); setShowModal(true); }}
          className="btn-wise-primary flex items-center gap-2"
          style={{ fontSize: '14px', padding: '10px 18px' }}
        >
          <Plus size={15} />
          Create Key
        </button>
      </div>

      {/* Keys List */}
      <div className="wise-card overflow-hidden" style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: '#fafcf9', borderBottom: '1px solid #e8ebe6' }}>
                {['Label', 'Prefix', 'Status', 'Last Used', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest ${i === 4 ? 'text-right' : ''}`} style={{ color: '#868685' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto mb-2" size={22} style={{ color: '#9fe870' }} />
                    <p className="text-sm" style={{ color: '#868685' }}>Loading keys…</p>
                  </td>
                </tr>
              ) : !keys || keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm" style={{ color: '#868685' }}>
                    No API keys yet. Create one to authenticate external integrations.
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="group transition-colors" style={{ borderBottom: '1px solid #f0f2ef' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafcf9')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold" style={{ color: '#0e0f0c' }}>{key.name}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: '#868685' }}>
                        {new Date(key.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <code className="px-2 py-0.5 rounded-md text-xs font-mono" style={{ background: '#e2f6d5', color: '#054d28' }}>
                        {key.key_prefix}…
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                        style={{
                          background: key.is_active ? '#e2f6d5' : '#fde8e9',
                          color:      key.is_active ? '#054d28' : '#a7000d',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: key.is_active ? '#2ead4b' : '#d03238' }} />
                        {key.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px]" style={{ color: '#868685' }}>
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          if (window.confirm('Revoke this key? Any system using it will lose access immediately.')) {
                            setRevokingId(key.id);
                            revokeMutation.mutate(key.id);
                          }
                        }}
                        disabled={!key.is_active || revokeMutation.isPending}
                        className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"
                        style={{ color: '#868685' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fde8e9'; (e.currentTarget as HTMLButtonElement).style.color = '#d03238'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#868685'; }}
                      >
                        {revokingId === key.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-7 space-y-6 ring-1 ring-white/15 shadow-[0_0_80px_rgba(99,102,241,0.12)]">
            {!newKey ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Generate API Key</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Create a secret key for automated workflows</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                    <X size={18} />
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const name = (fd.get("keyName") as string).trim();
                    if (!name) return;
                    createMutation.mutate({ name, scopes: ["task:read", "task:write"] });
                  }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Key Label
                    </label>
                    <input
                      name="keyName"
                      required
                      minLength={1}
                      placeholder="e.g. CI/CD Pipeline, Mobile App"
                      autoFocus
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-white/5 border border-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 text-xs"
                    >
                      {createMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Key size={14} />
                      )}
                      Generate
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="space-y-5 text-center">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Key Created</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    This is the <span className="text-emerald-400 font-bold">only time</span> this key will be shown.
                  </p>
                </div>
                <div className="bg-[#0a0a0a] p-3 rounded-xl border border-white/10 relative group text-left">
                  <p className="text-indigo-400 font-mono text-xs break-all pr-10 leading-relaxed">
                    {newKey.full_key}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-white/5 rounded-lg hover:bg-indigo-500 transition-all text-white"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs text-left">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  Store this key securely. If lost, you must revoke and regenerate.
                </div>
                <button
                  onClick={() => { setShowModal(false); setNewKey(null); }}
                  className="w-full py-2.5 bg-white/5 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-colors border border-white/10"
                >
                  I've Stored the Key
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── AI Providers Tab (BYOK) ─────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER_INFO: Record<AiProvider, { label: string; hint: string; placeholder: string; platformDefault: boolean }> = {
  groq: { label: "Groq", hint: "Used by default for every task unless you add your own key.", placeholder: "gsk_...", platformDefault: true },
  openai: { label: "OpenAI", hint: "Falls back to the platform key if you don't add your own.", placeholder: "sk-...", platformDefault: true },
  anthropic: { label: "Claude (Anthropic)", hint: "No platform key — add your own to use Claude.", placeholder: "sk-ant-...", platformDefault: false },
  gemini: { label: "Gemini", hint: "Falls back to the platform key if you don't add your own.", placeholder: "AIza...", platformDefault: true },
};

function ProviderKeysTab() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>("anthropic");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [removingProvider, setRemovingProvider] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["provider-keys"],
    queryFn: providerKeysApi.getKeys,
  });

  const setKeyMutation = useMutation({
    mutationFn: providerKeysApi.setKey,
    onSuccess: () => {
      setApiKeyInput("");
      queryClient.invalidateQueries({ queryKey: ["provider-keys"] });
      toast.success(`${PROVIDER_INFO[selectedProvider].label} key saved.`);
    },
    onError: () => toast.error("Failed to save key. Check it's valid and try again."),
  });

  const deleteKeyMutation = useMutation({
    mutationFn: providerKeysApi.deleteKey,
    onSuccess: () => {
      setRemovingProvider(null);
      queryClient.invalidateQueries({ queryKey: ["provider-keys"] });
      toast.success("Key removed.");
    },
    onError: () => {
      setRemovingProvider(null);
      toast.error("Failed to remove key.");
    },
  });

  const configured = new Map((keys ?? []).map((k) => [k.provider, k]));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="wise-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e2f6d5' }}>
          <Cpu size={18} style={{ color: '#2ead4b' }} />
        </div>
        <div>
          <h2 className="text-base font-semibold" style={{ color: '#0e0f0c' }}>AI Providers</h2>
          <p className="text-xs mt-0.5" style={{ color: '#454745' }}>
            Bring your own key to use Claude, OpenAI, or Gemini for your tasks instead of the platform default.
          </p>
        </div>
      </div>

      {/* Add / Replace a key */}
      <div className="wise-card space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#868685' }}>Add a Key</p>
        <div className="grid sm:grid-cols-[180px_1fr_auto] gap-3 items-start">
          <select
            value={selectedProvider}
            onChange={(e) => { setSelectedProvider(e.target.value as AiProvider); setApiKeyInput(""); }}
            className="wise-input"
            style={{ fontSize: '14px' }}
          >
            {(Object.keys(PROVIDER_INFO) as AiProvider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_INFO[p].label}
              </option>
            ))}
          </select>

          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={PROVIDER_INFO[selectedProvider].placeholder}
              autoComplete="off"
              className="wise-input pr-10 font-mono"
              style={{ fontSize: '14px' }}
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              aria-label={showKey ? "Hide key" : "Show key"}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: '#868685' }}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button
            onClick={() => setKeyMutation.mutate({ provider: selectedProvider, api_key: apiKeyInput.trim() })}
            disabled={apiKeyInput.trim().length < 8 || setKeyMutation.isPending}
            className="btn-wise-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontSize: '14px', padding: '10px 18px' }}
          >
            {setKeyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
            Save
          </button>
        </div>
        <p className="text-[11px]" style={{ color: '#868685' }}>{PROVIDER_INFO[selectedProvider].hint}</p>
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-xs"
          style={{ background: '#e2f6d5', color: '#054d28' }}
        >
          <Lock size={13} className="shrink-0 mt-0.5" />
          Your key is encrypted before it's stored and never shown again after saving — only a masked preview.
        </div>
      </div>

      {/* Configured providers */}
      <div className="wise-card overflow-hidden" style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: '#fafcf9', borderBottom: '1px solid #e8ebe6' }}>
                {['Provider', 'Key', 'Added', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest ${i === 3 ? 'text-right' : ''}`} style={{ color: '#868685' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto mb-2" size={22} style={{ color: '#9fe870' }} />
                    <p className="text-sm" style={{ color: '#868685' }}>Loading providers…</p>
                  </td>
                </tr>
              ) : configured.size === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm" style={{ color: '#868685' }}>
                    No personal keys added — every task uses the platform default (Groq).
                  </td>
                </tr>
              ) : (
                (Object.keys(PROVIDER_INFO) as AiProvider[])
                  .filter((p) => configured.has(p))
                  .map((provider) => {
                    const entry = configured.get(provider)!;
                    return (
                      <tr key={provider} className="group transition-colors" style={{ borderBottom: '1px solid #f0f2ef' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fafcf9')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold" style={{ color: '#0e0f0c' }}>{PROVIDER_INFO[provider].label}</p>
                        </td>
                        <td className="px-5 py-4">
                          <code className="px-2 py-0.5 rounded-md text-xs font-mono" style={{ background: '#e2f6d5', color: '#054d28' }}>
                            {entry.masked_key}
                          </code>
                        </td>
                        <td className="px-5 py-4 font-mono text-[11px]" style={{ color: '#868685' }}>
                          {new Date(entry.added_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove your ${PROVIDER_INFO[provider].label} key? Tasks will fall back to the platform default.`)) {
                                setRemovingProvider(provider);
                                deleteKeyMutation.mutate(provider);
                              }
                            }}
                            disabled={deleteKeyMutation.isPending}
                            aria-label={`Remove ${PROVIDER_INFO[provider].label} key`}
                            className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed"
                            style={{ color: '#868685' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fde8e9'; (e.currentTarget as HTMLButtonElement).style.color = '#d03238'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#868685'; }}
                          >
                            {removingProvider === provider ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Memory Tab ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function MemoryTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const { data: stats } = useQuery({
    queryKey: ["memory-stats"],
    queryFn: memoryApi.getStats,
  });

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ["memory-search", debouncedQuery],
    queryFn: () => memoryApi.search(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  });

  const deleteAllMutation = useMutation({
    mutationFn: memoryApi.deleteAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-stats"] });
      queryClient.removeQueries({ queryKey: ["memory-search"] });
      toast.success("Memory wiped.");
    },
    onError: () => toast.error("Failed to wipe memory."),
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="wise-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e2f6d5' }}>
            <Brain size={18} style={{ color: '#2ead4b' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: '#0e0f0c' }}>Agent Memory</h2>
            <p className="text-xs mt-0.5" style={{ color: '#454745' }}>
              <span className="font-bold" style={{ color: '#0e0f0c' }}>{stats?.count?.toLocaleString() ?? '…'}</span> memory vectors stored
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-wise-primary flex items-center gap-2"
            style={{ fontSize: '14px', padding: '9px 16px' }}
          >
            <Plus size={14} />
            Add Memory
          </button>
          <button
            onClick={() => {
              if (window.confirm('Wipe all agent memory? This cannot be undone.'))
                deleteAllMutation.mutate();
            }}
            className="px-4 py-2 rounded-[24px] text-xs font-bold uppercase tracking-widest transition-all"
            style={{ background: '#fde8e9', color: '#a7000d' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#d03238'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fde8e9'; (e.currentTarget as HTMLButtonElement).style.color = '#a7000d'; }}
          >
            Wipe All
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="wise-card space-y-4">
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#868685' }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memory vectors…"
            className="wise-input"
            style={{ paddingLeft: '40px', paddingRight: '36px' }}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {isFetching && <RefreshCw size={13} className="animate-spin" style={{ color: '#9fe870' }} />}
          </div>
        </div>

        {!searchResults && searchQuery.length === 0 && (
          <div className="py-12 text-center opacity-20 pointer-events-none select-none">
            <Database size={40} className="mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-widest">Type to search indexed vectors</p>
          </div>
        )}

        {searchResults?.length === 0 && (
          <p className="text-center py-8 text-slate-600 text-sm">No memory found for that query.</p>
        )}

        <div className="space-y-3">
          {searchResults?.map((res, i) => (
            <div
              key={`${res.task_id ?? "global"}-${res.created_at}-${i}`}
              className="p-4 bg-white/[0.02] border border-white/8 rounded-xl hover:border-indigo-500/20 transition-all group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity size={10} />
                  {(res.score * 100).toFixed(1)}% relevance
                </span>
                <span className="text-[10px] text-slate-600 font-mono">
                  {new Date(res.created_at || "").toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-white leading-relaxed">{res.content}</p>
              {res.task_id && (
                <p className="text-[10px] text-slate-600 mt-2">
                  Task: <code className="text-indigo-400/70">{res.task_id}</code>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <AddMemoryModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ["memory-stats"] });
            setShowAddModal(false);
            toast.success("Memory entry added.");
          }}
        />
      )}
    </div>
  );
}

function AddMemoryModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [content, setContent] = useState("");
  const [taskId, setTaskId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (content.trim().length < 5) return;
    setSaving(true);
    // Optimistic — real save would call a memoryApi.add endpoint
    // For now simulate a brief delay then call onAdded
    setTimeout(() => {
      setSaving(false);
      onAdded();
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-7 space-y-5 ring-1 ring-white/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pencil size={16} className="text-indigo-400" />
            <h3 className="text-base font-bold text-white">Add Memory Entry</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Manually inject a memory vector — useful for priming agents with context, facts, or preferences before running tasks.
        </p>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="e.g. The user prefers concise bullet-point summaries. Always cite sources."
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-600 resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Link to Task ID <span className="text-slate-700 normal-case font-normal">(optional)</span>
          </label>
          <input
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="task-uuid or leave blank for global"
            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-600 font-mono"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/5 border border-white/10 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={content.trim().length < 5 || saving}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 text-xs"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add Memory
          </button>
        </div>
      </div>
    </div>
  );
}
