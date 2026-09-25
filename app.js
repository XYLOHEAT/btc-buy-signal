const CSV="https://raw.githubusercontent.com/coinmetrics/data/master/csv/btc.csv";
let RAW=null,COMP=null,SNAP=null,SCORES=null,FRESH=null,ONCHAIN="",ONCHAIN_FRESH="",chart=null,curKey="price",curRange=1460,curH=365,lastT=null;
let LANG=localStorage.getItem("lang")||"th";

/* ---------- i18n ---------- */
const T={
 th:{
  sub:"รวม 6 ดัชนีมูลค่าระยะยาวของ Bitcoin เป็นคะแนนเดียว",
  priceL:"ราคา BTC", valL:"มูลค่าเทียบอดีต", momL:"แนวโน้มระยะสั้น",
  secIndex:"ดัชนีรายตัว · แต่ละตัวให้คะแนน 0–100 ตัวที่มี ×2 นับน้ำหนักสองเท่า", secCharts:"กราฟย้อนหลัง",
  secBt:"ผลย้อนหลังตามระดับราคา · ราคาเปลี่ยนไปเท่าไรหลังวันที่อยู่แต่ละระดับ",
  action:"แนวทาง", invalidLbl:"มุมมองนี้ผิดถ้า",
  scale:["แพง","ค่อนข้างแพง","กลาง ๆ","ถูก","ถูกมาก"],
  zone:{"STRONG BUY":"ถูกมาก","ACCUMULATE":"ถูก","NEUTRAL":"กลาง ๆ","CAUTION":"ค่อนข้างแพง","EXPENSIVE":"แพง"},
  pctl:(p,y)=>`ถูกกว่า ${p}% ของวันตั้งแต่ปี ${y} ตามคะแนนนี้`, scoreAria:n=>`คะแนน ${n} จาก 100`,
  mom:up=>up?"แข็ง: ราคาอยู่เหนือค่าเฉลี่ย 200 วัน":"อ่อน: ราคาอยู่ใต้ค่าเฉลี่ย 200 วัน",
  what:(z,sc,up,bw)=>`ดัชนีทั้ง 6 ตัวรวมได้ ${sc}/100 ถือว่า${z}เมื่อเทียบกับอดีต ${up?"ราคายังยืนเหนือค่าเฉลี่ย 200 วัน":"ราคาอยู่ใต้ค่าเฉลี่ย 200 วัน"}${bw?" และต่ำกว่าค่าเฉลี่ย 200 สัปดาห์ แนวโน้มระยะยาวจึงยังไม่ยืนยัน":""}`,
  dca:s=>s>=75?"DCA มากกว่าปกติ 2–3 เท่า และเก็บเงินสดสำรองไว้เสมอ ไม่ทุ่มหมดครั้งเดียว":s>=55?"DCA มากกว่าปกติเล็กน้อย ราว 1.5–2 เท่า":s>=40?"DCA ตามแผนปกติ":s>=25?"DCA น้อยกว่าปกติ แล้วรอราคาที่ดีกว่า":"หยุดซื้อเพิ่มชั่วคราว และไม่กู้เงินมาลงทุน",
  inval:w=>`ราคาปิดต่ำกว่าค่าเฉลี่ย 200 สัปดาห์ ($${w}) ต่อเนื่อง หรือ MVRV Z-Score ขึ้นไปเกิน 7 (ระดับที่เคยเป็นยอดรอบ)`,
  disc:"ข้อมูลประกอบการตัดสินใจ ไม่ใช่คำแนะนำการลงทุน",
  priceLive:n=>`<span class="dot"></span>ราคาสด ${n} · Binance`, priceOff:"ดึงราคาสดไม่ได้ แสดงราคาปิดล่าสุดแทน", d24:"24 ชม.",
  onchain:(d,days)=>`ข้อมูล on-chain ถึง ${d} · ${days<=1?"วันนี้":days+" วันก่อน"}`, stale:` <span class="stale">⚠ เก่ากว่าปกติ</span>`,
  hz:["1 เดือน","3 เดือน","6 เดือน","1 ปี"],
  btHead:(z,m,h,n,w)=>`วันที่อยู่ระดับ${z}แบบวันนี้ อีก ${h}ต่อมาราคาเปลี่ยนไป <b>${m}</b> (ค่ากลาง) <span>จาก ${n} วัน · ราคาขึ้น ${w}% ของครั้ง</span>`,
  btWin:(w,n)=>`ขึ้น ${w}% · ${n} วัน`, btThin:n=>`ข้อมูลน้อย · ${n} วัน`, btThinNow:"ระดับนี้ข้อมูลยังน้อย อย่าเพิ่งเชื่อตัวเลขนี้มาก", btN0:"ไม่มีข้อมูล",
  btNote:"นับทุกวันตั้งแต่ปี 2014 ที่มีคะแนนครบ แล้วดูราคาหลังจากนั้นตามระยะที่เลือก · ค่ากลาง (median) คือผลตรงกลางของทุกวันในระดับนั้น · วันที่ติดกันใช้ช่วงเวลาซ้อนกัน แถวสีเทาคือระดับที่มีช่วงไม่ซ้อนกันไม่ถึง 3 ช่วง ยังเชื่อถือไม่ได้ · ผลในอดีตไม่รับประกันอนาคต",
  loading:"กำลังโหลดราคาและข้อมูล on-chain…", err:m=>`โหลดข้อมูลไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้านี้อีกครั้ง<br><small>${m}</small>`,
  foot:`ต้นทุนเฉลี่ยตลาด: <a href="https://bitcoin-data.com" target="_blank" rel="noopener">bitcoin-data.com</a> (ช้าราว 7 วัน) · ประวัติ: <a href="https://github.com/coinmetrics/data" target="_blank" rel="noopener">Coin Metrics</a> (<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">CC BY-NC 4.0</a>) · ราคา: Binance / Kraken / CoinGecko<br>ใช้ส่วนตัว ไม่เชิงพาณิชย์`,
  status:{ahr999:v=>v<0.45?"ถูกมาก":v<=1.2?"โซน DCA":"แพง",mvrv_z:v=>v<0.1?"ใกล้ก้นรอบ":v<5?"กลาง ๆ":"ใกล้ยอดรอบ",wma_mult:v=>v<=1.05?"แตะเส้น 200 สัปดาห์":v<3?"ปกติ":"ร้อนแรง",pi_ratio:v=>v<0.7?"ไกลจากยอด":v>=0.95?"ใกล้ยอด":"กลาง ๆ",mayer:v=>v<1?"ถูก":v<2.4?"ปกติ":"ร้อนแรง",puell:v=>v<0.5?"ใกล้ก้นรอบ":v<4?"ปกติ":"ใกล้ยอดรอบ"},
  metric:{ahr999:"เทียบราคากับต้นทุนเฉลี่ยของการ DCA 200 วัน และกับเส้นราคาตามการเติบโตระยะยาว ยิ่งต่ำยิ่งถูก คิดจากราคาอย่างเดียว",
    mvrv_z:"มูลค่าตลาดเทียบกับต้นทุนรวมที่ทุกคนซื้อเหรียญมา ต่ำกว่า 0 คือตลาดโดยรวมขาดทุน มักใกล้ก้นรอบ เกิน 7 คือร้อนแรงเกิน มักใกล้ยอดรอบ แม่นกับรอบใหญ่",
    wma_mult:"ราคาหารด้วยค่าเฉลี่ย 200 สัปดาห์ (ราว 4 ปี) ใกล้ 1 คือแตะพื้นของรอบ ซึ่งเป็นจุดสะสมที่ดีในทุกรอบที่ผ่านมา ถ้าหลุดลงไปต่อเนื่อง แนวโน้มระยะยาวเปลี่ยน",
    pi_ratio:"ค่าเฉลี่ย 111 วัน เทียบกับ 2 เท่าของค่าเฉลี่ย 350 วัน ค่าแตะ 1 เคยตรงกับยอดรอบทุกครั้ง ใช้เตือนยอด บอกก้นไม่ได้",
    mayer:"ราคาหารด้วยค่าเฉลี่ย 200 วัน ต่ำกว่า 1 คืออยู่ใต้ค่าเฉลี่ย (ถูก) เกิน 2.4 คือร้อนแรงเกิน",
    puell:"รายได้ต่อวันของนักขุดเทียบค่าเฉลี่ย 1 ปี ต่ำกว่า 0.5 คือรายได้ตกจนนักขุดต้องขายเหรียญ มักใกล้ก้นรอบ เกิน 4 คือกำไรสูงผิดปกติ มักใกล้ยอดรอบ"},
  read:{ahr999:"คะแนน: ≤0.45 ได้ 100 · 1.2 ได้ 50 · ≥4 ได้ 0",mvrv_z:"คะแนน: ≤0 ได้ 100 · ≥7 ได้ 0",wma_mult:"คะแนน: ≤1.0× ได้ 100 · ≥3× ได้ 0",pi_ratio:"คะแนน: ≤0.6 ได้ 100 · ≥1.0 ได้ 0",mayer:"คะแนน: ≤0.8 ได้ 100 · ≥2.4 ได้ 0",puell:"คะแนน: ≤0.5 ได้ 100 · ≥4 ได้ 0"},
  valueL:"มูลค่า",riskL:"ความเสี่ยงระยะสั้น",actL:"ควรทำ",riskW:{low:"ต่ำ",med:"กลาง",high:"สูง"},
  riskSub:(up,bw)=>(up?"เหนือค่าเฉลี่ย 200 วัน":"ใต้ค่าเฉลี่ย 200 วัน")+(bw?" · ใต้ 200 สัปดาห์":""),
  act:{addStrong:"DCA มากขึ้น",dcaGrad:"ทยอย DCA",normal:"DCA ตามปกติ",hold:"ถือไว้ ชะลอซื้อ",reduce:"หยุดซื้อเพิ่ม"},
  rpL:"ต้นทุนเฉลี่ยตลาด (realized price)",nuplL:"อารมณ์ตลาด (NUPL)",nuplPh:["ยอมแพ้","หวังปนกลัว","มองบวก","มั่นใจ","คลั่งไคล้"],
  secDca:"จำลอง DCA · ถ้าปรับจำนวนซื้อตามคะแนนนี้",
  dcaHead:(e,st)=>`เริ่มปี ${st} ถ้าปรับจำนวนซื้อตามคะแนน ต้นทุนเฉลี่ยต่อ BTC จะ<b style="color:var(--z-${e>=0?"good":"bad"})">${e>=0?"ต่ำกว่า":"สูงกว่า"} ${Math.abs(e).toFixed(1)}%</b> เทียบกับซื้อเท่ากันทุกครั้ง`,
  dcaCols:["","ลงทุนรวม","ได้ BTC","ต้นทุนเฉลี่ย"],dcaFlat:"ซื้อเท่ากันทุกครั้ง",dcaSig:"ปรับตามคะแนน",
  dcaNote:"จำลองซื้อทุก 7 วัน ครั้งละ $100 · แบบปรับตามคะแนนซื้อ 0.25–2.5 เท่าของ $100 ตามระดับ (เกณฑ์เดียวกับแนวทาง) · เทียบที่ต้นทุนเฉลี่ยต่อ BTC เพราะเงินลงทุนรวมไม่เท่ากัน · ผลในอดีตไม่รับประกันอนาคต",
  all:"ทั้งหมด", allStart:"แรกสุด", ranges:["1 ปี","4 ปี"], tabPrice:"ราคา", tabScore:"คะแนน",
  lg:{btc:"BTC",w200:"เฉลี่ย 200 สัปดาห์",d200:"เฉลี่ย 200 วัน",cheap:"วันที่ถูกมาก",rp:"ต้นทุนเฉลี่ยตลาด",score:"คะแนน",ma111:"เฉลี่ย 111 วัน",ma350:"2× เฉลี่ย 350 วัน"},
  secCyc:"ตอนนี้คล้ายช่วงไหนในอดีต",
  cycRow:(d,s,f90,f365)=>`<b>${d}</b> <span style="color:var(--muted)">คล้าย ${s}%</span> · อีก 90 วันราคา <b>${f90}</b> · 1 ปี <b>${f365}</b>`,
  cycNote:"เทียบรูปร่างและระดับของคะแนน 90 วันล่าสุดกับทุกช่วงในอดีต (ไม่นับปีล่าสุด) · คล้ายกันไม่ได้แปลว่าราคาจะเดินซ้ำ",
  secHm:"คะแนนรายเดือน · แต่ละช่องคือระดับเฉลี่ยของเดือนนั้น",
  hmNote:"เขียว = ถูก · แดง = แพง · ⛏ = เดือนที่เกิด halving (รางวัลการขุดลดลงครึ่งหนึ่ง)",
  info:t=>`เกี่ยวกับ ${t}`, weight:w=>`นับน้ำหนัก ${w} เท่าในคะแนนรวม`,
  themeToDark:"เปลี่ยนเป็นโหมดมืด", themeToLight:"เปลี่ยนเป็นโหมดสว่าง", refresh:"อัปเดตราคาสด", lang:"Switch to English",
 },
 en:{
  sub:"Six long-term Bitcoin valuation indices, one score",
  priceL:"BTC price", valL:"Valuation vs history", momL:"Short-term trend",
  secIndex:"Index breakdown · each scores 0–100; ×2 indices count double", secCharts:"History",
  secBt:"Backtest · how price moved after days at each level",
  action:"What to do", invalidLbl:"This view is wrong if",
  scale:["Expensive","Pricey","Fair","Cheap","Very cheap"],
  zone:{"STRONG BUY":"Very cheap","ACCUMULATE":"Cheap","NEUTRAL":"Fair","CAUTION":"Pricey","EXPENSIVE":"Expensive"},
  pctl:(p,y)=>`By this score, cheaper than ${p}% of days since ${y}`, scoreAria:n=>`Score ${n} out of 100`,
  mom:up=>up?"Strong: above the 200-day average":"Weak: below the 200-day average",
  what:(z,sc,up,bw)=>`The six indices combine to ${sc}/100: ${z} compared with history. ${up?"Price is holding above its 200-day average":"Price is below its 200-day average"}${bw?", and below its 200-week average, so the long-term trend is not confirmed":""}.`,
  dca:s=>s>=75?"DCA 2–3× your usual amount, and always keep some cash in reserve instead of going all in":s>=55?"DCA a little more than usual, about 1.5–2×":s>=40?"DCA your usual amount":s>=25?"DCA less than usual and wait for better prices":"Pause new buys, and don't borrow to invest",
  inval:w=>`Price keeps closing below its 200-week average ($${w}), or MVRV Z-Score climbs above 7 (where past cycles topped)`,
  disc:"Context for your own decision, not financial advice.",
  priceLive:n=>`<span class="dot"></span>Live price ${n} · Binance`, priceOff:"Live price unavailable, showing the last close", d24:"24h",
  onchain:(d,days)=>`On-chain data to ${d} · ${days<=1?"today":days+" days ago"}`, stale:` <span class="stale">⚠ older than usual</span>`,
  hz:["1 month","3 months","6 months","1 year"],
  btHead:(z,m,h,n,w)=>`On past ${z} days like today, price ${h} later moved <b>${m}</b> (median) <span>across ${n} days · up ${w}% of the time</span>`,
  btWin:(w,n)=>`up ${w}% · ${n} days`, btThin:n=>`thin data · ${n} days`, btThinNow:"thin data at this level, treat with caution", btN0:"no data",
  btNote:"Every day since 2014 with a full score, then the price change after the chosen period · median = the middle result of all days at that level · consecutive days share overlapping periods, so grey rows have fewer than 3 non-overlapping periods and can't be trusted yet · past results don't guarantee the future",
  loading:"Loading price and on-chain data…", err:m=>`Couldn't load the data. Check your connection, then refresh this page.<br><small>${m}</small>`,
  foot:`Market cost basis: <a href="https://bitcoin-data.com" target="_blank" rel="noopener">bitcoin-data.com</a> (about 7 days behind) · History: <a href="https://github.com/coinmetrics/data" target="_blank" rel="noopener">Coin Metrics</a> (<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">CC BY-NC 4.0</a>) · Price: Binance / Kraken / CoinGecko<br>Personal, non-commercial`,
  status:{ahr999:v=>v<0.45?"Very cheap":v<=1.2?"DCA zone":"Expensive",mvrv_z:v=>v<0.1?"Near cycle low":v<5?"Mid":"Near cycle top",wma_mult:v=>v<=1.05?"At the 200-week line":v<3?"Normal":"Hot",pi_ratio:v=>v<0.7?"Far from top":v>=0.95?"Near top":"Mid",mayer:v=>v<1?"Cheap":v<2.4?"Normal":"Hot",puell:v=>v<0.5?"Near cycle low":v<4?"Normal":"Near cycle top"},
  metric:{ahr999:"Compares price with the average cost of a 200-day DCA and with a long-term growth curve. Lower is cheaper. Price-only.",
    mvrv_z:"Market value against what all holders paid for their coins. Below 0, the market as a whole is at a loss, usually near a cycle low. Above 7 it is overheated, usually near a top. Reliable on big cycles.",
    wma_mult:"Price divided by the 200-week (about 4-year) average. Near 1 is the cycle floor, a good accumulation point in every past cycle. A sustained break below it means the long-term trend has changed.",
    pi_ratio:"The 111-day average against twice the 350-day average. Reaching 1 has matched every past cycle top. It warns of tops; it can't find bottoms.",
    mayer:"Price divided by the 200-day average. Below 1 is under the average (cheap); above 2.4 is overheated.",
    puell:"Miners' daily revenue against its 1-year average. Below 0.5, revenue has collapsed and miners sell, usually near a cycle low. Above 4, profits are unusually high, usually near a top."},
  read:{ahr999:"Score: ≤0.45 gets 100 · 1.2 gets 50 · ≥4 gets 0",mvrv_z:"Score: ≤0 gets 100 · ≥7 gets 0",wma_mult:"Score: ≤1.0× gets 100 · ≥3× gets 0",pi_ratio:"Score: ≤0.6 gets 100 · ≥1.0 gets 0",mayer:"Score: ≤0.8 gets 100 · ≥2.4 gets 0",puell:"Score: ≤0.5 gets 100 · ≥4 gets 0"},
  valueL:"Value",riskL:"Short-term risk",actL:"What to do",riskW:{low:"Low",med:"Medium",high:"High"},
  riskSub:(up,bw)=>(up?"Above 200-day avg":"Below 200-day avg")+(bw?" · below 200-week":""),
  act:{addStrong:"DCA more",dcaGrad:"DCA gradually",normal:"DCA as usual",hold:"Hold, slow buys",reduce:"Pause buys"},
  rpL:"Market cost basis (realized price)",nuplL:"Market mood (NUPL)",nuplPh:["Capitulation","Hope / fear","Optimism","Belief","Euphoria"],
  secDca:"DCA simulator · if you had scaled buys by this score",
  dcaHead:(e,st)=>`Starting in ${st}, scaling buys by the score gives an average cost per BTC <b style="color:var(--z-${e>=0?"good":"bad"})">${Math.abs(e).toFixed(1)}% ${e>=0?"lower":"higher"}</b> than buying the same amount every time`,
  dcaCols:["","Invested","BTC bought","Avg cost"],dcaFlat:"Same amount",dcaSig:"Scaled by score",
  dcaNote:"Simulated buys every 7 days at $100 · the scaled version buys 0.25–2.5× that amount by level (same rule as What to do) · compared on average cost per BTC, because the totals invested differ · past results don't guarantee the future",
  all:"All", allStart:"the start", ranges:["1 year","4 years"], tabPrice:"Price", tabScore:"Score",
  lg:{btc:"BTC",w200:"200-week avg",d200:"200-day avg",cheap:"Very cheap days",rp:"Market cost basis",score:"Score",ma111:"111-day avg",ma350:"2× 350-day avg"},
  secCyc:"Past periods most like now",
  cycRow:(d,s,f90,f365)=>`<b>${d}</b> <span style="color:var(--muted)">${s}% similar</span> · price 90 days later <b>${f90}</b> · 1 year later <b>${f365}</b>`,
  cycNote:"Compares the shape and level of the last 90 days of the score with every past period (excluding the latest year) · similar doesn't mean price will repeat",
  secHm:"Monthly score · each cell is that month's average level",
  hmNote:"Green = cheap · red = expensive · ⛏ = halving month (the mining reward is cut in half)",
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
const ZHEX={good:["#1c7a47","#34d399"],ok:["#5a7711","#a3e635"],neutral:["#926500","#fbbf24"],warn:["#ae5318","#fb923c"],bad:["#bb2f24","#f87171"]};
const band=s=>s>=75?"good":s>=55?"ok":s>=40?"neutral":s>=25?"warn":"bad";
const hx=k=>ZHEX[k][DARK()?1:0];
const scoreVar=s=>`var(--z-${band(s)})`;
const inkHex=()=>DARK()?"#e9e7e1":"#171715";
const btcHex=()=>DARK()?"#f7931a":"#c96b08";
const nuplPhase=v=>L().nuplPh[v<0?0:v<0.25?1:v<0.5?2:v<0.75?3:4];
/* escape any data-sourced string before it enters innerHTML (defense-in-depth vs upstream tampering) */
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

async function ticker(){
  try{const r=await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT");const j=await r.json();return{price:+j.lastPrice,chg:+j.priceChangePercent};}catch(e){}
  try{const r=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true");const j=await r.json();return{price:j.bitcoin.usd,chg:j.bitcoin.usd_24h_change};}catch(e){return null;}
}
/* Data: slim data.json (built daily by GitHub Action — bakes in fresh bitcoin-data
   metrics so the browser never hits their 10 req/hr limit). Fallback: Coin Metrics CSV. */
async function getRaw(){
  try{
    const r=await fetch("data.json");if(!r.ok)throw 0;
    const j=await r.json(),fix=a=>a.map(v=>v===null?NaN:v);
    RAW={date:j.date,price:fix(j.price),mcap:fix(j.mcap),mvrv:fix(j.mvrv),issUsd:fix(j.issUsd),issNtv:fix(j.issNtv),supply:fix(j.supply)};
    FRESH=j.fresh||null;
  }catch(e){
    const r=await fetch(CSV);if(!r.ok)throw new Error("CSV "+r.status);
    RAW=Indicators.parseCSV(await r.text());FRESH=null;
  }
  ONCHAIN=RAW.date[RAW.date.length-1];
}
async function load(){const tp=ticker();await getRaw();await recompute(tp);} // live price + data.json in parallel
async function recompute(tp){
  const t=await(tp||ticker());lastT=t;const px=t?t.price:null;
  const data=px?Indicators.appendToday(RAW,px):{...RAW};COMP=Indicators.computeAll(data);
  // Current MVRV-Z/Puell come from our own series (live price + newest realized cap): fresher than
  // bitcoin-data's 7-day-delayed values, and the same method as the history/backtest (ADR-004).
  ONCHAIN_FRESH=(FRESH&&FRESH.date)||""; // date of the newest real on-chain input (realized price)
  SCORES=Indicators.scoreSeries(COMP);SNAP=Indicators.snapshot(COMP);render(t);
}

function coin(zone){
  const m={"STRONG BUY":{e:"open",mouth:"M34 60 Q50 76 66 60"},"ACCUMULATE":{e:"open",mouth:"M37 60 Q50 71 63 60"},"NEUTRAL":{e:"open",mouth:"M39 64 H61"},"CAUTION":{e:"flat",mouth:"M38 66 Q50 60 62 66"},"EXPENSIVE":{e:"flat",mouth:"M38 68 Q50 58 62 68"}}[zone]||{e:"open",mouth:"M39 64 H61"};
  const eyes=m.e==="flat"?'<rect x="34" y="45" width="11" height="3.5" rx="1.5"/><rect x="55" y="45" width="11" height="3.5" rx="1.5"/>':'<circle cx="39" cy="46" r="3.6"/><circle cx="61" cy="46" r="3.6"/>';
  document.getElementById("coin").innerHTML=`<circle cx="50" cy="50" r="45" fill="#f7931a"/><circle cx="50" cy="50" r="45" fill="none" stroke="#171715" stroke-width="3"/><g fill="#171715">${eyes}</g><path d="${m.mouth}" stroke="#171715" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
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
  document.getElementById("s-price-l").textContent=l.priceL;
  document.getElementById("s-val-l").textContent=l.valL;
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
  document.getElementById("hm-note").innerHTML=l.hmNote;
  document.getElementById("foot").innerHTML=l.foot;
  const ov=document.getElementById("ovmsg");if(ov)ov.textContent=l.loading;
  const lb=document.getElementById("langBtn");lb.textContent=LANG==="th"?"EN":"ไทย";lb.title=l.lang;
  document.getElementById("refresh").setAttribute("aria-label",l.refresh);themeBtnSync();
  document.getElementById("ins-disc").textContent=l.disc;
}
function setLang(x){LANG=x;localStorage.setItem("lang",x);applyStaticLang();if(COMP&&SNAP)render(lastT);}

const SCALE_K=["bad","warn","neutral","ok","good"];
function render(t){
  const l=L(),C=2*Math.PI*88,col=scoreVar(SNAP.overall);
  const arc=document.getElementById("arc");arc.style.stroke=col;arc.setAttribute("stroke-dasharray",C);arc.setAttribute("stroke-dashoffset",C);
  requestAnimationFrame(()=>arc.setAttribute("stroke-dashoffset",C*(1-SNAP.overall/100)));
  const sc=document.getElementById("score");sc.style.color=col;countUp(sc,SNAP.overall);
  const z=document.getElementById("zone");z.textContent=l.zone[SNAP.label];z.style.color=col;
  // percentile: share of all scored days with a lower score, i.e. days that were more expensive than today
  const past=SCORES.filter(Number.isFinite),pctl=Math.round(100*past.filter(v=>v<SNAP.overall).length/past.length);
  document.getElementById("zoneth").textContent=l.pctl(pctl,COMP.date[SCORES.findIndex(Number.isFinite)].slice(0,4));
  document.querySelector('.gauge svg[role="img"]').setAttribute("aria-label",l.scoreAria(Math.round(SNAP.overall)));
  coin(SNAP.label);

  document.getElementById("price").textContent="$"+Math.round(SNAP.price).toLocaleString("en-US");
  const chg=document.getElementById("chg");
  if(t&&Number.isFinite(t.chg)){chg.className="chg "+(t.chg>=0?"up":"down");chg.textContent=(t.chg>=0?"+":"−")+Math.abs(t.chg).toFixed(2)+"% "+l.d24;}else chg.textContent="";
  const now=new Date().toLocaleTimeString(LANG==="th"?"th-TH":"en-GB",{hour:"2-digit",minute:"2-digit"});
  const ocDate=ONCHAIN_FRESH||ONCHAIN,ocDays=Math.round((Date.now()-Date.parse(ocDate+"T00:00:00Z"))/86400000);
  let line2=l.onchain(esc(ocDate),ocDays);if(ocDays>10)line2+=l.stale; // bitcoin-data free tier lags 7d (since 2026-09); warn only beyond that
  document.getElementById("asof").innerHTML=(t?l.priceLive(now):l.priceOff)+"<br>"+line2;

  const cur=band(SNAP.overall),sl=document.getElementById("scale");sl.innerHTML="";
  SCALE_K.forEach((k,i)=>{const d=document.createElement("div");d.className="seg"+(k===cur?" on":"");d.textContent=l.scale[i];if(k===cur)d.style.borderTopColor=`var(--z-${k})`;sl.appendChild(d);});

  const up=SNAP.values.mayer>=1,belowW=SNAP.values.wma_mult<1;
  document.getElementById("s-price").textContent="$"+Math.round(SNAP.price).toLocaleString("en-US")+(t&&Number.isFinite(t.chg)?`  ${t.chg>=0?"+":"−"}${Math.abs(t.chg).toFixed(1)}%`:"");
  const sv=document.getElementById("s-val");sv.textContent=l.zone[SNAP.label];sv.style.color=scoreVar(SNAP.overall);
  const sm=document.getElementById("s-mom");sm.textContent=l.mom(up);sm.style.color=up?"var(--z-good)":"var(--z-warn)";
  // realized price + NUPL (baked into data.json by the daily Action; shown only if present)
  const rpW=document.getElementById("s-rp-wrap"),nuW=document.getElementById("s-nupl-wrap");
  if(FRESH&&Number.isFinite(FRESH.realizedPrice)){document.getElementById("s-rp-l").textContent=l.rpL;document.getElementById("s-rp").textContent="$"+Math.round(FRESH.realizedPrice).toLocaleString("en-US");rpW.hidden=false;}else rpW.hidden=true;
  const nupl=FRESH&&Number.isFinite(FRESH.realizedPrice)?1-FRESH.realizedPrice/SNAP.price:FRESH&&FRESH.nupl; // NUPL = 1 − realized/market, at the live price
  if(Number.isFinite(nupl)){document.getElementById("s-nupl-l").textContent=l.nuplL;document.getElementById("s-nupl").textContent=nupl.toFixed(2)+" · "+nuplPhase(nupl);nuW.hidden=false;}else nuW.hidden=true;
  // 3-layer Value / Risk / Action
  const riskKey=(!up&&belowW)?"high":(!up||belowW)?"med":"low";
  const actText=SNAP.overall>=55?(riskKey==="low"?l.act.addStrong:l.act.dcaGrad):SNAP.overall>=40?l.act.normal:(riskKey==="high"?l.act.reduce:l.act.hold);
  const riskCol=riskKey==="low"?"var(--z-good)":riskKey==="med"?"var(--z-neutral)":"var(--z-bad)";
  document.getElementById("layers").innerHTML=
    `<div class="cell"><div class="k">${l.valueL}</div><div class="v" style="color:${scoreVar(SNAP.overall)}">${SNAP.overall.toFixed(0)}</div><div class="vs">${l.zone[SNAP.label]}</div></div>
     <div class="cell"><div class="k">${l.riskL}</div><div class="v" style="color:${riskCol}">${l.riskW[riskKey]}</div><div class="vs">${l.riskSub(up,belowW)}</div></div>
     <div class="cell"><div class="k">${l.actL}</div><div class="v act">${actText}</div></div>`;

  const zhtml=`<b style="color:${scoreVar(SNAP.overall)}">${zInText(SNAP.label)}</b>`;
  document.getElementById("ins-what").innerHTML=l.what(zhtml,SNAP.overall.toFixed(0),up,belowW);
  document.getElementById("ins-dca").textContent=l.dca(SNAP.overall);
  const w200=COMP.ma200w[SNAP.idx];document.getElementById("ins-inval").textContent=l.inval(w200?Math.round(w200).toLocaleString("en-US"):"–");

  const rows=document.getElementById("rows");rows.innerHTML="";
  Indicators.INDICES.forEach(s=>{
    const v=SNAP.values[s.key],score=SNAP.scores[s.key],k=band(score);
    const el=document.createElement("div");el.className="row";
    el.innerHTML=`<div class="id"><span class="nm">${s.title}</span><span class="tier ${s.tier}" title="${l.weight(s.weight)}">×${s.weight}</span><span class="st" style="color:var(--z-${k})">${l.status[s.key](v)}</span><button class="i" aria-label="${l.info(s.title)}" aria-expanded="false">ⓘ</button></div>
      <div class="val">${s.fmt(v)}</div>
      <div class="sparkwrap">${spark(s.key,s.bands)}<span class="sc"><b style="color:var(--z-${k})">${score.toFixed(0)}</b>/100</span></div>
      <div class="rbar"><i style="background:var(--z-${k})"></i></div>
      <div class="info">${l.metric[s.key]||""}<span class="rd">${(l.read&&l.read[s.key])||""}</span></div>`;
    el.querySelector(".i").onclick=function(){this.setAttribute("aria-expanded",el.classList.toggle("open"));};
    rows.appendChild(el);requestAnimationFrame(()=>{el.querySelector(".rbar i").style.width=score+"%";});
  });

  buildTabs();drawChart();buildBtH();renderBacktest();
  buildDcaRange();renderDca();renderCycle();renderHeatmap();
  document.getElementById("app").hidden=false;document.getElementById("ov").classList.add("gone");
}

/* ---- DCA simulator ---- */
let curDcaStart="2020-01-01";
function buildDcaRange(){const h=document.getElementById("dcaRange");h.innerHTML="";
  [["2016","2016-01-01"],["2018","2018-01-01"],["2020","2020-01-01"],["2022","2022-01-01"],[L().all,null]].forEach(([la,st])=>{
    const b=document.createElement("button");b.textContent=la;if(st===curDcaStart)b.className="on";
    b.onclick=()=>{curDcaStart=st;buildDcaRange();renderDca();};h.appendChild(b);});}
function renderDca(){
  const l=L(),r=Indicators.dcaSim(COMP,SCORES,curDcaStart);
  if(!r){document.getElementById("dcaHead").textContent="";document.getElementById("dcaGrid").innerHTML="";return;}
  const startLbl=curDcaStart?curDcaStart.slice(0,4):l.allStart;
  document.getElementById("dcaHead").innerHTML=l.dcaHead(r.edge*100,startLbl);
  const money=v=>"$"+Math.round(v).toLocaleString("en-US");
  document.getElementById("dcaGrid").innerHTML=
    `<div class="h"></div><div class="h num">${l.dcaCols[1]}</div><div class="h num">${l.dcaCols[2]}</div><div class="h num">${l.dcaCols[3]}</div>
     <div class="r">${l.dcaSig}</div><div class="num">${money(r.invS)}</div><div class="num">${r.btcS.toFixed(4)}</div><div class="num win">${money(r.costS)}</div>
     <div class="r">${l.dcaFlat}</div><div class="num">${money(r.invF)}</div><div class="num">${r.btcF.toFixed(4)}</div><div class="num">${money(r.costF)}</div>`;
}

/* ---- cycle compare ---- */
function renderCycle(){
  const l=L(),box=document.getElementById("cycRows");box.innerHTML="";
  const ms=Indicators.cycleMatch(COMP,SCORES);
  const fp=v=>!Number.isFinite(v)?"–":`<span style="color:${v>=0?"var(--z-good)":"var(--z-bad)"}">${(v>=0?"+":"−")+Math.abs(v*100).toFixed(0)}%</span>`;
  ms.forEach(m=>{const el=document.createElement("div");el.className="cyc-row";
    el.innerHTML=l.cycRow(esc(m.date),Math.round(m.sim*100),fp(m.f90),fp(m.f365));box.appendChild(el);});
}

/* ---- heatmap (monthly average score) ---- */
const HALVINGS=["2012-11-28","2016-07-09","2020-05-11","2024-04-19"];
function renderHeatmap(){
  const hm=document.getElementById("hm");hm.innerHTML="";
  const agg={};
  for(let i=0;i<COMP.date.length;i++){const s=SCORES[i];if(!Number.isFinite(s))continue;
    const ym=COMP.date[i].slice(0,7);(agg[ym]=agg[ym]||[]).push(s);}
  const yms=Object.keys(agg);if(!yms.length)return;
  const y0=+yms[0].slice(0,4),y1=+yms[yms.length-1].slice(0,4);
  const hvYM=new Set(HALVINGS.map(d=>d.slice(0,7)));
  let html='<div class="y"></div>';for(let m=1;m<=12;m++)html+=`<div class="mh">${m}</div>`;
  for(let y=y1;y>=y0;y--){
    html+=`<div class="y">${y}</div>`;
    for(let m=1;m<=12;m++){
      const ym=y+"-"+String(m).padStart(2,"0"),a=agg[ym];
      if(!a){html+='<div class="m"></div>';continue;}
      const avg=a.reduce((x,v)=>x+v,0)/a.length;
      html+=`<div class="m${hvYM.has(ym)?" hv":""}" style="background:${hx(band(avg))}" title="${esc(ym)} · ${avg.toFixed(0)}"></div>`;
    }
  }
  hm.innerHTML=html;
}
function countUp(node,to){const t0=performance.now();
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){node.firstChild.textContent=Math.round(to);return;}
  (function step(t){const p=Math.min(1,(t-t0)/1000),e=1-Math.pow(1-p,3);node.firstChild.textContent=Math.round(to*e);if(p<1)requestAnimationFrame(step);})(t0);}

const pct=x=>(x>=0?"+":"−")+Math.abs(x*100).toFixed(0)+"%";
const zInText=k=>LANG==="en"?L().zone[k].toLowerCase():L().zone[k];
function buildBtH(){const h=document.getElementById("bth");h.innerHTML="";
  [[L().hz[0],30],[L().hz[1],90],[L().hz[2],180],[L().hz[3],365]].forEach(([la,n])=>{const b=document.createElement("button");b.textContent=la;if(n===curH)b.className="on";b.onclick=()=>{curH=n;buildBtH();renderBacktest();};h.appendChild(b);});}
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
function buildTabs(){
  const tabs=document.getElementById("tabs");tabs.innerHTML="";
  [["price",L().tabPrice],["score",L().tabScore],...Indicators.INDICES.map(s=>[s.key,s.title.replace(" Multiple","").replace(" Top","").replace("-Score","")])]
    .forEach(([k,la])=>{const b=document.createElement("button");b.textContent=la;if(k===curKey)b.className="on";b.onclick=()=>{curKey=k;buildTabs();drawChart();};tabs.appendChild(b);});
  const rg=document.getElementById("ranges");rg.innerHTML="";
  [[L().ranges[0],365],[L().ranges[1],1460],[L().all,99999]].forEach(([la,n])=>{const b=document.createElement("button");b.textContent=la;if(n===curRange)b.className="on";b.onclick=()=>{curRange=n;buildTabs();drawChart();};rg.appendChild(b);});
}
/* vertical dashed line + year label at each halving (price/score tabs) */
const halvingPlugin={id:"hv",afterDatasetsDraw(ch){
  const xs=ch.scales.x,labels=ch.data.labels;if(!xs||!labels||!labels.length)return;
  const ctx=ch.ctx,faint=DARK()?"#6c6960":"#a9a9a2";ctx.save();
  for(const d of HALVINGS){
    if(d<labels[0]||d>labels[labels.length-1])continue;
    let lo=0,hi=labels.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(labels[mid]<d)lo=mid+1;else hi=mid;}
    const x=xs.getPixelForValue(lo);
    ctx.strokeStyle=faint;ctx.lineWidth=1;ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(x,ch.chartArea.top);ctx.lineTo(x,ch.chartArea.bottom);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=faint;ctx.font="12px Anuphan";ctx.fillText("⛏"+d.slice(2,4),x+3,ch.chartArea.top+10);
  }
  ctx.restore();
}};

function drawChart(){
  if(!window.Chart){document.getElementById("chartjs").addEventListener("load",drawChart,{once:true});return;} // Chart.js is deferred; a CDN failure leaves the page usable, just chartless
  const N=COMP.date.length,start=Math.max(0,N-curRange),labels=COMP.date.slice(start),ink=inkHex();
  const grid={color:DARK()?"rgba(255,255,255,.07)":"rgba(20,20,16,.07)"},ticks={color:DARK()?"#85827b":"#6e6e69",font:{size:12,family:"Anuphan"},maxTicksLimit:5};
  const mk=(la,arr,color,w=1.8,dash=null)=>({label:la,data:arr.slice(start),borderColor:color,borderWidth:w,borderDash:dash||[],pointRadius:0,tension:.2,spanGaps:true,fill:false});
  let datasets=[],logY=false;const lg=L().lg;
  if(curKey==="price"){logY=true;datasets=[mk(lg.btc,COMP.price,ink,2),mk(lg.w200,COMP.ma200w,btcHex(),1.6),mk(lg.d200,COMP.ma200,DARK()?"#6c6960":"#a9a9a2",1,[4,4])];
    const sb=COMP.price.map((p,i)=>SCORES[i]>=75?p:null);datasets.push({label:lg.cheap,data:sb.slice(start),borderColor:hx("good"),backgroundColor:hx("good"),showLine:false,pointRadius:1.6,pointHoverRadius:3,spanGaps:false});
    if(FRESH&&Number.isFinite(FRESH.realizedPrice))datasets.push({label:lg.rp,data:labels.map(()=>FRESH.realizedPrice),borderColor:DARK()?"#9b988f":"#9a6a00",borderWidth:1,borderDash:[2,3],pointRadius:0,fill:false});}
  else if(curKey==="score"){datasets=[mk(lg.score,SCORES,ink,2)];[[75,hx("good")],[55,hx("ok")],[40,hx("neutral")],[25,hx("warn")]].forEach(([y,c])=>datasets.push({label:String(y),data:labels.map(()=>y),borderColor:c,borderWidth:1,borderDash:[5,4],pointRadius:0,fill:false}));}
  else if(curKey==="pi_ratio"){logY=true;datasets=[mk(lg.ma111,COMP.ma111,ink,1.8),mk(lg.ma350,COMP.ma350x2,hx("bad"),1.6)];}
  else{const s=Indicators.INDICES.find(x=>x.key===curKey);datasets=[mk(s.title,COMP[curKey],ink,2)];s.bands.forEach(b=>datasets.push({label:b.label,data:labels.map(()=>b.y),borderColor:b.color,borderWidth:1,borderDash:[5,4],pointRadius:0,fill:false}));}
  if(chart)chart.destroy();
  chart=new Chart(document.getElementById("chart"),{type:"line",data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,animation:false /* per-point animations made each draw ~15x slower (TBT/INP) */,interaction:{mode:"index",intersect:false},
    plugins:{legend:{display:datasets.length>1,labels:{color:DARK()?"#9b988f":"#5f5f5a",font:{size:12,family:"Anuphan"},boxWidth:14,boxHeight:1,usePointStyle:false}},tooltip:{backgroundColor:DARK()?"#16181c":"#171715",titleColor:"#fafaf8",bodyColor:"#d8d8d2",borderColor:DARK()?"rgba(255,255,255,.12)":"transparent",borderWidth:1,cornerRadius:0,padding:9,titleFont:{family:"Anuphan",size:13},bodyFont:{family:"Anuphan",size:13},displayColors:false}},
    scales:{x:{grid,ticks:{...ticks,maxTicksLimit:4,callback(v){return String(this.getLabelForValue(v)).slice(0,7);}} /* YYYY-MM: full dates collide on phones */,border:{color:DARK()?"rgba(255,255,255,.13)":"rgba(20,20,16,.14)"}},y:{type:logY?"logarithmic":"linear",grid,ticks,position:"right",border:{display:false}}}},
    plugins:(curKey==="price"||curKey==="score")?[halvingPlugin]:[]});
}

/* ---------- init ---------- */
const savedTheme=localStorage.getItem("theme");applyTheme(savedTheme||"auto");
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{if(!localStorage.getItem("theme")){themeBtnSync();if(COMP&&SNAP)render(lastT);}});
applyStaticLang();
document.getElementById("themeBtn").onclick=toggleTheme;
document.getElementById("langBtn").onclick=()=>setLang(LANG==="th"?"en":"th");
document.getElementById("refresh").onclick=async function(){this.classList.add("busy");try{await recompute();}catch(e){}this.classList.remove("busy");};
load().catch(e=>{document.getElementById("ovmsg").outerHTML='<p class="err">'+L().err(esc(e.message))+'</p>';});
// after load: keeps the SW precache downloads off the first-render critical path
if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
