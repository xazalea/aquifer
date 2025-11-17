/**
 * DEX Parser - Parses Android DEX (Dalvik Executable) files
 * 
 * DEX file format:
 * - Header (magic, version, checksum, signature, file_size, header_size)
 * - String IDs
 * - Type IDs
 * - Proto IDs
 * - Field IDs
 * - Method IDs
 * - Class Definitions
 * - Data section
 */

export interface DEXHeader {
  magic: string
  version: string
  checksum: number
  signature: Uint8Array
  fileSize: number
  headerSize: number
  endianTag: number
  linkSize: number
  linkOff: number
  mapOff: number
  stringIdsSize: number
  stringIdsOff: number
  typeIdsSize: number
  typeIdsOff: number
  protoIdsSize: number
  protoIdsOff: number
  fieldIdsSize: number
  fieldIdsOff: number
  methodIdsSize: number
  methodIdsOff: number
  classDefsSize: number
  classDefsOff: number
  dataSize: number
  dataOff: number
}

export interface DEXClass {
  classIdx: number
  accessFlags: number
  superclassIdx: number
  interfacesOff: number
  sourceFileIdx: number
  annotationsOff: number
  classDataOff: number
  staticValuesOff: number
  name: string
  methods: DEXMethod[]
  fields: DEXField[]
}

export interface DEXMethod {
  name: string
  descriptor: string
  accessFlags: number
  codeOff: number
  code?: DEXCode
}

export interface DEXField {
  name: string
  type: string
  accessFlags: number
}

export interface DEXCode {
  registersSize: number
  insSize: number
  outsSize: number
  triesSize: number
  debugInfoOff: number
  insnsSize: number
  insns: Uint16Array
}

export class DEXParser {
  private data: ArrayBuffer
  private view: DataView
  private header: DEXHeader
  private strings: string[] = []
  private types: string[] = []
  private classes: Map<string, DEXClass> = new Map()

  constructor(dexData: ArrayBuffer) {
    this.data = dexData
    this.view = new DataView(dexData)
    this.header = this.parseHeader()
  }

  private parseHeader(): DEXHeader {
    // Read magic number (8 bytes)
    const magicBytes = new Uint8Array(this.data, 0, 8)
    const magic = String.fromCharCode(...magicBytes.slice(0, 3)) + 
                  String.fromCharCode(...magicBytes.slice(4, 7))
    const version = String.fromCharCode(...magicBytes.slice(4, 7))

    if (magic !== 'dex') {
      throw new Error('Invalid DEX file: magic number mismatch')
    }

    return {
      magic,
      version,
      checksum: this.view.getUint32(8, true),
      signature: new Uint8Array(this.data, 12, 20),
      fileSize: this.view.getUint32(32, true),
      headerSize: this.view.getUint32(36, true),
      endianTag: this.view.getUint32(40, true),
      linkSize: this.view.getUint32(44, true),
      linkOff: this.view.getUint32(48, true),
      mapOff: this.view.getUint32(52, true),
      stringIdsSize: this.view.getUint32(56, true),
      stringIdsOff: this.view.getUint32(60, true),
      typeIdsSize: this.view.getUint32(64, true),
      typeIdsOff: this.view.getUint32(68, true),
      protoIdsSize: this.view.getUint32(72, true),
      protoIdsOff: this.view.getUint32(76, true),
      fieldIdsSize: this.view.getUint32(80, true),
      fieldIdsOff: this.view.getUint32(84, true),
      methodIdsSize: this.view.getUint32(88, true),
      methodIdsOff: this.view.getUint32(92, true),
      classDefsSize: this.view.getUint32(96, true),
      classDefsOff: this.view.getUint32(100, true),
      dataSize: this.view.getUint32(104, true),
      dataOff: this.view.getUint32(108, true),
    }
  }

  parse(): void {
    this.parseStrings()
    this.parseTypes()
    this.parseClasses()
  }

  private parseStrings(): void {
    const { stringIdsSize, stringIdsOff } = this.header
    this.strings = []

    for (let i = 0; i < stringIdsSize; i++) {
      try {
        const offset = stringIdsOff + (i * 4)
        const stringDataOff = this.view.getUint32(offset, true)
        if (stringDataOff >= this.data.byteLength) continue
        
        const stringData = this.readULEB128(stringDataOff)
        const length = stringData.value
        const start = stringDataOff + stringData.bytesRead
        
        if (start + length > this.data.byteLength) continue
        
        // Read UTF-8 string
        const bytes = new Uint8Array(this.data, start, length)
        const str = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
        this.strings.push(str)
      } catch (e) {
        // Skip invalid strings
        this.strings.push('')
      }
    }
  }

  private parseTypes(): void {
    const { typeIdsSize, typeIdsOff } = this.header
    this.types = []

    for (let i = 0; i < typeIdsSize; i++) {
      const offset = typeIdsOff + (i * 4)
      const descriptorIdx = this.view.getUint32(offset, true)
      this.types.push(this.strings[descriptorIdx])
    }
  }

  private parseClasses(): void {
    const { classDefsSize, classDefsOff } = this.header

    for (let i = 0; i < classDefsSize; i++) {
      const offset = classDefsOff + (i * 32) // Each class_def_item is 32 bytes
      
      const classIdx = this.view.getUint32(offset, true)
      const accessFlags = this.view.getUint32(offset + 4, true)
      const superclassIdx = this.view.getUint32(offset + 8, true)
      const interfacesOff = this.view.getUint32(offset + 12, true)
      const sourceFileIdx = this.view.getUint32(offset + 16, true)
      const annotationsOff = this.view.getUint32(offset + 20, true)
      const classDataOff = this.view.getUint32(offset + 24, true)
      const staticValuesOff = this.view.getUint32(offset + 28, true)

      const className = this.types[classIdx]
      if (!className) continue

      const dexClass: DEXClass = {
        classIdx,
        accessFlags,
        superclassIdx,
        interfacesOff,
        sourceFileIdx,
        annotationsOff,
        classDataOff,
        staticValuesOff,
        name: className,
        methods: [],
        fields: [],
      }

      if (classDataOff !== 0) {
        this.parseClassData(dexClass, classDataOff)
      }

      this.classes.set(className, dexClass)
    }
  }

  private parseClassData(klass: DEXClass, offset: number): void {
    const staticFieldsSize = this.readULEB128(offset).value
    const instanceFieldsSize = this.readULEB128(offset + 1).value
    const directMethodsSize = this.readULEB128(offset + 2).value
    const virtualMethodsSize = this.readULEB128(offset + 3).value

    // Parse methods (simplified)
    let currentOffset = offset + 4
    for (let i = 0; i < directMethodsSize + virtualMethodsSize; i++) {
      const methodIdx = this.readULEB128(currentOffset).value
      const accessFlags = this.readULEB128(currentOffset + 1).value
      const codeOff = this.readULEB128(currentOffset + 2).value
      
      // Get method info from method_ids
      const methodInfo = this.getMethodInfo(methodIdx)
      if (methodInfo) {
        klass.methods.push({
          ...methodInfo,
          accessFlags,
          codeOff,
        })
      }
    }
  }

  private getMethodInfo(methodIdx: number): { name: string; descriptor: string } | null {
    // Simplified - would need to parse method_ids section
    return { name: 'method', descriptor: '()V' }
  }

  private readULEB128(offset: number): { value: number; bytesRead: number } {
    let value = 0
    let shift = 0
    let bytesRead = 0

    // Optimized: check bounds before reading
    const maxOffset = this.data.byteLength
    if (offset >= maxOffset) {
      return { value: 0, bytesRead: 0 }
    }

    while (offset + bytesRead < maxOffset) {
      const byte = this.view.getUint8(offset + bytesRead)
      bytesRead++
      value |= (byte & 0x7f) << shift
      if ((byte & 0x80) === 0) break
      shift += 7
      
      // Safety: prevent infinite loops
      if (bytesRead > 5) break
    }

    return { value, bytesRead }
  }

  getClasses(): Map<string, DEXClass> {
    return this.classes
  }

  getStrings(): string[] {
    return this.strings
  }

  getTypes(): string[] {
    return this.types
  }

  static parseDEX(dexData: ArrayBuffer): DEXParser {
    const parser = new DEXParser(dexData)
    parser.parse()
    return parser
  }
}

