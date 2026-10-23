export const OBJECT_OUTLINE = '#263f43'

export function shadeColor(hex: string, amount: number): string {
  const value = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return hex
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16)
    return Math.max(0, Math.min(255, Math.round(channel + amount)))
  })
  return `rgb(${channels.join(', ')})`
}
