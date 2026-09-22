"use client";

import { CheckCircle, Eye, EyeSlash, Flag, LockKey, SignOut, UserCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { Text } from "@/components/ui/text";
import type { ApiEnvelope } from "@/lib/auth-types";
import type { UserProfile } from "@/lib/dashboard-data";
import { API_TIMEOUT_MS, fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { HttpError, http } from "@/lib/http";
import type { StreakStatus, UpdateStreakSettingsResponse } from "@/lib/streak-types";

type Notice = { kind: "success" | "error"; message: string } | null;
type ProfileDraft = { username: string; email: string; avatar: string | null };
type PresignResponse = { uploadUrl: string; fileUrl: string; headers?: Record<string, string> };

const sections = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "learning-goal", label: "Learning goal", icon: Flag },
  { id: "security", label: "Security", icon: LockKey },
  { id: "account", label: "Account", icon: CheckCircle },
] as const;
const targetPresets = [50, 100, 200];
const maxAvatarBytes = 5 * 1024 * 1024;
const allowedAvatarTypes = ["image/jpeg", "image/png", "image/webp"];

function unwrap<T>(value: ApiEnvelope<T> | T): T {
  return value && typeof value === "object" && "data" in value ? (value as ApiEnvelope<T>).data : value as T;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError && error.data && typeof error.data === "object") {
    const message = (error.data as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join(" ");
    if (message) return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function initials(value: string) {
  return value.replace(/@.*/, "").split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("") || "F";
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="text-sm text-destructive" role="alert">{children}</p> : null;
}

function SectionNotice({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <Alert variant={notice.kind === "error" ? "destructive" : "default"}>
      <AlertTitle>{notice.kind === "success" ? "Saved" : "Could not save"}</AlertTitle>
      <AlertDescription>{notice.message}</AlertDescription>
    </Alert>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-border bg-background p-3"><Text size="xs" tone="muted">{label}</Text><Text className="mt-1" weight="semibold">{value}</Text></div>;
}

export function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [streak, setStreak] = useState<StreakStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ username: "", email: "", avatar: null });
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [target, setTarget] = useState(100);
  const [timezone, setTimezone] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalNotice, setGoalNotice] = useState<Notice>(null);
  const [goalErrors, setGoalErrors] = useState<Record<string, string>>({});
  const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  async function loadSettings() {
    setLoading(true);
    setLoadError("");
    try {
      const [profileResponse, streakResponse] = await Promise.all([
        http.get<ApiEnvelope<UserProfile> | UserProfile>("/api/users/profile", { cache: "no-store" }),
        http.get<ApiEnvelope<StreakStatus> | StreakStatus>("/api/streak", { cache: "no-store" }),
      ]);
      const nextProfile = unwrap(profileResponse);
      const nextStreak = unwrap(streakResponse);
      setProfile(nextProfile);
      setStreak(nextStreak);
      setProfileDraft({ username: nextProfile.username ?? "", email: nextProfile.email, avatar: nextProfile.avatar ?? null });
      setTarget(nextStreak.nextDailyTarget ?? nextStreak.dailyTarget);
      setTimezone(nextStreak.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch (error) {
      setLoadError(errorMessage(error, "Unable to load settings. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const task = window.setTimeout(() => { void loadSettings(); }, 0);
    return () => window.clearTimeout(task);
  }, []);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  const profileDirty = Boolean(profile) && (profileDraft.username !== (profile?.username ?? "") || profileDraft.email !== profile?.email || avatarFile !== null);
  const goalDirty = Boolean(streak) && (target !== (streak?.nextDailyTarget ?? streak?.dailyTarget) || timezone !== streak?.timezone);
  const passwordDirty = Object.values(passwords).some(Boolean);
  const hasUnsavedChanges = profileDirty || goalDirty || passwordDirty;

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
    }
    function confirmNavigation(event: MouseEvent) {
      if (!hasUnsavedChanges || event.defaultPrevented || event.button !== 0) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor) return;
      const destination = new URL(anchor.href, window.location.href);
      const staysOnSection = destination.pathname === window.location.pathname && destination.search === window.location.search;
      if (staysOnSection || window.confirm("You have unsaved settings. Leave without saving?")) return;
      event.preventDefault();
      event.stopPropagation();
    }
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", confirmNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", confirmNavigation, true);
    };
  }, [hasUnsavedChanges]);

  const timezones = useMemo(() => {
    const common = ["Asia/Bangkok", "Asia/Ho_Chi_Minh", "Asia/Singapore", "Asia/Tokyo", "Europe/London", "America/New_York"];
    const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : common;
    return Array.from(new Set([timezone, ...common, ...supported])).filter(Boolean);
  }, [timezone]);

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setProfileNotice(null);
    if (!file) return;
    if (!allowedAvatarTypes.includes(file.type)) {
      setProfileErrors({ avatar: "Choose a JPEG, PNG, or WebP image." });
      event.target.value = "";
      return;
    }
    if (file.size > maxAvatarBytes) {
      setProfileErrors({ avatar: "Avatar must be 5 MB or smaller." });
      event.target.value = "";
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileErrors({});
  }

  async function uploadAvatar(file: File) {
    const presign = unwrap(await http.post<ApiEnvelope<PresignResponse> | PresignResponse, { contentType: string; fileName: string; folder: string }>(
      "/api/uploads/presign-image", { contentType: file.type, fileName: file.name, folder: "avatars" }
    ));
    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("PUT", presign.uploadUrl);
      request.timeout = API_TIMEOUT_MS;
      request.setRequestHeader("Content-Type", file.type);
      Object.entries(presign.headers ?? {}).forEach(([key, value]) => request.setRequestHeader(key, value));
      request.upload.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100)); };
      request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("Avatar upload failed."));
      request.onerror = () => reject(new Error("Avatar upload failed."));
      request.ontimeout = () => reject(new Error("Avatar upload timed out."));
      request.send(file);
    });
    return presign.fileUrl;
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (profileDraft.username.trim().length < 2) errors.username = "Username must contain at least 2 characters.";
    if (!/^\S+@\S+\.\S+$/.test(profileDraft.email.trim())) errors.email = "Enter a valid email address.";
    setProfileErrors(errors);
    if (Object.keys(errors).length) return;
    setProfileSaving(true);
    setProfileNotice(null);
    try {
      setUploadProgress(0);
      const avatar = avatarFile ? await uploadAvatar(avatarFile) : profileDraft.avatar;
      const saved = unwrap(await http.put<ApiEnvelope<UserProfile> | UserProfile, ProfileDraft>("/api/users/profile", {
        username: profileDraft.username.trim(), email: profileDraft.email.trim(), avatar,
      }));
      setProfile(saved);
      setProfileDraft({ username: saved.username ?? "", email: saved.email, avatar: saved.avatar ?? avatar });
      setAvatarFile(null);
      setAvatarPreview(null);
      setProfileNotice({ kind: "success", message: saved.email !== profile?.email ? "Profile saved. Please verify your new email address." : "Your profile has been updated." });
      router.refresh();
    } catch (error) {
      setProfileNotice({ kind: "error", message: errorMessage(error, "Unable to update your profile.") });
    } finally {
      setProfileSaving(false);
      setUploadProgress(0);
    }
  }

  async function saveGoal(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!Number.isInteger(target) || target < 10 || target > 20000) errors.target = "Target must be a whole number from 10 to 20,000.";
    if (!validTimezone(timezone)) errors.timezone = "Enter a valid IANA timezone, such as Asia/Bangkok.";
    setGoalErrors(errors);
    if (Object.keys(errors).length) return;
    setGoalSaving(true);
    setGoalNotice(null);
    try {
      const result = unwrap(await http.patch<ApiEnvelope<UpdateStreakSettingsResponse> | UpdateStreakSettingsResponse, { dailyTarget: number; timezone: string }>(
        "/api/streak/settings", { dailyTarget: target, timezone }
      ));
      setStreak((current) => current ? { ...current, timezone: result.timezone, nextDailyTarget: result.nextDailyTarget, targetEffectiveDate: result.effectiveDate } : current);
      setGoalNotice({ kind: "success", message: result.nextDailyTarget ? "Your new target will start on the next local day." : "Your learning goal has been updated." });
    } catch (error) {
      setGoalNotice({ kind: "error", message: errorMessage(error, "Unable to update your learning goal.") });
    } finally { setGoalSaving(false); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!passwords.oldPassword) errors.oldPassword = "Enter your current password.";
    if (passwords.newPassword.length < 8) errors.newPassword = "New password must contain at least 8 characters.";
    if (passwords.confirmPassword !== passwords.newPassword) errors.confirmPassword = "Passwords do not match.";
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;
    setPasswordSaving(true);
    setPasswordNotice(null);
    try {
      await http.post("/api/users/change-password", passwords);
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordNotice({ kind: "success", message: "Your password has been changed." });
    } catch (error) {
      setPasswordNotice({ kind: "error", message: errorMessage(error, "Unable to change your password.") });
    } finally { setPasswordSaving(false); }
  }

  async function logout() {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("refreshToken");
    window.sessionStorage.removeItem("accessToken");
    window.sessionStorage.removeItem("refreshToken");
    await fetchWithTimeout("/api/auth/logout", { method: "POST", cache: "no-store", credentials: "same-origin" }).catch(() => null);
    window.location.replace("/");
  }

  if (loading) return <LoadingState title="Loading settings" description="Getting your profile and learning goal ready." />;
  if (loadError || !profile || !streak) {
    return <Card className="mx-auto max-w-xl rounded-3xl"><CardHeader><CardTitle>Settings unavailable</CardTitle><CardDescription>{loadError || "The settings service returned incomplete data."}</CardDescription></CardHeader><CardContent><Button type="button" onClick={() => void loadSettings()}>Try again</Button></CardContent></Card>;
  }

  const avatar = avatarPreview ?? profileDraft.avatar;
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <header><h1 className="text-2xl font-semibold">Settings</h1><Text className="mt-2" size="sm" tone="muted">Manage your profile, learning goal, and account security.</Text></header>
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="sticky top-24 hidden rounded-2xl border border-border bg-card p-2 lg:grid">
          {sections.map((section) => <a key={section.id} href={`#${section.id}`} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><Icon icon={section.icon} />{section.label}</a>)}
        </nav>
        <div className="grid gap-5">
          <Card id="profile" className="scroll-mt-24 rounded-3xl">
            <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Update the details shown across FLEN.</CardDescription></CardHeader>
            <CardContent><form className="grid gap-5" onSubmit={saveProfile}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-xl font-bold text-secondary-foreground" style={avatar ? { backgroundImage: `url(${avatar})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} aria-label="Avatar preview">{avatar ? null : initials(profileDraft.username || profileDraft.email)}</div>
                <div className="grid gap-2"><Label htmlFor="avatar">Avatar</Label><Input id="avatar" type="file" accept={allowedAvatarTypes.join(",")} onChange={chooseAvatar} className="max-w-sm" /><Text size="xs" tone="muted">JPEG, PNG, or WebP. Maximum 5 MB.</Text>{profileSaving && uploadProgress > 0 ? <Text size="xs" role="status">Uploading: {uploadProgress}%</Text> : null}<FieldError>{profileErrors.avatar}</FieldError></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="username">Username</Label><Input id="username" value={profileDraft.username} onChange={(event) => setProfileDraft((value) => ({ ...value, username: event.target.value }))} aria-invalid={Boolean(profileErrors.username)} /><FieldError>{profileErrors.username}</FieldError></div>
                <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={profileDraft.email} onChange={(event) => setProfileDraft((value) => ({ ...value, email: event.target.value }))} aria-invalid={Boolean(profileErrors.email)} /><FieldError>{profileErrors.email}</FieldError></div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Level" value={profile.level} /><Stat label="EXP" value={profile.exp.toLocaleString()} /><Stat label="Streak" value={`${streak.currentStreak} days`} /><Stat label="Email" value={profile.isEmailVerified ? "Verified" : "Unverified"} /></div>
              <SectionNotice notice={profileNotice} /><div><Button type="submit" disabled={!profileDirty || profileSaving}>{profileSaving ? "Saving…" : "Save profile"}</Button></div>
            </form></CardContent>
          </Card>

          <Card id="learning-goal" className="scroll-mt-24 rounded-3xl">
            <CardHeader><CardTitle>Learning goal</CardTitle><CardDescription>Target changes take effect at the start of your next local day.</CardDescription></CardHeader>
            <CardContent><form className="grid gap-5" onSubmit={saveGoal}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Stat label="Today" value={`${streak.todayScore} pts`} /><Stat label="Current target" value={`${streak.dailyTarget} pts`} /><Stat label="Streak" value={`${streak.currentStreak} days`} /></div>
              {streak.nextDailyTarget ? <Alert><AlertTitle>Pending target: {streak.nextDailyTarget} points</AlertTitle><AlertDescription>Effective {streak.targetEffectiveDate ? new Date(streak.targetEffectiveDate).toLocaleDateString() : "next local day"}.</AlertDescription></Alert> : null}
              <div className="grid gap-2"><Label>Daily target</Label><div className="flex flex-wrap gap-2">{targetPresets.map((preset) => <Button key={preset} type="button" variant={target === preset ? "default" : "outline"} onClick={() => setTarget(preset)}>{preset} points</Button>)}</div></div>
              <div className="grid gap-2"><Label htmlFor="custom-target">Custom target</Label><Input id="custom-target" type="number" min={10} max={20000} step={1} value={target} onChange={(event) => setTarget(Number(event.target.value))} aria-invalid={Boolean(goalErrors.target)} /><FieldError>{goalErrors.target}</FieldError></div>
              <div className="grid gap-2"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" list="timezone-options" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Asia/Bangkok" aria-invalid={Boolean(goalErrors.timezone)} /><datalist id="timezone-options">{timezones.map((item) => <option key={item} value={item} />)}</datalist><FieldError>{goalErrors.timezone}</FieldError></div>
              <SectionNotice notice={goalNotice} /><div><Button type="submit" disabled={!goalDirty || goalSaving}>{goalSaving ? "Saving…" : "Save learning goal"}</Button></div>
            </form></CardContent>
          </Card>

          <Card id="security" className="scroll-mt-24 rounded-3xl">
            <CardHeader><CardTitle>Security</CardTitle><CardDescription>Use at least eight characters for your new password.</CardDescription></CardHeader>
            <CardContent><form className="grid max-w-xl gap-4" onSubmit={changePassword}>
              {(["oldPassword", "newPassword", "confirmPassword"] as const).map((field) => {
                const labels = { oldPassword: "Current password", newPassword: "New password", confirmPassword: "Confirm new password" };
                return <div className="grid gap-2" key={field}><Label htmlFor={field}>{labels[field]}</Label><div className="relative"><Input className="pr-10" id={field} type={passwordVisible[field] ? "text" : "password"} autoComplete={field === "oldPassword" ? "current-password" : "new-password"} value={passwords[field]} onChange={(event) => setPasswords((value) => ({ ...value, [field]: event.target.value }))} aria-invalid={Boolean(passwordErrors[field])} /><button type="button" className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground" onClick={() => setPasswordVisible((value) => ({ ...value, [field]: !value[field] }))} aria-label={`${passwordVisible[field] ? "Hide" : "Show"} ${labels[field].toLowerCase()}`}><Icon icon={passwordVisible[field] ? EyeSlash : Eye} /></button></div><FieldError>{passwordErrors[field]}</FieldError></div>;
              })}
              <SectionNotice notice={passwordNotice} /><div><Button type="submit" disabled={!passwordDirty || passwordSaving}>{passwordSaving ? "Changing…" : "Change password"}</Button></div>
            </form></CardContent>
          </Card>

          <Card id="account" className="scroll-mt-24 rounded-3xl">
            <CardHeader><CardTitle>Account</CardTitle><CardDescription>Review your account status and current session.</CardDescription></CardHeader>
            <CardContent className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><Text weight="medium">Email verification</Text><Text size="sm" tone="muted">{profile.email}</Text></div><Badge variant={profile.isEmailVerified ? "secondary" : "outline"}>{profile.isEmailVerified ? "Verified" : "Not verified"}</Badge></div>
              <div className="flex flex-wrap gap-2"><Button render={<Link href="/privacy" />} variant="outline">Privacy policy</Button><Button type="button" variant="destructive" onClick={() => void logout()}><Icon icon={SignOut} />Log out this device</Button></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
