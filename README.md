# King of Diamonds LAN – Alice in Borderland Style

A LAN-based multiplayer implementation of the King of Diamonds game from Alice in Borderland.  
Players connect over the same Wi‑Fi/network, secretly choose numbers, and lose health based on how far they are from the target.

---

## Requirements

- **Operating System**
  - Windows 10/11 (batch script provided)
  - macOS / Linux (manual commands supported)

- **Software**
  - [Node.js](https://nodejs.org/) v18 or newer
  - npm (installed automatically with Node.js)
  - A modern web browser (Chrome, Edge, Firefox, Brave, etc.)

- **Network**
  - All players must be on the **same local network** (Wi‑Fi or Ethernet)
  - Firewalls must allow local connections to:
    - TCP **port 3001** (game server)
    - TCP **port 5173** (Vite dev server / frontend)

---

## Features

- LAN multiplayer (same Wi‑Fi / local network)
- Hidden choices (no cheating between players)
- Target is the average of all choices × 0.8
- Each player starts with 10 HP
- Closest player(s) lose 0 HP, everyone else loses 1 HP
- Simple browser UI built with React + Vite

---

## Installation

1. Clone or download this repo

git clone https://github.com/your-username/king-of-diamonds-lan.git
cd king-of-diamonds-lan

### Windows batch script

There should be a file named `start-lan.bat` in the project folder
Run it and if 2 terminals open, 1 is the backend and the other is where you can see the IP to connect with.


---
