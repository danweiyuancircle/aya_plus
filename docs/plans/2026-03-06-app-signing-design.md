# App Signing Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new "signing" tab with APK re-signing (using embedded apksigner.jar, V1/V2 scheme selection) and signature info viewing (local APK + device installed apps).

**Architecture:** New signing module in main process wraps `java -jar apksigner.jar` for signing and verification. A new tab component provides two modes: sign mode (form-based) and verify mode (view signature info from local APK or device app). The `apksigner.jar` is bundled in `resources/` like `scrcpy.jar`.

**Tech Stack:** TypeScript, React, Electron IPC, child_process.spawn, apksigner.jar, SCSS modules

---

### Task 1: Add i18n keys for signing tab

**Files:**
- Modify: `src/common/langs/en-US.json`
- Modify: `src/common/langs/zh-CN.json`
- Modify: `src/common/langs/zh-TW.json`
- Modify: `src/common/langs/ar.json`
- Modify: `src/common/langs/ru.json`
- Modify: `src/common/langs/tr.json`
- Modify: `src/common/langs/fr.json`
- Modify: `src/common/langs/pt.json`
- Modify: `src/common/langs/es.json`

**Step 1: Add i18n keys**

Add these keys to `en-US.json` (before the closing `}`):

```json
  "signing": "Signing",
  "signApk": "Sign APK",
  "verifySignature": "Verify Signature",
  "apkFile": "APK File",
  "keystoreFile": "Keystore File",
  "keystorePassword": "Keystore Password",
  "keyAlias": "Key Alias",
  "keyPassword": "Key Password",
  "signingScheme": "Signing Scheme",
  "sign": "Sign",
  "signing...": "Signing...",
  "signSuccess": "APK signed successfully: {{path}}",
  "signFailed": "Signing failed: {{error}}",
  "javaNotFound": "Java not found. Please install Java to use signing features.",
  "selectApk": "Select APK",
  "selectKeystore": "Select Keystore",
  "verifySource": "Source",
  "localApk": "Local APK",
  "installedApp": "Installed App",
  "signatureInfo": "Signature Info",
  "sigSchemeVersion": "Scheme Version",
  "certSubject": "Subject",
  "certIssuer": "Issuer",
  "certValidFrom": "Valid From",
  "certValidUntil": "Valid Until",
  "certMd5": "MD5",
  "certSha1": "SHA-1",
  "certSha256": "SHA-256",
  "noSignatureFound": "No signature found",
  "verifyFailed": "Verification failed: {{error}}",
  "selectPackage": "Select Package"
```

Add equivalent keys to `zh-CN.json`:

```json
  "signing": "签名",
  "signApk": "APK 签名",
  "verifySignature": "查看签名",
  "apkFile": "APK 文件",
  "keystoreFile": "密钥库文件",
  "keystorePassword": "密钥库密码",
  "keyAlias": "密钥别名",
  "keyPassword": "密钥密码",
  "signingScheme": "签名方案",
  "sign": "签名",
  "signing...": "签名中...",
  "signSuccess": "APK 签名成功：{{path}}",
  "signFailed": "签名失败：{{error}}",
  "javaNotFound": "未找到 Java，请安装 Java 以使用签名功能。",
  "selectApk": "选择 APK",
  "selectKeystore": "选择密钥库",
  "verifySource": "来源",
  "localApk": "本地 APK",
  "installedApp": "已安装应用",
  "signatureInfo": "签名信息",
  "sigSchemeVersion": "签名方案版本",
  "certSubject": "主题",
  "certIssuer": "颁发者",
  "certValidFrom": "有效期始",
  "certValidUntil": "有效期至",
  "certMd5": "MD5",
  "certSha1": "SHA-1",
  "certSha256": "SHA-256",
  "noSignatureFound": "未找到签名信息",
  "verifyFailed": "验证失败：{{error}}",
  "selectPackage": "选择应用"
```

For other languages (zh-TW, ar, ru, tr, fr, pt, es), add the same keys using the English values as placeholders (same as `en-US.json`).

**Step 2: Commit**

```bash
git add src/common/langs/*.json
git commit -m "feat: add i18n keys for signing tab"
```

---

### Task 2: Add IPC types for signing

**Files:**
- Modify: `src/common/types.ts:197` (end of file)

**Step 1: Add types**

Add at end of `src/common/types.ts`:

```typescript
export interface ISignatureInfo {
  schemeVersion: string
  subject: string
  issuer: string
  validFrom: string
  validUntil: string
  md5: string
  sha1: string
  sha256: string
}
export type IpcSignApk = (
  apkPath: string,
  keystorePath: string,
  keystorePass: string,
  keyAlias: string,
  keyPass: string,
  outputPath: string,
  v1Enabled: boolean,
  v2Enabled: boolean,
) => Promise<void>
export type IpcVerifyApk = (apkPath: string) => Promise<ISignatureInfo>
export type IpcGetInstalledAppSignature = (
  deviceId: string,
  packageName: string,
) => Promise<ISignatureInfo>
```

**Step 2: Commit**

```bash
git add src/common/types.ts
git commit -m "feat: add IPC types for signing"
```

---

### Task 3: Implement signing module in main process

**Files:**
- Create: `src/main/lib/signing.ts`

**Step 1: Create signing module**

Create `src/main/lib/signing.ts`:

```typescript
import childProcess from 'node:child_process'
import { handleEvent, resolveResources } from 'share/main/lib/util'
import {
  ISignatureInfo,
  IpcSignApk,
  IpcVerifyApk,
  IpcGetInstalledAppSignature,
} from 'common/types'
import { shell } from './adb/base'
import trim from 'licia/trim'

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
      shell: true,
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
  v2Enabled
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

  const { stderr, code } = await spawnJava(args)
  if (code !== 0) {
    throw new Error(trim(stderr) || 'Sign failed')
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
  const args = [
    '-jar',
    jar,
    'verify',
    '--verbose',
    '--print-certs',
    apkPath,
  ]

  const { stdout, stderr, code } = await spawnJava(args)
  if (code !== 0) {
    throw new Error(trim(stderr) || 'Verify failed')
  }

  return parseSignatureInfo(stdout)
}

const getInstalledAppSignature: IpcGetInstalledAppSignature = async function (
  deviceId,
  packageName
) {
  const result = await shell(
    deviceId,
    `dumpsys package ${packageName} | grep -A 20 "Signatures"`
  )

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

  const lines = result.split('\n')
  for (const line of lines) {
    const trimmed = trim(line)
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
  }

  return info
}

export function init() {
  handleEvent('signApk', signApk)
  handleEvent('verifyApk', verifyApk)
  handleEvent('getInstalledAppSignature', getInstalledAppSignature)
}
```

**Step 2: Commit**

```bash
git add src/main/lib/signing.ts
git commit -m "feat: implement signing module"
```

---

### Task 4: Register signing module and expose in preload

**Files:**
- Modify: `src/main/lib/adb.ts:28-34` (imports), `src/main/lib/adb.ts:424-434` (init)
- Modify: `src/preload/main.ts`

**Step 1: Register in adb.ts**

In `src/main/lib/adb.ts`, add import after line 33 (`import * as capture from './adb/capture'`):

```typescript
import * as signing from './signing'
```

In the `init` function, add after line 434 (`capture.init(client)`):

```typescript
  signing.init()
```

**Step 2: Expose in preload**

In `src/preload/main.ts`, add to imports from `common/types`:

```typescript
  IpcGetInstalledAppSignature,
  IpcSignApk,
  IpcVerifyApk,
```

Add to the `Object.assign` block (after `exportCapture`):

```typescript
  signApk: invoke<IpcSignApk>('signApk'),
  verifyApk: invoke<IpcVerifyApk>('verifyApk'),
  getInstalledAppSignature: invoke<IpcGetInstalledAppSignature>('getInstalledAppSignature'),
```

**Step 3: Commit**

```bash
git add src/main/lib/adb.ts src/preload/main.ts
git commit -m "feat: register signing module and expose IPC"
```

---

### Task 5: Create Signing tab component

**Files:**
- Create: `src/renderer/main/components/signing/Signing.tsx`
- Create: `src/renderer/main/components/signing/Signing.module.scss`

**Step 1: Create styles**

Create `src/renderer/main/components/signing/Signing.module.scss`:

```scss
@use '../../../theme' as theme;

.body {
  display: flex;
  flex-direction: column;
  height: calc(100% - 31px);
  padding: 20px;
  overflow-y: auto;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 600px;
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field label {
  min-width: 140px;
  font-size: #{theme.$font-size}px;
  text-align: right;
  flex-shrink: 0;
}

.field input {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-container);
  color: var(--color-text);
  font-size: #{theme.$font-size}px;
  outline: none;
  &:focus {
    border-color: var(--color-primary);
  }
}

.field select {
  flex: 1;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-container);
  color: var(--color-text);
  font-size: #{theme.$font-size}px;
  outline: none;
}

.file-btn {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-container);
  color: var(--color-text);
  cursor: pointer;
  font-size: #{theme.$font-size}px;
  white-space: nowrap;
  &:hover {
    background: var(--color-fill-secondary);
  }
}

.file-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: #{theme.$font-size}px;
  color: var(--color-text-secondary);
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.sign-btn {
  height: 32px;
  padding: 0 24px;
  border: none;
  border-radius: 4px;
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
  font-size: #{theme.$font-size}px;
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.result {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: #{theme.$font-size}px;
}

.success {
  background: var(--color-success-bg, rgba(82, 196, 26, 0.1));
  color: var(--color-success, #52c41a);
}

.error {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.signature-info {
  max-width: 600px;
}

.info-item {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.info-item + .info-item {
  border-top: 1px solid var(--color-border);
}

.info-label {
  font-size: #{theme.$font-size}px;
  color: var(--color-text);
  min-width: 120px;
}

.info-value {
  flex: 1;
  text-align: right;
  font-size: #{theme.$font-size}px;
  color: var(--color-text-secondary);
  word-break: break-all;
  padding-left: 20px;
}

.mode-select {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.source-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.source-btn {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-container);
  color: var(--color-text);
  cursor: pointer;
  font-size: #{theme.$font-size}px;
  &:hover {
    background: var(--color-fill-secondary);
  }
}

.source-btn-active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg, rgba(22, 119, 255, 0.1));
  color: var(--color-primary);
}

.hint {
  font-size: 14px;
  color: var(--color-text-tertiary);
}
```

**Step 2: Create component**

Create `src/renderer/main/components/signing/Signing.tsx`:

```tsx
import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import { useState, useEffect } from 'react'
import store from '../../store'
import { t } from 'common/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import Style from './Signing.module.scss'
import className from 'licia/className'
import { ISignatureInfo } from 'common/types'
import { Copyable } from '../common/Copyable'
import { notify } from 'share/renderer/lib/util'

type Mode = 'sign' | 'verify'
type VerifySource = 'local' | 'installed'

export default observer(function Signing() {
  const [mode, setMode] = useState<Mode>('sign')

  // Sign mode state
  const [apkPath, setApkPath] = useState('')
  const [keystorePath, setKeystorePath] = useState('')
  const [keystorePass, setKeystorePass] = useState('')
  const [keyAlias, setKeyAlias] = useState('')
  const [keyPass, setKeyPass] = useState('')
  const [scheme, setScheme] = useState('v1v2')
  const [signing, setSigning] = useState(false)
  const [signResult, setSignResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // Verify mode state
  const [verifySource, setVerifySource] = useState<VerifySource>('local')
  const [verifyApkPath, setVerifyApkPath] = useState('')
  const [selectedPackage, setSelectedPackage] = useState('')
  const [packages, setPackages] = useState<string[]>([])
  const [signatureInfo, setSignatureInfo] =
    useState<ISignatureInfo | null>(null)
  const [verifyError, setVerifyError] = useState('')

  const { device } = store

  useEffect(() => {
    if (verifySource === 'installed' && device) {
      main.getPackages(device.id).then(setPackages).catch(() => {})
    }
  }, [verifySource, device])

  async function selectApk() {
    const { filePaths } = await main.showOpenDialog({
      filters: [{ name: 'APK', extensions: ['apk'] }],
    })
    if (filePaths.length > 0) {
      setApkPath(filePaths[0])
    }
  }

  async function selectKeystore() {
    const { filePaths } = await main.showOpenDialog({
      filters: [
        { name: 'Keystore', extensions: ['jks', 'keystore', 'p12'] },
      ],
    })
    if (filePaths.length > 0) {
      setKeystorePath(filePaths[0])
    }
  }

  async function selectVerifyApk() {
    const { filePaths } = await main.showOpenDialog({
      filters: [{ name: 'APK', extensions: ['apk'] }],
    })
    if (filePaths.length > 0) {
      setVerifyApkPath(filePaths[0])
      verifyLocalApk(filePaths[0])
    }
  }

  async function handleSign() {
    if (!apkPath || !keystorePath || !keystorePass || !keyAlias || !keyPass)
      return

    const v1Enabled = scheme === 'v1' || scheme === 'v1v2'
    const v2Enabled = scheme === 'v2' || scheme === 'v1v2'

    const { canceled, filePath } = await main.showSaveDialog({
      defaultPath: apkPath.replace('.apk', '_signed.apk'),
      filters: [{ name: 'APK', extensions: ['apk'] }],
    })
    if (canceled || !filePath) return

    setSigning(true)
    setSignResult(null)
    try {
      await main.signApk(
        apkPath,
        keystorePath,
        keystorePass,
        keyAlias,
        keyPass,
        filePath,
        v1Enabled,
        v2Enabled
      )
      setSignResult({
        success: true,
        message: t('signSuccess', { path: filePath }),
      })
    } catch (e: any) {
      setSignResult({
        success: false,
        message: t('signFailed', { error: e.message }),
      })
    } finally {
      setSigning(false)
    }
  }

  async function verifyLocalApk(path: string) {
    setSignatureInfo(null)
    setVerifyError('')
    try {
      const info = await main.verifyApk(path)
      setSignatureInfo(info)
    } catch (e: any) {
      setVerifyError(t('verifyFailed', { error: e.message }))
    }
  }

  async function verifyInstalledApp() {
    if (!device || !selectedPackage) return
    setSignatureInfo(null)
    setVerifyError('')
    try {
      const info = await main.getInstalledAppSignature(
        device.id,
        selectedPackage
      )
      setSignatureInfo(info)
    } catch (e: any) {
      setVerifyError(t('verifyFailed', { error: e.message }))
    }
  }

  function renderSignatureInfo(info: ISignatureInfo) {
    const items: Array<{ label: string; value: string }> = []
    if (info.schemeVersion)
      items.push({ label: t('sigSchemeVersion'), value: info.schemeVersion })
    if (info.subject)
      items.push({ label: t('certSubject'), value: info.subject })
    if (info.issuer)
      items.push({ label: t('certIssuer'), value: info.issuer })
    if (info.validFrom)
      items.push({ label: t('certValidFrom'), value: info.validFrom })
    if (info.validUntil)
      items.push({ label: t('certValidUntil'), value: info.validUntil })
    if (info.md5) items.push({ label: t('certMd5'), value: info.md5 })
    if (info.sha1) items.push({ label: t('certSha1'), value: info.sha1 })
    if (info.sha256)
      items.push({ label: t('certSha256'), value: info.sha256 })

    if (items.length === 0) {
      return <div className={Style.hint}>{t('noSignatureFound')}</div>
    }

    return (
      <div className={Style.signatureInfo}>
        {items.map((item) => (
          <div key={item.label} className={Style.infoItem}>
            <span className={Style.infoLabel}>{item.label}</span>
            <Copyable className={Style.infoValue}>{item.value}</Copyable>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon
          icon="manage"
          title={t('signApk')}
          state={mode === 'sign' ? 'active' : ''}
          onClick={() => setMode('sign')}
        />
        <ToolbarIcon
          icon="eye"
          title={t('verifySignature')}
          state={mode === 'verify' ? 'active' : ''}
          onClick={() => setMode('verify')}
        />
        <LunaToolbarSpace />
      </LunaToolbar>
      <div className={Style.body}>
        {mode === 'sign' && (
          <div className={Style.form}>
            <div className={Style.field}>
              <label>{t('apkFile')}</label>
              <span className={Style.filePath}>
                {apkPath || '-'}
              </span>
              <button className={Style.fileBtn} onClick={selectApk}>
                {t('selectApk')}
              </button>
            </div>
            <div className={Style.field}>
              <label>{t('keystoreFile')}</label>
              <span className={Style.filePath}>
                {keystorePath || '-'}
              </span>
              <button
                className={Style.fileBtn}
                onClick={selectKeystore}
              >
                {t('selectKeystore')}
              </button>
            </div>
            <div className={Style.field}>
              <label>{t('keystorePassword')}</label>
              <input
                type="password"
                value={keystorePass}
                onChange={(e) => setKeystorePass(e.target.value)}
              />
            </div>
            <div className={Style.field}>
              <label>{t('keyAlias')}</label>
              <input
                type="text"
                value={keyAlias}
                onChange={(e) => setKeyAlias(e.target.value)}
              />
            </div>
            <div className={Style.field}>
              <label>{t('keyPassword')}</label>
              <input
                type="password"
                value={keyPass}
                onChange={(e) => setKeyPass(e.target.value)}
              />
            </div>
            <div className={Style.field}>
              <label>{t('signingScheme')}</label>
              <select
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
              >
                <option value="v1">V1</option>
                <option value="v2">V2</option>
                <option value="v1v2">V1 + V2</option>
              </select>
            </div>
            <div className={Style.actions}>
              <button
                className={Style.signBtn}
                disabled={
                  signing ||
                  !apkPath ||
                  !keystorePath ||
                  !keystorePass ||
                  !keyAlias ||
                  !keyPass
                }
                onClick={handleSign}
              >
                {signing ? t('signing...') : t('sign')}
              </button>
            </div>
            {signResult && (
              <div
                className={className(Style.result, {
                  [Style.success]: signResult.success,
                  [Style.error]: !signResult.success,
                })}
              >
                {signResult.message}
              </div>
            )}
          </div>
        )}
        {mode === 'verify' && (
          <div className={Style.form}>
            <div className={Style.sourceToggle}>
              <button
                className={className(Style.sourceBtn, {
                  [Style.sourceBtnActive]: verifySource === 'local',
                })}
                onClick={() => {
                  setVerifySource('local')
                  setSignatureInfo(null)
                  setVerifyError('')
                }}
              >
                {t('localApk')}
              </button>
              <button
                className={className(Style.sourceBtn, {
                  [Style.sourceBtnActive]: verifySource === 'installed',
                })}
                onClick={() => {
                  setVerifySource('installed')
                  setSignatureInfo(null)
                  setVerifyError('')
                }}
              >
                {t('installedApp')}
              </button>
            </div>
            {verifySource === 'local' && (
              <div className={Style.field}>
                <label>{t('apkFile')}</label>
                <span className={Style.filePath}>
                  {verifyApkPath || '-'}
                </span>
                <button
                  className={Style.fileBtn}
                  onClick={selectVerifyApk}
                >
                  {t('selectApk')}
                </button>
              </div>
            )}
            {verifySource === 'installed' && (
              <div className={Style.field}>
                <label>{t('selectPackage')}</label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                >
                  <option value="">--</option>
                  {packages.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
                <button
                  className={Style.fileBtn}
                  disabled={!selectedPackage || !device}
                  onClick={verifyInstalledApp}
                >
                  {t('verifySignature')}
                </button>
              </div>
            )}
            {verifyError && (
              <div className={className(Style.result, Style.error)}>
                {verifyError}
              </div>
            )}
            {signatureInfo && renderSignatureInfo(signatureInfo)}
          </div>
        )}
      </div>
    </div>
  )
})
```

**Step 3: Commit**

```bash
git add src/renderer/main/components/signing/
git commit -m "feat: create Signing tab component"
```

---

### Task 6: Register signing tab in tab system

**Files:**
- Modify: `src/renderer/main/components/toolbar/Tabs.tsx:10-22`
- Modify: `src/renderer/main/App.tsx:1-82`

**Step 1: Add tab ID**

In `src/renderer/main/components/toolbar/Tabs.tsx`, add `'signing'` to the tab array (after `'capture'`, before `'webview'`):

```typescript
    [
      'overview',
      'file',
      'application',
      'process',
      'performance',
      'shell',
      'layout',
      'screenshot',
      'logcat',
      'capture',
      'signing',
      'webview',
    ],
```

**Step 2: Add Panel in App.tsx**

In `src/renderer/main/App.tsx`, add import:

```typescript
import Signing from './components/signing/Signing'
```

Add Panel after the Capture panel (after line 82):

```tsx
            <Panel panel="signing">
              <Signing />
            </Panel>
```

**Step 3: Commit**

```bash
git add src/renderer/main/components/toolbar/Tabs.tsx src/renderer/main/App.tsx
git commit -m "feat: register signing tab in tab system"
```

---

### Task 7: Bundle apksigner.jar and verify

**Files:**
- Add: `resources/apksigner.jar`

**Step 1: Copy apksigner.jar from Android SDK**

The `apksigner.jar` is located in Android SDK Build Tools. Copy it to resources:

```bash
# Find apksigner.jar from Android SDK (path varies by system)
# macOS typical path:
cp ~/Library/Android/sdk/build-tools/*/lib/apksigner.jar resources/apksigner.jar
```

If the user doesn't have Android SDK installed, they can download it from the Android SDK Build Tools package.

**Step 2: Commit**

```bash
git add resources/apksigner.jar
git commit -m "feat: bundle apksigner.jar"
```

---

### Task 8: Lint, format, and final verification

**Step 1: Format**

```bash
npx prettier --write "src/common/types.ts" "src/main/lib/signing.ts" "src/main/lib/adb.ts" "src/preload/main.ts" "src/renderer/main/components/signing/Signing.tsx" "src/renderer/main/components/signing/Signing.module.scss" "src/renderer/main/components/toolbar/Tabs.tsx" "src/renderer/main/App.tsx" "src/common/langs/*.json"
```

**Step 2: Lint**

```bash
npx eslint "src/common/types.ts" "src/main/lib/signing.ts" "src/main/lib/adb.ts" "src/preload/main.ts" "src/renderer/main/components/signing/Signing.tsx" "src/renderer/main/components/toolbar/Tabs.tsx" "src/renderer/main/App.tsx"
```

**Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "chore: lint and format signing feature"
```
