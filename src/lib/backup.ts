import { exportFile } from '../db/sqlite'
import { dayKey } from './format'

/** Hand the whole database over as a file: the share sheet where there is one, a download otherwise. */
export async function shareBackup() {
  const file = new File([exportFile()], `woolly-${dayKey()}.sqlite`, { type: 'application/vnd.sqlite3' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Woolly backup' }).catch(() => {})
  } else {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = file.name
    a.click()
    URL.revokeObjectURL(a.href)
  }
}
