import React, { useState } from 'react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'catalog' | 'faq'>('pipeline');

  if (!isOpen) return null;

  return (
    <div
      id="modal-architecture-react"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0a0d0c',
          border: '1px solid #2a312d',
          borderRadius: '8px',
          padding: '28px',
          maxWidth: '840px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#8e9693', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Academic &amp; Enterprise Architecture
            </span>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
              Big Data Architecture &amp; System Specifications
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#8e9693', fontSize: '22px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: '#070908', border: '1px solid #1f2421', borderRadius: '6px', padding: '3px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: activeTab === 'pipeline' ? '#fff' : 'transparent',
              color: activeTab === 'pipeline' ? '#000' : '#8e9693',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            End-to-End Big Data Pipeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: activeTab === 'catalog' ? '#fff' : 'transparent',
              color: activeTab === 'catalog' ? '#000' : '#8e9693',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Data Mining &amp; Catalog Spider
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: activeTab === 'faq' ? '#fff' : 'transparent',
              color: activeTab === 'faq' ? '#000' : '#8e9693',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Technical Specifications &amp; FAQ
          </button>
        </div>

        {/* Pipeline Tab */}
        {activeTab === 'pipeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { num: '01', title: 'Web & Retail Data Sources', desc: '1,067,371 raw transaction rows from UCI Online Retail II + scraped multi-category product catalog.', badge: 'Sources' },
              { num: '02', title: 'Data Mining & Catalog Scraping', desc: 'Automated Python spider extracts prices, star ratings, and review metadata into JSON & CSV.', badge: 'Scrapy / BS4' },
              { num: '03', title: 'HDFS Distributed Raw Landing Zone', desc: 'Immutable raw storage at /retail/raw/transactions/ and /retail/raw/products/.', badge: 'Hadoop HDFS' },
              { num: '04', title: 'Apache Hive Analytical Warehouse', desc: 'Schema validation, cancellation filtering, deduplication, and Snappy Parquet storage (805,549 clean rows).', badge: 'Apache Hive' },
              { num: '05', title: 'Apache Spark / PySpark ML Pipeline', desc: 'Distributed feature aggregation, Recency-Frequency-Monetary computation, log-scaling, and ML training.', badge: 'Apache Spark' },
              { num: '06', title: 'RFM Segmentation + Machine Learning', desc: 'K-Means clustering (k=4), Gradient Boosting CLV regression (R² 0.5238), and Random Forest Churn classification (AUC 0.806).', badge: 'Scikit-Learn' },
              { num: '07', title: 'Columnar KV Serving Layer (HBase Schema)', desc: 'High-performance columnar Key-Value serving store enabling low-latency point-lookups across 5,942 customer profiles.', badge: 'Columnar KV Store' },
              { num: '08', title: 'Full-Stack React + Flask Command Center', desc: 'Interactive React TypeScript frontend with Chart.js, what-if simulator, dataset manager, and RESTful API v1 endpoints.', badge: 'React + Flask' },
            ].map((step, idx) => (
              <div
                key={step.num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: '#0e1210',
                  border: '1px solid #1f2421',
                  borderRadius: '6px',
                  padding: '12px 16px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#8e9693', fontFamily: 'monospace' }}>
                  {step.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8e9693', marginTop: '2px' }}>
                    {step.desc}
                  </div>
                </div>
                <span style={{ fontSize: '11px', background: '#121614', border: '1px solid #2a312d', color: '#d1d5db', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                  {step.badge}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Catalog Spider Tab */}
        {activeTab === 'catalog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#0e1210', border: '1px solid #1f2421', borderRadius: '6px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Scraped Product Schema Record</span>
                <span style={{ fontSize: '11px', color: '#fff', border: '1px solid #2a312d', padding: '2px 8px', borderRadius: '4px' }}>● Live Ingested</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                <div><span style={{ color: '#8e9693' }}>Product Title:</span> <strong style={{ color: '#fff' }}>A Light in the Attic</strong></div>
                <div><span style={{ color: '#8e9693' }}>Unit Price:</span> <strong style={{ color: '#fff' }}>$51.77 USD</strong></div>
                <div><span style={{ color: '#8e9693' }}>Catalog Rating:</span> <strong style={{ color: '#fff' }}>★★★☆☆ (3.0 / 5.0)</strong></div>
                <div><span style={{ color: '#8e9693' }}>Category:</span> <strong style={{ color: '#fff' }}>Poetry &amp; E-Commerce Retail</strong></div>
                <div><span style={{ color: '#8e9693' }}>Stock Availability:</span> <strong style={{ color: '#fff' }}>In Stock (22 units)</strong></div>
                <div><span style={{ color: '#8e9693' }}>Benchmark Avg Price:</span> <strong style={{ color: '#fff' }}>$35.75 USD</strong></div>
              </div>
              <div style={{ marginTop: '16px', padding: '8px 12px', background: '#070908', border: '1px solid #1f2421', borderRadius: '4px', fontSize: '11px', color: '#8e9693' }}>
                Target Partition: <code>/retail/raw/products/</code> • Storage Engine: Hadoop HDFS Verified
              </div>
            </div>
          </div>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#0e1210', border: '1px solid #1f2421', borderRadius: '6px', padding: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                What problem does the Customer Intelligence Platform solve?
              </div>
              <div style={{ fontSize: '12px', color: '#8e9693', lineHeight: 1.5 }}>
                Retail businesses struggle with massive unstructured transactional logs where identifying top customers, predicting future spend, and preventing customer churn is slow and fragmented. This platform provides an end-to-end Big Data pipeline from web mining to HDFS, Hive, Spark ML, and a high-performance columnar KV serving layer for automated decision-making.
              </div>
            </div>

            <div style={{ background: '#0e1210', border: '1px solid #1f2421', borderRadius: '6px', padding: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                How does the serving layer achieve low-latency customer lookups?
              </div>
              <div style={{ fontSize: '12px', color: '#8e9693', lineHeight: 1.5 }}>
                Analytical warehouse systems like Hive are optimized for large batch scans, not real-time lookups. For production serving, the platform utilizes an embedded columnar Key-Value store following Apache HBase column-family design (<code>info:</code>, <code>pred:</code>, <code>meta:</code>) with HappyBase interface compatibility, providing direct, indexed point lookups for 5,942 profiles.
              </div>
            </div>

            <div style={{ background: '#0e1210', border: '1px solid #1f2421', borderRadius: '6px', padding: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                Why React + TypeScript + Flask REST Architecture?
              </div>
              <div style={{ fontSize: '12px', color: '#8e9693', lineHeight: 1.5 }}>
                Decoupling UI state management into modular React TypeScript components allows reactive real-time parameter tweaking in the what-if simulator and instant interactive chart updates, while Flask serves authenticated REST API v1 endpoints with database persistence and ML inference.
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            background: '#fff',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            alignSelf: 'flex-end',
          }}
        >
          Close Specifications
        </button>
      </div>
    </div>
  );
};
