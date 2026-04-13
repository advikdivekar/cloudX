// ─── Canvas Setup ────────────────────────────────────────
const canvas = document.getElementById('topology-canvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
    const wrap = document.getElementById('canvas-wrap');
    W = wrap.clientWidth;
    H = wrap.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resize);
resize();

// ─── State ───────────────────────────────────────────────
let particles = [];
let activeNodes = new Set();
let activePipes = new Set();
let processing = false;
let requestCount = 0;
let stepResolve = null;
let overloadedDCs = [];
let serverLoads = {
    Mumbai: [0, 0, 0],
    Delhi: [0, 0, 0],
    Bangalore: [0, 0, 0]
};
let liveLatency = {
    mumbai: '8ms',
    delhi: '20ms',
    blr: '12ms'
};

// ─── Node Definitions ────────────────────────────────────
function getNodes() {
    const cx = W / 2;
    const cy = H / 2;
    return {
        user:     { x: cx-650, y: cy-140, w: 120, h: 54, label: 'User',          sub: 'origin',             color: '#ffffff', glow: 'rgba(100,116,139,0.15)', concept: null },
        queue:    { x: cx-400, y: cy-140, w: 150, h: 54, label: 'Queue',         sub: 'Linked List · FIFO', color: '#ffffff', glow: 'rgba(59,130,246,0.3)', concept: 'queue' },
        sort:     { x: cx-400, y: cy+40,  w: 150, h: 54, label: 'Merge Sort',    sub: 'priority order',     color: '#ffffff', glow: 'rgba(167,139,250,0.3)', concept: 'sort' },
        router:   { x: cx-50,  y: cy-140, w: 160, h: 54, label: 'Router',        sub: "Graph · Dijkstra's", color: '#ffffff', glow: 'rgba(45,212,191,0.3)', concept: 'router' },
        balancer: { x: cx-50,  y: cy+40,  w: 160, h: 54, label: 'Load Balancer', sub: 'Array · Greedy',     color: '#ffffff', glow: 'rgba(245,158,11,0.3)', concept: 'balancer' },
        mumbai:   { x: cx+400, y: cy-250, w: 160, h: 90, label: 'Mumbai DC',     sub: '3 servers',          color: '#ffffff', glow: 'rgba(16,185,129,0.3)', concept: 'balancer' },
        delhi:    { x: cx+400, y: cy-90,  w: 160, h: 90, label: 'Delhi DC',      sub: '3 servers',          color: '#ffffff', glow: 'rgba(100,116,139,0.15)', concept: 'balancer' },
        blr:      { x: cx+400, y: cy+70,  w: 160, h: 90, label: 'Bangalore DC',  sub: '3 servers',          color: '#ffffff', glow: 'rgba(100,116,139,0.15)', concept: 'balancer' },
        history:  { x: cx-50,  y: cy+170, w: 160, h: 54, label: 'History',       sub: 'Stack · push/pop',   color: '#ffffff', glow: 'rgba(192,132,252,0.3)', concept: 'history' },
    };
}

// ─── Pipes ───────────────────────────────────────────────
const PIPE_DEFS = [
    { from: 'user', to: 'queue' },
    { from: 'queue', to: 'sort' },
    { from: 'sort', to: 'router' },
    { from: 'router', to: 'balancer' },
    { from: 'balancer', to: 'mumbai' },
    { from: 'balancer', to: 'delhi' },
    { from: 'balancer', to: 'blr' },
    { from: 'balancer', to: 'history' },
];

function nc(id) {
    const n = getNodes()[id];
    return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function waitForStep() { return new Promise(r => { stepResolve = r; }); }

// ─── Round Rect ──────────────────────────────────────────
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function fillRoundRect(x, y, w, h, r) {
    if (w <= 0 || h <= 0) return;
    roundRect(x, y, w, h, r);
    ctx.fill();
}

// ─── Draw Grid ───────────────────────────────────────────
function drawGrid() {
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
}

// ─── Pipe Paths ──────────────────────────────────────────
function getPipePath(from, to) {
    const a = nc(from), b = nc(to);
    const nf = getNodes()[from], nt = getNodes()[to];

    if (from === 'queue' && to === 'sort')
        return [{ x: a.x, y: a.y + 25 }, { x: a.x, y: nt.y }];
    if (from === 'sort' && to === 'router')
        return [{ x: a.x, y: a.y }, { x: nt.x, y: a.y }, { x: nt.x, y: b.y }];
    if (from === 'balancer' && to === 'history')
        return [{ x: a.x, y: a.y + 25 }, { x: a.x, y: nt.y }];
    if (from === 'balancer' && (to === 'mumbai' || to === 'delhi' || to === 'blr'))
        return [{ x: a.x, y: a.y }, { x: nt.x - 10, y: a.y }, { x: nt.x - 10, y: b.y }, { x: nt.x, y: b.y }];
    return [a, b];
}

function drawPipes() {
    PIPE_DEFS.forEach(p => {
        const key = p.from + '-' + p.to;
        const active = activePipes.has(key);
        const pts = getPipePath(p.from, p.to);
        ctx.strokeStyle = active ? '#3b82f6' : '#cbd5e1';
        ctx.lineWidth = active ? 2.5 : 1.5;
        ctx.setLineDash(active ? [] : [5, 6]);
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        
        // Build smooth bezier curves
        for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i];
            const p2 = pts[i + 1];
            // If they are on the same X or Y axis exactly, just lineTo. Otherwise, curve.
            if (p1.x === p2.x || p1.y === p2.y) {
                ctx.lineTo(p2.x, p2.y);
            } else {
                const midX = p1.x + (p2.x - p1.x)/2;
                ctx.bezierCurveTo(midX, p1.y, midX, p2.y, p2.x, p2.y);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);
    });
}

// ─── Draw Nodes ──────────────────────────────────────────
function drawNode(id) {
    const n = getNodes()[id];
    const active = activeNodes.has(id);
    const dcName = { mumbai: 'Mumbai', delhi: 'Delhi', blr: 'Bangalore' }[id];
    const overloaded = dcName && overloadedDCs.includes(dcName);

    ctx.save();
    ctx.shadowColor = n.glow; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; if(active) ctx.shadowColor = n.glow.replace('0.15','0.6').replace('0.3','0.6');
    if (overloaded) { ctx.shadowColor = 'rgba(239, 68, 68, 0.4)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6; }

    ctx.fillStyle = overloaded ? '#fef2f2' : n.color;
    ctx.strokeStyle = overloaded ? '#fca5a5' : (active ? n.glow : '#e2e8f0');
    ctx.lineWidth = (active || overloaded) ? 1.5 : 0.5;
    roundRect(n.x, n.y, n.w, n.h, 10);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // label - bigger
    ctx.textAlign = 'center';
    ctx.fillStyle = overloaded ? '#b91c1c' : (active ? '#1e3a8a' : '#1e293b');
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillText(n.label, n.x + n.w/2, n.y + 18);

    // sub - slightly bigger
    ctx.fillStyle = overloaded ? '#ef4444' : (active ? '#3b82f6' : '#64748b');
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(overloaded ? 'OVERLOADED' : n.sub, n.x + n.w/2, n.y + 34);

    // server bars for DC nodes
    if (dcName) {
        const loads = serverLoads[dcName] || [0, 0, 0];
        const totalW = n.w - 20;
        const barW = (totalW - 8) / 3;
        const startX = n.x + 10;
        const barBotY = n.y + n.h - 10;
        const maxBarH = 18;

        loads.forEach((load, i) => {
            const bx = startX + i * (barW + 4);
            const pct = Math.min(load / 10, 1);
            const barH = Math.max(2, maxBarH * pct);

            // bg track
            ctx.fillStyle = '#f1f5f9';
            fillRoundRect(bx, barBotY - maxBarH, barW, maxBarH, 3);

            // fill
            const col = pct >= 0.8 ? '#ef4444' : pct >= 0.5 ? '#f59e0b' : '#10b981';
            ctx.fillStyle = active ? col : col + '77';
            fillRoundRect(bx, barBotY - barH, barW, barH, 3);

            // load number above bar
            ctx.fillStyle = active ? '#1e3a8a' : '#64748b';
            ctx.font = '500 10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(load, bx + barW/2, barBotY - maxBarH - 4);

            // server bar S labels
            ctx.fillStyle = active ? '#3b82f6' : '#94a3b8';
            ctx.font = '500 11px Inter, sans-serif';
            ctx.fillText('S'+(i+1), bx + barW/2, barBotY + 9);
        });
    }

    // clickable dot
    if (n.concept) {
        ctx.fillStyle = active ? '#3b82f6' : '#cbd5e1';
        ctx.beginPath();
        ctx.arc(n.x + n.w - 10, n.y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ─── Latency Labels ──────────────────────────────────────
function drawLatencyLabels() {
    const pairs = [
        { from: 'balancer', to: 'mumbai', key: 'mumbai' },
        { from: 'balancer', to: 'delhi', key: 'delhi' },
        { from: 'balancer', to: 'blr', key: 'blr' },
    ];
    pairs.forEach(p => {
        const a = nc(p.from), b = nc(p.to);
        const mx = (a.x + b.x) / 2 + 16;
        const my = (a.y + b.y) / 2;
        ctx.fillStyle = activePipes.has(p.from + '-' + p.to) ? '#2563eb' : '#64748b';
        ctx.font = '500 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(liveLatency[p.key], mx, my);
    });
}

// ─── Particles ───────────────────────────────────────────
function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.shadowColor = p.color; ctx.shadowBlur = 12;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill(); // was 5
        ctx.restore();
        if (p.trail) {
            p.trail.forEach((t, i) => {
                ctx.globalAlpha = (i / p.trail.length) * 0.3;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(t.x, t.y, 3.5, 0, Math.PI*2); ctx.fill(); // was 3
                ctx.globalAlpha = 1;
            });
        }
    });
}

// ─── Draw Loop ───────────────────────────────────────────
function draw() {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);
    drawGrid();
    drawPipes();
    Object.keys(getNodes()).forEach(id => drawNode(id));
    drawLatencyLabels();
    drawParticles();
    requestAnimationFrame(draw);
}
draw();

// ─── Particle Animation ──────────────────────────────────
function animateParticle(fromId, toId, color = '#60a5fa') {
    return new Promise(resolve => {
        const pts = getPipePath(fromId, toId);
        const steps = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const n = Math.max(20, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 3));
            for (let t = 0; t < n; t++)
                steps.push({ x: a.x + (b.x - a.x) * (t / n), y: a.y + (b.y - a.y) * (t / n) });
        }
        steps.push(pts[pts.length - 1]);

        let idx = 0;
        const p = { x: steps[0].x, y: steps[0].y, color, trail: [] };
        particles.push(p);

        function tick() {
            if (idx >= steps.length) {
                particles = particles.filter(x => x !== p);
                resolve();
                return;
            }
            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > 12) p.trail.pop();
            p.x = steps[idx].x;
            p.y = steps[idx].y;
            idx += 3;
            requestAnimationFrame(tick);
        }
        tick();
    });
}

// ─── Status ──────────────────────────────────────────────
function setStatus(text, pills = []) {
    document.getElementById('status-text').textContent = text;
    document.getElementById('status-dot').className = 'active';
    document.getElementById('status-concept').innerHTML = pills
        .map(p => `<span class="concept-pill pill-${p.color}">${p.label}</span>`).join('');
}

function clearStatus() {
    document.getElementById('status-text').textContent = 'Add requests and hit Process to begin.';
    document.getElementById('status-dot').className = 'idle';
    document.getElementById('status-concept').innerHTML = '';
}

// ─── Render Strips ───────────────────────────────────────
function renderQueue(queue) {
    const el = document.getElementById('queue-chips');
    if (!queue || !queue.length) {
        el.innerHTML = '<span style="font-size:11px;color:#374151">empty</span>';
        return;
    }
    el.innerHTML = queue.map((r, i) =>
        `<div class="q-chip ${r.priority.toLowerCase()}${i === 0 ? ' active' : ''}">${r.name} · ${r.priority}</div>`
    ).join('');
}

function renderHistory(hist) {
    const el = document.getElementById('history-chips');
    if (!hist || !hist.length) {
        el.innerHTML = '<span style="font-size:11px;color:#374151">empty</span>';
        return;
    }
    el.innerHTML = hist.map(h =>
        `<div class="h-chip">${h.name} → ${h.routed_to} S${h.server_index + 1} · ${h.latency_ms}ms</div>`
    ).join('');
}

// ─── Update Latency from Graph ────────────────────────────
function updateLatency(graph, source) {
    if (!graph || !graph[source]) return;
    const src = graph[source];
    liveLatency.mumbai = source === 'Mumbai' ? '—' : (src['Mumbai'] + 'ms' || '?');
    liveLatency.delhi = source === 'Delhi' ? '—' : (src['Delhi'] + 'ms' || '?');
    liveLatency.blr = source === 'Bangalore' ? '—' : (src['Bangalore'] + 'ms' || '?');
}

// ─── Next Step ───────────────────────────────────────────
function nextStep() {
    if (stepResolve) { stepResolve(); stepResolve = null; }
}

// ─── Add Request ─────────────────────────────────────────
async function addRequest() {
    const name = document.getElementById('req-name').value.trim() || 'Request ' + (++requestCount);
    const priority = document.getElementById('req-priority').value;
    document.getElementById('req-name').value = '';

    const res = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, priority }),
    });
    const data = await res.json();
    renderQueue(data.queue);
    document.getElementById('btn-process').disabled = false;
}

// ─── Process ─────────────────────────────────────────────
async function processRequest() {
    if (processing) return;
    processing = true;
    document.getElementById('btn-process').disabled = true;
    document.getElementById('btn-add').disabled = true;
    document.getElementById('btn-step').disabled = false;
    activeNodes.clear();
    activePipes.clear();

    const source = document.getElementById('req-source')?.value || 'Mumbai';

    // Step 1 — user origin
    activeNodes.add('user');
    setStatus(`Request origin: ${source}`, [{ label: 'Origin', color: 'blue' }]);
    await waitForStep();

    // Step 2 — enqueue
    await animateParticle('user', 'queue', '#60a5fa');
    activeNodes.add('queue');
    activePipes.add('user-queue');
    setStatus('Linked List node created — enqueued at tail', [
        { label: 'Linked List', color: 'blue' },
        { label: 'Queue', color: 'blue' }
    ]);
    await waitForStep();

    // Step 3 — merge sort
    await animateParticle('queue', 'sort', '#a78bfa');
    activeNodes.add('sort');
    activePipes.add('queue-sort');
    setStatus('Merge Sort running — queue reordered by priority (High first)', [
        { label: 'Merge Sort', color: 'purple' }
    ]);
    await waitForStep();

    // Step 4 — router
    await animateParticle('sort', 'router', '#2dd4bf');
    activeNodes.add('router');
    activePipes.add('sort-router');
    setStatus('Graph loaded — latency fluctuating, Dijkstra\'s finding nearest DC...', [
        { label: 'Graph', color: 'teal' }
    ]);
    await waitForStep();

    // Step 5 — API call
    const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
    });
    const data = await res.json();

    if (data.error) {
        setStatus(data.error, []);
        processing = false;
        document.getElementById('btn-add').disabled = false;
        document.getElementById('btn-step').disabled = true;
        return;
    }

    // update live state
    if (data.server_loads) serverLoads = data.server_loads;
    if (data.overloaded_dcs) overloadedDCs = data.overloaded_dcs;
    if (data.live_graph) updateLatency(data.live_graph, source);

    setStatus(
        `Dijkstra's done — nearest DC from ${source} is ${data.routed_to} (${data.latency_ms}ms)`,
        [{ label: "Dijkstra's", color: 'teal' }]
    );
    activePipes.add('router-balancer');
    await waitForStep();

    // Step 6 — balancer
    await animateParticle('router', 'balancer', '#f59e0b');
    activeNodes.add('balancer');
    setStatus(
        `Greedy scans ${data.routed_to} array — Server ${data.server_index + 1} has minimum load`,
        [{ label: 'Array', color: 'amber' }, { label: 'Greedy', color: 'amber' }]
    );
    await waitForStep();

    // Step 7 — DC node
    const dcMap = { Mumbai: 'mumbai', Delhi: 'delhi', Bangalore: 'blr' };
    const dcId = dcMap[data.routed_to];
    await animateParticle('balancer', dcId, '#10b981');
    activeNodes.add(dcId);
    activePipes.add('balancer-' + dcId);
    setStatus(
        `Assigned to ${data.routed_to} · Server ${data.server_index + 1} — load incremented`,
        [{ label: 'Assigned', color: 'green' }]
    );
    await waitForStep();

    // Step 8 — history stack
    await animateParticle('balancer', 'history', '#c084fc');
    activeNodes.add('history');
    activePipes.add('balancer-history');
    setStatus(
        `Stack.push() — "${data.request.name}" logged (${data.routed_to} S${data.server_index + 1} · ${data.latency_ms}ms)`,
        [{ label: 'Stack', color: 'purple' }]
    );

    renderQueue(data.sorted_queue);
    renderHistory(data.history);
    await waitForStep();

    // cleanup
    activeNodes.clear();
    activePipes.clear();
    clearStatus();
    processing = false;
    document.getElementById('btn-add').disabled = false;
    document.getElementById('btn-step').disabled = true;
    document.getElementById('btn-process').disabled = !data.sorted_queue.length;
}

// ─── Reset ───────────────────────────────────────────────
async function resetAll() {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (data.servers) serverLoads = data.servers;
    overloadedDCs = [];
    liveLatency = { mumbai: '8ms', delhi: '20ms', blr: '12ms' };
    particles = [];
    activeNodes.clear();
    activePipes.clear();
    renderQueue([]);
    renderHistory([]);
    clearStatus();
    processing = false;
    stepResolve = null;
    document.getElementById('btn-process').disabled = true;
    document.getElementById('btn-step').disabled = true;
}

// ─── Node Click → Modal ──────────────────────────────────
canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const nodes = getNodes();
    for (const [id, n] of Object.entries(nodes)) {
        if (mx >= n.x && mx <= n.x + n.w && my >= n.y && my <= n.y + n.h) {
            if (n.concept) openModal(n.concept, id);
            break;
        }
    }
});

async function openModal(concept, nodeId) {
    const n = getNodes()[nodeId];
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = n.label;
    document.getElementById('modal-subtitle').textContent = n.sub;
    const body = document.getElementById('modal-body');
    body.innerHTML = '<div style="color:#4b5563;font-size:13px;padding:20px 0">Loading...</div>';
    overlay.classList.add('open');
    switch (concept) {
        case 'queue': await renderQueuePanel(body); break;
        case 'sort': await renderSortPanel(body); break;
        case 'router': await renderRouterPanel(body); break;
        case 'balancer': await renderBalancerPanel(body); break;
        case 'history': await renderHistoryPanel(body); break;
    }
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── Load Initial Server State ───────────────────────────
fetch('/api/servers')
    .then(r => r.json())
    .then(d => { if (d.servers) serverLoads = d.servers; });

