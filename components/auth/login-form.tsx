"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "react-toastify";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HttpError, http } from "@/lib/http";
import type { ApiErrorResponse, LoginResponse } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

type FieldErrors = Partial<Record<"email" | "password", string>>;

function formatMessage(message: ApiErrorResponse["message"] | undefined) {
  if (Array.isArray(message)) {
    return message.filter(Boolean).join(", ");
  }

  return message;
}

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return formatMessage(data?.message) || "Unable to sign in";
  }

  return "Unable to sign in";
}

function getFieldErrors(error: unknown): FieldErrors {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return data?.errors ?? {};
  }

  return {};
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasGeneralError =
    Boolean(error) && !fieldErrors.email && !fieldErrors.password;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await http.post<LoginResponse>("/api/auth/login", {
        email,
        password,
      });

      window.localStorage.setItem("accessToken", response.data.accessToken);
      window.localStorage.setItem("refreshToken", response.data.refreshToken);
      setSuccess(response.message ?? "Signed in successfully");
      toast.success(response.message ?? "Signed in successfully");
      window.location.assign("/dashboard");
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      const nextFieldErrors = getFieldErrors(requestError);

      setError(message);
      setFieldErrors(nextFieldErrors);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-[420px] rounded-2xl border border-border/80 shadow-xl shadow-brand-800/10">
      <CardHeader className="gap-2 px-6 pt-6">
        <CardTitle className="text-2xl font-semibold">Log in to FLEN</CardTitle>
        <CardDescription>
          Access your decks, saved cards, and study progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form className="grid gap-5" onSubmit={handleSubmit}>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Sign in failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <CheckCircle2 className="size-4 text-primary" />
              <AlertTitle>Signed in</AlertTitle>
              <AlertDescription>
                {success}. Your study dashboard is ready.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                aria-invalid={Boolean(fieldErrors.email) || hasGeneralError}
                className={cn(
                  "h-10 rounded-xl pl-8",
                  (fieldErrors.email || hasGeneralError) && "animate-error-shake"
                )}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {fieldErrors.email ? (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                aria-invalid={Boolean(fieldErrors.password) || hasGeneralError}
                className={cn(
                  "h-10 rounded-xl pl-8",
                  (fieldErrors.password || hasGeneralError) &&
                    "animate-error-shake"
                )}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {fieldErrors.password ? (
              <p className="text-sm text-destructive">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            className="h-10 w-full rounded-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LockKeyhole className="size-4" />
            )}
            Continue studying
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
