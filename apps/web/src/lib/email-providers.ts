/**
 * Pre-configured email providers with their SMTP/IMAP settings.
 * Users can select a provider to auto-fill server settings, or choose "custom"
 * to enter everything manually.
 */

export interface EmailProvider {
  id: string;
  name: string;
  /** Short description shown under the provider name */
  description?: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
  imap: {
    host: string;
    port: number;
    secure: boolean;
  };
  /** Help text shown when this provider is selected */
  helpText?: string;
  /** Default username hint — usually "full email address" or "username only" */
  usernameHint?: string;
}

export const CUSTOM_PROVIDER_ID = "custom";

/**
 * All supported email providers ordered by popularity.
 * SMTP/IMAP settings verified against official provider documentation.
 */
export const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Google",
    smtp: { host: "smtp.gmail.com", port: 587, secure: false },
    imap: { host: "imap.gmail.com", port: 993, secure: true },
    helpText:
      "Gmail requires an App Password (not your regular password). Enable 2-Step Verification first, then generate an App Password at https://myaccount.google.com/apppasswords.",
    usernameHint: "full email address",
  },
  {
    id: "outlook",
    name: "Outlook / Hotmail",
    description: "Microsoft",
    smtp: { host: "smtp-mail.outlook.com", port: 587, secure: false },
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    helpText:
      "Use your full Outlook/Hotmail email address and password. If you have 2FA enabled, you may need to create an app password.",
    usernameHint: "full email address",
  },
  {
    id: "yahoo",
    name: "Yahoo Mail",
    description: "Yahoo",
    smtp: { host: "smtp.mail.yahoo.com", port: 587, secure: false },
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
    helpText:
      "Yahoo requires an app password. Go to Yahoo Account Security → App passwords to generate one.",
    usernameHint: "full email address",
  },
  {
    id: "qq",
    name: "QQ Mail",
    description: "腾讯QQ邮箱",
    smtp: { host: "smtp.qq.com", port: 587, secure: false },
    imap: { host: "imap.qq.com", port: 993, secure: true },
    helpText:
      "QQ Mail requires an authorization code (授权码), not your QQ password. Go to QQ Mail Settings → Account → POP3/IMAP/SMTP to generate one.",
    usernameHint: "full email address",
  },
  {
    id: "163",
    name: "163 Mail",
    description: "网易163邮箱",
    smtp: { host: "smtp.163.com", port: 465, secure: true },
    imap: { host: "imap.163.com", port: 993, secure: true },
    helpText:
      "163 Mail requires an authorization code (授权码). Go to 163 Mail Settings → POP3/SMTP/IMAP to enable and generate one.",
    usernameHint: "full email address",
  },
  {
    id: "126",
    name: "126 Mail",
    description: "网易126邮箱",
    smtp: { host: "smtp.126.com", port: 465, secure: true },
    imap: { host: "imap.126.com", port: 993, secure: true },
    helpText:
      "126 Mail requires an authorization code (授权码). Go to 126 Mail Settings → POP3/SMTP/IMAP to enable and generate one.",
    usernameHint: "full email address",
  },
  {
    id: "yandex",
    name: "Yandex Mail",
    description: "Яндекс",
    smtp: { host: "smtp.yandex.com", port: 587, secure: false },
    imap: { host: "imap.yandex.com", port: 993, secure: true },
    helpText:
      "Enable IMAP in Yandex Mail settings and use an app password (Settings → Security → App passwords).",
    usernameHint: "full email address",
  },
  {
    id: "zoho",
    name: "Zoho Mail",
    description: "Zoho",
    smtp: { host: "smtp.zoho.com", port: 587, secure: false },
    imap: { host: "imap.zoho.com", port: 993, secure: true },
    helpText:
      "Enable IMAP in Zoho Mail settings and generate an app-specific password from the Zoho security page.",
    usernameHint: "full email address",
  },
  {
    id: "icloud",
    name: "iCloud Mail",
    description: "Apple",
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
    helpText:
      "iCloud requires an app-specific password. Sign in at https://appleid.apple.com → App-Specific Passwords to generate one.",
    usernameHint: "full email address (name@icloud.com)",
  },
  {
    id: "mailru",
    name: "Mail.ru",
    description: "Mail.ru",
    smtp: { host: "smtp.mail.ru", port: 465, secure: true },
    imap: { host: "imap.mail.ru", port: 993, secure: true },
    helpText:
      "Enable IMAP in Mail.ru settings and use an app password (Settings → Security → Passwords for external apps).",
    usernameHint: "full email address",
  },
  {
    id: "gmx",
    name: "GMX Mail",
    description: "GMX",
    smtp: { host: "smtp.gmx.com", port: 587, secure: false },
    imap: { host: "imap.gmx.com", port: 993, secure: true },
    helpText:
      "Enable IMAP/POP3 in GMX settings (Settings → POP3 & IMAP) and use your GMX password.",
    usernameHint: "full email address",
  },
  {
    id: "fastmail",
    name: "Fastmail",
    description: "Fastmail",
    smtp: { host: "smtp.fastmail.com", port: 587, secure: false },
    imap: { host: "imap.fastmail.com", port: 993, secure: true },
    helpText:
      "Fastmail requires an app password. Go to Settings → Privacy & Security → App Passwords to generate one.",
    usernameHint: "full email address",
  },
  {
    id: "protonmail",
    name: "Proton Mail",
    description: "Proton",
    smtp: { host: "127.0.0.1", port: 1025, secure: false },
    imap: { host: "127.0.0.1", port: 1143, secure: false },
    helpText:
      "Proton Mail requires Proton Mail Bridge (desktop app). Install and run Proton Mail Bridge, then use the localhost SMTP/IMAP settings shown above.",
    usernameHint: "credentials from Proton Mail Bridge",
  },
];

/**
 * Look up a provider by its id. Returns undefined if not found.
 */
export function getEmailProvider(id: string): EmailProvider | undefined {
  return EMAIL_PROVIDERS.find((p) => p.id === id);
}


