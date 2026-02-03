import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - Chester AI Chess',
  description:
    'Terms of Service for Chester AI Chess. Rules and guidelines for using our AI chess companion application.',
  openGraph: {
    title: 'Terms of Service - Chester AI Chess',
    description: 'Terms of Service for Chester AI Chess.',
    url: 'https://chesterchess.com/legal/terms',
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-12 px-4 overflow-y-auto fixed inset-0">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/pricing" className="text-purple-400 hover:text-purple-300 transition-colors text-sm">
            &larr; Back to Pricing
          </Link>
        </div>

        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 md:p-12">
          <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-purple-400 mb-2">chesterchess.com</p>
          <p className="text-gray-500 text-sm mb-8">Effective date: February 3, 2026</p>

          <div className="prose prose-invert prose-gray max-w-none">
            <p className="text-gray-300 leading-relaxed mb-6">
              These terms govern your use of chesterchess.com (&ldquo;the site,&rdquo; &ldquo;the service,&rdquo; &ldquo;we,&rdquo; or &ldquo;us&rdquo;). By using the site, you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.
            </p>
            <p className="text-gray-400 italic mb-8">
              This is a small independent project owned and operated by Chris Lee Bergstrom, as an individual and/or DBA CLB Consulting, based in Portland, Oregon (USA).
            </p>

            <Section title="1) The basics">
              <p>chesterchess.com is a chess application with AI-powered features. We offer free and paid subscription tiers. You can play chess, interact with Chester (our AI companion), and access various features depending on your plan.</p>
            </Section>

            <Section title="2) Accounts">
              <p className="mb-2">To use certain features, you need an account. When you create one:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>Provide accurate information</li>
                <li>Keep your login credentials secure</li>
                <li>You&apos;re responsible for all activity under your account</li>
                <li>One account per person (no sharing accounts)</li>
              </ul>
              <p className="mt-4">If you suspect unauthorized access, let us know immediately.</p>
            </Section>

            <Section title="3) Subscriptions and payments">
              <p className="mb-4"><strong className="text-white">Free tier:</strong> Limited daily moves and chat messages. No payment required.</p>
              <p className="mb-4"><strong className="text-white">Paid tiers (Pro/Premium):</strong> Billed monthly or yearly via Stripe. By subscribing, you authorize recurring charges until you cancel.</p>

              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li><strong className="text-white">Cancellation:</strong> You can cancel anytime from your account settings. You&apos;ll keep access until the end of your billing period.</li>
                <li><strong className="text-white">Refunds:</strong> We generally don&apos;t offer refunds for partial billing periods, but if something went wrong, contact us and we&apos;ll try to make it right.</li>
                <li><strong className="text-white">Price changes:</strong> If we change prices, we&apos;ll notify existing subscribers before their next billing cycle.</li>
                <li><strong className="text-white">Failed payments:</strong> If payment fails, we may suspend access until resolved.</li>
              </ul>

              <p className="mt-4">Stripe handles all payment processing under their own terms.</p>
            </Section>

            <Section title="4) Acceptable use">
              <p className="mb-2">Don&apos;t use chesterchess.com to:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>Break any laws</li>
                <li>Harass, abuse, or harm others</li>
                <li>Attempt to hack, exploit, or disrupt the service</li>
                <li>Create multiple accounts to abuse free tier limits</li>
                <li>Use bots or automation to game the system</li>
                <li>Scrape data or reverse-engineer the service</li>
                <li>Impersonate others</li>
              </ul>
              <p className="mt-4">We reserve the right to suspend or terminate accounts that violate these rules.</p>
            </Section>

            <Section title="5) AI features and limitations">
              <p className="mb-2">Chester (our AI chess companion) is powered by third-party AI services. A few things to understand:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>AI responses are generated content, not professional advice</li>
                <li>The AI may occasionally make mistakes or give unexpected responses</li>
                <li>We don&apos;t guarantee any specific level of chess play or analysis accuracy</li>
                <li>Don&apos;t input sensitive personal information into chat features</li>
              </ul>
            </Section>

            <Section title="6) Intellectual property">
              <p className="mb-4"><strong className="text-white">Ours:</strong> The site design, code, Chester character, branding, and original content belong to us (or our licensors). Don&apos;t copy, modify, or redistribute them without permission.</p>
              <p className="mb-4"><strong className="text-white">Yours:</strong> You retain ownership of any content you create (like chat messages). By using the service, you grant us a limited license to store and process your content as needed to provide the service.</p>
              <p><strong className="text-white">Chess:</strong> The game of chess itself belongs to everyone. We don&apos;t claim ownership of chess moves, games, or strategies.</p>
            </Section>

            <Section title="7) Disclaimers">
              <p className="mb-2">The service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We do our best, but we can&apos;t guarantee:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>The site will always be available or error-free</li>
                <li>AI features will be perfectly accurate</li>
                <li>Your data will never be lost (please don&apos;t store anything critical only here)</li>
              </ul>
              <p className="mt-4">To the extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
            </Section>

            <Section title="8) Limitation of liability">
              <p className="mb-2">To the maximum extent permitted by law, we&apos;re not liable for:</p>
              <ul className="list-disc pl-6 space-y-1 text-gray-300">
                <li>Indirect, incidental, or consequential damages</li>
                <li>Lost profits, data loss, or business interruption</li>
                <li>Damages exceeding the amount you paid us in the past 12 months (or $50 if you&apos;re on the free tier)</li>
              </ul>
              <p className="mt-4">Some jurisdictions don&apos;t allow these limitations, so they may not fully apply to you.</p>
            </Section>

            <Section title="9) Termination">
              <p className="mb-4"><strong className="text-white">By you:</strong> You can delete your account anytime.</p>
              <p><strong className="text-white">By us:</strong> We can suspend or terminate accounts that violate these terms, abuse the service, or for any reason with reasonable notice. If we terminate without cause, we&apos;ll refund any prepaid subscription fees.</p>
            </Section>

            <Section title="10) Changes to these terms">
              <p>We may update these terms as the service evolves. When we do, we&apos;ll update the effective date. Continued use after changes means you accept the new terms. For significant changes, we&apos;ll try to give advance notice.</p>
            </Section>

            <Section title="11) Governing law and disputes">
              <p>These terms are governed by the laws of Oregon, USA. Any disputes will be resolved in the courts of Multnomah County, Oregon, unless we agree to alternative resolution.</p>
            </Section>

            <Section title="12) Contact">
              <p className="mb-4">Questions about these terms? Contact:</p>
              <div className="bg-gray-700/30 rounded-lg p-4">
                <p className="text-white font-semibold">Chris Lee Bergstrom</p>
                <p className="text-gray-300">Portland, Oregon, USA</p>
                <p className="text-gray-300">
                  Email: <a href="mailto:Chrisleebergstrom@gmail.com" className="text-purple-400 hover:text-purple-300">Chrisleebergstrom@gmail.com</a>
                </p>
              </div>
            </Section>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-center">That&apos;s it. Thanks for using chesterchess.com. Now go play some chess.</p>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center mt-8 space-x-6">
          <Link href="/legal/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
            Privacy Policy
          </Link>
          <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">
            Pricing
          </Link>
          <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
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
