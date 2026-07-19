import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-canvas-dark text-body">
      <header className="border-b border-hairline-on-dark">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center gap-3">
          <img src="/map-icon.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
          <Link to="/" className="text-on-dark font-medium tracking-wide">
            MAP
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <h1 className="text-2xl md:text-3xl font-semibold text-on-dark mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted mb-10">Last updated: July 19, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly, including:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-strong">
              <li>Account details such as your email address, username, and password (stored hashed)</li>
              <li>
                Profile information from third-party sign-in providers (Google, GitHub), such as your
                name, email, and avatar, when you choose to authenticate that way
              </li>
              <li>Content you submit to the Service, including task descriptions and generated results</li>
              <li>Basic usage and log data needed to operate and secure the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-strong">
              <li>Provide, operate, and maintain the Service</li>
              <li>Authenticate your account and keep it secure</li>
              <li>Route and process the tasks you submit through our AI agents</li>
              <li>Communicate with you about updates, security, or support</li>
              <li>Improve reliability and performance of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">3. Sign-In With Google &amp; GitHub</h2>
            <p>
              When you choose to continue with Google or GitHub, we receive basic profile information
              (such as your name, email address, and avatar) from that provider to create or link your
              MAP account. We do not receive your third-party account password. You can review or
              revoke MAP's access at any time from your Google or GitHub account security settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">4. Cookies &amp; Similar Technologies</h2>
            <p>
              We use cookies and similar technologies to keep you signed in, remember preferences, and
              understand how the Service is used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">5. Data Sharing</h2>
            <p>
              We do not sell your personal information. We may share data with service providers who
              help us operate the Service (such as hosting and infrastructure providers), or when
              required by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">6. Data Retention &amp; Security</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide
              the Service. We use industry-standard measures to protect your data, though no method of
              transmission or storage is completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">7. Your Choices</h2>
            <p>
              You may update your account information at any time from Settings, or request deletion
              of your account and associated data through our support channels.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">8. Children's Privacy</h2>
            <p>
              The Service is not directed to children under 13, and we do not knowingly collect
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Continued use of the Service after
              changes take effect constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">10. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, please reach out through the support
              channels listed in the Service.
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm">
          <Link to="/register" className="text-[#34d399] hover:underline">
            &larr; Back to sign up
          </Link>
        </p>
      </main>
    </div>
  );
}
