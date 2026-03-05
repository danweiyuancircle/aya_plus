import { t } from 'common/util'
import LunaModal from 'luna-modal/react'
import { observer } from 'mobx-react-lite'
import { createPortal } from 'react-dom'
import Style from './ProxyConfigModal.module.scss'
import LunaToolbar, {
  LunaToolbarButton,
  LunaToolbarInput,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import { useEffect, useState } from 'react'
import isStrBlank from 'licia/isStrBlank'
import store from '../../store'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { IModalProps } from 'share/common/types'
import { notify } from 'share/renderer/lib/util'

export default observer(function ProxyConfigModal(props: IModalProps) {
  const [proxy, setProxy] = useState('')
  const [currentProxy, setCurrentProxy] = useState('')

  useEffect(() => {
    if (props.visible) {
      refresh()
    }
  }, [props.visible])

  async function refresh() {
    if (!store.device) {
      return
    }
    const result = await main.getHttpProxy(store.device.id)
    setCurrentProxy(result)
  }

  return createPortal(
    <LunaModal
      title={t('httpProxy')}
      width={400}
      visible={props.visible}
      onClose={props.onClose}
    >
      <div className={Style.container}>
        <div className={Style.status}>
          <span className={Style.label}>{t('currentProxy')}:</span>
          <span className={Style.value}>
            {currentProxy || t('noProxy')}
          </span>
        </div>
        <LunaToolbar className={Style.toolbar}>
          <LunaToolbarInput
            keyName="proxy"
            className={Style.input}
            value={proxy}
            placeholder="host:port"
            onChange={(val) => setProxy(val)}
          />
          <LunaToolbarButton
            state="hover"
            disabled={isStrBlank(proxy) || !store.device}
            onClick={async () => {
              if (!store.device) {
                return
              }
              try {
                await main.setHttpProxy(store.device.id, proxy)
                notify(t('proxySet'), { icon: 'success' })
                setProxy('')
                refresh()
              } catch {
                notify(t('commonErr'), { icon: 'error' })
              }
            }}
          >
            {t('setProxy')}
          </LunaToolbarButton>
          <LunaToolbarSpace />
          <LunaToolbarButton
            disabled={!store.device || !currentProxy}
            onClick={async () => {
              if (!store.device) {
                return
              }
              try {
                await main.setHttpProxy(store.device.id, '')
                notify(t('proxyCleared'), { icon: 'success' })
                refresh()
              } catch {
                notify(t('commonErr'), { icon: 'error' })
              }
            }}
          >
            {t('clearProxy')}
          </LunaToolbarButton>
          <ToolbarIcon
            icon="refresh"
            title={t('refresh')}
            onClick={refresh}
            disabled={!store.device}
          />
        </LunaToolbar>
      </div>
    </LunaModal>,
    document.body
  )
})
