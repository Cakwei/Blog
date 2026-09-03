import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const Route = createFileRoute('/privacy_policy')({
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  const lastUpdated = '3 September 2026';

  return (
    <div className="min-h-screen text-(--text) bg-(--bg)">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-10">
        {/* Navigation / Back Button */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-(--text-secondary) hover:text-(--link) transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-(--text-secondary) transition-colors group-hover:text-(--link)" />{' '}
            <span className="text-(--text-secondary) transition-colors group-hover:text-(--link)">
              Back to Home
            </span>
          </Link>
        </div>

        {/* Header */}
        <header className="border-b border-(--border) pb-6 space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-(--text)">
            Privacy Policy.
          </h1>
          <p className="text-xs text-(--text-secondary)">Last updated: {lastUpdated}</p>
        </header>

        {/* Content Sections */}
        <div className="space-y-8 text-sm sm:text-base text-(--text-secondary) leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-(--text) tracking-tight">1. Introduction</h2>
            <p>
              Welcome to Charlee's blog. We respect your privacy and are committed to protecting any
              personal information you may share with us while visiting this platform. This Privacy
              Policy outlines what information we collect, how we use it, and how we safeguard your
              data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-(--text) tracking-tight">
              2. Information We Collect
            </h2>
            <p>
              When you browse our articles or interact with the site, we may automatically collect
              standard technical data provided by your browser, such as your IP address, browser
              type, operating system, and pages visited.
            </p>
            <p>
              If you log in, create an account, or leave comments, we collect account details (such
              as your name, username, and email address) necessary to provide you with those
              interactive features.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-(--text) tracking-tight">
              3. Cookies and Authentication
            </h2>
            <p>
              Our application uses secure cookies and local storage tokens to manage user sessions,
              authentication state, and user preferences (such as theme configuration). You can
              configure your browser to refuse cookies, though certain features of the site (like
              user authentication or personalized settings) may not function properly without them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-(--text) tracking-tight">
              4. How We Use Your Information
            </h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>To deliver, operate, and maintain our blog platform and API content.</li>
              <li>
                To authenticate your user sessions securely across server-side and client-side
                renderings.
              </li>
              <li>To monitor and analyze site performance, usage trends, and reader engagement.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-(--text) tracking-tight">5. Data Security</h2>
            <p>
              We implement industry-standard security practices which includes encrypted connections
              (HTTPS) and secure cookie policies to protect your data from unauthorized access,
              alteration, or disclosure. However, no method of internet transmission is 100% secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-(--text) tracking-tight">6. Third-Party Links</h2>
            <p>
              Our posts may contain links to external websites or resources. We have no control over
              and assume no responsibility for the content, privacy policies, or practices of any
              third-party sites or services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-(--text) tracking-tight">
              7. Changes to This Policy
            </h2>
            <p>
              We may update our Privacy Policy from time to time. Any updates will be posted
              directly on this page with a revised "Last updated" date. We encourage you to review
              this page periodically.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-(--border)">
            <h2 className="text-lg font-bold text-(--text) tracking-tight">8. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy, feel
              free to reach out via our repository or contact channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
