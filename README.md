# Processing Benchmark Suite

[![Next.js](https://img.shields.io/badge/Next.js-16--App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind--4-Emerald-064e3b?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

A web application for comparing algorithm outputs and metrics.

## Workflow Architecture

```mermaid
graph TD
    A[Define System Protocol] --> B(Select Engines)
    B --> C(Tune Hyperparameters)
    C --> D[Execute & Monitor Stream]
    D --> E{Visual Diff Engine}
    E --> F(Analyze Word-Level Differences)
    F --> G[Save to Chronicle & Refine]
```

## Directory Structure

```text
/
├── app/               # Next.js App Router & Server Components
├── components/        # Metrics display, Diff views, Editor UI
├── lib/               # Diffing engine, SDK integration, Benchmarking logic
├── public/            # Static Assets & Screenshots
└── package.json       # Dependencies & Scripts
```

## Metrics Collection

Captures TTFT (Time To First Token) latency during execution. 
Uses the `diff` algorithm to display word-level differences between outputs.

## Features

*   **Diffing**: Compare text outputs side-by-side.
*   **Scroll Synchronization**: Scroll multiple columns simultaneously.
*   **Configuration**: Adjust Temperature, Top-P, and Max Tokens per column.
*   **Session Storage**: Saves history to `localStorage`.

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 |
| **State** | React 19 |
| **Styling** | Tailwind CSS 4 |

## Getting Started

```bash
git clone https://github.com/GaneshArwan/MultiModelAI.git
cd MultiModelAI
npm install
npm run dev
```

## Deployment

Requires client-side API keys. Keys are stored locally in the browser and passed directly to the provider endpoints.

## License

MIT License © 2026 GaneshArwan
