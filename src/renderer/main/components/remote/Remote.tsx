import { observer } from 'mobx-react-lite'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { t } from 'common/util'
import Style from './Remote.module.scss'
import store from '../../store'
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

export default observer(function Remote() {
  const [floating, setFloating] = useState(false)
  const [scale, setScale] = useState(0.75)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const dragRef = useRef<{
    dragging: boolean
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const onMouseMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current
    if (!d || !d.dragging) return
    setPosition({
      x: d.originX + (e.clientX - d.startX),
      y: d.originY + (e.clientY - d.startY),
    })
  }, [])

  const onMouseUp = useCallback(() => {
    if (dragRef.current) {
      dragRef.current.dragging = false
    }
  }, [])

  useEffect(() => {
    if (!floating) return
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [floating, onMouseMove, onMouseUp])

  function inputKey(keyCode: number) {
    return () => {
      if (!store.device) return
      main.inputKey(store.device.id, keyCode)
    }
  }

  function onHeaderMouseDown(e: React.MouseEvent) {
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    }
  }

  const disabled = !store.device

  const remoteBody = (
    <>
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
              disabled
                ? undefined
                : inputKey(AndroidKeyCode.ArrowRight)
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
              disabled
                ? undefined
                : inputKey(AndroidKeyCode.ArrowLeft)
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
          title={t('menu')}
          onClick={inputKey(TV_KEY.Menu)}
        >
          {t('menu')}
        </button>
      </div>
    </>
  )

  function zoomIn() {
    setScale((s) => Math.min(s + 0.1, 1.2))
  }

  function zoomOut() {
    setScale((s) => Math.max(s - 0.1, 0.4))
  }

  if (floating) {
    return (
      <>
        <div className={Style.container} />
        {createPortal(
          <div
            className={Style.floatingWrapper}
            style={{ left: position.x, top: position.y }}
          >
            <div
              className={Style.floatingHeader}
              onMouseDown={onHeaderMouseDown}
            >
              <span>{t('tvRemote')}</span>
              <div className={Style.headerActions}>
                <button
                  className={Style.floatBtn}
                  title={t('zoomOut')}
                  onClick={zoomOut}
                >
                  <span className="icon-zoom-out" />
                </button>
                <button
                  className={Style.floatBtn}
                  title={t('zoomIn')}
                  onClick={zoomIn}
                >
                  <span className="icon-zoom-in" />
                </button>
                <button
                  className={Style.floatBtn}
                  title={t('close')}
                  onClick={() => setFloating(false)}
                >
                  <span className="icon-collapse" />
                </button>
              </div>
            </div>
            <div className={Style.remote} style={{ zoom: scale }}>
              {remoteBody}
            </div>
          </div>,
          document.body
        )}
      </>
    )
  }

  return (
    <div className={Style.container}>
      <div className={Style.remote}>
        <button
          className={Style.floatBtn}
          title={t('float')}
          onClick={() => setFloating(true)}
        >
          <span className="icon-pin" />
        </button>
        {remoteBody}
      </div>
    </div>
  )
})
