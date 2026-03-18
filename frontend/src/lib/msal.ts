/**
 * MSAL (Microsoft Authentication Library) placeholder configuration.
 *
 * These values will be replaced with real Azure AD / Entra ID credentials
 * when SSO is integrated. For now they serve as a structural placeholder
 * so that the auth flow can be wired up without a live tenant.
 */

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'placeholder-client-id',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'placeholder'}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
  },
};

export const loginScopes = ['User.Read', 'openid', 'profile', 'email'];
