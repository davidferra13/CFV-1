/**
 * OpenCLAW Email Agent
 * Sends wholesale price list requests, checks inbox for responses,
 * processes PDF/spreadsheet attachments, and stores extracted prices.
 *
 * Usage:
 *   node agent.mjs --send     # Send outbound requests (max 10/day)
 *   node agent.mjs --check    # Check inbox and process responses
 *   node agent.mjs            # Run both (default for cron)
 *
 * Env vars required:
 *   OPENCLAW_EMAIL_USER     - IMAP/SMTP username (openclaw@cheflowhq.com)
 *   OPENCLAW_EMAIL_PASS     - App password
 *   OPENCLAW_EMAIL_HOST     - IMAP/SMTP host
 *   OPENCLAW_SMTP_PORT      - SMTP port (default: 587)
 *   OPENCLAW_IMAP_PORT      - IMAP port (default: 993)
 */

import { createRequire } from 'module'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { initialRequest, followUp, weeklyUpdate } from './templates.mjs'
import { extractPricesFromPdf } from './pdf-extractor.mjs'
import { parseSpreadsheet } from './spreadsheet-parser.mjs'
import { matchBulk } from './price-matcher.mjs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const nodemailer = require('nodemailer')
const Imap = require('imap')
const { simpleParser } = require('mailparser')

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const DB_DIR = path.join(os.homedir(), 'openclaw-email')
const DB_PATH = path.join(DB_DIR, 'email-agent.db')
const ATTACHMENTS_DIR = path.join(DB_DIR, 'attachments')
const MAX_EMAILS_PER_DAY = 10

// --- Database setup ---

function initDb() {
  fs.mkdirSync(DB_DIR, { recursive: true })
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true })

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS wholesale_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      distributor_name TEXT NOT NULL,
      contact_email TEXT NOT NULL UNIQUE,
      contact_name TEXT,
      region TEXT,
      category TEXT,
      first_contacted_at TEXT,
      last_contacted_at TEXT,
      last_response_at TEXT,
      response_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'new'
    );

    CREATE TABLE IF NOT EXISTS wholesale_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER REFERENCES wholesale_contacts(id),
      canonical_ingredient_id TEXT,
      raw_product_name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      unit TEXT,
      case_size TEXT,
      case_price_cents INTEGER,
      per_unit_cents INTEGER,
      min_order TEXT,
      source_file TEXT,
      extracted_at TEXT DEFAULT (datetime('now')),
      confidence TEXT DEFAULT 'wholesale_email'
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL,
      contact_id INTEGER REFERENCES wholesale_contacts(id),
      subject TEXT,
      template_used TEXT,
      attachment_count INTEGER DEFAULT 0,
      processed BOOLEAN DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  return db
}

function seedContacts(db) {
  const contactsPath = path.join(__dirname, 'contacts.json')
  if (!fs.existsSync(contactsPath)) return 0

  const data = JSON.parse(fs.readFileSync(contactsPath, 'utf8'))
  const insert = db.prepare(`
    INSERT OR IGNORE INTO wholesale_contacts (distributor_name, contact_email, category, region)
    VALUES (?, ?, ?, ?)
  `)

  let count = 0
  for (const c of data.contacts) {
    const result = insert.run(c.distributor_name, c.contact_email, c.category, data.region.label)
    if (result.changes > 0) count++
  }

  return count
}

// --- Email transport ---

function getTransport() {
  const user = process.env.OPENCLAW_EMAIL_USER
  const pass = process.env.OPENCLAW_EMAIL_PASS
  const host = process.env.OPENCLAW_EMAIL_HOST

  if (!user || !pass || !host) {
    console.error('Missing email credentials. Set OPENCLAW_EMAIL_USER, OPENCLAW_EMAIL_PASS, OPENCLAW_EMAIL_HOST')
    return null
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.OPENCLAW_SMTP_PORT || '587'),
    secure: false,
    auth: { user, pass }
  })
}

function getImapConfig() {
  return {
    user: process.env.OPENCLAW_EMAIL_USER,
    password: process.env.OPENCLAW_EMAIL_PASS,
    host: process.env.OPENCLAW_EMAIL_HOST,
    port: parseInt(process.env.OPENCLAW_IMAP_PORT || '993'),
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  }
}

// --- Outbound: Send requests ---

async function sendRequests(db) {
  const transport = getTransport()
  if (!transport) return

  const region = JSON.parse(fs.readFileSync(path.join(__dirname, 'contacts.json'), 'utf8')).region

  // Check how many emails sent today
  const sentToday = db.prepare(`
    SELECT count(*) as c FROM email_log
    WHERE direction = 'sent' AND date(created_at) = date('now')
  `).get().c

  if (sentToday >= MAX_EMAILS_PER_DAY) {
    console.log(`Rate limit reached: ${sentToday}/${MAX_EMAILS_PER_DAY} emails sent today`)
    return
  }

  let remaining = MAX_EMAILS_PER_DAY - sentToday

  // 1. New contacts: send initial request
  const newContacts = db.prepare(`
    SELECT * FROM wholesale_contacts
    WHERE status = 'new' AND first_contacted_at IS NULL
    LIMIT ?
  `).all(remaining)

  for (const contact of newContacts) {
    if (remaining <= 0) break

    const template = initialRequest({ city: region.city, state: region.state, region: region.label })

    try {
      await transport.sendMail({
        from: process.env.OPENCLAW_EMAIL_USER,
        to: contact.contact_email,
        subject: template.subject,
        text: template.text
      })

      db.prepare(`
        UPDATE wholesale_contacts SET status = 'contacted', first_contacted_at = datetime('now'), last_contacted_at = datetime('now')
        WHERE id = ?
      `).run(contact.id)

      db.prepare(`
        INSERT INTO email_log (direction, contact_id, subject, template_used)
        VALUES ('sent', ?, ?, 'initial_request')
      `).run(contact.id, template.subject)

      console.log(`[SENT] Initial request to ${contact.distributor_name} <${contact.contact_email}>`)
      remaining--
    } catch (err) {
      console.error(`[FAIL] Could not send to ${contact.contact_email}:`, err.message)
    }
  }

  // 2. Follow-ups: contacts with no response after 14 days (once only)
  const followUpContacts = db.prepare(`
    SELECT * FROM wholesale_contacts
    WHERE status = 'contacted'
    AND last_response_at IS NULL
    AND last_contacted_at < datetime('now', '-14 days')
    AND id NOT IN (
      SELECT contact_id FROM email_log WHERE template_used = 'follow_up' AND contact_id IS NOT NULL
    )
    LIMIT ?
  `).all(remaining)

  for (const contact of followUpContacts) {
    if (remaining <= 0) break

    const template = followUp({ region: region.label })

    try {
      await transport.sendMail({
        from: process.env.OPENCLAW_EMAIL_USER,
        to: contact.contact_email,
        subject: template.subject,
        text: template.text
      })

      db.prepare(`UPDATE wholesale_contacts SET last_contacted_at = datetime('now') WHERE id = ?`).run(contact.id)
      db.prepare(`INSERT INTO email_log (direction, contact_id, subject, template_used) VALUES ('sent', ?, ?, 'follow_up')`).run(contact.id, template.subject)

      console.log(`[SENT] Follow-up to ${contact.distributor_name}`)
      remaining--
    } catch (err) {
      console.error(`[FAIL] Follow-up to ${contact.contact_email}:`, err.message)
    }
  }

  // 3. Weekly updates for responsive contacts
  const responsiveContacts = db.prepare(`
    SELECT * FROM wholesale_contacts
    WHERE status = 'responsive'
    AND (last_contacted_at IS NULL OR last_contacted_at < datetime('now', '-7 days'))
    LIMIT ?
  `).all(remaining)

  for (const contact of responsiveContacts) {
    if (remaining <= 0) break

    const template = weeklyUpdate({
      distributorName: contact.distributor_name,
      contactName: contact.contact_name
    })

    try {
      await transport.sendMail({
        from: process.env.OPENCLAW_EMAIL_USER,
        to: contact.contact_email,
        subject: template.subject,
        text: template.text
      })

      db.prepare(`UPDATE wholesale_contacts SET last_contacted_at = datetime('now') WHERE id = ?`).run(contact.id)
      db.prepare(`INSERT INTO email_log (direction, contact_id, subject, template_used) VALUES ('sent', ?, ?, 'weekly_update')`).run(contact.id, template.subject)

      console.log(`[SENT] Weekly update to ${contact.distributor_name}`)
      remaining--
    } catch (err) {
      console.error(`[FAIL] Weekly update to ${contact.contact_email}:`, err.message)
    }
  }

  transport.close()
  console.log(`Sending complete. ${MAX_EMAILS_PER_DAY - remaining} emails sent today.`)
}

// --- Inbound: Check inbox ---

function checkInbox(db) {
  return new Promise((resolve, reject) => {
    const config = getImapConfig()
    if (!config.user || !config.password || !config.host) {
      console.error('Missing IMAP credentials')
      resolve()
      return
    }

    const imap = new Imap(config)

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) { imap.end(); reject(err); return }

        imap.search(['UNSEEN'], (err, results) => {
          if (err) { imap.end(); reject(err); return }
          if (!results || results.length === 0) {
            console.log('No unread emails')
            imap.end()
            resolve()
            return
          }

          console.log(`Found ${results.length} unread emails`)
          const fetch = imap.fetch(results, { bodies: '', struct: true, markSeen: true })
          const messages = []

          fetch.on('message', (msg) => {
            let buffer = ''
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => { buffer += chunk.toString('utf8') })
              stream.on('end', () => { messages.push(buffer) })
            })
          })

          fetch.once('end', async () => {
            for (const raw of messages) {
              try {
                await processEmail(db, raw)
              } catch (e) {
                console.error('[PROCESS] Error processing email:', e.message)
              }
            }
            imap.end()
            resolve()
          })

          fetch.once('error', (err) => {
            console.error('[IMAP] Fetch error:', err.message)
            imap.end()
            resolve()
          })
        })
      })
    })

    imap.once('error', (err) => {
      console.error('[IMAP] Connection error:', err.message)
      resolve()
    })

    imap.connect()
  })
}

async function processEmail(db, rawEmail) {
  const parsed = await simpleParser(rawEmail)
  const senderEmail = parsed.from?.value?.[0]?.address?.toLowerCase()

  if (!senderEmail) return

  // Match sender to known contact
  const contact = db.prepare('SELECT * FROM wholesale_contacts WHERE lower(contact_email) = ?').get(senderEmail)
  if (!contact) {
    console.log(`[SKIP] Unknown sender: ${senderEmail}`)
    return
  }

  console.log(`[RECV] Email from ${contact.distributor_name}: "${parsed.subject}"`)

  // Check for opt-out
  const bodyText = (parsed.text || '').toLowerCase()
  if (/remove|unsubscribe|stop|opt.?out|do not contact/i.test(bodyText)) {
    db.prepare(`UPDATE wholesale_contacts SET status = 'opted_out' WHERE id = ?`).run(contact.id)
    console.log(`[OPT-OUT] ${contact.distributor_name} requested removal. Permanently blocked.`)
    return
  }

  // Update contact status
  db.prepare(`
    UPDATE wholesale_contacts
    SET status = 'responsive', last_response_at = datetime('now'), response_count = response_count + 1
    WHERE id = ?
  `).run(contact.id)

  // Process attachments
  const attachments = parsed.attachments || []
  let totalPrices = 0

  db.prepare(`
    INSERT INTO email_log (direction, contact_id, subject, attachment_count)
    VALUES ('received', ?, ?, ?)
  `).run(contact.id, parsed.subject, attachments.length)

  for (const att of attachments) {
    const filename = att.filename || 'unknown'
    const ext = filename.split('.').pop()?.toLowerCase()

    // Save attachment
    const savePath = path.join(ATTACHMENTS_DIR, `${Date.now()}_${filename}`)
    fs.writeFileSync(savePath, att.content)

    let extracted = []

    if (ext === 'pdf') {
      extracted = await extractPricesFromPdf(att.content)
    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
      extracted = parseSpreadsheet(att.content, filename)
    } else {
      console.log(`[SKIP] Unsupported attachment type: ${filename}`)
      continue
    }

    console.log(`[EXTRACT] ${filename}: ${extracted.length} prices found`)

    // Match to canonical ingredients
    const matched = matchBulk(extracted)

    // Store prices
    const insertPrice = db.prepare(`
      INSERT INTO wholesale_prices (
        contact_id, canonical_ingredient_id, raw_product_name,
        price_cents, unit, case_size, source_file
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    for (const item of matched) {
      const priceCents = Math.round(parseFloat(item.price) * 100)
      if (isNaN(priceCents) || priceCents <= 0) continue

      insertPrice.run(
        contact.id,
        item.match?.id || null,
        item.product,
        priceCents,
        item.unit,
        item.case_size,
        filename
      )
      totalPrices++
    }
  }

  if (totalPrices > 0) {
    console.log(`[STORED] ${totalPrices} wholesale prices from ${contact.distributor_name}`)
  }
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2)
  const doSend = args.includes('--send') || args.length === 0
  const doCheck = args.includes('--check') || args.length === 0

  console.log('OpenCLAW Email Agent starting...')
  const db = initDb()

  // Seed contacts from JSON on first run
  const seeded = seedContacts(db)
  if (seeded > 0) console.log(`Seeded ${seeded} new contacts`)

  if (doSend) {
    console.log('\n--- Outbound: Sending requests ---')
    await sendRequests(db)
  }

  if (doCheck) {
    console.log('\n--- Inbound: Checking inbox ---')
    await checkInbox(db)
  }

  db.close()
  console.log('\nEmail agent complete.')
}

main().catch(err => {
  console.error('Email agent failed:', err)
  process.exit(1)
})
