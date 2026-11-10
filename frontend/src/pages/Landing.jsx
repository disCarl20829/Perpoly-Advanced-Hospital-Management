import { useEffect, useRef, useState } from 'react';
import './Landing.css';

// Public clinic information is intentionally limited to independently listed facts.
// No doctors, prices, appointments, service catalog, accreditation or schedules are fabricated.
const CONTACT_NUMBER = '(084) 655-7100';
const PHONE_LINK = 'tel:+63846557100';
const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=Perpetual+Polyclinic%2C+Quirante+II%2C+Tagum+City';
// Directory-linked Facebook page. Its present ownership/content could not be independently verified.
const FACEBOOK_REFERENCE = 'https://www.facebook.com/296348030384856/';

function Arrow({ direction = 'right' }) {
  return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={direction === 'right' ? 'M5 12h14m-6-6 6 6-6 6' : 'M5 12h14m-6-6 6 6-6 6'} /></svg>;
}

function Symbol({ type = 'heart', size = 23 }) {
  const paths = {
    heart: <><path d="M20.8 4.6a5.3 5.3 0 0 0-7.4 0L12 6l-1.4-1.4a5.3 5.3 0 0 0-7.4 7.5L12 21l8.8-8.9a5.3 5.3 0 0 0 0-7.5Z"/><path d="M3.7 12h4l2-3.5 3.4 7 1.8-3.5h5.2"/></>,
    lab: <><path d="M9 3v7l-5.9 9.4A2 2 0 0 0 4.8 22h14.4a2 2 0 0 0 1.7-2.6L15 10V3"/><path d="M7 3h10M7.2 16h9.6"/></>,
    pin: <><path d="M20 10c0 5.2-8 11-8 11S4 15.2 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.7"/></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.1 2c-9.4-.9-17-8.5-17.9-17.9A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.1 10a16 16 0 0 0 6.9 6.9l1.5-1.8a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 1.9Z"/>,
    shield: <><path d="M12 22s8-4.4 8-11V5l-8-3-8 3v6c0 6.6 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M2 20v-1a7 7 0 0 1 14 0v1M17 5a3 3 0 0 1 0 6M21 20v-1a6 6 0 0 0-4-5.6"/></>,
    check: <path d="m4 12 5 5L20 6"/>,
    spark: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">{paths[type] || paths.heart}</svg>;
}

function AudienceModal({ onDoctor, onPatient }) {
  const modalRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onPatient();
      if (event.key !== 'Tab') return;
      const buttons = [...modalRef.current.querySelectorAll('button')];
      const index = buttons.indexOf(document.activeElement);
      if (event.shiftKey && index === 0) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
      else if (!event.shiftKey && index === buttons.length - 1) { event.preventDefault(); buttons[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = oldOverflow; previous?.focus?.(); };
  }, [onPatient]);

  return <div className="clinic-audience-scrim" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onPatient(); }}>
    <div className="clinic-audience-dialog" role="dialog" aria-modal="true" aria-labelledby="clinic-audience-title" aria-describedby="clinic-audience-description" ref={modalRef} tabIndex={-1}>
      <div className="clinic-audience-brand"><img src="/logo.jpg" alt="Perpetual Polyclinic"/></div>
      <div className="clinic-audience-eyebrow">Welcome to Perpetual Polyclinic</div>
      <h2 id="clinic-audience-title">How can we help you today?</h2>
      <p id="clinic-audience-description">Are you visiting as a doctor or a patient?</p>
      <div className="clinic-audience-options">
        <button onClick={onDoctor} className="clinic-audience-option doctor"><span className="clinic-audience-option-icon"><Symbol type="shield" size={25}/></span><strong>I'm a doctor / staff member</strong><small>Continue to public clinic information</small><span className="clinic-audience-arrow"><Arrow/></span></button>
        <button onClick={onPatient} className="clinic-audience-option patient"><span className="clinic-audience-option-icon"><Symbol type="heart" size={25}/></span><strong>I'm a patient / visitor</strong><small>Explore clinic details, location, and contact information</small><span className="clinic-audience-arrow"><Arrow/></span></button>
      </div>
      <p className="clinic-audience-note">Both options stay on this public website.</p>
    </div>
  </div>;
}

export default function Landing() {
  const [audienceOpen, setAudienceOpen] = useState(() => {
    try { return sessionStorage.getItem('perpoly-audience-v1') !== 'chosen'; } catch { return true; }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const dismiss = () => { try { sessionStorage.setItem('perpoly-audience-v1', 'chosen'); } catch {} setAudienceOpen(false); };
  const chooseAudience = (audience) => {
    try { sessionStorage.setItem('perpoly-audience-role', audience); } catch {}
    dismiss(); // The public page never navigates to the staff application.
  };
  return <div className="clinic-site">
    <div className="clinic-topline"><span><Symbol type="pin" size={13}/> Quirante II St., Tagum City, Davao del Norte</span><a href={PHONE_LINK}><Symbol type="phone" size={13}/> {CONTACT_NUMBER}</a></div>
    <header className="clinic-header">
      <a className="clinic-wordmark" href="#welcome" aria-label="Perpetual Polyclinic home"><img src="/logo.jpg" alt=""/><span><strong>Perpetual <em>Polyclinic</em></strong><small>TAGUM CITY • DAVAO DEL NORTE</small></span></a>
      <button className="clinic-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="clinic-header-links" onClick={() => setMenuOpen(v => !v)}>Menu <span>{menuOpen ? '×' : '☰'}</span></button>
      <nav id="clinic-header-links" className={`clinic-header-links ${menuOpen ? 'open' : ''}`} aria-label="Public website navigation"><a onClick={() => setMenuOpen(false)} href="#about">About us</a><a onClick={() => setMenuOpen(false)} href="#services">What we offer</a><a onClick={() => setMenuOpen(false)} href="#contact">Contact</a></nav>
    </header>
    <main>
      <section id="welcome" className="clinic-hero">
        <div className="clinic-hero-copy">
          <div className="clinic-eyebrow"><span className="clinic-status-dot"/> YOUR LOCAL CLINIC IN TAGUM CITY</div>
          <h1>Care starts with <em>connection.</em></h1>
          <p>Welcome to Perpetual Polyclinic — a local healthcare facility in Tagum City. Find our clinic, get in touch, and discover how to connect with our team.</p>
          <div className="clinic-hero-actions"><a href="#contact" className="clinic-btn clinic-btn-primary">Contact the clinic <Arrow/></a><a href="#about" className="clinic-btn clinic-btn-outline">Explore our clinic</a></div>
          <div className="clinic-trust-line"><Symbol type="pin" size={19}/><span>Quirante II Street, Tagum City, Philippines</span></div>
        </div>
        <div className="clinic-hero-visual" aria-label="Decorative healthcare illustration">
          <div className="clinic-hero-orbit orbit-one"/><div className="clinic-hero-orbit orbit-two"/>
          <div className="clinic-illustration-panel"><div className="clinic-illustration-top"><span><i/><i/><i/></span><span>PERPETUAL POLYCLINIC</span></div>
            <div className="clinic-illustration-main"><div className="clinic-illustration-pulse"><Symbol type="heart" size={65}/></div><div><small>WELCOME TO</small><strong>Healthcare,<br/>closer to you.</strong></div></div>
            <div className="clinic-illustration-bottom"><span><Symbol type="check" size={16}/> Visit us in Tagum</span><span><Symbol type="phone" size={15}/> Call our team</span></div></div>
          <div className="clinic-float-card clinic-float-lab"><div className="clinic-floating-icon green"><Symbol type="lab"/></div><div><strong>Clinical laboratory</strong><span>Clinic directory listing</span></div></div>
          <div className="clinic-float-card clinic-float-local"><div className="clinic-floating-icon blue"><Symbol type="pin"/></div><div><strong>Tagum City</strong><span>Davao del Norte</span></div></div>
        </div>
      </section>
      <div className="clinic-ribbon"><div><Symbol type="heart"/> <span>For your care</span></div><div><Symbol type="lab"/> <span>Clinical laboratory</span></div><div><Symbol type="users"/> <span>Here for our community</span></div><div><Symbol type="pin"/> <span>Located in Tagum City</span></div></div>
      <section id="about" className="clinic-section clinic-about"><div className="clinic-section-side"><span className="clinic-overline">01 / OUR CLINIC</span><h2>Local healthcare.<br/><em>A personal connection.</em></h2></div><div className="clinic-section-body"><p>Perpetual Polyclinic is listed as a medical clinic in Tagum City, with a secondary clinical laboratory identified in a public healthcare directory. We keep the information on this website focused on details patients can verify.</p><div className="clinic-fact-list"><div><Symbol type="pin"/><span><strong>Find us</strong>Quirante II Street, Tagum City, Davao del Norte, Philippines</span></div><div><Symbol type="phone"/><span><strong>Speak to the clinic</strong>{CONTACT_NUMBER}</span></div><div><Symbol type="clock"/><span><strong>Plan your visit</strong>Call the clinic to confirm current services and schedules</span></div></div></div></section>
      <section id="services" className="clinic-services"><div className="clinic-section-heading"><div><span className="clinic-overline">02 / INFORMATION</span><h2>How we can help you <em>get started.</em></h2></div><p>For current test availability, consultations, pricing, and schedules, please contact the clinic directly.</p></div><div className="clinic-services-grid"><article className="clinic-service-card"><span className="clinic-service-icon"><Symbol type="lab" size={29}/></span><span className="clinic-service-number">01</span><h3>Laboratory inquiries</h3><p>Our clinic is identified in public directories as having clinical laboratory services. Contact the team to confirm which tests are currently offered.</p><a href={PHONE_LINK}>Call to inquire <Arrow/></a></article><article className="clinic-service-card"><span className="clinic-service-icon blue"><Symbol type="heart" size={29}/></span><span className="clinic-service-number">02</span><h3>Clinic information</h3><p>Find out more about consultations and the clinic's current services directly from the team.</p><a href={PHONE_LINK}>Contact us <Arrow/></a></article><article className="clinic-service-card"><span className="clinic-service-icon"><Symbol type="pin" size={29}/></span><span className="clinic-service-number">03</span><h3>Visit our location</h3><p>We're listed along Quirante II Street, Tagum City, Davao del Norte. Use directions to help plan your visit.</p><a href={MAP_URL} target="_blank" rel="noreferrer">Get directions <Arrow/></a></article></div></section>
      <section className="clinic-cta-band"><div><span className="clinic-overline">CONNECT WITH US</span><h2>Have a question before you visit?</h2><p>For the latest hours, services, and appointment arrangements, please call the clinic.</p></div><a className="clinic-btn clinic-btn-light" href={PHONE_LINK}><Symbol type="phone" size={19}/> Call {CONTACT_NUMBER}</a></section>
      <section id="contact" className="clinic-contact"><div><span className="clinic-overline">03 / CONTACT</span><h2>We'd love to <em>hear from you.</em></h2><p>Contact details below are sourced from independent business and provider listings. Please confirm any changes directly with the clinic.</p></div><div className="clinic-contact-grid"><div className="clinic-contact-item"><span><Symbol type="pin"/></span><h3>Visit us</h3><p>Quirante II Street<br/>Tagum City, Davao del Norte, Philippines</p><a href={MAP_URL} target="_blank" rel="noreferrer">See map <Arrow/></a></div><div className="clinic-contact-item"><span><Symbol type="phone"/></span><h3>Call the clinic</h3><p>{CONTACT_NUMBER}</p><a href={PHONE_LINK}>Call now <Arrow/></a></div><div className="clinic-contact-item"><span><Symbol type="users"/></span><h3>Social media listing</h3><p>A Facebook reference is listed in a public directory; its current ownership has not been verified.</p><a href={FACEBOOK_REFERENCE} target="_blank" rel="noreferrer">View directory-linked page <Arrow/></a></div></div></section>
    </main>
    <footer className="clinic-footer"><div className="clinic-footer-main"><div className="clinic-footer-brand"><img src="/logo.jpg" alt=""/><span><strong>Perpetual Polyclinic</strong><small>Tagum City, Davao del Norte</small></span></div><div className="clinic-footer-links"><a href="#about">About</a><a href="#services">Information</a><a href="#contact">Contact</a></div></div><div className="clinic-footer-end"><span>© {new Date().getFullYear()} Perpetual Polyclinic. Public information website.</span><span>Independent directory information — verify current details with the clinic.</span></div></footer>
    {audienceOpen && <AudienceModal onDoctor={() => chooseAudience('doctor')} onPatient={() => chooseAudience('visitor')}/>}
  </div>;
}
