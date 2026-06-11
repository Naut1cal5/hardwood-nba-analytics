// ─────────────────────────────────────────────────────────────────────────────
// Real NBA data layer.
//
// Every number in this app is fetched live from ESPN's free, public, key-less,
// CORS-enabled JSON API. There is NO hardcoded sports data anywhere — players,
// teams, standings, leaders, game logs, live scores, box scores and win
// probability are all pulled at runtime and mapped into the shapes the UI needs.
// ─────────────────────────────────────────────────────────────────────────────

const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const ESPN_V2   = 'https://site.api.espn.com/apis/v2/sports/basketball/nba';
const ESPN_WEB  = 'https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba';

// ── tiny fetch cache (avoids hammering the API on re-render) ──────────────────
const _cache = new Map();
async function fetchJson(url, ttl = 60000, retries = 2) {
  const hit = _cache.get(url);
  const now = Date.now();
  if (hit && now - hit.t < ttl) return hit.v;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + url);
      const v = await res.json();
      _cache.set(url, { t: Date.now(), v });
      return v;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const round = (v, d = 1) => (v == null || isNaN(v) ? 0 : +(+v).toFixed(d));
const pad2 = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso) {
  const d = new Date(iso);
  return MONTHS[d.getMonth()] + ' ' + pad2(d.getDate());
}
function ordinal(n) {
  if (n == null) return '—';
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function percentile(value, sorted) {
  // share of the population at or below `value`
  if (!sorted.length) return 50;
  let below = 0;
  for (const v of sorted) if (v <= value) below++;
  return Math.round((below / sorted.length) * 100);
}

// ── parse the byathlete statistics endpoint into flat player rows ────────────
function parseByAthlete(payloads) {
  // payloads = array of one-or-more pages of the byathlete response
  const out = [];
  const seen = new Set();
  for (const d of payloads) {
    const nameIdx = {};
    (d.categories || []).forEach((c) => { nameIdx[c.name] = c.names || []; });
    for (const row of d.athletes || []) {
      const a = row.athlete || {};
      if (!a.id || seen.has(a.id)) continue;
      seen.add(a.id);
      const stat = {}, rank = {};
      (row.categories || []).forEach((c) => {
        const names = nameIdx[c.name] || [];
        names.forEach((n, i) => {
          if (c.values) stat[n] = c.values[i];
          if (c.ranks) rank[n] = c.ranks[i];
        });
      });
      const team = (Array.isArray(a.teams) ? a.teams[a.teams.length - 1] : a.team) || {};
      const fga = stat.fieldGoalsAttempted || 0;
      const fta = stat.freeThrowsAttempted || 0;
      const fgm = stat.fieldGoalsMade || 0;
      const tpm = stat.threePointFieldGoalsMade || 0;
      const pts = stat.points || 0;
      const tov = stat.turnovers || 0;
      const ast = stat.assists || 0;
      const ts = (fga + 0.44 * fta) > 0 ? (pts / (2 * (fga + 0.44 * fta))) * 100 : 0;
      const efg = fga > 0 ? ((fgm + 0.5 * tpm) / fga) * 100 : 0;
      out.push({
        id: a.id,
        name: a.displayName,
        short: a.shortName,
        teamAbbr: team.abbreviation || '',
        pos: (a.position && a.position.abbreviation) || '',
        headshot: (a.headshot && a.headshot.href) || null,
        gp: stat.gamesPlayed || 0,
        min: round(stat.avgMinutes),
        ppg: round(stat.avgPoints),
        rpg: round(stat.avgRebounds),
        apg: round(stat.avgAssists),
        spg: round(stat.avgSteals),
        bpg: round(stat.avgBlocks),
        topg: round(stat.avgTurnovers),
        fg: round(stat.fieldGoalPct),
        threep: round(stat.threePointFieldGoalPct),
        ft: round(stat.freeThrowPct),
        ts: round(ts), efg: round(efg),
        fgm, fga, tpm,
        tpa: stat.threePointFieldGoalsAttempted || 0,
        ftm: stat.freeThrowsMade || 0, fta,
        pts, ast, tov,
        astTo: tov > 0 ? round(ast / tov) : ast,
        rank: {
          ppg: rank.avgPoints, rpg: rank.avgRebounds, apg: rank.avgAssists,
          fg: rank.fieldGoalPct, threep: rank.threePointFieldGoalPct, ft: rank.freeThrowPct,
        },
      });
    }
  }
  return out;
}

// ── standings → conference arrays ────────────────────────────────────────────
function statVal(entry, type) {
  const s = (entry.stats || []).find((x) => x.type === type || x.name === type);
  return s ? (s.value != null ? s.value : s.displayValue) : null;
}
function parseStandings(d, teamsById) {
  const conf = {};
  for (const child of d.children || []) {
    const key = /east/i.test(child.name) ? 'east' : 'west';
    const entries = (child.standings && child.standings.entries) || [];
    conf[key] = entries.map((e) => {
      const id = e.team.id;
      const wins = +statVal(e, 'wins') || 0;
      const losses = +statVal(e, 'losses') || 0;
      const streakDisp = (e.stats.find((x) => x.type === 'streak') || {}).displayValue || '';
      const last10 = (e.stats.find((x) => x.name === 'Last Ten Games' || x.type === 'lasttengames') || {}).displayValue || '';
      return {
        id,
        abbr: e.team.abbreviation,
        name: e.team.displayName,
        shortName: e.team.shortDisplayName || e.team.name,
        logo: (teamsById[id] && teamsById[id].logo) || null,
        color: (teamsById[id] && teamsById[id].color) || null,
        w: wins, l: losses,
        pct: round(statVal(e, 'winpercent') || (wins + losses ? wins / (wins + losses) : 0), 3),
        gb: (e.stats.find((x) => x.type === 'gamesbehind') || {}).displayValue || '-',
        seed: +statVal(e, 'playoffseed') || null,
        streak: streakDisp,
        last10,
        diff: (e.stats.find((x) => x.type === 'differential') || {}).displayValue || '',
        ppg: round(statVal(e, 'avgpointsfor')),
        oppg: round(statVal(e, 'avgpointsagainst')),
      };
    }).sort((a, b) => (a.seed || 99) - (b.seed || 99));
  }
  return conf;
}

// ── game log for a player ────────────────────────────────────────────────────
function parseGameLog(d) {
  const events = d.events || {};
  const names = d.names || [];
  const idx = (n) => names.indexOf(n);
  const iMin = idx('minutes'), iReb = idx('totalRebounds'), iAst = idx('assists'),
        iPts = idx('points'), iFgPct = idx('fieldGoalPct'), iTpPct = idx('threePointPct'),
        iFg = idx('fieldGoalsMade-fieldGoalsAttempted'), iTp = idx('threePointFieldGoalsMade-threePointFieldGoalsAttempted');
  // pick the season type with the most logged games (regular season)
  let best = null, bestN = -1;
  for (const st of d.seasonTypes || []) {
    const n = (st.categories || []).reduce((a, c) => a + (c.events || []).length, 0);
    if (n > bestN) { bestN = n; best = st; }
  }
  const rows = [];
  (best ? best.categories : []).forEach((c) => {
    (c.events || []).forEach((ev) => {
      const meta = events[ev.eventId];
      if (!meta) return;
      const s = ev.stats || [];
      rows.push({
        eventId: ev.eventId,
        iso: meta.gameDate,
        d: fmtDate(meta.gameDate),
        opp: (meta.opponent && meta.opponent.abbreviation) || '',
        oppName: (meta.opponent && meta.opponent.displayName) || '',
        homeAway: meta.atVs === '@' ? 'away' : 'home',
        res: meta.gameResult,
        score: meta.score,
        teamId: meta.team && meta.team.id,
        homeTeamId: meta.homeTeamId,
        homeScore: +meta.homeTeamScore, awayScore: +meta.awayTeamScore,
        min: parseInt(s[iMin]) || 0,
        reb: +s[iReb] || 0,
        ast: +s[iAst] || 0,
        pts: +s[iPts] || 0,
        fg: round(+s[iFgPct]),
        t3: round(+s[iTpPct]),
        fgRaw: s[iFg], tpRaw: s[iTp],
      });
    });
  });
  rows.sort((a, b) => new Date(a.iso) - new Date(b.iso));
  return rows;
}

// ── pick the most relevant game from a scoreboard (live > final > upcoming) ──
function pickGame(events) {
  if (!events.length) return null;
  const live = events.filter((e) => e.competitions[0].status.type.state === 'in');
  if (live.length) return live[0];
  const post = events.filter((e) => e.competitions[0].status.type.state === 'post');
  if (post.length) return post[post.length - 1];
  return events[0];
}

// look back up to a week for the most recent completed game (so the Live screen
// always has a real box score + win-probability chart when nothing is live today)
async function findRecentFinal() {
  const fmt = (dt) => '' + dt.getFullYear() + pad2(dt.getMonth() + 1) + pad2(dt.getDate());
  for (let i = 1; i <= 7; i++) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    try {
      const sb = await fetchJson(ESPN_SITE + '/scoreboard?dates=' + fmt(dt), 300000);
      const posts = (sb.events || []).filter((e) => e.competitions[0].status.type.state === 'post');
      if (posts.length) return posts[posts.length - 1];
    } catch (e) { /* keep looking */ }
  }
  return null;
}

// ── build the live game object from a summary payload ─────────────────────────
function parseBox(teamBlock) {
  const st = (teamBlock.statistics || [])[0] || {};
  const labels = st.names || st.labels || [];
  const li = (n) => labels.indexOf(n);
  return (st.athletes || []).map((a) => {
    const v = a.stats || [];
    const ath = a.athlete || {};
    return {
      n: ath.shortName || ath.displayName,
      p: (ath.position && ath.position.abbreviation) || '',
      starter: a.starter,
      min: v[li('MIN')] || '0',
      pts: +v[li('PTS')] || 0,
      reb: +v[li('REB')] || 0,
      ast: +v[li('AST')] || 0,
      fg: v[li('FG')] || '0-0',
      t3: v[li('3PT')] || '0-0',
      pm: parseInt((v[li('+/-')] || '0').replace('+', '')) || 0,
    };
  }).filter((p) => p.min !== '0' && p.min !== '--').slice(0, 8);
}

function parseGame(scoreEvent, summary) {
  const comp = scoreEvent.competitions[0];
  const status = comp.status;
  const competitors = comp.competitors;
  const homeC = competitors.find((c) => c.homeAway === 'home');
  const awayC = competitors.find((c) => c.homeAway === 'away');
  const odds = (comp.odds || [])[0] || (summary && (summary.pickcenter || [])[0]) || {};

  const sideFromSummary = (abbr) => {
    const players = (summary && summary.boxscore && summary.boxscore.players) || [];
    const blk = players.find((p) => p.team.abbreviation === abbr);
    return blk ? parseBox(blk) : [];
  };
  const lines = (c) => (c.linescores || []).map((l) => (l.displayValue != null ? l.displayValue : l.value));

  // win probability series (home), sampled
  const wpArr = (summary && summary.winprobability) || [];
  let winHistory = [], winHome = null;
  if (wpArr.length) {
    const step = Math.max(1, Math.floor(wpArr.length / 40));
    for (let i = 0; i < wpArr.length; i += step) winHistory.push(wpArr[i].homeWinPercentage);
    winHistory.push(wpArr[wpArr.length - 1].homeWinPercentage);
    winHome = wpArr[wpArr.length - 1].homeWinPercentage;
  } else if (summary && summary.predictor) {
    winHome = (+summary.predictor.homeTeam.gameProjection || 50) / 100;
  }

  const teamInfo = (c) => {
    const recs = c.records || c.record || [];
    return {
      abbr: c.team.abbreviation,
      name: c.team.shortDisplayName || c.team.name || c.team.displayName,
      score: +c.score || 0,
      record: Array.isArray(recs) ? ((recs[0] || {}).summary || '') : '',
      color: c.team.color ? '#' + c.team.color : '#8E8E93',
      logo: c.team.logo,
      lines: lines(c),
    };
  };

  return {
    id: scoreEvent.id,
    state: status.type.state,            // 'pre' | 'in' | 'post'
    detail: status.type.shortDetail,
    period: status.period,
    clock: status.displayClock,
    home: teamInfo(homeC),
    away: teamInfo(awayC),
    boxHome: sideFromSummary(homeC.team.abbreviation),
    boxAway: sideFromSummary(awayC.team.abbreviation),
    winHome, winHistory,
    spread: odds.details || odds.spread || '',
    ou: odds.overUnder != null ? odds.overUnder : '',
    leaders: (summary && summary.leaders) || [],
  };
}

// ── base loader: everything that doesn't depend on the current selection ─────
async function loadBase() {
  // 1. scoreboard for season + today's games
  const scoreboard = await fetchJson(ESPN_SITE + '/scoreboard', 30000);
  const league = (scoreboard.leagues || [])[0] || {};
  const season = (scoreboard.season || league.season || {});
  const seasonYear = season.year || new Date().getFullYear();
  const seasonLabel = (league.season && league.season.displayName) ||
    ((seasonYear - 1) + '–' + String(seasonYear).slice(2));
  const STATS_QS = 'region=us&lang=en&contentorigin=espn&isqualified=false&seasontype=2&season=' + seasonYear;

  const events = scoreboard.events || [];
  const liveCount = events.filter((e) => e.competitions[0].status.type.state === 'in').length;
  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // 2. parallel: two pages of player stats + standings.
  // NOTE: the /teams *collection* endpoint does not send CORS headers, so we
  // build the team index from the standings payload (logos included) instead,
  // and fetch real team colours from the per-team endpoint (which does allow CORS).
  const [statsP1, statsP2, standingsRaw] = await Promise.all([
    fetchJson(ESPN_WEB + '/statistics/byathlete?' + STATS_QS + '&page=1&limit=500&sort=offensive.avgPoints%3Adesc'),
    fetchJson(ESPN_WEB + '/statistics/byathlete?' + STATS_QS + '&page=2&limit=500&sort=offensive.avgPoints%3Adesc').catch(() => ({ athletes: [] })),
    fetchJson(ESPN_V2 + '/standings?level=0', 120000),
  ]);

  // teams index from standings (covers all 30 teams)
  const teamsById = {}, teamsByAbbr = {};
  (standingsRaw.children || []).forEach((conf) => {
    ((conf.standings && conf.standings.entries) || []).forEach((e) => {
      const tm = e.team;
      const info = {
        id: tm.id, abbr: tm.abbreviation, name: tm.displayName, short: tm.shortDisplayName,
        color: '#0A84FF', alt: '#0a3a80',
        logo: (tm.logos && tm.logos[0] && tm.logos[0].href) || null,
      };
      teamsById[tm.id] = info; teamsByAbbr[tm.abbreviation] = info;
    });
  });

  const players = parseByAthlete([statsP1, statsP2]);
  const playersById = {};
  players.forEach((p) => { playersById[p.id] = p; });
  const standings = parseStandings(standingsRaw, teamsById);

  // global percentile pools for the radar (stable rotation-player population)
  const pool = players.filter((p) => p.gp >= 5 && p.min >= 18);
  const sortedBy = (sel) => pool.map(sel).sort((a, b) => a - b);
  const radarPools = {
    scoring: sortedBy((p) => p.ppg), playmaking: sortedBy((p) => p.apg),
    rebounding: sortedBy((p) => p.rpg), defense: sortedBy((p) => p.spg + p.bpg),
    efficiency: sortedBy((p) => p.ts), volume: sortedBy((p) => p.min),
  };

  // chosen game for the live screen
  let game0 = pickGame(events);
  if (game0 && game0.competitions[0].status.type.state === 'pre') {
    const fin = await findRecentFinal();
    if (fin) game0 = fin;
  }
  const summaryRaw = game0 ? await fetchJson(ESPN_SITE + '/summary?event=' + game0.id, 20000).catch(() => null) : null;
  const game = game0 ? parseGame(game0, summaryRaw) : null;

  const defaultPlayerId = players[0] ? players[0].id : null;
  const defaultTeamId = (players[0] && (teamsByAbbr[players[0].teamAbbr] || {}).id) || null;

  return {
    meta: { seasonYear, seasonLabel, todayLabel, liveCount },
    teamsById, teamsByAbbr, players, playersById, standings, radarPools,
    game, gameEventId: game0 ? game0.id : null,
    defaultPlayerId, defaultTeamId,
  };
}

// ── build the player bundle (player + game log + radar) for any player id ────
async function buildPlayerBundle(base, playerId) {
  const src = base.playersById[playerId];
  if (!src) return null;
  const player = Object.assign({}, src);
  const teamInfo = base.teamsByAbbr[player.teamAbbr] || {};
  const teamId = teamInfo.id;

  const [gamelogRaw, rosterRaw] = await Promise.all([
    fetchJson(ESPN_WEB + '/athletes/' + player.id + '/gamelog?season=' + base.meta.seasonYear, 120000).catch(() => ({})),
    teamId ? fetchJson(ESPN_SITE + '/teams/' + teamId + '/roster', 3600000).catch(() => ({})) : Promise.resolve({}),
  ]);
  const gamelog = parseGameLog(gamelogRaw);

  const bioById = {};
  (rosterRaw.athletes || []).forEach((a) => { bioById[a.id] = a; });
  const bio = bioById[player.id] || {};
  Object.assign(player, {
    number: bio.jersey || '',
    height: bio.displayHeight || '',
    weight: bio.displayWeight || '',
    age: bio.age || '',
    exp: bio.experience ? (bio.experience.years ? ordinal(bio.experience.years) : 'Rookie') : '',
    posFull: (bio.position && bio.position.displayName) ||
      (player.pos === 'G' ? 'Guard' : player.pos === 'F' ? 'Forward' : player.pos === 'C' ? 'Center' : ''),
  });

  const rp = base.radarPools;
  const radar = [
    { k: 'Scoring',    p: percentile(player.ppg, rp.scoring),               avg: 50 },
    { k: 'Playmaking', p: percentile(player.apg, rp.playmaking),            avg: 50 },
    { k: 'Rebounding', p: percentile(player.rpg, rp.rebounding),            avg: 50 },
    { k: 'Defense',    p: percentile(player.spg + player.bpg, rp.defense),  avg: 50 },
    { k: 'Efficiency', p: percentile(player.ts, rp.efficiency),             avg: 50 },
    { k: 'Volume',     p: percentile(player.min, rp.volume),                avg: 50 },
  ];
  return { player, gamelog, radar };
}

// ── build the team bundle for any team id ────────────────────────────────────
async function buildTeamBundle(base, teamId) {
  const teamInfo = Object.assign({}, base.teamsById[teamId] || {});
  const roster = base.players.filter((p) => p.teamAbbr === teamInfo.abbr).sort((a, b) => b.ppg - a.ppg);

  const [teamDetailRaw, gamelogRaw] = await Promise.all([
    teamId ? fetchJson(ESPN_SITE + '/teams/' + teamId, 3600000).catch(() => null) : Promise.resolve(null),
    roster[0] ? fetchJson(ESPN_WEB + '/athletes/' + roster[0].id + '/gamelog?season=' + base.meta.seasonYear, 120000).catch(() => ({})) : Promise.resolve({}),
  ]);

  const detail = teamDetailRaw && teamDetailRaw.team;
  if (detail) {
    if (detail.color) teamInfo.color = '#' + detail.color;
    if (detail.alternateColor) teamInfo.alt = '#' + detail.alternateColor;
    if (!teamInfo.logo && detail.logos && detail.logos[0]) teamInfo.logo = detail.logos[0].href;
  }

  const teamStanding = [...(base.standings.east || []), ...(base.standings.west || [])].find((s) => s.id === teamId) || {};
  const agg = roster.reduce((a, p) => {
    a.fgm += p.fgm; a.fga += p.fga; a.tpm += p.tpm; a.tpa += p.tpa; a.fta += p.fta; a.tov += p.tov; a.ast += p.ast; return a;
  }, { fgm: 0, fga: 0, tpm: 0, tpa: 0, fta: 0, tov: 0, ast: 0 });
  const four = {
    efg: agg.fga ? round(((agg.fgm + 0.5 * agg.tpm) / agg.fga) * 100) : 0,
    threeRate: agg.fga ? round((agg.tpa / agg.fga) * 100) : 0,
    ftRate: agg.fga ? round((agg.fta / agg.fga) * 100) : 0,
    astTo: agg.tov ? round(agg.ast / agg.tov) : 0,
  };
  // margin trend from the team's leading scorer's game log (his games == team games)
  const tgl = parseGameLog(gamelogRaw);
  const marginTrend = tgl.map((g) => {
    const teamHome = String(g.homeTeamId) === String(g.teamId);
    const margin = teamHome ? g.homeScore - g.awayScore : g.awayScore - g.homeScore;
    return { d: g.d, opp: g.opp, pts: margin };
  });

  const team = {
    id: teamId,
    abbr: teamInfo.abbr,
    name: teamInfo.name || '',
    color: teamInfo.color || '#0A84FF',
    alt: teamInfo.alt || '#0a3a80',
    logo: teamInfo.logo,
    record: teamStanding.w != null ? teamStanding.w + '-' + teamStanding.l : '',
    seed: teamStanding.seed,
    pct: teamStanding.pct,
    conf: (base.standings.west || []).some((s) => s.id === teamId) ? 'Western' : 'Eastern',
    streak: teamStanding.streak,
    ppg: teamStanding.ppg, oppg: teamStanding.oppg, diff: teamStanding.diff,
    four, roster, marginTrend,
  };
  return { team };
}

// ── React context + provider ─────────────────────────────────────────────────
const DataCtx = React.createContext(null);

function DataProvider({ children }) {
  const [state, setState] = React.useState({ status: 'loading', base: null, error: null });
  const [screen, setScreen] = React.useState('player');
  const [playerId, setPlayerId] = React.useState(null);
  const [teamId, setTeamId] = React.useState(null);
  const [playerBundle, setPlayerBundle] = React.useState(null);
  const [teamBundle, setTeamBundle] = React.useState(null);
  const [selecting, setSelecting] = React.useState(false);

  const load = React.useCallback(() => {
    setState({ status: 'loading', base: null, error: null });
    setPlayerBundle(null); setTeamBundle(null);
    loadBase()
      .then(async (base) => {
        const pid = base.defaultPlayerId, tid = base.defaultTeamId;
        const [pb, tb] = await Promise.all([
          pid ? buildPlayerBundle(base, pid) : Promise.resolve(null),
          tid ? buildTeamBundle(base, tid) : Promise.resolve(null),
        ]);
        setPlayerId(pid); setTeamId(tid);
        setPlayerBundle(pb); setTeamBundle(tb);
        setState({ status: 'ready', base, error: null });
      })
      .catch((err) => { console.error(err); setState((s) => ({ status: 'error', base: s.base, error: err })); });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // select any player (and switch its team dashboard to that player's team)
  const selectPlayer = React.useCallback((id) => {
    const base = state.base;
    if (!base || !base.playersById[id]) return;
    const tid = (base.teamsByAbbr[base.playersById[id].teamAbbr] || {}).id;
    setSelecting(true); setScreen('player'); setPlayerId(id); if (tid) setTeamId(tid);
    Promise.all([
      buildPlayerBundle(base, id),
      tid ? buildTeamBundle(base, tid) : Promise.resolve(null),
    ]).then(([pb, tb]) => { if (pb) setPlayerBundle(pb); if (tb) setTeamBundle(tb); })
      .catch((e) => console.error(e))
      .finally(() => setSelecting(false));
  }, [state.base]);

  // select any team (team dashboard only)
  const selectTeam = React.useCallback((id) => {
    const base = state.base;
    if (!base || !base.teamsById[id]) return;
    setSelecting(true); setScreen('team'); setTeamId(id);
    buildTeamBundle(base, id)
      .then((tb) => { if (tb) setTeamBundle(tb); })
      .catch((e) => console.error(e))
      .finally(() => setSelecting(false));
  }, [state.base]);

  const data = state.base
    ? Object.assign({}, state.base, playerBundle || {}, teamBundle || {},
        { selectedPlayerId: playerId, selectedTeamId: teamId })
    : null;

  // not truly "ready" until the initial bundles have populated
  const status = (state.status === 'ready' && (!playerBundle || !teamBundle)) ? 'loading' : state.status;

  return (
    <DataCtx.Provider value={{ status, data, error: state.error, reload: load, screen, setScreen, selectPlayer, selectTeam, selecting }}>
      {children}
    </DataCtx.Provider>
  );
}

const useData = () => React.useContext(DataCtx);

// re-fetch just the live game summary (used for live polling)
async function refreshGame(eventId) {
  if (!eventId) return null;
  _cache.delete(ESPN_SITE + '/summary?event=' + eventId);
  _cache.delete(ESPN_SITE + '/scoreboard');
  const [scoreboard, summary] = await Promise.all([
    fetchJson(ESPN_SITE + '/scoreboard', 0),
    fetchJson(ESPN_SITE + '/summary?event=' + eventId, 0),
  ]);
  const ev = (scoreboard.events || []).find((e) => e.id === eventId);
  if (!ev) return null;
  return parseGame(ev, summary);
}

Object.assign(window, { DataProvider, useData, DataCtx, refreshGame, fetchJson });
