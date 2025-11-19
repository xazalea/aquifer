{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE StrictData #-}
{-# LANGUAGE DeriveGeneric #-}

-- Professional DEX Parser - Haskell Implementation
-- Type-safe, functional bytecode parsing for Android DEX files
--
-- This module provides:
-- - Type-safe DEX file parsing
-- - Immutable data structures
-- - Functional transformations
-- - Comprehensive error handling

module DexParser where

import qualified Data.ByteString as BS
import qualified Data.ByteString.Lazy as BSL
import Data.Binary.Get
import Data.Word
import Data.Int
import GHC.Generics (Generic)
import Data.List (find)

-- DEX File Header
data DexHeader = DexHeader
  { magic           :: BS.ByteString  -- "dex\n" or "dex\n035\0"
  , checksum        :: Word32
  , signature       :: BS.ByteString  -- 20 bytes SHA-1
  , fileSize        :: Word32
  , headerSize      :: Word32
  , endianTag       :: Word32
  , linkSize        :: Word32
  , linkOff         :: Word32
  , mapOff          :: Word32
  , stringIdsSize   :: Word32
  , stringIdsOff    :: Word32
  , typeIdsSize     :: Word32
  , typeIdsOff      :: Word32
  , protoIdsSize    :: Word32
  , protoIdsOff     :: Word32
  , fieldIdsSize    :: Word32
  , fieldIdsOff     :: Word32
  , methodIdsSize   :: Word32
  , methodIdsOff    :: Word32
  , classDefsSize   :: Word32
  , classDefsOff    :: Word32
  , dataSize        :: Word32
  , dataOff         :: Word32
  } deriving (Show, Generic)

-- String ID
data StringId = StringId
  { stringDataOff :: Word32
  } deriving (Show, Generic)

-- Type ID
data TypeId = TypeId
  { descriptorIdx :: Word32  -- Index into string_ids
  } deriving (Show, Generic)

-- Proto ID (Method Prototype)
data ProtoId = ProtoId
  { shortyIdx     :: Word32  -- Index into string_ids
  , returnTypeIdx :: Word32  -- Index into type_ids
  , parametersOff :: Word32  -- Offset to type_list
  } deriving (Show, Generic)

-- Field ID
data FieldId = FieldId
  { classIdx  :: Word16  -- Index into type_ids
  , typeIdx   :: Word16  -- Index into type_ids
  , nameIdx   :: Word32  -- Index into string_ids
  } deriving (Show, Generic)

-- Method ID
data MethodId = MethodId
  { methodClassIdx  :: Word16  -- Index into type_ids
  , methodProtoIdx  :: Word16  -- Index into proto_ids
  , methodNameIdx   :: Word32  -- Index into string_ids
  } deriving (Show, Generic)

-- Class Definition
data ClassDef = ClassDef
  { classIdx        :: Word32  -- Index into type_ids
  , accessFlags     :: Word32
  , superclassIdx   :: Word32  -- Index into type_ids
  , interfacesOff    :: Word32  -- Offset to type_list
  , sourceFileIdx   :: Word32  -- Index into string_ids
  , annotationsOff   :: Word32  -- Offset to annotation_directory_item
  , classDataOff    :: Word32  -- Offset to class_data_item
  , staticValuesOff :: Word32  -- Offset to encoded_array_item
  } deriving (Show, Generic)

-- DEX File Structure
data DexFile = DexFile
  { header     :: DexHeader
  , stringIds  :: [StringId]
  , typeIds    :: [TypeId]
  , protoIds   :: [ProtoId]
  , fieldIds   :: [FieldId]
  , methodIds  :: [MethodId]
  , classDefs  :: [ClassDef]
  , strings    :: [BS.ByteString]
  } deriving (Show, Generic)

-- Parse DEX Header
parseDexHeader :: Get DexHeader
parseDexHeader = do
  magic <- getByteString 8
  checksum <- getWord32be
  signature <- getByteString 20
  fileSize <- getWord32be
  headerSize <- getWord32be
  endianTag <- getWord32be
  linkSize <- getWord32be
  linkOff <- getWord32be
  mapOff <- getWord32be
  stringIdsSize <- getWord32be
  stringIdsOff <- getWord32be
  typeIdsSize <- getWord32be
  typeIdsOff <- getWord32be
  protoIdsSize <- getWord32be
  protoIdsOff <- getWord32be
  fieldIdsSize <- getWord32be
  fieldIdsOff <- getWord32be
  methodIdsSize <- getWord32be
  methodIdsOff <- getWord32be
  classDefsSize <- getWord32be
  classDefsOff <- getWord32be
  dataSize <- getWord32be
  dataOff <- getWord32be
  
  return $ DexHeader
    { DexParser.magic = magic
    , DexParser.checksum = checksum
    , DexParser.signature = signature
    , DexParser.fileSize = fileSize
    , DexParser.headerSize = headerSize
    , DexParser.endianTag = endianTag
    , DexParser.linkSize = linkSize
    , DexParser.linkOff = linkOff
    , DexParser.mapOff = mapOff
    , DexParser.stringIdsSize = stringIdsSize
    , DexParser.stringIdsOff = stringIdsOff
    , DexParser.typeIdsSize = typeIdsSize
    , DexParser.typeIdsOff = typeIdsOff
    , DexParser.protoIdsSize = protoIdsSize
    , DexParser.protoIdsOff = protoIdsOff
    , DexParser.fieldIdsSize = fieldIdsSize
    , DexParser.fieldIdsOff = fieldIdsOff
    , DexParser.methodIdsSize = methodIdsSize
    , DexParser.methodIdsOff = methodIdsOff
    , DexParser.classDefsSize = classDefsSize
    , DexParser.classDefsOff = classDefsOff
    , DexParser.dataSize = dataSize
    , DexParser.dataOff = dataOff
    }

-- Parse String ID
parseStringId :: Get StringId
parseStringId = do
  stringDataOff <- getWord32be
  return $ StringId { stringDataOff = stringDataOff }

-- Parse Type ID
parseTypeId :: Get TypeId
parseTypeId = do
  descriptorIdx <- getWord32be
  return $ TypeId { descriptorIdx = descriptorIdx }

-- Parse Proto ID
parseProtoId :: Get ProtoId
parseProtoId = do
  shortyIdx <- getWord32be
  returnTypeIdx <- getWord32be
  parametersOff <- getWord32be
  return $ ProtoId
    { shortyIdx = shortyIdx
    , returnTypeIdx = returnTypeIdx
    , parametersOff = parametersOff
    }

-- Parse Field ID
parseFieldId :: Get FieldId
parseFieldId = do
  classIdx <- getWord16be
  typeIdx <- getWord16be
  nameIdx <- getWord32be
  return $ FieldId
    { DexParser.classIdx = classIdx
    , DexParser.typeIdx = typeIdx
    , DexParser.nameIdx = nameIdx
    }

-- Parse Method ID
parseMethodId :: Get MethodId
parseMethodId = do
  methodClassIdx <- getWord16be
  methodProtoIdx <- getWord16be
  methodNameIdx <- getWord32be
  return $ MethodId
    { methodClassIdx = methodClassIdx
    , methodProtoIdx = methodProtoIdx
    , methodNameIdx = methodNameIdx
    }

-- Parse Class Definition
parseClassDef :: Get ClassDef
parseClassDef = do
  classIdx <- getWord32be
  accessFlags <- getWord32be
  superclassIdx <- getWord32be
  interfacesOff <- getWord32be
  sourceFileIdx <- getWord32be
  annotationsOff <- getWord32be
  classDataOff <- getWord32be
  staticValuesOff <- getWord32be
  return $ ClassDef
    { DexParser.classIdx = classIdx
    , DexParser.accessFlags = accessFlags
    , DexParser.superclassIdx = superclassIdx
    , DexParser.interfacesOff = interfacesOff
    , DexParser.sourceFileIdx = sourceFileIdx
    , DexParser.annotationsOff = annotationsOff
    , DexParser.classDataOff = classDataOff
    , DexParser.staticValuesOff = staticValuesOff
    }

-- Parse DEX File
parseDexFile :: BS.ByteString -> Either String DexFile
parseDexFile bytes = do
  -- Validate magic
  let magic = BS.take 8 bytes
  if magic /= "dex\n035\0" && magic /= "dex\n" then
    Left "Invalid DEX magic"
  else
    Right $ runGet parseDexHeader (BSL.fromStrict bytes)

-- Get string by index
getString :: DexFile -> Int -> Maybe BS.ByteString
getString dex idx
  | idx >= 0 && idx < length (DexParser.strings dex) = Just (DexParser.strings dex !! idx)
  | otherwise = Nothing

-- Get type by index
getType :: DexFile -> Int -> Maybe BS.ByteString
getType dex idx = do
  typeId <- if idx >= 0 && idx < length (typeIds dex)
            then Just (typeIds dex !! idx)
            else Nothing
  stringIdx <- Just (fromIntegral $ descriptorIdx typeId)
  getString dex (fromIntegral stringIdx)

-- Find class by name
findClass :: DexFile -> BS.ByteString -> Maybe ClassDef
findClass dex className = find (\c -> getType dex (fromIntegral $ DexParser.classIdx c) == Just className) (classDefs dex)

-- Count methods in DEX file
countMethods :: DexFile -> Int
countMethods dex = length (methodIds dex)

-- Count classes in DEX file
countClasses :: DexFile -> Int
countClasses dex = length (classDefs dex)

