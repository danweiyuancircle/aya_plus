import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import { useEffect, useRef, useState } from 'react'
import store from '../../store'
import { t } from 'common/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import dateFormat from 'licia/dateFormat'
import Style from './Capture.module.scss'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default observer(function Capture() {
  const [capturing, setCapturing] = useState(false)
  const [filter, setFilter] = useState('')
  const [packetCount, setPacketCount] = useState(0)
  const [totalSize, setTotalSize] = useState(0)
  const [error, setError] = useState('')
  const captureIdRef = useRef('')

  const { device } = store

  useEffect(() => {
    const offData = main.on(
      'captureData',
      (id: string, stats: { packetCount: number; size: number }) => {
        if (captureIdRef.current !== id) return
        setPacketCount(stats.packetCount)
        setTotalSize(stats.size)
      }
    )

    const offEnd = main.on('captureEnd', (id: string) => {
      if (captureIdRef.current !== id) return
      setCapturing(false)
    })

    return () => {
      offData()
      offEnd()
      if (captureIdRef.current) {
        main.stopCapture(captureIdRef.current)
      }
    }
  }, [])

  async function startCapture() {
    if (!device) return
    setError('')
    setPacketCount(0)
    setTotalSize(0)
    try {
      const id = await main.startCapture(
        device.id,
        filter || undefined
      )
      captureIdRef.current = id
      setCapturing(true)
    } catch (e: any) {
      setError(t('tcpdumpNotFound'))
    }
  }

  async function stopCapture() {
    if (captureIdRef.current) {
      await main.stopCapture(captureIdRef.current)
      setCapturing(false)
    }
  }

  async function exportPcap() {
    if (!captureIdRef.current) return
    const name = `${device ? device.name : 'capture'}_${dateFormat(
      'yyyymmdd_HHMMss'
    )}.pcap`
    const { canceled, filePath } = await main.showSaveDialog({
      defaultPath: name,
      filters: [{ name: 'PCAP', extensions: ['pcap'] }],
    })
    if (canceled || !filePath) return
    await main.exportCapture(captureIdRef.current, filePath)
    captureIdRef.current = ''
    setPacketCount(0)
    setTotalSize(0)
  }

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <LunaToolbarInput
          keyName="filter"
          value={filter}
          placeholder={t('captureFilter')}
          disabled={capturing}
          onChange={(val) => setFilter(val)}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon={capturing ? 'pause' : 'play'}
          title={t(capturing ? 'stopCapture' : 'startCapture')}
          onClick={capturing ? stopCapture : startCapture}
          disabled={!device}
        />
        <ToolbarIcon
          icon="save"
          title={t('exportPcap')}
          onClick={exportPcap}
          disabled={!captureIdRef.current || capturing}
        />
        <LunaToolbarSpace />
      </LunaToolbar>
      <div className={Style.body}>
        <div className={Style.stats}>
          {capturing && (
            <div className={Style.indicator}>
              <span className={Style.dot} />
              {t('capturing')}
            </div>
          )}
          {(packetCount > 0 || capturing) && (
            <>
              <div className={Style.stat}>
                {t('packetCount', { count: packetCount })}
              </div>
              <div className={Style.stat}>
                {t('captureSize', { size: formatSize(totalSize) })}
              </div>
            </>
          )}
          {error && <div className={Style.error}>{error}</div>}
          {!capturing && packetCount === 0 && !error && (
            <div className={Style.hint}>
              {t('startCapture')}
            </div>
          )}
          {!capturing && packetCount > 0 && (
            <div className={Style.hint}>
              {t('captureStopped')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
