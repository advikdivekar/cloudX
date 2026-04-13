// ─── Canvas Setup ────────────────────────────────────────
const canvas = document.getElementById('topology-canvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
    const wrap = document.getElementById('canvas-wrap');
    W = canvas.width = wrap.clientWidth;
    H = canvas.height = wrap.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// ─── State ───────────────────────────────────────────────
let particles = [];
let activeNodes = new Set();
let activePipes = new Set();
let processing = false;
let requestCount = 0;
let currentStep = 0;
let stepResolve = null;
let liveLatency = { mumbai: '8ms', delhi: '20ms', blr: '12ms' };
let overloadedDCs = [];
let lastData = null;

// ─── Node Definitions ────────────────────────────────────
function getNodes() {
    const cx = W / 2;
    const cy = H / 2;
    return {
        user: { x: cx - 360, y: cy - 30, w: 110, h: 50, label: 'User', sub: 'origin', color: '#111827', glow: '#64748b', concept: null },
        queue: { x: cx - 210, y: cy - 30, w: 130, h: 50, label: 'Queue', sub: 'Linked List · FIFO', color: '#0f2352', glow: '#3b82f6', concept: 'queue' },
        sort: { x: cx - 210, y: cy + 90, w: 130, h: 50, label: 'Merge Sort', sub: 'priority order', color: '#1a0a3d', glow: '#a78bfa', concept: 'sort' },
        router: { x: cx - 40, y: cy - 30, w: 140, h: 50, label: 'Router', sub: "Graph · Dijkstra's", color: '#042f2e', glow: '#2dd4bf', concept: 'router' },
        balancer: { x: cx - 40, y: cy + 90, w: 140, h: 50, label: 'Load Balancer', sub: 'Array · Greedy', color: '#1c0a03', glow: '#f59e0b', concept: 'balancer' },
        mumbai: { x: cx + 160, y: cy - 100, w: 130, h: 50, label: 'Mumbai DC', sub: '3 servers', color: '#064e3b', glow: '#10b981', concept: 'balancer' },
        delhi: { x: cx + 160, y: cy - 30, w: 130, h: 50, label: 'Delhi DC', sub: '3 servers', color: '#111827', glow: '#64748b', concept: 'balancer' },
        blr: { x: cx + 160, y: cy + 60, w: 130, h: 50, label: 'Bangalore DC', sub: '3 servers', color: '#111827', glow: '#64748b', concept: 'balancer' },
        history: { x: cx - 40, y: cy + 200, w: 140, h: 50, label: 'History', sub: 'Stack · push/pop', color: '#1a0a3d', glow: '#c084fc', concept: 'history' },
    };
}

// ─── Pipe Definitions ────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────
function nc(id) {
    const n = getNodes()[id];
    return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function waitForStep() {
    return new Promise(resolve => { stepResolve = resolve; });
}

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

// ─── Draw Grid ───────────────────────────────────────────
function drawGrid() {
    ctx.strokeStyle = '#0d1424';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
}

// ─── Pipe Paths ──────────────────────────────────────────
function getPipePath(from, to) {
    const nodes = getNodes();
    const a = nc(from), b = nc(to);
    const nf = nodes[from], nt = nodes[to];

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
        ctx.strokeStyle = active ? '#3b82f6' : '#1e293b';
        ctx.lineWidth = active ? 2 : 0.8;
        ctx.setLineDash(active ? [] : [4, 5]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
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
    if (active) { ctx.shadowColor = n.glow; ctx.shadowBlur = 24; }
    if (overloaded) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 16; }

    ctx.fillStyle = overloaded ? '#2d0a0a' : n.color;
    ctx.strokeStyle = overloaded ? '#ef4444' : (active ? n.glow : '#1e293b');
    ctx.lineWidth = (active || overloaded) ? 1.5 : 0.5;
    roundRect(n.x, n.y, n.w, n.h, 10);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = overloaded ? '#fca5a5' : (active ? n.glow : '#94a3b8');
    ctx.font = '500 13px SF Pro Display, Inter, sans-serif';
    ctx.fillText(n.label, n.x + n.w / 2, n.y + 18);

    let subText = n.sub;
    if (overloaded) subText = 'OVERLOADED';
    ctx.fillStyle = overloaded ? '#ef4444' : (active ? n.glow + 'bb' : '#374151');
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(subText, n.x + n.w / 2, n.y + 34);

    if (n.concept) {
        ctx.fillStyle = active ? n.glow : '#2d3748';
        ctx.beginPath();
        ctx.arc(n.x + n.w - 10, n.y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ─── Draw Dynamic Latency Labels ─────────────────────────
function drawLatencyLabels() {
    const labels = [
        { from: 'balancer', to: 'mumbai', key: 'mumbai' },
        { from: 'balancer', to: 'delhi', key: 'delhi' },
        { from: 'balancer', to: 'blr', key: 'blr' },
    ];
    labels.forEach(p => {
        const a = nc(p.from), b = nc(p.to);
        const mx = (a.x + b.x) / 2 + 14;
        const my = (a.y + b.y) / 2;
        ctx.fillStyle = '#4b5563';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(liveLatency[p.key], mx, my);
    });
}

// ─── Draw Particles ──────────────────────────────────────
function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.shadowColor = p.color; ctx.shadowBlur = 16;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (p.trail) {
            p.trail.forEach((t, i) => {
                ctx.globalAlpha = (i / p.trail.length) * 0.3;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            });
        }
    });
}

// ─── Main Draw Loop ──────────────────────────────────────
function draw() {
    ctx.fillStyle = '#080c18';
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
            if (idx >= steps.length) { particles = particles.filter(x => x !== p); resolve(); return; }
            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > 12) p.trail.pop();
            p.x = steps[idx].x; p.y = steps[idx].y; idx += 3;
            requestAnimationFrame(tick);
        }
        tick();
    });
}

// ─── Status Bar ──────────────────────────────────────────
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
    if (!queue.length) { el.innerHTML = '<span style="font-size:11px;color:#374151">empty</span>'; return; }
    el.innerHTML = queue.map((r, i) =>
        `<div class="q-chip ${r.priority.toLowerCase()}${i === 0 ? ' active' : ''}">${r.name} · ${r.priority}</div>`
    ).join('');
}

function renderHistory(hist) {
    const el = document.getElementById('history-chips');
    if (!hist.length) { el.innerHTML = '<span style="font-size:11px;color:#374151">empty</span>'; return; }
    el.innerHTML = hist.map(h =>
        `<div class="h-chip">${h.name} → ${h.routed_to} S${h.server_index + 1}</div>`
    ).join('');
}

// ─── Update Latency Labels from API ──────────────────────
function updateLatencyFromGraph(graph) {
    if (!graph) return;
    const src = document.getElementById('req-source')?.value || 'Mumbai';
    if (graph[src]) {
        liveLatency.mumbai = graph[src]['Mumbai'] !== undefined ? graph[src]['Mumbai'] + 'ms' : '—';
        liveLatency.delhi = graph[src]['Delhi'] !== undefined ? graph[src]['Delhi'] + 'ms' : '—';
        liveLatency.blr = graph[src]['Bangalore'] !== undefined ? graph[src]['Bangalore'] + 'ms' : '—';
        if (src === 'Mumbai') liveLatency.mumbai = '0ms';
        if (src === 'Delhi') liveLatency.delhi = '0ms';
        if (src === 'Bangalore') liveLatency.blr = '0ms';
    }
}

// ─── Step Button ─────────────────────────────────────────
function nextStep() {
    if (stepResolve) { stepResolve(); stepResolve = null; }
}

// ─── Add Request ─────────────────────────────────────────
async function addRequest() {
    const name = document.getElementById('req-name').value.trim() || 'Request ' + (++requestCount);
    const priority = document.getElementById('req-priority').value;
    document.getElementById('req-name').value = '';
    const res = await fetch('/api/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, priority }),
    });
    const data = await res.json();
    renderQueue(data.queue);
    document.getElementById('btn-process').disabled = false;
}

// ─── Process Request ─────────────────────────────────────
async function processRequest() {
    if (processing) return;
    processing = true;
    document.getElementById('btn-process').disabled = true;
    document.getElementById('btn-add').disabled = true;
    document.getElementById('btn-step').disabled = false;
    activeNodes.clear(); activePipes.clear();

    const source = document.getElementById('req-source')?.value || 'Mumbai';

    // Step 1 — user
    activeNodes.add('user');
    setStatus(`Request origin: ${source}`, [{ label: 'Origin', color: 'blue' }]);
    await waitForStep();

    // Step 2 — queue
    await animateParticle('user', 'queue', '#60a5fa');
    activeNodes.add('queue'); activePipes.add('user-queue');
    setStatus('Node created — enqueued at tail of linked list', [{ label: 'Queue', color: 'blue' }, { label: 'Linked List', color: 'blue' }]);
    await waitForStep();

    // Step 3 — sort
    await animateParticle('queue', 'sort', '#a78bfa');
    activeNodes.add('sort'); activePipes.add('queue-sort');
    setStatus('Merge Sort applied — queue reordered by priority', [{ label: 'Merge Sort', color: 'purple' }]);
    await waitForStep();

    // Step 4 — router
    await animateParticle('sort', 'router', '#2dd4bf');
    activeNodes.add('router'); activePipes.add('sort-router');
    setStatus('Graph loaded — latency fluctuating, Dijkstra\'s calculating...', [{ label: 'Graph', color: 'teal' }]);
    await waitForStep();

    // Step 5 — call API
    const res = await fetch('/api/process', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
    });
    const data = await res.json();
    lastData = data;

    if (data.error) {
        clearStatus(); processing = false;
        document.getElementById('btn-add').disabled = false;
        document.getElementById('btn-step').disabled = true;
        return;
    }

    overloadedDCs = data.overloaded_dcs || [];
    updateLatencyFromGraph(data.live_graph);

    setStatus(`Dijkstra's complete — nearest DC from ${source} is ${data.routed_to}`, [{ label: "Dijkstra's", color: 'teal' }]);
    activePipes.add('router-balancer');
    await waitForStep();

    // Step 6 — balancer
    await animateParticle('router', 'balancer', '#f59e0b');
    activeNodes.add('balancer');
    setStatus(`Greedy picks Server ${data.server_index + 1} in ${data.routed_to} — least loaded`, [{ label: 'Array', color: 'amber' }, { label: 'Greedy', color: 'amber' }]);
    await waitForStep();

    // Step 7 — DC
    const dcMap = { Mumbai: 'mumbai', Delhi: 'delhi', Bangalore: 'blr' };
    const dcId = dcMap[data.routed_to];
    await animateParticle('balancer', dcId, '#10b981');
    activeNodes.add(dcId); activePipes.add('balancer-' + dcId);
    setStatus(`Assigned to ${data.routed_to} · Server ${data.server_index + 1} — load updated`, [{ label: 'Assigned', color: 'green' }]);
    await waitForStep();

    // Step 8 — history
    await animateParticle('balancer', 'history', '#c084fc');
    activeNodes.add('history'); activePipes.add('balancer-history');
    setStatus(`Stack.push() — "${data.request.name}" logged to history`, [{ label: 'Stack', color: 'purple' }]);

    renderQueue(data.sorted_queue);
    renderHistory(data.history);
    await waitForStep();

    activeNodes.clear(); activePipes.clear();
    clearStatus();
    processing = false;
    document.getElementById('btn-add').disabled = false;
    document.getElementById('btn-step').disabled = true;
    document.getElementById('btn-process').disabled = data.sorted_queue.length === 0;
}

// ─── Reset ───────────────────────────────────────────────
async function resetAll() {
    await fetch('/api/reset', { method: 'POST' });
    activeNodes.clear(); activePipes.clear();
    particles = []; overloadedDCs = [];
    liveLatency = { mumbai: '8ms', delhi: '20ms', blr: '12ms' };
    renderQueue([]); renderHistory([]);
    clearStatus();
    document.getElementById('btn-process').disabled = true;
    document.getElementById('btn-step').disabled = true;
    processing = false; stepResolve = null;
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