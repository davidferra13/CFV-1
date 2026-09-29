import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, lstatSync } from 'node:fs'
import { join, basename } from 'node:path'
const fail = message => { throw new Error(message) }
const object = (v,n) => { if(!v || typeof v!=='object' || Array.isArray(v))fail(n+' must be an object') }
const integer = (v,min,max,n) => { if(!Number.isSafeInteger(v)||v<min||v>max)fail('Invalid '+n) }
const text = (v,n,max=10000) => { if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))fail('Invalid '+n);return v }
const normalize = v => v.trim().toLowerCase().replace(/\s+/g,' ')
export const businessKey = row => normalize(row.name)+'|'+normalize(row.town)
const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100)
const md = v => String(v).replace(/([\\*_{}\[\]<>|#])/g,'\\$1').replaceAll(String.fromCharCode(96),"'").replace(/\r?\n/g,' ')
export function parseCsv(input) {
  text(input,'CSV',5000000)
  const value=input.replace(/^\uFEFF/,'')
  const records=[]
  let row=[],field='',quoted=false,closed=false,started=false
  const finishField=()=>{row.push(field);field='';closed=false;started=false}
  const finishRow=()=>{finishField();if(row.some(c=>c.length))records.push(row);row=[]}
  for(let i=0;i<value.length;i++){
    const c=value[i]
    if(quoted){if(c==='"'){if(value[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=c}
    else if(c===',')finishField()
    else if(c==='\r'||c==='\n'){finishRow();if(c==='\r'&&value[i+1]==='\n')i++}
    else if(closed)fail('Unexpected character after quoted CSV field')
    else if(c==='"'){if(started)fail('Quote in unquoted CSV field');quoted=true;started=true}
    else{field+=c;started=true}
  }
  if(quoted)fail('Unterminated CSV quote')
  if(field.length||row.length||started||closed)finishRow()
  if(!records.length)fail('CSV has no header')
  const headers=records.shift().map(h=>h.trim())
  if(headers.some(h=>!h||['__proto__','constructor','prototype'].includes(h))||new Set(headers).size!==headers.length)fail('Invalid or duplicate CSV headers')
  return records.map((cells,i)=>{if(cells.length!==headers.length)fail('CSV column count mismatch on row '+(i+2));return Object.fromEntries(headers.map((h,n)=>[h,cells[n]]))})
}
function validateCosts(c){
  if(!Number.isFinite(c.totalHours)||c.totalHours<=0||c.totalHours>1000)fail('Invalid totalHours')
  integer(c.internalHourlyCostCents,1,1000000,'hourly cost');integer(c.directCostCents,0,100000000,'direct cost')
}
export function validateSettings(c){
  object(c,'Settings')
  if(c.schemaVersion!==1||c.mode!=='internal-only'||c.outreachAllowed!==false||c.applicationsAllowed!==false)fail('Only internal preparation with outreach and applications disabled is supported')
  text(c.campaignId,'campaign ID',100);text(c.brand,'brand',120)
  object(c.identity,'Identity');object(c.offer,'Offer');object(c.planning,'Planning')
  const o=c.offer,p=c.planning
  if(o.currency!=='USD'||o.maxLocations!==1||o.maxMenuItems!==30||o.fulfillment!=='pickup')fail('The pilot is one US-dollar pickup location with at most 30 menu items')
  integer(o.setupFeeCents,1,100000000,'setup fee');integer(o.depositCents,0,o.setupFeeCents,'deposit')
  integer(o.supportDays,0,365,'support days');integer(o.pilotCapacity,1,100,'pilot capacity')
  if(p.referralRevenueCents!==0)fail('Base-case referral revenue must remain zero')
  validateCosts(p)
  if(!Number.isFinite(p.minimumContributionPercent)||p.minimumContributionPercent<0||p.minimumContributionPercent>100)fail('Invalid contribution threshold')
  return c
}
export function estimate(config,overrides={}){
  validateSettings(config);object(overrides,'Cost overrides')
  if(Object.keys(overrides).some(k=>!['totalHours','internalHourlyCostCents','directCostCents'].includes(k)))fail('Unknown cost override')
  const c={...config.planning,...overrides};validateCosts(c)
  const laborCostCents=Math.round(c.totalHours*c.internalHourlyCostCents)
  const contributionCents=config.offer.setupFeeCents-laborCostCents-c.directCostCents
  const contributionPercent=Math.round(contributionCents/config.offer.setupFeeCents*10000)/100
  return{assumptionOnly:true,totalHours:c.totalHours,laborCostCents,directCostCents:c.directCostCents,referralRevenueCents:0,contributionCents,contributionPercent,needsRescope:contributionPercent<config.planning.minimumContributionPercent}
}
const factLabels={
 ownerConfirmed:'Decision maker confirmed the need and supplied evidence',
 operatingNow:'Business is currently operating',wantsDirectPickup:'Owner wants direct online pickup',
 locationCount:'Number of locations',menuItemCount:'Number of standard menu items',
 simpleOptions:'Menu options fit the simple-option scope',posMigrationRequired:'Whether a point-of-sale migration is required',
 existingSystemKnown:'Current website, ordering and point-of-sale systems are known',
 ownerOwnsAccounts:'Owner will control accounts, billing and recovery',
 providerFeesApproved:'Owner reviewed and approved actual provider costs'
}
function date(v,n){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))fail('Invalid '+n)
  const d=Date.parse(v+'T00:00:00Z')
  if(!Number.isFinite(d)||new Date(d).toISOString().slice(0,10)!==v)fail('Invalid '+n)
  return d
}
function validateFacts(f){
  object(f,'Qualification facts')
  if(Object.keys(f).some(k=>!Object.hasOwn(factLabels,k)&&k!=='evidenceNote'))fail('Unknown qualification fact')
  for(const[k,v]of Object.entries(f)){
    if(v===null||v===undefined)continue
    if(k==='evidenceNote'){if(typeof v!=='string'||v.length>10000)fail('Invalid evidence note')}
    else if(['locationCount','menuItemCount'].includes(k))integer(v,1,100000,k)
    else if(typeof v!=='boolean')fail('Invalid boolean fact '+k)
  }
  if(f.ownerConfirmed===true&&!f.evidenceNote?.trim())fail('Owner confirmation requires an evidence note')
}
function validateRecord(r,asOf){
  object(r,'Research row')
  for(const k of ['name','town','observation','source','contact','checked','outreach','next_step'])text(r[k],k)
  if(!['Investigate','Hold','Exclude'].includes(r.status))fail('Unknown research disposition')
  for(const k of ['source','secondary']){
    if(!r[k])continue
    let u;try{u=new URL(r[k])}catch{fail('Invalid source URL')}
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password)fail('Unsafe source URL')
  }
  const age=(date(asOf,'assessment date')-date(r.checked,'evidence date'))/86400000
  if(age<0)fail('Research evidence cannot be future-dated')
  if(r.outreach!=='Not sent')fail('Unexpected contact history; reconcile before continuing this internal campaign')
  return age
}
export function assessProspect(row,facts={},config,asOf){
  validateSettings(config);validateFacts(facts)
  const age=validateRecord(row,asOf)
  const base={key:businessKey(row),name:row.name,town:row.town,researchDisposition:row.status,evidenceAgeDays:age,missing:[],reasons:[],outreachAllowed:false}
  const result=(status,reasons,missing=[])=>({...base,status,reasons,missing})
  if(row.status==='Exclude')return result('excluded',['Existing ordering or outside this specific offer; retain the research exclusion.'])
  if(age>30)return result('needs-research',['Public evidence is older than 30 days; recheck before using it.'])
  if(row.status==='Hold')return result('needs-research',[row.next_step])
  if(facts.operatingNow===false||facts.wantsDirectPickup===false)return result('not-a-fit',['The business is closed or the owner does not want this outcome.'])
  const scope=[]
  if(facts.locationCount>1)scope.push('Multiple locations')
  if(facts.menuItemCount>30)scope.push('More than 30 menu items')
  if(facts.simpleOptions===false)scope.push('Complex menu options')
  if(facts.posMigrationRequired===true)scope.push('Point-of-sale migration')
  if(facts.ownerOwnsAccounts===false)scope.push('Owner-controlled account handover is not accepted')
  if(scope.length)return result('separate-scope',scope)
  const missing=Object.keys(factLabels).filter(k=>facts[k]===null||facts[k]===undefined||(k!=='posMigrationRequired'&&!['locationCount','menuItemCount'].includes(k)&&facts[k]!==true))
  if(missing.length)return result('needs-qualification',missing.map(k=>factLabels[k]),missing)
  return result('fit-for-scope-review',['Within the pilot limits. Written scope, cost approval, acceptance and any future contact authorization remain separate.'])
}
export function compile(config,rows,inputs,asOf){
  validateSettings(config);object(inputs,'Qualification inputs');date(asOf,'assessment date')
  if(!Array.isArray(rows)||!rows.length||rows.length>1000)fail('Expected 1–1000 research records')
  const keys=new Set()
  for(const r of rows){validateRecord(r,asOf);const k=businessKey(r);if(keys.has(k))fail('Duplicate business evidence: '+r.name);keys.add(k)}
  for(const k of Object.keys(inputs)){if(!keys.has(k))fail('Qualification inputs reference an unknown business: '+k);validateFacts(inputs[k])}
  const assessments=rows.map(r=>assessProspect(r,inputs[businessKey(r)]||{},config,asOf))
  const states=['needs-qualification','needs-research','excluded','not-a-fit','separate-scope','fit-for-scope-review']
  const counts=Object.fromEntries(states.map(s=>[s,assessments.filter(a=>a.status===s).length]))
  const economics=estimate(config)
  const summary={schemaVersion:1,campaignId:config.campaignId,brand:config.brand,asOf,mode:'internal-only',outreachAllowed:false,readyForOutreach:false,providerApplicationsAllowed:false,records:rows.length,counts,economics,assessments}
  const report=[
    '# '+md(config.brand)+' — internal operating plan','',
    'As of '+asOf+'. No message is sent, scheduled or authorized by this tool.','',
    '## Decisions already made','',
    '- Direct online pickup for one restaurant, up to 30 standard menu items.',
    '- Pilot: '+money(config.offer.setupFeeCents)+' once; '+money(config.offer.depositCents)+' after scope approval and '+money(config.offer.setupFeeCents-config.offer.depositCents)+' after acceptance.',
    '- Use a suitable existing provider first. Select any new provider only after checking the current stack and total fees.',
    '- Accounts, billing and recovery belong to the merchant. Referral revenue assumed: $0.',
    '- Planned mailbox: '+md(config.identity.plannedSender||'unset')+'; '+md(config.identity.mailboxStatus)+'. No mailbox or domain settings were changed.',
    '- Internal seller default: '+md(config.identity.legalSeller)+'. This creates no registration or external contract.','',
    '## Qualification queue','','| Business | Disposition | Next internal step |','|---|---|---|',
    ...assessments.map(a=>'| '+md(a.name)+' | '+a.status+' | '+md(a.reasons[0]||'Review scope')+' |'),'',
    '## Planning economics','','These are assumptions, not collected revenue or measured delivery time.',
    'At '+economics.totalHours+' total hours, labor is '+money(economics.laborCostCents)+' and direct business costs are '+money(economics.directCostCents)+'. Estimated contribution is '+money(economics.contributionCents)+' ('+economics.contributionPercent+'%) before tax and omitted overhead. Merchant provider charges are separate.',
    economics.needsRescope?'Below the contribution threshold: narrow the work or reprice before acceptance.':'Track actual time and costs; re-scope if work exceeds the planning budget.','',
    '## Next step','','Keep preparing internally. The two investigation candidates need real operator facts. Do not invent preferences, existing systems, menu scope or acceptance. No contact, CRM enrollment, partner submission or publication is part of this build.',''
  ].join('\n')
  const packets=['# Internal quote and delivery packets','','INTERNAL DRAFT — not an accepted scope, invoice, contract or contact authorization.','No message is sent or scheduled.','']
  rows.forEach((r,i)=>{
    const a=assessments[i]
    if(r.status!=='Investigate'||['not-a-fit','excluded'].includes(a.status))return
    packets.push('## '+md(r.name)+' — '+md(r.town),'','Status: '+a.status+'.','','Observed: '+md(r.observation),'',
      'Evidence: '+r.source+(r.secondary?' | '+r.secondary:''),'',
      'Draft service: '+money(config.offer.setupFeeCents)+' for one location, up to 30 items, simple options and pickup. Provider fees/hardware are separate and require owner approval.',
      'Payment assumption: '+money(config.offer.depositCents)+' after written scope approval; remainder after the agreed order test and handover.',
      'Excluded: POS migration, full website redesign, delivery logistics and custom catering checkout.','',
      'Unresolved facts / scope decisions:',...a.reasons.map(reason=>'- '+md(reason)),'',
      'Acceptance: correct menu and total; agreed order reaches actual staff; hours/unavailable items work; owner demonstrates a change; account control and written handover verified.',
      'Support: '+config.offer.supportDays+' days of fixes to the agreed setup. No recurring service required.','')
  })
  return{summary,files:{'report.md':report,'quote-packets.md':packets.join('\n'),'readiness.json':JSON.stringify(summary,null,2)+'\n'}}
}
export function writeSnapshot(base,compiled){
  object(compiled.files,'Generated files')
  const entries=Object.entries(compiled.files).sort(([a],[b])=>a.localeCompare(b))
  if(!entries.length)fail('No generated files')
  for(const[name,content]of entries){
    if(basename(name)!==name||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(name)||name.toLowerCase()==='manifest.json'||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i.test(name))fail('Invalid snapshot filename')
    if(typeof content!=='string')fail('Generated content must be text')
  }
  if(existsSync(base)&&lstatSync(base).isSymbolicLink())fail('Snapshot base must not be a symlink')
  const hash=createHash('sha256').update(JSON.stringify(entries)).digest('hex'),target=join(base,hash)
  const manifest=JSON.stringify({contentHash:hash,files:entries.map(([name,content])=>({file:name,bytes:Buffer.byteLength(content),sha256:createHash('sha256').update(content).digest('hex')}))},null,2)+'\n'
  const all=[...entries,['manifest.json',manifest]]
  if(existsSync(target)&&lstatSync(target).isSymbolicLink())fail('Snapshot target must not be a symlink')
  for(const[name,content]of all)if(existsSync(join(target,name))&&(lstatSync(join(target,name)).isSymbolicLink()||readFileSync(join(target,name),'utf8')!==content))fail('Existing content differs; preserve it and investigate: '+name)
  mkdirSync(target,{recursive:true})
  for(const[name,content]of all){
    try{writeFileSync(join(target,name),content,{flag:'wx'})}catch(e){if(e.code!=='EEXIST'||readFileSync(join(target,name),'utf8')!==content)throw e}
    if(readFileSync(join(target,name),'utf8')!==content)fail('Snapshot read-back mismatch')
  }
  return{path:target,contentHash:hash,files:all.map(([name])=>name)}
}
