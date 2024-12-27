# Talk to the City (TttC) Frontend

The frontend application for Talk to the City, built with Next.js and Tailwind CSS.

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

## Getting Started

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Start the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Development Guidelines

- Use TypeScript for all new components and files
- Follow the existing component structure
- Use Tailwind CSS for styling
- Ensure responsive design works on both mobile and desktop

## Building for Production

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## Deployment

The application can be deployed to any static hosting service that supports Next.js (e.g., Vercel).

Note: Ensure all relative paths in the application end with a trailing slash for correct asset loading.
