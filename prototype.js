const state = {
  tab: 'c2c',
  c2c: { step: 0, item: '', memo: '', dueChoice: '1h', customDue: '', verified: false, events: [] },
  b2c: { step: 0, item: '', memo: '', dueChoice: '1d', customDue: '', verified: false, returnRequested: false, events: [] }
};

const steps = {
  c2c: ['填写借用请求', '出借方扫码', '确认借出', '确认收到', '发起归还', '确认归还'],
  b2c: ['商家上架', '顾客扫码', '确认借用', '使用中', '完成归还']
};
const labels = { '1h': '1 小时内', '12h': '12 小时内', '1d': '1 天内', '2d': '2 天内', custom: '自定义' };
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function due(s) { return s.dueChoice === 'custom' ? (s.customDue ? new Date(s.customDue).toLocaleString('zh-CN', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '未设置') : labels[s.dueChoice]; }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2400); }
function log(s, text) { s.events.push(text); }
function button(text, action, cls='primary', disabled=false) { return `<button class="btn ${cls}" data-action="${action}" ${disabled?'disabled':''}>${text}</button>`; }
function actions(...buttons) { return `<div class="actions">${buttons.join('')}</div>`; }
function card(role, active, body) { const isBorrower = role === '借用者'; return `<article class="person-card ${active?'active':'inactive'}"><div class="person-head"><div class="person-identity"><span class="avatar ${isBorrower?'borrower':'lender'}">${isBorrower?'◉':'▣'}</span><span class="person-name">${role}<small>${isBorrower?'BORROWER':'LENDER'}</small></span></div><span class="${active?'live-tag':'waiting-tag'}">${active?'当前操作':'等待中'}</span></div><div class="person-body">${body}</div></article>`; }
function placeholder(icon, title, desc) { return `<div class="placeholder"><div class="placeholder-icon">${icon}</div><h4>${title}</h4><p>${desc}</p></div>`; }
function summary(s) { return `<div class="summary"><div class="summary-row"><span>物品</span><span>${esc(s.item)}</span></div><div class="summary-row"><span>预计归还</span><span>${esc(due(s))}</span></div>${s.memo?`<div class="summary-row"><span>备注</span><span>${esc(s.memo)}</span></div>`:''}</div>`; }
function qr(seed) { let bits=''; for(let y=0;y<19;y++)for(let x=0;x<19;x++){const finder=(ox,oy)=>x>=ox&&x<ox+7&&y>=oy&&y<oy+7;let on=false;for(const [ox,oy] of [[0,0],[12,0],[0,12]])if(finder(ox,oy)){let a=x-ox,b=y-oy;on=a===0||a===6||b===0||b===6||(a>=2&&a<=4&&b>=2&&b<=4);break} if(!finder(0,0)&&!finder(12,0)&&!finder(0,12))on=((x*17+y*11+x*y*7+seed*13)%9)<4;bits+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${on?'#204c34':'#fff'}"/>`;} return `<svg class="qr" viewBox="0 0 19 19" aria-label="模拟二维码">${bits}</svg>`; }
function qrBox(title, hint, seed) { return `<div class="qr-box">${qr(seed)}<div class="qr-info"><strong>${title}</strong><span>${hint}</span></div></div>`; }
function choices(s) { return `<div class="choices">${Object.entries(labels).map(([key,label])=>`<button type="button" class="choice ${s.dueChoice===key?'selected':''}" data-choice="${key}">${label}</button>`).join('')}</div>${s.dueChoice==='custom'?`<div class="field"><input id="customDue" type="datetime-local" value="${esc(s.customDue)}" aria-label="自定义归还时间"></div>`:''}`; }
function form(s, business=false) { return `<div class="micro">${business?'STEP 01 · 商家准备':'STEP 01 · 发起请求'}</div><h4>${business?'上架一件可借物品':'你想借什么？'}</h4><p class="desc">${business?'填写物品信息，再把借用码放在顾客能看到的位置。':'先说清楚物品和预计归还时间，再邀请出借方确认。'}</p><div class="field"><label for="item">${business?'物品名称':'想借的物品'}</label><input id="item" maxlength="80" value="${esc(s.item)}" placeholder="${business?'例如：商场婴儿车 A-03':'例如：充电宝、雨伞、相机'}"></div><div class="field"><label>预计归还时间</label>${choices(s)}</div><div class="field"><label for="memo">备注 <span style="font-weight:400;color:#9baa9e">/ 可选</span></label><textarea id="memo" maxlength="240" placeholder="${business?'例如：请到服务台领取，归还时联系工作人员':'例如：在活动结束前归还'}">${esc(s.memo)}</textarea></div>${actions(button(business?'生成商家借用码 →':'生成借用请求 →',business?'b-publish':'c-create'))}`; }
function c2c(s) {
  let b='', l='', banner='借用者先发起请求，出借者通过二维码加入这次借还。';
  switch(s.step){
    case 0: b=form(s); l=placeholder('↔','等待借用请求','借用者填写信息并生成二维码后，出借者即可扫码。'); break;
    case 1: b=`<div class="micro">STEP 02 · 等待扫码</div><h4>把借用码给出借者看</h4><p class="desc">面对面展示二维码。演示时请点击右侧的“模拟扫码”。</p>${qrBox('出借者扫描此码','请求已创建 · 等待对方加入',1)}${summary(s)}${actions(button('修改请求','c-edit','ghost'))}`; l=`<div class="micro">LENDER · 扫码加入</div><h4>有人想向你借东西</h4><p class="desc">扫描借用者手机上的码，查看承诺内容。</p>${actions(button('模拟扫描借用码 →','c-scan'))}`; break;
    case 2: b=`<div class="micro">等待出借方</div><h4>对方正在确认身份</h4><p class="desc">World ID 验证通过后，出借者会检查内容并决定是否借出。</p>${qrBox('借用请求已被扫描','正在等待对方确认',2)}${summary(s)}`; l=`<div class="micro">STEP 03 · 身份验证</div><h4>先确认你是真人</h4><p class="desc">此处模拟跳转 World App，验证后会返回本页。</p>${summary(s)}<div class="verify"><span class="verify-logo">◉</span><span><b>World ID</b><small>只验证真人身份，不展示个人信息</small></span></div>${actions(button('打开 World App · 模拟验证 →','c-verify'))}`; break;
    case 3: b=`<div class="micro">等待出借方</div><h4>对方已完成 World ID 验证</h4><p class="desc">出借方正在核对物品和归还时间。</p>${summary(s)}`; l=`<div class="micro">STEP 04 · 出借确认</div><h4>确定借出这件物品？</h4><p class="desc">确认之后借用者会收到通知，双方再面对面交接实物。</p><div class="verify"><span class="verify-logo">✓</span><span><b>World ID 已验证</b><small>你已作为出借方登记</small></span></div>${summary(s)}${actions(button('确认借出 →','c-lend'))}`; break;
    case 4: b=`<div class="micro">STEP 05 · 实物交接</div><h4>确认已经拿到物品</h4><p class="desc">出借方同意了请求。拿到实物后，点击下方开始使用。</p>${summary(s)}${actions(button('我已收到，开始使用 →','c-receive'))}`; l=`<div class="micro">等待借用者</div><h4>已确认借出</h4><p class="desc">请把物品交给借用者，等待对方确认收到。</p>${summary(s)}`; break;
    case 5: b=`<div class="micro">借用进行中</div><h4>${esc(s.item)} 正在借用中</h4><p class="desc">使用结束后，请面对面归还，并发起归还确认。</p>${summary(s)}${actions(button('我已归还 · 展示归还码 →','c-return'))}`; l=`<div class="micro">借用进行中</div><h4>等待物品归还</h4><p class="desc">借用者发起归还后，你可以核对实物并确认。</p>${summary(s)}`; break;
    case 6: b=`<div class="micro">STEP 06 · 发起归还</div><h4>请出借者确认收回</h4><p class="desc">面对面展示归还码，让出借方核对物品并完成承诺。</p>${qrBox('归还确认码','出借者扫码后确认实物已收回',6)}${summary(s)}`; l=`<div class="micro">归还待确认</div><h4>借用者说已归还</h4><p class="desc">收到实物后扫描归还码。也可以在这个原型中直接模拟扫码。</p>${actions(button('模拟扫描归还码 →','c-return-scan'))}`; break;
    case 7: b=`<div class="micro">等待最后确认</div><h4>出借方正在核对物品</h4><p class="desc">归还码已被扫描，请等待对方确认收回。</p>${summary(s)}`; l=`<div class="micro">FINAL STEP · 核对实物</div><h4>确认物品已收回？</h4><p class="desc">请先检查实物。确认后，这笔面对面的借还即告完成。</p>${summary(s)}${actions(button('确认已收回 · 完成借还','c-finish'))}`; break;
    default: b=complete(s,'你的借用承诺已完成','物品已经归还，出借方确认收回。'); l=complete(s,'一笔可信的借还，完成了','你已确认收到归还的物品。'); banner='借还已完成，双方都获得这次承诺的完成记录。';
  }
  return {b,l,banner,active: s.step===0?'b':s.step===1?'l':s.step===2?'l':s.step===3?'l':s.step===4?'b':s.step===5?'b':s.step===6?'l':s.step===7?'l':'both'};
}
function b2c(s) {
  let b='',l='',banner='商家先录入物品并展示二维码，顾客扫码后即可借用。';
  switch(s.step){
    case 0: l=form(s,true); b=placeholder('▣','等待商家上架','商家录入物品后，顾客扫描借用码即可看到详情。'); break;
    case 1: l=`<div class="micro">已上架 · 商家视角</div><h4>借用码已准备好</h4><p class="desc">把二维码放在服务台或物品旁，等待顾客扫码。</p>${qrBox('顾客扫描此码','公开借用信息 · 无需商家重复填写',11)}${summary(s)}${actions(button('修改物品信息','b-edit','ghost'))}`; b=`<div class="micro">STEP 02 · 顾客扫码</div><h4>需要借用这件物品？</h4><p class="desc">对准商家展示的二维码。原型中直接点击下方按钮。</p>${actions(button('模拟扫描商家借用码 →','b-scan'))}`; break;
    case 2: l=`<div class="micro">等待顾客确认</div><h4>顾客正在查看物品</h4><p class="desc">对方完成身份验证并确认后，借用凭证会显示在其页面上。</p>${summary(s)}`; b=`<div class="micro">STEP 03 · 顾客确认</div><h4>确认借用 ${esc(s.item)}？</h4><p class="desc">确认之后即视为已领取。请在面对面拿到实物后操作。</p>${summary(s)}<div class="verify"><span class="verify-logo">◉</span><span><b>World ID</b><small>${s.verified?'已验证真人身份':'需要先验证真人身份'}</small></span></div>${actions(s.verified?button('确认借用 · 生成领取凭证 →','b-accept'):button('打开 World App · 模拟验证 →','b-verify'))}`; break;
    case 3: l=`<div class="micro">商家视角 · 借用中</div><h4>顾客已确认借用</h4><p class="desc">请查看顾客的领取凭证，然后交付实物。归还时，你可以直接确认收回。</p>${summary(s)}${actions(button('实物已归还 · 直接确认','b-merchant-finish','secondary'))}`; b=`<div class="micro">借用进行中</div><h4>出示领取凭证</h4><p class="desc">将这个凭证展示给商家，即可把物品带走。归还后可以主动提醒商家确认。</p><div class="verify"><span class="verify-logo">✓</span><span><b>借用凭证已生效</b><small>World ID 真人验证通过</small></span></div>${summary(s)}${actions(button('我已归还 · 通知商家 →','b-return'))}`; break;
    case 4: l=`<div class="micro">归还待确认</div><h4>顾客说已归还</h4><p class="desc">请核对实物。确认收到后，双方的借还记录将完成。</p>${summary(s)}${actions(button('确认物品已收回 · 完成借还','b-merchant-finish'))}`; b=`<div class="micro">等待商家确认</div><h4>已通知商家归还</h4><p class="desc">请提醒商家核对物品并点击确认。</p>${summary(s)}`; break;
    default: l=complete(s,'借还已完成','商家已确认收回物品。'); b=complete(s,'借用承诺已完成','这件物品已归还，感谢你认真完成承诺。'); banner='商家已确认收回，双方都能看到完成记录。';
  }
  return {b,l,banner,active:s.step===0?'l':s.step===1?'b':s.step===2?'b':s.step===3?'both':s.step===4?'l':'both'};
}
function complete(s,title,desc){return `<div class="success-mark">✓</div><div class="micro">PROOF OF PROMISE · FULFILLED</div><h4>${title}</h4><p class="desc">${desc}</p>${summary(s)}<div class="verify"><span class="verify-logo">✳</span><span><b>承诺已履行</b><small>一个真实的人，完成了一次真实的借还。</small></span></div>`;}
function render(){
  const tab=state.tab,s=state[tab],flow=tab==='c2c'?c2c(s):b2c(s);document.querySelectorAll('.tab').forEach(el=>{const active=el.dataset.tab===tab;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));});$('#scenario').setAttribute('aria-labelledby',`tab-${tab}`);
  const title=tab==='c2c'?'从一个借用请求开始':'把可借物品交到顾客手中';const sub=tab==='c2c'?'借用者提出需求，出借者验证并确认，双方完成交接与归还。':'商家先上架物品，顾客扫码确认，归还时由商家最终核对。';
  const progressStep=tab==='c2c'?Math.min(5,[0,1,1,2,3,4,4,5,5][s.step]):Math.min(4,[0,1,2,3,4,4][s.step]);
  $('#scenario').innerHTML=`<div class="scenario-intro"><div><h3>${title}</h3><p>${sub}</p></div><button class="reset" data-action="reset">↺ 重新体验</button></div><div class="progress">${steps[tab].map((name,i)=>`<div class="progress-item ${i<progressStep?'done':i===progressStep?'current':''}"><span class="dot">${i<progressStep?'✓':i+1}</span><span>${name}</span></div>`).join('')}</div><div class="stage"><div class="stage-banner"><span class="pulse"></span><span>${flow.banner}</span></div><div class="stage-grid">${tab==='c2c'?card('借用者',flow.active==='b'||flow.active==='both',flow.b)+card('出借者',flow.active==='l'||flow.active==='both',flow.l):card('商家 · 出借方',flow.active==='l'||flow.active==='both',flow.l)+card('顾客 · 借用者',flow.active==='b'||flow.active==='both',flow.b)}</div></div><div class="timeline"><span class="timeline-label">ACTIVITY</span>${s.events.length?s.events.map(e=>`<span class="event">${esc(e)}</span>`).join(''):'<span class="event" style="color:#a6b0a6">等待第一步操作</span>'}</div>`;
}
function validate(s){const input=$('#item');if(!s.item.trim()){input?.focus();toast('请先填写物品名称');return false;}if(s.dueChoice==='custom'&&(!s.customDue||new Date(s.customDue).getTime()<=Date.now())){$('#customDue')?.focus();toast('请选择未来的归还时间');return false;}return true;}
document.addEventListener('input',e=>{const s=state[state.tab];if(e.target.id==='item')s.item=e.target.value;if(e.target.id==='memo')s.memo=e.target.value;if(e.target.id==='customDue')s.customDue=e.target.value;});
document.addEventListener('click',e=>{const tab=e.target.closest('[data-tab]');if(tab){state.tab=tab.dataset.tab;render();return;}const choice=e.target.closest('[data-choice]');if(choice){state[state.tab].dueChoice=choice.dataset.choice;render();return;}const control=e.target.closest('[data-action]');if(!control)return;const action=control.dataset.action,s=state[state.tab];if(action==='reset'){state[state.tab]=state.tab==='c2c'?{step:0,item:'',memo:'',dueChoice:'1h',customDue:'',verified:false,events:[]}:{step:0,item:'',memo:'',dueChoice:'1d',customDue:'',verified:false,returnRequested:false,events:[]};render();toast('场景已重置');return;}
  const transitions={
    'c-create':()=>{if(!validate(s))return;log(s,'借用请求已创建');s.step=1},'c-edit':()=>{s.step=0},'c-scan':()=>{log(s,'出借方已扫码');s.step=2},'c-verify':()=>{s.verified=true;log(s,'出借方 World ID 已验证');s.step=3;toast('模拟验证成功，已返回网站')},'c-lend':()=>{log(s,'出借方确认借出');s.step=4},'c-receive':()=>{log(s,'借用者已收到物品');s.step=5},'c-return':()=>{log(s,'借用者发起归还');s.step=6},'c-return-scan':()=>{log(s,'出借方已扫描归还码');s.step=7},'c-finish':()=>{log(s,'出借方确认收回');s.step=8},
    'b-publish':()=>{if(!validate(s))return;log(s,'商家已上架物品');s.step=1},'b-edit':()=>{s.step=0},'b-scan':()=>{log(s,'顾客已扫码');s.step=2},'b-verify':()=>{s.verified=true;log(s,'顾客 World ID 已验证');toast('模拟验证成功，已返回网站')},'b-accept':()=>{log(s,'顾客确认借用');s.step=3},'b-return':()=>{s.returnRequested=true;log(s,'顾客通知已归还');s.step=4},'b-merchant-finish':()=>{log(s,s.returnRequested?'商家确认收回':'商家直接确认收回');s.step=5}
  };if(transitions[action]){transitions[action]();render();}
});
render();
