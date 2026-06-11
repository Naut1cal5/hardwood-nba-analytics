// Team dashboard — featured team is the scoring leader's team. All values come
// from live ESPN standings + aggregated player stats. No hardcoded team data.

// Aggregate four-factor style metrics for every team from the player pool, so we
// can rank the featured team against the league.
function teamAggregates(players) {
  const by = {};
  players.forEach((p) => {
    if (!p.teamAbbr) return;
    const a = by[p.teamAbbr] || (by[p.teamAbbr] = { fgm: 0, fga: 0, tpm: 0, tpa: 0, fta: 0, tov: 0, ast: 0 });
    a.fgm += p.fgm; a.fga += p.fga; a.tpm += p.tpm; a.tpa += p.tpa; a.fta += p.fta; a.tov += p.tov; a.ast += p.ast;
  });
  return Object.entries(by).map(([abbr, a]) => ({
    abbr,
    efg: a.fga ? ((a.fgm + 0.5 * a.tpm) / a.fga) * 100 : 0,
    threeRate: a.fga ? (a.tpa / a.fga) * 100 : 0,
    ftRate: a.fga ? (a.fta / a.fga) * 100 : 0,
    astTo: a.tov ? a.ast / a.tov : 0,
  }));
}

function TeamScreen() {
  const ctx = useData();
  if (!ctx || ctx.status === 'loading' || !ctx.data) return <Loading label="Loading team…" />;
  const { team, players, meta } = ctx.data;
  const aggs = teamAggregates(players);
  const rankPctOf = (metric, value) => {
    const sorted = aggs.map((a) => a[metric]).sort((a, b) => a - b);
    let below = 0; sorted.forEach((v) => { if (v <= value) below++; });
    return Math.round((below / sorted.length) * 100);
  };

  const diffNum = parseFloat(String(team.diff).replace('+', '')) || (team.ppg - team.oppg);
  const heroStats = [
    ['PPG', team.ppg],
    ['OPP PPG', team.oppg],
    ['NET', (diffNum > 0 ? '+' : '') + (Math.round(diffNum * 10) / 10)],
    ['WIN%', team.pct != null ? team.pct.toFixed(3) : '—'],
  ];

  const leadCats = [
    ['Points', 'ppg', '#0A84FF'], ['Rebounds', 'rpg', '#30D158'], ['Assists', 'apg', '#0A84FF'],
    ['Steals', 'spg', '#FF9F0A'], ['Blocks', 'bpg', '#FF9F0A'], ['3P%', 'threep', '#9cc8ff'],
  ];
  const catLeader = (key) => team.roster.slice().sort((a, b) => b[key] - a[key])[0];

  return (
    <div className="content">
      {/* Team hero */}
      <div className="card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(600px 300px at 0% 0%, ${team.color}1a, transparent 60%)` }} />
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 24, alignItems: 'center', position: 'relative' }}>
          <div style={{
            width: 108, height: 108, borderRadius: 24,
            background: `linear-gradient(135deg, ${team.color}, ${team.alt})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `inset 0 2px 0 rgba(255,255,255,0.15), 0 8px 30px ${team.color}33`
          }}>
            {team.logo
              ? <img src={team.logo} alt={team.abbr} style={{ width: 72, height: 72, objectFit: 'contain' }} />
              : <span style={{ fontFamily: 'JetBrains Mono', fontSize: 36, fontWeight: 700, color: '#fff' }}>{team.abbr}</span>}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.14em' }}>
              TEAM · {meta.seasonLabel} · {team.conf.toUpperCase()}{team.seed ? ' #' + team.seed : ''}
            </div>
            <h1 style={{ margin: '6px 0 10px', fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em' }}>{team.name || team.abbr}</h1>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {team.record ? <span className="chip">{team.record}</span> : null}
              {team.streak ? <span className="chip blue">STREAK {team.streak}</span> : null}
              {team.seed ? <span className="chip">{team.conf} #{team.seed}</span> : null}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }}>
            {heroStats.map(([l, v]) => (
              <div key={l} style={{ minWidth: 78 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>{l}</div>
                <div className="num" style={{ fontSize: 24, fontWeight: 600, color: '#fff', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Margin trend + team shooting */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-head">
            <h3>Point margin</h3>
            <span className="sub">LAST {team.marginTrend.length} GAMES</span>
          </div>
          <div style={{ padding: '0 12px 16px' }}>
            {team.marginTrend.length
              ? <LineArea data={team.marginTrend} accessor={(d) => d.pts} label="MARGIN" unit="" />
              : <Empty label="No game data" />}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Team shooting</h3><span className="sub">LEAGUE RANK</span></div>
          <div style={{ padding: '4px 20px 20px' }}>
            <HBar label="eFG%" value={team.four.efg} max={65} unit="%" rankPct={rankPctOf('efg', team.four.efg)} />
            <HBar label="3PA rate" value={team.four.threeRate} max={60} unit="%" rankPct={rankPctOf('threeRate', team.four.threeRate)} />
            <HBar label="FT rate" value={team.four.ftRate} max={35} unit="%" rankPct={rankPctOf('ftRate', team.four.ftRate)} color="#FF9F0A" />
            <HBar label="AST / TO" value={team.four.astTo} max={3} unit="" rankPct={rankPctOf('astTo', team.four.astTo)} color="#30D158" />
          </div>
        </div>
      </div>

      {/* Roster + category leaders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-head">
            <h3>Roster · leaders</h3>
            <span className="sub">SEASON</span>
          </div>
          <div style={{ padding: '0 8px 12px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.1em', fontFamily: 'Inter' }}>
                  {['PLAYER','POS','MIN','PTS','REB','AST','FG%','TS%'].map(h => (
                    <th key={h} style={{ textAlign: h === 'PLAYER' ? 'left' : 'right', padding: '10px 14px', fontWeight: 500, borderBottom: '1px solid var(--line)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ fontFamily: 'JetBrains Mono' }}>
                {team.roster.slice(0, 9).map((p, i) => (
                  <tr key={i} className="clickable-row" title={`Open ${p.name}`}
                      onClick={() => ctx.selectPlayer(p.id)}
                      style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'Inter', color: '#fff' }}>{p.name}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.pos}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.min}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#fff' }}>{p.ppg}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.rpg}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.apg}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.fg}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Category leaders</h3><span className="sub">TEAM</span></div>
          <div style={{ padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {leadCats.map(([label, key, color]) => {
              const p = catLeader(key);
              if (!p) return null;
              const max = team.roster.reduce((mx, q) => Math.max(mx, q[key]), 0) || 1;
              return (
                <div key={label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', width: 64 }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#eaeaf0' }}>{p.name}</div>
                    <div className="num" style={{ marginLeft: 'auto', color: '#fff', fontSize: 13, fontWeight: 600 }}>{p[key]}{key === 'threep' ? '%' : ''}</div>
                  </div>
                  <div style={{ marginTop: 4, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${(p[key] / max) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${color}, #9cc8ff)` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

window.TeamScreen = TeamScreen;
