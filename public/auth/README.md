# Static Auth Gate

A purely static HTML password gate for demo/staging sites. OOP, configurable, and easy to recycle across projects. Uses SHA-256 (no plaintext password in code) and a cookie for session persistence.

**Caveat:** Not high-security—any client-side protection can be bypassed. Use for demos, B2B previews, and staging only.

---

## Quick setup (new project)

1. **Copy the `auth/` folder** into your static site root (e.g. `public/auth/` or `dist/auth/`).

2. **Set the password hash**

   - Open `auth/login.html` in a browser
   - DevTools → Console
   - Run: `StaticAuthGate.hash("your-password-here")` (or `demoHash("...")`)
   - Copy the printed hex string
   - Paste into config (see Configuration)

3. **Protect pages** – Add as the **first scripts** in `<head>`:

```html
<head>
  <meta charset="utf-8" />
  <script src="auth/auth-config.js"></script>
  <script src="auth/auth-gate.js"></script>
  <!-- rest of head -->
</head>
```

4. **Optional: Log out link**

```html
<a href="#" onclick="demoLogout(); return false;">Log out</a>
```

**Path note:** If HTML lives in subfolders, adjust paths (e.g. `../auth/auth-gate.js`).

---

## Configuration

Override defaults **before** loading scripts via `window.AUTH_GATE_CONFIG`:

```html
<script>
  window.AUTH_GATE_CONFIG = {
    passwordSha256Hex: "YOUR_SHA256_HEX",
    cookieName: "demo_auth",
    cookieValue: "1",
    cookieDays: 7,
    loginPath: "/auth/login.html",
    exclude: ["/auth/login.html", "/public.html"],
  };
</script>
<script src="auth/auth-config.js"></script>
<script src="auth/auth-gate.js"></script>
```

| Option              | Default                | Description                     |
| ------------------- | ---------------------- | ------------------------------- |
| `passwordSha256Hex` | `"REPLACE_..."`        | SHA-256 hash of password        |
| `cookieName`        | `"demo_auth"`          | Cookie name                     |
| `cookieValue`       | `"1"`                  | Cookie value when authenticated |
| `cookieDays`        | `7`                    | Cookie lifetime in days         |
| `loginPath`         | `"/auth/login.html"`   | URL to redirect unauthenticated |
| `exclude`           | `["/auth/login.html"]` | Paths that bypass the gate      |

You can also edit `auth/auth-config.js` directly instead of using `AUTH_GATE_CONFIG`.

---

## API (StaticAuthGate)

When `auth-core.js` is loaded (on login page, or optionally elsewhere):

| Method                                | Description                                                        |
| ------------------------------------- | ------------------------------------------------------------------ |
| `StaticAuthGate.protect()`            | Redirect to login if not authenticated (gate uses this internally) |
| `StaticAuthGate.logout()`             | Clear cookie and redirect to login                                 |
| `StaticAuthGate.hash(pw)`             | Returns SHA-256 hex of password                                    |
| `StaticAuthGate.validatePassword(pw)` | Returns `true` if pw matches config hash                           |
| `StaticAuthGate.authenticate()`       | Set cookie and redirect to `?next=` URL                            |
| `StaticAuthGate.isAuthenticated()`    | Returns `true` if valid cookie present                             |

---

## Multi-project reuse

1. Copy the entire `auth/` folder
2. Set `passwordSha256Hex` in config (or `AUTH_GATE_CONFIG`)
3. Adjust `loginPath` and `exclude` if your structure differs
4. Add the two script tags to each protected page
5. Do **not** add `auth-gate.js` to `login.html`

---

## File structure

```
auth/
  auth-config.js   # Shared config (optional – gate has inline fallbacks)
  auth-core.js     # OOP StaticAuthGate (used by login form)
  auth-gate.js     # Redirect blocker for protected pages
  auth-login.js    # Password form logic (login.html only)
  login.html       # Login form (do NOT add auth-gate.js here)
  README.md
```

---

## Minimal setup (single script)

If you prefer one script on protected pages, use only `auth-gate.js`:

```html
<script src="auth/auth-gate.js"></script>
```

Configure via `window.AUTH_GATE_CONFIG` before it. You still need `auth-config.js` + `auth-core.js` + `auth-login.js` on the login page.
