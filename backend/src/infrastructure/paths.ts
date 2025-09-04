import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PROJECT_ROOT = path.resolve(__dirname, '../../')

export const paths = {
  projectRoot: PROJECT_ROOT,
  outputsDir: config.paths.outputsDir
    ? path.resolve(PROJECT_ROOT, config.paths.outputsDir)
    : path.resolve(PROJECT_ROOT, 'outputs'),
  logsDir: config.paths.logsDir
    ? path.resolve(PROJECT_ROOT, config.paths.logsDir)
    : path.resolve(PROJECT_ROOT, 'logs'),
  tmpDir: config.paths.tmpDir
    ? path.resolve(PROJECT_ROOT, config.paths.tmpDir)
    : path.resolve(PROJECT_ROOT, 'tmp'),
}


for (const p of [paths.outputsDir, paths.logsDir, paths.tmpDir]) {
  try {
    fs.mkdirSync(p, { recursive: true })
  } catch {}
}
