# App Permissions & Status Bar Info Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add permissions to PackageInfoModal and an info button in the status bar to view current foreground app details.

**Architecture:** New IPC endpoint `getPackagePermissions` fetches permissions via `dumpsys package` shell command. PackageInfoModal gains a permissions list section. StatusBar gets an info button that fetches package info + permissions for the foreground app and opens the enhanced modal.

**Tech Stack:** TypeScript, React, MobX, Electron IPC, ADB shell commands, SCSS modules

---

### Task 1: Add IPC type for getPackagePermissions

**Files:**
- Modify: `src/common/types.ts:197`

**Step 1: Add the IPC type**

Add after line 197 (end of file) in `src/common/types.ts`:

```typescript
export type IpcGetPackagePermissions = (
  deviceId: string,
  pkg: string
) => Promise<string[]>
```

**Step 2: Commit**

```bash
git add src/common/types.ts
git commit -m "feat: add IpcGetPackagePermissions type"
```

---

### Task 2: Implement getPackagePermissions in main process

**Files:**
- Modify: `src/main/lib/adb/package.ts`

**Step 1: Add import for the new type**

In `src/main/lib/adb/package.ts`, add `IpcGetPackagePermissions` to the imports from `common/types` (line 8-19):

```typescript
import {
  IpcClearPackage,
  IpcDisablePackage,
  IpcEnablePackage,
  IpcGetPackagePermissions,
  IpcGetPackages,
  IpcGetTopActivity,
  IpcGetTopPackage,
  IpcInstallPackage,
  IpcStartPackage,
  IpcStopPackage,
  IpcUninstallPackage,
} from 'common/types'
```

**Step 2: Add the getPackagePermissions function**

Add before the `init` function (before line 155):

```typescript
const getPackagePermissions: IpcGetPackagePermissions = async function (
  deviceId,
  pkg
) {
  const result = await shell(
    deviceId,
    `dumpsys package ${pkg} | grep "android.permission"`
  )
  const lines = result.split('\n')
  const permissions: string[] = []
  for (let i = 0, len = lines.length; i < len; i++) {
    const line = trim(lines[i])
    if (line) {
      // Remove trailing colon and "granted=..." suffix if present
      const perm = line.split(':')[0].trim()
      if (perm && !contain(permissions, perm)) {
        permissions.push(perm)
      }
    }
  }
  return permissions
}
```

**Step 3: Register the handler in init**

Add in the `init` function body (after line 167 `handleEvent('enablePackage', enablePackage)`):

```typescript
  handleEvent('getPackagePermissions', getPackagePermissions)
```

**Step 4: Commit**

```bash
git add src/main/lib/adb/package.ts
git commit -m "feat: implement getPackagePermissions via dumpsys"
```

---

### Task 3: Expose getPackagePermissions in preload

**Files:**
- Modify: `src/preload/main.ts`

**Step 1: Add import**

Add `IpcGetPackagePermissions` to the imports from `common/types` (line 1-56):

```typescript
  IpcGetPackagePermissions,
```

**Step 2: Add invoke**

Add after line 108 (`enablePackage` invoke):

```typescript
  getPackagePermissions: invoke<IpcGetPackagePermissions>('getPackagePermissions'),
```

**Step 3: Commit**

```bash
git add src/preload/main.ts
git commit -m "feat: expose getPackagePermissions in preload"
```

---

### Task 4: Add permissions section to PackageInfoModal

**Files:**
- Modify: `src/renderer/main/components/application/PackageInfoModal.tsx`
- Modify: `src/renderer/main/components/application/PackageInfoModal.module.scss`

**Step 1: Update PackageInfoModal props and component**

Update the interface and component in `PackageInfoModal.tsx`:

```typescript
interface IProps extends IModalProps {
  packageInfo: IPackageInfo
  permissions?: string[]
}
```

Add permissions section after the signature item (before the closing `</LunaModal>`):

```tsx
      {item(t('permissions'), '')}
      {props.permissions && props.permissions.length > 0 ? (
        <div className={Style.permissions}>
          {props.permissions.map((perm) => (
            <Copyable key={perm} className={Style.permissionItem}>
              {perm}
            </Copyable>
          ))}
        </div>
      ) : (
        <div className={Style.permissions}>-</div>
      )}
```

Replace the permissions item line — instead of using `item()` helper (which expects a value on the right), use a standalone label:

```tsx
      <div className={Style.permissionsTitle}>{t('permissions')}</div>
      {props.permissions && props.permissions.length > 0 ? (
        <div className={Style.permissions}>
          {props.permissions.map((perm) => (
            <Copyable key={perm} className={Style.permissionItem}>
              {perm}
            </Copyable>
          ))}
        </div>
      ) : (
        <div className={Style.permissions}>-</div>
      )}
```

**Step 2: Add styles**

Add to `PackageInfoModal.module.scss`:

```scss
.permissions-title {
  padding: #{theme.$padding-x-s}px 0;
  border-top: 1px solid var(--color-border);
  font-weight: 500;
}

.permissions {
  max-height: 200px;
  overflow-y: auto;
  padding: #{theme.$padding-x-s}px 0;
}

.permission-item {
  display: block;
  padding: 2px 0;
  font-size: 12px;
  opacity: 0.8;
  word-break: break-all;
}
```

**Step 3: Update Application.tsx to pass permissions**

In `src/renderer/main/components/application/Application.tsx`, add state for permissions and fetch them when showing info. Update the `showInfo` function and the `PackageInfoModal` usage.

Add state:
```typescript
const [permissions, setPermissions] = useState<string[]>([])
```

Update `showInfo`:
```typescript
async function showInfo(packageName: string) {
  const packageInfo = find(
    packageInfos,
    (info) => info.packageName === packageName
  )
  if (packageInfo) {
    setPackageInfo(packageInfo)
    setPackageInfoModalVisible(true)
    try {
      const perms = await main.getPackagePermissions(device!.id, packageName)
      setPermissions(perms)
    } catch {
      setPermissions([])
    }
  }
}
```

Update modal close to clear permissions:
```tsx
<PackageInfoModal
  packageInfo={packageInfo}
  permissions={permissions}
  visible={packageInfoModalVisible}
  onClose={() => {
    setPackageInfoModalVisible(false)
    setPermissions([])
  }}
/>
```

**Step 4: Commit**

```bash
git add src/renderer/main/components/application/PackageInfoModal.tsx src/renderer/main/components/application/PackageInfoModal.module.scss src/renderer/main/components/application/Application.tsx
git commit -m "feat: add permissions section to PackageInfoModal"
```

---

### Task 5: Add info button to StatusBar

**Files:**
- Modify: `src/renderer/main/components/statusbar/StatusBar.tsx`

**Step 1: Add imports and state**

Add imports at top of `StatusBar.tsx`:

```typescript
import { useState } from 'react'  // already imported, just add to existing
import PackageInfoModal from '../application/PackageInfoModal'
import { IPackageInfo } from 'common/types'
```

Add state inside the component:

```typescript
const [packageInfo, setPackageInfo] = useState<IPackageInfo | null>(null)
const [permissions, setPermissions] = useState<string[]>([])
const [infoModalVisible, setInfoModalVisible] = useState(false)
```

**Step 2: Add handler function**

```typescript
async function handleShowInfo() {
  if (!device || !activity.packageName) return
  try {
    const [infos, perms] = await Promise.all([
      main.getPackageInfos(device.id, [activity.packageName]),
      main.getPackagePermissions(device.id, activity.packageName),
    ])
    if (infos.length > 0) {
      setPackageInfo(infos[0])
      setPermissions(perms)
      setInfoModalVisible(true)
    }
  } catch {
    // ignore
  }
}
```

**Step 3: Add info button in JSX**

Add a new button inside the `{pkg && (...)}` block, after the restart button (line 120-123):

```tsx
<button
  className={Style.actionBtn}
  title={t('packageInfo')}
  onClick={handleShowInfo}
>
  <span className="icon-info" />
</button>
```

**Step 4: Add modal at end of component return**

Wrap the return in a fragment and add the modal:

```tsx
return (
  <>
    <div className={Style.container}>
      {/* ... existing content ... */}
    </div>
    {packageInfo && (
      <PackageInfoModal
        packageInfo={packageInfo}
        permissions={permissions}
        visible={infoModalVisible}
        onClose={() => {
          setInfoModalVisible(false)
          setPermissions([])
        }}
      />
    )}
  </>
)
```

**Step 5: Commit**

```bash
git add src/renderer/main/components/statusbar/StatusBar.tsx
git commit -m "feat: add info button to status bar for foreground app"
```

---

### Task 6: Verify and final commit

**Step 1: Run lint**

```bash
npm run lint
```

**Step 2: Run format**

```bash
npm run format
```

**Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "chore: lint and format"
```
