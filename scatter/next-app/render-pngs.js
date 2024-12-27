const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const handler = require('serve-handler');
const http = require('http');

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
  try {
    console.log(`Capturing ${selector} at ${viewport.width}x${viewport.height} to ${outputPath}`);
    await page.setViewport(viewport);
    
    // Wait for element to be visible
    await page.waitForSelector(selector, { visible: true, timeout: 10000 });
    
    // Wait an extra second for any animations/rendering
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    // Ensure element is in view
    await element.evaluate(el => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await element.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: true
    });
    
    console.log(`Successfully captured ${outputPath}`);
  } catch (error) {
    console.error(`Failed to capture ${selector}:`, error);
    throw error;
  }
}

async function generatePNGs() {
  let server;
  let browser;
  
  try {
    // Ensure public directory exists
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public');
    }
    
    console.log('Starting browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set default timeout to 60 seconds to match other timeouts
    page.setDefaultTimeout(60000);
    
    // Start local server to serve the static export
    console.log('Starting local server...');
    
    // Verify static export directory exists and has content
    const staticDir = process.env.REPORT 
      ? path.resolve(__dirname, `../pipeline/outputs/${process.env.REPORT}/report`)
      : path.resolve(__dirname, 'out');
    console.log('Static directory path:', staticDir);
    
    if (!fs.existsSync(staticDir)) {
      console.error('Static directory does not exist:', staticDir);
      throw new Error(`Static directory not found: ${staticDir}`);
    }
    
    const staticFiles = fs.readdirSync(staticDir);
    console.log('Static directory contents:', staticFiles);
    
    if (!staticFiles.includes('report')) {
      console.error('No report directory found in static directory');
      throw new Error('Missing report directory in static export');
    }
    
    server = http.createServer((req, res) => {
      console.log('Incoming request:', req.method, req.url);
      return handler(req, res, {
        public: staticDir,
        cleanUrls: true
      });
    });
    
    await new Promise((resolve, reject) => {
      server.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });
      
      server.listen(3000, (err) => {
        if (err) {
          console.error('Failed to start server:', err);
          reject(err);
        } else {
          console.log('Server started on port 3000');
          resolve();
        }
      });
    });
    
    // Generate PNGs for both mobile and PC viewports
    for (const [deviceType, viewport] of Object.entries(VIEWPORT_SIZES)) {
      console.log(`Generating ${deviceType} PNGs...`);
      
      // Enable console logging from browser
      page.on('console', msg => console.log('Browser console:', msg.text()));
      
      // Main scatter plot from report page
      console.log('Navigating to report page...');
      await page.goto('http://localhost:3000/report/example-polis', {
        waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
        timeout: 60000
      });
      
      // Log the page content for debugging
      const content = await page.content();
      console.log('Page content preview:', content.substring(0, 500) + '...');
      
      // Wait for hydration and scatter plot to be visible
      console.log('Waiting for scatter plot to be visible...');
      
      // Wait for the container to be present and log page state
      await page.waitForFunction(() => {
        const container = document.querySelector('#__next');
        console.log('Container state:', {
          found: !!container,
          innerHTML: container ? container.innerHTML.substring(0, 100) + '...' : 'not found'
        });
        return container !== null;
      }, { timeout: 60000 });
      console.log('Next.js container found');

      // Wait for the scatter plot container and check its state
      await page.waitForFunction(() => {
        const plot = document.querySelector('[data-scatter-plot="main"]');
        if (!plot) {
          console.log('Scatter plot not found yet');
          return false;
        }
        console.log('Scatter plot found:', {
          dimensions: plot.getBoundingClientRect(),
          style: window.getComputedStyle(plot)
        });
        return true;
      }, { timeout: 60000 });
      console.log('Main scatter plot element found and rendered');
      
      // Finally wait for it to be properly rendered
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-scatter-plot="main"]');
        if (!el) return false;
        
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        
        // Log visibility state for debugging
        console.log('Element dimensions:', {
          width: rect.width,
          height: rect.height,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity
        });
        
        return rect.width > 0 && 
               rect.height > 0 && 
               style.display !== 'none' && 
               style.visibility !== 'hidden' &&
               style.opacity !== '0';
      }, { timeout: 60000 });
      
      // Additional wait for any dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Page loaded and hydrated');
      
      await captureScatterPlot(
        page,
        viewport,
        '[data-scatter-plot="main"]',
        PNG_PATHS[deviceType].main
      );
      
      // Get list of cluster IDs from the page
      console.log('Getting cluster IDs...');
      const clusterIds = await page.evaluate(() => {
        const clusterElements = document.querySelectorAll('[data-scatter-plot^="cluster-"]');
        return Array.from(clusterElements).map(el => {
          const attr = el.getAttribute('data-scatter-plot');
          return attr.replace('cluster-', '');
        });
      });
      console.log('Found cluster IDs:', clusterIds);
      
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
    console.log('Cleaning up...');
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          console.log('Server closed');
          resolve();
        });
      });
    }
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
    console.log('PNG generation complete!');
    
  } catch (error) {
    console.error('Error generating PNGs:', error);
    // Cleanup on error
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          console.log('Server closed');
          resolve();
        });
      });
    }
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
    process.exit(1);
  }
}

// Run the PNG generation
generatePNGs();
