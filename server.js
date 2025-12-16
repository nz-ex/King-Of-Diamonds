import { createServer } from 'http';
import { Server } from 'socket.io';

const server = createServer();
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let game = {
  players: {},        // { socketId: { name, health } }
  round: 1,
  choices: {},        // { socketId: number }
  roundActive: false
};

io.on('connection', (socket) => {
  console.log('🟢 Player connected:', socket.id);

  socket.on('join', (name) => {
    const trimmed = (name || '').trim() || 'Player';
    if (!game.players[socket.id]) {
      game.players[socket.id] = { name: trimmed, health: 10 };
    }
    console.log('Player joined:', trimmed);
    io.emit('players', game.players);
  });

  socket.on('startRound', () => {
    if (Object.keys(game.players).length >= 2 && !game.roundActive) {
      game.roundActive = true;
      game.choices = {};
      console.log(`Round ${game.round} started`);
      io.emit('roundStart', game.round);
    }
  });

  socket.on('choice', (num) => {
    if (!game.roundActive) return;
    const clamped = Math.max(0, Math.min(100, Number(num) || 0));
    game.choices[socket.id] = clamped;
    console.log(`Choice received: ${clamped} from ${game.players[socket.id]?.name}`);

    if (Object.keys(game.choices).length === Object.keys(game.players).length) {
      setTimeout(endRound, 500);
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete game.players[socket.id];
    io.emit('players', game.players);
  });
});

/*
  RULE STACKING:

  Base (Rule 5) – always:
    - avg = mean(choices)
    - target = avg * 0.8
    - closest choice(s) win; everyone else loses HP

  Rule 4 – duplicate numbers voided:
    - If 2+ players choose the same number, those votes are void
    - They still lose HP as losers

  Rule 3 – exact target → double damage:
    - If any player’s choice equals target when rounded, losers lose 2 HP instead of 1

  Rule 2 – 0 vs 100 (2 players only):
    - If one chooses 0 and the other 100, the 100 player is the sole winner

  Stacking:
    - 5+ players: Rule 5 only
    - 4 players: Rules 4 + 5
    - 3 players: Rules 3 + 4 + 5
    - 2 players: Rules 2 + 3 + 4 + 5
*/

function endRound() {
  if (!game.roundActive) return;
  game.roundActive = false;

  const playerIds = Object.keys(game.players);
  const nums = Object.values(game.choices);
  if (nums.length === 0) return;

  const playerCount = playerIds.length;

  // Base: avg × 0.8 (Rule 5)
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const target = avg * 0.8;

  // Working copy of choices; rules may modify this (void votes, etc)
  const effectiveChoices = { ...game.choices };

  let forcedWinners = null;         // if a rule hard-sets the winners
  let damagePerLoser = 1;           // losers' HP loss (Rule 5 default)
  const voidedIds = new Set();      // players whose votes were voided (Rule 4)

  // Decide which rules are active based on playerCount
  const useRule2 = playerCount === 2;           // 0 vs 100
  const useRule3 = playerCount <= 3;           // 2 or 3 players
  const useRule4 = playerCount <= 4;           // 2, 3, or 4 players
  // Rule 5 is always active

  // ---- Rule 4: duplicate numbers are void (for <= 4 players) ----
  if (useRule4) {
    const valueToIds = {};
    Object.entries(effectiveChoices).forEach(([id, value]) => {
      if (!valueToIds[value]) valueToIds[value] = [];
      valueToIds[value].push(id);
    });

    Object.entries(valueToIds).forEach(([value, ids]) => {
      if (ids.length >= 2) {
        ids.forEach((id) => {
          voidedIds.add(id);
          delete effectiveChoices[id]; // remove from winner calculation
        });
      }
    });
  }

  // ---- Rule 2: 2-player 0 vs 100 special case ----
  if (useRule2) {
    const entries = Object.entries(effectiveChoices);
    if (entries.length === 2) {
      const [idA, valA] = entries[0];
      const [idB, valB] = entries[1];
      const values = new Set([valA, valB]);

      if (values.has(0) && values.has(100)) {
        // Player who chose 100 is the sole winner
        const hundredId = valA === 100 ? idA : idB;
        forcedWinners = [hundredId];
      }
    }
  }

  // ---- Rule 3: exact target ⇒ double damage for losers ----
  if (useRule3) {
    const roundedTarget = Math.round(target);
    const hasExact = Object.values(effectiveChoices).some(
      (choice) => Math.round(choice) === roundedTarget
    );
    if (hasExact) {
      damagePerLoser = 2;
    }
  }

  // If all effective choices were voided (possible with Rule 4),
  // treat it as everyone failing: all lose damagePerLoser
  if (Object.keys(effectiveChoices).length === 0) {
    console.log('All effective choices voided; all players take damage.');
    Object.keys(game.players).forEach((id) => {
      const p = game.players[id];
      if (p.health === undefined) p.health = 10;
      p.health -= damagePerLoser;
    });

    const result = {
      round: game.round,
      avg: avg.toFixed(1),
      target: target.toFixed(1),
      winners: [],
      choices: game.choices,
      appliedRules: {
        playerCount,
        useRule2,
        useRule3,
        useRule4,
        voidedIds: Array.from(voidedIds),
        forcedWinners: null,
        damagePerLoser
      }
    };

    io.emit('result', result);
    io.emit('players', game.players);
    game.round += 1;
    return;
  }

  // ---- Rule 5: base closest-to-target wins (unless forcedWinners set) ----
  let winners;
  if (forcedWinners) {
    winners = forcedWinners;
  } else {
    let closest = Infinity;
    winners = [];
    Object.entries(effectiveChoices).forEach(([id, choice]) => {
      const dist = Math.abs(choice - target);
      if (dist < closest) {
        closest = dist;
        winners = [id];
      } else if (dist === closest) {
        winners.push(id);
      }
    });
  }

  // Apply HP changes:
  //   - Winners: lose 0 HP
  //   - Everyone else (including voided votes): lose damagePerLoser
  Object.keys(game.players).forEach((id) => {
    const player = game.players[id];
    if (player.health === undefined) player.health = 10;

    const isWinner = winners.includes(id);
    if (!isWinner) {
      player.health -= damagePerLoser;
    }
  });

  const result = {
    round: game.round,
    avg: avg.toFixed(1),
    target: target.toFixed(1),
    winners,
    choices: game.choices,
    appliedRules: {
      playerCount,
      useRule2,
      useRule3,
      useRule4,
      voidedIds: Array.from(voidedIds),
      forcedWinners,
      damagePerLoser
    }
  };

  console.log('Round ended:', result);

  io.emit('result', result);
  io.emit('players', game.players);

  game.round += 1;
}

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🟢 Server ready - Waiting for players...');
});
