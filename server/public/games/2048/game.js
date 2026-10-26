/**
 * NexusPlay Standalone Self-Hosted 2048 Engine
 * Copyright (c) 2014 Gabriele Cirulli under MIT License
 */

(function () {
  let grid = [
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null]
  ];
  let score = 0;
  let best = 0;
  try { best = parseInt(localStorage.getItem('np_2048_best') || '0', 10); } catch (_) {}

  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('score-val');
  const bestEl = document.getElementById('best-val');
  bestEl.textContent = best;

  function getEmpty() {
    const res = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!grid[r][c]) res.push({ r, c });
      }
    }
    return res;
  }

  function addRandom() {
    const empty = getEmpty();
    if (empty.length === 0) return;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function render() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        if (grid[r][c]) {
          const tile = document.createElement('div');
          tile.className = 'tile tile-' + (grid[r][c] <= 2048 ? grid[r][c] : 'super');
          tile.textContent = grid[r][c];
          tile.id = `tile-${r}-${c}`;
          cell.appendChild(tile);
        }
        boardEl.appendChild(cell);
      }
    }
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem('np_2048_best', String(best)); } catch (_) {}
    }
  }

  function slide(row) {
    const filtered = row.filter(v => v !== null);
    const res = [];
    let delta = 0;
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const v = filtered[i] * 2;
        delta += v;
        res.push(v);
        i += 2;
      } else {
        res.push(filtered[i]);
        i++;
      }
    }
    while (res.length < 4) res.push(null);
    let moved = false;
    for (let j = 0; j < 4; j++) {
      if (row[j] !== res[j]) moved = true;
    }
    return { res, delta, moved };
  }

  function move(dir) {
    let moved = false;
    let gained = 0;

    if (dir === 'LEFT') {
      for (let r = 0; r < 4; r++) {
        const { res, delta, moved: m } = slide(grid[r]);
        grid[r] = res;
        gained += delta;
        if (m) moved = true;
      }
    } else if (dir === 'RIGHT') {
      for (let r = 0; r < 4; r++) {
        const { res, delta, moved: m } = slide([...grid[r]].reverse());
        grid[r] = res.reverse();
        gained += delta;
        if (m) moved = true;
      }
    } else if (dir === 'UP') {
      for (let c = 0; c < 4; c++) {
        const col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
        const { res, delta, moved: m } = slide(col);
        for (let r = 0; r < 4; r++) grid[r][c] = res[r];
        gained += delta;
        if (m) moved = true;
      }
    } else if (dir === 'DOWN') {
      for (let c = 0; c < 4; c++) {
        const col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
        const { res, delta, moved: m } = slide(col);
        for (let r = 0; r < 4; r++) grid[3 - r][c] = res[r];
        gained += delta;
        if (m) moved = true;
      }
    }

    if (moved) {
      score += gained;
      addRandom();
      render();
    }
  }

  window.move2048 = move;

  window.restart2048 = function () {
    grid = [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null]
    ];
    score = 0;
    addRandom();
    addRandom();
    render();
  };

  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); move('UP'); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); move('RIGHT'); }
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); move('DOWN'); }
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); move('LEFT'); }
    else if (e.key === 'r' || e.key === 'R') { restart2048(); }
  });

  let touchStart = null;
  window.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  window.addEventListener('touchend', function (e) {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) {
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'RIGHT' : 'LEFT');
      else move(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStart = null;
  }, { passive: true });

  restart2048();
})();
