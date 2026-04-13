async function renderQueuePanel(body) {
    const res = await fetch('/api/queue');
    const data = await res.json();
    const queue = data.queue || [];

    if (!queue.length) {
        body.innerHTML = `
            <div style="text-align:center;padding:40px 0;color:#64748b;font-size:13px">
                Queue is empty — add requests to see the linked list
            </div>`;
        return;
    }

    let html = `
        <div style="margin-bottom:16px">
            <div style="font-size:11px;color:#475569;margin-bottom:8px;letter-spacing:.06em;text-transform:uppercase">
                Linked list — ${queue.length} node${queue.length > 1 ? 's' : ''} · head → tail
            </div>
            <div style="display:flex;align-items:center;gap:0;flex-wrap:wrap;row-gap:16px">`;

    queue.forEach((req, i) => {
        const colors = {
            High: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', badge: '#fee2e2' },
            Medium: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', badge: '#fef3c7' },
            Low: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badge: '#dbeafe' }
        };
        const c = colors[req.priority] || colors.Medium;

        html += `
            <div style="display:flex;align-items:center;gap:0">
                <div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:12px 14px;min-width:130px">
                    <div style="font-size:10px;color:#475569;margin-bottom:4px;font-family:monospace">
                        node_${req.id}
                    </div>
                    <div style="font-size:13px;font-weight:500;color:${c.text};margin-bottom:6px">
                        ${req.name}
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <span style="background:${c.badge};color:${c.text};font-size:10px;padding:2px 7px;border-radius:4px;font-weight:500">
                            ${req.priority}
                        </span>
                        <span style="font-size:10px;color:#64748b">id:${req.id}</span>
                    </div>
                    <div style="margin-top:8px;padding-top:8px;border-top:0.5px solid #e2e8f0">
                        <div style="font-size:10px;color:#64748b;font-family:monospace">
                            .data = {name, priority}
                        </div>
                        <div style="font-size:10px;color:#64748b;font-family:monospace;margin-top:2px">
                            .next = ${i < queue.length - 1 ? 'node_' + (req.id + 1) : 'None'}
                        </div>
                    </div>
                </div>
                ${i < queue.length - 1 ? `
                <div style="display:flex;flex-direction:column;align-items:center;padding:0 6px">
                    <div style="font-size:10px;color:#64748b;font-family:monospace;margin-bottom:2px">.next</div>
                    <div style="color:#bfdbfe;font-size:18px;line-height:1">→</div>
                </div>` : `
                <div style="display:flex;flex-direction:column;align-items:center;padding:0 6px">
                    <div style="font-size:10px;color:#64748b;font-family:monospace;margin-bottom:2px">.next</div>
                    <div style="color:#64748b;font-size:12px;font-family:monospace">None</div>
                </div>`}
            </div>`;
    });

    html += `</div></div>`;

    // pointer info
    html += `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
            <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:12px">
                <div style="font-size:10px;color:#475569;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Head pointer</div>
                <div style="font-size:13px;font-weight:500;color:#bfdbfe;font-family:monospace">→ ${queue[0].name}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px">dequeue from here</div>
            </div>
            <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:12px">
                <div style="font-size:10px;color:#475569;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Tail pointer</div>
                <div style="font-size:13px;font-weight:500;color:#bfdbfe;font-family:monospace">→ ${queue[queue.length - 1].name}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px">enqueue here</div>
            </div>
        </div>`;

    // complexity
    html += `
        <div style="margin-top:16px;background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:12px">
            <div style="font-size:10px;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Complexity</div>
            <div style="display:flex;gap:16px;flex-wrap:wrap">
                <div style="font-size:12px;color:#0f172a"><span style="color:#bfdbfe;font-family:monospace">enqueue</span> — O(1) · attach at tail</div>
                <div style="font-size:12px;color:#0f172a"><span style="color:#bfdbfe;font-family:monospace">dequeue</span> — O(1) · remove from head</div>
                <div style="font-size:12px;color:#0f172a"><span style="color:#7c3aed;font-family:monospace">merge sort</span> — O(n log n)</div>
            </div>
        </div>`;

    body.innerHTML = html;
}