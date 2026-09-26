const CSV="https://raw.githubusercontent.com/coinmetrics/data/master/csv/btc.csv";
let RAW=null,COMP=null,SNAP=null,SCORES=null,FRESH=null,ONCHAIN="",ONCHAIN_FRESH="",chart=null,curKey="price",curRange=1460,curH=365,lastT=null,lastErr=null,busy=false,CHART_FAIL=false;
let LANG=localStorage.getItem("lang")||"th";

/* ---------- i18n ---------- */
const T={
 th:{
  sub:"รวม 6 ดัชนีมูลค่าระยะยาวของ Bitcoin เป็นคะแนนเดียว",
  momL:"แนวโน้มระยะสั้น", method:"วิธีคำนวณและข้อจำกัด",
  secIndex:"ดัชนีรายตัว · แต่ละตัวให้คะแนน 0–100 ตัวที่มี ×2 นับน้ำหนักสองเท่า", secCharts:"กราฟย้อนหลัง",
  secBt:"ผลย้อนหลังตามระดับราคา · ราคาเปลี่ยนไปเท่าไรหลังวันที่อยู่แต่ละระดับ",
  action:"แนวทาง", invalidLbl:"มุมมองนี้ผิดถ้า",
  zone:{"STRONG BUY":"ถูกมาก","ACCUMULATE":"ถูก","NEUTRAL":"กลาง ๆ","CAUTION":"ค่อนข้างแพง","EXPENSIVE":"แพง"},
  pctl:(p,y)=>`ถูกกว่า ${p}% ของวันตั้งแต่ปี ${y} ตามคะแนนนี้`, scoreAria:n=>`คะแนน ${n} จาก 100`,
  trend:(up,bw)=>up&&!bw?"แข็ง · เหนือค่าเฉลี่ย 200 วัน":!bw?"อ่อน · ใต้ค่าเฉลี่ย 200 วัน":up?"ฟื้นระยะสั้น · ยังใต้ค่าเฉลี่ย 200 สัปดาห์":"อ่อน · ใต้ทั้งค่าเฉลี่ย 200 วันและ 200 สัปดาห์",
  dcaWeak:" · แนวโน้มระยะสั้นยังอ่อน ค่อย ๆ ทยอยซื้อ",
  dca:s=>s>=75?"DCA มากกว่าปกติ 2–3 เท่า และเก็บเงินสดสำรองไว้เสมอ ไม่ทุ่มหมดครั้งเดียว":s>=55?"DCA มากกว่าปกติเล็กน้อย ราว 1.5–2 เท่า":s>=40?"DCA ตามแผนปกติ":s>=25?"DCA น้อยกว่าปกติ แล้วรอราคาที่ดีกว่า":"หยุดซื้อเพิ่มชั่วคราว และไม่กู้เงินมาลงทุน",
  inval:w=>`ราคาปิดต่ำกว่าค่าเฉลี่ย 200 สัปดาห์ ($${w}) ต่อเนื่อง หรือ MVRV Z-Score ขึ้นไปเกิน 7 (ระดับที่เคยเป็นยอดรอบ)`,
  disc:"ข้อมูลประกอบการตัดสินใจ ไม่ใช่คำแนะนำการลงทุน",
  priceLive:(n,src)=>`<span class="dot"></span>ราคาสด ${n} · ${src}`, priceOff:"ดึงราคาสดไม่ได้ แสดงราคาปิดล่าสุดแทน", d24:"24 ชม.",
  onchain:(d,days)=>`ข้อมูล on-chain ถึง ${d} · ${days<=1?"วันนี้":days+" วันก่อน"}`, stale:` <span class="stale">⚠ เก่ากว่าปกติ</span>`,
  hz:["1 เดือน","3 เดือน","6 เดือน","1 ปี"],
  btHead:(z,m,h,n,w)=>`วันที่อยู่ระดับ${z}แบบวันนี้ อีก ${h}ต่อมาราคาเปลี่ยนไป <b>${m}</b> (ค่ากลาง) <span>จาก ${n} วัน · ราคาขึ้น ${w}% ของครั้ง</span>`,
  btWin:(w,n)=>`ขึ้น ${w}% · ${n} วัน`, btThin:n=>`ข้อมูลน้อย · ${n} วัน`, btThinNow:"ระดับนี้ข้อมูลยังน้อย อย่าเพิ่งเชื่อตัวเลขนี้มาก", btN0:"ไม่มีข้อมูล",
  btNote:"นับทุกวันตั้งแต่ปี 2014 ที่มีคะแนนครบ แล้วดูราคาหลังจากนั้นตามระยะที่เลือก · ค่ากลาง (median) คือผลตรงกลางของทุกวันในระดับนั้น · วันที่ติดกันใช้ช่วงเวลาซ้อนกัน แถวสีเทาคือระดับที่มีช่วงไม่ซ้อนกันไม่ถึง 3 ช่วง ยังเชื่อถือไม่ได้ · ผลในอดีตไม่รับประกันอนาคต",
  loading:"กำลังโหลดราคาและข้อมูล on-chain…", err:m=>`โหลดข้อมูลไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง<small>${m}</small>`, retry:"ลองอีกครั้ง",
  ready:(n,z,p)=>`อัปเดตแล้ว คะแนน ${n} จาก 100 ระดับ${z} ราคา ${p}`, noData:"ข้อมูลยังไม่พอสำหรับช่วงนี้",
  foot:`ต้นทุนเฉลี่ยตลาด: <a href="https://bitcoin-data.com" target="_blank" rel="noopener">bitcoin-data.com</a> (ช้าราว 7 วัน) · ประวัติ: <a href="https://github.com/coinmetrics/data" target="_blank" rel="noopener">Coin Metrics</a> (<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">CC BY-NC 4.0</a>) · ราคา: Binance / Kraken / CoinGecko<br>ใช้ส่วนตัว ไม่เชิงพาณิชย์`,
  status:{ahr999:v=>v<0.45?"ถูกมาก":v<=1.2?"โซน DCA":"แพง",mvrv_z:v=>v<0.1?"ใกล้ก้นรอบ":v<5?"กลาง ๆ":"ใกล้ยอดรอบ",wma_mult:v=>v<=1.05?"แตะเส้น 200 สัปดาห์":v<3?"ปกติ":"ร้อนแรง",pi_ratio:v=>v<0.7?"ไกลจากยอด":v>=0.95?"ใกล้ยอด":"กลาง ๆ",mayer:v=>v<1?"ถูก":v<2.4?"ปกติ":"ร้อนแรง",puell:v=>v<0.5?"ใกล้ก้นรอบ":v<4?"ปกติ":"ใกล้ยอดรอบ"},
  metric:{ahr999:"เทียบราคากับต้นทุนเฉลี่ยของการ DCA 200 วัน และกับเส้นราคาตามการเติบโตระยะยาว ยิ่งต่ำยิ่งถูก คิดจากราคาอย่างเดียว",
    mvrv_z:"มูลค่าตลาดเทียบกับต้นทุนรวมที่ทุกคนซื้อเหรียญมา ต่ำกว่า 0 คือตลาดโดยรวมขาดทุน มักใกล้ก้นรอบ เกิน 7 คือร้อนแรงเกิน มักใกล้ยอดรอบ แม่นกับรอบใหญ่",
    wma_mult:"ราคาหารด้วยค่าเฉลี่ย 200 สัปดาห์ (ราว 4 ปี) ใกล้ 1 คือแตะพื้นของรอบ ซึ่งเป็นจุดสะสมที่ดีในทุกรอบที่ผ่านมา ถ้าหลุดลงไปต่อเนื่อง แนวโน้มระยะยาวเปลี่ยน",
    pi_ratio:"ค่าเฉลี่ย 111 วัน เทียบกับ 2 เท่าของค่าเฉลี่ย 350 วัน ค่าแตะ 1 เคยตรงกับยอดรอบทุกครั้ง ใช้เตือนยอด บอกก้นไม่ได้",
    mayer:"ราคาหารด้วยค่าเฉลี่ย 200 วัน ต่ำกว่า 1 คืออยู่ใต้ค่าเฉลี่ย (ถูก) เกิน 2.4 คือร้อนแรงเกิน",
    puell:"รายได้ต่อวันของนักขุดเทียบค่าเฉลี่ย 1 ปี ต่ำกว่า 0.5 คือรายได้ตกจนนักขุดต้องขายเหรียญ มักใกล้ก้นรอบ เกิน 4 คือกำไรสูงผิดปกติ มักใกล้ยอดรอบ"},
  read:{ahr999:"คะแนน: ≤0.45 ได้ 100 · 1.2 ได้ 50 · ≥4 ได้ 0",mvrv_z:"คะแนน: ≤0 ได้ 100 · ≥7 ได้ 0",wma_mult:"คะแนน: ≤1.0× ได้ 100 · ≥3× ได้ 0",pi_ratio:"คะแนน: ≤0.6 ได้ 100 · ≥1.0 ได้ 0",mayer:"คะแนน: ≤0.8 ได้ 100 · ≥2.4 ได้ 0",puell:"คะแนน: ≤0.5 ได้ 100 · ≥4 ได้ 0"},
  rpL:"ต้นทุนเฉลี่ยตลาด (realized price)",nuplL:"อารมณ์ตลาด (NUPL)",nuplPh:["ยอมแพ้","หวังปนกลัว","มองบวก","มั่นใจ","คลั่งไคล้"],
  secDca:"จำลอง DCA · ถ้าปรับจำนวนซื้อตามคะแนนนี้",
  dcaHead:(e,st)=>`เริ่มปี ${st} ถ้าปรับจำนวนซื้อตามคะแนน ต้นทุนเฉลี่ยต่อ BTC จะ<b style="color:var(--z-${e>=0?"good":"bad"})">${e>=0?"ต่ำกว่า":"สูงกว่า"} ${Math.abs(e).toFixed(1)}%</b> เทียบกับซื้อเท่ากันทุกครั้ง`,
  dcaCols:["","ลงทุนรวม","ได้ BTC","ต้นทุนเฉลี่ย"],dcaFlat:"ซื้อเท่ากันทุกครั้ง",dcaSig:"ปรับตามคะแนน",
  dcaNote:"จำลองซื้อทุก 7 วัน ครั้งละ $100 · แบบปรับตามคะแนนซื้อ 0.25–2.5 เท่าของ $100 ตามระดับ (เกณฑ์เดียวกับแนวทาง) · เทียบที่ต้นทุนเฉลี่ยต่อ BTC เพราะเงินลงทุนรวมไม่เท่ากัน · ผลในอดีตไม่รับประกันอนาคต",
  all:"ทั้งหมด", allStart:"แรกสุด", ranges:["1 ปี","4 ปี"], tabPrice:"ราคา", tabScore:"คะแนน",
  lg:{btc:"BTC (สีเขียว = วันที่ถูกมาก)",w200:"เฉลี่ย 200 สัปดาห์",d200:"เฉลี่ย 200 วัน",rp:"ต้นทุนเฉลี่ยตลาด",score:"คะแนน",ma111:"เฉลี่ย 111 วัน",ma350:"2× เฉลี่ย 350 วัน"},
  secCyc:"ตอนนี้คล้ายช่วงไหนในอดีต", cycCols:["ช่วงที่คล้าย","คล้าย","อีก 90 วัน","อีก 1 ปี"],
  cycNote:"เทียบรูปร่างและระดับของคะแนน 90 วันล่าสุดกับทุกช่วงในอดีต (ไม่นับปีล่าสุด) · คล้ายกันไม่ได้แปลว่าราคาจะเดินซ้ำ",
  secHm:"คะแนนรายเดือน · แต่ละช่องคือระดับเฉลี่ยของเดือนนั้น",
  hvL:"เดือนที่เกิด halving (รางวัลการขุดลดลงครึ่งหนึ่ง)", year:"ปี",
  grp:["เลือกกราฟ","ช่วงเวลาของกราฟ","ดูราคาหลังจากนั้น","ปีที่เริ่มจำลอง"], sumBtc:"ราคา BTC", chartFail:"โหลดกราฟไม่สำเร็จ สรุปข้อมูลแทน: ",
  chartSum:(n,d0,d1,v0,v1,lo,dlo,hi,dhi)=>`${n} ${d0} ถึง ${d1}: เริ่ม ${v0} ล่าสุด ${v1} · ต่ำสุด ${lo} (${dlo}) · สูงสุด ${hi} (${dhi})`,
  info:t=>`เกี่ยวกับ ${t}`, weight:w=>`นับน้ำหนัก ${w} เท่าในคะแนนรวม`,
  themeToDark:"เปลี่ยนเป็นโหมดมืด", themeToLight:"เปลี่ยนเป็นโหมดสว่าง", refresh:"อัปเดตราคาสด", lang:"Switch to English",
 },
 en:{
  sub:"Six long-term Bitcoin valuation indices, one score",
  momL:"Short-term trend", method:"How it's calculated",
  secIndex:"Index breakdown · each scores 0–100; ×2 indices count double", secCharts:"History",
  secBt:"Backtest · how price moved after days at each level",
  action:"What to do", invalidLbl:"This view is wrong if",
  zone:{"STRONG BUY":"Very cheap","ACCUMULATE":"Cheap","NEUTRAL":"Fair","CAUTION":"Pricey","EXPENSIVE":"Expensive"},
  pctl:(p,y)=>`By this score, cheaper than ${p}% of days since ${y}`, scoreAria:n=>`Score ${n} out of 100`,
  trend:(up,bw)=>up&&!bw?"Strong · above 200-day avg":!bw?"Weak · below 200-day avg":up?"Recovering · still below 200-week avg":"Weak · below 200-day and 200-week avg",
  dcaWeak:" · the short-term trend is weak, so spread buys over time",
  dca:s=>s>=75?"DCA 2–3× your usual amount, and always keep some cash in reserve instead of going all in":s>=55?"DCA a little more than usual, about 1.5–2×":s>=40?"DCA your usual amount":s>=25?"DCA less than usual and wait for better prices":"Pause new buys, and don't borrow to invest",
  inval:w=>`Price keeps closing below its 200-week average ($${w}), or MVRV Z-Score climbs above 7 (where past cycles topped)`,
  disc:"Context for your own decision, not financial advice.",
  priceLive:(n,src)=>`<span class="dot"></span>Live price ${n} · ${src}`, priceOff:"Live price unavailable, showing the last close", d24:"24h",
  onchain:(d,days)=>`On-chain data to ${d} · ${days<=1?"today":days+" days ago"}`, stale:` <span class="stale">⚠ older than usual</span>`,
  hz:["1 month","3 months","6 months","1 year"],
  btHead:(z,m,h,n,w)=>`On past ${z} days like today, price ${h} later moved <b>${m}</b> (median) <span>across ${n} days · up ${w}% of the time</span>`,
  btWin:(w,n)=>`up ${w}% · ${n} days`, btThin:n=>`thin data · ${n} days`, btThinNow:"thin data at this level, treat with caution", btN0:"no data",
  btNote:"Every day since 2014 with a full score, then the price change after the chosen period · median = the middle result of all days at that level · consecutive days share overlapping periods, so grey rows have fewer than 3 non-overlapping periods and can't be trusted yet · past results don't guarantee the future",
  loading:"Loading price and on-chain data…", err:m=>`Couldn't load the data. Check your connection and try again.<small>${m}</small>`, retry:"Try again",
  ready:(n,z,p)=>`Updated. Score ${n} of 100, ${z}, price ${p}.`, noData:"Not enough data for this yet",
  foot:`Market cost basis: <a href="https://bitcoin-data.com" target="_blank" rel="noopener">bitcoin-data.com</a> (about 7 days behind) · History: <a href="https://github.com/coinmetrics/data" target="_blank" rel="noopener">Coin Metrics</a> (<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">CC BY-NC 4.0</a>) · Price: Binance / Kraken / CoinGecko<br>Personal, non-commercial`,
  status:{ahr999:v=>v<0.45?"Very cheap":v<=1.2?"DCA zone":"Expensive",mvrv_z:v=>v<0.1?"Near cycle low":v<5?"Mid":"Near cycle top",wma_mult:v=>v<=1.05?"At the 200-week line":v<3?"Normal":"Hot",pi_ratio:v=>v<0.7?"Far from top":v>=0.95?"Near top":"Mid",mayer:v=>v<1?"Cheap":v<2.4?"Normal":"Hot",puell:v=>v<0.5?"Near cycle low":v<4?"Normal":"Near cycle top"},
  metric:{ahr999:"Compares price with the average cost of a 200-day DCA and with a long-term growth curve. Lower is cheaper. Price-only.",
    mvrv_z:"Market value against what all holders paid for their coins. Below 0, the market as a whole is at a loss, usually near a cycle low. Above 7 it is overheated, usually near a top. Reliable on big cycles.",
    wma_mult:"Price divided by the 200-week (about 4-year) average. Near 1 is the cycle floor, a good accumulation point in every past cycle. A sustained break below it means the long-term trend has changed.",
    pi_ratio:"The 111-day average against twice the 350-day average. Reaching 1 has matched every past cycle top. It warns of tops; it can't find bottoms.",
    mayer:"Price divided by the 200-day average. Below 1 is under the average (cheap); above 2.4 is overheated.",
    puell:"Miners' daily revenue against its 1-year average. Below 0.5, revenue has collapsed and miners sell, usually near a cycle low. Above 4, profits are unusually high, usually near a top."},
  read:{ahr999:"Score: ≤0.45 gets 100 · 1.2 gets 50 · ≥4 gets 0",mvrv_z:"Score: ≤0 gets 100 · ≥7 gets 0",wma_mult:"Score: ≤1.0× gets 100 · ≥3× gets 0",pi_ratio:"Score: ≤0.6 gets 100 · ≥1.0 gets 0",mayer:"Score: ≤0.8 gets 100 · ≥2.4 gets 0",puell:"Score: ≤0.5 gets 100 · ≥4 gets 0"},
  rpL:"Market cost basis (realized price)",nuplL:"Market mood (NUPL)",nuplPh:["Capitulation","Hope / fear","Optimism","Belief","Euphoria"],
  secDca:"DCA simulator · if you had scaled buys by this score",
  dcaHead:(e,st)=>`Starting in ${st}, scaling buys by the score gives an average cost per BTC <b style="color:var(--z-${e>=0?"good":"bad"})">${Math.abs(e).toFixed(1)}% ${e>=0?"lower":"higher"}</b> than buying the same amount every time`,
  dcaCols:["","Invested","BTC bought","Avg cost"],dcaFlat:"Same amount",dcaSig:"Scaled by score",
  dcaNote:"Simulated buys every 7 days at $100 · the scaled version buys 0.25–2.5× that amount by level (same rule as What to do) · compared on average cost per BTC, because the totals invested differ · past results don't guarantee the future",
  all:"All", allStart:"the start", ranges:["1 year","4 years"], tabPrice:"Price", tabScore:"Score",
  lg:{btc:"BTC (green = very cheap days)",w200:"200-week avg",d200:"200-day avg",rp:"Market cost basis",score:"Score",ma111:"111-day avg",ma350:"2× 350-day avg"},
  secCyc:"Past periods most like now", cycCols:["Similar period","Match","90 days later","1 year later"],
  cycNote:"Compares the shape and level of the last 90 days of the score with every past period (excluding the latest year) · similar doesn't mean price will repeat",
  secHm:"Monthly score · each cell is that month's average level",
  hvL:"Halving month (the mining reward is cut in half)", year:"Year",
  grp:["Chart","Chart range","Price change after","Simulation start"], sumBtc:"BTC price", chartFail:"The chart couldn't load. In short: ",
  chartSum:(n,d0,d1,v0,v1,lo,dlo,hi,dhi)=>`${n} from ${d0} to ${d1}: started at ${v0}, latest ${v1} · low ${lo} (${dlo}) · high ${hi} (${dhi})`,
  info:t=>`About ${t}`, weight:w=>`Counts ${w}× in the overall score`,
  themeToDark:"Switch to dark mode", themeToLight:"Switch to light mode", refresh:"Refresh live price", lang:"เปลี่ยนเป็นภาษาไทย",
 }
};
const L=()=>T[LANG];

/* ---------- theme ---------- */
const SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.2 17.2L18.6 18.6M18.6 5.4L17.2 6.8M6.8 17.2L5.4 18.6"/></svg>';
const MOON='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const DARK=()=>document.documentElement.classList.contains("dk")?true:document.documentElement.classList.contains("lt")?false:matchMedia("(prefers-color-scheme: dark)").matches;
function applyTheme(mode){const r=document.documentElement;r.classList.remove("dk","lt");if(mode==="dark")r.classList.add("dk");else if(mode==="light")r.classList.add("lt");
  themeBtnSync();}
function themeBtnSync(){const b=document.getElementById("themeBtn");b.innerHTML=DARK()?SUN:MOON;b.setAttribute("aria-label",DARK()?L().themeToLight:L().themeToDark);}
function toggleTheme(){const next=DARK()?"light":"dark";localStorage.setItem("theme",next);applyTheme(next);if(COMP&&SNAP)render(lastT);}

/* ---------- colors ---------- */
const ZHEX={good:["#1c7a47","#75c59b"],ok:["#5a7711","#abca84"],neutral:["#926500","#dbb970"],warn:["#ae5318","#dc9a6c"],bad:["#bb2f24","#de857e"]}; // [light, dark]: mirror the CSS --z-* tokens
const band=s=>s>=75?"good":s>=55?"ok":s>=40?"neutral":s>=25?"warn":"bad";
const hx=k=>ZHEX[k][DARK()?1:0];
const scoreVar=s=>`var(--z-${band(s)})`;
const inkHex=()=>DARK()?"#e9e7e1":"#171715";
const btcHex=()=>DARK()?"#f7931a":"#c96b08";
const nuplPhase=v=>L().nuplPh[v<0?0:v<0.25?1:v<0.5?2:v<0.75?3:4];
/* escape any data-sourced string before it enters innerHTML (defense-in-depth vs upstream tampering) */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* fetch with a deadline: a stalled request fails (and falls back) instead of loading forever */
async function get(url,ms){
  const r=await fetch(url,AbortSignal.timeout?{signal:AbortSignal.timeout(ms)}:{});
  if(!r.ok)throw new Error("HTTP "+r.status);
  return r;
}
const why=e=>e&&e.name==="TimeoutError"?"timeout":String(e&&e.message||e);
/* live price: Binance, then CoinGecko. 4 s each, so a blocked exchange can't hold up the page */
async function ticker(){
  try{const j=await(await get("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",4e3)).json();
    if(+j.lastPrice>0)return{price:+j.lastPrice,chg:+j.priceChangePercent,src:"Binance"};}catch(e){}
  try{const j=await(await get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",4e3)).json();
    if(j.bitcoin.usd>0)return{price:j.bitcoin.usd,chg:j.bitcoin.usd_24h_change,src:"CoinGecko"};}catch(e){}
  return null;
}
/* Data: slim data.json (built daily by GitHub Action — bakes in fresh bitcoin-data
   metrics so the browser never hits their 10 req/hr limit). Fallback: Coin Metrics CSV. */
async function getRaw(){
  try{
    const j=await(await get("data.json",15e3)).json(),fix=a=>a.map(v=>v===null?NaN:v);
    if(!j.date||!j.date.length)throw new Error("empty");
    RAW={date:j.date,price:fix(j.price),mcap:fix(j.mcap),mvrv:fix(j.mvrv),issUsd:fix(j.issUsd),issNtv:fix(j.issNtv),supply:fix(j.supply)};
    FRESH=j.fresh||null;
  }catch(e1){
    try{RAW=Indicators.parseCSV(await(await get(CSV,30e3)).text());FRESH=null;}
    catch(e2){throw new Error(`data.json: ${why(e1)} · CSV: ${why(e2)}`);}
  }
  ONCHAIN=RAW.date[RAW.date.length-1];
}
/* first load, refresh and retry share one guarded path. full = refetch data.json too; the live price
   is always refetched, in parallel. Failures show in the page with a retry instead of a dead screen. */
async function load(full){
  if(busy)return;busy=true;
  const app=document.getElementById("app"),btns=["refresh","retry"].map(id=>document.getElementById(id));
  btns.forEach(b=>b.setAttribute("aria-disabled","true"));
  if(!COMP){app.classList.add("is-loading");app.classList.remove("failed");}
  announce(L().loading);
  const tp=ticker();
  try{
    if(full||!RAW)await getRaw();
    await recompute(tp);
    lastErr=null;document.getElementById("err").hidden=true;
    const l=L();announce(l.ready(Math.round(SNAP.overall),l.zone[SNAP.label],"$"+Math.round(SNAP.price).toLocaleString("en-US"))+(lastT?"":" "+l.priceOff));
  }catch(e){lastErr=e;showErr(await tp);}
  finally{busy=false;btns.forEach(b=>b.setAttribute("aria-disabled","false"));}
}
/* data failed: say so where the verdict would be, keep the live price if it came through */
function showErr(t){
  const l=L();lastT=t;
  if(!COMP){document.getElementById("app").classList.add("failed");document.getElementById("asof").innerHTML=t?renderPrice(t,t.price):"";}
  document.getElementById("errmsg").innerHTML=l.err(esc(lastErr.message));
  document.getElementById("err").hidden=false;announce("");
}
/* one polite live region for loading / updated; the error box is role=alert on its own */
function announce(msg){const lv=document.getElementById("live");clearTimeout(announce.t);lv.textContent="";
  if(msg)announce.t=setTimeout(()=>{lv.textContent=msg;},100);} // cleared first so a repeat message is read again
async function recompute(tp){
  const t=await tp;lastT=t;const px=t?t.price:null;
  const data=px?Indicators.appendToday(RAW,px):{...RAW};COMP=Indicators.computeAll(data);
  // Current MVRV-Z/Puell come from our own series (live price + newest realized cap): fresher than
  // bitcoin-data's 7-day-delayed values, and the same method as the history/backtest (ADR-004).
  ONCHAIN_FRESH=(FRESH&&FRESH.date)||""; // date of the newest real on-chain input (realized price)
  SCORES=Indicators.scoreSeries(COMP);SNAP=Indicators.snapshot(COMP);render(t);
}

function spark(key,bands){
  const W=150,H=28,ys=[],xs=[],S=COMP[key],N=S.length,start=Math.max(0,N-365);
  for(let i=start;i<N;i++){if(Number.isFinite(S[i])){ys.push(S[i]);xs.push(i);}}
  if(ys.length<2)return"";
  let lo=Math.min(...ys),hi=Math.max(...ys);for(const b of bands){lo=Math.min(lo,b.y);hi=Math.max(hi,b.y);}
  const pad=(hi-lo)*.1||1;lo-=pad;hi+=pad;
  const X=i=>((i-xs[0])/(xs[xs.length-1]-xs[0]))*W,Y=v=>H-((v-lo)/(hi-lo))*H;
  let d="M"+X(xs[0]).toFixed(1)+" "+Y(ys[0]).toFixed(1);for(let i=1;i<ys.length;i++)d+=" L"+X(xs[i]).toFixed(1)+" "+Y(ys[i]).toFixed(1);
  let bl="";for(const b of bands){const y=Y(b.y).toFixed(1);bl+=`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${b.color}" stroke-width="1" stroke-dasharray="2 3" opacity=".55"/>`;}
  return`<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${bl}<path d="${d}" fill="none" stroke="${inkHex()}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}

/* section heading: "Title · subtitle" -> <h2>Title<small>subtitle</small></h2> */
function head(id,str){const [t,sub]=str.split(" · "),h=document.getElementById(id);h.textContent=t;
  if(sub){const sm=document.createElement("small");sm.textContent=sub;h.appendChild(sm);}}
function applyStaticLang(){const l=L();
  document.documentElement.lang=LANG;
  document.getElementById("m-sub").textContent=l.sub;
  document.getElementById("s-mom-l").textContent=l.momL;
  document.getElementById("ins-action-l").textContent=l.action;
  document.getElementById("ins-inval-l").textContent=l.invalidLbl;
  head("lbl-index",l.secIndex);head("lbl-charts",l.secCharts);head("lbl-bt",l.secBt);
  document.getElementById("bt-note").innerHTML=l.btNote;
  head("lbl-dca",l.secDca);
  document.getElementById("dca-note").innerHTML=l.dcaNote;
  head("lbl-cyc",l.secCyc);
  document.getElementById("cyc-note").innerHTML=l.cycNote;
  head("lbl-hm",l.secHm);
  document.getElementById("hmKey").innerHTML=Object.keys(BZ).map(k=>`<span><i ${sw(k)}></i>${l.zone[BZ[k]]}</span>`).join("")+
    `<span><i class="hv" style="background-color:var(--faint)"></i>${l.hvL}</span>`;
  document.getElementById("foot").innerHTML=l.foot;
  document.getElementById("s-rp-l").textContent=l.rpL;document.getElementById("s-nupl-l").textContent=l.nuplL;
  document.getElementById("retry").textContent=l.retry;
  ["tabs","ranges","bth","dcaRange"].forEach((id,i)=>document.getElementById(id).setAttribute("aria-label",l.grp[i]));
  buildOpts();
  if(!SNAP){renderRows();skLoad();document.querySelector('.gauge svg[role="img"]').setAttribute("aria-label",l.loading);}
  if(lastErr)showErr(lastT);
  const lb=document.getElementById("langBtn");lb.textContent=LANG==="th"?"EN":"ไทย";lb.title=l.lang;
  document.getElementById("refresh").setAttribute("aria-label",l.refresh);themeBtnSync();
  document.getElementById("ins-disc").textContent=l.disc;
  for(const k of ["bt","dca","cyc"])document.getElementById(k+"-note-s").textContent=l.method;
}
function setLang(x){LANG=x;localStorage.setItem("lang",x);applyStaticLang();if(COMP&&SNAP)render(lastT);}

function render(t){
  const l=L(),C=2*Math.PI*88,col=scoreVar(SNAP.overall);
  const arc=document.getElementById("arc");arc.style.stroke=col;arc.setAttribute("stroke-dasharray",C);arc.setAttribute("stroke-dashoffset",C);
  const fill=C*(1-SNAP.overall/100);requestAnimationFrame(()=>arc.setAttribute("stroke-dashoffset",fill));
  document.getElementById("score").firstChild.textContent=Math.round(SNAP.overall); // number in ink: color marks the state (ring, zone), not the figure
  const z=document.getElementById("zone");z.textContent=l.zone[SNAP.label];z.style.color=col;
  // percentile: share of all scored days with a lower score, i.e. days that were more expensive than today
  const past=SCORES.filter(Number.isFinite),pctl=Math.round(100*past.filter(v=>v<SNAP.overall).length/past.length);
  document.getElementById("zoneth").textContent=l.pctl(pctl,COMP.date[SCORES.findIndex(Number.isFinite)].slice(0,4));
  document.querySelector('.gauge svg[role="img"]').setAttribute("aria-label",l.scoreAria(Math.round(SNAP.overall)));

  const ocDate=ONCHAIN_FRESH||ONCHAIN,ocDays=Math.round((Date.now()-Date.parse(ocDate+"T00:00:00Z"))/86400000);
  let line2=l.onchain(esc(ocDate),ocDays);if(ocDays>10)line2+=l.stale; // bitcoin-data free tier lags 7d (since 2026-09); warn only beyond that
  document.getElementById("asof").innerHTML=renderPrice(t,SNAP.price)+"<br>"+line2;

  const up=SNAP.values.mayer>=1,belowW=SNAP.values.wma_mult<1;
  const riskKey=(!up&&belowW)?"high":(!up||belowW)?"med":"low";
  const sm=document.getElementById("s-mom");sm.textContent=l.trend(up,belowW);sm.style.color=riskKey==="low"?"var(--z-good)":riskKey==="med"?"var(--z-neutral)":"var(--z-bad)";
  // realized price + NUPL (baked into data.json by the daily Action; shown only if present)
  const rpW=document.getElementById("s-rp-wrap"),nuW=document.getElementById("s-nupl-wrap");
  if(FRESH&&Number.isFinite(FRESH.realizedPrice)){document.getElementById("s-rp").textContent="$"+Math.round(FRESH.realizedPrice).toLocaleString("en-US");rpW.hidden=false;}else rpW.hidden=true;
  const nupl=FRESH&&Number.isFinite(FRESH.realizedPrice)?1-FRESH.realizedPrice/SNAP.price:FRESH&&FRESH.nupl; // NUPL = 1 − realized/market, at the live price
  if(Number.isFinite(nupl)){document.getElementById("s-nupl").textContent=nupl.toFixed(2)+" · "+nuplPhase(nupl);nuW.hidden=false;}else nuW.hidden=true;
  // one action line: the score sets how much, a weak short-term trend says spread it out
  document.getElementById("ins-dca").textContent=l.dca(SNAP.overall)+(SNAP.overall>=40&&riskKey!=="low"?l.dcaWeak:"");
  const w200=COMP.ma200w[SNAP.idx];document.getElementById("ins-inval").textContent=l.inval(w200?Math.round(w200).toLocaleString("en-US"):"–");

  renderRows();drawChart();renderBacktest();renderDca();renderCycle();renderHeatmap();
  document.getElementById("app").classList.remove("is-loading","failed");skSave();
}
/* skeleton sizes: text wraps differently on every width, so each slot's real height is remembered per
   language and window width (in rem) and reused as its placeholder size on the next load */
const skKey=()=>"sk:"+LANG+":"+innerWidth,remPx=()=>parseFloat(getComputedStyle(document.documentElement).fontSize);
function skSave(){try{localStorage.setItem(skKey(),JSON.stringify(Object.fromEntries([...document.querySelectorAll(".sk")].map(e=>[e.id,+(e.getBoundingClientRect().height/remPx()).toFixed(3)]))));}catch(e){}}
function skLoad(){document.querySelectorAll(".sk").forEach(e=>e.style.removeProperty("--h"));
  try{const h=JSON.parse(localStorage.getItem(skKey()))||{};for(const id in h){const e=document.getElementById(id);if(e)e.style.setProperty("--h",h[id]+"rem");}}catch(e){}}
/* index rows. Before the data lands (no SNAP) the same rows show "–": names, weights and the ⓘ notes
   are static, so the list is its own skeleton and never jumps */
function renderRows(){
  const l=L(),rows=document.getElementById("rows");rows.innerHTML="";
  Indicators.INDICES.forEach(s=>{
    const v=SNAP?SNAP.values[s.key]:NaN,score=SNAP?SNAP.scores[s.key]:NaN,c=SNAP?`style="color:var(--z-${band(score)})"`:"";
    const el=document.createElement("div");el.className="row";
    el.innerHTML=`<div class="nm">${s.title}</div><div class="val">${SNAP?s.fmt(v):"–"}</div>
      <div class="meta"><span class="tier ${s.tier}" title="${l.weight(s.weight)}">×${s.weight}</span><span class="st" ${c}>${SNAP?l.status[s.key](v):"&nbsp;"}</span><button class="i" aria-label="${l.info(s.title)}" aria-expanded="false">ⓘ</button></div>
      <div class="sparkwrap">${SNAP?spark(s.key,s.bands):'<svg class="spark" aria-hidden="true"></svg>'}<span class="sc"><b ${c}>${SNAP?score.toFixed(0):"–"}</b>/100</span></div>
      <div class="info">${l.metric[s.key]||""}<span class="rd">${(l.read&&l.read[s.key])||""}</span></div>`;
    el.querySelector(".i").onclick=function(){this.setAttribute("aria-expanded",el.classList.toggle("open"));};
    rows.appendChild(el);
  });
}
/* price, 24h change and the first "as of" line; px is the last close when there's no live price */
function renderPrice(t,px){
  const l=L(),chg=document.getElementById("chg");
  document.getElementById("price").textContent="$"+Math.round(px).toLocaleString("en-US");
  if(t&&Number.isFinite(t.chg)){chg.className="chg "+(t.chg>=0?"up":"down");chg.textContent=(t.chg>=0?"+":"−")+Math.abs(t.chg).toFixed(2)+"% "+l.d24;}else chg.textContent="";
  return t?l.priceLive(new Date().toLocaleTimeString(LANG==="th"?"th-TH":"en-GB",{hour:"2-digit",minute:"2-digit"}),t.src):l.priceOff;
}

/* option rows: toggle buttons in a labelled group. Built once per language and updated in place,
   so keyboard focus stays on the button just pressed. Choices made while loading apply when data lands */
function opts(id,items,cur,pick){const h=document.getElementById(id);h.innerHTML="";
  for(const [la,v] of items){const b=document.createElement("button");b.textContent=la;b.setAttribute("aria-pressed",v===cur);
    b.onclick=()=>{pick(v);for(const x of h.children)x.setAttribute("aria-pressed",x===b);};h.appendChild(b);}}
function buildOpts(){const l=L();
  opts("tabs",[[l.tabPrice,"price"],[l.tabScore,"score"],...Indicators.INDICES.map(s=>[s.title.replace(" Multiple","").replace(" Top","").replace("-Score",""),s.key])],curKey,k=>{curKey=k;if(COMP)drawChart();});
  opts("ranges",[[l.ranges[0],365],[l.ranges[1],1460],[l.all,99999]],curRange,n=>{curRange=n;if(COMP)drawChart();});
  opts("bth",l.hz.map((la,i)=>[la,[30,90,180,365][i]]),curH,n=>{curH=n;if(COMP)renderBacktest();});
  opts("dcaRange",[["2016","2016-01-01"],["2018","2018-01-01"],["2020","2020-01-01"],["2022","2022-01-01"],[l.all,null]],curDcaStart,st=>{curDcaStart=st;if(COMP)renderDca();});
}

/* .tbl: header row, then rows of [label, ...values]. Each value cell carries its column name for the stacked layout */
const tbl=(cols,rows)=>cols.map((h,i)=>`<div class="h${i?" num":""}">${h}</div>`).join("")+
  rows.map(([r,...v])=>`<div class="r">${r}</div>`+v.map((x,i)=>`<div class="num" data-l="${cols[i+1]}">${x}</div>`).join("")).join("");

/* ---- DCA simulator ---- */
let curDcaStart="2020-01-01";
function renderDca(){
  const l=L(),r=Indicators.dcaSim(COMP,SCORES,curDcaStart);
  if(!r){document.getElementById("dcaHead").textContent=l.noData;document.getElementById("dcaGrid").innerHTML="";return;}
  const startLbl=curDcaStart?curDcaStart.slice(0,4):l.allStart;
  document.getElementById("dcaHead").innerHTML=l.dcaHead(r.edge*100,startLbl);
  const money=v=>"$"+Math.round(v).toLocaleString("en-US");
  document.getElementById("dcaGrid").innerHTML=tbl(l.dcaCols,[[l.dcaSig,money(r.invS),r.btcS.toFixed(4),`<span class="win">${money(r.costS)}</span>`],[l.dcaFlat,money(r.invF),r.btcF.toFixed(4),money(r.costF)]]);
}

/* ---- cycle compare ---- */
function renderCycle(){
  const l=L(),ms=Indicators.cycleMatch(COMP,SCORES);
  const fp=v=>!Number.isFinite(v)?"–":`<span style="color:${v>=0?"var(--z-good)":"var(--z-bad)"}">${(v>=0?"+":"−")+Math.abs(v*100).toFixed(0)}%</span>`;
  document.getElementById("cycRows").innerHTML=ms.length?tbl(l.cycCols,ms.map(m=>[esc(m.date),Math.round(m.sim*100)+"%",fp(m.f90),fp(m.f365)])):tbl(l.cycCols,[])+`<div class="empty">${l.noData}</div>`;
}

/* ---- heatmap (monthly average score) ---- */
const HALVINGS=["2012-11-28","2016-07-09","2020-05-11","2024-04-19"];
const BZ={good:"STRONG BUY",ok:"ACCUMULATE",neutral:"NEUTRAL",warn:"CAUTION",bad:"EXPENSIVE"}; // band -> zone key
/* a heatmap cell's color, plus hatching on pricey/expensive so the grid reads without color */
const sw=(k,x="")=>`class="${x}${k==="warn"||k==="bad"?" hot":""}" style="background-color:var(--z-${k})"`;
function renderHeatmap(){
  const l=L(),hm=document.getElementById("hm"),tb=document.getElementById("hmTbl");hm.innerHTML=tb.innerHTML="";
  const agg={};
  for(let i=0;i<COMP.date.length;i++){const s=SCORES[i];if(!Number.isFinite(s))continue;
    const ym=COMP.date[i].slice(0,7);(agg[ym]=agg[ym]||[]).push(s);}
  const yms=Object.keys(agg);if(!yms.length)return;
  const y0=+yms[0].slice(0,4),y1=+yms[yms.length-1].slice(0,4);
  const hvYM=new Set(HALVINGS.map(d=>d.slice(0,7))),mon=new Intl.DateTimeFormat(LANG==="th"?"th-TH":"en-GB",{month:"short",timeZone:"UTC"});
  let html='<div class="y"></div>',sr=`<tr><th scope="col">${l.year}</th>`;
  for(let m=1;m<=12;m++){html+=`<div class="mh">${m}</div>`;sr+=`<th scope="col">${mon.format(Date.UTC(2000,m-1,1))}</th>`;}
  for(let y=y1;y>=y0;y--){
    html+=`<div class="y">${y}</div>`;sr+=`</tr><tr><th scope="row">${y}</th>`;
    for(let m=1;m<=12;m++){
      const ym=y+"-"+String(m).padStart(2,"0"),a=agg[ym];
      if(!a){html+='<div class="m"></div>';sr+="<td>–</td>";continue;}
      const avg=Math.round(a.reduce((x,v)=>x+v,0)/a.length),k=band(avg),txt=`${avg} ${l.zone[BZ[k]]}${hvYM.has(ym)?" · halving":""}`;
      html+=`<div ${sw(k,"m"+(hvYM.has(ym)?" hv":""))} title="${esc(ym)} · ${txt}"></div>`;sr+=`<td>${txt}</td>`;
    }
  }
  hm.innerHTML=html;tb.innerHTML=sr+"</tr>";
}

const pct=x=>(x>=0?"+":"−")+Math.abs(x*100).toFixed(0)+"%";
const zInText=k=>LANG==="en"?L().zone[k].toLowerCase():L().zone[k];
function renderBacktest(){
  const l=L(),bt=Indicators.backtest(COMP,SCORES,curH),cur=bt.find(b=>b.zone===SNAP.label),hL=l.hz[[30,90,180,365].indexOf(curH)];
  // overlapping daily windows aren't independent: under 3 non-overlapping periods is too little to trust
  const thin=b=>b.n/curH<3;
  document.getElementById("bthead").innerHTML=(cur&&cur.n)?l.btHead(`<b style="color:${scoreVar(SNAP.overall)}">${zInText(SNAP.label)}</b>`,pct(cur.median),hL,cur.n,Math.round(cur.win*100))+(thin(cur)?` <span>${l.btThinNow}</span>`:""):"";
  const box=document.getElementById("bt");box.innerHTML="";
  bt.forEach(b=>{const k=band(b.zone==="STRONG BUY"?80:b.zone==="ACCUMULATE"?60:b.zone==="NEUTRAL"?45:b.zone==="CAUTION"?30:10),weak=!b.n||thin(b);
    const el=document.createElement("div");el.className="bt-row"+(b.zone===SNAP.label?" on":"")+(weak?" thin":"");
    el.innerHTML=`<span class="z" style="color:var(--z-${k})">${l.zone[b.zone]}</span><span class="m" style="color:${weak?"var(--muted)":b.median>=0?"var(--z-good)":"var(--z-bad)"}">${b.n?pct(b.median):"–"}</span><span class="w">${!b.n?l.btN0:thin(b)?l.btThin(b.n):l.btWin(Math.round(b.win*100),b.n)}</span>`;
    box.appendChild(el);});
}
/* vertical dashed line + year label at each halving (price/score tabs) */
const chartPx=()=>Math.round(remPx()*.75); // 12px at the default size
const halvingPlugin={id:"hv",afterDatasetsDraw(ch){
  const xs=ch.scales.x,labels=ch.data.labels;if(!xs||!labels||!labels.length)return;
  const ctx=ch.ctx,faint=DARK()?"#6c6960":"#a9a9a2";ctx.save();
  for(const d of HALVINGS){
    if(d<labels[0]||d>labels[labels.length-1])continue;
    let lo=0,hi=labels.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(labels[mid]<d)lo=mid+1;else hi=mid;}
    const x=xs.getPixelForValue(lo);
    ctx.strokeStyle=faint;ctx.lineWidth=1;ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(x,ch.chartArea.top);ctx.lineTo(x,ch.chartArea.bottom);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=faint;ctx.font=chartPx()+"px Anuphan";ctx.fillText("⛏"+d.slice(2,4),x+3,ch.chartArea.top+10);
  }
  ctx.restore();
}};

/* the chart in words (canvas aria-label, and the fallback text if Chart.js fails): range, first/last, low/high */
function chartSum(start){
  const l=L(),s=Indicators.INDICES.find(x=>x.key===curKey),money=v=>"$"+Math.round(v).toLocaleString("en-US");
  const [nm,a,f]=curKey==="price"?[l.sumBtc,COMP.price,money]:curKey==="score"?[l.tabScore,SCORES,Math.round]:[s.title,COMP[curKey],s.fmt];
  let i0=-1,i1=-1,lo=-1,hi=-1;
  for(let i=start;i<a.length;i++){if(!Number.isFinite(a[i]))continue;if(i0<0)i0=lo=hi=i;i1=i;if(a[i]<a[lo])lo=i;if(a[i]>a[hi])hi=i;}
  const d=COMP.date;return i0<0?nm:l.chartSum(nm,d[i0],d[i1],f(a[i0]),f(a[i1]),f(a[lo]),d[lo],f(a[hi]),d[hi]);
}
function drawChart(){
  const N=COMP.date.length,start=Math.max(0,N-curRange),sum=chartSum(start),fb=document.getElementById("chartFail");
  document.getElementById("chart").setAttribute("aria-label",sum);
  // Chart.js is deferred: its load event redraws; if it fails (CDN down, blocked) the page says so and keeps the summary
  if(!window.Chart){if(CHART_FAIL){fb.textContent=L().chartFail+sum;fb.hidden=false;}return;}
  const labels=COMP.date.slice(start),ink=inkHex(),px=chartPx();
  const grid={color:DARK()?"rgba(255,255,255,.07)":"rgba(20,20,16,.07)"},ticks={color:DARK()?"#85827b":"#6e6e69",font:{size:px,family:"Anuphan"},maxTicksLimit:5};
  const mk=(la,arr,color,w=1.8,dash=null)=>({label:la,data:arr.slice(start),borderColor:color,borderWidth:w,borderDash:dash||[],pointRadius:0,tension:.2,spanGaps:true,fill:false});
  let datasets=[],logY=false;const lg=L().lg;
  if(curKey==="price"){logY=true;datasets=[mk(lg.btc,COMP.price,ink,2),mk(lg.w200,COMP.ma200w,btcHex(),1.6),mk(lg.d200,COMP.ma200,DARK()?"#6c6960":"#a9a9a2",1,[4,4])];
    // very cheap days: the price line itself turns the "good" color instead of a separate dot series
    datasets[0].segment={borderColor:c=>SCORES[start+c.p1DataIndex]>=75?hx("good"):undefined};
    if(FRESH&&Number.isFinite(FRESH.realizedPrice))datasets.push({label:lg.rp,data:labels.map(()=>FRESH.realizedPrice),borderColor:DARK()?"#9b988f":"#9a6a00",borderWidth:1,borderDash:[2,3],pointRadius:0,fill:false});}
  else if(curKey==="score"){datasets=[mk(lg.score,SCORES,ink,2)];[[75,hx("good")],[55,hx("ok")],[40,hx("neutral")],[25,hx("warn")]].forEach(([y,c])=>datasets.push({label:String(y),data:labels.map(()=>y),borderColor:c,borderWidth:1,borderDash:[5,4],pointRadius:0,fill:false}));}
  else if(curKey==="pi_ratio"){logY=true;datasets=[mk(lg.ma111,COMP.ma111,ink,1.8),mk(lg.ma350,COMP.ma350x2,hx("bad"),1.6)];}
  else{const s=Indicators.INDICES.find(x=>x.key===curKey);datasets=[mk(s.title,COMP[curKey],ink,2)];s.bands.forEach(b=>datasets.push({label:b.label,data:labels.map(()=>b.y),borderColor:b.color,borderWidth:1,borderDash:[5,4],pointRadius:0,fill:false}));}
  if(chart)chart.destroy();
  chart=new Chart(document.getElementById("chart"),{type:"line",data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,animation:false /* per-point animations made each draw ~15x slower (TBT/INP) */,interaction:{mode:"index",intersect:false},
    plugins:{legend:{display:datasets.length>1,labels:{color:DARK()?"#9b988f":"#5f5f5a",font:{size:px,family:"Anuphan"},boxWidth:14,boxHeight:1,usePointStyle:false}},tooltip:{backgroundColor:DARK()?"#16181c":"#171715",titleColor:"#fafaf8",bodyColor:"#d8d8d2",borderColor:DARK()?"rgba(255,255,255,.12)":"transparent",borderWidth:1,cornerRadius:0,padding:9,titleFont:{family:"Anuphan",size:px+1},bodyFont:{family:"Anuphan",size:px+1},displayColors:false}},
    scales:{x:{grid,ticks:{...ticks,maxTicksLimit:4,callback(v){return String(this.getLabelForValue(v)).slice(0,7);}} /* YYYY-MM: full dates collide on phones */,border:{color:DARK()?"rgba(255,255,255,.13)":"rgba(20,20,16,.14)"}},y:{type:logY?"logarithmic":"linear",grid,ticks,position:"right",border:{display:false}}}},
    plugins:(curKey==="price"||curKey==="score")?[halvingPlugin]:[]});
}

/* ---------- init ---------- */
const savedTheme=localStorage.getItem("theme");applyTheme(savedTheme||"auto");
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{if(!localStorage.getItem("theme")){themeBtnSync();if(COMP&&SNAP)render(lastT);}});
const cjs=document.getElementById("chartjs");
cjs.addEventListener("load",()=>{if(COMP)drawChart();});
cjs.addEventListener("error",()=>{CHART_FAIL=true;if(COMP)drawChart();});
applyStaticLang();document.getElementById("app").hidden=false; // shown once labelled: no frame of empty headings
document.getElementById("themeBtn").onclick=toggleTheme;
document.getElementById("langBtn").onclick=()=>setLang(LANG==="th"?"en":"th");
document.getElementById("refresh").onclick=()=>load();
document.getElementById("retry").onclick=()=>load(true);
load(true);
// after load: keeps the SW precache downloads off the first-render critical path
if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
