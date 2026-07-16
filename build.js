/* 냉장고 사전 build.js — node build.js
   생성물: dist/보관/{id}/, dist/유통기한/{id}/, dist/상함/{id}/, dist/냉동/{id}/
           + sitemap.xml(501) + robots.txt + index.html + data.js 복사 */
const fs = require("fs");
const path = require("path");
const FOODS = require("./data.js");

const SITE = "https://fridge.onlyonecorpceo.workers.dev";
const GA_ID = "G-MN64DEBD1B";
const COUPANG_URL = "https://link.coupang.com/a/fqedlbpwg8";
const AMAZON_URL = "https://www.amazon.com/s?k=food+storage+containers&tag=onlyone0c-20";
const HUB = "https://main.onlyonecorpceo.workers.dev";

const CATS = {
  veg:["채소","Vegetables"], fruit:["과일","Fruits"], meat:["육류","Meat"],
  seafood:["수산물","Seafood"], dairy:["유제품·계란","Dairy & Eggs"],
  grain:["곡물·면·빵","Grains & Bread"], sauce:["소스·양념","Sauces"],
  cooked:["반찬·요리","Cooked Dishes"], drink:["음료","Drinks"]
};
const UNITS = { h:["시간","hr"], d:["일","d"], w:["주","wk"], M:["개월","mo"], y:["년","yr"] };

function fmt(v, l) {
  const i = l === "ko" ? 0 : 1;
  if (v === null) return l === "ko" ? "비권장" : "Not recommended";
  if (v === "inf") return l === "ko" ? "무기한 (반영구)" : "Indefinite";
  const u = UNITS[v[2]][i];
  if (l === "ko") return v[1] ? `${v[0]}~${v[1]}${u}` : `${v[0]}${u}`;
  return v[1] ? `${v[0]}–${v[1]} ${u}` : `${v[0]} ${u}`;
}
function fmtShort(v, l) { // 제목·요약용 짧은 표현
  const s = fmt(v, l);
  return v === null ? (l === "ko" ? "비권장" : "skip") : s;
}
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}

/* ---- 페이지 타입 정의 ---- */
const TYPES = {
  "보관": {
    title: f => [`${f.ko} 보관법 — 실온? 냉장? 얼마나 갈까`, `How to Store ${f.en} — Pantry or Fridge?`],
    h1:    f => [`${f.e} ${f.ko}, 어디에 얼마나 보관할까요?`, `${f.e} Where and how long to store ${f.en.toLowerCase()}?`],
    desc:  f => [`${f.ko} 보관법 총정리 — 실온 ${fmtShort(f.rt,"ko")}, 냉장 ${fmtShort(f.fr,"ko")}, 냉동 ${fmtShort(f.fz,"ko")}. 신선하게 오래 보관하는 요령까지.`,
                 `How to store ${f.en.toLowerCase()}: pantry ${fmtShort(f.rt,"en")}, fridge ${fmtShort(f.fr,"en")}, freezer ${fmtShort(f.fz,"en")}.`]
  },
  "유통기한": {
    title: f => [`${f.ko} 유통기한·소비기한 — 지나면 언제까지?`, `${f.en} Shelf Life — How Long Past the Date?`],
    h1:    f => [`${f.e} ${f.ko}, 기한 지나면 못 먹나요?`, `${f.e} Is ${f.en.toLowerCase()} still good past the date?`],
    desc:  f => [`${f.ko} 유통기한과 소비기한의 차이, 기한이 지났을 때 판단 기준을 정리했어요.`,
                 `${f.en} shelf life explained — sell-by vs use-by, and how to judge past-date food.`]
  },
  "상함": {
    title: f => [`${f.ko} 상했는지 확인하는 법 — 이 신호면 버리세요`, `Has ${f.en} Gone Bad? Signs to Check`],
    h1:    f => [`${f.e} 이 ${f.ko}, 상한 걸까요?`, `${f.e} Has this ${f.en.toLowerCase()} gone bad?`],
    desc:  f => [`${f.ko}가 상했는지 3초 만에 판별하는 법 — 냄새, 색, 촉감으로 확인하는 상함 신호 총정리.`,
                 `Spot spoiled ${f.en.toLowerCase()} in seconds — the smell, color and texture signals.`]
  },
  "냉동": {
    title: f => [`${f.ko} 냉동 보관 되나요? 기간과 해동법`, `Can You Freeze ${f.en}? Time & Thawing`],
    h1:    f => f.fz ? [`${f.e} ${f.ko}, 냉동하면 ${fmtShort(f.fz,"ko")} 갑니다`, `${f.e} Frozen ${f.en.toLowerCase()} keeps ${fmtShort(f.fz,"en")}`]
                : f.rt === "inf" ? [`${f.e} ${f.ko}, 냉동할 필요가 없어요`, `${f.e} ${f.en} doesn't need a freezer`]
                : [`${f.e} ${f.ko}, 냉동은 비권장이에요`, `${f.e} Freezing ${f.en.toLowerCase()}? Better not`],
    desc:  f => [`${f.ko} 냉동 보관 가능 여부와 기간(${fmtShort(f.fz,"ko")}), 맛을 지키는 냉동·해동 요령.`,
                 `Freezing ${f.en.toLowerCase()}: ${fmtShort(f.fz,"en")}, plus how to freeze and thaw right.`]
  }
};

/* ---- 공통 문단 (페이지 볼륨·E-E-A-T 보강) ---- */
const COMMON = {
  "유통기한": [
    `<h2>📅 유통기한 vs 소비기한, 뭐가 다른가요?</h2>
     <p><b>유통기한</b>은 "팔아도 되는 기한", <b>소비기한</b>은 "먹어도 되는 기한"이에요. 한국은 2023년부터 소비기한 표시제로 전환되어, 지금 라벨의 날짜는 대부분 '진짜 마지노선'에 가까운 소비기한입니다. 다만 소비기한은 <b>보관 조건을 지켰을 때</b>의 약속이라, 냉장식품을 실온에 방치했다면 날짜와 무관하게 짧아져요.</p>`,
    `<h2>📅 Sell-by vs Use-by</h2>
     <p>A <b>sell-by</b> date is for the store; a <b>use-by</b> date is for you. Since 2023 Korea has switched to use-by labeling, so the printed date is close to the real deadline — but only if storage conditions were kept. A chilled item left out loses that promise regardless of the date.</p>`
  ],
  "상함": [
    `<h2>🛡️ 판단이 어려울 땐 이 원칙</h2>
     <p>식품 안전의 제1원칙은 <b>"의심되면 버린다(When in doubt, throw it out)"</b>예요. 상한 음식의 독소 중 상당수는 <b>끓여도 사라지지 않고</b>, 냄새로 감지되지 않는 경우도 있어요. 아까운 마음에 맛보기로 확인하는 건 가장 위험한 방법입니다 — 눈과 코로 판단하고, 확신이 없으면 보내주세요.</p>`,
    `<h2>🛡️ When unsure, one rule</h2>
     <p>Food safety rule number one: <b>when in doubt, throw it out</b>. Many toxins survive boiling and some spoilage carries no smell at all. Taste-testing questionable food is the riskiest method there is — judge with eyes and nose, and let it go when uncertain.</p>`
  ],
  "냉동": [
    `<h2>❄️ 냉동·해동의 4가지 원칙</h2>
     <p>① <b>빨리 얼릴수록 맛있다</b> — 납작하게 펴고 금속 트레이에 올리면 급속냉동 효과. ② <b>공기가 적</b> — 랩+지퍼백 이중 포장으로 냉동상(freezer burn)을 막으세요. ③ <b>해동은 냉장실에서</b> — 실온 해동은 겉면부터 세균이 증식해요. ④ <b>한 번 해동한 식품은 재냉동 금지</b> — 익혀서 다시 얼리는 건 괜찮아요.</p>`,
    `<h2>❄️ Four rules of freezing</h2>
     <p>① <b>Faster freeze, better taste</b> — flatten portions on a metal tray. ② <b>Air is the enemy</b> — double-wrap against freezer burn. ③ <b>Thaw in the fridge</b>, never on the counter where surfaces breed bacteria. ④ <b>Never refreeze raw thawed food</b> — cook it first if you must.</p>`
  ],
  "보관": [
    `<h2>🌡️ 냉장고, 자리마다 온도가 달라요</h2>
     <p>냉장실 <b>문쪽 선반은 가장 따뜻</b>해서(여닫을 때마다 출렁) 소스류 자리이고, <b>안쪽 깊은 칸이 가장 차가워</b> 우유·육류 자리예요. 야채칸은 습도가 높게 설계되어 채소 전용입니다. "어디에 두느냐"가 "며칠 더 가느냐"를 결정해요.</p>`,
    `<h2>🌡️ Your fridge has climate zones</h2>
     <p>The <b>door shelves run warmest</b> (they swing with every open) — sauce territory. The <b>deep back is coldest</b> — milk and meat territory. The crisper holds humidity for produce. Where you put it decides how long it lasts.</p>`
  ]
};

/* ---- 페이지 템플릿 ---- */
function durCards(f, l) {
  const items = [
    ["🏠", l==="ko"?"실온":"Pantry", f.rt],
    ["🧊", l==="ko"?"냉장":"Fridge", f.fr],
    ["❄️", l==="ko"?"냉동":"Freezer", f.fz]
  ];
  return `<div class="durs">` + items.map(([e,label,v]) => {
    const na = v===null;
    return `<div class="dur${na?' na':''}"><div class="de">${e}</div><div class="dl">${label}</div><div class="dv">${fmt(v,l)}</div></div>`;
  }).join("") + `</div>`;
}

function typeBody(type, f, l) {
  const i = l === "ko" ? 0 : 1;
  if (type === "보관") return `
    ${durCards(f, l)}
    <div class="note">${l==="ko"?"※ 개봉·손질 후 기준이에요. 미개봉 제품은 포장의 소비기한을 따르세요.":"※ Times assume opened/prepped items. Sealed products follow the package date."}</div>
    <h2>${l==="ko"?"💡 이렇게 보관하세요":"💡 Store it like this"}</h2>
    <p class="big">${f.tip[i]}</p>
    ${COMMON["보관"][i]}`;
  if (type === "유통기한") return `
    <h2>${l==="ko"?"⏳ 핵심 정리":"⏳ The short answer"}</h2>
    <p class="big">${f.exp[i]}</p>
    ${durCards(f, l)}
    ${COMMON["유통기한"][i]}
    <p>${l==="ko"?`상태 확인이 먼저라면 <a href="/상함/${encodeURIComponent(f.id)}/">${f.ko} 상했는지 확인하는 법</a>을 참고하세요.`:`Not sure about its condition? See <a href="/상함/${encodeURIComponent(f.id)}/">how to tell if ${f.en.toLowerCase()} has gone bad</a>.`}</p>`;
  if (type === "상함") return `
    <h2>${l==="ko"?"🚨 이 신호면 버리세요":"🚨 Toss it if you see this"}</h2>
    <p class="big">${f.bad[i]}</p>
    ${COMMON["상함"][i]}
    <h2>${l==="ko"?"⏱️ 참고: 정상 보관 기간":"⏱️ Reference: normal storage times"}</h2>
    ${durCards(f, l)}
    <p>${l==="ko"?`기간 안이라도 보관 상태가 나빴다면 상할 수 있어요 — <a href="/보관/${encodeURIComponent(f.id)}/">${f.ko} 올바른 보관법</a>으로 다음번엔 더 오래 지키세요.`:`Even within these windows, poor storage spoils food — see <a href="/보관/${encodeURIComponent(f.id)}/">the right way to store ${f.en.toLowerCase()}</a>.`}</p>`;
  // 냉동
  return `
    <div class="verdict ${f.fz?"ok":"no"}">${
      f.fz===null && f.rt==="inf" ? (l==="ko"?"⭕ 냉동 필요 없음 — 실온 무기한":"⭕ No freezer needed — keeps indefinitely")
      : f.fz===null ? (l==="ko"?"❌ 냉동 비권장":"❌ Freezing not recommended")
      : f.fz==="inf" ? (l==="ko"?"⭕ 냉동 필요 없음 (실온 무기한)":"⭕ No freezer needed")
      : (l==="ko"?`⭕ 냉동 가능 — ${fmt(f.fz,"ko")}`:`⭕ Freezes well — ${fmt(f.fz,"en")}`)
    }</div>
    <h2>${l==="ko"?"❄️ 방법과 이유":"❄️ How & why"}</h2>
    <p class="big">${f.fzt[i]}</p>
    ${COMMON["냉동"][i]}`;
}

function relatedLinks(f, l) {
  const same = FOODS.filter(x => x.g === f.g && x.id !== f.id).slice(0, 8);
  return same.map(x =>
    `<a class="rel" href="/보관/${encodeURIComponent(x.id)}/">${x.e} ${l==="ko"?x.ko:x.en}</a>`
  ).join("");
}

function otherTypeLinks(type, f, l) {
  const labels = {
    "보관":   [`${f.ko} 보관법`, `Storing ${f.en}`],
    "유통기한":[`${f.ko} 유통기한`, `${f.en} shelf life`],
    "상함":   [`${f.ko} 상했는지 확인`, `Is ${f.en} bad?`],
    "냉동":   [`${f.ko} 냉동 가능?`, `Freezing ${f.en}`]
  };
  return Object.keys(TYPES).filter(t => t !== type).map(t =>
    `<a class="tab" href="/${encodeURIComponent(t)}/${encodeURIComponent(f.id)}/">${labels[t][l==="ko"?0:1]}</a>`
  ).join("");
}

function page(type, f) {
  const T = TYPES[type];
  const [tKo, tEn] = T.title(f);
  const [h1Ko, h1En] = T.h1(f);
  const [dKo, dEn] = T.desc(f);
  const url = `${SITE}/${encodeURIComponent(type)}/${encodeURIComponent(f.id)}/`;
  const catKo = CATS[f.g][0], catEn = CATS[f.g][1];

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(tKo)} | 냉장고 사전</title>
<meta name="description" content="${esc(dKo)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(tKo)}">
<meta property="og:description" content="${esc(dKo)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="article">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧊</text></svg>">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
(function(){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA_ID}';document.head.appendChild(s);gtag('js',new Date());gtag('config','${GA_ID}');})();
(function(){try{var c=localStorage.getItem('oo_consent');if(c==='granted'){gtag('consent','update',{analytics_storage:'granted'});return;}if(c==='denied')return;var tz=(Intl.DateTimeFormat().resolvedOptions().timeZone||'');if(tz.indexOf('Europe/')!==0){gtag('consent','update',{analytics_storage:'granted'});try{localStorage.setItem('oo_consent','granted');}catch(e){}}}catch(e){}})();
</script>
<style>
:root{--bg:#FAFAF8;--ink:#3D4248;--accent:#B5342E;--line:#E8E6E1;--soft:#6B7178;--card:#fff;--ok:#2E7D52;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;background:var(--bg);color:var(--ink);line-height:1.75;}
.wrap{max-width:720px;margin:0 auto;padding:0 20px;}
header{padding:22px 0;}
.topbar{display:flex;justify-content:space-between;align-items:center;}
.logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14px;color:var(--ink);text-decoration:none;}
.pill{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 13px;font-size:12.5px;font-weight:600;color:var(--ink);text-decoration:none;cursor:pointer;}
.crumb{font-size:13px;color:var(--soft);margin:14px 0 4px;}
.crumb a{color:var(--soft);}
h1{font-size:clamp(23px,4.6vw,32px);font-weight:800;letter-spacing:-.4px;line-height:1.3;margin:6px 0 18px;}
h2{font-size:19px;font-weight:800;margin:34px 0 10px;letter-spacing:-.2px;}
p{margin:10px 0;}
.big{font-size:17px;background:#fff;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:12px;padding:16px 18px;}
a{color:var(--accent);}
.durs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0 6px;}
.dur{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 10px;text-align:center;}
.dur.na{opacity:.45;}
.de{font-size:22px;}.dl{font-size:12.5px;color:var(--soft);margin-top:4px;}.dv{font-weight:800;font-size:15.5px;margin-top:2px;letter-spacing:-.3px;}
.note{font-size:12.5px;color:var(--soft);margin-bottom:6px;}
.verdict{font-size:20px;font-weight:800;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:18px;text-align:center;margin:16px 0;}
.verdict.ok{color:var(--ok);}.verdict.no{color:var(--accent);}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin:26px 0 4px;}
.tab{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 14px;font-size:13.5px;font-weight:700;color:var(--ink);text-decoration:none;}
.tab:hover{border-color:var(--accent);color:var(--accent);}
.rels{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;}
.rel{border:1px solid var(--line);background:#fff;border-radius:10px;padding:7px 12px;font-size:13.5px;color:var(--ink);text-decoration:none;}
.rel:hover{border-color:var(--accent);}
.cta{display:block;background:var(--ink);color:#fff;text-align:center;border-radius:14px;padding:16px;font-weight:800;text-decoration:none;margin:30px 0 10px;font-size:15.5px;}
.aff{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin:22px 0;font-size:14px;}
.aff a{font-weight:800;}
.disc{font-size:11.5px;color:var(--soft);margin-top:8px;}
footer{border-top:1px solid var(--line);margin-top:44px;padding:24px 0 44px;color:var(--soft);font-size:12.5px;}
footer a{color:var(--soft);}
@media(max-width:480px){.durs{gap:6px;}.dv{font-size:13.5px;}}
</style>
</head>
<body>
<header class="wrap">
  <div class="topbar">
    <a class="logo" href="${HUB}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="#3D4248" stroke-width="2.2"/><path d="M15.5 15.5L21 21" stroke="#B5342E" stroke-width="2.6" stroke-linecap="round"/></svg>OnlyOne</a>
    <a class="pill" href="/">🧊 냉장고 사전</a>
  </div>
</header>
<main class="wrap">
  <div class="crumb"><a href="/">냉장고 사전</a> · ${catKo} · ${f.ko}</div>
  <h1>${h1Ko}</h1>
  ${typeBody(type, f, "ko")}

  <h2>🔎 ${f.ko}의 다른 질문들</h2>
  <div class="tabs">${otherTypeLinks(type, f, "ko")}</div>

  <h2>🧺 함께 보는 ${catKo}</h2>
  <div class="rels">${relatedLinks(f, "ko")}</div>

  <a class="cta" href="/?utm_source=seo&utm_medium=static&utm_campaign=fridge">🧊 다른 음식도 3초 검색 — 냉장고 사전 열기</a>

  <div class="aff">
    ${f.fz===null && f.rt!=="inf"
      ? `🥡 무르고 상하기 쉬운 식재료일수록 <a href="${COUPANG_URL}" rel="nofollow sponsored" target="_blank">밀폐용기</a> 하나가 며칠을 벌어줘요.`
      : `❄️ 냉동 보관의 절반은 포장이에요 — <a href="${COUPANG_URL}" rel="nofollow sponsored" target="_blank">지퍼백·진공팩 보기</a>`}
    <div class="disc">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</div>
  </div>

  <p class="note">※ 본 내용은 일반적인 보관 가이드이며, 제품 포장의 표시사항과 실제 상태 확인이 항상 우선입니다.</p>
</main>
<footer>
  <div class="wrap">
    냉장고 사전 · Fridge Dictionary — For a Happy Day<br>
    © OnlyOne · <a href="mailto:onlyonecorpceo@gmail.com">onlyonecorpceo@gmail.com</a> · <a href="${HUB}">Hub</a>
  </div>
</footer>
</body>
</html>`;
}

/* ---- 빌드 ---- */
const DIST = path.join(__dirname, "dist");
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

let count = 0;
const urls = [SITE + "/"];
for (const type of Object.keys(TYPES)) {
  for (const f of FOODS) {
    const dir = path.join(DIST, type, f.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), page(type, f));
    urls.push(`${SITE}/${encodeURIComponent(type)}/${encodeURIComponent(f.id)}/`);
    count++;
  }
}

fs.writeFileSync(path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n") + `\n</urlset>`);

fs.writeFileSync(path.join(DIST, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);

fs.copyFileSync(path.join(__dirname, "index.html"), path.join(DIST, "index.html"));
fs.copyFileSync(path.join(__dirname, "data.js"), path.join(DIST, "data.js"));

console.log(`✅ 빌드 완료: 상세 ${count}페이지 + 앱 1 = 사이트맵 ${urls.length} URL`);
