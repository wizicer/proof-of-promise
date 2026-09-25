const state = {
  tab: 'c2c',
  c2c: { step: 0, item: 'USB-C 充电宝', memo: '', dueChoice: '1h', customDue: '', borrowerVerified: false, verified: false, popup: null, window: null, itemPosition: 'right', events: [] },
  b2c: { step: 0, item: '商场婴儿车 A-03', memo: '', dueChoice: '1d', customDue: '', verified: false, returnRequested: false, popup: null, window: null, itemPosition: 'left', inventory: [], selectedItem: 0, events: [] }
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
function button(text, action, cls='primary', disabled=false) { const external=['c-borrower-verify','c-verify','b-verify','c-scan','b-scan'].includes(action); return `<button class="btn ${cls}${external?' external':''}" data-action="${action}" ${disabled?'disabled':''}>${text}</button>`; }
function actions(...buttons) { return `<div class="actions">${buttons.join('')}</div>`; }
function danger(text) { return `<div class="danger-callout"><b>! 当面确认</b><span>${text}</span></div>`; }
function verifiedBadge(label='World ID 真人身份已验证') { return `<div class="verify"><span class="verify-logo">✓</span><span><b>${label}</b><small>仅确认是真人，不公开个人身份</small></span></div>`; }
function startWindow(s, phase) { s.window={phase,deadline:Date.now()+15000};s.timeoutNotice='';s.timeoutInitiator=''; }
function seconds(s) { return Math.max(0,Math.ceil((((s.window?.deadline)||Date.now())-Date.now())/1000)); }
function timer(s, text) { return `<div class="handoff-timer"><span class="timer-number" data-window-countdown>${seconds(s)}</span><div><b>秒 · ${text}</b><small>请对方当面确认；超时未确认将退回发起方</small></div></div>`; }
function objectTracker(s, mode) {
  const c=mode==='c2c',left=c?'借用者':'商家',right=c?'出借者':'顾客';
  const expect=c?(s.step>=4&&s.step<=5?'left':'right'):(s.step>=3&&s.step<=4?'right':'left');
  const actual=s.itemPosition,good=actual===expect;
  return `<section class="object-tracker"><div class="tracker-heading"><div><span class="micro">PHYSICAL ITEM · 实物位置</span><h4>点按一侧，移动这件物品</h4></div><span>仅模拟实物位置，不改变上方流程</span></div><div class="tracker-lanes"><button class="tracker-side ${actual==='left'?'holding':''}" data-position="left"><span>${left}</span>${actual==='left'?`<span class="parcel" aria-label="物品在${left}手中">📦</span>`:'<span class="empty-spot">点击移到这里</span>'}</button><div class="tracker-arrow">↔</div><button class="tracker-side ${actual==='right'?'holding':''}" data-position="right"><span>${right}</span>${actual==='right'?`<span class="parcel" aria-label="物品在${right}手中">📦</span>`:'<span class="empty-spot">点击移到这里</span>'}</button></div><div class="tracker-status ${good?'good':'bad'}"><b>${good?'✓ 位置符合当前步骤':'! 位置与当前步骤不符'}</b><span>目前在${actual==='left'?left:right}手中；当前应在${expect==='left'?left:right}手中。${good?'':'请当面核对实物，并要求接收方在 15 秒内确认。'}</span></div></section>`;
}
function card(role, active, body) { const isBorrower = role === '借用者' || role.startsWith('顾客'); return `<article class="person-card ${active?'active':'inactive'}"><div class="person-head"><div class="person-identity"><span class="avatar ${isBorrower?'borrower':'lender'}">${isBorrower?'◉':'▣'}</span><span class="person-name">${role}<small>${isBorrower?'BORROWER':'LENDER'}</small></span></div><span class="${active?'live-tag':'waiting-tag'}">${active?'当前操作':'等待中'}</span></div><div class="person-body">${body}</div></article>`; }
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
    case 3: b=`<div class="micro">等待出借方</div><h4>对方已完成 World ID 验证</h4><p class="desc">出借方正在核对物品和归还时间。</p>${summary(s)}`; l=`<div class="micro">STEP 04 · 出借确认</div><h4>确定借出这件物品？</h4>${danger('点击“同意借出”后，请先阅读弹窗中的两步交接说明，再开启 15 秒确认。')}${verifiedBadge('借用者已完成真人验证')}${summary(s)}${actions(button('同意借出','c-lend'))}`; break;
    case 4: b=`<div class="micro">STEP 05 · 15 秒交接窗口</div><h4>拿到实物后请确认</h4>${timer(s,'当面交接')}${danger('只有实际拿到物品后才点“我已收到”。如果没有拿到，什么都不用点；15 秒后会退回出借者。')}${summary(s)}${actions(button('我已收到实物 · 开始借用 →','c-receive'))}`; l=`<div class="micro">出借者 · 15 秒交接窗口</div><h4>请对方当面确认收到</h4>${timer(s,'等待借用者确认')}${danger('现在做两件事：① 把物品给对方；② 要求对方在自己的屏幕上点“已收到”。如果 15 秒内没确认，请当面把物品拿回来，流程会退回你这里。')}${summary(s)}`; break;
    case 5: b=`<div class="micro">借用进行中</div><h4>${esc(s.item)} 正在借用中</h4><p class="desc">使用结束后，请面对面归还，并发起归还确认。</p>${summary(s)}${actions(button('我已归还 · 开启 15 秒归还窗口 →','c-return'))}`; l=`<div class="micro">借用进行中</div><h4>等待物品归还</h4><p class="desc">借用者发起归还后，你可以核对实物并确认。</p>${summary(s)}`; break;
    case 6: b=`<div class="micro">STEP 06 · 15 秒归还窗口</div><h4>请出借者确认收回</h4>${timer(s,'当面归还')}${danger('把实物交回出借者，并要求对方在自己的屏幕上点“已收回”。如果对方未确认，15 秒后流程会退回你这里。')}${qrBox('归还确认码','出借者核对实物后确认收回',6)}`; l=`<div class="micro">出借者 · 15 秒归还窗口</div><h4>核对实物后确认</h4>${timer(s,'核对归还')}${danger('只有真正收回并核对实物后，才点“已收回”。如果没拿到物品，什么都不用点；15 秒后归还请求会退回借用者。')}${actions(button('已收到归还实物 · 完成借还','c-finish'))}`; break;
    default: b=complete(s,'你的借用承诺已完成','物品已经归还，出借方确认收回。'); l=complete(s,'一笔可信的借还，完成了','你已确认收到归还的物品。'); banner='借还已完成，双方都获得这次承诺的完成记录。';
  }
  return {b,l,banner,active: s.step===0?'b':s.step===1?'l':s.step===2?'l':s.step===3?'l':s.step===4?'b':s.step===5?'b':s.step===6?'l':'both'};
}
function b2c(s) {
  let b='',l='',banner='商家先录入物品并展示二维码，顾客扫码后即可借用。';
  const inventory = `<div class="inventory"><div class="micro">商家已上架 · ${s.inventory.length} 件</div>${s.inventory.map((entry,i)=>`<button class="inventory-row ${i===s.selectedItem?'selected':''}" data-item-index="${i}"><span>${esc(entry.item)}</span><small>独立借用码 #${String(i+1).padStart(2,'0')}</small></button>`).join('')}</div>`;
  switch(s.step){
    case 0: l=`${s.inventory.length?inventory:''}${form(s,true)}`; b=placeholder('▣','等待商家上架','商家录入物品后，顾客扫描借用码即可看到详情。'); break;
    case 1: l=`<div class="micro">已上架 · 商家视角</div><h4>每件物品都有独立借用码</h4><p class="desc">点击列表可预览不同物品的二维码；可以继续批量添加。</p>${inventory}${qrBox('顾客扫描此码',`当前物品：${esc(s.item)}`,11+s.selectedItem)}${summary(s)}${actions(button('再上架一件物品','b-add','secondary'),button('修改当前物品','b-edit','ghost'))}`; b=`<div class="micro">STEP 02 · 顾客扫码</div><h4>需要借用这件物品？</h4><p class="desc">商家已上架 ${s.inventory.length} 件物品。当前展示：${esc(s.item)}。</p>${actions(button('模拟扫描当前借用码 →','b-scan'))}`; break;
    case 2: l=`<div class="micro">等待顾客确认</div><h4>顾客正在查看物品</h4><p class="desc">对方完成身份验证后，会开启 15 秒当面交接窗口。</p>${summary(s)}`; b=`<div class="micro">STEP 03 · 顾客确认</div><h4>确认借用 ${esc(s.item)}？</h4><p class="desc">点击后开启 15 秒交接窗口。请留在商家面前领取实物。</p>${summary(s)}<div class="verify"><span class="verify-logo">◉</span><span><b>World ID</b><small>${s.verified?'已验证真人身份':'需要先验证真人身份'}</small></span></div>${actions(s.verified?button('确认借用 · 开启 15 秒交接 →','b-accept'):button('打开 World App · 模拟验证 →','b-verify'))}`; break;
    case 3: l=`<div class="micro">商家 · 15 秒交接窗口</div><h4>交付实物后确认</h4>${timer(s,'当面交付')}${danger('核对顾客的借用凭证，把实物交给顾客，然后在你的界面确认交付。没有交付就不要确认；15 秒后请求会退回顾客。')}${summary(s)}${actions(button('我已交付实物 · 确认交接','b-merchant-handover'))}`; b=`<div class="micro">顾客 · 15 秒交接窗口</div><h4>等待商家交付并确认</h4>${timer(s,'当面领取')}${danger('向商家展示借用凭证，请商家交付实物并在商家界面确认。商家未确认时，15 秒后请求会退回你这里。')}${verifiedBadge('顾客 World ID 已验证')}${summary(s)}`; break;
    case 4: l=`<div class="micro">商家视角 · 借用中</div><h4>顾客已借用物品</h4><p class="desc">归还时，商家可直接确认收到，或等待顾客主动发起归还。</p>${summary(s)}${actions(button('实物已归还 · 直接确认','b-merchant-finish','secondary'))}`; b=`<div class="micro">借用进行中</div><h4>借用凭证已生效</h4><p class="desc">使用结束后请当面归还，并要求商家确认。</p>${summary(s)}${actions(button('我已归还 · 开启 15 秒确认 →','b-return'))}`; break;
    case 5: l=`<div class="micro">商家 · 15 秒归还窗口</div><h4>核对物品后确认收回</h4>${timer(s,'核对归还')}${danger('真正收到并核对实物后才确认。没收到就不要点；15 秒后归还请求会退回顾客。')}${summary(s)}${actions(button('已收回实物 · 完成借还','b-merchant-finish'))}`; b=`<div class="micro">顾客 · 15 秒归还窗口</div><h4>等待商家确认</h4>${timer(s,'等待商家确认')}${danger('把实物交给商家，并要求商家在自己的界面点“已收回”。若未确认，15 秒后流程会退回你这里。')}${summary(s)}`; break;
    default: l=complete(s,'借还已完成','商家已确认收回物品。'); b=complete(s,'借用承诺已完成','这件物品已归还，感谢你认真完成承诺。'); banner='商家已确认收回，双方都能看到完成记录。';
  }
  return {b,l,banner,active:s.step===0?'l':s.step===1?'b':s.step===2?'b':s.step===3?'both':s.step===4?'both':s.step===5?'both':'both'};
}
function complete(s,title,desc){return `<div class="success-mark">✓</div><div class="micro">PROOF OF PROMISE · FULFILLED</div><h4>${title}</h4><p class="desc">${desc}</p>${summary(s)}<div class="verify"><span class="verify-logo">✳</span><span><b>承诺已履行</b><small>一个真实的人，完成了一次真实的借还。</small></span></div>`;}
function settleWindow(s, mode, transferred, note){
  const phase=s.window?.phase;
  s.window=null;s.popup=null;
  s.timeoutNotice='';s.timeoutInitiator='';
  if(mode==='c2c')s.step=phase==='handoff'?(transferred?5:3):(transferred?8:5);
  else s.step=phase==='handoff'?(transferred?4:2):(transferred?6:4);
  log(s,note);
}
function popupHtml(s){
  if(!s.popup)return '';
  return `<div class="handoff-overlay"><div class="handoff-dialog" role="dialog" aria-modal="true" aria-label="${esc(s.popup.title)}"><div class="micro">面对面交接指引</div><h3>${esc(s.popup.title)}</h3><p class="dialog-intro">开始倒计时前，请准备好完成下面两件事：</p><ol>${s.popup.tasks.map(task=>`<li>${esc(task)}</li>`).join('')}</ol><p class="dialog-note">${esc(s.popup.note)}</p>${button('开启 15 秒交接','popup-start')}</div></div>`;
}
function openPopup(s,title,tasks,note,phase,nextStep){s.popup={title,tasks,note,phase,nextStep};}
function render(){
  const tab=state.tab,s=state[tab],flow=tab==='c2c'?c2c(s):b2c(s);document.querySelectorAll('.tab').forEach(el=>{const active=el.dataset.tab===tab;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));});$('#scenario').setAttribute('aria-labelledby',`tab-${tab}`);
  if(s.timeoutNotice){const notice=danger(s.timeoutNotice);if(s.timeoutInitiator==='l')flow.l=notice+flow.l;else flow.b=notice+flow.b;}
  const title=tab==='c2c'?'从一个借用请求开始':'把可借物品交到顾客手中';const sub=tab==='c2c'?'借用者提出需求，出借者验证并确认，双方完成交接与归还。':'商家先上架物品，顾客扫码确认，归还时由商家最终核对。';
  const progressStep=tab==='c2c'?Math.min(5,[0,1,1,2,3,4,4,5,5][s.step]):Math.min(4,[0,1,2,2,3,4,4][s.step]);
  const cards=tab==='c2c'?card('借用者',flow.active==='b'||flow.active==='both',flow.b)+card('出借者',flow.active==='l'||flow.active==='both',flow.l):card('商家 · 出借方',flow.active==='l'||flow.active==='both',flow.l)+card('顾客 · 借用者',flow.active==='b'||flow.active==='both',flow.b);
  $('#scenario').innerHTML=`<div class="scenario-intro"><div><h3>${title}</h3><p>${sub}</p></div><button class="reset" data-action="reset">↺ 重新体验</button></div><div class="progress">${steps[tab].map((name,i)=>`<div class="progress-item ${i<progressStep?'done':i===progressStep?'current':''}"><span class="dot">${i<progressStep?'✓':i+1}</span><span>${name}</span></div>`).join('')}</div><div class="stage"><div class="stage-banner"><span class="pulse"></span><span>${flow.banner}</span></div><div class="stage-grid">${cards}</div>${objectTracker(s,tab)}</div>${popupHtml(s)}<div class="timeline"><span class="timeline-label">ACTIVITY</span>${s.events.length?s.events.map(e=>`<span class="event">${esc(e)}</span>`).join(''):'<span class="event" style="color:#a6b0a6">等待第一步操作</span>'}</div>`;
}
function validate(s){const input=$('#item');if(!s.item.trim()){input?.focus();toast('请先填写物品名称');return false;}if(s.dueChoice==='custom'&&(!s.customDue||new Date(s.customDue).getTime()<=Date.now())){$('#customDue')?.focus();toast('请选择未来的归还时间');return false;}return true;}
document.addEventListener('input',e=>{const s=state[state.tab];if(e.target.id==='item')s.item=e.target.value;if(e.target.id==='memo')s.memo=e.target.value;if(e.target.id==='customDue')s.customDue=e.target.value;});
function expireWindow(s,mode){
  if(!s.window||Date.now()<s.window.deadline)return false;
  const phase=s.window.phase;
  settleWindow(s,mode,false,'15 秒内对方未确认，交接退回发起方');
  s.timeoutInitiator=mode==='c2c'&&phase==='handoff'?'l':'b';
  s.timeoutNotice=phase==='handoff'?'对方未在 15 秒内确认交接。本次借出没有成立，操作已退回你这里；请当面核对后重新发起。':'对方未在 15 秒内确认收回。本次归还没有成立，操作已退回你这里；请当面核对后重新发起。';
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
    state[mode]=mode==='c2c'?{step:0,item:'USB-C 充电宝',memo:'',dueChoice:'1h',customDue:'',borrowerVerified:false,verified:false,popup:null,window:null,itemPosition:'right',events:[]}:{step:0,item:'商场婴儿车 A-03',memo:'',dueChoice:'1d',customDue:'',verified:false,returnRequested:false,popup:null,window:null,itemPosition:'left',inventory:[],selectedItem:0,events:[]};
    render();toast('场景已重置');return;
  }
  if(expireWindow(s,mode)){render();toast('15 秒窗口已结束');return;}
  if(action==='popup-start'&&s.popup){const {phase,nextStep}=s.popup;s.popup=null;s.step=nextStep;startWindow(s,phase);log(s,'15 秒当面确认开始');render();return;}
  const transitions={
    'c-borrower-verify':()=>{s.borrowerVerified=true;log(s,'借用者 World ID 已验证');toast('借用者模拟验证成功')},
    'c-create':()=>{if(!s.borrowerVerified){toast('借用者需要先完成 World ID 验证');return;}if(!validate(s))return;log(s,'借用请求已创建');s.step=1},
    'c-edit':()=>{s.step=0},'c-scan':()=>{log(s,'出借方已扫码');s.step=2},
    'c-verify':()=>{s.verified=true;log(s,'出借方 World ID 已验证');s.step=3;toast('模拟验证成功，已返回网站')},
    'c-lend':()=>{openPopup(s,'出借者：请完成这两件事',['把物品交到借用者手里。','要求借用者在他的屏幕上点“我已收到实物”。'],'如果对方在 15 秒内没有确认，请当面把物品拿回来；借出不会成立。','handoff',4)},
    'c-receive':()=>settleWindow(s,mode,true,'借用者当面确认收到实物'),
    'c-return':()=>{openPopup(s,'借用者：请完成这两件事',['把物品交回出借者手里。','要求出借者在他的屏幕上点“已收到归还实物”。'],'15 秒内没有收到对方确认，本次归还不会成立，操作会退回你这里。','return',6)},
    'c-finish':()=>settleWindow(s,mode,true,'出借方当面确认收回实物'),
    'b-publish':()=>{if(!validate(s))return;const entry={item:s.item,memo:s.memo,dueChoice:s.dueChoice,customDue:s.customDue};if(s.editingIndex!==undefined){s.inventory[s.editingIndex]=entry;s.selectedItem=s.editingIndex;delete s.editingIndex;}else{s.inventory.push(entry);s.selectedItem=s.inventory.length-1;}log(s,`商家已上架 ${s.item}`);s.step=1},
    'b-add':()=>{s.step=0;s.item='便携雨伞 B-02';s.memo='';s.dueChoice='1d';s.customDue=''},
    'b-edit':()=>{s.editingIndex=s.selectedItem;s.step=0},'b-scan':()=>{log(s,'顾客已扫码');s.step=2},
    'b-verify':()=>{s.verified=true;log(s,'顾客 World ID 已验证');toast('模拟验证成功，已返回网站')},
    'b-accept':()=>{openPopup(s,'顾客：请完成这两件事',['向商家展示借用凭证。','领取实物，并请商家在他的屏幕上确认交付。'],'15 秒内商家没有确认，借用不会成立，操作会退回你这里。','handoff',3)},
    'b-merchant-handover':()=>settleWindow(s,mode,true,'商家在自己的界面确认已交付实物'),
    'b-return':()=>{s.returnRequested=true;openPopup(s,'顾客：请完成这两件事',['把物品交回商家手里。','请商家在他的屏幕上点“已收回实物”。'],'15 秒内商家没有确认，本次归还不会成立，操作会退回你这里。','return',5)},
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
