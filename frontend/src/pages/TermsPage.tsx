import { Link } from 'react-router-dom';

export default function TermsPage() {
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
        <h1 className="text-2xl md:text-3xl font-semibold text-on-dark mb-2">Terms of Service</h1>
        <p className="text-sm text-muted mb-10">Last updated: July 19, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">1. Acceptance of Terms</h2>
            <p>
              By creating an account, accessing, or using MAP ("the Service"), you agree to be bound
              by these Terms of Service. If you do not agree to these terms, please do not use the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">2. Description of Service</h2>
            <p>
              MAP is a multi-agent AI automation platform that routes and executes tasks through a
              network of specialized AI agents. Functionality, features, and availability may change
              over time as the Service evolves.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">3. Accounts &amp; Authentication</h2>
            <p>
              You may create an account using an email and password, or by signing in through a
              third-party provider such as Google or GitHub. You are responsible for maintaining the
              confidentiality of your credentials and for all activity that occurs under your account.
              You must provide accurate information when registering.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-strong">
              <li>Violate any applicable law or regulation</li>
              <li>Submit tasks intended to generate malicious, harmful, or illegal content</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or infrastructure</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Reverse engineer or attempt to extract the source code of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">5. Third-Party Services</h2>
            <p>
              The Service integrates with third-party providers, including Google and GitHub, for
              authentication. Your use of those providers is subject to their own terms and privacy
              policies. We are not responsible for the practices of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">6. Intellectual Property</h2>
            <p>
              The Service, including its design, branding, and underlying software, is owned by MAP
              and its licensors. These Terms do not grant you any rights to our trademarks or brand
              assets.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">7. Disclaimers &amp; Limitation of Liability</h2>
            <p>
              The Service is provided "as is" without warranties of any kind, express or implied. To
              the fullest extent permitted by law, MAP shall not be liable for any indirect,
              incidental, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">8. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes
              take effect constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-on-dark mb-2">9. Contact</h2>
            <p>
              If you have questions about these Terms, please reach out through the support channels
              listed in the Service.
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
