/**
 * App Storage - Persistent storage for installed apps and VM state
 * Inspired by idroid-web and docker-android-studio
 * 
 * Uses IndexedDB for client-side storage of:
 * - Installed APKs
 * - App data
 * - VM state
 * - User preferences
 */

export interface StoredApp {
  packageName: string
  versionName: string
  label: string
  apkData: ArrayBuffer
  installDate: number
  lastUsed: number
}

export interface VMState {
  isRunning: boolean
  installedApps: string[] // Package names
  lastState: 'stopped' | 'starting' | 'running' | 'error'
}

export class AppStorage {
  private dbName = 'aquifer-db'
  private dbVersion = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('Failed to open IndexedDB')
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains('apps')) {
          const appStore = db.createObjectStore('apps', { keyPath: 'packageName' })
          appStore.createIndex('installDate', 'installDate', { unique: false })
          appStore.createIndex('lastUsed', 'lastUsed', { unique: false })
        }

        if (!db.objectStoreNames.contains('vmState')) {
          db.createObjectStore('vmState', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('apkFiles')) {
          const apkStore = db.createObjectStore('apkFiles', { keyPath: 'fileName' })
          apkStore.createIndex('packageName', 'packageName', { unique: false })
        }
      }
    })
  }

  async saveApp(app: StoredApp): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apps'], 'readwrite')
      const store = transaction.objectStore('apps')
      const request = store.put(app)

      request.onsuccess = () => {
        console.log('App saved to storage:', app.packageName)
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to save app:', request.error)
        reject(request.error)
      }
    })
  }

  async getApp(packageName: string): Promise<StoredApp | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apps'], 'readonly')
      const store = transaction.objectStore('apps')
      const request = store.get(packageName)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async getAllApps(): Promise<StoredApp[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apps'], 'readonly')
      const store = transaction.objectStore('apps')
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async deleteApp(packageName: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apps'], 'readwrite')
      const store = transaction.objectStore('apps')
      const request = store.delete(packageName)

      request.onsuccess = () => {
        console.log('App deleted from storage:', packageName)
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async saveAPKFile(fileName: string, apkData: ArrayBuffer, packageName?: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apkFiles'], 'readwrite')
      const store = transaction.objectStore('apkFiles')
      const request = store.put({
        fileName,
        apkData,
        packageName: packageName || null,
        uploadDate: Date.now(),
      })

      request.onsuccess = () => {
        console.log('APK file saved:', fileName)
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async getAPKFile(fileName: string): Promise<ArrayBuffer | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apkFiles'], 'readonly')
      const store = transaction.objectStore('apkFiles')
      const request = store.get(fileName)

      request.onsuccess = () => {
        resolve(request.result?.apkData || null)
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async saveVMState(state: VMState): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['vmState'], 'readwrite')
      const store = transaction.objectStore('vmState')
      const request = store.put({
        id: 'current',
        ...state,
        timestamp: Date.now(),
      })

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async getVMState(): Promise<VMState | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['vmState'], 'readonly')
      const store = transaction.objectStore('vmState')
      const request = store.get('current')

      request.onsuccess = () => {
        if (request.result) {
          const { id, timestamp, ...state } = request.result
          resolve(state as VMState)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['apps', 'vmState', 'apkFiles'], 'readwrite')
      
      Promise.all([
        new Promise<void>((res, rej) => {
          const req = transaction.objectStore('apps').clear()
          req.onsuccess = () => res()
          req.onerror = () => rej(req.error)
        }),
        new Promise<void>((res, rej) => {
          const req = transaction.objectStore('vmState').clear()
          req.onsuccess = () => res()
          req.onerror = () => rej(req.error)
        }),
        new Promise<void>((res, rej) => {
          const req = transaction.objectStore('apkFiles').clear()
          req.onsuccess = () => res()
          req.onerror = () => rej(req.error)
        }),
      ])
        .then(() => {
          console.log('All storage cleared')
          resolve()
        })
        .catch(reject)
    })
  }

  async getStorageSize(): Promise<number> {
    if (!this.db) await this.init()

    // Estimate storage size (IndexedDB doesn't provide exact size)
    const apps = await this.getAllApps()
    let totalSize = 0

    for (const app of apps) {
      totalSize += app.apkData.byteLength
    }

    return totalSize
  }
}

// Singleton instance
export const appStorage = new AppStorage()

