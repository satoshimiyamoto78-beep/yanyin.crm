const {chromium,devices}=require('playwright');
// Stress test for the static demo: every screen of both apps, light and dark,
// 6x CPU throttle; records page errors, long tasks and slow frames per step.
// Usage: serve the demo on :3200, then  S=./stress-out node scripts/stress-test.cjs
const S=process.env.S||'stress-out';require('fs').mkdirSync(S+'/stress',{recursive:true});
(async()=>{
const b=await chromium.launch();const report=[];
async function run(app,theme){
  const ctx=await b.newContext({...devices['Pixel 5']});
  await ctx.addInitScript(t=>{try{localStorage.setItem('yanyin:crew-prefs',JSON.stringify({lang:'ru'}));localStorage.setItem('yanyin:theme',t);}catch(e){}
    window.__lt=[];try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push([e.startTime,e.duration]))).observe({type:'longtask'})}catch(e){}
    window.__f=[];let last=0;const loop=t=>{if(last)window.__f.push([t,t-last]);last=t;requestAnimationFrame(loop)};requestAnimationFrame(loop);},theme);
  const p=await ctx.newPage();p.setDefaultTimeout(4000);const c=await ctx.newCDPSession(p);await c.send('Emulation.setCPUThrottlingRate',{rate:6});
  const errs=[];p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,160))});
  let n=0;
  async function step(name,fn){
    const t0=await p.evaluate(()=>performance.now()).catch(()=>0);const e0=errs.length;let fail='';
    try{await fn();}catch(e){fail=e.message.split('\n')[0].slice(0,140)}
    await p.waitForTimeout(700).catch(()=>{});
    const m=await p.evaluate(t0=>{if(t0>performance.now())t0=0;const f=(window.__f||[]).filter(x=>x[0]>t0);const lt=(window.__lt||[]).filter(x=>x[0]>t0);
      return {frames:f.length,janky:f.filter(x=>x[1]>50).length,worst:Math.round(Math.max(0,...f.map(x=>x[1]))),longTasks:lt.length,longest:Math.round(Math.max(0,...lt.map(x=>x[1])))}},t0).catch(()=>({frames:0,janky:0,worst:0,longTasks:0,longest:0,closed:true}));
    n++;await p.screenshot({path:`${S}/stress/${app}-${theme[0]}-${String(n).padStart(2,'0')}.png`}).catch(()=>{});
    report.push({app,theme,step:name,...m,fail,errs:errs.slice(e0)});require('fs').writeFileSync(S+'/stress.json',JSON.stringify(report,null,1));
  }
  const btn=(re)=>p.getByRole('button',{name:re}).first();
  const back=async()=>{await p.keyboard.press('Escape');await p.waitForTimeout(400);};
  if(app==='crew'){
    await step('load',async()=>{await p.goto('http://localhost:3200/crew.html');await p.waitForTimeout(2500)});
    await step('home scroll',async()=>{for(let i=0;i<6;i++){await p.mouse.wheel(0,400);await p.waitForTimeout(150)}await p.evaluate(()=>scrollTo(0,0))});
    await step('island bill',async()=>{await p.waitForSelector('.island-shell.on',{timeout:15000});await p.locator('[role=status]').click();await p.waitForTimeout(700)});
    await step('island open bill',async()=>{await btn(/^Открыть счёт/).click();await p.waitForTimeout(900)});
    await step('back from bill',async()=>{await p.goBack().catch(()=>{});await back();await p.locator('nav button').nth(1).click()});
    await step('hall',async()=>{await p.waitForTimeout(500)});
    for(const [label,re] of [['tables',/^Столы/],['orders',/^Заказы/],['bookings',/^Брони/]]){
      await step('hall → '+label,async()=>{await btn(re).click();await p.waitForTimeout(800);for(let i=0;i<4;i++){await p.mouse.wheel(0,500);await p.waitForTimeout(120)}});
      await step('back '+label,async()=>{await btn(/^Зал$/).click()});
    }
    await step('till',async()=>{await btn(/^Касса/).click();await p.waitForTimeout(800);for(let i=0;i<6;i++){await p.mouse.wheel(0,500);await p.waitForTimeout(120)}});
    await step('till close',back);
    await step('kitchen',async()=>{await btn(/^Кухня/).click();await p.waitForTimeout(800)});
    await step('kitchen close',back);
    await step('table 2',async()=>{await btn(/^Заказы/).click();await p.waitForTimeout(600);await p.getByRole('button',{name:/Стол 2/}).first().click();await p.waitForTimeout(800)});
    await step('add items',async()=>{await btn(/Добавить/).click();await p.waitForTimeout(800);for(let i=0;i<4;i++){await p.mouse.wheel(0,500);await p.waitForTimeout(120)}});
    await step('close picker',async()=>{await back();await back();await back()});
    await step('cabinet',async()=>{await p.locator('nav button').nth(2).click();await p.waitForTimeout(600);for(let i=0;i<8;i++){await p.mouse.wheel(0,500);await p.waitForTimeout(120)}});
    for(const re of [/^Заказы/,/^Чаевые/,/^Смены/]){
      await step('history '+re.source,async()=>{await p.getByRole('heading',{name:'История'}).scrollIntoViewIfNeeded();await p.locator('section',{has:p.getByRole('heading',{name:'История'})}).getByRole('button',{name:re}).click();await p.waitForTimeout(800);for(let i=0;i<4;i++){await p.mouse.wheel(0,500);await p.waitForTimeout(120)}});
      await step('close history',back);
    }
    await step('home',async()=>{await p.locator('nav button').nth(0).click();await p.evaluate(()=>scrollTo(0,0))});
    await step('yan',async()=>{await p.getByRole('button',{name:/Ян/}).first().click();await p.waitForTimeout(900)});
    await step('yan close',async()=>{await p.getByRole('button',{name:/^Назад|^Back/}).first().click();await p.waitForTimeout(500)});
    await step('inbox',async()=>{await p.getByRole('button',{name:/Уведомления/}).first().click();await p.waitForTimeout(800)});
    await step('inbox close',async()=>{await back();await back()});
    await step('search',async()=>{await p.getByText(/Столы, блюда/).first().click();await p.keyboard.type('плов',{delay:60});await p.waitForTimeout(600)});
    await step('search close',async()=>{await back();await back()});
    await step('theme toggle',async()=>{await p.getByRole('button',{name:/тем|Theme|Тёмн|Светл/i}).first().click();await p.waitForTimeout(700)});
  } else {
    const url=app==='zabey'?'http://localhost:3200/zabey.html?table=3':'http://localhost:3200/samarkand.html?table=7';
    await step('load',async()=>{await p.goto(url);await p.waitForTimeout(2000);const y=p.getByRole('button',{name:/18\+/});if(await y.count())await y.first().click();await p.waitForTimeout(800)});
    await step('menu scroll',async()=>{for(let i=0;i<10;i++){await p.mouse.wheel(0,500);await p.waitForTimeout(120)}await p.evaluate(()=>scrollTo(0,0))});
    await step('strip scroll',async()=>{await p.evaluate(()=>{const s=document.querySelector('.grid-rows-2');if(s)s.scrollLeft=500});await p.waitForTimeout(400);await p.evaluate(()=>{const s=document.querySelector('.grid-rows-2');if(s)s.scrollLeft=0})});
    await step('dish open',async()=>{await p.locator('main img').nth(2).click();await p.waitForTimeout(900)});
    await step('dish add',async()=>{await p.getByRole('button',{name:/^(Добавить|Add|Thêm) ·/}).last().click();await p.waitForTimeout(600)});
    await step('dish close',back);
    await step('roulette',async()=>{await btn(/Roulette|Рулетка|Vòng quay/).click();await p.waitForTimeout(800)});
    await step('roulette spin',async()=>{await btn(/Spin|Крутить|Quay/).click();await p.waitForTimeout(5000)});
    await step('roulette close',async()=>{await back();await back()});
    await step('categories',async()=>{await btn(/Categories|Категории/).click();await p.waitForTimeout(700)});
    await step('categories close',back);
    await step('wifi',async()=>{await btn(/Wi-Fi/).click();await p.waitForTimeout(700)});
    await step('wifi close',back);
    await step('waiter',async()=>{await btn(/^Waiter|^Официант/).click();await p.waitForTimeout(900)});
    await step('bill',async()=>{await btn(/^Bill|^Счёт/).click();await p.waitForTimeout(900)});
    await step('bill close',back);
    await step('cart',async()=>{await btn(/Cart|Корзин|Order|Заказ/).last().click();await p.waitForTimeout(800)});
    await step('cart close',back);
    await step('theme toggle',async()=>{await p.locator('header button').first().click().catch(()=>{});await p.waitForTimeout(700)});
  }
  await ctx.close();
}
for(const app of (process.env.APPS||'crew,samarkand,zabey').split(','))for(const th of (process.env.THEMES||'light,dark').split(',')){try{await run(app,th)}catch(e){report.push({app,theme:th,step:'CRASH',fail:e.message.slice(0,200),errs:[],frames:0,janky:0,worst:0,longTasks:0,longest:0})}}
require('fs').writeFileSync(S+'/stress.json',JSON.stringify(report,null,1));
await b.close();})();
