# NOVSMM — Social Auth Setup Guide

This guide shows how to configure OAuth providers (Google, Facebook, GitHub, Twitter) for social login.

All credentials are encrypted at rest with AES-256-GCM.

---

## 1. Google OAuth

### Get your credentials:
1. Go to https://console.cloud.google.com
2. Create a project (or select existing)
3. APIs & Services → Credentials → Create Credentials → OAuth client ID
4. Application type: **Web application**
5. Authorized JavaScript origins:
   - `https://novsmm.shop`
6. Authorized redirect URIs:
   - `https://novsmm.shop/api/auth/callback/google`
7. Copy **Client ID** and **Client Secret**

### Configure in NOVSMM:
Admin → Social Auth → Google → Configure:
- **Client ID**: `xxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxx`
- Toggle: **Enabled**

---

## 2. Facebook OAuth

### Get your credentials:
1. Go to https://developers.facebook.com
2. My Apps → Create App → Consumer
3. App Settings → Basic → Copy **App ID** and **App Secret**
4. Facebook Login → Settings:
   - Valid OAuth Redirect URIs: `https://novsmm.shop/api/auth/callback/facebook`
5. Make app Live (top toggle)

### Configure in NOVSMM:
Admin → Social Auth → Facebook → Configure:
- **Client ID**: App ID
- **Client Secret**: App Secret
- Toggle: **Enabled**

---

## 3. GitHub OAuth

### Get your credentials:
1. Go to https://github.com/settings/developers
2. OAuth Apps → New OAuth App
3. Application name: `NOVSMM`
4. Homepage URL: `https://novsmm.shop`
5. Authorization callback URL: `https://novsmm.shop/api/auth/callback/github`
6. Copy **Client ID** and **Client Secret**

### Configure in NOVSMM:
Admin → Social Auth → GitHub → Configure:
- **Client ID**: `Iv1.xxx`
- **Client Secret**: `xxx`
- Toggle: **Enabled**

---

## 4. Twitter/X OAuth

### Get your credentials:
1. Go to https://developer.twitter.com
2. Developer Portal → Projects & Apps → Create App
3. App settings → User authentication settings → Edit
4. OAuth 1.0a:
   - Callback URL: `https://novsmm.shop/api/auth/callback/twitter`
5. Keys and tokens → Copy **API Key** and **API Secret Key**

### Configure in NOVSMM:
Admin → Social Auth → Twitter → Configure:
- **Client ID**: API Key
- **Client Secret**: API Secret Key
- Toggle: **Enabled**

---

## How it works

1. Admin configures credentials in Admin → Social Auth (encrypted in DB)
2. NextAuth reads the DB dynamically (`getConfiguredSocialProviders()`)
3. Login/Register pages fetch `/api/auth/social-providers` to show only configured providers
4. Users click "Continue with Google/Facebook/GitHub/Twitter"
5. OAuth flow redirects to provider → back to NOVSMM with session

---

## Testing

After configuring a provider:
1. Go to https://novsmm.shop → Sign in
2. The configured provider's button should appear
3. Click it → complete OAuth on the provider's site
4. You should be redirected back logged in

---

## Troubleshooting

### "Redirect URI mismatch"
- Verify the callback URL in the provider's dashboard matches exactly:
  `https://novsmm.shop/api/auth/callback/<provider>`
- No trailing slash, no http (must be https)

### "Invalid client_id"
- Copy the Client ID again from the provider's dashboard
- Check for leading/trailing whitespace

### Button not showing on login page
- Verify the provider is **Enabled** (toggle) in Admin → Social Auth
- Hard refresh the login page (Ctrl+Shift+R)

### OAuth works but no user created
- Check that the user's email from the provider isn't already registered
- Check NextAuth logs: `pm2 logs novsmm`
