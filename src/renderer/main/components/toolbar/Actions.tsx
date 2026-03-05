import LunaToolbar, { LunaToolbarSeparator } from 'luna-toolbar/react'
import { observer } from 'mobx-react-lite'
import { t } from 'common/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import store from '../../store'
import { useState } from 'react'
import { notify } from 'share/renderer/lib/util'
import PortMappingModal from '../overview/PortMappingModal'
import ProxyConfigModal from '../overview/ProxyConfigModal'

export default observer(function Actions() {
  const [portModalVisible, setPortModalVisible] = useState(false)
  const [proxyModalVisible, setProxyModalVisible] = useState(false)
  const [rootLoading, setRootLoading] = useState(false)

  const { device } = store

  async function root() {
    if (!device || rootLoading) return
    try {
      setRootLoading(true)
      await main.root(device.id)
    } catch {
      notify(t('rootModeErr'), { icon: 'error' })
    }
    setRootLoading(false)
  }

  async function restartAdbServer() {
    await main.restartAdbServer()
    notify(t('adbServerRestarted'), { icon: 'success' })
  }

  return (
    <>
      <LunaToolbar>
        <ToolbarIcon
          icon="terminal"
          title={t('adbCli')}
          onClick={() => main.openAdbCli()}
        />
        <ToolbarIcon
          icon="reset"
          title={t('restartAdbServer')}
          onClick={restartAdbServer}
        />
        <ToolbarIcon
          icon="unlock"
          disabled={!device}
          title={t('rootMode')}
          onClick={root}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="bidirection"
          disabled={!device}
          title={t('portMapping')}
          onClick={() => setPortModalVisible(true)}
        />
        <ToolbarIcon
          icon="browser"
          disabled={!device}
          title={t('httpProxy')}
          onClick={() => setProxyModalVisible(true)}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="remote-controller"
          disabled={!device}
          title={t('remoteController')}
          onClick={() => main.toggleRemote()}
        />
      </LunaToolbar>
      <PortMappingModal
        visible={portModalVisible}
        onClose={() => setPortModalVisible(false)}
      />
      <ProxyConfigModal
        visible={proxyModalVisible}
        onClose={() => setProxyModalVisible(false)}
      />
    </>
  )
})
