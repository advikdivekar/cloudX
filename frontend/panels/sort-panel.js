async function renderSortPanel(body) {
    const res = await fetch('/api/queue');
    const data = await res.json();
    const queue = data.queue || [];

    const order = { High: 0, Medium: 1, Low: 2 };
    const sorted = [...queue].sort((a, b) => order[a.priority] - order[b.priority]);

    const colors = {
        High: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
        Medium: { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
        Low: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
    };

    function renderRow(arr, label, labelColor) {
        if (!arr.length) return `<div style="font-size:12px;color:#64748b;padding:8px 0">empty</div>`;
        return `
            <div style="margin-bottom:12px">
                <div style="font-size:10px;color:${labelColor};margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">${label}</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                    ${arr.map(r => {
            const c = colors[r.priority];
            return `<div style="background:${c.bg};border:0.5px solid ${c.border};border-radius:6px;padding:6px 10px;font-size:12px;color:${c.text};font-weight:500">${r.name}<span style="font-size:10px;opacity:.6;margin-left:4px">${r.priority[0]}</span></div>`;
        }).join('')}
                </div>
            </div>`;
    }

    // simulate split
    const mid = Math.floor(queue.length / 2);
    const left = queue.slice(0, mid);
    const right = queue.slice(mid);
    const sortedLeft = [...left].sort((a, b) => order[a.priority] - order[b.priority]);
    const sortedRight = [...right].sort((a, b) => order[a.priority] - order[b.priority]);

    body.innerHTML = `
        <div style="margin-bottom:16px">
            <div style="font-size:11px;color:#475569;margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em">
                Merge sort — O(n log n) · sorts by priority before dequeue
            </div>

            ${renderRow(queue, 'Unsorted input', '#475569')}

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0">
                <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:10px">
                    <div style="font-size:10px;color:#7c3aed;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Left half — split</div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                        ${left.map(r => {
        const c = colors[r.priority];
        return `<div style="background:${c.bg};border:0.5px solid ${c.border};border-radius:4px;padding:4px 8px;font-size:11px;color:${c.text}">${r.name}</div>`;
    }).join('') || '<span style="font-size:11px;color:#64748b">—</span>'}
                    </div>
                    <div style="margin-top:6px;font-size:10px;color:#64748b">↓ sorted</div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
                        ${sortedLeft.map(r => {
        const c = colors[r.priority];
        return `<div style="background:${c.bg};border:0.5px solid ${c.border};border-radius:4px;padding:4px 8px;font-size:11px;color:${c.text}">${r.name}</div>`;
    }).join('') || '<span style="font-size:11px;color:#64748b">—</span>'}
                    </div>
                </div>
                <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:10px">
                    <div style="font-size:10px;color:#7c3aed;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Right half — split</div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                        ${right.map(r => {
        const c = colors[r.priority];
        return `<div style="background:${c.bg};border:0.5px solid ${c.border};border-radius:4px;padding:4px 8px;font-size:11px;color:${c.text}">${r.name}</div>`;
    }).join('') || '<span style="font-size:11px;color:#64748b">—</span>'}
                    </div>
                    <div style="margin-top:6px;font-size:10px;color:#64748b">↓ sorted</div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
                        ${sortedRight.map(r => {
        const c = colors[r.priority];
        return `<div style="background:${c.bg};border:0.5px solid ${c.border};border-radius:4px;padding:4px 8px;font-size:11px;color:${c.text}">${r.name}</div>`;
    }).join('') || '<span style="font-size:11px;color:#64748b">—</span>'}
                    </div>
                </div>
            </div>

            <div style="font-size:10px;color:#64748b;text-align:center;margin:8px 0">↓ merge — compare priorities, pick lower number first</div>

            ${renderRow(sorted, 'Merged output — final order', '#7c3aed')}
        </div>

        <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:12px">
            <div style="font-size:10px;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Priority order used</div>
            <div style="display:flex;gap:12px">
                <div style="font-size:12px;font-family:monospace;color:#b91c1c">High = 0</div>
                <div style="font-size:12px;font-family:monospace;color:#b45309">Medium = 1</div>
                <div style="font-size:12px;font-family:monospace;color:#1d4ed8">Low = 2</div>
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:6px">Lower number = higher priority = moves to front of queue</div>
        </div>`;
}