import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, validateSettings, assessProspect, estimate, compile, writeSnapshot } from './core.mjs'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
const config = {
 schemaVersion:1,campaignId:'test',brand:'ChefFlow Setup',mode:'internal-only',
 outreachAllowed:false,applicationsAllowed:false,
 identity:{senderAddress:null,plannedSender:'setup@example.invalid',mailboxStatus:'not-provisioned',legalSeller:'Example LLC',legalSellerStatus:'internal-working-default',postalAddress:null},
 offer:{currency:'USD',setupFeeCents:50000,depositCents:25000,maxLocations:1,maxMenuItems:30,fulfillment:'pickup',supportDays:14,pilotCapacity:3},
 planning:{totalHours:8,internalHourlyCostCents:5000,directCostCents:0,minimumContributionPercent:20,referralRevenueCents:0}, assumptions:['Test fixture only']
}
const lead={name:'Test Cafe',town:'Example, MA',status:'Investigate',observation:'Phone ordering observed; owner need unknown.',source:'https://example.invalid/menu',secondary:'',contact:'Public business phone not supplied',checked:'2026-09-27',outreach:'Not sent',next_step:'Confirm owner need.'}
const good={ownerConfirmed:true,evidenceNote:'Synthetic test fixture, not a real owner statement',operatingNow:true,wantsDirectPickup:true,locationCount:1,menuItemCount:30,simpleOptions:true,posMigrationRequired:false,existingSystemKnown:true,ownerOwnsAccounts:true,providerFeesApproved:true}
const asOf='2026-09-27'
test('CSV preserves quoted commas, escaped quotes, CRLF and multiline evidence',()=>{
 const rows=parseCsv('name,observation\r\n"Cafe, Inc.","Said ""pickup""\r\nmenu"\r\n')
 assert.equal(rows.length,1);assert.equal(rows[0].name,'Cafe, Inc.');assert.equal(rows[0].observation,'Said "pickup"\r\nmenu')
})
test('Malformed CSV and duplicate headers fail closed',()=>{
 for(const csv of ['name,name\nA,B','name,status\n"unterminated,A','name,status\nA,B,C','name,status\nA','name,status\n"abc"def,x'])assert.throws(()=>parseCsv(csv))
})
test('Settings cannot enable outreach, applications or assume commission',()=>{
 for(const patch of [{outreachAllowed:true},{applicationsAllowed:true},{mode:'live'},{planning:{...config.planning,referralRevenueCents:100000}}])assert.throws(()=>validateSettings({...config,...patch}))
})
test('Unconfirmed public evidence never qualifies a prospect',()=>{
 const r=assessProspect(lead,{},config,asOf);assert.equal(r.status,'needs-qualification');assert(r.missing.includes('ownerConfirmed'))
})
test('Explicit owner uncertainty cannot be converted into confirmed need',()=>{
 const r=assessProspect(lead,{...good,ownerConfirmed:null},config,asOf);assert.equal(r.status,'needs-qualification')
})
test('Owner confirmation requires a recorded evidence note',()=>{
 assert.throws(()=>assessProspect(lead,{...good,evidenceNote:''},config,asOf))
})
test('Thirty simple items fit; thirty-one require separate scope',()=>{
 assert.equal(assessProspect(lead,good,config,asOf).status,'fit-for-scope-review')
 assert.equal(assessProspect(lead,{...good,menuItemCount:31},config,asOf).status,'separate-scope')
})
test('Existing platform exclusions and unresolved holds remain withheld',()=>{
 assert.equal(assessProspect({...lead,status:'Exclude'},good,config,asOf).status,'excluded')
 assert.equal(assessProspect({...lead,status:'Hold'},good,config,asOf).status,'needs-research')
})
test('Closed businesses and declined need are not qualified',()=>{
 for(const facts of [{...good,operatingNow:false},{...good,wantsDirectPickup:false}])assert.equal(assessProspect(lead,facts,config,asOf).status,'not-a-fit')
})
test('Unknown provider costs prevent a fit decision; POS migrations need separate scope',()=>{
 assert.equal(assessProspect(lead,{...good,providerFeesApproved:null},config,asOf).status,'needs-qualification')
 assert.equal(assessProspect(lead,{...good,posMigrationRequired:true},config,asOf).status,'separate-scope')
})
test('Stale evidence is held for research and future dates are rejected',()=>{
 assert.equal(assessProspect({...lead,checked:'2026-08-01'},good,config,asOf).status,'needs-research')
 assert.throws(()=>assessProspect({...lead,checked:'2026-10-01'},good,config,asOf))
})
test('Malformed merchant facts and unsafe source URLs are rejected',()=>{
 for(const facts of [{...good,menuItemCount:-1},{...good,locationCount:1.5},{...good,ownerConfirmed:'yes'},{...good,surprise:true}])assert.throws(()=>assessProspect(lead,facts,config,asOf))
 assert.throws(()=>assessProspect({...lead,source:'javascript:alert(1)'},good,config,asOf))
})
test('The base case includes labor, keeps referral income zero and flags overruns',()=>{
 const r=estimate(config);assert.equal(r.laborCostCents,40000);assert.equal(r.contributionCents,10000);assert.equal(r.contributionPercent,20);assert.equal(r.needsRescope,false)
 assert.equal(estimate(config,{totalHours:12}).needsRescope,true)
})
test('Money and hours reject negative, nonfinite, fractional cents and invalid deposits',()=>{
 for(const patch of [{totalHours:0},{totalHours:Infinity},{directCostCents:-1},{directCostCents:0.5}])assert.throws(()=>estimate(config,patch))
 assert.throws(()=>validateSettings({...config,offer:{...config.offer,depositCents:60000}}))
})
test('Compile rejects duplicate business evidence and unknown input identities',()=>{
 assert.throws(()=>compile(config,[lead,{...lead,name:' test cafe '}],{},asOf))
 assert.throws(()=>compile(config,[lead],{'Unknown Cafe | Example, MA':good},asOf))
})
test('Even qualified packets never become authorized communications',()=>{
 const r=compile(config,[lead],{'test cafe|example, ma':good},asOf)
 assert.equal(r.summary.outreachAllowed,false);assert.equal(r.summary.readyForOutreach,false)
 assert.equal(r.summary.providerApplicationsAllowed,false);assert.equal(r.summary.counts['fit-for-scope-review'],1)
 assert.match(r.files['quote-packets.md'],/INTERNAL DRAFT/);assert.match(r.files['quote-packets.md'],/No message is sent/)
})
test('Snapshot writing is idempotent and never overwrites changed content',()=>{
 const base=mkdtempSync(join(tmpdir(),'chefflow-setup-test-'))
 const output={files:{'report.md':'Report\n','readiness.json':'{}\n'}}
 const first=writeSnapshot(base,output);const count=readdirSync(base).length
 assert.equal(writeSnapshot(base,output).path,first.path);assert.equal(readdirSync(base).length,count)
 assert.equal(readFileSync(join(first.path,'report.md'),'utf8'),'Report\n')
 writeFileSync(join(first.path,'report.md'),'User notes preserved\n')
 assert.throws(()=>writeSnapshot(base,output),/Existing content differs/)
 assert.equal(readFileSync(join(first.path,'report.md'),'utf8'),'User notes preserved\n')
})
test('Snapshot output rejects traversal and reserved filenames',()=>{
 const base=mkdtempSync(join(tmpdir(),'chefflow-setup-test-'))
 for(const name of ['../escape.md','nested/file.md','manifest.json'])assert.throws(()=>writeSnapshot(base,{files:{[name]:'bad'}}))
})

test('An interrupted snapshot resumes without losing the file already written',()=>{
 const base=mkdtempSync(join(tmpdir(),'chefflow-setup-resume-'))
 const output={files:{'report.md':'Saved report\n','readiness.json':'{}\n'}}
 const entries=Object.entries(output.files).sort(([a],[b])=>a.localeCompare(b))
 const hash=createHash('sha256').update(JSON.stringify(entries)).digest('hex')
 const target=join(base,hash);mkdirSync(target)
 writeFileSync(join(target,'report.md'),output.files['report.md'])
 assert.equal(writeSnapshot(base,output).path,target)
 assert.equal(readFileSync(join(target,'report.md'),'utf8'),output.files['report.md'])
 assert.equal(readFileSync(join(target,'readiness.json'),'utf8'),'{}\n')
 assert.equal(JSON.parse(readFileSync(join(target,'manifest.json'),'utf8')).files.length,2)
})
test('Invalid qualification entries fail instead of silently resetting facts',()=>{
 for(const value of [null,false,[]])assert.throws(()=>compile(config,[lead],{'test cafe|example, ma':value},asOf))
})
