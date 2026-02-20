import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - Chester AI Chess',
  description:
    'Privacy Policy and Cookie Disclosure for Chester AI Chess. Learn how we collect, use, and protect your data.',
  openGraph: {
    title: 'Privacy Policy - Chester AI Chess',
    description: 'Privacy Policy and Cookie Disclosure for Chester AI Chess.',
    url: 'https://chesterchess.com/legal/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-12 px-4 overflow-y-auto fixed inset-0">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/pricing"
            className="text-purple-400 hover:text-purple-300 transition-colors text-sm"
          >
            &larr; Back to Pricing
          </Link>
        </div>

        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 md:p-12">
          <h1 className="text-3xl font-bold text-white mb-2">
            Privacy Policy + Cookie & Analytics Disclosure
          </h1>
          <p className="text-purple-400 mb-2">chesterchess.com</p>
          <p className="text-gray-500 text-sm mb-8">Effective date: February 3, 2026</p>

          <div className="prose prose-invert prose-gray max-w-none">
            <p className="text-gray-300 leading-relaxed mb-6">
              This page explains what information chesterchess.com (&ldquo;we,&rdquo;
              &ldquo;us,&rdquo; or &ldquo;the site&rdquo;) collects, why we collect it, how
              cookies/analytics work here, and what choices you have. This is a small independent
              project owned and operated by Chris Lee Bergstrom, as an individual and/or DBA CLB
              Consulting, based in Portland, Oregon (USA).
            </p>
            <p className="text-gray-400 italic mb-8">
              This policy is written in plain language for real humans. It&apos;s not a contract
              novel, and it&apos;s not legal advice.
            </p>

            <Section title="1) Who this applies to">
              <p>
                This policy applies to visitors and users of chesterchess.com, including free and
                paid users.
              </p>
            </Section>

            <Section title="2) What information we collect">
              <p className="mb-4">We try to collect the minimum needed to run the site.</p>

              <h4 className="text-white font-semibold mt-4 mb-2">A. Information you provide</h4>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>
                  Account info (e.g., email address, login credentials or auth tokens depending on
                  login method).
                </li>
                <li>
                  Support messages you send to us (content of your message and contact details you
                  include).
                </li>
              </ul>

              <h4 className="text-white font-semibold mt-4 mb-2">
                B. Information collected automatically
              </h4>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>
                  Basic usage and device data: pages/screens visited, approximate location (inferred
                  from IP), device/browser type, timestamps, and performance data.
                </li>
                <li>
                  Log and security data: IP address, login events, and actions used to detect abuse,
                  prevent fraud, and keep accounts secure.
                </li>
                <li>
                  Game/app data: gameplay-related data you generate in the app (for example,
                  preferences, settings, and features you use). (We do not intentionally collect
                  sensitive personal data.)
                </li>
              </ul>

              <h4 className="text-white font-semibold mt-4 mb-2">C. Payments</h4>
              <p className="mb-2">
                Payments are handled by Stripe. We do not store your full payment card number.
                Stripe may process:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>Payment details (card/bank info)</li>
                <li>Billing contact info</li>
                <li>Transaction identifiers and receipts</li>
              </ul>
              <p className="mt-2">
                We may receive limited information from Stripe such as your customer ID,
                subscription status, payment status, and the last four digits of a payment method
                (depending on Stripe settings).
              </p>
            </Section>

            <Section title="3) Why we collect it (purposes)">
              <p className="mb-2">We use information to:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>
                  Provide the service (create accounts, log you in, deliver paid features, and run
                  the chess app).
                </li>
                <li>Process payments and manage subscriptions (via Stripe).</li>
                <li>
                  Keep the site safe (fraud prevention, account security, abuse detection, rate
                  limiting, and debugging).
                </li>
                <li>
                  Understand and improve performance (analytics and performance monitoring, ideally
                  in an aggregated way).
                </li>
                <li>Provide support (respond to messages and troubleshoot issues).</li>
              </ul>
              <p className="mt-4 text-white font-semibold">
                We do not sell your personal information.
              </p>
            </Section>

            <Section title="4) Third-party services we use">
              <p className="mb-4">
                chesterchess.com relies on a few third-party providers to operate:
              </p>

              <h4 className="text-white font-semibold mt-4 mb-1">Supabase</h4>
              <p>
                Used for authentication, user accounts, emails, and application logs/database
                storage.
              </p>

              <h4 className="text-white font-semibold mt-4 mb-1">Stripe</h4>
              <p>Used for payments, billing, and subscription management.</p>

              <h4 className="text-white font-semibold mt-4 mb-1">Analytics / performance tools</h4>
              <p>
                We may use Google Analytics and/or other privacy-respecting analytics providers to
                understand traffic and improve reliability and performance.
              </p>

              <p className="mt-4">
                These providers process data under their own privacy policies and terms. We choose
                reputable vendors and try to keep data shared with them limited to what&apos;s
                necessary.
              </p>
            </Section>

            <Section title="5) Cookies, local storage, and analytics">
              <p className="mb-4">We use cookies and/or local storage for three main reasons:</p>

              <h4 className="text-white font-semibold mt-4 mb-2">A. Essential (required)</h4>
              <p className="mb-2">These help the site function and stay secure:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>Login/session management</li>
                <li>Account security features</li>
                <li>Preventing fraud and abuse</li>
              </ul>
              <p className="mt-2">Without these, the site may not work correctly.</p>

              <h4 className="text-white font-semibold mt-4 mb-2">B. Preferences</h4>
              <p>These remember settings like UI preferences (where applicable).</p>

              <h4 className="text-white font-semibold mt-4 mb-2">C. Analytics & performance</h4>
              <p>
                Analytics cookies (or similar technologies) may be used to measure traffic and
                understand how the site is used (e.g., which pages/features are popular, load times,
                error rates).
              </p>

              <h4 className="text-white font-semibold mt-4 mb-2">Your choices</h4>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>
                  Most browsers let you block or delete cookies in settings. If you disable
                  essential cookies/storage, login and paid features may break.
                </li>
                <li>
                  If we use Google Analytics, you can opt out using the Google Analytics Opt-out
                  Browser Add-on, and/or browser controls (block third-party cookies, clear cookies,
                  use tracking protection).
                </li>
                <li>
                  You can also reduce tracking by using privacy-focused browsers/extensions and
                  enabling &ldquo;Do Not Track&rdquo; (note: not all services honor it
                  consistently).
                </li>
              </ul>
            </Section>

            <Section title="6) Legal bases for processing (GDPR-style)">
              <p className="mb-2">If you&apos;re in the EU/EEA/UK, we generally rely on:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>
                  <strong className="text-white">Contract / performance of a service:</strong> to
                  provide your account and paid features.
                </li>
                <li>
                  <strong className="text-white">Legitimate interests:</strong> to keep the site
                  secure, prevent fraud, debug issues, and improve the product.
                </li>
                <li>
                  <strong className="text-white">Consent:</strong> where required for non-essential
                  cookies/analytics (depending on your location and configuration).
                </li>
              </ul>
            </Section>

            <Section title="7) Data sharing">
              <p className="mb-2">We share data only as needed:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>With Supabase (hosting/auth/database/logs)</li>
                <li>With Stripe (payments/subscriptions)</li>
                <li>With analytics/performance providers (site usage and performance data)</li>
                <li>
                  If required by law, legal process, or to protect rights/safety (e.g., fraud or
                  abuse investigations)
                </li>
              </ul>
              <p className="mt-4 text-white font-semibold">
                We do not sell your personal information.
              </p>
            </Section>

            <Section title="8) Data retention">
              <p className="mb-2">We keep data only as long as necessary:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>
                  <strong className="text-white">Account data:</strong> retained while your account
                  is active. If you delete your account, we delete or de-identify account data
                  within a reasonable period, unless we must keep some data for legal, security, or
                  accounting reasons.
                </li>
                <li>
                  <strong className="text-white">Logs and security events:</strong> retained for a
                  limited period for security and troubleshooting, then deleted or anonymized.
                </li>
                <li>
                  <strong className="text-white">Payment records:</strong> Stripe and/or we may
                  retain transaction records as required for tax/accounting and chargeback handling.
                </li>
              </ul>
              <p className="mt-4">
                If you want deletion sooner, contact us (see &ldquo;Contact&rdquo; below) and
                we&apos;ll do what&apos;s feasible while keeping required records.
              </p>
            </Section>

            <Section title="9) Security">
              <p>
                We use reasonable safeguards appropriate for a small web app (encryption in transit,
                access controls, and reputable vendors). But no system is perfect: we can&apos;t
                guarantee absolute security. You&apos;re responsible for keeping your password and
                devices secure, and for using strong, unique passwords.
              </p>
            </Section>

            <Section title="10) International data transfers">
              <p>
                Our vendors may process data on servers outside your country (including the United
                States). Where applicable (e.g., EU/UK), vendors generally use recognized transfer
                mechanisms such as standard contractual clauses or similar safeguards.
              </p>
            </Section>

            <Section title="11) Your rights and choices">
              <p className="mb-2">
                Depending on where you live, you may have some or all of the following rights:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>
                  <strong className="text-white">Access:</strong> request a copy of the personal
                  data we have about you.
                </li>
                <li>
                  <strong className="text-white">Correction:</strong> request fixes to inaccurate
                  data.
                </li>
                <li>
                  <strong className="text-white">Deletion:</strong> request deletion of your account
                  and associated personal data (subject to retention limits above).
                </li>
                <li>
                  <strong className="text-white">Objection / restriction:</strong> object to or
                  request limits on certain processing in some cases.
                </li>
                <li>
                  <strong className="text-white">Portability:</strong> request export of certain
                  data in a portable format (where applicable).
                </li>
                <li>
                  <strong className="text-white">Withdraw consent:</strong> if we rely on consent
                  (e.g., certain analytics), you can withdraw it by changing settings or blocking
                  cookies.
                </li>
              </ul>
              <p className="mt-4">
                To exercise rights, contact us (below). We may need to verify your identity to
                protect your account.
              </p>
            </Section>

            <Section title="12) California privacy notice (CCPA/CPRA)">
              <p className="mb-2">If you are a California resident, you may have rights to:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>Know what personal information is collected, used, and shared.</li>
                <li>Request deletion of personal information (with legal exceptions).</li>
                <li>
                  Opt out of the &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal
                  information.
                </li>
              </ul>
              <p className="mt-4">
                We do not sell your personal information and do not knowingly &ldquo;share&rdquo; it
                for cross-context behavioral advertising in the typical sense. If we ever change
                that, we will update this policy and provide required opt-outs.
              </p>
            </Section>

            <Section title="13) Children's privacy">
              <p>
                chesterchess.com is not intended for children under 13, and we do not knowingly
                collect personal information from children under 13. If you believe a child provided
                personal information, contact us and we&apos;ll take appropriate action.
              </p>
            </Section>

            <Section title="14) Changes to this policy">
              <p>
                We may update this policy as the app evolves (for example, if we add new analytics
                tools or features). When we make changes, we&apos;ll update the &ldquo;Effective
                date&rdquo; at the top. Significant changes may also be communicated in-app or via
                email for account holders when reasonable.
              </p>
            </Section>

            <Section title="15) Contact">
              <p className="mb-4">For privacy requests or questions, contact:</p>
              <div className="bg-gray-700/30 rounded-lg p-4">
                <p className="text-white font-semibold">Chris Lee Bergstrom</p>
                <p className="text-gray-300">Portland, Oregon, USA</p>
                <p className="text-gray-300">
                  Email:{' '}
                  <a
                    href="mailto:Chrisleebergstrom@gmail.com"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    Chrisleebergstrom@gmail.com
                  </a>
                </p>
              </div>
            </Section>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center mt-8 space-x-6">
          <Link
            href="/legal/terms"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Terms of Service
          </Link>
          <Link
            href="/pricing"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Pricing
          </Link>
          <Link href="/play" className="text-gray-400 hover:text-white transition-colors text-sm">
            Back to Game
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <div className="text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}
