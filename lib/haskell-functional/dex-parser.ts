/**
 * Haskell-Inspired Functional DEX Parser
 * 
 * Type-safe, immutable, functional bytecode parsing for Android DEX files.
 * Inspired by Haskell's purity and type safety, implemented in TypeScript.
 * 
 * Features:
 * - Immutable data structures
 * - Functional transformations
 * - Type-safe operations
 * - Comprehensive error handling
 * - No side effects
 */

// Type definitions (Haskell-style ADTs)
export type Either<L, R> = Left<L> | Right<R>;

export class Left<L> {
  readonly _tag = 'Left' as const;
  constructor(public readonly value: L) {}
  isLeft(): this is Left<L> { return true; }
  isRight(): this is Right<never> { return false; }
  map<B>(_f: (r: never) => B): Either<L, B> { return this; }
  flatMap<B>(_f: (r: never) => Either<L, B>): Either<L, B> { return this; }
}

export class Right<R> {
  readonly _tag = 'Right' as const;
  constructor(public readonly value: R) {}
  isLeft(): this is Left<never> { return false; }
  isRight(): this is Right<R> { return true; }
  map<B>(f: (r: R) => B): Either<never, B> { return new Right(f(this.value)); }
  flatMap<B>(f: (r: R) => Either<never, B>): Either<never, B> { return f(this.value); }
}

export const left = <L>(value: L): Left<L> => new Left(value);
export const right = <R>(value: R): Right<R> => new Right(value);

// Immutable DEX Header
export interface DexHeader {
  readonly magic: Uint8Array;
  readonly checksum: number;
  readonly signature: Uint8Array;
  readonly fileSize: number;
  readonly headerSize: number;
  readonly endianTag: number;
  readonly linkSize: number;
  readonly linkOff: number;
  readonly mapOff: number;
  readonly stringIdsSize: number;
  readonly stringIdsOff: number;
  readonly typeIdsSize: number;
  readonly typeIdsOff: number;
  readonly protoIdsSize: number;
  readonly protoIdsOff: number;
  readonly fieldIdsSize: number;
  readonly fieldIdsOff: number;
  readonly methodIdsSize: number;
  readonly methodIdsOff: number;
  readonly classDefsSize: number;
  readonly classDefsOff: number;
  readonly dataSize: number;
  readonly dataOff: number;
}

// Immutable String ID
export interface StringId {
  readonly stringDataOff: number;
}

// Immutable Type ID
export interface TypeId {
  readonly descriptorIdx: number;
}

// Immutable Proto ID
export interface ProtoId {
  readonly shortyIdx: number;
  readonly returnTypeIdx: number;
  readonly parametersOff: number;
}

// Immutable Field ID
export interface FieldId {
  readonly classIdx: number;
  readonly typeIdx: number;
  readonly nameIdx: number;
}

// Immutable Method ID
export interface MethodId {
  readonly classIdx: number;
  readonly protoIdx: number;
  readonly nameIdx: number;
}

// Immutable Class Definition
export interface ClassDef {
  readonly classIdx: number;
  readonly accessFlags: number;
  readonly superclassIdx: number;
  readonly interfacesOff: number;
  readonly sourceFileIdx: number;
  readonly annotationsOff: number;
  readonly classDataOff: number;
  readonly staticValuesOff: number;
}

// Immutable DEX File
export interface DexFile {
  readonly header: DexHeader;
  readonly stringIds: readonly StringId[];
  readonly typeIds: readonly TypeId[];
  readonly protoIds: readonly ProtoId[];
  readonly fieldIds: readonly FieldId[];
  readonly methodIds: readonly MethodId[];
  readonly classDefs: readonly ClassDef[];
  readonly strings: readonly string[];
}

// Functional parser - pure functions only
export class FunctionalDexParser {
  /**
   * Parse DEX header - pure function
   */
  static parseHeader(data: Uint8Array, offset: number = 0): Either<string, DexHeader> {
    if (data.length < offset + 112) {
      return left('Insufficient data for DEX header');
    }

    const view = new DataView(data.buffer, data.byteOffset + offset);
    
    // Check magic
    const magic = data.slice(offset, offset + 8);
    const magicStr = String.fromCharCode(...Array.from(magic.slice(0, 4)));
    if (magicStr !== 'dex\n' && magicStr !== 'dex\n035') {
      return left(`Invalid DEX magic: ${magicStr}`);
    }

    return right({
      magic: new Uint8Array(magic),
      checksum: view.getUint32(8, false),
      signature: new Uint8Array(data.slice(12, 32)),
      fileSize: view.getUint32(32, false),
      headerSize: view.getUint32(36, false),
      endianTag: view.getUint32(40, false),
      linkSize: view.getUint32(44, false),
      linkOff: view.getUint32(48, false),
      mapOff: view.getUint32(52, false),
      stringIdsSize: view.getUint32(56, false),
      stringIdsOff: view.getUint32(60, false),
      typeIdsSize: view.getUint32(64, false),
      typeIdsOff: view.getUint32(68, false),
      protoIdsSize: view.getUint32(72, false),
      protoIdsOff: view.getUint32(76, false),
      fieldIdsSize: view.getUint32(80, false),
      fieldIdsOff: view.getUint32(84, false),
      methodIdsSize: view.getUint32(88, false),
      methodIdsOff: view.getUint32(92, false),
      classDefsSize: view.getUint32(96, false),
      classDefsOff: view.getUint32(100, false),
      dataSize: view.getUint32(104, false),
      dataOff: view.getUint32(108, false),
    });
  }

  /**
   * Parse string IDs - pure function
   */
  static parseStringIds(data: Uint8Array, offset: number, count: number): Either<string, readonly StringId[]> {
    if (data.length < offset + count * 4) {
      return left('Insufficient data for string IDs');
    }

    const stringIds: StringId[] = [];
    const view = new DataView(data.buffer, data.byteOffset + offset);

    for (let i = 0; i < count; i++) {
      stringIds.push({
        stringDataOff: view.getUint32(i * 4, false),
      });
    }

    return right(stringIds);
  }

  /**
   * Parse strings - pure function
   */
  static parseStrings(data: Uint8Array, stringIds: readonly StringId[]): Either<string, readonly string[]> {
    const strings: string[] = [];

    for (const stringId of stringIds) {
      const offset = stringId.stringDataOff;
      if (offset >= data.length) {
        return left(`String offset ${offset} out of bounds`);
      }

      // Read ULEB128 length
      let length = 0;
      let shift = 0;
      let pos = offset;
      
      while (pos < data.length) {
        const byte = data[pos++];
        length |= (byte & 0x7F) << shift;
        if ((byte & 0x80) === 0) break;
        shift += 7;
      }

      // Read UTF-8 string
      const stringBytes = data.slice(pos, pos + length);
      const str = new TextDecoder('utf-8', { fatal: false }).decode(stringBytes);
      strings.push(str);
    }

    return right(strings);
  }

  /**
   * Parse type IDs - pure function
   */
  static parseTypeIds(data: Uint8Array, offset: number, count: number): Either<string, readonly TypeId[]> {
    if (data.length < offset + count * 4) {
      return left('Insufficient data for type IDs');
    }

    const typeIds: TypeId[] = [];
    const view = new DataView(data.buffer, data.byteOffset + offset);

    for (let i = 0; i < count; i++) {
      typeIds.push({
        descriptorIdx: view.getUint32(i * 4, false),
      });
    }

    return right(typeIds);
  }

  /**
   * Parse method IDs - pure function
   */
  static parseMethodIds(data: Uint8Array, offset: number, count: number): Either<string, readonly MethodId[]> {
    if (data.length < offset + count * 8) {
      return left('Insufficient data for method IDs');
    }

    const methodIds: MethodId[] = [];
    const view = new DataView(data.buffer, data.byteOffset + offset);

    for (let i = 0; i < count; i++) {
      methodIds.push({
        classIdx: view.getUint16(i * 8, false),
        protoIdx: view.getUint16(i * 8 + 2, false),
        nameIdx: view.getUint32(i * 8 + 4, false),
      });
    }

    return right(methodIds);
  }

  /**
   * Parse class definitions - pure function
   */
  static parseClassDefs(data: Uint8Array, offset: number, count: number): Either<string, readonly ClassDef[]> {
    if (data.length < offset + count * 32) {
      return left('Insufficient data for class definitions');
    }

    const classDefs: ClassDef[] = [];
    const view = new DataView(data.buffer, data.byteOffset + offset);

    for (let i = 0; i < count; i++) {
      classDefs.push({
        classIdx: view.getUint32(i * 32, false),
        accessFlags: view.getUint32(i * 32 + 4, false),
        superclassIdx: view.getUint32(i * 32 + 8, false),
        interfacesOff: view.getUint32(i * 32 + 12, false),
        sourceFileIdx: view.getUint32(i * 32 + 16, false),
        annotationsOff: view.getUint32(i * 32 + 20, false),
        classDataOff: view.getUint32(i * 32 + 24, false),
        staticValuesOff: view.getUint32(i * 32 + 28, false),
      });
    }

    return right(classDefs);
  }

  /**
   * Parse complete DEX file - pure function composition
   */
  static parseDexFile(data: Uint8Array): Either<string, DexFile> {
    // Parse header
    const headerResult = this.parseHeader(data, 0);
    if (headerResult.isLeft()) {
      return headerResult;
    }
    const header = headerResult.value;

    // Parse string IDs
    const stringIdsResult = this.parseStringIds(data, header.stringIdsOff, header.stringIdsSize);
    if (stringIdsResult.isLeft()) {
      return stringIdsResult;
    }
    const stringIds = stringIdsResult.value;

    // Parse strings
    const stringsResult = this.parseStrings(data, stringIds);
    if (stringsResult.isLeft()) {
      return stringsResult;
    }
    const strings = stringsResult.value;

    // Parse type IDs
    const typeIdsResult = this.parseTypeIds(data, header.typeIdsOff, header.typeIdsSize);
    if (typeIdsResult.isLeft()) {
      return typeIdsResult;
    }
    const typeIds = typeIdsResult.value;

    // Parse method IDs
    const methodIdsResult = this.parseMethodIds(data, header.methodIdsOff, header.methodIdsSize);
    if (methodIdsResult.isLeft()) {
      return methodIdsResult;
    }
    const methodIds = methodIdsResult.value;

    // Parse class definitions
    const classDefsResult = this.parseClassDefs(data, header.classDefsOff, header.classDefsSize);
    if (classDefsResult.isLeft()) {
      return classDefsResult;
    }
    const classDefs = classDefsResult.value;

    // Return immutable DEX file
    return right({
      header,
      stringIds,
      typeIds,
      protoIds: [], // Would need to parse these too
      fieldIds: [], // Would need to parse these too
      methodIds,
      classDefs,
      strings,
    });
  }

  /**
   * Get string by index - pure function
   */
  static getString(dex: DexFile, index: number): Either<string, string> {
    if (index < 0 || index >= dex.strings.length) {
      return left(`String index ${index} out of bounds`);
    }
    return right(dex.strings[index]);
  }

  /**
   * Get type by index - pure function
   */
  static getType(dex: DexFile, index: number): Either<string, string> {
    if (index < 0 || index >= dex.typeIds.length) {
      return left(`Type index ${index} out of bounds`);
    }
    const typeId = dex.typeIds[index];
    return this.getString(dex, typeId.descriptorIdx);
  }

  /**
   * Find class by name - pure function
   */
  static findClass(dex: DexFile, className: string): Either<string, ClassDef> {
    const classDef = dex.classDefs.find(c => {
      const typeResult = this.getType(dex, c.classIdx);
      return typeResult.isRight() && typeResult.value === className;
    });

    if (!classDef) {
      return left(`Class ${className} not found`);
    }
    return right(classDef);
  }

  /**
   * Count methods - pure function
   */
  static countMethods(dex: DexFile): number {
    return dex.methodIds.length;
  }

  /**
   * Count classes - pure function
   */
  static countClasses(dex: DexFile): number {
    return dex.classDefs.length;
  }
}

