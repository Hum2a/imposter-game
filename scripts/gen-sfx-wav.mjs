/**
 * Writes tiny mono PCM WAVs into public/sounds/ (run: node scripts/gen-sfx-wav.mjs).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function writeWav(filepath, { durationSec, freq, volume }) {
  const sampleRate = 22050
  const numSamples = Math.floor(sampleRate * durationSec)
  const dataSize = numSamples * 2
  const buf = Buffer.alloc(44 + dataSize)

  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const env = 1 - i / numSamples
    const sample = Math.sin(2 * Math.PI * freq * t) * volume * env
    const int16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
    buf.writeInt16LE(int16, 44 + i * 2)
  }

  fs.mkdirSync(path.dirname(filepath), { recursive: true })
  fs.writeFileSync(filepath, buf)
}

const out = path.join(__dirname, '../public/sounds')
writeWav(path.join(out, 'vote.wav'), { durationSec: 0.055, freq: 620, volume: 0.22 })
writeWav(path.join(out, 'round.wav'), { durationSec: 0.1, freq: 480, volume: 0.14 })
writeWav(path.join(out, 'reveal.wav'), { durationSec: 0.14, freq: 360, volume: 0.16 })
console.log('Wrote', out)
