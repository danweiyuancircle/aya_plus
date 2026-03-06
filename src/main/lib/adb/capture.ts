import Emitter from 'licia/Emitter'
import types from 'licia/types'
import uniqId from 'licia/uniqId'
import { Client } from '@devicefarmer/adbkit'
import { handleEvent } from 'share/main/lib/util'
import * as window from 'share/main/lib/window'
import {
  IpcStartCapture,
  IpcStopCapture,
  IpcExportCapture,
} from 'common/types'
import fs from 'fs-extra'

let client: Client

class Capture extends Emitter {
  private stream: any
  private buf: Buffer[] = []
  private packetCount = 0
  private headerSkipped = false

  constructor(stream: any) {
    super()
    this.stream = stream
  }

  init() {
    const { stream } = this

    stream.on('data', (data: Buffer) => {
      if (!this.headerSkipped) {
        // tcpdump -w - outputs pcap global header (24 bytes) first
        this.headerSkipped = true
        const remaining = data.slice(24)
        if (remaining.length > 0) {
          this.buf.push(remaining)
          this.packetCount++
          this.emitStats()
        }
        return
      }

      this.buf.push(data)
      this.packetCount++
      this.emitStats()
    })

    stream.on('end', () => {
      this.emit('end')
    })
  }

  private emitStats() {
    this.emit('data', {
      packetCount: this.packetCount,
      size: this.getTotalSize(),
    })
  }

  private getTotalSize() {
    let size = 0
    for (const b of this.buf) {
      size += b.length
    }
    return size
  }

  async export(filePath: string) {
    // pcap global header: magic 0xa1b2c3d4, version 2.4, snaplen 65535, network 1 (ethernet)
    const header = Buffer.from([
      0xd4, 0xc3, 0xb2, 0xa1, 0x02, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
    ])
    await fs.writeFile(filePath, Buffer.concat([header, ...this.buf]))
  }

  stop() {
    this.stream.destroy()
  }
}

const captures: types.PlainObj<Capture> = {}

const startCapture: IpcStartCapture = async function (deviceId, filter) {
  const device = await client.getDevice(deviceId)
  let cmd = 'tcpdump -U -w - -s 0'
  if (filter) {
    cmd += ` ${filter}`
  }
  const stream = await device.shell(cmd)
  const capture = new Capture(stream)
  capture.init()

  const captureId = uniqId('capture')
  capture.on('data', (stats) => {
    window.sendTo('main', 'captureData', captureId, stats)
  })
  capture.on('end', () => {
    window.sendTo('main', 'captureEnd', captureId)
  })
  captures[captureId] = capture

  return captureId
}

const stopCapture: IpcStopCapture = async function (captureId) {
  if (captures[captureId]) {
    captures[captureId].stop()
    delete captures[captureId]
  }
}

const exportCapture: IpcExportCapture = async function (captureId, filePath) {
  if (captures[captureId]) {
    await captures[captureId].export(filePath)
    captures[captureId].stop()
    delete captures[captureId]
  }
}

export function init(c: Client) {
  client = c

  handleEvent('startCapture', startCapture)
  handleEvent('stopCapture', stopCapture)
  handleEvent('exportCapture', exportCapture)
}
