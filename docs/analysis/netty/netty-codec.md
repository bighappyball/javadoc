# Codec 之 ByteToMessageDecoder（一）Cumulator

# 1. 概述

在 [《精尽 Netty 源码解析 —— ChannelHandler（一）之简介》](http://svip.iocoder.cn/Netty/ChannelHandler-1-intro) 中，我们看了 ChannelHandler 的核心类图，如下：[![核心类图](http://static.iocoder.cn/images/Netty/2018_10_01/01.png)](http://static.iocoder.cn/images/Netty/2018_10_01/01.png)核心类图

- **绿框**部分，我们可以看到，Netty 基于 ChannelHandler 实现了读写的数据( 消息 )的编解码。

  > Codec( 编解码 ) = Encode( 编码 ) + Decode( 解码 )。

- 图中有五个和 Codec 相关的类，整理如下：

  - 😈 ，实际应该是六个，漏画了 MessageToMessageDecoder 类。

  - ByteToMessageCodec ，ByteToMessageDecoder + MessageByteEncoder 的

    组合

    。

    - ByteToMessageDecoder ，将字节**解码**成消息。
    - MessageByteEncoder ，将消息**编码**成字节。

  - MessageToMessageCodec ，MessageToMessageDecoder + MessageToMessageEncoder 的

    组合

    。

    - MessageToMessageDecoder ，将消息**解码**成另一种消息。
    - MessageToMessageEncoder ，将消息**编码**成另一种消息。

------

而本文，我们来分享 ByteToMessageDecoder 部分的内容。

# 2. ByteToMessageDecoder 核心类图

[![核心类图](http://static.iocoder.cn/images/Netty/2018_12_01/01.png)](http://static.iocoder.cn/images/Netty/2018_12_01/01.png)核心类图

ByteToMessageDecoder 本身是个**抽象**类，其下有多个子类，笔者简单整理成三类，可能不全哈：

- **绿框**部分 FrameDecoder ：消息帧( Frame )解码器。也就是说该类解码器，用于处理 TCP 的**粘包**现象，将网络发送的字节流解码为具有确定含义的消息帧。之后的解码器再将消息帧解码为实际的 POJO 对象。 如下图所示：[decode](http://static.iocoder.cn/images/Netty/2018_12_01/02.png)

- 黄框

  部分，将字节流使用

  指定序列化方式

  反序列化成

  消息

  ，例如：XML、JSON 等等。

  - 对于该类解码器，不处理 TCP 的**粘包**现象，所以需要搭配 FrameDecoder 一起使用。

- 蓝框

  部分，将字节流

  解压

  ，主要涉及相关压缩算法，例如：GZip、BZip 等等。

  - 对于该类解码器，不处理 TCP 的**粘包**现象，所以需要搭配 FrameDecoder 一起使用。

# 3. 为什么要粘包拆包

😈 因为有些朋友不了解粘包和拆包的概念和原理，这里引用笔者的基友【闪电侠】在 [《netty 源码分析之拆包器的奥秘》](https://www.jianshu.com/p/dc26e944da95) 对这块的描述。

## 3.1 为什么要粘包

> 首先你得了解一下 TCP/IP 协议，在用户数据量非常小的情况下，极端情况下，一个字节，该 TCP 数据包的有效载荷非常低，传递 100 字节的数据，需要 100 次TCP传送， 100 次ACK，在应用及时性要求不高的情况下，将这 100 个有效数据拼接成一个数据包，那会缩短到一个TCP数据包，以及一个 ack ，有效载荷提高了，带宽也节省了。
>
> 非极端情况，有可能**两个**数据包拼接成一个数据包，也有可能**一个半**的数据包拼接成一个数据包，也有可能**两个半**的数据包拼接成一个数据包。

## 3.2 为什么要拆包

> 拆包和粘包是相对的，一端粘了包，另外一端就需要将粘过的包拆开。举个栗子，发送端将三个数据包粘成两个TCP数据包发送到接收端，接收端就需要根据应用协议将两个数据包重新组装成三个数据包。
>
> 还有一种情况就是用户数据包超过了 mss(最大报文长度)，那么这个数据包在发送的时候必须拆分成几个数据包，接收端收到之后需要将这些数据包粘合起来之后，再拆开。

## 3.3 拆包的原理

> 数据，每次读取完都需要判断是否是一个完整的数据包：
>
> 1. 如果当前读取的数据不足以拼接成一个完整的业务数据包，那就保留该数据，继续从tcp缓冲区中读取，直到得到一个完整的数据包。
> 2. 如果当前读到的数据加上已经读取的数据足够拼接成一个数据包，那就将已经读取的数据拼接上本次读取的数据，够成一个完整的业务数据包传递到业务逻辑，多余的数据仍然保留，以便和下次读到的数据尝试拼接。

# 4. Cumulator

Cumulator ，是 ByteToMessageDecoder 的**内部**接口。中文翻译为“累加器”，用于将读取到的数据进行累加到一起，然后再尝试**解码**，从而实现**拆包**。

也是因为 Cumulator 的累加，所以能将不完整的包累加到一起，从而完整。当然，累加的过程，没准又进入了一个不完整的包。所以，这是一个不断累加，不断解码拆包的过程。

------

Cumulator 接口，代码如下：

```
/**
 * ByteBuf 累积器接口
 *
 * Cumulate {@link ByteBuf}s.
 */
public interface Cumulator {

    /**
     * Cumulate the given {@link ByteBuf}s and return the {@link ByteBuf} that holds the cumulated bytes.
     * The implementation is responsible to correctly handle the life-cycle of the given {@link ByteBuf}s and so
     * call {@link ByteBuf#release()} if a {@link ByteBuf} is fully consumed.
     *
     * @param alloc ByteBuf 分配器
     * @param cumulation ByteBuf 当前累积结果
     * @param in 当前读取( 输入 ) ByteBuf
     * @return ByteBuf 新的累积结果
     */
    ByteBuf cumulate(ByteBufAllocator alloc, ByteBuf cumulation, ByteBuf in);

}
```

- 对于 `Cumulator#cumulate(ByteBufAllocator alloc, ByteBuf cumulation, ByteBuf in)` 方法，将**原有** `cumulation` 累加上**新的** `in` ，返回“新”的 ByteBuf 对象。
- 如果 `in` 过大，超过 `cumulation` 的空间上限，使用 `alloc` 进行扩容后再累加。

------

Cumulator 有两个实现类，代码如下：

```
public static final Cumulator MERGE_CUMULATOR = new Cumulator() {
    // ... 省略代码
}

public static final Cumulator COMPOSITE_CUMULATOR = new Cumulator() {
    // ... 省略代码
}
```

两者的累加方式不同，我们来详细解析。

## 4.1 MERGE_CUMULATOR

`MERGE_CUMULATOR` 思路是，不断使用**老的** ByteBuf 累积。如果空间不够，扩容出**新的** ByteBuf ，再继续进行累积。代码如下：

```
// ByteToMessageDecoder.java

    /**
     * Cumulate {@link ByteBuf}s by merge them into one {@link ByteBuf}'s, using memory copies.
     */
  1: public static final Cumulator MERGE_CUMULATOR = new Cumulator() {
  2: 
  3:     @Override
  4:     public ByteBuf cumulate(ByteBufAllocator alloc, ByteBuf cumulation, ByteBuf in) {
  5:         final ByteBuf buffer;
  6:         if (cumulation.writerIndex() > cumulation.maxCapacity() - in.readableBytes() // 超过空间大小，需要扩容
  7:                 || cumulation.refCnt() > 1 // 引用大于 1 ，说明用户使用了 slice().retain() 或 duplicate().retain() 使refCnt增加并且大于 1 ，
  8:                                            // 此时扩容返回一个新的累积区ByteBuf，方便用户对老的累积区ByteBuf进行后续处理。
  9:                 || cumulation.isReadOnly()) { // 只读，不可累加，所以需要改成可写
 10:             // Expand cumulation (by replace it) when either there is not more room in the buffer
 11:             // or if the refCnt is greater then 1 which may happen when the user use slice().retain() or
 12:             // duplicate().retain() or if its read-only.
 13:             //
 14:             // See:
 15:             // - https://github.com/netty/netty/issues/2327
 16:             // - https://github.com/netty/netty/issues/1764
 17:             // 扩容，返回新的 buffer
 18:             buffer = expandCumulation(alloc, cumulation, in.readableBytes());
 19:         } else {
 20:             // 使用老的 buffer
 21:             buffer = cumulation;
 22:         }
 23:         // 写入 in 到 buffer 中
 24:         buffer.writeBytes(in);
 25:         // 释放输入 in
 26:         in.release();
 27:         // 返回 buffer
 28:         return buffer;
 29:     }
 30: 
 31: };
```

- 获取 `buffer` 对象。

  - 第 6 至 9 行：如下三个条件，满足任意，需要进行扩容。

    - ① 第 6 行：

      ```
      cumulation.writerIndex() > cumulation.maxCapacity() - in.readableBytes()
      ```

       

      ，超过空间大小，需要扩容。

      - 这个比较好理解。

    - ② 第 7 行：

      ```
      cumulation.refCnt() > 1
      ```

       

      ，引用大于 1 ，说明用户使用了

       

      ```
      ByteBuf#slice()#retain()
      ```

       

      或

       

      ```
      ByteBuf#duplicate()#retain()
      ```

       

      方法，使

       

      ```
      refCnt
      ```

       

      增加并且大于 1 。

      - 关于这块，在【第 11 行】的英文注释，也相应的提到。

    - ③ 第 9 行：只读，不可累加，所以需要改成可写。

      - 这个比较好理解。

  - 【需要扩容】第 18 行：调用 `ByteToMessageDecoder#expandCumulation(ByteBufAllocator alloc, ByteBuf cumulation, int readable)` **静态**方法，扩容，并返回新的，并赋值给 `buffer` 。代码如下：

    ```
    static ByteBuf expandCumulation(ByteBufAllocator alloc, ByteBuf cumulation, int readable) {
        // 记录老的 ByteBuf 对象
        ByteBuf oldCumulation = cumulation;
        // 分配新的 ByteBuf 对象
        cumulation = alloc.buffer(oldCumulation.readableBytes() + readable);
        // 将老的数据，写入到新的 ByteBuf 对象
        cumulation.writeBytes(oldCumulation);
        // 释放老的 ByteBuf 对象
        oldCumulation.release();
        // 返回新的 ByteBuf 对象
        return cumulation;
    }
    ```

    - 标准的扩容，并复制老数据的过程。胖友自己看下注释噢。

  - 【无需扩容】第 21 行：`buffer` 直接使用的 `cumulation` 对象。

- 第 24 行：写入

   

  ```
  in
  ```

   

  到

   

  ```
  buffer
  ```

   

  中，进行累积。

  - 第 26 行：释放 `in` 。

- 第 28 行：返回 `buffer` 。

## 4.2 COMPOSITE_CUMULATOR

`COMPOSITE_CUMULATOR` 思路是，使用 CompositeByteBuf ，组合新输入的 ByteBuf 对象，从而避免内存拷贝。代码如下：

```
// ByteToMessageDecoder.java

    /**
     * Cumulate {@link ByteBuf}s by add them to a {@link CompositeByteBuf} and so do no memory copy whenever possible.
     * Be aware that {@link CompositeByteBuf} use a more complex indexing implementation so depending on your use-case
     * and the decoder implementation this may be slower then just use the {@link #MERGE_CUMULATOR}.
     *
     * 相比 MERGE_CUMULATOR 来说：
     *
     * 好处是，内存零拷贝
     * 坏处是，因为维护复杂索引，所以某些使用场景下，慢于 MERGE_CUMULATOR
     */
  1: public static final Cumulator COMPOSITE_CUMULATOR = new Cumulator() {
  2: 
  3:     @Override
  4:     public ByteBuf cumulate(ByteBufAllocator alloc, ByteBuf cumulation, ByteBuf in) {
  5:         ByteBuf buffer;
  6:         // 和 MERGE_CUMULATOR 的情况类似
  7:         if (cumulation.refCnt() > 1) {
  8:             // Expand cumulation (by replace it) when the refCnt is greater then 1 which may happen when the user
  9:             // use slice().retain() or duplicate().retain().
 10:             //
 11:             // See:
 12:             // - https://github.com/netty/netty/issues/2327
 13:             // - https://github.com/netty/netty/issues/1764
 14:             buffer = expandCumulation(alloc, cumulation, in.readableBytes());
 15:             buffer.writeBytes(in);
 16:             in.release();
 17:         } else {
 18:             CompositeByteBuf composite;
 19:             // 原来是 CompositeByteBuf 类型，直接使用
 20:             if (cumulation instanceof CompositeByteBuf) {
 21:                 composite = (CompositeByteBuf) cumulation;
 22:             // 原来不是 CompositeByteBuf 类型，创建，并添加到其中
 23:             } else {
 24:                 composite = alloc.compositeBuffer(Integer.MAX_VALUE);
 25:                 composite.addComponent(true, cumulation);
 26:             }
 27:             // 添加 in 到 composite 中
 28:             composite.addComponent(true, in);
 29:             // 赋值给 buffer
 30:             buffer = composite;
 31:         }
 32:         // 返回 buffer
 33:         return buffer;
 34:     }
 35: 
 36: };
```

- 第 7 至 16 行：`cumulation.refCnt() > 1` 成立，和 `MERGE_CUMULATOR` 的情况一致，创建一个新的 ByteBuf 对象。这样，再下一次 `#cumulate(...)` 时，就会走【第 22 至 26 行】的情况。

- 获得

   

  ```
  composite
  ```

   

  对象

  - 第 19 至 21 行：如果原来**就是** CompositeByteBuf 类型，直接使用。
  - 第 22 至 26 行：如果原来**不是** CompositeByteBuf 类型，创建 CompositeByteBuf 对象，并添加 `cumulation` 到其中。

- 第 28 行：添加 `in` 到 `composite` 中，避免内存拷贝。

## 4.3 对比

关于 `MERGE_CUMULATOR` 和 `COMPOSITE_CUMULATOR` 的对比，已经写在 `COMPOSITE_CUMULATOR` 的**头上**的注释。

默认情况下，ByteToMessageDecoder 使用 `MERGE_CUMULATOR` 作为累加器。

# 5. ByteToMessageDecoder

`io.netty.handler.codec.ByteToMessageDecoder` ，继承 ChannelInboundHandlerAdapter 类，**抽象基类**，负责将 Byte 解码成 Message 。

> 老艿艿：ByteToMessageDecoder 的细节比较多，建议胖友理解如下小节即可：
>
> - [5.1 构造方法](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#)
> - [5.2 channelRead](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#)
> - [5.3 callDecode](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#)
> - [5.4 channelReadComplete](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#)

## 5.1 构造方法

```
private static final byte STATE_INIT = 0;
private static final byte STATE_CALLING_CHILD_DECODE = 1;
private static final byte STATE_HANDLER_REMOVED_PENDING = 2;

/**
 * 已累积的 ByteBuf 对象
 */
ByteBuf cumulation;
/**
 * 累计器
 */
private Cumulator cumulator = MERGE_CUMULATOR;
/**
 * 是否每次只解码一条消息，默认为 false 。
 *
 * 部分解码器为 true ，例如：Socks4ClientDecoder
 *
 * @see #callDecode(ChannelHandlerContext, ByteBuf, List)
 */
private boolean singleDecode;
/**
 * 是否解码到消息。
 *
 * WasNull ，说明就是没解码到消息
 *
 * @see #channelReadComplete(ChannelHandlerContext)
 */
private boolean decodeWasNull;
/**
 * 是否首次读取，即 {@link #cumulation} 为空
 */
private boolean first;
/**
 * A bitmask where the bits are defined as
 * <ul>
 *     <li>{@link #STATE_INIT}</li>
 *     <li>{@link #STATE_CALLING_CHILD_DECODE}</li>
 *     <li>{@link #STATE_HANDLER_REMOVED_PENDING}</li>
 * </ul>
 *
 * 解码状态
 *
 * 0 - 初始化
 * 1 - 调用 {@link #decode(ChannelHandlerContext, ByteBuf, List)} 方法中，正在进行解码
 * 2 - 准备移除
 */
private byte decodeState = STATE_INIT;
/**
 * 读取释放阀值
 */
private int discardAfterReads = 16;
/**
 * 已读取次数。
 *
 * 再读取 {@link #discardAfterReads} 次数据后，如果无法全部解码完，则进行释放，避免 OOM
 */
private int numReads;

protected ByteToMessageDecoder() {
    // 校验，不可共享
    ensureNotSharable();
}
```

属性比较简单，胖友自己看注释。

## 5.2 channelRead

`#channelRead(ChannelHandlerContext ctx, Object msg)` 方法，读取到新的数据，进行解码。代码如下：

```
 1: @Override
 2: public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
 3:     if (msg instanceof ByteBuf) {
 4:         // 创建 CodecOutputList 对象
 5:         CodecOutputList out = CodecOutputList.newInstance();
 6:         try {
 7:             ByteBuf data = (ByteBuf) msg;
 8:             // 判断是否首次
 9:             first = cumulation == null;
10:             // 若首次，直接使用读取的 data
11:             if (first) {
12:                 cumulation = data;
13:             // 若非首次，将读取的 data ，累积到 cumulation 中
14:             } else {
15:                 cumulation = cumulator.cumulate(ctx.alloc(), cumulation, data);
16:             }
17:             // 执行解码
18:             callDecode(ctx, cumulation, out);
19:         } catch (DecoderException e) {
20:             throw e; // 抛出异常
21:         } catch (Exception e) {
22:             throw new DecoderException(e); // 封装成 DecoderException 异常，抛出
23:         } finally {
24:             // cumulation 中所有数据被读取完，直接释放全部
25:             if (cumulation != null && !cumulation.isReadable()) {
26:                 numReads = 0; // 重置 numReads 次数
27:                 cumulation.release(); // 释放 cumulation
28:                 cumulation = null; // 置空 cumulation
29:             // 读取次数到达 discardAfterReads 上限，释放部分的已读
30:             } else if (++ numReads >= discardAfterReads) {
31:                 // We did enough reads already try to discard some bytes so we not risk to see a OOME.
32:                 // See https://github.com/netty/netty/issues/4275
33:                 numReads = 0; // 重置 numReads 次数
34:                 discardSomeReadBytes(); // 释放部分的已读
35:             }
36: 
37:             // 解码消息的数量
38:             int size = out.size();
39:             // 是否解码到消息
40:             decodeWasNull = !out.insertSinceRecycled();
41: 
42:             // 触发 Channel Read 事件。可能是多条消息
43:             fireChannelRead(ctx, out, size);
44: 
45:             // 回收 CodecOutputList 对象
46:             out.recycle();
47:         }
48:     } else {
49:         // 触发 Channel Read 事件到下一个节点
50:         ctx.fireChannelRead(msg);
51:     }
52: }
```

- 第 48 至 51 行：消息的类型**不是** ByteBuf 类，直接触发 Channel Read 事件到下一个节点。也就说，不进行解码。

- 第 3 行：消息的类型**是** ByteBuf 类，开始解码。

- 第 5 行：创建 CodecOutputList 对象。CodecOutputList 的简化代码如下：

  ```
  /**
   * Special {@link AbstractList} implementation which is used within our codec base classes.
   */
  final class CodecOutputList extends AbstractList<Object> implements RandomAccess {
  
      // ... 省略代码
  }
  ```

  - 如下内容，引用自 [《自顶向下深入分析Netty（八）–CodecHandler》](https://www.jianshu.com/p/7c439cc7b01c)

    > 解码结果列表 CodecOutputList 是 Netty 定制的一个特殊列表，该列表在线程中被缓存，可循环使用来存储解码结果，减少不必要的列表实例创建，从而提升性能。由于解码结果需要频繁存储，普通的 ArrayList 难以满足该需求，故定制化了一个特殊列表，由此可见 Netty 对优化的极致追求。

  - 第 7 至 9 行：通过

     

    ```
    cumulation
    ```

     

    是否为

     

    ```
    null
    ```

     

    来判断，是否为首次

     

    ```
    first
    ```

     

    。

    - 若**是**首次，直接使用读取的 `data` ( `ByteBuf data = (ByteBuf) msg` )。
    - 若**非**首次，将读取的 `data` ，累积到 `cumulation` 中。在 [「4. Cumulator」](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#) 中，我们已经详细解析。

- 第 18 行：调用 `#callDecode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法，执行解码。而解码的结果，会添加到 `out` 数组中。详细解析，见 [「5.3 callDecode」](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#) 。

- 第 19 至 22 行：若发生异常，抛出 DecoderException 异常。

- 第 24 至 35 行：根据 `cumulation` 的情况，释放 `cumulation` 。

  - 第 24 至 28 行：`cumulation` 中所有数据被读取完，直接**释放全部**。

  - 第 29 至 35 行：读取次数( `numReads` )到达 `discardAfterReads` 上限，重置计数，并调用 `#discardSomeReadBytes()` 方法，释放部分的已读。😈 如果一直不去释放，等到满足【第 24 至 28 行】的条件，很有可能会出现 OOM 的情况。代码如下：

    ```
    protected final void discardSomeReadBytes() {
        if (cumulation != null && !first
                && cumulation.refCnt() == 1) { // <1> 如果用户使用了 slice().retain() 和 duplicate().retain() 使 refCnt > 1 ，表明该累积区还在被用户使用，丢弃数据可能导致用户的困惑，所以须确定用户不再使用该累积区的已读数据，此时才丢弃。
            // discard some bytes if possible to make more room in the
            // buffer but only if the refCnt == 1  as otherwise the user may have
            // used slice().retain() or duplicate().retain().
            //
            // See:
            // - https://github.com/netty/netty/issues/2327
            // - https://github.com/netty/netty/issues/1764
            // <2> 释放部分
            cumulation.discardSomeReadBytes();
        }
    }
    ```

    - `<1>` 处，原因见中文注释。
    - `<2>` 处，释放**部分**已读字节区。注意，是“部分”，而不是“全部”，避免一次性释放全部，时间过长。并且，能够读取到这么“大”，往往字节数容量不小。如果直接释放掉“全部”，那么后续还需要再重复扩容，反倒不好。

- 第 38 行：获得解码消息的数量。

  - 第 40 行：是否解码到消息。为什么不直接使用

     

    ```
    size
    ```

     

    来判断呢？因为如果添加了消息，然后又移除该消息，此时

     

    ```
    size
    ```

     

    为 0 ，但是

     

    ```
    !out.insertSinceRecycled()
    ```

     

    为

     

    ```
    true
    ```

     

    。

    - 另外，我们在 [「5.3 callDecode」](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#) 中，将会看到一个 `out` 的清理操作，到时会更加明白。

- 第 43 行：调用 `#fireChannelRead(ChannelHandlerContext ctx, List<Object> msgs, int numElements)` **静态**方法，触发 Channel Read 事件。可能是多条消息。代码如下：

  ```
  /**
   * Get {@code numElements} out of the {@link List} and forward these through the pipeline.
   */
  static void fireChannelRead(ChannelHandlerContext ctx, List<Object> msgs, int numElements) {
      if (msgs instanceof CodecOutputList) { // 如果是 CodecOutputList 类型，特殊优化
          fireChannelRead(ctx, (CodecOutputList) msgs, numElements);
      } else {
          for (int i = 0; i < numElements; i++) {
              ctx.fireChannelRead(msgs.get(i));
          }
      }
  }
  
  /**
   * Get {@code numElements} out of the {@link CodecOutputList} and forward these through the pipeline.
   */
  static void fireChannelRead(ChannelHandlerContext ctx, CodecOutputList msgs, int numElements) {
      for (int i = 0; i < numElements; i ++) {
          ctx.fireChannelRead(msgs.getUnsafe(i)); // getUnsafe 是自定义的方法，减少越界判断，效率更高
      }
  }
  ```

  - 遍历 `msgs` 数组，每条消息触发一次 Channel Read 事件。

- 第 46 行：回收 CodecOutputList 对象。

## 5.3 callDecode

`#callDecode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法，执行解码。而解码的结果，会添加到 `out` 数组中。代码如下：

```
 1: protected void callDecode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
 2:     try {
 3:         // 循环读取，直到不可读
 4:         while (in.isReadable()) {
 5:             // 记录
 6:             int outSize = out.size();
 7:             // out 非空，说明上一次解码有解码到消息
 8:             if (outSize > 0) {
 9:                 // 触发 Channel Read 事件。可能是多条消息
10:                 fireChannelRead(ctx, out, outSize);
11:                 // 清空
12:                 out.clear();
13: 
14:                 // 用户主动删除该 Handler ，继续操作 in 是不安全的
15:                 // Check if this handler was removed before continuing with decoding.
16:                 // If it was removed, it is not safe to continue to operate on the buffer.
17:                 //
18:                 // See:
19:                 // - https://github.com/netty/netty/issues/4635
20:                 if (ctx.isRemoved()) {
21:                     break;
22:                 }
23:                 outSize = 0;
24:             }
25: 
26:             // 记录当前可读字节数
27:             int oldInputLength = in.readableBytes();
28: 
29:             // 执行解码。如果 Handler 准备移除，在解码完成后，进行移除。
30:             decodeRemovalReentryProtection(ctx, in, out);
31: 
32:             // 用户主动删除该 Handler ，继续操作 in 是不安全的
33:             // Check if this handler was removed before continuing the loop.
34:             // If it was removed, it is not safe to continue to operate on the buffer.
35:             //
36:             // See https://github.com/netty/netty/issues/1664
37:             if (ctx.isRemoved()) {
38:                 break;
39:             }
40: 
41:             // 整列判断 `out.size() == 0` 比较合适。因为，如果 `outSize > 0` 那段，已经清理了 out 。
42:             if (outSize == out.size()) {
43:                 // 如果未读取任何字节，结束循环
44:                 if (oldInputLength == in.readableBytes()) {
45:                     break;
46:                 // 如果可读字节发生变化，继续读取
47:                 } else {
48:                     continue;
49:                 }
50:             }
51: 
52:             // 如果解码了消息，但是可读字节数未变，抛出 DecoderException 异常。说明，有问题。
53:             if (oldInputLength == in.readableBytes()) {
54:                 throw new DecoderException(StringUtil.simpleClassName(getClass()) + ".decode() did not read anything but decoded a message.");
55:             }
56: 
57:             // 如果开启 singleDecode ，表示只解析一次，结束循环
58:             if (isSingleDecode()) {
59:                 break;
60:             }
61:         }
62:     } catch (DecoderException e) {
63:         throw e;
64:     } catch (Exception cause) {
65:         throw new DecoderException(cause);
66:     }
67: }
```

- 第 4 行：循环读取 `in` ，直到不可读。

- 第 5 行：记录

   

  ```
  out
  ```

   

  的大小。

  - 第 8 行：如果 `out` 非空，说明上一次解码有解码到消息。
  - 第 10 行：调用 `#fireChannelRead(ChannelHandlerContext ctx, List<Object> msgs, int numElements)` **静态**方法，触发 Channel Read 事件。可能是多条消息。😈 关于该方法，上文已经详细解析。
  - 第 12 行：清空 `out` 。所以，有可能会出现 `#channelRead(ChannelHandlerContext ctx, Object msg)` 方法的【第 40 行】的情况。
  - 第 14 至 22 行：用户主动删除该 Handler ，继续操作 `in` 是不安全的，所以结束循环。
  - 第 23 行：记录 `out` 的大小为**零**。所以，实际上，`outSize` 没有必要记录。因为，一定是为**零**。

- 第 27 行：记录当前可读字节数。

- 第 30 行：调用 `#decodeRemovalReentryProtection(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法，执行解码。如果 Handler 准备移除，在解码完成后，进行移除。详细解析，见 [「5.3.1 decodeRemovalReentryProtection」](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#) 中。

- 第 32 至 39 行：用户主动删除该 Handler ，继续操作 `in` 是不安全的，所以结束循环。

- 第 42 行：直接判断

   

  ```
  out.size() == 0
  ```

   

  比较合适。因为【第 8 至 24 行】的代码，能够保证

   

  ```
  outSize
  ```

   

  等于

  零

  。

  - 第 43 至 45 行：如果**未读取**任何字节，`break` 结束循环。
  - 第 46 至 49 行：如果可读字节**发生变化**，`continue` 重新开始循环，即继续读取。

- 第 52 至 55 行：如果解码了消息，但是可读字节数未变，抛出 DecoderException 异常。说明，有问题。

- 第 57 至 60 行：如果开启 `singleDecode` ，表示只解析一次，`break` 结束循环。

- 第 62 至 66 行：如果发生异常，抛出 DecoderException 异常。

😈 代码有一些长，胖友保持耐心看完哈。其实，蛮简单的。

### 5.3.1 decodeRemovalReentryProtection

`#decodeRemovalReentryProtection(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法，执行解码。如果 Handler 准备移除，在解码完成后，进行移除。代码如下：

```
 1: final void decodeRemovalReentryProtection(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception {
 2:     // 设置状态为 STATE_CALLING_CHILD_DECODE
 3:     decodeState = STATE_CALLING_CHILD_DECODE;
 4:     try {
 5:         // 执行解码
 6:         decode(ctx, in, out);
 7:     } finally {
 8:         // 判断是否准备移除
 9:         boolean removePending = decodeState == STATE_HANDLER_REMOVED_PENDING;
10:         // 设置状态为 STATE_INIT
11:         decodeState = STATE_INIT;
12:         // 移除当前 Handler
13:         if (removePending) {
14:             handlerRemoved(ctx);
15:         }
16:     }
17: }
```

- 第 3 行：设置状态(`decodeState`) 为 `STATE_CALLING_CHILD_DECODE` 。

- 第 6 行：调用 `#decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法，执行解码。代码如下：

  ```
  /**
   * Decode the from one {@link ByteBuf} to an other. This method will be called till either the input
   * {@link ByteBuf} has nothing to read when return from this method or till nothing was read from the input
   * {@link ByteBuf}.
   *
   * @param ctx           the {@link ChannelHandlerContext} which this {@link ByteToMessageDecoder} belongs to
   * @param in            the {@link ByteBuf} from which to read data
   * @param out           the {@link List} to which decoded messages should be added
   * @throws Exception    is thrown if an error occurs
   */
  protected abstract void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception;
  ```

  - 子类实现该方法，就可以愉快的解码消息了，**并且，也只需要实现该方法**。其它的逻辑，ByteToMessageDecoder 已经全部帮忙实现了。

- 第 9 行：判断是否准备移除。那么什么情况下，会出现

   

  ```
  decodeState == STATE_HANDLER_REMOVED_PENDING
  ```

   

  成立呢？详细解析，见

   

  「5.7 handlerRemoved」

   

  。

  - 第 11 行：设置状态(`decodeState`) 为 `STATE_HANDLER_REMOVED_PENDING` 。
  - 第 12 至 15 行：如果准备移除，则调用 `#handlerRemoved(ChannelHandlerContext ctx)` 方法，移除当前 Handler 。详细解析，见 [「5.7 handlerRemoved」](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#) 。

## 5.4 channelReadComplete

`#channelReadComplete(ChannelHandlerContext ctx)` 方法，代码如下：

```
 1: @Override
 2: public void channelReadComplete(ChannelHandlerContext ctx) throws Exception {
 3:     // 重置 numReads
 4:     numReads = 0;
 5:     // 释放部分的已读
 6:     discardSomeReadBytes();
 7:     // 未解码到消息，并且未开启自动读取，则再次发起读取，期望读取到更多数据，以便解码到消息
 8:     if (decodeWasNull) {
 9:         decodeWasNull = false; // 重置 decodeWasNull
10:         if (!ctx.channel().config().isAutoRead()) {
11:             ctx.read();
12:         }
13:     }
14:     // 触发 Channel ReadComplete 事件到下一个节点
15:     ctx.fireChannelReadComplete();
16: }
```

- 第 4 行：重置 `numReads` 。
- 第 6 行：调用 `#discardSomeReadBytes()` 方法，释放部分的已读。
- 第 7 至 13 行：未解码到消息( `decodeWasNull == true` )，并且未开启自动读取( `ctx.channel().config().isAutoRead() == false` )，则再次发起读取，期望读取到更多数据，以便解码到消息。
- 第 15 行：触发 Channel ReadComplete 事件到下一个节点。

## 5.5 channelInactive

`#channelInactive(ChannelHandlerContext ctx)` 方法，通道处于未激活( Inactive )，解码完剩余的消息，并释放相关资源。代码如下：

```
@Override
public void channelInactive(ChannelHandlerContext ctx) throws Exception {
    channelInputClosed(ctx, true);
}
```

- 调用 `#channelInputClosed(ChannelHandlerContext ctx, boolean callChannelInactive)` 方法，执行 Channel 读取关闭的逻辑。代码如下：

  ```
   1: private void channelInputClosed(ChannelHandlerContext ctx, boolean callChannelInactive) throws Exception {
   2:     // 创建 CodecOutputList 对象
   3:     CodecOutputList out = CodecOutputList.newInstance();
   4:     try {
   5:         // 当 Channel 读取关闭时，执行解码剩余消息的逻辑
   6:         channelInputClosed(ctx, out);
   7:     } catch (DecoderException e) {
   8:         throw e;
   9:     } catch (Exception e) {
  10:         throw new DecoderException(e);
  11:     } finally {
  12:         try {
  13:             // 释放 cumulation
  14:             if (cumulation != null) {
  15:                 cumulation.release();
  16:                 cumulation = null;
  17:             }
  18:             int size = out.size();
  19:             // 触发 Channel Read 事件到下一个节点。可能是多条消息
  20:             fireChannelRead(ctx, out, size);
  21:             // 如果有解码到消息，则触发 Channel ReadComplete 事件到下一个节点。
  22:             if (size > 0) {
  23:                 // Something was read, call fireChannelReadComplete()
  24:                 ctx.fireChannelReadComplete();
  25:             }
  26:             // 如果方法调用来源是 `#channelInactive(...)` ，则触发 Channel Inactive 事件到下一个节点
  27:             if (callChannelInactive) {
  28:                 ctx.fireChannelInactive();
  29:             }
  30:         } finally {
  31:             // 回收 CodecOutputList 对象
  32:             // Recycle in all cases
  33:             out.recycle();
  34:         }
  35:     }
  36: }
  ```

  - 第 3 行：创建 CodecOutputList 对象。

    - 第 6 行：调用 `#channelInputClosed(ChannelHandlerContext ctx, List<Object> out)` 方法，当 Channel 读取关闭时，执行解码剩余消息的逻辑。代码如下：

      ```
      /**
       * Called when the input of the channel was closed which may be because it changed to inactive or because of
       * {@link ChannelInputShutdownEvent}.
       */
      void channelInputClosed(ChannelHandlerContext ctx, List<Object> out) throws Exception {
          if (cumulation != null) {
              // 执行解码
              callDecode(ctx, cumulation, out);
              // 最后一次，执行解码
              decodeLast(ctx, cumulation, out);
          } else {
              // 最后一次，执行解码
              decodeLast(ctx, Unpooled.EMPTY_BUFFER, out);
          }
      }
      
      /**
       * Is called one last time when the {@link ChannelHandlerContext} goes in-active. Which means the
       * {@link #channelInactive(ChannelHandlerContext)} was triggered.
       *
       * By default this will just call {@link #decode(ChannelHandlerContext, ByteBuf, List)} but sub-classes may
       * override this for some special cleanup operation.
       */
      protected void decodeLast(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception {
          if (in.isReadable()) {
              // Only call decode() if there is something left in the buffer to decode.
              // See https://github.com/netty/netty/issues/4386
              decodeRemovalReentryProtection(ctx, in, out);
          }
      }
      ```

      - 其中，`#decodeLast(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法，是可以被重写的。例如，HttpObjectDecoder 就重写了该方法。

    - 第 7 至 10 行：如果发生异常，就抛出 DecoderException 异常。

  - 第 13 至 17 行：释放 `cumulation` 。

  - 第 20 行：调用 `#fireChannelRead(ChannelHandlerContext ctx, List<Object> msgs, int numElements)` **静态**方法，触发 Channel Read 事件。可能是多条消息。

  - 第 21 至 25 行：如果有解码到消息( `size > 0` )，则触发 Channel ReadComplete 事件到下一个节点。

  - 第 26 至 29 行：如果方法调用来源是 `#channelInactive(...)` ，则触发 Channel Inactive 事件到下一个节点。

  - 第 30 至 35 行：回收 CodecOutputList 对象。

😈 对于该方法的目的，笔者的理解是，尽可能在解码一次剩余的 `cumulation` ，在 Channel 变成未激活时。细节好多呀！！！

## 5.6 userEventTriggered

`#userEventTriggered(ChannelHandlerContext ctx, Object evt)` 方法，处理 ChannelInputShutdownEvent 事件，即 Channel 关闭读取。代码如下：

```
@Override
public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
    if (evt instanceof ChannelInputShutdownEvent) {
        // The decodeLast method is invoked when a channelInactive event is encountered.
        // This method is responsible for ending requests in some situations and must be called
        // when the input has been shutdown.
        channelInputClosed(ctx, false);
    }
    // 继续传播 evt 到下一个节点
    super.userEventTriggered(ctx, evt);
}
```

- 调用 `#channelInputClosed(ChannelHandlerContext ctx, boolean callChannelInactive)` 方法，执行 Channel 读取关闭的逻辑。
- 继续传播 `evt` 到下一个节点。

😈 对于该方法的目的，笔者的理解是，尽可能在解码一次剩余的 `cumulation` ，在 Channel 关闭读取。细节好多呀！！！

## 5.7 handlerRemoved

`#handlerRemoved(ChannelHandlerContext ctx)` 方法，代码如下：

```
 1: @Override
 2: public final void handlerRemoved(ChannelHandlerContext ctx) throws Exception {
 3:     // 状态处于 STATE_CALLING_CHILD_DECODE 时，标记状态为 STATE_HANDLER_REMOVED_PENDING
 4:     if (decodeState == STATE_CALLING_CHILD_DECODE) {
 5:         decodeState = STATE_HANDLER_REMOVED_PENDING;
 6:         return; // 返回！！！！结合 `#decodeRemovalReentryProtection(...)` 方法，一起看。
 7:     }
 8:     ByteBuf buf = cumulation;
 9:     if (buf != null) {
10:         // 置空 cumulation
11:         // Directly set this to null so we are sure we not access it in any other method here anymore.
12:         cumulation = null;
13: 
14:         int readable = buf.readableBytes();
15:         // 有可读字节
16:         if (readable > 0) {
17:             // 读取剩余字节，并释放 buf
18:             ByteBuf bytes = buf.readBytes(readable);
19:             buf.release();
20:             // 触发 Channel Read 到下一个节点
21:             ctx.fireChannelRead(bytes);
22:         // 无可读字节
23:         } else {
24:             // 释放 buf
25:             buf.release();
26:         }
27: 
28:         // 置空 numReads
29:         numReads = 0;
30:         // 触发 Channel ReadComplete 到下一个节点
31:         ctx.fireChannelReadComplete();
32:     }
33:     // 执行移除逻辑
34:     handlerRemoved0(ctx);
35: }
```

- 第 3 至 7 行：如果状态( `decodeState` )处于 `STATE_CALLING_CHILD_DECODE` 时，说明正在执行 `#decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法中。如果此时，直接往下执行，`cumulation` 将被直接释放，而 `#decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法可能正在解码中，很大可能性造成影响，导致错误。所以，此处仅仅标记状态( `decodeState` )为 `STATE_HANDLER_REMOVED_PENDING` 。等到 `#decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法执行完成后，在进行移除。胖友，此时可以再跳回 [「5.3.1 decodeRemovalReentryProtection」](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#) ，进行再次理解。

- 【有可读字节】第 15 至 21 行：读取剩余字节，并释放 `buf` 。然后，触发 Channel Read 到下一个节点。通过这样的方式，避免 `cumulation` 中，有字节被“丢失”，即使当前可能无法解码成一个数据包。

- 【无可读字节】第 22 至 26 行：直接释放 `buf` 。

- 第 29 行：置空 `numReads` 。

- 第 34 行：调用 `#handlerRemoved0(ChannelHandlerContext ctx)` 方法，执行移除逻辑。代码如下：

  ```
  /**
   * Gets called after the {@link ByteToMessageDecoder} was removed from the actual context and it doesn't handle
   * events anymore.
   */
  protected void handlerRemoved0(ChannelHandlerContext ctx) throws Exception { }
  ```

  - 默认情况下，该方法实现为空。目前可重写该方法，实现自定义的资源释放。目前重写该方法的类，例如：Http2ConnectionHandler、SslHandler 等等。

## 5.8 internalBuffer

`#internalBuffer()` 方法，获得 ByteBuf 对象。代码如下：

```
/**
 * Returns the internal cumulative buffer of this decoder. You usually
 * do not need to access the internal buffer directly to write a decoder.
 * Use it only when you must use it at your own risk.
 */
protected ByteBuf internalBuffer() {
    if (cumulation != null) {
        return cumulation;
    } else {
        return Unpooled.EMPTY_BUFFER;
    }
}
```

## 5.9 actualReadableBytes

`#actualReadableBytes()` 方法，获得可读字节数。代码如下：

```
/**
 * Returns the actual number of readable bytes in the internal cumulative
 * buffer of this decoder. You usually do not need to rely on this value
 * to write a decoder. Use it only when you must use it at your own risk.
 * This method is a shortcut to {@link #internalBuffer() internalBuffer().readableBytes()}.
 */
protected int actualReadableBytes() {
    return internalBuffer().readableBytes();
}
```

# 666. 彩蛋

细节有点多，可能对如下小节理解不够到位。如有错误，烦请胖友教育。

- [「5.5 channelInactive」](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#)
- [「5.6 userEventTriggered」](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#)
- [「5.7 handlerRemoved」](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl/#)

------

本文参考如下文章：

- 简书闪电侠 [《netty源码分析之拆包器的奥秘》](https://www.jianshu.com/p/dc26e944da95)
- Hypercube [《自顶向下深入分析Netty（八）–CodecHandler》](https://www.jianshu.com/p/7c439cc7b01c)

# Codec 之 ByteToMessageDecoder（二）FrameDecoder

# 1. 概述

在 [《精尽 Netty 源码解析 —— Codec 之 ByteToMessageDecoder（一）》](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl) 中，我们看到 ByteToMessageDecoder 有四个 FrameDecoder 实现类：

- ① FixedLengthFrameDecoder ，基于**固定长度**消息进行粘包拆包处理的。
- ② LengthFieldBasedFrameDecoder ，基于**消息头指定消息长度**进行粘包拆包处理的。
- ③ LineBasedFrameDecoder ，基于**换行**来进行消息粘包拆包处理的。
- ④ DelimiterBasedFrameDecoder ，基于**指定消息边界方式**进行粘包拆包处理的。

实际上，上述四个 FrameDecoder 实现可以进行规整：

- ① 是 ② 的特例，**固定长度**是**消息头指定消息长度**的一种形式。
- ③ 是 ④ 的特例，**换行**是于**指定消息边界方式**的一种形式。

本文，笔者只分享 ① 和 ③ 。对于 ② 和 ④ ，会提供相关的文章。

# 2. FixedLengthFrameDecoder

`io.netty.handler.codec.FixedLengthFrameDecoder` ，继承 ByteToMessageDecoder 抽象类，基于**固定长度**消息进行粘包拆包处理的。

如果下是固定长度为 3 的数据流解码：

```
+---+----+------+----+      +-----+-----+-----+
| A | BC | DEFG | HI |  ->  | ABC | DEF | GHI |
+---+----+------+----+      +-----+-----+-----+
```

## 2.1 构造方法

```
/**
 * 固定长度
 */
private final int frameLength;

/**
 * Creates a new instance.
 *
 * @param frameLength the length of the frame
 */
public FixedLengthFrameDecoder(int frameLength) {
    if (frameLength <= 0) {
        throw new IllegalArgumentException("frameLength must be a positive integer: " + frameLength);
    }
    this.frameLength = frameLength;
}
```

- `frameLength` 属性，固定长度。

## 2.2 decode

`#decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法，执行解码。代码如下：

```
1: @Override
2: protected final void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception {
3:     // 解码消息
4:     Object decoded = decode(ctx, in);
5:     // 添加到 out 结果中
6:     if (decoded != null) {
7:         out.add(decoded);
8:     }
9: }
```

- 第 4 行：调用 `#decode(ChannelHandlerContext ctx, ByteBuf in)` 方法，解码消息。代码如下：

  ```
  /**
   * Create a frame out of the {@link ByteBuf} and return it.
   *
   * @param   ctx             the {@link ChannelHandlerContext} which this {@link ByteToMessageDecoder} belongs to
   * @param   in              the {@link ByteBuf} from which to read data
   * @return  frame           the {@link ByteBuf} which represent the frame or {@code null} if no frame could
   *                          be created.
   */
  protected Object decode(@SuppressWarnings("UnusedParameters") ChannelHandlerContext ctx, ByteBuf in) throws Exception {
      // 可读字节不够 frameLength 长度，无法解码出消息。
      if (in.readableBytes() < frameLength) {
          return null;
      // 可读字节足够 frameLength 长度，解码出一条消息。
      } else {
          return in.readRetainedSlice(frameLength);
      }
  }
  ```

  - 当可读字节足够 `frameLength` 长度时，调用 `ByteBuf#readRetainedSlice(int length)` 方法，读取一个 Slice ByteBuf 对象，并增加引用计数。并且该 Slice ByteBuf 作为解码的一条消息。另外，`ByteBuf#readRetainedSlice(int length)` 的过程，因为是共享原有 ByteBuf `in` 数组，所以不存在数据拷贝。

- 第 5 至 8 行：若解码到消息，添加到 `out` 结果中。

# 3. LineBasedFrameDecoder

`io.netty.handler.codec.LineBasedFrameDecoder` ，继承 ByteToMessageDecoder 抽象类，基于**换行**来进行消息粘包拆包处理的。

它会处理 `"\n"` 和 `"\r\n"` 两种换行符。

## 3.1 构造方法

```
/**
 * 一条消息的最大长度
 *
 * Maximum length of a frame we're willing to decode.
 */
private final int maxLength;
/**
 * 是否快速失败
 *
 * 当 true 时，未找到消息，但是超过最大长度，则马上触发 Exception 到下一个节点
 * 当 false 时，未找到消息，但是超过最大长度，需要匹配到一条消息后，再触发 Exception 到下一个节点
 *
 * Whether or not to throw an exception as soon as we exceed maxLength.
 */
private final boolean failFast;
/**
 * 是否过滤掉换行分隔符。
 *
 * 如果为 true ，解码的消息不包含换行符。
 */
private final boolean stripDelimiter;

/**
 * 是否处于废弃模式
 *
 * 如果为 true ，说明解析超过最大长度( maxLength )，结果还是找不到换行符
 *
 * True if we're discarding input because we're already over maxLength.
 */
private boolean discarding;
/**
 * 废弃的字节数
 */
private int discardedBytes;

/**
 * 最后扫描的位置
 *
 * Last scan position.
 */
private int offset;

/**
 * Creates a new decoder.
 * @param maxLength  the maximum length of the decoded frame.
 *                   A {@link TooLongFrameException} is thrown if
 *                   the length of the frame exceeds this value.
 */
public LineBasedFrameDecoder(final int maxLength) {
    this(maxLength, true, false);
}

/**
 * Creates a new decoder.
 * @param maxLength  the maximum length of the decoded frame.
 *                   A {@link TooLongFrameException} is thrown if
 *                   the length of the frame exceeds this value.
 * @param stripDelimiter  whether the decoded frame should strip out the
 *                        delimiter or not
 * @param failFast  If <tt>true</tt>, a {@link TooLongFrameException} is
 *                  thrown as soon as the decoder notices the length of the
 *                  frame will exceed <tt>maxFrameLength</tt> regardless of
 *                  whether the entire frame has been read.
 *                  If <tt>false</tt>, a {@link TooLongFrameException} is
 *                  thrown after the entire frame that exceeds
 *                  <tt>maxFrameLength</tt> has been read.
 */
public LineBasedFrameDecoder(final int maxLength, final boolean stripDelimiter, final boolean failFast) {
    this.maxLength = maxLength;
    this.failFast = failFast;
    this.stripDelimiter = stripDelimiter;
}
```

- ```
  maxLength
  ```

   

  属性，一条消息的最大长度。原本以为 LineBasedFrameDecoder 会比较简单，但是因为多了

   

  ```
  maxLength
  ```

   

  复杂很多。为什么这么说呢？

  - 假设 `maxLength = 2` ，接收到的数据为 `"abcd\nEF\n"`( 直接以字符串举例，为了可阅读性 )，那么 `"abcd"` 是不符合条件的消息，因为长度为 4 ，超过最大长度 `maxLength` 。
  - 但是考虑到拆粘包的情况，可能初始化接收到的是 `"abc"` ，那么无法匹配到 `\n` 换行符。但是呢，`"abc"` 的长度为 3，超过最大长度 `maxLength` ，需要等待读取到 `"d\n"` 部分，然后抛弃 `"abcd"` 整条。再之后，继续读取符合条件的 `"EF"` 段。
  - 😈 比较绕，胖友好好理解下。

- ```
  failFast
  ```

   

  属性，是否快速失败。

  - `true` 时，未找到消息，但是超过最大长度，则马上触发 Exception 到下一个节点。
  - 当 `false` 时，未找到消息，但是超过最大长度，需要匹配到一条消息后，再触发 Exception 到下一个节点。
  - 😈 也有点绕，等下结合代码具体理解。

- `stripDelimiter` 属性，是否过滤掉换行分隔符。如果为 `true` ，解码的消息不包含换行符。

- ```
  discarding
  ```

   

  属性，是否处于废弃模式。如果为

   

  ```
  true
  ```

   

  ，说明解析超过最大长度(

   

  ```
  maxLength
  ```

   

  )，结果还是找不到换行符。

  - 😈 也有点绕，等下结合代码具体理解。
  - `discardedBytes` 属性，废弃的字节数。
  - `offset` 属性，最后扫描的位置。

## 3.2 decode

`#decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法，执行解码。代码如下：

```
@Override
protected final void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception {
    Object decoded = decode(ctx, in);
    if (decoded != null) {
        out.add(decoded);
    }
}
```

- 这段代码，和 `FixedLengthFrameDecoder#decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out)` 方法，是一样的。

------

`#decode(ChannelHandlerContext ctx, ByteBuf buffer)` 方法，执行解码。代码如下：

```
 1: protected Object decode(ChannelHandlerContext ctx, ByteBuf buffer) throws Exception {
 2:     // 获得换行符的位置
 3:     final int eol = findEndOfLine(buffer);
 4:     if (!discarding) { // 未处于废弃模式
 5:         if (eol >= 0) { // 找到
 6:             final ByteBuf frame;
 7:             final int length = eol - buffer.readerIndex(); // 读取长度
 8:             final int delimLength = buffer.getByte(eol) == '\r' ? 2 : 1; // 分隔符的长度。2 为 `\r\n` ，1 为 `\n`
 9: 
10:             // 超过最大长度
11:             if (length > maxLength) {
12:                 // 设置新的读取位置
13:                 buffer.readerIndex(eol + delimLength);
14:                 // 触发 Exception 到下一个节点
15:                 fail(ctx, length);
16:                 // 返回 null ，即未解码到消息
17:                 return null;
18:             }
19: 
20:             // 解码出一条消息。
21:             if (stripDelimiter) {
22:                 frame = buffer.readRetainedSlice(length);
23:                 buffer.skipBytes(delimLength); // 忽略换行符
24:             } else {
25:                 frame = buffer.readRetainedSlice(length + delimLength);
26:             }
27: 
28:             // 返回解码的消息
29:             return frame;
30:         } else { // 未找到
31:             final int length = buffer.readableBytes();
32:             // 超过最大长度
33:             if (length > maxLength) {
34:                 // 记录 discardedBytes
35:                 discardedBytes = length;
36:                 // 跳到写入位置
37:                 buffer.readerIndex(buffer.writerIndex());
38:                 // 标记 discarding 为废弃模式
39:                 discarding = true;
40:                 // 重置 offset
41:                 offset = 0;
42:                 // 如果快速失败，则触发 Exception 到下一个节点
43:                 if (failFast) {
44:                     fail(ctx, "over " + discardedBytes);
45:                 }
46:             }
47:             return null;
48:         }
49:     } else { // 处于废弃模式
50:         if (eol >= 0) { // 找到
51:             final int length = discardedBytes + eol - buffer.readerIndex(); // 读取长度
52:             final int delimLength = buffer.getByte(eol) == '\r' ? 2 : 1; // 分隔符的长度。2 为 `\r\n` ，1 为 `\n`
53:             // 设置新的读取位置
54:             buffer.readerIndex(eol + delimLength);
55:             // 重置 discardedBytes
56:             discardedBytes = 0;
57:             // 设置 discarding 不为废弃模式
58:             discarding = false;
59:             // 如果不为快速失败，则触发 Exception 到下一个节点
60:             if (!failFast) {
61:                 fail(ctx, length);
62:             }
63:         } else { // 未找到
64:             // 增加 discardedBytes
65:             discardedBytes += buffer.readableBytes();
66:             // 跳到写入位置
67:             buffer.readerIndex(buffer.writerIndex());
68:         }
69:         return null;
70:     }
71: }
```

- 第 3 行：调用 `#findEndOfLine(final ByteBuf buffer)` 方法，获得换行符的位置。详细解析，这里胖友先跳到 [「3.3 findEndOfLine」](http://svip.iocoder.cn/Netty/Codec-1-2-ByteToMessageDecoder-FrameDecoder/#) 中。

- =============== 未处于 `discarding` 模式 ===============

- 根据是否找到换行符，分成 ① ② 两种情况。

- ① 第 5 行：**找到**换行符。

- 第 7 至 8 行：获得读取消息的长度、换行符的长度。

- 第 11 行：读取消息的长度，超过最大长度，则

  丢弃

  该消息。

  - 第 13 行：`buffer` 设置新的读取位置。
  - 第 15 行：调用 `#fail(...)` 方法，触发 Exception 到下一个节点。详细解析，见 [「3.4 fail」](http://svip.iocoder.cn/Netty/Codec-1-2-ByteToMessageDecoder-FrameDecoder/#) 。😈 注意，此处和 `failFast` 没有关系。
  - 【失败】第 17 行：返回 `null` ，即未解码到消息。

- 【成功】第 20 至 26 行：解码出一条消息。调用 `ByteBuf#readRetainedSlice(int length)` 方法，读取一个 Slice ByteBuf 对象，并增加引用计数。并且该 Slice ByteBuf 作为解码的一条消息。另外，`ByteBuf#readRetainedSlice(int length)` 的过程，因为是共享原有 ByteBuf `in` 数组，所以不存在数据拷贝。

- ② 第 30 行：**未找到**换行符，说明当前 `buffer` **不存在**完整的消息。需要继续读取新的数据，再次解码拆包。

- 第 33 行：可读字节，超过最大长度，那么即使后续找到换行符，消息也**一定**超过最大长度。

- 第 35 行：记录 `discardedBytes` 。因为【第 37 行】的代码，`buffer` 跳到写入位置，也就是抛弃了 `discardedBytes` 字节数。

- 第 39 行：标记

   

  ```
  discarding
  ```

   

  为

   

  ```
  true
  ```

   

  ，进入废弃模式。那么，后续就会执行【第 49 至 70 行】的代码逻辑，寻找到换行符，解码拆包出该消息，并

  抛弃

  它。

  - 😈 这段，好好理解下。

- 第 41 行：重置 `offset` 为 0 。

- 第 42 至 45 行：如果快速失败( `failFast = true` )，调用 `#fail(...)` 方法，触发 Exception 到下一个节点。那么，不快速失败( `failFast = false` )呢？继续往下走，答案在【第 59 至 61 行】的代码，见分晓。

- 第 47 行：【失败】第 17 行：返回 `null` ，即未解码到消息。

- =============== 正处于 `discarding` 模式 ===============

- `discarding` 模式是什么呢？在【第 33 至 46 行】的代码，如果已读取的字节数，超过最大长度，那么进入 `discarding` 模式，继续寻找到换行符，解码拆包出该消息，并**抛弃**它。😈 实际上，它的效果是【第 30 至 48 行】+【第 49 至 69 行】和【第 10 至 18 行】的代码的效果是**等价的**，只是说【第 30 至 48 行】的代码，因为数据包是**不完整**( 找不到换行符 )的，所以进入【第 49 至 69 行】的代码。

- 根据是否找到换行符，分成 ① ② 两种情况。

- ① 第 50 行：**找到**换行符。

- 第 51 行：读取长度。此处的长度，算上了

   

  ```
  discardedBytes
  ```

   

  的部分。

  - 第 52 行：获得换行符的长度。

- 第 54 行：设置新的读取位置。因为，**找到**换行符。

- 第 56 行：重置 `discardedBytes` 为 0 。因为，**找到**换行符。

- 第 58 行：重置 `offset` 为 0 。因为，**找到**换行符。

- 第 59 至 62 行：如果不为快速失败(

   

  ```
  failFast = false
  ```

   

  )，调用

   

  ```
  #fail(...)
  ```

   

  方法，触发 Exception 到下一个节点。

  - 和【第 42 至 45 行】的代码，相对。
  - 也就说，`failFast = false` 的情况下，只有在解析到完整的消息，**才**触发 Exception 到下一个节点。😈 是不是很绕，哈哈哈哈。

- 【失败】第 69 行：返回 `null` ，虽然解码到消息，但是因为消息长度超过最大长度，所以进行**丢失**。和【第 17 行】的代码，是一个目的。

- ② 第 63 行：**未找到**换行符，说明当前 `buffer` **不存在**完整的消息。需要继续读取新的数据，再次解码拆包。

- 第 65 行：增加 `discardedBytes` 。

- 第 67 行：`buffer` 跳到写入位置。

- 第 69 行：返回 `null` ，即未解码到消息。

😈 整体逻辑，有点绕，不过很有趣。

## 3.3 findEndOfLine

`#findEndOfLine(final ByteBuf buffer)` 方法，获得换行符的位置。代码如下：

```
   /**
    * Returns the index in the buffer of the end of line found.
    * Returns -1 if no end of line was found in the buffer.
    */
 1: private int findEndOfLine(final ByteBuf buffer) {
 2:     int totalLength = buffer.readableBytes();
 3:     int i = buffer.forEachByte(buffer.readerIndex() + offset, totalLength - offset, ByteProcessor.FIND_LF);
 4:     // 找到
 5:     if (i >= 0) {
 6:         // 重置 offset
 7:         offset = 0;
 8:         // 如果前一个字节位 `\r` ，说明找到的是 `\n` ，所以需要 -1 ，因为寻找的是首个换行符的位置
 9:         if (i > 0 && buffer.getByte(i - 1) == '\r') {
10:             i--;
11:         }
12:     // 未找到，记录 offset
13:     } else {
14:         offset = totalLength;
15:     }
16:     return i;
17: }
```

- 关于 `offset` 的逻辑，笔者觉得有点问题。在这里，胖友先无视掉它。稍后，我们在统一分享。
- 第 3 行：在 `buffer` 的 `[readerIndex, readerIndex + readableBytes)` 位置范围内，查找 `\n` 换行符的位置。😈 在忽略 `offset` 的前提下。
- 【有找到】
  - 第 7 行：重置 `offset` 。
  - 第 8 至 11 行：如果前一个字节位 `\r` ，说明找到的是 `\n` ，所以需要 -1 ，因为寻找的是首个换行符的位置。
- 【没找到】
  - 第 14 行：记录 `offset` 。
- 第 16 行：返回位置 `i` 。

## 3.4 fail

`#fail(...)` 方法，触发 Exception 到下一个节点。代码如下：

```
private void fail(final ChannelHandlerContext ctx, int length) {
    fail(ctx, String.valueOf(length));
}

private void fail(final ChannelHandlerContext ctx, String length) {
    ctx.fireExceptionCaught(new TooLongFrameException("frame length (" + length + ") exceeds the allowed maximum (" + maxLength + ')'));
}
```

## 3.5 可能是 offset 的一个 bug

这里，只能说是 `offset` 的一个 bug ，也是笔者的一个推测。下面，我们来推导下。

[![代码图](http://static.iocoder.cn/images/Netty/2018_10_01/01.png)](http://static.iocoder.cn/images/Netty/2018_10_01/01.png)代码图

- 第一根红线，在 `discarding` 模式下，如果读取不到换行符，每次 `buffer` 的读取位置，都会跳到写入位置。
- 第三根红线，`offset` 记录**上一次**读取的字节数。
- 第二根红线，如果查找的范围 `+ offset` ，但是 `buffer` 的读取位置已经跳到写入位置，岂不是和 `offset` 的重复了？？

所以，笔者认为，应该去掉 `offset` 的相关逻辑。

------

下面，我们以一个实际情况，举个例子。如下图所示：

[![例子](http://static.iocoder.cn/images/Netty/2018_12_04/02.png)](http://static.iocoder.cn/images/Netty/2018_12_04/02.png)例子

- 假设 `maxLength` 等于 1 。
- 第一次接收到数据 `"012"` ，未找到换行符，但是超过最大长度，所以进入 `discarding` 模式。
- 第二次接收到数据 `"34"` ，未找到换行符，`r = w = 4` ，并且 `offset = 2` 。
- 第三次接收到数据 `"\n"` ，但是查找范围是 `buffer.readerIndex() + offset = 4 + 2 > 5` ，超过范围。

因此，笔者觉得，这个可能是 offset 的一个 bug 。

# 4. LengthFieldBasedFrameDecoder

`io.netty.handler.codec.LengthFieldBasedFrameDecoder` ，继承 ByteToMessageDecoder 抽象类，基于**消息头指定消息长度**进行粘包拆包处理的。

详细解析，见基友【闪电侠】的 [《netty源码分析之LengthFieldBasedFrameDecoder》](https://www.jianshu.com/p/a0a51fd79f62) 一文。

或者，【Hypercube】的 [《自顶向下深入分析Netty（八）– LengthFieldBasedFrameDecoder》](https://www.jianshu.com/p/c3fbd6113dd6) 一文。

# 5. DelimiterBasedFrameDecoder

`io.netty.handler.codec.DelimiterBasedFrameDecoder` ，继承 ByteToMessageDecoder 抽象类，基于**指定消息边界方式**进行粘包拆包处理的。

> FROM [《自顶向下深入分析Netty（八）–CodecHandler》](https://www.jianshu.com/p/7c439cc7b01c) 的 [「8.1.2 DelimiterBasedFrameDecoder」](http://svip.iocoder.cn/Netty/Codec-1-2-ByteToMessageDecoder-FrameDecoder/#) 小节。
>
> 如下内容，因为排版，所以未使用引用语法。

该解码器是更通用的分隔符解码器，可支持多个分隔符，每个分隔符可为一个或多个字符。如果定义了多个分隔符，并且可解码出多个消息帧，则选择产生最小帧长的结果。例如，使用行分隔符`\r\n`和`\n`分隔：

```
+--------------+
| ABC\nDEF\r\n |
+--------------+
```

可有两种结果：

```
+-----+-----+              +----------+   
| ABC | DEF |  (√)   和    | ABC\nDEF |  (×)
+-----+-----+              +----------+
```

该编码器可配置的变量与`LineBasedFrameDecoder`类似，只是多了一个`ByteBuf[] delimiters`用于配置具体的分隔符。
Netty在`Delimiters`类中定义了两种默认的分隔符，分别是NULL分隔符和行分隔符：

```
public static ByteBuf[] nulDelimiter() {
    return new ByteBuf[] {
            Unpooled.wrappedBuffer(new byte[] { 0 }) };
}

public static ByteBuf[] lineDelimiter() {
    return new ByteBuf[] {
            Unpooled.wrappedBuffer(new byte[] { '\r', '\n' }),
            Unpooled.wrappedBuffer(new byte[] { '\n' }),
    };
}
```

# 666. 彩蛋

在 FixedLengthFrameDecoder 那里，卡了好长时间，Netty 在细节这块，扣的真给力啊！！！

本文参考如下文章：

- 简书闪电侠 [《netty源码分析之LengthFieldBasedFrameDecoder》](https://www.jianshu.com/p/a0a51fd79f62)
- Hypercube [《自顶向下深入分析Netty（八）–CodecHandler》](https://www.jianshu.com/p/7c439cc7b01c)

# Codec 之 MessageToByteEncoder

# 1. 概述

本文，我们来分享 MessageToByteEncoder 部分的内容。

MessageToByteEncoder 负责将消息**编码**成字节。核心类图如下：

[![核心类图](http://static.iocoder.cn/images/Netty/2018_12_18/01.png)](http://static.iocoder.cn/images/Netty/2018_12_18/01.png)核心类图

ByteToMessageDecoder 本身是个**抽象**类，其下有多个子类，笔者简单整理成两类，可能不全哈：

- 蓝框

  部分，将消息

  压缩

  ，主要涉及相关压缩算法，例如：GZip、BZip 等等。

  - 它要求消息类型是 ByteBuf ，将已经转化好的字节流，进一步压缩。

- 黄框

  部分，将消息使用

  指定序列化方式

  序列化成字节。例如：JSON、XML 等等。

  - 因为 Netty 没有内置的 JSON、XML 等相关的类库，所以不好提供类似 JSONEncoder 或 XMLEncoder ，所以图中笔者就使用 `netty-example` 提供的 NumberEncoder 。

在 [《精尽 Netty 源码解析 —— Codec 之 ByteToMessageDecoder（一）Cumulator》](http://svip.iocoder.cn/Netty/Codec-1-1-ByteToMessageDecoder-core-impl) 中，我们提到**粘包拆包**的现象，所以在实际使用 Netty 编码消息时，还需要有为了解决**粘包拆包**的 Encoder 实现类，例如：换行、定长等等方式。关于这块内容，胖友可以看看 [《netty使用MessageToByteEncoder 自定义协议》](https://www.codetd.com/article/1539061) 。

# 2. MessageToByteEncoder

`io.netty.handler.codec.MessageToByteEncoder` ，继承 ChannelOutboundHandlerAdapter 类，负责将消息**编码**成字节，支持**匹配指定类型**的消息。

## 2.1 构造方法

```
public abstract class MessageToByteEncoder<I> extends ChannelOutboundHandlerAdapter {

    /**
     * 类型匹配器
     */
    private final TypeParameterMatcher matcher;
    /**
     * 是否偏向使用 Direct 内存
     */
    private final boolean preferDirect;

    protected MessageToByteEncoder() {
        this(true);
    }

    protected MessageToByteEncoder(Class<? extends I> outboundMessageType) {
        this(outboundMessageType, true);
    }

    protected MessageToByteEncoder(boolean preferDirect) {
        // <1> 获得 matcher
        matcher = TypeParameterMatcher.find(this, MessageToByteEncoder.class, "I");
        this.preferDirect = preferDirect;
    }

    protected MessageToByteEncoder(Class<? extends I> outboundMessageType, boolean preferDirect) {
        // <2> 获得 matcher
        matcher = TypeParameterMatcher.get(outboundMessageType);
        this.preferDirect = preferDirect;
    }
    
    // ... 省略其他无关代码
}
```

- ```
  matcher
  ```

   

  属性，有

  两种

  方式赋值。

  - 【常用】`<1>` 处，使用类的 `I` 泛型对应的 TypeParameterMatcher 类型匹配器。
  - `<2>` 处，使用 `inboundMessageType` 参数对应的 TypeParameterMatcher 类型匹配器。
  - 在大多数情况下，我们不太需要特别详细的了解 `io.netty.util.internal.TypeParameterMatcher` 的代码实现，感兴趣的胖友可以自己看看 [《netty 简单Inbound通道处理器（SimpleChannelInboundHandler）》](http://donald-draper.iteye.com/blog/2387772) 的 [「TypeParameterMatcher」](http://svip.iocoder.cn/Netty/Codec-2-1-MessageToByteEncoder-core-impl/#) 部分。

- `preferDirect` 属性，是否偏向使用 Direct 内存。默认为 `true` 。

## 2.2 acceptInboundMessage

`#acceptInboundMessage(Object msg)` 方法，判断消息是否匹配。代码如下：

```
/**
 * Returns {@code true} if the given message should be handled. If {@code false} it will be passed to the next
 * {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
 */
public boolean acceptInboundMessage(Object msg) {
    return matcher.match(msg);
}
```

一般情况下，`matcher` 的类型是 ReflectiveMatcher( 它是 TypeParameterMatcher 的内部类 )。代码如下：

```
private static final class ReflectiveMatcher extends TypeParameterMatcher {
    
    /**
     * 类型
     */
    private final Class<?> type;
    
    ReflectiveMatcher(Class<?> type) {
        this.type = type;
    }
    
    @Override
    public boolean match(Object msg) {
        return type.isInstance(msg); // <1>
    }
    
}
```

- 匹配逻辑，看 `<1>` 处，使用 `Class#isInstance(Object obj)` 方法。对于这个方法，如果我们定义的 `I` 泛型是个父类，那可以匹配所有的子类。例如 `I` 设置为 Object 类，那么所有消息，都可以被匹配列。

## 2.3 write

`#write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise)` 方法，匹配指定的消息类型，编码消息成 ByteBuf 对象，继续写到下一个节点。代码如下：

```
 1: @Override
 2: public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
 3:     ByteBuf buf = null;
 4:     try {
 5:         // 判断是否为匹配的消息
 6:         if (acceptOutboundMessage(msg)) {
 7:             @SuppressWarnings("unchecked")
 8:             I cast = (I) msg;
 9:             // 申请 buf
10:             buf = allocateBuffer(ctx, cast, preferDirect);
11:             // 编码
12:             try {
13:                 encode(ctx, cast, buf);
14:             } finally {
15:                 // 释放 msg
16:                 ReferenceCountUtil.release(cast);
17:             }
18: 
19:             // buf 可读，说明有编码到数据
20:             if (buf.isReadable()) {
21:                 // 写入 buf 到下一个节点
22:                 ctx.write(buf, promise);
23:             } else {
24:                 // 释放 buf
25:                 buf.release();
26:                 // 写入 EMPTY_BUFFER 到下一个节点，为了 promise 的回调
27:                 ctx.write(Unpooled.EMPTY_BUFFER, promise);
28:             }
29: 
30:             // 置空 buf
31:             buf = null;
32:         } else {
33:             // 提交 write 事件给下一个节点
34:             ctx.write(msg, promise);
35:         }
36:     } catch (EncoderException e) {
37:         throw e;
38:     } catch (Throwable e) {
39:         throw new EncoderException(e);
40:     } finally {
41:         // 释放 buf
42:         if (buf != null) {
43:             buf.release();
44:         }
45:     }
46: }
```

- 第 6 行：调用 `#acceptInboundMessage(Object msg)` 方法，判断是否为匹配的消息。

- ① 第 6 行：**匹配**。

  - 第 8 行：对象类型转化为 `I` 类型的消息。

  - 第 10 行：调用 `#allocateBuffer(ChannelHandlerContext ctx, I msg, boolean preferDirect)` 方法，申请 `buf` 。代码如下：

    ```
    /**
     * Allocate a {@link ByteBuf} which will be used as argument of {@link #encode(ChannelHandlerContext, I, ByteBuf)}.
     * Sub-classes may override this method to return {@link ByteBuf} with a perfect matching {@code initialCapacity}.
     */
    protected ByteBuf allocateBuffer(ChannelHandlerContext ctx, @SuppressWarnings("unused") I msg, boolean preferDirect) throws Exception {
        if (preferDirect) {
            return ctx.alloc().ioBuffer();
        } else {
            return ctx.alloc().heapBuffer();
        }
    }
    ```

    - x

  - 第 13 行：调用 `#encode(ChannelHandlerContext ctx, I msg, ByteBuf out)` 方法，编码。代码如下：

    ```
    /**
     * Encode a message into a {@link ByteBuf}. This method will be called for each written message that can be handled
     * by this encoder.
     *
     * @param ctx           the {@link ChannelHandlerContext} which this {@link MessageToByteEncoder} belongs to
     * @param msg           the message to encode
     * @param out           the {@link ByteBuf} into which the encoded message will be written
     * @throws Exception    is thrown if an error occurs
     */
    protected abstract void encode(ChannelHandlerContext ctx, I msg, ByteBuf out) throws Exception;
    ```

    - 子类可以实现该方法，实现自定义的编码功能。

  - 第 16 行：调用 `ReferenceCountUtil#release(Object msg)` 方法，释放 `msg` 。

  - 第 19 至 22 行：`buf` 可读，说明编码消息到 `buf` 中了，所以写入 `buf` 到下一个节点。😈 因为 `buf` 需要继续被下一个节点使用，所以不进行释放。

  - 第 23 至 28 行：`buf` 不可读，说明无法编码，所以释放 `buf` ，并写入 `EMPTY_BUFFER` 到下一个节点，为了 promise 的回调。

  - 第 31 行：置空 `buf` 为空。这里是为了防止【第 41 至 44 行】的代码，释放 `buf` 。

- ② 第 32 行：

  不匹配

  。

  - 提交 write 事件给下一个节点。

- 第 36 至 39 行：发生异常，抛出 EncoderException 异常。

- 第 40 至 45 行：如果中间发生异常，导致 `buf` 不为空，所以此处释放 `buf` 。

# 3. NumberEncoder

`io.netty.example.factorial.NumberEncoder` ，继承 MessageToByteEncoder 抽象类，Number 类型的消息的 Encoder 实现类。代码如下：

> NumberEncoder 是 `netty-example` 模块提供的示例类，实际使用时，需要做调整。

```
public class NumberEncoder extends MessageToByteEncoder<Number> {

    @Override
    protected void encode(ChannelHandlerContext ctx, Number msg, ByteBuf out) {
        // <1> 转化成 BigInteger 对象
        // Convert to a BigInteger first for easier implementation.
        BigInteger v;
        if (msg instanceof BigInteger) {
            v = (BigInteger) msg;
        } else {
            v = new BigInteger(String.valueOf(msg));
        }

        // <2> 转换为字节数组
        // Convert the number into a byte array.
        byte[] data = v.toByteArray();
        int dataLength = data.length;

        // <3> Write a message.
        out.writeByte((byte) 'F'); // magic number
        out.writeInt(dataLength);  // data length
        out.writeBytes(data);      // data
    }

}
```

- `<1>` 处，转化消息类型为 BigInteger 对象，方便统一处理。

- `<2>` 处，转化为字节数组。

- ```
  <3>
  ```

   

  处

  - 首位，写入 magic number ，方便区分**不同类型**的消息。例如说，后面如果有 Double 类型，可以使用 `D` ；String 类型，可以使用 `S` 。
  - 后两位，写入 data length + data 。如果没有 data length ，那么数组内容，是无法读取的。

实际一般不采用 NumberEncoder 的方式，因为 POJO 类型不好支持。关于这一块，可以参看下：

- Dubbo
- Motan
- Sofa-RPC

对 Encoder 和 Codec 真正实战。hoho

# 666. 彩蛋

MessageToByteEncoder 相比 ByteToMessageDecoder 来说，简单好多。

推荐阅读文章：

- Hypercube [《自顶向下深入分析Netty（八）–CodecHandler》](https://www.jianshu.com/p/7c439cc7b01c)

另外，可能很多胖友，看完 Encoder 和 Decoder ，还是一脸懵逼，不知道实际如何使用。可以在网络上，再 Google 一些资料，不要方，不要怕。

# Codec 之 ByteToMessageCodec

# 1. 概述

本文，我们来分享 ByteToMessageCodec 部分的内容。

在网络通信中，编解码是成对出现的，所以 Netty 提供了 ByteToMessageCodec 类，支持 Encoder 和 Decoder 两个功能。

# 2. ByteToMessageCodec

`io.netty.handler.codec.ByteToMessageCodec` ，继承 ChannelDuplexHandler 类，通过**组合** MessageToByteEncoder 和 ByteToMessageDecoder 的功能，从而实现编解码的 Codec **抽象类**。

## 2.1 构造方法

```
public abstract class ByteToMessageCodec<I> extends ChannelDuplexHandler {

    /**
     * 类型匹配器
     */
    private final TypeParameterMatcher outboundMsgMatcher;
    /**
     * Encoder 对象
     */
    private final MessageToByteEncoder<I> encoder;
    /**
     * Decoder 对象
     */
    private final ByteToMessageDecoder decoder = new ByteToMessageDecoder() {
    
        @Override
        public void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception {
            ByteToMessageCodec.this.decode(ctx, in, out);
        }
    
        @Override
        protected void decodeLast(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception {
            ByteToMessageCodec.this.decodeLast(ctx, in, out);
        }
    
    };
    
    protected ByteToMessageCodec() {
        this(true);
    }
    
    protected ByteToMessageCodec(Class<? extends I> outboundMessageType) {
        this(outboundMessageType, true);
    }
    
    protected ByteToMessageCodec(boolean preferDirect) {
        // 禁止共享
        ensureNotSharable();
        // <1> 获得 matcher
        outboundMsgMatcher = TypeParameterMatcher.find(this, ByteToMessageCodec.class, "I");
        // 创建 Encoder 对象
        encoder = new Encoder(preferDirect);
    }
    
    protected ByteToMessageCodec(Class<? extends I> outboundMessageType, boolean preferDirect) {
        // 禁止共享
        ensureNotSharable();
        // <2> 获得 matcher
        outboundMsgMatcher = TypeParameterMatcher.get(outboundMessageType);
        // 创建 Encoder 对象
        encoder = new Encoder(preferDirect);
    }
    
    // ... 省略其他无关代码
    
    private final class Encoder extends MessageToByteEncoder<I> {

        Encoder(boolean preferDirect) {
            super(preferDirect);
        }

        @Override
        public boolean acceptOutboundMessage(Object msg) throws Exception {
            return ByteToMessageCodec.this.acceptOutboundMessage(msg);
        }

        @Override
        protected void encode(ChannelHandlerContext ctx, I msg, ByteBuf out) throws Exception {
            ByteToMessageCodec.this.encode(ctx, msg, out);
        }

    }
    
}
```

- MessageToByteEncoder 部分
  - `encoder` 属性，Encoder 对象，继承自 MessageToByteEncoder 抽象类。只能在构造方法中创建，因为他依赖构造方法的 `preferDirect` 方法参数，所以不能像 `decoder` 直接使用属性赋值。
  - `outboundMsgMatcher` 属性，类型匹配器，在 `<1>` / `<2>` 处初始化。
- ByteToMessageDecoder 部分
  - `decoder` 属性，Decoder 对象，继承自 ByteToMessageDecoder 抽象类。

## 2.2 ChannelHandler 相关方法

```
@Override
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
    decoder.channelRead(ctx, msg);
}

@Override
public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
    encoder.write(ctx, msg, promise);
}

@Override
public void channelReadComplete(ChannelHandlerContext ctx) throws Exception {
    decoder.channelReadComplete(ctx);
}

@Override
public void channelInactive(ChannelHandlerContext ctx) throws Exception {
    decoder.channelInactive(ctx);
}

@Override
public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
    try {
        decoder.handlerAdded(ctx);
    } finally {
        encoder.handlerAdded(ctx);
    }
}

@Override
public void handlerRemoved(ChannelHandlerContext ctx) throws Exception {
    try {
        decoder.handlerRemoved(ctx);
    } finally {
        encoder.handlerRemoved(ctx);
    }
}
``` 

## 2.3 MessageToByteEncoder 相关方法

```Java
/**
 * @see ByteToMessageDecoder#decode(ChannelHandlerContext, ByteBuf, List)
 */
protected abstract void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception;

/**
 * @see ByteToMessageDecoder#decodeLast(ChannelHandlerContext, ByteBuf, List)
 */
protected void decodeLast(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception {
    if (in.isReadable()) {
        // Only call decode() if there is something left in the buffer to decode.
        // See https://github.com/netty/netty/issues/4386
        decode(ctx, in, out);
    }
}
```

## 2.4 MessageToByteEncoder 相关方法

```
/**
 * Returns {@code true} if and only if the specified message can be encoded by this codec.
 *
 * @param msg the message
 */
public boolean acceptOutboundMessage(Object msg) throws Exception {
    return outboundMsgMatcher.match(msg);
}

/**
 * @see MessageToByteEncoder#encode(ChannelHandlerContext, Object, ByteBuf)
 */
protected abstract void encode(ChannelHandlerContext ctx, I msg, ByteBuf out) throws Exception;
```

# 666. 彩蛋

小小的水文一篇，嘿嘿。

# Codec 之 MessageToMessageCodec

# 1. 概述

本文，我们来分享 MessageToMessageCodec 部分的内容。

MessageToMessageCodec 负责消息和消息**之间**的编解码，主要由两部分构造：

- MessageToMessageEncoder ，将消息**编码**成另一种消息。
- MessageToMessageDecoder ，将消息**解码**成另一种消息。

所以，我们先来看 MessageToMessageDecoder 的代码实现，再看 MessageToMessageEncoder 的代码实现，最后看 MessageToMessageCodec 的代码实现。

> 老艿艿：因为笔者平时比较少用这三个类，所以本文会分享的比较简单噢。

# 2. MessageToMessageEncoder

`io.netty.handler.codec.MessageToMessageEncoder` ，继承 ChannelOutboundHandlerAdapter 抽象类，将消息**编码**成另一种消息。

## 2.1 构造方法

```
/**
 * 类型匹配器
 */
private final TypeParameterMatcher matcher;

protected MessageToMessageEncoder() {
    matcher = TypeParameterMatcher.find(this, MessageToMessageEncoder.class, "I");
}

protected MessageToMessageEncoder(Class<? extends I> outboundMessageType) {
    matcher = TypeParameterMatcher.get(outboundMessageType);
}
```

## 2.2 acceptOutboundMessage

```
/**
 * Returns {@code true} if the given message should be handled. If {@code false} it will be passed to the next
 * {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
 */
public boolean acceptOutboundMessage(Object msg) throws Exception {
    return matcher.match(msg);
}
```

## 2.3 write

```
@Override
public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
    CodecOutputList out = null;
    try {
        // 判断是否为匹配的消息
        if (acceptOutboundMessage(msg)) {
            // 创建 CodecOutputList 对象
            out = CodecOutputList.newInstance();
            // 转化消息类型
            @SuppressWarnings("unchecked")
            I cast = (I) msg;
            try {
                // 将消息编码成另外一个消息
                encode(ctx, cast, out);
            } finally {
                // 释放 cast 原消息
                ReferenceCountUtil.release(cast);
            }

            // 如果未编码出消息，抛出异常
            if (out.isEmpty()) {
                // 回收 CodecOutputList 对象
                out.recycle();
                out = null;
                // 抛出异常
                throw new EncoderException(StringUtil.simpleClassName(this) + " must produce at least one message.");
            }
        } else {
            // 直接下一个节点
            ctx.write(msg, promise);
        }
    } catch (EncoderException e) {
        throw e;
    } catch (Throwable t) {
        throw new EncoderException(t);
    } finally {
        if (out != null) {
            final int sizeMinusOne = out.size() - 1;
            // 只编码出一条消息
            if (sizeMinusOne == 0) {
                // 直接写入新消息到下一个节点
                ctx.write(out.get(0), promise);
            // 编码出多条消息
            } else if (sizeMinusOne > 0) {
                // 第 [0, n-1) 条消息，写入下一个节点，使用 voidPromise ，即不需要回调
                // Check if we can use a voidPromise for our extra writes to reduce GC-Pressure
                // See https://github.com/netty/netty/issues/2525
                ChannelPromise voidPromise = ctx.voidPromise();
                boolean isVoidPromise = promise == voidPromise;
                for (int i = 0; i < sizeMinusOne; i ++) {
                    ChannelPromise p;
                    if (isVoidPromise) {
                        p = voidPromise;
                    } else {
                        p = ctx.newPromise();
                    }
                    ctx.write(out.getUnsafe(i), p);
                }
                // 第 n-1 条消息，写入下一个节点，使用 promise ，即需要回调
                ctx.write(out.getUnsafe(sizeMinusOne), promise);
            }
            // 回收 CodecOutputList 对象
            out.recycle();
        }
    }
}
```

- 代码比较简单，胖友自己看注释。

## 2.4 encode

```
/**
 * Encode from one message to an other. This method will be called for each written message that can be handled
 * by this encoder.
 *
 * @param ctx           the {@link ChannelHandlerContext} which this {@link MessageToMessageEncoder} belongs to
 * @param msg           the message to encode to an other one
 * @param out           the {@link List} into which the encoded msg should be added
 *                      needs to do some kind of aggregation
 * @throws Exception    is thrown if an error occurs
 */
protected abstract void encode(ChannelHandlerContext ctx, I msg, List<Object> out) throws Exception;
```

## 2.5 子类

MessageToMessageEncoder 子类比较多，感兴趣的胖友，可以看看负责实现 FrameEncoder 的两个类：

- ```
  io.netty.handler.codec.string.LineEncoder
  ```

   

  ，基于

  指定行分隔符

  的 FrameEncoder 实现类。

  - 代码比较简单，胖友可以直接撸。

- ```
  io.netty.handler.codec.LengthFieldPrepender
  ```

   

  ，基于基于

  消息头指定消息长度

  的 FrameEncoder 实现类。

  - 相对复杂一些，胖友可以结合 [《Netty源码分析-7-MessageToByteEncoder》](https://liuzhengyang.github.io/2018/08/03/netty-7-messagetobyteencoder/) 一起撸。

# 3. MessageToMessageDecoder

`io.netty.handler.codec.MessageToMessageDecoder` ，继承 ChannelInboundHandlerAdapter 类，将消息**解码**成另一种消息。

## 3.1 构造方法

```
/**
 * 类型匹配器
 */
private final TypeParameterMatcher matcher;

protected MessageToMessageDecoder() {
    matcher = TypeParameterMatcher.find(this, MessageToMessageDecoder.class, "I");
}

protected MessageToMessageDecoder(Class<? extends I> inboundMessageType) {
    matcher = TypeParameterMatcher.get(inboundMessageType);
}
```

## 3.2 acceptInboundMessage

```
public boolean acceptInboundMessage(Object msg) throws Exception {
    return matcher.match(msg);
}
```

## 3.3 channelRead

```
@Override
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
    // 创建 CodecOutputList 对象
    CodecOutputList out = CodecOutputList.newInstance();
    try {
        // 判断是否为匹配的消息
        if (acceptInboundMessage(msg)) {
            // 转化消息类型
            @SuppressWarnings("unchecked")
            I cast = (I) msg;
            try {
                // 将消息解码成另外一个消息
                decode(ctx, cast, out);
            } finally {
                // 释放 cast 原消息
                ReferenceCountUtil.release(cast);
            }
        } else {
            // 不匹配，添加到 out
            out.add(msg);
        }
    } catch (DecoderException e) {
        throw e;
    } catch (Exception e) {
        throw new DecoderException(e);
    } finally {
        // 遍历 out ，触发 Channel Read 事件到 pipeline 中
        int size = out.size();
        for (int i = 0; i < size; i ++) {
            ctx.fireChannelRead(out.getUnsafe(i));
        }
        // 回收 CodecOutputList 对象
        out.recycle();
    }
}
```

## 3.4 decode

```
/**
 * Decode from one message to an other. This method will be called for each written message that can be handled
 * by this encoder.
 *
 * @param ctx           the {@link ChannelHandlerContext} which this {@link MessageToMessageDecoder} belongs to
 * @param msg           the message to decode to an other one
 * @param out           the {@link List} to which decoded messages should be added
 * @throws Exception    is thrown if an error occurs
 */
protected abstract void decode(ChannelHandlerContext ctx, I msg, List<Object> out) throws Exception;
```

# 4. MessageToMessageCodec

`io.netty.handler.codec.MessageToMessageCodec` ，继承 ChannelDuplexHandler 类，通过**组合** MessageToMessageEncoder 和 MessageToMessageDecoder 的功能，从而实现编解码的 Codec **抽象类**。

> 老艿艿：从实现的方式上，和 ByteToMessageCodec 非常相似。

## 4.1 构造方法

```
public abstract class MessageToMessageCodec<INBOUND_IN, OUTBOUND_IN> extends ChannelDuplexHandler {

    /**
     * Encoder 对象
     */
    private final MessageToMessageEncoder<Object> encoder = new MessageToMessageEncoder<Object>() {

        @Override
        public boolean acceptOutboundMessage(Object msg) throws Exception {
            return MessageToMessageCodec.this.acceptOutboundMessage(msg);
        }

        @Override
        @SuppressWarnings("unchecked")
        protected void encode(ChannelHandlerContext ctx, Object msg, List<Object> out) throws Exception {
            MessageToMessageCodec.this.encode(ctx, (OUTBOUND_IN) msg, out);
        }
    };

    /**
     * Decoder 对象
     */
    private final MessageToMessageDecoder<Object> decoder = new MessageToMessageDecoder<Object>() {

        @Override
        public boolean acceptInboundMessage(Object msg) throws Exception {
            return MessageToMessageCodec.this.acceptInboundMessage(msg);
        }

        @Override
        @SuppressWarnings("unchecked")
        protected void decode(ChannelHandlerContext ctx, Object msg, List<Object> out) throws Exception {
            MessageToMessageCodec.this.decode(ctx, (INBOUND_IN) msg, out);
        }
    };

    /**
     * Decoder 的类型匹配器
     */
    private final TypeParameterMatcher inboundMsgMatcher;
    /**
     * Encoder 的类型匹配器
     */
    private final TypeParameterMatcher outboundMsgMatcher;

    protected MessageToMessageCodec() {
        inboundMsgMatcher = TypeParameterMatcher.find(this, MessageToMessageCodec.class, "INBOUND_IN");
        outboundMsgMatcher = TypeParameterMatcher.find(this, MessageToMessageCodec.class, "OUTBOUND_IN");
    }

    protected MessageToMessageCodec(Class<? extends INBOUND_IN> inboundMessageType, Class<? extends OUTBOUND_IN> outboundMessageType) {
        inboundMsgMatcher = TypeParameterMatcher.get(inboundMessageType);
        outboundMsgMatcher = TypeParameterMatcher.get(outboundMessageType);
    }
    
    // ...  省略非构造方法相关
}
```

## 4.2 MessageToMessageEncoder 相关方法

```
@Override
public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
    encoder.write(ctx, msg, promise);
}

/**
 * Returns {@code true} if and only if the specified message can be decoded by this codec.
 *
 * @param msg the message
 */
public boolean acceptInboundMessage(Object msg) throws Exception {
    return inboundMsgMatcher.match(msg);
}

/**
 * @see MessageToMessageEncoder#encode(ChannelHandlerContext, Object, List)
 */
protected abstract void encode(ChannelHandlerContext ctx, OUTBOUND_IN msg, List<Object> out) throws Exception;
```

## 4.3 MessageToMessageDecoder 相关方法

```
@Override
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
    decoder.channelRead(ctx, msg);
}

/**
 * Returns {@code true} if and only if the specified message can be encoded by this codec.
 *
 * @param msg the message
 */
public boolean acceptOutboundMessage(Object msg) throws Exception {
    return outboundMsgMatcher.match(msg);
}

/**
 * @see MessageToMessageDecoder#decode(ChannelHandlerContext, Object, List)
 */
protected abstract void decode(ChannelHandlerContext ctx, INBOUND_IN msg, List<Object> out) throws Exception;
```

# 666. 彩蛋

还是一篇小水文。嘿嘿。

推荐阅读文章：

- wade&luffy [《ChannelHandler》](https://www.cnblogs.com/wade-luffy/p/6222960.html)
- 堆码时刻 [《Netty In Action中文版 - 第八章：附带的ChannelHandler和Codec》](https://blog.csdn.net/abc_key/article/details/38061079)