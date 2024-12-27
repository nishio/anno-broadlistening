const puppeteer = require('puppeteer');

// Configuration for different viewport sizes
const VIEWPORT_SIZES = {
  mobile: { width: 375, height: 667 },  // iPhone SE size as baseline
  pc: { width: 1280, height: 800 }      // Standard desktop size
};

// Paths for storing generated PNGs
const PNG_PATHS = {
  mobile: {
    main: 'public/scatter_main_mobile.png',
    cluster: (id) => `public/scatter_cluster_${id}_mobile.png`
  },
  pc: {
    main: 'public/scatter_main_pc.png',
    cluster: (id) => `public/scatter_cluster_${id}_pc.png`
  }
};

async function captureScatterPlot(page, viewport, selector, outputPath) {
  await page.setViewport(viewport);
  const element = await page.$(selector);
  if (!element) {
    console.error(`Element not found: ${selector}`);
    return;
  }
  await element.screenshot({
    path: outputPath,
    type: 'png'
  });
}

async function generatePNGs() {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Start local server to serve the exported site
    console.log('Starting local server...');
    const server = require('http').createServer(
      require('serve-handler')(null, { public: 'out' })
    );
    await new Promise((resolve) => server.listen(3000, resolve));
    
    // Generate PNGs for both mobile and PC viewports
    for (const [deviceType, viewport] of Object.entries(VIEWPORT_SIZES)) {
      console.log(`Generating ${deviceType} PNGs...`);
      
      // Main scatter plot from index
      await page.goto('http://localhost:3000/');
      await captureScatterPlot(
        page,
        viewport,
        '[data-scatter-plot="main"]',  // We'll add this attribute to the main plot
        PNG_PATHS[deviceType].main
      );
      
      // Get list of cluster IDs from the page
      const clusterIds = await page.evaluate(() => {
        const clusterElements = document.querySelectorAll('[data-cluster-id]');
        return Array.from(clusterElements).map(el => el.getAttribute('data-cluster-id'));
      });
      
      // Generate PNGs for each cluster
      for (const clusterId of clusterIds) {
        await captureScatterPlot(
          page,
          viewport,
          `[data-scatter-plot="cluster-${clusterId}"]`,  // We'll add this attribute to cluster plots
          PNG_PATHS[deviceType].cluster(clusterId)
        );
      }
    }
    
    // Cleanup
    server.close();
    await browser.close();
    console.log('PNG generation complete!');
    
  } catch (error) {
    console.error('Error generating PNGs:', error);
    process.exit(1);
  }
}

// Run the PNG generation
generatePNGs();
