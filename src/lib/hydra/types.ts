export type HydraClient = {
  client_id?: string;
  client_name?: string;
  logo_uri?: string;
  metadata?: Record<string, unknown>;
  policy_uri?: string;
  tos_uri?: string;
};

export type HydraOidcContext = {
  acr_values?: string[];
  display?: string;
  login_hint?: string;
  ui_locales?: string[];
};

export type HydraLoginRequest = {
  challenge?: string;
  client?: HydraClient;
  oidc_context?: HydraOidcContext;
  request_url?: string;
  requested_access_token_audience?: string[];
  requested_scope?: string[];
  session_id?: string;
  skip: boolean;
  subject?: string;
};

export type HydraLoginAcceptResponse = {
  redirect_to: string;
};

export type HydraConsentRequest = {
  challenge?: string;
  client?: HydraClient;
  context?: Record<string, unknown>;
  oidc_context?: HydraOidcContext;
  request_url?: string;
  requested_access_token_audience?: string[];
  requested_scope?: string[];
  skip: boolean;
  subject: string;
};

export type HydraConsentAcceptResponse = {
  redirect_to: string;
};

export type HydraConsentRejectResponse = {
  redirect_to: string;
};
