const state = {
  tab: 'c2c',
  c2c: { step: 0, item: 'USB-C Power Bank', memo: '', dueChoice: '1h', customDue: '', borrowerVerified: false, verified: false, popup: null, window: null, itemPosition: 'right', events: [] },
  b2c: { step: 0, item: 'Mall Stroller A-03', memo: '', dueChoice: '1d', customDue: '', verified: false, returnRequested: false, popup: null, window: null, itemPosition: 'right', inventory: [], selectedItem: 0, events: [] }
};

const steps = {
  c2c: ['Draft Request', 'Lender Scans', 'Accept & Handover', 'Confirm Receipt', 'Hand Back Item', 'Confirm Return'],
  b2c: ['Merchant List', 'Customer Scans', 'Confirm Borrow', 'In Use & Return', 'Complete Return']
};
const labels = { '1h': 'Within 1 hour', '12h': 'Within 12 hours', '1d': 'Within 1 day', '2d': 'Within 2 days', custom: 'Custom' };
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function due(s) { return s.dueChoice === 'custom' ? (s.customDue ? new Date(s.customDue).toLocaleString('en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Not set') : labels[s.dueChoice]; }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2400); }
function log(s, text) { s.events.push(text); }
function button(text, action, cls='primary', disabled=false) { const external=['c-borrower-verify','c-verify','b-verify','c-scan','b-scan'].includes(action); return `<button class="btn ${cls}${external?' external':''}" data-action="${action}" ${disabled?'disabled':''}>${text}</button>`; }
function actions(...buttons) { return `<div class="actions">${buttons.join('')}</div>`; }
function danger(text) { return `<div class="danger-callout"><b>! In-Person Verification</b><span>${text}</span></div>`; }
function verifiedBadge(label='World ID Humanity Verified') { return `<div class="verify"><span class="verify-logo">✓</span><span><b>${label}</b><small>Confirms unique human, zero identity leakage</small></span></div>`; }
function objectTracker(s, mode) {
  const c = mode === 'c2c', left = c ? 'Borrower' : 'Customer (Borrower)', right = c ? 'Lender' : 'Merchant (Lender)';
  const expect = c ? (s.step >= 4 && s.step <= 5 ? 'left' : 'right') : (s.step === 3 ? 'left' : 'right');
  const actual = s.itemPosition, good = actual === expect;
  return `<section class="object-tracker"><div class="tracker-heading"><div><span class="micro">PHYSICAL ITEM · ITEM LOCATION</span><h4>Tap either side to move item</h4></div><span>Simulates physical possession; does not affect the flow above</span></div><div class="tracker-lanes"><button class="tracker-side ${actual==='left'?'holding':''}" data-position="left"><span>${left}</span>${actual==='left'?`<span class="parcel" aria-label="Item held by ${left}">📦</span>`:'<span class="empty-spot">Tap to move here</span>'}</button><div class="tracker-arrow">↔</div><button class="tracker-side ${actual==='right'?'holding':''}" data-position="right"><span>${right}</span>${actual==='right'?`<span class="parcel" aria-label="Item held by ${right}">📦</span>`:'<span class="empty-spot">Tap to move here</span>'}</button></div><div class="tracker-status ${good?'good':'bad'}"><b>${good?'✓ Location matches current step':'! Location does not match current step'}</b><span>Currently with ${actual==='left'?left:right}; expected with ${expect==='left'?left:right}. ${good?'':'Please verify physical item in person.'}</span></div></section>`;
}
function card(role, active, body) {
  const isBorrower = role === 'Borrower' || role.includes('Customer') || role.includes('Borrower');
  const roleEn = isBorrower ? 'BORROWER' : 'LENDER';
  const promiseRole = isBorrower ? 'PROMISE MAKER' : 'PROMISE HOLDER';
  return `<article class="person-card ${active?'active':'inactive'}"><div class="person-head"><div class="person-identity"><span class="avatar ${isBorrower?'borrower':'lender'}">${isBorrower?'◉':'▣'}</span><span class="person-name">${role}<small>${promiseRole} · ${roleEn}</small></span></div><span class="${active?'live-tag':'waiting-tag'}">${active?'Active':'Waiting'}</span></div><div class="person-body">${body}</div></article>`;
}
function placeholder(icon, title, desc) { return `<div class="placeholder"><div class="placeholder-icon">${icon}</div><h4>${title}</h4><p>${desc}</p></div>`; }
function summary(s) { return `<div class="summary"><div class="summary-row"><span>Item</span><span>${esc(s.item)}</span></div><div class="summary-row"><span>Return Due</span><span>${esc(due(s))}</span></div>${s.memo?`<div class="summary-row"><span>Terms / Memo</span><span>${esc(s.memo)}</span></div>`:''}</div>`; }
function qr(seed) { let bits=''; for(let y=0;y<19;y++)for(let x=0;x<19;x++){const finder=(ox,oy)=>x>=ox&&x<ox+7&&y>=oy&&y<oy+7;let on=false;for(const [ox,oy] of [[0,0],[12,0],[0,12]])if(finder(ox,oy)){let a=x-ox,b=y-oy;on=a===0||a===6||b===0||b===6||(a>=2&&a<=4&&b>=2&&b<=4);break} if(!finder(0,0)&&!finder(12,0)&&!finder(0,12))on=((x*17+y*11+x*y*7+seed*13)%9)<4;bits+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${on?'#204c34':'#fff'}"/>`;} return `<svg class="qr" viewBox="0 0 19 19" aria-label="Mock QR Code">${bits}</svg>`; }
function qrBox(title, hint, seed) { return `<div class="qr-box">${qr(seed)}<div class="qr-info"><strong>${title}</strong><span>${hint}</span></div></div>`; }
function choices(s) { return `<div class="choices">${Object.entries(labels).map(([key,label])=>`<button type="button" class="choice ${s.dueChoice===key?'selected':''}" data-choice="${key}">${label}</button>`).join('')}</div>${s.dueChoice==='custom'?`<div class="field"><input id="customDue" type="datetime-local" value="${esc(s.customDue)}" aria-label="Custom Due Time"></div>`:''}`; }
function form(s, business=false) {
  return `<div class="micro">${business?'STEP 01 · MERCHANT LISTING':'STEP 01 · DRAFT REQUEST'}</div><h4>${business?'List an item for borrowing':'What do you want to borrow?'}</h4><p class="desc">${business?'List multiple items, each generates a unique QR code. No World ID required for merchant.':'Verify World ID first, then fill in details to create a request QR.'}</p>${!business?(s.borrowerVerified?verifiedBadge('Borrower World ID Verified'):`<div class="verify"><span class="verify-logo">◉</span><span><b>Borrower must verify World ID</b><small>Required before creating a request</small></span></div>`):''}<div class="field"><label for="item">${business?'Item Name':'Item Name'}</label><input id="item" maxlength="80" value="${esc(s.item)}" placeholder="${business?'e.g., Mall Stroller A-03':'e.g., Power Bank, Umbrella, Camera'}"></div><div class="field"><label>Expected Return Time</label>${choices(s)}</div><div class="field"><label for="memo">Memo <span style="font-weight:400;color:#9baa9e">/ Optional</span></label><textarea id="memo" maxlength="240" placeholder="${business?'e.g., Pick up at front desk, return to staff':'e.g., Will return right after event'}">${esc(s.memo)}</textarea></div>${actions(button(business?'Generate Listing QR →':s.borrowerVerified?'Create Request →':'Open World App · Mock Verify →',business?'b-publish':s.borrowerVerified?'c-create':'c-borrower-verify'))}`;
}
function c2c(s) {
  let b='', l='', banner='Borrower initiates request; Lender joins by scanning QR.';
  switch(s.step){
    case 0: b=form(s); l=placeholder('↔','Waiting for Request','Once Borrower completes details and generates QR, Lender can scan.'); break;
    case 1: b=`<div class="micro">STEP 02 · WAITING FOR SCAN</div><h4>Show QR Code to Lender</h4><p class="desc">Show this screen face-to-face. For demo, click "Mock Scan" on the right.</p>${qrBox('Lender scans this code','Request created · Waiting for counterparty',1)}${summary(s)}${actions(button('Edit Request','c-edit','ghost'))}`; l=`<div class="micro">LENDER · SCAN TO JOIN</div><h4>Someone wants to borrow an item</h4><p class="desc">Scan Borrower\'s QR code to review terms.</p>${actions(button('Mock Scan Request QR →','c-scan'))}`; break;
    case 2: b=`<div class="micro">WAITING FOR LENDER</div><h4>Counterparty Verifying Identity</h4><p class="desc">Once World ID is verified, Lender will inspect terms and decide to lend.</p>${qrBox('Request scanned','Waiting for Lender verification',2)}${summary(s)}`; l=`<div class="micro">STEP 03 · IDENTITY VERIFICATION</div><h4>Verify you are human</h4><p class="desc">Borrower is verified human. Please verify before confirming.</p>${verifiedBadge('Borrower World ID Verified')}${summary(s)}<div class="verify"><span class="verify-logo">◉</span><span><b>Lender World ID</b><small>Simulates World App verification</small></span></div>${actions(button('Open World App · Mock Verify →','c-verify'))}`; break;
    case 3:
      b=`<div class="micro">WAITING FOR LENDER</div><h4>Lender Verified World ID</h4><p class="desc">Lender is reviewing item details and preparing physical handover.</p>${summary(s)}`;
      l=`<div class="micro">STEP 04 · LEND &amp; HANDOVER</div><h4>Agree to lend this item?</h4>${verifiedBadge('Borrower World ID Verified')}${summary(s)}<ol class="inline-guide-list"><li><b>1.</b> Hand the physical item to Borrower</li><li><b>2.</b> Click confirm below and ask Borrower to confirm on screen</li></ol><div class="danger-callout"><b>In-Person Check</b><span>If Borrower does not confirm, the loan is not valid and you may take back the item.</span></div>${actions(button('Agree to Lend &amp; Hand Over →','c-start-handover'))}`;
      break;
    case 4:
      b=`<div class="micro">STEP 05 · CONFIRM RECEIPT</div><h4>Confirm upon receiving item</h4><p class="desc">Lender handed over the item. Please inspect it before confirming.</p>${danger('Only tap "I Received the Item" once you hold the physical item. Do not tap if not received.')}${summary(s)}${actions(button('I Received the Item · Start Borrowing →','c-receive'))}`;
      l=`<div class="micro">LENDER · ITEM HANDED OVER</div><h4>Item Handed Over</h4><p class="desc">Item has been given to Borrower. Ask Borrower to tap "I Received the Item" on their screen.</p>${danger('Two things: ① Hand over item; ② Supervise Borrower to tap "I Received the Item".')}${summary(s)}${actions(button('Borrower Did Not Confirm · Take Back Item','c-abort-handover','danger-outline'))}`;
      break;
    case 5:
      b=`<div class="micro">IN USE · RETURN ITEM</div><h4>${esc(s.item)} is currently in use</h4><p class="desc">Finished using? Prepare for in-person return:</p>${summary(s)}<ol class="inline-guide-list"><li><b>1.</b> Hand the item back to Lender</li><li><b>2.</b> Click below to initiate return confirmation</li></ol>${actions(button('Item Handed Back · Initiate Return →','c-start-return'))}`;
      l=`<div class="micro">IN USE</div><h4>Waiting for Return</h4><p class="desc">Borrower is currently using the item. When handed back, inspect item and confirm receipt here.</p>${summary(s)}`;
      break;
    case 6:
      b=`<div class="micro">STEP 06 · WAITING FOR CONFIRMATION</div><h4>Waiting for Lender Confirmation</h4><p class="desc">Item handed back. Waiting for Lender to confirm receipt on their screen.</p>${danger('If Lender does not confirm, communicate in person or re-initiate.')}${summary(s)}${actions(button('Cancel Return','c-abort-return','ghost'))}`;
      l=`<div class="micro">LENDER · CONFIRM RETURN</div><h4>Confirm Item Returned?</h4><p class="desc">Borrower handed back the item. Inspect item condition and tap below to complete.</p>${danger('Only tap once the item is fully inspected and received.')}${actions(button('Item Received · Complete Return →','c-finish'))}`;
      break;
    default: b=complete(s,'Commitment Fulfilled','Item returned and Lender confirmed receipt.'); l=complete(s,'Proof of Promise Fulfilled','You confirmed receipt of the returned item.'); banner='Promise fulfilled. Both parties received verified completion records.';
  }
  return {b,l,banner,active: s.step===0?'b':s.step===1?'l':s.step===2?'l':s.step===3?'l':s.step===4?'b':s.step===5?'b':s.step===6?'l':'both'};
}
function b2c(s) {
  let b='',l='',banner='Merchant displays QR code on right; Customer scans and confirms on left. Merchant confirms return directly.';
  const inventory = `<div class="inventory"><div class="micro">Merchant Items · ${s.inventory.length} listed</div>${s.inventory.map((entry,i)=>`<button class="inventory-row ${i===s.selectedItem?'selected':''}" data-item-index="${i}"><span>${esc(entry.item)}</span><small>Item Code #${String(i+1).padStart(2,'0')}</small></button>`).join('')}</div>`;
  switch(s.step){
    case 0:
      b=placeholder('▣','Waiting for Listing','Once Merchant lists item on right, Customer on left can scan and borrow.');
      l=`${s.inventory.length?inventory:''}${form(s,true)}`;
      break;
    case 1:
      b=`<div class="micro">STEP 02 · CUSTOMER SCANS</div><h4>Scan Merchant Item QR</h4><p class="desc">Merchant has listed ${s.inventory.length} item(s). Current: ${esc(s.item)}.</p>${actions(button('Mock Scan Merchant QR →','b-scan'))}`;
      l=`<div class="micro">LISTED · MERCHANT VIEW</div><h4>Each item has a unique QR code</h4><p class="desc">Display this QR code for customers to scan. No extra merchant action needed.</p>${inventory}${qrBox('Customer scans this code',`Item: ${esc(s.item)}`,11+s.selectedItem)}${summary(s)}${actions(button('List Another Item','b-add','secondary'),button('Edit Current Item','b-edit','ghost'))}`;
      break;
    case 2:
      b=`<div class="micro">STEP 03 · CONFIRM BORROW</div><h4>Confirm borrowing ${esc(s.item)}?</h4><p class="desc">Verify World ID to directly activate borrowing. Takes effect immediately with no merchant click required.</p>${summary(s)}<div class="verify"><span class="verify-logo">◉</span><span><b>World ID Humanity</b><small>${s.verified?'Verified':'Verification required'}</small></span></div>${actions(s.verified?button('Confirm Borrow (Immediate) →','b-accept'):button('Open World App · Mock Verify →','b-verify'))}`;
      l=`<div class="micro">MERCHANT VIEW · WAITING</div><h4>Customer Scanning Item</h4><p class="desc">Once Customer verifies World ID and confirms, status updates automatically.</p>${summary(s)}`;
      break;
    case 3:
      b=`<div class="micro">IN USE</div><h4>${esc(s.item)} is in use</h4><p class="desc">Borrowing credential active. When finished, hand item back to Merchant; Merchant confirms return on their screen.</p>${summary(s)}`;
      l=`<div class="micro">MERCHANT VIEW · LENT OUT</div><h4>Customer Successfully Borrowed</h4><p class="desc">When Customer returns item, inspect and click below to complete return.</p>${summary(s)}${actions(button('Item Returned · Confirm &amp; Complete →','b-merchant-finish'))}`;
      break;
    default:
      b=complete(s,'Commitment Fulfilled','Item returned and confirmed by Merchant. Thank you for fulfilling your promise!');
      l=complete(s,'Return Completed','Merchant confirmed item recovery. Attestation cycle closed.');
      banner='Merchant confirmed recovery. Promise lifecycle completed.';
  }
  return {b,l,banner,active:s.step===0?'l':s.step===1?'b':s.step===2?'b':s.step===3?'l':'both'};
}
function complete(s,title,desc){return `<div class="success-mark">✓</div><div class="micro">PROOF OF PROMISE · FULFILLED</div><h4>${title}</h4><p class="desc">${desc}</p>${summary(s)}<div class="verify"><span class="verify-logo">✳</span><span><b>Promise Fulfilled</b><small>A verified human fulfilled a real-world commitment.</small></span></div>`;}
function render(){
  const tab=state.tab,s=state[tab],flow=tab==='c2c'?c2c(s):b2c(s);document.querySelectorAll('.tab').forEach(el=>{const active=el.dataset.tab===tab;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));});$('#scenario').setAttribute('aria-labelledby',`tab-${tab}`);
  const title=tab==='c2c'?'From a Request to Attested Return':'Provide Verified Assets to Customers';
  const sub=tab==='c2c'?'Borrower drafts request, Lender verifies and hands over, completed with verified return.':'Merchant lists items, Customer scans and claims, return directly settled by Merchant.';
  const progressStep=tab==='c2c'?Math.min(5,[0,1,1,2,3,4,4,5,5][s.step]):Math.min(4,[0,1,2,3,4][s.step]);
  const cards=tab==='c2c'?card('Borrower',flow.active==='b'||flow.active==='both',flow.b)+card('Lender',flow.active==='l'||flow.active==='both',flow.l):card('Customer (Borrower)',flow.active==='b'||flow.active==='both',flow.b)+card('Merchant (Lender)',flow.active==='l'||flow.active==='both',flow.l);
  $('#scenario').innerHTML=`<div class="scenario-intro"><div><h3>${title}</h3><p>${sub}</p></div><button class="reset" data-action="reset">↺ Reset</button></div><div class="progress">${steps[tab].map((name,i)=>`<div class="progress-item ${i<progressStep?'done':i===progressStep?'current':''}"><span class="dot">${i<progressStep?'✓':i+1}</span><span>${name}</span></div>`).join('')}</div><div class="stage"><div class="stage-banner"><span class="pulse"></span><span>${flow.banner}</span></div><div class="stage-grid">${cards}</div>${objectTracker(s,tab)}</div><div class="timeline"><span class="timeline-label">ACTIVITY</span>${s.events.length?s.events.map(e=>`<span class="event">${esc(e)}</span>`).join(''):'<span class="event" style="color:#a6b0a6">Awaiting first action</span>'}</div>`;
}
function validate(s){const input=$('#item');if(!s.item.trim()){input?.focus();toast('Please enter item name');return false;}if(s.dueChoice==='custom'&&(!s.customDue||new Date(s.customDue).getTime()<=Date.now())){$('#customDue')?.focus();toast('Please select a future return date/time');return false;}return true;}
document.addEventListener('input',e=>{const s=state[state.tab];if(e.target.id==='item')s.item=e.target.value;if(e.target.id==='memo')s.memo=e.target.value;if(e.target.id==='customDue')s.customDue=e.target.value;});
document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-tab]');if(tab){state.tab=tab.dataset.tab;render();return;}
  const position=e.target.closest('[data-position]');if(position){state[state.tab].itemPosition=position.dataset.position;render();return;}
  const itemChoice=e.target.closest('[data-item-index]');if(itemChoice){const s=state.b2c,i=Number(itemChoice.dataset.itemIndex);s.selectedItem=i;Object.assign(s,s.inventory[i]);render();return;}
  const choice=e.target.closest('[data-choice]');if(choice){state[state.tab].dueChoice=choice.dataset.choice;render();return;}
  const control=e.target.closest('[data-action]');if(!control)return;
  const action=control.dataset.action,s=state[state.tab],mode=state.tab;
  if(action==='reset'){
    state[mode]=mode==='c2c'?{step:0,item:'USB-C Power Bank',memo:'',dueChoice:'1h',customDue:'',borrowerVerified:false,verified:false,itemPosition:'right',events:[]}:{step:0,item:'Mall Stroller A-03',memo:'',dueChoice:'1d',customDue:'',verified:false,returnRequested:false,itemPosition:'right',inventory:[],selectedItem:0,events:[]};
    render();toast('Scenario reset');return;
  }
  const transitions={
    'c-borrower-verify':()=>{s.borrowerVerified=true;log(s,'Borrower World ID verified');toast('Borrower mock verification successful')},
    'c-create':()=>{if(!s.borrowerVerified){toast('Borrower must verify World ID first');return;}if(!validate(s))return;log(s,'Borrow request created');s.step=1},
    'c-edit':()=>{s.step=0},'c-scan':()=>{log(s,'Lender scanned QR code');s.step=2},
    'c-verify':()=>{s.verified=true;log(s,'Lender World ID verified');s.step=3;toast('Mock verification successful, returned')},
    'c-start-handover':()=>{s.step=4;s.itemPosition='left';log(s,'Lender handed over item, awaiting Borrower confirmation');toast('Item handed over, waiting for Borrower confirmation')},
    'c-abort-handover':()=>{s.step=3;s.itemPosition='right';log(s,'Lender took back item, handover canceled');toast('Handover canceled')},
    'c-receive':()=>{s.step=5;s.itemPosition='left';log(s,'Borrower confirmed receipt, borrowing active');toast('Borrowing active')},
    'c-start-return':()=>{s.step=6;s.itemPosition='right';log(s,'Borrower handed back item, awaiting Lender confirmation');toast('Item handed back, awaiting confirmation')},
    'c-abort-return':()=>{s.step=5;s.itemPosition='left';log(s,'Borrower canceled return request');toast('Return canceled')},
    'c-finish':()=>{s.step=7;s.itemPosition='right';log(s,'Lender confirmed item recovery, return completed');toast('Borrow cycle completed successfully')},
    'b-publish':()=>{if(!validate(s))return;const entry={item:s.item,memo:s.memo,dueChoice:s.dueChoice,customDue:s.customDue};if(s.editingIndex!==undefined){s.inventory[s.editingIndex]=entry;s.selectedItem=s.editingIndex;delete s.editingIndex;}else{s.inventory.push(entry);s.selectedItem=s.inventory.length-1;}log(s,`Merchant listed ${s.item}`);s.step=1},
    'b-add':()=>{s.step=0;s.item='Portable Umbrella B-02';s.memo='';s.dueChoice='1d';s.customDue=''},
    'b-edit':()=>{s.editingIndex=s.selectedItem;s.step=0},'b-scan':()=>{log(s,'Customer scanned QR');s.step=2},
    'b-verify':()=>{s.verified=true;log(s,'Customer World ID verified');toast('Mock verification successful, returned')},
    'b-accept':()=>{s.step=3;s.itemPosition='left';log(s,'Customer confirmed borrow, credential active');toast('Borrow active')},
    'b-merchant-finish':()=>{s.step=4;s.itemPosition='right';log(s,'Merchant inspected and confirmed recovery');toast('Recovery confirmed, cycle complete');}
  };
  if(transitions[action]){transitions[action]();render();}
});
render();
