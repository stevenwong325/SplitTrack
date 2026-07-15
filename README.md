# 📊 SplitTrack - Expense Tracker & Bill Splitter

**SplitTrack** is a beautiful, modern, client-side single-page application built using **React (Vite)**, **Tailwind CSS v4**, and **Lucide React** icons. It works entirely on the client side, utilizing browser `localStorage` for complete data persistence. 

It is designed to be mobile-first, responsive, and visually stunning, featuring a clean glassmorphic theme with clear color-coding for credit/debit balances.

---

## 🌟 Core Features

### 1. Dual Mode Tracking (Personal + Group Split)
When adding an expense, easily toggle between:
*   **👤 Personal Expense:** Paid 100% by you, factored purely into your own personal savings and category stats.
*   **👥 Group Split:** Shared among multiple group members, with custom split ratios and payer specifications.

### 2. Advanced Bill Splitting Modes
*   **⚖️ Equally Split:** Auto-calculates shares and elegantly handles decimal division remainders down to the penny by assigning fractional cents to the last member.
*   **✏️ Custom Split:** Specify precise amounts for each participant. Includes live sum validation alerts and a smart **"Auto Fill" Remainder** helper. This helper intelligently distributes any remaining amount evenly among selected splitters whose current split is `0` (or falls back to distributing among everyone if none are `0`), making complex splits effortless.

### 3. Debt Simplification Algorithm
Includes an optimized greedy ledger settlement matching algorithm ($O(N \log N)$ complexity). It simplifies net balances across the group, calculating "who owes whom" in the minimum possible transactions.
*   **Paid & Settle:** Click "Paid & Settle" to automatically log a neutralizing transaction that instantly resolves debts in the ledger!

### 4. Multi-Currency Engine & Custom Presets
*   **Dynamic Currency Manager:** Easily add custom currencies or load popular presets (including `USD`, `EUR`, `GBP`, `SGD`, `AUD`, `KRW`, `JPY`, `CNY`, and `TWD`) directly in the Settings tab.
*   **Safety Guards:** Prevents deleting the active Base Currency or any currency currently referenced by transactions to keep your ledger pristine.
*   **Flexible Exchange Rates:** Edit exchange rates dynamically. Changing the Base Currency automatically updates all statistics, converting historical records accurately.

### 5. Beautiful Monthly Dashboard & Ledger
*   **Monthly Overview:** Real-time summary cards for Total Income, Total Expenses, Net Balance, and Group Settlement outstanding levels.
*   **Category Analysis:** Progress bars detailing expenditure ratios sorted by highest categories.
*   **Transaction History:** Grouped by month, with search keywords and filters for Category, Expense vs Income, Personal, or Group splits.

### 6. Data Migration & Clipboard Share
*   **Share Settlements:** Copy fully formatted settlement summaries with one click (with custom Markdown bold and emojis) for immediate sharing on WhatsApp or LINE.
*   **Backup & Sync:** Import and export your complete app state as JSON backups in Settings.

---

## 🛠️ Quick Start

To run and edit this project locally on your machine, follow these steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 18+ recommended) along with `npm`.

### 1. Clone the repository
Navigate to your project directory:
```bash
cd SplitTrack
```

### 2. Install dependencies
Install React, Tailwind, and icon packages:
```bash
npm install
```

### 3. Start local development server
Run the dev server:
```bash
npm run dev
```
Once started, open your browser and navigate to the local link shown in your terminal (typically **`http://localhost:5173/`**).

### 4. Build for production
To build optimized, minified static assets:
```bash
npm run build
```
This will compile all code into the **`dist/`** directory. You can preview the production bundle locally with `npm run preview`.

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute it as you wish.

```text
MIT License

Copyright (c) 2026 Steven Wong

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
