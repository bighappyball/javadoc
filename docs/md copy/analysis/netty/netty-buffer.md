# Buffer 之 ByteBuf（一）简介

# 1. 概述

从本文开始，我们来分享 Netty ByteBuf 相关的内容。它在 `buffer` 模块中实现，在功能定位上，它和 NIO ByteBuffer 是一致的，但是强大非常多。如下是 [《Netty 实战》](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/#) 对它的**优点总**结：

> - A01. 它可以被用户自定义的**缓冲区类型**扩展
> - A02. 通过内置的符合缓冲区类型实现了透明的**零拷贝**
> - A03. 容量可以**按需增长**
> - A04. 在读和写这两种模式之间切换不需要调用 `#flip()` 方法
> - A05. 读和写使用了**不同的索引**
> - A06. 支持方法的**链式**调用
> - A07. 支持引用计数
> - A08. 支持**池化**

- 特别是第 A04 这点，相信很多胖友都被 NIO ByteBuffer 反人类的读模式和写模式给坑哭了。在 [《精尽 Netty 源码分析 —— NIO 基础（三）之 Buffer》](http://svip.iocoder.cn/Netty/nio-3-buffer/) 中，我们也吐槽过了。😈
- 当然，可能胖友看着这些优点，会一脸懵逼，不要紧，边读源码边理解落。

------

> 老艿艿，从下文开始，Netty ByteBuf ，我们只打 ByteBuf 。相比 NIO ByteBuffer ，它少 `"fer"` 三个字母。

ByteBuf 的代码实现挺有趣的，但是会略有一点点深度，所以笔者会分成三大块来分享：

- ByteBuf 相关，主要是它的核心 API 和核心子类实现。
- ByteBufAllocator 相关，用于创建 ByteBuf 对象。
- Jemalloc 相关，内存管理算法，Netty 基于该算法，实现对内存高效和有效的管理。😈 这块是最最最有趣的。

每一块，我们会分成几篇小的文章。而本文，我们就来对 ByteBuf 有个整体的认识，特别是核心 API 部分。

# 2. ByteBuf

`io.netty.buffer.ByteBuf` ，实现 ReferenceCounted 、Comparable 接口，ByteBuf **抽象类**。注意，ByteBuf 是一个抽象类，而不是一个接口。当然，实际上，它主要定义了**抽象**方法，**很少**实现对应的方法。

关于 `io.netty.util.ReferenceCounted` 接口，对象引用计数器接口。

- 对象的初始引用计数为 1 。
- 当引用计数器值为 0 时，表示该对象不能再被继续引用，只能被释放。
- 本文暂时不解析，我们会在 TODO 1011

## 2.1 抽象方法

因为 ByteBuf 的方法非常多，所以笔者对它的方法做了简单的归类。Let’s Go 。

### 2.1.1 基础信息

```java
public abstract int capacity(); // 容量
public abstract ByteBuf capacity(int newCapacity);
public abstract int maxCapacity(); // 最大容量

public abstract ByteBufAllocator alloc(); // 分配器，用于创建 ByteBuf 对象。

@Deprecated
public abstract ByteOrder order(); // 字节序，即大小端。推荐阅读 http://www.ruanyifeng.com/blog/2016/11/byte-order.html
@Deprecated
public abstract ByteBuf order(ByteOrder endianness);

public abstract ByteBuf unwrap(); // 获得被包装( wrap )的 ByteBuf 对象。

public abstract boolean isDirect(); // 是否 NIO Direct Buffer

public abstract boolean isReadOnly(); // 是否为只读 Buffer
public abstract ByteBuf asReadOnly();

public abstract int readerIndex(); // 读取位置
public abstract ByteBuf readerIndex(int readerIndex);
public abstract int writerIndex(); // 写入位置
public abstract ByteBuf writerIndex(int writerIndex);
public abstract ByteBuf setIndex(int readerIndex, int writerIndex); // 设置读取和写入位置
public abstract int readableBytes(); // 剩余可读字节数
public abstract int writableBytes(); // 剩余可写字节数
public abstract int maxWritableBytes();
public abstract boolean isReadable();
public abstract boolean isReadable(int size);
public abstract boolean isWritable();
public abstract boolean isWritable(int size);
public abstract ByteBuf ensureWritable(int minWritableBytes);
public abstract int ensureWritable(int minWritableBytes, boolean force);
public abstract ByteBuf markReaderIndex(); // 标记读取位置
public abstract ByteBuf resetReaderIndex();
public abstract ByteBuf markWriterIndex(); // 标记写入位置
public abstract ByteBuf resetWriterIndex();
```

主要是如下四个属性：

- `readerIndex` ，读索引。
- `writerIndex` ，写索引。
- `capacity` ，当前容量。
- `maxCapacity` ，最大容量。当 `writerIndex` 写入超过 `capacity` 时，可自动扩容。**每次**扩容的大小，为 `capacity` 的 2 倍。当然，前提是不能超过 `maxCapacity` 大小。

所以，ByteBuf 通过 `readerIndex` 和 `writerIndex` 两个索引，解决 ByteBuffer 的读写模式的问题。

四个大小关系很简单：`readerIndex` <= `writerIndex` <= `capacity` <= `maxCapacity` 。如下图所示：[![分段](http://static.iocoder.cn/images/Netty/2018_08_01/01.png)](http://static.iocoder.cn/images/Netty/2018_08_01/01.png)分段

- 图中一共有三段，实际是四段，省略了 `capacity` 到 `maxCapacity` 之间的一段。
- discardable bytes ，废弃段。一般情况下，可以理解成已读的部分。
- readable bytes ，可读段。可通过 `#readXXX()` 方法，顺序向下读取。
- writable bytes ，可写段。可通过 `#writeXXX()` 方法，顺序向下写入。

另外，ByteBuf 还有 `markReaderIndex` 和 `markWriterIndex` 两个属性：

- 通过对应的 `#markReaderIndex()` 和 `#markWriterIndex()` 方法，分别标记读取和写入位置。
- 通过对应的 `#resetReaderIndex()` 和 `#resetWriterIndex()` 方法，分别读取和写入位置到标记处。

### 3.1.2 读取 / 写入操作

```java
// Boolean 1 字节
public abstract boolean getBoolean(int index);
public abstract ByteBuf setBoolean(int index, boolean value);
public abstract boolean readBoolean();
public abstract ByteBuf writeBoolean(boolean value);

// Byte 1 字节
public abstract byte  getByte(int index);
public abstract short getUnsignedByte(int index);
public abstract ByteBuf setByte(int index, int value);
public abstract byte  readByte();
public abstract short readUnsignedByte();
public abstract ByteBuf writeByte(int value);

// Short 2 字节
public abstract short getShort(int index);
public abstract short getShortLE(int index);
public abstract int getUnsignedShort(int index);
public abstract int getUnsignedShortLE(int index);
public abstract ByteBuf setShort(int index, int value);
public abstract ByteBuf setShortLE(int index, int value);
public abstract short readShort();
public abstract short readShortLE();
public abstract int   readUnsignedShort();
public abstract int   readUnsignedShortLE();
public abstract ByteBuf writeShort(int value);
public abstract ByteBuf writeShortLE(int value);

// 【特殊】Medium 3 字节
public abstract int   getMedium(int index);
public abstract int getMediumLE(int index);
public abstract int   getUnsignedMedium(int index);
public abstract int   getUnsignedMediumLE(int index);
public abstract ByteBuf setMedium(int index, int value);
public abstract ByteBuf setMediumLE(int index, int value);
public abstract int   readMedium();
public abstract int   readMediumLE();
public abstract int   readUnsignedMedium();
public abstract int   readUnsignedMediumLE();
public abstract ByteBuf writeMedium(int value);
public abstract ByteBuf writeMediumLE(int value);

// Int 4 字节
public abstract int   getInt(int index);
public abstract int   getIntLE(int index);
public abstract long  getUnsignedInt(int index);
public abstract long  getUnsignedIntLE(int index);
public abstract ByteBuf setInt(int index, int value);
public abstract ByteBuf setIntLE(int index, int value);
public abstract int   readInt();
public abstract int   readIntLE();
public abstract long  readUnsignedInt();
public abstract long  readUnsignedIntLE();
public abstract ByteBuf writeInt(int value);
public abstract ByteBuf writeIntLE(int value);

// Long 8 字节
public abstract long  getLong(int index);
public abstract long  getLongLE(int index);
public abstract ByteBuf setLong(int index, long value);
public abstract ByteBuf setLongLE(int index, long value);
public abstract long  readLong();
public abstract long  readLongLE();
public abstract ByteBuf writeLong(long value);
public abstract ByteBuf writeLongLE(long value);

// Char 2 字节
public abstract char  getChar(int index);
public abstract ByteBuf setChar(int index, int value);
public abstract char  readChar();
public abstract ByteBuf writeChar(int value);

// Float 4 字节
public abstract float getFloat(int index);
public float getFloatLE(int index) {
    return Float.intBitsToFloat(getIntLE(index));
}
public abstract ByteBuf setFloat(int index, float value);
public ByteBuf setFloatLE(int index, float value) {
    return setIntLE(index, Float.floatToRawIntBits(value));
}
public abstract float readFloat();
public float readFloatLE() {
    return Float.intBitsToFloat(readIntLE());
}
public abstract ByteBuf writeFloat(float value);
public ByteBuf writeFloatLE(float value) {
    return writeIntLE(Float.floatToRawIntBits(value));
}

// Double 8 字节
public abstract double getDouble(int index);
public double getDoubleLE(int index) {
    return Double.longBitsToDouble(getLongLE(index));
}
public abstract ByteBuf setDouble(int index, double value);
public ByteBuf setDoubleLE(int index, double value) {
    return setLongLE(index, Double.doubleToRawLongBits(value));
}
public abstract double readDouble();
public double readDoubleLE() {
    return Double.longBitsToDouble(readLongLE());
}
public abstract ByteBuf writeDouble(double value);
public ByteBuf writeDoubleLE(double value) {
    return writeLongLE(Double.doubleToRawLongBits(value));
}

// Byte 数组
public abstract ByteBuf getBytes(int index, ByteBuf dst);
public abstract ByteBuf getBytes(int index, ByteBuf dst, int length);
public abstract ByteBuf getBytes(int index, ByteBuf dst, int dstIndex, int length);
public abstract ByteBuf getBytes(int index, byte[] dst);
public abstract ByteBuf getBytes(int index, byte[] dst, int dstIndex, int length);
public abstract ByteBuf getBytes(int index, ByteBuffer dst);
public abstract ByteBuf getBytes(int index, OutputStream out, int length) throws IOException;
public abstract int getBytes(int index, GatheringByteChannel out, int length) throws IOException;
public abstract int getBytes(int index, FileChannel out, long position, int length) throws IOException;
public abstract ByteBuf setBytes(int index, ByteBuf src);
public abstract ByteBuf setBytes(int index, ByteBuf src, int length);
public abstract ByteBuf setBytes(int index, ByteBuf src, int srcIndex, int length);
public abstract ByteBuf setBytes(int index, byte[] src);
public abstract ByteBuf setBytes(int index, byte[] src, int srcIndex, int length);
public abstract ByteBuf setBytes(int index, ByteBuffer src);
public abstract int setBytes(int index, InputStream in, int length) throws IOException;
public abstract int setBytes(int index, ScatteringByteChannel in, int length) throws IOException;
public abstract int setBytes(int index, FileChannel in, long position, int length) throws IOException;
public abstract ByteBuf setZero(int index, int length);
public abstract ByteBuf readBytes(int length);
public abstract ByteBuf readSlice(int length);
public abstract ByteBuf readRetainedSlice(int length);
public abstract ByteBuf readBytes(ByteBuf dst);
public abstract ByteBuf readBytes(ByteBuf dst, int length);
public abstract ByteBuf readBytes(ByteBuf dst, int dstIndex, int length);
public abstract ByteBuf readBytes(byte[] dst);
public abstract ByteBuf readBytes(byte[] dst, int dstIndex, int length);
public abstract ByteBuf readBytes(ByteBuffer dst);
public abstract ByteBuf readBytes(OutputStream out, int length) throws IOException;
public abstract int readBytes(GatheringByteChannel out, int length) throws IOException;
public abstract int readBytes(FileChannel out, long position, int length) throws IOException;
public abstract ByteBuf skipBytes(int length); // 忽略指定长度的字节数
public abstract ByteBuf writeBytes(ByteBuf src);
public abstract ByteBuf writeBytes(ByteBuf src, int length);
public abstract ByteBuf writeBytes(ByteBuf src, int srcIndex, int length);
public abstract ByteBuf writeBytes(byte[] src);
public abstract ByteBuf writeBytes(byte[] src, int srcIndex, int length);
public abstract ByteBuf writeBytes(ByteBuffer src);
public abstract int  writeBytes(InputStream in, int length) throws IOException;
public abstract int writeBytes(ScatteringByteChannel in, int length) throws IOException;
public abstract int writeBytes(FileChannel in, long position, int length) throws IOException;
public abstract ByteBuf writeZero(int length); // 填充指定长度的 0

// String
public abstract CharSequence getCharSequence(int index, int length, Charset charset);
public abstract int setCharSequence(int index, CharSequence sequence, Charset charset);
public abstract CharSequence readCharSequence(int length, Charset charset);
public abstract int writeCharSequence(CharSequence sequence, Charset charset);
```

虽然方法比较多，总结下来是不同数据类型的**四种**读写方法：

- `#getXXX(index)` 方法，读取**指定**位置的数据，不改变 `readerIndex` 索引。
- `#readXXX()` 方法，读取 `readerIndex` 位置的数据，会改成 `readerIndex` 索引。
- `#setXXX(index, value)` 方法，写入数据到**指定**位置，不改变 `writeIndex` 索引。
- `#writeXXX(value)` 方法，写入数据到**指定**位置，会改变 `writeIndex` 索引。

### 2.1.3 查找 / 遍历操作

```java
public abstract int indexOf(int fromIndex, int toIndex, byte value); // 指定值( value ) 在 ByteBuf 中的位置
public abstract int bytesBefore(byte value);
public abstract int bytesBefore(int length, byte value);
public abstract int bytesBefore(int index, int length, byte value);

public abstract int forEachByte(ByteProcessor processor); // 遍历 ByteBuf ，进行自定义处理
public abstract int forEachByte(int index, int length, ByteProcessor processor);
public abstract int forEachByteDesc(ByteProcessor processor);
public abstract int forEachByteDesc(int index, int length, ByteProcessor processor);
```

### 3.1.4 释放操作

```java
public abstract ByteBuf discardReadBytes(); // 释放已读的字节空间
public abstract ByteBuf discardSomeReadBytes(); // 释放部分已读的字节空间

public abstract ByteBuf clear(); // 清空字节空间。实际是修改 readerIndex=writerIndex=0，标记清空。
```

**discardReadBytes**

`#discardReadBytes()` 方法，释放【所有的】**废弃段**的空间内存。

- 优点：达到重用废弃段的空间内存。
- 缺点：释放的方式，是通过复制**可读段**到 ByteBuf 的头部。所以，频繁释放会导致性能下降。
- 总结：这是典型的问题：选择空间还是时间。具体的选择，需要看对应的场景。😈 后续的文章，我们会看到对该方法的调用。

整个过程如下图：[![discardReadBytes](http://static.iocoder.cn/images/Netty/2018_08_01/02.png)](http://static.iocoder.cn/images/Netty/2018_08_01/02.png)discardReadBytes

**discardSomeReadBytes**

`#discardSomeReadBytes()` 方法，释放【部分的】**废弃段**的空间内存。

这是对 `#discardSomeReadBytes()` 方法的这种方案，具体的实现，见 [「4. AbstractByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/#) 中。

**clear**

`#clear()` 方法，清空字节空间。实际是修改 `readerIndex = writerIndex = 0` ，标记清空。

- 优点：通过标记来实现清空，避免置空 ByteBuf ，提升性能。
- 缺点：数据实际还存在，如果错误修改 `writerIndex` 时，会导致读到“脏”数据。

整个过程如下图：[![discardReadBytes](http://static.iocoder.cn/images/Netty/2018_08_01/03.png)](http://static.iocoder.cn/images/Netty/2018_08_01/03.png)discardReadBytes

### 3.1.5 拷贝操作

```java
public abstract ByteBuf copy(); // 拷贝可读部分的字节数组。独立，互相不影响。
public abstract ByteBuf copy(int index, int length);

public abstract ByteBuf slice(); // 拷贝可读部分的字节数组。共享，相互影响。
public abstract ByteBuf slice(int index, int length);
public abstract ByteBuf retainedSlice();

public abstract ByteBuf duplicate(); // 拷贝整个的字节数组。共享，相互影响。
public abstract ByteBuf retainedDuplicate();
```

### 3.1.6 转换 NIO ByteBuffer 操作

```java
// ByteBuf 包含 ByteBuffer 数量。
// 如果返回 = 1 ，则调用 `#nioBuffer()` 方法，获得 ByteBuf 包含的 ByteBuffer 对象。
// 如果返回 > 1 ，则调用 `#nioBuffers()` 方法，获得 ByteBuf 包含的 ByteBuffer 数组。
public abstract int nioBufferCount();

public abstract ByteBuffer nioBuffer();
public abstract ByteBuffer nioBuffer(int index, int length);
public abstract ByteBuffer internalNioBuffer(int index, int length);

public abstract ByteBuffer[] nioBuffers();
public abstract ByteBuffer[] nioBuffers(int index, int length);
```

### 3.1.7 Heap 相关方法

```java
// 适用于 Heap 类型的 ByteBuf 对象的 byte[] 字节数组
public abstract boolean hasArray(); // 是否有 byte[] 字节数组
public abstract byte[] array();
public abstract int arrayOffset();
```

- 详细解析，见 [《精尽 Netty 源码解析 —— Buffer 之 ByteBuf（二）核心子类》](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl)

### 3.1.8 Unsafe 相关方法

```java
// 适用于 Unsafe 类型的 ByteBuf 对象
public abstract boolean hasMemoryAddress(); // 是否有内存地址
public abstract long memoryAddress();
```

- 详细解析，见 [《精尽 Netty 源码解析 —— Buffer 之 ByteBuf（二）核心子类》](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl)

### 3.1.9 Object 相关

```java
@Override
public abstract String toString();
public abstract String toString(Charset charset);
public abstract String toString(int index, int length, Charset charset);

@Override
public abstract int hashCode();

@Override
public abstract boolean equals(Object obj);

@Override
public abstract int compareTo(ByteBuf buffer);
```

### 3.1.10 引用计数相关

本文暂时不解析，我们会在 TODO 1011 。

来自 ReferenceCounted

https://skyao.gitbooks.io/learning-netty/content/buffer/interface_ReferenceCounted.html 可参考

```java
@Override
public abstract ByteBuf retain(int increment);
@Override
public abstract ByteBuf retain();

@Override
public abstract ByteBuf touch();
@Override
public abstract ByteBuf touch(Object hint);
```

## 3.2 子类类图

ByteBuf 的子类灰常灰常灰常多，胖友点击 [传送门](http://static.iocoder.cn/images/Netty/2018_08_01/04.png) 可以进行查看。

本文仅分享 ByteBuf 的**五个**直接子类实现，如下图所示：[![传送门](http://static.iocoder.cn/images/Netty/2018_08_01/05.png)](http://static.iocoder.cn/images/Netty/2018_08_01/05.png)传送门

- 【重点】AbstractByteBuf ，ByteBuf 抽象实现类，提供 ByteBuf 的默认实现类。可以说，是 ByteBuf 最最最重要的子类。详细解析，见 [「4. AbstractByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/#) 。
- EmptyByteBuf ，用于构建空 ByteBuf 对象，`capacity` 和 `maxCapacity` 均为 0 。详细解析，见 [「5. EmptyByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/#) 。
- WrappedByteBuf ，用于装饰 ByteBuf 对象。详细解析，见 [「6. WrappedByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/#) 。
- SwappedByteBuf ，用于构建具有切换**字节序**功能的 ByteBuf 对象。详细解析，见 [「7. SwappedByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/#) 。
- ReplayingDecoderByteBuf ，用于构建在 IO 阻塞条件下实现无阻塞解码的特殊 ByteBuf 对象，当要读取的数据还未接收完全时，抛出异常，交由 ReplayingDecoder处理。详细解析，见 [「8. ReplayingDecoderByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/#) 。

# 4. AbstractByteBuf

`io.netty.buffer.AbstractByteBuf` ，实现 ByteBuf 抽象类，ByteBuf 抽象实现类。官方注释如下：

```java
/**
 * A skeletal implementation of a buffer.
 */
```

因为 AbstractByteBuf 实现类 ByteBuf 超级多的方法，所以我们还是按照 ByteBuf 的归类，逐个分析过去。

## 4.1 基础信息

### 4.1.1 构造方法

```java
/**
 * 读取位置
 */
int readerIndex;
/**
 * 写入位置
 */
int writerIndex;
/**
 * {@link #readerIndex} 的标记
 */
private int markedReaderIndex;
/**
 * {@link #writerIndex} 的标记
 */
private int markedWriterIndex;
/**
 * 最大容量
 */
private int maxCapacity;

protected AbstractByteBuf(int maxCapacity) {
    if (maxCapacity < 0) {
        throw new IllegalArgumentException("maxCapacity: " + maxCapacity + " (expected: >= 0)");
    }
    this.maxCapacity = maxCapacity;
}
```

- `capacity` 属性，在 AbstractByteBuf 未定义，而是由子类来实现。为什么呢？在后面的文章，我们会看到，ByteBuf 根据**内存类型**分成 Heap 和 Direct ，它们获取 `capacity` 的值的方式不同。

- `maxCapacity` 属性，相关的方法：

  ```java
  @Override
  public int maxCapacity() {
      return maxCapacity;
  }
  
  protected final void maxCapacity(int maxCapacity) {
      this.maxCapacity = maxCapacity;
  }
  ```

### 4.1.2 读索引相关的方法

**获取和设置读位置**

```java
@Override
public int readerIndex() {
    return readerIndex;
}
    
@Override
public ByteBuf readerIndex(int readerIndex) {
    if (readerIndex < 0 || readerIndex > writerIndex) {
        throw new IndexOutOfBoundsException(String.format(
                "readerIndex: %d (expected: 0 <= readerIndex <= writerIndex(%d))", readerIndex, writerIndex));
    }
    this.readerIndex = readerIndex;
    return this;
}
```

------

**是否可读**

```java
@Override
public boolean isReadable() {
    return writerIndex > readerIndex;
}
@Override
public boolean isReadable(int numBytes) {
    return writerIndex - readerIndex >= numBytes;
}

@Override
public int readableBytes() {
    return writerIndex - readerIndex;
}
```

------

**标记和重置读位置**

```java
@Override
public ByteBuf markReaderIndex() {
    markedReaderIndex = readerIndex;
    return this;
}

@Override
public ByteBuf resetReaderIndex() {
    readerIndex(markedReaderIndex);
    return this;
}
```

### 4.1.3 写索引相关的方法

**获取和设置写位置**

```java
@Override
public int writerIndex() {
    return writerIndex;
}
    
@Override
public ByteBuf writerIndex(int writerIndex) {
    if (writerIndex < readerIndex || writerIndex > capacity()) {
        throw new IndexOutOfBoundsException(String.format(
                "writerIndex: %d (expected: readerIndex(%d) <= writerIndex <= capacity(%d))",
                writerIndex, readerIndex, capacity()));
    }
    this.writerIndex = writerIndex;
    return this;
}
```

------

**是否可写**

```java
@Override
public boolean isWritable() {
    return capacity() > writerIndex;
}
@Override
public boolean isWritable(int numBytes) {
    return capacity() - writerIndex >= numBytes;
}

@Override
public int writableBytes() {
    return capacity() - writerIndex;
}
@Override
public int maxWritableBytes() {
    return maxCapacity() - writerIndex;
}
```

------

**标记和重置写位置**

```java
@Override
public ByteBuf markWriterIndex() {
    markedWriterIndex = writerIndex;
    return this;
}

@Override
public ByteBuf resetWriterIndex() {
    writerIndex(markedWriterIndex);
    return this;
}
```

------

**保证可写**

`#ensureWritable(int minWritableBytes)` 方法，保证有足够的可写空间。若不够，则进行扩容。代码如下：

```java
 1: @Override
 2: public ByteBuf ensureWritable(int minWritableBytes) {
 3:     if (minWritableBytes < 0) {
 4:         throw new IllegalArgumentException(String.format(
 5:                 "minWritableBytes: %d (expected: >= 0)", minWritableBytes));
 6:     }
 7:     ensureWritable0(minWritableBytes);
 8:     return this;
 9: }
10: 
11: final void ensureWritable0(int minWritableBytes) {
12:     // 检查是否可访问
13:     ensureAccessible();
14:     // 目前容量可写，直接返回
15:     if (minWritableBytes <= writableBytes()) {
16:         return;
17:     }
18: 
19:     // 超过最大上限，抛出 IndexOutOfBoundsException 异常
20:     if (minWritableBytes > maxCapacity - writerIndex) {
21:         throw new IndexOutOfBoundsException(String.format(
22:                 "writerIndex(%d) + minWritableBytes(%d) exceeds maxCapacity(%d): %s",
23:                 writerIndex, minWritableBytes, maxCapacity, this));
24:     }
25: 
26:     // 计算新的容量。默认情况下，2 倍扩容，并且不超过最大容量上限。
27:     // Normalize the current capacity to the power of 2.
28:     int newCapacity = alloc().calculateNewCapacity(writerIndex + minWritableBytes, maxCapacity);
29: 
30:     // 设置新的容量大小
31:     // Adjust to the new capacity.
32:     capacity(newCapacity);
33: }
```

- 第 13 行：调用 `#ensureAccessible()` 方法，检查是否可访问。代码如下：

  ```java
  /**
   * Should be called by every method that tries to access the buffers content to check
   * if the buffer was released before.
   */
  protected final void ensureAccessible() {
      if (checkAccessible && refCnt() == 0) { // 若指向为 0 ，说明已经释放，不可继续写入。
          throw new IllegalReferenceCountException(0);
      }
  }
  
  private static final String PROP_MODE = "io.netty.buffer.bytebuf.checkAccessible";
  /**
   * 是否检查可访问
   *
   * @see #ensureAccessible() 
   */
  private static final boolean checkAccessible;
  
  static {
      checkAccessible = SystemPropertyUtil.getBoolean(PROP_MODE, true);
      if (logger.isDebugEnabled()) {
          logger.debug("-D{}: {}", PROP_MODE, checkAccessible);
      }
  }
  ```

- 第 14 至 17 行：目前容量可写，直接返回。

- 第 19 至 24 行：超过最大上限，抛出 IndexOutOfBoundsException 异常。

- 第 28 行：调用`ByteBufAllocator#calculateNewCapacity(int minNewCapacity, int maxCapacity)`方法，计算新的容量。默认情况下，2 倍扩容，并且不超过最大容量上限。注意，此处仅仅是计算，并没有扩容内存复制等等操作。

  - 第 32 行：调用 `#capacity(newCapacity)` 方法，设置新的容量大小。

`#ensureWritable(int minWritableBytes, boolean force)` 方法，保证有足够的可写空间。若不够，则进行扩容。代码如下：

```java
@Override
public int ensureWritable(int minWritableBytes, boolean force) {
    // 检查是否可访问
    ensureAccessible();
    if (minWritableBytes < 0) {
        throw new IllegalArgumentException(String.format(
                "minWritableBytes: %d (expected: >= 0)", minWritableBytes));
    }

    // 目前容量可写，直接返回 0
    if (minWritableBytes <= writableBytes()) {
        return 0;
    }

    final int maxCapacity = maxCapacity();
    final int writerIndex = writerIndex();
    // 超过最大上限
    if (minWritableBytes > maxCapacity - writerIndex) {
        // 不强制设置，或者已经到达最大容量
        if (!force || capacity() == maxCapacity) {
            // 返回 1
            return 1;
        }

        // 设置为最大容量
        capacity(maxCapacity);
        // 返回 3
        return 3;
    }

    // 计算新的容量。默认情况下，2 倍扩容，并且不超过最大容量上限。
    // Normalize the current capacity to the power of 2.
    int newCapacity = alloc().calculateNewCapacity(writerIndex + minWritableBytes, maxCapacity);

    // 设置新的容量大小
    // Adjust to the new capacity.
    capacity(newCapacity);

    // 返回 2
    return 2;
}
```

和 `#ensureWritable(int minWritableBytes)` 方法，有两点不同：

- 超过最大容量的上限时，不会抛出 IndexOutOfBoundsException 异常。
- 根据执行的过程不同，返回不同的返回值。

比较简单，胖友自己看下代码。

### 4.1.4 setIndex

```java
@Override
public ByteBuf setIndex(int readerIndex, int writerIndex) {
    if (readerIndex < 0 || readerIndex > writerIndex || writerIndex > capacity()) {
        throw new IndexOutOfBoundsException(String.format(
                "readerIndex: %d, writerIndex: %d (expected: 0 <= readerIndex <= writerIndex <= capacity(%d))",
                readerIndex, writerIndex, capacity()));
    }
    setIndex0(readerIndex, writerIndex);
    return this;
}

final void setIndex0(int readerIndex, int writerIndex) {
    this.readerIndex = readerIndex;
    this.writerIndex = writerIndex;
}
```

### 4.1.5 读索引标记位相关的方法

```java
@Override
public ByteBuf markReaderIndex() {
    markedReaderIndex = readerIndex;
    return this;
}

@Override
public ByteBuf resetReaderIndex() {
    readerIndex(markedReaderIndex);
    return this;
}
```

### 4.1.6 写索引标记位相关的方法

```java
@Override
public ByteBuf markWriterIndex() {
    markedWriterIndex = writerIndex;
    return this;
}

@Override
public ByteBuf resetWriterIndex() {
    writerIndex(markedWriterIndex);
    return this;
}
```

### 4.1.7 是否只读相关

`#isReadOnly()` 方法，返回是否只读。代码如下：

```java
@Override
public boolean isReadOnly() {
    return false;
}
```

- 默认返回 `false` 。子类可覆写该方法，根据情况返回结果。

------

`#asReadOnly()` 方法，转换成只读 ByteBuf 对象。代码如下：

```java
@SuppressWarnings("deprecation")
@Override
public ByteBuf asReadOnly() {
    // 如果是只读，直接返回
    if (isReadOnly()) {
        return this;
    }
    // 转化成只读 Buffer 对象
    return Unpooled.unmodifiableBuffer(this);
}
```

- 如果已是只读，直接返回该 ByteBuf 对象。

- 如果不是只读，调用 `Unpooled#unmodifiableBuffer(Bytebuf)` 方法，转化成只读 Buffer 对象。代码如下：

  ```java
  /**
   * Creates a read-only buffer which disallows any modification operations
   * on the specified {@code buffer}.  The new buffer has the same
   * {@code readerIndex} and {@code writerIndex} with the specified
   * {@code buffer}.
   *
   * @deprecated Use {@link ByteBuf#asReadOnly()}.
   */
  @Deprecated
  public static ByteBuf unmodifiableBuffer(ByteBuf buffer) {
      ByteOrder endianness = buffer.order();
      // 大端
      if (endianness == BIG_ENDIAN) {
          return new ReadOnlyByteBuf(buffer);
      }
      // 小端
      return new ReadOnlyByteBuf(buffer.order(BIG_ENDIAN)).order(LITTLE_ENDIAN);
  }
  ```

  - 注意，返回的是**新的** `io.netty.buffer.ReadOnlyByteBuf` 对象。并且，和原 ByteBuf 对象，共享 `readerIndex` 和 `writerIndex` 索引，以及相关的数据。仅仅是说，只读，不能写入。

### 4.1.8 ByteOrder 相关的方法

`#order()` 方法，获得字节序。由子类实现，因为 AbstractByteBuf 的内存类型，不确定是 Heap 还是 Direct 。

------

`#order(ByteOrder endianness)` 方法，设置字节序。代码如下：

```java
@Override
public ByteBuf order(ByteOrder endianness) {
    if (endianness == null) {
        throw new NullPointerException("endianness");
    }
    // 未改变，直接返回
    if (endianness == order()) {
        return this;
    }
    // 创建 SwappedByteBuf 对象
    return newSwappedByteBuf();
}

/**
 * Creates a new {@link SwappedByteBuf} for this {@link ByteBuf} instance.
 */
protected SwappedByteBuf newSwappedByteBuf() {
    return new SwappedByteBuf(this);
}
```

- 如果字节序未修改，直接返回该 ByteBuf 对象。
- 如果字节序有修改，调用 `#newSwappedByteBuf()` 方法，TODO SwappedByteBuf

### 4.1.9 未实现方法

和 [「2.1.1 基础信息」](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/#) 相关的方法，有三个未实现，如下：

```java
public abstract ByteBufAllocator alloc(); // 分配器，用于创建 ByteBuf 对象。

public abstract ByteBuf unwrap(); // 获得被包装( wrap )的 ByteBuf 对象。

public abstract boolean isDirect(); // 是否 NIO Direct Buffer
```

## 4.2 读取 / 写入操作

我们以 Int 类型为例子，来看看它的读取和写入操作的实现代码。

### 4.2.1 getInt

```java
@Override
public int getInt(int index) {
    // 校验读取是否会超过容量
    checkIndex(index, 4);
    // 读取 Int 数据
    return _getInt(index);
}
```

- 调用 `#checkIndex(index, fieldLength)` 方法，校验读取是否会超过**容量**。注意，不是超过 `writerIndex` 位置。因为，只是读取指定位置开始的 Int 数据，不会改变 `readerIndex` 。代码如下：

  ```java
  protected final void checkIndex(int index, int fieldLength) {
      // 校验是否可访问
      ensureAccessible();
      // 校验是否会超过容量
      checkIndex0(index, fieldLength);
  }
  final void checkIndex0(int index, int fieldLength) {
      if (isOutOfBounds(index, fieldLength, capacity())) {
          throw new IndexOutOfBoundsException(String.format(
                  "index: %d, length: %d (expected: range(0, %d))", index, fieldLength, capacity()));
      }
  }
  
  // MathUtil.java
  /**
   * Determine if the requested {@code index} and {@code length} will fit within {@code capacity}.
   * @param index The starting index.
   * @param length The length which will be utilized (starting from {@code index}).
   * @param capacity The capacity that {@code index + length} is allowed to be within.
   * @return {@code true} if the requested {@code index} and {@code length} will fit within {@code capacity}.
   * {@code false} if this would result in an index out of bounds exception.
   */
  public static boolean isOutOfBounds(int index, int length, int capacity) {
      // 只有有负数，或运算，就会有负数。
      // 另外，此处的越界，不仅仅有 capacity - (index + length < 0 ，例如 index < 0 ，也是越界
      return (index | length | (index + length) | (capacity - (index + length))) < 0;
  }
  ```

- 调用 `#_getInt(index)` 方法，读取 Int 数据。这是一个**抽象**方法，由子类实现。代码如下：

  ```java
  protected abstract int _getInt(int index);
  ```

关于 `#getIntLE(int index)` / `getUnsignedInt(int index)` / `getUnsignedIntLE(int index)` 方法的实现，胖友自己去看。

### 4.2.2 readInt

```java
@Override
public int readInt() {
    // 校验读取是否会超过可读段
    checkReadableBytes0(4);
    // 读取 Int 数据
    int v = _getInt(readerIndex);
    // 修改 readerIndex ，加上已读取字节数
    readerIndex += 4;
    return v;
}
```

- 调用 `#checkReadableBytes0(fieldLength)` 方法，校验读取是否会超过**可读段**。代码如下：

  ```java
  private void checkReadableBytes0(int minimumReadableBytes) {
      // 是否可访问
      ensureAccessible();
      // 是否超过写索引，即超过可读段
      if (readerIndex > writerIndex - minimumReadableBytes) {
          throw new IndexOutOfBoundsException(String.format(
                  "readerIndex(%d) + length(%d) exceeds writerIndex(%d): %s",
                  readerIndex, minimumReadableBytes, writerIndex, this));
      }
  }
  ```

- 调用 `#_getInt(index)` 方法，读取 Int 数据。

- 读取完成，修改 `readerIndex` 【**重要** 😈】，加上已读取字节数 4 。

关于 `#readIntLE()` / `readUnsignedInt()` / `readUnsignedIntLE()` 方法的实现，胖友自己去看。

### 4.2.3 setInt

```java
@Override
public ByteBuf setInt(int index, int value) {
    // 校验写入是否会超过容量
    checkIndex(index, 4);
    // 设置 Int 数据
    _setInt(index, value);
    return this;
}
```

- 调用 `#checkIndex(index, fieldLength)` 方法，校验写入是否会超过**容量**。

- 调用 `#_setInt(index,value )` 方法，写入 Int 数据。这是一个**抽象**方法，由子类实现。代码如下：

  ```
  protected abstract int _setInt(int index, int value);
  ```

关于 `#setIntLE(int index, int value)` 方法的实现，胖友自己去看。

public abstract ByteBuf writeInt(int value);
public abstract ByteBuf writeIntLE(int value);

### 4.2.4 writeInt

```java
@Override
public ByteBuf writeInt(int value) {
    // 保证可写入
    ensureWritable0(4);
    // 写入 Int 数据
    _setInt(writerIndex, value);
    // 修改 writerIndex ，加上已写入字节数
    writerIndex += 4;
    return this;
}
```

- 调用 `#ensureWritable0(int minWritableBytes)` 方法，保证可写入。
- 调用 `#_setInt(index, int value)` 方法，写入Int 数据。
- 写入完成，修改 `writerIndex` 【**重要** 😈】，加上已写入字节数 4 。

### 4.2.5 其它方法

其它类型的读取和写入操作的实现代码，胖友自己研究落。还是有一些有意思的方法，例如：

- `#writeZero(int length)` 方法。原本以为是循环 `length` 次写入 0 字节，结果发现会基于 `long` => `int` => `byte` 的顺序，尽可能合并写入。
- `#skipBytes((int length)` 方法

## 4.3 查找 / 遍历操作

查找 / 遍历操作相关的方法，实现比较简单。所以，感兴趣的胖友，可以自己去看。

## 4.4 释放操作

### 4.4.1 discardReadBytes

`#discardReadBytes()` 方法，代码如下：

```java
 1: @Override
 2: public ByteBuf discardReadBytes() {
 3:     // 校验可访问
 4:     ensureAccessible();
 5:     // 无废弃段，直接返回
 6:     if (readerIndex == 0) {
 7:         return this;
 8:     }
 9: 
10:     // 未读取完
11:     if (readerIndex != writerIndex) {
12:         // 将可读段复制到 ByteBuf 头
13:         setBytes(0, this, readerIndex, writerIndex - readerIndex);
14:         // 写索引减小
15:         writerIndex -= readerIndex;
16:         // 调整标记位
17:         adjustMarkers(readerIndex);
18:         // 读索引重置为 0
19:         readerIndex = 0;
20:     // 全部读取完
21:     } else {
22:         // 调整标记位
23:         adjustMarkers(readerIndex);
24:         // 读写索引都重置为 0
25:         writerIndex = readerIndex = 0;
26:     }
27:     return this;
28: }
```

- 第 4 行：调用 `#ensureAccessible()` 方法，检查是否可访问。

- 第 5 至 8 行：无**废弃段**，直接返回。

- 第 10 至 19 行：未读取完，即还有**可读段**。

  - 第 13 行：调用 `#setBytes(int index, ByteBuf src, int srcIndex, int length)` 方法，将可读段复制到 ByteBuf 头开始。如下图所示：[![discardReadBytes](http://static.iocoder.cn/images/Netty/2018_08_01/02.png)](http://static.iocoder.cn/images/Netty/2018_08_01/02.png)discardReadBytes

  - 第 15 行：写索引 `writerIndex` 减小。

  - 第 19 行：调用 `#adjustMarkers(int decrement)` 方法，调整标记位。代码如下：

    ```java
    protected final void adjustMarkers(int decrement) {
        int markedReaderIndex = this.markedReaderIndex;
        // 读标记位小于减少值(decrement)
        if (markedReaderIndex <= decrement) {
            // 重置读标记位为 0
            this.markedReaderIndex = 0;
            // 写标记位小于减少值(decrement)
            int markedWriterIndex = this.markedWriterIndex;
            if (markedWriterIndex <= decrement) {
                // 重置写标记位为 0
                this.markedWriterIndex = 0;
            // 减小写标记位
            } else {
                this.markedWriterIndex = markedWriterIndex - decrement;
            }
        // 减小读写标记位
        } else {
            this.markedReaderIndex = markedReaderIndex - decrement;
            this.markedWriterIndex -= decrement;
        }
    }
    ```

    - 代码虽然比较多，但是目的很明确，**减小**读写标记位。并且，通过判断，**最多减小至 0** 。

  - 第 19 行：**仅**读索引重置为 0 。

- 第 20 至 26 行：全部读取完，即无

  可读段

  。

  - 第 23 行：调用 `#adjustMarkers(int decrement)` 方法，调整标记位。
  - 第 25 行：读写索引**都**重置为 0 。

### 4.4.2 discardSomeReadBytes

`#discardSomeReadBytes()` 方法，代码如下：

```java
@Override
public ByteBuf discardSomeReadBytes() {
    // 校验可访问
    ensureAccessible();
    // 无废弃段，直接返回
    if (readerIndex == 0) {
        return this;
    }

    // 全部读取完
    if (readerIndex == writerIndex) {
        // 调整标记位
        adjustMarkers(readerIndex);
        // 读写索引都重置为 0
        writerIndex = readerIndex = 0;
        return this;
    }

    // 读取超过容量的一半，进行释放
    if (readerIndex >= capacity() >>> 1) {
        // 将可读段复制到 ByteBuf 头
        setBytes(0, this, readerIndex, writerIndex - readerIndex);
        // 写索引减小
        writerIndex -= readerIndex;
        // 调整标记位
        adjustMarkers(readerIndex);
        // 读索引重置为 0
        readerIndex = 0;
    }
    return this;
}
```

整体代码和 `#discardReadBytes()` 方法是**一致的**。差别在于，`readerIndex >= capacity() >>> 1` ，读取超过容量的**一半**时，进行释放。也就是说，在空间和时间之间，做了一个平衡。

😈 后续，我们来看看，Netty 具体在什么时候，调用 `#discardSomeReadBytes()` 和 `#discardReadBytes()` 方法。

### 4.4.3 clear

`#clear()` 方法，代码如下：

```java
@Override
public ByteBuf clear() {
    readerIndex = writerIndex = 0;
    return this;
}
```

- 读写索引**都**重置为 0 。
- 读写标记位**不会**重置。

## 4.5 拷贝操作

### 4.5.1 copy

`#copy()` 方法，拷贝可读部分的字节数组。代码如下：

```java
@Override
public ByteBuf copy() {
    return copy(readerIndex, readableBytes());
}
```

- 调用 `#readableBytes()` 方法，获得可读的字节数。
- 调用 `#copy(int index, int length)` 方法，拷贝**指定部分**的字节数组。独立，互相不影响。具体的实现，需要子类中实现，原因是做**深**拷贝，需要根据内存类型是 Heap 和 Direct 会有不同。

### 4.5.2 slice

`#slice()` 方法，拷贝可读部分的字节数组。代码如下：

```java
@Override
public ByteBuf slice() {
    return slice(readerIndex, readableBytes());
}
```

- 调用 `#readableBytes()` 方法，获得可读的字节数。

- 调用 `#slice(int index, int length)` 方法，拷贝**指定部分**的字节数组。共享，互相影响。代码如下：

  ```java
  @Override
  public ByteBuf slice(int index, int length) {
      // 校验可访问
      ensureAccessible();
      // 创建 UnpooledSlicedByteBuf 对象
      return new UnpooledSlicedByteBuf(this, index, length);
  }
  ```

  - 返回的是创建的 UnpooledSlicedByteBuf 对象。在它内部，会调用当前 ByteBuf 对象，所以这也是为什么说是**共享**的。或者说，我们可以认为这是一个**浅**拷贝。

------

`#retainedSlice()` 方法，在 `#slice()` 方法的基础上，引用计数加 1 。代码如下：

```java
@Override
public ByteBuf retainedSlice(int index, int length) {
    return slice(index, length).retain();
}
```

- 调用 `#slice(int index, int length)` 方法，拷贝**指定部分**的字节数组。也就说，返回 UnpooledSlicedByteBuf 对象。
- 调用 `UnpooledSlicedByteBuf#retain()` 方法，，引用计数加 1 。本文暂时不解析，我们会在 TODO 1011 。

### 4.5.3 duplicate

`#duplicate()` 方法，拷贝**整个**的字节数组。代码如下：

```java
@Override
public ByteBuf duplicate() {
    // 校验是否可访问
    ensureAccessible();
    return new UnpooledDuplicatedByteBuf(this);
}
```

- 创建的 UnpooledDuplicatedByteBuf 对象。在它内部，会调用当前 ByteBuf 对象，所以这也是为什么说是**共享**的。或者说，我们可以认为这是一个**浅**拷贝。
- 它和 `#slice()` 方法的差别在于，前者是**整个**，后者是**可写段**。

------

`#retainedDuplicate()` 方法，在 `#duplicate()` 方法的基础上，引用计数加 1 。代码如下：

```java
@Override
public ByteBuf retainedDuplicate() {
    return duplicate().retain();
}
```

- 调用 `#duplicate()` 方法，拷贝**整个**的字节数组。也就说，返回 UnpooledDuplicatedByteBuf 对象。
- 调用 `UnpooledDuplicatedByteBuf#retain()` 方法，，引用计数加 1 。本文暂时不解析，我们会在 TODO 1011 。

## 4.6 转换 NIO ByteBuffer 操作

### 4.6.1 nioBuffer

`#nioBuffer()` 方法，代码如下：

```java
@Override
public ByteBuffer nioBuffer() {
    return nioBuffer(readerIndex, readableBytes());
}
```

- 在方法内部，会调用 `#nioBuffer(int index, int length)` 方法。而该方法，由具体的子类实现。

  > FROM [《深入研究Netty框架之ByteBuf功能原理及源码分析》](https://my.oschina.net/7001/blog/742236)
  >
  > 将当前 ByteBuf 的可读缓冲区( `readerIndex` 到 `writerIndex` 之间的内容) 转换为 ByteBuffer 对象，两者共享共享缓冲区的内容。对 ByteBuffer 的读写操作不会影响 ByteBuf 的读写索引。
  >
  > 注意：ByteBuffer 无法感知 ByteBuf 的动态扩展操作。ByteBuffer 的长度为`readableBytes()` 。

### 4.6.2 nioBuffers

`#nioBuffers()` 方法，代码如下：

```java
@Override
public ByteBuffer[] nioBuffers() {
    return nioBuffers(readerIndex, readableBytes());
}
```

- 在方法内部，会调用 `#nioBuffers(int index, int length)` 方法。而该方法，由具体的子类实现。
- 😈 为什么会产生数组的情况呢？例如 CompositeByteBuf 。当然，后续文章，我们也会具体分享。

## 4.7 Heap 相关方法

Heap 相关方法，在子类中实现。详细解析，见 [《精尽 Netty 源码解析 —— Buffer 之 ByteBuf（二）核心子类》](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl)

## 4.8 Unsafe 相关方法

Unsafe，在子类中实现。详细解析，见 [《精尽 Netty 源码解析 —— Buffer 之 ByteBuf（二）核心子类》](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl)

## 4.9 Object 相关

Object 相关的方法，主要调用 `io.netty.buffer.ByteBufUtil` 进行实现。而 ByteUtil 是一个非常有用的工具类，它提供了一系列静态方法，用于操作 ByteBuf 对象：[![ByteUtil](http://static.iocoder.cn/images/Netty/2018_08_01/06.png)](http://static.iocoder.cn/images/Netty/2018_08_01/06.png)ByteUtil

😈 因为 Object 相关的方法，实现比较简单。所以，感兴趣的胖友，可以自己去看。

## 4.10 引用计数相关

本文暂时不解析，我们会在 TODO 1011 。

# 5. EmptyByteBuf

`io.netty.buffer.EmptyByteBuf` ，继承 ByteBuf 抽象类，用于构建空 ByteBuf 对象，`capacity` 和 `maxCapacity` 均为 0 。

😈 代码实现超级简单，感兴趣的胖友，可以自己去看。

# 6. WrappedByteBuf

`io.netty.buffer.WrappedByteBuf` ，继承 ByteBuf 抽象类，用于装饰 ByteBuf 对象。构造方法如下：

```java
/**
 * 被装饰的 ByteBuf 对象
 */
protected final ByteBuf buf;

protected WrappedByteBuf(ByteBuf buf) {
    if (buf == null) {
        throw new NullPointerException("buf");
    }
    this.buf = buf;
}
```

- `buf` 属性，被装饰的 ByteBuf 对象。

- 每个实现方法，是对 `buf` 的对应方法的调用。例如：

  ```java
  @Override
  public final int capacity() {
      return buf.capacity();
  }
  
  @Override
  public ByteBuf capacity(int newCapacity) {
      buf.capacity(newCapacity);
      return this;
  }
  ```

# 7. SwappedByteBuf

`io.netty.buffer.SwappedByteBuf` ，继承 ByteBuf 抽象类，用于构建具有切换**字节序**功能的 ByteBuf 对象。构造方法如下：

```java
/**
 * 原 ByteBuf 对象
 */
private final ByteBuf buf;
/**
 * 字节序
 */
private final ByteOrder order;

public SwappedByteBuf(ByteBuf buf) {
    if (buf == null) {
        throw new NullPointerException("buf");
    }
    this.buf = buf;
    // 初始化 order 属性
    if (buf.order() == ByteOrder.BIG_ENDIAN) {
        order = ByteOrder.LITTLE_ENDIAN;
    } else {
        order = ByteOrder.BIG_ENDIAN;
    }
}
```

- `buf` 属性，原 ByteBuf 对象。

- `order` 属性，字节数。

- 实际上，SwappedByteBuf 可以看成一个特殊的 WrappedByteBuf 实现，所以它除了读写操作外的方法，都是对 `buf` 的对应方法的调用。

  - `#capacity()` 方法，代码如下：

    ```java
    @Override
    public int capacity() {
        return buf.capacity();
    }
    ```

    - 直接调用 `buf` 的对应方法。

  - `#setInt(int index, int value)` 方法，代码如下：

    ```java
    @Override
    public ByteBuf setInt(int index, int value) {
        buf.setInt(index, ByteBufUtil.swapInt(value));
        return this;
    }
    
    // ByteBufUtil.java
    /**
     * Toggles the endianness of the specified 32-bit integer.
     */
    public static int swapInt(int value) {
        return Integer.reverseBytes(value);
    }
    ```

    - 先调用 `ByteBufUtil#swapInt(int value)` 方法，将 `value` 的值，转换成相反字节序的 Int 值。
    - 后调用 `buf` 的对应方法。

通过 SwappedByteBuf 类，我们可以很方便的修改原 ByteBuf 对象的字节序，并且无需进行内存复制。但是反过来，一定要注意，这两者是**共享**的。

# 8. ReplayingDecoderByteBuf

`io.netty.handler.codec.ReplayingDecoderByteBuf` ，继承 ByteBuf 抽象类，用于构建在 IO 阻塞条件下实现无阻塞解码的特殊 ByteBuf对 象。当要读取的数据还未接收完全时，抛出异常，交由 ReplayingDecoder 处理。

细心的胖友，会看到 ReplayingDecoderByteBuf 是在 `codec` 模块，配合 ReplayingDecoder 使用。所以，本文暂时不会分享它，而是在 [《TODO 2000 ReplayingDecoderByteBuf》](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/) 中，详细解析。

# 666. 彩蛋

每逢开篇，内容就特别啰嗦，哈哈哈哈。

推荐阅读如下文章：

- AbeJeffrey [《深入研究Netty框架之ByteBuf功能原理及源码分析》](https://my.oschina.net/7001/blog/742236)
- [《Netty 学习笔记 —— ByteBuf 继承结构》](https://skyao.gitbooks.io/learning-netty/content/buffer/inheritance.html)

# Buffer 之 ByteBuf（二）核心子类

# 1. 概述

在 [《精尽 Netty 源码解析 —— ByteBuf（一）之简介》](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/) 中，我们对 ByteBuf 有了整体的认识，特别是核心 API 部分。同时，我们也看到，ByteBuf 有非常非常非常多的子类，那么怎么办呢？实际上，**ByteBuf 有 8 个最最最核心的子类实现**。如下图所示：[![核心子类](http://static.iocoder.cn/images/Netty/2018_08_04/01.png)](http://static.iocoder.cn/images/Netty/2018_08_04/01.png)核心子类

一共可以按照三个维度来看这 8 个核心子类，刚好是 2 x 2 x 2 = 8 ：

- 按照内存类型分类：

  - ① 堆内存字节缓冲区( **Heap**ByteBuf )：底层为 JVM 堆内的字节数组，其特点是申请和释放效率较高。但是如果要进行 Socket 的 I/O 读写，需要额外多做一次内存复制，需要将堆内存对应的缓冲区复制到内核 Channel 中，性能可能会有一定程度的损耗。
- ② 直接内存字节缓冲区( **Direct**ByteBuf )：堆外内存，为操作系统内核空间的字节数组，它由操作系统直接管理和操作，其申请和释放的效率会慢于堆缓冲区。但是将它写入或者从 SocketChannel 中读取时，会少一次内存复制，这样可以大大提高 I/O 效率，实现零拷贝。
  - 关于这两者的对比，感兴趣的胖友，可以再看看 [《Java NIO direct buffer 的优势在哪儿？》](https://www.zhihu.com/question/60892134) 和 [《JAVA NIO 之 Direct Buffer 与 Heap Buffer的区别？》](http://eyesmore.iteye.com/blog/1133335)

- 按照对象池分类：

  - ① 基于对象池( **Pooled**ByteBuf )：基于对象池的 ByteBuf 可以重用 ByteBuf ，也就是说它自己内部维护着一个对象池，当对象释放后会归还给对象池，这样就可以循环地利用创建的 ByteBuf，提升内存的使用率，降低由于高负载导致的频繁 GC。当需要大量且频繁创建缓冲区时，推荐使用该类缓冲区。
  - ② 不使用对象池( **Unpooled**ByteBuf )：对象池的管理和维护会比较困难，所以在不需要创建大量缓冲区对象时，推荐使用此类缓冲区。
  
- 按照Unsafe分类：

  - ① 使用 Unsafe ：基于 Java `sun.misc.Unsafe.Unsafe` 的 API ，直接访问内存中的数据。
  - ② 不使用 Unsafe ： 基于 **Heap**ByteBuf 和 **Direct**ByteBuf 的标准 API ，进行访问对应的数据。
  - 关于 Unsafe ，JVM 大佬 R 大在知乎上有个回答：[《为什么 JUC 中大量使用了 sun.misc.Unsafe 这个类，但官方却不建议开发者使用？》](https://www.zhihu.com/question/29266773) 。关于为什么 Unsafe 的性能会更好：”其中一种是嫌 Java 性能不够好，例如说数组访问的边界检查语义，嫌这个开销太大，觉得用 Unsafe 会更快；”。

默认情况下，使用 PooledUnsafeDirectByteBuf 类型。所以，重点重点重点，看 [「2.4 PooledUnsafeDirectByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 。

# 2. PooledByteBuf

`io.netty.buffer.PooledByteBuf` ，继承 AbstractReferenceCountedByteBuf 抽象类，**对象池化**的 ByteBuf 抽象基类，为基于**对象池**的 ByteBuf 实现类，提供公用的方法。

关于 `io.netty.util.AbstractReferenceCountedByteBuf` 抽象类，对象引用计数器抽象类。本文暂时不解析，我们会在 [《精尽 Netty 源码解析 —— Buffer 之 ByteBuf（三）内存泄露检测》](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/) 详细解析。

## 2.1 内部方法

### 2.1.1 构造方法

```java
/**
 * Recycler 处理器，用于回收对象
 */
private final Recycler.Handle<PooledByteBuf<T>> recyclerHandle;

/**
 * Chunk 对象
 */
protected PoolChunk<T> chunk;
/**
 * 从 Chunk 对象中分配的内存块所处的位置
 */
protected long handle;
/**
 * 内存空间。具体什么样的数据，通过子类设置泛型。
 */
protected T memory;
/**
 * {@link #memory} 开始位置
 *
 * @see #idx(int)
 */
protected int offset;
/**
 * 容量
 *
 * @see #capacity()
 */
protected int length;
/**
 * 占用 {@link #memory} 的大小
 */
int maxLength;
/**
 * TODO 1013 Chunk
 */
PoolThreadCache cache;
/**
 * 临时 ByteBuff 对象
 *
 * @see #internalNioBuffer()
 */
private ByteBuffer tmpNioBuf;
/**
 * ByteBuf 分配器对象
 */
private ByteBufAllocator allocator;

@SuppressWarnings("unchecked")
protected PooledByteBuf(Recycler.Handle<? extends PooledByteBuf<T>> recyclerHandle, int maxCapacity) {
    super(maxCapacity);
    this.recyclerHandle = (Handle<PooledByteBuf<T>>) recyclerHandle;
}
```

- `recyclerHandle` 属性，Recycler 处理器，用于回收**当前**对象。

- `chunk`属性，PoolChunk 对象。在 Netty 中，使用 Jemalloc 算法管理内存，而 Chunk 是里面的一种内存块
  
  。在这里，我们可以理解`memory`所属的 PoolChunk 对象。

  - `handle` 属性，从 Chunk 对象中分配的内存块所处的位置。具体的，胖友后面仔细看看 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（二）PoolChunk》](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk/) 和 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（三）PoolSubpage》](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage/) 。

  - memory属性，内存空间。具体什么样的数据，通过子类设置泛型(`T`)。例如：
    
    1) PooledDirectByteBuf 和 PooledUnsafeDirectByteBuf 为`ByteBuffer`；
    1) 2) PooledHeapByteBuf 和 PooledUnsafeHeapByteBuf 为`byte[]`
    
    - `offset` 属性，使用 `memory` 的开始位置。
    - `maxLength` 属性，**最大**使用 `memory` 的长度( 大小 )。
    - `length` 属性，**目前**使用 `memory` 的长度( 大小 )。
    - 😈 因为 `memory` 属性，可以被**多个** ByteBuf 使用。**每个** ByteBuf 使用范围为 `[offset, maxLength)` 。
  
- `cache` 属性，TODO 1013 Chunk

- `tmpNioBuf` 属性，临时 ByteBuff 对象，通过 `#tmpNioBuf()` 方法生成。详细解析，见 [「2.1.9 internalNioBuffer」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 。

- `allocator` 属性，ByteBuf 分配器。

### 2.1.2 init0

`#init0(PoolChunk<T> chunk, long handle, int offset, int length, int maxLength, PoolThreadCache cache)` 方法，初始化 PooledByteBuf 对象。代码如下：

```java
private void init0(PoolChunk<T> chunk, long handle, int offset, int length, int maxLength, PoolThreadCache cache) {
    assert handle >= 0;
    assert chunk != null;

    // From PoolChunk 对象
    this.chunk = chunk;
    memory = chunk.memory;
    allocator = chunk.arena.parent;
    // 其他
    this.cache = cache;
    this.handle = handle;
    this.offset = offset;
    this.length = length;
    this.maxLength = maxLength;
    tmpNioBuf = null;
}
```

仔细的胖友，可能会发现，这是一个 `private` 私有方法。目前它被两个方法调用：

- ① `#init(PoolChunk<T> chunk, long handle, int offset, int length, int maxLength, PoolThreadCache cache)` 方法，一般是基于 **pooled** 的 PoolChunk 对象，初始化 PooledByteBuf 对象。代码如下：

  ```java
  void init(PoolChunk<T> chunk, long handle, int offset, int length, int maxLength, PoolThreadCache cache) {
      init0(chunk, handle, offset, length, maxLength, cache);
  }
  ```

- ② `#initUnpooled(PoolChunk<T> chunk, int length)` 方法，基于 **unPoolooled** 的 PoolChunk 对象，初始化 PooledByteBuf 对象。代码如下：

  ```java
  void initUnpooled(PoolChunk<T> chunk, int length) {
      init0(chunk, 0, chunk.offset, length, length, null);
  }
  ```

  - 例如说 **Huge** 大小的 PoolChunk 对象。
  - 注意，传入的给 `#init0(...)` 方法的 `length` 和 `maxLength` 方法参数，**都是** `length` 。

可能胖友读到此处会一脸懵逼。其实，这是很正常的。可以在看完 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（二）PoolChunk》](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk/) 后，在回过头来，理解理解。

### 2.1.3 reuse

`#reuse(int maxCapacity)` 方法，每次在重用 PooledByteBuf 对象时，需要调用该方法，重置属性。代码如下：

```java
/**
 * Method must be called before reuse this {@link PooledByteBufAllocator}
 */
final void reuse(int maxCapacity) {
    // 设置最大容量
    maxCapacity(maxCapacity);
    // 设置引用数量为 0
    setRefCnt(1);
    // 重置读写索引为 0
    setIndex0(0, 0);
    // 重置读写标记位为 0
    discardMarks();
}
```

也就是说，该方法在 [「2.1.2 init9」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) **之前**就调用了。在下文中，我们会看到，该方法的调用。

### 2.1.4 capacity

`#capacity()` 方法，获得容量。代码如下：

```java
@Override
public final int capacity() {
    return length;
}
```

**当前**容量的值为 `length` 属性。
但是，要注意的是，`maxLength` 属性，**不是表示最大容量**。`maxCapacity` 属性，才是真正表示最大容量。
那么，`maxLength` 属性有什么用？表示**占用** `memory` 的最大容量( 而不是 PooledByteBuf 对象的最大容量 )。在写入数据超过 `maxLength` 容量时，会进行扩容，但是容量的上限，为 `maxCapacity` 。

------

`#capacity(int newCapacity)` 方法，调整容量大小。在这个过程中，根据情况，可能对 `memory` 扩容或缩容。代码如下：

```java
 1: @Override
 2: public final ByteBuf capacity(int newCapacity) {
 3:     // 校验新的容量，不能超过最大容量
 4:     checkNewCapacity(newCapacity);
 5: 
 6:     // Chunk 内存，非池化
 7:     // If the request capacity does not require reallocation, just update the length of the memory.
 8:     if (chunk.unpooled) {
 9:         if (newCapacity == length) { // 相等，无需扩容 / 缩容
10:             return this;
11:         }
12:     // Chunk 内存，是池化
13:     } else {
14:         // 扩容
15:         if (newCapacity > length) {
16:             if (newCapacity <= maxLength) {
17:                 length = newCapacity;
18:                 return this;
19:             }
20:         // 缩容
21:         } else if (newCapacity < length) {
22:             // 大于 maxLength 的一半
23:             if (newCapacity > maxLength >>> 1) {
24:                 if (maxLength <= 512) {
25:                     // 因为 Netty SubPage 最小是 16 ，如果小于等 16 ，无法缩容。
26:                     if (newCapacity > maxLength - 16) {
27:                         length = newCapacity;
28:                         // 设置读写索引，避免超过最大容量
29:                         setIndex(Math.min(readerIndex(), newCapacity), Math.min(writerIndex(), newCapacity));
30:                         return this;
31:                     }
32:                 } else { // > 512 (i.e. >= 1024)
33:                     length = newCapacity;
34:                     // 设置读写索引，避免超过最大容量
35:                     setIndex(Math.min(readerIndex(), newCapacity), Math.min(writerIndex(), newCapacity));
36:                     return this;
37:                 }
38:             }
39:         // 相等，无需扩容 / 缩容
40:         } else {
41:             return this;
42:         }
43:     }
44: 
45:     // 重新分配新的内存空间，并将数据复制到其中。并且，释放老的内存空间。
46:     // Reallocation required.
47:     chunk.arena.reallocate(this, newCapacity, true);
48:     return this;
49: }
```

- 第 4 行：调用 `AbstractByteBuf#checkNewCapacity(int newCapacity)` 方法，校验新的容量，不能超过最大容量。代码如下：

  ```java
  protected final void checkNewCapacity(int newCapacity) {
      ensureAccessible();
      if (newCapacity < 0 || newCapacity > maxCapacity()) {
          throw new IllegalArgumentException("newCapacity: " + newCapacity + " (expected: 0-" + maxCapacity() + ')');
      }
  }
  ```

- 第 6 至 11 行：对于基于 **unPoolooled** 的 PoolChunk 对象，除非容量不变，否则会扩容或缩容，即【第 47 行】的代码。为什么呢？在 `#initUnpooled(PoolChunk<T> chunk, int length)` 方法中，我们可以看到，`maxLength` 和 `length` 是相等的，所以大于或小于时，需要进行扩容或缩容。

- 第 13 行：对于基于poolooled的 PoolChunk 对象，需要根据情况：

  - 第 39 至 42 行：容量未变，不进行扩容。类似【第 9 至 11 行】的代码。

  - 第 14 至 19 行：新容量**大于**当前容量，但是小于 `memory` 最大容量，仅仅修改当前容量，无需进行扩容。否则，第【第 47 行】的代码，进行**扩容**。

  - 第 20 至 38 行：新容量小于当前容量，但是不到memory最大容量的一半，因为缩容相对释放不多，无需进行缩容。否则，第【第 47 行】的代码，进行缩容

    - 比较神奇的是【第 26 行】的 `newCapacity > maxLength - 16` 代码块。 笔者的理解是，Netty SubPage **最小**是 16 B ，如果小于等 16 ，无法缩容。

- 第 47 行：调用 `PoolArena#reallocate(PooledByteBuf<T> buf, int newCapacity, boolean freeOldMemory)` 方法，**重新分配**新的内存空间，并将数据**复制**到其中。并且，**释放**老的内存空间。详细解析，见 [《TODO 1013 Chunk》](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 中。

### 2.1.5 order

`#order()` 方法，返回字节序为 `ByteOrder.BIG_ENDIAN` 大端。代码如下：

```java
@Override
public final ByteOrder order() {
    return ByteOrder.BIG_ENDIAN;
}
```

统一**大端**模式。

> FROM [《深入浅出： 大小端模式》](https://www.bysocket.com/?p=615)
>
> 在网络上传输数据时，由于数据传输的两端对应不同的硬件平台，采用的存储字节顺序可能不一致。所以在 TCP/IP 协议规定了在网络上必须采用网络字节顺序，也就是大端模式。

### 2.1.6 unwrap

`#unwrap()` 方法，返回空，因为没有被装饰的 ByteBuffer 对象。代码如下：

```java
@Override
public final ByteBuf unwrap() {
    return null;
}
```

### 2.1.7 retainedSlice

`#retainedSlice()` 方法，代码如下：

```java
@Override
public final ByteBuf retainedSlice() {
    final int index = readerIndex();
    return retainedSlice(index, writerIndex() - index);
}

@Override
public final ByteBuf retainedSlice(int index, int length) {
    return PooledSlicedByteBuf.newInstance(this, this, index, length);
}
```

- 调用 `PooledSlicedByteBuf#newInstance(AbstractByteBuf unwrapped, ByteBuf wrapped, int index, int length)` 方法，创建**池化的** PooledSlicedByteBuf 对象。
- TODO 1016 派生类

### 2.1.8 retainedDuplicate

`#retainedDuplicate()` 方法，代码如下：

```java
@Override
public final ByteBuf retainedDuplicate() {
    return PooledDuplicatedByteBuf.newInstance(this, this, readerIndex(), writerIndex());
}
```

- 调用 `PooledSlicedByteBuf#newInstance(AbstractByteBuf unwrapped, ByteBuf wrapped, int readerIndex, int writerIndex)` 方法，创建**池化的** PooledDuplicatedByteBuf.newInstance 对象。
- TODO 1016 派生类

### 2.1.9 internalNioBuffer

`#internalNioBuffer()` 方法，获得临时 ByteBuf 对象( `tmpNioBuf` ) 。代码如下：

```java
protected final ByteBuffer internalNioBuffer() {
    ByteBuffer tmpNioBuf = this.tmpNioBuf;
    // 为空，创建临时 ByteBuf 对象
    if (tmpNioBuf == null) {
        this.tmpNioBuf = tmpNioBuf = newInternalNioBuffer(memory);
    }
    return tmpNioBuf;
}
```

- 当 `tmpNioBuf` 属性为空时，调用 `#newInternalNioBuffer(T memory)` 方法，创建 ByteBuffer 对象。因为 `memory` 的类型不确定，所以该方法定义成**抽象方法**，由子类实现。代码如下：

  ```java
  protected abstract ByteBuffer newInternalNioBuffer(T memory);
  ```

------

为什么要有 `tmpNioBuf` 这个属性呢？以 PooledDirectByteBuf 举例子，代码如下：

```java
@Override
public int setBytes(int index, FileChannel in, long position, int length) throws IOException {
    checkIndex(index, length);
    // 获得临时 ByteBuf 对象
    ByteBuffer tmpBuf = internalNioBuffer();
    index = idx(index);
    tmpBuf.clear().position(index).limit(index + length);
    try {
        // 写入临时 ByteBuf 对象
        return in.read(tmpBuf, position);
    } catch (ClosedChannelException ignored) {
        return -1;
    }
}

private int getBytes(int index, FileChannel out, long position, int length, boolean internal) throws IOException {
    checkIndex(index, length);
    if (length == 0) {
        return 0;
    }

    // 获得临时 ByteBuf 对象
    ByteBuffer tmpBuf = internal ? internalNioBuffer() : memory.duplicate();
    index = idx(index);
    tmpBuf.clear().position(index).limit(index + length);
    // 写入到 FileChannel 中
    return out.write(tmpBuf, position);
}
```

### 2.1.10 deallocate

`#deallocate()` 方法，当引用计数为 0 时，调用该方法，进行内存回收。代码如下：

```java
@Override
protected final void deallocate() {
    if (handle >= 0) {
        // 重置属性
        final long handle = this.handle;
        this.handle = -1;
        memory = null;
        tmpNioBuf = null;
        // 释放内存回 Arena 中
        chunk.arena.free(chunk, handle, maxLength, cache);
        chunk = null;
        // 回收对象
        recycle();
    }
}

private void recycle() {
    recyclerHandle.recycle(this); // 回收对象
}
```

### 2.1.11 idx

`#idx(int index)` 方法，获得指定位置在 `memory` 变量中的位置。代码如下：

```java
protected final int idx(int index) {
    return offset + index;
}
```

## 2.2 PooledDirectByteBuf

`io.netty.buffer.PooledDirectByteBuf` ，实现 PooledByteBuf 抽象类，基于 **ByteBuffer** 的**可重用** ByteBuf 实现类。所以，泛型 `T` 为 ByteBuffer ，即：

```java
final class PooledDirectByteBuf extends PooledByteBuf<ByteBuffer>
```

### 2.2.1 构造方法

```java
private PooledDirectByteBuf(Recycler.Handle<PooledDirectByteBuf> recyclerHandle, int maxCapacity) {
    super(recyclerHandle, maxCapacity);
}
```

### 2.2.2 newInstance

`#newInstance(int maxCapacity)` **静态**方法，“创建” PooledDirectByteBuf 对象。代码如下：

```java
/**
 * Recycler 对象
 */
private static final Recycler<PooledDirectByteBuf> RECYCLER = new Recycler<PooledDirectByteBuf>() {

    @Override
    protected PooledDirectByteBuf newObject(Handle<PooledDirectByteBuf> handle) {
        return new PooledDirectByteBuf(handle, 0); // 真正创建 PooledDirectByteBuf 对象
    }

};

static PooledDirectByteBuf newInstance(int maxCapacity) {
    // 从 Recycler 的对象池中获得 PooledDirectByteBuf 对象
    PooledDirectByteBuf buf = RECYCLER.get();
    // 重置 PooledDirectByteBuf 的属性
    buf.reuse(maxCapacity);
    return buf;
}
```

### 2.2.3 newInternalNioBuffer

`#newInternalNioBuffer(ByteBuffer memory)` 方法，获得临时 ByteBuf 对象( `tmpNioBuf` ) 。代码如下：

```java
@Override
protected ByteBuffer newInternalNioBuffer(ByteBuffer memory) {
    return memory.duplicate();
}
```

- 调用 `ByteBuffer#duplicate()` 方法，复制一个 ByteBuffer 对象，**共享**里面的数据。

### 2.2.4 isDirect

`#isDirect()` 方法，获得内部类型是否为 Direct ，返回 `true` 。代码如下：

```java
@Override
public boolean isDirect() {
    return true;
}
```

### 2.2.5 读取 / 写入操作

老样子，我们以 Int 类型为例子，来看看它的读取和写入操作的实现代码。代码如下：

```java
@Override
protected int _getInt(int index) {
    return memory.getInt(idx(index));
}

@Override
protected void _setInt(int index, int value) {
    memory.putInt(idx(index), value);
}
```

### 2.2.6 copy

`#copy(int index, int length)` 方法，复制指定范围的数据到新创建的 Direct ByteBuf 对象。代码如下：

```java
@Override
public ByteBuf copy(int index, int length) {
    // 校验索引
    checkIndex(index, length);
    // 创建一个 Direct ByteBuf 对象
    ByteBuf copy = alloc().directBuffer(length, maxCapacity());
    // 写入数据
    copy.writeBytes(this, index, length);
    return copy;
}
```

### 2.2.7 转换 NIO ByteBuffer 操作

#### 2.2.7.1 nioBufferCount

`#nioBufferCount()` 方法，返回 ByteBuf 包含 ByteBuffer 数量为 **1** 。代码如下：

```java
@Override
public int nioBufferCount() {
    return 1;
}
```

#### 2.2.7.2 nioBuffer

`#nioBuffer(int index, int length)` 方法，返回 ByteBuf **指定范围**包含的 ByteBuffer 对象( **共享** )。代码如下：

```java
@Override
public ByteBuffer nioBuffer(int index, int length) {
    checkIndex(index, length);
    // memory 中的开始位置
    index = idx(index);
    // duplicate 复制一个 ByteBuffer 对象，共享数据
    // position + limit 设置位置和大小限制
    // slice 创建 [position, limit] 子缓冲区，共享数据
    return ((ByteBuffer) memory.duplicate().position(index).limit(index + length)).slice();
}
```

- 代码比较简单，看具体注释。

#### 2.2.7.3 nioBuffers

`#nioBuffers(int index, int length)` 方法，返回 ByteBuf **指定范围**内包含的 ByteBuffer 数组( **共享** )。代码如下：

```java
@Override
public ByteBuffer[] nioBuffers(int index, int length) {
    return new ByteBuffer[] { nioBuffer(index, length) };
}
```

- 在 `#nioBuffer(int index, int length)` 方法的基础上，创建大小为 1 的 ByteBuffer 数组。

#### 2.2.7.4 internalNioBuffer

`#internalNioBuffer(int index, int length)` 方法，返回 ByteBuf **指定范围**内的 ByteBuffer 对象( **共享** )。代码如下：

```java
@Override
public ByteBuffer internalNioBuffer(int index, int length) {
    checkIndex(index, length);
    // memory 中的开始位置
    index = idx(index);
    // clear 标记清空（不会清理数据）
    // position + limit 设置位置和大小限制
    return (ByteBuffer) internalNioBuffer().clear().position(index).limit(index + length);
}
```

- 代码比较简单，看具体注释。
- 因为是基于 `tmpNioBuf` 属性实现，所以方法在命名上，以 `"internal"` 打头。

### 2.2.8 Heap 相关方法

不支持 Heap 相关方法。代码如下：

```java
@Override
public boolean hasArray() {
    return false;
}

@Override
public byte[] array() {
    throw new UnsupportedOperationException("direct buffer");
}

@Override
public int arrayOffset() {
    throw new UnsupportedOperationException("direct buffer");
}
```

### 2.2.9 Unsafe 相关方法

不支持 Unsafe 相关方法。代码如下：

```java
@Override
public boolean hasMemoryAddress() {
    return false;
}

@Override
public long memoryAddress() {
    throw new UnsupportedOperationException();
}
```

## 2.3 PooledHeapByteBuf

`io.netty.buffer.PooledHeapByteBuf` ，实现 PooledByteBuf 抽象类，基于 **ByteBuffer** 的**可重用** ByteBuf 实现类。所以，泛型 `T` 为 `byte[]` ，即：

```java
class PooledHeapByteBuf extends PooledByteBuf<byte[]> {
```

### 2.3.1 构造方法

和 [「2.2.1 构造方法」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 相同。

### 2.3.2 newInstance

和 [「2.2.2 newInstance」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 相同。

### 2.3.3 newInternalNioBuffer

`#newInternalNioBuffer(byte[] memory)` 方法，获得临时 ByteBuf 对象( `tmpNioBuf` ) 。代码如下：

```java
@Override
protected final ByteBuffer newInternalNioBuffer(byte[] memory) {
    return ByteBuffer.wrap(memory);
}
```

- 调用 `ByteBuffer#wrap(byte[] array)` 方法，创建 ByteBuffer 对象。注意，返回的是 HeapByteBuffer 对象。

### 2.3.4 isDirect

`#isDirect()` 方法，获得内部类型是否为 Direct ，返回 `false` 。代码如下：

```java
@Override
public boolean isDirect() {
    return false;
}
```

### 2.3.5 读取 / 写入操作

老样子，我们以 Int 类型为例子，来看看它的读取和写入操作的实现代码。

① **读取**操作：

```java
@Override
protected int _getInt(int index) {
    return HeapByteBufUtil.getInt(memory, idx(index));
}

// HeapByteBufUtil.java
static int getInt(byte[] memory, int index) {
    return  (memory[index]     & 0xff) << 24 |
            (memory[index + 1] & 0xff) << 16 |
            (memory[index + 2] & 0xff) <<  8 |
            memory[index + 3] & 0xff;
}
```

② **写入**操作：

```java
@Override
protected void _setInt(int index, int   value) {
    HeapByteBufUtil.setInt(memory, idx(index), value);
}

// HeapByteBufUtil.java
static void setInt(byte[] memory, int index, int value) {
    memory[index]     = (byte) (value >>> 24);
    memory[index + 1] = (byte) (value >>> 16);
    memory[index + 2] = (byte) (value >>> 8);
    memory[index + 3] = (byte) value;
}
```

### 2.3.6 copy

`#copy(int index, int length)` 方法，复制指定范围的数据到新创建的 Heap ByteBuf 对象。代码如下：

```java
@Override
public ByteBuf copy(int index, int length) {
    // 校验索引
    checkIndex(index, length);
    // 创建一个 Heap ByteBuf 对象
    ByteBuf copy = alloc().heapBuffer(length, maxCapacity());
    // 写入数据
    copy.writeBytes(this, index, length);
    return copy;
}
```

和 PooledDirectByteBuf [「2.2.6 copy」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 的差异在于，创建的是 **Heap** ByteBuf 对象。

### 2.3.7 转换 NIO ByteBuffer 操作

#### 2.3.7.1 nioBufferCount

和 [「2.2.7.1 nioBufferCount」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 一致。

#### 2.3.7.2 nioBuffer

`#nioBuffer(int index, int length)` 方法，返回 ByteBuf **指定范围**包含的 ByteBuffer 对象( **共享** )。代码如下：

```java
@Override
public final ByteBuffer nioBuffer(int index, int length) {
    checkIndex(index, length);
    // memory 中的开始位置
    index = idx(index);
    // 创建 ByteBuffer 对象
    ByteBuffer buf =  ByteBuffer.wrap(memory, index, length);
    // slice 创建 [position, limit] 子缓冲区
    return buf.slice();
}
```

- 代码比较简单，看具体注释。

#### 2.3.7.3 nioBuffers

和 [「2.2.7.3 nioBuffers」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 一致。

#### 2.3.7.4 internalNioBuffer

和 [「2.2.7.4 nioBuffers」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 一致。

### 2.3.8 Heap 相关方法

```java
@Override
public final boolean hasArray() {
    return true;
}

@Override
public final byte[] array() {
    ensureAccessible();
    return memory;
}

@Override
public final int arrayOffset() {
    return offset;
}
```

### 2.3.8 Unsafe 相关方法

和 [「2.2.9 Unsafe 相关方法」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 一致。

## 2.4 PooledUnsafeDirectByteBuf

> 老艿艿：它是 [「2.2 PooledDirectByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 对应的基于 Unsafe 版本的实现类。

`io.netty.buffer.PooledUnsafeDirectByteBuf` ，实现 PooledByteBuf 抽象类，基于 **ByteBuffer** + **Unsafe** 的**可重用** ByteBuf 实现类。所以，泛型 `T` 为 `ByteBuffer` ，即：

```java
final class PooledUnsafeDirectByteBuf extends PooledByteBuf<ByteBuffer>
```

### 2.4.1 构造方法

和 [「2.2.1 构造方法」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 相同。

### 2.4.2 newInstance

和 [「2.2.2 newInstance」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 相同。

### 2.4.3 初始化

PooledUnsafeDirectByteBuf 重写了初始化相关的方法，代码如下：

```java
@Override
void init(PoolChunk<ByteBuffer> chunk, long handle, int offset, int length, int maxLength,
          PoolThreadCache cache) {
    // 调用父初始化方法
    super.init(chunk, handle, offset, length, maxLength, cache);
    // 初始化内存地址
    initMemoryAddress(); // <1>
}

@Override
void initUnpooled(PoolChunk<ByteBuffer> chunk, int length) {
    // 调用父初始化方法
    super.initUnpooled(chunk, length);
    // 初始化内存地址
    initMemoryAddress(); // <2>
}
```

- 在 `<1>` 处，增加调用 `#initMemoryAddress()` 方法，初始化内存地址。代码如下：

  ```java
  /**
   * 内存地址
   */
  private long memoryAddress;
  
  private void initMemoryAddress() {
      memoryAddress = PlatformDependent.directBufferAddress(memory) + offset; // <2>
  }
  ```

  - 调用 `PlatformDependent#directBufferAddress(ByteBuffer buffer)` 方法，获得 ByteBuffer 对象的起始内存地址。代码如下：

    ```java
    // PlatformDependent.java
    public static long directBufferAddress(ByteBuffer buffer) {
        return PlatformDependent0.directBufferAddress(buffer);
    }
    
    // PlatformDependent0.java
    static final Unsafe UNSAFE;
    
    static long directBufferAddress(ByteBuffer buffer) {
        return getLong(buffer, ADDRESS_FIELD_OFFSET);
    }
    
    private static long getLong(Object object, long fieldOffset) {
        return UNSAFE.getLong(object, fieldOffset);
    }
    ```

    - 对于 Unsafe 类不熟悉的胖友，可以看看 [《Java Unsafe 类》](https://blog.csdn.net/zhxdick/article/details/52003123)

  - 注意，`<2>` 处的代码，已经将 `offset` 添加到 `memoryAddress` 中。所以在 `#addr(int index)` 方法中，求指定位置( `index` ) 在内存地址的顺序，不用再添加。代码如下：

    ```java
    private long addr(int index) {
        return memoryAddress + index;
    }
    ```

    - x

### 2.4.4 newInternalNioBuffer

和 [「2.2.3 newInternalNioBuffer」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 相同。

### 2.4.5 isDirect

和 [「2.2.4 isDirect」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 相同。

### 2.4.6 读取 / 写入操作

老样子，我们以 Int 类型为例子，来看看它的读取和写入操作的实现代码。

① **读取**操作：

```java
@Override
protected int _getInt(int index) {
    return UnsafeByteBufUtil.getInt(addr(index));
}

// UnsafeByteBufUtil.java
static int getInt(long address) {
    if (UNALIGNED) {
        int v = PlatformDependent.getInt(address);
        return BIG_ENDIAN_NATIVE_ORDER ? v : Integer.reverseBytes(v);
    }
    return PlatformDependent.getByte(address) << 24 |
           (PlatformDependent.getByte(address + 1) & 0xff) << 16 |
           (PlatformDependent.getByte(address + 2) & 0xff) <<  8 |
           PlatformDependent.getByte(address + 3)  & 0xff;
}

// PlatformDependent.java
public static int getInt(long address) {
    return PlatformDependent0.getInt(address);
}

// PlatformDependent0.java
static int getInt(long address) {
    return UNSAFE.getInt(address);
}
```

② **写入**操作：

```java
@Override
protected void _setInt(int index, int value) {
    UnsafeByteBufUtil.setInt(addr(index), value);
}

// UnsafeByteBufUtil.java
static void setInt(long address, int value) {
    if (UNALIGNED) {
        PlatformDependent.putInt(address, BIG_ENDIAN_NATIVE_ORDER ? value : Integer.reverseBytes(value));
    } else {
        PlatformDependent.putByte(address, (byte) (value >>> 24));
        PlatformDependent.putByte(address + 1, (byte) (value >>> 16));
        PlatformDependent.putByte(address + 2, (byte) (value >>> 8));
        PlatformDependent.putByte(address + 3, (byte) value);
    }
}

// PlatformDependent.java
public static void putInt(long address, int value) {
    PlatformDependent0.putInt(address, value);
}

// PlatformDependent0.java
static void putInt(long address, int value) {
    UNSAFE.putInt(address, value);
}
```

### 2.4.7 copy

`#copy(int index, int length)` 方法，复制指定范围的数据到新创建的 Direct ByteBuf 对象。代码如下：

```java
@Override
public ByteBuf copy(int index, int length) {
    return UnsafeByteBufUtil.copy(this, addr(index), index, length);
}

// UnsafeByteBufUtil.java
static ByteBuf copy(AbstractByteBuf buf, long addr, int index, int length) {
    buf.checkIndex(index, length);
    // 创建 Direct ByteBuffer 对象
    ByteBuf copy = buf.alloc().directBuffer(length, buf.maxCapacity());
    if (length != 0) {
        if (copy.hasMemoryAddress()) {
            // 使用 Unsafe 操作来复制
            PlatformDependent.copyMemory(addr, copy.memoryAddress(), length);
            copy.setIndex(0, length);
        } else {
            copy.writeBytes(buf, index, length);
        }
    }
    return copy;
}

// PlatformDependent.java
public static void copyMemory(long srcAddr, long dstAddr, long length) {
    PlatformDependent0.copyMemory(srcAddr, dstAddr, length);
}

// PlatformDependent0.java
static void copyMemory(long srcAddr, long dstAddr, long length) {
    //UNSAFE.copyMemory(srcAddr, dstAddr, length);
    while (length > 0) {
        long size = Math.min(length, UNSAFE_COPY_THRESHOLD);
        UNSAFE.copyMemory(srcAddr, dstAddr, size);
        length -= size;
        srcAddr += size;
        dstAddr += size;
    }
}
```

### 2.4.8 转换 NIO ByteBuffer 操作

#### 2.4.8.1 nioBufferCount

和 [「2.2.7.1 nioBufferCount」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 一致。

#### 2.4.8.2 nioBuffer

和 [「2.2.7.2 nioBuffer」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 一致。

#### 2.4.8.3 nioBuffers

和 [「2.2.7.3 nioBuffers」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 一致。

#### 2.4.8.4 internalNioBuffer

和 [「2.2.7.4 internalNioBuffer」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 一致。

### 2.4.9 Heap 相关方法

不支持 Heap 相关方法。

### 2.4.10 Unsafe 相关方法。

```java
@Override
public boolean hasMemoryAddress() {
    return true;
}

@Override
public long memoryAddress() {
    ensureAccessible();
    return memoryAddress;
}
```

### 2.4.11 newSwappedByteBuf

> `#newSwappedByteBuf()` 方法的**重写**，是 Unsafe 类型独有的。

`#newSwappedByteBuf()` 方法，创建 SwappedByteBuf 对象。代码如下：

```java
@Override
protected SwappedByteBuf newSwappedByteBuf() {
    if (PlatformDependent.isUnaligned()) { // 支持
        // Only use if unaligned access is supported otherwise there is no gain.
        return new UnsafeDirectSwappedByteBuf(this);
    }
    return super.newSwappedByteBuf();
}
```

- 对于 Linux 环境下，一般是支持 unaligned access( 对齐访问 )，所以返回的是 UnsafeDirectSwappedByteBuf 对象。详细解析，见 [《TODO 1016 派生类》](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 。
- 为什么要对齐访问呢？可看 [《什么是字节对齐，为什么要对齐?》](https://www.zhihu.com/question/23791224) 。有趣。

## 2.5 PooledUnsafeHeapByteBuf

`io.netty.buffer.PooledUnsafeHeapByteBuf` ，实现 PooledHeapByteBuf 类，在 [「2.3 PooledHeapByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 的基础上，基于 **Unsafe** 的**可重用** ByteBuf 实现类。所以，泛型 `T` 为 `byte[]` ，即：

```java
final class PooledUnsafeHeapByteBuf extends PooledHeapByteBuf
```

也因此，PooledUnsafeHeapByteBuf 需要实现的方法，灰常少。

### 2.5.1 构造方法

和 [「2.2.1 构造方法」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 相同。

### 2.5.2 newInstance

和 [「2.2.2 newInstance」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 相同。

### 2.5.3 读取 / 写入操作

老样子，我们以 Int 类型为例子，来看看它的读取和写入操作的实现代码。

① **读取**操作：

```java
@Override
protected int _getInt(int index) {
    return UnsafeByteBufUtil.getInt(memory, idx(index));
}

// UnsafeByteBufUtil.java
static int getInt(byte[] array, int index) {
    if (UNALIGNED) {
        int v = PlatformDependent.getInt(array, index);
        return BIG_ENDIAN_NATIVE_ORDER ? v : Integer.reverseBytes(v);
    }
    return PlatformDependent.getByte(array, index) << 24 |
           (PlatformDependent.getByte(array, index + 1) & 0xff) << 16 |
           (PlatformDependent.getByte(array, index + 2) & 0xff) <<  8 |
           PlatformDependent.getByte(array, index + 3) & 0xff;
}

// PlatformDependent.java
public static int getInt(byte[] data, int index) {
    return PlatformDependent0.getInt(data, index);
}

// PlatformDependent0.java
static int getInt(byte[] data, int index) {
    return UNSAFE.getInt(data, BYTE_ARRAY_BASE_OFFSET + index);
}
```

- 基于 Unsafe 操作 `byte[]` 数组。

② **写入**操作：

```java
@Override
protected void _setInt(int index, int value) {
    UnsafeByteBufUtil.setInt(memory, idx(index), value);
}

// UnsafeByteBufUtil.java
static void setInt(byte[] array, int index, int value) {
    if (UNALIGNED) {
        PlatformDependent.putInt(array, index, BIG_ENDIAN_NATIVE_ORDER ? value : Integer.reverseBytes(value));
    } else {
        PlatformDependent.putByte(array, index, (byte) (value >>> 24));
        PlatformDependent.putByte(array, index + 1, (byte) (value >>> 16));
        PlatformDependent.putByte(array, index + 2, (byte) (value >>> 8));
        PlatformDependent.putByte(array, index + 3, (byte) value);
    }
}

// PlatformDependent.java
public static void putInt(byte[] data, int index, int value) {
    PlatformDependent0.putInt(data, index, value);
}

// PlatformDependent0.java
static void putInt(byte[] data, int index, int value) {
    UNSAFE.putInt(data, BYTE_ARRAY_BASE_OFFSET + index, value);
}
```

### 2.5.4 newSwappedByteBuf

> `#newSwappedByteBuf()` 方法的**重写**，是 Unsafe 类型独有的。

`#newSwappedByteBuf()` 方法，创建 SwappedByteBuf 对象。代码如下：

```java
@Override
@Deprecated
protected SwappedByteBuf newSwappedByteBuf() {
    if (PlatformDependent.isUnaligned()) {
        // Only use if unaligned access is supported otherwise there is no gain.
        return new UnsafeHeapSwappedByteBuf(this);
    }
    return super.newSwappedByteBuf();
}
```

- 对于 Linux 环境下，一般是支持 unaligned access( 对齐访问 )，所以返回的是 UnsafeHeapSwappedByteBuf 对象。详细解析，见 [《TODO 1016 派生类》](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 。

# 3. UnpooledByteBuf

😈 不存在 UnpooledByteBuf 这样一个类，主要是为了**聚合**所有 Unpooled 类型的 ByteBuf 实现类。

## 3.1 UnpooledDirectByteBuf

`io.netty.buffer.UnpooledDirectByteBuf` ，实现 AbstractReferenceCountedByteBuf 抽象类，对应 [「2.2 PooledDirectByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 的**非池化** ByteBuf 实现类。

### 3.1.1 构造方法

```java
/**
 * ByteBuf 分配器对象
 */
private final ByteBufAllocator alloc;

/**
 * 数据 ByteBuffer 对象
 */
private ByteBuffer buffer;
/**
 * 临时 ByteBuffer 对象
 */
private ByteBuffer tmpNioBuf;
/**
 * 容量
 */
private int capacity;
/**
 * 是否需要释放 <1>
 *
 * 如果 {@link #buffer} 从外部传入，则需要进行释放，即 {@link #UnpooledDirectByteBuf(ByteBufAllocator, ByteBuffer, int)} 构造方法。
 */
private boolean doNotFree;

public UnpooledDirectByteBuf(ByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
    // 设置最大容量
    super(maxCapacity);
    if (alloc == null) {
        throw new NullPointerException("alloc");
    }
    if (initialCapacity < 0) {
        throw new IllegalArgumentException("initialCapacity: " + initialCapacity);
    }
    if (maxCapacity < 0) {
        throw new IllegalArgumentException("maxCapacity: " + maxCapacity);
    }
    if (initialCapacity > maxCapacity) {
        throw new IllegalArgumentException(String.format("initialCapacity(%d) > maxCapacity(%d)", initialCapacity, maxCapacity));
    }

    this.alloc = alloc;

    // 创建 Direct ByteBuffer 对象
    // 设置数据 ByteBuffer 对象
    setByteBuffer(ByteBuffer.allocateDirect(initialCapacity));
}

protected UnpooledDirectByteBuf(ByteBufAllocator alloc, ByteBuffer initialBuffer, int maxCapacity) {
    // 设置最大容量
    super(maxCapacity);
    if (alloc == null) {
        throw new NullPointerException("alloc");
    }
    if (initialBuffer == null) {
        throw new NullPointerException("initialBuffer");
    }
    if (!initialBuffer.isDirect()) { // 必须是 Direct
        throw new IllegalArgumentException("initialBuffer is not a direct buffer.");
    }
    if (initialBuffer.isReadOnly()) { // 必须可写
        throw new IllegalArgumentException("initialBuffer is a read-only buffer.");
    }

    // 获得剩余可读字节数，作为初始容量大小 <2>
    int initialCapacity = initialBuffer.remaining();
    if (initialCapacity > maxCapacity) {
        throw new IllegalArgumentException(String.format(
                "initialCapacity(%d) > maxCapacity(%d)", initialCapacity, maxCapacity));
    }

    this.alloc = alloc;

    // 标记为 true 。因为 initialBuffer 是从外部传递进来，释放的工作，不交给当前 UnpooledDirectByteBuf 对象。
    doNotFree = true; <1>

    // slice 切片
    // 设置数据 ByteBuffer 对象
    setByteBuffer(initialBuffer.slice().order(ByteOrder.BIG_ENDIAN));
    // 设置写索引 <2>
    writerIndex(initialCapacity);
}
```

- 代码比较简单，主要要理解下 `<1>` 和 `<2>` 两处。

- 调用 `#allocateDirect(int initialCapacity)` 方法，创建 Direct ByteBuffer 对象。代码如下：

  ```java
  protected ByteBuffer allocateDirect(int initialCapacity) {
      return ByteBuffer.allocateDirect(initialCapacity);
  }
  ```

- 调用 `#setByteBuffer(ByteBuffer buffer)` 方法，设置数据 ByteBuffer 对象。如果有老的**自己的**( 指的是自己创建的 ) `buffer` 对象，需要进行释放。代码如下：

  ```java
  private void setByteBuffer(ByteBuffer buffer) {
      ByteBuffer oldBuffer = this.buffer;
      if (oldBuffer != null) {
          // 标记为 false 。因为设置的 ByteBuffer 对象，是 UnpooledDirectByteBuf 自己创建的
          if (doNotFree) {
              doNotFree = false;
          } else {
              // 释放老的 buffer 对象
              freeDirect(oldBuffer); // <3>
          }
      }
  
      // 设置 buffer
      this.buffer = buffer;
      // 重置 tmpNioBuf 为 null
      tmpNioBuf = null;
      // 设置容量
      capacity = buffer.remaining();
  }
  ```

  - `<3>` 处，调用 `#freeDirect(ByteBuffer buffer)` 方法，释放**老的** `buffer` 对象。详细解析，见 [「3.1.3 deallocate」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 。

### 3.1.2 capacity

`#capacity()` 方法，获得容量。代码如下：

```java
@Override
public int capacity() {
    return capacity;
}
```

------

`#capacity(int newCapacity)` 方法，调整容量大小。在这个过程中，根据情况，可能对 `buffer` 扩容或缩容。代码如下：

```java
@SuppressWarnings("Duplicates")
@Override
public ByteBuf capacity(int newCapacity) {
    // 校验新的容量，不能超过最大容量
    checkNewCapacity(newCapacity);

    int readerIndex = readerIndex();
    int writerIndex = writerIndex();

    int oldCapacity = capacity;
    // 扩容
    if (newCapacity > oldCapacity) {
        ByteBuffer oldBuffer = buffer;
        // 创建新的 Direct ByteBuffer 对象
        ByteBuffer newBuffer = allocateDirect(newCapacity);
        // 复制数据到新的 buffer 对象
        oldBuffer.position(0).limit(oldBuffer.capacity());
        newBuffer.position(0).limit(oldBuffer.capacity());
        newBuffer.put(oldBuffer);
        newBuffer.clear(); // 因为读取和写入，使用 readerIndex 和 writerIndex ，所以没关系。
        // 设置新的 buffer 对象，并根据条件释放老的 buffer 对象
        setByteBuffer(newBuffer);
    // 缩容
    } else if (newCapacity < oldCapacity) {
        ByteBuffer oldBuffer = buffer;
        // 创建新的 Direct ByteBuffer 对象
        ByteBuffer newBuffer = allocateDirect(newCapacity);
        if (readerIndex < newCapacity) {
            // 如果写索引超过新容量，需要重置下，设置为最大容量。否则就越界了。
            if (writerIndex > newCapacity) {
                writerIndex(writerIndex = newCapacity);
            }
            // 复制数据到新的 buffer 对象
            oldBuffer.position(readerIndex).limit(writerIndex);
            newBuffer.position(readerIndex).limit(writerIndex);
            newBuffer.put(oldBuffer);
            newBuffer.clear(); // 因为读取和写入，使用 readerIndex 和 writerIndex ，所以没关系。
        } else {
            // 因为读索引超过新容量，所以写索引超过新容量
            // 如果读写索引都超过新容量，需要重置下，都设置为最大容量。否则就越界了。
            setIndex(newCapacity, newCapacity);
            // 这里要注意下，老的数据，相当于不进行复制，因为已经读取完了。
        }
        // 设置新的 buffer 对象，并根据条件释放老的 buffer 对象
        setByteBuffer(newBuffer);
    }
    return this;
}
```

- 虽然代码比较长，实际很简单。胖友自己耐心看下注释进行理解下噢。

### 3.1.3 deallocate

`#deallocate()` 方法，当引用计数为 0 时，调用该方法，进行内存回收。代码如下：

```java
@Override
protected void deallocate() {
    ByteBuffer buffer = this.buffer;
    if (buffer == null) {
        return;
    }
    // 置空 buffer 属性
    this.buffer = null;

    // 释放 buffer 对象
    if (!doNotFree) {
        freeDirect(buffer);
    }
}
```

- `#freeDirect(ByteBuffer buffer)` 方法，释放 `buffer` 对象。代码如下：

  ```java
  protected void freeArray(byte[] array) {
      PlatformDependent.freeDirectBuffer(buffer);
  }
  
  // PlatformDependent.java
  private static final Cleaner NOOP = new Cleaner() { ... }
  
  public static void freeDirectBuffer(ByteBuffer buffer) {
      CLEANER.freeDirectBuffer(buffer);
  }
  ```

  - 通过调用 `io.netty.util.internal.Cleaner#freeDirectBuffer(ByteBuffer buffer)` 方法，释放 Direct ByteBuffer 对象。因为 Java 的版本不同，调用的方法，所以 Cleaner 有两个 实现类：
  - `io.netty.util.internal.CleanerJava9` ，适用于 Java9+ 的版本，通过反射调用 DirectByteBuffer 对象的 `#invokeCleaner()` 方法，进行释放。
  - `io.netty.util.internal.CleanerJava6` ，适用于 Java6+ 的版本，通过反射获得 DirectByteBuffer 对象的 `#cleaner()` 方法，从而调用 `sun.misc.Cleaner#clean()` 方法，进行释放。
  - 虽然实现略有不同，但是原理是一致的。感兴趣的胖友，自己看下 CleanerJava9 和 CleanerJava6 的实现代码。

### 3.1.4 其它方法

其他方法，和 [「2.2 PooledDirectByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 基本一致。

## 3.2 UnpooledHeapByteBuf

`io.netty.buffer.UnpooledHeapByteBuf` ，实现 AbstractReferenceCountedByteBuf 抽象类，对应 [「2.3 PooledHeapByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 的**非池化** ByteBuf 实现类。

### 3.2.1 构造方法

```java
/**
 * ByteBuf 分配器对象
 */
private final ByteBufAllocator alloc;
/**
 * 字节数组
 */
byte[] array;
/**
 * 临时 ByteBuff 对象
 */
private ByteBuffer tmpNioBuf;

public UnpooledHeapByteBuf(ByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
    // 设置最大容量
    super(maxCapacity);

    checkNotNull(alloc, "alloc");

    if (initialCapacity > maxCapacity) {
        throw new IllegalArgumentException(String.format(
                "initialCapacity(%d) > maxCapacity(%d)", initialCapacity, maxCapacity));
    }

    this.alloc = alloc;

    // 创建并设置字节数组
    setArray(allocateArray(initialCapacity));

    // 设置读写索引
    setIndex(0, 0);
}

protected UnpooledHeapByteBuf(ByteBufAllocator alloc, byte[] initialArray, int maxCapacity) {
    // 设置最大容量
    super(maxCapacity);

    checkNotNull(alloc, "alloc");
    checkNotNull(initialArray, "initialArray");

    if (initialArray.length > maxCapacity) {
        throw new IllegalArgumentException(String.format(
                "initialCapacity(%d) > maxCapacity(%d)", initialArray.length, maxCapacity));
    }

    this.alloc = alloc;

    // 设置字节数组
    setArray(initialArray);

    // 设置读写索引
    setIndex(0, initialArray.length);
}
```

- 第一、二个构造方法的区别，后者字节数组是否从方法参数( `initialArray` )传递进来。

- 调用 `#allocateArray(int initialCapacity)` 方法，创建字节数组。

  ```java
  protected byte[] allocateArray(int initialCapacity) {
      return new byte[initialCapacity];
  }
  ```

- 调用 `#setArray(byte[] initialArray)` 方法，设置 `array` 属性。代码如下：

  ```java
      private void setArray(byte[] initialArray) {
          array = initialArray;
          tmpNioBuf = null;
      }
  ```
  
  ### 3.2.2 capacity
  
  `#capacity()` 方法，获得容量。代码如下：
  
  ```java
  @Override
  public int capacity() {
      return array.length;
  }
  ```

- 使用字节数组的大小，作为当前容量上限。

------

`#capacity(int newCapacity)` 方法，调整容量大小。在这个过程中，根据情况，可能对 `array` 扩容或缩容。代码如下：

```java
@Override
public ByteBuf capacity(int newCapacity) {
    // // 校验新的容量，不能超过最大容量
    checkNewCapacity(newCapacity);

    int oldCapacity = array.length;
    byte[] oldArray = array;

    // 扩容
    if (newCapacity > oldCapacity) {
        // 创建新数组
        byte[] newArray = allocateArray(newCapacity);
        // 复制【全部】数据到新数组
        System.arraycopy(oldArray, 0, newArray, 0, oldArray.length);
        // 设置数组
        setArray(newArray);
        // 释放老数组
        freeArray(oldArray);
    // 缩容
    } else if (newCapacity < oldCapacity) {
        // 创建新数组
        byte[] newArray = allocateArray(newCapacity);
        int readerIndex = readerIndex();
        if (readerIndex < newCapacity) {
            // 如果写索引超过新容量，需要重置下，设置为最大容量。否则就越界了。
            int writerIndex = writerIndex();
            if (writerIndex > newCapacity) {
                writerIndex(writerIndex = newCapacity);
            }
            // 只复制【读取段】数据到新数组
            System.arraycopy(oldArray, readerIndex, newArray, readerIndex, writerIndex - readerIndex);
        } else {
            // 因为读索引超过新容量，所以写索引超过新容量
            // 如果读写索引都超过新容量，需要重置下，都设置为最大容量。否则就越界了。
            setIndex(newCapacity, newCapacity);
            // 这里要注意下，老的数据，相当于不进行复制，因为已经读取完了。
        }
        // 设置数组
        setArray(newArray);
        // 释放老数组
        freeArray(oldArray);
    }
    return this;
}
```

- 虽然代码比较长，实际很简单。胖友自己耐心看下注释进行理解下噢。😈 和 [「3.1.2 capacity」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 基本一直的。

### 3.2.3 deallocate

`#deallocate()` 方法，当引用计数为 0 时，调用该方法，进行内存回收。代码如下：

```java
@Override
protected void deallocate() {
    // 释放老数组
    freeArray(array);
    // 设置为空字节数组
    array = EmptyArrays.EMPTY_BYTES;
}
```

- `#freeArray(byte[] array)` 方法，释放数组。代码如下：

  ```java
  protected void freeArray(byte[] array) {
      // NOOP
  }
  ```

  - 字节数组，无引用后，自然就会被 GC 回收。

### 3.2.4 其它方法

其它方法，和 [「2.3 PooledHeapByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 基本一致。

## 3.3 UnpooledUnsafeDirectByteBuf

`io.netty.buffer.UnpooledUnsafeDirectByteBuf` ，实现 AbstractReferenceCountedByteBuf 抽象类，对应 `「2.4 PooledUnsafeDirectByteBuf」` 的**非池化** ByteBuf 实现类。

- 构造方法、`#capacity(...)` 方法、`#deallocate()` 方法，和 [「3.1 PooledDirectByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 基本一致。
- 其它方法，和 [「2.4 PooledUnsafeDirectByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 基本一致。

另外，UnpooledUnsafeDirectByteBuf 有一个子类 UnpooledUnsafeNoCleanerDirectByteBuf ，用于 `netty-microbench` 模块，进行基准测试。感兴趣的胖友，可以自己看看。

## 3.4 UnpooledUnsafeHeapByteBuf

`io.netty.buffer.UnpooledUnsafeHeapByteBuf` ，实现 AbstractReferenceCountedByteBuf 抽象类，对应 `「2.5 PooledUnsafeHeapByteBuf」` 的**非池化** ByteBuf 实现类。

- 构造方法、`#capacity(...)` 方法、`#deallocate()` 方法，和 [「3.2 PooledHeapByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 基本一致。
- 其它方法，和 [「2.5 PooledUnsafeHeapByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/#) 基本一致。

## 3.5 ThreadLocal ByteBuf

> 老艿艿：这是本文的拓展内容。

虽然 UnpooledByteBuf 不基于**对象池**实现，但是考虑到 NIO Direct ByteBuffer 申请的成本是比较高的，所以基于 ThreadLocal + Recycler 实现重用。

`ByteBufUtil#threadLocalDirectBuffer()` 方法，创建 ThreadLocal ByteBuf 对象。代码如下：

```java
private static final int THREAD_LOCAL_BUFFER_SIZE;
static {
    THREAD_LOCAL_BUFFER_SIZE = SystemPropertyUtil.getInt("io.netty.threadLocalDirectBufferSize", 0);
}

/**
 * Returns a cached thread-local direct buffer, if available.
 *
 * @return a cached thread-local direct buffer, if available.  {@code null} otherwise.
 */
public static ByteBuf threadLocalDirectBuffer() {
    if (THREAD_LOCAL_BUFFER_SIZE <= 0) {
        return null;
    }

    if (PlatformDependent.hasUnsafe()) {
        return ThreadLocalUnsafeDirectByteBuf.newInstance();
    } else {
        return ThreadLocalDirectByteBuf.newInstance();
    }
}
```

- `THREAD_LOCAL_BUFFER_SIZE` **静态**属性，通过 `"io.netty.threadLocalDirectBufferSize"` 配置，默认为 0 。也就是说，实际 `#threadLocalDirectBuffer()` 方法，返回 `null` ，不开启 ThreadLocal ByteBuf 的功能。
- 根据是否支持 Unsafe 操作，创建 ThreadLocalUnsafeDirectByteBuf 或 ThreadLocalDirectByteBuf 对象。

### 3.5.1 ThreadLocalUnsafeDirectByteBuf

ThreadLocalUnsafeDirectByteBuf ，在 ByteBufUtil 的**内部静态类**，继承 UnpooledUnsafeDirectByteBuf 类。代码如下：

```java
static final class ThreadLocalUnsafeDirectByteBuf extends UnpooledUnsafeDirectByteBuf {

    /**
     * Recycler 对象
     */
    private static final Recycler<ThreadLocalUnsafeDirectByteBuf> RECYCLER =
            new Recycler<ThreadLocalUnsafeDirectByteBuf>() {
                @Override
                protected ThreadLocalUnsafeDirectByteBuf newObject(Handle<ThreadLocalUnsafeDirectByteBuf> handle) {
                    return new ThreadLocalUnsafeDirectByteBuf(handle);
                }
            };

    static ThreadLocalUnsafeDirectByteBuf newInstance() {
        // 从 RECYCLER 中，获得 ThreadLocalUnsafeDirectByteBuf 对象
        ThreadLocalUnsafeDirectByteBuf buf = RECYCLER.get();
        // 初始化 ref 为 1
        buf.setRefCnt(1);
        return buf;
    }

    /**
     * Recycler 处理器
     */
    private final Handle<ThreadLocalUnsafeDirectByteBuf> handle;

    private ThreadLocalUnsafeDirectByteBuf(Handle<ThreadLocalUnsafeDirectByteBuf> handle) {
        super(UnpooledByteBufAllocator.DEFAULT, 256, Integer.MAX_VALUE);
        this.handle = handle;
    }

    @Override
    protected void deallocate() {
        if (capacity() > THREAD_LOCAL_BUFFER_SIZE) { // <1>
            // 释放
            super.deallocate();
        } else {
            // 清空
            clear();
            // 回收对象
            handle.recycle(this);
        }
    }
}
```

- 在 `<1>` 处，我们可以看到，只有 ByteBuffer 容量小于 `THREAD_LOCAL_BUFFER_SIZE` 时，才会重用 ByteBuffer 对象。

### 3.5.2 ThreadLocalDirectByteBuf

ThreadLocalUnsafeDirectByteBuf ，在 ByteBufUtil 的**内部静态类**，继承 UnpooledDirectByteBuf 类。代码如下：

```java
static final class ThreadLocalDirectByteBuf extends UnpooledDirectByteBuf {

    /**
     * Recycler 对象
     */
    private static final Recycler<ThreadLocalDirectByteBuf> RECYCLER = new Recycler<ThreadLocalDirectByteBuf>() {
        @Override
        protected ThreadLocalDirectByteBuf newObject(Handle<ThreadLocalDirectByteBuf> handle) {
            return new ThreadLocalDirectByteBuf(handle);
        }
    };

    static ThreadLocalDirectByteBuf newInstance() {
        // 从 RECYCLER 中，获得 ThreadLocalUnsafeDirectByteBuf 对象
        ThreadLocalDirectByteBuf buf = RECYCLER.get();
        // 初始化 ref 为 1
        buf.setRefCnt(1);
        return buf;
    }

    /**
     * Recycler 处理器
     */
    private final Handle<ThreadLocalDirectByteBuf> handle;

    private ThreadLocalDirectByteBuf(Handle<ThreadLocalDirectByteBuf> handle) {
        super(UnpooledByteBufAllocator.DEFAULT, 256, Integer.MAX_VALUE);
        this.handle = handle;
    }

    @Override
    protected void deallocate() {
        if (capacity() > THREAD_LOCAL_BUFFER_SIZE) {
            // 释放
            super.deallocate();
        } else {
            // 清理
            clear();
            // 回收
            handle.recycle(this);
        }
    }
}
```

## 3.6 WrappedUnpooledUnsafeDirectByteBuf

> 老艿艿：这是本文的拓展内容。

`io.netty.buffer.WrappedUnpooledUnsafeDirectByteBuf` ，继承 UnpooledUnsafeDirectByteBuf 类，基于 `memoryAddress` 内存地址，创建 Direct ByteBuf 对象。代码如下：

```java
final class WrappedUnpooledUnsafeDirectByteBuf extends UnpooledUnsafeDirectByteBuf {

    // 基于 memoryAddress 内存地址，创建 Direct ByteBuf 对象
    WrappedUnpooledUnsafeDirectByteBuf(ByteBufAllocator alloc, long memoryAddress, int size, boolean doFree) {
        super(alloc, PlatformDependent.directBuffer(memoryAddress, size) /** 创建 Direct ByteBuf 对象 **/, size, doFree);
    }

    @Override
    protected void freeDirect(ByteBuffer buffer) {
        PlatformDependent.freeMemory(memoryAddress);
    }

}
```

> FROM [《Netty源码分析（一） ByteBuf》](https://www.jianshu.com/p/b833254908f7)
>
> 创建一个指定内存地址的UnpooledUnsafeDirectByteBuf，该内存块可能已被写入数据以减少一步拷贝操作。

# 666. 彩蛋

每次这种 N 多实现类的源码解析，写到 60% 的时候，就特别头疼。不是因为难写，是因为基本是组合排列，不断在啰嗦啰嗦啰嗦的感觉。

嗯嗯，如果有地方写的错乱，烦请指出。默默再 review 几遍。

------

推荐阅读文章：

- HryReal [《PooledByteBuf源码分析》](https://blog.csdn.net/qq_33394088/article/details/72763305)
- 江南白衣 [《Netty之Java堆外内存扫盲贴》](http://calvin1978.blogcn.com/articles/directbytebuffer.html)
- 

# Buffer 之 ByteBuf（三）内存泄露检测

# 1. 概述

在本文，我们来分享 Netty 的**内存泄露检测**的实现机制。考虑到胖友更好的理解本文，请先阅读江南白衣大大的 [《Netty 之有效规避内存泄漏》](http://calvin1978.blogcn.com/articles/netty-leak.html) 。

因为江南白衣大大在文章中，已经很清晰的讲解了概念与原理，笔者就不班门弄斧，直接上手，撸源码。

# 2. ReferenceCounted

> FROM [《【Netty官方文档翻译】引用计数对象（reference counted objects）》](http://damacheng009.iteye.com/blog/2013657)
>
> 自从 Netty 4 开始，对象的生命周期由它们的引用计数( reference counts )管理，而不是由垃圾收集器( garbage collector )管理了。**ByteBuf 是最值得注意的，它使用了引用计数来改进分配内存和释放内存的性能**。

在 Netty 中，通过 `io.netty.util.ReferenceCounted` **接口**，定义了引用计数相关的一系列操作。代码如下：

```java
public interface ReferenceCounted {

    /**
     * 获得引用计数
     *
     * Returns the reference count of this object.  If {@code 0}, it means this object has been deallocated.
     */
    int refCnt();

    /**
     * 增加引用计数 1
     *
     * Increases the reference count by {@code 1}.
     */
    ReferenceCounted retain();
    /**
     * 增加引用计数 n
     *
     * Increases the reference count by the specified {@code increment}.
     */
    ReferenceCounted retain(int increment);

    /**
     * 等价于调用 `#touch(null)` 方法，即 hint 方法参数传递为 null 。
     *
     * Records the current access location of this object for debugging purposes.
     * If this object is determined to be leaked, the information recorded by this operation will be provided to you
     * via {@link ResourceLeakDetector}.  This method is a shortcut to {@link #touch(Object) touch(null)}.
     */
    ReferenceCounted touch();
    /**
     * 出于调试目的,用一个额外的任意的(arbitrary)信息记录这个对象的当前访问地址. 如果这个对象被检测到泄露了, 这个操作记录的信息将通过ResourceLeakDetector 提供.
     *
     * Records the current access location of this object with an additional arbitrary information for debugging
     * purposes.  If this object is determined to be leaked, the information recorded by this operation will be
     * provided to you via {@link ResourceLeakDetector}.
     */
    ReferenceCounted touch(Object hint);

    /**
     * 减少引用计数 1 。
     * 当引用计数为 0 时，释放
     *
     * Decreases the reference count by {@code 1} and deallocates this object if the reference count reaches at
     * {@code 0}.
     *
     * @return {@code true} if and only if the reference count became {@code 0} and this object has been deallocated
     */
    boolean release();
    /**
     * 减少引用计数 n 。
     *  当引用计数为 0 时，释放
     *
     * Decreases the reference count by the specified {@code decrement} and deallocates this object if the reference
     * count reaches at {@code 0}.
     *
     * @return {@code true} if and only if the reference count became {@code 0} and this object has been deallocated
     */
    boolean release(int decrement);
}
```

- `#refCnt()`、`#retain(...)`、`#release(...)` 三种方法比较好理解，对引用指数的获取与增减。
- `#touch(...)` 方法，主动记录一个 `hint` 给 ResourceLeakDetector ，方便我们在发现内存泄露有更多的信息进行排查。详细的，在下文 ResourceLeakDetector 相关的内容，具体来看。

------

ReferenceCounted 的直接子类 / 子接口有两个 ：

- `io.netty.buffer.ByteBuf` 。所以，所有 ByteBuf 实现类，都支持引用计数的操作。

- `io.netty.util.AbstractReferenceCounted`，ReferenceCounted 的抽象实现类。它的子类实现类，主要是除了 ByteBuf 之外，需要引用计数的操作的类。例如：AbstractHttpData、DefaultFileRegion 等等。
  - AbstractReferenceCounted 不是本文的重点，就不多做介绍。
  - AbstractReferenceCounted 的具体代码实现，在下文中，我们会看到和 `io.netty.buffer.AbstractReferenceCountedByteBuf` 基本差不多。

# 3. ByteBuf

ByteBuf 虽然继承了 ReferenceCounted 接口，但是并未实现相应的方法。那么真正实现与相关的类，如下图所示：[![类图](http://static.iocoder.cn/images/Netty/2018_08_07/01.png)](http://static.iocoder.cn/images/Netty/2018_08_07/01.png)类图

- 黄框
  - AbstractReferenceCountedByteBuf ，实现引用计数的获取与增减的操作。
- 红框
  - WrappedByteBuf ，实现对 ByteBuf 的装饰器实现类。
  - WrappedCompositeByteBuf ，实现对 CompositeByteBuf 的装饰器实现类。
- 绿框
  - SimpleLeakAwareByteBuf、SimpleLeakAwareCompositeByteBuf ，实现了 `SIMPLE` 级别的内存泄露检测。
  - AdvancedLeakAwareByteBuf、AdvancedLeakAwareCompositeByteBuf ，实现了 `ADVANCED` 和 `PARANOID` 级别的内存泄露检测。
- 蓝筐
  - UnreleasableByteBuf ，用于阻止他人对装饰的 ByteBuf 的销毁，避免被错误销毁掉。

因为带 `"Composite"` 类的代码实现，和不带的类( 例如 WrappedCompositeByteBuf 和 WrappedByteBuf )，实现代码基本一致，**所以本文只分享不带 `"Composite"` 的类**。

## 3.1 创建 LeakAware ByteBuf 对象

在前面的文章中，我们已经提到，ByteBufAllocator 可用于创建 ByteBuf 对象。创建的过程中，它会调用 `#toLeakAwareBuffer(...)` 方法，将 ByteBuf **装饰**成 LeakAware ( 可检测内存泄露 )的 ByteBuf 对象，代码如下：

```java
// AbstractByteBufAllocator.java
protected static ByteBuf toLeakAwareBuffer(ByteBuf buf) {
    ResourceLeakTracker<ByteBuf> leak;
    switch (ResourceLeakDetector.getLevel()) {
        case SIMPLE:
            leak = AbstractByteBuf.leakDetector.track(buf);
            if (leak != null) {
                buf = new SimpleLeakAwareByteBuf(buf, leak);
            }
            break;
        case ADVANCED:
        case PARANOID:
            leak = AbstractByteBuf.leakDetector.track(buf);
            if (leak != null) {
                buf = new AdvancedLeakAwareByteBuf(buf, leak);
            }
            break;
        default:
            break;
    }
    return buf;
}

protected static CompositeByteBuf toLeakAwareBuffer(CompositeByteBuf buf) {
    ResourceLeakTracker<ByteBuf> leak;
    switch (ResourceLeakDetector.getLevel()) {
        case SIMPLE:
            leak = AbstractByteBuf.leakDetector.track(buf);
            if (leak != null) {
                buf = new SimpleLeakAwareCompositeByteBuf(buf, leak);
            }
            break;
        case ADVANCED:
        case PARANOID:
            leak = AbstractByteBuf.leakDetector.track(buf);
            if (leak != null) {
                buf = new AdvancedLeakAwareCompositeByteBuf(buf, leak);
            }
            break;
        default:
            break;
    }
    return buf;
}
```

- 有两个 `#toLeakAwareBuffer(...)` 方法，分别对应带 `"Composite"` 的 组合 ByteBuf 类，和不带 `Composite` 普通 ByteBuf 类。因为这个不同，所以前者创建的是 SimpleLeakAwareCompositeByteBuf / AdvancedLeakAwareCompositeByteBuf 对象，后者创建的是 SimpleLeakAwareByteBuf / AdvancedLeakAwareByteBuf 对象。

- 当然，从总的逻辑来看，是一致的：

  - `SIMPLE` 级别，创建 SimpleLeakAwareByteBuf 或 SimpleLeakAwareCompositeByteBuf 对象。
  - `ADVANCED` 和 `PARANOID` 级别，创建 AdvancedLeakAwareByteBuf 或者 AdvancedLeakAwareCompositeByteBuf 对象。
  
- 是否需要创建 LeakAware ByteBuf 对象，有一个前提，调用`ResourceLeakDetector#track(ByteBuf)`方法，返回了 ResourceLeakTracker 对象。

  - 虽然说， `ADVANCED` 和 `PARANOID` 级别，都使用了 AdvancedLeakAwareByteBuf 或 AdvancedLeakAwareCompositeByteBuf 对象，但是它们的差异是：1) `PARANOID` 级别，一定返回 ResourceLeakTracker 对象；2) `ADVANCED` 级别，随机概率( 默认为 `1%` 左右 )返回 ResourceLeakTracker 对象。
- 关于 `ResourceLeakDetector#track(ByteBuf)` 方法的实现，下文也会详细解析。

## 3.2 AbstractReferenceCountedByteBuf

`io.netty.buffer.AbstractReferenceCountedByteBuf` ，实现引用计数的获取与增减的操作。

### 3.2.1 构造方法

```java
/**
 * {@link #refCnt} 的更新器
 */
private static final AtomicIntegerFieldUpdater<AbstractReferenceCountedByteBuf> refCntUpdater = AtomicIntegerFieldUpdater.newUpdater(AbstractReferenceCountedByteBuf.class, "refCnt");

/**
 * 引用计数
 */
private volatile int refCnt;

protected AbstractReferenceCountedByteBuf(int maxCapacity) {
    // 设置最大容量
    super(maxCapacity);
    // 初始 refCnt 为 1
    refCntUpdater.set(this, 1);
}
```

- 为什么 `refCnt` 不使用 AtomicInteger 呢？

> 计数器基于 AtomicIntegerFieldUpdater ，为什么不直接用 AtomicInteger ？因为 ByteBuf 对象很多，如果都把 `int` 包一层 AtomicInteger 花销较大，而AtomicIntegerFieldUpdater 只需要一个全局的静态变量。

### 3.2.2 refCnt

```java
@Override
public int refCnt() {
    return refCnt;
}
```

### 3.2.3 setRefCnt

`#setRefCnt(int refCnt)` 方法，直接修改 `refCnt` 。代码如下：

```java
/**
 * An unsafe operation intended for use by a subclass that sets the reference count of the buffer directly
 */
protected final void setRefCnt(int refCnt) {
    refCntUpdater.set(this, refCnt);
}
```

### 3.2.4 retain

```java
@Override
public ByteBuf retain(int increment) {
    return retain0(checkPositive(increment, "increment"));
}

private ByteBuf retain0(final int increment) {
    // 增加
    int oldRef = refCntUpdater.getAndAdd(this, increment);
    // 原有 refCnt 就是 <= 0 ；或者，increment 为负数
    if (oldRef <= 0 || oldRef + increment < oldRef) {
        // Ensure we don't resurrect (which means the refCnt was 0) and also that we encountered an overflow.
        // 加回去，负负得正。
        refCntUpdater.getAndAdd(this, -increment);
        // 抛出 IllegalReferenceCountException 异常
        throw new IllegalReferenceCountException(oldRef, increment);
    }
    return this;
}
```

### 3.2.5 release

```java
@Override
public boolean release() {
    return release0(1);
}

@Override
public boolean release(int decrement) {
    return release0(checkPositive(decrement, "decrement"));
}

@SuppressWarnings("Duplicates")
private boolean release0(int decrement) {
    // 减少
    int oldRef = refCntUpdater.getAndAdd(this, -decrement);
    // 原有 oldRef 等于减少的值
    if (oldRef == decrement) {
        // 释放
        deallocate();
        return true;
        // 减少的值得大于 原有 oldRef ，说明“越界”；或者，increment 为负数
    } else if (oldRef < decrement || oldRef - decrement > oldRef) {
        // Ensure we don't over-release, and avoid underflow.
        // 加回去，负负得正。
        refCntUpdater.getAndAdd(this, decrement);
        // 抛出 IllegalReferenceCountException 异常
        throw new IllegalReferenceCountException(oldRef, -decrement);
    }
    return false;
}
```

- 当释放完成，即 `refCnt` 等于 0 时，调用 `#deallocate()` 方法，进行**真正的释放**。这是个**抽象方法**，需要子类去实现。代码如下：

  ```java
  /**
   * Called once {@link #refCnt()} is equals 0.
   */
  protected abstract void deallocate();
  ```

  - 在 [《精尽 Netty 源码解析 —— Buffer 之 ByteBuf（二）核心子类》](http://svip.iocoder.cn/Netty/ByteBuf-1-2-ByteBuf-core-impl/) 中，可以看到各种 ByteBuf 对 `#deallocate()` 方法的实现。

### 3.2.6 touch

```java
@Override
public ByteBuf touch() {
    return this;
}

@Override
public ByteBuf touch(Object hint) {
    return this;
}
```

一脸懵逼？！实际 AbstractReferenceCountedByteBuf **并未**实现 `#touch(...)` 方法。而是在 AdvancedLeakAwareByteBuf 中才实现。

## 3.3 SimpleLeakAwareByteBuf

`io.netty.buffer.SimpleLeakAwareByteBuf` ，继承 WrappedByteBuf 类，`Simple` 级别的 LeakAware ByteBuf 实现类。

### 3.3.1 构造方法

```java
/**
 * 关联的 ByteBuf 对象
 *
 * This object's is associated with the {@link ResourceLeakTracker}. When {@link ResourceLeakTracker#close(Object)}
 * is called this object will be used as the argument. It is also assumed that this object is used when
 * {@link ResourceLeakDetector#track(Object)} is called to create {@link #leak}.
 */
private final ByteBuf trackedByteBuf;
/**
 * ResourceLeakTracker 对象
 */
final ResourceLeakTracker<ByteBuf> leak;

SimpleLeakAwareByteBuf(ByteBuf wrapped, ByteBuf trackedByteBuf, ResourceLeakTracker<ByteBuf> leak) { // <2>
    super(wrapped);
    this.trackedByteBuf = ObjectUtil.checkNotNull(trackedByteBuf, "trackedByteBuf");
    this.leak = ObjectUtil.checkNotNull(leak, "leak");
}

SimpleLeakAwareByteBuf(ByteBuf wrapped, ResourceLeakTracker<ByteBuf> leak) { // <1>
    this(wrapped, wrapped, leak);
}
```

- `leak` 属性，ResourceLeakTracker 对象。`trackedByteBuf`属性，真正关联`leak`的 ByteBuf 对象。
  - 对于构造方法 `<1>` ，`wrapped` 和 `trackedByteBuf` **相同**。
  - 对于构造方法 `<2>` ，`wrapped` 和 `trackedByteBuf` **一般不同**。
  - 有点难理解？继续往下看。

### 3.3.2 slice

```java
@Override
public ByteBuf slice() {
    return newSharedLeakAwareByteBuf(super.slice());
}

@Override
public ByteBuf slice(int index, int length) {
    return newSharedLeakAwareByteBuf(super.slice(index, length));
}
```

- 首先，调用**父** `#slice(...)` 方法，获得 **slice** ByteBuf 对象。

- 之后，因为 **slice** ByteBuf 对象，并不是一个 LeakAware 的 ByteBuf 对象。所以调用 `#newSharedLeakAwareByteBuf(ByteBuf wrapped)` 方法，装饰成 LeakAware 的 ByteBuf 对象。代码如下：

  ```java
  private SimpleLeakAwareByteBuf newSharedLeakAwareByteBuf(ByteBuf wrapped) {
      return newLeakAwareByteBuf(wrapped, trackedByteBuf /** <1> **/, leak);
  }
  
  protected SimpleLeakAwareByteBuf newLeakAwareByteBuf(ByteBuf buf, ByteBuf trackedByteBuf, ResourceLeakTracker<ByteBuf> leakTracker) {
      return new SimpleLeakAwareByteBuf(buf, trackedByteBuf /** <1> **/, leakTracker);
  }
  ```

  - 从 `<1>` 处，我们可以看到，`trackedByteBuf` 代表的是**原始的** ByteBuf 对象，它是跟 `leak` 真正进行关联的。而 `wrapped` 则不是。

------

在 SimpleLeakAwareByteBuf 中，还有如下方法，和 `#slice(...)` 方法是**类似**的，在调用完**父**对应的方法后，再调用 `#newSharedLeakAwareByteBuf(ByteBuf wrapped)` 方法，装饰成 LeakAware 的 ByteBuf 对象。整理如下：

```java
@Override
public ByteBuf duplicate() {
    return newSharedLeakAwareByteBuf(super.duplicate());
}

@Override
public ByteBuf readSlice(int length) {
    return newSharedLeakAwareByteBuf(super.readSlice(length));
}

@Override
public ByteBuf asReadOnly() {
    return newSharedLeakAwareByteBuf(super.asReadOnly());
}

@Override
public ByteBuf order(ByteOrder endianness) {
    if (order() == endianness) {
        return this;
    } else {
        return newSharedLeakAwareByteBuf(super.order(endianness));
    }
}
```

### 3.3.3 retainedSlice

```java
@Override
public ByteBuf retainedSlice() {
    return unwrappedDerived(super.retainedSlice());
}

@Override
public ByteBuf retainedSlice(int index, int length) {
    return unwrappedDerived(super.retainedSlice(index, length));
}
```

- 首先，调用**父** `#retainedSlice(...)` 方法，获得 **slice** ByteBuf 对象，引用计数加 1。

- 之后，因为 **slice** ByteBuf 对象，并不是一个 LeakAware 的 ByteBuf 对象。所以调用 `#unwrappedDerived(ByteBuf wrapped)` 方法，装饰成 LeakAware 的 ByteBuf 对象。代码如下：

  ```java
  // TODO 芋艿，看不懂 1017
  private ByteBuf unwrappedDerived(ByteBuf derived) {
      // We only need to unwrap SwappedByteBuf implementations as these will be the only ones that may end up in
      // the AbstractLeakAwareByteBuf implementations beside slices / duplicates and "real" buffers.
      ByteBuf unwrappedDerived = unwrapSwapped(derived);
  
      if (unwrappedDerived instanceof AbstractPooledDerivedByteBuf) {
          // Update the parent to point to this buffer so we correctly close the ResourceLeakTracker.
          ((AbstractPooledDerivedByteBuf) unwrappedDerived).parent(this);
  
          ResourceLeakTracker<ByteBuf> newLeak = AbstractByteBuf.leakDetector.track(derived);
          if (newLeak == null) {
              // No leak detection, just return the derived buffer.
              return derived;
          }
          return newLeakAwareByteBuf(derived, newLeak);
      }
      return newSharedLeakAwareByteBuf(derived);
  }
  
  @SuppressWarnings("deprecation")
  private static ByteBuf unwrapSwapped(ByteBuf buf) {
      if (buf instanceof SwappedByteBuf) {
          do {
              buf = buf.unwrap();
          } while (buf instanceof SwappedByteBuf);
  
          return buf;
      }
      return buf;
  }
  
  private SimpleLeakAwareByteBuf newLeakAwareByteBuf(ByteBuf wrapped, ResourceLeakTracker<ByteBuf> leakTracker) {
      return newLeakAwareByteBuf(wrapped, wrapped, leakTracker);
  }
  ```

  - TODO 1017

------

在 SimpleLeakAwareByteBuf 中，还有如下方法，和 `#retainedSlice(...)` 方法是**类似**的，在调用完**父**对应的方法后，再调用 `#unwrappedDerived(ByteBuf derived)` 方法，装饰成 LeakAware 的 ByteBuf 对象。整理如下：

```java
@Override
public ByteBuf retainedDuplicate() {
    return unwrappedDerived(super.retainedDuplicate());
}

@Override
public ByteBuf readRetainedSlice(int length) {
    return unwrappedDerived(super.readRetainedSlice(length));
}
```

### 3.3.4 release

```java
@Override
public boolean release() {
    if (super.release()) { // 释放完成
        closeLeak();
        return true;
    }
    return false;
}

@Override
public boolean release(int decrement) {
    if (super.release(decrement)) { // 释放完成
        closeLeak();
        return true;
    }
    return false;
}
```

- 在调用**父** `#release(...)` 方法，释放完成后，会调用 `#closeLeak()` 方法，关闭 ResourceLeakTracker 。代码如下：

  ```java
  private void closeLeak() {
      // Close the ResourceLeakTracker with the tracked ByteBuf as argument. This must be the same that was used when
      // calling DefaultResourceLeak.track(...).
      boolean closed = leak.close(trackedByteBuf);
      assert closed;
  }
  ```

* 进一步的详细解析，可以看看 [「5.1.5 close」](#) 。

### 3.3.5 touch

```java
@Override
public ByteBuf touch() {
    return this;
}

@Override
public ByteBuf touch(Object hint) {
    return this;
}
```

又一脸懵逼？！实际 SimpleLeakAwareByteBuf **也并未**实现 `#touch(...)` 方法。而是在 AdvancedLeakAwareByteBuf 中才实现。

## 3.4 AdvancedLeakAwareByteBuf

`io.netty.buffer.AdvancedLeakAwareByteBuf` ，继承 SimpleLeakAwareByteBuf 类，`ADVANCED` 和 `PARANOID` 级别的 LeakAware ByteBuf 实现类。

### 3.4.1 构造方法

```java
AdvancedLeakAwareByteBuf(ByteBuf buf, ResourceLeakTracker<ByteBuf> leak) {
    super(buf, leak);
}

AdvancedLeakAwareByteBuf(ByteBuf wrapped, ByteBuf trackedByteBuf, ResourceLeakTracker<ByteBuf> leak) {
    super(wrapped, trackedByteBuf, leak);
}
```

就是调用父构造方法，没啥特点。

### 3.4.2 retain

```java
@Override
public ByteBuf retain() {
    leak.record();
    return super.retain();
}

@Override
public ByteBuf retain(int increment) {
    leak.record();
    return super.retain(increment);
}
```

- 会调用 `ResourceLeakTracer#record()` 方法，记录信息。

### 3.4.3 release

```java
@Override
public boolean release() {
    leak.record();
    return super.release();
}

@Override
public boolean release(int decrement) {
    leak.record();
    return super.release(decrement);
}
```

- 会调用 `ResourceLeakTracer#record()` 方法，记录信息。

### 3.4.4 touch

```java
@Override
public ByteBuf touch() {
    leak.record();
    return this;
}

@Override
public ByteBuf touch(Object hint) {
    leak.record(hint);
    return this;
}
```

- 会调用 `ResourceLeakTracer#record(...)` 方法，记录信息。
- 😈 `#touch(...)` 方法，终于实现了，哈哈哈。

### 3.4.5 recordLeakNonRefCountingOperation

`#recordLeakNonRefCountingOperation(ResourceLeakTracker<ByteBuf> leak)` **静态**方法，除了引用计数操作相关( 即 `#retain(...)`/`#release(...)`/`#touch(...)` 方法 )方法外，是否要调用记录信息。代码如下：

```java
private static final String PROP_ACQUIRE_AND_RELEASE_ONLY = "io.netty.leakDetection.acquireAndReleaseOnly";
/**
 * 默认为
 */
private static final boolean ACQUIRE_AND_RELEASE_ONLY;

static {
    ACQUIRE_AND_RELEASE_ONLY = SystemPropertyUtil.getBoolean(PROP_ACQUIRE_AND_RELEASE_ONLY, false);
}

static void recordLeakNonRefCountingOperation(ResourceLeakTracker<ByteBuf> leak) {
    if (!ACQUIRE_AND_RELEASE_ONLY) {
        leak.record();
    }
}
```

- 负负得正，所以会调用 `ResourceLeakTracer#record(...)` 方法，记录信息。

- 也就是说，ByteBuf 的所有方法，都会记录信息。例如：

  ```java
  @Override
  public ByteBuf order(ByteOrder endianness) {
      recordLeakNonRefCountingOperation(leak);
      return super.order(endianness);
  }
  
  @Override
  public int readIntLE() {
      recordLeakNonRefCountingOperation(leak);
      return super.readIntLE();
  }
  ```

  - 方法比较多，就不一一列举了。

### 3.4.6 newLeakAwareByteBuf

`#newLeakAwareByteBuf(ByteBuf buf, ByteBuf trackedByteBuf, ResourceLeakTracker<ByteBuf> leakTracker)` 方法，覆写父类方法，将原先装饰成 SimpleLeakAwareByteBuf 改成 AdvancedLeakAwareByteBuf 对象。代码如下:

```java
@Override
protected AdvancedLeakAwareByteBuf newLeakAwareByteBuf(
        ByteBuf buf, ByteBuf trackedByteBuf, ResourceLeakTracker<ByteBuf> leakTracker) {
    return new AdvancedLeakAwareByteBuf(buf, trackedByteBuf, leakTracker);
}
```

## 3.5 UnreleasableByteBuf

`io.netty.buffer.UnreleasableByteBuf` ，继承 WrappedByteBuf 类，用于阻止他人对装饰的 ByteBuf 的销毁，避免被错误销毁掉。

它的实现方法比较简单，主要是两大点：

- 引用计数操作相关( 即 `#retain(...)`/`#release(...)`/`#touch(...)` 方法 )方法，不进行调用。代码如下：

  ```java
  @Override
  public ByteBuf retain(int increment) {
      return this;
  }
  @Override
  public ByteBuf retain() {
      return this;
  }
  
  @Override
  public ByteBuf touch() {
      return this;
  }
  @Override
  public ByteBuf touch(Object hint) {
      return this;
  }
  
  @Override
  public boolean release() {
      return false;
  }
  @Override
  public boolean release(int decrement) {
      return false;
  }
  ```

- 拷贝操作相关方法，都会在包一层 UnreleasableByteBuf 对象。例如：

  ```java
  @Override
  public ByteBuf slice() {
      return new UnreleasableByteBuf(buf.slice());
  }
  ```

# 4. ResourceLeakDetector

`io.netty.util.ResourceLeakDetector` ，内存泄露检测器。

> 老艿艿：Resource 翻译成“资源”更合理。考虑到标题叫做《内存泄露检测》，包括互联网其他作者在关于这块内容的命名，也是叫做“内存泄露检测”。所以，在下文，Resource 笔者还是继续翻译成“资源”。

ResourceLeakDetector 为了检测内存是否泄漏，使用了 WeakReference( 弱引用 )和 ReferenceQueue( 引用队列 )，过程如下：

1. 根据检测级别和采样率的设置，在需要时为需要检测的 ByteBuf 创建WeakReference 引用。
2. 当 JVM 回收掉 ByteBuf 对象时，JVM 会将 WeakReference 放入ReferenceQueue 队列中。
3. 通过对 ReferenceQueue 中 WeakReference 的检查，判断在 GC 前是否有释放ByteBuf 的资源，就可以知道是否有资源释放。

😈 看不太懂？继续往下看代码，在回过头来理解理解。

## 4.1 静态属性

```java
private static final String PROP_LEVEL_OLD = "io.netty.leakDetectionLevel";
private static final String PROP_LEVEL = "io.netty.leakDetection.level";
/**
 * 默认内存检测级别
 */
private static final Level DEFAULT_LEVEL = Level.SIMPLE;

private static final String PROP_TARGET_RECORDS = "io.netty.leakDetection.targetRecords";
private static final int DEFAULT_TARGET_RECORDS = 4;

/**
 * 每个 DefaultResourceLeak 记录的 Record 数量
 */
private static final int TARGET_RECORDS;

/**
 * 内存检测级别枚举
 * 
 * Represents the level of resource leak detection.
 */
public enum Level {
    /**
     * Disables resource leak detection.
     */
    DISABLED,
    /**
     * Enables simplistic sampling resource leak detection which reports there is a leak or not,
     * at the cost of small overhead (default).
     */
    SIMPLE,
    /**
     * Enables advanced sampling resource leak detection which reports where the leaked object was accessed
     * recently at the cost of high overhead.
     */
    ADVANCED,
    /**
     * Enables paranoid resource leak detection which reports where the leaked object was accessed recently,
     * at the cost of the highest possible overhead (for testing purposes only).
     */
    PARANOID;

    /**
     * Returns level based on string value. Accepts also string that represents ordinal number of enum.
     *
     * @param levelStr - level string : DISABLED, SIMPLE, ADVANCED, PARANOID. Ignores case.
     * @return corresponding level or SIMPLE level in case of no match.
     */
    static Level parseLevel(String levelStr) {
        String trimmedLevelStr = levelStr.trim();
        for (Level l : values()) {
            if (trimmedLevelStr.equalsIgnoreCase(l.name()) || trimmedLevelStr.equals(String.valueOf(l.ordinal()))) {
                return l;
            }
        }
        return DEFAULT_LEVEL;
    }
}

/**
 * 内存泄露检测等级
 */
private static Level level;

/**
 * 默认采集频率
 */
// There is a minor performance benefit in TLR if this is a power of 2.
static final int DEFAULT_SAMPLING_INTERVAL = 128;
 
  1: static {
  2:     // 获得是否禁用泄露检测
  3:     final boolean disabled;
  4:     if (SystemPropertyUtil.get("io.netty.noResourceLeakDetection") != null) {
  5:         disabled = SystemPropertyUtil.getBoolean("io.netty.noResourceLeakDetection", false);
  6:         logger.debug("-Dio.netty.noResourceLeakDetection: {}", disabled);
  7:         logger.warn("-Dio.netty.noResourceLeakDetection is deprecated. Use '-D{}={}' instead.", PROP_LEVEL, DEFAULT_LEVEL.name().toLowerCase());
  8:     } else {
  9:         disabled = false;
 10:     }
 11: 
 12:     // 获得默认级别
 13:     Level defaultLevel = disabled? Level.DISABLED : DEFAULT_LEVEL;
 14:     // 获得配置的级别字符串，从老版本的配置
 15:     // First read old property name (兼容老版本）
 16:     String levelStr = SystemPropertyUtil.get(PROP_LEVEL_OLD, defaultLevel.name());
 17:     // 获得配置的级别字符串，从新版本的配置
 18:     // If new property name is present, use it
 19:     levelStr = SystemPropertyUtil.get(PROP_LEVEL, levelStr);
 20:     // 获得最终的级别
 21:     Level level = Level.parseLevel(levelStr);
 22:     // 设置最终的级别
 23:     ResourceLeakDetector.level = level;
 24: 
 25:     // 初始化 TARGET_RECORDS
 26:     TARGET_RECORDS = SystemPropertyUtil.getInt(PROP_TARGET_RECORDS, DEFAULT_TARGET_RECORDS);
 27: 
 28:     if (logger.isDebugEnabled()) {
 29:         logger.debug("-D{}: {}", PROP_LEVEL, level.name().toLowerCase());
 30:         logger.debug("-D{}: {}", PROP_TARGET_RECORDS, TARGET_RECORDS);
 31:     }
 32: }
```

- `level` **静态**属性，内存泄露等级。😈 不是说好了，静态变量要统一大写么。

  - 默认级别为 `DEFAULT_LEVEL = Level.SIMPLE` 。

  - 在 Level 中，枚举了四个级别。

    > - 禁用（DISABLED） - 完全禁止泄露检测，省点消耗。
    > - 简单（SIMPLE） - 默认等级，告诉我们取样的1%的ByteBuf是否发生了泄露，但总共一次只打印一次，看不到就没有了。
    > - 高级（ADVANCED） - 告诉我们取样的1%的ByteBuf发生泄露的地方。每种类型的泄漏（创建的地方与访问路径一致）只打印一次。对性能有影响。
    > - 偏执（PARANOID） - 跟高级选项类似，但此选项检测所有ByteBuf，而不仅仅是取样的那1%。对性能有绝大的影响。
    >   - 看着有点懵逼？下面继续看代码。

  - 在【第 2 至 23 行】的代码进行初始化。`TARGET_RECORDS`静态属性，每个 DefaultResourceLeak 记录的 Record 数量。

  - 默认大小为 `DEFAULT_TARGET_RECORDS = 4` 。
  - 在【第 26 行】的代码进行初始化。

- `DEFAULT_SAMPLING_INTERVAL` 静态属性，默认采集频率，128 。

## 4.2 构造方法

```java
/**
 * DefaultResourceLeak 集合
 *
 * the collection of active resources
 */
private final ConcurrentMap<DefaultResourceLeak<?>, LeakEntry> allLeaks = PlatformDependent.newConcurrentHashMap();

/**
 * 引用队列
 */
private final ReferenceQueue<Object> refQueue = new ReferenceQueue<Object>();
/**
 * 已汇报的内存泄露的资源类型的集合
 */
private final ConcurrentMap<String, Boolean> reportedLeaks = PlatformDependent.newConcurrentHashMap();

/**
 * 资源类型
 */
private final String resourceType;
/**
 * 采集评率
 */
private final int samplingInterval;

public ResourceLeakDetector(Class<?> resourceType, int samplingInterval) {
    this(simpleClassName(resourceType) /** <1> **/, samplingInterval, Long.MAX_VALUE);
}
```

- `allLeaks`属性，DefaultResourceLeak 集合。因为 Java 没有自带的 ConcurrentSet ，所以只好使用使用 ConcurrentMap 。也就是说，value 属性实际没有任何用途。
  - 关于 LeakEntry ，可以看下 [「6. LeakEntry」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 。
  
- `refQueue` 属性，就是我们提到的**引用队列**( ReferenceQueue 队列 )。

- `reportedLeaks` 属性，已汇报的内存泄露的资源类型的集合。

- `resourceType` 属性，资源类型，使用资源类的类名简写，见 `<1>` 处。

- `samplingInterval` 属性，采集频率。

------

在 AbstractByteBuf 类中，我们可以看到创建了所有 ByteBuf 对象统一使用的 ResourceLeakDetector 对象。代码如下：

```java
static final ResourceLeakDetector<ByteBuf> leakDetector = ResourceLeakDetectorFactory.instance().newResourceLeakDetector(ByteBuf.class);
```

- ResourceLeakDetector 的创建，通过`io.netty.util.ResourceLeakDetectorFactory`，基于工厂模式的方式来创建。

  - 关于 ResourceLeakDetectorFactory 的代码比较简单，笔者就不赘述了。
- 有一点要注意的是，可以通过 `"io.netty.customResourceLeakDetector"` 来**自定义** ResourceLeakDetector 的实现类。当然，绝大多数场景是完全不需要的。

## 4.3 track

`#track(...)` 方法，给指定资源( 例如 ByteBuf 对象 )创建一个检测它是否泄漏的 ResourceLeakTracker 对象。代码如下：

```java
 1: public final ResourceLeakTracker<T> track(T obj) {
 2:     return track0(obj);
 3: }
 4: 
 5: @SuppressWarnings("unchecked")
 6: private DefaultResourceLeak track0(T obj) {
 7:     Level level = ResourceLeakDetector.level;
 8:     // DISABLED 级别，不创建
 9:     if (level == Level.DISABLED) {
10:         return null;
11:     }
12: 
13:     // SIMPLE 和 ADVANCED
14:     if (level.ordinal() < Level.PARANOID.ordinal()) {
15:         // 随机
16:         if ((PlatformDependent.threadLocalRandom().nextInt(samplingInterval)) == 0) {
17:             // 汇报内存是否泄漏
18:             reportLeak();
19:             // 创建 DefaultResourceLeak 对象
20:             return new DefaultResourceLeak(obj, refQueue, allLeaks);
21:         }
22:         return null;
23:     }
24: 
25:     // PARANOID 级别
26:     // 汇报内存是否泄漏
27:     reportLeak();
28:     // 创建 DefaultResourceLeak 对象
29:     return new DefaultResourceLeak(obj, refQueue, allLeaks);
30: }
```

- 第 8 至 11 行：`DISABLED` 级别时，不创建，直接返回 `null` 。
- 第 13 至 23 行：`SIMPLE` 和 `ADVANCED` 级别时，随机，概率为 `1 / samplingInterval` ，创建 DefaultResourceLeak 对象。默认情况下 `samplingInterval = 128` ，约等于 `1%` ，这也是就为什么说“告诉我们取样的 1% 的ByteBuf发生泄露的地方”。
- 第 27 至 29 行：`PARANOID` 级别时，一定创建 DefaultResourceLeak 对象。这也是为什么说“对性能有绝大的影响”。
- 第 18 至 27 行：笔者原本以为，ResourceLeakDetector 会有一个定时任务，不断检测是否有内存泄露。从这里的代码来看，它是在每次一次创建 DefaultResourceLeak 对象时，调用 `#reportLeak()` 方法，汇报内存是否泄漏。详细解析，见 [「4.4 reportLeak」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 。

## 4.4 reportLeak

`#reportLeak()` 方法，检测是否有内存泄露。若有，则进行汇报。代码如下：

```java
 1: private void reportLeak() {
 2:     // 如果不允许打印错误日志，则无法汇报，清理队列，并直接结束。
 3:     if (!logger.isErrorEnabled()) {
 4:         // 清理队列
 5:         clearRefQueue();
 6:         return;
 7:     }
 8: 
 9:     // 循环引用队列，直到为空
10:     // Detect and report previous leaks.
11:     for (;;) {
12:         @SuppressWarnings("unchecked")
13:         DefaultResourceLeak ref = (DefaultResourceLeak) refQueue.poll();
14:         if (ref == null) {
15:             break;
16:         }
17: 
18:         // 清理，并返回是否内存泄露
19:         if (!ref.dispose()) {
20:             continue;
21:         }
22: 
23:         // 获得 Record 日志
24:         String records = ref.toString();
25:         // 相同 Record 日志，只汇报一次
26:         if (reportedLeaks.putIfAbsent(records, Boolean.TRUE) == null) {
27:             if (records.isEmpty()) {
28:                 reportUntracedLeak(resourceType);
29:             } else {
30:                 reportTracedLeak(resourceType, records);
31:             }
32:         }
33:     }
34: }
```

- 第 2 至 7 行：如果不允许打印错误日志，则无法汇报，因此调用 `#clearRefQueue()` 方法，清理队列，并直接结束。详细解析，见 [「4.5 clearRefQueue」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 。

- 第 9 至 16 行：循环引用队列 `refQueue` ，直到为空。

- 第 18 至 21 行：调用 `DefaultResourceLeak#dispose()` 方法，清理，并返回是否内存泄露。如果未泄露，就直接 `continue` 。详细解析，见 [「5.1.3 dispose」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 。

- 第 24 行：调用 `DefaultResourceLeak#toString()` 方法，获得 Record 日志。详细解析，见 [「5.1 DefaultResourceLeak」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 。

- 第 25 至 32 行：相同 Record 日志内容( 即“创建的地方与访问路径一致” )，**只汇报一次**。 代码如下：

  ```java
  /**
   * This method is called when a traced leak is detected. It can be overridden for tracking how many times leaks
   * have been detected.
   */
  protected void reportTracedLeak(String resourceType, String records) {
      logger.error(
              "LEAK: {}.release() was not called before it's garbage-collected. " +
              "See http://netty.io/wiki/reference-counted-objects.html for more information.{}",
              resourceType, records);
  }
  
  /**
   * This method is called when an untraced leak is detected. It can be overridden for tracking how many times leaks
   * have been detected.
   */
  protected void reportUntracedLeak(String resourceType) {
      logger.error("LEAK: {}.release() was not called before it's garbage-collected. " +
              "Enable advanced leak reporting to find out where the leak occurred. " +
              "To enable advanced leak reporting, " +
              "specify the JVM option '-D{}={}' or call {}.setLevel() " +
              "See http://netty.io/wiki/reference-counted-objects.html for more information.",
              resourceType, PROP_LEVEL, Level.ADVANCED.name().toLowerCase(), simpleClassName(this));
  }
  ```

😈 这块逻辑的信息量，可能有点大，胖友可以看完 [「5. ResourceLeakTracker」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) ，再回过头理解下。

## 4.5 clearRefQueue

`#clearRefQueue()` 方法，清理队列。代码如下：

```java
private void clearRefQueue() {
    for (;;) {
        @SuppressWarnings("unchecked")
        DefaultResourceLeak ref = (DefaultResourceLeak) refQueue.poll();
        if (ref == null) {
            break;
        }
        // 清理，并返回是否内存泄露
        ref.dispose();
    }
}
```

- 实际上，就是 `#reportLeak()` 方法的**不汇报内存泄露**的版本。

# 5. ResourceLeakTracker

`io.netty.util.ResourceLeakTracker` ，内存泄露追踪器接口。从 [「4.3 track」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 中，我们已经看到，每个资源( 例如：ByteBuf 对象 )，会创建一个追踪它是否内存泄露的 ResourceLeakTracker 对象。

接口方法定义如下：

```java
public interface ResourceLeakTracker<T>  {

    /**
     * 记录
     *
     * Records the caller's current stack trace so that the {@link ResourceLeakDetector} can tell where the leaked
     * resource was accessed lastly. This method is a shortcut to {@link #record(Object) record(null)}.
     */
    void record();
    /**
     * 记录
     *
     * Records the caller's current stack trace and the specified additional arbitrary information
     * so that the {@link ResourceLeakDetector} can tell where the leaked resource was accessed lastly.
     */
    void record(Object hint);

    /**
     * 关闭
     *
     * Close the leak so that {@link ResourceLeakTracker} does not warn about leaked resources.
     * After this method is called a leak associated with this ResourceLeakTracker should not be reported.
     *
     * @return {@code true} if called first time, {@code false} if called already
     */
    boolean close(T trackedObject);

}
```

- `#record(...)` 方法，出于调试目的，用一个额外的任意的( arbitrary )信息记录这个对象的当前访问地址。如果这个对象被检测到泄露了, 这个操作记录的信息将通过ResourceLeakDetector 提供。实际上，就是 `ReferenceCounted#touch(...)` 方法，会调用 `#record(...)` 方法。
- `#close(T trackedObject)` 方法，关闭 ResourceLeakTracker 。如果资源( 例如：ByteBuf 对象 )被正确释放，则会调用 `#close(T trackedObject)` 方法，关闭 ResourceLeakTracker ，从而结束追踪。这样，在 `ResourceLeakDetector#reportLeak()` 方法，就不会提示该资源泄露。

## 4.6 addExclusions

`#addExclusions(Class clz, String ... methodNames)` 方法，添加忽略方法的集合。代码如下：

```java
/**
 * 忽略的方法集合
 */
private static final AtomicReference<String[]> excludedMethods = new AtomicReference<String[]>(EmptyArrays.EMPTY_STRINGS);

public static void addExclusions(Class clz, String ... methodNames) {
    Set<String> nameSet = new HashSet<String>(Arrays.asList(methodNames));
    // Use loop rather than lookup. This avoids knowing the parameters, and doesn't have to handle
    // NoSuchMethodException.
    for (Method method : clz.getDeclaredMethods()) {
        if (nameSet.remove(method.getName()) && nameSet.isEmpty()) {
            break;
        }
    }
    if (!nameSet.isEmpty()) {
        throw new IllegalArgumentException("Can't find '" + nameSet + "' in " + clz.getName());
    }
    String[] oldMethods;
    String[] newMethods;
    do {
        oldMethods = excludedMethods.get();
        newMethods = Arrays.copyOf(oldMethods, oldMethods.length + 2 * methodNames.length);
        for (int i = 0; i < methodNames.length; i++) {
            newMethods[oldMethods.length + i * 2] = clz.getName();
            newMethods[oldMethods.length + i * 2 + 1] = methodNames[i];
        }
    } while (!excludedMethods.compareAndSet(oldMethods, newMethods));
}
```

- 代码比较简单，胖友自己理解。

- 具体的用途，可参见 [「7. Record」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 的 `#toString()` 方法。

- 目前调用该静态方法的有如下几处：

  ```java
  // AbstractByteBufAllocator.java
  static {
      ResourceLeakDetector.addExclusions(AbstractByteBufAllocator.class, "toLeakAwareBuffer");
  }
  
  // AdvancedLeakAwareByteBuf.java
  static {
      ResourceLeakDetector.addExclusions(AdvancedLeakAwareByteBuf.class, "touch", "recordLeakNonRefCountingOperation");
  }
  
  // ReferenceCountUtil.java
  static {
      ResourceLeakDetector.addExclusions(ReferenceCountUtil.class, "touch");
  }
  ```

## 5.1 DefaultResourceLeak

DefaultResourceLeak ，继承 `java.lang.ref.WeakReference` 类，实现 ResourceLeakTracker 接口，默认 ResourceLeakTracker 实现类。同时，它是 ResourceLeakDetector 内部静态类。即：

```java
// ... 简化无关代码
public class ResourceLeakDetector<T> {

    private static final class DefaultResourceLeak<T> extends WeakReference<Object> implements ResourceLeakTracker<T>, ResourceLeak {
    }

}
```

那么为什么要继承 `java.lang.ref.WeakReference` 类呢？在 [「5.1.1 构造方法」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 见分晓。

### 5.1.1 构造方法

```java
/**
 * {@link #head} 的更新器
 */
@SuppressWarnings("unchecked") // generics and updaters do not mix.
private static final AtomicReferenceFieldUpdater<DefaultResourceLeak<?>, Record> headUpdater =
        (AtomicReferenceFieldUpdater)
                AtomicReferenceFieldUpdater.newUpdater(DefaultResourceLeak.class, Record.class, "head");

/**
 * {@link #droppedRecords} 的更新器
 */
@SuppressWarnings("unchecked") // generics and updaters do not mix.
private static final AtomicIntegerFieldUpdater<DefaultResourceLeak<?>> droppedRecordsUpdater =
        (AtomicIntegerFieldUpdater)
                AtomicIntegerFieldUpdater.newUpdater(DefaultResourceLeak.class, "droppedRecords");

/**
 * Record 链的头节点
 *
 * 看完 {@link #record()} 方法后，实际上，head 是尾节点，即最后( 新 )的一条 Record 。
 */
@SuppressWarnings("unused")
private volatile Record head;
/**
 * 丢弃的 Record 计数
 */
@SuppressWarnings("unused")
private volatile int droppedRecords;

/**
 * DefaultResourceLeak 集合。来自 {@link ResourceLeakDetector#allLeaks}
 */
private final ConcurrentMap<DefaultResourceLeak<?>, LeakEntry> allLeaks;
/**
 * hash 值
 *
 * 保证 {@link #close(Object)} 传入的对象，就是 {@link #referent} 对象
 */
private final int trackedHash;

  1: DefaultResourceLeak(
  2:         Object referent,
  3:         ReferenceQueue<Object> refQueue,
  4:         ConcurrentMap<DefaultResourceLeak<?>, LeakEntry> allLeaks) {
  5:     // 父构造方法 <1>
  6:     super(referent, refQueue);
  7: 
  8:     assert referent != null;
  9: 
 10:     // Store the hash of the tracked object to later assert it in the close(...) method.
 11:     // It's important that we not store a reference to the referent as this would disallow it from
 12:     // be collected via the WeakReference.
 13:     trackedHash = System.identityHashCode(referent);
 14:     allLeaks.put(this, LeakEntry.INSTANCE);
 15:     // Create a new Record so we always have the creation stacktrace included.
 16:     headUpdater.set(this, new Record(Record.BOTTOM));
 17:     this.allLeaks = allLeaks;
 18: }
```

- `head`属性，Record 链的头节点。
  
  - 为什么说它是链呢？详细解析，胖友可以先跳到 [「7. Record」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 。
  - 实际上，`head` 是尾节点，即最后( 新 )的一条 Record 记录。详细解析，见 [「5.1.2 record」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 。
  - 在【第 16 行】代码，会默认创建尾节点 `Record.BOTTOM` 。

- `droppedRecords` 属性，丢弃的 Record 计数。详细解析，见 [「5.1.2 record」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 。

- `allLeaks`属性，DefaultResourceLeak 集合。来自`ResourceLeakDetector.allLeaks`属性。
  
  - 在【第 14 行】代码，会将自己添加到 `allLeaks` 中。

- `trackedHash`属性，hash 值。保证在`#close(T trackedObject)`方法，传入的对象，就是`referent`
  
   属性，即就是 DefaultResourceLeak 指向的资源( 例如：ByteBuf 对象 )。详细解析，见「5.1.4 close」

  - 在【第 10 至 13 行】代码，计算并初始化 `trackedHash` 属性。

- 【重要】在 `<1>` 处，会将 `referent`( 资源，例如：ByteBuf 对象 )和 `refQueue`( 引用队列 )传入父 WeakReference 构造方法。

  > FROM [《译文：理解Java中的弱引用》](https://droidyue.com/blog/2014/10/12/understanding-weakreference-in-java/index.html)
  >
  > **引用队列(Reference Queue)**
  >
  > 一旦弱引用对象开始返回null，该弱引用指向的对象就被标记成了垃圾。而这个弱引用对象（非其指向的对象）就没有什么用了。通常这时候需要进行一些清理工作。比如WeakHashMap会在这时候移除没用的条目来避免保存无限制增长的没有意义的弱引用。
  >
  > 引用队列可以很容易地实现跟踪不需要的引用。当你在构造WeakReference时传入一个ReferenceQueue对象，当该引用指向的对象被标记为垃圾的时候，这个引用对象会自动地加入到引用队列里面。接下来，你就可以在固定的周期，处理传入的引用队列，比如做一些清理工作来处理这些没有用的引用对象。

  - 也就是说，`referent` 被标记为垃圾的时候，它对应的 WeakReference 对象会被添加到 `refQueue` 队列中。**在此处，即将 DefaultResourceLeak 添加到 `referent` 队列中**。
  - 那又咋样呢？假设 `referent` 为 ByteBuf 对象。如果它被正确的释放，即调用了 [「3.3.4 release」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 方法，从而调用了 `AbstractReferenceCountedByteBuf#closeLeak()` 方法，最终调用到 `ResourceLeakTracker#close(trackedByteBuf)` 方法，那么该 ByteBuf 对象对应的 ResourceLeakTracker 对象，将从 `ResourceLeakDetector.allLeaks` 中移除。
  - 那这又意味着什么呢？ 在 `ResourceLeakDetector#reportLeak()` 方法中，即使从 `refQueue` 队列中，获取到该 ByteBuf 对象对应 ResourceLeakTracker 对象，因为在 `ResourceLeakDetector.allLeaks` 中移除了，所以在 `ResourceLeakDetector#reportLeak()` 方法的【第 19 行】代码 `!ref.dispose() = true` ，直接 `continue` 。
  - 😈 比较绕，胖友再好好理解下。胖友可以在思考下，如果 ByteBuf 对象，没有被正确的释放，是怎么样一个流程。

### 5.1.2 record

`#record(...)` 方法，创建 Record 对象，添加到 `head` 链中。代码如下：

```java
@Override
public void record() {
    record0(null);
}
@Override
public void record(Object hint) {
    record0(hint);
}

/**
 * This method works by exponentially backing off as more records are present in the stack. Each record has a
 * 1 / 2^n chance of dropping the top most record and replacing it with itself. This has a number of convenient
 * properties:
 *
 * <ol>
 * <li>  The current record is always recorded. This is due to the compare and swap dropping the top most
 *       record, rather than the to-be-pushed record.
 * <li>  The very last access will always be recorded. This comes as a property of 1.
 * <li>  It is possible to retain more records than the target, based upon the probability distribution.
 * <li>  It is easy to keep a precise record of the number of elements in the stack, since each element has to
 *     know how tall the stack is.
 * </ol>
 *
 * In this particular implementation, there are also some advantages. A thread local random is used to decide
 * if something should be recorded. This means that if there is a deterministic access pattern, it is now
 * possible to see what other accesses occur, rather than always dropping them. Second, after
 * {@link #TARGET_RECORDS} accesses, backoff occurs. This matches typical access patterns,
 * where there are either a high number of accesses (i.e. a cached buffer), or low (an ephemeral buffer), but
 * not many in between.
 *
 * The use of atomics avoids serializing a high number of accesses, when most of the records will be thrown
 * away. High contention only happens when there are very few existing records, which is only likely when the
 * object isn't shared! If this is a problem, the loop can be aborted and the record dropped, because another
 * thread won the race.
 */
  1: private void record0(Object hint) {
  2:     // Check TARGET_RECORDS > 0 here to avoid similar check before remove from and add to lastRecords
  3:     if (TARGET_RECORDS > 0) {
  4:         Record oldHead;
  5:         Record prevHead;
  6:         Record newHead;
  7:         boolean dropped;
  8:         do {
  9:             // 已经关闭，则返回
 10:             if ((prevHead = oldHead = headUpdater.get(this)) == null) {
 11:                 // already closed.
 12:                 return;
 13:             }
 14:             // 当超过 TARGET_RECORDS 数量时，随机丢到头节点。
 15:             final int numElements = oldHead.pos + 1;
 16:             if (numElements >= TARGET_RECORDS) {
 17:                 final int backOffFactor = Math.min(numElements - TARGET_RECORDS, 30);
 18:                 if (dropped = PlatformDependent.threadLocalRandom().nextInt(1 << backOffFactor) != 0) {
 19:                     prevHead = oldHead.next;
 20:                 }
 21:             } else {
 22:                 dropped = false;
 23:             }
 24:             // 创建新的头节点
 25:             newHead = hint != null ? new Record(prevHead, hint) : new Record(prevHead);
 26:         } while (!headUpdater.compareAndSet(this, oldHead, newHead)); // cas 修改头节点
 27:         // 若丢弃，增加 droppedRecordsUpdater 计数
 28:         if (dropped) {
 29:             droppedRecordsUpdater.incrementAndGet(this);
 30:         }
 31:     }
 32: }
```

- 第 9 至 13 行：通过 `headUpdater` 获得 `head` 属性，若为 `null` 时，说明 DefaultResourceLeak 已经关闭。为什么呢？详细可见 [「5.1.4 close」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 和 [5.1.5 toString](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 。
- 第 14 至 23 行：当当前 DefaultResourceLeak 对象所拥有的 Record 数量超过 `TARGET_RECORDS` 时，随机丢弃当前 `head` 节点的数据。也就是说，尽量保留**老**的 Record 节点。这是为什么呢?越是**老**( 开始 )的 Record 节点，越有利于排查问题。另外，随机丢弃的的概率，按照 `1 - (1 / 2^n）` 几率，越来越**大**。
- 第 25 行：创建新 Record 对象，作为头节点，指向**原头节点**。这也是为什么说，“实际上，head 是尾节点，即最后( 新 )的一条 Record”。
- 第 26 行：通过 CAS 的方式，修改新创建的 Record 对象为头节点。
- 第 27 至 30 行：若丢弃，增加 `droppedRecordsUpdater` 计数。

### 5.1.3 dispose

`#dispose()` 方法， 清理，并返回是否内存泄露。代码如下：

```java
// 清理，并返回是否内存泄露
boolean dispose() {
    // 清理 referent 的引用
    clear();
    // 移除出 allLeaks 。移除成功，意味着内存泄露。
    return allLeaks.remove(this, LeakEntry.INSTANCE);
}
```

### 5.1.4 close

`#close(T trackedObject)` 方法，关闭 DefaultResourceLeak 对象。代码如下：

```java
 1: @Override
 2: public boolean close(T trackedObject) {
 3:     // 校验一致
 4:     // Ensure that the object that was tracked is the same as the one that was passed to close(...).
 5:     assert trackedHash == System.identityHashCode(trackedObject);
 6: 
 7:     // 关闭
 8:     // We need to actually do the null check of the trackedObject after we close the leak because otherwise
 9:     // we may get false-positives reported by the ResourceLeakDetector. This can happen as the JIT / GC may
10:     // be able to figure out that we do not need the trackedObject anymore and so already enqueue it for
11:     // collection before we actually get a chance to close the enclosing ResourceLeak.
12:     return close() && trackedObject != null;
13: }
```

- 第 5 行：校验一致性。

- 第 12 行：调用 `#close()` 方法，关闭 DefaultResourceLeak 对象。代码如下：

  ```java
  @Override
  public boolean close() {
      // 移除出 allLeaks
      // Use the ConcurrentMap remove method, which avoids allocating an iterator.
      if (allLeaks.remove(this, LeakEntry.INSTANCE)) {
          // 清理 referent 的引用
          // Call clear so the reference is not even enqueued.
          clear();
          // 置空 head
          headUpdater.set(this, null);
          return true; // 返回成功
      }
      return false; // 返回失败
  }
  ```

  - 关闭时，会将 DefaultResourceLeak 对象，从 `allLeaks` 中移除。

### 5.1.5 toString

当 DefaultResourceLeak 追踪到内存泄露，会在 `ResourceLeakDetector#reportLeak()` 方法中，调用 `DefaultResourceLeak#toString()` 方法，拼接提示信息。代码如下：

```java
@Override
public String toString() {
    // 获得 head 属性，并置空 <1>
    Record oldHead = headUpdater.getAndSet(this, null);
    // 若为空，说明已经关闭。
    if (oldHead == null) {
        // Already closed
        return EMPTY_STRING;
    }

    final int dropped = droppedRecordsUpdater.get(this);
    int duped = 0;

    int present = oldHead.pos + 1;
    // Guess about 2 kilobytes per stack trace
    StringBuilder buf = new StringBuilder(present * 2048).append(NEWLINE);
    buf.append("Recent access records: ").append(NEWLINE);

    // 拼接 Record 练
    int i = 1;
    Set<String> seen = new HashSet<String>(present);
    for (; oldHead != Record.BOTTOM; oldHead = oldHead.next) {
        String s = oldHead.toString();
        if (seen.add(s)) { // 是否重复
            if (oldHead.next == Record.BOTTOM) {
                buf.append("Created at:").append(NEWLINE).append(s);
            } else {
                buf.append('#').append(i++).append(':').append(NEWLINE).append(s);
            }
        } else {
            duped++;
        }
    }

    // 拼接 duped ( 重复 ) 次数
    if (duped > 0) {
        buf.append(": ")
                .append(dropped)
                .append(" leak records were discarded because they were duplicates")
                .append(NEWLINE);
    }

    // 拼接 dropped (丢弃) 次数
    if (dropped > 0) {
        buf.append(": ")
           .append(dropped)
           .append(" leak records were discarded because the leak record count is targeted to ")
           .append(TARGET_RECORDS)
           .append(". Use system property ")
           .append(PROP_TARGET_RECORDS)
           .append(" to increase the limit.")
           .append(NEWLINE);
    }

    buf.setLength(buf.length() - NEWLINE.length());
    return buf.toString();
}
```

- 代码比较简单，胖友自己看注释。
- `<1>` 处，真的是个神坑。如果胖友在 IDEA 调试时，因为默认会调用对应的 `#toString()` 方法，会导致 `head` 属性被错误的重置为 `null` 值。wtf！！！笔者在这里卡了好久好久。

# 6. LeakEntry

LeakEntry ，用于 `ResourceLeakDetector.allLeaks` 属性的 value 值。代码如下：

```java
private static final class LeakEntry {

    /**
     * 单例
     */
    static final LeakEntry INSTANCE = new LeakEntry();

    /**
     * hash 值，避免重复计算
     */
    private static final int HASH = System.identityHashCode(INSTANCE);

    private LeakEntry() { // 禁止创建，仅使用 INSTANCE 单例
    }

    @Override
    public int hashCode() {
        return HASH;
    }

    @Override
    public boolean equals(Object obj) {
        return obj == this;
    }

}
```

😈 没有什么功能逻辑。

# 7. Record

Record ，记录。每次调用 `ResourceLeakTracker#touch(...)` 方法后，会产生响应的 Record 对象。代码如下：

```java
private static final class Record extends Throwable {

    private static final long serialVersionUID = 6065153674892850720L;

    /**
     * 尾节点的单例
     */
    private static final Record BOTTOM = new Record();

    /**
     * hint 字符串
     */
    private final String hintString;
    /**
     * 下一个节点
     */
    private final Record next;
    /**
     * 位置
     */
    private final int pos;

    // =========== 构造方法 ===========

    Record(Record next, Object hint) {
        // This needs to be generated even if toString() is never called as it may change later on.
        hintString = hint instanceof ResourceLeakHint ? ((ResourceLeakHint) hint).toHintString() : hint.toString(); // <1>
        this.next = next;
        this.pos = next.pos + 1;
    }

    Record(Record next) {
       hintString = null;
       this.next = next;
       this.pos = next.pos + 1;
    }

    // Used to terminate the stack
    private Record() {
        hintString = null;
        next = null;
        pos = -1;
    }

    // =========== toString ===========

    @Override
    public String toString() {
        StringBuilder buf = new StringBuilder(2048);
        if (hintString != null) {
            buf.append("\tHint: ").append(hintString).append(NEWLINE);
        }

        // Append the stack trace.
        StackTraceElement[] array = getStackTrace();
        // Skip the first three elements.
        out: for (int i = 3; i < array.length; i++) {
            StackTraceElement element = array[i];
            // 跳过忽略的方法 <2>
            // Strip the noisy stack trace elements.
            String[] exclusions = excludedMethods.get();
            for (int k = 0; k < exclusions.length; k += 2) {
                if (exclusions[k].equals(element.getClassName())
                        && exclusions[k + 1].equals(element.getMethodName())) {
                    continue out;
                }
            }

            buf.append('\t');
            buf.append(element.toString());
            buf.append(NEWLINE);
        }
        return buf.toString();
    }

}
```

- 通过 `next` 属性，我们可以得知，Record 是链式结构。
- `<1>` 处，如果传入的 `hint` 类型为 ResourceLeakHint 类型，会调用对应的 `#toHintString()` 方法，拼接更友好的字符串提示信息。
- `<2>` 处，如果调用栈的方法在 `ResourceLeakDetector.exclusions` 属性中，进行忽略。

# 8. ResourceLeakHint

`io.netty.util.ResourceLeakHint` ，接口，提供人类可读( 易懂 )的提示信息，使用在 ResourceLeakDetector 中。代码如下：

```java
/**
 * A hint object that provides human-readable message for easier resource leak tracking.
 */
public interface ResourceLeakHint {

    /**
     * Returns a human-readable message that potentially enables easier resource leak tracking.
     */
    String toHintString();

}
```

目前它的实现类是 AbstractChannelHandlerContext 。对应的实现方法如下：

```java
/**
 * 名字
 */
private final String name;

@Override
public String toHintString() {
    return '\'' + name + "' will handle the message from this point.";
}
```

# 666. 彩蛋

比想象中长很多的文章，也比想象中花费了更多时间的文章。主要是 xxx 的 [「5.1.5 toString」](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/#) 中卡了好久啊！！！！

推荐阅读文章：

- [《Netty 学习笔记 —— Reference Count》](https://skyao.gitbooks.io/learning-netty/content/buffer/reference_count.html)
- 唯有坚持不懈 [《Netty学习之旅—-源码分析Netty内存泄漏检测》](https://blog.csdn.net/prestigeding/article/details/54233327)

上述两篇文章，因为分析的 Netty 不是最新版本，所以代码会有一些差异，例如 `maxActive` 已经被去除。

# Buffer 之 ByteBufAllocator（一）简介

# 1. 概述

本文，我们来分享 ByteBufAllocator 。它是 ByteBuf 的分配器，负责创建 ByteBuf 对象。它的子类类图如下：[![类图](http://static.iocoder.cn/images/Netty/2018_08_20/01.png)](http://static.iocoder.cn/images/Netty/2018_08_20/01.png)类图

主要有三个子类：

- PreferHeapByteBufAllocator ，倾向创建 **Heap** ByteBuf 的分配器。
- PooledByteBufAllocator ，基于**内存池**的 ByteBuf 的分配器。
- UnpooledByteBufAllocator ，**普通**的 ByteBuf 的分配器。

本文分享上面类图红框部分，后面两篇文章再分别分享 UnpooledByteBufAllocator 和 PooledByteBufAllocator 。

# 2. ByteBufAllocator

`io.netty.buffer.ByteBufAllocator` ，ByteBuf 分配器**接口**。

还是老样子，我们逐个来看看每个方法。

## 2.1 DEFAULT

```java
ByteBufAllocator DEFAULT = ByteBufUtil.DEFAULT_ALLOCATOR;
```

- 默认 ByteBufAllocator 对象，通过 `ByteBufUtil.DEFAULT_ALLOCATOR` 中获得。代码如下：

  ```java
  static final ByteBufAllocator DEFAULT_ALLOCATOR;
  
  static {
      // 读取 ByteBufAllocator 配置
      String allocType = SystemPropertyUtil.get("io.netty.allocator.type", PlatformDependent.isAndroid() ? "unpooled" : "pooled");
      allocType = allocType.toLowerCase(Locale.US).trim();
  
      // 读取 ByteBufAllocator 对象
      ByteBufAllocator alloc;
      if ("unpooled".equals(allocType)) {
          alloc = UnpooledByteBufAllocator.DEFAULT;
          logger.debug("-Dio.netty.allocator.type: {}", allocType);
      } else if ("pooled".equals(allocType)) {
          alloc = PooledByteBufAllocator.DEFAULT;
          logger.debug("-Dio.netty.allocator.type: {}", allocType);
      } else {
          alloc = PooledByteBufAllocator.DEFAULT;
          logger.debug("-Dio.netty.allocator.type: pooled (unknown: {})", allocType);
      }
  
      DEFAULT_ALLOCATOR = alloc;
  
      // ... 省略无关代码
  }
  ```

  - 在非 Android 环境下，使用 PooledByteBufAllocator 作为默认 ByteBufAllocator 对象。
  - 在 Android 环境下，使用 UnpooledByteBufAllocator 作为默认 ByteBufAllocator 对象。因为 Android 客户端的内存相对有限。

## 2.2 buffer

`#buffer(...)` 方法，创建一个 ByteBuf 对象。具体创建的是 Heap ByteBuf 还是 Direct ByteBuf ，由实现类决定。

```java
/**
 * Allocate a {@link ByteBuf}. If it is a direct or heap buffer
 * depends on the actual implementation.
 */
ByteBuf buffer();
ByteBuf buffer(int initialCapacity);
ByteBuf buffer(int initialCapacity, int maxCapacity);
```

### 2.2.1 ioBuffer

`#ioBuffer(...)` 方法，创建一个用于 IO 操作的 ByteBuf 对象。倾向于 Direct ByteBuf ，因为对于 IO 操作来说，性能更优。

```java
/**
 * Allocate a {@link ByteBuf}, preferably a direct buffer which is suitable for I/O.
 */
ByteBuf ioBuffer();
ByteBuf ioBuffer(int initialCapacity);
ByteBuf ioBuffer(int initialCapacity, int maxCapacity);
```

### 2.2.2 heapBuffer

`#heapBuffer(...)` 方法，创建一个 Heap Buffer 对象。代码如下：

```java
/**
 * Allocate a heap {@link ByteBuf}.
 */
ByteBuf heapBuffer();
ByteBuf heapBuffer(int initialCapacity);
ByteBuf heapBuffer(int initialCapacity, int maxCapacity);
```

### 2.2.3 directBuffer

`#directBuffer(...)` 方法，创建一个 Direct Buffer 对象。代码如下：

```java
/**
 * Allocate a direct {@link ByteBuf} with the given initial capacity.
 */
ByteBuf directBuffer(int initialCapacity);
ByteBuf directBuffer(int initialCapacity, int maxCapacity);
CompositeByteBuf compositeBuffer();
```

## 2.3 compositeBuffer

`#compositeBuffer(...)` 方法，创建一个 Composite ByteBuf 对象。具体创建的是 Heap ByteBuf 还是 Direct ByteBuf ，由实现类决定。

```java
/**
 * Allocate a {@link CompositeByteBuf}.
 * If it is a direct or heap buffer depends on the actual implementation.
 */
CompositeByteBuf compositeBuffer();
CompositeByteBuf compositeBuffer(int maxNumComponents);
```

### 2.3.1 compositeHeapBuffer

`#compositeHeapBuffer(...)` 方法，创建一个 Composite Heap ByteBuf 对象。代码如下：

```java
/**
 * Allocate a heap {@link CompositeByteBuf}.
 */
CompositeByteBuf compositeHeapBuffer();
CompositeByteBuf compositeHeapBuffer(int maxNumComponents);
```

### 2.3.2 compositeDirectBuffer

`#compositeDirectBuffer(...)` 方法，创建一个 Composite Direct ByteBuf 对象。代码如下：

```java
/**
 * Allocate a direct {@link CompositeByteBuf}.
 */
CompositeByteBuf compositeDirectBuffer();
CompositeByteBuf compositeDirectBuffer(int maxNumComponents);
```

## 2.4 isDirectBufferPooled

`#isDirectBufferPooled()` 方法，是否基于 Direct ByteBuf 对象池。代码如下：

```java
/**
 * Returns {@code true} if direct {@link ByteBuf}'s are pooled
 */
boolean isDirectBufferPooled();
```

## 2.5 calculateNewCapacity

`#calculateNewCapacity(int minNewCapacity, int maxCapacity)` 方法，在 ByteBuf 扩容时，计算新的容量，该容量的值在 `[minNewCapacity, maxCapacity]` 范围内。代码如下：

```java
/**
 * Calculate the new capacity of a {@link ByteBuf} that is used when a {@link ByteBuf} needs to expand by the
 * {@code minNewCapacity} with {@code maxCapacity} as upper-bound.
 */
int calculateNewCapacity(int minNewCapacity, int maxCapacity);
```

# 3. AbstractByteBufAllocator

`io.netty.buffer.AbstractByteBufAllocator` ，实现 ByteBufAllocator 接口，ByteBufAllocator 抽象实现类，为 PooledByteBufAllocator 和 UnpooledByteBufAllocator 提供公共的方法。

## 3.1 构造方法

```java
/**
 * 是否倾向创建 Direct ByteBuf
 */
private final boolean directByDefault;
/**
 * 空 ByteBuf 缓存
 */
private final ByteBuf emptyBuf;

/**
 * Instance use heap buffers by default
 */
protected AbstractByteBufAllocator() {
    this(false);
}

/**
 * Create new instance
 *
 * @param preferDirect {@code true} if {@link #buffer(int)} should try to allocate a direct buffer rather than
 *                     a heap buffer
 */
protected AbstractByteBufAllocator(boolean preferDirect) {
    directByDefault = preferDirect && PlatformDependent.hasUnsafe(); // 支持 Unsafe
    emptyBuf = new EmptyByteBuf(this);
}
```

- `directByDefault` 属性，是否倾向创建 Direct ByteBuf 。有一个前提是需要支持 Unsafe 操作。
- `emptyBuf` 属性，空 ByteBuf 缓存对象。用于 `#buffer()` 等方法，创建**空** ByteBuf 对象时。

## 3.2 buffer

```java
@Override
public ByteBuf buffer() {
    if (directByDefault) {
        return directBuffer();
    }
    return heapBuffer();
}
@Override
public ByteBuf buffer(int initialCapacity) {
    if (directByDefault) {
        return directBuffer(initialCapacity);
    }
    return heapBuffer(initialCapacity);
}
@Override
public ByteBuf buffer(int initialCapacity, int maxCapacity) {
    if (directByDefault) {
        return directBuffer(initialCapacity, maxCapacity);
    }
    return heapBuffer(initialCapacity, maxCapacity);
}
```

- 根据 `directByDefault` 的值，调用 `#directBuffer(...)` 方法，还是调用 `#heapBuffer(...)` 方法。

### 3.2.1 ioBuffer

```java
/**
 * 默认容量大小
 */
static final int DEFAULT_INITIAL_CAPACITY = 256;

@Override
public ByteBuf ioBuffer() {
    if (PlatformDependent.hasUnsafe()) {
        return directBuffer(DEFAULT_INITIAL_CAPACITY);
    }
    return heapBuffer(DEFAULT_INITIAL_CAPACITY);
}

@Override
public ByteBuf ioBuffer(int initialCapacity) {
    if (PlatformDependent.hasUnsafe()) {
        return directBuffer(initialCapacity);
    }
    return heapBuffer(initialCapacity);
}

@Override
public ByteBuf ioBuffer(int initialCapacity, int maxCapacity) {
    if (PlatformDependent.hasUnsafe()) {
        return directBuffer(initialCapacity, maxCapacity);
    }
    return heapBuffer(initialCapacity, maxCapacity);
}
```

- 根据是否支持 Unsafe 操作的情况，调用 `#directBuffer(...)` 方法，还是调用 `#heapBuffer(...)` 方法。

### 3.2.2 heapBuffer

```java
/**
 * 默认最大容量大小，无限。
 */
static final int DEFAULT_MAX_CAPACITY = Integer.MAX_VALUE;

@Override
public ByteBuf heapBuffer() {
    return heapBuffer(DEFAULT_INITIAL_CAPACITY, DEFAULT_MAX_CAPACITY);
}

@Override
public ByteBuf heapBuffer(int initialCapacity) {
    return heapBuffer(initialCapacity, DEFAULT_MAX_CAPACITY);
}

@Override
public ByteBuf heapBuffer(int initialCapacity, int maxCapacity) {
    // 空 ByteBuf 对象
    if (initialCapacity == 0 && maxCapacity == 0) {
        return emptyBuf;
    }
    validate(initialCapacity, maxCapacity); // 校验容量的参数
    // 创建 Heap ByteBuf 对象
    return newHeapBuffer(initialCapacity, maxCapacity);
}
```

- 最终调用 `#newHeapBuffer(int initialCapacity, int maxCapacity)` **抽象**方法，创建 Heap ByteBuf 对象。代码如下：

  ```java
  /**
   * Create a heap {@link ByteBuf} with the given initialCapacity and maxCapacity.
   */
  protected abstract ByteBuf newHeapBuffer(int initialCapacity, int maxCapacity);
  ```

  - 因为是否基于对象池的方式，创建 Heap ByteBuf 对象的实现会不同，所以需要抽象。

### 3.2.3 directBuffer

```java
@Override
public ByteBuf directBuffer() {
    return directBuffer(DEFAULT_INITIAL_CAPACITY, DEFAULT_MAX_CAPACITY);
}

@Override
public ByteBuf directBuffer(int initialCapacity) {
    return directBuffer(initialCapacity, DEFAULT_MAX_CAPACITY);
}

@Override
public ByteBuf directBuffer(int initialCapacity, int maxCapacity) {
    // 空 ByteBuf 对象
    if (initialCapacity == 0 && maxCapacity == 0) {
        return emptyBuf;
    }
    validate(initialCapacity, maxCapacity); // 校验容量的参数
    // 创建 Direct ByteBuf 对象
    return newDirectBuffer(initialCapacity, maxCapacity);
}
```

- 最终调用 `#newDirectBuffer(int initialCapacity, int maxCapacity)` **抽象**方法，创建 Direct ByteBuf 对象。代码如下：

  ```java
  /**
   * Create a direct {@link ByteBuf} with the given initialCapacity and maxCapacity.
   */
  protected abstract ByteBuf newDirectBuffer(int initialCapacity, int maxCapacity);
  ```

  - 因为是否基于对象池的方式，创建 Direct ByteBuf 对象的实现会不同，所以需要抽象。

## 3.3 compositeBuffer

```java
@Override
public CompositeByteBuf compositeBuffer() {
    if (directByDefault) {
        return compositeDirectBuffer();
    }
    return compositeHeapBuffer();
}

@Override
public CompositeByteBuf compositeBuffer(int maxNumComponents) {
    if (directByDefault) {
        return compositeDirectBuffer(maxNumComponents);
    }
    return compositeHeapBuffer(maxNumComponents);
}
```

- 根据 `directByDefault` 的值，调用 `#compositeDirectBuffer(...)` 方法，还是调用 `#compositeHeapBuffer(...)` 方法。

### 3.3.1 compositeHeapBuffer

```java
/**
 * Composite ByteBuf 可包含的 ByteBuf 的最大数量
 */
static final int DEFAULT_MAX_COMPONENTS = 16;

@Override
public CompositeByteBuf compositeHeapBuffer() {
    return compositeHeapBuffer(DEFAULT_MAX_COMPONENTS);
}

@Override
public CompositeByteBuf compositeHeapBuffer(int maxNumComponents) {
    return toLeakAwareBuffer(new CompositeByteBuf(this, false, maxNumComponents));
}
```

- 创建 CompositeByteBuf 对象，并且方法参数 `direct` 为 `false` ，表示 Heap 类型。
- 调用 `#toLeakAwareBuffer(CompositeByteBuf)` 方法，装饰成 LeakAware 的 ByteBuf 对象。

### 3.3.2 compositeDirectBuffer

```java
@Override
public CompositeByteBuf compositeDirectBuffer() {
    return compositeDirectBuffer(DEFAULT_MAX_COMPONENTS);
}

@Override
public CompositeByteBuf compositeDirectBuffer(int maxNumComponents) {
    return toLeakAwareBuffer(new CompositeByteBuf(this, true, maxNumComponents));
}
```

- 创建 CompositeByteBuf 对象，并且方法参数 `direct` 为 `true` ，表示 Direct 类型。
- 调用 `#toLeakAwareBuffer(CompositeByteBuf)` 方法，装饰成 LeakAware 的 ByteBuf 对象。

## 3.4 toLeakAwareBuffer

在 [《精尽 Netty 源码解析 —— Buffer 之 ByteBuf（三）内存泄露检测》](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector) 中的 [「3.1 创建 LeakAware ByteBuf 对象」](http://svip.iocoder.cn/Netty/ByteBuf-2-1-ByteBufAllocator-intro/#) 小节，已经详细解析。

## 3.5 calculateNewCapacity

```java
/**
 * 扩容分界线，4M
 */
static final int CALCULATE_THRESHOLD = 1048576 * 4; // 4 MiB page

  1: @Override
  2: public int calculateNewCapacity(int minNewCapacity, int maxCapacity) {
  3:     if (minNewCapacity < 0) {
  4:         throw new IllegalArgumentException("minNewCapacity: " + minNewCapacity + " (expected: 0+)");
  5:     }
  6:     if (minNewCapacity > maxCapacity) {
  7:         throw new IllegalArgumentException(String.format(
  8:                 "minNewCapacity: %d (expected: not greater than maxCapacity(%d)",
  9:                 minNewCapacity, maxCapacity));
 10:     }
 11:     final int threshold = CALCULATE_THRESHOLD; // 4 MiB page
 12: 
 13:     // <1> 等于 threshold ，直接返回 threshold 。
 14:     if (minNewCapacity == threshold) {
 15:         return threshold;
 16:     }
 17: 
 18:     // <2> 超过 threshold ，增加 threshold ，不超过 maxCapacity 大小。
 19:     // If over threshold, do not double but just increase by threshold.
 20:     if (minNewCapacity > threshold) {
 21:         int newCapacity = minNewCapacity / threshold * threshold;
 22:         if (newCapacity > maxCapacity - threshold) { // 不超过 maxCapacity
 23:             newCapacity = maxCapacity;
 24:         } else {
 25:             newCapacity += threshold;
 26:         }
 27:         return newCapacity;
 28:     }
 29: 
 30:     // <3> 未超过 threshold ，从 64 开始两倍计算，不超过 4M 大小。
 31:     // Not over threshold. Double up to 4 MiB, starting from 64.
 32:     int newCapacity = 64;
 33:     while (newCapacity < minNewCapacity) {
 34:         newCapacity <<= 1;
 35:     }
 36:     return Math.min(newCapacity, maxCapacity);
 37: }
```

- 按照 `CALCULATE_THRESHOLD` 作为分界线，分成 3 种情况：`<1>`/`<2>`/`<3>` 。代码比较简单，胖友自己看注释。

# 4. PreferHeapByteBufAllocator

`io.netty.channel.PreferHeapByteBufAllocator` ，实现 ByteBufAllocator 接口，**倾向创建 Heap ByteBuf** 的分配器。也就是说，`#buffer(...)` 和 `#ioBuffer(...)` 和 `#compositeBuffer(...)` 方法，创建的都是 Heap ByteBuf 对象。代码如下：

```java
/**
 * 真正的分配器对象
 */
private final ByteBufAllocator allocator;

public PreferHeapByteBufAllocator(ByteBufAllocator allocator) {
    this.allocator = ObjectUtil.checkNotNull(allocator, "allocator");
}

@Override
public ByteBuf buffer() {
    return allocator.heapBuffer();
}

@Override
public ByteBuf ioBuffer() {
    return allocator.heapBuffer();
}

@Override
public CompositeByteBuf compositeBuffer() {
    return allocator.compositeHeapBuffer();
}
```

其它方法，就是调用 `allocator` 的对应的方法。

# 666. 彩蛋

😈 小水文一篇。铺垫铺垫，你懂的。

# Buffer 之 ByteBufAllocator（二）UnpooledByteBufAllocator

# 1. 概述

本文，我们来分享 UnpooledByteBufAllocator ，**普通**的 ByteBuf 的分配器，**不基于内存池**。

# 2. ByteBufAllocatorMetricProvider

`io.netty.buffer.ByteBufAllocatorMetricProvider` ，ByteBufAllocator Metric 提供者接口，**用于监控 ByteBuf 的 Heap 和 Direct 占用内存的情况**。代码如下：

```
public interface ByteBufAllocatorMetricProvider {

    /**
     * Returns a {@link ByteBufAllocatorMetric} for a {@link ByteBufAllocator}.
     */
    ByteBufAllocatorMetric metric();

}
```

ByteBufAllocatorMetricProvider 有两个子类：UnpooledByteBufAllocator 和 PooledByteBufAllocator 。

# 3. ByteBufAllocatorMetric

`io.netty.buffer.ByteBufAllocatorMetric` ，ByteBufAllocator Metric 接口。代码如下：

```
public interface ByteBufAllocatorMetric {

    /**
     * Returns the number of bytes of heap memory used by a {@link ByteBufAllocator} or {@code -1} if unknown.
     *
     * 已使用 Heap 占用内存大小
     */
    long usedHeapMemory();

    /**
     * Returns the number of bytes of direct memory used by a {@link ByteBufAllocator} or {@code -1} if unknown.
     *
     * 已使用 Direct 占用内存大小
     */
    long usedDirectMemory();

}
```

ByteBufAllocatorMetric 有两个子类：UnpooledByteBufAllocatorMetric 和 PooledByteBufAllocatorMetric 。

## 3.1 UnpooledByteBufAllocatorMetric

UnpooledByteBufAllocatorMetric ，在 UnpooledByteBufAllocator 的**内部静态类**，实现 ByteBufAllocatorMetric 接口，UnpooledByteBufAllocator Metric 实现类。代码如下：

```
/**
 * Direct ByteBuf 占用内存大小
 */
final LongCounter directCounter = PlatformDependent.newLongCounter();
/**
 * Heap ByteBuf 占用内存大小
 */
final LongCounter heapCounter = PlatformDependent.newLongCounter();

@Override
public long usedHeapMemory() {
    return heapCounter.value();
}

@Override
public long usedDirectMemory() {
    return directCounter.value();
}
```

- 比较简单，两个计数器。

- `PlatformDependent#newLongCounter()` 方法，获得 LongCounter 对象。代码如下：

  ```
  /**
   * Creates a new fastest {@link LongCounter} implementation for the current platform.
   */
  public static LongCounter newLongCounter() {
      if (javaVersion() >= 8) {
          return new LongAdderCounter();
      } else {
          return new AtomicLongCounter();
      }
  }
  ```

  - 也就是说，JDK `>=8` 使用 `java.util.concurrent.atomic.LongAdder` ，JDK `<7` 使用 `java.util.concurrent.atomic.AtomicLong` 。相比来说，Metric 写多读少，所以 LongAdder 比 AtomicLong 更合适。对比的解析，可以看看 [《Java并发计数器探秘》](https://www.cnkirito.moe/java-concurrent-counter/) 。

# 4. UnpooledByteBufAllocator

`io.netty.buffer.UnpooledByteBufAllocator` ，实现 ByteBufAllocatorMetricProvider 接口，继承 AbstractByteBufAllocator 抽象类，**普通**的 ByteBuf 的分配器，**不基于内存池**。

## 4.1 构造方法

```
/**
 * Metric
 */
private final UnpooledByteBufAllocatorMetric metric = new UnpooledByteBufAllocatorMetric();
/**
 * 是否禁用内存泄露检测功能
 */
private final boolean disableLeakDetector;
/**
 * 不使用 `io.netty.util.internal.Cleaner` 释放 Direct ByteBuf
 *
 * @see UnpooledUnsafeNoCleanerDirectByteBuf
 * @see InstrumentedUnpooledUnsafeNoCleanerDirectByteBuf
 */
private final boolean noCleaner;

public UnpooledByteBufAllocator(boolean preferDirect) {
    this(preferDirect, false);
}

public UnpooledByteBufAllocator(boolean preferDirect, boolean disableLeakDetector) {
    this(preferDirect, disableLeakDetector, PlatformDependent.useDirectBufferNoCleaner() /** 返回 true **/ );
}

/**
 * Create a new instance
 *
 * @param preferDirect {@code true} if {@link #buffer(int)} should try to allocate a direct buffer rather than
 *                     a heap buffer
 * @param disableLeakDetector {@code true} if the leak-detection should be disabled completely for this
 *                            allocator. This can be useful if the user just want to depend on the GC to handle
 *                            direct buffers when not explicit released.
 * @param tryNoCleaner {@code true} if we should try to use {@link PlatformDependent#allocateDirectNoCleaner(int)}
 *                            to allocate direct memory.
 */
public UnpooledByteBufAllocator(boolean preferDirect, boolean disableLeakDetector, boolean tryNoCleaner) {
    super(preferDirect);
    this.disableLeakDetector = disableLeakDetector;
    noCleaner = tryNoCleaner && PlatformDependent.hasUnsafe() /** 返回 true **/
            && PlatformDependent.hasDirectBufferNoCleanerConstructor() /** 返回 true **/ ;
}
```

- `metric` 属性，UnpooledByteBufAllocatorMetric 对象。

- ```
  disableLeakDetector
  ```

   

  属性，是否禁用内存泄露检测功能。

  - 默认为 `false` 。

- ```
  noCleaner
  ```

   

  属性，是否不使用

   

  ```
  io.netty.util.internal.Cleaner
  ```

   

  来释放 Direct ByteBuf 。

  - 默认为 `true` 。
  - 详细解析，见 [「5.5 InstrumentedUnpooledUnsafeNoCleanerDirectByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-2-2-ByteBufAllocator-unpooled/#) 。

## 4.2 newHeapBuffer

```
@Override
protected ByteBuf newHeapBuffer(int initialCapacity, int maxCapacity) {
    return PlatformDependent.hasUnsafe() ?
            new InstrumentedUnpooledUnsafeHeapByteBuf(this, initialCapacity, maxCapacity) :
            new InstrumentedUnpooledHeapByteBuf(this, initialCapacity, maxCapacity);
}
```

- 创建的是以 `"Instrumented"` 的 Heap ByteBuf 对象，因为要结合 Metric 。详细解析，见 [「5. Instrumented ByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-2-2-ByteBufAllocator-unpooled/#) 。

## 4.3 newDirectBuffer

```
@Override
protected ByteBuf newDirectBuffer(int initialCapacity, int maxCapacity) {
    final ByteBuf buf;
    if (PlatformDependent.hasUnsafe()) {
        buf = noCleaner ? new InstrumentedUnpooledUnsafeNoCleanerDirectByteBuf(this, initialCapacity, maxCapacity) :
                new InstrumentedUnpooledUnsafeDirectByteBuf(this, initialCapacity, maxCapacity);
    } else {
        buf = new InstrumentedUnpooledDirectByteBuf(this, initialCapacity, maxCapacity);
    }
    return disableLeakDetector ? buf : toLeakAwareBuffer(buf);
}
```

- 创建的是以 `"Instrumented"` 的 Heap ByteBuf 对象，因为要结合 Metric 。详细解析，见 [「5. Instrumented ByteBuf」](http://svip.iocoder.cn/Netty/ByteBuf-2-2-ByteBufAllocator-unpooled/#) 。
- 结合了 `disableLeakDetector` 属性。

## 4.4 compositeHeapBuffer

```
@Override
public CompositeByteBuf compositeHeapBuffer(int maxNumComponents) {
    CompositeByteBuf buf = new CompositeByteBuf(this, false, maxNumComponents);
    return disableLeakDetector ? buf : toLeakAwareBuffer(buf);
}
```

- 结合了 `disableLeakDetector` 属性。

## 4.5 compositeDirectBuffer

```
@Override
public CompositeByteBuf compositeDirectBuffer(int maxNumComponents) {
    CompositeByteBuf buf = new CompositeByteBuf(this, true, maxNumComponents);
    return disableLeakDetector ? buf : toLeakAwareBuffer(buf);
}
```

- 结合了 `disableLeakDetector` 属性。

## 4.6 isDirectBufferPooled

```
@Override
public boolean isDirectBufferPooled() {
    return false;
}
```

## 4.7 Metric 相关操作方法

```
@Override
public ByteBufAllocatorMetric metric() {
    return metric;
}

void incrementDirect(int amount) { // 增加 Direct
    metric.directCounter.add(amount);
}
void decrementDirect(int amount) { // 减少 Direct
    metric.directCounter.add(-amount);
}

void incrementHeap(int amount) { // 增加 Heap
    metric.heapCounter.add(amount);
}
void decrementHeap(int amount) { // 减少 Heap
    metric.heapCounter.add(-amount);
}
```

# 5. Instrumented ByteBuf

因为要和 Metric 结合，所以通过**继承**的方式，进行增强。

## 5.1 InstrumentedUnpooledUnsafeHeapByteBuf

**Instrumented**UnpooledUnsafeHeapByteBuf ，在 UnpooledByteBufAllocator 的**内部静态类**，继承 UnpooledUnsafeHeapByteBuf 类。代码如下：

```
private static final class InstrumentedUnpooledUnsafeHeapByteBuf extends UnpooledUnsafeHeapByteBuf {

    InstrumentedUnpooledUnsafeHeapByteBuf(UnpooledByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
        super(alloc, initialCapacity, maxCapacity);
    }

    @Override
    protected byte[] allocateArray(int initialCapacity) {
        byte[] bytes = super.allocateArray(initialCapacity);
        // Metric ++
        ((UnpooledByteBufAllocator) alloc()).incrementHeap(bytes.length);
        return bytes;
    }

    @Override
    protected void freeArray(byte[] array) {
        int length = array.length;
        super.freeArray(array);
        // Metric --
        ((UnpooledByteBufAllocator) alloc()).decrementHeap(length);
    }

}
```

- 在原先的基础上，调用 Metric 相应的增减操作方法，得以记录 Heap 占用内存的大小。

## 5.2 InstrumentedUnpooledHeapByteBuf

**Instrumented**UnpooledHeapByteBuf ，在 UnpooledByteBufAllocator 的**内部静态类**，继承 UnpooledHeapByteBuf 类。代码如下：

```
private static final class InstrumentedUnpooledHeapByteBuf extends UnpooledHeapByteBuf {

    InstrumentedUnpooledHeapByteBuf(UnpooledByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
        super(alloc, initialCapacity, maxCapacity);
    }

    @Override
    protected byte[] allocateArray(int initialCapacity) {
        byte[] bytes = super.allocateArray(initialCapacity);
        // Metric ++
        ((UnpooledByteBufAllocator) alloc()).incrementHeap(bytes.length);
        return bytes;
    }

    @Override
    protected void freeArray(byte[] array) {
        int length = array.length;
        super.freeArray(array);
        // Metric --
        ((UnpooledByteBufAllocator) alloc()).decrementHeap(length);
    }

}
```

- 在原先的基础上，调用 Metric 相应的增减操作方法，得以记录 Heap 占用内存的大小。

## 5.3 InstrumentedUnpooledUnsafeDirectByteBuf

**Instrumented**UnpooledUnsafeDirectByteBuf ，在 UnpooledByteBufAllocator 的**内部静态类**，继承 UnpooledUnsafeDirectByteBuf 类。代码如下：

```
private static final class InstrumentedUnpooledUnsafeDirectByteBuf extends UnpooledUnsafeDirectByteBuf {
    InstrumentedUnpooledUnsafeDirectByteBuf(
            UnpooledByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
        super(alloc, initialCapacity, maxCapacity);
    }

    @Override
    protected ByteBuffer allocateDirect(int initialCapacity) {
        ByteBuffer buffer = super.allocateDirect(initialCapacity);
        // Metric ++
        ((UnpooledByteBufAllocator) alloc()).incrementDirect(buffer.capacity());
        return buffer;
    }

    @Override
    protected void freeDirect(ByteBuffer buffer) {
        int capacity = buffer.capacity();
        super.freeDirect(buffer);
        // Metric --
        ((UnpooledByteBufAllocator) alloc()).decrementDirect(capacity);
    }
}
```

- 在原先的基础上，调用 Metric 相应的增减操作方法，得以记录 Direct 占用内存的大小。

## 5.4 InstrumentedUnpooledDirectByteBuf

**Instrumented**UnpooledDirectByteBuf 的**内部静态类**，继承 UnpooledDirectByteBuf 类。代码如下：

```
private static final class InstrumentedUnpooledDirectByteBuf extends UnpooledDirectByteBuf {

    InstrumentedUnpooledDirectByteBuf(
            UnpooledByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
        super(alloc, initialCapacity, maxCapacity);
    }

    @Override
    protected ByteBuffer allocateDirect(int initialCapacity) {
        ByteBuffer buffer = super.allocateDirect(initialCapacity);
        // Metric ++
        ((UnpooledByteBufAllocator) alloc()).incrementDirect(buffer.capacity());
        return buffer;
    }

    @Override
    protected void freeDirect(ByteBuffer buffer) {
        int capacity = buffer.capacity();
        super.freeDirect(buffer);
        // Metric --
        ((UnpooledByteBufAllocator) alloc()).decrementDirect(capacity);
    }

}
```

- 在原先的基础上，调用 Metric 相应的增减操作方法，得以记录 Direct 占用内存的大小。

## 5.5 InstrumentedUnpooledUnsafeNoCleanerDirectByteBuf

**Instrumented**UnpooledDirectByteBuf 的**内部静态类**，继承 UnpooledUnsafeNoCleanerDirectByteBuf 类。代码如下：

```
private static final class InstrumentedUnpooledUnsafeNoCleanerDirectByteBuf
        extends UnpooledUnsafeNoCleanerDirectByteBuf {

    InstrumentedUnpooledUnsafeNoCleanerDirectByteBuf(
            UnpooledByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
        super(alloc, initialCapacity, maxCapacity);
    }

    @Override
    protected ByteBuffer allocateDirect(int initialCapacity) {
        ByteBuffer buffer = super.allocateDirect(initialCapacity);
        // Metric ++
        ((UnpooledByteBufAllocator) alloc()).incrementDirect(buffer.capacity());
        return buffer;
    }

    @Override
    ByteBuffer reallocateDirect(ByteBuffer oldBuffer, int initialCapacity) {
        int capacity = oldBuffer.capacity();
        ByteBuffer buffer = super.reallocateDirect(oldBuffer, initialCapacity);
        // Metric ++
        ((UnpooledByteBufAllocator) alloc()).incrementDirect(buffer.capacity() - capacity);
        return buffer;
    }

    @Override
    protected void freeDirect(ByteBuffer buffer) {
        int capacity = buffer.capacity();
        super.freeDirect(buffer);
        // Metric --
        ((UnpooledByteBufAllocator) alloc()).decrementDirect(capacity);
    }

}
```

- 在原先的基础上，调用 Metric 相应的增减操作方法，得以记录 Heap 占用内存的大小。

### 5.5.1 UnpooledUnsafeNoCleanerDirectByteBuf

`io.netty.buffer.UnpooledUnsafeNoCleanerDirectByteBuf` ，继承 UnpooledUnsafeDirectByteBuf 类。代码如下：

```
class UnpooledUnsafeNoCleanerDirectByteBuf extends UnpooledUnsafeDirectByteBuf {

    UnpooledUnsafeNoCleanerDirectByteBuf(ByteBufAllocator alloc, int initialCapacity, int maxCapacity) {
        super(alloc, initialCapacity, maxCapacity);
    }

    @Override
    protected ByteBuffer allocateDirect(int initialCapacity) {
        // 反射，直接创建 ByteBuffer 对象。并且该对象不带 Cleaner 对象
        return PlatformDependent.allocateDirectNoCleaner(initialCapacity);
    }

    ByteBuffer reallocateDirect(ByteBuffer oldBuffer, int initialCapacity) {
        return PlatformDependent.reallocateDirectNoCleaner(oldBuffer, initialCapacity);
    }

    @Override
    protected void freeDirect(ByteBuffer buffer) {
        // 直接释放 ByteBuffer 对象
        PlatformDependent.freeDirectNoCleaner(buffer);
    }

    @Override
    public ByteBuf capacity(int newCapacity) {
        checkNewCapacity(newCapacity);

        int oldCapacity = capacity();
        if (newCapacity == oldCapacity) {
            return this;
        }

        // 重新分配 ByteBuf 对象
        ByteBuffer newBuffer = reallocateDirect(buffer, newCapacity);

        if (newCapacity < oldCapacity) {
            if (readerIndex() < newCapacity) {
                // 重置 writerIndex 为 newCapacity ，避免越界
                if (writerIndex() > newCapacity) {
                    writerIndex(newCapacity);
                }
            } else {
                // 重置 writerIndex 和 readerIndex 为 newCapacity ，避免越界
                setIndex(newCapacity, newCapacity);
            }
        }

        // 设置 ByteBuf 对象
        setByteBuffer(newBuffer, false);
        return this;
    }

}
```

> FROM [《Netty源码分析（一） ByteBuf》](https://www.jianshu.com/p/b833254908f7)
>
> 和 UnpooledUnsafeDirectByteBuf 最大区别在于 UnpooledUnsafeNoCleanerDirectByteBuf 在 allocate的时候通过反射构造函数的方式创建DirectByteBuffer，这样在DirectByteBuffer中没有对应的Cleaner函数(通过ByteBuffer.allocateDirect的方式会自动生成Cleaner函数，Cleaner用于内存回收，具体可以看源码)，内存回收时，UnpooledUnsafeDirectByteBuf通过调用DirectByteBuffer中的Cleaner函数回收，而UnpooledUnsafeNoCleanerDirectByteBuf直接使用UNSAFE.freeMemory(address)释放内存地址。

# 666. 彩蛋

😈 小水文一篇。铺垫铺垫，你懂的。

# Buffer 之 ByteBufAllocator（三）PooledByteBufAllocator

# 1. 概述

本文，我们来分享 PooledByteBufAllocator ，基于**内存池**的 ByteBuf 的分配器。而 PooledByteBufAllocator 的内存池，是基于 **Jemalloc** 算法进行分配管理，所以在看本文之前，胖友先跳到 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（一）简介》](http://svip.iocoder.cn/Netty/ByteBuf-3-1-Jemalloc-intro) ，将 Jemalloc 相关的**几篇**文章看完，在回到此处。

# 2. PooledByteBufAllocatorMetric

`io.netty.buffer.PooledByteBufAllocatorMetric` ，实现 ByteBufAllocatorMetric 接口，PooledByteBufAllocator Metric 实现类。代码如下：

```
public final class PooledByteBufAllocatorMetric implements ByteBufAllocatorMetric {

    /**
     * PooledByteBufAllocator 对象
     */
    private final PooledByteBufAllocator allocator;

    PooledByteBufAllocatorMetric(PooledByteBufAllocator allocator) {
        this.allocator = allocator;
    }

    /**
     * Return the number of heap arenas.
     */
    public int numHeapArenas() {
        return allocator.numHeapArenas();
    }
    /**
     * Return the number of direct arenas.
     */
    public int numDirectArenas() {
        return allocator.numDirectArenas();
    }

    /**
     * Return a {@link List} of all heap {@link PoolArenaMetric}s that are provided by this pool.
     */
    public List<PoolArenaMetric> heapArenas() {
        return allocator.heapArenas();
    }
    /**
     * Return a {@link List} of all direct {@link PoolArenaMetric}s that are provided by this pool.
     */
    public List<PoolArenaMetric> directArenas() {
        return allocator.directArenas();
    }

    /**
     * Return the number of thread local caches used by this {@link PooledByteBufAllocator}.
     */
    public int numThreadLocalCaches() {
        return allocator.numThreadLocalCaches();
    }

    /**
     * Return the size of the tiny cache.
     */
    public int tinyCacheSize() {
        return allocator.tinyCacheSize();
    }
    /**
     * Return the size of the small cache.
     */
    public int smallCacheSize() {
        return allocator.smallCacheSize();
    }
    /**
     * Return the size of the normal cache.
     */
    public int normalCacheSize() {
        return allocator.normalCacheSize();
    }

    /**
     * Return the chunk size for an arena.
     */
    public int chunkSize() {
        return allocator.chunkSize();
    }

    @Override
    public long usedHeapMemory() {
        return allocator.usedHeapMemory();
    }
    @Override
    public long usedDirectMemory() {
        return allocator.usedDirectMemory();
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder(256);
        sb.append(StringUtil.simpleClassName(this))
                .append("(usedHeapMemory: ").append(usedHeapMemory())
                .append("; usedDirectMemory: ").append(usedDirectMemory())
                .append("; numHeapArenas: ").append(numHeapArenas())
                .append("; numDirectArenas: ").append(numDirectArenas())
                .append("; tinyCacheSize: ").append(tinyCacheSize())
                .append("; smallCacheSize: ").append(smallCacheSize())
                .append("; normalCacheSize: ").append(normalCacheSize())
                .append("; numThreadLocalCaches: ").append(numThreadLocalCaches())
                .append("; chunkSize: ").append(chunkSize()).append(')');
        return sb.toString();
    }

}
```

- 每个实现方法，都是调用 `allocator` 对应的方法。通过 PooledByteBufAllocatorMetric 的封装，可以统一获得 PooledByteBufAllocator Metric 相关的信息。

# 3. PooledByteBufAllocator

`io.netty.buffer.PooledByteBufAllocator` ，实现 ByteBufAllocatorMetricProvider 接口，实现 AbstractByteBufAllocator 抽象类，基于**内存池**的 ByteBuf 的分配器。

## 3.1 静态属性

```
/**
 * 默认 Heap 类型的 Arena 数量
 */
private static final int DEFAULT_NUM_HEAP_ARENA;
/**
 * 默认 Direct 类型的 Arena 数量
 */
private static final int DEFAULT_NUM_DIRECT_ARENA;

/**
 * 默认 Page 的内存大小，单位：B 。
 *
 * 默认配置，8192 B = 8 KB
 */
private static final int DEFAULT_PAGE_SIZE;
/**
 * {@link PoolChunk} 满二叉树的高度，默认为 11 。
 */
private static final int DEFAULT_MAX_ORDER; // 8192 << 11 = 16 MiB per chunk
/**
 * 默认 {@link PoolThreadCache} 的 tiny 类型的内存块的缓存数量。默认为 512 。
 *
 * @see #tinyCacheSize
 */
private static final int DEFAULT_TINY_CACHE_SIZE;
/**
 * 默认 {@link PoolThreadCache} 的 small 类型的内存块的缓存数量。默认为 256 。
 *
 * @see #smallCacheSize
 */
private static final int DEFAULT_SMALL_CACHE_SIZE;
/**
 * 默认 {@link PoolThreadCache} 的 normal 类型的内存块的缓存数量。默认为 64 。
 *
 * @see #normalCacheSize
 */
private static final int DEFAULT_NORMAL_CACHE_SIZE;
/**
 * 默认 {@link PoolThreadCache} 缓存的内存块的最大字节数
 */
private static final int DEFAULT_MAX_CACHED_BUFFER_CAPACITY;
/**
 * 默认 {@link PoolThreadCache}
 */
private static final int DEFAULT_CACHE_TRIM_INTERVAL;
/**
 * 默认是否使用 {@link PoolThreadCache}
 */
private static final boolean DEFAULT_USE_CACHE_FOR_ALL_THREADS;

/**
 * 默认 Direct 内存对齐基准
 */
private static final int DEFAULT_DIRECT_MEMORY_CACHE_ALIGNMENT;

/**
 * Page 的内存最小值。默认为 4KB = 4096B
 */
private static final int MIN_PAGE_SIZE = 4096;
/**
 * Chunk 的内存最大值。默认为 1GB
 */
private static final int MAX_CHUNK_SIZE = (int) (((long) Integer.MAX_VALUE + 1) / 2);

static {
    // 初始化 DEFAULT_PAGE_SIZE
    int defaultPageSize = SystemPropertyUtil.getInt("io.netty.allocator.pageSize", 8192);
    Throwable pageSizeFallbackCause = null;
    try {
        validateAndCalculatePageShifts(defaultPageSize);
    } catch (Throwable t) {
        pageSizeFallbackCause = t;
        defaultPageSize = 8192;
    }
    DEFAULT_PAGE_SIZE = defaultPageSize;

    // 初始化 DEFAULT_MAX_ORDER
    int defaultMaxOrder = SystemPropertyUtil.getInt("io.netty.allocator.maxOrder", 11);
    Throwable maxOrderFallbackCause = null;
    try {
        validateAndCalculateChunkSize(DEFAULT_PAGE_SIZE, defaultMaxOrder);
    } catch (Throwable t) {
        maxOrderFallbackCause = t;
        defaultMaxOrder = 11;
    }
    DEFAULT_MAX_ORDER = defaultMaxOrder;

    // Determine reasonable default for nHeapArena and nDirectArena.
    // Assuming each arena has 3 chunks, the pool should not consume more than 50% of max memory.
    final Runtime runtime = Runtime.getRuntime();

    /*
     * We use 2 * available processors by default to reduce contention as we use 2 * available processors for the
     * number of EventLoops in NIO and EPOLL as well. If we choose a smaller number we will run into hot spots as
     * allocation and de-allocation needs to be synchronized on the PoolArena.
     *
     * See https://github.com/netty/netty/issues/3888.
     */
    // 默认最小 Arena 个数。为什么这样计算，见上面的英文注释，大体的思路是，一个 EventLoop 一个 Arena ，避免多线程竞争。
    final int defaultMinNumArena = NettyRuntime.availableProcessors() * 2;
    // 初始化默认 Chunk 的内存大小。默认值为 8192 << 11 = 16 MiB per chunk
    final int defaultChunkSize = DEFAULT_PAGE_SIZE << DEFAULT_MAX_ORDER;
    // 初始化 DEFAULT_NUM_HEAP_ARENA
    DEFAULT_NUM_HEAP_ARENA = Math.max(0,
            SystemPropertyUtil.getInt(
                    "io.netty.allocator.numHeapArenas",
                    (int) Math.min(
                            defaultMinNumArena,
                            runtime.maxMemory() / defaultChunkSize / 2 / 3))); // `/ 2` 是为了不超过内存的一半，`/ 3` 是为了每个 Arena 有三个 Chunk
    // 初始化 DEFAULT_NUM_DIRECT_ARENA
    DEFAULT_NUM_DIRECT_ARENA = Math.max(0,
            SystemPropertyUtil.getInt(
                    "io.netty.allocator.numDirectArenas",
                    (int) Math.min(
                            defaultMinNumArena,
                            PlatformDependent.maxDirectMemory() / defaultChunkSize / 2 / 3)));

    // cache sizes
    // <1> 初始化 DEFAULT_TINY_CACHE_SIZE
    DEFAULT_TINY_CACHE_SIZE = SystemPropertyUtil.getInt("io.netty.allocator.tinyCacheSize", 512);
    // 初始化 DEFAULT_SMALL_CACHE_SIZE
    DEFAULT_SMALL_CACHE_SIZE = SystemPropertyUtil.getInt("io.netty.allocator.smallCacheSize", 256);
    // 初始化 DEFAULT_NORMAL_CACHE_SIZE
    DEFAULT_NORMAL_CACHE_SIZE = SystemPropertyUtil.getInt("io.netty.allocator.normalCacheSize", 64);

    // 初始化 DEFAULT_MAX_CACHED_BUFFER_CAPACITY
    // 32 kb is the default maximum capacity of the cached buffer. Similar to what is explained in
    // 'Scalable memory allocation using jemalloc'
    DEFAULT_MAX_CACHED_BUFFER_CAPACITY = SystemPropertyUtil.getInt("io.netty.allocator.maxCachedBufferCapacity", 32 * 1024);

    // 初始化 DEFAULT_CACHE_TRIM_INTERVAL
    // the number of threshold of allocations when cached entries will be freed up if not frequently used
    DEFAULT_CACHE_TRIM_INTERVAL = SystemPropertyUtil.getInt("io.netty.allocator.cacheTrimInterval", 8192);

    // 初始化 DEFAULT_USE_CACHE_FOR_ALL_THREADS
    DEFAULT_USE_CACHE_FOR_ALL_THREADS = SystemPropertyUtil.getBoolean("io.netty.allocator.useCacheForAllThreads", true);

    // 初始化 DEFAULT_DIRECT_MEMORY_CACHE_ALIGNMENT
    DEFAULT_DIRECT_MEMORY_CACHE_ALIGNMENT = SystemPropertyUtil.getInt("io.netty.allocator.directMemoryCacheAlignment", 0);

    // 打印调试日志( 省略... )
}
```

- 静态变量有点多，主要是为 PoolThreadCache 做的**默认**配置项。读过 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（六）PoolThreadCache》](http://svip.iocoder.cn/Netty/ByteBuf-2-3-ByteBufAllocator-pooled/精尽 Netty 源码解析 —— Buffer 之 Jemalloc（六）PoolThreadCache) 的胖友，是不是灰常熟悉。

- 比较有意思的是，

  ```
  DEFAULT_NUM_HEAP_ARENA
  ```

   

  和

   

  ```
  DEFAULT_NUM_DIRECT_ARENA
  ```

   

  变量的初始化，在

   

  ```
  <1>
  ```

   

  处。

  - 默认情况下，最小值是 `NettyRuntime.availableProcessors() * 2` ，也就是 CPU 线程数。这样的好处是， 一个 EventLoop 一个 Arena ，**避免多线程竞争**。更多的讨论，胖友可以看看 https://github.com/netty/netty/issues/3888 。
  - 比较有趣的一段是 `runtime.maxMemory() / defaultChunkSize / 2 / 3` 代码块。其中，`/ 2` 是为了保证 Arena 不超过内存的一半，而 `/ 3` 是为了每个 Arena 有三个 Chunk 。
  - 当然最终取值是上述两值的最小值。所以在推荐上，尽可能配置的内存，能够保证 `defaultMinNumArena` 。因为**要避免多线程竞争**。

## 3.2 validateAndCalculatePageShifts

`#validateAndCalculatePageShifts(int pageSize)` 方法，校验 `pageSize` 参数，并计算 `pageShift` 值。代码如下：

```
private static int validateAndCalculatePageShifts(int pageSize) {
    // 校验
    if (pageSize < MIN_PAGE_SIZE) {
        throw new IllegalArgumentException("pageSize: " + pageSize + " (expected: " + MIN_PAGE_SIZE + ")");
    }
    // 校验 Page 的内存大小，必须是 2 的指数级
    if ((pageSize & pageSize - 1) != 0) {
        throw new IllegalArgumentException("pageSize: " + pageSize + " (expected: power of 2)");
    }

    // 计算 pageShift
    // Logarithm base 2. At this point we know that pageSize is a power of two.
    return Integer.SIZE - 1 - Integer.numberOfLeadingZeros(pageSize);
}
```

- 默认情况下，`pageSize = 8KB = 8 * 1024= 8096` ，`pageShift = 8192` 。

## 3.3 validateAndCalculateChunkSize

`#validateAndCalculateChunkSize(int pageSize, int maxOrder)` 方法，校验 `maxOrder` 参数，并计算 `chunkSize` 值。代码如下：

```
private static int validateAndCalculateChunkSize(int pageSize, int maxOrder) {
    if (maxOrder > 14) {
        throw new IllegalArgumentException("maxOrder: " + maxOrder + " (expected: 0-14)");
    }

    // 计算 chunkSize
    // Ensure the resulting chunkSize does not overflow.
    int chunkSize = pageSize;
    for (int i = maxOrder; i > 0; i --) {
        if (chunkSize > MAX_CHUNK_SIZE / 2) {
            throw new IllegalArgumentException(String.format(
                    "pageSize (%d) << maxOrder (%d) must not exceed %d", pageSize, maxOrder, MAX_CHUNK_SIZE));
        }
        chunkSize <<= 1;
    }
    return chunkSize;
}
```

## 3.4 构造方法

```
/**
 * 单例
 */
public static final PooledByteBufAllocator DEFAULT = new PooledByteBufAllocator(PlatformDependent.directBufferPreferred());

/**
 * Heap PoolArena 数组
 */
private final PoolArena<byte[]>[] heapArenas;
/**
 * Direct PoolArena 数组
 */
private final PoolArena<ByteBuffer>[] directArenas;
/**
 * {@link PoolThreadCache} 的 tiny 内存块缓存数组的大小
 */
private final int tinyCacheSize;
/**
 * {@link PoolThreadCache} 的 small 内存块缓存数组的大小
 */
private final int smallCacheSize;
/**
 * {@link PoolThreadCache} 的 normal 内存块缓存数组的大小
 */
private final int normalCacheSize;
/**
 * PoolArenaMetric 数组
 */
private final List<PoolArenaMetric> heapArenaMetrics;
/**
 * PoolArenaMetric 数组
 */
private final List<PoolArenaMetric> directArenaMetrics;
/**
 * 线程变量，用于获得 PoolThreadCache 对象。
 */
private final PoolThreadLocalCache threadCache;
/**
 * Chunk 大小
 */
private final int chunkSize;
/**
 * PooledByteBufAllocatorMetric 对象
 */
private final PooledByteBufAllocatorMetric metric;

public PooledByteBufAllocator() {
    this(false);
}

@SuppressWarnings("deprecation")
public PooledByteBufAllocator(boolean preferDirect) {
    this(preferDirect, DEFAULT_NUM_HEAP_ARENA, DEFAULT_NUM_DIRECT_ARENA, DEFAULT_PAGE_SIZE, DEFAULT_MAX_ORDER);
}

@SuppressWarnings("deprecation")
public PooledByteBufAllocator(int nHeapArena, int nDirectArena, int pageSize, int maxOrder) {
    this(false, nHeapArena, nDirectArena, pageSize, maxOrder);
}

/**
 * @deprecated use
 * {@link PooledByteBufAllocator#PooledByteBufAllocator(boolean, int, int, int, int, int, int, int, boolean)}
 */
@Deprecated
public PooledByteBufAllocator(boolean preferDirect, int nHeapArena, int nDirectArena, int pageSize, int maxOrder) {
    this(preferDirect, nHeapArena, nDirectArena, pageSize, maxOrder,
            DEFAULT_TINY_CACHE_SIZE, DEFAULT_SMALL_CACHE_SIZE, DEFAULT_NORMAL_CACHE_SIZE);
}

/**
 * @deprecated use
 * {@link PooledByteBufAllocator#PooledByteBufAllocator(boolean, int, int, int, int, int, int, int, boolean)}
 */
@Deprecated
public PooledByteBufAllocator(boolean preferDirect, int nHeapArena, int nDirectArena, int pageSize, int maxOrder,
                              int tinyCacheSize, int smallCacheSize, int normalCacheSize) {
    this(preferDirect, nHeapArena, nDirectArena, pageSize, maxOrder, tinyCacheSize, smallCacheSize,
            normalCacheSize, DEFAULT_USE_CACHE_FOR_ALL_THREADS, DEFAULT_DIRECT_MEMORY_CACHE_ALIGNMENT);
}

public PooledByteBufAllocator(boolean preferDirect, int nHeapArena,
                              int nDirectArena, int pageSize, int maxOrder, int tinyCacheSize,
                              int smallCacheSize, int normalCacheSize,
                              boolean useCacheForAllThreads) {
    this(preferDirect, nHeapArena, nDirectArena, pageSize, maxOrder,
            tinyCacheSize, smallCacheSize, normalCacheSize,
            useCacheForAllThreads, DEFAULT_DIRECT_MEMORY_CACHE_ALIGNMENT);
}

public PooledByteBufAllocator(boolean preferDirect, int nHeapArena, int nDirectArena, int pageSize, int maxOrder,
                              int tinyCacheSize, int smallCacheSize, int normalCacheSize,
                              boolean useCacheForAllThreads, int directMemoryCacheAlignment) {
    super(preferDirect);
    // 创建 PoolThreadLocalCache 对象
    threadCache = new PoolThreadLocalCache(useCacheForAllThreads);
    this.tinyCacheSize = tinyCacheSize;
    this.smallCacheSize = smallCacheSize;
    this.normalCacheSize = normalCacheSize;
    // 计算 chunkSize
    chunkSize = validateAndCalculateChunkSize(pageSize, maxOrder);

    if (nHeapArena < 0) {
        throw new IllegalArgumentException("nHeapArena: " + nHeapArena + " (expected: >= 0)");
    }
    if (nDirectArena < 0) {
        throw new IllegalArgumentException("nDirectArea: " + nDirectArena + " (expected: >= 0)");
    }

    if (directMemoryCacheAlignment < 0) {
        throw new IllegalArgumentException("directMemoryCacheAlignment: "
                + directMemoryCacheAlignment + " (expected: >= 0)");
    }
    if (directMemoryCacheAlignment > 0 && !isDirectMemoryCacheAlignmentSupported()) {
        throw new IllegalArgumentException("directMemoryCacheAlignment is not supported");
    }

    if ((directMemoryCacheAlignment & -directMemoryCacheAlignment) != directMemoryCacheAlignment) {
        throw new IllegalArgumentException("directMemoryCacheAlignment: "
                + directMemoryCacheAlignment + " (expected: power of two)");
    }

    int pageShifts = validateAndCalculatePageShifts(pageSize);

    if (nHeapArena > 0) {
        // 创建 heapArenas 数组
        heapArenas = newArenaArray(nHeapArena);
        // 创建 metrics 数组
        List<PoolArenaMetric> metrics = new ArrayList<PoolArenaMetric>(heapArenas.length);
        // 初始化 heapArenas 和  metrics 数组
        for (int i = 0; i < heapArenas.length; i ++) {
            // 创建 HeapArena 对象
            PoolArena.HeapArena arena = new PoolArena.HeapArena(this,
                    pageSize, maxOrder, pageShifts, chunkSize,
                    directMemoryCacheAlignment);
            heapArenas[i] = arena;
            metrics.add(arena);
        }
        heapArenaMetrics = Collections.unmodifiableList(metrics);
    } else {
        heapArenas = null;
        heapArenaMetrics = Collections.emptyList();
    }

    if (nDirectArena > 0) {
        directArenas = newArenaArray(nDirectArena);
        List<PoolArenaMetric> metrics = new ArrayList<PoolArenaMetric>(directArenas.length);
        for (int i = 0; i < directArenas.length; i ++) {
            PoolArena.DirectArena arena = new PoolArena.DirectArena(
                    this, pageSize, maxOrder, pageShifts, chunkSize, directMemoryCacheAlignment);
            directArenas[i] = arena;
            metrics.add(arena);
        }
        directArenaMetrics = Collections.unmodifiableList(metrics);
    } else {
        directArenas = null;
        directArenaMetrics = Collections.emptyList();
    }
    // 创建 PooledByteBufAllocatorMetric
    metric = new PooledByteBufAllocatorMetric(this);
}
```

- orz 代码比较长，主要是构造方法和校验代码比较长。胖友自己耐心看下。笔者下面只重点讲几个属性。

- `DEFAULT` **静态**属性，PooledByteBufAllocator 单例。绝绝绝大多数情况下，我们不需要自己创建 PooledByteBufAllocator 对象，而只要使用该单例即可。

- `threadCache` 属性，**线程变量**，用于获得 PoolThreadCache 对象。通过该属性，不同线程虽然使用**相同**的 `DEFAULT` 单例，但是可以获得**不同**的 PoolThreadCache 对象。关于 PoolThreadLocalCache 的详细解析，见 [「4. PoolThreadLocalCache」](http://svip.iocoder.cn/Netty/ByteBuf-2-3-ByteBufAllocator-pooled/#) 中。

- `#newArenaArray(int size)` 方法，创建 PoolArena 数组。代码如下：

  ```
  private static <T> PoolArena<T>[] newArenaArray(int size) {
      return new PoolArena[size];
  }
  ```

## 3.5 newHeapBuffer

`#newHeapBuffer(int initialCapacity, int maxCapacity)` 方法，创建 Heap ByteBuf 对象。代码如下：

```
@Override
protected ByteBuf newHeapBuffer(int initialCapacity, int maxCapacity) {
    // <1> 获得线程的 PoolThreadCache 对象
    PoolThreadCache cache = threadCache.get();
    PoolArena<byte[]> heapArena = cache.heapArena;

    // <2.1> 从 heapArena 中，分配 Heap PooledByteBuf 对象，基于池化
    final ByteBuf buf;
    if (heapArena != null) {
        buf = heapArena.allocate(cache, initialCapacity, maxCapacity);
    // <2.2> 直接创建 Heap ByteBuf 对象，基于非池化
    } else {
        buf = PlatformDependent.hasUnsafe() ?
                new UnpooledUnsafeHeapByteBuf(this, initialCapacity, maxCapacity) :
                new UnpooledHeapByteBuf(this, initialCapacity, maxCapacity);
    }

    // <3> 将 ByteBuf 装饰成 LeakAware ( 可检测内存泄露 )的 ByteBuf 对象
    return toLeakAwareBuffer(buf);
}
```

- 代码比较易懂，胖友自己看代码注释。

## 3.6 newDirectBuffer

`#newDirectBuffer(int initialCapacity, int maxCapacity)` 方法，创建 Direct ByteBuf 对象。代码如下：

```
@Override
protected ByteBuf newDirectBuffer(int initialCapacity, int maxCapacity) {
    // <1> 获得线程的 PoolThreadCache 对象
    PoolThreadCache cache = threadCache.get();
    PoolArena<ByteBuffer> directArena = cache.directArena;

    final ByteBuf buf;
    // <2.1> 从 directArena 中，分配 Direct PooledByteBuf 对象，基于池化
    if (directArena != null) {
        buf = directArena.allocate(cache, initialCapacity, maxCapacity);
    // <2.2> 直接创建 Direct ByteBuf 对象，基于非池化
    } else {
        buf = PlatformDependent.hasUnsafe() ?
                UnsafeByteBufUtil.newUnsafeDirectByteBuf(this, initialCapacity, maxCapacity) :
                new UnpooledDirectByteBuf(this, initialCapacity, maxCapacity);
    }

    // <3> 将 ByteBuf 装饰成 LeakAware ( 可检测内存泄露 )的 ByteBuf 对象
    return toLeakAwareBuffer(buf);
}
```

- 代码比较易懂，胖友自己看代码注释。

## 3.6 其它方法

其它方法，主要是 Metric 相关操作为主。这里就不再多做哔哔啦，胖友自己感兴趣的话，可以翻翻噢。

# 4. PoolThreadLocalCache

PoolThreadLocalCache ，是 PooledByteBufAllocator 的内部类。继承 FastThreadLocal 抽象类，PoolThreadCache **ThreadLocal** 类。

## 4.1 构造方法

```
/**
 * 是否使用缓存
 */
private final boolean useCacheForAllThreads;

PoolThreadLocalCache(boolean useCacheForAllThreads) {
    this.useCacheForAllThreads = useCacheForAllThreads;
}
```

## 4.2 leastUsedArena

`#leastUsedArena(PoolArena<T>[] arenas)` 方法，从 PoolArena 数组中，获取线程使用最少的 PoolArena 对象，基于 `PoolArena.numThreadCaches` 属性。通过这样的方式，尽可能让 PoolArena 平均分布在不同线程，从而尽肯能避免线程的**同步和竞争**问题。代码如下：

```
private <T> PoolArena<T> leastUsedArena(PoolArena<T>[] arenas) {
    // 一个都没有，返回 null
    if (arenas == null || arenas.length == 0) {
        return null;
    }

    // 获得第零个 PoolArena 对象
    PoolArena<T> minArena = arenas[0];
    // 比较后面的 PoolArena 对象，选择线程使用最少的
    for (int i = 1; i < arenas.length; i++) {
        PoolArena<T> arena = arenas[i];
        if (arena.numThreadCaches.get() < minArena.numThreadCaches.get()) {
            minArena = arena;
        }
    }

    return minArena;
}
```

## 4.3 initialValue

`#initialValue()` 方法，初始化线程的 PoolThreadCache 对象。代码如下：

```
@Override
protected synchronized PoolThreadCache initialValue() {
    // 分别获取线程使用最少的 heapArena 和 directArena 对象，基于 `PoolArena.numThreadCaches` 属性。
    final PoolArena<byte[]> heapArena = leastUsedArena(heapArenas);
    final PoolArena<ByteBuffer> directArena = leastUsedArena(directArenas);

    // 创建开启缓存的 PoolThreadCache 对象
    Thread current = Thread.currentThread();
    if (useCacheForAllThreads || current instanceof FastThreadLocalThread) {
        return new PoolThreadCache(
                heapArena, directArena, tinyCacheSize, smallCacheSize, normalCacheSize,
                DEFAULT_MAX_CACHED_BUFFER_CAPACITY, DEFAULT_CACHE_TRIM_INTERVAL);
    }

    // 创建不进行缓存的 PoolThreadCache 对象
    // No caching so just use 0 as sizes.
    return new PoolThreadCache(heapArena, directArena, 0, 0, 0, 0, 0);
}
```

## 4.4 onRemoval

`#onRemoval(PoolThreadCache threadCache)` 方法，释放 PoolThreadCache 对象的缓存。代码如下：

```
@Override
protected void onRemoval(PoolThreadCache threadCache) {
    // 释放缓存
    threadCache.free();
}
```

# 666. 彩蛋

推荐阅读文章：

- 杨武兵 [《netty源码分析系列——PooledByteBuf&PooledByteBufAllocator》](https://my.oschina.net/ywbrj042/blog/909925)
- wojiushimogui [《Netty源码分析：PooledByteBufAllocator》](https://blog.csdn.net/u010412719/article/details/78298811)
- RobertoHuang [《死磕Netty源码之内存分配详解(一)(PooledByteBufAllocator)》](https://blog.csdn.net/RobertoHuang/article/details/81046419)

# Buffer 之 Jemalloc（一）简介

# 1. 概述

在看 Netty 对 Jemalloc 内存管理算法的具体代码实现之前，笔者想先通过这篇文章，**简单**阐述三个问题：

- Netty 为什么要实现内存管理？
- Netty 为什么选择 Jemalloc 算法？
- Jemalloc 的实现原理？

因为笔者对内存管理的了解程度，处于青铜级别，所以为了更好的让大家理解，本文会以引用牛 x 大佬的文章为主。

# 2. Netty 为什么要实现内存管理

**老艿艿的理解**

在 Netty 中，IO 读写必定是非常频繁的操作，而考虑到更高效的网络传输性能，Direct ByteBuffer 必然是最合适的选择。但是 Direct ByteBuffer 的申请和释放是高成本的操作，那么进行**池化**管理，多次重用是比较有效的方式。但是，不同于一般于我们常见的对象池、连接池等**池化**的案例，ByteBuffer 是有**大小**一说。又但是，申请多大的 Direct ByteBuffer 进行池化又会是一个大问题，太大会浪费内存，太小又会出现频繁的扩容和内存复制！！！所以呢，就需要有一个合适的内存管理算法，解决**高效分配内存**的同时又解决**内存碎片化**的问题。

**官方的说法**

> FROM [《Netty 学习笔记 —— Pooled buffer》](https://skyao.gitbooks.io/learning-netty/content/buffer/pooled_buffer.html)
>
> Netty 4.x 增加了 Pooled Buffer，实现了高性能的 buffer 池，分配策略则是结合了 buddy allocation 和 slab allocation 的 **jemalloc** 变种，代码在`io.netty.buffer.PoolArena` 中。
>
> 官方说提供了以下优势：
>
> - 频繁分配、释放 buffer 时减少了 GC 压力。
> - 在初始化新 buffer 时减少内存带宽消耗( 初始化时不可避免的要给buffer数组赋初始值 )。
> - 及时的释放 direct buffer 。

**hushi55 大佬的理解**

> > C/C++ 和 java 中有个围城，城里的想出来，城外的想进去！**
>
> 这个围城就是自动内存管理！
>
> **Netty 4 buffer 介绍**
>
> Netty4 带来一个与众不同的特点是其 ByteBuf 的实现，相比之下，通过维护两个独立的读写指针， 要比 `io.netty.buffer.ByteBuf` 简单不少，也会更高效一些。不过，Netty 的 ByteBuf 带给我们的最大不同，就是他不再基于传统 JVM 的 GC 模式，相反，它采用了类似于 C++ 中的 malloc/free 的机制，需要开发人员来手动管理回收与释放。从手动内存管理上升到GC，是一个历史的巨大进步， 不过，在20年后，居然有曲线的回归到了手动内存管理模式，正印证了马克思哲学观： **社会总是在螺旋式前进的，没有永远的最好。**
>
> **① GC 内存管理分析**
>
> 的确，就内存管理而言，GC带给我们的价值是不言而喻的，不仅大大的降低了程序员的心智包袱， 而且，也极大的减少了内存管理带来的 Crash 困扰，为函数式编程（大量的临时对象）、脚本语言编程带来了春天。 并且，高效的GC算法也让大部分情况下程序可以有更高的执行效率。 不过，也有很多的情况，可能是手工内存管理更为合适的。譬如：
>
> - 对于类似于业务逻辑相对简单，譬如网络路由转发型应用（很多erlang应用其实是这种类型）， 但是 QPS 非常高，比如1M级，在这种情况下，在每次处理中即便产生1K的垃圾，都会导致频繁的GC产生。 在这种模式下，erlang 的按进程回收模式，或者是 C/C++ 的手工回收机制，效率更高。
> - Cache 型应用，由于对象的存在周期太长，GC 基本上就变得没有价值。
>
> 所以，理论上，尴尬的GC实际上比较适合于处理介于这 2 者之间的情况： 对象分配的频繁程度相比数据处理的时间要少得多的，但又是相对短暂的， 典型的，对于OLTP型的服务，处理能力在 1K QPS 量级，每个请求的对象分配在 10K-50K 量级， 能够在 5-10s 的时间内进行一 次younger GC ，每次GC的时间可以控制在 10ms 水平上， 这类的应用，实在是太适合 GC 行的模式了，而且结合 Java 高效的分代 GC ，简直就是一个理想搭配。
>
> **② 影响**
>
> Netty 4 引入了手工内存的模式，我觉得这是一大创新，这种模式甚至于会延展， 应用到 Cache 应用中。实际上，结合 JVM 的诸多优秀特性，如果用 Java 来实现一个 Redis 型 Cache、 或者 In-memory SQL Engine，或者是一个 Mongo DB，我觉得相比 C/C++ 而言，都要更简单很多。 实际上，JVM 也已经提供了打通这种技术的机制，就是 Direct Memory 和 Unsafe 对象。 基于这个基础，我们可以像 C 语言一样直接操作内存。实际上，Netty4 的 ByteBuf 也是基于这个基础的。

# 3. Netty 为什么选择 Jemalloc 算法

推荐直接阅读

- bhpike65 [《内存优化总结:ptmalloc、tcmalloc 和 jemalloc》](http://www.cnhalo.net/2016/06/13/memory-optimize/)

# 4. Jemalloc 的实现原理

推荐直接阅读

- Hypercube [《自顶向下深入分析Netty（十）–JEMalloc分配算法》](https://www.jianshu.com/p/15304cd63175)
- 高兴的博客 [《jemalloc和内存管里》](http://www.cnblogs.com/gaoxing/p/4253833.html)
- 沧行 [《Netty内存池实现》](https://www.jianshu.com/p/8d894e42b6e6) 这篇，有几个图，非常非常非常不错。

# 666. 彩蛋

推荐的博客比较多，如果你和笔者一样对内存管理的理解处于**青铜**级别，可能看完这几篇博文，很大可能还是一脸懵逼+一脸懵逼+一脸懵逼。

这是个比较正常的情况。胖友可以跟着笔者继续看看 Netty 对 Jemalloc 算法的具体实现后，再回过头继续理解下这几篇文章。

另外，后续的文章，会有大量大量大量的**位运算**，所以当胖友看到不熟悉的**位运算**，可以看看 [《Java 位运算(移位、位与、或、异或、非）》](https://blog.csdn.net/xiaochunyong/article/details/7748713) 。

# Buffer 之 Jemalloc（二）PoolChunk

# 1. 概述

> 老艿艿：如下阐释的内容，参考 Hypercube [《自顶向下深入分析Netty（十）–JEMalloc分配算法》](https://www.jianshu.com/p/15304cd63175) 。

为了提高内存**分配效率**并减少**内存碎片**，Jemalloc 算法将每个 Arena 切分成多个**小块** Chunk 。但是实际上，每个 Chunk 依然是**相当大**的内存块。因为在 Jemalloc 建议为 4MB ，Netty 默认使用为 16MB 。

为了进一步提供提高内存**分配效率**并减少**内存碎片**，Jemalloc 算法将每个 Chunk 切分成多个**小块** Page 。一个典型的切分是将 Chunk 切分为 2048 块 Page ，Netty 也是如此，因此 Page 的大小为：`16MB / 2048 = 8KB` 。

一个好的内存分配算法，应使得已分配内存块尽可能保持连续，这将大大减少内部碎片，由此 Jemalloc 使用[伙伴分配算法](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk/#)尽可能提高连续性。**伙伴分配算法**的示意图如下：

> 可能很多胖友不了解【伙伴分配算法】，感兴趣的话，可以看看 [《伙伴分配器的一个极简实现》](https://coolshell.cn/articles/10427.html) 了解了解。
>
> 当然，Netty PoolChunk 也是基于【伙伴分配算法】实现。

[![满二叉树](http://static.iocoder.cn/images/Netty/2018_09_04/01.png)](http://static.iocoder.cn/images/Netty/2018_09_04/01.png)满二叉树

图中**最底层**表示一个被切分为 2048 个 Page 的 Chunk 块。自底向上，每一层节点作为上一层的子节点构造出一棵[满二叉树](https://baike.baidu.com/item/满二叉树)，然后按层分配满足要求的内存块。以待分配序列 8KB、16KB、8KB 为例分析分配过程( 假设每个 Page 大小 8KB )：

1. 8KB —— 需要一个 Page ，第 11 层满足要求，故分配 *2048* 节点即 **Page0** 。
2. 16KB —— 需要两个Page ，故需要在第 10 层进行分配，而 *1024* 的子节点 *2048* 已分配，从左到右找到满足要求的 *1025* 节点，故分配节点 *1025* 即**Page2** 和 **Page3** 。
3. 8KB —— 需要一个 Page ，第 11 层满足要求，但是 *2048* 已分配，从左到右找到 *2049* 节点即 **Page1** 进行分配。

总结来说：

- 分配结束后，已分配连续的 **Page0 - Page3** 。这样的连续内存块，大大减少内部碎片并提高**内存使用率**。
- 通过使用**满二叉树**这样的树结构，提升检索到可用 Page 的速度，从而提高内存**分配效率**。

# 2. PoolChunk

`io.netty.buffer.PoolChunk` ，实现 PoolChunkMetric 接口，Netty 对 Jemalloc Chunk 的实现类。

## 2.1 构造方法

```
/**
 * 所属 Arena 对象
 */
final PoolArena<T> arena;
/**
 * 内存空间。
 *
 * @see PooledByteBuf#memory
 */
final T memory;
/**
 * 是否非池化
 *
 * @see #PoolChunk(PoolArena, Object, int, int) 非池化。当申请的内存大小为 Huge 类型时，创建一整块 Chunk ，并且不拆分成若干 Page
 * @see #PoolChunk(PoolArena, Object, int, int, int, int, int) 池化
 */
final boolean unpooled;
/**
 * TODO 芋艿
 */
final int offset;

/**
 * 分配信息满二叉树
 *
 * index 为节点编号
 */
private final byte[] memoryMap;
/**
 * 高度信息满二叉树
 *
 * index 为节点编号
 */
private final byte[] depthMap;
/**
 * PoolSubpage 数组
 */
private final PoolSubpage<T>[] subpages;
/**
 * 判断分配请求内存是否为 Tiny/Small ，即分配 Subpage 内存块。
 *
 * Used to determine if the requested capacity is equal to or greater than pageSize.
 */
private final int subpageOverflowMask;
/**
 * Page 大小，默认 8KB = 8192B
 */
private final int pageSize;
/**
 * 从 1 开始左移到 {@link #pageSize} 的位数。默认 13 ，1 << 13 = 8192 。
 *
 * 具体用途，见 {@link #allocateRun(int)} 方法，计算指定容量所在满二叉树的层级。
 */
private final int pageShifts;
/**
 * 满二叉树的高度。默认为 11 。
 */
private final int maxOrder;
/**
 * Chunk 内存块占用大小。默认为 16M = 16 * 1024  。
 */
private final int chunkSize;
/**
 * log2 {@link #chunkSize} 的结果。默认为 log2( 16M ) = 24 。
 */
private final int log2ChunkSize;
/**
 * 可分配 {@link #subpages} 的数量，即数组大小。默认为 1 << maxOrder = 1 << 11 = 2048 。
 */
private final int maxSubpageAllocs;
/**
 * 标记节点不可用。默认为 maxOrder + 1 = 12 。
 *
 * Used to mark memory as unusable
 */
private final byte unusable;

/**
 * 剩余可用字节数
 */
private int freeBytes;

/**
 * 所属 PoolChunkList 对象
 */
PoolChunkList<T> parent;
/**
 * 上一个 Chunk 对象
 */
PoolChunk<T> prev;
/**
 * 下一个 Chunk 对象
 */
PoolChunk<T> next;

// 构造方法一：
  1: PoolChunk(PoolArena<T> arena, T memory, int pageSize, int maxOrder, int pageShifts, int chunkSize, int offset) {
  2:     // 池化
  3:     unpooled = false;
  4:     this.arena = arena;
  5:     this.memory = memory;
  6:     this.pageSize = pageSize;
  7:     this.pageShifts = pageShifts;
  8:     this.maxOrder = maxOrder;
  9:     this.chunkSize = chunkSize;
 10:     this.offset = offset;
 11:     unusable = (byte) (maxOrder + 1);
 12:     log2ChunkSize = log2(chunkSize);
 13:     subpageOverflowMask = ~(pageSize - 1);
 14:     freeBytes = chunkSize;
 15: 
 16:     assert maxOrder < 30 : "maxOrder should be < 30, but is: " + maxOrder;
 17:     maxSubpageAllocs = 1 << maxOrder;
 18: 
 19:     // 初始化 memoryMap 和 depthMap
 20:     // Generate the memory map.
 21:     memoryMap = new byte[maxSubpageAllocs << 1];
 22:     depthMap = new byte[memoryMap.length];
 23:     int memoryMapIndex = 1;
 24:     for (int d = 0; d <= maxOrder; ++ d) { // move down the tree one level at a time
 25:         int depth = 1 << d;
 26:         for (int p = 0; p < depth; ++ p) {
 27:             // in each level traverse left to right and set value to the depth of subtree
 28:             memoryMap[memoryMapIndex] = (byte) d;
 29:             depthMap[memoryMapIndex] = (byte) d;
 30:             memoryMapIndex ++;
 31:         }
 32:     }
 33: 
 34:     // 初始化 subpages
 35:     subpages = newSubpageArray(maxSubpageAllocs);
 36: }


// 构造方法二： 
 38: /** Creates a special chunk that is not pooled. */
 39: PoolChunk(PoolArena<T> arena, T memory, int size, int offset) {
 40:     // 非池化
 41:     unpooled = true;
 42:     this.arena = arena;
 43:     this.memory = memory;
 44:     this.offset = offset;
 45:     memoryMap = null;
 46:     depthMap = null;
 47:     subpages = null;
 48:     subpageOverflowMask = 0;
 49:     pageSize = 0;
 50:     pageShifts = 0;
 51:     maxOrder = 0;
 52:     unusable = (byte) (maxOrder + 1);
 53:     chunkSize = size;
 54:     log2ChunkSize = log2(chunkSize);
 55:     maxSubpageAllocs = 0;
 56: }
```

- ```
  arena
  ```

   

  属性，所属 Arena 对象。详细解析，见

   

  《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（五）PoolArena》

   

  。

  - `memory` 属性，内存空间。即**用于** `PooledByteBuf.memory` 属性，有 Direct ByteBuffer 和 `byte[]` 字节数组。

  - ```
    unpooled
    ```

     

    属性，是否非池化。

    - `unpooled = false` ，池化，对应构造方法**一**。默认情况下，对于 分配 16M **以内**的内存空间时，Netty 会分配一个 Normal 类型的 Chunk 块。并且，该 Chunk 块在使用完后，进行池化缓存，重复使用。
    - `unpooled = true` ，非池化，对应构造方法**二**。默认情况下，对于分配 16M **以上**的内存空间时，Netty 会分配一个 Huge 类型的**特殊**的 Chunk 块。并且，由于 Huge 类型的 Chunk 占用内存空间较大，比较特殊，所以该 Chunk 块在使用完后，立即释放，不进行重复使用。
    - 笔者对 Netty 对 Jemalloc 不同类型的内存块的整理，如下图所示：[![内存块分类](http://static.iocoder.cn/images/Netty/2018_09_04/02.png)](http://static.iocoder.cn/images/Netty/2018_09_04/02.png)内存块分类

- Jemalloc 基于【伙伴分配算法】分配 Chunk 中的 Page 节点。Netty 实现的伙伴分配算法中，构造了**两颗**满二叉树。因为满二叉树非常适合数组存储，Netty 使用两个字节数组 `memoryMap` 和 `depthMap` 来分别表示**分配信息**满二叉树、**高度信息**满二叉树。如下图所示：[![满二叉树](http://static.iocoder.cn/images/Netty/2018_09_04/03.png)](http://static.iocoder.cn/images/Netty/2018_09_04/03.png)满二叉树

  - `maxOrder` 属性，满二叉树的高度。默认为 11 。注意，层高是从 0 开始。

  - `maxSubpageAllocs` 属性，可分配的 Page 的数量。默认为 2048 ，在【第 17 行】的代码进行初始化。在第 11 层，可以看到 Page0 - Page2047 这 2048 个节点，也也符合 `1 << maxOrder = 11 << 11 = 2048` 的计算。

  - 在【第 19 至 32 行】的代码，`memoryMap` 和 `depthMap` 进行满二叉树的初始化。

    - 数组大小为 `maxSubpageAllocs << 1 = 2048 << 1 = 4096` 。

    - 数组下标为**左图**对应的节点编号。在【第 23 行】的代码，从 `memoryMapIndex = 1` 代码可以看出，满二叉树的节点编号是**从 1 开始**。省略 0 是因为这样更容易计算父子关系：子节点加倍，父节点减半，例如：512 的子节点为 1024( `512 * 2` )和 1025( `512 * 2 + 1` )。

    - 初始时，`memoryMap` 和 `depthMap` 相等，值为**节点高度**。例如：

      ```
      memoryMap[1024] = depthMap[1024] = 10;
      ```

      - 对应**右图**。

    - 分配节点时，

      ```
      depthMap
      ```

       

      的值保持

      不变

      ( 因为，节点的高度没发生变化 )，

      ```
      memoryMap
      ```

       

      的值发生

      变化

      ( 因为，节点的分配信息发生变化 )。当一个节点被分配后，该节点的值设为

       

      ```
      unusable
      ```

      ( 标记节点不可用。默认为

       

      ```
      maxOrder + 1 = 12
      ```

       

      ) 。

      并且，会更新祖先节点的值为其子节点较小的值

      ( 因为，祖先节点共用该节点的 Page 内存；同时，一个父节点有两个子节点，一个节点不可用后，另一个子节点可能可用，所以更新为其子节点

      较小

      的值。 )。举个例子，下图表示随着节点 4 分配而更新祖先节点的过程，其中每个节点的第一个数字表示

      节点编号

      ，第二个数字表示

      节点高度

      ：

      ![例子](http://static.iocoder.cn/images/Netty/2018_09_04/04.png)

      例子

      - 节点 4 被**完全**分配，将高度值设置为 12 表示不可用。
      - 节点 4 的父节点 2，将高度值更新为两个子节点的较小值。其他祖先节点亦然，直到高度值更新至根节点。

    - ```
      memoryMap
      ```

       

      数组的值，总结为 3 种情况：

      - 1、`memoryMap[id] = depthMap[id]` ，该节点没有被分配。
      - 2、`最大高度 >= memoryMap[id] > depthMap[id]` ，至少有一个子节点被分配，不能再分配该高度满足的内存，但可以根据实际分配较小一些的内存。比如，上图中父节点 2 分配了子节点 4，值从 1 更新为 2，表示该节点不能再分配 8MB 的只能最大分配 4MB 内存，即只剩下节点 5 可用。
      - 3、`memoryMap[id] = 最大高度 + 1` ，该节点及其子节点已被**完全**分配，没有剩余空间。

- Chunk 相关字段

  - `chunkSize` 属性，Chunk 内存块占用大小。默认为 `16M = 16 * 1024KB` 。

  - `log2ChunkSize` 属性，`log2(chunkSize)` 的结果。默认为 `log2( 16M ) = 24` 。 代码如下：

    ```
    private static final int INTEGER_SIZE_MINUS_ONE = Integer.SIZE - 1; // 32 - 1 = 31
    
    private static int log2(int val) {
        // compute the (0-based, with lsb = 0) position of highest set bit i.e, log2
        return INTEGER_SIZE_MINUS_ONE - Integer.numberOfLeadingZeros(val);
    }
    ```

    - x

  - `freeBytes` 属性，剩余可用字节数。

- Page 相关字段

  - `pageSize` 属性，每个 Page 的大小。默认为 `8KB = 8192B` 。
  - `pageShifts` 属性，从 1 开始左移到 `pageSize` 的位数。默认 13 ，`1 << 13 = 8192` 。具体用于计算指定容量所在满二叉树的层级，详细解析，见 [「2.2.1 allocateRun」](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk/#) 。

- SubPage 相关字段

  - 详细解析，见 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（三）PoolSubpage》](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage) 。

  - `subpages` 属性，PoolSubpage 数组。每个节点对应一个 PoolSubpage 对象。因为实际上，每个 Page 还是**比较大**的内存块，可以进一步切分成小块 SubPage 。在【第 35 行】的代码，调用 `#newSubpageArray(int size)` 方法，进行初始化。代码如下：

    ```
    private PoolSubpage<T>[] newSubpageArray(int size) {
        return new PoolSubpage[size];
    }
    ```

    - 默认情况下，数组大小为 `maxSubpageAllocs = 2048` 。

  - `subpageOverflowMask` 属性，判断分配请求内存是否为 **Tiny/Small** ，即分配 Subpage 内存块。默认，-8192 。在【13 行】的代码进行初始化。对于 -8192 的二进制，除了首 bits 为 1 ，其它都为 0 。这样，对于小于 8K 字节的申请，求 `subpageOverflowMask & length` 都等于 0 ；对于大于 8K 字节的申请，求 `subpageOverflowMask & length` 都**不**等于 0 。相当于说，做了 `if ( length < pageSize )` 的计算优化。

- ChunkList 相关字段

  - 详细解析，见 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（四）PoolChunkList》](http://svip.iocoder.cn/Netty/ByteBuf-3-4-Jemalloc-chunkList) 。
  - `parent` 属性，所属 PoolChunkList 对象。
  - `prev` 属性，上一个 Chunk 对象。
  - `next` 属性，下一个 Chunk 对象。

内容比较“厚实”( 😈 字比较多 )，建议胖友再读一遍，再看下面的代码具体实现。

## 2.2 allocate

`#allocate(int normCapacity)` 方法，分配内存空间。代码如下：

```
1: long allocate(int normCapacity) {
2:     // 大于等于 Page 大小，分配 Page 内存块
3:     if ((normCapacity & subpageOverflowMask) != 0) { // >= pageSize
4:         return allocateRun(normCapacity);
5:     // 小于 Page 大小，分配 Subpage 内存块
6:     } else {
7:         return allocateSubpage(normCapacity);
8:     }
9: }
```

- 第 2 至 4 行：当申请的 `normCapacity` 大于等于 Page 大小时，调用 `#allocateRun(int normCapacity)` 方法，分配 Page 内存块。详细解析，见 [「2.2.1 allocateRun」](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk/#) 中。
- 第 5 至 8 行：调用 `#allocateSubpage(int normCapacity)` 方法，分配 Subpage 内存块。详细解析，见 [「2.2.1 allocateSubpage」](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk/#) 中。

### 2.2.1 allocateRun

`#allocateRun(int normCapacity)` 方法，分配 Page 内存块。代码如下：

```
   /**
    * Allocate a run of pages (>=1)
    *
    * @param normCapacity normalized capacity
    * @return index in memoryMap
    */
 1: private long allocateRun(int normCapacity) {
 2:     // 获得层级
 3:     int d = maxOrder - (log2(normCapacity) - pageShifts);
 4:     // 获得节点
 5:     int id = allocateNode(d);
 6:     // 未获得到节点，直接返回
 7:     if (id < 0) {
 8:         return id;
 9:     }
10:     // 减少剩余可用字节数
11:     freeBytes -= runLength(id);
12:     return id;
13: }
```

- 第 3 行：获得层级。

- 第 5 行：调用

   

  ```
  #allocateNode(int normCapacity)
  ```

   

  方法，分配节点。详细解析，见

   

  「2.2.3 allocateNode」

   

  中。

  - 第 7 至 9 行：未获得到节点，直接返回。

- 第 11 行：调用 `#runLength(int id)` 方法，计算使用节点的字节数，并减少剩余可用字节数。代码如下：

  ```
  private int runLength(int id) {
      // represents the size in #bytes supported by node 'id' in the tree
      return 1 << log2ChunkSize - depth(id);
  }
  
  private byte depth(int id) {
      return depthMap[id];
  }
  ```

### 2.2.2 allocateSubpage

> 老艿艿：本小节，胖友先看完 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（三）PoolSubpage》](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage) 。

`#allocateSubpage(int normCapacity)` 方法，分配 Subpage 内存块。代码如下：

```
   /**
    * Create/ initialize a new PoolSubpage of normCapacity
    * Any PoolSubpage created/ initialized here is added to subpage pool in the PoolArena that owns this PoolChunk
    *
    * @param normCapacity normalized capacity
    * @return index in memoryMap
    */
 1: private long allocateSubpage(int normCapacity) {
 2:     // 获得对应内存规格的 Subpage 双向链表的 head 节点
 3:     // Obtain the head of the PoolSubPage pool that is owned by the PoolArena and synchronize on it.
 4:     // This is need as we may add it back and so alter the linked-list structure.
 5:     PoolSubpage<T> head = arena.findSubpagePoolHead(normCapacity);
 6:     // 加锁，分配过程会修改双向链表的结构，会存在多线程的情况。
 7:     synchronized (head) {
 8:         // 获得最底层的一个节点。Subpage 只能使用二叉树的最底层的节点。
 9:         int d = maxOrder; // subpages are only be allocated from pages i.e., leaves
10:         int id = allocateNode(d);
11:         // 获取失败，直接返回
12:         if (id < 0) {
13:             return id;
14:         }
15: 
16:         final PoolSubpage<T>[] subpages = this.subpages;
17:         final int pageSize = this.pageSize;
18: 
19:         // 减少剩余可用字节数
20:         freeBytes -= pageSize;
21: 
22:         // 获得节点对应的 subpages 数组的编号
23:         int subpageIdx = subpageIdx(id);
24:         // 获得节点对应的 subpages 数组的 PoolSubpage 对象
25:         PoolSubpage<T> subpage = subpages[subpageIdx];
26:         // 初始化 PoolSubpage 对象
27:         if (subpage == null) { // 不存在，则进行创建 PoolSubpage 对象
28:             subpage = new PoolSubpage<T>(head, this, id, runOffset(id), pageSize, normCapacity);
29:             subpages[subpageIdx] = subpage;
30:         } else { // 存在，则重新初始化 PoolSubpage 对象
31:             subpage.init(head, normCapacity);
32:         }
33:         // 分配 PoolSubpage 内存块
34:         return subpage.allocate();
35:     }
36: }
```

- 第 5 行：调用 `PoolArena#findSubpagePoolHead(int normCapacity)` 方法，获得对应内存规格的 Subpage 双向链表的 `head` 节点。详细解析，见 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（五）PoolArena》](http://svip.iocoder.cn/Netty/ByteBuf-3-5-Jemalloc-Arena) 。

- 第 7 行：`synchronized` 加锁，分配过程会修改双向链表的结构，会存在**多线程**的情况。

- 第 8 至 10 行：调用

   

  ```
  #allocateNode(int d)
  ```

   

  方法，获得最底层的一个节点。

  Subpage 只能使用二叉树的最底层的节点

  。

  - 第 11 至 14 行：获取失败，直接返回。
  - 第 20 行：减少剩余可用字节数。

- 第 23 至 34 行：分配 PoolSubpage 内存块。

  - 第 23 行：调用 `#subpageIdx(int id)` 方法，获得节点对应的 `subpages` 数组的编号。代码如下：

    ```
    private int subpageIdx(int memoryMapIdx) {
        return memoryMapIdx ^ maxSubpageAllocs; // remove highest set bit, to get offset
    }
    ```

    - 去掉最高位( bit )。例如节点 2048 计算后的结果为 0 。

  - 第 25 行：获得节点对应的 `subpages` 数组的 PoolSubpage 对象。

  - 第 26 至 32 行：初始化 PoolSubpage 对象。

  - 第 34 行：调用 `PoolSubpage#allocate()` 方法，分配 PoolSubpage 内存块。

### 2.2.3 allocateNode

`#allocateNode(int normCapacity)` 方法，分配节点。代码如下：

```
   /**
    * Algorithm to allocate an index in memoryMap when we query for a free node
    * at depth d
    *
    * @param d depth
    * @return index in memoryMap
    */
 1: private int allocateNode(int d) {
 2:     int id = 1;
 3:     int initial = - (1 << d); // has last d bits = 0 and rest all = 1
 4:     // 获得根节点的指值。
 5:     // 如果根节点的值，大于 d ，说明，第 d 层没有符合的节点，也就是说 [0, d-1] 层也没有符合的节点。即，当前 Chunk 没有符合的节点。
 6:     byte val = value(id);
 7:     if (val > d) { // unusable
 8:         return -1;
 9:     }
10:     // 获得第 d 层，匹配的节点。
11:     // id & initial 来保证，高度小于 d 会继续循环
12:     while (val < d || (id & initial) == 0) { // id & initial == 1 << d for all ids at depth d, for < d it is 0
13:         // 进入下一层
14:         // 获得左节点的编号
15:         id <<= 1;
16:         // 获得左节点的值
17:         val = value(id);
18:         // 如果值大于 d ，说明，以左节点作为根节点形成虚拟的虚拟满二叉树，没有符合的节点。
19:         if (val > d) {
20:             // 获得右节点的编号
21:             id ^= 1;
22:             // 获得右节点的值
23:             val = value(id);
24:         }
25:     }
26: 
27:     // 校验获得的节点值合理
28:     byte value = value(id);
29:     assert value == d && (id & initial) == 1 << d : String.format("val = %d, id & initial = %d, d = %d",
30:             value, id & initial, d);
31: 
32:     // 更新获得的节点不可用
33:     setValue(id, unusable); // mark as unusable
34:     // 更新获得的节点的祖先都不可用
35:     updateParentsAlloc(id);
36: 
37:     // 返回节点编号
38:     return id;
39: }
```

- 第 3 行：通过 `- (1 << d)` 计算，获得 `initial` 。用于【第 12 行】的代码，`id & initial` ，来保证，高度小于 `d` 会继续**循环**。

- 第 6 行：获得根节点( `id = 1` )的指值。代码如下：

  ```
  private byte value(int id) {
      return memoryMap[id];
  }
  ```

  - 第 7 至 9 行：如果根节点的值，大于 `d` ，说明，第 `d` 层没有符合的节点，也就是说 `[1, d-1]` 层也没有符合的节点。即，当前 Chunk 没有符合的节点。

- 第 10 至 25 行：获得第

   

  ```
  d
  ```

   

  层，匹配的节点。因为

   

  ```
  val < d
  ```

   

  难以保证是第

   

  ```
  d
  ```

   

  层，

  ```
  [0, d-1]
  ```

   

  层也可以满足

   

  ```
  val < d
  ```

   

  ，所以才有

   

  ```
  id & initial
  ```

   

  来保证，高度小于

   

  ```
  d
  ```

   

  会继续循环。

  - ← 第 15 行：`<< 1` 操作，进入下一层。获得**左节点**的编号。
  - ← 第 17 行：获得左节点的值。
  - → 第 19 行：如果值大于 `d` ，说明，以左节点作为根节点形成虚拟的虚拟满二叉树，没有符合的节点。此时，需要跳到**右节点**。
  - → 第 21 行：`^ 1` 操作，获得**右节点**的编号。
  - → 第 23 行：获得右节点的值。
  - 【第 17 行】或者【第 23 行】的代码，会通过【第 12 行】的代码，结束循环。也就说，获得第 `d` 层，匹配的节点。

- 第 33 行：调用 `#setValue(int id, byte val)` 方法，设置获得的节点的值为 `unusable` ，表示不可用。代码如下：

  ```
  private void setValue(int id, byte val) {
      memoryMap[id] = val;
  }
  ```

- 第 35 行：调用 `#updateParentsAlloc(int id)` 方法，更新获得的节点的祖先都不可用。详细解析，见 [「2.4.1 updateParentsAlloc」](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk/#) 。

- 第 38 行：返回节点编号。

## 2.3 free

> 老艿艿：本小节，胖友先看完 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（三）PoolSubpage》](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage) 。

`#free(long handle)` 方法，释放指定位置的内存块。根据情况，内存块可能是 SubPage ，也可能是 Page ，也可能是释放 SubPage 并且释放对应的 Page 。代码如下：

```
   /**
    * Free a subpage or a run of pages
    * When a subpage is freed from PoolSubpage, it might be added back to subpage pool of the owning PoolArena
    * If the subpage pool in PoolArena has at least one other PoolSubpage of given elemSize, we can
    * completely free the owning Page so it is available for subsequent allocations
    *
    * @param handle handle to free
    */
 1: void free(long handle) {
 2:     // 获得 memoryMap 数组的编号( 下标 )
 3:     int memoryMapIdx = memoryMapIdx(handle);
 4:     // 获得 bitmap 数组的编号( 下标 )。注意，此时获得的还不是真正的 bitmapIdx 值，需要经过 `bitmapIdx & 0x3FFFFFFF` 运算。
 5:     int bitmapIdx = bitmapIdx(handle);
 6: 
 7:     // 释放 Subpage begin ~
 8: 
 9:     if (bitmapIdx != 0) { // free a subpage bitmapIdx 非空，说明释放的是 Subpage
10:         // 获得 PoolSubpage 对象
11:         PoolSubpage<T> subpage = subpages[subpageIdx(memoryMapIdx)];
12:         assert subpage != null && subpage.doNotDestroy;
13: 
14:         // 获得对应内存规格的 Subpage 双向链表的 head 节点
15:         // Obtain the head of the PoolSubPage pool that is owned by the PoolArena and synchronize on it.
16:         // This is need as we may add it back and so alter the linked-list structure.
17:         PoolSubpage<T> head = arena.findSubpagePoolHead(subpage.elemSize);
18:         // 加锁，分配过程会修改双向链表的结构，会存在多线程的情况。
19:         synchronized (head) {
20:             // 释放 Subpage 。
21:             if (subpage.free(head, bitmapIdx & 0x3FFFFFFF)) {
22:                 return;
23:             }
24:             // ↑↑↑ 返回 false ，说明 Page 中无切分正在使用的 Subpage 内存块，所以可以继续向下执行，释放 Page
25:         }
26:     }
27: 
28:     // 释放 Page begin ~
29: 
30:     // 增加剩余可用字节数
31:     freeBytes += runLength(memoryMapIdx);
32:     // 设置 Page 对应的节点可用
33:     setValue(memoryMapIdx, depth(memoryMapIdx));
34:     // 更新 Page 对应的节点的祖先可用
35:     updateParentsFree(memoryMapIdx);
36: }
```

- 第 3 行：调用 `#memoryMapIdx(handle)` 方法，获得 `memoryMap` 数组的编号( 下标 )。代码如下：

  ```
  private static int memoryMapIdx(long handle) {
      return (int) handle;
  }
  ```

- 第 5 行：调用 `#bitmapIdx(handle)` 方法，获得 `bitmap` 数组的编号( 下标 )。代码如下：

  ```
  private static int bitmapIdx(long handle) {
      return (int) (handle >>> Integer.SIZE);
  }
  ```

  - 注意，此时获得的还不是真正的 bitmapIdx 值，需要经过 `bitmapIdx & 0x3FFFFFFF` 运算，即【第 21 行】的代码。

- 第 9 至 26 行：释放 Subpage 内存块。

  - 第 9 行：通过 `bitmapIdx !=0` 判断，说明释放的是 Subpage 内存块。

  - 第 11 行：获得 PoolSubpage 对象。

  - 第 17 行：调用 `PoolArena#findSubpagePoolHead(int normCapacity)` 方法，获得对应内存规格的 Subpage 双向链表的 `head` 节点。详细解析，见 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（五）PoolArena》](http://svip.iocoder.cn/Netty/ByteBuf-3-5-Jemalloc-Arena) 。

  - 第 19 行：`synchronized` 加锁，分配过程会修改双向链表的结构，会存在多线程的情况。

  - 第 21 行：调用

     

    ```
    SubPage#free(PoolSubpage<T> head, int bitmapIdx)
    ```

     

    方法，释放 Subpage 内存块。

    - 如果返回 `false` ，说明 Page 中**无切分正在使用**的 Subpage 内存块，所以可以继续向下执行，释放 Page 内存块。

- 第 30 至 35 行：释放 Page 内存块。

  - 第 31 行：增加剩余可用字节数。
  - 第 33 行：调用 `#setValue(int id, byte val)` 方法，设置 Page 对应的节点**可用**。
  - 第 35 行：调用 `#updateParentsAlloc(int id)` 方法，更新获得的节点的祖先**可用**。

## 2.4 updateParents

### 2.4.1 updateParentsAlloc

`#updateParentsAlloc(int id)` 方法，更新获得的节点的祖先都不可用。代码如下：

```
   /**
    * Update method used by allocate
    * This is triggered only when a successor is allocated and all its predecessors
    * need to update their state
    * The minimal depth at which subtree rooted at id has some free space
    *
    * @param id id
    */
 1: private void updateParentsAlloc(int id) {
 2:     while (id > 1) {
 3:         // 获得父节点的编号
 4:         int parentId = id >>> 1;
 5:         // 获得子节点的值
 6:         byte val1 = value(id);
 7:         // 获得另外一个子节点的
 8:         byte val2 = value(id ^ 1);
 9:         // 获得子节点较小值，并设置到父节点
10:         byte val = val1 < val2 ? val1 : val2;
11:         setValue(parentId, val);
12:         // 跳到父节点
13:         id = parentId;
14:     }
15: }
```

- 😈 注意，调用此方法时，节点 `id` 已经更新为**不可用**。
- 第 2 行：循环，直到**根**节点。
- 第 4 行：`>>> 1` 操作，获得父节点的编号。
- 第 5 至 11 行：获得子节点较小值，并调用 `#setValue(int id, int value)` 方法，设置到父节点。
- 第 13 行：跳到父节点。

### 2.4.2 updateParentsFree

`#updateParentsAlloc(int id)` 方法，更新获得的节点的祖先可用。代码如下：

```
   /**
    * Update method used by free
    * This needs to handle the special case when both children are completely free
    * in which case parent be directly allocated on request of size = child-size * 2
    *
    * @param id id
    */
 1: private void updateParentsFree(int id) {
 2:     // 获得当前节点的子节点的层级
 3:     int logChild = depth(id) + 1;
 4:     while (id > 1) {
 5:         // 获得父节点的编号
 6:         int parentId = id >>> 1;
 7:         // 获得子节点的值
 8:         byte val1 = value(id);
 9:         // 获得另外一个子节点的值
10:         byte val2 = value(id ^ 1);
11:         // 获得当前节点的层级
12:         logChild -= 1; // in first iteration equals log, subsequently reduce 1 from logChild as we traverse up
13: 
14:         // 两个子节点都可用，则直接设置父节点的层级
15:         if (val1 == logChild && val2 == logChild) {
16:             setValue(parentId, (byte) (logChild - 1));
17:         // 两个子节点任一不可用，则取子节点较小值，并设置到父节点
18:         } else {
19:             byte val = val1 < val2 ? val1 : val2;
20:             setValue(parentId, val);
21:         }
22: 
23:         // 跳到父节点
24:         id = parentId;
25:     }
26: }
```

- 😈 注意，调用此方法时，节点 `id` 已经更新为可用。
- 第 3 行：获得当前节点的子节点的层级。
- 第 4 行：循环，直到**根**节点。
- 第 6 行：`>>> 1` 操作，获得**父**节点的编号。
- 第 7 至 10 行：获得两个**子**节点的值。
- 第 12 行：获得当前节点的层级。
- 第 14 至 16 行：两个子节点都可用，则调用 `#setValue(id, value)` 方法，直接设置父节点的层级( 注意，是 `logChild - 1` )。
- 第 17 至 21 行：两个子节点任一不可用，则`#setValue(id, value)` 方法，取子节点较小值，并设置到父节点。
- 第 24 行：跳到父节点。

## 2.5 initBuf

`#initBuf(PooledByteBuf<T> buf, long handle, int reqCapacity)` 方法，初始化分配的内存块到 PooledByteBuf 中。代码如下：

```
 1: void initBuf(PooledByteBuf<T> buf, long handle, int reqCapacity) {
 2:     // 获得 memoryMap 数组的编号( 下标 )
 3:     int memoryMapIdx = memoryMapIdx(handle);
 4:     // 获得 bitmap 数组的编号( 下标 )。注意，此时获得的还不是真正的 bitmapIdx 值，需要经过 `bitmapIdx & 0x3FFFFFFF` 运算。
 5:     int bitmapIdx = bitmapIdx(handle);
 6:     // 内存块为 Page
 7:     if (bitmapIdx == 0) {
 8:         byte val = value(memoryMapIdx);
 9:         assert val == unusable : String.valueOf(val);
10:         // 初始化 Page 内存块到 PooledByteBuf 中
11:         buf.init(this, handle, runOffset(memoryMapIdx) + offset, reqCapacity, runLength(memoryMapIdx), arena.parent.threadCache());
12:     // 内存块为 SubPage
13:     } else {
14:         // 初始化 SubPage 内存块到 PooledByteBuf 中
15:         initBufWithSubpage(buf, handle, bitmapIdx, reqCapacity);
16:     }
17: }
```

- 第 3 行：调用 `#memoryMapIdx(handle)` 方法，获得 `memoryMap` 数组的编号( 下标 )。

- 第 5 行：调用 `#bitmapIdx(handle)` 方法，获得 `bitmap` 数组的编号( 下标 )。

- 第 6 至 11 行：通过 `bitmapIdx == 0` 判断出，内存块是 Page 。所以，调用 `PooledByteBuf#init(PoolChunk<T> chunk, long handle, int offset, int length, int maxLength, PoolThreadCache cache)` 方法，初始化 Page 内存块到 PooledByteBuf 中。其中，`runOffset(memoryMapIdx) + offset` 代码块，计算 Page 内存块在 `memory` 中的开始位置。`runOffset(int id)` 方法，代码如下：

  ```
  private int runOffset(int id) {
      // represents the 0-based offset in #bytes from start of the byte-array chunk
      int shift = id ^ 1 << depth(id);
      return shift * runLength(id);
  }
      
  private int runLength(int id) {
      // represents the size in #bytes supported by node 'id' in the tree
      return 1 << log2ChunkSize - depth(id);
  }
  ```

- 第12 至 16 行：通过 `bitmapIdx != 0` 判断出，内存块是 SubPage 。所以，调用 `#initBufWithSubpage(PooledByteBuf<T> buf, long handle, int reqCapacity)` 方法，初始化 SubPage 内存块到 PooledByteBuf 中。详细解析，见 [「2.5.1 initBufWithSubpage」](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk/#) 。

### 2.5.1 initBufWithSubpage

`#initBufWithSubpage(PooledByteBuf<T> buf, long handle, int reqCapacity)` 方法，初始化 SubPage 内存块到 PooledByteBuf 中。代码如下：

```
   void initBufWithSubpage(PooledByteBuf<T> buf, long handle, int reqCapacity) {
       initBufWithSubpage(buf, handle, bitmapIdx(handle), reqCapacity);
   }

 1: private void initBufWithSubpage(PooledByteBuf<T> buf, long handle, int bitmapIdx, int reqCapacity) {
 2:     assert bitmapIdx != 0;
 3: 
 4:     // 获得 memoryMap 数组的编号( 下标 )
 5:     int memoryMapIdx = memoryMapIdx(handle);
 6:     // 获得 SubPage 对象
 7:     PoolSubpage<T> subpage = subpages[subpageIdx(memoryMapIdx)];
 8:     assert subpage.doNotDestroy;
 9:     assert reqCapacity <= subpage.elemSize;
10: 
11:     // 初始化 SubPage 内存块到 PooledByteBuf 中
12:     buf.init(
13:         this, handle,
14:         runOffset(memoryMapIdx) + (bitmapIdx & 0x3FFFFFFF) * subpage.elemSize + offset,
15:             reqCapacity, subpage.elemSize, arena.parent.threadCache());
16: }
```

- 第 3 至 7 行：获得 SubPage 对象。
- 第 11 至于 15 行：调用 `PooledByteBuf#init(PoolChunk<T> chunk, long handle, int offset, int length, int maxLength, PoolThreadCache cache)` 方法，初始化 SubPage 内存块到 PooledByteBuf 中。其中，`runOffset(memoryMapIdx) + (bitmapIdx & 0x3FFFFFFF) * subpage.elemSize + offset` 代码块，计算 SubPage 内存块在 `memory` 中的开始位置。

## 2.6 destroy

`#destroy()` 方法，从 Arena 中销毁当前 Chunk 。代码如下：

```
void destroy() {
    arena.destroyChunk(this);
}
```

- 详细解析，见 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（五）PoolArena》](http://svip.iocoder.cn/Netty/ByteBuf-3-5-Jemalloc-Arena) 。

## 2.7 PoolChunkMetric

`io.netty.buffer.PoolChunkMetric` ，PoolChunk Metric 接口。代码如下：

```
public interface PoolChunkMetric {

    /**
     * Return the percentage of the current usage of the chunk.
     */
    int usage();

    /**
     * Return the size of the chunk in bytes, this is the maximum of bytes that can be served out of the chunk.
     */
    int chunkSize();

    /**
     * Return the number of free bytes in the chunk.
     */
    int freeBytes();

}
```

------

PoolChunk 对 PoolChunkMetric 接口的实现，代码如下：

```
@Override
public int usage() {
    final int freeBytes;
    synchronized (arena) {
        freeBytes = this.freeBytes;
    }
    return usage(freeBytes);
}

private int usage(int freeBytes) {
    // 全部使用，100%
    if (freeBytes == 0) {
        return 100;
    }

    // 部分使用，最高 99%
    int freePercentage = (int) (freeBytes * 100L / chunkSize);
    if (freePercentage == 0) {
        return 99;
    }
    return 100 - freePercentage;
}

@Override
public int chunkSize() {
    return chunkSize;
}

@Override
public int freeBytes() {
    synchronized (arena) {
        return freeBytes;
    }
}
```

- `synchronized` 的原因是，保证 `freeBytes` 对其它线程的可见性。对应 Github 提交为 [a7fe6c01539d3ad92d7cd94a25daff9e10851088](https://github.com/netty/netty/commit/a7fe6c01539d3ad92d7cd94a25daff9e10851088) 。

  > **Motivation**:
  >
  > As we may access the metrics exposed of PooledByteBufAllocator from another thread then the allocations happen we need to ensure we synchronize on the PoolArena to ensure correct visibility.
  >
  > **Modifications**:
  >
  > Synchronize on the PoolArena to ensure correct visibility.
  >
  > **Result**:
  >
  > Fix multi-thread issues on the metrics

# 666. 彩蛋

老艿艿有点二，在 `#allocateNode(int normCapacity)` 方法卡了很久。因为没看到 `memoryMap` 和 `depthMap` 数组，下标是从 1 开始的！！！我恨那。

参考如下文章：

- 占小狼 [《深入浅出Netty内存管理 PoolChunk》](https://www.jianshu.com/p/c4bd37a3555b)
- Hypercube [《自顶向下深入分析Netty（十）–PoolChunk》](https://www.jianshu.com/p/70181af2972a)

# Buffer 之 Jemalloc（三）PoolSubpage

# 1. 概述

在 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（一）PoolChunk》](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk) 一文中，我们已经看到，为了进一步提供提高内存**分配效率**并减少**内存碎片**，Jemalloc 算法将每个 Chunk 切分成多个**小块** Page 。

但是实际应用中，Page 也是**比较大**的内存块，如果直接使用，明显是很浪费的。因此，Jemalloc 算法将每个 Page 更进一步的切分为**多个** Subpage 内存块。Page 切分成**多个** Subpage 内存块，并未采用相对复杂的算法和数据结构，而是直接基于**数组**，通过数组来**标记**每个 Subpage 内存块是否已经分配。如下图所示：[![PoolSubpage](http://static.iocoder.cn/images/Netty/2018_09_07/01.png)](http://static.iocoder.cn/images/Netty/2018_09_07/01.png)PoolSubpage

- 一个 Page ，切分出的**多个** Subpage 内存块**大小均等**。

- 每个 Page 拆分的 Subpage 内存块

  可以不同

  ，以 Page 第一次拆分为 Subpage 内存块时请求分配的内存大小为准。例如：

  - 初始时，申请一个 16B 的内存块，那么 Page0 被拆成成 512( `8KB / 16B` )个 Subpage 块，使用第 0 块。
  - 然后，申请一个 32B 的内存块，那么 Page1 被拆分成 256( `8KB / 32B` )个 Subpage 块，使用第 0 块。
  - 最后，申请一个 16B 的内存块，那么重用 Page0 ，使用第 1 块。
  - 总结来说，申请 Subpage 内存块时，先去找**大小匹配**，且有可分配 Subpage 内存块的 Page ：1）如果有，则使用其中的一块 Subpage ；2）如果没有，则选择一个新的 Page 拆分成多个 Subpage 内存块，使用第 0 块 Subpage 。

- Subpage 的内存规格，分成 Tiny 和 Small 两类，并且每类有多种大小，如下图所示：[![Subpage 内存规格](http://static.iocoder.cn/images/Netty/2018_09_07/02.png)](http://static.iocoder.cn/images/Netty/2018_09_07/02.png)Subpage 内存规格

- 为了方便描述，下文我们会继续将 `ele` 小块，描述成“Subpage 内存块”，简称“Subpage” 。

# 2. PoolSubpage

`io.netty.buffer.PoolSubpage` ，实现 PoolSubpageMetric 接口，Netty 对 Jemalloc Subpage 的实现类。

虽然，PoolSubpage 类的命名是“Subpage”，实际描述的是，Page 切分为**多个** Subpage 内存块的分配情况。那么为什么不直接叫 PoolPage 呢？在 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（一）PoolChunk》](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk) 一文中，我们可以看到，当申请分配的内存规格为 Normal 和 Huge 时，使用的是一块或多块 Page 内存块。如果 PoolSubpage 命名成 PoolPage 后，和这块的分配策略是有所冲突的。或者说，**Subpage ，只是 Page 分配内存的一种形式**。

## 2.1 构造方法

```
/**
 * 所属 PoolChunk 对象
 */
final PoolChunk<T> chunk;
/**
 * 在 {@link PoolChunk#memoryMap} 的节点编号
 */
private final int memoryMapIdx;
/**
 * 在 Chunk 中，偏移字节量
 *
 * @see PoolChunk#runOffset(int) 
 */
private final int runOffset;
/**
 * Page 大小 {@link PoolChunk#pageSize}
 */
private final int pageSize;

/**
 * Subpage 分配信息数组
 *
 * 每个 long 的 bits 位代表一个 Subpage 是否分配。
 * 因为 PoolSubpage 可能会超过 64 个( long 的 bits 位数 )，所以使用数组。
 *   例如：Page 默认大小为 8KB ，Subpage 默认最小为 16 B ，所以一个 Page 最多可包含 8 * 1024 / 16 = 512 个 Subpage 。
 *        因此，bitmap 数组大小为 512 / 64 = 8 。
 * 另外，bitmap 的数组大小，使用 {@link #bitmapLength} 来标记。或者说，bitmap 数组，默认按照 Subpage 的大小为 16B 来初始化。
 *    为什么是这样的设定呢？因为 PoolSubpage 可重用，通过 {@link #init(PoolSubpage, int)} 进行重新初始化。
 */
private final long[] bitmap;

/**
 * 双向链表，前一个 PoolSubpage 对象
 */
PoolSubpage<T> prev;
/**
 * 双向链表，后一个 PoolSubpage 对象
 */
PoolSubpage<T> next;

/**
 * 是否未销毁
 */
boolean doNotDestroy;
/**
 * 每个 Subpage 的占用内存大小
 */
int elemSize;
/**
 * 总共 Subpage 的数量
 */
private int maxNumElems;
/**
 * {@link #bitmap} 长度
 */
private int bitmapLength;
/**
 * 下一个可分配 Subpage 的数组位置
 */
private int nextAvail;
/**
 * 剩余可用 Subpage 的数量
 */
private int numAvail;

  1: // 【构造方法 1】 双向链表，头节点
  2: /** Special constructor that creates a linked list head */
  3: PoolSubpage(int pageSize) {
  4:     chunk = null;
  5:     memoryMapIdx = -1;
  6:     runOffset = -1;
  7:     elemSize = -1;
  8:     this.pageSize = pageSize;
  9:     bitmap = null;
 10: }
 11: 
 12: // 【构造方法 2】 双向链表，Page 节点
 13: PoolSubpage(PoolSubpage<T> head, PoolChunk<T> chunk, int memoryMapIdx, int runOffset, int pageSize, int elemSize) {
 14:     this.chunk = chunk;
 15:     this.memoryMapIdx = memoryMapIdx;
 16:     this.runOffset = runOffset;
 17:     this.pageSize = pageSize;
 18:     // 创建 bitmap 数组
 19:     bitmap = new long[pageSize >>> 10]; // pageSize / 16 / 64
 20:     // 初始化
 21:     init(head, elemSize);
 22: }
```

- Chunk 相关

  - `chunk` 属性，所属 PoolChunk 对象。
  - `memoryMapIdx` 属性，在 `PoolChunk.memoryMap` 的节点编号，例如节点编号 2048 。
  - `runOffset` 属性，在 Chunk 中，偏移字节量，通过 `PoolChunk#runOffset(id)` 方法计算。在 PoolSubpage 中，无相关的逻辑，仅用于 `#toString()` 方法，打印信息。
  - `pageSize` 属性，Page 大小。

- Subpage 相关

  - ```
    bitmap
    ```

     

    属性，Subpage

     

    分配信息

    数组。

    - 1、每个 `long` 的 bits 位代表一个 Subpage 是否分配。因为 PoolSubpage 可能会超过 64 个( `long` 的 bits 位数 )，所以使用数组。例如：Page 默认大小为 `8KB` ，Subpage 默认最小为 `16B` ，所以一个 Page 最多可包含 `8 * 1024 / 16` = 512 个 Subpage 。

    - 2、在【第 19 行】的代码，创建

       

      ```
      bitmap
      ```

       

      数组。我们可以看到，

      ```
      bitmap
      ```

       

      数组的大小为 8(

      ```
      pageSize >>> 10 = pageSize / 16 / 64 = 512 / 64
      ```

      ) 个。

      - 为什么是**固定大小**呢？因为 PoolSubpage **可重用**，通过 `#init(PoolSubpage, int)` 进行重新初始化。
      - 那么数组大小怎么获得？通过 `bitmapLength` 属性来标记**真正**使用的数组大小。

  - `bitmapLength` 属性，`bitmap` 数组的**真正**使用的数组大小。

  - `elemSize` 属性，每个 Subpage 的占用内存大小，例如 `16B`、`32B` 等等。

  - `maxNumElems` 属性，总共 Subpage 的数量。例如 `16B` 为 512 个，`32b` 为 256 个。

  - `numAvail` 属性，剩余可用 Subpage 的数量。

  - `nextAvail` 属性，下一个可分配 Subpage 的数组( `bitmap` )位置。可能会有胖友有疑问，`bitmap` 又是数组，又考虑 bits 位，怎么计算位置呢？在 [「2.6 getNextAvail」](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage/#) 见分晓。

  - `doNotDestroy` 属性，是否未销毁。详细解析，见 [「2.5 free」](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage/#) 中。

- Arena 相关

  - `prev` 属性，双向链表，前一个 PoolSubpage 对象。
  - `next` 属性，双向链表，后一个 PoolSubpage 对象。
  - 详细解析，见 [「2.3 双向链表」](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage/#) 。

- 构造方法 **1** ，用于创建双向链表的头( head )节点。

- 构造方法

   

  2

   

  ，用于创建双向链表的 Page 节点。

  - 第 21 行：调用 `#init(PoolSubpage<T> head, int elemSize)` 方法，初始化。详细解析，见 [「2.2 init」](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage/#) 。

## 2.2 init

`#init(PoolSubpage<T> head, int elemSize)` 方法，初始化。代码如下：

```
 1: void init(PoolSubpage<T> head, int elemSize) {
 2:     // 未销毁
 3:     doNotDestroy = true;
 4:     // 初始化 elemSize
 5:     this.elemSize = elemSize;
 6:     if (elemSize != 0) {
 7:         // 初始化 maxNumElems
 8:         maxNumElems = numAvail = pageSize / elemSize;
 9:         // 初始化 nextAvail
10:         nextAvail = 0;
11:         // 计算 bitmapLength 的大小
12:         bitmapLength = maxNumElems >>> 6;
13:         if ((maxNumElems & 63) != 0) { // 未整除，补 1.
14:             bitmapLength ++;
15:         }
16: 
17:         // 初始化 bitmap
18:         for (int i = 0; i < bitmapLength; i ++) {
19:             bitmap[i] = 0;
20:         }
21:     }
22:     // 添加到 Arena 的双向链表中。
23:     addToPool(head);
24: }
```

- 第 3 行：未销毁。

- 第 5 行：初始化

   

  ```
  elemSize
  ```

   

  。

  - 第 8 行：初始化 `maxNumElems` 。

- 第 10 行：初始化 `nextAvail` 。

- 第 11 至 15 行：初始化

   

  ```
  bitmapLength
  ```

   

  。

  - 第 17 至 20 行：初始化 `bitmap` 。

- 第 23 行：调用 `#addToPool(PoolSubpage<T> head)` 方法中，添加到 Arena 的双向链表中。详细解析，见 [「2.3.1 addToPool」](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage/#) 中。

## 2.3 双向链表

在每个 Arena 中，有 `tinySubpagePools` 和 `smallSubpagePools` 属性，分别表示 **tiny** 和 **small** 类型的 PoolSubpage 数组。代码如下：

```
// PoolArena.java

/**
 * tiny 类型的 PoolSubpage 数组
 *
 * 数组的每个元素，都是双向链表
 */
private final PoolSubpage<T>[] tinySubpagePools;
/**
 * small 类型的 SubpagePools 数组
 *
 * 数组的每个元素，都是双向链表
 */
private final PoolSubpage<T>[] smallSubpagePools;
```

- 数组的每个元素，通过 `prev` 和 `next` 属性，形成**双向**链表。并且，每个元素，表示对应的 Subpage 内存规格的**双向**链表，例如：`tinySubpagePools[0]` 表示 `16B` ，`tinySubpagePools[1]` 表示 `32B` 。

- 通过 `tinySubpagePools` 和 `smallSubpagePools` 属性，可以从中查找，是否已经有符合分配内存规格的 Subpage 节点可分配。

- 初始时，每个双向链表，会创建对应的 `head` 节点，代码如下：

  ```
  // PoolArena.java
  
  private PoolSubpage<T> newSubpagePoolHead(int pageSize) {
      PoolSubpage<T> head = new PoolSubpage<T>(pageSize);
      head.prev = head;
      head.next = head;
      return head;
  }
  ```

  - 比较神奇的是，`head` 的上下节点都是**自己**。也就说，这是个双向环形( 循环 )链表。

### 2.3.1 addToPool

`#addToPool(PoolSubpage<T> head)` 方法中，添加到 Arena 的双向链表中。代码如下：

```
private void addToPool(PoolSubpage<T> head) {
    assert prev == null && next == null;
    // 将当前节点，插入到 head 和 head.next 中间
    prev = head;
    next = head.next;
    next.prev = this;
    head.next = this;
}
```

- 将当前节点，插入到

   

  ```
  head
  ```

   

  和

   

  ```
  head.next
  ```

   

  中间。如下图所示：

  ![插入过程](http://static.iocoder.cn/images/Netty/2018_09_07/03.png)

  插入过程

  - 注意，是在 `head` 和 `head.next` **中间**插入节点噢。

### 2.3.2 removeFromPool

`#removeFromPool()` 方法中，从双向链表中移除。代码如下：

```
private void removeFromPool() {
    assert prev != null && next != null;
    // 前后节点，互相指向
    prev.next = next;
    next.prev = prev;
    // 当前节点，置空
    next = null;
    prev = null;
}
```

## 2.4 allocate

`#allocate()` 方法，分配一个 Subpage 内存块，并返回该内存块的位置 `handle` 。代码如下：

> 关于 `handle` 怎么翻译和解释好呢？笔者暂时没想好，官方的定义是 `"Returns the bitmap index of the subpage allocation."` 。

```
 1: long allocate() {
 2:     // 防御性编程，不存在这种情况。
 3:     if (elemSize == 0) {
 4:         return toHandle(0);
 5:     }
 6: 
 7:     // 可用数量为 0 ，或者已销毁，返回 -1 ，即不可分配。
 8:     if (numAvail == 0 || !doNotDestroy) {
 9:         return -1;
10:     }
11: 
12:     // 获得下一个可用的 Subpage 在 bitmap 中的总体位置
13:     final int bitmapIdx = getNextAvail();
14:     // 获得下一个可用的 Subpage 在 bitmap 中数组的位置
15:     int q = bitmapIdx >>> 6;
16:     // 获得下一个可用的 Subpage 在 bitmap 中数组的位置的第几 bits
17:     int r = bitmapIdx & 63;
18:     assert (bitmap[q] >>> r & 1) == 0;
19:     // 修改 Subpage 在 bitmap 中不可分配。
20:     bitmap[q] |= 1L << r;
21: 
22:     // 可用 Subpage 内存块的计数减一
23:     if (-- numAvail == 0) { // 无可用 Subpage 内存块
24:         // 从双向链表中移除
25:         removeFromPool();
26:     }
27: 
28:     // 计算 handle
29:     return toHandle(bitmapIdx);
30: }
```

- 第 2 至 5 行：防御性编程，不存在这种情况。

- 第 7 至 10 行：可用数量为 0 ，或者已销毁，返回 -1 ，即**不可分配**。

- 第 12 至 20 行：分配一个 Subpage 内存块。

  - 第 13 行：调用 `#getNextAvail()` 方法，获得下一个可用的 Subpage 在 bitmap 中的**总体**位置。详细解析，见 [「2.6 getNextAvail」](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage/#) 。
  - 第 15 行：`bitmapIdx >>> 6 = bitmapIdx / 64` 操作，获得下一个可用的 Subpage 在 bitmap 中**数组的位置**。
  - 第 17 行：`bitmapIdx & 63 = bitmapIdx % 64` 操作， 获得下一个可用的 Subpage 在 bitmap 中数组的位置的**第几 bit** 。
  - 第 20 行：`| (1L << r)` 操作，修改 Subpage 在 bitmap 中不可分配。

- 第 23 行：可用 Subpage 内存块的计数减一。

  - 第 25 行：当 `numAvail == 0` 时，表示无可用 Subpage 内存块。所以，调用 `#removeFromPool()` 方法，从双向链表中移除。详细解析，见 [「2.3.2 removeFromPool」](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage/#) 。

- 第 29 行：调用 `#toHandle(bitmapIdx)` 方法，计算 `handle` 值。代码如下：

  ```
  private long toHandle(int bitmapIdx) {
      return 0x4000000000000000L | (long) bitmapIdx << 32 | memoryMapIdx;
  }
  ```

  - 低 32 bits ：`memoryMapIdx` ，可以判断所属 Chunk 的哪个 Page 节点，即 `memoryMap[memoryMapIdx]` 。

  - 高 32 bits ：

    ```
    bitmapIdx
    ```

     

    ，可以判断 Page 节点中的哪个 Subpage 的内存块，即

     

    ```
    bitmap[bitmapIdx]
    ```

     

    。

    - 那么为什么会有

       

      ```
      0x4000000000000000L
      ```

       

      呢？因为在

       

      ```
      PoolChunk#allocate(int normCapacity)
      ```

       

      中：

      - 如果分配的是 Page 内存块，返回的是 `memoryMapIdx` 。
      - 如果分配的是 Subpage 内存块，返回的是 `handle` 。**但但但是**，如果说 `bitmapIdx = 0` ，那么没有 `0x4000000000000000L` 情况下，就会和【分配 Page 内存块】冲突。因此，需要有 `0x4000000000000000L` 。

    - 因为有了 `0x4000000000000000L`(最高两位为 `01` ，其它位为 `0` )，所以获取 `bitmapIdx` 时，通过 `handle >>> 32 & 0x3FFFFFFF` 操作。使用 `0x3FFFFFFF`( 最高两位为 `00` ，其它位为 `1` ) 进行消除 `0x4000000000000000L` 带来的影响。

## 2.5 free

`#free(PoolSubpage<T> head, int bitmapIdx)` 方法，释放指定位置的 Subpage 内存块，并返回当前 Page **是否正在使用中**( `true` )。代码如下：

```
 1: boolean free(PoolSubpage<T> head, int bitmapIdx) {
 2:     // 防御性编程，不存在这种情况。
 3:     if (elemSize == 0) {
 4:         return true;
 5:     }
 6:     // 获得 Subpage 在 bitmap 中数组的位置
 7:     int q = bitmapIdx >>> 6;
 8:     // 获得 Subpage 在 bitmap 中数组的位置的第几 bits
 9:     int r = bitmapIdx & 63;
10:     assert (bitmap[q] >>> r & 1) != 0;
11:     // 修改 Subpage 在 bitmap 中可分配。
12:     bitmap[q] ^= 1L << r;
13: 
14:     // 设置下一个可用为当前 Subpage
15:     setNextAvail(bitmapIdx);
16: 
17:     // 可用 Subpage 内存块的计数加一
18:     if (numAvail ++ == 0) {
19:         // 添加到 Arena 的双向链表中。
20:         addToPool(head);
21:         return true;
22:     }
23: 
24:     // 还有 Subpage 在使用
25:     if (numAvail != maxNumElems) {
26:         return true;
27:     // 没有 Subpage 在使用
28:     } else {
29:         // 双向链表中，只有该节点，不进行移除
30:         // Subpage not in use (numAvail == maxNumElems)
31:         if (prev == next) {
32:             // Do not remove if this subpage is the only one left in the pool.
33:             return true;
34:         }
35: 
36:         // 标记为已销毁
37:         // Remove this subpage from the pool if there are other subpages left in the pool.
38:         doNotDestroy = false;
39:         // 从双向链表中移除
40:         removeFromPool();
41:         return false;
42:     }
43: }
```

- 第 2 至 5 行：防御性编程，不存在这种情况。

- 第 6 至 12 行：释放指定位置的 Subpage 内存块。

  - 第 7 行：`bitmapIdx >>> 6 = bitmapIdx / 64` 操作，获得下一个可用的 Subpage 在 bitmap 中**数组的位置**。
  - 第 9 行：`bitmapIdx & 63 = bitmapIdx % 64` 操作， 获得下一个可用的 Subpage 在 bitmap 中数组的位置的**第几 bit** 。
  - 第 12 行：`^ (1L << r)` 操作，修改 Subpage 在 bitmap 中可分配。

- 第 15 行：调用 `#setNextAvail(int bitmapIdx)` 方法，设置下一个可用为当前 Subpage 的位置。这样，就能避免下次分配 Subpage 时，再去找位置。代码如下：

  ```
  private void setNextAvail(int bitmapIdx) {
      nextAvail = bitmapIdx;
  }
  ```

- 第 18 行：可用 Subpage 内存块的计数加一。

  - 第 20 行：当之前 `numAvail == 0` 时，表示**又有**可用 Subpage 内存块。所以，调用 `#addToPool(PoolSubpage<T> head)` 方法，添加到 Arena 的双向链表中。详细解析，见 [「2.3.1 addToPool」](http://svip.iocoder.cn/Netty/ByteBuf-3-3-Jemalloc-subpage/#) 。
  - 第 21 行：返回 `true` ，正在使用中。

- 第 24 至 26 行：返回 `true` ，因为还有其它在使用的 Subpage 内存块。

- 第 27 至 42 行：没有 Subpage 在使用。

  - 第 29 至 34 行：返回 `true` ，因为通过 `prev == next` 可判断，当前节点为双向链表中的唯一节点，不进行移除。也就说，该节点后续，继续使用。

  - 第 36 至 41 行：返回

     

    ```
    false
    ```

     

    ，不在使用中。

    - 第 38 行：标记为已销毁。
    - 第 40 行：调用 `#removeFromPool()` 方法，从双向链表中移除。因为此时双向链表中，还有其它节点可使用，**没必要保持多个相同规格的节点**。

------

关于为什么 `#free(PoolSubpage<T> head, int bitmapIdx)` 方法，需要返回 `true` 或 `false` 呢？胖友再看看 `PoolChunk#free(long handle)` 方法，就能明白。答案是，如果不再使用，可以将该节点( Page )从 Chunk 中释放，标记为可用。😈😈😈

## 2.6 getNextAvail

`#getNextAvail()` 方法，获得下一个可用的 Subpage 在 bitmap 中的**总体**位置。代码如下：

```
private int getNextAvail() {
    int nextAvail = this.nextAvail;
    // <1> nextAvail 大于 0 ，意味着已经“缓存”好下一个可用的位置，直接返回即可。
    if (nextAvail >= 0) {
        this.nextAvail = -1;
        return nextAvail;
    }
    // <2> 寻找下一个 nextAvail
    return findNextAvail();
}
```

- ```
  <1>
  ```

   

  处，如果

   

  ```
  nextAvail
  ```

   

  大于 0 ，意味着已经“缓存”好下一个可用的位置，直接返回即可。

  - 获取好后，会将 `nextAvail` 置为 -1 。意味着，下次需要寻找下一个 `nextAvail` 。

- `<2>` 处，调用 `#findNextAvail()` 方法，寻找下一个 `nextAvail` 。代码如下：

  ```
  private int findNextAvail() {
      final long[] bitmap = this.bitmap;
      final int bitmapLength = this.bitmapLength;
      // 循环 bitmap
      for (int i = 0; i < bitmapLength; i ++) {
          long bits = bitmap[i];
          // ~ 操作，如果不等于 0 ，说明有可用的 Subpage
          if (~bits != 0) {
              // 在这 bits 寻找可用 nextAvail
              return findNextAvail0(i, bits);
          }
      }
      // 未找到
      return -1;
  }
  ```

  - 代码比较简单，胖友直接看注释。

  - 调用 `#findNextAvail0(int i, long bits)` 方法，在这 bits 寻找可用 `nextAvail` 。代码如下：

    ```
     1: private int findNextAvail0(int i, long bits) {
     2:     final int maxNumElems = this.maxNumElems;
     3:     // 计算基础值，表示在 bitmap 的数组下标
     4:     final int baseVal = i << 6; // 相当于 * 64
     5: 
     6:     // 遍历 64 bits
     7:     for (int j = 0; j < 64; j ++) {
     8:         // 计算当前 bit 是否未分配
     9:         if ((bits & 1) == 0) {
    10:             // 可能 bitmap 最后一个元素，并没有 64 位，通过 baseVal | j < maxNumElems 来保证不超过上限。
    11:             int val = baseVal | j;
    12:             if (val < maxNumElems) {
    13:                 return val;
    14:             } else {
    15:                 break;
    16:             }
    17:         }
    18:         // 去掉当前 bit
    19:         bits >>>= 1;
    20:     }
    21: 
    22:     // 未找到
    23:     return -1;
    24: }
    ```

    - 第 4 行：计算基础值，表示在 `bitmap` 的数组**下标**。通过 `i << 6 = i * 64` 的计算，我们可以通过 `i >>> 6 = i / 64` 的方式，知道是 `bitmap` 数组的第几个元素。

    - 第 7 行：循环 64 bits 。

      - 第 9 行：

        ```
        (bits & 1) == 0
        ```

         

        操作，计算当前 bit 是否

        未分配

        。

        - 第 11 行：`baseVal | j` 操作，使用**低 64 bits** ，表示分配 `bitmap` 数组的元素的**第几 bit** 。

        - 第 12 行：可能

           

          ```
          bitmap
          ```

           

          数组的最后一个元素，并没有 64 位，通过

           

          ```
          baseVal | j < maxNumElems
          ```

           

          来保证不超过上限。如果

          - 第 13 行：未超过，返回 `val` 。
          - 第 15 行：超过，结束循环，最终返回 `-1` 。

      - 第 19 行：去掉当前 bit 。这样，下次循环就可以判断下一个 bit 是否**未分配**。

    - 第 23 行：返回 `-1` ，表示未找到。

## 2.6 destroy

`#destroy()` 方法，销毁。代码如下：

```
void destroy() {
    if (chunk != null) {
        chunk.destroy();
    }
}
```

## 2.7 PoolSubpageMetric

`io.netty.buffer.PoolSubpageMetric` ，PoolSubpage Metric 接口。代码如下：

```
public interface PoolSubpageMetric {

    /**
     * Return the number of maximal elements that can be allocated out of the sub-page.
     */
    int maxNumElements();

    /**
     * Return the number of available elements to be allocated.
     */
    int numAvailable();

    /**
     * Return the size (in bytes) of the elements that will be allocated.
     */
    int elementSize();

    /**
     * Return the size (in bytes) of this page.
     */
    int pageSize();
}
```

------

PoolChunk 对 PoolChunkMetric 接口的实现，代码如下：

```
@Override
public int maxNumElements() {
    synchronized (chunk.arena) {
        return maxNumElems;
    }
}

@Override
public int numAvailable() {
    synchronized (chunk.arena) {
        return numAvail;
    }
}

@Override
public int elementSize() {
    synchronized (chunk.arena) {
        return elemSize;
    }
}

@Override
public int pageSize() {
    return pageSize;
}
```

# 666. 彩蛋

PoolSubpage 相比 PoolChunk 来说，简单好多。嘿嘿。

参考如下文章：

- 占小狼 [《深入浅出Netty内存管理 PoolSubpage》](https://www.jianshu.com/p/d91060311437)
- Hypercube [《自顶向下深入分析Netty（十）–PoolSubpage》](https://www.jianshu.com/p/7afd3a801b15)

# Buffer 之 Jemalloc（四）PoolChunkList

# 1. 概述

在 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（二）PoolChunk》](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk) ，我们看到 PoolChunk 有如下三个属性：

```
/**
 * 所属 PoolChunkList 对象
 */
PoolChunkList<T> parent;
/**
 * 上一个 Chunk 对象
 */
PoolChunk<T> prev;
/**
 * 下一个 Chunk 对象
 */
PoolChunk<T> next;
```

- 通过 `prev` 和 `next` 两个属性，形成一个**双向** Chunk 链表 `parent`( PoolChunkList )。

那么为什么需要有 PoolChunkList 这样一个链表呢？直接开始撸代码。

# 2. PoolChunkList

`io.netty.buffer.PoolChunkList` ，实现 PoolChunkListMetric 接口，负责管理多个 Chunk 的生命周期，**在此基础上对内存分配进行进一步的优化**。

## 2.1 构造方法

```
/**
 * 所属 PoolArena 对象
 */
private final PoolArena<T> arena;
/**
 * 下一个 PoolChunkList 对象
 */
private final PoolChunkList<T> nextList;
/**
 * Chunk 最小内存使用率
 */
private final int minUsage;
/**
 * Chunk 最大内存使用率
 */
private final int maxUsage;
/**
 * 每个 Chunk 最大可分配的容量
 *
 * @see #calculateMaxCapacity(int, int) 方法
 */
private final int maxCapacity;
/**
 * PoolChunk 头节点
 */
private PoolChunk<T> head;

/**
 * 前一个 PoolChunkList 对象
 */
// This is only update once when create the linked like list of PoolChunkList in PoolArena constructor.
private PoolChunkList<T> prevList;

// TODO: Test if adding padding helps under contention
//private long pad0, pad1, pad2, pad3, pad4, pad5, pad6, pad7;

PoolChunkList(PoolArena<T> arena, PoolChunkList<T> nextList, int minUsage, int maxUsage, int chunkSize) {
    assert minUsage <= maxUsage;
    this.arena = arena;
    this.nextList = nextList;
    this.minUsage = minUsage;
    this.maxUsage = maxUsage;
    // 计算 maxUsage 属性
    maxCapacity = calculateMaxCapacity(minUsage, chunkSize);
}
```

- `arena` 属性，所属 PoolArena 对象。

- `prevList` + `nextList` 属性，上一个和下一个 PoolChunkList 对象。也就是说，PoolChunkList 除了**自身**有一条双向链表外，PoolChunkList 和 PoolChunkList **之间**也形成了一条双向链表。如下图所示：

  > FROM [《深入浅出Netty内存管理 PoolChunkList》](https://www.jianshu.com/p/a1debfe4ff02)
  >
  > [![双向链表](http://static.iocoder.cn/images/Netty/2018_09_10/01.png)](http://static.iocoder.cn/images/Netty/2018_09_10/01.png)双向链表

- `head` 属性，PoolChunkList **自身**的双向链表的**头节点**。

- ```
  minUsage
  ```

   

  +

   

  ```
  maxUsage
  ```

   

  属性，PoolChunkList 管理的 Chunk 们的内存使用率。

  - 当 Chunk 分配的内存率超过 `maxUsage` 时，从当前 PoolChunkList 节点移除，添加到下一个 PoolChunkList 节点( `nextList` )。TODO 详细解析。
  - 当 Chunk 分配的内存率小于 `minUsage` 时，从当前 PoolChunkList 节点移除，添加到上一个 PoolChunkList 节点( `prevList` )。TODO 详细解析。

- `maxCapacity` 属性，每个 Chunk 最大可分配的容量。通过 `#calculateMaxCapacity(int minUsage, int chunkSize)` 方法，来计算。代码如下：

  ```
  /**
   * Calculates the maximum capacity of a buffer that will ever be possible to allocate out of the {@link PoolChunk}s
   * that belong to the {@link PoolChunkList} with the given {@code minUsage} and {@code maxUsage} settings.
   */
  private static int calculateMaxCapacity(int minUsage, int chunkSize) {
      // 计算 minUsage 值
      minUsage = minUsage0(minUsage);
  
      if (minUsage == 100) {
          // If the minUsage is 100 we can not allocate anything out of this list.
          return 0;
      }
  
      // Calculate the maximum amount of bytes that can be allocated from a PoolChunk in this PoolChunkList.
      //
      // As an example:
      // - If a PoolChunkList has minUsage == 25 we are allowed to allocate at most 75% of the chunkSize because
      //   this is the maximum amount available in any PoolChunk in this PoolChunkList.
      return  (int) (chunkSize * (100L - minUsage) / 100L);
  }
  
  // 保证最小 >= 1
  private static int minUsage0(int value) {
      return max(1, value);
  }
  ```

  - 为什么使用 `(int) (chunkSize * (100L - minUsage) / 100L)` 来计算呢？因为 Chunk 进入当前 PoolChunkList 节点，意味着 Chunk 内存已经分配了 `minUsage` 比率，所以 Chunk 剩余的容量是 `chunkSize * (100L - minUsage) / 100L` 。😈 是不是豁然开朗噢？！

## 2.2 allocate

> 随着 Chunk 中 Page 的不断分配和释放，会导致很多碎片内存段，大大增加了之后分配一段连续内存的失败率。针对这种情况，可以把内存使用率较大的 Chunk 放到PoolChunkList 链表更后面。

`#allocate(PooledByteBuf<T> buf, int reqCapacity, int normCapacity)` 方法，给 PooledByteBuf 对象分配内存块，并返回是否分配内存块成功。代码如下：

```
 1: boolean allocate(PooledByteBuf<T> buf, int reqCapacity, int normCapacity) {
 2:     // 双向链表中无 Chunk
 3:     // 申请分配的内存超过 ChunkList 的每个 Chunk 最大可分配的容量
 4:     if (head == null || normCapacity > maxCapacity) {
 5:         // Either this PoolChunkList is empty or the requested capacity is larger then the capacity which can
 6:         // be handled by the PoolChunks that are contained in this PoolChunkList.
 7:         return false;
 8:     }
 9: 
10:     // 遍历双向链表。注意，遍历的是 ChunkList 的内部双向链表。
11:     for (PoolChunk<T> cur = head;;) {
12:         // 分配内存块
13:         long handle = cur.allocate(normCapacity);
14:         // 分配失败
15:         if (handle < 0) {
16:             // 进入下一节点
17:             cur = cur.next;
18:             // 若下一个节点不存在，返回 false ，结束循环
19:             if (cur == null) {
20:                 return false; // 分配失败
21:             }
22:         // 分配成功
23:         } else {
24:             // 初始化内存块到 PooledByteBuf 对象中
25:             cur.initBuf(buf, handle, reqCapacity);
26:             // 超过当前 ChunkList 管理的 Chunk 的内存使用率上限
27:             if (cur.usage() >= maxUsage) {
28:                 // 从当前 ChunkList 节点移除
29:                 remove(cur);
30:                 // 添加到下一个 ChunkList 节点
31:                 nextList.add(cur); 
32:             }
33:             return true; // 分配成功
34:         }
35:     }
36: }
```

- 第 2 至 8 行：双向链表中无 Chunk，或者申请分配的内存超过 ChunkList 的每个 Chunk 最大可分配的容量，返回 `false` ，分配失败。

- 第 11 行：遍历双向链表。**注意，遍历的是 ChunkList 的内部双向链表**。

- 第 13 行：调用 `PoolChunk#allocate(normCapacity)` 方法，分配内存块。这块，可以结合 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（二）PoolChunk》「2.2 allocate」](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk) 在复习下。

- 第 15 至 17 行：分配失败，进入下一个节点。

  - 第 18 至 21 行：若下一个节点不存在，返回 `false` ，分配失败。

- 第 22 至 25 行：分配成功，调用

   

  ```
  PooledByteBuf##initBuf(PooledByteBuf<T> buf, long handle, int reqCapacity)
  ```

   

  方法，初始化分配的内存块到 PooledByteBuf 中。这块，可以结合

   

  《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（二）PoolChunk》「2.5 initBuf」

   

  在复习下。

  - 第 26 至 32 行：超过当前 ChunkList 管理的 Chunk 的内存使用率上限，从当前 ChunkList 节点移除，并添加到“

    下

    ”一个 ChunkList 节点。

    - 第 29 行：调用 `#remove(PoolChunk<T> cur)` 方法，解析见 [「2.4.2 remove」](http://svip.iocoder.cn/Netty/ByteBuf-3-4-Jemalloc-chunkList/#) 。
    - 第 31 行：调用 `#remove(PoolChunk<T> cur)` 方法，解析见 [「2.4.1 add」](http://svip.iocoder.cn/Netty/ByteBuf-3-4-Jemalloc-chunkList/#) 。

  - 第 33 行：返回 `true` ，分配成功。

## 2.3 free

`#free(PoolChunk<T> chunk, long handle)` 方法，释放 PoolChunk 的指定位置( `handle` )的内存块。代码如下：

```
 1: boolean free(PoolChunk<T> chunk, long handle) {
 2:     // 释放 PoolChunk 的指定位置( handle )的内存块
 3:     chunk.free(handle);
 4:     // 小于当前 ChunkList 管理的 Chunk 的内存使用率下限
 5:     if (chunk.usage() < minUsage) {
 6:         // 从当前 ChunkList 节点移除
 7:         remove(chunk);
 8:         // 添加到上一个 ChunkList 节点
 9:         // Move the PoolChunk down the PoolChunkList linked-list.
10:         return move0(chunk);
11:     }
12:     // 释放成功
13:     return true;
14: }
```

- 第 3 行：调用 `PoolChunk#free(long handle)` 方法，释放指定位置的内存块。这块，可以结合 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（二）PoolChunk》「2.3 free」](http://svip.iocoder.cn/Netty/ByteBuf-3-2-Jemalloc-chunk) 在复习下。
- 第 5 行：小于当前 ChunkList 管理的 Chunk 的内存使用率下限：
  - 第 7 行：调用 `#remove(PoolChunk<T> cur)` 方法，从当前 ChunkList 节点移除。
  - 第 10 行：调用 `#move(PoolChunk<T> chunk)` 方法， 添加到“上”一个 ChunkList 节点。详细解析，见 [「2.4.3 move」](http://svip.iocoder.cn/Netty/ByteBuf-3-4-Jemalloc-chunkList/#) 。
- 第 13 行：返回 `true` ，释放成功。

## 2.4 双向链表操作

### 2.4.1 add

`#add(PoolChunk<T> chunk)` 方法，将 PoolChunk 添加到 ChunkList 节点中。代码如下：

```
1: void add(PoolChunk<T> chunk) {
2:     // 超过当前 ChunkList 管理的 Chunk 的内存使用率上限，继续递归到下一个 ChunkList 节点进行添加。
3:     if (chunk.usage() >= maxUsage) {
4:         nextList.add(chunk);
5:         return;
6:     }
7:     // 执行真正的添加
8:     add0(chunk);
9: }
```

- 第 2 至 6 行：超过当前 ChunkList 管理的 Chunk 的内存使用率上限，调用 `nextList` 的 `#add(PoolChunk<T> chunk)` 方法，继续递归到下一个 ChunkList 节点进行添加。

- 第 8 行：调用 `#add0(PoolChunk<T> chunk)` 方法，执行真正的添加。代码如下：

  ```
  /**
   * Adds the {@link PoolChunk} to this {@link PoolChunkList}.
   */
  void add0(PoolChunk<T> chunk) {
      chunk.parent = this;
      // <1> 无头节点，自己成为头节点
      if (head == null) {
          head = chunk;
          chunk.prev = null;
          chunk.next = null;
      // <2> 有头节点，自己成为头节点，原头节点成为自己的下一个节点
      } else {
          chunk.prev = null;
          chunk.next = head;
          head.prev = chunk;
          head = chunk;
      }
  }
  ```

  - `<1>` 处，比较好理解，胖友自己看。
  - `<2>` 处，因为 `chunk` **新**进入下一个 ChunkList 节点，一般来说，内存使用率相对较低，分配内存块成功率相对较高，所以变成新的首节点。

### 2.4.2 remove

`#remove(PoolChunk<T> chunk)` 方法，从当前 ChunkList 节点移除。代码如下：

```
private void remove(PoolChunk<T> cur) {
    // 当前节点为首节点，将下一个节点设置为头节点
    if (cur == head) {
        head = cur.next;
        if (head != null) {
            head.prev = null;
        }
    // 当前节点非首节点，将节点的上一个节点指向节点的下一个节点
    } else {
        PoolChunk<T> next = cur.next;
        cur.prev.next = next;
        if (next != null) {
            next.prev = cur.prev;
        }
    }
}
```

- 代码比较简单，胖友自己研究。

### 2.4.3 move

`#move(PoolChunk<T> chunk)` 方法， 添加到“上”一个 ChunkList 节点。代码如下：

```
   /**
    * Moves the {@link PoolChunk} down the {@link PoolChunkList} linked-list so it will end up in the right
    * {@link PoolChunkList} that has the correct minUsage / maxUsage in respect to {@link PoolChunk#usage()}.
    */
 1: private boolean move(PoolChunk<T> chunk) {
 2:     assert chunk.usage() < maxUsage;
 3: 
 4:     // 小于当前 ChunkList 管理的 Chunk 的内存使用率下限，继续递归到上一个 ChunkList 节点进行添加。
 5:     if (chunk.usage() < minUsage) {
 6:         // Move the PoolChunk down the PoolChunkList linked-list.
 7:         return move0(chunk);
 8:     }
 9: 
10:     // 执行真正的添加
11:     // PoolChunk fits into this PoolChunkList, adding it here.
12:     add0(chunk);
13:     return true;
14: }
```

- 第 4 至 8 行：小于当前 ChunkList 管理的 Chunk 的内存使用率下限，调用 `#move0(PoolChunk<T> chunk)` 方法，继续递归到上一个 ChunkList 节点进行添加。代码如下：

  ```
  private boolean move(PoolChunk<T> chunk) {
      assert chunk.usage() < maxUsage;
  
      // 小于当前 ChunkList 管理的 Chunk 的内存使用率下限，继续递归到上一个 ChunkList 节点进行添加。
      if (chunk.usage() < minUsage) {
          // Move the PoolChunk down the PoolChunkList linked-list.
          return move0(chunk);
      }
  
      // 执行真正的添加
      // PoolChunk fits into this PoolChunkList, adding it here.
      add0(chunk);
      return true;
  }
  ```

- 第 12 行：调用 `#add0(PoolChunk<T> chunk)` 方法，执行真正的添加。
- 第 13 行：返回 `true` ，移动成功。

## 2.5 iterator

`#iterator()` 方法，创建 Iterator 对象。代码如下：

```
private static final Iterator<PoolChunkMetric> EMPTY_METRICS = Collections.<PoolChunkMetric>emptyList().iterator();

@Override
public Iterator<PoolChunkMetric> iterator() {
    synchronized (arena) {
        // 空，返回 EMPTY_METRICS
        if (head == null) {
            return EMPTY_METRICS;
        }
        // 生成数组，后生成 Iterator
        List<PoolChunkMetric> metrics = new ArrayList<PoolChunkMetric>();
        for (PoolChunk<T> cur = head;;) {
            metrics.add(cur);
            cur = cur.next;
            if (cur == null) {
                break;
            }
        }
        return metrics.iterator();
    }
}
```

## 2.6 destroy

`#destroy()` 方法，销毁。代码如下：

```
void destroy(PoolArena<T> arena) {
    // 循环，销毁 ChunkList 管理的所有 Chunk
    PoolChunk<T> chunk = head;
    while (chunk != null) {
        arena.destroyChunk(chunk);
        chunk = chunk.next;
    }
    // 置空
    head = null;
}
```

## 2.7 PoolChunkListMetric

`io.netty.buffer.PoolChunkListMetric` ，继承 Iterable 接口，PoolChunkList Metric 接口。代码如下：

```
public interface PoolChunkListMetric extends Iterable<PoolChunkMetric> {

    /**
     * Return the minimum usage of the chunk list before which chunks are promoted to the previous list.
     */
    int minUsage();

    /**
     * Return the maximum usage of the chunk list after which chunks are promoted to the next list.
     */
    int maxUsage();
}
```

------

PoolChunkList 对 PoolChunkMetric 接口的实现，代码如下：

```
@Override
public int minUsage() {
    return minUsage0(minUsage);
}

@Override
public int maxUsage() {
    return min(maxUsage, 100);
}
```

# 3. PoolChunkList 初始化

在 PoolChunkArena 中，初始化 PoolChunkList 代码如下：

```
// PoolChunkList 之间的双向链表

private final PoolChunkList<T> q050;
private final PoolChunkList<T> q025;
private final PoolChunkList<T> q000;
private final PoolChunkList<T> qInit;
private final PoolChunkList<T> q075;
private final PoolChunkList<T> q100;

/**
 * PoolChunkListMetric 数组
 */
private final List<PoolChunkListMetric> chunkListMetrics;

  1: protected PoolArena(PooledByteBufAllocator parent, int pageSize,
  2:       int maxOrder, int pageShifts, int chunkSize, int cacheAlignment) {
  3:       
  4:     // ... 省略其它无关代码
  5:       
  6:     // PoolChunkList 之间的双向链表，初始化
  7: 
  8:     q100 = new PoolChunkList<T>(this, null, 100, Integer.MAX_VALUE, chunkSize);
  9:     q075 = new PoolChunkList<T>(this, q100, 75, 100, chunkSize);
 10:     q050 = new PoolChunkList<T>(this, q075, 50, 100, chunkSize);
 11:     q025 = new PoolChunkList<T>(this, q050, 25, 75, chunkSize);
 12:     q000 = new PoolChunkList<T>(this, q025, 1, 50, chunkSize);
 13:     qInit = new PoolChunkList<T>(this, q000, Integer.MIN_VALUE, 25, chunkSize);
 14:     
 15:     q100.prevList(q075);
 16:     q075.prevList(q050);
 17:     q050.prevList(q025);
 18:     q025.prevList(q000);
 19:     q000.prevList(null); // 无前置节点
 20:     qInit.prevList(qInit); // 前置节点为自己
 21:     
 22:     // 创建 PoolChunkListMetric 数组
 23:     List<PoolChunkListMetric> metrics = new ArrayList<PoolChunkListMetric>(6);
 24:     metrics.add(qInit);
 25:     metrics.add(q000);
 26:     metrics.add(q025);
 27:     metrics.add(q050);
 28:     metrics.add(q075);
 29:     metrics.add(q100);
 30:     chunkListMetrics = Collections.unmodifiableList(metrics);
 31: }
```

- PoolChunkList 之间的双向链表有 `qInit`、`q000`、`q025`、`q050`、`q075`、`q100` 有 6 个节点，在【第 6 至 20 行】的代码，进行**初始化**。链表如下：

  ```
  // 正向
  qInit -> q000 -> q025 -> q050 -> q075 -> q100 -> null
  
  // 逆向
  null <- q000 <- q025 <- q050 <- q075 <- q100
  qInit <- qInit
  ```

  - 比较神奇的是，

    ```
    qInit
    ```

     

    指向自己？！

    ```
    qInit
    ```

     

    用途是，新创建的 Chunk 内存块

     

    ```
    chunk_new
    ```

    ( 这只是个代号，方便描述 ) ，添加到

     

    ```
    qInit
    ```

     

    后，不会被释放掉。

    - 为什么不会被释放掉？`qInit.minUsage = Integer.MIN_VALUE` ，所以在 `PoolChunkList#move(PoolChunk chunk)` 方法中，`chunk_new` 的内存使用率最小值为 0 ，所以肯定不会被释放。
    - 那岂不是 `chunk_new` 无法被释放？随着 `chunk_new` 逐渐分配内存，内存使用率到达 25 ( `qInit.maxUsage` )后，会移动到 `q000` 。再随着 `chunk_new` 逐渐释放内存，内存使用率降到 0 (`q000.minUsage`) 后，就可以被释放。

  - 当然，如果新创建的 Chunk 内存块 `chunk_new` **第一次**分配的内存使用率超过 25 ( `qInit.maxUsage` )，不会进入 `qInit` 中，而是进入后面的 PoolChunkList 节点。

- `chunkListMetrics` 属性，PoolChunkListMetric 数组。在【第 22 至 30 行】的代码，进行**初始化**。

# 666. 彩蛋

PoolChunList 相比 PoolSubpage 来说，又又又更加简单啦。

老艿艿整理了下 Arena、ChunkList、Chunk、Page、Subpage 的“操纵”关系如下图：

[![PoolSubpage](http://static.iocoder.cn/images/Netty/2018_09_10/02.png)](http://static.iocoder.cn/images/Netty/2018_09_10/02.png)PoolSubpage

- 当然，这不是一幅严谨的图，仅仅表达“操纵”的关系。

参考如下文章：

- Hypercube [《自顶向下深入分析Netty（十）–PoolChunkList》](https://www.jianshu.com/p/2b8375df2d1a)
- 占小狼 [《深入浅出Netty内存管理 PoolChunkList》](https://www.jianshu.com/p/4856bd30dd56)

- 

# Buffer 之 Jemalloc（六）PoolThreadCache

# 1. 概述

在 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（五）PoolArena》](http://svip.iocoder.cn/Netty/ByteBuf-3-5-Jemalloc-Arena) 一文中，我们看到 PoolArena 在分配( `#allocate(...)` )和释放( `#free(...)` )内存的过程中，无可避免会出现 `synchronized` 的身影。虽然锁的粒度不是很大，但是如果一个 PoolArena 如果被**多个**线程引用，带来的线程锁的同步和竞争。并且，如果在锁竞争的过程中，申请 Direct ByteBuffer ，那么带来的线程等待就可能是**几百毫秒**的时间。

那么该如何解决呢？如下图红框所示：

> FROM [《jemalloc源码解析-内存管理》](http://brionas.github.io/2015/01/31/jemalloc源码解析-内存管理/)
>
> [![大体结构](http://static.iocoder.cn/images/Netty/2018_09_16/01.png)](http://static.iocoder.cn/images/Netty/2018_09_16/01.png)大体结构

给**每个**线程引入其**独有**的 tcache 线程缓存。

- 在释放已分配的内存块时，不放回到 Chunk 中，而是缓存到 tcache 中。
- 在分配内存块时，优先从 tcache 获取。无法获取到，再从 Chunk 中分配。

通过这样的方式，尽可能的避免多线程的同步和竞争。

# 2. PoolThreadCache

`io.netty.buffer.PoolThreadCache` ，Netty 对 Jemalloc tcache 的实现类，内存分配的线程缓存。

## 2.1 构造方法

```
/**
 * 对应的 Heap PoolArena 对象
 */
final PoolArena<byte[]> heapArena;
/**
 * 对应的 Direct PoolArena 对象
 */
final PoolArena<ByteBuffer> directArena;

// Hold the caches for the different size classes, which are tiny, small and normal.
/**
 * Heap 类型的 tiny Subpage 内存块缓存数组
 */
private final MemoryRegionCache<byte[]>[] tinySubPageHeapCaches;
/**
 * Heap 类型的 small Subpage 内存块缓存数组
 */
private final MemoryRegionCache<byte[]>[] smallSubPageHeapCaches;
/**
 * Heap 类型的 normal 内存块缓存数组
 */
private final MemoryRegionCache<byte[]>[] normalHeapCaches;
/**
 * Direct 类型的 tiny Subpage 内存块缓存数组
 */
private final MemoryRegionCache<ByteBuffer>[] tinySubPageDirectCaches;
/**
 * Direct 类型的 small Subpage 内存块缓存数组
 */
private final MemoryRegionCache<ByteBuffer>[] smallSubPageDirectCaches;
/**
 * Direct 类型的 normal 内存块缓存数组
 */
private final MemoryRegionCache<ByteBuffer>[] normalDirectCaches;

// Used for bitshifting when calculate the index of normal caches later
/**
 * 用于计算请求分配的 normal 类型的内存块，在 {@link #normalDirectCaches} 数组中的位置
 *
 * 默认为 log2(pageSize) = log2(8192) = 13
 */
private final int numShiftsNormalDirect;
/**
 * 用于计算请求分配的 normal 类型的内存块，在 {@link #normalHeapCaches} 数组中的位置
 *
 * 默认为 log2(pageSize) = log2(8192) = 13
 */
private final int numShiftsNormalHeap;

/**
 * 分配次数
 */
private int allocations;
/**
 * {@link #allocations} 到达该阀值，释放缓存
 *  
 * 默认为 8192 次
 * 
 * @see #free()
 */
private final int freeSweepAllocationThreshold;

  1: PoolThreadCache(PoolArena<byte[]> heapArena, PoolArena<ByteBuffer> directArena,
  2:                 int tinyCacheSize, int smallCacheSize, int normalCacheSize,
  3:                 int maxCachedBufferCapacity, int freeSweepAllocationThreshold) {
  4:     if (maxCachedBufferCapacity < 0) {
  5:         throw new IllegalArgumentException("maxCachedBufferCapacity: "
  6:                 + maxCachedBufferCapacity + " (expected: >= 0)");
  7:     }
  8:     this.freeSweepAllocationThreshold = freeSweepAllocationThreshold;
  9:     this.heapArena = heapArena;
 10:     this.directArena = directArena;
 11: 
 12:     // 初始化 Direct 类型的内存块缓存
 13:     if (directArena != null) {
 14:         // 创建 tinySubPageDirectCaches
 15:         tinySubPageDirectCaches = createSubPageCaches(tinyCacheSize, PoolArena.numTinySubpagePools, SizeClass.Tiny);
 16:         // 创建 smallSubPageDirectCaches
 17:         smallSubPageDirectCaches = createSubPageCaches(smallCacheSize, directArena.numSmallSubpagePools, SizeClass.Small);
 18: 
 19:         // 计算 numShiftsNormalDirect
 20:         numShiftsNormalDirect = log2(directArena.pageSize);
 21:         // 创建 normalDirectCaches
 22:         normalDirectCaches = createNormalCaches(normalCacheSize, maxCachedBufferCapacity, directArena);
 23: 
 24:         // 增加 directArena 的线程引用计数
 25:         directArena.numThreadCaches.getAndIncrement();
 26:     } else {
 27:         // No directArea is configured so just null out all caches
 28:         tinySubPageDirectCaches = null;
 29:         smallSubPageDirectCaches = null;
 30:         normalDirectCaches = null;
 31:         numShiftsNormalDirect = -1;
 32:     }
 33:     // 初始化 Heap 类型的内存块缓存。同上面部分。
 34:     if (heapArena != null) {
 35:         // Create the caches for the heap allocations
 36:         tinySubPageHeapCaches = createSubPageCaches(tinyCacheSize, PoolArena.numTinySubpagePools, SizeClass.Tiny);
 37:         smallSubPageHeapCaches = createSubPageCaches(smallCacheSize, heapArena.numSmallSubpagePools, SizeClass.Small);
 38: 
 39:         numShiftsNormalHeap = log2(heapArena.pageSize);
 40:         normalHeapCaches = createNormalCaches(normalCacheSize, maxCachedBufferCapacity, heapArena);
 41: 
 42:         heapArena.numThreadCaches.getAndIncrement();
 43:     } else {
 44:         // No heapArea is configured so just null out all caches
 45:         tinySubPageHeapCaches = null;
 46:         smallSubPageHeapCaches = null;
 47:         normalHeapCaches = null;
 48:         numShiftsNormalHeap = -1;
 49:     }
 50: 
 51:     // 校验参数，保证 PoolThreadCache 可缓存内存块。
 52:     // Only check if there are caches in use.
 53:     if ((tinySubPageDirectCaches != null || smallSubPageDirectCaches != null || normalDirectCaches != null
 54:             || tinySubPageHeapCaches != null || smallSubPageHeapCaches != null || normalHeapCaches != null)
 55:             && freeSweepAllocationThreshold < 1) {
 56:         throw new IllegalArgumentException("freeSweepAllocationThreshold: " + freeSweepAllocationThreshold + " (expected: > 0)");
 57:     }
 58: }
```

- 虽然代码比较多，主要分为 Heap 和 Direct 两种内存。

- Direct 相关

  - `directArena` 属性，对应的 Heap PoolArena 对象。

  - ```
    tinySubPageDirectCaches
    ```

     

    属性，Direct 类型的 tiny Subpage 内存块缓存数组。

    - 默认情况下，数组大小为 512 。
    - 在【第 15 行】的代码，调用 `#createSubPageCaches(int cacheSize, int numCaches, SizeClass sizeClass)` 方法，创建 MemoryRegionCache 数组。详细解析，见 [「2.2 createSubPageCaches」](http://svip.iocoder.cn/Netty/ByteBuf-3-6-Jemalloc-ThreadCache/#) 。

  - ```
    smallSubPageDirectCaches
    ```

     

    属性，Direct 类型的 small Subpage 内存块缓存数组。

    - 默认情况下，数组大小为 256 。
    - 在【第 17 行】的代码，调用 `#createSubPageCaches(int cacheSize, int numCaches, SizeClass sizeClass)` 方法，创建 MemoryRegionCache 数组。详细解析，见 [「2.2 createSubPageCaches」](http://svip.iocoder.cn/Netty/ByteBuf-3-6-Jemalloc-ThreadCache/#) 。

  - ```
    normalDirectCaches
    ```

     

    属性，Direct 类型的 normal Page 内存块缓存数组。

    - 默认情况下，数组大小为 64 。

    - 在【第 22 行】的代码，调用 `#createNormalCaches(int cacheSize, int maxCachedBufferCapacity, PoolArena<T> area)` 方法，创建 MemoryRegionCache 数组。详细解析，见 [「2.3 createNormalCaches」](http://svip.iocoder.cn/Netty/ByteBuf-3-6-Jemalloc-ThreadCache/#) 。

    - ```
      numShiftsNormalDirect
      ```

       

      属性，用于计算请求分配的 normal 类型的内存块，在

       

      ```
      normalDirectCaches
      ```

       

      数组中的位置。

      - 默认情况下，数值为 13 。
      - 在【第 20 行】的代码，调用 `#log2(int pageSize)` 方法， `log2(pageSize) = log2(8192) = 13` 。

  - 在【第 25 行】的代码，增加 `directArena` 的线程引用计数。通过这样的方式，我们能够知道，一个 PoolArena 对象，被多少线程所引用。

- Heap 相关，和【Direct 相关】基本**类似**。

- ```
  allocations
  ```

   

  属性，分配次数计数器。每次分配时，该计数器 + 1 。

  - `freeSweepAllocationThreshold` 属性，当 `allocations` 到达该阀值时，调用 `#free()` 方法，释放缓存。同时，会重置 `allocations` 计数器为 0 。

## 2.2 createSubPageCaches

`#createSubPageCaches(int cacheSize, int numCaches, SizeClass sizeClass)` 方法，创建 Subpage 内存块缓存数组。代码如下：

```
// tiny 类型，默认 cacheSize = PooledByteBufAllocator.DEFAULT_TINY_CACHE_SIZE = 512 , numCaches = PoolArena.numTinySubpagePools = 512 >>> 4 = 32
// small 类型，默认 cacheSize = PooledByteBufAllocator.DEFAULT_SMALL_CACHE_SIZE = 256 , numCaches = pageSize - 9 = 13 - 9 = 4
private static <T> MemoryRegionCache<T>[] createSubPageCaches(int cacheSize, int numCaches, SizeClass sizeClass) {
    if (cacheSize > 0 && numCaches > 0) {
        @SuppressWarnings("unchecked")
        MemoryRegionCache<T>[] cache = new MemoryRegionCache[numCaches];
        for (int i = 0; i < cache.length; i++) {
            // TODO: maybe use cacheSize / cache.length
            cache[i] = new SubPageMemoryRegionCache<T>(cacheSize, sizeClass);
        }
        return cache;
    } else {
        return null;
    }
}
```

- 创建的 Subpage 内存块缓存数组，实际和

   

  ```
  PoolArena.tinySubpagePools
  ```

   

  和

   

  ```
  PoolArena.smallSubpagePools
  ```

   

  数组

  大小保持一致

  。从而实现，相同大小的内存，能对应相同的数组下标。

  - `sizeClass` = `tiny` 时， 默认 `cacheSize` = `PooledByteBufAllocator.DEFAULT_TINY_CACHE_SIZE = 512` , `numCaches` = `PoolArena.numTinySubpagePools = 512 >>> 4 = 32` 。
  - `sizeClass` = `small` 时，默认 `cacheSize` = `PooledByteBufAllocator.DEFAULT_SMALL_CACHE_SIZE = 256` , `numCaches` = `pageSize - 9 = 13 - 9 = 4` 。

- 创建的数组，每个元素的类型为 SubPageMemoryRegionCache 。详细解析，见 [「3.X.1 SubPageMemoryRegionCache」](http://svip.iocoder.cn/Netty/ByteBuf-3-6-Jemalloc-ThreadCache/#) 。

## 2.3 createNormalCaches

`#createSubPageCaches(int cacheSize, int numCaches, SizeClass sizeClass)` 方法，创建 Normal Page 内存块缓存数组。代码如下：

```
 // normal 类型，默认 cacheSize = PooledByteBufAllocator.DEFAULT_NORMAL_CACHE_SIZE = 64 , maxCachedBufferCapacity = PoolArena.DEFAULT_MAX_CACHED_BUFFER_CAPACITY = 32 * 1024 = 32KB
private static <T> MemoryRegionCache<T>[] createNormalCaches(int cacheSize, int maxCachedBufferCapacity, PoolArena<T> area) {
    if (cacheSize > 0 && maxCachedBufferCapacity > 0) {
        // <1> 计算数组大小
        int max = Math.min(area.chunkSize, maxCachedBufferCapacity);
        int arraySize = Math.max(1, log2(max / area.pageSize) + 1);

        @SuppressWarnings("unchecked")
        MemoryRegionCache<T>[] cache = new MemoryRegionCache[arraySize];
        for (int i = 0; i < cache.length; i++) {
            cache[i] = new NormalMemoryRegionCache<T>(cacheSize);
        }
        return cache;
    } else {
        return null;
    }
}
```

- `maxCachedBufferCapacity` 属性，缓存的 Normal 内存块的最大容量，避免过大的 Normal 内存块被缓存，占用过多通过。默认情况下，`maxCachedBufferCapacity = PoolArena.DEFAULT_MAX_CACHED_BUFFER_CAPACITY = 32 * 1024 = 32KB` 。也就说，在 `<1>` 处，`arraySize` 的计算**数组大小**的结果为 3 。刚好是 `cache[0] = 8KB`、`cache[1] = 16KB`、`cache[2] = 32KB` 。那么，如果申请的 Normal 内存块大小为 `64KB` ，超过了数组大小，所以无法被缓存。😈 是不是和原先自己认为的 `maxCachedBufferCapacity` 实现最大容量的想法，有点不同。
- 创建的数组，每个元素的类型为 SubPageMemoryRegionCache 。详细解析，见 [「3.X.2 NormalMemoryRegionCache」](http://svip.iocoder.cn/Netty/ByteBuf-3-6-Jemalloc-ThreadCache/#) 。

## 2.4 cache

```
private MemoryRegionCache<?> cacheForTiny(PoolArena<?> area, int normCapacity) {
    // 获得数组下标
    int idx = PoolArena.tinyIdx(normCapacity);
    if (area.isDirect()) {
        return cache(tinySubPageDirectCaches, idx);
    }
    return cache(tinySubPageHeapCaches, idx);
}

private MemoryRegionCache<?> cacheForSmall(PoolArena<?> area, int normCapacity) {
    // 获得数组下标
    int idx = PoolArena.smallIdx(normCapacity);
    if (area.isDirect()) {
        return cache(smallSubPageDirectCaches, idx);
    }
    return cache(smallSubPageHeapCaches, idx);
}

private MemoryRegionCache<?> cacheForNormal(PoolArena<?> area, int normCapacity) {
    if (area.isDirect()) {
        // 获得数组下标
        int idx = log2(normCapacity >> numShiftsNormalDirect);
        return cache(normalDirectCaches, idx);
    }
    // 获得数组下标
    int idx = log2(normCapacity >> numShiftsNormalHeap);
    return cache(normalHeapCaches, idx);
}
```

- 三个方法，分别获取内存容量对应所在的 MemoryRegionCache 对象。通过调用 `#cache(MemoryRegionCache<T>[] cache, int idx)` 方法，代码如下：

  ```
  private static <T> MemoryRegionCache<T> cache(MemoryRegionCache<T>[] cache, int idx) {
      // 不在范围内，说明不缓存该容量的内存块
      if (cache == null || idx > cache.length - 1) {
          return null;
      }
      // 获得 MemoryRegionCache 对象
      return cache[idx];
  }
  ```

------

当然，考虑到使用便利，封装了 `#cache(PoolArena<?> area, int normCapacity, SizeClass sizeClass)` 方法，支持获取对应内存类型的 MemoryRegionCache 对象。代码如下：

```
private MemoryRegionCache<?> cache(PoolArena<?> area, int normCapacity, SizeClass sizeClass) {
    switch (sizeClass) {
    case Normal:
        return cacheForNormal(area, normCapacity);
    case Small:
        return cacheForSmall(area, normCapacity);
    case Tiny:
        return cacheForTiny(area, normCapacity);
    default:
        throw new Error();
    }
}
```

## 2.5 add

`#add(PoolArena<?> area, PoolChunk chunk, long handle, int normCapacity, SizeClass sizeClass)` 方法，添加内存块到 PoolThreadCache 的指定 MemoryRegionCache 的队列中，进行缓存。并且，返回是否添加成功。代码如下：

```
/**
 * Add {@link PoolChunk} and {@code handle} to the cache if there is enough room.
 * Returns {@code true} if it fit into the cache {@code false} otherwise.
 */
@SuppressWarnings({ "unchecked", "rawtypes" })
boolean add(PoolArena<?> area, PoolChunk chunk, long handle, int normCapacity, SizeClass sizeClass) {
    // 获得对应的 MemoryRegionCache 对象
    MemoryRegionCache<?> cache = cache(area, normCapacity, sizeClass);
    if (cache == null) {
        return false;
    }
    // 添加到 MemoryRegionCache 内存块中
    return cache.add(chunk, handle);
}
```

- 代码比较简单，胖友自己看注释。
- 在 `PoolArea#free(PoolChunk<T> chunk, long handle, int normCapacity, PoolThreadCache cache)` 中，调用该方法。所以，可以结合 [《精尽 Netty 源码解析 —— Buffer 之 Jemalloc（五）PoolArena》](http://svip.iocoder.cn/Netty/ByteBuf-3-5-Jemalloc-Arena) 的 [「2.6 free」](http://svip.iocoder.cn/Netty/ByteBuf-3-6-Jemalloc-ThreadCache/#) 一起看看罗。

## 2.6 allocate

```
/**
 * Try to allocate a tiny buffer out of the cache. Returns {@code true} if successful {@code false} otherwise
 */
boolean allocateTiny(PoolArena<?> area, PooledByteBuf<?> buf, int reqCapacity, int normCapacity) {
    return allocate(cacheForTiny(area, normCapacity), buf, reqCapacity);
}

/**
 * Try to allocate a small buffer out of the cache. Returns {@code true} if successful {@code false} otherwise
 */
boolean allocateSmall(PoolArena<?> area, PooledByteBuf<?> buf, int reqCapacity, int normCapacity) {
    return allocate(cacheForSmall(area, normCapacity), buf, reqCapacity);
}

/**
 * Try to allocate a small buffer out of the cache. Returns {@code true} if successful {@code false} otherwise
 */
boolean allocateNormal(PoolArena<?> area, PooledByteBuf<?> buf, int reqCapacity, int normCapacity) {
    return allocate(cacheForNormal(area, normCapacity), buf, reqCapacity);
}
```

- 三个方法，从缓存中分别获取不同容量大小的内存块，初始化到 PooledByteBuf 对象中。通过调用 `#allocate(MemoryRegionCache<?> cache, PooledByteBuf buf, int reqCapacity)` 方法，代码如下：

  ```
   1: private boolean allocate(MemoryRegionCache<?> cache, PooledByteBuf buf, int reqCapacity) {
   2:     if (cache == null) {
   3:         // no cache found so just return false here
   4:         return false;
   5:     }
   6:     // 分配内存块，并初始化到 MemoryRegionCache 中
   7:     boolean allocated = cache.allocate(buf, reqCapacity);
   8:     // 到达阀值，整理缓存
   9:     if (++ allocations >= freeSweepAllocationThreshold) {
  10:         allocations = 0;
  11:         trim();
  12:     }
  13:     // 返回是否分配成功
  14:     return allocated;
  15: }
  ```

  - 第 7 行：调用 `MemoryRegionCache#allocate(buf, reqCapacity)` 方法，从缓存中分配内存块，并初始化到 MemoryRegionCache 中。
  - 第 8 至 12 行：增加 `allocations` 计数。若到达阀值( `freeSweepAllocationThreshold` )，重置计数，并调用 `#trim()` 方法，整理缓存。详细解析，见 [「2.7 trim」](http://svip.iocoder.cn/Netty/ByteBuf-3-6-Jemalloc-ThreadCache/#) 。
  - 第 14 行：返回是否分配成功。如果从缓存中分配失败，后续就从 PoolArena 中获取内存块。

## 2.7 free

`#trim()` 方法，整理缓存，释放使用**频度**较少的内存块缓存。代码如下：

```
private static int free(MemoryRegionCache<?> cache) {
    if (cache == null) {
        return 0;
    }
    return cache.free();
}

void trim() {
    trim(tinySubPageDirectCaches);
    trim(smallSubPageDirectCaches);
    trim(normalDirectCaches);
    trim(tinySubPageHeapCaches);
    trim(smallSubPageHeapCaches);
    trim(normalHeapCaches);
}

private static void trim(MemoryRegionCache<?>[] caches) {
    if (caches == null) {
        return;
    }
    for (MemoryRegionCache<?> c: caches) {
        trim(c);
    }
}

private static void trim(MemoryRegionCache<?> cache) {
    if (cache == null) {
        return;
    }
    cache.trim();
}
```

- 会调用所有 MemoryRegionCache 的 `#trim()` 方法，整理每个内存块缓存。详细解析，见 [「3.6 trim」](http://svip.iocoder.cn/Netty/ByteBuf-3-6-Jemalloc-ThreadCache/#) 。

## 2.8 finalize

`#finalize()` 方法，对象销毁时，清空缓存等等。代码如下：

```
/// TODO: In the future when we move to Java9+ we should use java.lang.ref.Cleaner.
@Override
protected void finalize() throws Throwable {
    try {
        // <1> 调用父 finalize
        super.finalize();
    } finally {
        // 清空缓存
        free();
    }
}

/**
 *  Should be called if the Thread that uses this cache is about to exist to release resources out of the cache
 */
void free() {
    // <2> 清空缓存
    int numFreed = free(tinySubPageDirectCaches) +
            free(smallSubPageDirectCaches) +
            free(normalDirectCaches) +
            free(tinySubPageHeapCaches) +
            free(smallSubPageHeapCaches) +
            free(normalHeapCaches);

    if (numFreed > 0 && logger.isDebugEnabled()) {
        logger.debug("Freed {} thread-local buffer(s) from thread: {}", numFreed, Thread.currentThread().getName());
    }

    // <3.1> 减小 directArena 的线程引用计数
    if (directArena != null) {
        directArena.numThreadCaches.getAndDecrement();
    }

    // <3.2> 减小 heapArena 的线程引用计数
    if (heapArena != null) {
        heapArena.numThreadCaches.getAndDecrement();
    }
}

private static int free(MemoryRegionCache<?>[] caches) {
    if (caches == null) {
        return 0;
    }

    int numFreed = 0;
    for (MemoryRegionCache<?> c: caches) {
        numFreed += free(c);
    }
    return numFreed;
}
```

- 代码比较简单，胖友自己看。主要是 `<1>`、`<2>`、`<3.1>/<3.2>` 三个点。

# 3. MemoryRegionCache

MemoryRegionCache ，是 PoolThreadCache 的内部静态类，**内存块缓存**。在其内部，有一个**队列**，存储缓存的内存块。如下图所示：[![MemoryRegionCache](http://static.iocoder.cn/images/Netty/2018_09_16/02.png)](http://static.iocoder.cn/images/Netty/2018_09_16/02.png)MemoryRegionCache

## 3.1 构造方法

```
private abstract static class MemoryRegionCache<T> {

    /**
     * {@link #queue} 队列大小
     */
    private final int size;
    /**
     * 队列。里面存储内存块
     */
    private final Queue<Entry<T>> queue;
    /**
     * 内存类型
     */
    private final SizeClass sizeClass;
    /**
     * 分配次数计数器
     */
    private int allocations;

    MemoryRegionCache(int size, SizeClass sizeClass) {
        this.size = MathUtil.safeFindNextPositivePowerOfTwo(size);
        queue = PlatformDependent.newFixedMpscQueue(this.size); // <1> MPSC
        this.sizeClass = sizeClass;
    }
    
    // ... 省略其它方法
}
```

- `sizeClass` 属性，内存类型。

- `queue` 属性，队列，里面存储内存块。每个元素为 Entry 对象，对应一个内存块。代码如下：

  ```
  static final class Entry<T> {
  
      /**
       * Recycler 处理器，用于回收 Entry 对象
       */
      final Handle<Entry<?>> recyclerHandle;
      /**
       * PoolChunk 对象
       */
      PoolChunk<T> chunk;
      /**
       * 内存块在 {@link #chunk} 的位置
       */
      long handle = -1;
  
      Entry(Handle<Entry<?>> recyclerHandle) {
          this.recyclerHandle = recyclerHandle;
      }
  
      void recycle() {
          // 置空
          chunk = null;
          handle = -1;
          // 回收 Entry 对象
          recyclerHandle.recycle(this);
      }
  }
  ```

  - 通过 `chunk` 和 `handle` 属性，可以唯一确认一个内存块。
  - `recyclerHandle` 属性，用于回收 Entry 对象，用于 `#recycle()` 方法中。

- `size` 属性，队列大小。

- `allocations` 属性，分配次数计数器。

- 在

   

  ```
  <1>
  ```

   

  处理，我们可以看到创建的

   

  ```
  queue
  ```

   

  属性，类型为 MPSC( Multiple Producer Single Consumer ) 队列，即

  多个

  生产者

  单一

  消费者。为什么使用 MPSC 队列呢?

  - 多个生产者，指的是多个线程，移除( 释放 )内存块出队列。
  - 单个消费者，指的是单个线程，添加( 缓存 )内存块到队列。

## 3.2 newEntry

`#newEntry(PoolChunk<?> chunk, long handle)` 方法，创建 Entry 对象。代码如下：

```
@SuppressWarnings("rawtypes")
private static Entry newEntry(PoolChunk<?> chunk, long handle) {
    // 从 Recycler 对象中，获得 Entry 对象
    Entry entry = RECYCLER.get();
    // 初始化属性
    entry.chunk = chunk;
    entry.handle = handle;
    return entry;
}

@SuppressWarnings("rawtypes")
private static final Recycler<Entry> RECYCLER = new Recycler<Entry>() {

    @SuppressWarnings("unchecked")
    @Override
    protected Entry newObject(Handle<Entry> handle) {
        return new Entry(handle); // 创建 Entry 对象
    }

};
```

## 3.3 add

`#add(PoolChunk<T> chunk, long handle)` 方法，添加( 缓存 )内存块到队列，并返回是否添加成功。代码如下：

```
/**
 * Add to cache if not already full.
 */
@SuppressWarnings("unchecked")
public final boolean add(PoolChunk<T> chunk, long handle) {
    // 创建 Entry 对象
    Entry<T> entry = newEntry(chunk, handle);
    // 添加到队列
    boolean queued = queue.offer(entry);
    // 若添加失败，说明队列已满，回收 Entry 对象
    if (!queued) {
        // If it was not possible to cache the chunk, immediately recycle the entry
        entry.recycle();
    }

    return queued; // 是否添加成功
}
```

## 3.4 allocate

`#allocate(PooledByteBuf<T> buf, int reqCapacity)` 方法，从队列中获取缓存的内存块，初始化到 PooledByteBuf 对象中，并返回是否分配成功。代码如下：

```
/**
 * Allocate something out of the cache if possible and remove the entry from the cache.
 */
public final boolean allocate(PooledByteBuf<T> buf, int reqCapacity) {
    // 获取并移除队列首个 Entry 对象
    Entry<T> entry = queue.poll();
    // 获取失败，返回 false
    if (entry == null) {
        return false;
    }
    // <1> 初始化内存块到 PooledByteBuf 对象中 
    initBuf(entry.chunk, entry.handle, buf, reqCapacity);
    // 回收 Entry 对象
    entry.recycle();

    // 增加 allocations 计数。因为分配总是在相同线程，所以不需要考虑线程安全的问题
    // allocations is not thread-safe which is fine as this is only called from the same thread all time.
    ++ allocations;
    return true; // 返回 true ，分配成功
}
```

- 代码比较简单，胖友自己看注释。

- 在 `<1>` 处，调用 `#initBuf(PoolChunk<T> chunk, long handle, PooledByteBuf<T> buf, int reqCapacity)` **抽象**方法，初始化内存块到 PooledByteBuf 对象中。代码如下：

  ```
  /**
   * Init the {@link PooledByteBuf} using the provided chunk and handle with the capacity restrictions.
   */
  protected abstract void initBuf(PoolChunk<T> chunk, long handle, PooledByteBuf<T> buf, int reqCapacity);
  ```

  - 该**抽象**方法需要子类 SubPageMemoryRegionCache 和 NormalMemoryRegionCache 来实现。并且，这也是 MemoryRegionCache 的**唯一**的抽象方法。

## 3.5 free

`#free(...)` 方法，清除队列。代码如下：

```
/**
 * 清除队列中的全部
 *
 * Clear out this cache and free up all previous cached {@link PoolChunk}s and {@code handle}s.
 */
public final int free() {
    return free(Integer.MAX_VALUE);
}

// 清除队列中的指定数量元素
private int free(int max) {
    int numFreed = 0;
    for (; numFreed < max; numFreed++) {
        // 获取并移除首元素
        Entry<T> entry = queue.poll();
        if (entry != null) {
            // 释放缓存的内存块回 Chunk 中
            freeEntry(entry); <1>
        } else {
            // all cleared
            return numFreed;
        }
    }
    return numFreed;
}
```

- 代码比较简单，胖友自己看注释。

- `<1>` 处， 释放缓存的内存块回 Chunk 中。代码如下：

  ```
  private  void freeEntry(Entry entry) {
      PoolChunk chunk = entry.chunk;
      long handle = entry.handle;
  
      // 回收 Entry 对象
      // recycle now so PoolChunk can be GC'ed.
      entry.recycle();
  
      // 释放缓存的内存块回 Chunk 中
      chunk.arena.freeChunk(chunk, handle, sizeClass);
  }
  ```

## 3.6 trim

这块当时没太看懂，后来读了 [《自顶向下深入分析Netty（十）–PoolThreadCache》](https://www.jianshu.com/p/9177b7dabd37) 文章后，看懂了 `#trim()` 方法。引用如下：

> 在分配过程还有一个`trim()`方法，当分配操作达到一定阈值（Netty默认8192）时，没有被分配出去的缓存空间都要被释放，以防止内存泄漏，核心代码如下：

```
// 内部类MemoryRegionCache
public final void trim() {
    // allocations 表示已经重新分配出去的ByteBuf个数
    int free = size - allocations;  
    allocations = 0;

    // 在一定阈值内还没被分配出去的空间将被释放
    if (free > 0) {
        free(free); // 释放队列中的节点
    }
}
```

> 也就是说，期望一个 MemoryRegionCache **频繁**进行回收-分配，这样 `allocations` > `size` ，将不会释放队列中的任何一个节点表示的内存空间；
>
> 但如果长时间没有分配，则应该释放这一部分空间，防止内存占据过多。Tiny请求缓存512 个节点，由此可知当使用率超过 `512 / 8192 = 6.25%` 时就不会释放节点。

## 3.X1 SubPageMemoryRegionCache

SubPageMemoryRegionCache ，是 PoolThreadCache 的内部静态类，继承 MemoryRegionCache 抽象类，**Subpage** MemoryRegionCache 实现类。代码如下：

```
/**
 * Cache used for buffers which are backed by TINY or SMALL size.
 */
private static final class SubPageMemoryRegionCache<T> extends MemoryRegionCache<T> {

    SubPageMemoryRegionCache(int size, SizeClass sizeClass) {
        super(size, sizeClass);
    }

    @Override
    protected void initBuf(PoolChunk<T> chunk, long handle, PooledByteBuf<T> buf, int reqCapacity) {
        // 初始化 Subpage 内存块到 PooledByteBuf 对象中
        chunk.initBufWithSubpage(buf, handle, reqCapacity);
    }

}
```

## 3.X2 NormalMemoryRegionCache

NormalMemoryRegionCache ，是 PoolThreadCache 的内部静态类，继承 MemoryRegionCache 抽象类，**Page** MemoryRegionCache 实现类。代码如下：

```
/**
 * Cache used for buffers which are backed by NORMAL size.
 */
private static final class NormalMemoryRegionCache<T> extends MemoryRegionCache<T> {

    NormalMemoryRegionCache(int size) {
        super(size, SizeClass.Normal);
    }

    @Override
    protected void initBuf(PoolChunk<T> chunk, long handle, PooledByteBuf<T> buf, int reqCapacity) {
        // 初始化 Page 内存块到 PooledByteBuf 对象中
        chunk.initBuf(buf, handle, reqCapacity);
    }

}
```

# 666. 彩蛋

嘿嘿，比想象中简单蛮多的一篇文章。

推荐阅读文章：

- Hypercube [《自顶向下深入分析Netty（十）–PoolThreadCache》](https://www.jianshu.com/p/9177b7dabd37)