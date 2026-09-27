#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv, compile, writeSnapshot } from './core.mjs'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const campaign=join(root,'docs/business/chefflow-setup')
try{
 const args=process.argv.slice(2)
 if(args.length!==1||!['check','report','build'].includes(args[0]))throw new Error('Use check, report or build. Outreach, imports, applications and publishing are unsupported.')
 const config=JSON.parse(readFileSync(join(campaign,'10-Campaign-settings.json'),'utf8'))
 const input=JSON.parse(readFileSync(join(campaign,'11-Qualification-inputs.json'),'utf8'))
 if(input.schemaVersion!==1||!input.businesses||Object.keys(input).some(k=>!['schemaVersion','businesses'].includes(k)))throw new Error('Invalid qualification input envelope')
 const rows=parseCsv(readFileSync(join(campaign,'02-Prospect-review.csv'),'utf8'))
 const asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 const output=compile(config,rows,input.businesses,asOf)
 if(args[0]==='build')console.log(JSON.stringify({status:'generated-internally',...writeSnapshot(join(campaign,'generated'),output),summary:output.summary},null,2))
 else console.log(JSON.stringify({status:'validated',summary:output.summary},null,2))
}catch(error){process.stderr.write(JSON.stringify({status:'blocked',error:error.message,outreachAttempted:false})+'\n');process.exitCode=1}
