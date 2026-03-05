import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarSelect,
  LunaToolbarSeparator,
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import LunaLogcat from 'luna-logcat/react'
import Logcat from 'luna-logcat'
import map from 'licia/map'
import rpad from 'licia/rpad'
import dateFormat from 'licia/dateFormat'
import toNum from 'licia/toNum'
import trim from 'licia/trim'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import store from '../../store'
import copy from 'licia/copy'
import download from 'licia/download'
import toStr from 'licia/toStr'
import { t } from 'common/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import contextMenu from 'share/renderer/lib/contextMenu'

const HISTORY_MAX = 10

function getHistory(key: string): string[] {
  try {
    const raw = localStorage.getItem(`logcat_history_${key}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function addHistory(key: string, value: string) {
  if (!value || !trim(value)) return
  const list = getHistory(key).filter((v) => v !== value)
  list.unshift(value)
  if (list.length > HISTORY_MAX) list.length = HISTORY_MAX
  localStorage.setItem(`logcat_history_${key}`, JSON.stringify(list))
}

export default observer(function Logcat() {
  const [view, setView] = useState<'compact' | 'standard'>('standard')
  const [softWrap, setSoftWrap] = useState(false)
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState<{
    priority?: number
    package?: string
    tag?: string
  }>({})
  const [keyword, setKeyword] = useState('')
  const logcatRef = useRef<Logcat>(null)
  const entriesRef = useRef<any[]>([])
  const logcatIdRef = useRef('')
  const keywordRef = useRef('')
  const refilterIdRef = useRef(0)

  const { device } = store

  useEffect(() => {
    function onLogcatEntry(id, entry) {
      if (logcatIdRef.current !== id) {
        return
      }
      if (logcatRef.current) {
        entriesRef.current.push(entry)
        const kw = keywordRef.current
        if (!kw || matchKeyword(entry, kw)) {
          logcatRef.current.append(entry)
        }
      }
    }
    const offLogcatEntry = main.on('logcatEntry', onLogcatEntry)
    if (device) {
      main.openLogcat(device.id).then((id) => {
        logcatIdRef.current = id
      })
    }

    return () => {
      offLogcatEntry()
      if (logcatIdRef.current) {
        main.closeLogcat(logcatIdRef.current)
      }
    }
  }, [])

  if (store.panel !== 'logcat') {
    if (!paused && logcatIdRef.current) {
      main.pauseLogcat(logcatIdRef.current)
    }
  } else {
    if (!paused && logcatIdRef.current) {
      main.resumeLogcat(logcatIdRef.current)
    }
  }

  function save() {
    const data = map(entriesRef.current, (entry) => {
      return trim(
        `${dateFormat(entry.date, 'mm-dd HH:MM:ss.l')} ${rpad(
          entry.pid,
          5,
          ' '
        )} ${rpad(entry.tid, 5, ' ')} ${toLetter(entry.priority)} ${
          entry.tag
        }: ${entry.message}`
      )
    }).join('\n')
    const name = `${store.device ? store.device.name : 'logcat'}.${dateFormat(
      'yyyymmddHH'
    )}.txt`

    download(data, name, 'text/plain')
  }

  function refilter(kw: string) {
    const logcat = logcatRef.current
    if (!logcat) return
    logcat.clear()

    const id = ++refilterIdRef.current
    const entries = entriesRef.current
    const BATCH = 200
    let idx = 0

    function next() {
      if (refilterIdRef.current !== id) return
      const end = Math.min(idx + BATCH, entries.length)
      for (; idx < end; idx++) {
        if (!kw || matchKeyword(entries[idx], kw)) {
          logcat.append(entries[idx])
        }
      }
      if (idx < entries.length) {
        requestAnimationFrame(next)
      }
    }

    requestAnimationFrame(next)
  }

  function clear() {
    if (logcatRef.current) {
      logcatRef.current.clear()
    }
    entriesRef.current = []
  }

  const onContextMenu = (e: PointerEvent, entry: any) => {
    e.preventDefault()
    const logcat = logcatRef.current!
    const template: any[] = [
      {
        label: t('copy'),
        click: () => {
          if (logcat.hasSelection()) {
            copy(logcat.getSelection())
          } else if (entry) {
            copy(entry.message)
          }
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('clear'),
        click: clear,
      },
    ]

    contextMenu(e, template)
  }

  function handleFilterChange(key: string, val: string) {
    switch (key) {
      case 'view':
        setView(val as 'compact' | 'standard')
        break
    }
  }

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar
        className="panel-toolbar"
        onChange={handleFilterChange}
      >
        <LunaToolbarSelect
          keyName="view"
          disabled={!device}
          value={view}
          options={{
            [t('standardView')]: 'standard',
            [t('compactView')]: 'compact',
          }}
        />
        <LunaToolbarSeparator />
        <PrioritySelect
          disabled={!device}
          value={toStr(filter.priority || 2)}
          onChange={(val) => {
            setFilter({
              ...filter,
              priority: toNum(val),
            })
          }}
        />
        <HistoryInput
          keyName="package"
          placeholder={t('package')}
          value={filter.package || ''}
          historyKey="package"
          onChange={(val) => setFilter({ ...filter, package: val })}
          onSelect={(val) => setFilter({ ...filter, package: val })}
        />
        <HistoryInput
          keyName="tag"
          placeholder={t('tag')}
          value={filter.tag || ''}
          historyKey="tag"
          onChange={(val) => setFilter({ ...filter, tag: val })}
          onSelect={(val) => setFilter({ ...filter, tag: val })}
        />
        <HistoryInput
          keyName="keyword"
          placeholder={t('keyword')}
          value={keyword}
          historyKey="keyword"
          onChange={(val) => {
            setKeyword(val)
            keywordRef.current = val
            refilter(val)
          }}
          onSelect={(val) => {
            setKeyword(val)
            keywordRef.current = val
            refilter(val)
          }}
        />
        <LunaToolbarSpace />
        <ToolbarIcon
          icon="save"
          title={t('save')}
          onClick={save}
          disabled={!device}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="soft-wrap"
          state={softWrap ? 'hover' : ''}
          title={t('softWrap')}
          onClick={() => setSoftWrap(!softWrap)}
        />
        <ToolbarIcon
          icon="scroll-end"
          title={t('scrollToEnd')}
          onClick={() => logcatRef.current?.scrollToEnd()}
          disabled={!device}
        />
        <ToolbarIcon
          icon="reset"
          title={t('restart')}
          onClick={() => {
            if (logcatIdRef.current) {
              main.closeLogcat(logcatIdRef.current)
              clear()
            }
            if (device) {
              main.openLogcat(device.id).then((id) => {
                logcatIdRef.current = id
              })
            }
          }}
          disabled={!device}
        />
        <ToolbarIcon
          icon={paused ? 'play' : 'pause'}
          title={t(paused ? 'resume' : 'pause')}
          onClick={() => {
            if (paused) {
              main.resumeLogcat(logcatIdRef.current)
            } else {
              main.pauseLogcat(logcatIdRef.current)
            }
            setPaused(!paused)
          }}
          disabled={!device}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="delete"
          title={t('clear')}
          onClick={clear}
          disabled={!device}
        />
      </LunaToolbar>
      <LunaLogcat
        className="panel-body"
        maxNum={10000}
        filter={filter}
        wrapLongLines={softWrap}
        onContextMenu={onContextMenu}
        view={view}
        onCreate={(logcat) => (logcatRef.current = logcat)}
      />
    </div>
  )
})

function HistoryInput({
  keyName,
  placeholder,
  value,
  historyKey,
  onChange,
  onSelect,
}: {
  keyName: string
  placeholder: string
  value: string
  historyKey: string
  onChange: (val: string) => void
  onSelect: (val: string) => void
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const allItems = getHistory(historyKey)
  const filtered = value
    ? allItems.filter((h) => h.toLowerCase().includes(value.toLowerCase()))
    : allItems
  const items = showDropdown ? filtered : []

  function open() {
    setShowDropdown(true)
    setActiveIndex(-1)
  }

  function close() {
    setShowDropdown(false)
    setActiveIndex(-1)
  }

  function selectItem(item: string) {
    onSelect(item)
    addHistory(historyKey, item)
    close()
  }

  function handleChange(val: string) {
    onChange(val)
    setShowDropdown(true)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showDropdown && items.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % items.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
        return
      }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault()
        selectItem(items[activeIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
    }
    if (e.key === 'Enter' && value) {
      addHistory(historyKey, value)
      close()
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (
      dropdownRef.current &&
      e.relatedTarget &&
      dropdownRef.current.contains(e.relatedTarget as Node)
    ) {
      return
    }
    close()
    if (value) {
      addHistory(historyKey, value)
    }
  }

  const rect = inputRef.current?.getBoundingClientRect()

  return (
    <div className="luna-toolbar-item luna-toolbar-item-input">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={open}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      {showDropdown &&
        items.length > 0 &&
        rect &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: rect.bottom + 2,
              left: rect.left,
              width: rect.width,
              zIndex: 10000,
              background: 'var(--color-bg-container)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              maxHeight: 200,
              overflowY: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {items.map((item, i) => (
              <div
                key={item}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectItem(item)
                }}
                style={{
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  background:
                    i === activeIndex
                      ? 'var(--color-fill-secondary)'
                      : 'transparent',
                  color: 'var(--color-text)',
                }}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                {item}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}

const priorityColors: Record<string, string> = {
  '2': 'inherit',
  '3': '#52c41a',
  '4': '#1677ff',
  '5': '#faad14',
  '6': '#ff4d4f',
}

const priorityColorsDark: Record<string, string> = {
  '2': 'inherit',
  '3': '#49aa19',
  '4': '#1668dc',
  '5': '#d89614',
  '6': '#dc4446',
}

const priorityLabels: Record<string, string> = {
  '2': 'VERBOSE',
  '3': 'DEBUG',
  '4': 'INFO',
  '5': 'WARNING',
  '6': 'ERROR',
}

const PrioritySelect = observer(function PrioritySelect({
  disabled,
  value,
  onChange,
}: {
  disabled: boolean
  value: string
  onChange: (val: string) => void
}) {
  const isDark = store.settings.theme === 'dark'
  const colors = isDark ? priorityColorsDark : priorityColors

  return (
    <div
      className="luna-toolbar-item luna-toolbar-item-select"
      style={disabled ? { pointerEvents: 'none', opacity: 0.6 } : undefined}
    >
      <select
        value={value}
        style={{ color: colors[value] }}
        onChange={(e) => onChange(e.target.value)}
      >
        {Object.entries(priorityLabels).map(([val, label]) => (
          <option key={val} value={val} style={{ color: colors[val] }}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
})

function toLetter(priority: number) {
  return ['?', '?', 'V', 'D', 'I', 'W', 'E'][priority]
}

function matchKeyword(entry: any, keyword: string) {
  const kw = keyword.toLowerCase()
  return (
    (entry.message && entry.message.toLowerCase().indexOf(kw) > -1) ||
    (entry.tag && entry.tag.toLowerCase().indexOf(kw) > -1)
  )
}
