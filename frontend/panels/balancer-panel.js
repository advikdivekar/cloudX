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
                    <div style="background:#ffffff;border:3px solid #000;border-radius:0;box-shadow:4px 4px 0 ${(isOver ? '#ef4444' : '#000')};padding:18px;margin-bottom:18px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                             <div style="font-size:16px;font-weight:700;font-family:'Playfair Display',serif;color:#000">${dc}</div>
                            ${isOver ? `<span style="background:#ef4444;color:#fff;border:2px solid #000;font-family:'Space Mono',monospace;font-weight:700;font-size:10px;padding:2px 8px;border-radius:0;box-shadow:2px 2px 0 #000">OVERLOADED — +30ms penalty</span>` : ''}
                        </div>

                        <div style="display:flex;align-items:flex-end;gap:10px;margin-bottom:10px">
                            ${loads.map((load, i) => {
            const pct = Math.min(load / 10, 1);
            const maxBarH = 60;
            const barH = Math.max(4, maxBarH * pct);
            const isMin = i === minIdx;
            const barColor = pct >= 0.8 ? '#fca5a5' : pct >= 0.5 ? '#fcd34d' : '#34d399';
            const textDark = pct >= 0.8 ? '#b91c1c' : pct >= 0.5 ? '#b45309' : '#059669';

            return `
                                    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                                        <div style="font-size:14px;font-family:'Space Mono',monospace;font-weight:700;color:${isMin ? textDark : '#000'}">${load}</div>
                                        <div style="width:100%;height:${maxBarH}px;background:#fff;border:2px solid #000;border-radius:0;display:flex;align-items:flex-end;overflow:hidden;">
                                            <div style="width:100%;height:${barH}px;background:${barColor};border-top:2px solid #000;transition:height .3s"></div>
                                        </div>
                                        <div style="font-size:12px;font-family:'Space Mono',monospace;color:${isMin ? textDark : '#000'};font-weight:700">S${i + 1}</div>
                                        ${isMin ? `<div style="font-size:10px;font-family:'Space Mono',monospace;font-weight:700;color:#000;background:#fde047;border:2px solid #000;box-shadow:2px 2px 0 #000;padding:2px 6px;border-radius:0;margin-top:4px">↓ pick</div>` : ''}
                                    </div>`;
        }).join('')}
                        </div>

                        <div style="font-size:12px;color:#000;border:2px solid #000;font-family:'Space Mono',monospace;background:#fef08a;padding:8px;border-radius:0;box-shadow:2px 2px 0 #000;font-weight:700;margin-top:12px;">
                            loads = [${loads.join(', ')}] → min=${minLoad} at index ${minIdx} → assign S${minIdx + 1}
                        </div>
                    </div>`;
    }).join('')}

            <div style="background:#bfdbfe;border:3px solid #000;box-shadow:4px 4px 0 #000;border-radius:0;padding:16px;margin-top:20px;">
                <div style="font-family:'Space Mono', monospace; font-size:12px;font-weight:700;color:#000;margin-bottom:8px;text-transform:uppercase;">Greedy logic</div>
                <div style="font-size:13px;font-family:'Space Mono',monospace;color:#000;line-height:1.8;background:#fff;border:2px solid #000;padding:12px;box-shadow:2px 2px 0 #000;">
                    min_load = min(servers[dc])<br>
                    index = servers[dc].index(min_load)<br>
                    servers[dc][index] += 1<br>
                    return index
                </div>
                <div style="font-size:12px;font-family:'Space Mono',monospace;color:#000;font-weight:700;margin-top:10px">O(n) scan · always picks immediate best · no lookahead</div>
            </div>
        </div>`;
}