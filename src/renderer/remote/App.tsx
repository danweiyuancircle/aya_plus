import { useEffect, useState } from 'react'
import { t } from 'common/util'
import Style from './App.module.scss'
import { AndroidKeyCode } from '@yume-chan/scrcpy'

const TV_KEY = {
  Digit0: 7,
  Digit1: 8,
  Digit2: 9,
  Digit3: 10,
  Digit4: 11,
  Digit5: 12,
  Digit6: 13,
  Digit7: 14,
  Digit8: 15,
  Digit9: 16,
  Menu: 82,
  Mute: 164,
  ChannelUp: 166,
  ChannelDown: 167,
  Guide: 172,
  Settings: 176,
  TvInput: 178,
} as const

export default function App() {
  const [deviceId, setDeviceId] = useState('')

  useEffect(() => {
    async function init() {
      const store = await main.getMainStore('device')
      if (store && store.id) {
        setDeviceId(store.id)
      }
    }
    init()

    const off = main.on('changeMainStore', (name: string, val: any) => {
      if (name === 'device') {
        setDeviceId(val ? val.id : '')
      }
    })

    return () => {
      off()
    }
  }, [])

  const disabled = !deviceId

  function inputKey(keyCode: number) {
    return () => {
      if (!deviceId) return
      main.inputKey(deviceId, keyCode)
    }
  }

  return (
    <div className={Style.container}>
      <div className={Style.remote}>
        <div className={Style.topRow}>
          <button
            className={Style.btn}
            disabled={disabled}
            title={t('power')}
            onClick={inputKey(AndroidKeyCode.Power)}
          >
            <span className="icon-power" />
          </button>
          <button
            className={Style.btn}
            disabled={disabled}
            title={t('tvInput')}
            onClick={inputKey(TV_KEY.TvInput)}
          >
            INPUT
          </button>
          <button
            className={Style.btn}
            disabled={disabled}
            title={t('guide')}
            onClick={inputKey(TV_KEY.Guide)}
          >
            EPG
          </button>
          <button
            className={Style.btn}
            disabled={disabled}
            title={t('settings')}
            onClick={inputKey(TV_KEY.Settings)}
          >
            <span className="icon-setting" />
          </button>
        </div>

        <div className={Style.numpad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              className={Style.numBtn}
              disabled={disabled}
              onClick={inputKey(TV_KEY[`Digit${n}` as keyof typeof TV_KEY])}
            >
              {n}
            </button>
          ))}
          <div />
          <button
            className={Style.numBtn}
            disabled={disabled}
            onClick={inputKey(TV_KEY.Digit0)}
          >
            0
          </button>
          <div />
        </div>

        <div className={Style.middleSection}>
          <div className={Style.sideCol}>
            <button
              className={Style.sideBtn}
              disabled={disabled}
              title={t('volumeUp')}
              onClick={inputKey(AndroidKeyCode.VolumeUp)}
            >
              <span className="icon-volume" />
            </button>
            <button
              className={Style.sideBtn}
              disabled={disabled}
              title={t('volumeDown')}
              onClick={inputKey(AndroidKeyCode.VolumeDown)}
            >
              <span className="icon-volume-down" />
            </button>
          </div>

          <div className={Style.directionPad}>
            <div
              className={Style.ok}
              onClick={
                disabled
                  ? undefined
                  : inputKey(AndroidKeyCode.AndroidDPadCenter)
              }
            >
              OK
            </div>
            <div
              className={Style.up}
              onClick={
                disabled ? undefined : inputKey(AndroidKeyCode.ArrowUp)
              }
            />
            <div
              className={Style.right}
              onClick={
                disabled ? undefined : inputKey(AndroidKeyCode.ArrowRight)
              }
            />
            <div
              className={Style.down}
              onClick={
                disabled ? undefined : inputKey(AndroidKeyCode.ArrowDown)
              }
            />
            <div
              className={Style.left}
              onClick={
                disabled ? undefined : inputKey(AndroidKeyCode.ArrowLeft)
              }
            />
          </div>

          <div className={Style.sideCol}>
            <button
              className={Style.sideBtn}
              disabled={disabled}
              title={t('channelUp')}
              onClick={inputKey(TV_KEY.ChannelUp)}
            >
              CH+
            </button>
            <button
              className={Style.sideBtn}
              disabled={disabled}
              title={t('channelDown')}
              onClick={inputKey(TV_KEY.ChannelDown)}
            >
              CH-
            </button>
          </div>
        </div>

        <div className={Style.muteRow}>
          <button
            className={Style.btn}
            disabled={disabled}
            title={t('mute')}
            onClick={inputKey(TV_KEY.Mute)}
          >
            {t('mute')}
          </button>
        </div>

        <div className={Style.navRow}>
          <button
            className={Style.btn}
            disabled={disabled}
            title={t('home')}
            onClick={inputKey(AndroidKeyCode.AndroidHome)}
          >
            <span className="icon-circle" />
          </button>
          <button
            className={Style.btn}
            disabled={disabled}
            title={t('back')}
            onClick={inputKey(AndroidKeyCode.AndroidBack)}
          >
            <span className="icon-back" />
          </button>
          <button
            className={Style.btn}
            disabled={disabled}
            title={t('appSwitch')}
            onClick={inputKey(AndroidKeyCode.AndroidAppSwitch)}
          >
            <span className="icon-square" />
          </button>
          <button
            className={Style.btn}
            disabled={disabled}
            title={t('menu')}
            onClick={inputKey(TV_KEY.Menu)}
          >
            {t('menu')}
          </button>
        </div>
      </div>
    </div>
  )
}
