"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CheckCircle as CheckCircle2,
  EnvelopeSimple as Mail,
  LockKey as LockKeyhole,
  Spinner as Loader2,
  WarningCircle as AlertCircle,
} from "@phosphor-icons/react";
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
import {
  Form,
  FormControl,
  FormField,
  FormInput,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
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

  useEffect(() => {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("refreshToken");
    window.sessionStorage.removeItem("accessToken");
    window.sessionStorage.removeItem("refreshToken");
  }, []);

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

      window.location.assign("/");
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
        <Form onSubmit={handleSubmit}>
          {error ? (
            <Alert variant="destructive">
              <Icon icon={AlertCircle} />
              <AlertTitle>Sign in failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <Icon icon={CheckCircle2} className="text-primary" />
              <AlertTitle>Signed in</AlertTitle>
              <AlertDescription>
                {success}. Your study dashboard is ready.
              </AlertDescription>
            </Alert>
          ) : null}

          <FormField>
            <FormLabel htmlFor="email">Email</FormLabel>
            <FormControl>
              <Icon
                icon={Mail}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <FormInput
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
            </FormControl>
            {fieldErrors.email ? (
              <FormMessage variant="error">{fieldErrors.email}</FormMessage>
            ) : null}
          </FormField>

          <FormField>
            <FormLabel htmlFor="password">Password</FormLabel>
            <FormControl>
              <Icon
                icon={LockKeyhole}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <FormInput
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
            </FormControl>
            {fieldErrors.password ? (
              <FormMessage variant="error">{fieldErrors.password}</FormMessage>
            ) : null}
          </FormField>

          <Button
            type="submit"
            className="h-10 w-full rounded-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Icon icon={Loader2} className="animate-spin" />
            ) : (
              <Icon icon={LockKeyhole} />
            )}
            Continue studying
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
}
