import { observer } from 'mobx-react-lite'
import { useState, useEffect, useRef } from 'react'
import { t } from 'common/util'
import Style from './StatusBar.module.scss'
import store from '../../store'

interface IDeviceInfo {
  model: string
  ip: string
  androidVersion: string
}

export default observer(function StatusBar() {
  const [activity, setActivity] = useState({ packageName: '', activityName: '' })
  const [deviceInfo, setDeviceInfo] = useState<IDeviceInfo | null>(null)
  const [proxy, setProxy] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const device = store.device

  useEffect(() => {
    setDeviceInfo(null)
    setActivity({ packageName: '', activityName: '' })
    setProxy('')

    if (!device) return

    main.getOverview(device.id).then((overview: any) => {
      setDeviceInfo({
        model: overview.model || '',
        ip: overview.ip || '',
        androidVersion: device.androidVersion || '',
      })
    })

    main.getHttpProxy(device.id).then((result: string) => {
      setProxy(result || '')
    })
  }, [device])

  useEffect(() => {
    if (!device) return

    async function fetchActivity() {
      try {
        const result = await main.getTopActivity(device!.id)
        setActivity(result)
      } catch {
        // ignore
      }
    }

    async function fetchProxy() {
      try {
        const result = await main.getHttpProxy(device!.id)
        setProxy(result || '')
      } catch {
        // ignore
      }
    }

    fetchActivity()
    timerRef.current = setInterval(() => {
      fetchActivity()
      fetchProxy()
    }, 3000)

    return () => {
      clearInterval(timerRef.current)
    }
  }, [device])

  async function handleClearData() {
    if (!device || !activity.packageName) return
    try {
      await main.clearPackage(device.id, activity.packageName)
    } catch {
      // ignore
    }
  }

  async function handleRestart() {
    if (!device || !activity.packageName) return
    try {
      await main.stopPackage(device.id, activity.packageName)
      await main.startPackage(device.id, activity.packageName)
    } catch {
      // ignore
    }
  }

  if (!device) return null

  const pkg = activity.packageName
  const activityText = pkg
    ? activity.activityName
      ? `${pkg}/${activity.activityName}`
      : pkg
    : '-'

  return (
    <div className={Style.container}>
      <div className={Style.left}>
        <span className={Style.item} title={activityText}>
          <span className="icon-android" />
          <span className={Style.text}>{activityText}</span>
        </span>
        {pkg && (
          <span className={Style.actions}>
            <button
              className={Style.actionBtn}
              title={t('clearData')}
              onClick={handleClearData}
            >
              <span className="icon-delete" />
            </button>
            <button
              className={Style.actionBtn}
              title={t('restart')}
              onClick={handleRestart}
            >
              <span className="icon-refresh" />
            </button>
          </span>
        )}
      </div>
      {deviceInfo && (
        <div className={Style.right}>
          {proxy && (
            <span className={Style.proxy} title={`${t('httpProxy')}: ${proxy}`}>
              <span className="icon-browser" />
              {t('httpProxy')}: {proxy}
            </span>
          )}
          {deviceInfo.model && (
            <span className={Style.item}>
              <span className="icon-phone" />
              {deviceInfo.model}
            </span>
          )}
          {deviceInfo.ip && (
            <span className={Style.item}>
              <span className="icon-wifi" />
              {deviceInfo.ip}
            </span>
          )}
          {deviceInfo.androidVersion && (
            <span className={Style.item}>
              {t('androidVersion')} {deviceInfo.androidVersion}
            </span>
          )}
        </div>
      )}
    </div>
  )
})
