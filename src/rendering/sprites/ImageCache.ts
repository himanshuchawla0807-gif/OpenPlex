type ImageEntry =
  | { status: 'loading'; promise: Promise<HTMLImageElement> }
  | { status: 'ready'; image: HTMLImageElement }
  | { status: 'error' }

export class ImageCache {
  private readonly entries = new Map<string, ImageEntry>()

  load(source: string): Promise<HTMLImageElement> {
    const cached = this.entries.get(source)
    if (cached?.status === 'ready') return Promise.resolve(cached.image)
    if (cached?.status === 'loading') return cached.promise
    if (cached?.status === 'error') return Promise.reject(new Error(`Unable to load ${source}`))

    const image = new Image()
    image.decoding = 'async'
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => {
        this.entries.set(source, { status: 'ready', image })
        resolve(image)
      }
      image.onerror = () => {
        this.entries.set(source, { status: 'error' })
        reject(new Error(`Unable to load ${source}`))
      }
    })

    this.entries.set(source, { status: 'loading', promise })
    image.src = source
    return promise
  }

  get(source: string): HTMLImageElement | null {
    const entry = this.entries.get(source)
    return entry?.status === 'ready' ? entry.image : null
  }
}
