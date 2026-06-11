// Live game screen — real scoreboard + box score + win probability from ESPN.
// If a game is in progress it polls every 15s; otherwise it shows the most
// recent final (or the next scheduled game). No hardcoded game data.

function LiveScreen() {
  const ctx = useData();
  const initial = ctx && ctx.data ? ctx.data.game : null;
  const eventId = ctx && ctx.data ? ctx.data.gameEventId : null;
  const [game, setGame] = React.useState(initial);
  const [tab, setTab] = React.useState('home');

  React.useEffect(() => { setGame(initial); }, [eventId]);

  // poll while the game is live
  React.useEffect(() => {
    if (!game || game.state !== 'in' || !eventId) return;
    const id = setInterval(() => {
      refreshGame(eventId).then((g) => { if (g) setGame(g); }).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [game && game.state, eventId]);

  if (!ctx || ctx.status === 'loading' || !ctx.data) return <Loading label="Loading game…" />;
  if (!game) return <div className="content"><div className="card" style={{ padding: 40 }}><Empty label="No NBA games scheduled" /></div></div>;

  const lead = game.home.score - game.away.score;
  const isPre = game.state === 'pre';
  const isPost = game.state === 'post';
  const statusLabel = isPre ? 'SCHEDULED' : (isPost ? 'FINAL' : 'LIVE');
  const homeProb = game.winHome != null ? game.winHome : 0.5;

  const allBox = [...(game.boxHome || []), ...(game.boxAway || [])];
  const topPerf = allBox.slice().sort((a, b) => b.pts - a.pts).slice(0, 5);

  const quarters = Math.max(game.home.lines.length, game.away.lines.length, 4);
  const qHeads = Array.from({ length: quarters }, (_, i) => 'Q' + (i + 1)).concat('T');

  return (
    <div className="content">
      {/* Scoreboard */}
      <div className="card" style={{ padding: 26, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(600px 280px at 50% 0%, rgba(255,159,10,0.06), transparent 60%)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, position: 'relative', flexWrap: 'wrap' }}>
          <span className={`chip ${statusLabel === 'LIVE' ? 'live' : ''}`}>{statusLabel === 'LIVE' ? <span className="pulse-dot" /> : null} {statusLabel}</span>
          <span className="chip">{game.detail}</span>
          {game.spread ? <span className="chip">SPREAD {game.spread}</span> : null}
          {game.ou !== '' ? <span className="chip">O/U {game.ou}</span> : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 32, alignItems: 'center', position: 'relative' }}>
          {/* Away */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {game.away.logo ? <img src={game.away.logo} alt={game.away.abbr} style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 4 }} /> : null}
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>{game.away.record}</div>
            <div style={{ fontSize: 22, color: 'var(--text-2)', marginTop: 2 }}>{game.away.name}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 96, fontWeight: 600, lineHeight: 1, color: lead < 0 ? '#fff' : 'var(--text-2)', letterSpacing: '-0.04em', marginTop: 4 }}>{game.away.score}</div>
          </div>
          {/* Middle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: 120 }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em' }}>{isPre ? 'TIP-OFF' : 'SCORE'}</div>
            <div style={{ width: 1, height: 120, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono' }}>Q BY Q</div>
          </div>
          {/* Home */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {game.home.logo ? <img src={game.home.logo} alt={game.home.abbr} style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 4 }} /> : null}
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }}>{game.home.record}</div>
            <div style={{ fontSize: 22, color: '#fff', marginTop: 2 }}>{game.home.name}</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 96, fontWeight: 600, lineHeight: 1, color: lead > 0 ? '#fff' : 'var(--text-2)', letterSpacing: '-0.04em', marginTop: 4 }}>{game.home.score}</div>
          </div>
        </div>

        {/* Quarter scores */}
        {(game.home.lines.length || game.away.lines.length) ? (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: `auto repeat(${qHeads.length}, 1fr)`, gap: 2, fontSize: 12, fontFamily: 'JetBrains Mono' }}>
            <div></div>
            {qHeads.map((q, i) => (
              <div key={i} style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.1em', padding: '6px 0' }}>{q}</div>
            ))}
            <div style={{ color: 'var(--text-2)', padding: '8px 0' }}>{game.away.abbr}</div>
            {Array.from({ length: quarters }).map((_, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 0', color: 'var(--text-2)' }}>{game.away.lines[i] != null ? game.away.lines[i] : '—'}</div>
            ))}
            <div style={{ textAlign: 'center', padding: '8px 0', color: '#fff' }}>{game.away.score}</div>
            <div style={{ color: '#fff', padding: '8px 0' }}>{game.home.abbr}</div>
            {Array.from({ length: quarters }).map((_, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 0', color: 'var(--text-2)' }}>{game.home.lines[i] != null ? game.home.lines[i] : '—'}</div>
            ))}
            <div style={{ textAlign: 'center', padding: '8px 0', color: '#fff' }}>{game.home.score}</div>
          </div>
        ) : null}
      </div>

      {/* Win prob + top performers */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <div className="card">
          <div className="card-head">
            <h3>Win probability</h3>
            <span className="sub">{isPre ? 'PREGAME MODEL' : 'LIVE MODEL'}</span>
          </div>
          <div style={{ padding: '14px 20px 18px' }}>
            {game.winHistory && game.winHistory.length
              ? <WinProb homeProb={homeProb} history={game.winHistory} homeAbbr={game.home.abbr} awayAbbr={game.away.abbr} />
              : (game.winHome != null
                  ? <div style={{ display: 'flex', gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--text-2)' }}>
                          <span>{game.home.abbr} {Math.round(homeProb * 100)}%</span>
                          <span>{game.away.abbr} {Math.round((1 - homeProb) * 100)}%</span>
                        </div>
                        <div style={{ marginTop: 6, height: 8, borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${homeProb * 100}%`, background: '#0A84FF' }} />
                          <div style={{ width: `${(1 - homeProb) * 100}%`, background: '#3a3a42' }} />
                        </div>
                      </div>
                    </div>
                  : <Empty label="Win probability unavailable" />)}
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Top performers</h3><span className="sub">PTS</span></div>
          <div style={{ padding: '4px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            {topPerf.length ? topPerf.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 28px 28px 28px', gap: 10, alignItems: 'center' }}>
                <div style={{ color: '#fff' }}>{p.n} <span style={{ color: 'var(--text-3)' }}>{p.p}</span></div>
                <div className="mono" style={{ textAlign: 'right', color: '#fff', fontWeight: 600 }}>{p.pts}</div>
                <div className="mono" style={{ textAlign: 'right', color: 'var(--text-2)' }}>{p.reb}</div>
                <div className="mono" style={{ textAlign: 'right', color: 'var(--text-2)' }}>{p.ast}</div>
              </div>
            )) : <Empty label="Box score at tip-off" />}
            {topPerf.length ? <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 28px 28px', gap: 10, fontSize: 9, color: 'var(--text-3)', fontFamily: 'JetBrains Mono', borderTop: '1px solid var(--line)', paddingTop: 6 }}>
              <div></div><div style={{ textAlign: 'right' }}>PTS</div><div style={{ textAlign: 'right' }}>REB</div><div style={{ textAlign: 'right' }}>AST</div>
            </div> : null}
          </div>
        </div>
      </div>

      {/* Box score */}
      <div className="card">
        <div className="card-head">
          <h3>Box score</h3>
          <div style={{ marginLeft: 'auto' }} className="seg">
            <button className={tab === 'home' ? 'on' : ''} onClick={() => setTab('home')}>{game.home.abbr}</button>
            <button className={tab === 'away' ? 'on' : ''} onClick={() => setTab('away')}>{game.away.abbr}</button>
          </div>
        </div>
        {(() => {
          const box = tab === 'home' ? game.boxHome : game.boxAway;
          if (!box || !box.length) return <div style={{ padding: 24 }}><Empty label="Box score available once the game starts" /></div>;
          return (
            <div style={{ overflow: 'auto', borderTop: '1px solid var(--line)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                <thead>
                  <tr style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.1em', fontFamily: 'Inter' }}>
                    {['PLAYER','MIN','PTS','REB','AST','FG','3PT','+/−'].map(h => (
                      <th key={h} style={{ textAlign: h === 'PLAYER' ? 'left' : 'right', padding: '10px 14px', fontWeight: 500, borderBottom: '1px solid var(--line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {box.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'Inter', color: '#fff' }}>{p.n} <span style={{ color: 'var(--text-3)' }}>{p.p}</span></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.min}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#fff', fontWeight: 500 }}>{p.pts}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.reb}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.ast}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.fg}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-2)' }}>{p.t3}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: p.pm > 0 ? 'var(--good)' : (p.pm < 0 ? 'var(--bad)' : 'var(--text-3)') }}>{p.pm > 0 ? '+' : ''}{p.pm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

window.LiveScreen = LiveScreen;
