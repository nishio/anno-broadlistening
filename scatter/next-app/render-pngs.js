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
  let server = null;
  let browser = null;
  let page = null;
  
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
    page = await browser.newPage();
    
    // Set default timeout to 60 seconds to match other timeouts
    page.setDefaultTimeout(60000);
    
    // Start local server to serve the static export
    console.log('Starting local server...');
    
    // Get the report name from environment variable
    const report = process.env.REPORT;
    
    // Determine directories
    const nextDir = path.resolve(__dirname, '.next');
    const outputDir = report
      ? path.resolve(__dirname, '..', 'pipeline', 'outputs', report, 'report')
      : path.resolve(__dirname, 'out');
    const staticDir = outputDir;
    
    console.log('Next.js directory:', nextDir);
    console.log('Output directory:', outputDir);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Copy Next.js static files
    if (fs.existsSync(path.join(nextDir, 'static'))) {
      const nextStaticDir = path.join(nextDir, 'static');
      const outputStaticDir = path.join(outputDir, '_next', 'static');
      console.log('Copying static files from:', nextStaticDir, 'to:', outputStaticDir);
      fs.mkdirSync(outputStaticDir, { recursive: true });
      fs.cpSync(nextStaticDir, outputStaticDir, { recursive: true });
    }
    
    // Copy other Next.js files
    ['_buildManifest.js', '_ssgManifest.js'].forEach(file => {
      const srcPath = path.join(nextDir, 'static', file);
      if (fs.existsSync(srcPath)) {
        const destPath = path.join(outputDir, '_next', 'static', file);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
    });
    
    const staticFiles = fs.readdirSync(staticDir);
    console.log('Static directory contents:', staticFiles);
    
    server = http.createServer((req, res) => {
      console.log('Incoming request:', req.method, req.url);
      const url = req.url;
      console.log('Serving URL:', url);
      
      // Get the report name from environment variable
      const report = process.env.REPORT;
      if (!report) {
        throw new Error('REPORT environment variable must be set');
      }

      // Remove leading slash and handle base path
      const cleanUrl = url.replace(/^\//, '');
      console.log('Serving URL:', url, 'Clean URL:', cleanUrl);
      
      // Handle static assets
      if (cleanUrl.includes('_next/')) {
        // Extract the path after _next/
        const nextPath = cleanUrl.split('_next/')[1];
        const assetPath = path.join(staticDir, '_next', nextPath);
        console.log('Serving static asset from:', assetPath);
        
        if (fs.existsSync(assetPath)) {
          const contentType = nextPath.endsWith('.js') ? 'application/javascript' :
                            nextPath.endsWith('.css') ? 'text/css' :
                            'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          res.end(fs.readFileSync(assetPath));
          return;
        } else {
          console.error('Asset not found:', assetPath);
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
      }
      
      // Always serve index.html for report routes
      if (cleanUrl.startsWith('report/')) {
        console.log('Serving report page from:', staticDir);
        const indexPath = path.join(staticDir, 'index.html');
        if (!fs.existsSync(indexPath)) {
          console.error('Report page not found at:', indexPath);
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        
        // Read and modify HTML content
        let htmlContent = fs.readFileSync(indexPath, 'utf-8');
        
        // Fix relative paths in HTML
        htmlContent = htmlContent.replace(
          /(href|src)=["']\.\/(_next\/[^"']+)["']/g,
          (match, attr, path) => `${attr}="/${path}"`
        );
        
        res.setHeader('Content-Type', 'text/html');
        res.end(htmlContent);
        return;
      }
      
      // Default handler for other routes
      console.log('Default handler serving from:', staticDir);
      
      // Handle _next files without report prefix
      if (cleanUrl.startsWith('_next/')) {
        const assetPath = path.join(staticDir, cleanUrl);
        console.log('Serving _next asset from:', assetPath);
        
        if (fs.existsSync(assetPath)) {
          const contentType = cleanUrl.endsWith('.js') ? 'application/javascript' :
                            cleanUrl.endsWith('.css') ? 'text/css' :
                            'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          res.end(fs.readFileSync(assetPath));
          return;
        }
      }
      
      return handler(req, res, {
        public: staticDir,
        cleanUrls: true,
        directoryListing: false,
        rewrites: [
          { source: '/report/:name*', destination: '/index.html' }
        ]
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
      const report = process.env.REPORT;
      if (!report) {
        throw new Error('REPORT environment variable must be set');
      }
      
      // Navigate to the report page and wait for it to load
      console.log('Navigating to report page...');
      await page.goto(`http://localhost:3000/report/${report}`, {
        waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
        timeout: 120000
      });
      
      // Wait for initial page load and React hydration
      console.log('Waiting for page load and React hydration...');
      await page.waitForFunction(
        () => {
          const isLoaded = document.readyState === 'complete';
          const isHydrated = window.__NEXT_DATA__ !== undefined;
          const hasApp = document.getElementById('__next')?.children.length > 0;
          console.log('Page state:', { isLoaded, isHydrated, hasApp });
          return isLoaded && isHydrated && hasApp;
        },
        { timeout: 60000 }
      );
        
        // Add error listeners
        await page.evaluate(() => {
          window.addEventListener('error', (event) => {
            console.error('React Error:', event.error);
          });
          
          // Set up mutation observer to track DOM changes
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'childList') {
                const plot = document.querySelector('[data-scatter-plot="main"]');
                if (plot) {
                  console.log('Scatter plot found via mutation observer');
                }
              }
            });
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        });
        
        // Wait a bit for initial render
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 2000)));
      
      // Fix script and link paths
      await page.evaluate(() => {
        const fixPath = (el, attr) => {
          const value = el.getAttribute(attr);
          if (value?.startsWith('./')) {
            el.setAttribute(attr, value.replace(/^\.\//, '/'));
          }
        };
        
        document.querySelectorAll('script[src], link[href]').forEach(el => {
          fixPath(el, el.hasAttribute('src') ? 'src' : 'href');
        });
      });
      
      // Fix relative paths in HTML
      console.log('Fixing relative paths...');
      await page.evaluate(() => {
        const links = document.querySelectorAll('link[href^="./"], script[src^="./"]');
        links.forEach(el => {
          const attr = el.hasAttribute('href') ? 'href' : 'src';
          el[attr] = el[attr].replace(/^\.\//, '/');
        });
      });

      // Wait for scripts to load
      await page.waitForFunction(
        () => {
          return document.readyState === 'complete' && 
                 !document.querySelector('script[src^="/"]')?.dataset?.loading;
        },
        { timeout: 60000 }
      );

      // Wait for React to hydrate and scatter plot
      console.log('Waiting for React hydration and scatter plot...');
      
      // Wait for scatter plot to be rendered
      console.log('Waiting for scatter plot to render...');
      await page.waitForFunction(
        () => {
          // Log the current state of the app
          const app = document.getElementById('__next');
          console.log('App state:', {
            exists: !!app,
            childCount: app?.children?.length || 0,
            innerHTML: app?.innerHTML?.substring(0, 100) + '...'
          });
          
          // Try different selectors for the scatter plot
          const selectors = [
            '[data-scatter-plot="main"]',
            'svg',
            '.scatter-plot',
            '#scatter-plot'
          ];
          
          let plot = null;
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              console.log(`Found element with selector: ${selector}`);
              plot = element;
              break;
            }
          }
          
          if (!plot) {
            console.log('No scatter plot found with any selector');
            return false;
          }
          
          // Check plot dimensions and visibility
          const rect = plot.getBoundingClientRect();
          const style = window.getComputedStyle(plot);
          const state = {
            selector: plot.getAttribute('data-scatter-plot') || plot.id || plot.className,
            width: rect.width,
            height: rect.height,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            childCount: plot.children.length,
            hasPoints: plot.querySelectorAll('circle').length > 0,
            hasPath: plot.querySelectorAll('path').length > 0
          };
          console.log('Scatter plot state:', state);
          
          // Plot is ready when it has either points or paths and dimensions
          const hasContent = state.hasPoints || state.hasPath;
          const hasDimensions = rect.width > 0 && rect.height > 0;
          console.log('Plot readiness:', { hasContent, hasDimensions });
          
          return hasContent && hasDimensions;
        },
        { timeout: 180000 }
      );
      
      console.log('React hydrated, waiting for data loading...');
      
      // Wait for data to be loaded (check for clusters in the DOM)
      await page.waitForFunction(
        () => {
          const clusters = document.querySelectorAll('[id^="cluster-"]');
          console.log('Found clusters:', clusters.length);
          return clusters.length > 0;
        },
        { timeout: 30000 }
      );
      
      console.log('Data loaded, waiting for scatter plot...');
      
      // Then wait for scatter plot to be visible
      await page.waitForFunction(
        () => {
          const scatterPlot = document.querySelector('[data-scatter-plot="main"]');
          console.log('Scatter plot element found:', !!scatterPlot);
          
          if (!scatterPlot) {
            // Log all elements with data-scatter-plot attribute
            const plots = document.querySelectorAll('[data-scatter-plot]');
            console.log('All scatter plots:', Array.from(plots).map(p => ({
              id: p.getAttribute('data-scatter-plot'),
              width: p.getBoundingClientRect().width,
              height: p.getBoundingClientRect().height,
              display: window.getComputedStyle(p).display,
              visibility: window.getComputedStyle(p).visibility,
              opacity: window.getComputedStyle(p).opacity
            })));
            
            // Log the entire DOM structure for debugging
            console.log('DOM structure:', document.documentElement.innerHTML);
            return false;
          }
          
          const rect = scatterPlot.getBoundingClientRect();
          const style = window.getComputedStyle(scatterPlot);
          console.log('Scatter plot dimensions:', {
            width: rect.width,
            height: rect.height,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity
          });
          
          
          // Check if the plot has any child elements (circles, etc.)
          const hasChildren = scatterPlot.children.length > 0;
          console.log('Plot has children:', hasChildren);
          
          const hasVisiblePlot = rect.width > 0 && rect.height > 0 && 
                                style.display !== 'none' && 
                                style.visibility !== 'hidden' && 
                                style.opacity !== '0' &&
                                hasChildren;
          
          console.log('Plot is visible:', hasVisiblePlot);
          return hasVisiblePlot;
        },
        { timeout: 30000 }
      );
      
      // Log the page content for debugging
      const content = await page.content();
      console.log('Page content preview:', content.substring(0, 500) + '...');
      
      console.log('Waiting for scatter plot to be visible...');
      
      try {
        // Wait for scatter plot to be fully rendered
        await page.waitForFunction(
          () => {
            const plot = document.querySelector('[data-scatter-plot="main"]');
            if (!plot) return false;
            const rect = plot.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(plot).display !== 'none';
          },
          { timeout: 60000 }
        );
        
        // Verify the plot is rendered with dimensions
        const dimensions = await page.evaluate(() => {
          const plot = document.querySelector('[data-scatter-plot="main"]');
          if (!plot) return null;
          
          const rect = plot.getBoundingClientRect();
          const style = window.getComputedStyle(plot);
          
          return {
            width: rect.width,
            height: rect.height,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity
          };
        });
        
        if (!dimensions) {
          throw new Error('Scatter plot not found after waiting');
        }
        
        if (dimensions.width === 0 || dimensions.height === 0) {
          throw new Error(`Scatter plot has invalid dimensions: ${JSON.stringify(dimensions)}`);
        }
        
        console.log('Scatter plot found with dimensions:', dimensions);
        
        // Short wait for any final rendering
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
        
      } catch (error) {
        console.error('Error waiting for scatter plot:', error);
        
        // Log page state for debugging
        const content = await page.content();
        console.log('Current page content:', content.substring(0, 1000) + '...');
        
        // Log all SVG elements
        const svgElements = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('svg')).map(svg => ({
            id: svg.id,
            className: svg.className,
            attributes: Array.from(svg.attributes).map(attr => `${attr.name}="${attr.value}"`),
            dimensions: svg.getBoundingClientRect()
          }));
        });
        console.log('Available SVG elements:', svgElements);
        
        throw error;
      }
      
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
    
    console.log('PNG generation complete!');
    
  } catch (error) {
    console.error('Error generating PNGs:', error);
    throw error;  // Re-throw to be handled by the finally block
  } finally {
    // Cleanup
    console.log('Cleaning up...');
    
    try {
      if (page) {
        await page.close();
        console.log('Page closed');
      }
    } catch (err) {
      console.error('Error closing page:', err);
    }
    
    try {
      if (browser) {
        await browser.close();
        console.log('Browser closed');
      }
    } catch (err) {
      console.error('Error closing browser:', err);
    }
    
    try {
      if (server) {
        await new Promise((resolve) => {
          server.close(() => {
            console.log('Server closed');
            resolve();
          });
        });
      }
    } catch (err) {
      console.error('Error closing server:', err);
    }
  }
}

// Run the PNG generation
generatePNGs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
