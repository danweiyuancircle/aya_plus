import Toolbar from './components/toolbar/Toolbar'
import StatusBar from './components/statusbar/StatusBar'
import Logcat from './components/logcat/Logcat'
import Shell from './components/shell/Shell'
import Overview from './components/overview/Overview'
import Screenshot from './components/screenshot/Screenshot'
import Process from './components/process/Process'
import Performance from './components/performance/Performance'
import Webview from './components/webview/Webview'
import Application from './components/application/Application'
import File from './components/file/File'
import Layout from './components/layout/Layout'
import Capture from './components/capture/Capture'
import Style from './App.module.scss'
import { useState, PropsWithChildren, FC } from 'react'
import store from './store'
import { observer } from 'mobx-react-lite'
import { useCheckUpdate, UpdateInfo } from 'share/renderer/lib/hooks'
import Modal from 'luna-modal'
import { t } from 'common/util'

async function showUpdateDialog(info: UpdateInfo) {
  const content = `${t('updateNewVersion')}: v${info.newVersion}\n${t('updateHint')}`

  const result = await Modal.confirm(content, {
    title: t('updateAvailable'),
    confirmText: t('updateDownload'),
    cancelText: t('cancel'),
  })
  if (result) {
    main.openExternal(info.downloadUrl)
  }
}

export default observer(function App() {
  useCheckUpdate((info: UpdateInfo) => {
    showUpdateDialog(info)
  })

  return (
    <>
      <Toolbar />
      {store.ready && (
        <div className={Style.workspace}>
          <StatusBar />
          <div
            className={Style.panels}
            key={store.device ? store.device.id : ''}
          >
            <Panel panel="overview">
              <Overview />
            </Panel>
            <Panel panel="application">
              <Application />
            </Panel>
            <Panel panel="screenshot">
              <Screenshot />
            </Panel>
            <Panel panel="logcat">
              <Logcat />
            </Panel>
            <Panel panel="shell">
              <Shell />
            </Panel>
            <Panel panel="process">
              <Process />
            </Panel>
            <Panel panel="performance">
              <Performance />
            </Panel>
            <Panel panel="webview">
              <Webview />
            </Panel>
            <Panel panel="file">
              <File />
            </Panel>
            <Panel panel="layout">
              <Layout />
            </Panel>
            <Panel panel="capture">
              <Capture />
            </Panel>
          </div>
        </div>
      )}
    </>
  )
})

interface IPanelProps {
  panel: string
}

const Panel: FC<PropsWithChildren<IPanelProps>> = observer(function Panel(
  props
) {
  const [used, setUsed] = useState(false)

  let visible = false

  if (store.panel === props.panel) {
    if (!used) {
      setUsed(true)
    }
    visible = true
  }

  const style: React.CSSProperties = {}
  if (!visible) {
    style.opacity = 0
    style.pointerEvents = 'none'
  }

  return (
    <div className={Style.panel} style={style}>
      {used ? props.children : null}
    </div>
  )
})
