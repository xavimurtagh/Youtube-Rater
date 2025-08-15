// pages/index.js

import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>VideoRate Pro - Secure YouTube Video Rating Platform</title>
        <meta name="description" content="Search and rate YouTube videos securely" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main>
        <h1>Search YouTube Videos</h1>

        <section>
          <h2>Search and rate YouTube videos securely</h2>
        </section>

        <section>
          <h2>Import Watch History</h2>
          <p>Import your YouTube watch history from Google Takeout</p>
        </section>

        <section>
          <h2>🛡️ Privacy &amp; Security Dashboard</h2>

          <article>
            <h3>🔒 Security Features</h3>
            <ul>
              <li><strong>Google OAuth2 Authentication</strong>: Secure sign-in using your existing Google account</li>
              <li><strong>Encrypted Data Storage</strong>: All user data encrypted both in transit and at rest</li>
              <li><strong>No Password Storage</strong>: We never see or store your password - handled by Google</li>
              <li><strong>Session Security</strong>: Secure session management with automatic timeout</li>
            </ul>
          </article>

          <article>
            <h3>📊 Data Collection Preferences</h3>
            <ul>
              <li>Essential Functionality: Required for basic app functionality</li>
              <li>Analytics &amp; Performance: Help us improve the app experience</li>
              <li>Personalized Recommendations: Use your ratings to suggest similar content</li>
              <li>Marketing Communications: Receive updates about new features</li>
            </ul>
          </article>

          <article>
            <h3>🗂️ Data Management</h3>
            {/* Content for data management can be added here */}
          </article>
        </section>

        <section>
          <h2>🤖 AI-Powered Recommendations</h2>
          <p>Our collaborative filtering algorithm will recommend videos based on users with similar preferences.</p>

          <ul>
            <li><strong>Personalized Suggestions</strong>: Videos tailored to your taste based on your rating history</li>
            <li><strong>Similar User Discovery</strong>: Find users with similar preferences and discover their favorites</li>
            <li><strong>Trend Analysis</strong>: Discover trending content in your preferred categories</li>
            <li><strong>Privacy Preserved</strong>: Recommendations without compromising your personal data</li>
          </ul>
        </section>
      </main>
    </>
  );
}
