import { useContext } from 'react'

import { SfxContext, type SfxContextValue } from './context'

export function useSfx(): SfxContextValue {
  const v = useContext(SfxContext)
  if (!v) throw new Error('useSfx must be used within SfxProvider')
  return v
}
