import childProcess from 'node:child_process'
import { handleEvent, resolveResources } from 'share/main/lib/util'
import {
  ISignatureInfo,
  IpcSignApk,
  IpcVerifyApk,
  IpcGetInstalledAppSignature,
} from 'common/types'
import { shell } from './adb/base'
import * as file from './adb/file'
import trim from 'licia/trim'
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'

function getApksignerJar() {
  return resolveResources('apksigner.jar')
}

function spawnJava(args: string[]): Promise<{
  stdout: string
  stderr: string
  code: number | null
}> {
  return new Promise((resolve, reject) => {
    const cp = childProcess.spawn('java', args, {
      env: { ...process.env },
    })

    let stdout = ''
    let stderr = ''

    cp.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    cp.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    cp.on('error', () => {
      reject(new Error('Java not found'))
    })

    cp.on('close', (code) => {
      resolve({ stdout, stderr, code })
    })
  })
}

const signApk: IpcSignApk = async function (
  apkPath,
  keystorePath,
  keystorePass,
  keyAlias,
  keyPass,
  outputPath,
  v1Enabled,
  v2Enabled,
) {
  const jar = getApksignerJar()
  const args = [
    '-jar',
    jar,
    'sign',
    '--ks',
    keystorePath,
    '--ks-pass',
    `pass:${keystorePass}`,
    '--ks-key-alias',
    keyAlias,
    '--key-pass',
    `pass:${keyPass}`,
    `--v1-signing-enabled=${v1Enabled}`,
    `--v2-signing-enabled=${v2Enabled}`,
    '--out',
    outputPath,
    apkPath,
  ]

  const { stdout, stderr, code } = await spawnJava(args)
  console.log('[signApk] exit code:', code)
  console.log('[signApk] stdout:', stdout)
  console.log('[signApk] stderr:', stderr)
  if (code !== 0) {
    const errMsg = trim(stderr) || trim(stdout) || 'Sign failed'
    throw new Error(errMsg)
  }
}

function parseSignatureInfo(output: string): ISignatureInfo {
  const info: ISignatureInfo = {
    schemeVersion: '',
    subject: '',
    issuer: '',
    validFrom: '',
    validUntil: '',
    md5: '',
    sha1: '',
    sha256: '',
  }

  const lines = output.split('\n')
  for (const line of lines) {
    const trimmed = trim(line)
    if (trimmed.startsWith('Verified using v1 scheme')) {
      if (trimmed.includes('true')) {
        info.schemeVersion += info.schemeVersion ? ', V1' : 'V1'
      }
    }
    if (trimmed.startsWith('Verified using v2 scheme')) {
      if (trimmed.includes('true')) {
        info.schemeVersion += info.schemeVersion ? ', V2' : 'V2'
      }
    }
    if (trimmed.startsWith('Verified using v3 scheme')) {
      if (trimmed.includes('true')) {
        info.schemeVersion += info.schemeVersion ? ', V3' : 'V3'
      }
    }
    if (trimmed.startsWith('Subject:')) {
      info.subject = trimmed.substring(9).trim()
    }
    if (trimmed.startsWith('Issuer:')) {
      info.issuer = trimmed.substring(7).trim()
    }
    if (trimmed.startsWith('Valid from:')) {
      const parts = trimmed.substring(11).split(' until: ')
      info.validFrom = parts[0].trim()
      if (parts[1]) {
        info.validUntil = parts[1].trim()
      }
    }
    if (trimmed.startsWith('MD5:') || trimmed.includes('MD5 digest:')) {
      info.md5 = trimmed.split(':').slice(-1)[0].trim()
    }
    if (trimmed.startsWith('SHA-1:') || trimmed.includes('SHA-1 digest:')) {
      info.sha1 = trimmed.split(':').slice(-1)[0].trim()
    }
    if (trimmed.startsWith('SHA-256:') || trimmed.includes('SHA-256 digest:')) {
      info.sha256 = trimmed.split(':').slice(-1)[0].trim()
    }
  }

  return info
}

const verifyApk: IpcVerifyApk = async function (apkPath) {
  const jar = getApksignerJar()
  const args = ['-jar', jar, 'verify', '--verbose', '--print-certs', apkPath]

  const { stdout, stderr, code } = await spawnJava(args)
  if (code !== 0) {
    throw new Error(trim(stderr) || trim(stdout) || 'Verify failed')
  }

  return parseSignatureInfo(stdout)
}

const getInstalledAppSignature: IpcGetInstalledAppSignature = async function (
  deviceId,
  packageName,
) {
  // Get APK path from device
  const pmResult = await shell(deviceId, `pm path ${packageName}`)
  const apkLine = trim(pmResult).split('\n')[0]
  if (!apkLine || !apkLine.startsWith('package:')) {
    throw new Error('APK path not found')
  }
  const remoteApkPath = apkLine.substring(8).trim()

  // Pull APK to local temp
  const tmpApk = path.join(os.tmpdir(), `aya_sig_${Date.now()}.apk`)
  try {
    const buf = await file.pullFileData(deviceId, remoteApkPath)
    await fs.writeFile(tmpApk, buf)

    // Verify locally using apksigner
    const jar = getApksignerJar()
    const args = ['-jar', jar, 'verify', '--verbose', '--print-certs', tmpApk]

    const { stdout, stderr, code } = await spawnJava(args)
    if (code !== 0) {
      throw new Error(trim(stderr) || trim(stdout) || 'Verify failed')
    }

    return parseSignatureInfo(stdout)
  } finally {
    // Clean up temp file
    fs.remove(tmpApk).catch(() => {})
  }
}

export function init() {
  handleEvent('signApk', signApk)
  handleEvent('verifyApk', verifyApk)
  handleEvent('getInstalledAppSignature', getInstalledAppSignature)
}
