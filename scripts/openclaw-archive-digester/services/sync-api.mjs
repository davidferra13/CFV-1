#!/usr/bin/env node
/** Local health only. Private archive data has no network publication permission. */
import express from 'express'
const app = express()
const port = Number(process.env.ARCHIVE_PORT || '8086')
app.get('/health', (_req, res) => res.json({ status: 'ok', privacy_gate: 'required', cloud_allowed: false }))
app.use((_req, res) => res.status(403).json({ error: 'archive_network_export_disabled' }))
app.listen(port, '127.0.0.1', () => console.log('Local archive health service started; data export disabled'))
