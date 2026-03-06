import { observer } from 'mobx-react-lite'
import LunaToolbar, { LunaToolbarSpace } from 'luna-toolbar/react'
import { useState, useEffect } from 'react'
import store from '../../store'
import { t } from 'common/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import Style from './Signing.module.scss'
import className from 'licia/className'
import { ISignatureInfo } from 'common/types'
import { Copyable } from '../common/Copyable'

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
  const [signatureInfo, setSignatureInfo] = useState<ISignatureInfo | null>(
    null,
  )
  const [verifyError, setVerifyError] = useState('')

  const { device } = store

  useEffect(() => {
    if (verifySource === 'installed' && device) {
      main
        .getPackages(device.id)
        .then(setPackages)
        .catch(() => {})
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
      filters: [{ name: 'Keystore', extensions: ['jks', 'keystore', 'p12'] }],
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
        v2Enabled,
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
        selectedPackage,
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
    if (info.issuer) items.push({ label: t('certIssuer'), value: info.issuer })
    if (info.validFrom)
      items.push({ label: t('certValidFrom'), value: info.validFrom })
    if (info.validUntil)
      items.push({ label: t('certValidUntil'), value: info.validUntil })
    if (info.md5) items.push({ label: t('certMd5'), value: info.md5 })
    if (info.sha1) items.push({ label: t('certSha1'), value: info.sha1 })
    if (info.sha256) items.push({ label: t('certSha256'), value: info.sha256 })

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
              <span className={Style.filePath}>{apkPath || '-'}</span>
              <button className={Style.fileBtn} onClick={selectApk}>
                {t('selectApk')}
              </button>
            </div>
            <div className={Style.field}>
              <label>{t('keystoreFile')}</label>
              <span className={Style.filePath}>{keystorePath || '-'}</span>
              <button className={Style.fileBtn} onClick={selectKeystore}>
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
                {signing ? t('signingInProgress') : t('signBtn')}
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
                <span className={Style.filePath}>{verifyApkPath || '-'}</span>
                <button className={Style.fileBtn} onClick={selectVerifyApk}>
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
