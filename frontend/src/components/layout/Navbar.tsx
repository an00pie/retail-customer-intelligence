import React, { useState } from 'react';
import { User } from '../../types';

interface NavbarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenArchitecture: () => void;
  onOpenAuth: () => void;
  currentUser: User | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenArchitecture,
  onOpenAuth,
  currentUser,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'lookup', label: 'Customer Lookup' },
    { id: 'segmentation', label: 'Segmentation' },
    { id: 'clv', label: 'CLV & Churn' },
    { id: 'simulator', label: 'Simulator' },
    { id: 'datasets', label: 'Datasets' },
    { id: 'recommendations', label: 'Recommendations' },
  ];

  return (
    <>
      <header className="nav-capsule-wrapper" style={{ position: 'sticky', top: 0, zIndex: 100, padding: '16px 24px', background: 'linear-gradient(rgba(0,0,0,0.85), transparent)' }}>
        <div className="nav-capsule" style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          
          {/* Brand Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="nav-brand-badge"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="50" cy="50" r="46" stroke="url(#arcRingGradReact)" stroke-width="4.5" fill="#000000" fillOpacity="0.8"/>
                <rect x="29" y="52" width="7" height="24" rx="3.5" fill="url(#arcBarGradReact)"/>
                <rect x="40" y="42" width="7" height="34" rx="3.5" fill="url(#arcBarGradReact)"/>
                <rect x="51" y="32" width="7" height="44" rx="3.5" fill="url(#arcBarGradReact)"/>
                <rect x="62" y="22" width="7" height="54" rx="3.5" fill="url(#arcBarGradReact)"/>
                <path d="M 21 68 C 17 50, 27 28, 56 22 C 72 19, 81 24, 78 32 C 75 41, 52 56, 30 67 C 24 70, 22 70, 21 68 Z" fill="none" stroke="url(#arcSwoopGradReact)" stroke-width="4" strokeLinecap="round"/>
                <circle cx="77" cy="27" r="3" fill="#ffffff"/>
                <circle cx="77" cy="27" r="6" fill="#ffffff" fillOpacity="0.5"/>
                <defs>
                  <linearGradient id="arcRingGradReact" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff"/>
                    <stop offset="60%" stopColor="#888888"/>
                    <stop offset="100%" stopColor="#333333"/>
                  </linearGradient>
                  <linearGradient id="arcBarGradReact" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff"/>
                    <stop offset="100%" stopColor="#555555"/>
                  </linearGradient>
                  <linearGradient id="arcSwoopGradReact" x1="20" y1="70" x2="80" y2="25" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#333333" stopOpacity="0.3"/>
                    <stop offset="60%" stopColor="#cccccc"/>
                    <stop offset="100%" stopColor="#ffffff"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="nav-brand-title" style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '-0.01em' }}>
              <strong style={{ fontWeight: 800 }}>INSIGHT</strong>
              <span style={{ fontWeight: 300, opacity: 0.9 }}>.arc</span>
            </span>
          </div>

          {/* Floating White Pill Navigation (Desktop) */}
          <nav
            className="nav-links desktop-nav"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '5px 8px',
              borderRadius: '999px',
              background: '#f8f8f8',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.16)',
              gap: '2px',
            }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectTab(item.id)}
                  style={{
                    position: 'relative',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#111111' : '#555555',
                    background: isActive ? '#e8eaea' : 'transparent',
                    border: 'none',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {item.label}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '0px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '9px',
                        letterSpacing: '1px',
                        lineHeight: 1,
                      }}
                    >
                      •••
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Architecture Pipeline Dialog Button */}
            <button
              type="button"
              id="navArchitectureBtn"
              className="nav-icon-btn"
              title="View Big Data Architecture Pipeline"
              onClick={onOpenArchitecture}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#1a1d1e',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </button>

            {/* Auth / Profile Button */}
            <button
              type="button"
              className="nav-icon-btn"
              title={currentUser ? `Logged in as ${currentUser.username}` : 'Login / Register'}
              onClick={onOpenAuth}
              style={{
                padding: '0 12px',
                height: '38px',
                borderRadius: '999px',
                background: currentUser ? '#ffffff' : '#1a1d1e',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: currentUser ? '#000000' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{currentUser ? currentUser.username : 'Sign In'}</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="nav-mobile-toggle mobile-only"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Modal / Sheet */}
      {mobileMenuOpen && (
        <div
          className="nav-menu-backdrop open"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="nav-mobile-dropdown"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(400px, 100%)',
              background: '#f8f8f8',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#333' }}>Navigation</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#222',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: activeTab === item.id ? 700 : 500,
                  color: activeTab === item.id ? '#000000' : '#444444',
                  background: activeTab === item.id ? '#e4e9e7' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
