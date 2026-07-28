# Nuxt App

Nuxt 3 project with TypeScript (strict), Pinia, Vitest, and SCSS.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

Development with hot reload:

```bash
docker compose up --build
```

Production build:

```bash
docker compose --profile prod up app-prod --build
```

## Testing

```bash
npm run test
npm run test:run
npm run test:coverage
```

## Production

Build the application:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```
