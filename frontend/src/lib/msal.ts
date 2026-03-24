import { PublicClientApplication, LogLevel } from '@azure/msal-browser';

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || '';

export const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId || 'common'}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage' as const,
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (_level: LogLevel, message: string) => {
        console.debug('[MSAL]', message);
      },
    },
  },
};

// Scopes for login — only openid/profile/email to get an ID token
// whose audience is our own client_id (not Microsoft Graph).
export const loginScopes = ['openid', 'profile', 'email'];

// Create instance — do NOT initialize() or handleRedirectPromise() here.
// AuthContext is the single owner of the MSAL lifecycle.
export const msalInstance = new PublicClientApplication(msalConfig);
