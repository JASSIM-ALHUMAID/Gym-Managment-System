import { Link } from 'react-router-dom';

const features = [
  { title: 'Membership Plans', text: 'Create plans, review subscription requests, and keep member access organized.' },
  { title: 'Class Scheduling', text: 'Coordinate trainers, capacity, session types, and daily class operations.' },
  { title: 'Member Bookings', text: 'Let members reserve classes while the system protects capacity and membership rules.' },
  { title: 'Attendance Tracking', text: 'Trainers mark attendance and admins review the operational history.' }
];

const roles = [
  { label: 'Admin', stat: 'Operations', text: 'Members, plans, classes, subscriptions, payments, and resource tables.' },
  { label: 'Trainer', stat: 'Classes', text: 'Assigned sessions, member rosters, attendance marking, and history.' },
  { label: 'Member', stat: 'Self-service', text: 'Plan requests, class booking, booking review, and payments.' }
];

const workflow = ['Create plans', 'Approve subscriptions', 'Schedule classes', 'Book members', 'Mark attendance', 'Review payments'];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Public navigation">
        <Link className="brand-mark" to="/">
          <span className="brand-symbol" aria-hidden="true">GMS</span>
          <span>Gym Management System</span>
        </Link>
        <div className="landing-nav-actions">
          <Link className="text-link" to="/login">Sign in</Link>
          <Link className="button-link" to="/login?mode=register">Create member account</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">Gym management system</p>
          <h1>Run memberships, classes, bookings, and attendance from one studio dashboard.</h1>
          <p className="hero-lede">Pulse Studio gives admins, trainers, and members focused tools for daily gym operations without spreadsheet chaos.</p>
          <div className="hero-actions">
            <Link className="button-link" to="/login">Enter system</Link>
            <Link className="ghost-link" to="/login?mode=register">Create member account</Link>
          </div>
        </div>
        <aside className="hero-console" aria-label="Operations preview">
          <div className="console-header">
            <span>Studio activity</span>
            <strong>Live</strong>
          </div>
          <div className="console-grid">
            <article><span>Active members</span><strong>884</strong></article>
            <article><span>Classes today</span><strong>44</strong></article>
            <article><span>Bookings</span><strong>128</strong></article>
            <article><span>Open payments</span><strong>12</strong></article>
          </div>
        </aside>
      </section>

      <section className="landing-section">
        <div className="section-heading relaxed-heading">
          <div>
            <p className="eyebrow">Role-aware control</p>
            <h2>Each dashboard is built around the work that role performs.</h2>
          </div>
        </div>
        <div className="role-grid">
          {roles.map((role) => (
            <article className="role-card" key={role.label}>
              <span>{role.stat}</span>
              <h3>{role.label}</h3>
              <p>{role.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-heading relaxed-heading">
          <div>
            <p className="eyebrow">System modules</p>
            <h2>Clear workflows without collapsing every function into one page.</h2>
          </div>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section workflow-panel">
        <div>
          <p className="eyebrow">Operational path</p>
          <h2>From plan setup to attendance history.</h2>
        </div>
        <ol className="workflow-list">
          {workflow.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>
    </main>
  );
}
