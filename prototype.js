const state = {
  tab: 'c2c',
  c2c: { step: 0, item: 'USB-C 充电宝', memo: '', dueChoice: '1h', customDue: '', borrowerVerified: false, verified: false, dispute: null, window: null, itemPosition: 'right', events: [] },
  b2c: { step: 0, item: '商场婴儿车 A-03', memo: '', dueChoice: '1d', customDue: '', verified: false, returnRequested: false, dispute: null, window: null, itemPosition: 'left', inventory: [], selectedItem: 0, events: [] }
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
function danger(text) { return `<div class="danger-callout"><b>! 当面确认</b><span>${text}</span></div>`; }
function appeal(reason, label='对方未确认？立即申诉') { return button(label, `appeal:${reason}`, 'danger'); }
function verifiedBadge(label='World ID 真人身份已验证') { return `<div class="verify"><span class="verify-logo">✓</span><span><b>${label}</b><small>仅确认是真人，不公开个人身份</small></span></div>`; }
function startWindow(s, phase) { s.window={phase,deadline:Date.now()+15000}; }
function seconds(s) { return Math.max(0,Math.ceil((((s.window?.deadline)||Date.now())-Date.now())/1000)); }
function timer(s, text) { return `<div class="handoff-timer"><span class="timer-number" data-window-countdown>${seconds(s)}</span><div><b>秒 · ${text}</b><small>倒计时内可当面确认或提出异议；没有异议则自动推进</small></div></div>`; }
function objectTracker(s, mode) {
  const c=mode==='c2c',left=c?'借用者':'商家',right=c?'出借者':'顾客';
  const expect=c?(s.step>=4&&s.step<=5?'left':'right'):(s.step>=3&&s.step<=4?'right':'left');
  const actual=s.itemPosition,good=actual===expect;
  return `<section class="object-tracker"><div class="tracker-heading"><div><span class="micro">PHYSICAL ITEM · 实物位置</span><h4>点按一侧，移动这件物品</h4></div><span>仅模拟实物位置，不改变上方流程</span></div><div class="tracker-lanes"><button class="tracker-side ${actual==='left'?'holding':''}" data-position="left"><span>${left}</span>${actual==='left'?`<span class="parcel" aria-label="物品在${left}手中">📦</span>`:'<span class="empty-spot">点击移到这里</span>'}</button><div class="tracker-arrow">↔</div><button class="tracker-side ${actual==='right'?'holding':''}" data-position="right"><span>${right}</span>${actual==='right'?`<span class="parcel" aria-label="物品在${right}手中">📦</span>`:'<span class="empty-spot">点击移到这里</span>'}</button></div><div class="tracker-status ${good?'good':'bad'}"><b>${good?'✓ 位置符合当前步骤':'! 位置与当前步骤不符'}</b><span>目前在${actual==='left'?left:right}手中；当前应在${expect==='left'?left:right}手中。${good?'':'请当面核对实物，并在 15 秒窗口内确认或申诉。'}</span></div></section>`;
}
function card(role, active, body) { const isBorrower = role === '借用者'; return `<article class="person-card ${active?'active':'inactive'}"><div class="person-head"><div class="person-identity"><span class="avatar ${isBorrower?'borrower':'lender'}">${isBorrower?'◉':'▣'}</span><span class="person-name">${role}<small>${isBorrower?'BORROWER':'LENDER'}</small></span></div><span class="${active?'live-tag':'waiting-tag'}">${active?'当前操作':'等待中'}</span></div><div class="person-body">${body}</div></article>`; }
function placeholder(icon, title, desc) { return `<div class="placeholder"><div class="placeholder-icon">${icon}</div><h4>${title}</h4><p>${desc}</p></div>`; }
function summary(s) { return `<div class="summary"><div class="summary-row"><span>物品</span><span>${esc(s.item)}</span></div><div class="summary-row"><span>预计归还</span><span>${esc(due(s))}</span></div>${s.memo?`<div class="summary-row"><span>备注</span><span>${esc(s.memo)}</span></div>`:''}</div>`; }
function qr(seed) { let bits=''; for(let y=0;y<19;y++)for(let x=0;x<19;x++){const finder=(ox,oy)=>x>=ox&&x<ox+7&&y>=oy&&y<oy+7;let on=false;for(const [ox,oy] of [[0,0],[12,0],[0,12]])if(finder(ox,oy)){let a=x-ox,b=y-oy;on=a===0||a===6||b===0||b===6||(a>=2&&a<=4&&b>=2&&b<=4);break} if(!finder(0,0)&&!finder(12,0)&&!finder(0,12))on=((x*17+y*11+x*y*7+seed*13)%9)<4;bits+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${on?'#204c34':'#fff'}"/>`;} return `<svg class="qr" viewBox="0 0 19 19" aria-label="模拟二维码">${bits}</svg>`; }
function qrBox(title, hint, seed) { return `<div class="qr-box">${qr(seed)}<div class="qr-info"><strong>${title}</strong><span>${hint}</span></div></div>`; }
function choices(s) { return `<div class="choices">${Object.entries(labels).map(([key,label])=>`<button type="button" class="choice ${s.dueChoice===key?'selected':''}" data-choice="${key}">${label}</button>`).join('')}</div>${s.dueChoice==='custom'?`<div class="field"><input id="customDue" type="datetime-local" value="${esc(s.customDue)}" aria-label="自定义归还时间"></div>`:''}`; }
function form(s, business=false) { return `<div class="micro">${business?'STEP 01 · 商家准备':'STEP 01 · 发起请求'}</div><h4>${business?'上架一件可借物品':'你想借什么？'}</h4><p class="desc">${business?'可连续上架多件物品，每件生成独立二维码；商家无需 World ID。':'先验证 World ID，再填写需求并生成借用码。'}</p>${!business?(s.borrowerVerified?verifiedBadge('借用者 World ID 已验证'):`<div class="verify"><span class="verify-logo">◉</span><span><b>借用者须先做 World ID 验证</b><small>验证后才能发起请求</small></span></div>`):''}<div class="field"><label for="item">${business?'物品名称':'想借的物品'}</label><input id="item" maxlength="80" value="${esc(s.item)}" placeholder="${business?'例如：商场婴儿车 A-03':'例如：充电宝、雨伞、相机'}"></div><div class="field"><label>预计归还时间</label>${choices(s)}</div><div class="field"><label for="memo">备注 <span style="font-weight:400;color:#9baa9e">/ 可选</span></label><textarea id="memo" maxlength="240" placeholder="${business?'例如：请到服务台领取，归还时联系工作人员':'例如：在活动结束前归还'}">${esc(s.memo)}</textarea></div>${actions(button(business?'生成商家借用码 →':s.borrowerVerified?'生成借用请求 →':'打开 World App · 模拟验证 →',business?'b-publish':s.borrowerVerified?'c-create':'c-borrower-verify'))}`; }
function c2c(s) {
  let b='', l='', banner='借用者先发起请求，出借者通过二维码加入这次借还。';
  switch(s.step){
    case 0: b=form(s); l=placeholder('↔','等待借用请求','借用者填写信息并生成二维码后，出借者即可扫码。'); break;
    case 1: b=`<div class="micro">STEP 02 · 等待扫码</div><h4>把借用码给出借者看</h4><p class="desc">面对面展示二维码。演示时请点击右侧的“模拟扫码”。</p>${qrBox('出借者扫描此码','请求已创建 · 等待对方加入',1)}${summary(s)}${actions(button('修改请求','c-edit','ghost'))}`; l=`<div class="micro">LENDER · 扫码加入</div><h4>有人想向你借东西</h4><p class="desc">扫描借用者手机上的码，查看承诺内容。</p>${actions(button('模拟扫描借用码 →','c-scan'))}`; break;
    case 2: b=`<div class="micro">等待出借方</div><h4>对方正在确认身份</h4><p class="desc">World ID 验证通过后，出借者会检查内容并决定是否借出。</p>${qrBox('借用请求已被扫描','正在等待对方确认',2)}${summary(s)}`; l=`<div class="micro">STEP 03 · 身份验证</div><h4>先确认你是真人</h4><p class="desc">借用者已完成真人验证。请你也验证后再决定是否借出。</p>${verifiedBadge('借用者已完成 World ID 真人验证')}${summary(s)}<div class="verify"><span class="verify-logo">◉</span><span><b>出借者 World ID</b><small>此处模拟跳转 World App</small></span></div>${actions(button('打开 World App · 模拟验证 →','c-verify'))}`; break;
    case 3: b=`<div class="micro">等待出借方</div><h4>对方已完成 World ID 验证</h4><p class="desc">出借方正在核对物品和归还时间。</p>${summary(s)}`; l=`<div class="micro">STEP 04 · 出借确认</div><h4>确定借出这件物品？</h4>${danger('请先当面核对物品。点击下方按钮会开启 15 秒交接窗口；请要求借用者当面确认收到，遇到问题立即申诉。')}${verifiedBadge('借用者已完成真人验证')}${summary(s)}${actions(button('同意借出 · 给双方 15 秒 →','c-lend'))}`; break;
    case 4: b=`<div class="micro">STEP 05 · 15 秒交接窗口</div><h4>确认已经拿到物品</h4>${timer(s,'当面交接')}${danger('只有实际拿到物品后才能点“我已收到”。如果没有拿到，必须在倒计时内申诉；否则时间结束会自动记为已收到。')}${summary(s)}${actions(button('我已收到实物 · 开始借用 →','c-receive'),appeal('no-handover','没拿到物品 · 立即申诉'))}`; l=`<div class="micro">出借者 · 15 秒交接窗口</div><h4>留在现场等待确认</h4>${timer(s,'等待借用者确认')}${danger('交出物品后要求借用者当面点“已收到”。若对方拿走了却不确认，在倒计时内申诉。无人申诉则到时自动记为收到。')}${summary(s)}${actions(appeal('no-receipt','对方拿走了却未确认 · 申诉'))}`; break;
    case 5: b=`<div class="micro">借用进行中</div><h4>${esc(s.item)} 正在借用中</h4><p class="desc">使用结束后，请面对面归还，并发起归还确认。</p>${summary(s)}${actions(button('我已归还 · 开启 15 秒归还窗口 →','c-return'))}`; l=`<div class="micro">借用进行中</div><h4>等待物品归还</h4><p class="desc">借用者发起归还后，你可以核对实物并确认。</p>${summary(s)}`; break;
    case 6: b=`<div class="micro">STEP 06 · 15 秒归还窗口</div><h4>请出借者确认收回</h4>${timer(s,'当面归还')}${danger('交还实物后留在现场，要求对方确认；如果对方拒绝确认，在倒计时内申诉。')}${qrBox('归还确认码','出借者扫码后确认实物已收回',6)}${actions(appeal('return-unconfirmed','已还但对方不确认 · 申诉'))}`; l=`<div class="micro">出借者 · 15 秒归还窗口</div><h4>核对实物后确认</h4>${timer(s,'核对归还')}${danger('没有真正收到实物时，必须在倒计时内申诉；无人申诉则到时自动记为已归还。')}${actions(button('已收到归还实物 · 完成借还','c-finish'),appeal('false-return','并未收到实物 · 申诉'))}`; break;
    case 7: b=`<div class="micro">等待最后确认</div><h4>出借方正在核对物品</h4>${danger('请在现场要求出借者点“确认已收回”。如果他离开或拒绝确认，立即申诉。')}${summary(s)}${actions(appeal('return-unconfirmed','已还但对方不确认 · 申诉'))}`; l=`<div class="micro">FINAL STEP · 核对实物</div><h4>确认物品已收回？</h4>${danger('只有真正收回实物后才能完成这笔借还。')}${summary(s)}${actions(button('确认已收回 · 完成借还','c-finish'),appeal('false-return','对方未交还实物 · 申诉'))}`; break;
    default: b=complete(s,'你的借用承诺已完成','物品已经归还，出借方确认收回。'); l=complete(s,'一笔可信的借还，完成了','你已确认收到归还的物品。'); banner='借还已完成，双方都获得这次承诺的完成记录。';
  }
  return {b,l,banner,active: s.step===0?'b':s.step===1?'l':s.step===2?'l':s.step===3?'l':s.step===4?'b':s.step===5?'b':s.step===6?'l':s.step===7?'l':'both'};
}
function b2c(s) {
  let b='',l='',banner='商家先录入物品并展示二维码，顾客扫码后即可借用。';
  const inventory = `<div class="inventory"><div class="micro">商家已上架 · ${s.inventory.length} 件</div>${s.inventory.map((entry,i)=>`<button class="inventory-row ${i===s.selectedItem?'selected':''}" data-item-index="${i}"><span>${esc(entry.item)}</span><small>独立借用码 #${String(i+1).padStart(2,'0')}</small></button>`).join('')}</div>`;
  switch(s.step){
    case 0: l=`${s.inventory.length?inventory:''}${form(s,true)}`; b=placeholder('▣','等待商家上架','商家录入物品后，顾客扫描借用码即可看到详情。'); break;
    case 1: l=`<div class="micro">已上架 · 商家视角</div><h4>每件物品都有独立借用码</h4><p class="desc">点击列表可预览不同物品的二维码；可以继续批量添加。</p>${inventory}${qrBox('顾客扫描此码',`当前物品：${esc(s.item)}`,11+s.selectedItem)}${summary(s)}${actions(button('再上架一件物品','b-add','secondary'),button('修改当前物品','b-edit','ghost'))}`; b=`<div class="micro">STEP 02 · 顾客扫码</div><h4>需要借用这件物品？</h4><p class="desc">商家已上架 ${s.inventory.length} 件物品。当前展示：${esc(s.item)}。</p>${actions(button('模拟扫描当前借用码 →','b-scan'))}`; break;
    case 2: l=`<div class="micro">等待顾客确认</div><h4>顾客正在查看物品</h4><p class="desc">对方完成身份验证后，会开启 15 秒当面交接窗口。</p>${summary(s)}`; b=`<div class="micro">STEP 03 · 顾客确认</div><h4>确认借用 ${esc(s.item)}？</h4><p class="desc">点击后开启 15 秒交接窗口。请留在商家面前领取实物。</p>${summary(s)}<div class="verify"><span class="verify-logo">◉</span><span><b>World ID</b><small>${s.verified?'已验证真人身份':'需要先验证真人身份'}</small></span></div>${actions(s.verified?button('确认借用 · 开启 15 秒交接 →','b-accept'):button('打开 World App · 模拟验证 →','b-verify'))}`; break;
    case 3: l=`<div class="micro">商家 · 15 秒交接窗口</div><h4>核对凭证并交付实物</h4>${timer(s,'当面交付')}${danger('交货前核对顾客的有效借用凭证。若交接有问题，请在倒计时内申诉。')}${summary(s)}${actions(appeal('merchant-handoff','交接有问题 · 申诉'))}`; b=`<div class="micro">顾客 · 15 秒交接窗口</div><h4>领取实物并确认</h4>${timer(s,'当面领取')}${danger('拿到实物就点“已收到”。若商家没有交货，务必在倒计时内申诉；否则会自动记为已收到。')}${verifiedBadge('顾客 World ID 已验证')}${summary(s)}${actions(button('我已收到实物 →','b-receive'),appeal('merchant-no-handover','未拿到物品 · 立即申诉'))}`; break;
    case 4: l=`<div class="micro">商家视角 · 借用中</div><h4>顾客已借用物品</h4><p class="desc">归还时，商家可直接确认收到，或等待顾客主动发起归还。</p>${summary(s)}${actions(button('实物已归还 · 直接确认','b-merchant-finish','secondary'))}`; b=`<div class="micro">借用进行中</div><h4>借用凭证已生效</h4><p class="desc">使用结束后请当面归还，并要求商家确认。</p>${summary(s)}${actions(button('我已归还 · 开启 15 秒确认 →','b-return'))}`; break;
    case 5: l=`<div class="micro">商家 · 15 秒归还窗口</div><h4>核对物品后确认收回</h4>${timer(s,'核对归还')}${danger('没有拿到实物，必须在倒计时内申诉；没有异议会自动记为已归还。')}${summary(s)}${actions(button('已收回实物 · 完成借还','b-merchant-finish'),appeal('merchant-no-return','顾客未归还 · 申诉'))}`; b=`<div class="micro">顾客 · 15 秒归还窗口</div><h4>等待商家确认</h4>${timer(s,'等待商家确认')}${danger('交还实物后请留在现场，要求商家点确认。若对方拒绝，在倒计时内申诉。')}${summary(s)}${actions(appeal('merchant-no-confirm','已归还但商家不确认 · 申诉'))}`; break;
    default: l=complete(s,'借还已完成','商家已确认收回物品。'); b=complete(s,'借用承诺已完成','这件物品已归还，感谢你认真完成承诺。'); banner='商家已确认收回，双方都能看到完成记录。';
  }
  return {b,l,banner,active:s.step===0?'l':s.step===1?'b':s.step===2?'b':s.step===3?'both':s.step===4?'both':s.step===5?'both':'both'};
}
function complete(s,title,desc){return `<div class="success-mark">✓</div><div class="micro">PROOF OF PROMISE · FULFILLED</div><h4>${title}</h4><p class="desc">${desc}</p>${summary(s)}<div class="verify"><span class="verify-logo">✳</span><span><b>承诺已履行</b><small>一个真实的人，完成了一次真实的借还。</small></span></div>`;}
const disputeReasons = {
  'no-handover':['借用者','出借者','出借者同意后，我没有拿到实物'],
  'no-receipt':['出借者','借用者','我已交出实物，对方没有确认收到'],
  'return-unconfirmed':['借用者','出借者','我已归还实物，对方没有确认收回'],
  'false-return':['出借者','借用者','对方说已归还，但我没有收到实物'],
  'merchant-no-handover':['顾客','商家','我确认借用后，商家没有交付实物'],
  'merchant-handoff':['商家','顾客','这次实物交接有问题'],
  'merchant-no-return':['商家','顾客','顾客未归还实物'],
  'merchant-no-confirm':['顾客','商家','我已归还实物，商家没有确认收回']
};
function settleWindow(s, mode, transferred, note){
  const phase=s.window?.phase;
  s.dispute=null;s.window=null;
  if(mode==='c2c')s.step=phase==='handoff'?(transferred?5:3):(transferred?8:5);
  else s.step=phase==='handoff'?(transferred?4:2):(transferred?6:4);
  log(s,note);
}
function disputePanel(s){
  if(!s.dispute)return '';
  const d=s.dispute,[by,to,reason]=disputeReasons[d.reason],left=state.tab==='c2c'?'借用者':'商家',right=state.tab==='c2c'?'出借者':'顾客';
  const vote=(role)=>`<div class="vote-row"><b>${role}${d.votes?.[role]!==undefined?` · 已选择${d.votes[role]?'已交接':'未交接'}`:''}</b>${button('实物已交接',`dispute-vote:${role}:yes`,'secondary')}${button('实物未交接',`dispute-vote:${role}:no`,'danger-outline')}</div>`;
  const status=d.status==='open'?`等待 ${to} 回应 · <strong data-window-countdown>${seconds(s)}</strong> 秒`:'双方说法不一致 · 交接已暂停';
  const controls=d.status==='open'
    ?`<div class="dispute-actions">${button(`${to}：同意申诉`,'dispute-accept','secondary')}${button(`${to}：我不同意`,'dispute-rebut','danger-outline')}${button(`${by}：撤回申诉`,'dispute-withdraw','ghost')}</div>`
    :`<div class="dispute-resolution">${d.votes&&Object.keys(d.votes).length===2?'两人的选择不同，仍需继续当面核对。':'请双方分别确认实际交接结果。'}双方选择一致后继续。</div>${vote(left)}${vote(right)}`;
  return `<section class="dispute-panel" aria-live="polite"><div class="dispute-head"><span>! ${by}提出当场异议</span><b>${status}</b></div><h4>${esc(reason)}</h4><p>这件事只在${by}和${to}之间处理。${d.status==='open'?'对方须在当前 15 秒窗口内回应；无人反驳则按申诉内容处理。':'请两人在现场核对实物，分别选择同一个结果；意见一致后流程才继续。'}</p>${controls}</section>`;
}
function render(){
  const tab=state.tab,s=state[tab],flow=tab==='c2c'?c2c(s):b2c(s);document.querySelectorAll('.tab').forEach(el=>{const active=el.dataset.tab===tab;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));});$('#scenario').setAttribute('aria-labelledby',`tab-${tab}`);
  const title=tab==='c2c'?'从一个借用请求开始':'把可借物品交到顾客手中';const sub=tab==='c2c'?'借用者提出需求，出借者验证并确认，双方完成交接与归还。':'商家先上架物品，顾客扫码确认，归还时由商家最终核对。';
  const progressStep=tab==='c2c'?Math.min(5,[0,1,1,2,3,4,4,5,5][s.step]):Math.min(4,[0,1,2,2,3,4,4][s.step]);
  $('#scenario').innerHTML=`<div class="scenario-intro"><div><h3>${title}</h3><p>${sub}</p></div><button class="reset" data-action="reset">↺ 重新体验</button></div><div class="progress">${steps[tab].map((name,i)=>`<div class="progress-item ${i<progressStep?'done':i===progressStep?'current':''}"><span class="dot">${i<progressStep?'✓':i+1}</span><span>${name}</span></div>`).join('')}</div><div class="stage"><div class="stage-banner"><span class="pulse"></span><span>${flow.banner}</span></div>${disputePanel(s)}<div class="stage-grid ${s.dispute?'paused':''}">${tab==='c2c'?card('借用者',flow.active==='b'||flow.active==='both',flow.b)+card('出借者',flow.active==='l'||flow.active==='both',flow.l):card('商家 · 出借方',flow.active==='l'||flow.active==='both',flow.l)+card('顾客 · 借用者',flow.active==='b'||flow.active==='both',flow.b)}</div>${objectTracker(s,tab)}</div><div class="timeline"><span class="timeline-label">ACTIVITY</span>${s.events.length?s.events.map(e=>`<span class="event">${esc(e)}</span>`).join(''):'<span class="event" style="color:#a6b0a6">等待第一步操作</span>'}</div>`;
}
function validate(s){const input=$('#item');if(!s.item.trim()){input?.focus();toast('请先填写物品名称');return false;}if(s.dueChoice==='custom'&&(!s.customDue||new Date(s.customDue).getTime()<=Date.now())){$('#customDue')?.focus();toast('请选择未来的归还时间');return false;}return true;}
document.addEventListener('input',e=>{const s=state[state.tab];if(e.target.id==='item')s.item=e.target.value;if(e.target.id==='memo')s.memo=e.target.value;if(e.target.id==='customDue')s.customDue=e.target.value;});
function claimOutcome(reason){return !['no-handover','false-return','merchant-no-handover','merchant-handoff','merchant-no-return'].includes(reason);}
function expireWindow(s,mode){
  if(!s.window||Date.now()<s.window.deadline||s.dispute?.status==='contested')return false;
  if(s.dispute?.status==='open')settleWindow(s,mode,claimOutcome(s.dispute.reason),'15 秒内无人反驳，按当场申诉结果处理');
  else settleWindow(s,mode,true,'15 秒内无人提出异议，交接自动确认');
  return true;
}
document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-tab]');if(tab){state.tab=tab.dataset.tab;render();return;}
  const position=e.target.closest('[data-position]');if(position){state[state.tab].itemPosition=position.dataset.position;render();return;}
  const itemChoice=e.target.closest('[data-item-index]');if(itemChoice){const s=state.b2c,i=Number(itemChoice.dataset.itemIndex);s.selectedItem=i;Object.assign(s,s.inventory[i]);render();return;}
  const choice=e.target.closest('[data-choice]');if(choice){state[state.tab].dueChoice=choice.dataset.choice;render();return;}
  const control=e.target.closest('[data-action]');if(!control)return;
  const action=control.dataset.action,s=state[state.tab],mode=state.tab;
  if(action==='reset'){
    state[mode]=mode==='c2c'?{step:0,item:'USB-C 充电宝',memo:'',dueChoice:'1h',customDue:'',borrowerVerified:false,verified:false,dispute:null,window:null,itemPosition:'right',events:[]}:{step:0,item:'商场婴儿车 A-03',memo:'',dueChoice:'1d',customDue:'',verified:false,returnRequested:false,dispute:null,window:null,itemPosition:'left',inventory:[],selectedItem:0,events:[]};
    render();toast('场景已重置');return;
  }
  if(expireWindow(s,mode)){render();toast('15 秒窗口已结束');return;}
  if(action.startsWith('appeal:')){
    if(!s.window||s.dispute){toast('当前没有可申诉的交接窗口');return;}
    const reason=action.slice(7);s.dispute={reason,status:'open',votes:{}};log(s,`${disputeReasons[reason][0]}在 15 秒内提出异议`);render();return;
  }
  if(action==='dispute-accept'&&s.dispute){settleWindow(s,mode,claimOutcome(s.dispute.reason),'对方同意当场申诉，双方按实际交接结果继续');render();return;}
  if(action==='dispute-rebut'&&s.dispute){s.dispute.status='contested';s.dispute.votes={};log(s,`${disputeReasons[s.dispute.reason][1]}在窗口内反驳`);render();return;}
  if(action==='dispute-withdraw'&&s.dispute){log(s,'申诉方撤回异议，重新开启 15 秒窗口');s.dispute=null;startWindow(s,s.window.phase);render();return;}
  if(action.startsWith('dispute-vote:')&&s.dispute?.status==='contested'){
    const [,role,result]=action.split(':');s.dispute.votes[role]=result==='yes';
    const roles=mode==='c2c'?['借用者','出借者']:['商家','顾客'];
    if(roles.every(r=>s.dispute.votes[r]!==undefined)&&s.dispute.votes[roles[0]]===s.dispute.votes[roles[1]]){
      settleWindow(s,mode,s.dispute.votes[roles[0]],'双方当面确认相同的实物交接结果');
    }
    render();return;
  }
  if(s.dispute){toast('请先由双方处理当前异议');return;}
  const transitions={
    'c-borrower-verify':()=>{s.borrowerVerified=true;log(s,'借用者 World ID 已验证');toast('借用者模拟验证成功')},
    'c-create':()=>{if(!s.borrowerVerified){toast('借用者需要先完成 World ID 验证');return;}if(!validate(s))return;log(s,'借用请求已创建');s.step=1},
    'c-edit':()=>{s.step=0},'c-scan':()=>{log(s,'出借方已扫码');s.step=2},
    'c-verify':()=>{s.verified=true;log(s,'出借方 World ID 已验证');s.step=3;toast('模拟验证成功，已返回网站')},
    'c-lend':()=>{log(s,'出借方同意借出，15 秒交接窗口开始');s.step=4;startWindow(s,'handoff')},
    'c-receive':()=>settleWindow(s,mode,true,'借用者当面确认收到实物'),
    'c-return':()=>{log(s,'借用者发起归还，15 秒窗口开始');s.step=6;startWindow(s,'return')},
    'c-finish':()=>settleWindow(s,mode,true,'出借方当面确认收回实物'),
    'b-publish':()=>{if(!validate(s))return;const entry={item:s.item,memo:s.memo,dueChoice:s.dueChoice,customDue:s.customDue};if(s.editingIndex!==undefined){s.inventory[s.editingIndex]=entry;s.selectedItem=s.editingIndex;delete s.editingIndex;}else{s.inventory.push(entry);s.selectedItem=s.inventory.length-1;}log(s,`商家已上架 ${s.item}`);s.step=1},
    'b-add':()=>{s.step=0;s.item='便携雨伞 B-02';s.memo='';s.dueChoice='1d';s.customDue=''},
    'b-edit':()=>{s.editingIndex=s.selectedItem;s.step=0},'b-scan':()=>{log(s,'顾客已扫码');s.step=2},
    'b-verify':()=>{s.verified=true;log(s,'顾客 World ID 已验证');toast('模拟验证成功，已返回网站')},
    'b-accept':()=>{log(s,'顾客确认借用，15 秒交接窗口开始');s.step=3;startWindow(s,'handoff')},
    'b-receive':()=>settleWindow(s,mode,true,'顾客当面确认收到实物'),
    'b-return':()=>{s.returnRequested=true;log(s,'顾客发起归还，15 秒窗口开始');s.step=5;startWindow(s,'return')},
    'b-merchant-finish':()=>{if(s.window)settleWindow(s,mode,true,'商家当面确认收回实物');else{s.step=6;log(s,'商家直接确认收回实物')}}
  };
  if(transitions[action]){transitions[action]();render();}
});
setInterval(()=>{
  let changed=false;
  for(const mode of ['c2c','b2c'])if(expireWindow(state[mode],mode)&&state.tab===mode)changed=true;
  if(changed){render();return;}
  const s=state[state.tab];if(!s.window)return;
  document.querySelectorAll('[data-window-countdown]').forEach(el=>el.textContent=String(seconds(s)));
  document.querySelectorAll('.timer-number').forEach(el=>el.textContent=String(seconds(s)));
},200);
render();
