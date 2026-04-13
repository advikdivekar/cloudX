async function renderBalancerPanel(body) {
    const res = await fetch('/api/servers');
    const data = await res.json();
    const servers = data.servers || {};
    const overloaded = data.overloaded || [];

    body.innerHTML = `
        <div style="margin-bottom:14px">
            <div style="font-size:11px;color:#475569;margin-bottom:12px;text-transform:uppercase;letter-spacing:.06em">
                Server arrays — greedy picks min(loads) each time
            </div>

            ${Object.entries(servers).map(([dc, loads]) => {
        const minLoad = Math.min(...loads);
        const minIdx = loads.indexOf(minLoad);
        const isOver = overloaded.includes(dc);

        return `
                    <div style="background:#f8fafc;border:0.5px solid ${isOver ? '#fecaca' : '#e2e8f0'};border-radius:10px;padding:14px;margin-bottom:10px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                            <div style="font-size:13px;font-weight:500;color:${isOver ? '#b91c1c' : '#0f172a'}">${dc}</div>
                            ${isOver ? `<span style="background:#2d0a0a;color:#b91c1c;border:0.5px solid #fecaca;font-size:10px;padding:2px 8px;border-radius:4px">OVERLOADED — +30ms penalty</span>` : ''}
                        </div>

                        <div style="display:flex;align-items:flex-end;gap:10px;margin-bottom:10px">
                            ${loads.map((load, i) => {
            const pct = Math.min(load / 10, 1);
            const maxBarH = 60;
            const barH = Math.max(4, maxBarH * pct);
            const isMin = i === minIdx;
            const barColor = pct >= 0.8 ? '#fecaca' : pct >= 0.5 ? '#fde68a' : '#10b981';

            return `
                                    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                                        <div style="font-size:12px;font-weight:500;color:${isMin ? barColor : '#475569'}">${load}</div>
                                        <div style="width:100%;height:${maxBarH}px;background:#e2e8f0;border-radius:4px;display:flex;align-items:flex-end;overflow:hidden;border:${isMin ? '1px solid ' + barColor : 'none'}">
                                            <div style="width:100%;height:${barH}px;background:${barColor};border-radius:4px;transition:height .3s"></div>
                                        </div>
                                        <div style="font-size:11px;color:${isMin ? barColor : '#64748b'};font-weight:${isMin ? '500' : '400'}">S${i + 1}</div>
                                        ${isMin ? `<div style="font-size:9px;color:${barColor};background:${barColor}22;padding:1px 5px;border-radius:3px">← pick</div>` : ''}
                                    </div>`;
        }).join('')}
                        </div>

                        <div style="font-size:11px;color:#64748b;font-family:monospace;background:#f1f5f9;padding:8px;border-radius:6px">
                            loads = [${loads.join(', ')}] → min=${minLoad} at index ${minIdx} → assign S${minIdx + 1}
                        </div>
                    </div>`;
    }).join('')}

            <div style="background:#f8fafc;border:0.5px solid #e2e8f0;border-radius:8px;padding:12px">
                <div style="font-size:10px;color:#475569;margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em">Greedy logic</div>
                <div style="font-size:12px;font-family:monospace;color:#fbbf24;line-height:1.8">
                    min_load = min(servers[dc])<br>
                    index = servers[dc].index(min_load)<br>
                    servers[dc][index] += 1<br>
                    return index
                </div>
                <div style="font-size:11px;color:#64748b;margin-top:6px">O(n) scan · always picks immediate best · no lookahead</div>
            </div>
        </div>`;
}