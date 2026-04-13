async function renderHistoryPanel(body) {
    const res = await fetch('/api/history');
    const data = await res.json();
    const stack = data.history || [];

    if (!stack.length) {
        body.innerHTML = `
            <div style="text-align:center;padding:40px 0;color:#64748b;font-size:13px">
                Stack is empty — process requests to see history
            </div>`;
        return;
    }

    const dcColors = {
        Mumbai: { border: '#10b981', bg: '#e6fffa', text: '#059669' },
        Delhi: { border: '#bfdbfe', bg: '#0f2352', text: '#2563eb' },
        Bangalore: { border: '#7c3aed', bg: '#1a0a3d', text: '#7e22ce' },
    };

    body.innerHTML = `
        <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <div style="font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.06em">
                    Stack — ${stack.length} entr${stack.length === 1 ? 'y' : 'ies'} · top = most recent
                </div>
                <div style="font-size:11px;font-family:monospace;color:#64748b">push O(1) · pop O(1)</div>
            </div>

            ${stack.map((entry, i) => {
        const dc = dcColors[entry.routed_to] || dcColors.Bangalore;
        const isTop = i === 0;

        return `
                    <div style="display:flex;gap:10px;align-items:stretch;margin-bottom:6px">
                        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;padding-top:4px">
                            <div style="font-size:9px;color:${isTop ? '#7e22ce' : '#64748b'};font-family:monospace">${isTop ? 'TOP' : ''}</div>
                            <div style="width:1px;flex:1;background:${isTop ? '#6b21a8' : '#e2e8f0'}"></div>
                        </div>
                        <div style="flex:1;background:#f8fafc;border:0.5px solid ${isTop ? dc.border : '#e2e8f0'};border-radius:8px;padding:10px 12px">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                                <div style="font-size:13px;font-weight:500;color:${isTop ? '#e2e8f0' : '#0f172a'}">${entry.name}</div>
                                <div style="font-size:10px;color:#64748b;font-family:monospace">${entry.timestamp}</div>
                            </div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap">
                                <span style="background:${dc.bg};color:${dc.text};border:0.5px solid ${dc.border};font-size:10px;padding:2px 8px;border-radius:4px">${entry.routed_to}</span>
                                <span style="background:#1c0a03;color:#fbbf24;border:0.5px solid #fef3c7;font-size:10px;padding:2px 8px;border-radius:4px">Server ${entry.server_index + 1}</span>
                                <span style="background:#eff6ff;color:#1d4ed8;border:0.5px solid #dbeafe;font-size:10px;padding:2px 8px;border-radius:4px">${entry.priority}</span>
                                ${entry.latency_ms ? `<span style="background:#e6fffa;color:#0d9488;border:0.5px solid #b2f5ea;font-size:10px;padding:2px 8px;border-radius:4px">${entry.latency_ms}ms</span>` : ''}
                            </div>
                        </div>
                    </div>`;
    }).join('')}
        </div>

        <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:12px">
            <div style="font-size:10px;color:#475569;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Stack operations</div>
            <div style="font-size:12px;font-family:monospace;color:#7e22ce;line-height:1.8">
                push(entry) → stack.append(entry)<br>
                pop()       → stack.pop()<br>
                peek()      → stack[-1]<br>
                get_all()   → stack[::-1]
            </div>
        </div>`;
}