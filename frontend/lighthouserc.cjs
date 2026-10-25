module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['http://localhost/index.html'],
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--no-sandbox --headless',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.50 }],
        'categories:accessibility': ['warn', { minScore: 0.75 }],
        'categories:best-practices': ['warn', { minScore: 0.70 }],
        'categories:seo': ['warn', { minScore: 0.70 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
