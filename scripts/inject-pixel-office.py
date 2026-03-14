#!/usr/bin/env python3
"""Inject the Pixel Office panel into Mission Control index.html"""
import sys

filepath = sys.argv[1] if len(sys.argv) > 1 else "/home/openclawcf/apps/CFv1-openclaw-sandbox/scripts/launcher/index.html"

with open(filepath, "r", encoding="utf-8") as f:
    html = f.read()

# ── 1. Add nav item after marketing nav ──
nav_marker = '''<a class="nav-item" data-section="marketing" title="Marketing — Demo Video Library">
        <span class="nav-dot online" id="nd-marketing"></span>
        <span class="nav-icon">&#x1F3AC;</span>
        <span class="nav-label">Marketing</span>
      </a>'''

nav_insert = '''<a class="nav-item" data-section="marketing" title="Marketing — Demo Video Library">
        <span class="nav-dot online" id="nd-marketing"></span>
        <span class="nav-icon">&#x1F3AC;</span>
        <span class="nav-label">Marketing</span>
      </a>
      <a class="nav-item" data-section="office" title="Pixel Office — Agent Activity">
        <span class="nav-dot online" id="nd-office"></span>
        <span class="nav-icon">&#x1F3E2;</span>
        <span class="nav-label">Office</span>
      </a>'''

if nav_marker in html:
    html = html.replace(nav_marker, nav_insert)
    print("Nav item injected")
else:
    print("WARNING: Could not find nav marker for marketing")

# ── 2. Add panel before console wrapper ──
panel_marker = '      <!-- ═══ Console ═══ -->'

pixel_panel = '''      <div class="panel" id="panel-office" style="background:#1a1a2e;position:relative;overflow:hidden;">
        <div class="panel-header" style="z-index:10;position:relative;">
          <h2 class="panel-title">Pixel Office</h2>
          <div style="display:flex;align-items:center;gap:12px;">
            <span id="office-clock" style="font-family:monospace;font-size:13px;color:var(--text-muted);"></span>
            <span class="status-badge online" style="background:var(--brand-dim);color:var(--brand);border:1px solid rgba(232,143,71,0.25);">
              <span class="dot online" style="background:var(--brand);"></span>
              <span id="office-status">Live</span>
            </span>
          </div>
        </div>
        <canvas id="office-canvas" style="width:100%;height:100%;image-rendering:pixelated;cursor:default;"></canvas>
        <div id="office-tooltip" style="display:none;position:absolute;background:rgba(15,20,32,0.95);border:1px solid var(--border-bright);border-radius:8px;padding:10px 14px;font-size:12px;pointer-events:none;z-index:20;max-width:240px;backdrop-filter:blur(8px);"></div>
      </div>

      <!-- ═══ Console ═══ -->'''

if panel_marker in html:
    html = html.replace(panel_marker, pixel_panel)
    print("Panel HTML injected")
else:
    print("WARNING: Could not find console marker")

# ── 3. Add switchSection hook ──
switch_marker = "if (section === 'remy') loadRemyPanel()"
switch_insert = """if (section === 'remy') loadRemyPanel()
  if (section === 'office') startPixelOffice()"""

if switch_marker in html:
    html = html.replace(switch_marker, switch_insert)
    print("switchSection hook injected")
else:
    print("WARNING: Could not find switchSection marker")

# ── 4. Add the pixel office JS before closing </script> or </body> ──
# Find the last </script> before </body>
office_js = '''

// ── Pixel Office ─────────────────────────────────────────────────

(function() {
  const AGENTS = [
    { id: 'main',   name: 'Main (Opus)',    role: 'Orchestrator', color: '#e88f47', model: 'Claude Opus 4.6',    cost: '$$$',  desk: { x: 0.5,  y: 0.25 } },
    { id: 'sonnet', name: 'Sonnet',         role: 'Senior Eng',   color: '#3b82f6', model: 'Claude Sonnet 4.6',  cost: '$$',   desk: { x: 0.2,  y: 0.5 } },
    { id: 'build',  name: 'Build',          role: 'Engineer',     color: '#22c55e', model: 'qwen3-coder:30b',    cost: 'FREE', desk: { x: 0.5,  y: 0.5 } },
    { id: 'qa',     name: 'QA',             role: 'Quality',      color: '#a855f7', model: 'qwen3:30b',          cost: 'FREE', desk: { x: 0.8,  y: 0.5 } },
    { id: 'runner', name: 'Runner',         role: 'Tasks',        color: '#eab308', model: 'qwen3:4b',           cost: 'FREE', desk: { x: 0.35, y: 0.72 } }
  ];

  const ACTIVITIES = [
    'reading ROADMAP...', 'reviewing code...', 'delegating task...', 'checking PROGRESS...',
    'writing component...', 'fixing bug...', 'implementing feature...', 'writing migration...',
    'running tsc...', 'type checking...', 'reviewing PR...', 'testing endpoint...',
    'updating docs...', 'running grep...', 'git commit...', 'formatting files...',
    'refactoring...', 'debugging...', 'analyzing architecture...', 'code review...',
    'writing server action...', 'building page...', 'fixing types...', 'optimizing query...',
    'idle - waiting for task', 'reading codebase...', 'writing tests...', 'checking RLS...'
  ];

  // Per-role activity pools (more realistic)
  const ROLE_ACTIVITIES = {
    main:   ['reading ROADMAP...', 'delegating task...', 'reviewing Build output...', 'checking PROGRESS...', 'architecture decision...', 'assigning to Sonnet...', 'planning sprint...', 'reviewing QA report...'],
    sonnet: ['complex refactor...', 'debugging cross-file issue...', 'security review...', 'architecture analysis...', 'fixing auth logic...', 'reviewing RLS policies...', 'code review (escalated)...'],
    build:  ['writing component...', 'implementing feature...', 'fixing bug...', 'writing migration...', 'building page...', 'writing server action...', 'fixing types...', 'creating API route...'],
    qa:     ['running tsc...', 'type checking...', 'reviewing PR...', 'testing endpoint...', 'checking error handling...', 'hallucination scan...', 'regression test...', 'verifying fix...'],
    runner: ['updating docs...', 'running grep...', 'git commit...', 'formatting files...', 'linting...', 'file search...', 'updating PROGRESS.md...', 'cleaning imports...']
  };

  let officeRunning = false;
  let officeRAF = null;
  let agents = [];
  let canvas, ctx;
  let lastW = 0, lastH = 0;

  class PixelAgent {
    constructor(def) {
      Object.assign(this, def);
      this.x = def.desk.x;
      this.y = def.desk.y;
      this.targetX = this.x;
      this.targetY = this.y;
      this.activity = this.pickActivity();
      this.activityTimer = Math.random() * 300 + 100;
      this.frame = 0;
      this.atDesk = true;
      this.walkTimer = Math.random() * 600 + 200;
      this.typing = true;
      this.typingFrame = 0;
      this.particles = [];
      this.status = 'working'; // working, walking, idle
    }

    pickActivity() {
      const pool = ROLE_ACTIVITIES[this.id] || ACTIVITIES;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    update() {
      this.frame++;
      this.typingFrame++;
      this.activityTimer--;
      this.walkTimer--;

      // Change activity
      if (this.activityTimer <= 0) {
        this.activity = this.pickActivity();
        this.activityTimer = Math.random() * 400 + 150;
        // Emit particle on task switch
        this.particles.push({ x: 0, y: -8, life: 30, color: this.color });
      }

      // Occasionally walk somewhere and come back
      if (this.walkTimer <= 0 && this.atDesk) {
        this.atDesk = false;
        this.status = 'walking';
        // Walk to a random nearby spot
        this.targetX = this.desk.x + (Math.random() - 0.5) * 0.15;
        this.targetY = this.desk.y + (Math.random() - 0.5) * 0.1;
        this.targetX = Math.max(0.05, Math.min(0.95, this.targetX));
        this.targetY = Math.max(0.15, Math.min(0.85, this.targetY));
        this.walkTimer = Math.random() * 800 + 300;
        setTimeout(() => {
          this.targetX = this.desk.x;
          this.targetY = this.desk.y;
          setTimeout(() => { this.atDesk = true; this.status = 'working'; }, 2000);
        }, 1500 + Math.random() * 2000);
      }

      // Smooth movement
      const speed = 0.008;
      this.x += (this.targetX - this.x) * speed;
      this.y += (this.targetY - this.y) * speed;

      // Update particles
      this.particles = this.particles.filter(p => {
        p.y -= 0.5;
        p.life--;
        return p.life > 0;
      });
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
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height - 50); // minus header
    if (w !== lastW || h !== lastH) {
      canvas.width = w;
      canvas.height = h;
      lastW = w;
      lastH = h;
    }

    // Background - dark office floor
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    // Floor grid (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Title area
    ctx.fillStyle = 'rgba(232,143,71,0.08)';
    ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = '#e88f47';
    ctx.font = 'bold 14px Inter, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ChefFlow Engineering HQ', w / 2, 28);

    // Draw hierarchy lines (subtle)
    const mainAgent = agents[0];
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    agents.slice(1).forEach(a => {
      ctx.beginPath();
      ctx.moveTo(mainAgent.x * w, mainAgent.y * h + 20);
      ctx.lineTo(a.x * w, a.y * h - 20);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw each agent
    agents.forEach(a => {
      a.update();
      const ax = Math.round(a.x * w);
      const ay = Math.round(a.y * h);

      // Desk glow
      const glow = ctx.createRadialGradient(ax, ay + 10, 0, ax, ay + 10, 50);
      glow.addColorStop(0, a.color + '15');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(ax - 50, ay - 40, 100, 80);

      // Desk
      ctx.fillStyle = '#2a2a4a';
      ctx.fillRect(ax - 28, ay + 6, 56, 18);
      ctx.strokeStyle = a.color + '40';
      ctx.lineWidth = 1;
      ctx.strokeRect(ax - 28, ay + 6, 56, 18);

      // Monitor on desk
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(ax - 12, ay - 8, 24, 16);
      ctx.strokeStyle = a.color + '80';
      ctx.lineWidth = 1;
      ctx.strokeRect(ax - 12, ay - 8, 24, 16);

      // Screen content (typing animation)
      if (a.atDesk) {
        const lines = 3;
        for (let i = 0; i < lines; i++) {
          const lineW = 6 + Math.sin(a.typingFrame * 0.05 + i * 2) * 4;
          ctx.fillStyle = a.color + '60';
          ctx.fillRect(ax - 8, ay - 5 + i * 4, lineW, 2);
        }
        // Cursor blink
        if (Math.floor(a.frame / 20) % 2 === 0) {
          ctx.fillStyle = a.color;
          ctx.fillRect(ax - 8 + 6 + Math.sin(a.typingFrame * 0.05) * 4, ay - 5, 1, 3);
        }
      }

      // Agent body (pixel character)
      // Head
      ctx.fillStyle = a.color;
      ctx.fillRect(ax - 4, ay - 24, 8, 8);
      // Body
      ctx.fillStyle = a.color + 'cc';
      ctx.fillRect(ax - 5, ay - 16, 10, 10);
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(ax - 2, ay - 22, 2, 2);
      ctx.fillRect(ax + 1, ay - 22, 2, 2);

      // Walking animation (legs)
      if (!a.atDesk) {
        const legOff = Math.sin(a.frame * 0.15) * 2;
        ctx.fillStyle = a.color + '99';
        ctx.fillRect(ax - 3, ay - 6, 3, 6 + legOff);
        ctx.fillRect(ax + 1, ay - 6, 3, 6 - legOff);
      }

      // Status indicator dot
      const dotColor = a.atDesk ? '#22c55e' : '#eab308';
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(ax + 8, ay - 24, 3, 0, Math.PI * 2);
      ctx.fill();

      // Name label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(a.name, ax, ay + 38);

      // Role label
      ctx.fillStyle = a.color + 'aa';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(a.role, ax, ay + 50);

      // Activity label
      ctx.fillStyle = '#64748b';
      ctx.font = '9px Inter, monospace';
      const actText = a.activity.length > 28 ? a.activity.slice(0, 28) + '...' : a.activity;
      ctx.fillText(actText, ax, ay + 62);

      // Cost badge
      ctx.font = 'bold 9px Inter, monospace';
      const costColor = a.cost === 'FREE' ? '#22c55e' : a.cost === '$$' ? '#eab308' : '#ef4444';
      ctx.fillStyle = costColor + '30';
      const costW = ctx.measureText(a.cost).width + 8;
      ctx.fillRect(ax - costW / 2, ay + 66, costW, 14);
      ctx.fillStyle = costColor;
      ctx.fillText(a.cost, ax, ay + 76);

      // Particles
      a.particles.forEach(p => {
        ctx.fillStyle = p.color + Math.floor((p.life / 30) * 99).toString().padStart(2, '0');
        ctx.fillRect(ax + p.x - 1, ay + p.y - 1, 3, 3);
      });
    });

    // Bottom status bar
    const barY = h - 30;
    ctx.fillStyle = 'rgba(15,20,32,0.8)';
    ctx.fillRect(0, barY, w, 30);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath(); ctx.moveTo(0, barY); ctx.lineTo(w, barY); ctx.stroke();

    const freeCount = agents.filter(a => a.cost === 'FREE').length;
    const paidCount = agents.length - freeCount;
    ctx.font = '11px Inter, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Agents: ${agents.length}`, 16, barY + 19);
    ctx.fillStyle = '#22c55e';
    ctx.fillText(`${freeCount} FREE (Ollama)`, 100, barY + 19);
    ctx.fillStyle = '#eab308';
    ctx.fillText(`${paidCount} Paid (Anthropic)`, 230, barY + 19);

    const now = new Date();
    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748b';
    ctx.fillText(now.toLocaleTimeString(), w - 16, barY + 19);

    // Update clock in header
    const clockEl = document.getElementById('office-clock');
    if (clockEl) clockEl.textContent = now.toLocaleTimeString();
  }

  function officeLoop() {
    if (!officeRunning) return;
    drawOffice();
    officeRAF = requestAnimationFrame(officeLoop);
  }

  window.startPixelOffice = function() {
    if (officeRunning) return;
    initOffice();
    officeRunning = true;
    officeLoop();
  };

  window.stopPixelOffice = function() {
    officeRunning = false;
    if (officeRAF) cancelAnimationFrame(officeRAF);
  };

  // Tooltip on hover
  document.addEventListener('mousemove', function(e) {
    const tooltip = document.getElementById('office-tooltip');
    if (!tooltip || !canvas) return;
    const panelEl = document.getElementById('panel-office');
    if (!panelEl || panelEl.style.display === 'none' || !panelEl.classList.contains('active')) {
      // Check if panel is visible
      if (!panelEl || getComputedStyle(panelEl).display === 'none') { tooltip.style.display = 'none'; return; }
    }
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cw = rect.width;
    const ch = rect.height;

    let found = null;
    for (const a of agents) {
      const ax = a.x * cw;
      const ay = a.y * ch;
      if (Math.abs(mx - ax) < 35 && Math.abs(my - ay) < 40) {
        found = a;
        break;
      }
    }

    if (found) {
      tooltip.innerHTML = `
        <div style="font-weight:700;color:${found.color};margin-bottom:4px;">${found.name}</div>
        <div style="color:var(--text-secondary);font-size:11px;margin-bottom:6px;">${found.role} &middot; ${found.model}</div>
        <div style="color:var(--text-primary);font-size:11px;margin-bottom:4px;">${found.activity}</div>
        <div style="font-size:10px;color:${found.cost === 'FREE' ? '#22c55e' : '#eab308'};">${found.cost === 'FREE' ? 'Local (Ollama) - $0' : 'Anthropic API - ' + found.cost}</div>
      `;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 60) + 'px';
    } else {
      tooltip.style.display = 'none';
    }
  });
})();

'''

# Find the closing </script> tag of the main script block (the last one before </body>)
# Insert before the last </script>
last_script_close = html.rfind('</script>')
if last_script_close > 0:
    html = html[:last_script_close] + office_js + html[last_script_close:]
    print("Pixel office JS injected")
else:
    print("WARNING: Could not find closing script tag")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(html)

print("Done! Pixel Office panel added to Mission Control.")
