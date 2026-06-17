// api/scores.js — Vercel Edge Function
// Pulls live WC2026 results + goalscorers from openfootball's public GitHub JSON

export const config = { runtime: 'edge' };

const NAME_MAP = {
  'Czech Republic': 'Czech Republic', 'Czechia': 'Czech Republic',
  'Korea Republic': 'South Korea', 'Republic of Korea': 'South Korea',
  'Türkiye': 'Turkey', 'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
  "Côte d'Ivoire": 'Ivory Coast', 'Congo DR': 'DR Congo',
  'Curacao': 'Curaçao', 'USA': 'United States',
  'United States of America': 'United States',
};
function mapName(n) { return NAME_MAP[n] || n; }

const KNOWN_RESULTS = [
  { home: 'Mexico', away: 'South Africa', hg: 2, ag: 0, date: '2026-06-11', group: 'Group A' },
  { home: 'South Korea', away: 'Czech Republic', hg: 2, ag: 1, date: '2026-06-11', group: 'Group A' },
];

export default async function handler(req) {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json',
      { headers: { 'User-Agent': 'sweepstake-tracker/1.0' } }
    );
    if (!res.ok) throw new Error(`fetch failed ${res.status}`);
    const data = await res.json();
    const matches = data.matches || [];

    const results = [];
    const fixtures = [];
    const goalsByPlayer = {}; // { "Player Name": { goals: N, team: "Country" } }

    for (const m of matches) {
      const home = mapName(m.team1 || '');
      const away = mapName(m.team2 || '');
      const group = m.group || null;
      const date = m.date || '';
      const time = m.time || '';
      const ground = m.ground || '';
      const score = m.score?.ft;

      if (!home || !away) continue;

      if (score && score.length === 2) {
        results.push({ home, away, hg: parseInt(score[0]), ag: parseInt(score[1]), date, group });

        // Tally goalscorers
        for (const g of (m.goals1 || [])) {
          const name = g.name;
          if (!name) continue;
          if (!goalsByPlayer[name]) goalsByPlayer[name] = { goals: 0, team: home };
          goalsByPlayer[name].goals++;
        }
        for (const g of (m.goals2 || [])) {
          const name = g.name;
          if (!name) continue;
          if (!goalsByPlayer[name]) goalsByPlayer[name] = { goals: 0, team: away };
          goalsByPlayer[name].goals++;
        }
      } else {
        fixtures.push({ home, away, date, time, ground, group });
      }
    }

    for (const kr of KNOWN_RESULTS) {
      const key = [kr.home, kr.away].sort().join('|');
      if (!results.find(r => [r.home, r.away].sort().join('|') === key)) {
        results.push(kr);
      }
    }

    results.sort((a, b) => a.date.localeCompare(b.date));
    fixtures.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    // Convert goalsByPlayer to array sorted by goals desc
    const goalscorers = Object.entries(goalsByPlayer)
      .map(([name, v]) => ({ name, goals: v.goals, team: v.team }))
      .sort((a, b) => b.goals - a.goals);

    return new Response(
      JSON.stringify({ results, fixtures, goalscorers, fetchedAt: new Date().toISOString() }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 's-maxage=300,stale-while-revalidate=60' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, results: KNOWN_RESULTS, fixtures: [], goalscorers: [] }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
