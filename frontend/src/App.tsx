import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { DashboardKpis, TrajectoryData, CohortSummary, User } from './types';
import { Navbar } from './components/layout/Navbar';
import { HeroSection } from './components/layout/HeroSection';
import { DashboardView } from './features/dashboard/DashboardView';
import { CustomerLookupView } from './features/customers/CustomerLookupView';
import { SegmentationView } from './features/segmentation/SegmentationView';
import { SimulatorView } from './features/simulator/SimulatorView';
import { DatasetManagerView } from './features/datasets/DatasetManagerView';
import { RecommendationsView } from './features/recommendations/RecommendationsView';
import { AuthModal } from './features/auth/AuthModal';
import { ArchitectureModal } from './components/modals/ArchitectureModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [lookupTargetId, setLookupTargetId] = useState<string>('15485');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('12m');

  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [trajectory, setTrajectory] = useState<TrajectoryData | null>(null);
  const [cohorts, setCohorts] = useState<CohortSummary | null>(null);

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isArchOpen, setIsArchOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize data on mount
  useEffect(() => {
    // Check auth status
    api.getCurrentUser()
      .then((res) => {
        if (res.authenticated && res.user) {
          setCurrentUser(res.user);
        }
      })
      .catch(() => {
        // Not authenticated or session expired
      });

    // Load initial KPIs
    api.getKpis()
      .then(setKpis)
      .catch((err) => console.error('Failed to load KPIs:', err));

    // Load initial trajectory
    api.getTrajectory('12m')
      .then(setTrajectory)
      .catch((err) => console.error('Failed to load trajectory:', err));

    // Load cohorts
    api.getCohorts()
      .then(setCohorts)
      .catch((err) => console.error('Failed to load cohorts:', err));
  }, []);

  // Update trajectory when period changes
  const handlePeriodChange = async (period: string) => {
    setSelectedPeriod(period);
    try {
      const data = await api.getTrajectory(period);
      setTrajectory(data);
    } catch (err) {
      console.error('Failed to fetch period trajectory:', err);
    }
  };

  const handleQuickLookup = (id: string) => {
    setLookupTargetId(id);
    setActiveTab('lookup');
    window.scrollTo({ top: 450, behavior: 'smooth' });
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
  };

  return (
    <div className="platform-container" style={{ minHeight: '100vh', background: '#000000', color: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      
      {/* Floating Capsule Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenArchitecture={() => setIsArchOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        currentUser={currentUser}
      />

      {/* Retro Cinematic Video & Globe Hero */}
      <HeroSection
        onExploreClick={() => {
          setActiveTab('dashboard');
          const dashEl = document.getElementById('analytics-workspace');
          if (dashEl) {
            dashEl.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {/* Main Analytical Content Workspace */}
      <main id="analytics-workspace" style={{ flex: 1, maxWidth: '1360px', width: '100%', margin: '0 auto', padding: '0 24px 60px', boxSizing: 'border-box' }}>
        
        {/* Navigation Tab Bar for direct workspace section switching */}
        <div
          className="workspace-nav-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            borderBottom: '1px solid #1f2421',
            paddingBottom: '12px',
            marginBottom: '28px',
            scrollbarWidth: 'none',
          }}
        >
          {[
            { id: 'dashboard', label: 'Overview & KPIs', count: '5,942' },
            { id: 'lookup', label: 'Customer 360 Lookup', count: null },
            { id: 'segmentation', label: 'RFM & Cohorts', count: '4' },
            { id: 'clv', label: 'CLV & Churn ML', count: 'R² 0.52' },
            { id: 'simulator', label: 'What-If Simulator', count: 'Real-Time' },
            { id: 'datasets', label: 'Dataset Ingestion', count: 'CSV' },
            { id: 'recommendations', label: 'Action Playbooks', count: '3 Active' },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isActive ? '#ffffff' : '#0e1210',
                  color: isActive ? '#000000' : '#8e9693',
                  border: '1px solid #1f2421',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{t.label}</span>
                {t.count && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      background: isActive ? 'rgba(0,0,0,0.1)' : '#161c18',
                      color: isActive ? '#000000' : '#d1d5db',
                      fontFamily: 'monospace',
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Body */}
        <div className="workspace-tab-body">
          {activeTab === 'dashboard' && (
            <DashboardView
              kpis={kpis}
              trajectory={trajectory}
              cohorts={cohorts}
              selectedPeriod={selectedPeriod}
              onSelectPeriod={handlePeriodChange}
              onNavigateTab={setActiveTab}
              onQuickLookup={handleQuickLookup}
            />
          )}

          {activeTab === 'lookup' && (
            <CustomerLookupView initialCustomerId={lookupTargetId} />
          )}

          {(activeTab === 'segmentation' || activeTab === 'clv') && (
            <SegmentationView initialCohorts={cohorts} />
          )}

          {activeTab === 'simulator' && (
            <SimulatorView />
          )}

          {activeTab === 'datasets' && (
            <DatasetManagerView />
          )}

          {activeTab === 'recommendations' && (
            <RecommendationsView />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #141816', background: '#050706', padding: '32px 24px', textAlign: 'center', fontSize: '12px', color: '#525c57' }}>
        <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <div style={{ color: '#8e9693', fontWeight: 500 }}>
            Retail Customer Intelligence Platform · KTU S5 CSE Data Science Academic Project
          </div>
          <div style={{ fontSize: '11px', color: '#525c57' }}>
            Decoupled React TypeScript Frontend · Flask REST API v1 · Scrapy + HDFS + Hive + Spark ML Architecture · SQLite Distributed Store
          </div>
          <div style={{ marginTop: '8px' }}>
            <a href="https://www.onlinewebfonts.com/fonts" target="_blank" rel="noreferrer" style={{ color: '#525c57', textDecoration: 'none' }}>
              Display font BubbledotICG-FinePos by OnlineWebFonts · CC BY 4.0
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />
    </div>
  );
};

export default App;
