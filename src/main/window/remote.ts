import { BrowserWindow } from 'electron'
import * as window from 'share/main/lib/window'

let win: BrowserWindow | null = null

export function showWin() {
  if (win) {
    win.focus()
    return
  }

  win = window.create({
    name: 'remote',
    minWidth: 320,
    minHeight: 500,
    width: 320,
    height: 680,
    resizable: true,
  })

  win.on('close', () => {
    win?.destroy()
    win = null
  })

  window.loadPage(win, { page: 'remote' })
}

export function closeWin() {
  if (win) {
    win.close()
  }
}

export function toggleWin() {
  if (win) {
    win.close()
  } else {
    showWin()
  }
}
