// League leaders + standings — live ESPN data. The category selector actually
// re-sorts the real player pool; the conference toggle swaps real standings.

function LeadersScreen() {
  const ctx = useData();
  const [cat, setCat] = React.useState('PPG');
  const [conf, setConf] = React.useState('west');
  if (!ctx || ctx.status === 'loading' || !ctx.data) return <Loading label="Loading league…" />;
  const { standings, players, meta } = ctx.data;

  const CATS = {
    'PPG': 'ppg', 'APG': 'apg', 'RPG': 'rpg', 'SPG': 'spg', 'BPG': 'bpg', '3P%': 'threep',
  };
  const key = CATS[cat];
  const isPct = key === 'threep';
  // for 3P% require a real volume threshold so it's meaningful
  const eligible = isPct ? players.filter((p) => p.tpa >= 80) : players.filter((p) => p.gp >= 5);
  const leaders = eligible.slice().sort((a, b) => b[key] - a[key]).slice(0, 10);
  const top = leaders.length ? leaders[0][key] : 1;

  const table = standings[conf] || [];

  return (
    <div className="content">
      {/* Filter strip */}
      <div className="card" style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.14em', paddingLeft: 6 }}>LEAGUE LEADERS ·</div>
        <div className="seg">
          {Object.keys(CATS).map(k => (
            <button key={k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{k}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <span className="chip">SEASON {meta.seasonLabel}</span>
          {isPct ? <span className="chip">MIN 80 3PA</span> : null}
        </div>
      </div>

      {/* Standings + leaders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-head">
            <h3>{conf === 'west' ? 'Western' : 'Eastern'} standings</h3>
            <div style={{ marginLeft: 'auto' }} className="seg">
              <button className={conf === 'west' ? 'on' : ''} onClick={() => setConf('west')}>WEST</button>
              <button className={conf === 'east' ? 'on' : ''} onClick={() => setConf('east')}>EAST</button>
            </div>
          </div>
          <div style={{ padding: '0 8px 12px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.1em' }}>
                  {['#','TEAM','W','L','PCT','GB','L10','STRK'].map(h => (
                    <th key={h} style={{ textAlign: (h === 'TEAM' || h === '#') ? 'left' : 'right', padding: '10px 14px', fontWeight: 500, borderBottom: '1px solid var(--line)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'JetBrains Mono' }}>
                {table.map((s, i) => (
                  <tr key={s.abbr} className="clickable-row" title={`Open ${s.name} dashboard`}
                      onClick={() => ctx.selectTeam(s.id)}
                      style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer', background: i < 6 ? 'rgba(10,132,255,0.04)' : (i < 10 ? 'rgba(255,159,10,0.03)' : 'transparent') }}>
                    <td style={{ padding: '10px 14px', color: i === 0 ? 'var(--accent)' : 'var(--text-3)', fontWeight: 600 }}>{s.seed || i + 1}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'Inter', color: '#fff' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        {s.logo ? <img src={s.logo} alt={s.abbr} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                          : <span style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontFamily: 'JetBrains Mono' }}>{s.abbr}</span>}
                        {s.shortName || s.name}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#fff' }}>{s.w}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{s.l}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>{s.pct.toFixed(3)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-3)' }}>{s.gb}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>{s.last10}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: /^W/.test(s.streak) ? 'var(--good)' : (/^L/.test(s.streak) ? 'var(--bad)' : 'var(--text-2)') }}>{s.streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Top {cat === '3P%' ? 'shooters' : 'players'}</h3>
            <span className="sub">{cat}</span>
          </div>
          <div style={{ padding: '4px 14px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {leaders.map((p, i) => (
              <div key={p.id} className="clickable-row" title={`Open ${p.name}`}
                onClick={() => ctx.selectPlayer(p.id)}
                style={{
                display: 'grid', gridTemplateColumns: '26px 24px 1fr 90px 54px',
                gap: 10, alignItems: 'center', cursor: 'pointer',
                padding: '10px 8px', borderRadius: 10,
                background: i === 0 ? 'rgba(10,132,255,0.06)' : 'transparent',
              }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: i < 3 ? 'var(--accent)' : 'var(--text-3)', fontWeight: 600 }}>{(i + 1).toString().padStart(2, '0')}</div>
                <div style={{
                  width: 24, height: 24, borderRadius: 5,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontFamily: 'JetBrains Mono', fontWeight: 600,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'var(--text-2)',
                }}>{p.teamAbbr}</div>
                <div style={{ fontSize: 13, color: '#fff' }}>{p.name}</div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${(p[key] / top) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #0A84FF, #9cc8ff)' }} />
                </div>
                <div className="num" style={{ fontSize: 14, fontWeight: 600, color: '#fff', textAlign: 'right' }}>
                  {isPct ? p[key].toFixed(1) + '%' : p[key].toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.LeadersScreen = LeadersScreen;
