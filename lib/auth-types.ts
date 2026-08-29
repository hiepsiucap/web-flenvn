export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  username?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  username?: string | null;
  avatar?: string | null;
  isAdmin?: boolean;
};

export type LoginResponseData = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type ApiEnvelope<TData> = {
  success: boolean;
  data: TData;
  message?: string;
  timestamp: string;
};

export type LoginResponse = ApiEnvelope<LoginResponseData>;

export type RegisterResponse = ApiEnvelope<LoginResponseData>;

export type TokenResponseData = {
  accessToken: string;
  refreshToken: string;
};

export type TokenResponse = ApiEnvelope<TokenResponseData>;

export type BackendErrorResponse = {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  details?: unknown;
};

export type ApiErrorResponse = {
  message: string | string[];
  errors?: Record<string, string>;
  details?: unknown;
};
