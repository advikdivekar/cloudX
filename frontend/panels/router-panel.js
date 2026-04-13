async function renderRouterPanel(body) {
    const res = await fetch('/api/graph');
    const data = await res.json();
    const graph = data.graph || {};

    const dcs = Object.keys(graph);

    function dijkstraViz(source) {
        const dist = {};
        const visited = new Set();
        const steps = [];
        dcs.forEach(n => dist[n] = n === source ? 0 : Infinity);
        steps.push({ dist: { ...dist }, picked: null, note: `Init — ${source}=0, rest=∞` });

        while (true) {
            let u = null;
            dcs.forEach(n => { if (!visited.has(n) && (u === null || dist[n] < dist[u])) u = n; });
            if (!u || dist[u] === Infinity) break;
            visited.add(u);
            const relaxed = [];
            Object.entries(graph[u] || {}).forEach(([v, w]) => {
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    relaxed.push(`${v}=${dist[v]}`);
                }
            });
            steps.push({
                dist: { ...dist },
                picked: u,
                note: `Pick ${u} (dist=${dist[u]})${relaxed.length ? ' → relax: ' + relaxed.join(', ') : ' → no relaxation'}`
            });
        }
        return steps;
    }

    const source = document.getElementById('req-source')?.value || 'Mumbai';
    const steps = dijkstraViz(source);
    const finalDist = steps[steps.length - 1].dist;
    const nearest = dcs.filter(d => d !== source).reduce((a, b) => finalDist[a] <= finalDist[b] ? a : b);

    body.innerHTML = `
        <div style="margin-bottom:14px">
            <div style="font-size:11px;color:#475569;margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em">
                Graph — adjacency dict · source: ${source}
            </div>

            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
                ${dcs.map(dc => `
                    <div style="background:#f8fafc;border:0.5px solid ${dc === nearest ? '#10b981' : '#e2e8f0'};border-radius:8px;padding:10px">
                        <div style="font-size:12px;font-weight:500;color:${dc === nearest ? '#059669' : '#0f172a'};margin-bottom:6px">${dc}</div>
                        ${Object.entries(graph[dc] || {}).map(([n, w]) =>
        `<div style="font-size:11px;color:#475569;font-family:monospace">→ ${n}: <span style="color:#2563eb">${w}ms</span></div>`
    ).join('')}
                    </div>`).join('')}
            </div>

            <div style="font-size:10px;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">
                Dijkstra's steps — distance table
            </div>

            <div style="border:0.5px solid #e2e8f0;border-radius:8px;overflow:hidden">
                <div style="display:grid;grid-template-columns:2fr ${dcs.map(() => '1fr').join(' ')};background:#f1f5f9;padding:8px 12px;font-size:10px;color:#475569;text-transform:uppercase;letter-spacing:.06em;gap:8px">
                    <div>Step</div>
                    ${dcs.map(d => `<div>${d}</div>`).join('')}
                </div>
                ${steps.map((s, i) => `
                    <div style="display:grid;grid-template-columns:2fr ${dcs.map(() => '1fr').join(' ')};padding:8px 12px;font-size:11px;gap:8px;border-top:0.5px solid #f8fafc;background:${s.picked ? '#e0e7ff' : 'transparent'}">
                        <div style="color:#475569;font-family:monospace;font-size:10px">${s.note}</div>
                        ${dcs.map(d => `
                            <div style="font-family:monospace;color:${s.dist[d] === 0 ? '#059669' : s.dist[d] === Infinity ? '#64748b' : d === nearest && i === steps.length - 1 ? '#059669' : '#2563eb'}">
                                ${s.dist[d] === Infinity ? '∞' : s.dist[d]}
                            </div>`).join('')}
                    </div>`).join('')}
            </div>

            <div style="margin-top:12px;background:#e6fffa;border:0.5px solid #b2f5ea;border-radius:8px;padding:12px;display:flex;align-items:center;gap:10px">
                <div style="font-size:13px;font-weight:500;color:#0d9488">Nearest DC from ${source}</div>
                <div style="font-size:20px;font-weight:500;color:#059669">${nearest}</div>
                <div style="font-size:12px;color:#0f6e56">${finalDist[nearest]}ms</div>
            </div>
        </div>`;
}