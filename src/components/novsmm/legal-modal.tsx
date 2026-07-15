"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ShieldCheck, Cookie, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export type LegalDocType = "terms" | "privacy" | "cookies";

type LegalModalProps = {
  open: boolean;
  type: LegalDocType;
  onTypeChange: (t: LegalDocType) => void;
  onOpenChange: (open: boolean) => void;
};

const TABS: { id: LegalDocType; label: string; icon: React.ElementType }[] = [
  { id: "terms", label: "Terms of Service", icon: FileText },
  { id: "privacy", label: "Privacy Policy", icon: ShieldCheck },
  { id: "cookies", label: "Cookie Policy", icon: Cookie },
];

const LAST_UPDATED = "January 15, 2025";
const ENTITY = "NOVSMM, Inc.";
const CONTACT_EMAIL = "legal@novsmm.io";

export function LegalModal({
  open,
  type,
  onTypeChange,
  onOpenChange,
}: LegalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {(() => {
                  const Tab = TABS.find((t) => t.id === type)!;
                  return <Tab.icon className="h-4 w-4" />;
                })()}
              </span>
              {TABS.find((t) => t.id === type)?.label}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Last updated: {LAST_UPDATED} · Please read carefully.
            </DialogDescription>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 border-b border-border/60 bg-muted/30 px-3 py-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTypeChange(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  type === tab.id
                    ? "bg-background text-foreground shadow-sm nov-ring"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1 px-6 py-5">
            <div className="prose prose-sm max-w-none text-foreground/90">
              {type === "terms" && <TermsContent />}
              {type === "privacy" && <PrivacyContent />}
              {type === "cookies" && <CookiesContent />}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-6 py-3">
            <p className="text-[11px] text-muted-foreground">
              Questions? Email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full bg-primary px-5 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
            >
              I understand
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
 *  Content blocks
 * ──────────────────────────────────────────────────────────────────────── */

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 text-base font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h3>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{children}</p>;
}
function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="mb-1.5 text-sm leading-relaxed text-muted-foreground">{children}</li>
  );
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mb-3 ml-5 list-disc space-y-0.5">{children}</ul>;
}

function TermsContent() {
  return (
    <div>
      <P>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
        NOVSMM platform, website, dashboard, API, and related services (collectively,
        the &quot;Services&quot;) operated by {ENTITY} (&quot;NOVSMM&quot;, &quot;we&quot;,
        &quot;us&quot;, or &quot;our&quot;). By creating an account or using the Services,
        you agree to be bound by these Terms. If you are using the Services on behalf of
        an organization, you represent that you have authority to bind that organization.
      </P>

      <H>1. Eligibility &amp; Account</H>
      <UL>
        <LI>You must be at least 18 years old and legally able to form a binding contract.</LI>
        <LI>You agree to provide accurate, current, and complete information at registration and to keep it updated.</LI>
        <LI>You are responsible for safeguarding your password and for all activity under your account. Notify us immediately of any unauthorized use.</LI>
        <LI>One natural person or entity may not maintain more than one active account without our prior written consent.</LI>
      </UL>

      <H>2. Acceptable Use</H>
      <P>You agree not to, and not to permit third parties to:</P>
      <UL>
        <LI>Use the Services to engage in fraud, money-laundering, terrorism financing, or any unlawful activity;</LI>
        <LI>Submit orders for social media accounts, posts, or content that you do not own or are not authorized to promote;</LI>
        <LI>Resell, white-label, or sublicense access to the Services without an active Reseller or Wholesale plan;</LI>
        <LI>Reverse-engineer, scrape, overload, or otherwise disrupt the platform, its APIs, or underlying infrastructure;</LI>
        <LI>Circumvent rate limits, geofencing, or any technical protection measure;</LI>
        <LI>Upload malware, viruses, or any malicious code; or use the Services to distribute spam or unsolicited communications;</LI>
        <LI>Attempt to access data of other users, gain unauthorized access to any portion of the Services, or probe the security of the platform.</LI>
      </UL>

      <H>3. Orders, Fulfillment &amp; Refunds</H>
      <UL>
        <LI>All orders are fulfilled by NOVSMM through upstream providers. Estimated delivery times are approximate and not guaranteed.</LI>
        <LI>Orders may be cancelled for a full refund only if their status is still &quot;Pending&quot; (not yet dispatched to the provider).</LI>
        <LI>Once an order has started (&quot;Processing&quot; or &quot;Completed&quot;), it is non-refundable except for verified partial fulfillment, in which case the unfilled portion will be credited to your wallet.</LI>
        <LI>Refund requests must be submitted via a support ticket within 14 days of the order date and include the order ID and evidence of non-delivery.</LI>
        <LI>Drip-feed orders are billed in full at order placement; partial early cancellation does not entitle you to a pro-rata refund unless explicitly stated.</LI>
      </UL>

      <H>4. Wallet, Payments &amp; Chargebacks</H>
      <UL>
        <LI>Your NOVSMM wallet is denominated in your selected currency. Funds loaded via card, PayPal, MercadoPago, or crypto are non-refundable once credited except as required by law.</LI>
        <LI>Withdrawals to bank accounts or external wallets are processed within 1–5 business days and may be subject to review for fraud or AML compliance.</LI>
        <LI>Initiating a chargeback or payment dispute without first contacting NOVSMM support constitutes a material breach of these Terms and may result in account suspension and recovery of funds.</LI>
        <LI>NOVSMM is not a bank or regulated financial institution. Wallet balances are not deposits and are not insured.</LI>
      </UL>

      <H>5. Referral &amp; Affiliate Program</H>
      <UL>
        <LI>Referral commissions are credited to your wallet when your referred user completes their first qualifying transaction.</LI>
        <LI>Self-referrals, fraudulent accounts, or coordinated sign-ups to inflate commissions are strictly prohibited and will result in forfeiture of commissions and account termination.</LI>
        <LI>NOVSMM may modify commission rates, payout thresholds, or program terms with 30 days&apos; notice.</LI>
      </UL>

      <H>6. API Access</H>
      <UL>
        <LI>Access to the NOVSMM REST API is granted per account and is rate-limited. API keys must be kept confidential.</LI>
        <LI>You are solely responsible for all API calls made with your key. Compromised keys must be revoked immediately via the dashboard.</LI>
        <LI>Abuse of the API — including but not limited to scraping endpoints, circumventing rate limits, or reselling raw API access — will result in immediate key revocation and account review.</LI>
      </UL>

      <H>7. Intellectual Property</H>
      <P>
        All content, features, branding, source code, and functionality of the Services
        — excluding user-submitted content — are the exclusive property of {ENTITY} and
        its licensors and are protected by international copyright, trademark, and other
        laws. You may not copy, modify, distribute, or create derivative works without
        our prior written consent.
      </P>

      <H>8. Disclaimers &amp; Limitation of Liability</H>
      <UL>
        <LI>The Services are provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, or non-infringement.</LI>
        <LI>NOVSMM does not guarantee specific results from social media marketing campaigns. Engagement metrics depend on third-party platforms outside our control.</LI>
        <LI>To the maximum extent permitted by law, {ENTITY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, arising from your use of the Services.</LI>
        <LI>Our aggregate liability for any claim arising out of or relating to these Terms shall not exceed the amount you paid to NOVSMM in the 90 days preceding the claim.</LI>
      </UL>

      <H>9. Indemnification</H>
      <P>
        You agree to indemnify and hold harmless {ENTITY} and its officers, directors,
        employees, and agents from any claims, damages, losses, and expenses (including
        reasonable attorneys&apos; fees) arising out of your use of the Services, your
        violation of these Terms, or your infringement of any third-party rights.
      </P>

      <H>10. Termination</H>
      <P>
        We may suspend or terminate your account at any time, with or without cause or
        notice, including for violations of these Terms. You may close your account at
        any time via the dashboard. Upon termination, your right to use the Services
        ceases immediately. Sections that by their nature should survive termination —
        including intellectual property, disclaimers, indemnification, and limitation
        of liability — will remain in effect.
      </P>

      <H>11. Governing Law &amp; Disputes</H>
      <P>
        These Terms are governed by the laws of the State of Delaware, USA, without
        regard to conflict-of-laws principles. You and {ENTITY} agree to submit to the
        exclusive jurisdiction of the courts located in Wilmington, Delaware for any
        dispute arising out of or relating to these Terms or the Services.
      </P>

      <H>12. Changes to These Terms</H>
      <P>
        We may revise these Terms at any time. The &quot;Last updated&quot; date at the
        top reflects the most recent revision. Material changes will be communicated via
        email or in-app notification at least 30 days before taking effect. Continued
        use of the Services after the effective date constitutes acceptance of the
        revised Terms.
      </P>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div>
      <P>
        This Privacy Policy explains how {ENTITY} (&quot;NOVSMM&quot;,
        &quot;we&quot;, &quot;us&quot;) collects, uses, discloses, and safeguards your
        personal information when you use our platform, website, dashboard, and API
        (collectively, the &quot;Services&quot;). We are committed to protecting your
        privacy and complying with the General Data Protection Regulation (GDPR), the
        California Consumer Privacy Act (CCPA), and other applicable data-protection
        laws.
      </P>

      <H>1. Information We Collect</H>
      <P><strong className="text-foreground">Account information:</strong> name, username, email, password (bcrypt-hashed), country, preferred currency and language, business name and tax ID (when provided).</P>
      <P><strong className="text-foreground">Payment information:</strong> we do not store full card numbers. Card payments are processed by PCI-DSS-compliant providers (PayPal, MercadoPago). We retain the last 4 digits, brand, and expiry for receipts.</P>
      <P><strong className="text-foreground">Transaction data:</strong> wallet top-ups, withdrawals, order history, referral activity, and invoice metadata.</P>
      <P><strong className="text-foreground">Usage data:</strong> IP address, browser type, device fingerprint, pages visited, timestamps, and feature interactions — collected via cookies and similar technologies (see our Cookie Policy).</P>
      <P><strong className="text-foreground">Communications:</strong> support tickets, chat messages, and emails you send to us.</P>
      <P><strong className="text-foreground">Optional data:</strong> two-factor authentication phone number, profile avatar, marketing preferences.</P>

      <H>2. How We Use Your Information</H>
      <UL>
        <LI>To create and manage your account, process transactions, and deliver ordered services;</LI>
        <LI>To authenticate you, prevent fraud, and verify identity for compliance with KYC/AML obligations;</LI>
        <LI>To send service announcements, security alerts, and — with your consent — marketing communications;</LI>
        <LI>To provide customer support and respond to your inquiries;</LI>
        <LI>To monitor and analyze platform usage, improve performance, and develop new features;</LI>
        <LI>To comply with legal obligations and enforce our Terms of Service.</LI>
      </UL>

      <H>3. Legal Bases for Processing (GDPR)</H>
      <P>We process personal data under the following legal bases:</P>
      <UL>
        <LI><strong className="text-foreground">Contractual necessity</strong> — to fulfill our obligations under the Terms of Service;</LI>
        <LI><strong className="text-foreground">Legal obligation</strong> — to comply with tax, AML, and other regulatory requirements;</LI>
        <LI><strong className="text-foreground">Legitimate interests</strong> — to prevent fraud, secure the platform, and improve our Services;</LI>
        <LI><strong className="text-foreground">Consent</strong> — for marketing communications and non-essential cookies, which you may withdraw at any time.</LI>
      </UL>

      <H>4. Data Sharing &amp; Recipients</H>
      <P>We do not sell your personal information. We share data only with:</P>
      <UL>
        <LI>Service providers and subprocessors (e.g., cloud hosting, email delivery, payment processors, analytics) under written data-protection agreements;</LI>
        <LI>Upstream social-media service providers, solely to fulfill your orders;</LI>
        <LI>Law enforcement or regulatory authorities when required by law or to protect our rights and safety;</LI>
        <LI>A successor entity in the event of a merger, acquisition, or sale of all or part of our business.</LI>
      </UL>

      <H>5. International Data Transfers</H>
      <P>
        Your information may be transferred to and processed in countries other than
        your country of residence, including the United States and the European Union.
        We use Standard Contractual Clauses and other safeguards approved by the European
        Commission to protect transfers of personal data outside the EEA.
      </P>

      <H>6. Data Retention</H>
      <P>
        We retain personal information for as long as your account is active or as
        needed to provide the Services. After account closure we retain transactional
        records for up to 7 years to comply with tax and AML regulations, and security
        logs for up to 24 months. Marketing data is deleted within 30 days of opt-out.
      </P>

      <H>7. Your Rights</H>
      <P>Depending on your jurisdiction, you may have the right to:</P>
      <UL>
        <LI>Access the personal data we hold about you and receive a copy;</LI>
        <LI>Rectify inaccurate or incomplete data;</LI>
        <LI>Erasure of your data (&quot;right to be forgotten&quot;), subject to legal exceptions;</LI>
        <LI>Restrict or object to processing;</LI>
        <LI>Data portability — receive your data in a structured, machine-readable format;</LI>
        <LI>Withdraw consent at any time without affecting the lawfulness of prior processing;</LI>
        <LI>Lodge a complaint with your local data-protection authority.</LI>
      </UL>
      <P>
        To exercise any of these rights, email{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
        . We will respond within 30 days.
      </P>

      <H>8. Security</H>
      <P>
        We implement bank-grade security measures including TLS 1.3 encryption in
        transit, AES-256 at rest, bcrypt password hashing, mandatory 2FA for admin and
        reseller accounts, regular penetration testing, and continuous monitoring. We
        maintain SOC 2 Type II and PCI DSS compliance. Despite these safeguards, no
        method of transmission over the Internet is 100% secure — see our{" "}
        <a
          href="#security"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Security page
        </a>{" "}
        for details.
      </P>

      <H>9. Children&apos;s Privacy</H>
      <P>
        The Services are not directed to anyone under 18. We do not knowingly collect
        personal information from children. If you believe we have done so, please
        contact us and we will promptly delete the data.
      </P>

      <H>10. Cookie Policy</H>
      <P>
        We use cookies and similar technologies to operate and improve the Services.
        See our Cookie Policy for details and to manage your preferences.
      </P>

      <H>11. Changes to This Policy</H>
      <P>
        We may update this Privacy Policy from time to time. Material changes will be
        notified by email or in-app message at least 30 days before they take effect.
        The &quot;Last updated&quot; date at the top indicates when the policy was last
        revised.
      </P>
    </div>
  );
}

function CookiesContent() {
  return (
    <div>
      <P>
        This Cookie Policy explains how {ENTITY} (&quot;NOVSMM&quot;) uses cookies and
        similar tracking technologies on our website and dashboard. By using our
        Services you consent to the use of cookies as described below.
      </P>

      <H>1. What Are Cookies?</H>
      <P>
        Cookies are small text files placed on your device when you visit a website.
        They are widely used to make websites work more efficiently and to provide
        reporting and personalization. We also use local storage, session storage, and
        similar technologies for the same purposes.
      </P>

      <H>2. Types of Cookies We Use</H>
      <UL>
        <LI><strong className="text-foreground">Strictly necessary cookies</strong> — required for the platform to function (authentication, session, security tokens). Cannot be disabled.</LI>
        <LI><strong className="text-foreground">Preference cookies</strong> — remember your language, currency, theme, and dashboard layout choices.</LI>
        <LI><strong className="text-foreground">Analytics cookies</strong> — collect aggregated usage data so we can improve performance and features. Anonymized where possible.</LI>
        <LI><strong className="text-foreground">Marketing cookies</strong> — used to measure the effectiveness of campaigns and (with consent) show relevant ads on third-party platforms.</LI>
        <LI><strong className="text-foreground">Functional cookies</strong> — enable features like live chat, support tickets, and embedded payment widgets.</LI>
      </UL>

      <H>3. Third-Party Cookies</H>
      <P>We work with trusted third parties that may set cookies on your device:</P>
      <UL>
        <LI><strong className="text-foreground">PayPal, MercadoPago, NowPayments</strong> — payment processing and fraud detection;</LI>
        <LI><strong className="text-foreground">Google Analytics &amp; Tag Manager</strong> — anonymized traffic analytics;</LI>
        <LI><strong className="text-foreground">Sentry</strong> — error monitoring (no PII);</LI>
        <LI><strong className="text-foreground">Cloudflare</strong> — DDoS protection and bot mitigation;</LI>
        <LI><strong className="text-foreground">WhatsApp / Meta</strong> — embedded chat widget.</LI>
      </UL>
      <P>
        Each third party manages its own cookies according to its privacy policy.{" "}
        <a
          href="https://policies.google.com/technologies/cookies"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
        >
          Learn more about Google&apos;s cookie policy
          <ExternalLink className="h-3 w-3" />
        </a>
      </P>

      <H>4. Cookie Duration</H>
      <UL>
        <LI>Session cookies — deleted when you close your browser;</LI>
        <LI>Persistent cookies — remain on your device for up to 13 months or until you delete them;</LI>
        <LI>Authentication cookies — expire after 30 days of inactivity.</LI>
      </UL>

      <H>5. Managing Cookies</H>
      <P>
        You can control and delete cookies through your browser settings. Disabling
        strictly necessary cookies will prevent you from logging in and using the
        dashboard. Disabling analytics or marketing cookies will not affect core
        functionality.
      </P>
      <UL>
        <LI>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
          >
            Chrome <ExternalLink className="h-3 w-3" />
          </a>
        </LI>
        <LI>
          <a
            href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
          >
            Firefox <ExternalLink className="h-3 w-3" />
          </a>
        </LI>
        <LI>
          <a
            href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
          >
            Safari <ExternalLink className="h-3 w-3" />
          </a>
        </LI>
      </UL>

      <H>6. Do Not Track</H>
      <P>
        We currently do not respond to browser &quot;Do Not Track&quot; signals because
        there is no consistent industry standard for interpreting them. We do, however,
        honor Global Privacy Control (GPC) signals as a request to opt out of sale or
        share of personal information where required by law.
      </P>

      <H>7. Updates to This Policy</H>
      <P>
        We may update this Cookie Policy from time to time. The &quot;Last updated&quot;
        date at the top reflects the most recent revision. Significant changes will be
        communicated via email or in-app notification.
      </P>
    </div>
  );
}
