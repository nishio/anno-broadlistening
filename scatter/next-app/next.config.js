/** @type {import('next').NextConfig} */

const report = process.env.REPORT

const nextConfig = !report
  ? {
      output: "export",
      distDir: "out",
      env: {
        USE_PNG: process.env.USE_PNG || 'false'
      }
    }
  : {
      output: "export",
      distDir: `../pipeline/outputs/${report}/report`,
      assetPrefix: "./",
      env: {
        REPORT: report,
        USE_PNG: process.env.USE_PNG || 'false'
      }
    }

module.exports = nextConfig
