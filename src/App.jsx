import { useState, useEffect, useRef, useCallback } from "react";

// ─── SWEEPSTAKE DATA — edit names/teams/picks here ───────────────────────────
const PLAYERS = [
  { name:"Adam",  seeds:["Mexico","Colombia"], teams:["Tunisia","Ireland","Saudi Arabia","New Zealand"],
    goldenBoot:[{player:"Kylian Mbappe", team:"France"},{player:"Lionel Messi", team:"Argentina"}] },
  { name:"Harry", seeds:["Portugal","France"], teams:["Algeria","Panama","Austria","Iran"],
    goldenBoot:[{player:"Harry Kane", team:"England"},{player:"Kai Havertz", team:"Germany"}] },
  { name:"Rhys",  seeds:["Japan","Croatia"], teams:["Bosnia & Herzegovina","Iraq","Qatar","Poland"],
    goldenBoot:[{player:"Erling Haaland", team:"Norway"},{player:"Michael Olise", team:"France"}] },
  { name:"Lamb",  seeds:["Belgium","Brazil"], teams:["Switzerland","Greece","Uzbekistan","Ukraine"],
    goldenBoot:[{player:"Raphinha", team:"Brazil"},{player:"Mikel Oyarzabal", team:"Spain"}] },
  { name:"Tom",   seeds:["Uruguay","Germany"], teams:["Serbia","Curaçao","Sweden","Jordan"],
    goldenBoot:[{player:"Viktor Gyokeres", team:"Sweden"},{player:"Anthony Gordon", team:"England"}] },
  { name:"Calum", seeds:["Spain","United States"], teams:["Costa Rica","Ecuador","Haiti","South Africa"],
    goldenBoot:[{player:"Luis Diaz", team:"Colombia"},{player:"Lamine Yamal", team:"Spain"}] },
  { name:"Peter", seeds:["Morocco","Argentina"], teams:["Norway","Ivory Coast","Denmark","Scotland"],
    goldenBoot:[{player:"Alexander Isak", team:"Sweden"},{player:"Vinicius Junior", team:"Brazil"}] },
  { name:"KS",    seeds:["England","Netherlands"], teams:["Wales","Chile","Paraguay","Peru"],
    goldenBoot:[{player:"Cristiano Ronaldo", team:"Portugal"},{player:"Folarin Balogun", team:"United States"}] },
];

const SCORER_NAME_MAP = {
  "Kylian Mbappé": "Kylian Mbappe",
  "Lionel Messi": "Lionel Messi",
  "Erling Haaland": "Erling Haaland",
  "Vinícius Júnior": "Vinicius Junior",
  "Viktor Gyökeres": "Viktor Gyokeres",
  "Cristiano Ronaldo": "Cristiano Ronaldo",
};

const FLAGS = {
  "Mexico":"🇲🇽","Colombia":"🇨🇴","Tunisia":"🇹🇳","Ireland":"🇮🇪","Saudi Arabia":"🇸🇦","New Zealand":"🇳🇿",
  "Portugal":"🇵🇹","France":"🇫🇷","Algeria":"🇩🇿","Panama":"🇵🇦","Austria":"🇦🇹","Iran":"🇮🇷",
  "Japan":"🇯🇵","Croatia":"🇭🇷","Bosnia & Herzegovina":"🇧🇦","Iraq":"🇮🇶","Qatar":"🇶🇦","Poland":"🇵🇱",
  "Belgium":"🇧🇪","Brazil":"🇧🇷","Switzerland":"🇨🇭","Greece":"🇬🇷","Uzbekistan":"🇺🇿","Ukraine":"🇺🇦",
  "Uruguay":"🇺🇾","Germany":"🇩🇪","Serbia":"🇷🇸","Curaçao":"🇨🇼","Sweden":"🇸🇪","Jordan":"🇯🇴",
  "Spain":"🇪🇸","United States":"🇺🇸","Costa Rica":"🇨🇷","Ecuador":"🇪🇨","Haiti":"🇭🇹","South Africa":"🇿🇦",
  "Morocco":"🇲🇦","Argentina":"🇦🇷","Norway":"🇳🇴","Ivory Coast":"🇨🇮","Denmark":"🇩🇰","Scotland":"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "England":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Netherlands":"🇳🇱","Wales":"🏴󠁧󠁢󠁷󠁬󠁳󠁿","Chile":"🇨🇱","Paraguay":"🇵🇾","Peru":"🇵🇪",
};

const REFRESH_MS = 5 * 60 * 1000;
const MEDAL = ["🥇","🥈","🥉"];

const TEAM_TO_PLAYER = {};
PLAYERS.forEach(p => { [...p.seeds, ...p.teams].forEach(t => { TEAM_TO_PLAYER[t] = p.name; }); });

function isSeed(playerObj, team) { return playerObj.seeds.includes(team); }

function calcStandings(results) {
  const stats = {};
  PLAYERS.forEach(p => { stats[p.name] = { w:0,d:0,l:0,played:0,gf:0,ga:0,pts:0 }; });
  results.forEach(({ home, away, hg, ag }) => {
    const hP = TEAM_TO_PLAYER[home], aP = TEAM_TO_PLAYER[away];
    if (hP) {
      stats[hP].played++; stats[hP].gf+=hg; stats[hP].ga+=ag;
      if(hg>ag){stats[hP].pts+=3;stats[hP].w++;}else if(hg===ag){stats[hP].pts+=1;stats[hP].d++;}else stats[hP].l++;
    }
    if (aP) {
      stats[aP].played++; stats[aP].gf+=ag; stats[aP].ga+=hg;
      if(ag>hg){stats[aP].pts+=3;stats[aP].w++;}else if(hg===ag){stats[aP].pts+=1;stats[aP].d++;}else stats[aP].l++;
    }
  });
  return PLAYERS
    .map(p=>({name:p.name,seeds:p.seeds,teams:p.teams,goldenBoot:p.goldenBoot,...stats[p.name],gd:stats[p.name].gf-stats[p.name].ga}))
    .sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.name.localeCompare(b.name));
}

function getPlayerResults(p, results) {
  const teams = new Set([...p.seeds, ...p.teams]);
  return results.flatMap(r=>{
    const rows=[];
    if(teams.has(r.home))rows.push({...r,myTeam:r.home,oppTeam:r.away,won:r.hg>r.ag,drew:r.hg===r.ag,seed:isSeed(p,r.home)});
    if(teams.has(r.away))rows.push({...r,myTeam:r.away,oppTeam:r.home,won:r.ag>r.hg,drew:r.hg===r.ag,seed:isSeed(p,r.away)});
    return rows;
  });
}

function calcGroupStandings(results) {
  const groups = {};
  results.forEach(r => {
    if (!r.group) return;
    [r.home, r.away].forEach(t => {
      if (!groups[r.group]) groups[r.group] = {};
      if (!groups[r.group][t]) groups[r.group][t] = { team:t, p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 };
    });
    const hs = groups[r.group][r.home], as_ = groups[r.group][r.away];
    hs.p++; hs.gf+=r.hg; hs.ga+=r.ag;
    as_.p++; as_.gf+=r.ag; as_.ga+=r.hg;
    if(r.hg>r.ag){hs.pts+=3;hs.w++;as_.l++;}
    else if(r.hg===r.ag){hs.pts+=1;hs.d++;as_.pts+=1;as_.d++;}
    else{as_.pts+=3;as_.w++;hs.l++;}
  });
  const sorted = {};
  Object.entries(groups).forEach(([g, teams]) => {
    sorted[g] = Object.values(teams).sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.team.localeCompare(b.team));
  });
  return sorted;
}

function fmtDate(d) {
  try { return new Date(d+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); }
  catch { return d; }
}
function fmtTime(timeStr) {
  if (!timeStr) return '';
  const m = timeStr.match(/(\d+):(\d+)\s*UTC([+-]\d+)/);
  if (!m) return timeStr;
  let h = parseInt(m[1]), min = parseInt(m[2]), offset = parseInt(m[3]);
  h = ((h - offset + 1) % 24 + 24) % 24;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')} BST`;
}

function getLiveGoals(playerName, goalscorers) {
  const canonical = name => SCORER_NAME_MAP[name] || name;
  const match = goalscorers.find(g => canonical(g.name) === playerName || g.name === playerName);
  return match ? match.goals : 0;
}

// ── CONFETTI ──────────────────────────────────────────────────────────────────
function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width=window.innerWidth; canvas.height=window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const pieces = Array.from({length:180}, ()=>({
      x:Math.random()*window.innerWidth, y:Math.random()*-window.innerHeight,
      w:Math.random()*10+5, h:Math.random()*6+4,
      color:['#f5c542','#4caf78','#ff6b6b','#5bc0eb','#ff9f43','#a29bfe','#fd79a8','#00cec9'][Math.floor(Math.random()*8)],
      rot:Math.random()*360, rotSpd:(Math.random()-0.5)*6, spd:Math.random()*3+2,
      swing:Math.random()*2+1, swingOff:Math.random()*Math.PI*2,
    }));
    let frame, t=0;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height); t++;
      pieces.forEach(p=>{
        p.y+=p.spd; p.x+=Math.sin(t*0.04*p.swing+p.swingOff)*1.2; p.rot+=p.rotSpd;
        if(p.y>canvas.height+20){p.y=-20;p.x=Math.random()*canvas.width;}
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle=p.color; ctx.globalAlpha=0.9; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      });
      frame=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ cancelAnimationFrame(frame); window.removeEventListener('resize',resize); };
  },[]);
  return <canvas ref={ref} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}}/>;
}

// ── SPLASH ────────────────────────────────────────────────────────────────────
function Splash({leader, onDone}) {
  const [phase, setPhase] = useState('in');
  useEffect(()=>{
    const t1=setTimeout(()=>setPhase('hold'),100);
    const t2=setTimeout(()=>setPhase('out'),4200);
    const t3=setTimeout(()=>onDone(),4900);
    return()=>[t1,t2,t3].forEach(clearTimeout);
  },[onDone]);
  const opacity=phase==='out'?0:phase==='hold'?1:0;
  const scale=phase==='out'?0.96:phase==='hold'?1:0.92;
  const initials = leader.name.slice(0,2).toUpperCase();
  return (
    <div onClick={onDone} style={{position:'fixed',inset:0,zIndex:100,background:'#060f08',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',opacity,transform:`scale(${scale})`,cursor:'pointer',overflow:'hidden',transition:phase==='out'?'opacity 0.7s ease-in,transform 0.7s ease-in':'opacity 0.5s ease-out,transform 0.5s ease-out'}}>
      <Confetti/>
      <div style={{position:'relative',zIndex:2,width:224,height:224,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
        <div style={{position:'absolute',inset:-6,borderRadius:'50%',background:'conic-gradient(#f5c542,#e8a020,#f5c542,#fff8dc,#f5c542)',animation:'spinRing 3s linear infinite'}}/>
        <style>{`@keyframes spinRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{position:'absolute',inset:3,borderRadius:'50%',background:'#162d1e',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{fontSize:64,fontWeight:900,color:'#4caf78'}}>{initials}</span>
        </div>
      </div>
      <div style={{fontSize:38,marginBottom:4,position:'relative',zIndex:2}}>👑</div>
      <div style={{fontSize:44,fontWeight:900,color:'#f5c542',letterSpacing:-1,position:'relative',zIndex:2,textShadow:'0 0 40px #f5c54280',fontFamily:'sans-serif'}}>{leader.name}</div>
      <div style={{fontSize:14,color:'#4caf78',fontWeight:600,letterSpacing:2,textTransform:'uppercase',marginTop:6,position:'relative',zIndex:2}}>is leading the sweepstake</div>
      <div style={{marginTop:20,position:'relative',zIndex:2,background:'#162d1e',border:'1px solid #2d5a3d',borderRadius:14,padding:'12px 32px',display:'flex',gap:20,alignItems:'center'}}>
        {[['Points',leader.pts,'#4caf78'],['Wins',leader.w,'#eee'],['Played',leader.played,'#eee']].map(([label,val,color],i,arr)=>(
          <div key={label} style={{display:'flex',alignItems:'center',gap:20}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:36,fontWeight:900,color,lineHeight:1}}>{val}</div>
              <div style={{fontSize:11,color:'#4a7a5a',textTransform:'uppercase',letterSpacing:1}}>{label}</div>
            </div>
            {i<arr.length-1&&<div style={{width:1,height:40,background:'#1e3a24'}}/>}
          </div>
        ))}
      </div>
      <div style={{position:'absolute',bottom:32,fontSize:12,color:'#2a4a2a',zIndex:3,letterSpacing:1}}>tap anywhere to continue →</div>
    </div>
  );
}

// ── INITIALS AVATAR ───────────────────────────────────────────────────────────
function Avatar({ name, size=36, isLeader=false }) {
  return (
    <div style={{
      width:size,height:size,borderRadius:'50%',flexShrink:0,
      background:isLeader?'#1a3020':'#142018',
      border:isLeader?'2px solid #f5c542':'1px solid #2a4a2a',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:size*0.38,fontWeight:900,color:isLeader?'#f5c542':'#4a7a5a',
    }}>{name.slice(0,2).toUpperCase()}</div>
  );
}

// ── UPCOMING STRIP ────────────────────────────────────────────────────────────
function UpcomingStrip({ fixtures }) {
  if (!fixtures.length) return null;
  const today = new Date().toISOString().slice(0,10);
  const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10);
  const nextDay = fixtures.find(f=>f.date>=today)?.date;
  if (!nextDay) return null;
  const upcoming = fixtures.filter(f=>f.date===nextDay);
  if (!upcoming.length) return null;
  const label = nextDay===today?'Today':nextDay===tomorrow?'Tomorrow':fmtDate(nextDay);
  return (
    <div style={{marginTop:20,background:'#0d1810',border:'1px solid #1a2e1a',borderRadius:10,padding:'12px 14px'}}>
      <div style={{fontSize:10,color:'#3a6a3a',letterSpacing:1.5,textTransform:'uppercase',fontWeight:700,marginBottom:10}}>⚽ {label}'s Matches</div>
      {upcoming.map((f,i)=>{
        const hP=TEAM_TO_PLAYER[f.home], aP=TEAM_TO_PLAYER[f.away];
        return (
          <div key={i} style={{display:'flex',alignItems:'center',padding:'6px 0',borderTop:i>0?'1px solid #111e12':'none',gap:6}}>
            <div style={{flex:1,textAlign:'right'}}>
              <div style={{fontSize:13,fontWeight:700,color:hP?'#eee':'#556'}}>{FLAGS[f.home]||''} {f.home}</div>
              {hP&&<div style={{fontSize:10,color:'#3a5a3a'}}>{hP}</div>}
            </div>
            <div style={{textAlign:'center',minWidth:54}}>
              <div style={{fontSize:11,fontWeight:700,color:'#4caf78'}}>{fmtTime(f.time)}</div>
              <div style={{fontSize:9,color:'#2a4a2a'}}>{f.group||''}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:aP?'#eee':'#556'}}>{FLAGS[f.away]||''} {f.away}</div>
              {aP&&<div style={{fontSize:10,color:'#3a5a3a'}}>{aP}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── TABLE TAB (main league table — front view) ────────────────────────────────
function TableTab({ standings, results, fixtures, expanded, setExpanded }) {
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'26px 1fr 30px 26px 26px 26px 36px',padding:'5px 10px',fontSize:9,color:'#2a4a2a',letterSpacing:1.2,textTransform:'uppercase',fontWeight:700}}>
        <span>#</span><span>Player</span>
        <span style={{textAlign:'center'}}>P</span><span style={{textAlign:'center'}}>W</span>
        <span style={{textAlign:'center'}}>D</span><span style={{textAlign:'center'}}>L</span>
        <span style={{textAlign:'right'}}>Pts</span>
      </div>
      {standings.map((p,i)=>{
        const isExp=expanded===p.name, pr=getPlayerResults(p,results);
        return (
          <div key={p.name} style={{marginBottom:4}}>
            <div onClick={()=>setExpanded(isExp?null:p.name)} style={{display:'grid',gridTemplateColumns:'26px 1fr 30px 26px 26px 26px 36px',alignItems:'center',padding:'10px 10px',cursor:'pointer',borderRadius:isExp?'9px 9px 0 0':9,background:i===0?'linear-gradient(90deg,#1e4028,#182e1e)':i<3?'#101e12':'#0d1810',border:i===0?'1px solid #2d5a3d':'1px solid #111a12'}}>
              <span style={{fontSize:i<3?15:11,color:i>=3?'#283228':'inherit'}}>{MEDAL[i]||(i+1)}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <Avatar name={p.name} size={32} isLeader={i===0}/>
                <div>
                  <div style={{fontWeight:800,fontSize:14,color:i===0?'#f5c542':'#eee'}}>{p.name}</div>
                  <div style={{fontSize:10,color:'#2a5030'}}>{p.seeds.length+p.teams.length} teams</div>
                </div>
              </div>
              <span style={{textAlign:'center',fontSize:12,color:'#334'}}>{p.played}</span>
              <span style={{textAlign:'center',fontSize:13,fontWeight:p.w>0?700:400,color:p.w>0?'#4caf78':'#223'}}>{p.w}</span>
              <span style={{textAlign:'center',fontSize:12,color:p.d>0?'#aaa':'#223'}}>{p.d}</span>
              <span style={{textAlign:'center',fontSize:12,color:p.l>0?'#c0504d':'#223'}}>{p.l}</span>
              <span style={{textAlign:'right',fontWeight:900,fontSize:18,color:i===0?'#f5c542':p.pts>0?'#4caf78':'#1e2e1e'}}>{p.pts}</span>
            </div>
            {isExp&&(
              <div style={{background:'#0b1510',border:i===0?'1px solid #2d5a3d':'1px solid #111a12',borderTop:'none',borderRadius:'0 0 9px 9px',padding:'12px 13px'}}>
                <div style={{fontSize:10,color:'#2a5030',letterSpacing:1.2,textTransform:'uppercase',fontWeight:700,marginBottom:8}}>Teams</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:14}}>
                  {p.seeds.map(t=>(
                    <span key={t} style={{background:'#2a2412',border:'1px solid #3a3018',borderRadius:5,padding:'4px 8px',fontSize:12,color:'#d4af37'}}>★ {FLAGS[t]||'🏳'} {t}</span>
                  ))}
                  {p.teams.map(t=>(
                    <span key={t} style={{background:'#142018',border:'1px solid #223322',borderRadius:5,padding:'4px 8px',fontSize:12}}>{FLAGS[t]||'🏳'} {t}</span>
                  ))}
                </div>
                {pr.length>0&&<>
                  <div style={{fontSize:10,color:'#2a5030',letterSpacing:1.2,textTransform:'uppercase',fontWeight:700,marginBottom:7}}>Results</div>
                  {pr.map((r,ri)=>(
                    <div key={ri} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderTop:ri===0?'none':'1px solid #0e1810',fontSize:13}}>
                      <div style={{width:22,height:22,borderRadius:5,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,background:r.won?'#1a3820':r.drew?'#252510':'#2a1010',color:r.won?'#4caf78':r.drew?'#f5c542':'#c0504d'}}>{r.won?'W':r.drew?'D':'L'}</div>
                      <span style={{flex:1,fontWeight:600}}>{FLAGS[r.myTeam]||''} {r.myTeam}</span>
                      <span style={{color:'#223',fontSize:11}}>vs</span>
                      <span style={{flex:1}}>{FLAGS[r.oppTeam]||''} {r.oppTeam}</span>
                      <span style={{fontWeight:800,color:'#ccc',fontSize:15,minWidth:38,textAlign:'center'}}>{r.hg}–{r.ag}</span>
                      <div style={{background:r.won?'#1a3820':r.drew?'#252510':'#2a1010',border:`1px solid ${r.won?'#2d5a3d':r.drew?'#5a5020':'#5a2020'}`,borderRadius:5,padding:'2px 8px',fontSize:11,fontWeight:800,color:r.won?'#4caf78':r.drew?'#f5c542':'#c0504d'}}>+{r.won?3:r.drew?1:0}</div>
                    </div>
                  ))}
                </>}
                {pr.length===0&&<div style={{color:'#1a2a1a',fontSize:12,fontStyle:'italic'}}>No results yet</div>}
              </div>
            )}
          </div>
        );
      })}
      <UpcomingStrip fixtures={fixtures}/>
    </div>
  );
}

// ── RESULTS TAB ──────────────────────────────────────────────────────────────
function ResultsTab({results}) {
  if(!results.length) return <div style={{textAlign:'center',padding:'50px 20px'}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div style={{color:'#2a4a2a',fontSize:14}}>No results yet</div></div>;
  const byDate=results.reduce((acc,r)=>{const d=r.date||'?';if(!acc[d])acc[d]=[];acc[d].push(r);return acc;},{});
  const dates=Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
  return (
    <div>
      <div style={{fontSize:11,color:'#2a5a3a',fontWeight:600,marginBottom:12}}>{results.length} completed match{results.length!==1?'es':''}</div>
      {dates.map(date=>(
        <div key={date}>
          <div style={{fontSize:10,color:'#2a5030',letterSpacing:1.5,textTransform:'uppercase',fontWeight:700,marginBottom:7,marginTop:14,paddingLeft:10,borderLeft:'2px solid #1e3a22'}}>{fmtDate(date)}</div>
          {byDate[date].map((r,i)=>{
            const hP=TEAM_TO_PLAYER[r.home],aP=TEAM_TO_PLAYER[r.away];
            const hWon=r.hg>r.ag,draw=r.hg===r.ag,aWon=r.ag>r.hg;
            return (
              <div key={i} style={{background:'#0d1810',border:'1px solid #111a12',borderRadius:10,padding:'11px 13px',marginBottom:7}}>
                <div style={{display:'flex',alignItems:'center'}}>
                  <div style={{flex:1,textAlign:'right',paddingRight:6}}>
                    <div style={{fontWeight:700,fontSize:14,color:hWon?'#eee':draw?'#aaa':'#445'}}>{FLAGS[r.home]||''} {r.home}</div>
                    <div style={{fontSize:10,color:'#2a5030',marginTop:2}}>{hP||'—'}</div>
                  </div>
                  <div style={{padding:'4px 12px',fontSize:24,fontWeight:900,color:hWon?'#4caf78':draw?'#f5c542':'#c0504d',minWidth:72,textAlign:'center',letterSpacing:-1}}>{r.hg}–{r.ag}</div>
                  <div style={{flex:1,paddingLeft:6}}>
                    <div style={{fontWeight:700,fontSize:14,color:aWon?'#eee':draw?'#aaa':'#445'}}>{FLAGS[r.away]||''} {r.away}</div>
                    <div style={{fontSize:10,color:'#2a5030',marginTop:2}}>{aP||'—'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── FIXTURES TAB ──────────────────────────────────────────────────────────────
function FixturesTab({ fixtures }) {
  if (!fixtures.length) return <div style={{textAlign:'center',padding:50,color:'#334'}}>No upcoming fixtures found</div>;
  const byDate = fixtures.reduce((acc,f)=>{if(!acc[f.date])acc[f.date]=[];acc[f.date].push(f);return acc;},{});
  const dates = Object.keys(byDate).sort();
  return (
    <div>
      <div style={{fontSize:11,color:'#2a5a3a',fontWeight:600,marginBottom:12}}>{fixtures.length} upcoming matches</div>
      {dates.map(date=>(
        <div key={date}>
          <div style={{fontSize:10,color:'#2a5030',letterSpacing:1.5,textTransform:'uppercase',fontWeight:700,marginBottom:7,marginTop:14,paddingLeft:10,borderLeft:'2px solid #1e3a22'}}>{fmtDate(date)}</div>
          {byDate[date].map((f,i)=>{
            const hP=TEAM_TO_PLAYER[f.home], aP=TEAM_TO_PLAYER[f.away];
            const hasSweepstake = hP||aP;
            return (
              <div key={i} style={{background:hasSweepstake?'#0f1e12':'#0a1409',border:hasSweepstake?'1px solid #1a3020':'1px solid #0e1810',borderRadius:9,padding:'10px 12px',marginBottom:6}}>
                <div style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{flex:1,textAlign:'right',paddingRight:6}}>
                    <div style={{fontWeight:700,fontSize:13,color:hP?'#eee':'#667'}}>{FLAGS[f.home]||''} {f.home}</div>
                    {hP&&<div style={{fontSize:10,color:'#3a6a3a',marginTop:1}}>{hP}</div>}
                  </div>
                  <div style={{textAlign:'center',minWidth:62,flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#4caf78'}}>{fmtTime(f.time)}</div>
                    <div style={{fontSize:9,color:'#2a4a2a',marginTop:1}}>{f.group||''}</div>
                  </div>
                  <div style={{flex:1,paddingLeft:6}}>
                    <div style={{fontWeight:700,fontSize:13,color:aP?'#eee':'#667'}}>{FLAGS[f.away]||''} {f.away}</div>
                    {aP&&<div style={{fontSize:10,color:'#3a6a3a',marginTop:1}}>{aP}</div>}
                  </div>
                </div>
                {f.ground&&<div style={{textAlign:'center',fontSize:9,color:'#1e3020',marginTop:4}}>📍 {f.ground}</div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── GROUPS TAB ────────────────────────────────────────────────────────────────
function GroupsTab({ results, fixtures }) {
  const groupMembers = {};
  [...results,...fixtures].forEach(m=>{
    if(!m.group) return;
    if(!groupMembers[m.group]) groupMembers[m.group]=new Set();
    groupMembers[m.group].add(m.home||'');
    groupMembers[m.group].add(m.away||'');
  });
  const groupStandings = calcGroupStandings(results);
  const allGroups = Object.keys(groupMembers).sort();

  return (
    <div>
      {allGroups.map(group=>{
        const members = [...groupMembers[group]].filter(Boolean).sort();
        const standings = groupStandings[group] || [];
        const standingTeams = new Set(standings.map(s=>s.team));
        members.forEach(t=>{ if(!standingTeams.has(t)) standings.push({team:t,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}); });
        standings.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.team.localeCompare(b.team));

        return (
          <div key={group} style={{marginBottom:16,background:'#0d1810',border:'1px solid #111a12',borderRadius:10,overflow:'hidden'}}>
            <div style={{background:'#111f14',padding:'8px 12px',fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#4caf78',borderBottom:'1px solid #1a3020'}}>{group}</div>
            <div style={{padding:'6px 0'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 28px 22px 22px 22px 28px',padding:'3px 12px',fontSize:9,color:'#2a4a2a',letterSpacing:1,textTransform:'uppercase',fontWeight:600}}>
                <span>Team</span>
                <span style={{textAlign:'center'}}>P</span><span style={{textAlign:'center'}}>W</span>
                <span style={{textAlign:'center'}}>D</span><span style={{textAlign:'center'}}>L</span>
                <span style={{textAlign:'right'}}>Pts</span>
              </div>
              {standings.map((s,si)=>{
                const owner = TEAM_TO_PLAYER[s.team];
                const qualified = si < 2;
                return (
                  <div key={s.team} style={{display:'grid',gridTemplateColumns:'1fr 28px 22px 22px 22px 28px',padding:'6px 12px',alignItems:'center',borderTop:'1px solid #0e1810',background:qualified?'#0f1e12':'transparent'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      {qualified&&<div style={{width:2,height:20,background:'#4caf78',borderRadius:1,flexShrink:0}}/>}
                      <span style={{fontSize:13}}>{FLAGS[s.team]||'🏳'}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:'#ddd'}}>{s.team}</div>
                        {owner&&<div style={{fontSize:9,color:'#3a6a3a'}}>{owner}</div>}
                      </div>
                    </div>
                    <span style={{textAlign:'center',fontSize:11,color:'#445'}}>{s.p}</span>
                    <span style={{textAlign:'center',fontSize:11,color:s.w>0?'#4caf78':'#334'}}>{s.w}</span>
                    <span style={{textAlign:'center',fontSize:11,color:s.d>0?'#aaa':'#334'}}>{s.d}</span>
                    <span style={{textAlign:'center',fontSize:11,color:s.l>0?'#c0504d':'#334'}}>{s.l}</span>
                    <span style={{textAlign:'right',fontSize:13,fontWeight:800,color:s.pts>0?'#4caf78':'#2a3a2a'}}>{s.pts}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PICKS TAB (the seed-card view) ────────────────────────────────────────────
function PicksTab({ standings, results, goalscorers, expandedCard, setExpandedCard }) {
  return (
    <div>
      {standings.map((p,i)=>{
        const pr = getPlayerResults(p, results);
        const isLeader = i===0;
        const isExp = expandedCard===p.name;
        return (
          <div key={p.name} style={{background:isLeader?'linear-gradient(160deg,#1e4028,#142a1a)':'#0d1810',border:isLeader?'1px solid #2d5a3d':'1px solid #111a12',borderRadius:12,padding:'16px 16px',marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:15}}>{MEDAL[i]||<span style={{color:'#445',fontWeight:700,fontSize:13}}>{i+1}</span>}</span>
                <span style={{fontSize:18,fontWeight:900,color:isLeader?'#f5c542':'#f0f0f0'}}>{p.name}</span>
              </div>
              <div style={{textAlign:'right'}}>
                <span style={{fontSize:22,fontWeight:900,color:isLeader?'#f5c542':p.pts>0?'#4caf78':'#334'}}>{p.pts}</span>
                <span style={{fontSize:11,color:'#3a5a3a',marginLeft:4}}>pts</span>
              </div>
            </div>

            <div style={{marginBottom:10}}>
              {p.seeds.map(t=>(
                <div key={t} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',fontSize:13}}>
                  <span style={{background:'#2a2412',color:'#d4af37',fontSize:9,fontWeight:700,letterSpacing:0.5,textTransform:'uppercase',padding:'2px 7px',borderRadius:4,flexShrink:0}}>seed</span>
                  <span>{FLAGS[t]||'🏳'} {t}</span>
                </div>
              ))}
              {p.teams.map(t=>(
                <div key={t} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',fontSize:13,paddingLeft:p.seeds.length?52:0}}>
                  <span>{FLAGS[t]||'🏳'} {t}</span>
                </div>
              ))}
            </div>

            <div style={{borderTop:'1px solid #1a3020',paddingTop:10}}>
              <div style={{fontSize:10,color:'#3a6a3a',letterSpacing:1.2,textTransform:'uppercase',fontWeight:700,marginBottom:6}}>⚽ Golden Boot Picks</div>
              {p.goldenBoot.map((gb,gi)=>{
                const liveGoals = getLiveGoals(gb.player, goalscorers);
                return (
                  <div key={gi} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 0',fontSize:13}}>
                    <span style={{fontWeight:600}}>{gb.player} <span style={{color:'#3a5a3a',fontWeight:400}}>({gb.team})</span></span>
                    <span style={{background:liveGoals>0?'#1a3820':'#142018',border:`1px solid ${liveGoals>0?'#2d5a3d':'#223322'}`,borderRadius:5,padding:'2px 8px',fontSize:12,fontWeight:800,color:liveGoals>0?'#4caf78':'#445'}}>{liveGoals} ⚽</span>
                  </div>
                );
              })}
            </div>

            {isExp&&(
              <div style={{borderTop:'1px solid #1a3020',marginTop:10,paddingTop:10}}>
                <div style={{fontSize:10,color:'#3a6a3a',letterSpacing:1.2,textTransform:'uppercase',fontWeight:700,marginBottom:7}}>Match Results</div>
                {pr.length===0
                  ? <div style={{color:'#1a2a1a',fontSize:12,fontStyle:'italic'}}>No results yet</div>
                  : pr.map((r,ri)=>(
                    <div key={ri} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderTop:ri===0?'none':'1px solid #0e1810',fontSize:13}}>
                      <div style={{width:20,height:20,borderRadius:5,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,background:r.won?'#1a3820':r.drew?'#252510':'#2a1010',color:r.won?'#4caf78':r.drew?'#f5c542':'#c0504d'}}>{r.won?'W':r.drew?'D':'L'}</div>
                      {r.seed&&<span style={{background:'#2a2412',color:'#d4af37',fontSize:8,fontWeight:700,padding:'1px 5px',borderRadius:3}}>SEED</span>}
                      <span style={{flex:1,fontWeight:600}}>{FLAGS[r.myTeam]||''} {r.myTeam}</span>
                      <span style={{color:'#223',fontSize:11}}>vs</span>
                      <span style={{flex:1}}>{FLAGS[r.oppTeam]||''} {r.oppTeam}</span>
                      <span style={{fontWeight:800,color:'#ccc',fontSize:14,minWidth:34,textAlign:'center'}}>{r.hg}–{r.ag}</span>
                      <span style={{fontSize:11,fontWeight:800,color:r.won?'#4caf78':r.drew?'#f5c542':'#c0504d'}}>+{r.won?3:r.drew?1:0}</span>
                    </div>
                  ))
                }
              </div>
            )}
            <div onClick={()=>setExpandedCard(isExp?null:p.name)} style={{textAlign:'center',marginTop:10,fontSize:11,color:'#2a4a2a',cursor:'pointer'}}>
              {isExp ? '▲ hide results' : '▼ show results'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── GOLDEN BOOT TAB ────────────────────────────────────────────────────────────
function GoldenBootTab({ goalscorers }) {
  const allPicks = PLAYERS.flatMap(p => p.goldenBoot.map(gb => ({...gb, owner: p.name})));
  const enriched = allPicks.map(pick => ({ ...pick, goals: getLiveGoals(pick.player, goalscorers) })).sort((a,b)=>b.goals-a.goals);
  const topOverall = goalscorers.slice(0,10);

  return (
    <div>
      <div style={{fontSize:11,color:'#2a5a3a',fontWeight:600,marginBottom:14}}>Live golden boot race — sweepstake picks</div>
      {enriched.map((pick,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:i===0&&pick.goals>0?'linear-gradient(90deg,#1e4028,#182e1e)':'#0d1810',border:i===0&&pick.goals>0?'1px solid #2d5a3d':'1px solid #111a12',borderRadius:9,padding:'10px 12px',marginBottom:6}}>
          <span style={{fontSize:13,color:'#445',width:18,textAlign:'center'}}>{i+1}</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:i===0&&pick.goals>0?'#f5c542':'#eee'}}>{pick.player}</div>
            <div style={{fontSize:10,color:'#3a5a3a'}}>{FLAGS[pick.team]||''} {pick.team} · picked by {pick.owner}</div>
          </div>
          <div style={{textAlign:'center',background:pick.goals>0?'#1a3820':'#142018',border:`1px solid ${pick.goals>0?'#2d5a3d':'#223322'}`,borderRadius:8,padding:'6px 14px'}}>
            <div style={{fontSize:20,fontWeight:900,color:pick.goals>0?'#4caf78':'#445',lineHeight:1}}>{pick.goals}</div>
            <div style={{fontSize:8,color:'#3a5a3a',textTransform:'uppercase',letterSpacing:0.5}}>goals</div>
          </div>
        </div>
      ))}
      {topOverall.length>0 && (
        <div style={{marginTop:24}}>
          <div style={{fontSize:11,color:'#2a5a3a',fontWeight:600,marginBottom:10}}>📊 Tournament top scorers (all players)</div>
          <div style={{background:'#0d1810',border:'1px solid #111a12',borderRadius:9,padding:'4px 12px'}}>
            {topOverall.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderTop:i>0?'1px solid #111a12':'none',fontSize:13}}>
                <span style={{color:'#ccc'}}>{i+1}. {s.name} <span style={{color:'#3a5a3a',fontSize:11}}>({FLAGS[s.team]||''} {s.team})</span></span>
                <span style={{fontWeight:800,color:'#4caf78'}}>{s.goals}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [results, setResults]           = useState([]);
  const [fixtures, setFixtures]         = useState([]);
  const [goalscorers, setGoalscorers]   = useState([]);
  const [standings, setStandings]       = useState(calcStandings([]));
  const [loading, setLoading]           = useState(true);
  const [lastFetched, setLastFetched]   = useState(null);
  const [fetchError, setFetchError]     = useState(false);
  const [splashLeader, setSplashLeader] = useState(null);
  const [view, setView]                 = useState('table');
  const [expanded, setExpanded]         = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const prevLeaderName = useRef(undefined);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('/api/scores');
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const r = data.results || [];
      const f = data.fixtures || [];
      const gs = data.goalscorers || [];
      const newStandings = calcStandings(r);
      const newLeader = newStandings[0];
      setResults(r); setFixtures(f); setGoalscorers(gs); setStandings(newStandings);
      setLastFetched(new Date()); setFetchError(false);
      if (newLeader?.pts>0) {
        if (prevLeaderName.current===undefined||prevLeaderName.current!==newLeader.name) setSplashLeader(newLeader);
        prevLeaderName.current=newLeader.name;
      } else { prevLeaderName.current=null; }
    } catch { setFetchError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchScores(); const t=setInterval(fetchScores,REFRESH_MS); return()=>clearInterval(t); },[fetchScores]);

  const leader = standings[0];
  const fmtT = d => d?.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});

  const TABS = [['table','🏟 Table'],['results','📋 Results'],['fixtures','📅 Fixtures'],['groups','🌍 Groups'],['picks','🎯 Picks'],['boot','⚽ Golden Boot']];

  return (
    <div style={{minHeight:'100vh',background:'#0a1a0f',fontFamily:"'Inter','Helvetica Neue',sans-serif",color:'#f0f0f0',paddingBottom:80}}>
      {splashLeader&&<Splash leader={splashLeader} onDone={()=>setSplashLeader(null)}/>}

      <div style={{background:'linear-gradient(160deg,#0e2818 0%,#081408 100%)',borderBottom:'1px solid #1a3020',padding:'18px 16px 0'}}>
        <div style={{maxWidth:580,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
            <span style={{fontSize:28}}>⚽</span>
            <div>
              <div style={{fontSize:10,letterSpacing:3,textTransform:'uppercase',color:'#4caf78',fontWeight:700}}>FIFA World Cup 2026</div>
              <h1 style={{margin:0,fontSize:21,fontWeight:900,letterSpacing:-0.5}}>Golden Boot Sweepstake</h1>
            </div>
            <button onClick={fetchScores} style={{marginLeft:'auto',background:'transparent',border:'1px solid #2a4a32',borderRadius:6,color:'#4caf78',padding:'5px 10px',fontSize:12,cursor:'pointer',fontWeight:700}}>⟳</button>
          </div>

          {leader?.pts>0&&(
            <div onClick={()=>setSplashLeader(leader)} style={{background:'linear-gradient(90deg,#1c3d24,#142a1a)',border:'1px solid #2d5a3d',borderRadius:10,padding:'8px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
              <Avatar name={leader.name} size={40} isLeader={true}/>
              <div>
                <div style={{fontSize:10,color:'#4a7a5a',fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>👑 Leading</div>
                <div style={{fontSize:16,fontWeight:900,color:'#f5c542'}}>{leader.name}</div>
              </div>
              <div style={{marginLeft:'auto',textAlign:'right'}}>
                <div style={{fontSize:24,fontWeight:900,color:'#4caf78',lineHeight:1}}>{leader.pts}</div>
                <div style={{fontSize:10,color:'#4a7a5a'}}>points</div>
              </div>
            </div>
          )}

          <div style={{fontSize:10,color:'#1e3a1e',marginBottom:6,display:'flex',justifyContent:'space-between'}}>
            <span>{fetchError?'⚠️ Retrying…':loading?'🔄 Fetching…':lastFetched?`✅ Updated ${fmtT(lastFetched)}`:''}</span>
            <span style={{color:'#1a3018'}}>Auto-refresh every 5 min</span>
          </div>

          <div style={{display:'flex',overflowX:'auto'}}>
            {TABS.map(([k,l])=>(
              <button key={k} onClick={()=>setView(k)} style={{flex:'0 0 auto',padding:'10px 12px',fontSize:12,fontWeight:700,background:'transparent',border:'none',cursor:'pointer',color:view===k?'#4caf78':'#445',borderBottom:view===k?'2px solid #4caf78':'2px solid transparent',whiteSpace:'nowrap'}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:580,margin:'0 auto',padding:'14px 12px'}}>
        {loading
          ? <div style={{textAlign:'center',padding:60}}><style>{`@keyframes spin2{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style><div style={{fontSize:40,display:'inline-block',animation:'spin2 1.2s linear infinite',marginBottom:14}}>⚽</div><div style={{color:'#4caf78',fontWeight:600}}>Fetching live scores…</div></div>
          : view==='table'    ? <TableTab standings={standings} results={results} fixtures={fixtures} expanded={expanded} setExpanded={setExpanded}/>
          : view==='results'  ? <ResultsTab results={results}/>
          : view==='fixtures' ? <FixturesTab fixtures={fixtures}/>
          : view==='groups'   ? <GroupsTab results={results} fixtures={fixtures}/>
          : view==='picks'    ? <PicksTab standings={standings} results={results} goalscorers={goalscorers} expandedCard={expandedCard} setExpandedCard={setExpandedCard}/>
          :                     <GoldenBootTab goalscorers={goalscorers}/>
        }
      </div>
    </div>
  );
}
