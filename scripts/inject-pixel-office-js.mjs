import { readFileSync, writeFileSync } from 'fs';

const filepath = 'c:/Users/david/Documents/CFv1/scripts/launcher/index.html';
let html = readFileSync(filepath, 'utf8');

if (html.includes('window.startPixelOffice')) {
  console.log('JS already present');
  process.exit(0);
}

const officeJS = `

// ── Pixel Office ─────────────────────────────────────────────────
(function() {
  const AGENTS = [
    { id: 'main',   name: 'Main (Opus)',    role: 'Orchestrator', color: '#e88f47', model: 'Claude Opus 4.6',    cost: '$$$',  desk: { x: 0.5,  y: 0.25 } },
    { id: 'sonnet', name: 'Sonnet',         role: 'Senior Eng',   color: '#3b82f6', model: 'Claude Sonnet 4.6',  cost: '$$',   desk: { x: 0.2,  y: 0.5 } },
    { id: 'build',  name: 'Build',          role: 'Engineer',     color: '#22c55e', model: 'qwen3-coder:30b',    cost: 'FREE', desk: { x: 0.5,  y: 0.5 } },
    { id: 'qa',     name: 'QA',             role: 'Quality',      color: '#a855f7', model: 'qwen3:30b',          cost: 'FREE', desk: { x: 0.8,  y: 0.5 } },
    { id: 'runner', name: 'Runner',         role: 'Tasks',        color: '#eab308', model: 'qwen3:4b',           cost: 'FREE', desk: { x: 0.35, y: 0.72 } }
  ];
  const ROLE_ACTIVITIES = {
    main:   ['reading ROADMAP...', 'delegating task...', 'reviewing Build output...', 'checking PROGRESS...', 'architecture decision...', 'assigning to Sonnet...', 'planning sprint...', 'reviewing QA report...'],
    sonnet: ['complex refactor...', 'debugging cross-file issue...', 'security review...', 'architecture analysis...', 'fixing auth logic...', 'reviewing RLS policies...', 'code review (escalated)...'],
    build:  ['writing component...', 'implementing feature...', 'fixing bug...', 'writing migration...', 'building page...', 'writing server action...', 'fixing types...', 'creating API route...'],
    qa:     ['running tsc...', 'type checking...', 'reviewing PR...', 'testing endpoint...', 'checking error handling...', 'hallucination scan...', 'regression test...', 'verifying fix...'],
    runner: ['updating docs...', 'running grep...', 'git commit...', 'formatting files...', 'linting...', 'file search...', 'updating PROGRESS.md...', 'cleaning imports...']
  };
  let officeRunning = false, officeRAF = null, agents = [], canvas, ctx, lastW = 0, lastH = 0;

  class PixelAgent {
    constructor(def) {
      Object.assign(this, def);
      this.x = def.desk.x; this.y = def.desk.y;
      this.targetX = this.x; this.targetY = this.y;
      this.activity = this.pickActivity();
      this.activityTimer = Math.random() * 300 + 100;
      this.frame = 0; this.atDesk = true;
      this.walkTimer = Math.random() * 600 + 200;
      this.typingFrame = 0;
      this.particles = [];
    }
    pickActivity() {
      const pool = ROLE_ACTIVITIES[this.id] || [];
      return pool[Math.floor(Math.random() * pool.length)] || 'working...';
    }
    update() {
      this.frame++; this.typingFrame++; this.activityTimer--; this.walkTimer--;
      if (this.activityTimer <= 0) {
        this.activity = this.pickActivity();
        this.activityTimer = Math.random() * 400 + 150;
        this.particles.push({ x: 0, y: -8, life: 30, color: this.color });
      }
      if (this.walkTimer <= 0 && this.atDesk) {
        this.atDesk = false;
        this.targetX = Math.max(0.05, Math.min(0.95, this.desk.x + (Math.random() - 0.5) * 0.15));
        this.targetY = Math.max(0.15, Math.min(0.85, this.desk.y + (Math.random() - 0.5) * 0.1));
        this.walkTimer = Math.random() * 800 + 300;
        setTimeout(() => {
          this.targetX = this.desk.x; this.targetY = this.desk.y;
          setTimeout(() => { this.atDesk = true; }, 2000);
        }, 1500 + Math.random() * 2000);
      }
      this.x += (this.targetX - this.x) * 0.008;
      this.y += (this.targetY - this.y) * 0.008;
      this.particles = this.particles.filter(p => { p.y -= 0.5; p.life--; return p.life > 0; });
    }
  }

  function initOffice() {
    canvas = document.getElementById('office-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    agents = AGENTS.map(a => new PixelAgent(a));
  }

  function drawOffice() {
    if (!canvas || !ctx) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = Math.floor(rect.width), h = Math.floor(rect.height - 50);
    if (w <= 0 || h <= 0) return;
    if (w !== lastW || h !== lastH) { canvas.width = w; canvas.height = h; lastW = w; lastH = h; }

    // Background
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, w, h);

    // Floor grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    // Title
    ctx.fillStyle = 'rgba(232,143,71,0.08)'; ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = '#e88f47'; ctx.font = 'bold 14px Inter, monospace'; ctx.textAlign = 'center';
    ctx.fillText('ChefFlow Engineering HQ', w / 2, 28);

    // Hierarchy lines
    const mainA = agents[0];
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    agents.slice(1).forEach(a => {
      ctx.beginPath(); ctx.moveTo(mainA.x * w, mainA.y * h + 20); ctx.lineTo(a.x * w, a.y * h - 20); ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw agents
    agents.forEach(a => {
      a.update();
      const ax = Math.round(a.x * w), ay = Math.round(a.y * h);

      // Desk glow
      const glow = ctx.createRadialGradient(ax, ay + 10, 0, ax, ay + 10, 50);
      glow.addColorStop(0, a.color + '15'); glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(ax - 50, ay - 40, 100, 80);

      // Desk
      ctx.fillStyle = '#2a2a4a'; ctx.fillRect(ax - 28, ay + 6, 56, 18);
      ctx.strokeStyle = a.color + '40'; ctx.lineWidth = 1; ctx.strokeRect(ax - 28, ay + 6, 56, 18);

      // Monitor
      ctx.fillStyle = '#0d1117'; ctx.fillRect(ax - 12, ay - 8, 24, 16);
      ctx.strokeStyle = a.color + '80'; ctx.strokeRect(ax - 12, ay - 8, 24, 16);

      // Screen content
      if (a.atDesk) {
        for (let i = 0; i < 3; i++) {
          const lw = 6 + Math.sin(a.typingFrame * 0.05 + i * 2) * 4;
          ctx.fillStyle = a.color + '60'; ctx.fillRect(ax - 8, ay - 5 + i * 4, lw, 2);
        }
        if (Math.floor(a.frame / 20) % 2 === 0) {
          ctx.fillStyle = a.color; ctx.fillRect(ax - 8 + 6 + Math.sin(a.typingFrame * 0.05) * 4, ay - 5, 1, 3);
        }
      }

      // Character: head
      ctx.fillStyle = a.color; ctx.fillRect(ax - 4, ay - 24, 8, 8);
      // Body
      ctx.fillStyle = a.color + 'cc'; ctx.fillRect(ax - 5, ay - 16, 10, 10);
      // Eyes
      ctx.fillStyle = '#fff'; ctx.fillRect(ax - 2, ay - 22, 2, 2); ctx.fillRect(ax + 1, ay - 22, 2, 2);

      // Walking legs
      if (!a.atDesk) {
        const lo = Math.sin(a.frame * 0.15) * 2;
        ctx.fillStyle = a.color + '99';
        ctx.fillRect(ax - 3, ay - 6, 3, 6 + lo); ctx.fillRect(ax + 1, ay - 6, 3, 6 - lo);
      }

      // Status dot
      ctx.fillStyle = a.atDesk ? '#22c55e' : '#eab308';
      ctx.beginPath(); ctx.arc(ax + 8, ay - 24, 3, 0, Math.PI * 2); ctx.fill();

      // Labels
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(a.name, ax, ay + 38);
      ctx.fillStyle = a.color + 'aa'; ctx.font = '10px Inter, sans-serif';
      ctx.fillText(a.role, ax, ay + 50);
      ctx.fillStyle = '#64748b'; ctx.font = '9px Inter, monospace';
      ctx.fillText(a.activity.length > 28 ? a.activity.slice(0, 28) + '...' : a.activity, ax, ay + 62);

      // Cost badge
      ctx.font = 'bold 9px Inter, monospace';
      const cc = a.cost === 'FREE' ? '#22c55e' : a.cost === '$$' ? '#eab308' : '#ef4444';
      ctx.fillStyle = cc + '30';
      const cw2 = ctx.measureText(a.cost).width + 8;
      ctx.fillRect(ax - cw2 / 2, ay + 66, cw2, 14);
      ctx.fillStyle = cc; ctx.fillText(a.cost, ax, ay + 76);

      // Particles
      a.particles.forEach(p => {
        const alpha = Math.floor((p.life / 30) * 99).toString().padStart(2, '0');
        ctx.fillStyle = p.color + alpha;
        ctx.fillRect(ax + p.x - 1, ay + p.y - 1, 3, 3);
      });
    });

    // Bottom bar
    const barY = h - 30;
    ctx.fillStyle = 'rgba(15,20,32,0.8)'; ctx.fillRect(0, barY, w, 30);
    ctx.font = '11px Inter, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#64748b';
    ctx.fillText('Agents: ' + agents.length, 16, barY + 19);
    ctx.fillStyle = '#22c55e';
    ctx.fillText(agents.filter(a => a.cost === 'FREE').length + ' FREE (Ollama)', 100, barY + 19);
    ctx.fillStyle = '#eab308';
    ctx.fillText((agents.length - agents.filter(a => a.cost === 'FREE').length) + ' Paid (Anthropic)', 230, barY + 19);
    const now = new Date();
    ctx.textAlign = 'right'; ctx.fillStyle = '#64748b';
    ctx.fillText(now.toLocaleTimeString(), w - 16, barY + 19);
    const ce = document.getElementById('office-clock');
    if (ce) ce.textContent = now.toLocaleTimeString();
  }

  function officeLoop() { if (!officeRunning) return; drawOffice(); officeRAF = requestAnimationFrame(officeLoop); }

  window.startPixelOffice = function() {
    if (officeRunning) return;
    initOffice(); officeRunning = true; officeLoop();
  };
  window.stopPixelOffice = function() {
    officeRunning = false; if (officeRAF) cancelAnimationFrame(officeRAF);
  };

  // Tooltip
  document.addEventListener('mousemove', function(e) {
    const tooltip = document.getElementById('office-tooltip');
    if (!tooltip || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let found = null;
    for (const a of agents) {
      if (Math.abs(mx - a.x * rect.width) < 35 && Math.abs(my - a.y * rect.height) < 40) { found = a; break; }
    }
    if (found) {
      const costLabel = found.cost === 'FREE' ? 'Local (Ollama) - $0' : 'Anthropic API - ' + found.cost;
      const costColor = found.cost === 'FREE' ? '#22c55e' : '#eab308';
      tooltip.innerHTML =
        '<div style="font-weight:700;color:' + found.color + ';margin-bottom:4px;">' + found.name + '</div>' +
        '<div style="color:var(--text-secondary);font-size:11px;margin-bottom:6px;">' + found.role + ' &middot; ' + found.model + '</div>' +
        '<div style="color:var(--text-primary);font-size:11px;margin-bottom:4px;">' + found.activity + '</div>' +
        '<div style="font-size:10px;color:' + costColor + ';">' + costLabel + '</div>';
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 60) + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  });
})();

`;

const lastScriptClose = html.lastIndexOf('</script>');
if (lastScriptClose > 0) {
  html = html.slice(0, lastScriptClose) + officeJS + html.slice(lastScriptClose);
  console.log('JS injected');
} else {
  console.log('ERROR: no closing script tag');
  process.exit(1);
}

writeFileSync(filepath, html, 'utf8');
console.log('Done - Pixel Office JS added to local Mission Control');
