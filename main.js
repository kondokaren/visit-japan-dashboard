
const fmtNum = (n) => n == null || Number.isNaN(n) ? '-' : new Intl.NumberFormat('ja-JP').format(Math.round(n));
const fmt1 = (n) => n == null || Number.isNaN(n) ? '-' : Number(n).toFixed(1);
const avg = (arr) => { const vals = arr.filter(v => v != null && !Number.isNaN(v)); return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null; };
const corr = (xs, ys) => {
  const pairs = xs.map((x,i)=>[x,ys[i]]).filter(([x,y]) => x != null && y != null && !Number.isNaN(x) && !Number.isNaN(y));
  if (pairs.length < 3) return null;
  const mx = pairs.reduce((s,p)=>s+p[0],0)/pairs.length;
  const my = pairs.reduce((s,p)=>s+p[1],0)/pairs.length;
  const num = pairs.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0);
  const denx = Math.sqrt(pairs.reduce((s,p)=>s+Math.pow(p[0]-mx,2),0));
  const deny = Math.sqrt(pairs.reduce((s,p)=>s+Math.pow(p[1]-my,2),0));
  return denx && deny ? num/(denx*deny) : null;
};
const fmtCorr = (n) => n == null || Number.isNaN(n) ? '-' : Number(n).toFixed(2);


function initControls() {
  const yearSel = document.getElementById('year');
  const monthSel = document.getElementById('month');
  years.forEach(y => { const o=document.createElement('option'); o.value=y; o.textContent=y; yearSel.appendChild(o); });
  months.forEach(m => { const o=document.createElement('option'); o.value=m; o.textContent=`${m}月`; monthSel.appendChild(o); });
  yearSel.value = years.includes(2015) ? '2015' : String(years[0]);
  monthSel.value = '1';
  document.getElementById('mode').addEventListener('change', toggleMonth);
  document.getElementById('updateBtn').addEventListener('click', renderAll);
  document.getElementById('climateX').addEventListener('change', renderAll);
  initTrendCountries();
  initResearchTabs();
  initResearchControls();
  toggleMonth();
}

function initTrendCountries() {
  const sel = document.getElementById('trendCountry');
  const latestYear = Math.max(...years);
  const countries = annualData.filter(d=>d.year===latestYear).sort((a,b)=>b.annualVisitors-a.annualVisitors);
  countries.forEach(c => { const o=document.createElement('option'); o.value=c.iso3; o.textContent=c.countryJP; sel.appendChild(o); });
  if (countries.length) sel.value = countries[0].iso3;
  sel.addEventListener('change', renderAll);
}

function toggleMonth() {
  const mode = document.getElementById('mode').value;
  document.getElementById('month').disabled = mode !== 'monthly';
  renderAll();
}

function getSlice() {
  const mode = document.getElementById('mode').value;
  const year = Number(document.getElementById('year').value);
  const month = Number(document.getElementById('month').value);
  const topn = Number(document.getElementById('topn').value);
  let rows;
  if (mode === 'annual') {
    rows = annualData.filter(d => d.year === year).sort((a,b)=>b.annualVisitors-a.annualVisitors);
  } else {
    rows = monthlyData.filter(d => d.year === year && d.month === month).sort((a,b)=>b.visitors-a.visitors);
  }
  return { mode, year, month, topn, rows };
}

function getJapanTemp(year, month=null) {
  if (month == null) return japanAnnualTemp[String(year)] ?? null;
  return japanMonthlyTemp[`${year}-${String(month).padStart(2,'0')}`] ?? null;
}

function renderStats(slice) {
  const { mode, rows, year, month } = slice;
  document.getElementById('statCountries').textContent = fmtNum(rows.length);
  if (mode === 'annual') {
    document.getElementById('statLabelVisitors').textContent = '年間訪日客数合計';
    document.getElementById('statLabelTemp').textContent = '日本の平均気温';
    document.getElementById('statVisitors').textContent = fmtNum(rows.reduce((s,r)=>s+(r.annualVisitors||0),0));
    document.getElementById('statTemp').textContent = fmt1(getJapanTemp(year)) + ' ℃';
  } else {
    document.getElementById('statLabelVisitors').textContent = '月間訪日客数合計';
    document.getElementById('statLabelTemp').textContent = '日本の平均気温';
    document.getElementById('statVisitors').textContent = fmtNum(rows.reduce((s,r)=>s+(r.visitors||0),0));
    document.getElementById('statTemp').textContent = fmt1(getJapanTemp(year, month)) + ' ℃';
  }
  document.getElementById('statPrecip').textContent = fmt1(avg(rows.map(r=>r.avgPrecipMM))) + ' mm/年';
}


function renderQuarterlySummary(slice) {
  const year = slice.year;
  const rows = annualData.filter(d => d.year === year);
  const quarterMonths = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [10, 11, 12]
  ];
  const totals = quarterMonths.map(ms => rows.reduce((sum, r) => {
    return sum + ms.reduce((mSum, m) => mSum + Number((r.months && r.months[String(m)]) || 0), 0);
  }, 0));
  document.getElementById('quarterNote').textContent = `${year}年の全対象国の四半期別合計訪日客数です。`;
  ['q1Visitors','q2Visitors','q3Visitors','q4Visitors'].forEach((id, i) => {
    document.getElementById(id).textContent = fmtNum(totals[i]);
  });
}

function renderMap(slice) {
  const { mode, year, month, rows } = slice;
  const z = mode === 'annual' ? rows.map(r=>r.annualVisitors) : rows.map(r=>r.visitors);
  const title = mode === 'annual'
    ? `${year}年 訪日外客数（年間合計）世界地図`
    : `${year}年${month}月 訪日外客数 世界地図`;
  const colorbarTitle = mode === 'annual' ? '年間訪日客数' : '月間訪日客数';
  document.getElementById('mapNote').textContent = colorbarTitle;
  const trace = {
    type:'choropleth',
    locations: rows.map(r=>r.iso3),
    z,
    text: rows.map(r => mode === 'annual'
      ? `${r.countryJP}<br>年間訪日客数: ${fmtNum(r.annualVisitors)}<br>平均気温: ${fmt1(r.annualAvgTempC)} ℃<br>平均降水量: ${fmt1(r.avgPrecipMM)} mm/年`
      : `${r.countryJP}<br>月間訪日客数: ${fmtNum(r.visitors)}<br>月平均気温: ${fmt1(r.monthlyAvgTempC)} ℃<br>平均降水量: ${fmt1(r.avgPrecipMM)} mm/年`
    ),
    hovertemplate: '%{text}<extra></extra>',
    colorscale: 'YlOrRd',
    marker: {line: {color:'white', width:0.4}},
    colorbar: {title: colorbarTitle}
  };
  const layout = {
    title: {text:title, x:0.02, xanchor:'left'},
    margin: {l:0,r:0,t:50,b:0},
    paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    geo: {projection: {type:'natural earth'}, showframe:false, showcoastlines:true, coastlinecolor:'white', bgcolor:'#ffffff'}
  };
  Plotly.newPlot('map', [trace], layout, {responsive:true, displayModeBar:true});
}

function renderTable(slice) {
  const { mode, topn, rows } = slice;
  document.getElementById('tableNote').textContent = `上位${topn}か国を表示しています。`;
  const topRows = rows.slice(0, topn);
  const thead = document.getElementById('thead');
  const tbody = document.getElementById('tbody');
  if (mode === 'annual') {
    thead.innerHTML = '<tr><th>順位</th><th>国名</th><th>年間訪日客数</th><th>平均気温(℃)</th><th>気温参照年</th><th>平均降水量(mm/年)</th></tr>';
    tbody.innerHTML = topRows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.countryJP}</td><td>${fmtNum(r.annualVisitors)}</td><td>${fmt1(r.annualAvgTempC)}</td><td>${r.annualTempRefYear ?? '-'}</td><td>${fmt1(r.avgPrecipMM)}</td></tr>`).join('');
  } else {
    thead.innerHTML = '<tr><th>順位</th><th>国名</th><th>月間訪日客数</th><th>月平均気温(℃)</th><th>気温参照年月</th><th>平均降水量(mm/年)</th></tr>';
    tbody.innerHTML = topRows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.countryJP}</td><td>${fmtNum(r.visitors)}</td><td>${fmt1(r.monthlyAvgTempC)}</td><td>${r.monthlyTempRef ?? '-'}</td><td>${fmt1(r.avgPrecipMM)}</td></tr>`).join('');
  }
}


function renderClimateAnalysis(slice) {
  const { mode, year, month, rows } = slice;
  const visitors = rows.map(r => mode === 'annual' ? r.annualVisitors : r.visitors);
  const temps = rows.map(r => mode === 'annual' ? r.annualAvgTempC : r.monthlyAvgTempC);
  const precips = rows.map(r => r.avgPrecipMM);
  document.getElementById('corrTemp').textContent = fmtCorr(corr(temps, visitors));
  document.getElementById('corrPrecip').textContent = fmtCorr(corr(precips, visitors));
  document.getElementById('corrN').textContent = fmtNum(rows.filter((r,i)=>visitors[i]!=null && (temps[i]!=null || precips[i]!=null)).length);

  const xType = document.getElementById('climateX').value;
  const x = xType === 'temp' ? temps : precips;
  const xTitle = xType === 'temp' ? (mode === 'annual' ? '平均気温（℃）' : '月平均気温（℃）') : '平均降水量（mm/年）';
  const valid = rows.map((r,i)=>({r, x:x[i], y:visitors[i]})).filter(d=>d.x != null && d.y != null && !Number.isNaN(d.x) && !Number.isNaN(d.y));
  const trace = {
    type:'scatter', mode:'markers',
    x: valid.map(d=>d.x), y: valid.map(d=>d.y),
    text: valid.map(d=>`${d.r.countryJP}<br>${xTitle}: ${fmt1(d.x)}<br>訪日客数: ${fmtNum(d.y)}`),
    hovertemplate:'%{text}<extra></extra>',
    marker:{size:11, opacity:0.75}
  };
  const title = mode === 'annual' ? `${year}年 ${xTitle} と訪日客数` : `${year}年${month}月 ${xTitle} と訪日客数`;
  Plotly.newPlot('climateScatter', [trace], {
    title:{text:title, x:0.02, xanchor:'left'},
    margin:{l:70,r:20,t:55,b:60}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    xaxis:{title:xTitle, zeroline:false}, yaxis:{title:'訪日客数', zeroline:false}
  }, {responsive:true, displayModeBar:true});
}

function renderTrendChart() {
  const iso = document.getElementById('trendCountry').value;
  const rows = annualData.filter(d=>d.iso3===iso).sort((a,b)=>a.year-b.year);
  if (!rows.length) return;
  const country = rows[0].countryJP;
  const visitorTrace = {
    type:'scatter', mode:'lines+markers', name:'年間訪日客数',
    x:rows.map(r=>r.year), y:rows.map(r=>r.annualVisitors), yaxis:'y1',
    hovertemplate:'%{x}年<br>訪日客数: %{y:,.0f}<extra></extra>'
  };
  const tempTrace = {
    type:'scatter', mode:'lines+markers', name:'平均気温（℃）',
    x:rows.map(r=>r.year), y:rows.map(r=>r.annualAvgTempC), yaxis:'y2',
    hovertemplate:'%{x}年<br>平均気温: %{y:.1f}℃<extra></extra>'
  };
  Plotly.newPlot('trendChart', [visitorTrace, tempTrace], {
    title:{text:`${country}: 訪日客数と平均気温の長期トレンド`, x:0.02, xanchor:'left'},
    margin:{l:70,r:70,t:55,b:60}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    xaxis:{title:'年'},
    yaxis:{title:'年間訪日客数', side:'left'},
    yaxis2:{title:'平均気温（℃）', overlaying:'y', side:'right', zeroline:false},
    legend:{orientation:'h', y:-0.2}
  }, {responsive:true, displayModeBar:true});
}


function initResearchTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
      renderAll();
    });
  });
}

function uniqueLatestCountries() {
  const latestYear = Math.max(...years);
  return annualData.filter(d=>d.year===latestYear).sort((a,b)=>b.annualVisitors-a.annualVisitors);
}

function fillCountrySelect(id, defaultIndex=0) {
  const sel = document.getElementById(id);
  if (!sel || sel.options.length) return;
  const countries = uniqueLatestCountries();
  countries.forEach(c => { const o=document.createElement('option'); o.value=c.iso3; o.textContent=c.countryJP; sel.appendChild(o); });
  if (countries.length) sel.value = countries[Math.min(defaultIndex, countries.length-1)].iso3;
  sel.addEventListener('change', renderAll);
}

function initResearchControls() {
  fillCountrySelect('compareA', 0);
  fillCountrySelect('compareB', 1);
  fillCountrySelect('forecastCountry', 0);
  fillCountrySelect('decompCountry', 0);
  // (eemdCountry is filled by initEEMD() so we can guarantee it runs even
  //  if the chain breaks earlier; do NOT call fillCountrySelect here.)
  const decomp = document.getElementById('decompCountry');
  if (decomp) decomp.addEventListener('change', renderAll);
  const end = document.getElementById('forecastEnd');
  if (end) end.addEventListener('change', renderAll);
}

function getClusterLabel(temp, precip) {
  if (temp >= 22 && precip >= 1500) return '高温多雨市場';
  if (temp >= 15 && precip < 1500) return '高温少雨市場';
  if (temp < 8) return '寒冷市場';
  return '温帯市場';
}

function kmeansCluster(rows, k=4, iterations=20) {
  const valid = rows.filter(r=>r.annualAvgTempC!=null && r.avgPrecipMM!=null && r.annualVisitors!=null);
  if (!valid.length) return [];
  const vals = valid.map(r=>[r.annualAvgTempC, r.avgPrecipMM, Math.log10(Math.max(1, r.annualVisitors))]);
  const mins = [0,1,2].map(j=>Math.min(...vals.map(v=>v[j])));
  const maxs = [0,1,2].map(j=>Math.max(...vals.map(v=>v[j])));
  const norm = vals.map(v=>v.map((x,j)=>(x-mins[j])/(maxs[j]-mins[j] || 1)));
  let centers = [0, Math.floor(norm.length*0.33), Math.floor(norm.length*0.66), norm.length-1].map(i=>norm[i].slice());
  let labels = new Array(norm.length).fill(0);
  for (let it=0; it<iterations; it++) {
    labels = norm.map(v => {
      let best=0, bestD=Infinity;
      centers.forEach((c,idx)=>{ const d=(v[0]-c[0])**2+(v[1]-c[1])**2+(v[2]-c[2])**2; if (d<bestD) { bestD=d; best=idx; } });
      return best;
    });
    centers = centers.map((c,idx)=>{
      const pts = norm.filter((_,i)=>labels[i]===idx);
      return pts.length ? [0,1,2].map(j=>avg(pts.map(p=>p[j]))) : c;
    });
  }
  return valid.map((r,i)=>({...r, cluster:labels[i]}));
}

function renderClimateSegments() {
  const latestYear = Math.max(...years);
  const rows = annualData.filter(d=>d.year===latestYear);
  const clustered = kmeansCluster(rows, 4);
  if (!clustered.length) return;
  const clusterNames = {};
  for (let c=0; c<4; c++) {
    const members = clustered.filter(r=>r.cluster===c);
    clusterNames[c] = members.length ? getClusterLabel(avg(members.map(r=>r.annualAvgTempC)), avg(members.map(r=>r.avgPrecipMM))) : `Cluster ${c+1}`;
  }
  const traces = [0,1,2,3].map(c=>{
    const m = clustered.filter(r=>r.cluster===c);
    return {type:'scatter', mode:'markers', name:`Cluster ${c+1}: ${clusterNames[c]}`,
      x:m.map(r=>r.annualAvgTempC), y:m.map(r=>r.avgPrecipMM),
      text:m.map(r=>`${r.countryJP}<br>訪日客数: ${fmtNum(r.annualVisitors)}<br>気温: ${fmt1(r.annualAvgTempC)} ℃<br>降水量: ${fmt1(r.avgPrecipMM)} mm`),
      hovertemplate:'%{text}<extra></extra>', marker:{size:m.map(r=>Math.max(8, Math.min(28, Math.log10(r.annualVisitors||1)*4))), opacity:0.78}
    };
  });
  Plotly.newPlot('clusterChart', traces, {
    title:{text:`${latestYear}年 市場セグメント分析`, x:0.02, xanchor:'left'},
    margin:{l:70,r:20,t:55,b:60}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    xaxis:{title:'平均気温（℃）'}, yaxis:{title:'平均降水量（mm/年）'}, legend:{orientation:'h', y:-0.25}
  }, {responsive:true, displayModeBar:true});
  document.getElementById('clusterSummary').innerHTML = [0,1,2,3].map(c=>{
    const m = clustered.filter(r=>r.cluster===c).sort((a,b)=>b.annualVisitors-a.annualVisitors);
    return `<tr><td>${c+1}</td><td>${clusterNames[c]}</td><td>${m.slice(0,8).map(r=>r.countryJP).join('、')}</td><td>${fmtNum(avg(m.map(r=>r.annualVisitors)))}</td></tr>`;
  }).join('');
}

function renderCountryComparison() {
  const a = document.getElementById('compareA')?.value;
  const b = document.getElementById('compareB')?.value;
  if (!a || !b) return;
  const build = iso => annualData.filter(d=>d.iso3===iso).sort((x,y)=>x.year-y.year);
  const ra = build(a), rb = build(b);
  if (!ra.length || !rb.length) return;
  Plotly.newPlot('compareVisitorsChart', [
    {type:'scatter', mode:'lines+markers', name:ra[0].countryJP, x:ra.map(r=>r.year), y:ra.map(r=>r.annualVisitors), hovertemplate:'%{x}年<br>%{y:,.0f}<extra></extra>'},
    {type:'scatter', mode:'lines+markers', name:rb[0].countryJP, x:rb.map(r=>r.year), y:rb.map(r=>r.annualVisitors), hovertemplate:'%{x}年<br>%{y:,.0f}<extra></extra>'}
  ], {title:{text:'年間訪日客数の比較', x:0.02, xanchor:'left'}, margin:{l:70,r:20,t:50,b:55}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff', xaxis:{title:'年'}, yaxis:{title:'年間訪日客数'}, legend:{orientation:'h', y:-0.2}}, {responsive:true, displayModeBar:true});
  Plotly.newPlot('compareClimateChart', [
    {type:'scatter', mode:'lines+markers', name:`${ra[0].countryJP} 気温`, x:ra.map(r=>r.year), y:ra.map(r=>r.annualAvgTempC), hovertemplate:'%{x}年<br>%{y:.1f}℃<extra></extra>'},
    {type:'scatter', mode:'lines+markers', name:`${rb[0].countryJP} 気温`, x:rb.map(r=>r.year), y:rb.map(r=>r.annualAvgTempC), hovertemplate:'%{x}年<br>%{y:.1f}℃<extra></extra>'}
  ], {title:{text:'気候トレンド（平均気温）の比較', x:0.02, xanchor:'left'}, margin:{l:70,r:20,t:50,b:55}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff', xaxis:{title:'年'}, yaxis:{title:'平均気温（℃）'}, legend:{orientation:'h', y:-0.2}}, {responsive:true, displayModeBar:true});
}

function linear予測(points, endYear) {
  const valid = points.filter(p=>p.y!=null && !Number.isNaN(p.y));
  const n = valid.length;
  if (n < 2) return [];
  const mx = avg(valid.map(p=>p.x));
  const my = avg(valid.map(p=>p.y));
  const b = valid.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0) / (valid.reduce((s,p)=>s+(p.x-mx)**2,0) || 1);
  const a = my - b*mx;
  const lastYear = Math.max(...valid.map(p=>p.x));
  const out = [];
  for (let y=lastYear+1; y<=endYear; y++) out.push({x:y, y:Math.max(0, a+b*y)});
  return out;
}

function render予測() {
  const iso = document.getElementById('forecastCountry')?.value;
  const endYear = Number(document.getElementById('forecastEnd')?.value || 2030);
  if (!iso) return;
  const rows = annualData.filter(d=>d.iso3===iso).sort((a,b)=>a.year-b.year);
  if (rows.length < 2) return;
  const country = rows[0].countryJP;
  const hist = rows.map(r=>({x:r.year, y:r.annualVisitors}));
  const fc = linear予測(hist, endYear);
  Plotly.newPlot('forecastChart', [
    {type:'scatter', mode:'lines+markers', name:'実績', x:hist.map(p=>p.x), y:hist.map(p=>p.y), hovertemplate:'%{x}年<br>%{y:,.0f}<extra></extra>'},
    {type:'scatter', mode:'lines+markers', name:'予測', x:fc.map(p=>p.x), y:fc.map(p=>p.y), line:{dash:'dash'}, hovertemplate:'%{x}年<br>予測: %{y:,.0f}<extra></extra>'}
  ], {title:{text:`${country}: 2027–${endYear} 訪日客数予測`, x:0.02, xanchor:'left'}, margin:{l:70,r:20,t:55,b:60}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff', xaxis:{title:'年'}, yaxis:{title:'年間訪日客数'}, legend:{orientation:'h', y:-0.2}}, {responsive:true, displayModeBar:true});
  document.getElementById('forecastTable').innerHTML = fc.map(p=>`<tr><td>${p.x}</td><td>${fmtNum(Math.round(p.y))}</td></tr>`).join('');
}

function monthlyTotalsForYear(year) {
  const rows = annualData.filter(d => d.year === year);
  return Array.from({length:12}, (_, i) => rows.reduce((sum, r) => sum + Number((r.months && r.months[String(i+1)]) || 0), 0));
}

function renderSeasonalityPanel(slice) {
  const year = slice.year;
  const totals = monthlyTotalsForYear(year);
  const totalSum = totals.reduce((a,b)=>a+b,0) || 1;
  const peakIdx = totals.indexOf(Math.max(...totals));
  const lowIdx = totals.indexOf(Math.min(...totals));
  document.getElementById('seasonPeakMonth').textContent = `${peakIdx+1}月`;
  document.getElementById('seasonLowMonth').textContent = `${lowIdx+1}月`;
  document.getElementById('seasonPeakShare').textContent = ((totals[peakIdx]/totalSum)*100).toFixed(1) + '%';
  Plotly.newPlot('seasonalityChart', [{
    type:'bar', x:[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>`${m}月`), y:totals,
    text:totals.map(v=>fmtNum(v)), textposition:'outside', marker:{color:'#1f5fbf'}
  }], {
    title:{text:`${year}年 月別訪日客数合計`, x:0.02, xanchor:'left'},
    margin:{l:60,r:20,t:55,b:50}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    xaxis:{title:'月'}, yaxis:{title:'訪日客数'}
  }, {responsive:true, displayModeBar:true});
  document.getElementById('seasonalityTable').innerHTML = totals.map((v, i)=>`<tr><td>${i+1}月</td><td>${fmtNum(v)}</td><td>${((v/totalSum)*100).toFixed(1)}%</td></tr>`).join('');
}

function findPeakSeasonRange(totals) {
  const mean = totals.reduce((a,b)=>a+b,0) / (totals.length || 1);
  const flags = totals.map(v => v >= mean);
  let best = null;
  let i = 0;
  while (i < flags.length) {
    if (!flags[i]) { i++; continue; }
    let j = i;
    let sum = 0;
    while (j < flags.length && flags[j]) { sum += totals[j]; j++; }
    const len = j - i;
    if (!best || len > best.len || (len === best.len && sum > best.sum)) best = {start:i, end:j-1, len, sum, mean};
    i = j;
  }
  if (!best) {
    const maxIdx = totals.indexOf(Math.max(...totals));
    best = {start:maxIdx, end:maxIdx, len:1, sum:totals[maxIdx], mean};
  }
  return best;
}

function renderPeakSeasonPanel(slice) {
  const year = slice.year;
  const totals = monthlyTotalsForYear(year);
  const totalSum = totals.reduce((a,b)=>a+b,0) || 1;
  const info = findPeakSeasonRange(totals);
  const mean = info.mean;
  document.getElementById('peakStartMonth').textContent = `${info.start+1}月`;
  document.getElementById('peakEndMonth').textContent = `${info.end+1}月`;
  document.getElementById('peakShare').textContent = ((info.sum/totalSum)*100).toFixed(1) + '%';
  document.getElementById('peakSeasonNote').textContent = `${year}年では、観光客が多い時期は ${info.start+1}月 から ${info.end+1}月 です。`;
  const months = Array.from({length:12}, (_, i)=>`${i+1}月`);
  const colors = totals.map((_, i)=> (i >= info.start && i <= info.end) ? '#e85d04' : '#9bbcf3');
  Plotly.newPlot('peakSeasonChart', [
    {type:'bar', x:months, y:totals, marker:{color:colors}, text:totals.map(v=>fmtNum(v)), textposition:'outside', name:'訪日客数'},
    {type:'scatter', x:months, y:months.map(()=>mean), mode:'lines', line:{dash:'dash', color:'#333'}, name:'月平均'}
  ], {
    title:{text:`${year}年 人気時期の判定`, x:0.02, xanchor:'left'},
    margin:{l:60,r:20,t:55,b:50}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    xaxis:{title:'月'}, yaxis:{title:'訪日客数'}, barmode:'group'
  }, {responsive:true, displayModeBar:true});
  document.getElementById('peakSeasonTable').innerHTML = totals.map((v, i)=>`<tr><td>${i+1}月</td><td>${fmtNum(v)}</td><td>${(v/mean).toFixed(2)}倍</td><td>${(i>=info.start && i<=info.end) ? '人気時期' : '通常期'}</td></tr>`).join('');
}

function renderConcentrationPanel(slice) {
  const rows = slice.rows.slice().sort((a,b)=>(slice.mode==='annual' ? b.annualVisitors-a.annualVisitors : b.visitors-a.visitors));
  const valueKey = slice.mode === 'annual' ? 'annualVisitors' : 'visitors';
  const total = rows.reduce((s,r)=>s+(Number(r[valueKey])||0),0) || 1;
  const shares = rows.map(r => ({...r, share:(Number(r[valueKey])||0)/total}));
  const hhi = shares.reduce((s,r)=>s+(r.share*100)**2,0);
  document.getElementById('concTop1').textContent = ((shares[0]?.share || 0)*100).toFixed(1) + '%';
  document.getElementById('concTop5').textContent = (shares.slice(0,5).reduce((s,r)=>s+r.share,0)*100).toFixed(1) + '%';
  document.getElementById('concHHI').textContent = hhi.toFixed(0);
  const top10 = shares.slice(0,10);
  Plotly.newPlot('concentrationChart', [{
    type:'bar', x:top10.map(r=>r.countryJP), y:top10.map(r=>r.share*100), marker:{color:'#ff8c42'},
    text:top10.map(r=>(r.share*100).toFixed(1)+'%'), textposition:'outside'
  }], {
    title:{text:`${slice.mode==='annual' ? `${slice.year}年` : `${slice.year}年${slice.month}月`} 上位市場シェア`, x:0.02, xanchor:'left'},
    margin:{l:50,r:20,t:55,b:80}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    xaxis:{title:'国'}, yaxis:{title:'シェア(%)'}
  }, {responsive:true, displayModeBar:true});
  document.getElementById('concentrationTable').innerHTML = shares.slice(0,15).map((r,i)=>`<tr><td>${i+1}</td><td>${r.countryJP}</td><td>${fmtNum(r[valueKey])}</td><td>${(r.share*100).toFixed(1)}%</td></tr>`).join('');
}

function renderStabilityPanel(slice) {
  const year = slice.year;
  const rows = annualData.filter(d => d.year === year);
  const byCountry = rows.map(r => {
    const vals = Array.from({length:12}, (_, i)=>Number((r.months && r.months[String(i+1)]) || 0));
    const mean = vals.reduce((a,b)=>a+b,0) / (vals.length || 1);
    const sd = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0) / (vals.length || 1));
    const cv = mean ? sd / mean : 0;
    const peakVal = Math.max(...vals), lowVal = Math.min(...vals);
    const peakMonth = vals.indexOf(peakVal) + 1, lowMonth = vals.indexOf(lowVal) + 1;
    return {countryJP:r.countryJP, cv, peakMonth, lowMonth, ratio: lowVal ? peakVal/lowVal : null};
  }).sort((a,b)=>b.cv-a.cv);
  const peakCounts = Array.from({length:12}, (_, i)=>byCountry.filter(r=>r.peakMonth===i+1).length);
  const commonPeak = peakCounts.indexOf(Math.max(...peakCounts)) + 1;
  document.getElementById('stableTopCountry').textContent = byCountry[0]?.countryJP || '-';
  document.getElementById('stableTopCV').textContent = byCountry[0] ? byCountry[0].cv.toFixed(2) : '-';
  document.getElementById('stableCommonPeak').textContent = `${commonPeak}月`;
  const top10 = byCountry.slice(0,10).reverse();
  Plotly.newPlot('stabilityChart', [{
    type:'bar', orientation:'h', y:top10.map(r=>r.countryJP), x:top10.map(r=>r.cv), marker:{color:'#6f42c1'}, text:top10.map(r=>r.cv.toFixed(2)), textposition:'outside'
  }], {
    title:{text:`${year}年 年内変動性ランキング`, x:0.02, xanchor:'left'},
    margin:{l:90,r:25,t:55,b:40}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    xaxis:{title:'変動係数 (CV)'}, yaxis:{title:'国'}
  }, {responsive:true, displayModeBar:true});
  document.getElementById('stabilityTable').innerHTML = byCountry.slice(0,15).map(r=>`<tr><td>${r.countryJP}</td><td>${r.cv.toFixed(2)}</td><td>${r.peakMonth}月</td><td>${r.lowMonth}月</td><td>${r.ratio ? r.ratio.toFixed(1) : '-'}</td></tr>`).join('');
}

function renderResearchExtras(slice) {
  renderClimateSegments();
  renderCountryComparison();
  render予測();
  renderSeasonalityPanel(slice);
  renderPeakSeasonPanel(slice);
  renderConcentrationPanel(slice);
  renderStabilityPanel(slice);
  renderTimeSeriesDecomposition();
  renderEEMD();
}



// ── Time Series Decomposition ──────────────────────────
function getCountryMonthlySeries(iso) {
  const rows = annualData.filter(d=>d.iso3===iso).sort((a,b)=>a.year-b.year);
  const series = [];
  rows.forEach(r => {
    months.forEach(m => {
      const v = r.months ? Number(r.months[String(m)] || 0) : 0;
      series.push({year:r.year, month:m, label:`${r.year}-${String(m).padStart(2,'0')}`, value:v, countryJP:r.countryJP});
    });
  });
  return series.filter(d=>d.value!=null && !Number.isNaN(d.value));
}

function movingAverage(vals, window=12) {
  const half = Math.floor(window/2);
  return vals.map((_, i) => {
    const start = Math.max(0, i-half);
    const end = Math.min(vals.length, i+half);
    const part = vals.slice(start, end).filter(v=>v!=null && !Number.isNaN(v));
    return part.length ? part.reduce((a,b)=>a+b,0)/part.length : null;
  });
}

function variance(vals) {
  const v = vals.filter(x=>x!=null && !Number.isNaN(x));
  if (!v.length) return 0;
  const m = v.reduce((a,b)=>a+b,0)/v.length;
  return v.reduce((s,x)=>s+(x-m)**2,0)/v.length;
}

function decomposeSeries(series) {
  const observed = series.map(d=>d.value);
  const trend = movingAverage(observed, 12);
  const detrended = observed.map((v,i)=>v - (trend[i] ?? 0));
  const seasonalByMonth = {};
  months.forEach(m => {
    const vals = detrended.filter((_,i)=>series[i].month===m);
    seasonalByMonth[m] = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  });
  const seasonal = series.map(d=>seasonalByMonth[d.month] || 0);
  const residual = observed.map((v,i)=>v - (trend[i] ?? 0) - seasonal[i]);
  const obsVar = variance(observed) || 1;
  return {
    observed, trend, seasonal, residual,
    trendStrength: Math.min(100, Math.max(0, variance(trend)/obsVar*100)),
    seasonStrength: Math.min(100, Math.max(0, variance(seasonal)/obsVar*100)),
    residualStrength: Math.min(100, Math.max(0, variance(residual)/obsVar*100))
  };
}

function renderTimeSeriesDecomposition() {
  const sel = document.getElementById('decompCountry');
  if (!sel) return;
  const iso = sel.value;
  const series = getCountryMonthlySeries(iso);
  if (series.length < 24) return;
  const countryName = series[0].countryJP;
  const d = decomposeSeries(series);
  const labels = series.map(x=>x.label);
  const commonLayout = title => ({
    title:{text:title, x:0.02, xanchor:'left'},
    margin:{l:70,r:25,t:55,b:60}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    xaxis:{title:'年月'}, yaxis:{title:'訪日客数'}, showlegend:false
  });
  const line = (y, name) => [{type:'scatter', mode:'lines', x:labels, y, name, hovertemplate:'%{x}<br>%{y:,.0f}<extra></extra>'}];
  Plotly.newPlot('decompObservedChart', line(d.observed, 'Observed'), commonLayout(`${countryName}: 観測値`), {responsive:true, displayModeBar:true});
  Plotly.newPlot('decompTrendChart', line(d.trend, 'Trend'), commonLayout(`${countryName}: トレンド`), {responsive:true, displayModeBar:true});
  Plotly.newPlot('decompSeasonalChart', line(d.seasonal, 'Seasonal'), commonLayout(`${countryName}: 季節性`), {responsive:true, displayModeBar:true});
  Plotly.newPlot('decompResidualChart', line(d.residual, 'Residual'), commonLayout(`${countryName}: 残差`), {responsive:true, displayModeBar:true});

  document.getElementById('decompTrendStrength').textContent = fmt1(d.trendStrength) + '%';
  document.getElementById('decompSeasonStrength').textContent = fmt1(d.seasonStrength) + '%';
  document.getElementById('decompResidualStrength').textContent = fmt1(d.residualStrength) + '%';

  Plotly.newPlot('decompStrengthChart', [{
    type:'bar', orientation:'h',
    y:['トレンド','季節性','残差'],
    x:[d.trendStrength, d.seasonStrength, d.residualStrength],
    text:[d.trendStrength, d.seasonStrength, d.residualStrength].map(v=>fmt1(v)+'%'), textposition:'outside'
  }], {
    title:{text:`${countryName}: 成分強度`, x:0.02, xanchor:'left'},
    margin:{l:90,r:40,t:55,b:45}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    xaxis:{title:'説明力（%）', range:[0, Math.max(100, d.trendStrength, d.seasonStrength, d.residualStrength)*1.15]}, yaxis:{title:''}
  }, {responsive:true, displayModeBar:true});

  const type = d.trendStrength >= d.seasonStrength && d.trendStrength >= d.residualStrength ? 'トレンド主導型市場' :
               d.seasonStrength >= d.trendStrength && d.seasonStrength >= d.residualStrength ? '季節性主導型市場' : '不規則変動型市場';
  const lastTrend = d.trend[d.trend.length-1] || 0;
  const firstTrend = d.trend[0] || 0;
  const trendDirection = lastTrend > firstTrend*1.15 ? '増加傾向' : lastTrend < firstTrend*0.85 ? '減少傾向' : '横ばい傾向';
  const bestMonth = months.map(m=>({m, val: d.seasonal.filter((_,i)=>series[i].month===m).reduce((a,b)=>a+b,0) / Math.max(1, d.seasonal.filter((_,i)=>series[i].month===m).length)})).sort((a,b)=>b.val-a.val)[0];
  const worstMonth = months.map(m=>({m, val: d.seasonal.filter((_,i)=>series[i].month===m).reduce((a,b)=>a+b,0) / Math.max(1, d.seasonal.filter((_,i)=>series[i].month===m).length)})).sort((a,b)=>a.val-b.val)[0];
  const insights = [
    `🤖 <strong>${countryName}</strong> は <strong>${type}</strong> と判定できます。`,
    `📈 長期トレンドは <strong>${trendDirection}</strong> です。季節ノイズを除いた本当の成長方向を確認できます。`,
    `📅 季節性では <strong>${bestMonth.m}月</strong> が強く、<strong>${worstMonth.m}月</strong> が弱い傾向です。`,
    `🔎 残差が大きい場合、COVID-19、航空便制限、円安、イベントなどの外部ショックを詳しく調べる価値があります。`
  ];
  document.getElementById('decompInsights').innerHTML = insights.map(x=>`<li>${x}</li>`).join('');
}

// ── Advanced Research Indicators ──────────────────────────

function corrPair(ax, ay) {
  const valid = ax.map((x,i)=>({x,y:ay[i]})).filter(d=>d.x!=null&&d.y!=null&&!Number.isNaN(d.x)&&!Number.isNaN(d.y));
  if (valid.length < 3) return null;
  const mx=avg(valid.map(d=>d.x)), my=avg(valid.map(d=>d.y));
  const num=valid.reduce((s,d)=>s+(d.x-mx)*(d.y-my),0);
  const den=Math.sqrt(valid.reduce((s,d)=>s+(d.x-mx)**2,0)*valid.reduce((s,d)=>s+(d.y-my)**2,0));
  return den ? num/den : null;
}

function computeCV(monthsObj) {
  const vals = Array.from({length:12},(_,i)=>Number(monthsObj[String(i+1)]||0));
  const mean = vals.reduce((a,b)=>a+b,0)/12;
  const sd = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/12);
  return mean ? sd/mean : 0;
}

function getYoYGrowth(iso, year) {
  const curr = annualData.find(d=>d.iso3===iso&&d.year===year);
  const prev = annualData.find(d=>d.iso3===iso&&d.year===year-1);
  if (!curr||!prev||!prev.annualVisitors) return null;
  return (curr.annualVisitors - prev.annualVisitors) / prev.annualVisitors * 100;
}

function getCovidRecovery(iso, year) {
  const base = annualData.find(d=>d.iso3===iso&&d.year===2019);
  const curr = annualData.find(d=>d.iso3===iso&&d.year===year);
  if (!base||!curr||!base.annualVisitors) return null;
  return curr.annualVisitors / base.annualVisitors * 100;
}

function getClimateSimilarity(iso, year) {
  const jpTemp = japanAnnualTemp[String(year)];
  if (jpTemp == null) return null;
  const row = annualData.find(d=>d.iso3===iso&&d.year===year);
  if (!row||row.annualAvgTempC==null) return null;
  const diff = Math.abs(row.annualAvgTempC - jpTemp);
  return Math.max(0, 100 - diff * 4);
}

function computeOpportunityScore(iso, year) {
  const growth = getYoYGrowth(iso, year);
  const recovery = getCovidRecovery(iso, year);
  const row = annualData.find(d=>d.iso3===iso&&d.year===year);
  const seasonality = (row && row.months) ? computeCV(row.months) : null;
  const similarity = getClimateSimilarity(iso, year);
  let score = 0; let parts = 0;
  if (growth != null)     { score += Math.min(100, Math.max(0, (growth + 50) / 1.5)); parts++; }
  if (recovery != null)   { score += Math.min(100, recovery); parts++; }
  if (seasonality != null){ score += Math.min(100, 100 - seasonality * 60); parts++; }
  if (similarity != null) { score += similarity; parts++; }
  return parts ? score / parts : null;
}

function renderAdvancedIndicators(slice) {
  const { year } = slice;
  document.getElementById('advancedYearNote').textContent =
    `${year}年を基準に、前年比成長率・季節性・COVID回復率（vs 2019年）・気候類似度・機会スコアを自動計算しています。`;

  const rows = annualData.filter(d=>d.year===year);
  if (!rows.length) return;

  // Per-country scores
  const scored = rows.map(r => {
    const iso = r.iso3;
    const growth = getYoYGrowth(iso, year);
    const recovery = getCovidRecovery(iso, year);
    const cv = r.months ? computeCV(r.months) : null;
    const similarity = getClimateSimilarity(iso, year);
    const score = computeOpportunityScore(iso, year);
    return { ...r, growth, recovery, cv, similarity, score };
  }).filter(r=>r.score!=null).sort((a,b)=>(b.score||0)-(a.score||0));

  // Mini-stats
  const topGrowth = [...scored].filter(r=>r.growth!=null).sort((a,b)=>b.growth-a.growth)[0];
  const topSeason = [...scored].filter(r=>r.cv!=null).sort((a,b)=>b.cv-a.cv)[0];
  const topRecovery = [...scored].filter(r=>r.recovery!=null).sort((a,b)=>b.recovery-a.recovery)[0];
  document.getElementById('topGrowthMarket').textContent    = topGrowth   ? `${topGrowth.countryJP}  +${fmt1(topGrowth.growth)}%`   : '-';
  document.getElementById('topSeasonMarket').textContent    = topSeason   ? `${topSeason.countryJP}  CV ${topSeason.cv.toFixed(2)}`   : '-';
  document.getElementById('topRecoveryMarket').textContent  = topRecovery ? `${topRecovery.countryJP}  ${fmt1(topRecovery.recovery)}%` : '-';
  document.getElementById('topOpportunityMarket').textContent = scored[0] ? scored[0].countryJP : '-';
  document.getElementById('opportunityNote').textContent =
    `${year}年 vs ${year-1}年 の成長率・季節性（CV）・2019年比回復率・気候類似度（日本との気温差）を 0–100 に正規化して合算した総合スコアです。`;

  // Opportunity table
  const maxScore = scored[0]?.score || 1;
  document.getElementById('opportunityTable').innerHTML = scored.slice(0, 20).map((r, i) => {
    const barW = Math.round((r.score / maxScore) * 80);
    return `<tr>
      <td>${i+1}</td>
      <td>${r.countryJP}</td>
      <td>${r.growth!=null ? (r.growth>0?'+':'')+fmt1(r.growth)+'%' : '-'}</td>
      <td>${r.cv!=null ? r.cv.toFixed(2) : '-'}</td>
      <td>${r.recovery!=null ? fmt1(r.recovery)+'%' : '-'}</td>
      <td>${r.similarity!=null ? fmt1(r.similarity) : '-'}</td>
      <td><span class="score-bar" style="width:${barW}px"></span>${fmt1(r.score)}</td>
    </tr>`;
  }).join('');

  // Correlation Matrix (heatmap)
  const visitors  = rows.map(r=>r.annualVisitors);
  const temps     = rows.map(r=>r.annualAvgTempC);
  const precips   = rows.map(r=>r.avgPrecipMM);
  const labels    = ['訪日客数','気温','降水量'];
  const series    = [visitors, temps, precips];
  const zvals = [];
  for (let a=0;a<3;a++){
    const row=[];
    for (let b=0;b<3;b++){
      const c = (a===b) ? 1.0 : corrPair(series[a], series[b]);
      row.push(c != null ? parseFloat(c.toFixed(3)) : null);
    }
    zvals.push(row);
  }
  Plotly.newPlot('correlationMatrix', [{
    type:'heatmap', z:zvals, x:labels, y:labels,
    colorscale:'RdBu', zmin:-1, zmax:1,
    text:zvals.map(r=>r.map(v=>v!=null?v.toFixed(2):'n/a')),
    texttemplate:'%{text}', textfont:{size:14}
  }], {
    title:{text:`${year}年 相関マトリクス`, x:0.02, xanchor:'left'},
    margin:{l:70,r:20,t:55,b:60}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    width:null, height:380
  }, {responsive:true, displayModeBar:false});

  // Growth Chart
  const topGrowthList = [...scored].filter(r=>r.growth!=null).sort((a,b)=>b.growth-a.growth).slice(0,12).reverse();
  Plotly.newPlot('growthChart', [{
    type:'bar', orientation:'h',
    y:topGrowthList.map(r=>r.countryJP), x:topGrowthList.map(r=>r.growth),
    marker:{color:topGrowthList.map(r=>r.growth>=0?'#1f5fbf':'#e85d04')},
    text:topGrowthList.map(r=>(r.growth>=0?'+':'')+fmt1(r.growth)+'%'), textposition:'outside'
  }], {
    title:{text:`${year}年 前年比成長率（上位12か国）`, x:0.02, xanchor:'left'},
    margin:{l:90,r:40,t:55,b:40}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
    xaxis:{title:'前年比成長率 (%)', zeroline:true}, yaxis:{title:''}
  }, {responsive:true, displayModeBar:true});

  // COVID Recovery Chart (vs 2019)
  if (year > 2019) {
    const recRows = rows.filter(r=>getCovidRecovery(r.iso3, year)!=null)
      .map(r=>({...r, rec:getCovidRecovery(r.iso3, year)}))
      .sort((a,b)=>b.rec-a.rec).slice(0,15).reverse();
    Plotly.newPlot('recoveryChart', [{
      type:'bar', orientation:'h',
      y:recRows.map(r=>r.countryJP), x:recRows.map(r=>r.rec),
      marker:{color:recRows.map(r=>r.rec>=100?'#2d9f4e':'#f4a226')},
      text:recRows.map(r=>fmt1(r.rec)+'%'), textposition:'outside'
    }, {
      type:'scatter', mode:'lines', name:'2019年=100%',
      x:[100,100], y:[recRows[0]?.countryJP, recRows[recRows.length-1]?.countryJP],
      line:{dash:'dash', color:'#333', width:1.5}
    }], {
      title:{text:`${year}年 COVID回復指標（2019年比）`, x:0.02, xanchor:'left'},
      margin:{l:90,r:40,t:55,b:40}, paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
      xaxis:{title:'2019年比 (%)', zeroline:true}, yaxis:{title:''}, showlegend:false
    }, {responsive:true, displayModeBar:true});
  } else {
    document.getElementById('recoveryChart').innerHTML = `<div style="padding:40px; color:var(--muted); text-align:center;">2020年以降のデータを選択すると COVID 回復指標が表示されます。</div>`;
  }

  // AI Insights
  const insights = [];
  if (topGrowth) insights.push(`📈 ${year}年に最も成長した市場は <strong>${topGrowth.countryJP}</strong>（前年比 +${fmt1(topGrowth.growth)}%）です。`);
  const visitors2019 = annualData.filter(d=>d.year===2019).reduce((s,r)=>s+r.annualVisitors,0);
  const visitorsNow  = rows.reduce((s,r)=>s+r.annualVisitors,0);
  if (visitors2019 && year > 2019) {
    const rec = visitorsNow/visitors2019*100;
    insights.push(`🦠 ${year}年の全対象国合計訪日客数は 2019年比 ${fmt1(rec)}%${rec>=100?'（コロナ前水準回復）':'（回復中）'} です。`);
  }
  if (topSeason) insights.push(`📅 年内の需要変動が最も大きい市場は <strong>${topSeason.countryJP}</strong>（CV = ${topSeason.cv.toFixed(2)}）です。特定月への集中度が高く、プロモーション戦略の余地があります。`);
  const jpTemp = japanAnnualTemp[String(year)];
  if (jpTemp != null) insights.push(`🌡️ ${year}年の日本の平均気温は ${fmt1(jpTemp)} ℃ です。気候類似度は気温差に基づいて計算しています。`);
  const topSim = [...scored].filter(r=>r.similarity!=null).sort((a,b)=>b.similarity-a.similarity)[0];
  if (topSim) insights.push(`🌍 ${year}年に気候的に日本と最も類似した市場は <strong>${topSim.countryJP}</strong>（類似度スコア ${fmt1(topSim.similarity)}）です。`);
  const corrTV = corrPair(visitors, temps);
  if (corrTV != null) insights.push(`🔗 ${year}年、出発国の気温と訪日客数の相関係数は <strong>${corrTV.toFixed(3)}</strong> です${Math.abs(corrTV)>0.5 ? '（中程度以上の相関）' : '（弱い相関）'}。`);
  document.getElementById('autoInsights').innerHTML = insights.map(t=>`<li>${t}</li>`).join('') || '<li>データが不足しています。</li>';
}

function renderAll() {
  const slice = getSlice();
  renderStats(slice);
  renderQuarterlySummary(slice);
  renderMap(slice);
  renderTable(slice);
  renderClimateAnalysis(slice);
  renderTrendChart();
  renderResearchExtras(slice);
  renderAdvancedIndicators(slice);
}

initControls();
// Ensure the EEMD country selector is populated IMMEDIATELY after initControls
// (and before any further renders) so it can never be empty on first display.
initEEMD();
if (typeof renderAll === 'function') {
  try { renderAll(); } catch (e) { console.warn('post-init renderAll:', e); }
}


// ── EEMD Library (Ensemble Empirical Mode Decomposition) ────────────────
// Natural cubic spline interpolation (Thomas algorithm)
const _splineAt = (xs, ys, xq) => {
  const n = xs.length;
  if (n < 2) return ys[0] || 0;
  if (n === 2) {
    const t = Math.max(0, Math.min(1, (xq - xs[0]) / ((xs[1] - xs[0]) || 1)));
    return ys[0] + t * (ys[1] - ys[0]);
  }
  const h = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) h[i] = xs[i + 1] - xs[i];
  const m = n - 2;
  const sub = new Array(m), diag = new Array(m), sup = new Array(m), rhs = new Array(m);
  for (let i = 0; i < m; i++) {
    const idx = i + 1;
    sub[i] = idx === 1 ? 0 : h[idx - 1];
    diag[i] = 2 * (h[idx - 1] + h[idx]);
    sup[i] = idx === n - 2 ? 0 : h[idx];
    rhs[i] = 6 * ((ys[idx + 1] - ys[idx]) / h[idx] - (ys[idx] - ys[idx - 1]) / h[idx - 1]);
  }
  for (let i = 1; i < m; i++) {
    const w = sub[i] / diag[i - 1];
    diag[i] -= w * sup[i - 1];
    rhs[i] -= w * rhs[i - 1];
  }
  const sol = new Array(m).fill(0);
  sol[m - 1] = rhs[m - 1] / diag[m - 1];
  for (let i = m - 2; i >= 0; i--) sol[i] = (rhs[i] - sup[i] * sol[i + 1]) / diag[i];
  const M = new Array(n).fill(0);
  for (let i = 0; i < m; i++) M[i + 1] = sol[i];
  if (xq <= xs[0]) return ys[0];
  if (xq >= xs[n - 1]) return ys[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] > xq) hi = mid; else lo = mid;
  }
  const i = lo, hs = h[i];
  const a = (ys[i + 1] - ys[i]) / hs - (hs * (M[i + 1] + 2 * M[i])) / 6;
  const b = M[i] / 2;
  const c = (M[i + 1] - M[i]) / (6 * hs);
  const dx = xq - xs[i];
  return ys[i] + a * dx + b * dx * dx + c * dx * dx * dx;
};

const _findExtrema = (arr) => {
  const N = arr.length;
  const maxIdx = [], minIdx = [];
  if (N < 3) return { maxIdx, minIdx };
  const dir = new Array(N).fill(0);
  for (let i = 1; i < N - 1; i++) {
    if (arr[i] > arr[i - 1]) dir[i] = 1;
    else if (arr[i] < arr[i - 1]) dir[i] = -1;
  }
  let prevDir = 0, lastMax = -1, lastMin = -1;
  for (let i = 1; i < N - 1; i++) {
    const d = dir[i];
    if (d === 1 && prevDir !== 1) {
      // local max
      if (lastMax >= 0) {
        // 此前的极值已经记录；本处其实是上坡中点，先压后
      }
    }
  }
  // Simpler approach: scan local extrema idx with neighbor rule + flat handling
  for (let i = 1; i < N - 1; i++) {
    if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1]) maxIdx.push(i);
    else if (arr[i] < arr[i - 1] && arr[i] < arr[i + 1]) minIdx.push(i);
    else if (arr[i] === arr[i + 1] && arr[i] > arr[i - 1]) {
      let j = i + 1;
      while (j < N - 1 && arr[j] === arr[j + 1]) j++;
      if (j < N - 1 && arr[j] > arr[j + 1]) { maxIdx.push(j); i = j; }
    } else if (arr[i] === arr[i + 1] && arr[i] < arr[i - 1]) {
      let j = i + 1;
      while (j < N - 1 && arr[j] === arr[j + 1]) j++;
      if (j < N - 1 && arr[j] < arr[j + 1]) { minIdx.push(j); i = j; }
    }
  }
  return { maxIdx, minIdx };
};

const _countExtrema = (arr) => {
  const { maxIdx, minIdx } = _findExtrema(arr);
  return maxIdx.length + minIdx.length;
};

const _siftOnce = (signal, maxSift, sdThresh) => {
  const N = signal.length;
  let h = signal.slice();
  for (let iter = 0; iter < maxSift; iter++) {
    const { maxIdx, minIdx } = _findExtrema(h);
    if (maxIdx.length < 2 || minIdx.length < 2) return { imf: h, stopReason: 'no_envelopes' };
    const upper = h.map((_, i) => _splineAt(maxIdx, h.filter((_, k) => maxIdx.includes(k)).length ? h : h, i));
    // Build envelopes via spline over extrema indices
    const xs = h.map((_, i) => i);
    const upperVals = h.map((_, i) => _splineAt(maxIdx, maxIdx.map(k => h[k]), i));
    const lowerVals = h.map((_, i) => _splineAt(minIdx, minIdx.map(k => h[k]), i));
    const meanEnv = upperVals.map((u, i) => (u + lowerVals[i]) / 2);
    const newH = h.map((v, i) => v - meanEnv[i]);
    let num = 0, den = 0;
    for (let i = 0; i < N; i++) {
      const d = newH[i] - h[i];
      num += d * d;
      den += h[i] * h[i];
    }
    const sd = den > 0 ? num / den : 0;
    h = newH;
    if (sd < sdThresh) {
      const ex = _countExtrema(h);
      let zc = 0;
      for (let i = 1; i < N; i++) {
        if ((h[i - 1] >= 0 && h[i] < 0) || (h[i - 1] <= 0 && h[i] > 0)) zc++;
      }
      if (Math.abs(ex - zc) <= 1) return { imf: h, stopReason: 'sd_threshold' };
    }
  }
  return { imf: h, stopReason: 'max_sift' };
};

const _rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const _gaussian = (rng) => {
  const u1 = rng() || 1e-9;
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

function eemdRun(signal, opts) {
  opts = opts || {};
  const ensembleSize = opts.ensembleSize || 60;
  const noiseAmplitude = opts.noiseAmplitude || 0.2;
  const maxImfs = opts.maxImfs || 6;
  const maxSift = opts.maxSift || 60;
  const N = signal.length;
  const m = signal.reduce((a, b) => a + b, 0) / N;
  const variance = signal.reduce((s, v) => s + (v - m) ** 2, 0) / N;
  const sd = Math.sqrt(variance) || 1;
  const amp = noiseAmplitude * sd;

  // Determine canonical IMF count via a probe run
  const probeLens = {};
  for (let p = 0; p < Math.min(20, ensembleSize); p++) {
    const rng = _rng(1234 + p);
    const noisy = signal.map(v => v + amp * _gaussian(rng));
    const imfs = [];
    let r = noisy.slice();
    let guard = 0;
    while (imfs.length < maxImfs && guard < 20) {
      guard++;
      const { imf } = _siftOnce(r, maxSift, 0.25);
      imfs.push(imf);
      r = r.map((v, i) => v - imf[i]);
      if (_countExtrema(r) <= 2) break;
    }
    imfs.push(r);
    probeLens[imfs.length] = (probeLens[imfs.length] || 0) + 1;
  }
  let targetLen = maxImfs + 1; // +1 for final residue
  let best = -1;
  for (const k of Object.keys(probeLens)) {
    if (probeLens[k] > best) { best = probeLens[k]; targetLen = parseInt(k); }
  }

  const sums = Array.from({ length: targetLen }, () => new Array(N).fill(0));
  const counts = new Array(targetLen).fill(0);
  for (let e = 0; e < ensembleSize; e++) {
    const rng = _rng(1234 + e);
    const noisy = signal.map(v => v + amp * _gaussian(rng));
    const imfs = [];
    let r = noisy.slice();
    let guard = 0;
    while (imfs.length < maxImfs && guard < 20) {
      guard++;
      const { imf } = _siftOnce(r, maxSift, 0.25);
      imfs.push(imf);
      r = r.map((v, i) => v - imf[i]);
      if (_countExtrema(r) <= 2) break;
    }
    imfs.push(r);
    const len = Math.min(imfs.length, targetLen);
    for (let k = 0; k < len; k++) {
      for (let i = 0; i < N; i++) sums[k][i] += imfs[k][i];
      counts[k]++;
    }
  }
  const result = sums.map((arr, k) => {
    const c = Math.max(1, counts[k]);
    return arr.map(v => v / c);
  });

  // Verify reconstruction (only over slots with full coverage)
  let recon = new Array(N).fill(0);
  for (let k = 0; k < result.length && counts[k] === ensembleSize; k++) {
    for (let i = 0; i < N; i++) recon[i] += result[k][i];
  }
  let maxErr = 0;
  let fullCoverage = (counts[0] === ensembleSize);
  if (fullCoverage) {
    for (let i = 0; i < N; i++) {
      maxErr = Math.max(maxErr, Math.abs(recon[i] - signal[i]));
    }
  }
  const residualExtrema = _countExtrema(result[result.length - 1]);
  return {
    imfs: result,
    counts,
    fullCoverage,
    reconMaxError: fullCoverage ? maxErr : null,
    residualExtrema,
    params: { ensembleSize, noiseAmplitude, maxImfs }
  };
}

const _variance = (arr) => {
  const vals = arr.filter(v => v != null && !Number.isNaN(v));
  if (!vals.length) return 0;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length;
};

// ── EEMD UI integration ──────────────────────────
// Use 'var' so the declarations are hoisted to the top of the script scope and
// are safely available for the very first renderAll() chain that starts from
// initControls() at the bottom of this script.
var _eemdCache = {}; // country ISO3 -> latest EEMD result
var _eemdInitialized = false;

function initEEMD() {
  if (_eemdInitialized) return;
  // Always (re-)populate the EEMD country selector with the full country list
  // and bind change/run listeners. We do this unconditionally so the dropdown
  // cannot end up empty regardless of when initEEMD is called relative to
  // initControls/initResearchControls.
  const eSel = document.getElementById('eemdCountry');
  if (eSel) {
    // Only repopulate if empty; never destroy existing options.
    if (!eSel.options.length) {
      const countries = (typeof uniqueLatestCountries === 'function') ? uniqueLatestCountries() : [];
      countries.forEach(c => {
        const o = document.createElement('option');
        o.value = c.iso3;
        o.textContent = c.countryJP;
        eSel.appendChild(o);
      });
      if (countries.length) {
        eSel.value = countries[0].iso3;
      }
    }
    if (!eSel._eemdBound) {
      eSel.addEventListener('change', () => {
        try { _eemdCache = {}; renderEEMD(); } catch (err) { console.warn('EEMD onchange error:', err); }
      });
      eSel._eemdBound = true;
    }
  }
  const ens = document.getElementById('eemdEnsemble');
  if (ens && !ens._eemdBound) {
    ens.addEventListener('change', () => { try { _eemdCache = {}; renderEEMD(); } catch (err) {} });
    ens._eemdBound = true;
  }
  const noi = document.getElementById('eemdNoise');
  if (noi && !noi._eemdBound) {
    noi.addEventListener('change', () => { try { _eemdCache = {}; renderEEMD(); } catch (err) {} });
    noi._eemdBound = true;
  }
  const btn = document.getElementById('eemdRunBtn');
  if (btn && !btn._eemdBound) {
    btn.addEventListener('click', () => { try { _eemdCache = {}; renderEEMD(); } catch (err) {} });
    btn._eemdBound = true;
  }
  _eemdInitialized = true;
  // Kick off the first EEMD render after the selector now has options.
  try { renderEEMD(); } catch (e) { console.warn('EEMD initial render:', e); }
}

function _eemdGetSeries(iso) {
  const rows = annualData.filter(d => d.iso3 === iso).sort((a, b) => a.year - b.year);
  const series = [];
  rows.forEach(r => {
    if (!r.months) return;
    months.forEach(m => {
      const v = Number(r.months[String(m)] || 0);
      series.push({ year: r.year, month: m, label: `${r.year}-${String(m).padStart(2, '0')}`, value: v });
    });
  });
  return series;
}

function _eemdBuildCard(k, imf, N, totalPower) {
  const labels = ['IMF-1（最高周波）','IMF-2','IMF-3','IMF-4','IMF-5','IMF-6','長期トレンド（残差）'];
  const isResidue = (k === imf.length - 1);
  const name = isResidue ? labels[Math.min(6, k)] : labels[Math.min(5, k - 1)];
  const pow = _variance(imf);
  const ratio = totalPower > 0 ? (pow / totalPower * 100) : 0;
  // Estimate dominant period using zero-crossings heuristic
  let crossings = 0;
  for (let i = 1; i < N; i++) if ((imf[i - 1] >= 0 && imf[i] < 0) || (imf[i - 1] <= 0 && imf[i] > 0)) crossings++;
  const meanPeriod = crossings > 0 ? (2 * N / crossings) : Infinity;
  return { name, power: pow, ratio, crossings, meanPeriod };
}

function renderEEMD() {
  const isoSel = document.getElementById('eemdCountry');
  if (!isoSel) return;
  // Safety: if called BEFORE the selector has been populated (e.g. by the very
  // first renderAll() chain), pick the first available country ourselves so the
  // chart never appears empty just because the option-change hadn't happened.
  if (!isoSel.value && isoSel.options.length) {
    isoSel.value = isoSel.options[0].value;
  }
  if (!isoSel.options.length) {
    // Try to populate now (defensive, in case initEEMD hasn't fired yet).
    try {
      const countries = (typeof uniqueLatestCountries === 'function') ? uniqueLatestCountries() : [];
      countries.forEach(c => {
        const o = document.createElement('option');
        o.value = c.iso3;
        o.textContent = c.countryJP;
        isoSel.appendChild(o);
      });
      if (countries.length) isoSel.value = countries[0].iso3;
    } catch (e) {}
  }
  const iso = isoSel.value;
  if (!iso) return;

  const series = _eemdGetSeries(iso);
  if (!series.length || series.length < 24) {
    Plotly.purge('eemdObservedChart');
    document.getElementById('eemdObservedChart').innerHTML =
      '<div style="padding:40px; color:var(--muted); text-align:center;">対象国の月次データが不足しています（最低24か月必要）。</div>';
    return;
  }

  const countryName = (annualData.find(d => d.iso3 === iso) || {}).countryJP || iso;
  const ensembleSize = Number((document.getElementById('eemdEnsemble') || {}).value || 60);
  const noiseAmplitude = Number((document.getElementById('eemdNoise') || {}).value || 0.2);
  const cacheKey = iso + '|' + ensembleSize + '|' + noiseAmplitude;
  const progressEl = document.getElementById('eemdProgress');
  if (progressEl) progressEl.style.display = 'block';

  // Defer to yield UI
  setTimeout(() => {
    let result;
    try {
      result = _eemdCache[cacheKey] || (function(){
        const r = eemdRun(series.map(s => s.value), { ensembleSize, noiseAmplitude, maxImfs: 6, maxSift: 60 });
        _eemdCache[cacheKey] = r;
        return r;
      })();
    } catch (err) {
      console.error('EEMD error:', err);
      if (progressEl) progressEl.style.display = 'none';
      document.getElementById('eemdObservedChart').innerHTML =
        '<div style="padding:40px; color:#c0392b; text-align:center;">EEMD 計算中にエラーが発生しました: ' + (err.message || err) + '</div>';
      return;
    }
    if (progressEl) progressEl.style.display = 'none';

    const { imfs, reconMaxError, residualExtrema, counts } = result;
    const labels = series.map(s => s.label);
    const N = series.length;
    const observed = series.map(s => s.value);
    const totalPower = _variance(observed);
    const recon = new Array(N).fill(0);
    for (let k = 0; k < imfs.length; k++) {
      for (let i = 0; i < N; i++) recon[i] += imfs[k][i];
    }

    // Update mini-stats
    document.getElementById('eemdImfCount').textContent = (imfs.length - 1) + ' 個 + 残差'; // exclude residue from count
    document.getElementById('eemdReconError').textContent = reconMaxError != null ? fmtNum(Math.round(reconMaxError)) : '部分的';
    const mono = residualExtrema <= 2 ? '単調 ✓' : (residualExtrema <= 4 ? 'ほぼ単調' : '非単調');
    document.getElementById('eemdResidualMono').textContent = `${residualExtrema} 個（${mono}）`;

    // Observed vs Reconstructed
    const commonLayout = (title, ytitle) => ({
      title: { text: title, x: 0.02, xanchor: 'left' },
      margin: { l: 70, r: 20, t: 55, b: 55 },
      paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff',
      xaxis: { title: '年月' }, yaxis: { title: ytitle, zeroline: false },
      showlegend: true, legend: { orientation: 'h', y: -0.18 }
    });
    Plotly.newPlot('eemdObservedChart', [
      { type: 'scatter', mode: 'lines+markers', name: '観測値', x: labels, y: observed, line: { color: '#1f5fbf' },
        hovertemplate: '%{x}<br>%{y:,.0f}<extra></extra>' },
      { type: 'scatter', mode: 'lines', name: '再構成（IMF 合計）', x: labels, y: recon, line: { color: '#e85d04', dash: 'dot' },
        hovertemplate: '%{x}<br>%{y:,.0f}<extra></extra>' }
    ], commonLayout(`${countryName}: 観測値 vs 再構成`, '訪日客数'), { responsive: true, displayModeBar: true });

    // Strength contribution
    const strength = imfs.map((imf, k) => {
      const card = _eemdBuildCard(k, imf, N, totalPower);
      return { name: card.name, ratio: card.ratio, isResidue: (k === imfs.length - 1) };
    });
    const colors = strength.map(s => s.isResidue ? '#2d9f4e' : '#1f5fbf');
    Plotly.newPlot('eemdStrengthChart', [{
      type: 'bar', orientation: 'h',
      y: strength.map(s => s.name),
      x: strength.map(s => s.ratio),
      marker: { color: colors },
      text: strength.map(s => s.ratio.toFixed(1) + '%'),
      textposition: 'outside'
    }], {
      title: { text: `${countryName}: 各 IMF の分散貢献率`, x: 0.02, xanchor: 'left' },
      margin: { l: 130, r: 40, t: 55, b: 45 },
      paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff',
      xaxis: { title: '分散貢献率 (%)', zeroline: true, range: [0, Math.max(15, ...strength.map(s => s.ratio)) * 1.2] },
      yaxis: { title: '', autorange: 'reversed' }
    }, { responsive: true, displayModeBar: true });

    // Build IMF chart grid
    const grid = document.getElementById('eemdImfGrid');
    if (grid) {
      grid.innerHTML = '';
      imfs.forEach((imf, k) => {
        const card = _eemdBuildCard(k, imf, N, totalPower);
        const box = document.createElement('div');
        box.className = 'eemd-imf-box';
        const meta = card.meanPeriod && isFinite(card.meanPeriod)
          ? `${(card.ratio).toFixed(1)}% ・ 平均周期 ≈ ${card.meanPeriod.toFixed(1)} か月 ・ ゼロ交差 ${card.crossings} 回`
          : `${(card.ratio).toFixed(1)}% ・ 単調化した長期トレンド`;
        box.innerHTML = `<h3>${card.name}</h3><div class="imf-meta">${meta}</div><div id="eemdImf_${k}" class="eemd-imf-chart"></div>`;
        grid.appendChild(box);
        Plotly.newPlot(`eemdImf_${k}`, [
          { type: 'scatter', mode: 'lines', x: labels, y: imf,
            line: { color: card.isResidue ? '#2d9f4e' : '#1f5fbf', width: card.isResidue ? 2.5 : 1.8 },
            hovertemplate: '%{x}<br>%{y:,.0f}<extra></extra>' }
        ], {
          margin: { l: 55, r: 18, t: 25, b: 35 },
          paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff',
          xaxis: { title: '' }, yaxis: { title: '値', zeroline: false },
          showlegend: false
        }, { responsive: true, displayModeBar: false });
      });
    }

    // AI Insights
    const imfCount = imfs.length - 1; // excluding residue
    const orderingPhrase = imfCount > 0
      ? `高周波（IMF-1・IMF-2）→ 低周波（IMF-3 以降）→ 最終残差、の ${imfCount} 個の IMF が抽出されました。`
      : '短系列のため IMF が抽出されませんでした。';
    const dominantImf = [...strength].sort((a, b) => b.ratio - a.ratio)[0];
    const trendImf = imfs[imfs.length - 1];
    const trendFirst = trendImf[0] || 0;
    const trendLast = trendImf[trendImf.length - 1] || 0;
    const trendDir = trendLast > trendFirst * 1.05 ? '明確な上昇'
                   : trendLast < trendFirst * 0.95 ? '明確な下降' : 'おおむね横ばい';
    const peakInTrend = trendImf.reduce((best, v, i) => v > trendImf[best] ? i : best, 0);
    const troughInTrend = trendImf.reduce((best, v, i) => v < trendImf[best] ? i : best, 0);
    const peakYear = labels[peakInTrend] || '-';
    const troughYear = labels[troughInTrend] || '-';
    const annualLike = imfs.slice(0, imfs.length - 1).find((imf, k) => {
      const { meanPeriod } = _eemdBuildCard(k, imf, N, totalPower);
      return meanPeriod > 9 && meanPeriod < 15;
    });
    let seasonalPhrase = '明確な年周期成分は検出されませんでした。';
    if (annualLike) {
      const peakMonth = series[annualLike.reduce((best, v, i) => v > annualLike[best] ? i : best, 0)].month;
      const troughMonth = series[annualLike.reduce((best, v, i) => v < annualLike[best] ? i : best, 0)].month;
      seasonalPhrase = `年周期の IMF が検出されました（平均周期 ≈ 12 か月）。最も強い月 = ${peakMonth}月、最も弱い月 = ${troughMonth}月。`;
    }
    const insights = [
      `🧮 ${countryName} の月次系列から <strong>${orderingPhrase}</strong>`,
      `🥇 最も分散貢献が大きい成分は <strong>${dominantImf?.name || '-'}</strong>（${dominantImf?.ratio.toFixed(1) || '0'}%）です。`,
      (peakYear !== '-' && troughYear !== '-')
        ? `📊 長期トレンドは <strong>${trendDir}</strong>。最終残差は ${peakYear} 付近で最大、${troughYear} 付近で最小。`
        : `📊 長期トレンドは <strong>${trendDir}</strong>。`,
      `🌤️ ${seasonalPhrase}`,
      `💡 EEMD は <strong>モードミキシングを抑えた適応分解</strong>なので、季節ノイズを含むデータでも、年周期と短期揺らぎを明確に分離できます。COVID-19 のような<strong>突発的ショック</strong>は中間周波数の IMF に現れるため、政策効果検証にも有用です。`
    ];
    document.getElementById('eemdInsights').innerHTML = insights.map(x => `<li>${x}</li>`).join('');
  }, 0);
}

