import { useEffect, useRef } from 'react'

export function useModalDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogElement = dialogRef.current
    if (dialogElement && !dialogElement.open) dialogElement.showModal()
    return () => {
      if (dialogElement?.open) dialogElement.close()
    }
  }, [])

  return dialogRef
}

