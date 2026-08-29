"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import {
  CheckCircle,
  EnvelopeSimple as Mail,
  Eye,
  EyeSlash,
  LockKey as LockKeyhole,
  Plus,
  Spinner as Loader2,
  Sparkle,
  User,
  WarningCircle as AlertCircle,
} from "@phosphor-icons/react";
import { toast } from "react-toastify";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormInput,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import {
  Modal,
  ModalActionButton,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HttpError, http } from "@/lib/http";
import type {
  ApiErrorResponse,
  LoginResponse,
  RegisterResponse,
} from "@/lib/auth-types";
import { cn } from "@/lib/utils";
import logo from "@/img/new-logo.png";

type AuthMode = "login" | "register";
type FieldErrors = Partial<Record<"email" | "password" | "username", string>>;

function formatMessage(message: ApiErrorResponse["message"] | undefined) {
  if (Array.isArray(message)) {
    return message.filter(Boolean).join(", ");
  }

  return message;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return formatMessage(data?.message) || fallback;
  }

  return fallback;
}

function getFieldErrors(error: unknown): FieldErrors {
  if (error instanceof HttpError) {
    const data = error.data as ApiErrorResponse | null;
    return data?.errors ?? {};
  }

  return {};
}

function persistTokens(response: LoginResponse) {
  window.localStorage.setItem("accessToken", response.data.accessToken);
  window.localStorage.setItem("refreshToken", response.data.refreshToken);
}

export function AuthModal({
  children,
  defaultMode = "login",
}: {
  children: React.ReactNode;
  defaultMode?: AuthMode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const hasGeneralError =
    Boolean(error) &&
    !fieldErrors.email &&
    !fieldErrors.password &&
    !fieldErrors.username;

  function resetErrors() {
    setError("");
    setFieldErrors({});
  }

  function showLogin() {
    setRegistrationComplete(false);
    setMode("login");
    setPassword("");
    setShowPassword(false);
    resetErrors();
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      if (registrationComplete) {
        setMode("login");
      }

      setRegistrationComplete(false);
      setPassword("");
      setShowPassword(false);
      resetErrors();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetErrors();
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const response = await http.post<LoginResponse>("/api/auth/login", {
          email,
          password,
        });

        persistTokens(response);
        toast.success(response.message ?? "Signed in successfully");
        window.location.assign("/dashboard");
        return;
      }

      await http.post<RegisterResponse>("/api/auth/register", {
        email,
        password,
        username: username.trim() || undefined,
      });
      setPassword("");
      setShowPassword(false);
      setRegistrationComplete(true);
    } catch (requestError) {
      const message = getErrorMessage(
        requestError,
        mode === "login" ? "Unable to sign in" : "Unable to create account",
      );

      setError(message);
      setFieldErrors(getFieldErrors(requestError));
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalTrigger render={<span className="contents" />}>
        {children}
      </ModalTrigger>
      <ModalContent className="rounded-[1.75rem] border border-brand-200 bg-white px-5 py-5 text-foreground opacity-100 shadow-2xl shadow-primary/30 sm:max-w-[480px] sm:px-7 sm:py-6 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:text-foreground">
        {registrationComplete ? (
          <>
            <div className="relative flex justify-center">
              <Image
                src={logo}
                alt="FLENVN logo"
                className="h-auto w-24 sm:w-30"
                priority
              />
            </div>

            <ModalBody className="relative place-items-center gap-4 py-4 text-center">
              <Icon
                icon={CheckCircle}
                className="size-14 text-primary"
                weight="fill"
              />
              <ModalHeader className="items-center gap-2 pr-0 text-center">
                <ModalTitle>Congratulations!</ModalTitle>
                <ModalDescription className="max-w-sm text-foreground/70">
                  Your account has been created successfully. Sign in to start
                  learning.
                </ModalDescription>
              </ModalHeader>
            </ModalBody>

            <ModalFooter>
              <ModalActionButton
                type="button"
                className="h-12 w-full rounded-2xl bg-primary text-base font-extrabold text-primary-foreground hover:bg-primary/90"
                onClick={showLogin}
              >
                Go to login
              </ModalActionButton>
            </ModalFooter>
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
              <Icon
                icon={Sparkle}
                className="absolute left-[20%] top-24 size-6 text-brand-300"
                weight="fill"
              />
              <Icon
                icon={Sparkle}
                className="absolute right-[18%] top-36 size-4 text-pink-300"
                weight="fill"
              />
              <Icon
                icon={Sparkle}
                className="absolute left-[12%] top-44 size-7 text-secondary"
                weight="fill"
              />
              <Icon
                icon={Sparkle}
                className="absolute right-[12%] top-48 size-7 text-sky-400"
                weight="fill"
              />
            </div>

            <div className="relative grid gap-4">
              <div className="flex justify-center">
                <Image
                  src={logo}
                  alt="FLENVN logo"
                  className="h-auto w-24 sm:w-30"
                  priority
                />
              </div>

              <ModalHeader className="items-center gap-1.5 pr-0 text-center">
                <ModalTitle>
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </ModalTitle>
                <ModalDescription className="max-w-sm text-foreground/70">
                  {mode === "login"
                    ? "Continue building your vocabulary habit."
                    : "Start saving words, reviewing cards, and learning with AI."}
                </ModalDescription>
              </ModalHeader>
            </div>

            <ModalBody className="relative">
              <Tabs
                value={mode}
                onValueChange={(value) => {
                  setMode(value as AuthMode);
                  resetErrors();
                }}
                className="relative mt-2 gap-4"
              >
                <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-brand-50 p-0 text-muted-foreground shadow-inner shadow-brand-200/40">
                  <TabsTrigger
                    value="login"
                    className="h-full rounded-2xl text-sm font-semibold data-active:bg-white data-active:text-primary data-active:shadow-md data-active:after:bg-primary sm:text-base"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="h-full rounded-2xl text-sm font-semibold data-active:bg-white data-active:text-primary data-active:shadow-md data-active:after:bg-primary sm:text-base"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={mode}>
                  <Form
                    id="auth-form"
                    onSubmit={handleSubmit}
                    className="gap-4"
                  >
                    {error ? (
                      <Alert variant="destructive">
                        <Icon icon={AlertCircle} />
                        <AlertTitle>
                          {mode === "login"
                            ? "Sign in failed"
                            : "Registration failed"}
                        </AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ) : null}

                    {mode === "register" ? (
                      <FormField className="gap-2">
                        <AuthField
                          id="auth-username"
                          label="Username"
                          placeholder="Your name"
                          autoComplete="username"
                          value={username}
                          icon={User}
                          invalid={
                            Boolean(fieldErrors.username) || hasGeneralError
                          }
                          onChange={(event) => setUsername(event.target.value)}
                        />
                        {fieldErrors.username ? (
                          <FormMessage variant="error">
                            {fieldErrors.username}
                          </FormMessage>
                        ) : null}
                      </FormField>
                    ) : null}

                    <FormField className="gap-2">
                      <AuthField
                        id="auth-email"
                        label="Email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        icon={Mail}
                        invalid={Boolean(fieldErrors.email) || hasGeneralError}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                      {fieldErrors.email ? (
                        <FormMessage variant="error">
                          {fieldErrors.email}
                        </FormMessage>
                      ) : null}
                    </FormField>

                    <FormField className="gap-2">
                      <AuthField
                        id="auth-password"
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                        placeholder={
                          mode === "login"
                            ? "Enter your password"
                            : "At least 8 characters"
                        }
                        value={password}
                        icon={LockKeyhole}
                        invalid={
                          Boolean(fieldErrors.password) || hasGeneralError
                        }
                        onChange={(event) => setPassword(event.target.value)}
                        trailing={
                          <button
                            type="button"
                            className="grid size-8 place-items-center text-muted-foreground transition hover:text-primary"
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                            onClick={() =>
                              setShowPassword((current) => !current)
                            }
                          >
                            <Icon
                              icon={showPassword ? EyeSlash : Eye}
                              className="size-5"
                              weight="bold"
                            />
                          </button>
                        }
                      />
                      {fieldErrors.password ? (
                        <FormMessage variant="error">
                          {fieldErrors.password}
                        </FormMessage>
                      ) : null}
                    </FormField>
                  </Form>
                </TabsContent>
              </Tabs>
            </ModalBody>

            <ModalFooter className="relative grid gap-3 sm:grid sm:grid-cols-1">
              <ModalActionButton
                form="auth-form"
                className="h-12 w-full rounded-2xl bg-primary text-base font-extrabold text-primary-foreground shadow-xl shadow-primary/25 hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Icon icon={Loader2} className="animate-spin" />
                ) : mode === "login" ? (
                  <Icon icon={LockKeyhole} />
                ) : (
                  <Icon icon={Plus} />
                )}
                {mode === "login" ? "Continue studying" : "Create account"}
              </ModalActionButton>

              <p className="text-center text-sm text-muted-foreground">
                {mode === "login"
                  ? "Need an account?"
                  : "Already have an account?"}{" "}
                <button
                  type="button"
                  className="font-extrabold text-primary hover:underline"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    resetErrors();
                  }}
                >
                  {mode === "login" ? "Register" : "Login"}
                </button>
              </p>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function AuthField({
  id,
  label,
  icon,
  invalid,
  trailing,
  className,
  ...props
}: React.ComponentProps<typeof FormInput> & {
  label: string;
  icon: typeof User;
  invalid?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <FormControl>
      <div className="pointer-events-none absolute left-5 top-1/2 grid size-5 -translate-y-1/2 place-items-center text-primary">
        <Icon icon={icon} className="size-5" weight="bold" />
      </div>
      <FormLabel
        htmlFor={id}
        className="pointer-events-none absolute left-14 top-3.5 z-10 text-sm font-extrabold text-foreground"
      >
        {label}
      </FormLabel>
      <FormInput
        id={id}
        aria-invalid={invalid}
        className={cn(
          "h-16 rounded-2xl border-brand-200 bg-white pb-2.5 pl-14 pr-14 pt-8 text-sm text-foreground shadow-none placeholder:text-muted-foreground/75 focus-visible:border-primary focus-visible:ring-primary/20",
          invalid && "animate-error-shake",
          !trailing && "pr-5",
          className,
        )}
        {...props}
      />
      {trailing ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {trailing}
        </div>
      ) : null}
    </FormControl>
  );
}
