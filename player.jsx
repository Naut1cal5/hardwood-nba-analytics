// Player profile screen — driven entirely by live ESPN data (the current
// league scoring leader). No hardcoded player data.

// Build a representative shot sample from the player's REAL season shooting
// splits. Locations are modeled (free APIs don't expose shot coordinates), but
// the attempt mix (2P vs 3P) and the make/miss rates reflect actual season data.
function genShots(player) {
  const seed = (player.id ? parseInt(String(player.id).slice(-5)) : 7) || 7;
  let x = seed;
  const r = () => (x = (x * 9301 + 49297) % 233280, x / 233280);
  const fga = player.fga || 0, fgm = player.fgm || 0;
  const tpa = player.tpa || 0, tpm = player.tpm || 0;
  const twoA = Math.max(0, fga - tpa), twoM = Math.max(0, fgm - tpm);
  const twoPct = twoA ? twoM / twoA : 0.5;
  const tpPct = tpa ? tpm / tpa : 0.36;
  const SAMPLE = 130;
  const scale = fga ? SAMPLE / fga : 0;
  const nTwo = Math.round(twoA * scale), nThree = Math.round(tpa * scale);
  const out = [];
  const nRim = Math.round(nTwo * 0.62), nMid = nTwo - nRim;
  for (let i = 0; i < nRim; i++) {
    const a = r() * Math.PI, d = r() * 48;
    out.push({ x: 250 + Math.cos(a) * d, y: 420 - Math.sin(a) * d, made: r() < twoPct + 0.1, zone: 'rim' });
  }
  for (let i = 0; i < nMid; i++) {
    const a = r() * Math.PI, d = 90 + r() * 80;
    out.push({ x: 250 + Math.cos(a) * d, y: 420 - Math.sin(a) * d, made: r() < twoPct - 0.08, zone: 'mid' });
  }
  const corners = Math.round(nThree * 0.28);
  for (let i = 0; i < corners; i++) {
    const left = r() > 0.5;
    out.push({ x: (left ? 40 : 430) + r() * 30, y: 360 + r() * 60, made: r() < tpPct, zone: '3' });
  }
  for (let i = 0; i < nThree - corners; i++) {
    const a = 0.3 + r() * (Math.PI - 0.6), d = 238 + r() * 40;
    out.push({ x: 250 + Math.cos(a) * d, y: 420 - Math.sin(a) * d, made: r() < tpPct, zone: '3' });
  }
  return out;
}

function PlayerScreen() {
  const ctx = useData();
  const [shotFilter, setShotFilter] = React.useState('all');
  const [statMetric, setStatMetric] = React.useState('pts');
  if (!ctx || ctx.status === 'loading' || !ctx.data) return <Loading label="Loading player…" />;
  const { player, gamelog, radar, team, players } = ctx.data;
  const log = gamelog.slice(-15);
  const totalPlayers = players.length;

  const metricMap = {
    pts: { a: (d) => d.pts, l: 'PTS' },
    ast: { a: (d) => d.ast, l: 'AST' },
    reb: { a: (d) => d.reb, l: 'REB' },
    fg:  { a: (d) => d.fg,  l: 'FG%', u: '%' },
    t3:  { a: (d) => d.t3,  l: '3P%', u: '%' },
  };
  const m = metricMap[statMetric];
  const shots = genShots(player);
  const rankPct = (rank) => (rank ? Math.max(2, Math.round(100 * (1 - rank / totalPlayers))) : null);
  const round1 = (v) => Math.round(v * 10) / 10;
  const per36 = (perGame) => (player.min ? round1(perGame * 36 / player.min) : 0);
  const last9 = gamelog.slice(-9);
  const sparkOf = (sel) => (last9.length ? last9.map(sel) : [0, 0]);
  const pps = player.fga ? (player.pts / player.fga).toFixed(2) : '0';
  const threeRate = player.fga ? Math.round((player.tpa / player.fga) * 100) : 0;
  const ftRate = player.fga ? Math.round((player.fta / player.fga) * 100) : 0;
  const two = player.fga - player.tpa;
  const twoPct = two > 0 ? round1(((player.fgm - player.tpm) / two) * 100) : 0;

  return (
    <div className="content">
      {/* Hero */}
      <div className="card" style={{ padding: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(500px 300px at 100% 0%, ${team.color}22 0%, transparent 60%)`,
          pointerEvents: 'none'
        }} />
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 360px', gap: 28, alignItems: 'center', position: 'relative' }}>
          {/* Headshot / jersey */}
          <div style={{ position: 'relative', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', inset: 10, borderRadius: 16,
              background: `linear-gradient(180deg, ${team.color}2e, ${team.color}05)`,
              border: `1px solid ${team.color}30`,
            }} />
            {player.headshot ? (
              <img src={player.headshot} alt={player.name}
                   style={{ position: 'relative', height: 180, objectFit: 'contain', filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.5))' }} />
            ) : (
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: team.color, letterSpacing: '0.14em' }}>{player.teamAbbr}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 96, color: '#fff', lineHeight: 1 }}>{String(player.number || '').padStart(2, '0')}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', marginTop: 4 }}>{(player.posFull || '').toUpperCase()} · {player.height}</div>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.14em' }}>PLAYER · {ctx.data.meta.seasonLabel}</div>
            <h1 style={{ margin: '6px 0 8px', fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em' }}>{player.name}</h1>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="chip">{team.name || player.teamAbbr}</span>
              <span className="chip">{player.pos}{player.number ? ' · #' + player.number : ''}</span>
              {player.age ? <span className="chip">AGE {player.age}</span> : null}
              {player.rank.ppg === 1 ? <span className="chip blue"><Icon name="sparkle" size={11}/> Scoring leader</span> : null}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24, marginTop: 22, maxWidth: 560 }}>
              {[
                ['PPG', player.ppg, player.rank.ppg],
                ['APG', player.apg, player.rank.apg],
                ['RPG', player.rpg, player.rank.rpg],
                ['FG%', player.fg, player.rank.fg],
                ['3P%', player.threep, player.rank.threep],
              ].map(([l, v, rank], i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>{l}</div>
                  <div style={{ fontSize: 22, fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#fff', marginTop: 2 }}>{v}</div>
                  {rank ? <div style={{ fontSize: 9, color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>RANK #{rank}</div> : null}
                </div>
              ))}
            </div>
          </div>
          {/* Radar */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em', textAlign: 'center', marginBottom: -8 }}>SKILL PROFILE · LEAGUE %ILE</div>
            <Radar data={radar} size={280} />
          </div>
        </div>
      </div>

      {/* Row: line chart + advanced */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-head">
            <h3>Performance trend</h3>
            <span className="sub">LAST {log.length} GAMES</span>
            <div style={{ marginLeft: 'auto' }} className="seg">
              {['pts','ast','reb','fg','t3'].map(k => (
                <button key={k} className={statMetric === k ? 'on' : ''} onClick={() => setStatMetric(k)}>{k.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 12px 16px' }}>
            {log.length ? <LineArea data={log} accessor={m.a} label={m.l} unit={m.u || ''} />
              : <Empty label="No recent games logged" />}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Advanced</h3>
            <span className="sub">SEASON</span>
          </div>
          <div style={{ padding: '4px 20px 20px', display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'space-around' }}>
            <Donut pct={player.ts} label="TS%" />
            <Donut pct={player.efg} label="eFG%" color="#FF9F0A" />
          </div>
          <div style={{ padding: '0 20px 18px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {[['PTS/SHOT', pps], ['AST/TO', player.astTo], ['3PA RATE', threeRate + '%'], ['FT RATE', ftRate + '%']].map(([k, v]) => (
              <div key={k} style={{ borderLeft: '1px solid var(--line)', paddingLeft: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>{k}</div>
                <div className="num" style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row: shot chart + shooting splits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-head">
            <h3>Shot chart</h3>
            <span className="sub">SEASON · {player.fga} FGA · MODELED</span>
            <div style={{ marginLeft: 'auto' }} className="seg">
              {[['all','ALL'],['made','MADE'],['miss','MISS']].map(([k, l]) => (
                <button key={k} className={shotFilter === k ? 'on' : ''} onClick={() => setShotFilter(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 20px 14px' }}>
            <ShotChart shots={shots} filter={shotFilter} />
            <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-2)', fontFamily: 'JetBrains Mono', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <div><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0A84FF', marginRight: 6 }} />MADE {player.fgm}</div>
              <div><span style={{ color: 'var(--text-3)', marginRight: 6 }}>×</span>MISS {player.fga - player.fgm}</div>
              <div style={{ marginLeft: 'auto' }}>FG {player.fg}% · 2P {twoPct}% · 3P {player.threep}%</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Shooting splits</h3>
            <span className="sub">vs LEAGUE</span>
          </div>
          <div style={{ padding: '4px 20px 20px' }}>
            <HBar label="Field goal" value={player.fg} max={100} unit="%" rankPct={rankPct(player.rank.fg)} />
            <HBar label="2-point" value={twoPct} max={100} unit="%" />
            <HBar label="3-point" value={player.threep} max={100} unit="%" rankPct={rankPct(player.rank.threep)} color="#FF9F0A" />
            <HBar label="Free throw" value={player.ft} max={100} unit="%" rankPct={rankPct(player.rank.ft)} />
            <HBar label="Effective FG" value={player.efg} max={100} unit="%" />
            <HBar label="True shooting" value={player.ts} max={100} unit="%" />
            <div className="hairline" style={{ margin: '14px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[['PTS / 36', per36(player.ppg), (g)=>g.pts, '#0A84FF'],
                ['AST / 36', per36(player.apg), (g)=>g.ast, '#0A84FF'],
                ['REB / 36', per36(player.rpg), (g)=>g.reb, '#30D158']].map(([lbl, val, sel, col]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>{lbl}</div>
                  <div className="num" style={{ fontSize: 20, fontWeight: 600 }}>{val}</div>
                  <Spark data={sparkOf(sel)} w={96} h={24} color={col} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Game log */}
      <div className="card">
        <div className="card-head">
          <h3>Game log</h3>
          <span className="sub">LAST {log.length}</span>
        </div>
        <div style={{ padding: '0 8px 12px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'JetBrains Mono', fontSize: 12 }}>
            <thead>
              <tr style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.1em' }}>
                {['DATE','OPP','RES','MIN','PTS','REB','AST','FG','3PT'].map(h => (
                  <th key={h} style={{ textAlign: (h === 'DATE' || h === 'OPP' || h === 'RES') ? 'left' : 'right', padding: '10px 14px', fontWeight: 500, borderBottom: '1px solid var(--line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.slice().reverse().map((g, i) => (
                <tr key={i} style={{ color: '#eaeaf0', borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{g.d}</td>
                  <td style={{ padding: '10px 14px' }}>{g.homeAway === 'away' ? '@ ' : 'vs '}{g.opp}</td>
                  <td style={{ padding: '10px 14px' }}><span style={{ color: g.res === 'W' ? 'var(--good)' : 'var(--bad)' }}>{g.res}</span></td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{g.min}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500 }}>{g.pts}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>{g.reb}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>{g.ast}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{g.fgRaw}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{g.tpRaw}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.PlayerScreen = PlayerScreen;
