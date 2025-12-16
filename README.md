# King of Diamonds LAN – Alice in Borderland Style

A LAN-based multiplayer implementation of the King of Diamonds game from Alice in Borderland.  
Players connect over the same Wi‑Fi/network, secretly choose numbers, and lose health based on how far they are from the target.

---

## Requirements

- **Operating System**
  - Windows 10/11 (batch script provided)

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

###  – Windows batch script

There should be a file named `start-lan.bat` in the project folder.
Run this and there should be 2 consoles that open; One with the ip and one with the backend.
