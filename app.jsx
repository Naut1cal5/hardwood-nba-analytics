const { useState, useEffect } = React;

// ── shared status components (hoisted; used by every screen) ─────────────────
function Loading({ label = 'Loading…' }) {
  return (
    <div className="content">
      <div className="card" style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="spinner" />
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.1em' }}>{label.toUpperCase()}</div>
      </div>
    </div>
  );
}
function Empty({ label = 'No data' }) {
  return (
    <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-3)' }}>{label}</div>
  );
}
function ErrorScreen({ error, onRetry }) {
  return (
    <div className="content">
      <div className="card" style={{ padding: 50, textAlign: 'center' }}>
        <div style={{ fontSize: 15, color: 'var(--bad)', marginBottom: 8 }}>Couldn’t load live NBA data</div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>{String(error && error.message || error)}</div>
        <button className="retry-btn" onClick={onRetry}>Retry</button>
      </div>
    </div>
  );
}

// ── live player search ───────────────────────────────────────────────────────
function SearchOverlay({ players, onClose, onSelect }) {
  const [q, setQ] = React.useState('');
  const inputRef = React.useRef(null);
  React.useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const results = q.trim().length < 1 ? [] :
    players.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input">
          <Icon name="search" size={15} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any NBA player…" />
          <span className="kbd">ESC</span>
        </div>
        <div className="search-results">
          {q && !results.length ? <div style={{ padding: 18, color: 'var(--text-3)', fontSize: 13 }}>No players found</div> : null}
          {results.map((p) => (
            <div key={p.id} className="search-row" style={{ cursor: 'pointer' }} onClick={() => onSelect(p.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {p.headshot ? <img src={p.headshot} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,0.05)' }} /> : null}
                <div>
                  <div style={{ color: '#fff', fontSize: 13 }}>{p.name}</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 11, fontFamily: 'JetBrains Mono' }}>{p.teamAbbr} · {p.pos}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontFamily: 'JetBrains Mono', fontSize: 12 }}>
                {[['PTS', p.ppg], ['REB', p.rpg], ['AST', p.apg], ['FG%', p.fg]].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-3)', fontSize: 9 }}>{l}</div>
                    <div style={{ color: '#fff' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!q ? <div style={{ padding: 18, color: 'var(--text-3)', fontSize: 12, fontFamily: 'JetBrains Mono' }}>Type to search the full league…</div> : null}
        </div>
      </div>
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{"material":"glass"}/*EDITMODE-END*/;

function AppInner() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [searchOpen, setSearchOpen] = useState(false);
  const ctx = useData();
  const data = ctx && ctx.data;
  const screen = ctx ? ctx.screen : 'player';
  const setScreen = ctx ? ctx.setScreen : () => {};

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Screen = { player: PlayerScreen, team: TeamScreen, leaders: LeadersScreen, live: LiveScreen }[screen];

  const player = data && data.player;
  const team = data && data.team;
  const game = data && data.game;
  const meta = (data && data.meta) || {};

  const NAV = [
    { id: 'player',  label: 'Player',         icon: 'player',  section: 'Workspace', count: player ? (player.number ? '#' + player.number : player.teamAbbr) : null },
    { id: 'team',    label: 'Team dashboard', icon: 'team',    section: 'Workspace', count: team ? team.abbr : null },
    { id: 'leaders', label: 'League leaders', icon: 'leaders', section: 'League' },
    { id: 'live',    label: 'Live game',      icon: 'live',    section: 'League', count: game ? (game.state === 'in' ? 'LIVE' : (game.state === 'post' ? 'FINAL' : null)) : null },
  ];
  const sections = [...new Set(NAV.map(n => n.section))];

  const crumbs = {
    player: ['Workspace', 'Players', player ? player.name : '…'],
    team: ['Workspace', 'Teams', team ? (team.name || team.abbr) : '…'],
    leaders: ['League', 'Leaders', meta.seasonLabel || '…'],
    live: ['League', 'Live', game ? (game.away.abbr + ' @ ' + game.home.abbr) : '…'],
  }[screen];

  const liveText = meta.liveCount > 0 ? `LIVE · ${meta.liveCount} GAME${meta.liveCount > 1 ? 'S' : ''}` : 'NO LIVE GAMES';

  return (
    <div className={t.material === 'glass' ? 'glass' : 'flat'}>
      <div className="window">
        <div className="titlebar">
          <div className="traffic">
            <div className="dot c"></div>
            <div className="dot m"></div>
            <div className="dot x"></div>
          </div>
          <div className="title-center">
            <span className="logo">H</span>
            Hardwood · NBA Analytics
          </div>
          <div className="title-right">
            {meta.liveCount > 0 ? <span className="pulse-dot"></span> : null}
            <span>{liveText}</span>
            <span style={{ color: 'var(--text-3)', margin: '0 8px' }}>·</span>
            <span>{meta.todayLabel || ''}</span>
          </div>
        </div>

        <div className="app" data-screen-label={`${screen} view`}>
          <aside className="sidebar">
            {sections.map(sec => (
              <React.Fragment key={sec}>
                <div className="side-section">{sec}</div>
                {NAV.filter(n => n.section === sec).map(n => (
                  <div key={n.id}
                       className={`side-item ${screen === n.id ? 'active' : ''}`}
                       onClick={() => setScreen(n.id)}>
                    <span className="icon"><Icon name={n.icon} size={15} /></span>
                    {n.label}
                    {n.count && <span className="count">{n.count}</span>}
                  </div>
                ))}
              </React.Fragment>
            ))}

            <div className="side-section">Data</div>
            <div className="side-item" onClick={() => ctx && ctx.reload()}>
              <span className="icon"><Icon name="sparkle" size={15}/></span>
              Refresh data
              {ctx && ctx.status === 'refreshing' ? <span className="count">…</span> : null}
            </div>
            <div className="side-item" onClick={() => setSearchOpen(true)}>
              <span className="icon"><Icon name="search" size={15}/></span>
              Search players
              <span className="count">⌘K</span>
            </div>

            <div className="side-footer">
              <div className="avatar">N</div>
              <div className="meta">
                <div className="n">Live NBA data</div>
                <div className="s">ESPN · {meta.seasonLabel || '—'}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span className="pulse-dot" style={{ background: ctx && ctx.status === 'ready' ? 'var(--good)' : 'var(--text-3)' }} />
              </div>
            </div>
          </aside>

          <main className="main">
            <div className="topbar">
              <div className="crumbs">
                {crumbs.map((c, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="sep">/</span>}
                    <span className={i === crumbs.length - 1 ? 'cur' : ''}>{c}</span>
                  </React.Fragment>
                ))}
              </div>
              <div className="search" style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => setSearchOpen(true)}>
                <Icon name="search" size={13} />
                <span>Search players…</span>
                <span className="kbd">⌘K</span>
              </div>
              {ctx && ctx.selecting
                ? <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em' }}>UPDATING…</span>
                : null}
              <div style={{ color: 'var(--text-3)' }}><Icon name="bell" size={14} /></div>
            </div>

            {ctx && ctx.status === 'error' && !data
              ? <ErrorScreen error={ctx.error} onRetry={() => ctx.reload()} />
              : <Screen />}
          </main>
        </div>
      </div>

      {searchOpen && data ? <SearchOverlay players={data.players}
        onClose={() => setSearchOpen(false)}
        onSelect={(id) => { ctx.selectPlayer(id); setSearchOpen(false); }} /> : null}

      <TweaksPanel>
        <TweakSection label="Materials" />
        <TweakRadio label="Surface" value={t.material}
          options={['glass', 'flat']}
          onChange={(v) => setTweak('material', v)} />
      </TweaksPanel>
    </div>
  );
}

function App() {
  return (
    <DataProvider>
      <AppInner />
    </DataProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
