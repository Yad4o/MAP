// STUB REPLACED — implementing all tabs per task instructions

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
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
  Activity
} from "lucide-react";
import { UpdateProfileRequest, ChangePasswordRequest, UserResponse, NewApiKeyResponse } from "../types";

/**
 * SettingsPage provides a central hub for user profile, security, and memory management.
 */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "keys" | "memory">("profile");
  const { user } = useAuthStore();

  const tabs = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "keys", label: "API Keys", icon: Key },
    { id: "memory", label: "Agent Memory", icon: Database },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 mt-2">Manage your account, security, and system preferences.</p>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 w-fit shadow-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${isActive
                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30 ring-1 ring-white/20"
                : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                }`}
            >
              <Icon size={16} className={isActive ? "animate-pulse" : ""} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Rendering */}
      <div className="mt-8 transition-all duration-500 min-h-[600px]">
        {activeTab === "profile" && <ProfileTab user={user} />}
        {activeTab === "keys" && <ApiKeysTab />}
        {activeTab === "memory" && <MemoryTab />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Profile Tab Components ───────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: UserResponse | null }) {
  const setUser = useAuthStore(s => s.setUser);

  const profileForm = useForm<UpdateProfileRequest>({
    defaultValues: { username: user?.username || "" }
  });

  const passwordForm = useForm<ChangePasswordRequest & { confirm: string }>();

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success("Profile updated successfully!");
    },
    onError: () => toast.error("Failed to update profile. Please try again.")
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ confirm: _, ...payload }: ChangePasswordRequest & { confirm: string }) =>
      authApi.changePassword(payload),
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Password changed successfully!");
    },
    onError: () => toast.error("Failed to change password. Check your current password and try again.")
  });

  if (!user) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Info Card */}
      <div className="glass-card p-6 lg:sticky lg:top-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-3xl font-bold text-white shadow-2xl shadow-violet-500/20 ring-4 ring-white/5">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{user.username}</h2>
            <p className="text-slate-500 text-sm font-mono">{user.email}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-violet-400">
              {user.tier} Plan
            </span>
            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Forms Area */}
      <div className="lg:col-span-2 space-y-8">
        {/* Username Update */}
        <section className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <UserIcon size={20} className="text-violet-400" />
            <h3 className="text-lg font-bold text-white">General Information</h3>
          </div>
          <form onSubmit={profileForm.handleSubmit(data => updateProfileMutation.mutate(data))} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Username</label>
              <input
                {...profileForm.register("username", { required: "Username is required", minLength: 3 })}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
              />
              {profileForm.formState.errors.username && (
                <p className="text-red-400 text-xs mt-1">{profileForm.formState.errors.username.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {updateProfileMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </form>
        </section>

        {/* Password Update */}
        <section className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={20} className="text-violet-400" />
            <h3 className="text-lg font-bold text-white">Security & Password</h3>
          </div>
          <form
            onSubmit={passwordForm.handleSubmit(data => changePasswordMutation.mutate(data))}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-full">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Password</label>
                <input
                  type="password"
                  {...passwordForm.register("current_password", { required: "Required" })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/40 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">New Password</label>
                <input
                  type="password"
                  {...passwordForm.register("new_password", { required: "Required", minLength: 8 })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/40 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Confirm New Password</label>
                <input
                  type="password"
                  {...passwordForm.register("confirm", {
                    required: "Required",
                    validate: val => val === passwordForm.getValues("new_password") || "Passwords don't match"
                  })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/40 transition-all"
                />
                {passwordForm.formState.errors.confirm && (
                  <p className="text-red-400 text-xs mt-1">{passwordForm.formState.errors.confirm.message}</p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {changePasswordMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              Update Security Credentials
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── API Keys Tab Components ──────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState<NewApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: apiKeysApi.getKeys
  });

  const createMutation = useMutation({
    mutationFn: apiKeysApi.createKey,
    onSuccess: (data) => {
      setNewKey(data);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: () => toast.error("Failed to create key. Please try again.")
  });

  const revokeMutation = useMutation({
    mutationFn: apiKeysApi.revokeKey,
    onSuccess: () => {
      setRevokingId(null);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: () => {
      setRevokingId(null);
      toast.error("Failed to revoke key. Please try again.");
    }
  });

  const handleCopy = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey.full_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Stats and Action Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 glass-card p-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">API Access Keys</h2>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-1">Authenticate agents and external systems</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 px-6 py-3"
        >
          <Plus size={18} />
          Create New Key
        </button>
      </div>

      {/* Keys List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-8 py-5">Label</th>
                <th className="px-8 py-5">Prefix</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Last Used</th>
                <th className="px-8 py-5 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center">
                    <Loader2 className="animate-spin mx-auto text-violet-500 mb-2" size={32} />
                    <p className="text-slate-500 text-sm">Fetching credentials...</p>
                  </td>
                </tr>
              ) : keys?.map(key => (
                <tr key={key.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="text-sm font-bold text-white">{key.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">Created {new Date(key.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-8 py-5">
                    <code className="text-violet-400 px-2 py-1 bg-violet-400/10 rounded font-mono text-xs">{key.key_prefix}...</code>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${key.is_active ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'
                      }`}>
                      <span className={`w-1 h-1 rounded-full ${key.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {key.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-slate-500 font-mono text-[10px]">
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button
                      onClick={() => { 
                        if (window.confirm("Are you sure? This will break any system using this key.")) {
                          setRevokingId(key.id);
                          revokeMutation.mutate(key.id); 
                        }
                      }}
                      disabled={!key.is_active || revokeMutation.isPending}
                      className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/10 opacity-0 group-hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:text-slate-500 disabled:hover:bg-transparent"
                    >
                      {revokingId === key.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-8 space-y-8 animate-in zoom-in duration-300 shadow-[0_0_100px_rgba(139,92,246,0.15)] ring-1 ring-white/20">
            {!newKey ? (
              <>
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-violet-500/20 rounded-2xl flex items-center justify-center mx-auto text-violet-400">
                    <Key size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Generate Access Key</h3>
                  <p className="text-slate-400 text-sm">Create a secret key to authenticate your automated workflows.</p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const name = (fd.get("keyName") as string).trim();
                    if (!name) return;
                    createMutation.mutate({ name, scopes: ["task:read", "task:write"] });
                  }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Key Name (e.g., CI/CD Pipeline)</label>
                    <input name="keyName" required minLength={1} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500/40 outline-none transition-all" />
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all">Cancel</button>
                    <button type="submit" disabled={createMutation.isPending} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                      {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                      Generate Key
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Generation Successful</h3>
                  <p className="text-slate-400 text-sm mt-1 px-4">This is the <span className="text-emerald-400 font-bold">only time</span> the secret key will be shown.</p>
                </div>

                <div className="bg-[#020617] p-4 rounded-2xl border border-white/10 relative group">
                  <div className="text-violet-400 font-mono text-sm break-all pr-12 text-left leading-relaxed">
                    {newKey.full_key}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="absolute top-1/2 -translate-y-1/2 right-3 p-2 bg-white/5 rounded-xl hover:bg-violet-500 transition-all text-white"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 text-xs text-left leading-relaxed">
                  <AlertTriangle size={24} className="shrink-0" />
                  Please store this key securely. If lost, you must revoke and regenerate it.
                </div>

                <button
                  onClick={() => { setShowModal(false); setNewKey(null); }}
                  className="w-full py-4 bg-slate-800 text-white rounded-2xl text-sm font-bold tracking-widest hover:bg-slate-700 transition-colors"
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
// ── Memory Tab Components ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function MemoryTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const { data: stats } = useQuery({
    queryKey: ["memory-stats"],
    queryFn: memoryApi.getStats
  });

  const { data: searchResults, isFetching } = useQuery({
    queryKey: ["memory-search", debouncedQuery],
    queryFn: () => memoryApi.search(debouncedQuery),
    enabled: debouncedQuery.length > 2
  });

  const deleteAllMutation = useMutation({
    mutationFn: memoryApi.deleteAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memory-stats"] });
      queryClient.removeQueries({ queryKey: ["memory-search"] });
      toast.success("System memory wiped.");
    },
    onError: () => toast.error("Failed to wipe memory. Please try again.")
  });

  return (
    <div className="space-y-8">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center glass-card p-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-inner">
            <History size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">System Knowledge Base</h2>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mt-1">Stored experiences and task memories</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-6 text-right sm:text-left">
          <div>
            <div className="text-3xl font-black text-white tracking-tighter">{stats?.count?.toLocaleString() ?? "..."}</div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Memory Units</div>
          </div>
          <button
            onClick={() => { if (window.confirm("Permanently wipe all agent memory? This cannot be undone.")) deleteAllMutation.mutate(); }}
            className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-500/30"
          >
            Factory Reset Memory
          </button>
        </div>
      </div>

      {/* Search Section */}
      <div className="glass-card p-8 flex flex-col gap-6">
        <div className="relative">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Query memory system for specific patterns..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-white focus:ring-2 focus:ring-violet-500/40 outline-none transition-all placeholder:text-slate-600"
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            {isFetching && <RefreshCw size={16} className="animate-spin text-violet-500" />}
          </div>
        </div>

        {/* Search Results */}
        <div className="space-y-4">
          {!searchResults && searchQuery.length === 0 && (
            <div className="py-20 text-center opacity-30 select-none pointer-events-none">
              <Database size={64} className="mx-auto mb-4" />
              <p className="text-sm font-bold uppercase tracking-[0.2em]">Enter query to search indexed vectors</p>
            </div>
          )}

          {searchResults?.length === 0 && (
            <p className="text-center py-10 text-slate-500">No signals found matching that pattern.</p>
          )}

          {searchResults?.map((res, i) => (
            <div key={`${res.task_id ?? "global"}-${res.created_at}-${i}`} className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl hover:border-violet-500/30 transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-3 relative z-10">
                <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={10} />
                  Signal Score: {(res.score * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold text-slate-600 font-mono">{new Date(res.created_at || "").toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-white leading-relaxed mb-4 relative z-10">{res.content}</p>
              {res.task_id && (
                <div className="text-[10px] text-slate-500 relative z-10">Linked to Task Context: <code className="text-violet-400/80">{res.task_id}</code></div>
              )}

              {/* Aesthetic accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-[40px] rounded-full group-hover:bg-violet-600/10 transition-all duration-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
