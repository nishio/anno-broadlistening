/** @type {import('next').NextConfig} */

const report = process.env.REPORT

const nextConfig = {
  env: { REPORT: report },
  ...(process.env.NODE_ENV === 'production' && report
    ? {
        output: "export",
        distDir: `../pipeline/outputs/${report}/report`,
        assetPrefix: "./"
      }
    : {})
}

module.exports = nextConfig
