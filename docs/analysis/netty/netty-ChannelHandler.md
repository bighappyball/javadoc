# ChannelHandler（一）之简介

# 1. 概述

在 [《精尽 Netty 源码分析 —— Netty 简介（二）之核心组件》](http://svip.iocoder.cn/Netty/intro-2/?self) 中，对 ChannelHandler 做了定义，我们再来回顾下：

> ChannelHandler ，连接通道处理器，我们使用 Netty 中**最常用**的组件。ChannelHandler 主要用来处理各种事件，这里的事件很广泛，比如可以是连接、数据接收、异常、数据转换等。

实际上，我们已经在前面的文章看了一遍又一遍 ChannelHandler 的身影，已经是熟悉的老朋友了。当然，我们还是会在这个**专属**于 ChannelHandler 章节里，再更加深入的认识 ChannelHandler 。

`io.netty.channel.ChannelHandler` ，Channel 处理器接口。代码如下：

```
public interface ChannelHandler {

    /**
     * Gets called after the {@link ChannelHandler} was added to the actual context and it's ready to handle events.
     *
     * ChannelHandler 已经成功被添加到 ChannelPipeline 中，可以进行处理事件。
     *
     * 该方法，一般用于 ChannelHandler 的初始化的逻辑
     */
    void handlerAdded(ChannelHandlerContext ctx) throws Exception;

    /**
     * Gets called after the {@link ChannelHandler} was removed from the actual context and it doesn't handle events
     * anymore.
     *
     * ChannelHandler 已经成功从 ChannelPipeline 中被移除，不再进行处理事件。
     *
     * 该方法，一般用于 ChannelHandler 的销毁的逻辑
     */
    void handlerRemoved(ChannelHandlerContext ctx) throws Exception;

    /**
     * Gets called if a {@link Throwable} was thrown.
     *
     * 抓取到异常。目前被废弃，移到 ChannelInboundHandler 接口中，作为对 Exception Inbound 事件的处理
     *
     * @deprecated is part of {@link ChannelInboundHandler}
     */
    @Deprecated
    void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception;

    /**
     * Indicates that the same instance of the annotated {@link ChannelHandler}
     * can be added to one or more {@link ChannelPipeline}s multiple times
     * without a race condition.
     * <p>
     * If this annotation is not specified, you have to create a new handler
     * instance every time you add it to a pipeline because it has unshared
     * state such as member variables.
     * <p>
     * This annotation is provided for documentation purpose, just like
     * <a href="http://www.javaconcurrencyinpractice.com/annotations/doc/">the JCIP annotations</a>.
     */
    @Inherited
    @Documented
    @Target(ElementType.TYPE)
    @Retention(RetentionPolicy.RUNTIME)
    @interface Sharable {
        // no value
    }

}
```

- 关于 `#handlerAdded(...)`、`#handlerRemoved(...)`、`#exceptionCaught(...)` 方法，胖友看方法上的注释。
- `@Sharable` 注解，ChannelHandler 是否可共享，即是否可以被**多次**添加。在 [《精尽 Netty 源码解析 —— ChannelPipeline（二）之添加 ChannelHandler》](http://svip.iocoder.cn/Netty/Pipeline-2-add-channel-handler?self) 的 [「3. checkMultiplicity」](http://svip.iocoder.cn/Netty/ChannelHandler-1-intro/#) 小节，已经有详细解析。

# 2. 核心类

ChannelHandler 的**核心类**的类图如下图：

[![核心类图](http://static.iocoder.cn/images/Netty/2018_10_01/01.png)](http://static.iocoder.cn/images/Netty/2018_10_01/01.png)核心类图

- ChannelInboundHandler ，在 [《精尽 Netty 源码解析 —— ChannelPipeline（五）之 Inbound 事件的传播》](http://svip.iocoder.cn/Netty/Pipeline-5-inbound) 有详细解析。

- ChannelOutboundHandler ，在 [《精尽 Netty 源码解析 —— ChannelPipeline（六）之 Outbound 事件的传播》](http://svip.iocoder.cn/Netty/Pipeline-6-outbound) 有详细解析。

- **红框**部分，ChannelHandler Adaptive 实现类，提供默认的骨架( Skeleton )实现。

- **绿框**部分，用于编解码消息的 ChannelHandler 实现类。关于这部分，我们会在 《Codec》专属的章节，而不是在《ChannelHandler》章节。

- 黄框

  部分

  - SimpleChannelInboundHandler ，抽象类，处理**指定类型**的消息。应用程序中，我们可以实现 SimpleChannelInboundHandler 后，实现对**指定类型**的消息的自定义处理。
  - Simple**UserEvent**ChannelHandler ，和 SimpleChannelInboundHandler 基本一致，差别在于将指定类型的消息，改成了制定类型的事件。
  - 详细解析，见 [《精尽 Netty 源码解析 —— ChannelHandler（三）之 SimpleChannelInboundHandler》](http://svip.iocoder.cn/Netty/ChannelHandler-3-SimpleChannelInboundHandler) 。

- ChannelInitializer ，一个**特殊**的 ChannelHandler ，用于 Channel 注册到 EventLoop 后，**执行自定义的初始化操作**。一般情况下，初始化自定义的 ChannelHandler 到 Channel 中。详细解析，见 [《精尽 Netty 源码解析 —— ChannelHandler（二）之 ChannelInitializer》](http://svip.iocoder.cn/Netty/ChannelHandler-2-ChannelInitializer) 。

# 3. ChannelHandlerAdaptive

在看看 ChannelHandlerAdaptive 的具体代码实现之前，我们先一起了解 ChannelHandlerAdaptive 的设计思想。在《Netty 权威指南》如是说：

> 对于大多数的 ChannelHandler 会选择性地拦截和处理某个或者某些事件，其他的事件会忽略，由下一个 ChannelHandler 进行拦截和处理。这就会导致一个问题：用户 ChannelHandler 必须要实现 ChannelHandler 的所有接口，包括它不关心的那些事件处理接口，这会导致用户代码的冗余和臃肿，代码的可维护性也会变差。
>
> 为了解决这个问题，Netty提供了ChannelHandlerAdapter基类，它的所有接口实现都是事件透传，如果用户ChannelHandler关心某个事件，只需要覆盖ChannelHandlerAdapter对应的方法即可，对于不关心的，可以直接继承使用父类的方法，这样子类的代码就会非常简洁和清晰。

😈 下面，我们看到的其它 Adaptive 实现类，也是这样的设计思想。

------

`io.netty.channel.ChannelHandlerAdapter` ，实现 ChannelHandler 接口，ChannelHandler Adapter 抽象类。

## 3.1 isSharable

```
// Not using volatile because it's used only for a sanity check.
/**
 * 是否已经初始化
 */
boolean added;

/**
 * Throws {@link IllegalStateException} if {@link ChannelHandlerAdapter#isSharable()} returns {@code true}
 */
protected void ensureNotSharable() {
    if (isSharable()) {
        throw new IllegalStateException("ChannelHandler " + getClass().getName() + " is not allowed to be shared");
    }
}

/**
 * Return {@code true} if the implementation is {@link Sharable} and so can be added
 * to different {@link ChannelPipeline}s.
 */
public boolean isSharable() {
    /**
     * Cache the result of {@link Sharable} annotation detection to workaround a condition. We use a
     * {@link ThreadLocal} and {@link WeakHashMap} to eliminate the volatile write/reads. Using different
     * {@link WeakHashMap} instances per {@link Thread} is good enough for us and the number of
     * {@link Thread}s are quite limited anyway.
     *
     * See <a href="https://github.com/netty/netty/issues/2289">#2289</a>.
     */
    Class<?> clazz = getClass();
    Map<Class<?>, Boolean> cache = InternalThreadLocalMap.get().handlerSharableCache();
    Boolean sharable = cache.get(clazz);
    if (sharable == null) {
        sharable = clazz.isAnnotationPresent(Sharable.class);
        cache.put(clazz, sharable);
    }
    return sharable;
}
```

- 这块内容，和 `@Sharable` 注解相关。在 [《精尽 Netty 源码解析 —— ChannelPipeline（二）之添加 ChannelHandler》](http://svip.iocoder.cn/Netty/Pipeline-2-add-channel-handler?self) 的 [「3. checkMultiplicity」](http://svip.iocoder.cn/Netty/ChannelHandler-1-intro/#) 小节，已经有详细解析。

## 3.2 具体实现

```
/**
 * Do nothing by default, sub-classes may override this method.
 */
@Override
public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
    // NOOP
}

/**
 * Do nothing by default, sub-classes may override this method.
 */
@Override
public void handlerRemoved(ChannelHandlerContext ctx) throws Exception {
    // NOOP
}

/**
 * Calls {@link ChannelHandlerContext#fireExceptionCaught(Throwable)} to forward
 * to the next {@link ChannelHandler} in the {@link ChannelPipeline}.
 *
 * Sub-classes may override this method to change behavior.
 */
@Override
public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
    ctx.fireExceptionCaught(cause);
}
```

- 对于 `#handlerAdded(ChannelHandlerContext ctx)` 和 `#handlerRemoved(ChannelHandlerContext ctx)` 方法，默认无任何逻辑。子类如果有自定义的逻辑，可以进行覆写对应的方法。
- `#exceptionCaught(ChannelHandlerContext ctx, Throwable cause)` 方法，直接转发到下一个节点，**实际上**也是默认无任何逻辑。子类如果有自定义的逻辑，可以进行覆写对应的方法。

# 4. ChannelOutboundHandlerAdapter

`io.netty.channel.ChannelOutboundHandlerAdapter` ，实现 ChannelOutboundHandler 接口，继承 ChannelHandlerAdapter 抽象类，ChannelOutboundHandler Adapter 实现类。代码如下：

```
public class ChannelOutboundHandlerAdapter extends ChannelHandlerAdapter implements ChannelOutboundHandler {

    /**
     * Calls {@link ChannelHandlerContext#bind(SocketAddress, ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void bind(ChannelHandlerContext ctx, SocketAddress localAddress, ChannelPromise promise) throws Exception {
        ctx.bind(localAddress, promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#connect(SocketAddress, SocketAddress, ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void connect(ChannelHandlerContext ctx, SocketAddress remoteAddress, SocketAddress localAddress, ChannelPromise promise) throws Exception {
        ctx.connect(remoteAddress, localAddress, promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#disconnect(ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void disconnect(ChannelHandlerContext ctx, ChannelPromise promise) throws Exception {
        ctx.disconnect(promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#close(ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void close(ChannelHandlerContext ctx, ChannelPromise promise) throws Exception {
        ctx.close(promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#deregister(ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void deregister(ChannelHandlerContext ctx, ChannelPromise promise) throws Exception {
        ctx.deregister(promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#read()} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void read(ChannelHandlerContext ctx) throws Exception {
        ctx.read();
    }

    /**
     * Calls {@link ChannelHandlerContext#write(Object, ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
        ctx.write(msg, promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#flush()} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void flush(ChannelHandlerContext ctx) throws Exception {
        ctx.flush();
    }

}
```

- 每个实现方法，直接转发到下一个节点，**实际上**也是默认无任何逻辑。子类如果有自定义的逻辑，可以进行覆写对应的方法。

# 5. ChannelInboundHandlerAdapter

`io.netty.channel.ChannelInboundHandlerAdapter` ，实现 ChannelInboundHandler 接口，继承 ChannelHandlerAdapter 抽象类，ChannelInboundHandler Adapter 实现类。代码如下：

```
public class ChannelInboundHandlerAdapter extends ChannelHandlerAdapter implements ChannelInboundHandler {

    /**
     * Calls {@link ChannelHandlerContext#fireChannelRegistered()} to forward
     * to the next {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void channelRegistered(ChannelHandlerContext ctx) throws Exception {
        ctx.fireChannelRegistered();
    }

    /**
     * Calls {@link ChannelHandlerContext#fireChannelUnregistered()} to forward
     * to the next {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void channelUnregistered(ChannelHandlerContext ctx) throws Exception {
        ctx.fireChannelUnregistered();
    }

    /**
     * Calls {@link ChannelHandlerContext#fireChannelActive()} to forward
     * to the next {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        ctx.fireChannelActive();
    }

    /**
     * Calls {@link ChannelHandlerContext#fireChannelInactive()} to forward
     * to the next {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void channelInactive(ChannelHandlerContext ctx) throws Exception {
        ctx.fireChannelInactive();
    }

    /**
     * Calls {@link ChannelHandlerContext#fireChannelRead(Object)} to forward
     * to the next {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        ctx.fireChannelRead(msg);
    }

    /**
     * Calls {@link ChannelHandlerContext#fireChannelReadComplete()} to forward
     * to the next {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void channelReadComplete(ChannelHandlerContext ctx) throws Exception {
        ctx.fireChannelReadComplete();
    }

    /**
     * Calls {@link ChannelHandlerContext#fireUserEventTriggered(Object)} to forward
     * to the next {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        ctx.fireUserEventTriggered(evt);
    }

    /**
     * Calls {@link ChannelHandlerContext#fireChannelWritabilityChanged()} to forward
     * to the next {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void channelWritabilityChanged(ChannelHandlerContext ctx) throws Exception {
        ctx.fireChannelWritabilityChanged();
    }

    /**
     * Calls {@link ChannelHandlerContext#fireExceptionCaught(Throwable)} to forward
     * to the next {@link ChannelHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        ctx.fireExceptionCaught(cause);
    }
    
}
```

- 每个实现方法，直接转发到下一个节点，**实际上**也是默认无任何逻辑。子类如果有自定义的逻辑，可以进行覆写对应的方法。

# 6. ChannelDuplexHandler

`io.netty.channel.ChannelDuplexHandler` ，实现 ChannelOutboundHandler 接口，继承 ChannelInboundHandlerAdapter 抽象类，Channel Duplex Handler 实现类，支持对 Inbound 和 Outbound 事件的 Adaptive 处理，所以命名上带有“**Duplex**”( 双重 )。代码如下：

```
public class ChannelDuplexHandler extends ChannelInboundHandlerAdapter implements ChannelOutboundHandler {

    /**
     * Calls {@link ChannelHandlerContext#bind(SocketAddress, ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void bind(ChannelHandlerContext ctx, SocketAddress localAddress, ChannelPromise promise) throws Exception {
        ctx.bind(localAddress, promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#connect(SocketAddress, SocketAddress, ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void connect(ChannelHandlerContext ctx, SocketAddress remoteAddress, SocketAddress localAddress, ChannelPromise promise) throws Exception {
        ctx.connect(remoteAddress, localAddress, promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#disconnect(ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void disconnect(ChannelHandlerContext ctx, ChannelPromise promise) throws Exception {
        ctx.disconnect(promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#close(ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void close(ChannelHandlerContext ctx, ChannelPromise promise) throws Exception {
        ctx.close(promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#close(ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void deregister(ChannelHandlerContext ctx, ChannelPromise promise) throws Exception {
        ctx.deregister(promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#read()} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void read(ChannelHandlerContext ctx) throws Exception {
        ctx.read();
    }

    /**
     * Calls {@link ChannelHandlerContext#write(Object, ChannelPromise)} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
        ctx.write(msg, promise);
    }

    /**
     * Calls {@link ChannelHandlerContext#flush()} to forward
     * to the next {@link ChannelOutboundHandler} in the {@link ChannelPipeline}.
     *
     * Sub-classes may override this method to change behavior.
     */
    @Override
    public void flush(ChannelHandlerContext ctx) throws Exception {
        ctx.flush();
    }

}
```

- 实现代码上，和 [「4. ChannelOutboundHandlerAdapter」](http://svip.iocoder.cn/Netty/ChannelHandler-1-intro/#) 是一致的。因为 Java 不支持**多继承**的特性，所以不得又重新实现一遍。

😈 大多数情况下，我们会实现 ChannelDuplexHandler 类，覆写部分方法，处理对应的事件。

# 666. 彩蛋

小小水文一篇，主要帮胖友梳理下，对 ChannelHandler 有整体的认识。在后续的文章中，我们会看具体的一个一个 ChannelHandler 的带有“业务”的实现类。

推荐阅读如下文章：

- Hypercube [《自顶向下深入分析Netty（八）–ChannelHandler》](https://www.jianshu.com/p/a9bcd89553f5)

# ChannelHandler（二）之 ChannelInitializer

# 1. 概述

本文，我们来分享 **ChannelInitializer** 。它是一个**特殊**的ChannelInboundHandler 实现类，用于 Channel 注册到 EventLoop 后，**执行自定义的初始化操作**。一般情况下，初始化自定义的 ChannelHandler 到 Channel 中。例如：

- 在 [《精尽 Netty 源码分析 —— 启动（一）之服务端》](http://svip.iocoder.cn/Netty/bootstrap-1-server) 一文中，ServerBootstrap 初始化时，通过 ChannelInitializer 初始化了用于接受( accept )新连接的 ServerBootstrapAcceptor 。
- 在有新连接接入时，服务端通过 ChannelInitializer 初始化，为客户端的 Channel 添加自定义的 ChannelHandler ，用于处理该 Channel 的读写( read/write ) 事件。

OK，让我们看看具体的代码实现落。

# 2. ChannelInitializer

`io.netty.channel.ChannelInitializer` ，继承 ChannelInboundHandlerAdapter 类，Channel Initializer **抽象类**。代码如下：

```
@Sharable
public abstract class ChannelInitializer<C extends Channel> extends ChannelInboundHandlerAdapter {
```

- 通过 `@Sharable` 注解，支持共享。

## 2.1 initChannel

`#initChannel(ChannelHandlerContext ctx)` 方法，执行行自定义的初始化操作。代码如下：

```
// We use a ConcurrentMap as a ChannelInitializer is usually shared between all Channels in a Bootstrap /
// ServerBootstrap. This way we can reduce the memory usage compared to use Attributes.
/**
 * 由于 ChannelInitializer 可以在 Bootstrap/ServerBootstrap 的所有通道中共享，所以我们用一个 ConcurrentMap 作为初始化器。
 * 这种方式，相对于使用 {@link io.netty.util.Attribute} 方式，减少了内存的使用。
 */
private final ConcurrentMap<ChannelHandlerContext, Boolean> initMap = PlatformDependent.newConcurrentHashMap();

  1: private boolean initChannel(ChannelHandlerContext ctx) throws Exception {
  2:     if (initMap.putIfAbsent(ctx, Boolean.TRUE) == null) { // Guard against re-entrance. 解决并发问题
  3:         try {
  4:             // 初始化通道
  5:             initChannel((C) ctx.channel());
  6:         } catch (Throwable cause) {
  7:             // 发生异常时，执行异常处理
  8:             // Explicitly call exceptionCaught(...) as we removed the handler before calling initChannel(...).
  9:             // We do so to prevent multiple calls to initChannel(...).
 10:             exceptionCaught(ctx, cause);
 11:         } finally {
 12:             // 从 pipeline 移除 ChannelInitializer
 13:             remove(ctx);
 14:         }
 15:         return true; // 初始化成功
 16:     }
 17:     return false; // 初始化失败
 18: }
```

- 第 2 行：通过 `initMap` 属性，解决并发问题。对应 Netty Git 提交是 https://github.com/netty/netty/commit/26aa34853a8974d212e12b98e708790606bea5fa 。

- 第 5 行：调用 `#initChannel(C ch)` **抽象**方法，执行行自定义的初始化操作。代码如下：

  ```
  /**
   * This method will be called once the {@link Channel} was registered. After the method returns this instance
   * will be removed from the {@link ChannelPipeline} of the {@link Channel}.
   *
   * @param ch            the {@link Channel} which was registered.
   * @throws Exception    is thrown if an error occurs. In that case it will be handled by
   *                      {@link #exceptionCaught(ChannelHandlerContext, Throwable)} which will by default close
   *                      the {@link Channel}.
   */
  protected abstract void initChannel(C ch) throws Exception;
  ```

  - 子类继承 ChannelInitializer 抽象类后，实现该方法，自定义 Channel 的初始化逻辑。

- 第 6 至 10 行：调用 `#exceptionCaught(ChannelHandlerContext ctx, Throwable cause)` 方法，发生异常时，执行异常处理。代码如下：

  ```
  /**
   * Handle the {@link Throwable} by logging and closing the {@link Channel}. Sub-classes may override this.
   */
  @Override
  public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
      if (logger.isWarnEnabled()) {
          logger.warn("Failed to initialize a channel. Closing: " + ctx.channel(), cause);
      }
      ctx.close();
  }
  ```

  - 打印**告警**日志。
  - **关闭** Channel 通道。因为，初始化 Channel 通道发生异常，意味着很大可能，无法正常处理该 Channel 后续的读写事件。
  - 😈 当然，`#exceptionCaught(...)` 方法，并非使用 `final` 修饰。所以也可以在子类覆写该方法。当然，笔者在实际使用并未这么做过。

- 第 11 至 14 行：最终，调用 `#remove(ChannelHandlerContext ctx)` 方法，从 pipeline 移除 ChannelInitializer。代码如下：

  ```
  private void remove(ChannelHandlerContext ctx) {
      try {
          // 从 pipeline 移除 ChannelInitializer
          ChannelPipeline pipeline = ctx.pipeline();
          if (pipeline.context(this) != null) {
              pipeline.remove(this);
          }
      } finally {
          initMap.remove(ctx); // 从 initMap 移除
      }
  }
  ```

  - 从 pipeline 移除 ChannelInitializer 后，避免重新初始化的问题。

- 第 15 行：返回 `true` ，表示**有**执行初始化。

- 第 17 行：返回 `false` ，表示**未**执行初始化。

## 2.2 channelRegistered

在 Channel 注册到 EventLoop 上后，会触发 Channel Registered 事件。那么 `ChannelInitializer` 的 `#channelRegistered(ChannelHandlerContext ctx)` 方法，就会处理该事件。而 ChannelInitializer 对该事件的处理逻辑是，初始化 Channel 。代码如下：

```
@Override
@SuppressWarnings("unchecked")
public final void channelRegistered(ChannelHandlerContext ctx) throws Exception {
    // Normally this method will never be called as handlerAdded(...) should call initChannel(...) and remove
    // the handler.
    // <1> 初始化 Channel
    if (initChannel(ctx)) {
        // we called initChannel(...) so we need to call now pipeline.fireChannelRegistered() to ensure we not
        // miss an event.
        // <2.1> 重新触发 Channel Registered 事件
        ctx.pipeline().fireChannelRegistered();
    } else {
        // <2.2> 继续向下一个节点的 Channel Registered 事件
        // Called initChannel(...) before which is the expected behavior, so just forward the event.
        ctx.fireChannelRegistered();
    }
}
```

- `<1>` 处，调用 `#initChannel(ChannelHandlerContext ctx)` 方法，初始化 Channel 。
- `<2.1>` 处，若有初始化，**重新触发** Channel Registered 事件。因为，很有可能添加了新的 ChannelHandler 到 pipeline 中。
- `<2.2>` 处，若无初始化，**继续向下一个节点**的 Channel Registered 事件。

## 2.3 handlerAdded

`ChannelInitializer#handlerAdded(ChannelHandlerContext ctx)` 方法，代码如下：

```
@Override
public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
    if (ctx.channel().isRegistered()) { // 已注册
        // This should always be true with our current DefaultChannelPipeline implementation.
        // The good thing about calling initChannel(...) in handlerAdded(...) is that there will be no ordering
        // surprises if a ChannelInitializer will add another ChannelInitializer. This is as all handlers
        // will be added in the expected order.
        initChannel(ctx);
    }
}
```

- 诶？怎么这里又调用了 `#initChannel(ChannelHandlerContext ctx)` 方法，初始化 Channel 呢？实际上，绝绝绝大多数情况下，因为 Channel Registered 事件触发在 Added **之后**，如果说在 `#handlerAdded(ChannelHandlerContext ctx)` 方法中，初始化 Channel 完成，那么 ChannelInitializer 便会从 pipeline 中移除。也就说，不会执行 `#channelRegistered(ChannelHandlerContext ctx)` 方法。

- ↑↑↑ 上面这段话听起来非常绕噢。简单来说，ChannelInitializer 调用 `#initChannel(ChannelHandlerContext ctx)` 方法，初始化 Channel 的调用来源，是来自 `#handlerAdded(...)` 方法，而不是 `#channelRegistered(...)` 方法。

- 还是不理解？胖友在

   

  ```
  #handlerAdded(ChannelHandlerContext ctx)
  ```

   

  方法上打上“

  断点

  ”，并调试启动

   

  ```
  io.netty.example.echo.EchoServer
  ```

   

  ，就能触发这种情况。原因是什么呢？如下图所示：

  ![register0](http://static.iocoder.cn/images/Netty/2018_10_04/02.png)

  register0

  - 😈 红框部分，看到否？明白了哇。

至于说，什么时候使用 ChannelInitializer 调用 `#initChannel(ChannelHandlerContext ctx)` 方法，初始化 Channel 的调用来源，是来自 `#channelRegistered(...)` 方法，笔者暂未发现。如果有知道的胖友，麻烦深刻教育我下。

TODO 1020 ChannelInitializer 对 channelRegistered 的触发

# 666. 彩蛋

小水文一篇。同时也推荐阅读：

- Donald_Draper [《netty 通道初始化器ChannelInitializer》](http://donald-draper.iteye.com/blog/2389352)

# ChannelHandler（三）之 SimpleChannelInboundHandler

# 1. 概述

在本文，我们来分享 SimpleChannelInboundHandler 处理器。考虑到 Simple**UserEvent**ChannelHandler 和 SimpleChannelInboundHandler 的实现基本一致，所以也会在本文中分享。

如果胖友对 SimpleChannelInboundHandler 的使用不了解，请先看下 [《一起学Netty（三）之 SimpleChannelInboundHandler》](https://blog.csdn.net/linuu/article/details/51307060) ，嘿嘿。

# 2. SimpleChannelInboundHandler

`io.netty.channel.SimpleChannelInboundHandler` ，继承 ChannelInboundHandlerAdapter 类，抽象类，处理**指定类型**的消息。应用程序中，我们可以实现 SimpleChannelInboundHandler 后，实现对**指定类型**的消息的自定义处理。

## 2.1 构造方法

```
public abstract class SimpleChannelInboundHandler<I> extends ChannelInboundHandlerAdapter {

    /**
     * 类型匹配器
     */
    private final TypeParameterMatcher matcher;
    /**
     * 使用完消息，是否自动释放
     *
     * @see #channelRead(ChannelHandlerContext, Object)
     */
    private final boolean autoRelease;

    /**
     * see {@link #SimpleChannelInboundHandler(boolean)} with {@code true} as boolean parameter.
     */
    protected SimpleChannelInboundHandler() {
        this(true);
    }

    /**
     * Create a new instance which will try to detect the types to match out of the type parameter of the class.
     *
     * @param autoRelease   {@code true} if handled messages should be released automatically by passing them to
     *                      {@link ReferenceCountUtil#release(Object)}.
     */
    protected SimpleChannelInboundHandler(boolean autoRelease) {
        // <1> 获得 matcher
        matcher = TypeParameterMatcher.find(this, SimpleChannelInboundHandler.class, "I");
        this.autoRelease = autoRelease;
    }

    /**
     * see {@link #SimpleChannelInboundHandler(Class, boolean)} with {@code true} as boolean value.
     */
    protected SimpleChannelInboundHandler(Class<? extends I> inboundMessageType) {
        this(inboundMessageType, true);
    }

    /**
     * Create a new instance
     *
     * @param inboundMessageType    The type of messages to match
     * @param autoRelease           {@code true} if handled messages should be released automatically by passing them to
     *                              {@link ReferenceCountUtil#release(Object)}.
     */
    protected SimpleChannelInboundHandler(Class<? extends I> inboundMessageType, boolean autoRelease) {
        // <2> 获得 matcher
        matcher = TypeParameterMatcher.get(inboundMessageType);
        this.autoRelease = autoRelease;
    }
    
    // ... 省略其它方法
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
  - 在大多数情况下，我们不太需要特别详细的了解 `io.netty.util.internal.TypeParameterMatcher` 的代码实现，感兴趣的胖友可以自己看看 [《netty 简单Inbound通道处理器（SimpleChannelInboundHandler）》](http://donald-draper.iteye.com/blog/2387772) 的 [「TypeParameterMatcher」](http://svip.iocoder.cn/Netty/ChannelHandler-3-SimpleChannelInboundHandler/#) 部分。

- `autoRelease` 属性，使用完消息，是否自动释放。

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

## 2.3 channelRead

```
 1: @Override
 2: public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
 3:     // 是否要释放消息
 4:     boolean release = true;
 5:     try {
 6:         // 判断是否为匹配的消息
 7:         if (acceptInboundMessage(msg)) {
 8:             @SuppressWarnings("unchecked")
 9:             I imsg = (I) msg;
10:             // 处理消息
11:             channelRead0(ctx, imsg);
12:         } else {
13:             // 不需要释放消息
14:             release = false;
15:             // 触发 Channel Read 到下一个节点
16:             ctx.fireChannelRead(msg);
17:         }
18:     } finally {
19:         // 判断，是否要释放消息
20:         if (autoRelease && release) {
21:             ReferenceCountUtil.release(msg);
22:         }
23:     }
24: }
```

- 第 4 行：`release` 属性，是否需要释放消息。

- 第 7 行：调用 `#acceptInboundMessage(Object msg)` 方法，判断是否为匹配的消息。

  - ① **匹配**，调用 `#channelRead0(ChannelHandlerContext ctx, I msg)` **抽象**方法，处理消息。代码如下：

    ```
    /**
     * <strong>Please keep in mind that this method will be renamed to
     * {@code messageReceived(ChannelHandlerContext, I)} in 5.0.</strong>
     *
     * Is called for each message of type {@link I}.
     *
     * @param ctx           the {@link ChannelHandlerContext} which this {@link SimpleChannelInboundHandler}
     *                      belongs to
     * @param msg           the message to handle
     * @throws Exception    is thrown if an error occurred
     */
    protected abstract void channelRead0(ChannelHandlerContext ctx, I msg) throws Exception;
    ```

    - 子类实现 SimpleChannelInboundHandler 类后，实现该方法，就能很方便的处理消息。

  - ② **不匹配**，标记不需要释放消息，并触发 Channel Read 到**下一个节点**。

- 第 18 至 23 行：通过 `release` 变量 + `autoRelease` 属性，判断是否需要释放消息。若需要，调用 `ReferenceCountUtil#release(Object msg)` 方法，释放消息。😈 还是蛮方便的。

# 3. SimpleUserEventChannelHandler

`io.netty.channel.SimpleUserEventChannelHandler` ，继承 ChannelInboundHandlerAdapter 类，抽象类，处理**指定事件**的消息。

SimpleUserEventChannelHandler 和 SimpleChannelInboundHandler 基本一致，差别在于将指定类型的消息，改成了制定类型的事件。😈 所以，笔者就不详细解析了。

代码如下：

```
public abstract class SimpleUserEventChannelHandler<I> extends ChannelInboundHandlerAdapter {

    /**
     * 类型匹配器
     */
    private final TypeParameterMatcher matcher;
    /**
     * 使用完消息，是否自动释放
     *
     * @see #channelRead(ChannelHandlerContext, Object)
     */
    private final boolean autoRelease;

    /**
     * see {@link #SimpleUserEventChannelHandler(boolean)} with {@code true} as boolean parameter.
     */
    protected SimpleUserEventChannelHandler() {
        this(true);
    }

    /**
     * Create a new instance which will try to detect the types to match out of the type parameter of the class.
     *
     * @param autoRelease   {@code true} if handled events should be released automatically by passing them to
     *                      {@link ReferenceCountUtil#release(Object)}.
     */
    protected SimpleUserEventChannelHandler(boolean autoRelease) {
        matcher = TypeParameterMatcher.find(this, SimpleUserEventChannelHandler.class, "I");
        this.autoRelease = autoRelease;
    }

    /**
     * see {@link #SimpleUserEventChannelHandler(Class, boolean)} with {@code true} as boolean value.
     */
    protected SimpleUserEventChannelHandler(Class<? extends I> eventType) {
        this(eventType, true);
    }

    /**
     * Create a new instance
     *
     * @param eventType      The type of events to match
     * @param autoRelease    {@code true} if handled events should be released automatically by passing them to
     *                       {@link ReferenceCountUtil#release(Object)}.
     */
    protected SimpleUserEventChannelHandler(Class<? extends I> eventType, boolean autoRelease) {
        matcher = TypeParameterMatcher.get(eventType);
        this.autoRelease = autoRelease;
    }

    /**
     * Returns {@code true} if the given user event should be handled. If {@code false} it will be passed to the next
     * {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     */
    protected boolean acceptEvent(Object evt) throws Exception {
        return matcher.match(evt);
    }

    @Override
    public final void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        // 是否要释放消息
        boolean release = true;
        try {
            // 判断是否为匹配的消息
            if (acceptEvent(evt)) {
                @SuppressWarnings("unchecked")
                I ievt = (I) evt;
                // 处理消息
                eventReceived(ctx, ievt);
            } else {
                // 不需要释放消息
                release = false;
                // 触发 Channel Read 到下一个节点
                ctx.fireUserEventTriggered(evt);
            }
        } finally {
            // 判断，是否要释放消息
            if (autoRelease && release) {
                ReferenceCountUtil.release(evt);
            }
        }
    }

    /**
     * Is called for each user event triggered of type {@link I}.
     *
     * @param ctx the {@link ChannelHandlerContext} which this {@link SimpleUserEventChannelHandler} belongs to
     * @param evt the user event to handle
     *
     * @throws Exception is thrown if an error occurred
     */
    protected abstract void eventReceived(ChannelHandlerContext ctx, I evt) throws Exception;

}
```

# 666. 彩蛋

木有彩蛋，hoho 。

# ChannelHandler（四）之 LoggingHandler

# 1. 概述

在 `netty-handler` 模块中，提供了多种 ChannelHandler 的实现类。如下图所示：[![`netty-handler`](http://static.iocoder.cn/images/Netty/2018_10_10/01.png)](http://static.iocoder.cn/images/Netty/2018_10_10/01.png)`netty-handler`

- 每个 `package` 包，对应一个**功能特性**的 ChannelHandler 实现。

本文，我们来分享 `logger` 包下 `logging` 包的 LoggerHandler 。

# 2. LogLevel

`io.netty.handler.logging.LogLevel` ，日志级别枚举类。代码如下：

```
/**
 * Maps the regular {@link LogLevel}s with the {@link InternalLogLevel} ones.
 */
public enum LogLevel {

    TRACE(InternalLogLevel.TRACE),
    DEBUG(InternalLogLevel.DEBUG),
    INFO(InternalLogLevel.INFO),
    WARN(InternalLogLevel.WARN),
    ERROR(InternalLogLevel.ERROR);

    /**
     * Netty 内部日志级别
     */
    private final InternalLogLevel internalLevel;

    LogLevel(InternalLogLevel internalLevel) {
        this.internalLevel = internalLevel;
    }

    /**
     * For internal use only.
     *
     * <p/>Converts the specified {@link LogLevel} to its {@link InternalLogLevel} variant.
     *
     * @return the converted level.
     */
    public InternalLogLevel toInternalLevel() {
        return internalLevel;
    }

}
```

- Netty 提供了一套日志框架，方便接入 slf4j、log4j、jdk logger 等等日志框架。感兴趣的胖友，可以看看 [《Netty4.x Internal Logger机制》](https://segmentfault.com/a/1190000005797595) 。😈 现在，不看也不影响对本文的理解。
- LogLevel 实现对 `io.netty.util.internal.logging.InternalLogLevel` 的**一一**映射。笔者暂时看不出有什么神奇的用途，难道是为了可以灵活的修改映射关系？！有了解的胖友，可以深刻教育下我噢。

# 3. LoggingHandler

`io.netty.handler.logging.LoggingHandler` ，继承 ChannelDuplexHandler 类，日志处理器，对 Inbound/Outbound 事件进行日志的记录。一般情况下，用于开发测试时的调试之用。

## 3.1 构造方法

```
@Sharable
public class LoggingHandler extends ChannelDuplexHandler {

    /**
     * 默认 {@link #level} 日志级别
     */
    private static final LogLevel DEFAULT_LEVEL = LogLevel.DEBUG;

    /**
     * Netty 内部 Logger 对象
     */
    protected final InternalLogger logger;
    /**
     * Netty 内部 LogLevel 级别
     */
    protected final InternalLogLevel internalLevel;

    /**
     * 配置的 LogLevel 级别
     */
    private final LogLevel level;

    /**
     * Creates a new instance whose logger name is the fully qualified class
     * name of the instance with hex dump enabled.
     */
    public LoggingHandler() {
        this(DEFAULT_LEVEL);
    }

    /**
     * Creates a new instance whose logger name is the fully qualified class
     * name of the instance.
     *
     * @param level the log level
     */
    public LoggingHandler(LogLevel level) {
        if (level == null) {
            throw new NullPointerException("level");
        }

        // 获得 logger
        logger = InternalLoggerFactory.getInstance(getClass());
        this.level = level;
        internalLevel = level.toInternalLevel();
    }

    /**
     * Creates a new instance with the specified logger name and with hex dump
     * enabled.
     *
     * @param clazz the class type to generate the logger for
     */
    public LoggingHandler(Class<?> clazz) {
        this(clazz, DEFAULT_LEVEL);
    }

    /**
     * Creates a new instance with the specified logger name.
     *
     * @param clazz the class type to generate the logger for
     * @param level the log level
     */
    public LoggingHandler(Class<?> clazz, LogLevel level) {
        if (clazz == null) {
            throw new NullPointerException("clazz");
        }
        if (level == null) {
            throw new NullPointerException("level");
        }

        // 获得 logger
        logger = InternalLoggerFactory.getInstance(clazz);
        this.level = level;
        internalLevel = level.toInternalLevel();
    }

    /**
     * Creates a new instance with the specified logger name using the default log level.
     *
     * @param name the name of the class to use for the logger
     */
    public LoggingHandler(String name) {
        this(name, DEFAULT_LEVEL);
    }

    /**
     * Creates a new instance with the specified logger name.
     *
     * @param name the name of the class to use for the logger
     * @param level the log level
     */
    public LoggingHandler(String name, LogLevel level) {
        if (name == null) {
            throw new NullPointerException("name");
        }
        if (level == null) {
            throw new NullPointerException("level");
        }

        // 获得 logger
        logger = InternalLoggerFactory.getInstance(name);
        this.level = level;
        internalLevel = level.toInternalLevel();
    }
    
    // ... 省略其他方法
}
```

- 通过 `@Sharable` 注解，支持共享。

- ```
  level
  ```

   

  属性，配置的 LogLevel 级别。

  - `DEFAULT_LEVEL` **静态**属性，默认的 `level` 级别。构造方法如果未传递 `LogLevel level` 方法参数，则使用默认值。
  - `internalLevel` 属性，Netty 内部 LogLevel 级别。通过 `LogLevel#toInternalLevel()` 方法，将 `level` 转化成 `internalLevel` 。

- `logger` 属性，Netty 内部 Logger 对象。通过 `Class<?> clazz` 或 `String name` 方法参数，进行获得。

## 3.2 具体实现

```
@Override
public void channelRegistered(ChannelHandlerContext ctx) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "REGISTERED"));
    }
    //
    ctx.fireChannelRegistered();
}

@Override
public void channelUnregistered(ChannelHandlerContext ctx) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "UNREGISTERED"));
    }
    ctx.fireChannelUnregistered();
}

@Override
public void channelActive(ChannelHandlerContext ctx) throws Exception {
    // 打印日志
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "ACTIVE"));
    }
    // 传递 Channel active 事件，给下一个节点
    ctx.fireChannelActive();
}

@Override
public void channelInactive(ChannelHandlerContext ctx) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "INACTIVE"));
    }
    ctx.fireChannelInactive();
}

@Override
public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "EXCEPTION", cause), cause);
    }
    ctx.fireExceptionCaught(cause);
}

@Override
public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "USER_EVENT", evt));
    }
    ctx.fireUserEventTriggered(evt);
}

@Override
public void bind(ChannelHandlerContext ctx, SocketAddress localAddress, ChannelPromise promise) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "BIND", localAddress));
    }
    ctx.bind(localAddress, promise);
}

@Override
public void connect(
        ChannelHandlerContext ctx,
        SocketAddress remoteAddress, SocketAddress localAddress, ChannelPromise promise) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "CONNECT", remoteAddress, localAddress));
    }
    ctx.connect(remoteAddress, localAddress, promise);
}

@Override
public void disconnect(ChannelHandlerContext ctx, ChannelPromise promise) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "DISCONNECT"));
    }
    ctx.disconnect(promise);
}

@Override
public void close(ChannelHandlerContext ctx, ChannelPromise promise) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "CLOSE"));
    }
    ctx.close(promise);
}

@Override
public void deregister(ChannelHandlerContext ctx, ChannelPromise promise) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "DEREGISTER"));
    }
    ctx.deregister(promise);
}

@Override
public void channelReadComplete(ChannelHandlerContext ctx) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "READ COMPLETE"));
    }
    ctx.fireChannelReadComplete();
}

@Override
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "READ", msg));
    }
    ctx.fireChannelRead(msg);
}

@Override
public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "WRITE", msg));
    }
    ctx.write(msg, promise);
}

@Override
public void channelWritabilityChanged(ChannelHandlerContext ctx) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "WRITABILITY CHANGED"));
    }
    ctx.fireChannelWritabilityChanged();
}

@Override
public void flush(ChannelHandlerContext ctx) throws Exception {
    if (logger.isEnabled(internalLevel)) {
        logger.log(internalLevel, format(ctx, "FLUSH"));
    }
    ctx.flush();
}
```

里面的每个方法，都是使用 `logger` 打印日志，并继续传播事件到下一个节点。

而打印的日志的格式，通过 `#format(...)` 方法，进行拼接。

## 3.3 format

`#format(...)` 方法，根据参数的不同，分成三种。

① `#format(ChannelHandlerContext ctx, String eventName)` 方法，代码如下：

```
/**
 * Formats an event and returns the formatted message.
 *
 * @param eventName the name of the event
 */
protected String format(ChannelHandlerContext ctx, String eventName) {
    String chStr = ctx.channel().toString();
    return new StringBuilder(chStr.length() + 1 + eventName.length())
        .append(chStr)
        .append(' ')
        .append(eventName)
        .toString();
}
```

② `#format(ChannelHandlerContext ctx, String eventName, Object arg)` 方法，代码如下：

```
/**
 * Formats an event and returns the formatted message.
 *
 * @param eventName the name of the event
 * @param arg       the argument of the event
 */
protected String format(ChannelHandlerContext ctx, String eventName, Object arg) {
    if (arg instanceof ByteBuf) {
        return formatByteBuf(ctx, eventName, (ByteBuf) arg);
    } else if (arg instanceof ByteBufHolder) {
        return formatByteBufHolder(ctx, eventName, (ByteBufHolder) arg);
    } else {
        return formatSimple(ctx, eventName, arg);
    }
}
```

- 根据参数不同，会调用不同的 format 方法。

③ `#format(ChannelHandlerContext ctx, String eventName, Object firstArg, Object secondArg)` 方法，代码如下：

```
/**
 * Formats an event and returns the formatted message.  This method is currently only used for formatting
 * {@link ChannelOutboundHandler#connect(ChannelHandlerContext, SocketAddress, SocketAddress, ChannelPromise)}.
 *
 * @param eventName the name of the event
 * @param firstArg  the first argument of the event
 * @param secondArg the second argument of the event
 */
protected String format(ChannelHandlerContext ctx, String eventName, Object firstArg, Object secondArg) {
    if (secondArg == null) {
        return formatSimple(ctx, eventName, firstArg);
    }

    String chStr = ctx.channel().toString();
    String arg1Str = String.valueOf(firstArg);
    String arg2Str = secondArg.toString();
    StringBuilder buf = new StringBuilder(
            chStr.length() + 1 + eventName.length() + 2 + arg1Str.length() + 2 + arg2Str.length());
    buf.append(chStr).append(' ').append(eventName).append(": ").append(arg1Str).append(", ").append(arg2Str);
    return buf.toString();
}
```

### 3.3.1 formatByteBuf

`#formatByteBuf(ChannelHandlerContext ctx, String eventName, ByteBuf msg)` 方法，代码如下：

```
/**
 * Generates the default log message of the specified event whose argument is a {@link ByteBuf}.
 */
private static String formatByteBuf(ChannelHandlerContext ctx, String eventName, ByteBuf msg) {
    String chStr = ctx.channel().toString();
    int length = msg.readableBytes();
    if (length == 0) {
        StringBuilder buf = new StringBuilder(chStr.length() + 1 + eventName.length() + 4);
        buf.append(chStr).append(' ').append(eventName).append(": 0B");
        return buf.toString();
    } else {
        int rows = length / 16 + (length % 15 == 0? 0 : 1) + 4;
        StringBuilder buf = new StringBuilder(chStr.length() + 1 + eventName.length() + 2 + 10 + 1 + 2 + rows * 80);

        buf.append(chStr).append(' ').append(eventName).append(": ").append(length).append('B').append(NEWLINE);
        appendPrettyHexDump(buf, msg); // <1>

        return buf.toString();
    }
}
```

- `<1>` 处的 `appendPrettyHexDump(buf, msg)` ，实际调用的是 `ByteBufUtil#appendPrettyHexDump(StringBuilder dump, ByteBuf buf)` 方法。

如下是一个打印的示例：

> FROM [《自顶向下深入分析Netty（八）–ChannelHandler》](https://www.jianshu.com/p/a9bcd89553f5)
>
> [![示例](http://static.iocoder.cn/images/Netty/2018_10_10/02.png)](http://static.iocoder.cn/images/Netty/2018_10_10/02.png)示例

### 3.3.2 formatByteBufHolder

`#formatByteBufHolder(ChannelHandlerContext ctx, String eventName, ByteBufHolder msg)` 方法，代码如下：

```
/**
 * Generates the default log message of the specified event whose argument is a {@link ByteBufHolder}.
 */
private static String formatByteBufHolder(ChannelHandlerContext ctx, String eventName, ByteBufHolder msg) {
    String chStr = ctx.channel().toString();
    String msgStr = msg.toString();
    ByteBuf content = msg.content();
    int length = content.readableBytes();
    if (length == 0) {
        StringBuilder buf = new StringBuilder(chStr.length() + 1 + eventName.length() + 2 + msgStr.length() + 4);
        buf.append(chStr).append(' ').append(eventName).append(", ").append(msgStr).append(", 0B");
        return buf.toString();
    } else {
        int rows = length / 16 + (length % 15 == 0? 0 : 1) + 4;
        StringBuilder buf = new StringBuilder(chStr.length() + 1 + eventName.length() + 2 + msgStr.length() + 2 + 10 + 1 + 2 + rows * 80);

        buf.append(chStr).append(' ').append(eventName).append(": ").append(msgStr).append(", ").append(length).append('B').append(NEWLINE);
        appendPrettyHexDump(buf, content);

        return buf.toString();
    }
}
```

- 和 `#formatByteBuf(ChannelHandlerContext ctx, String eventName, ByteBuf msg)` 方法，实际打印的效果，非常相似。

### 3.3.3 formatSimple

`#formatSimple(ChannelHandlerContext ctx, String eventName, Object msg)` 方法，代码如下：

```
/**
 * Generates the default log message of the specified event whose argument is an arbitrary object.
 */
private static String formatSimple(ChannelHandlerContext ctx, String eventName, Object msg) {
    String chStr = ctx.channel().toString();
    String msgStr = String.valueOf(msg);
    StringBuilder buf = new StringBuilder(chStr.length() + 1 + eventName.length() + 2 + msgStr.length());
    return buf.append(chStr).append(' ').append(eventName).append(": ").append(msgStr).toString();
}
```

# 666. 彩蛋

还是没有彩蛋。

# ChannelHandler（五）之 IdleStateHandler

# 1. 概述

在 `netty-handler` 模块的 `timeout` 包，实现 Channel 的读写操作的**空闲**检测。可能有胖友不太了解空闲检测的具体用途。请先研读理解下 [《简易RPC框架-心跳与重连机制》](https://www.cnblogs.com/ASPNET2008/p/7615973.html) 。

# 2. 类

`timeout` 包，包含的类，如下图所示：[![`timeout` 包](http://static.iocoder.cn/images/Netty/2018_10_13/01.png)](http://static.iocoder.cn/images/Netty/2018_10_13/01.png)`timeout` 包

一共有 3 个 ChannelHandler 实现类：

- IdleStateHandler ，当 Channel 的

  读或者写

  空闲时间太长时，将会触发一个 IdleStateEvent 事件。然后，你可以自定义一个 ChannelInboundHandler ，重写

   

  ```
  #userEventTriggered(ChannelHandlerContext ctx, Object evt)
  ```

   

  方法，处理该事件。

  - ReadTimeoutHandler ，继承 IdleStateHandler 类，当 Channel 的**读**空闲时间( 读或者写 )太长时，抛出 ReadTimeoutException 异常，并自动关闭该 Channel 。然后，你可以自定一个 ChannelInboundHandler ，重写 `#exceptionCaught(ChannelHandlerContext ctx, Throwable cause)` 方法，处理该异常。

- WriteTimeoutHandler ，当一个**写**操作不能在指定时间内完成时，抛出 WriteTimeoutException 异常，并自动关闭对应 Channel 。然后，你可以自定一个 ChannelInboundHandler ，重写 `#exceptionCaught(ChannelHandlerContext ctx, Throwable cause)` 方法，处理该异常。

😈 从 WriteTimeoutHandler 可以看出，本文实际不仅仅分享 IdleStateHandler ，更准确的是分享 Timeout 相关的 ChannelHandler 。考虑到大多数胖友对 IdleStateHandler 比较熟悉，也相对常用，所以标题才取了 [《精尽 Netty 源码解析 —— ChannelHandler（五）之 IdleStateHandler》](http://svip.iocoder.cn/Netty/ChannelHandler-5-idle/#) 。

# 3. IdleState

`io.netty.handler.timeout.IdleState` ，空闲状态**枚举**。代码如下：

```
/**
 * 空闲状态枚举
 *
 * An {@link Enum} that represents the idle state of a {@link Channel}.
 */
public enum IdleState {

    /**
     * No data was received for a while.
     *
     * 读空闲
     */
    READER_IDLE,
    /**
     * No data was sent for a while.
     *
     * 写空闲
     */
    WRITER_IDLE,
    /**
     * No data was either received or sent for a while.
     *
     * 读或写任一空闲
     */
    ALL_IDLE

}
```

- 一共有 3 种状态。其中，`ALL_IDLE` 表示的是，读**或**写任一空闲，注意是“或”。

## 3.1 IdleStateEvent

`io.netty.handler.timeout.IdleStateEvent` ，空闲事件。代码如下：

```
public class IdleStateEvent {

    // READ
    public static final IdleStateEvent FIRST_READER_IDLE_STATE_EVENT = new IdleStateEvent(IdleState.READER_IDLE, true); // 首次
    public static final IdleStateEvent READER_IDLE_STATE_EVENT = new IdleStateEvent(IdleState.READER_IDLE, false);
    // WRITE
    public static final IdleStateEvent FIRST_WRITER_IDLE_STATE_EVENT = new IdleStateEvent(IdleState.WRITER_IDLE, true); // 首次
    public static final IdleStateEvent WRITER_IDLE_STATE_EVENT = new IdleStateEvent(IdleState.WRITER_IDLE, false);
    // ALL
    public static final IdleStateEvent FIRST_ALL_IDLE_STATE_EVENT = new IdleStateEvent(IdleState.ALL_IDLE, true); // 首次
    public static final IdleStateEvent ALL_IDLE_STATE_EVENT = new IdleStateEvent(IdleState.ALL_IDLE, false);

    /**
     * 空闲状态类型
     */
    private final IdleState state;
    /**
     * 是否首次
     */
    private final boolean first;

    /**
     * Constructor for sub-classes.
     *
     * @param state the {@link IdleStateEvent} which triggered the event.
     * @param first {@code true} if its the first idle event for the {@link IdleStateEvent}.
     */
    protected IdleStateEvent(IdleState state, boolean first) {
        this.state = ObjectUtil.checkNotNull(state, "state");
        this.first = first;
    }

    /**
     * Returns the idle state.
     */
    public IdleState state() {
        return state;
    }

    /**
     * Returns {@code true} if this was the first event for the {@link IdleState}
     */
    public boolean isFirst() {
        return first;
    }

}
```

- 3 **类**( `state` )空闲事件，再组合上是否首次( `first` )，一共有 6 种空闲事件。

# 4. TimeoutException

`io.netty.handler.timeout.TimeoutException` ，继承 ChannelException 类，超时异常。代码如下：

```
public class TimeoutException extends ChannelException {

    TimeoutException() { }

    @Override
    public Throwable fillInStackTrace() {
        return this;
    }

}
```

## 4.1 ReadTimeoutException

`io.netty.handler.timeout.ReadTimeoutException` ，继承 TimeoutException 类，读超时( 空闲 )异常。代码如下：

```
public final class ReadTimeoutException extends TimeoutException {

    /**
     * 单例
     */
    public static final ReadTimeoutException INSTANCE = new ReadTimeoutException();

    private ReadTimeoutException() { }

}
```

## 4.2 WriteTimeoutException

`io.netty.handler.timeout.WriteTimeoutException` ，继承 TimeoutException 类，写超时( 空闲 )异常。代码如下：

```
public final class WriteTimeoutException extends TimeoutException {

    /**
     * 单例
     */
    public static final WriteTimeoutException INSTANCE = new WriteTimeoutException();

    private WriteTimeoutException() { }

}
```

# 5. IdleStateHandler

`io.netty.handler.timeout.IdleStateHandler` ，继承 ChannelDuplexHandler 类，当 Channel 的**读或者写**空闲时间太长时，将会触发一个 IdleStateEvent 事件。

## 5.1 构造方法

> 老艿艿：高能预警，IdleStateHandler 的属性有点点多。

```
/**
 * 最小的超时时间，单位：纳秒
 */
private static final long MIN_TIMEOUT_NANOS = TimeUnit.MILLISECONDS.toNanos(1);

/**
 * 写入任务监听器
 */
// Not create a new ChannelFutureListener per write operation to reduce GC pressure.
private final ChannelFutureListener writeListener = new ChannelFutureListener() {

    @Override
    public void operationComplete(ChannelFuture future) throws Exception {
        // 记录最后写时间
        lastWriteTime = ticksInNanos();
        // 重置 firstWriterIdleEvent 和 firstAllIdleEvent 为 true
        firstWriterIdleEvent = firstAllIdleEvent = true;
    }

};

/**
 * 是否观察 {@link ChannelOutboundBuffer} 写入队列
 */
private final boolean observeOutput;
/**
 * 配置的读空闲时间，单位：纳秒
 */
private final long readerIdleTimeNanos;
/**
 * 配置的写空闲时间，单位：纳秒
 */
private final long writerIdleTimeNanos;
/**
 * 配置的All( 读或写任一 )，单位：纳秒
 */
private final long allIdleTimeNanos;

/**
 * 读空闲的定时检测任务
 */
private ScheduledFuture<?> readerIdleTimeout;
/**
 * 最后读时间
 */
private long lastReadTime;
/**
 * 是否首次读空闲
 */
private boolean firstReaderIdleEvent = true;

/**
 * 写空闲的定时检测任务
 */
private ScheduledFuture<?> writerIdleTimeout;
/**
 * 最后写时间
 */
private long lastWriteTime;
/**
 * 是否首次写空闲
 */
private boolean firstWriterIdleEvent = true;

/**
 * All 空闲时间，单位：纳秒
 */
private ScheduledFuture<?> allIdleTimeout;
/**
 * 是否首次 All 空闲
 */
private boolean firstAllIdleEvent = true;

/**
 * 状态
 *
 * 0 - none ，未初始化
 * 1 - initialized ，已经初始化
 * 2 - destroyed ，已经销毁
 */
private byte state; // 0 - none, 1 - initialized, 2 - destroyed
/**
 * 是否正在读取
 */
private boolean reading;

/**
 * 最后检测到 {@link ChannelOutboundBuffer} 发生变化的时间
 */
private long lastChangeCheckTimeStamp;
/**
 * 第一条准备 flash 到对端的消息( {@link ChannelOutboundBuffer#current()} )的 HashCode
 */
private int lastMessageHashCode;
/**
 * 总共等待 flush 到对端的内存大小( {@link ChannelOutboundBuffer#totalPendingWriteBytes()} )
 */
private long lastPendingWriteBytes;

public IdleStateHandler(int readerIdleTimeSeconds, int writerIdleTimeSeconds, int allIdleTimeSeconds) {
    this(readerIdleTimeSeconds, writerIdleTimeSeconds, allIdleTimeSeconds, TimeUnit.SECONDS);
}

public IdleStateHandler(long readerIdleTime, long writerIdleTime, long allIdleTime, TimeUnit unit) {
    this(false, readerIdleTime, writerIdleTime, allIdleTime, unit);
}

/**
 * Creates a new instance firing {@link IdleStateEvent}s.
 *
 * @param observeOutput
 *        whether or not the consumption of {@code bytes} should be taken into
 *        consideration when assessing write idleness. The default is {@code false}.
 * @param readerIdleTime
 *        an {@link IdleStateEvent} whose state is {@link IdleState#READER_IDLE}
 *        will be triggered when no read was performed for the specified
 *        period of time.  Specify {@code 0} to disable.
 * @param writerIdleTime
 *        an {@link IdleStateEvent} whose state is {@link IdleState#WRITER_IDLE}
 *        will be triggered when no write was performed for the specified
 *        period of time.  Specify {@code 0} to disable.
 * @param allIdleTime
 *        an {@link IdleStateEvent} whose state is {@link IdleState#ALL_IDLE}
 *        will be triggered when neither read nor write was performed for
 *        the specified period of time.  Specify {@code 0} to disable.
 * @param unit
 *        the {@link TimeUnit} of {@code readerIdleTime},
 *        {@code writeIdleTime}, and {@code allIdleTime}
 */
public IdleStateHandler(boolean observeOutput, long readerIdleTime, long writerIdleTime, long allIdleTime, TimeUnit unit) {
    if (unit == null) {
        throw new NullPointerException("unit");
    }

    this.observeOutput = observeOutput;

    if (readerIdleTime <= 0) {
        readerIdleTimeNanos = 0;
    } else {
        readerIdleTimeNanos = Math.max(unit.toNanos(readerIdleTime), MIN_TIMEOUT_NANOS); // 保证大于等于 MIN_TIMEOUT_NANOS
    }
    if (writerIdleTime <= 0) {
        writerIdleTimeNanos = 0;
    } else {
        writerIdleTimeNanos = Math.max(unit.toNanos(writerIdleTime), MIN_TIMEOUT_NANOS); // 保证大于等于 MIN_TIMEOUT_NANOS
    }
    if (allIdleTime <= 0) {
        allIdleTimeNanos = 0;
    } else {
        allIdleTimeNanos = Math.max(unit.toNanos(allIdleTime), MIN_TIMEOUT_NANOS); // 保证大于等于 MIN_TIMEOUT_NANOS
    }
}
```

- 属性比较多，保持耐心和淡定，我们继续来整理一波。

- `MIN_TIMEOUT_NANOS` 静态属性，最小的超时时间为 **1** ，单位：纳秒。因为 IdleStateHandler 创建的，检测定时任务的时间，以纳秒为单位。

- `state` 属性，IdleStateHandler 的状态。一共有三种，见注释。

- Read 空闲相关属性

  - `readerIdleTimeNanos` 属性，配置的读空闲时间，单位：纳秒。
  - `readerIdleTimeout` 属性，读空闲的定时检测任务。
  - `lastReadTime` 属性，读空闲的定时检测任务。
  - `firstReaderIdleEvent` 属性，是否首次读空闲。
  - 【**独有**】 `reading` 属性，是否正在读取。

- Write 空闲相关属性

  - `writerIdleTimeNanos` 属性，配置的写空闲时间，单位：纳秒。

  - `writerIdleTimeout` 属性，写空闲的定时检测任务。

  - `lastWriteTime` 属性，最后写时间。

  - `writeListener` 属性，写入操作，完成 flush 到对端的回调监听器。初始时，创建好，避免重复创建，从而减轻 GC 压力。

  - 【

    独有

    】ChannelOutboundBuffer 相关属性

    - `observeOutput` 属性， 是否观察 ChannelOutboundBuffer 写入队列。
    - `lastChangeCheckTimeStamp` 属性，最后检测到 ChannelOutboundBuffer 发生变化的时间。
    - `lastMessageHashCode` 属性，第一条准备 flash 到对端的消息的 HashCode 。
    - `lastPendingWriteBytes` 属性，总共等待 flush 到对端的内存大小。
    - 关于这几个属性，跟着 [「5.7 hasOutputChanged」](http://svip.iocoder.cn/Netty/ChannelHandler-5-idle/#) 一起理解。

- ALL 空闲相关属性

  - 因为 ALL 是 Write 和 Read 任一，所以共用它们的一些属性。
  - `allIdleTimeNanos` 属性，配置的All( 读或写任一 )，单位：纳秒。

## 5.2 initialize

`#initialize(ChannelHandlerContext ctx)` 方法，初始化 IdleStateHandler 。代码如下：

```
 1: private void initialize(ChannelHandlerContext ctx) {
 2:     // 校验状态，避免因为 `#destroy()` 方法在 `#initialize(ChannelHandlerContext ctx)` 方法，执行之前
 3:     // Avoid the case where destroy() is called before scheduling timeouts.
 4:     // See: https://github.com/netty/netty/issues/143
 5:     switch (state) {
 6:     case 1:
 7:     case 2:
 8:         return;
 9:     }
10: 
11:     // 标记为已初始化
12:     state = 1;
13:     // 初始化 ChannelOutboundBuffer 相关属性
14:     initOutputChanged(ctx);
15: 
16:     // 初始相应的定时任务
17:     lastReadTime = lastWriteTime = ticksInNanos();
18:     if (readerIdleTimeNanos > 0) {
19:         readerIdleTimeout = schedule(ctx, new ReaderIdleTimeoutTask(ctx), readerIdleTimeNanos, TimeUnit.NANOSECONDS);
20:     }
21:     if (writerIdleTimeNanos > 0) {
22:         writerIdleTimeout = schedule(ctx, new WriterIdleTimeoutTask(ctx), writerIdleTimeNanos, TimeUnit.NANOSECONDS);
23:     }
24:     if (allIdleTimeNanos > 0) {
25:         allIdleTimeout = schedule(ctx, new AllIdleTimeoutTask(ctx), allIdleTimeNanos, TimeUnit.NANOSECONDS);
26:     }
27: }
```

- 第 2 至 9 行：校验状态，避免因为 `#destroy()` 方法在 `#initialize(ChannelHandlerContext ctx)` 方法，执行之前。

- 第 12 行：标记 `state` 为已初始化。

- 第 14 行：调用 `#initOutputChanged(ChannelHandlerContext ctx)` 方法，初始化 ChannelOutboundBuffer 相关属性。代码如下：

  ```
  private void initOutputChanged(ChannelHandlerContext ctx) {
      if (observeOutput) {
          Channel channel = ctx.channel();
          Unsafe unsafe = channel.unsafe();
          ChannelOutboundBuffer buf = unsafe.outboundBuffer();
  
          if (buf != null) {
              // 记录第一条准备 flash 到对端的消息的 HashCode
              lastMessageHashCode = System.identityHashCode(buf.current());
              // 记录总共等待 flush 到对端的内存大小
              lastPendingWriteBytes = buf.totalPendingWriteBytes();
          }
      }
  }
  ```

  - 初始化 `lastMessageHashCode` 和 `lastPendingWriteBytes` 属性。

- 第 17 至 26 行：根据配置，分别调用 `#schedule(hannelHandlerContext ctx, Runnable task, long delay, TimeUnit unit)` 方法，初始相应的定时任务。代码如下：

  ```
  ScheduledFuture<?> schedule(ChannelHandlerContext ctx, Runnable task, long delay, TimeUnit unit) {
      return ctx.executor().schedule(task, delay, unit);
  }
  ```

- 一共有 ReaderIdleTimeoutTask、WriterIdleTimeoutTask、AllIdleTimeoutTask 三种任务，下文我们详细解析。

------

该方法，会在多个 Channel **事件**中被调用。代码如下：

```
// <2>
@Override
public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
    if (ctx.channel().isActive() && ctx.channel().isRegistered()) {
        // 初始化
        // channelActive() event has been fired already, which means this.channelActive() will
        // not be invoked. We have to initialize here instead.
        initialize(ctx);
    } else {
        // channelActive() event has not been fired yet.  this.channelActive() will be invoked
        // and initialization will occur there.
    }
}

// <3>
@Override
public void channelRegistered(ChannelHandlerContext ctx) throws Exception {
    // 初始化
    // Initialize early if channel is active already.
    if (ctx.channel().isActive()) {
        initialize(ctx);
    }
    // 继续传播 Channel Registered 事件到下一个节点
    super.channelRegistered(ctx);
}

// <1>
@Override
public void channelActive(ChannelHandlerContext ctx) throws Exception {
    // 初始化
    // This method will be invoked only if this handler was added
    // before channelActive() event is fired.  If a user adds this handler
    // after the channelActive() event, initialize() will be called by beforeAdd().
    initialize(ctx);
    // 继续传播 Channel Registered 事件到下一个节点
    super.channelActive(ctx);
}
```

- `<1>` ：当客户端与服务端成功建立连接后，Channel 被激活，此时 channelActive 方法，的初始化被调用。
- `<2>` ：当 Channel 被激活后，动态添加此 Handler ，则 handlerAdded 方法的初始化被调用。
- `<3>` ：当 Channel 被激活后，用户主动切换 Channel 的所在的 EventLoop ，则 channelRegistered 方法的初始化被调用。

## 5.3 destroy

`#destroy()` 方法，销毁 IdleStateHandler 。代码如下：

```
private void destroy() {
    // 标记为销毁
    state = 2;

    // 销毁相应的定时任务
    if (readerIdleTimeout != null) {
        readerIdleTimeout.cancel(false);
        readerIdleTimeout = null;
    }
    if (writerIdleTimeout != null) {
        writerIdleTimeout.cancel(false);
        writerIdleTimeout = null;
    }
    if (allIdleTimeout != null) {
        allIdleTimeout.cancel(false);
        allIdleTimeout = null;
    }
}
```

- 标记 `state` 为已销毁。
- 销毁响应的定时任务。

------

该方法，会在多个 Channel **事件**中被调用。代码如下：

```
@Override
public void handlerRemoved(ChannelHandlerContext ctx) throws Exception {
    // 销毁
    destroy();
}

@Override
public void channelInactive(ChannelHandlerContext ctx) throws Exception {
    // 销毁
    destroy();
    // 继续传播 Channel Incative 事件到下一个节点
    super.channelInactive(ctx);
}
```

## 5.4 channelIdle

在定时任务中，如果检测到**空闲**：

① 首先，调用 `#newIdleStateEvent(IdleState state, boolean first)` 方法，创建对应的空闲事件。代码如下：

```
protected IdleStateEvent newIdleStateEvent(IdleState state, boolean first) {
    switch (state) {
        case ALL_IDLE:
            return first ? IdleStateEvent.FIRST_ALL_IDLE_STATE_EVENT : IdleStateEvent.ALL_IDLE_STATE_EVENT;
        case READER_IDLE:
            return first ? IdleStateEvent.FIRST_READER_IDLE_STATE_EVENT : IdleStateEvent.READER_IDLE_STATE_EVENT;
        case WRITER_IDLE:
            return first ? IdleStateEvent.FIRST_WRITER_IDLE_STATE_EVENT : IdleStateEvent.WRITER_IDLE_STATE_EVENT;
        default:
            throw new IllegalArgumentException("Unhandled: state=" + state + ", first=" + first);
    }
}
```

② 然后，调用 `#channelIdle(ChannelHandlerContext ctx, IdleStateEvent evt)` 方法，在 pipeline 中，触发 UserEvent 事件。代码如下：

```
/**
 * Is called when an {@link IdleStateEvent} should be fired. This implementation calls
 * {@link ChannelHandlerContext#fireUserEventTriggered(Object)}.
 */
protected void channelIdle(ChannelHandlerContext ctx, IdleStateEvent evt) throws Exception {
    ctx.fireUserEventTriggered(evt);
}
```

## 5.5 channelRead

`#channelRead(ChannelHandlerContext ctx, Object msg)` 方法，代码如下：

```
@Override
public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
    // 开启了 read 或 all 的空闲检测
    if (readerIdleTimeNanos > 0 || allIdleTimeNanos > 0) {
        // 标记正在读取
        reading = true;
        // 重置 firstWriterIdleEvent 和 firstAllIdleEvent 为 true
        firstReaderIdleEvent = firstAllIdleEvent = true;
    }
    // 继续传播 Channel Read 事件到下一个节点
    ctx.fireChannelRead(msg);
}
```

在开启 read 或 all 的空闲检测的情况下，在【继续传播 Channel Read 事件到下一个节点】**之前**，会：

- 标记 `reading` 为正在读取。
- 重置 `firstWriterIdleEvent` 和 `firstAllIdleEvent` 为 `true` ，即又变成**首次**。

------

那么什么时候记录 `lastReadTime` 最后读取时间呢？答案在 `#channelReadComplete(ChannelHandlerContext ctx)` 方法中。代码如下：

```
@Override
public void channelReadComplete(ChannelHandlerContext ctx) throws Exception {
    // 开启了 read 或 all 的空闲检测
    if ((readerIdleTimeNanos > 0 || allIdleTimeNanos > 0) && reading) {
        // 记录最后读时间
        lastReadTime = ticksInNanos();
        // 标记不在读取
        reading = false;
    }
    // 继续传播 Channel ReadComplete 事件到下一个节点
    ctx.fireChannelReadComplete();
}
```

在开启 read 或 all 的空闲检测的情况下，在【继续传播 Channel ReadComplete 事件到下一个节点】**之前**，会：

- 记录 `lastReadTime` 最后读取时间为 `#ticksInNanos()` 方法，代码如下：

  ```
  long ticksInNanos() {
      return System.nanoTime();
  }
  ```

  - 当前时间，单位：纳秒。

- 标记 `reading` 为不在读取。

## 5.6 write

`#write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise)` 方法，代码如下：

```
@Override
public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
    // 开启了 write 或 all 的空闲检测
    // Allow writing with void promise if handler is only configured for read timeout events.
    if (writerIdleTimeNanos > 0 || allIdleTimeNanos > 0) {
        // 写入，并添加写入监听器
        ctx.write(msg, promise.unvoid()).addListener(writeListener);
    } else {
        // 写入，不添加监听器
        ctx.write(msg, promise);
    }
}
```

在开启 write 或 all 的空闲检测的情况下，写入的时候，会添加写入监听器 `writeListener` 。该监听器会在消息( 数据 ) flush 到对端后，**回调**，修改最后写入时间 `lastWriteTime` 为 `#ticksInNanos()` 。代码如下：

```
// Not create a new ChannelFutureListener per write operation to reduce GC pressure.
private final ChannelFutureListener writeListener = new ChannelFutureListener() {

    @Override
    public void operationComplete(ChannelFuture future) throws Exception {
        // 记录最后写时间
        lastWriteTime = ticksInNanos();
        // 重置 firstWriterIdleEvent 和 firstAllIdleEvent 为 true
        firstWriterIdleEvent = firstAllIdleEvent = true;
    }

}
```

## 5.7 hasOutputChanged

> 老艿艿：关于这个方法，看完 [「5.8.2 WriterIdelTimeoutTask」](http://svip.iocoder.cn/Netty/ChannelHandler-5-idle/#) 后，再回过头理解。

`#hasOutputChanged(ChannelHandlerContext ctx, boolean first)` 方法，判断 ChannelOutboundBuffer 是否发生变化。代码如下：

```
   /**
    * Returns {@code true} if and only if the {@link IdleStateHandler} was constructed
    * with {@link #observeOutput} enabled and there has been an observed change in the
    * {@link ChannelOutboundBuffer} between two consecutive calls of this method.
    *
    * https://github.com/netty/netty/issues/6150
    */
 1: private boolean hasOutputChanged(ChannelHandlerContext ctx, boolean first) {
 2:     // 开启观察 ChannelOutboundBuffer 队列
 3:     if (observeOutput) {
 4: 
 5:         // We can take this shortcut if the ChannelPromises that got passed into write()
 6:         // appear to complete. It indicates "change" on message level and we simply assume
 7:         // that there's change happening on byte level. If the user doesn't observe channel
 8:         // writability events then they'll eventually OOME and there's clearly a different
 9:         // problem and idleness is least of their concerns.
10:         // 如果 lastChangeCheckTimeStamp 和 lastWriteTime 不一样，说明写操作进行过了，则更新此值
11:         if (lastChangeCheckTimeStamp != lastWriteTime) {
12:             lastChangeCheckTimeStamp = lastWriteTime;
13: 
14:             // But this applies only if it's the non-first call.
15:             if (!first) { // 非首次
16:                 return true;
17:             }
18:         }
19: 
20:         Channel channel = ctx.channel();
21:         Unsafe unsafe = channel.unsafe();
22:         ChannelOutboundBuffer buf = unsafe.outboundBuffer();
23: 
24:         if (buf != null) {
25:             // 获得新的 messageHashCode 和 pendingWriteBytes
26:             int messageHashCode = System.identityHashCode(buf.current());
27:             long pendingWriteBytes = buf.totalPendingWriteBytes();
28: 
29:             // 发生了变化
30:             if (messageHashCode != lastMessageHashCode || pendingWriteBytes != lastPendingWriteBytes) {
31:                 // 修改最后一次的 lastMessageHashCode 和 lastPendingWriteBytes
32:                 lastMessageHashCode = messageHashCode;
33:                 lastPendingWriteBytes = pendingWriteBytes;
34: 
35:                 if (!first) { // 非首次
36:                     return true;
37:                 }
38:             }
39:         }
40:     }
41: 
42:     return false;
43: }
```

- 第 3 行：判断开启观察 ChannelOutboundBuffer 队列。

  - 如果 `lastChangeCheckTimeStamp` 和 `lastWriteTime` 不一样，说明写操作进行过了，则更新此值。
  - 第 14 至 17 行：这段逻辑，理论来说不会发生。因为 `lastWriteTime` 属性，只会在 `writeListener` 回调中修改，那么如果发生 `lastChangeCheckTimeStamp` 和 `lastWriteTime` 不相等，`first` 必然为 `true` 。因为，Channel 相关的事件逻辑，都在它所在的 EventLoop 中，不会出现并发的情况。关于这一块，基友【莫那一鲁道】在 https://github.com/netty/netty/issues/8251 已经进行提问，坐等结果。

- 第 25 至 27 行：获得新的 `messageHashCode` 和 `pendingWriteBytes` 的。

- 第 29 至 33 行：若发生了变化，则修改最后一次的

   

  ```
  lastMessageHashCode
  ```

   

  和

   

  ```
  lastPendingWriteBytes
  ```

   

  。

  - `messageHashCode != lastMessageHashCode` 成立，① 有可能对端接收数据比较慢，导致一个消息发送了一部分；② 又或者，发送的消息**非常非常非常大**，导致一个消息发送了一部分，就将发送缓存区写满。如果是这种情况下，可以使用 ChunkedWriteHandler ，一条大消息，拆成多条小消息。
  - `pendingWriteBytes != lastPendingWriteBytes` 成立，① 有新的消息，写到 ChannelOutboundBuffer 内存队列中；② 有几条消息成功写到对端。这种情况，此处不会发生。

- 第 35 至 37 行：当且仅当

   

  ```
  first
  ```

   

  为

   

  ```
  true
  ```

   

  时，即非首次，才返回

   

  ```
  true
  ```

   

  ，表示 ChannelOutboundBuffer 发生变化。

  - 这是一个有点“神奇”的设定，笔者表示不太理解。理论来说，ChannelOutboundBuffer 是否发生变化，只需要考虑【第 30 行】代码的判断。如果加了 `!first` 的判断，导致的结果是在 WriterIdleTimeoutTask 和 AllIdleTimeoutTask 任务中，ChannelOutboundBuffer 即使发生了变化，在**首次**还是会触发 write 和 all 空闲事件，在**非首次**不会触发 write 和 all 空闲事件。
  - 关于上述的困惑，[《Netty 那些事儿 ——— 关于 “Netty 发送大数据包时 触发写空闲超时” 的一些思考》](https://www.jianshu.com/p/8fe70d313d78) 一文的作者，也表达了相同的困惑。后续，找闪电侠面基沟通下。
  - 关于上述的困惑，[《Netty 心跳服务之 IdleStateHandler 源码分析》](https://www.jianshu.com/p/f2ed73cf4df8) 一文的作者，表达了自己的理解。感兴趣的胖友，可以看看。
  - 当然，这块如果不理解的胖友，也不要方。从笔者目前了解下来，`observeOutput` 都是设置为 `false` 。也就说，不会触发这个方法的执行。

- 第 42 行：返回 `false` ，表示 ChannelOutboundBuffer 未发生变化。

## 5.8 AbstractIdleTask

AbstractIdleTask ，实现 Runnable 接口，空闲任务抽象类。代码如下：

> AbstractIdleTask 是 IdleStateHandler 的内部静态类。

```
private abstract static class AbstractIdleTask implements Runnable {

    private final ChannelHandlerContext ctx;

    AbstractIdleTask(ChannelHandlerContext ctx) {
        this.ctx = ctx;
    }

    @Override
    public void run() {
        // <1> 忽略未打开的 Channel
        if (!ctx.channel().isOpen()) {
            return;
        }

        // <2> 执行任务
        run(ctx);
    }

    protected abstract void run(ChannelHandlerContext ctx);

}
```

- `<1>` 处，忽略未打开的 Channel 。
- `<2>` 处，子类实现 `#run()` **抽象**方法，实现自定义的空闲检测逻辑。

### 5.8.1 ReaderIdleTimeoutTask

ReaderIdleTimeoutTask ，继承 AbstractIdleTask 抽象类，检测 Read 空闲超时**定时**任务。代码如下：

> ReaderIdleTimeoutTask 是 IdleStateHandler 的内部静态类。

```
 1: private final class ReaderIdleTimeoutTask extends AbstractIdleTask {
 2: 
 3:     ReaderIdleTimeoutTask(ChannelHandlerContext ctx) {
 4:         super(ctx);
 5:     }
 6: 
 7:     @Override
 8:     protected void run(ChannelHandlerContext ctx) {
 9:         // 计算下一次检测的定时任务的延迟
10:         long nextDelay = readerIdleTimeNanos;
11:         if (!reading) {
12:             nextDelay -= ticksInNanos() - lastReadTime;
13:         }
14: 
15:         // 如果小于等于 0 ，说明检测到读空闲
16:         if (nextDelay <= 0) {
17:             // 延迟时间为 readerIdleTimeNanos ，即再次检测
18:             // Reader is idle - set a new timeout and notify the callback.
19:             readerIdleTimeout = schedule(ctx, this, readerIdleTimeNanos, TimeUnit.NANOSECONDS);
20: 
21:             // 获得当前是否首次检测到读空闲
22:             boolean first = firstReaderIdleEvent;
23:             // 标记 firstReaderIdleEvent 为 false 。也就说，下次检测到空闲，就非首次了。
24:             firstReaderIdleEvent = false;
25: 
26:             try {
27:                 // 创建读空闲事件
28:                 IdleStateEvent event = newIdleStateEvent(IdleState.READER_IDLE, first);
29:                 // 通知通道空闲事件
30:                 channelIdle(ctx, event);
31:             } catch (Throwable t) {
32:                 // 触发 Exception Caught 到下一个节点
33:                 ctx.fireExceptionCaught(t);
34:             }
35:         // 如果大于 0 ，说明未检测到读空闲
36:         } else {
37:             // 延迟时间为 nextDelay ，即按照最后一次读的时间作为开始计数
38:             // Read occurred before the timeout - set a new timeout with shorter delay.
39:             readerIdleTimeout = schedule(ctx, this, nextDelay, TimeUnit.NANOSECONDS);
40:         }
41:     }
42: }
```

- 第 9 至 13 行：计算下一次检测的定时任务的

  延迟

  。

  - `reading` 为 `true` 时，意味着正在读取，**不会**被检测为读空闲。
  - `reading` 为 `false` 时，实际 `nextDelay` 的计算为 `readerIdleTimeNanos - (ticksInNanos() - lastReadTime)` 。如果小于等于 0 ，意味着 `ticksInNanos() - lastReadTime >= readerIdleTimeNanos` ，超时。

- ① 第 35 至 40 行：如果

  大于

   

  0 ，说明未检测到读空闲。

  - 第 39 行：调用 `#schedule(ChannelHandlerContext ctx, Runnable task, long delay, TimeUnit unit)` 方法，初始**下一次**的 ReaderIdleTimeoutTask 定时任务。其中，延迟时间为 `nextDelay` ，即按照最后一次读的时间作为开始计数。

- ② 第 15 至 34 行：如果

  小于等于

   

  0 ，说明检测到读空闲。

  - 第 19 行：调用 `#schedule(ChannelHandlerContext ctx, Runnable task, long delay, TimeUnit unit)` 方法，初始**下一次**的 ReaderIdleTimeoutTask 定时任务。其中，延迟时间为 `readerIdleTimeNanos` ，即重新计数。

  - 第 21 行：获得当前是否首次检测到读空闲。

    - 第 24 行：标记 `firstReaderIdleEvent` 为 `false` 。也就说，下次检测到空闲，就**非首次**了。

  - 第 28 行：调用

     

    ```
    #newIdleStateEvent(IdleState state, boolean first)
    ```

     

    方法，创建创建

    读

    空闲事件。

    - 第 30 行： 调用 `#channelIdle(ChannelHandlerContext ctx, IdleStateEvent evt)` 方法，在 pipeline 中，触发 UserEvent 事件。

  - 第 31 至 34 行：如果**发生异常**，触发 Exception Caught 事件到下一个节点，处理异常。

### 5.8.2 WriterIdleTimeoutTask

WriterIdleTimeoutTask ，继承 AbstractIdleTask 抽象类，检测 Write 空闲超时**定时**任务。代码如下：

> WriterIdleTimeoutTask 是 IdleStateHandler 的内部静态类。

```
 1: private final class WriterIdleTimeoutTask extends AbstractIdleTask {
 2: 
 3:     WriterIdleTimeoutTask(ChannelHandlerContext ctx) {
 4:         super(ctx);
 5:     }
 6: 
 7:     @Override
 8:     protected void run(ChannelHandlerContext ctx) {
 9:         // 计算下一次检测的定时任务的延迟
10:         long lastWriteTime = IdleStateHandler.this.lastWriteTime;
11:         long nextDelay = writerIdleTimeNanos - (ticksInNanos() - lastWriteTime);
12: 
13:         // 如果小于等于 0 ，说明检测到写空闲
14:         if (nextDelay <= 0) {
15:             // 延迟时间为 writerIdleTimeout ，即再次检测
16:             // Writer is idle - set a new timeout and notify the callback.
17:             writerIdleTimeout = schedule(ctx, this, writerIdleTimeNanos, TimeUnit.NANOSECONDS);
18: 
19:             // 获得当前是否首次检测到写空闲
20:             boolean first = firstWriterIdleEvent;
21:             // 标记 firstWriterIdleEvent 为 false 。也就说，下次检测到空闲，就非首次了。
22:             firstWriterIdleEvent = false;
23: 
24:             try {
25:                 // 判断 ChannelOutboundBuffer 是否发生变化
26:                 if (hasOutputChanged(ctx, first)) {
27:                     return;
28:                 }
29: 
30:                 // 创建写空闲事件
31:                 IdleStateEvent event = newIdleStateEvent(IdleState.WRITER_IDLE, first);
32:                 // 通知通道空闲事件
33:                 channelIdle(ctx, event);
34:             } catch (Throwable t) {
35:                 // 触发 Exception Caught 到下一个节点
36:                 ctx.fireExceptionCaught(t);
37:             }
38:         // 如果大于 0 ，说明未检测到读空闲
39:         } else {
40:             // Write occurred before the timeout - set a new timeout with shorter delay.
41:             writerIdleTimeout = schedule(ctx, this, nextDelay, TimeUnit.NANOSECONDS);
42:         }
43:     }
44: }
```

- 第 9 至 11 行：计算下一次检测的定时任务的**延迟**。

- ① 第 38 至 42 行：如果

  大于

   

  0 ，说明未检测到写空闲。

  - 第 39 行：调用 `#schedule(ChannelHandlerContext ctx, Runnable task, long delay, TimeUnit unit)` 方法，初始**下一次**的 WriterIdleTimeoutTask 定时任务。其中，延迟时间为 `nextDelay` ，即按照最后一次写的时间作为开始计数。

- ② 第 13 至 37 行：如果

  小于等于

   

  0 ，说明检测到写空闲。

  - 第 17 行：调用 `#schedule(ChannelHandlerContext ctx, Runnable task, long delay, TimeUnit unit)` 方法，初始**下一次**的 WriterIdleTimeoutTask 定时任务。其中，延迟时间为 `readerIdleTimeNanos` ，即重新计数。

  - 第 20 行：获得当前是否首次检测到写空闲。

    - 第 22 行：标记 `firstWriterIdleEvent` 为 `false` 。也就说，下次检测到空闲，就**非首次**了。

  - 第 25 至 28 行：判断 ChannelOutboundBuffer 是否发生变化。如果有变化，不触发写空闲时间。

  - 第 31 行：调用

     

    ```
    #newIdleStateEvent(IdleState state, boolean first)
    ```

     

    方法，创建创建

    写

    空闲事件。

    - 第 33 行： 调用 `#channelIdle(ChannelHandlerContext ctx, IdleStateEvent evt)` 方法，在 pipeline 中，触发 UserEvent 事件。

  - 第 34 至 37 行：如果**发生异常**，触发 Exception Caught 事件到下一个节点，处理异常。

### 5.8.3 AllIdleTimeoutTask

AllIdleTimeoutTask ，继承 AbstractIdleTask 抽象类，检测 All 空闲超时**定时**任务。代码如下：

> AllIdleTimeoutTask 是 IdleStateHandler 的内部静态类。

```
private final class AllIdleTimeoutTask extends AbstractIdleTask {

    AllIdleTimeoutTask(ChannelHandlerContext ctx) {
        super(ctx);
    }

    @Override
    protected void run(ChannelHandlerContext ctx) {
        // 计算下一次检测的定时任务的延迟
        long nextDelay = allIdleTimeNanos;
        if (!reading) {
            nextDelay -= ticksInNanos() - Math.max(lastReadTime, lastWriteTime); // <1> 取大值
        }

        // 如果小于等于 0 ，说明检测到 all 空闲
        if (nextDelay <= 0) {
            // 延迟时间为 allIdleTimeNanos ，即再次检测
            // Both reader and writer are idle - set a new timeout and
            // notify the callback.
            allIdleTimeout = schedule(ctx, this, allIdleTimeNanos, TimeUnit.NANOSECONDS);

            // 获得当前是否首次检测到 all 空闲
            boolean first = firstAllIdleEvent;
            // 标记 firstAllIdleEvent 为 false 。也就说，下次检测到空闲，就非首次了。
            firstAllIdleEvent = false;

            try {
                // 判断 ChannelOutboundBuffer 是否发生变化
                if (hasOutputChanged(ctx, first)) {
                    return;
                }

                // 创建 all 空闲事件
                IdleStateEvent event = newIdleStateEvent(IdleState.ALL_IDLE, first);
                // 通知通道空闲事件
                channelIdle(ctx, event);
            } catch (Throwable t) {
                ctx.fireExceptionCaught(t);
            }
        // 如果大于 0 ，说明未检测到 all 空闲
        } else {
            // Either read or write occurred before the timeout - set a new
            // timeout with shorter delay.
            allIdleTimeout = schedule(ctx, this, nextDelay, TimeUnit.NANOSECONDS);
        }
    }
}
```

- 因为 All 是 Write 和 Read **任一**一种空闲即可，所以 AllIdleTimeoutTask 是 ReaderIdleTimeoutTask 和 WriterIdleTimeoutTask 的**综合**。
- `<1>` 处，取 `lastReadTime` 和 `lastWriteTime` 中的**大**值，从而来判断，是否有 Write 和 Read **任一**一种空闲。
- WriterIdleTimeoutTask 就不详细解析，胖友自己读读代码即可。

# 6. ReadTimeoutHandler

`io.netty.handler.timeout.ReadTimeoutHandler` ，继承 IdleStateHandler 类，当 Channel 的**读**空闲时间( 读或者写 )太长时，抛出 ReadTimeoutException 异常，并自动关闭该 Channel 。

## 6.1 构造方法

```
/**
 * Channel 是否关闭
 */
private boolean closed;

public ReadTimeoutHandler(int timeoutSeconds) {
    this(timeoutSeconds, TimeUnit.SECONDS);
}

public ReadTimeoutHandler(long timeout, TimeUnit unit) {
    // 禁用 Write / All 的空闲检测
    super(timeout, 0, 0, unit); // <1>
}
```

- `closed` 属性，Channel 是否关闭。
- `<1>` 处，禁用 Write / All 的空闲检测，只根据 `timeout` 方法参数，开启 Read 的空闲检测。

## 6.2 channelIdle

`#channelIdle(ChannelHandlerContext ctx, IdleStateEvent evt)` 方法，覆写父类方法，代码如下：

```
@Override
protected final void channelIdle(ChannelHandlerContext ctx, IdleStateEvent evt) throws Exception {
    assert evt.state() == IdleState.READER_IDLE;
    readTimedOut(ctx);
}

/**
 * Is called when a read timeout was detected.
 */
protected void readTimedOut(ChannelHandlerContext ctx) throws Exception {
    if (!closed) {
        // <1> 触发 Exception Caught 事件到 pipeline 中，异常为 ReadTimeoutException
        ctx.fireExceptionCaught(ReadTimeoutException.INSTANCE);
        // <2> 关闭 Channel 通道
        ctx.close();
        // <3> 标记 Channel 为已关闭
        closed = true;
    }
}
```

- `<1>` 处，触发 Exception Caught 事件到 pipeline 中，异常为 ReadTimeoutException 。
- `<2>` 处，关闭 Channel 通道。
- `<3>` 处，标记 Channel 为已关闭。

# 7. WriteTimeoutHandler

`io.netty.handler.timeout.WriteTimeoutHandler` ，继承 ChannelOutboundHandlerAdapter 类，当一个**写**操作不能在指定时间内完成时，抛出 WriteTimeoutException 异常，并自动关闭对应 Channel 。

😈 **注意，这里写入，指的是 flush 到对端 Channel ，而不仅仅是写到 ChannelOutboundBuffer 队列**。

## 7.1 构造方法

```
/**
 * 最小的超时时间，单位：纳秒
 */
private static final long MIN_TIMEOUT_NANOS = TimeUnit.MILLISECONDS.toNanos(1);

/**
 * 超时时间，单位：纳秒
 */
private final long timeoutNanos;

/**
 * WriteTimeoutTask 双向链表。
 *
 * lastTask 为链表的尾节点
 *
 * A doubly-linked list to track all WriteTimeoutTasks
 */
private WriteTimeoutTask lastTask;

/**
 * Channel 是否关闭
 */
private boolean closed;

public WriteTimeoutHandler(int timeoutSeconds) {
    this(timeoutSeconds, TimeUnit.SECONDS);
}

public WriteTimeoutHandler(long timeout, TimeUnit unit) {
    if (unit == null) {
        throw new NullPointerException("unit");
    }

    if (timeout <= 0) {
        timeoutNanos = 0;
    } else {
        timeoutNanos = Math.max(unit.toNanos(timeout), MIN_TIMEOUT_NANOS); // 保证大于等于 MIN_TIMEOUT_NANOS
    }
}
```

- ```
  timeoutNanos
  ```

   

  属性，写入超时时间，单位：纳秒。

  - `MIN_TIMEOUT_NANOS` 属性，最小的超时时间，单位：纳秒。

- `lastTask` 属性，WriteTimeoutTask 双向链表。其中，`lastTask` 为链表的**尾节点**。

- `closed` 属性，Channel 是否关闭。

## 7.2 handlerRemoved

`#handlerRemoved(ChannelHandlerContext ctx)` 方法，移除所有 WriteTimeoutTask 任务，并取消。代码如下：

```
@Override
public void handlerRemoved(ChannelHandlerContext ctx) throws Exception {
    WriteTimeoutTask task = lastTask;
    // 置空 lastTask
    lastTask = null;
    // 循环移除，知道为空
    while (task != null) {
        // 取消当前任务的定时任务
        task.scheduledFuture.cancel(false);
        // 记录前一个任务
        WriteTimeoutTask prev = task.prev;
        // 置空当前任务的前后节点
        task.prev = null;
        task.next = null;
        // 跳到前一个任务
        task = prev;
    }
}
```

- 代码比较简单，胖友自己看注释。

## 7.3 write

`#write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise)` 方法，代码如下：

```
@Override
public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
    if (timeoutNanos > 0) {
        // 如果 promise 是 VoidPromise ，则包装成非 VoidPromise ，为了后续的回调。
        promise = promise.unvoid(); <1》
        // 创建定时任务
        scheduleTimeout(ctx, promise);
    }
    // 写入
    ctx.write(msg, promise);
}
```

- `<1>` 处，如果 `promise` 类型是 VoidPromise ，则包装成非 VoidPromise ，为了后续的回调。因为 VoidPromise 无法接收到回调。
- `<2>` 处，调用 `#scheduleTimeout(final ChannelHandlerContext ctx, final ChannelPromise promise)` 方法，创建定时任务。详细解析，见 [「7.4 scheduleTimeout」](http://svip.iocoder.cn/Netty/ChannelHandler-5-idle/#) 。

## 7.4 scheduleTimeout

`#scheduleTimeout(final ChannelHandlerContext ctx, final ChannelPromise promise)` 方法，创建定时任务。代码如下：

```
 1: private void scheduleTimeout(final ChannelHandlerContext ctx, final ChannelPromise promise) {
 2:     // Schedule a timeout.
 3:     // 创建 WriteTimeoutTask 任务
 4:     final WriteTimeoutTask task = new WriteTimeoutTask(ctx, promise);
 5:     // 定时任务
 6:     task.scheduledFuture = ctx.executor().schedule(task, timeoutNanos, TimeUnit.NANOSECONDS);
 7: 
 8:     if (!task.scheduledFuture.isDone()) {
 9:         // 添加到链表
10:         addWriteTimeoutTask(task);
11: 
12:         // Cancel the scheduled timeout if the flush promise is complete.
13:         // 将 task 作为监听器，添加到 promise 中。在写入完成后，可以移除该定时任务
14:         promise.addListener(task);
15:     }
16: }
```

- 第 2 至 6 行：创建 WriteTimeoutTask 任务，并发起**定时任务**。
- 第 8 行：如果定时任务**已经执行完成**，则不需要进行监听。否则，需要执行【第 10 至 14 行】的代码逻辑。
- 第 10 行：调用 `#addWriteTimeoutTask(WriteTimeoutTask task)` 方法，添加到链表。详细解析，见 [「7.5 addWriteTimeoutTask」](http://svip.iocoder.cn/Netty/ChannelHandler-5-idle/#) 。
- 第 14 行：将 `task` 作为监听器，添加到 `promise` 中。在写入完成后，可以移除该定时任务。也就说，调用链是 `flush => 回调 => promise => 回调 => task` 。

## 7.5 addWriteTimeoutTask

`#addWriteTimeoutTask(WriteTimeoutTask task)` 方法，添加到链表。代码如下：

```
private void addWriteTimeoutTask(WriteTimeoutTask task) {
    // 添加到链表的尾节点
    if (lastTask != null) {
        lastTask.next = task;
        task.prev = lastTask;
    }
    // 修改 lastTask 为当前任务
    lastTask = task;
}
```

添加到链表的尾节点，并修改 `lastTask` 为**当前**任务。

## 7.6 removeWriteTimeoutTask

`#removeWriteTimeoutTask(WriteTimeoutTask task)` 方法，移除出链表。代码如下：

```
private void removeWriteTimeoutTask(WriteTimeoutTask task) {
    // 从双向链表中，移除自己
    if (task == lastTask) { // 尾节点
        // task is the tail of list
        assert task.next == null;
        lastTask = lastTask.prev;
        if (lastTask != null) {
            lastTask.next = null;
        }
    } else if (task.prev == null && task.next == null) { // 已经被移除
        // Since task is not lastTask, then it has been removed or not been added.
        return;
    } else if (task.prev == null) { // 头节点
        // task is the head of list and the list has at least 2 nodes
        task.next.prev = null;
    } else { // 中间的节点
        task.prev.next = task.next;
        task.next.prev = task.prev;
    }
    // 重置 task 前后节点为空
    task.prev = null;
    task.next = null;
}
```

该方法的调用，在 [「7.8 WriteTimeoutTask」](http://svip.iocoder.cn/Netty/ChannelHandler-5-idle/#) 会看到。

## 7.7 writeTimedOut

`#writeTimedOut(ChannelHandlerContext ctx)` 方法，写入超时，关闭 Channel 通道。代码如下：

```
/**
 * Is called when a write timeout was detected
 */
protected void writeTimedOut(ChannelHandlerContext ctx) throws Exception {
    if (!closed) {
        // 触发 Exception Caught 事件到 pipeline 中，异常为 WriteTimeoutException
        ctx.fireExceptionCaught(WriteTimeoutException.INSTANCE);
        // 关闭 Channel 通道
        ctx.close();
        // 标记 Channel 为已关闭
        closed = true;
    }
}
```

- 和 `ReadTimeoutHandler#readTimeout(ChannelHandlerContext ctx)` 方法，基本类似。

该方法的调用，在 [「7.8 WriteTimeoutTask」](http://svip.iocoder.cn/Netty/ChannelHandler-5-idle/#) 会看到。

## 7.8 WriteTimeoutTask

WriteTimeoutTask ，实现 Runnable 和 ChannelFutureListener 接口，写入超时任务。

> WriteTimeoutTask 是 WriteTimeoutHandler 的内部类。

### 7.8.1 构造方法

```
private final ChannelHandlerContext ctx;
/**
 * 写入任务的 Promise 对象
 */
private final ChannelPromise promise;

// WriteTimeoutTask is also a node of a doubly-linked list
/**
 * 前一个 task
 */
WriteTimeoutTask prev;
/**
 * 后一个 task
 */
WriteTimeoutTask next;
/**
 * 定时任务
 */
ScheduledFuture<?> scheduledFuture;

WriteTimeoutTask(ChannelHandlerContext ctx, ChannelPromise promise) {
    this.ctx = ctx;
    this.promise = promise;
}
```

### 7.8.2 run

当定时任务执行，说明写入任务执行超时。代码如下：

```
@Override
public void run() {
    // Was not written yet so issue a write timeout
    // The promise itself will be failed with a ClosedChannelException once the close() was issued
    // See https://github.com/netty/netty/issues/2159
    if (!promise.isDone()) { // 未完成，说明写入超时
        try {
            // <1> 写入超时，关闭 Channel 通道
            writeTimedOut(ctx);
        } catch (Throwable t) {
            // 触发 Exception Caught 事件到 pipeline 中
            ctx.fireExceptionCaught(t);
        }
    }
    // <2> 移除出链表
    removeWriteTimeoutTask(this);
}
```

- `<1>` 处，调用 `#writeTimedOut(ChannelHandlerContext ctx)` 方法，写入超时，关闭 Channel 通道。
- `<2>` 处，调用 `#removeWriteTimeoutTask(WriteTimeoutTask task)` 方法，移除出链表。

### 7.8.3 operationComplete

当回调方法执行，说明写入任务执行完成。代码如下：

```
@Override
public void operationComplete(ChannelFuture future) throws Exception {
    // scheduledFuture has already be set when reaching here
    // <1> 取消定时任务
    scheduledFuture.cancel(false);
    // <2> 移除出链表
    removeWriteTimeoutTask(this);
}
```

- `<1>` 处，取消定时任务。
- `<2>` 处，调用 `#removeWriteTimeoutTask(WriteTimeoutTask task)` 方法，移除出链表。

# 666. 彩蛋

和 「5.7 hasOutputChanged」(#) 小节，这个方法较真了好久。感谢中间，基友【莫那一鲁道】的沟通。

推荐阅读文章：

- 莫那一鲁道 [《Netty 心跳服务之 IdleStateHandler 源码分析》](https://www.jianshu.com/p/f2ed73cf4df8)
- Hypercube [自顶向下深入分析Netty（八）–ChannelHandler](https://www.jianshu.com/p/a9bcd89553f5)

# ChannelHandler（六）之 AbstractTrafficShapingHandler

笔者先把 Netty 主要的内容写完，所以关于 AbstractTrafficShapingHandler 的分享，先放在后续的计划里。

当然，良心如我，还是为对这块感兴趣的胖友，先准备好了一篇不错的文章：

- tomas家的小拨浪鼓 [《Netty 那些事儿 ——— Netty实现“流量整形”原理分析及实战》](https://www.jianshu.com/p/bea1b4ea8402)

为避免可能 [《Netty 那些事儿 ——— Netty实现“流量整形”原理分析及实战》](https://www.jianshu.com/p/bea1b4ea8402) 被作者删除，笔者这里先复制一份作为备份。

# 666. 备份

> 本文是Netty文集中“Netty 那些事儿”系列的文章。主要结合在开发实战中，我们遇到的一些“奇奇怪怪”的问题，以及如何正确且更好的使用Netty框架，并会对Netty中涉及的重要设计理念进行介绍。

### Netty实现“流量整形”原理分析

##### 流量整形

流量整形（Traffic Shaping）是一种主动调整流量输出速率的措施。流量整形与流量监管的主要区别在于，流量整形对流量监管中需要丢弃的报文进行缓存——通常是将它们放入缓冲区或队列内，也称流量整形（Traffic Shaping，简称TS）。当报文的发送速度过快时，首先在缓冲区进行缓存；再通过流量计量算法的控制下“均匀”地发送这些被缓冲的报文。流量整形与流量监管的另一区别是，整形可能会增加延迟，而监管几乎不引入额外的延迟。

Netty提供了GlobalTrafficShapingHandler、ChannelTrafficShapingHandler、GlobalChannelTrafficShapingHandler三个类来实现流量整形，他们都是AbstractTrafficShapingHandler抽象类的实现类，下面我们就对其进行介绍，让我们来了解Netty是如何实现流量整形的。

##### 核心类分析

###### AbstractTrafficShapingHandler

AbstractTrafficShapingHandler允许限制全局的带宽（见GlobalTrafficShapingHandler）或者每个session的带宽（见ChannelTrafficShapingHandler）作为流量整形。
它允许你使用TrafficCounter来实现几乎实时的带宽监控，TrafficCounter会在每个检测间期（checkInterval）调用这个处理器的doAccounting方法。

如果你有任何特别的原因想要停止监控（计数）或者改变读写的限制或者改变检测间期（checkInterval），可以使用如下方法：
① configure：允许你改变读或写的限制，或者检测间期（checkInterval）；
② getTrafficCounter：允许你获得TrafficCounter，并可以停止或启动监控，直接改变检测间期（checkInterval），或去访问它的值。

**TrafficCounter**：对读和写的字节进行计数以用于限制流量。
它会根据给定的检测间期周期性的计算统计入站和出站的流量，并会回调AbstractTrafficShapingHandler的doAccounting方法。
如果检测间期（checkInterval）是0，将不会进行计数并且统计只会在每次读或写操作时进行计算。

- configure

```
public void configure(long newWriteLimit, long newReadLimit,
        long newCheckInterval) {
    configure(newWriteLimit, newReadLimit);
    configure(newCheckInterval);
}
```

配置新的写限制、读限制、检测间期。该方法会尽最大努力进行此更改，这意味着已经被延迟进行的流量将不会使用新的配置，它仅用于新的流量中。

- ReopenReadTimerTask

```
static final class ReopenReadTimerTask implements Runnable {
    final ChannelHandlerContext ctx;
    ReopenReadTimerTask(ChannelHandlerContext ctx) {
        this.ctx = ctx;
    }

    @Override
    public void run() {
        ChannelConfig config = ctx.channel().config();
        if (!config.isAutoRead() && isHandlerActive(ctx)) {
            // If AutoRead is False and Active is True, user make a direct setAutoRead(false)
            // Then Just reset the status
            if (logger.isDebugEnabled()) {
                logger.debug("Not unsuspend: " + config.isAutoRead() + ':' +
                        isHandlerActive(ctx));
            }
            ctx.attr(READ_SUSPENDED).set(false);
        } else {
            // Anything else allows the handler to reset the AutoRead
            if (logger.isDebugEnabled()) {
                if (config.isAutoRead() && !isHandlerActive(ctx)) {
                    logger.debug("Unsuspend: " + config.isAutoRead() + ':' +
                            isHandlerActive(ctx));
                } else {
                    logger.debug("Normal unsuspend: " + config.isAutoRead() + ':'
                            + isHandlerActive(ctx));
                }
            }
            ctx.attr(READ_SUSPENDED).set(false);
            config.setAutoRead(true);
            ctx.channel().read();
        }
        if (logger.isDebugEnabled()) {
            logger.debug("Unsuspend final status => " + config.isAutoRead() + ':'
                    + isHandlerActive(ctx));
        }
    }
}
```

重启读操作的定时任务。该定时任务总会实现：
a) 如果Channel的autoRead为false，并且AbstractTrafficShapingHandler的READ_SUSPENDED属性设置为null或false（说明读暂停未启用或开启），则直接将READ_SUSPENDED属性设置为false。
b) 否则，如果Channel的autoRead为true，或者READ_SUSPENDED属性的值为true（说明读暂停开启了），则将READ_SUSPENDED属性设置为false，并将Channel的autoRead标识为true（该操作底层会将该Channel的OP_READ事件重新注册为感兴趣的事件，这样Selector就会监听该Channel的读就绪事件了），最后触发一次Channel的read操作。
也就说，若“读操作”为“开启”状态（READ_SUSPENDED为null或false）的情况下，Channel的autoRead是保持Channel原有的配置，此时并不会做什么操作。但当“读操作”从“暂停”状态（READ_SUSPENDED为true）转为“开启”状态（READ_SUSPENDED为false）时，则会将Channel的autoRead标志为true，并将“读操作”设置为“开启”状态（READ_SUSPENDED为false）。

- channelRead

```
public void channelRead(final ChannelHandlerContext ctx, final Object msg) throws Exception {
    long size = calculateSize(msg);
    long now = TrafficCounter.milliSecondFromNano();
    if (size > 0) {
        // compute the number of ms to wait before reopening the channel
        long wait = trafficCounter.readTimeToWait(size, readLimit, maxTime, now);
        wait = checkWaitReadTime(ctx, wait, now);
        if (wait >= MINIMAL_WAIT) { // At least 10ms seems a minimal
            // time in order to try to limit the traffic
            // Only AutoRead AND HandlerActive True means Context Active
            ChannelConfig config = ctx.channel().config();
            if (logger.isDebugEnabled()) {
                logger.debug("Read suspend: " + wait + ':' + config.isAutoRead() + ':'
                        + isHandlerActive(ctx));
            }
            if (config.isAutoRead() && isHandlerActive(ctx)) {
                config.setAutoRead(false);
                ctx.attr(READ_SUSPENDED).set(true);
                // Create a Runnable to reactive the read if needed. If one was create before it will just be
                // reused to limit object creation
                Attribute<Runnable> attr = ctx.attr(REOPEN_TASK);
                Runnable reopenTask = attr.get();
                if (reopenTask == null) {
                    reopenTask = new ReopenReadTimerTask(ctx);
                    attr.set(reopenTask);
                }
                ctx.executor().schedule(reopenTask, wait, TimeUnit.MILLISECONDS);
                if (logger.isDebugEnabled()) {
                    logger.debug("Suspend final status => " + config.isAutoRead() + ':'
                            + isHandlerActive(ctx) + " will reopened at: " + wait);
                }
            }
        }
    }
    informReadOperation(ctx, now);
    ctx.fireChannelRead(msg);
}
```

① 『long size = calculateSize(msg);』计算本次读取到的消息的字节数。
② 如果读取到的字节数大于0，则根据数据的大小、设定的readLimit、最大延迟时间等计算（『long wait = trafficCounter.readTimeToWait(size, readLimit, maxTime, now);』）得到下一次开启读操作需要的延迟时间（距当前时间而言）wait(毫秒)。
③ 如果a）wait >= MINIMAL_WAIT(10毫秒)。并且b）当前Channel为自动读取（即，autoRead为true）以及c）当前的READ_SUSPENDED标识为null或false（即，读操作未被暂停），那么将Channel的autoRead设置为false（该操作底层会将该Channel的OP_READ事件从感兴趣的事件中移除，这样Selector就不会监听该Channel的读就绪事件了），并且将READ_SUSPENDED标识为true（说明，接下来的读操作会被暂停），并将“重新开启读操作“封装为一个任务，让入Channel所注册NioEventLoop的定时任务队列中（延迟wait时间后执行）。
也就说，只有当计算出的下一次读操作的时间大于了MINIMAL_WAIT(10毫秒)，并且当前Channel是自动读取的，且“读操作”处于“开启”状态时，才会去暂停读操作，而暂停读操作主要需要完成三件事：[1]将Channel的autoRead标识设置为false，这使得OP_READ会从感兴趣的事件中移除，这样Selector就会不会监听这个Channel的读就绪事件了；[2]将“读操作”状态设置为“暂停”（READ_SUSPENDED为true）；[3]将重启开启“读操作”的操作封装为一个task，在延迟wait时间后执行。
当你将得Channel的autoRead都会被设置为false时，Netty底层就不会再去执行读操作了，也就是说，这时如果有数据过来，会先放入到内核的接收缓冲区，只有我们执行读操作的时候数据才会从内核缓冲区读取到用户缓冲区中。而对于TCP协议来说，你不要担心一次内核缓冲区会溢出。因为如果应用进程一直没有读取，接收缓冲区满了之后，发生的动作是：通知对端TCP协议中的窗口关闭。这个便是滑动窗口的实现。保证TCP套接口接收缓冲区不会溢出，从而保证了TCP是可靠传输。因为对方不允许发出超过所通告窗口大小的数据。 这就是TCP的流量控制，如果对方无视窗口大小而发出了超过窗口大小的数据，则接收方TCP将丢弃它。
④ 将当前的消息发送给ChannelPipeline中的下一个ChannelInboundHandler。

- write

```
public void write(final ChannelHandlerContext ctx, final Object msg, final ChannelPromise promise)
        throws Exception {
    long size = calculateSize(msg);
    long now = TrafficCounter.milliSecondFromNano();
    if (size > 0) {
        // compute the number of ms to wait before continue with the channel
        long wait = trafficCounter.writeTimeToWait(size, writeLimit, maxTime, now);
        if (wait >= MINIMAL_WAIT) {
            if (logger.isDebugEnabled()) {
                logger.debug("Write suspend: " + wait + ':' + ctx.channel().config().isAutoRead() + ':'
                        + isHandlerActive(ctx));
            }
            submitWrite(ctx, msg, size, wait, now, promise);
            return;
        }
    }
    // to maintain order of write
    submitWrite(ctx, msg, size, 0, now, promise);
}
```

① 『long size = calculateSize(msg);』计算待写出的数据大小
② 如果待写出数据的字节数大于0，则根据数据大小、设置的writeLimit、最大延迟时间等计算（『long wait = trafficCounter.writeTimeToWait(size, writeLimit, maxTime, now);』）得到本次写操作需要的延迟时间（距当前时间而言）wait(毫秒)。
③ 如果wait >= MINIMAL_WAIT（10毫秒），则调用『submitWrite(ctx, msg, size, wait, now, promise);』wait即为延迟时间，该方法的具体实现由子类完成；否则，若wait < MINIMAL_WAIT（10毫秒），则调用『submitWrite(ctx, msg, size, 0, now, promise);』注意这里传递的延迟时间为0了。

###### GlobalTrafficShapingHandler

这实现了AbstractTrafficShapingHandler的全局流量整形，也就是说它限制了全局的带宽，无论开启了几个channel。
注意『 OutboundBuffer.setUserDefinedWritability(index, boolean)』中索引使用’2’。

一般用途如下：
创建一个唯一的GlobalTrafficShapingHandler

```
GlobalTrafficShapingHandler myHandler = new GlobalTrafficShapingHandler(executor);
pipeline.addLast(myHandler);
```

executor可以是底层的IO工作池

注意，这个处理器是覆盖所有管道的，这意味着只有一个处理器对象会被创建并且作为所有channel间共享的计数器，它必须于所有的channel共享。
所有你可以见到，该类的定义上面有个`@Sharable`注解。

在你的处理器中，你需要考虑使用『channel.isWritable()』和『channelWritabilityChanged(ctx)』来处理可写性，或通过在ctx.write()返回的future上注册listener来实现。

你还需要考虑读或写操作对象的大小需要和你要求的带宽相对应：比如，你将一个10M大小的对象用于10KB/s的带宽将会导致爆发效果，若你将100KB大小的对象用于在1M/s带宽那么将会被流量整形处理器平滑处理。

一旦不在需要这个处理器时请确保调用『release()』以释放所有内部的资源。这不会关闭EventExecutor，因为它可能是共享的，所以这需要你自己做。

GlobalTrafficShapingHandler中持有一个Channel的哈希表，用于存储当前应用所有的Channel：

```
private final ConcurrentMap<Integer, PerChannel> channelQueues = PlatformDependent.newConcurrentHashMap();
```

key为Channel的hashCode；value是一个PerChannel对象。
PerChannel对象中维护有该Channel的待发送数据的消息队列（ArrayDeque messagesQueue）。

- submitWrite

```
void submitWrite(final ChannelHandlerContext ctx, final Object msg,
        final long size, final long writedelay, final long now,
        final ChannelPromise promise) {
    Channel channel = ctx.channel();
    Integer key = channel.hashCode();
    PerChannel perChannel = channelQueues.get(key);
    if (perChannel == null) {
        // in case write occurs before handlerAdded is raised for this handler
        // imply a synchronized only if needed
        perChannel = getOrSetPerChannel(ctx);
    }
    final ToSend newToSend;
    long delay = writedelay;
    boolean globalSizeExceeded = false;
    // write operations need synchronization
    synchronized (perChannel) {
        if (writedelay == 0 && perChannel.messagesQueue.isEmpty()) {
            trafficCounter.bytesRealWriteFlowControl(size);
            ctx.write(msg, promise);
            perChannel.lastWriteTimestamp = now;
            return;
        }
        if (delay > maxTime && now + delay - perChannel.lastWriteTimestamp > maxTime) {
            delay = maxTime;
        }
        newToSend = new ToSend(delay + now, msg, size, promise);
        perChannel.messagesQueue.addLast(newToSend);
        perChannel.queueSize += size;
        queuesSize.addAndGet(size);
        checkWriteSuspend(ctx, delay, perChannel.queueSize);
        if (queuesSize.get() > maxGlobalWriteSize) {
            globalSizeExceeded = true;
        }
    }
    if (globalSizeExceeded) {
        setUserDefinedWritability(ctx, false);
    }
    final long futureNow = newToSend.relativeTimeAction;
    final PerChannel forSchedule = perChannel;
    ctx.executor().schedule(new Runnable() {
        @Override
        public void run() {
            sendAllValid(ctx, forSchedule, futureNow);
        }
    }, delay, TimeUnit.MILLISECONDS);
}
```

写操作提交上来的数据。
① 如果写延迟为0，且当前该Channel的messagesQueue为空（说明，在此消息前没有待发送的消息了），那么直接发送该消息包。并返回，否则到下一步。
② 『newToSend = new ToSend(delay + now, msg, size, promise);
perChannel.messagesQueue.addLast(newToSend);』
将待发送的数据封装成ToSend对象放入PerChannel的消息队列中（messagesQueue）。注意，这里的messagesQueue是一个ArrayDeque队列，我们总是从队列尾部插入。然后从队列的头获取消息来依次发送，这就保证了消息的有序性。但是，如果一个大数据包前于一个小数据包发送的话，小数据包也会因为大数据包的延迟发送而被延迟到大数据包发送后才会发送。
ToSend 对象中持有带发送的数据对象、发送的相对延迟时间（即，根据数据包大小以及设置的写流量限制值（writeLimit）等计算出来的延迟操作的时间）、消息数据的大小、异步写操作的promise。
③ 『checkWriteSuspend(ctx, delay, perChannel.queueSize);』
检查单个Channel待发送的数据包是否超过了maxWriteSize（默认4M），或者延迟时间是否超过了maxWriteDelay（默认4s）。如果是的话，则调用『setUserDefinedWritability(ctx, false);』该方法会将ChannelOutboundBuffer中的unwritable属性值的相应标志位置位（unwritable关系到isWritable方法是否会返回true。以及会在unwritable从0到非0间变化时触发ChannelWritabilityChanged事件）。
④ 如果所有待发送的数据大小（这里指所有Channel累积的待发送的数据大小）大于了maxGlobalWriteSize（默认400M），则标识globalSizeExceeded为true，并且调用『setUserDefinedWritability(ctx, false)』将ChannelOutboundBuffer中的unwritable属性值相应的标志位置位。
⑤ 根据指定的延迟时间（一个 >= 0 且 <= maxTime 的值，maxTime默认15s）delay，将『sendAllValid(ctx, forSchedule, futureNow);』操作封装成一个任务提交至executor的定时周期任务队列中。
sendAllValid操作会遍历该Channel中待发送的消息队列messagesQueue，依次取出perChannel.messagesQueue中的消息包，将满足发送条件（即，延迟发送的时间已经到了）的消息发送给到ChannelPipeline中的下一个ChannelOutboundHandler（ctx.write(newToSend.toSend, newToSend.promise);），并且将perChannel.queueSize（当前Channel待发送的总数据大小）和queuesSize（所有Channel待发送的总数据大小）减小相应的值（即，被发送出去的这个数据包的大小）。循环遍历前面的操作直到当前的消息不满足发送条件则退出遍历。并且如果该Channel的消息队列中的消息全部都发送出去的话（即，messagesQueue.isEmpty()为true），则会通过调用『releaseWriteSuspended(ctx);』来释放写暂停。而该方法底层会将ChannelOutboundBuffer中的unwritable属性值相应的标志位重置。

###### ChannelTrafficShapingHandler

ChannelTrafficShapingHandler是针对单个Channel的流量整形，和GlobalTrafficShapingHandler的思想是一样的。只是实现中没有对全局概念的检测，仅检测了当前这个Channel的数据。
这里就不再赘述了。

###### GlobalChannelTrafficShapingHandler

相比于GlobalTrafficShapingHandler增加了一个误差概念，以平衡各个Channel间的读/写操作。也就是说，使得各个Channel间的读/写操作尽量均衡。比如，尽量避免不同Channel的大数据包都延迟近乎一样的是时间再操作，以及如果小数据包在一个大数据包后才发送，则减少该小数据包的延迟发送时间等。。

### “流量整形”实战

这里仅展示服务端和客户端中使用“流量整形”功能涉及的关键代码，完整demo可见[github](https://link.jianshu.com/?t=https%3A%2F%2Fgithub.com%2Flinling1%2Fnetty_module_function%2Ftree%2Fmaster%2Fsrc%2Fmain%2Fjava%2Fcom%2Flinling%2Fnetty%2Ftrafficshaping)
**服务端**
使用GlobalTrafficShapingHandler来实现服务端的“流量整形”，每当有客户端连接至服务端时服务端就会开始往这个客户端发送26M的数据包。我们将GlobalTrafficShapingHandler的writeLimit设置为10M/S。并使用了ChunkedWriteHandler来实现大数据包拆分成小数据包发送的功能。

MyServerInitializer实现：在ChannelPipeline中注册了GlobalTrafficShapingHandler

```
public class MyServerInitializer extends ChannelInitializer<SocketChannel> {

    Charset utf8 = Charset.forName("utf-8");
    final int M = 1024 * 1024;

    @Override
    protected void initChannel(SocketChannel ch) throws Exception {

        GlobalTrafficShapingHandler globalTrafficShapingHandler = new GlobalTrafficShapingHandler(ch.eventLoop().parent(), 10 * M, 50 * M);
//        globalTrafficShapingHandler.setMaxGlobalWriteSize(50 * M);
//        globalTrafficShapingHandler.setMaxWriteSize(5 * M);

        ch.pipeline()
                .addLast("LengthFieldBasedFrameDecoder", new LengthFieldBasedFrameDecoder(Integer.MAX_VALUE, 0, 4, 0, 4, true))
                .addLast("LengthFieldPrepender", new LengthFieldPrepender(4, 0))
                .addLast("GlobalTrafficShapingHandler", globalTrafficShapingHandler)
                .addLast("chunkedWriteHandler", new ChunkedWriteHandler())
                .addLast("myServerChunkHandler", new MyServerChunkHandler())
                .addLast("StringDecoder", new StringDecoder(utf8))
                .addLast("StringEncoder", new StringEncoder(utf8))
                .addLast("myServerHandler", new MyServerHandlerForPlain());
    }
}
```

ServerHandler：当有客户端连接上了后就开始给客户端发送消息。并且通过『Channel#isWritable』方法以及『channelWritabilityChanged』事件来监控可写性，以判断啥时需要停止数据的写出，啥时可以开始继续写出数据。同时写了一个简易的task来计算每秒数据的发送速率（并非精确的计算）。

```
public class MyServerHandlerForPlain extends MyServerCommonHandler {

    @Override
    protected void sentData(ChannelHandlerContext ctx) {
        sentFlag = true;
        ctx.writeAndFlush(tempStr, getChannelProgressivePromise(ctx, future -> {
            if(ctx.channel().isWritable() && !sentFlag) {
                sentData(ctx);
            }
        }));
    }

    @Override
    public void channelWritabilityChanged(ChannelHandlerContext ctx) throws Exception {
        if(ctx.channel().isWritable() && !sentFlag) {
//            System.out.println(" ###### 重新开始写数据 ######");
            sentData(ctx);
        } else {
//            System.out.println(" ===== 写暂停 =====");
        }
    }
}

public abstract class MyServerCommonHandler extends SimpleChannelInboundHandler<String> {

    protected final int M = 1024 * 1024;
    protected String tempStr;
    protected AtomicLong consumeMsgLength;
    protected Runnable counterTask;
    private long priorProgress;
    protected boolean sentFlag;

    @Override
    public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
        consumeMsgLength = new AtomicLong();
        counterTask = () -> {
          while (true) {
              try {
                  Thread.sleep(1000);
              } catch (InterruptedException e) {

              }

              long length = consumeMsgLength.getAndSet(0);
              System.out.println("*** " + ctx.channel().remoteAddress() + " rate（M/S）：" + (length / M));
          }
        };
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < M; i++) {
            builder.append("abcdefghijklmnopqrstuvwxyz");
        }
        tempStr = builder.toString();
        super.handlerAdded(ctx);
    }

    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        sentData(ctx);
        new Thread(counterTask).start();
    }

    protected ChannelProgressivePromise getChannelProgressivePromise(ChannelHandlerContext ctx, Consumer<ChannelProgressiveFuture> completedAction) {
        ChannelProgressivePromise channelProgressivePromise = ctx.newProgressivePromise();
        channelProgressivePromise.addListener(new ChannelProgressiveFutureListener(){
            @Override
            public void operationProgressed(ChannelProgressiveFuture future, long progress, long total) throws Exception {
                consumeMsgLength.addAndGet(progress - priorProgress);
                priorProgress = progress;
            }

            @Override
            public void operationComplete(ChannelProgressiveFuture future) throws Exception {
                sentFlag = false;
                if(future.isSuccess()){
                    System.out.println("成功发送完成！");
                    priorProgress -= 26 * M;
                    Optional.ofNullable(completedAction).ifPresent(action -> action.accept(future));
                } else {
                    System.out.println("发送失败！！！！！");
                    future.cause().printStackTrace();
                }
            }
        });
        return channelProgressivePromise;
    }

    protected abstract void sentData(ChannelHandlerContext ctx);

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String msg) throws Exception {
        System.out.println("===== receive client msg : " + msg);
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        cause.printStackTrace();
        ctx.channel().close();
    }

}
```

**客户端**
客户端比较简单了，使用ChannelTrafficShapingHandler来实现“流量整形”，并将readLimit设置为1M/S。

```
public class MyClientInitializer extends ChannelInitializer<SocketChannel> {

    Charset utf8 = Charset.forName("utf-8");

    final int M = 1024 * 1024;

    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelTrafficShapingHandler channelTrafficShapingHandler = new ChannelTrafficShapingHandler(10 * M, 1 * M);
        ch.pipeline()
                .addLast("channelTrafficShapingHandler",channelTrafficShapingHandler)
                .addLast("lengthFieldBasedFrameDecoder", new LengthFieldBasedFrameDecoder(Integer.MAX_VALUE, 0, 4, 0, 4, true))
                .addLast("lengthFieldPrepender", new LengthFieldPrepender(4, 0))
                .addLast("stringDecoder", new StringDecoder(utf8))
                .addLast("stringEncoder", new StringEncoder(utf8))
                .addLast("myClientHandler", new MyClientHandler());
    }
}
```

##### 注意事项

① 注意，trafficShaping是通过程序来达到控制流量的作用，并不是网络层真实的传输流量大小的控制。TrafficShapingHandler仅仅是根据消息大小（待发送出去的数据包大小）和设定的流量限制来得出延迟发送该包的时间，即同一时刻不会发送过大的数据导致带宽负荷不了。但是并没有对大数据包进行拆分的作用，这会使在发送这个大数据包时同样可能会导致带宽爆掉的情况。所以你需要注意一次发送数据包的大小，不要大于你设置限定的写带宽大小(writeLimit)。你可以通过在业务handler中自己控制的方式，或者考虑使用ChunkedWriteHandler，如果它能满足你的要求的话。同时注意，不要将writeLimit和readLimit设置的过小，这是没有意义的，只会导致读/写操作的不断停顿。。
② 注意，不要在非NioEventLoop线程中不停歇的发送非ByteBuf、ByteBufHolder或者FileRegion对象的大数据包，如：

```
new Thread(() -> {
        while (true) {
            if(ctx.channel().isWritable()) {
                ctx.writeAndFlush(tempStr, getChannelProgressivePromise(ctx, null));
            }
        }
    }).start();
```

因为写操作是一个I/O操作，当你在非NioEventLoop线程上执行了Channel的I/O操作的话，该操作会封装为一个task 被提交至NioEventLoop的任务队列中，以使得I/O操作最终是NioEventLoop线程上得到执行。
而提交这个任务的流程，仅会对ByteBuf、ByteBufHolder或者FileRegion对象进行真实数据大小的估计（其他情况默认估计大小为8 bytes），并将估计后的数据大小值对该ChannelOutboundBuffer的totalPendingSize属性值进行累加。而totalPendingSize同WriteBufferWaterMark一起来控制着Channel的unwritable。所以，如果你在一个非NioEventLoop线程中不断地发送一个非ByteBuf、ByteBufHolder或者FileRegion对象的大数据包时，最终就会导致提交大量的任务到NioEventLoop线程的任务队列中，而当NioEventLoop线程在真实执行这些task时可能发生OOM。

### 扩展

##### 关于 “OP_WRITE” 与 “Channel#isWritable()”

首先，我们需要明确的一点是，“OP_WRITE” 与 “Channel#isWritable()” 虽然都是的对数据的可写性进行检测，但是它们是分别针对不同层面的可写性的。

- “OP_WRITE”是当内核的发送缓冲区满的时候，我们程序执行write操作（这里是真实写操作了，将数据通过TCP协议进行网络传输）无法将数据写出，这时我们需要注册OP_WRITE事件。这样当发送缓冲区空闲时就OP_WRITE事件就会触发，我们就可以继续write未写完的数据了。这可以看做是对系统层面的可写性的一种检测。
- 而“Channel#isWritable()”则是检测程序中的缓存的待写出的数据大小超过了我们设定的相关最大写数据大小，如果超过了isWritable()方法将返回false，说明这时我们不应该再继续进行write操作了（这里写操作一般为通过ChannelHandlerContext或Channel进行的写操作）。
  关于“OP_WRITE”前面的[NIO文章](https://www.jianshu.com/p/1af407c043cb)及前面Netty系列文章已经进行过不少介绍了，这里不再赘述。下面我们来看看“Channel#isWritable()”是如果检测可写性的。

```
public boolean isWritable() {
    return unwritable == 0;
}
```

ChannelOutboundBuffer 的 unwritable属性为0时，Channel的isWritable()方法将返回true；否之，返回false；
unwritable可以看做是一个二进制的开关属性值。它的二进制的不同位表示的不同状态的开关。如：

[![img](https://upload-images.jianshu.io/upload_images/4235178-5291c64aba1bbaac.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/972/format/jpeg)](https://upload-images.jianshu.io/upload_images/4235178-5291c64aba1bbaac.jpg?imageMogr2/auto-orient/strip|imageView2/2/w/972/format/jpeg)img

ChannelOutboundBuffer有四个方法会对unwritable属性值进行修改：clearUserDefinedWritability、setUnwritable、setUserDefinedWritability、setWritable。并且，当unwritable从0到非0间改变时还会触发ChannelWritabilityChanged事件，以通知ChannelPipeline中的各个ChannelHandler当前Channel可写性发生了改变。

其中setUnwritable、setWritable这对方法是由于待写数据大小高于或低于了WriteBufferWaterMark的水位线而导致的unwritable属性值的改变。
我们所执行的『ChannelHandlerContext#write』和『Channel#write』操作会先将待发送的数据包放到Channel的输出缓冲区（ChannelOutboundBuffer）中，然后在执行flush操作的时候，会从ChannelOutboundBuffer中依次出去数据包进行真实的网络数据传输。而WriteBufferWaterMark控制的就是ChannelOutboundBuffer中待发送的数据总大小（即，totalPendingSize：包含一个个ByteBuf中待发送的数据大小，以及数据包对象占用的大小）。如果totalPendingSize的大小超过了WriteBufferWaterMark高水位（默认为64KB），则会unwritable属性的’WriteBufferWaterMark状态位’置位1；随着数据不断写出（每写完一个ByteBuf后，就会将totalPendingSize减少相应的值），当totalPendingSize的大小小于WriteBufferWaterMark低水位（默认为32KB）时，则会将unwritable属性的’WriteBufferWaterMark状态位’置位0。

而本文的主题“流量整形”则是使用了clearUserDefinedWritability、setUserDefinedWritability这对方法来控制unwritable相应的状态位。
当数据write到GlobalTrafficShapingHandler的时候，估计的数据大小大于0，且通过trafficCounter计算出的延迟时间大于最小延迟时间（MINIMAL_WAIT，默认为10ms）时，满足如下任意条件会使得unwritable的’GlobalTrafficShaping状态位’置为1：

- 当perChannel.queueSize（单个Channel中待写出的总数据大小）设定的最大写数据大小时（默认为4M）
- 当queuesSize（所有Channel的待写出的总数据大小）超过设定的最大写数据大小时（默认为400M）
- 对于Channel发送的单个数据包如果太大，以至于计算出的延迟发送时间大于了最大延迟发送时间（maxWriteDelay，默认为4s）时

随着写延迟时间的到达GlobalTrafficShaping中积压的数据不断被写出，当某个Channel中所有待写出的数据都写出后（注意，这里指将数据写到ChannelPipeline中的下一个ChannelOutboundBuffer中）会将unwritable的’GlobalTrafficShaping状态位’置为0。