# Autonoma Bank Demo WebApp

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fscafati98%2Fautonoma-bank-demo)


[Live Demo](https://v0-mercury-bank-webapp.vercel.app)  

A demo front-end application simulating a modern banking UI, built with **Next.js**, **TypeScript**, and **Tailwind CSS**.

---

## Table of Contents

- [About](#about)  
- [Features](#features)  
- [Tech Stack](#tech-stack)  
- [Getting Started](#getting-started)  
  - [Prerequisites](#prerequisites)  
  - [Installation](#installation)  
  - [Running Locally](#running-locally)  
  - [Building for Production](#building-for-production)  
- [Project Structure](#project-structure)  
- [Contributing](#contributing)  
- [License](#license)  
- [Acknowledgments](#acknowledgments)  

---

## About

The **Autonoma Bank Demo** is a showcase application that mimics a real-world banking experience — complete with dashboards, transactions, and account management screens.

This demo is designed to be used with **[Autonoma AI](https://getautonoma.com)** to automatically **generate, execute, and maintain end-to-end tests** across both web and mobile environments. It provides realistic user flows for testing login, payments, transfers, and UI consistency, serving as a sandbox to demonstrate Autonoma’s no-code AI testing capabilities.

And yes — it was **vibe-coded proudly with [v0](https://v0.dev)**.

---

## Features

- Modern banking flows: login, dashboard, transfers, transaction history  
- Responsive UI optimized for desktop and mobile  
- Component-driven architecture for easy maintenance  
- Tailwind-based design system  
- Ideal testbed for Autonoma AI to generate and run end-to-end tests automatically  

---

## Tech Stack

- **Framework**: Next.js (React)  
- **Language**: TypeScript  
- **Styling**: Tailwind CSS  
- **Build Tools**: PostCSS, Next.js config, Tailwind config  
- **Package Manager**: pnpm  

---

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- pnpm installed (`npm install -g pnpm`)

### Installation

```bash
git clone https://github.com/scafati98/autonoma-bank-demo.git
cd autonoma-bank-demo
pnpm install
```

### Running Locally

```bash
pnpm dev
```

Open your browser at `http://localhost:3000`.

### Building for Production

```bash
pnpm build
pnpm start
```

---

## Project Structure

```
.
├── app/                    # Next.js “app” directory (routes / pages)
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility modules
├── public/                 # Static assets
├── styles/                 # Global styles / Tailwind overrides
├── next.config.mjs         # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── postcss.config.mjs      # PostCSS config
├── tsconfig.json           # TypeScript config
└── package.json
```

---

## Contributing

Contributions are welcome!  
Fork the repo, make your changes, and open a PR — we’d love to see new features, UI improvements, or better Autonoma testing examples.

---

## License

Licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Built and vibe-coded proudly with **v0.dev**  
- Powered by the **Autonoma AI** team  
- Inspired by modern fintech UIs  

---

*Demo app for testing, showcasing, and experimenting with Autonoma AI.*
