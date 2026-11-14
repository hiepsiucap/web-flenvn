"use client";

import { ArrowUpRight, Camera, CheckCircle, Eye, EyeSlash, Flag, LockKey, SignOut, UserCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ApiEnvelope } from "@/lib/auth-types";
import { notifyClientDataChanged } from "@/lib/client-api";
import type { UserProfile } from "@/lib/dashboard-data";
import { API_TIMEOUT_MS } from "@/lib/fetch-with-timeout";
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
  return <div className="min-w-0 px-2 text-center"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 truncate text-lg font-bold tracking-tight sm:text-xl">{value}</p></div>;
}

export function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [streak, setStreak] = useState<StreakStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ username: "", email: "", avatar: null });
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const avatarInputRef = useRef<HTMLInputElement>(null);
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
      notifyClientDataChanged();
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
    window.location.replace("/?auth=login");
  }

  if (loading) return <LoadingState title="Loading settings" description="Getting your profile and learning goal ready." />;
  if (loadError || !profile || !streak) {
    return <EmptyState illustration="connection" title="Settings unavailable" description={loadError || "The settings service returned incomplete data."} action={<Button onClick={() => void loadSettings()}>Try again</Button>} />;
  }

  const avatar = avatarPreview ?? profileDraft.avatar;
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your account</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">A few small adjustments. A better learning routine.</p>
        </div>
        {hasUnsavedChanges ? <Badge variant="outline" className="h-7 px-3">Unsaved changes</Badge> : null}
      </header>

      <Tabs defaultValue="profile" className="grid items-start gap-5 data-horizontal:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-28">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-7">
            <div className="flex min-w-0 flex-col items-center gap-4 text-center">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-3xl font-bold sm:size-24 text-secondary-foreground" style={profile.avatar ? { backgroundImage: `url(${profile.avatar})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} aria-label="Account avatar">
                {profile.avatar ? null : initials(profile.username || profile.email)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{profile.username || "Your profile"}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 divide-x divide-border border-t border-border pt-5">
              <Stat label="Level" value={profile.level} />
              <Stat label="XP" value={profile.exp.toLocaleString()} />
              <Stat label="Streak" value={`${streak.currentStreak}d`} />
            </div>
          </div>
          <TabsList aria-label="Settings sections" className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1.5 group-data-horizontal/tabs:h-auto lg:grid-cols-1">
            {sections.map((section) => (
              <TabsTrigger key={section.id} value={section.id} className="h-11 justify-start gap-2.5 rounded-xl px-3 text-sm data-active:bg-primary/5 data-active:text-primary data-active:shadow-none">
                <Icon icon={section.icon} className="size-4" />
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </aside>

        <div className="min-w-0">
          <TabsContent value="profile">
            <Card className="min-h-[30rem] gap-0 rounded-3xl border border-border py-0 shadow-sm shadow-foreground/5">
              <CardHeader className="gap-2 border-b border-border px-5 py-6 sm:px-8 sm:py-8">
                <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">Make yourself at home</CardTitle>
                <CardDescription className="max-w-lg text-sm leading-relaxed sm:text-base">Your photo and the details that make this account yours.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={saveProfile}>
                  <div className="grid gap-8 p-5 sm:p-8">
                    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
                      <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-3xl sm:size-32 font-bold text-secondary-foreground" style={avatar ? { backgroundImage: `url(${avatar})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} aria-label="Avatar preview">
                        {avatar ? null : initials(profileDraft.username || profileDraft.email)}
                      </div>
                      <div className="min-w-0 space-y-2">
                        <p className="text-base font-semibold">Profile photo</p>
                        <Input ref={avatarInputRef} id="avatar" aria-label="Upload profile photo" type="file" accept={allowedAvatarTypes.join(",")} onChange={chooseAvatar} className="hidden" tabIndex={-1} disabled={profileSaving} />
                        <Button type="button" variant="outline" size="sm" disabled={profileSaving} onClick={() => avatarInputRef.current?.click()}>
                          <Icon icon={Camera} />Change photo
                        </Button>
                        <p className="text-xs leading-relaxed text-muted-foreground">JPG, PNG or WebP. Up to 5 MB.</p>
                        {avatarFile ? <p className="max-w-52 truncate text-xs font-medium">{avatarFile.name}</p> : null}
                        {profileSaving && uploadProgress > 0 ? <p className="text-xs text-muted-foreground" role="status">Uploading: {uploadProgress}%</p> : null}
                        <FieldError>{profileErrors.avatar}</FieldError>
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" autoComplete="nickname" className="h-12 rounded-xl text-base md:text-base" value={profileDraft.username} onChange={(event) => setProfileDraft((value) => ({ ...value, username: event.target.value }))} aria-invalid={Boolean(profileErrors.username)} />
                        <FieldError>{profileErrors.username}</FieldError>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input id="email" type="email" autoComplete="email" className="h-12 rounded-xl text-base md:text-base" value={profileDraft.email} onChange={(event) => setProfileDraft((value) => ({ ...value, email: event.target.value }))} aria-invalid={Boolean(profileErrors.email)} />
                        <FieldError>{profileErrors.email}</FieldError>
                      </div>
                    </div>
                    <SectionNotice notice={profileNotice} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-5 sm:px-8">
                    <p className="text-xs text-muted-foreground">{profileDirty ? "You have changes ready to save." : "Your profile is up to date."}</p>
                    <Button type="submit" className="h-11 px-6" disabled={!profileDirty || profileSaving}>{profileSaving ? "Saving…" : "Save profile"}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="learning-goal">
            <Card className="min-h-[30rem] gap-0 rounded-3xl border border-border py-0 shadow-sm shadow-foreground/5">
              <CardHeader className="gap-2 border-b border-border px-5 py-6 sm:px-8 sm:py-8">
                <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">Find your daily rhythm</CardTitle>
                <CardDescription className="max-w-lg text-sm leading-relaxed sm:text-base">Choose a goal that fits the time you have.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={saveGoal}>
                  <div className="grid gap-8 p-5 sm:p-8">
                    <div className="grid grid-cols-3 divide-x divide-border rounded-2xl bg-muted/30 py-4">
                      <Stat label="Today" value={`${streak.todayScore} pts`} />
                      <Stat label="Daily goal" value={`${streak.dailyTarget} pts`} />
                      <Stat label="Streak" value={`${streak.currentStreak} days`} />
                    </div>
                    {streak.nextDailyTarget ? <Alert><AlertTitle>Pending target: {streak.nextDailyTarget} points</AlertTitle><AlertDescription>Effective {streak.targetEffectiveDate ? new Date(streak.targetEffectiveDate).toLocaleDateString() : "next local day"}.</AlertDescription></Alert> : null}
                    <fieldset className="min-w-0 space-y-3">
                      <legend className="text-sm font-medium">Daily target</legend>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {targetPresets.map((preset) => (
                          <Button key={preset} type="button" variant="outline" aria-pressed={target === preset} className={cn("h-auto justify-between gap-2 rounded-2xl border-border px-4 py-4 text-left", target === preset && "bg-primary/5 text-primary")} onClick={() => setTarget(preset)}>
                            <span className="grid gap-1"><span className="text-base font-bold">{preset} points</span><span className="text-xs font-normal text-muted-foreground">{preset === 50 ? "Keep it light" : preset === 100 ? "Build a routine" : "Go a little further"}</span></span>
                            {target === preset ? <Icon icon={CheckCircle} weight="fill" /> : null}
                          </Button>
                        ))}
                      </div>
                    </fieldset>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="grid content-start gap-2">
                        <Label htmlFor="custom-target">Custom target</Label>
                        <Input id="custom-target" className="h-12 rounded-xl text-base md:text-base" type="number" min={10} max={20000} step={1} value={target} onChange={(event) => setTarget(Number(event.target.value))} aria-invalid={Boolean(goalErrors.target)} />
                        <FieldError>{goalErrors.target}</FieldError>
                      </div>
                      <div className="grid content-start gap-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Input id="timezone" className="h-12 min-w-0 rounded-xl text-base md:text-base" list="timezone-options" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Asia/Bangkok" aria-invalid={Boolean(goalErrors.timezone)} />
                        <datalist id="timezone-options">{timezones.map((item) => <option key={item} value={item} />)}</datalist>
                        <FieldError>{goalErrors.timezone}</FieldError>
                      </div>
                    </div>
                    <SectionNotice notice={goalNotice} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-5 sm:px-8">
                    <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">Target changes start on your next local day.</p>
                    <Button type="submit" className="h-11 px-6" disabled={!goalDirty || goalSaving}>{goalSaving ? "Saving…" : "Save learning goal"}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="min-h-[30rem] gap-0 rounded-3xl border border-border py-0 shadow-sm shadow-foreground/5">
              <CardHeader className="gap-2 border-b border-border px-5 py-6 sm:px-8 sm:py-8">
                <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">Keep your account secure</CardTitle>
                <CardDescription className="max-w-lg text-sm leading-relaxed sm:text-base">Choose a password you don’t use elsewhere.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={changePassword}>
                  <div className="grid gap-6 p-5 sm:p-8">
                    {(["oldPassword", "newPassword", "confirmPassword"] as const).map((field) => {
                      const labels = { oldPassword: "Current password", newPassword: "New password", confirmPassword: "Confirm new password" };
                      return (
                        <div className="grid max-w-lg gap-2" key={field}>
                          <Label htmlFor={field}>{labels[field]}</Label>
                          <div className="relative">
                            <Input className="h-12 rounded-xl pr-12 text-base md:text-base" id={field} type={passwordVisible[field] ? "text" : "password"} autoComplete={field === "oldPassword" ? "current-password" : "new-password"} value={passwords[field]} onChange={(event) => setPasswords((value) => ({ ...value, [field]: event.target.value }))} aria-invalid={Boolean(passwordErrors[field])} />
                            <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-12 w-12 rounded-xl" onClick={() => setPasswordVisible((value) => ({ ...value, [field]: !value[field] }))} aria-label={`${passwordVisible[field] ? "Hide" : "Show"} ${labels[field].toLowerCase()}`}>
                              <Icon icon={passwordVisible[field] ? EyeSlash : Eye} />
                            </Button>
                          </div>
                          {field === "newPassword" ? <p className="text-xs text-muted-foreground">Use at least 8 characters.</p> : null}
                          <FieldError>{passwordErrors[field]}</FieldError>
                        </div>
                      );
                    })}
                    <SectionNotice notice={passwordNotice} />
                  </div>
                  <div className="flex justify-end border-t border-border px-5 py-5 sm:px-8">
                    <Button type="submit" className="h-11 px-6" disabled={!passwordDirty || passwordSaving}>{passwordSaving ? "Changing…" : "Change password"}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card className="min-h-[30rem] gap-0 rounded-3xl border border-border py-0 shadow-sm shadow-foreground/5">
              <CardHeader className="gap-2 border-b border-border px-5 py-6 sm:px-8 sm:py-8">
                <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">Account &amp; access</CardTitle>
                <CardDescription className="max-w-lg text-sm leading-relaxed sm:text-base">Your account status, privacy, and current session.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border px-5 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3 py-7">
                  <div className="min-w-0"><p className="text-sm font-medium">Email verification</p><p className="mt-1 break-all text-sm text-muted-foreground">{profile.email}</p></div>
                  <Badge variant={profile.isEmailVerified ? "secondary" : "outline"}>{profile.isEmailVerified ? "Verified" : "Not verified"}</Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 py-7">
                  <div><p className="text-sm font-medium">Your privacy</p><p className="mt-1 text-sm text-muted-foreground">Learn how your information is handled.</p></div>
                  <Button render={<Link href="/privacy" />} variant="outline" size="sm">Privacy policy<Icon icon={ArrowUpRight} /></Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 py-7">
                  <div><p className="text-sm font-medium">Sign out</p><p className="mt-1 text-sm text-muted-foreground">End your session on this device.</p></div>
                  <Button type="button" variant="destructive" onClick={() => void logout()}><Icon icon={SignOut} />Log out this device</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
