## Netty简介（一）之项目结构

### 1. 概述

本文主要分享 **Netty 的项目结构**。
希望通过本文能让胖友对 Netty 的整体项目有个简单的了解。

在拉取 Netty 项目后，我们会发现拆分了**好多** Maven 项目。是不是内心一紧，产生了恐惧感？不要方，我们就是继续怼。

![image-20221219205926991](../../_media/analysis/netty/image-20221219205926991.png)

### 2. 代码统计

这里先分享一个小技巧。笔者在开始源码学习时，会首先了解项目的代码量。

**第一种方式**，使用 [IDEA Statistic](https://plugins.jetbrains.com/plugin/4509-statistic) 插件，统计整体代码量。

![image-20221219210042829](../../_media/analysis/netty/image-20221219210042829.png)

我们可以粗略的看到，总的代码量在 251365 行。这其中还包括单元测试，示例等等代码。
所以，不慌。

**第二种方式**，使用 [Shell 脚本命令逐个 Maven 模块统计](http://blog.csdn.net/yhhwatl/article/details/52623879) 。

一般情况下，笔者使用 `find . -name "*.java"|xargs cat|grep -v -e ^$ -e ^\s*\/\/.*$|wc -l` 。这个命令只过滤了**部分注释**，所以相比 [IDEA Statistic](https://plugins.jetbrains.com/plugin/4509-statistic) 会**偏多**。

当然，考虑到准确性，胖友需要手动 `cd` 到每个 Maven 项目的 `src/main/java` 目录下，以达到排除单元测试的代码量。

![image-20221219210101759](../../_media/analysis/netty/image-20221219210101759.png)

- 😈 偷懒了下，暂时只统计**核心**模块，未统计**拓展**模块。

### 3. 架构图

在看具体每个 Netty 的 Maven 项目之前，我们还是先来看看 Netty 的整体架构图。

![image-20221219210146849](../../_media/analysis/netty/image-20221219210146849.png)

- Core：核心部分，是底层的网络通用抽象和部分实现。
  - Extensible Event Model ：可拓展的事件模型。Netty 是基于事件模型的网络应用框架。
  - Universal Communication API ：通用的通信 API 层。Netty 定义了一套抽象的通用通信层的 API 。
  - Zero-Copy-Capable Rich Byte Buffer ：支持零拷贝特性的 Byte Buffer 实现。
- Transport Services：传输( 通信 )服务，具体的网络传输的定义与实现。
  - Socket & Datagram ：TCP 和 UDP 的传输实现。
  - HTTP Tunnel ：HTTP 通道的传输实现。
  - In-VM Piple ：JVM 内部的传输实现。😈 理解起来有点怪，后续看具体代码，会易懂。
- **Protocol Support** ：协议支持。Netty 对于一些通用协议的编解码实现。例如：HTTP、Redis、DNS 等等。

### 4. 项目依赖图

Netty 的 Maven 项目之间**主要依赖**如下图：

![image-20221219210307016](../../_media/analysis/netty/image-20221219210307016.png)

- 本图省略**非主要依赖**。例如，`handler-proxy` 对 `codec` 有依赖，但是并未画出。
- 本图省略**非主要的项目**。例如，`resolver`、`testsuite`、`example` 等等。

下面，我们来详细介绍每个项目。

### 5. common

`common` 项目，该项目是一个通用的工具类项目，几乎被所有的其它项目依赖使用，它提供了一些数据类型处理工具类，并发编程以及多线程的扩展，计数器等等通用的工具类。

![image-20221219210352894](../../_media/analysis/netty/image-20221219210352894.png)

### 6. buffer

> 该项目实现了 Netty 架构图中的 Zero-Copy-Capable Rich Byte Buffer 。

`buffer` 项目，该项目下是 Netty 自行实现的一个 Byte Buffer 字节缓冲区。该包的实现相对于 JDK 自带的 ByteBuffer 有很多**优点**：无论是 API 的功能，使用体验，性能都要更加优秀。它提供了**一系列( 多种 )**的抽象定义以及实现，以满足不同场景下的需要。

![image-20221219210435092](../../_media/analysis/netty/image-20221219210435092.png)

### 7. transport

> 该项是核心项目，实现了 Netty 架构图中 Transport Services、Universal Communication API 和 Extensible Event Model 等多部分内容。

`transport` 项目，该项目是网络传输通道的抽象和实现。它定义通信的统一通信 API ，统一了 JDK 的 OIO、NIO ( 不包括 AIO )等多种编程接口。

![image-20221219210513822](../../_media/analysis/netty/image-20221219210513822.png)

另外，它提供了多个子项目，实现不同的传输类型。例如：`transport-native-epoll`、`transport-native-kqueue`、`transport-rxtx`、`transport-udt` 和 `transport-sctp` 等等。

### 8. codec

> 该项目实现了Netty 架构图中的 Protocol Support 。

`codec` 项目，该项目是协议编解码的抽象与**部分**实现：JSON、Google Protocol、Base64、XML 等等。

![image-20221219210542793](../../_media/analysis/netty/image-20221219210542793.png)

另外，它提供了多个子项目，实现不同协议的编解码。例如：`codec-dns`、`codec-haproxy`、`codec-http`、`codec-http2`、`codec-mqtt`、`codec-redis`、`codec-memcached`、`codec-smtp`、`codec-socks`、`codec-stomp`、`codec-xml` 等等。

### 9. handler

`handler` 项目，该项目是提供**内置的**连接通道处理器( ChannelHandler )实现类。例如：SSL 处理器、日志处理器等等。

![image-20221219210609438](../../_media/analysis/netty/image-20221219210609438.png)

另外，它提供了一个子项目 `handler-proxy` ，实现对 HTTP、Socks 4、Socks 5 的代理转发。

### 10. example

`example` 项目，该项目是提供各种 Netty 使用示例，良心开源项目。

![image-20221219210654741](../../_media/analysis/netty/image-20221219210654741.png)

### 11. 其它项目

Netty 中还有其它项目，考虑到不是本系列的重点，就暂时进行省略。

- `all` ：All In One 的 `pom` 声明。

- `bom` ：Netty Bill Of Materials 的缩写，不了解的胖友，可以看看 [《Maven 与Spring BOM( Bill Of Materials )简化 Spring 版本控制》](https://blog.csdn.net/fanxiaobin577328725/article/details/66974896) 。

- `microbench` ：微基准测试。

- `resolver` ：终端( Endpoint ) 的地址解析器。

- `resolver-dns`

- `tarball` ：All In One 打包工具。

- `testsuite` ：测试集。

  > 测试集( TestSuite ) ：测试集是把多个相关测试归入一个组的表达方式。在 Junit 中，如果我们没有明确的定义一个测试集，那么 Juint 会自动的提供一个测试集。一个测试集一般将同一个包的测试类归入一组。

- `testsuite-autobahhn`

- `testsuite-http2`

- `testsuite-osgi`

## Netty简介（二）之核心组件

### 1. 概述

什么是 Netty ？

> Netty 是一款提供异步的、事件驱动的网络应用程序框架和工具，用以快速开发高性能、高可靠性的网络服务器和客户端程序。
>
> 也就是说，Netty 是一个基于 NIO 的客户、服务器端编程框架。使用 Netty 可以确保你快速和简单地开发出一个网络应用，例如实现了某种协议的客户，服务端应用。Netty 相当简化和流线化了网络应用的编程开发过程，例如，TCP 和 UDP 的 socket 服务开发。

Netty 具有如下特性:

| 分类     | Netty的特性                                                  |
| :------- | :----------------------------------------------------------- |
| 设计     | 1. 统一的 API ，支持多种传输类型( 阻塞和非阻塞的 ) 2. 简单而强大的线程模型 3. 真正的无连接数据报套接字( UDP )支持 4. 连接逻辑组件( ChannelHander 中顺序处理消息 )以及组件复用( 一个 ChannelHandel 可以被多个ChannelPipeLine 复用 ) |
| 易于使用 | 1. 详实的 Javadoc 和大量的示例集 2. 不需要超过 JDK 1.6+ 的依赖 |
| 性能     | 拥有比 Java 的核心 API 更高的吞吐量以及更低的延迟( 得益于池化和复用 )，更低的资源消耗以及最少的内存复制 |
| 健壮性   | 1. 不会因为慢速、快速或者超载的连接而导致 OutOfMemoryError 2. 消除在高速网络中 NIO 应用程序常见的不公平读 / 写比率 |
| 安全性   | 完整的 SSL/TLS 以及 StartTLs 支持，可用于受限环境下，如 Applet 和 OSGI |
| 社区驱动 | 发布快速而且频繁                                             |

### 2. Netty 核心组件

为了后期更好地理解和进一步深入 Netty，有必要总体认识一下 Netty 所用到的核心组件以及他们在整个 Netty 架构中是如何协调工作的。

Netty 有如下几个核心组件：

- Bootstrap & ServerBootstrap
- Channel
- ChannelFuture
- EventLoop & EventLoopGroup
- ChannelHandler
- ChannelPipeline

核心组件的高层类图如下：

![image-20221219211433104](../../_media/analysis/netty/image-20221219211433104.png)

#### 2.1 Bootstrap & ServerBootstrap

这 2 个类都继承了AbstractBootstrap，因此它们有很多相同的方法和职责。它们都是**启动器**，能够帮助 Netty 使用者更加方便地组装和配置 Netty ，也可以更方便地启动 Netty 应用程序。相比使用者自己从头去将 Netty 的各部分组装起来要方便得多，降低了使用者的学习和使用成本。它们是我们使用 Netty 的入口和最重要的 API ，可以通过它来连接到一个主机和端口上，也可以通过它来绑定到一个本地的端口上。总的来说，**它们两者之间相同之处要大于不同**。

> Bootstrap & ServerBootstrap 对于 Netty ，就相当于 Spring Boot 是 Spring 的启动器。

它们和其它组件之间的关系是它们将 Netty 的其它组件进行组装和配置，所以它们会组合和直接或间接依赖其它的类。

Bootstrap 用于启动一个 Netty TCP 客户端，或者 UDP 的一端。

- 通常使用 `#connet(...)` 方法连接到远程的主机和端口，作为一个 Netty TCP 客户端。
- 也可以通过 `#bind(...)` 方法绑定本地的一个端口，作为 UDP 的一端。
- 仅仅需要使用**一个** EventLoopGroup 。

ServerBootstrap 往往是用于启动一个 Netty 服务端。

- 通常使用 `#connet(...)` 方法连接到远程的主机和端口，作为一个 Netty TCP 客户端。
- 也可以通过 `#bind(...)` 方法绑定本地的一个端口，作为 UDP 的一端。
- 仅仅需要使用**一个** EventLoopGroup 。

ServerBootstrap 往往是用于启动一个 Netty 服务端。

Channel 是 Netty 网络操作抽象类，它除了包括基本的 I/O 操作，如 bind、connect、read、write 之外，还包括了 Netty 框架相关的一些功能，如获取该 Channel 的 EventLoop 。

在传统的网络编程中，作为核心类的 Socket ，它对程序员来说并不是那么友好，直接使用其成本还是稍微高了点。而 Netty 的 Channel 则提供的一系列的 API ，它大大降低了直接与 Socket 进行操作的复杂性。而相对于原生 NIO 的 Channel，Netty 的 Channel 具有如下优势( 摘自《Netty权威指南( 第二版 )》) ：

- 在 Channel 接口层，采用 Facade 模式进行统一封装，将网络 I/O 操作、网络 I/O 相关联的其他操作封装起来，统一对外提供。
- Channel 接口的定义尽量大而全，为 SocketChannel 和 ServerSocketChannel 提供统一的视图，由不同子类实现不同的功能，公共功能在抽象父类中实现，最大程度地实现功能和接口的重用。
- 具体实现采用聚合而非包含的方式，将相关的功能类聚合在 Channel 中，由 Channel 统一负责和调度，功能实现更加灵活。

#### 2.2 EventLoop && EventLoopGroup

Netty 基于**事件驱动模型**，使用不同的事件来通知我们状态的改变或者操作状态的改变。它定义了在整个连接的生命周期里当有事件发生的时候处理的核心抽象。

Channel 为Netty 网络操作抽象类，EventLoop 负责处理注册到其上的 Channel 处理 I/O 操作，两者配合参与 I/O 操作。

EventLoopGroup 是一个 EventLoop 的分组，它可以获取到一个或者多个 EventLoop 对象，因此它提供了迭代出 EventLoop 对象的方法。

下图是 Channel、EventLoop、Thread、EventLoopGroup 之间的关系( 摘自《Netty In Action》) ：

![image-20221219211832275](../../_media/analysis/netty/image-20221219211832275.png)

- 一个 EventLoopGroup 包含一个或多个 EventLoop ，即 EventLoopGroup : EventLoop = `1 : n` 。
- 一个 EventLoop 在它的生命周期内，只能与一个 Thread 绑定，即 EventLoop : Thread = `1 : 1` 。
- 所有有 EventLoop 处理的 I/O 事件都将在它**专有**的 Thread 上被处理，从而保证线程安全，即 Thread : EventLoop = `1 : 1`。
- 一个 Channel 在它的生命周期内只能注册到一个 EventLoop 上，即 Channel : EventLoop = `n : 1` 。
- 一个 EventLoop 可被分配至一个或多个 Channel ，即 EventLoop : Channel = `1 : n` 。

当一个连接到达时，Netty 就会创建一个 Channel，然后从 EventLoopGroup 中分配一个 EventLoop 来给这个 Channel 绑定上，在该 Channel 的整个生命周期中都是有这个绑定的 EventLoop 来服务的。

#### 2.4 ChannelFuture

Netty 为异步非阻塞，即所有的 I/O 操作都为异步的，因此，我们不能立刻得知消息是否已经被处理了。Netty 提供了 ChannelFuture 接口，通过该接口的 `#addListener(...)` 方法，注册一个 ChannelFutureListener，当操作执行成功或者失败时，监听就会自动触发返回结果。

#### 2.5 ChannelHandler

ChannelHandler ，连接通道处理器，我们使用 Netty 中中**最常用**的组件。ChannelHandler 主要用来处理各种事件，这里的事件很广泛，比如可以是连接、数据接收、异常、数据转换等。

ChannelHandler 有两个核心子类 ChannelInboundHandler 和 ChannelOutboundHandler，其中 ChannelInboundHandler 用于接收、处理入站( Inbound )的数据和事件，而 ChannelOutboundHandler 则相反，用于接收、处理出站( Outbound )的数据和事件。

- ChannelInboundHandler 的实现类还包括一系列的 **Decoder** 类，对输入字节流进行解码。
- ChannelOutboundHandler 的实现类还包括一系列的 **Encoder** 类，对输入字节流进行编码。

ChannelDuplexHandler 可以**同时**用于接收、处理入站和出站的数据和时间。

ChannelHandler 还有其它的一系列的抽象实现 Adapter ，以及一些用于编解码具体协议的 ChannelHandler 实现类。

#### 2.6 ChannelPipeline

ChannelPipeline 为 ChannelHandler 的**链**，提供了一个容器并定义了用于沿着链传播入站和出站事件流的 API 。一个数据或者事件可能会被多个 Handler 处理，在这个过程中，数据或者事件经流 ChannelPipeline ，由 ChannelHandler 处理。在这个处理过程中，一个 ChannelHandler 接收数据后处理完成后交给下一个 ChannelHandler，或者什么都不做直接交给下一个 ChannelHandler。

![image-20221219212106763](../../_media/analysis/netty/image-20221219212106763.png)

- 当一个数据流进入 ChannelPipeline 时，它会从 ChannelPipeline 头部开始，传给第一个 ChannelInboundHandler 。当第一个处理完后再传给下一个，一直传递到管道的尾部。
- 与之相对应的是，当数据被写出时，它会从管道的尾部开始，先经过管道尾部的“最后”一个ChannelOutboundHandler ，当它处理完成后会传递给前一个 ChannelOutboundHandler 。

上图更详细的，可以是如下过程：

```java
*                                                 I/O Request
*                                            via {@link Channel} or
*                                        {@link ChannelHandlerContext}
*                                                      |
*  +---------------------------------------------------+---------------+
*  |                           ChannelPipeline         |               |
*  |                                                  \|/              |
*  |    +---------------------+            +-----------+----------+    |
*  |    | Inbound Handler  N  |            | Outbound Handler  1  |    |
*  |    +----------+----------+            +-----------+----------+    |
*  |              /|\                                  |               |
*  |               |                                  \|/              |
*  |    +----------+----------+            +-----------+----------+    |
*  |    | Inbound Handler N-1 |            | Outbound Handler  2  |    |
*  |    +----------+----------+            +-----------+----------+    |
*  |              /|\                                  .               |
*  |               .                                   .               |
*  | ChannelHandlerContext.fireIN_EVT() ChannelHandlerContext.OUT_EVT()|
*  |        [ method call]                       [method call]         |
*  |               .                                   .               |
*  |               .                                  \|/              |
*  |    +----------+----------+            +-----------+----------+    |
*  |    | Inbound Handler  2  |            | Outbound Handler M-1 |    |
*  |    +----------+----------+            +-----------+----------+    |
*  |              /|\                                  |               |
*  |               |                                  \|/              |
*  |    +----------+----------+            +-----------+----------+    |
*  |    | Inbound Handler  1  |            | Outbound Handler  M  |    |
*  |    +----------+----------+            +-----------+----------+    |
*  |              /|\                                  |               |
*  +---------------+-----------------------------------+---------------+
*                  |                                  \|/
*  +---------------+-----------------------------------+---------------+
*  |               |                                   |               |
*  |       [ Socket.read() ]                    [ Socket.write() ]     |
*  |                                                                   |
*  |  Netty Internal I/O Threads (Transport Implementation)            |
*  +-------------------------------------------------------------------+
```

------

当 ChannelHandler 被添加到 ChannelPipeline 时，它将会被分配一个

**ChannelHandlerContext** ，它代表了 ChannelHandler 和 ChannelPipeline 之间的绑定。其中 ChannelHandler 添加到 ChannelPipeline 中，通过 ChannelInitializer 来实现，过程如下：

1. 一个 ChannelInitializer 的实现对象，被设置到了 BootStrap 或 ServerBootStrap 中。
2. 当 `ChannelInitializer#initChannel()` 方法被调用时，ChannelInitializer 将在 ChannelPipeline 中创建**一组**自定义的 ChannelHandler 对象。
3. ChannelInitializer 将它自己从 ChannelPipeline 中移除。

> ChannelInitializer 是一个特殊的 ChannelInboundHandlerAdapter 抽象类。

- 小明哥 [《【死磕 Netty 】—— Netty的核心组件》](https://cloud.tencent.com/developer/article/1110061)
- 杨武兵 [《Netty 源码分析系列 —— 概述》](https://my.oschina.net/ywbrj042/blog/856596)
- 乒乓狂魔 [《Netty 源码分析（一）概览》](https://my.oschina.net/pingpangkuangmo/blog/734051)

## Netty源码分析 —— 启动（一）之服务端

### 1. 概述

对于所有 Netty 的新手玩家，我们**最先**使用的就是 Netty 的 Bootstrap 和 ServerBootstrap 组这两个“**启动器**”组件。它们在 `transport` 模块的 `bootstrap` 包下实现，如下图所示：

![image-20230111165925141](../../_media/analysis/netty/image-20230111165925141.png)

在图中，我们可以看到三个以 Bootstrap 结尾的类，类图如下：

![image-20230111170009651](../../_media/analysis/netty/image-20230111170009651.png)

- 为什么是这样的类关系呢？因为 ServerBootstrap 和 Bootstrap **大部分**的方法和职责都是相同的。

本文仅分享 ServerBootstrap 启动 Netty 服务端的过程。下一篇文章，我们再分享 Bootstrap 分享 Netty 客户端。

### 2. ServerBootstrap 示例

下面，我们先来看一个 ServerBootstrap 的使用示例，就是我们在 [《精尽 Netty 源码分析 —— 调试环境搭建》](http://svip.iocoder.cn/Netty/build-debugging-environment/#5-1-EchoServer) 搭建的 EchoServer 示例。代码如下：

```java
 1: public final class EchoServer {
 2: 
 3:     static final boolean SSL = System.getProperty("ssl") != null;
 4:     static final int PORT = Integer.parseInt(System.getProperty("port", "8007"));
 5: 
 6:     public static void main(String[] args) throws Exception {
 7:         // Configure SSL.
 8:         // 配置 SSL
 9:         final SslContext sslCtx;
10:         if (SSL) {
11:             SelfSignedCertificate ssc = new SelfSignedCertificate();
12:             sslCtx = SslContextBuilder.forServer(ssc.certificate(), ssc.privateKey()).build();
13:         } else {
14:             sslCtx = null;
15:         }
16: 
17:         // Configure the server.
18:         // 创建两个 EventLoopGroup 对象
19:         EventLoopGroup bossGroup = new NioEventLoopGroup(1); // 创建 boss 线程组 用于服务端接受客户端的连接
20:         EventLoopGroup workerGroup = new NioEventLoopGroup(); // 创建 worker 线程组 用于进行 SocketChannel 的数据读写
21:         // 创建 EchoServerHandler 对象
22:         final EchoServerHandler serverHandler = new EchoServerHandler();
23:         try {
24:             // 创建 ServerBootstrap 对象
25:             ServerBootstrap b = new ServerBootstrap();
26:             b.group(bossGroup, workerGroup) // 设置使用的 EventLoopGroup
27:              .channel(NioServerSocketChannel.class) // 设置要被实例化的为 NioServerSocketChannel 类
28:              .option(ChannelOption.SO_BACKLOG, 100) // 设置 NioServerSocketChannel 的可选项
29:              .handler(new LoggingHandler(LogLevel.INFO)) // 设置 NioServerSocketChannel 的处理器
30:              .childHandler(new ChannelInitializer<SocketChannel>() {
31:                  @Override
32:                  public void initChannel(SocketChannel ch) throws Exception { // 设置连入服务端的 Client 的 SocketChannel 的处理器
33:                      ChannelPipeline p = ch.pipeline();
34:                      if (sslCtx != null) {
35:                          p.addLast(sslCtx.newHandler(ch.alloc()));
36:                      }
37:                      //p.addLast(new LoggingHandler(LogLevel.INFO));
38:                      p.addLast(serverHandler);
39:                  }
40:              });
41: 
42:             // Start the server.
43:             // 绑定端口，并同步等待成功，即启动服务端
44:             ChannelFuture f = b.bind(PORT).sync();
45: 
46:             // Wait until the server socket is closed.
47:             // 监听服务端关闭，并阻塞等待
48:             f.channel().closeFuture().sync();
49:         } finally {
50:             // Shut down all event loops to terminate all threads.
51:             // 优雅关闭两个 EventLoopGroup 对象
52:             bossGroup.shutdownGracefully();
53:             workerGroup.shutdownGracefully();
54:         }
55:     }
56: }
```

- 第 7 至 15 行：配置 SSL ，暂时可以忽略。
- 第 17 至 20 行：创建两个 EventLoopGroup 对象。
  - **boss** 线程组：用于服务端接受客户端的**连接**。
  - **worker** 线程组：用于进行客户端的 SocketChannel 的**数据读写**。
  - 关于为什么是**两个** EventLoopGroup 对象，我们在后续的文章，进行分享。
- 第 22 行：创建 [`io.netty.example.echo.EchoServerHandler`](https://github.com/YunaiV/netty/blob/f7016330f1483021ef1c38e0923e1c8b7cef0d10/example/src/main/java/io/netty/example/echo/EchoServerHandler.java) 对象。
- 第 24 行：创建 ServerBootstrap 对象，用于设置服务端的启动配置。
  - 第 26 行：调用 `#group(EventLoopGroup parentGroup, EventLoopGroup childGroup)` 方法，设置使用的 EventLoopGroup 。
  - 第 27 行：调用 `#channel(Class<? extends C> channelClass)` 方法，设置要被实例化的 Channel 为 NioServerSocketChannel 类。在下文中，我们会看到该 Channel 内嵌了 `java.nio.channels.ServerSocketChannel` 对象。是不是很熟悉 😈 ？
  - 第 28 行：调用 `#option(ChannelOption<T> option, T value)` 方法，设置 NioServerSocketChannel 的可选项。在 [`io.netty.channel.ChannelOption`](https://github.com/YunaiV/netty/blob/f7016330f1483021ef1c38e0923e1c8b7cef0d10/transport/src/main/java/io/netty/channel/ChannelOption.java) 类中，枚举了相关的可选项。
  - 第 29 行：调用 `#handler(ChannelHandler handler)` 方法，设置 NioServerSocketChannel 的处理器。在本示例中，使用了 `io.netty.handler.logging.LoggingHandler` 类，用于打印服务端的每个事件。详细解析，见后续文章。
  - 第 30 至 40 行：调用 `#childHandler(ChannelHandler handler)` 方法，设置连入服务端的 Client 的 SocketChannel 的处理器。在本实例中，使用 ChannelInitializer 来初始化连入服务端的 Client 的 SocketChannel 的处理器。
- 第 44 行：**先**调用 `#bind(int port)` 方法，绑定端口，**后**调用 `ChannelFuture#sync()` 方法，阻塞等待成功。这个过程，就是“**启动服务端**”。
- 第 48 行：**先**调用 `#closeFuture()` 方法，**监听**服务器关闭，**后**调用 `ChannelFuture#sync()` 方法，阻塞等待成功。😈 注意，此处不是关闭服务器，而是“**监听**”关闭。
- 第 49 至 54 行：执行到此处，说明服务端已经关闭，所以调用 `EventLoopGroup#shutdownGracefully()` 方法，分别关闭两个 EventLoopGroup 对象。

### 3. AbstractBootstrap

我们再一起来看看 AbstractBootstrap 的代码实现。因为 ServerBootstrap 和 Bootstrap 都实现这个类，所以和 ServerBootstrap 相关度高的方法，我们会放在 [「4. ServerBootstrap」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 中分享，而和 Bootstrap 相关度高的方法，我们会放在下一篇 Bootstrap 的文章分享。

#### 3.1 构造方法

```java
public abstract class AbstractBootstrap<B extends AbstractBootstrap<B, C>, C extends Channel> implements Cloneable {

    /**
     * EventLoopGroup 对象
     */
    volatile EventLoopGroup group;
    /**
     * Channel 工厂，用于创建 Channel 对象。
     */
    @SuppressWarnings("deprecation")
    private volatile ChannelFactory<? extends C> channelFactory;
    /**
     * 本地地址
     */
    private volatile SocketAddress localAddress;
    /**
     * 可选项集合
     */
    private final Map<ChannelOption<?>, Object> options = new LinkedHashMap<ChannelOption<?>, Object>();
    /**
     * 属性集合
     */
    private final Map<AttributeKey<?>, Object> attrs = new LinkedHashMap<AttributeKey<?>, Object>();
    /**
     * 处理器
     */
    private volatile ChannelHandler handler;

    AbstractBootstrap() {
        // Disallow extending from a different package.
    }

    AbstractBootstrap(AbstractBootstrap<B, C> bootstrap) {
        group = bootstrap.group;
        channelFactory = bootstrap.channelFactory;
        handler = bootstrap.handler;
        localAddress = bootstrap.localAddress;
        synchronized (bootstrap.options) { // <1>
            options.putAll(bootstrap.options);
        }
        synchronized (bootstrap.attrs) { // <2>
            attrs.putAll(bootstrap.attrs);
        }
    }
    
    // ... 省略无关代码
}
```

- AbstractBootstrap 是个

  抽象类，并且实现 Cloneable 接口。另外，它声明了B、C两个泛型：

  - `B` ：继承 AbstractBootstrap 类，用于表示**自身**的类型。
  - `C` ：继承 Channel 类，表示表示**创建**的 Channel 类型。

- 每个属性比较简单，结合下面我们要分享的每个方法，就更易懂啦。

- 在 `<1>` 和 `<2>` 两处，比较神奇的使用了 `synchronized` 修饰符。老艿艿也是疑惑了一下，但是这并难不倒我。因为传入的 `bootstrap` 参数的 `options` 和 `attrs` 属性，可能在另外的线程被修改( 例如，我们下面会看到的 `#option(hannelOption<T> option, T value)` 方法)，通过 `synchronized` 来同步，解决此问题。

#### 3.2 self

`#self()` 方法，返回自己。代码如下：

```java
private B self() {
    return (B) this;
}
```

- 这里就使用到了 AbstractBootstrap 声明的 `B` 泛型。

#### 3.3 group

`#group(EventLoopGroup group)` 方法，设置 EventLoopGroup 到 `group` 中。代码如下：

```java
public B group(EventLoopGroup group) {
    if (group == null) {
        throw new NullPointerException("group");
    }
    if (this.group != null) { // 不允许重复设置
        throw new IllegalStateException("group set already");
    }
    this.group = group;
    return self();
}
```

- 最终调用 `#self()` 方法，返回自己。实际上，AbstractBootstrap 整个方法的调用，基本都是[“**链式调用**”](https://en.wikipedia.org/wiki/Method_chaining#Java)。

#### 3.4 channel

`#channel(Class<? extends C> channelClass)` 方法，设置要被**实例化**的 Channel 的类。代码如下：

```java
public B channel(Class<? extends C> channelClass) {
    if (channelClass == null) {
        throw new NullPointerException("channelClass");
    }
    return channelFactory(new ReflectiveChannelFactory<C>(channelClass));
}
```

- 虽然传入的 `channelClass` 参数，但是会使用 `io.netty.channel.ReflectiveChannelFactory` 进行封装。

- 调用 `#channelFactory(io.netty.channel.ChannelFactory<? extends C> channelFactory)` 方法，设置 `channelFactory` 属性。代码如下：

  ```java
  public B channelFactory(io.netty.channel.ChannelFactory<? extends C> channelFactory) {
      return channelFactory((ChannelFactory<C>) channelFactory);
  }
  
  @Deprecated
  public B channelFactory(io.netty.bootstrap.ChannelFactory<? extends C> channelFactory) {
      if (channelFactory == null) {
          throw new NullPointerException("channelFactory");
      }
      if (this.channelFactory != null) { // 不允许重复设置
          throw new IllegalStateException("channelFactory set already");
      }
  
      this.channelFactory = channelFactory;
      return self();
  }
  ```

  - 我们可以看到有两个 `#channelFactory(...)` 方法，并且第**二**个是 `@Deprecated` 的方法。从 ChannelFactory 使用的**包名**，我们就可以很容易的判断，最初 ChannelFactory 在 `bootstrap` 中，后**重构**到 `channel` 包中。

##### 3.4.1 ChannelFactory

`io.netty.channel.ChannelFactory` ，Channel 工厂**接口**，用于创建 Channel 对象。代码如下：

```java
public interface ChannelFactory<T extends Channel> extends io.netty.bootstrap.ChannelFactory<T> {

    /**
     * Creates a new channel.
     *
     * 创建 Channel 对象
     *
     */
    @Override
    T newChannel();

}
```

- `#newChannel()` 方法，用于创建 Channel 对象。

##### 3.4.2 ReflectiveChannelFactory

`io.netty.channel.ReflectiveChannelFactory` ，实现 ChannelFactory 接口，反射调用默认构造方法，创建 Channel 对象的工厂实现类。代码如下：

```java
public class ReflectiveChannelFactory<T extends Channel> implements ChannelFactory<T> {

    /**
     * Channel 对应的类
     */
    private final Class<? extends T> clazz;

    public ReflectiveChannelFactory(Class<? extends T> clazz) {
        if (clazz == null) {
            throw new NullPointerException("clazz");
        }
        this.clazz = clazz;
    }

    @Override
    public T newChannel() {
        try {
            // 反射调用默认构造方法，创建 Channel 对象
            return clazz.getConstructor().newInstance();
        } catch (Throwable t) {
            throw new ChannelException("Unable to create Channel from class " + clazz, t);
        }
    }

}
```

- 重点看 `clazz.getConstructor().newInstance()` 代码块。

#### 3.5 localAddress

`#localAddress(...)` 方法，设置创建 Channel 的本地地址。有四个**重载**的方法，代码如下：

```java
public B localAddress(SocketAddress localAddress) {
    this.localAddress = localAddress;
    return self();
}

public B localAddress(int inetPort) {
    return localAddress(new InetSocketAddress(inetPort));
}

public B localAddress(String inetHost, int inetPort) {
    return localAddress(SocketUtils.socketAddress(inetHost, inetPort));
}

public B localAddress(InetAddress inetHost, int inetPort) {
    return localAddress(new InetSocketAddress(inetHost, inetPort));
}
```

- 一般情况下，不会调用该方法进行配置，而是调用 `#bind(...)` 方法，例如 [「2. ServerBootstrap 示例」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 。

#### 3.6 option

`#option(ChannelOption<T> option, T value)` 方法，设置创建 Channel 的可选项。代码如下：

```java
public <T> B option(ChannelOption<T> option, T value) {
    if (option == null) {
        throw new NullPointerException("option");
    }
    if (value == null) { // 空，意味着移除
        synchronized (options) {
            options.remove(option);
        }
    } else { // 非空，进行修改
        synchronized (options) {
            options.put(option, value);
        }
    }
    return self();
}
```

#### 3.7 attr

`#attr(AttributeKey<T> key, T value)` 方法，设置创建 Channel 的属性。代码如下：

```java
public <T> B attr(AttributeKey<T> key, T value) {
    if (key == null) {
        throw new NullPointerException("key");
    }
    if (value == null) { // 空，意味着移除
        synchronized (attrs) {
            attrs.remove(key);
        }
    } else { // 非空，进行修改
        synchronized (attrs) {
            attrs.put(key, value);
        }
    }
    return self();
}
```

- 怎么理解 `attrs` 属性呢？我们可以理解成 `java.nio.channels.SelectionKey` 的 `attachment` 属性，并且类型为 Map 。

#### 3.8 handler

`#handler(ChannelHandler handler)` 方法，设置创建 Channel 的处理器。代码如下：

```java
public B handler(ChannelHandler handler) {
    if (handler == null) {
        throw new NullPointerException("handler");
    }
    this.handler = handler;
    return self();
}
```

#### 3.9 validate

`#validate()` 方法，校验配置是否正确。代码如下：

```java
public B validate() {
    if (group == null) {
        throw new IllegalStateException("group not set");
    }
    if (channelFactory == null) {
        throw new IllegalStateException("channel or channelFactory not set");
    }
    return self();
}
```

- 在 `#bind(...)` 方法中，绑定本地地址时，会调用该方法进行校验。

#### 3.10 clone

`#clone()` **抽象**方法，克隆一个 AbstractBootstrap 对象。代码如下。

```java
/**
 * Returns a deep clone of this bootstrap which has the identical configuration.  This method is useful when making
 * multiple {@link Channel}s with similar settings.  Please note that this method does not clone the
 * {@link EventLoopGroup} deeply but shallowly, making the group a shared resource.
 */
@Override
public abstract B clone();
```

- 来自实现 Cloneable 接口，在子类中实现。这是深拷贝，即创建一个新对象，但不是所有的属性是深拷贝。可参见「3.1 构造方法」：
  - **浅**拷贝属性：`group`、`channelFactory`、`handler`、`localAddress` 。
  - **深**拷贝属性：`options`、`attrs` 。

#### 3.11 config

`#config()` 方法，返回当前 AbstractBootstrap 的配置对象。代码如下：

```java
public abstract AbstractBootstrapConfig<B, C> config();
```

##### 3.11.1 AbstractBootstrapConfig

`io.netty.bootstrap.AbstractBootstrapConfig` ，BootstrapConfig **抽象类**。代码如下：

```java
public abstract class AbstractBootstrapConfig<B extends AbstractBootstrap<B, C>, C extends Channel> {

    protected final B bootstrap;

    protected AbstractBootstrapConfig(B bootstrap) {
        this.bootstrap = ObjectUtil.checkNotNull(bootstrap, "bootstrap");
    }
    
    public final SocketAddress localAddress() {
        return bootstrap.localAddress();
    }
    
    public final ChannelFactory<? extends C> channelFactory() {
        return bootstrap.channelFactory();
    }

    public final ChannelHandler handler() {
        return bootstrap.handler();
    }

    public final Map<ChannelOption<?>, Object> options() {
        return bootstrap.options();
    }

    public final Map<AttributeKey<?>, Object> attrs() {
        return bootstrap.attrs();
    }

    public final EventLoopGroup group() {
        return bootstrap.group();
    }
    
}
```

- `bootstrap` 属性，对应的启动类对象。在每个方法中，我们可以看到，都是直接调用 `boostrap` 属性对应的方法，读取对应的配置。

------

AbstractBootstrapConfig 的整体类图如下：

![image-20230111170550016](../../_media/analysis/netty/image-20230111170550016.png)AbstractBootstrapConfig 类图

- 每个 Config 类，对应一个 Bootstrap 类。
- ServerBootstrapConfig 和 BootstrapConfig 的实现代码，和 AbstractBootstrapConfig 基本一致，所以胖友自己去查看噢。

#### 3.12 setChannelOptions

`#setChannelOptions(...)` **静态**方法，设置传入的 Channel 的**多个**可选项。代码如下：

```java
static void setChannelOptions(
        Channel channel, Map<ChannelOption<?>, Object> options, InternalLogger logger) {
    for (Map.Entry<ChannelOption<?>, Object> e: options.entrySet()) {
        setChannelOption(channel, e.getKey(), e.getValue(), logger);
    }
}

static void setChannelOptions(
        Channel channel, Map.Entry<ChannelOption<?>, Object>[] options, InternalLogger logger) {
    for (Map.Entry<ChannelOption<?>, Object> e: options) {
        setChannelOption(channel, e.getKey(), e.getValue(), logger);
    }
}
```

- 在两个方法的内部，**都**调用 `#setChannelOption(Channel channel, ChannelOption<?> option, Object value, InternalLogger logger)` **静态**方法，设置传入的 Channel 的**一个**可选项。代码如下：

  ```java
  private static void setChannelOption(
          Channel channel, ChannelOption<?> option, Object value, InternalLogger logger) {
      try {
          if (!channel.config().setOption((ChannelOption<Object>) option, value)) {
              logger.warn("Unknown channel option '{}' for channel '{}'", option, channel);
          }
      } catch (Throwable t) {
          logger.warn("Failed to set channel option '{}' with value '{}' for channel '{}'", option, value, channel, t);
      }
  }
  ```

  - 不同于 [「3.6 option」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 方法，它是设置要创建的 Channel 的可选项。而 `#setChannelOption(...)` 方法，它是设置已经创建的 Channel 的可选项。

#### 3.13 bind

> 老艿艿：`#bind(...)` 方法，也可以启动 UDP 的一端，考虑到这个系列主要分享 Netty 在 NIO 相关的源码解析，所以如下所有的分享，都不考虑 UDP 的情况。

`#bind(...)` 方法，绑定端口，启动服务端。代码如下：

```java
public ChannelFuture bind() {
    // 校验服务启动需要的必要参数
    validate();
    SocketAddress localAddress = this.localAddress;
    if (localAddress == null) {
        throw new IllegalStateException("localAddress not set");
    }
    // 绑定本地地址( 包括端口 )
    return doBind(localAddress);
}

public ChannelFuture bind(int inetPort) {
    return bind(new InetSocketAddress(inetPort));
}

public ChannelFuture bind(String inetHost, int inetPort) {
    return bind(SocketUtils.socketAddress(inetHost, inetPort));
}

public ChannelFuture bind(InetAddress inetHost, int inetPort) {
    return bind(new InetSocketAddress(inetHost, inetPort));
}

public ChannelFuture bind(SocketAddress localAddress) {
    // 校验服务启动需要的必要参数
    validate();
    if (localAddress == null) {
        throw new NullPointerException("localAddress");
    }
    // 绑定本地地址( 包括端口 )
    return doBind(localAddress);
}
```

- 该方法返回的是 ChannelFuture 对象，也就是**异步**的绑定端口，启动服务端。如果需要**同步**，则需要调用 `ChannelFuture#sync()` 方法。

`#bind(...)` 方法，核心流程如下图：

![image-20230111170634431](../../_media/analysis/netty/image-20230111170634431.png)

- 主要有 4 个步骤，下面我们来拆解代码，看看和我们在 [《精尽 Netty 源码分析 —— NIO 基础（五）之示例》](http://svip.iocoder.cn/Netty/nio-5-demo/?self) 的 NioServer 的代码，是**怎么对应**的。

##### 3.13.1 doBind

`#doBind(final SocketAddress localAddress)` 方法，代码如下：

```java
 1: private ChannelFuture doBind(final SocketAddress localAddress) {
 2:     // 初始化并注册一个 Channel 对象，因为注册是异步的过程，所以返回一个 ChannelFuture 对象。
 3:     final ChannelFuture regFuture = initAndRegister();
 4:     final Channel channel = regFuture.channel();
 5:     if (regFuture.cause() != null) { // 若发生异常，直接进行返回。
 6:         return regFuture;
 7:     }
 8: 
 9:     // 绑定 Channel 的端口，并注册 Channel 到 SelectionKey 中。
10:     if (regFuture.isDone()) { // 未
11:         // At this point we know that the registration was complete and successful.
12:         ChannelPromise promise = channel.newPromise();
13:         doBind0(regFuture, channel, localAddress, promise); // 绑定
14:         return promise;
15:     } else {
16:         // Registration future is almost always fulfilled already, but just in case it's not.
17:         final PendingRegistrationPromise promise = new PendingRegistrationPromise(channel);
18:         regFuture.addListener(new ChannelFutureListener() {
19:             @Override
20:             public void operationComplete(ChannelFuture future) throws Exception {
22:                 Throwable cause = future.cause();
23:                 if (cause != null) {
24:                     // Registration on the EventLoop failed so fail the ChannelPromise directly to not cause an
25:                     // IllegalStateException once we try to access the EventLoop of the Channel.
26:                     promise.setFailure(cause);
27:                 } else {
28:                     // Registration was successful, so set the correct executor to use.
29:                     // See https://github.com/netty/netty/issues/2586
30:                     promise.registered();
31: 
32:                     doBind0(regFuture, channel, localAddress, promise); // 绑定
33:                 }
34:             }
35:         });
36:         return promise;
37:     }
38: }
```

- 第 3 行：调用`#initAndRegister()`方法，初始化并注册一个 Channel 对象。因为注册是异步的过程，所以返回一个 ChannelFuture 对象。详细解析，见「3.14 initAndRegister」
- 第 5 至 7 行：若发生异常，直接进行返回。
- 第 9 至 37 行：因为注册是异步的过程，有可能已完成，有可能未完成。所以实现代码分成了【第 10 至 14 行】和【第 15 至 36 行】分别处理已完成和未完成的情况。
  - **核心**在【第 13 行】或者【第 32 行】的代码，调用 `#doBind0(final ChannelFuture regFuture, final Channel channel, final SocketAddress localAddress, final ChannelPromise promise)` 方法，绑定 Channel 的端口，并注册 Channel 到 SelectionKey 中。
  - 如果**异步**注册对应的 ChanelFuture 未完成，则调用 `ChannelFuture#addListener(ChannelFutureListener)` 方法，添加监听器，在**注册**完成后，进行回调执行 `#doBind0(...)` 方法的逻辑。详细解析，见 见 [「3.13.2 doBind0」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 。
  - 所以总结来说，**bind 的逻辑，执行在 register 的逻辑之后**。
  - TODO 1001 Promise 2. PendingRegistrationPromise

##### 3.13.2 doBind0

> 老艿艿：此小节的内容，胖友先看完 [「3.14 initAndRegister」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 的内容在回过头来看。因为 `#doBind0(...)` 方法的执行，在 `#initAndRegister()` 方法之后。

`#doBind0(...)` 方法，执行 Channel 的端口绑定逻辑。代码如下：

```java
 1: private static void doBind0(
 2:         final ChannelFuture regFuture, final Channel channel,
 3:         final SocketAddress localAddress, final ChannelPromise promise) {
 4: 
 5:     // This method is invoked before channelRegistered() is triggered.  Give user handlers a chance to set up
 6:     // the pipeline in its channelRegistered() implementation.
 7:     channel.eventLoop().execute(new Runnable() {
 8:         @Override
 9:         public void run() {
11:             // 注册成功，绑定端口
12:             if (regFuture.isSuccess()) {
13:                 channel.bind(localAddress, promise).addListener(ChannelFutureListener.CLOSE_ON_FAILURE);
14:             // 注册失败，回调通知 promise 异常
15:             } else {
16:                 promise.setFailure(regFuture.cause());
17:             }
18:         }
19:     });
20: }
```

- 第 7 行：调用 EventLoop 执行 Channel 的端口绑定逻辑。但是，实际上当前线程已经是 EventLoop 所在的线程了，为何还要这样操作呢？答案在【第 5 至 6 行】的英语注释。感叹句，Netty 虽然代码量非常庞大且复杂，但是英文注释真的是非常齐全，包括 Github 的 issue 对代码提交的描述，也非常健全。

- 第 14 至 17 行：注册失败，回调通知 `promise` 异常。

- 第 11 至 13 行：注册成功，调用`Channel#bind(SocketAddress localAddress, ChannelPromise promise)`

   

  方法，执行 Channel 的端口绑定逻辑。后续的方法栈调用如下图：

  ![image-20230111170805724](../../_media/analysis/netty/image-20230111170805724.png)

  

  Channel bind 流程

  - 还是老样子，我们先省略掉 pipeline 的内部实现代码，从 `AbstractUnsafe#bind(final SocketAddress localAddress, final ChannelPromise promise)` 方法，继续向下分享。

`AbstractUnsafe#bind(final SocketAddress localAddress, final ChannelPromise promise)` 方法，Channel 的端口绑定逻辑。代码如下：

```java
 1: @Override
 2: public final void bind(final SocketAddress localAddress, final ChannelPromise promise) {
 3:     // 判断是否在 EventLoop 的线程中。
 4:     assertEventLoop();
 5: 
 6:     if (!promise.setUncancellable() || !ensureOpen(promise)) {
 7:         return;
 8:     }
 9: 
10:     // See: https://github.com/netty/netty/issues/576
11:     if (Boolean.TRUE.equals(config().getOption(ChannelOption.SO_BROADCAST)) &&
12:         localAddress instanceof InetSocketAddress &&
13:         !((InetSocketAddress) localAddress).getAddress().isAnyLocalAddress() &&
14:         !PlatformDependent.isWindows() && !PlatformDependent.maybeSuperUser()) {
15:         // Warn a user about the fact that a non-root user can't receive a
16:         // broadcast packet on *nix if the socket is bound on non-wildcard address.
17:         logger.warn(
18:                 "A non-root user can't receive a broadcast packet if the socket " +
19:                 "is not bound to a wildcard address; binding to a non-wildcard " +
20:                 "address (" + localAddress + ") anyway as requested.");
21:     }
22: 
23:     // 记录 Channel 是否激活
24:     boolean wasActive = isActive();
25: 
26:     // 绑定 Channel 的端口
27:     try {
28:         doBind(localAddress);
29:     } catch (Throwable t) {
30:         safeSetFailure(promise, t);
31:         closeIfClosed();
32:         return;
33:     }
34: 
35:     // 若 Channel 是新激活的，触发通知 Channel 已激活的事件。
36:     if (!wasActive && isActive()) {
37:         invokeLater(new Runnable() {
38:             @Override
39:             public void run() {
40:                 pipeline.fireChannelActive();
41:             }
42:         });
43:     }
44: 
45:     // 回调通知 promise 执行成功
46:     safeSetSuccess(promise);
47: }
```

- 第 4 行：调用 `#assertEventLoop()` 方法，判断是否在 EventLoop 的线程中。即该方法，只允许在 EventLoop 的线程中执行。代码如下：

  ```java
  // AbstractUnsafe.java
  private void assertEventLoop() {
      assert !registered || eventLoop.inEventLoop();
  }
  ```

- 第 6 至 8 行：和 `#register0(...)` 方法的【第 5 至 8 行】的代码，是一致的。

- 第 10 至 21 行：https://github.com/netty/netty/issues/576

- 第 24 行：调用 `#isActive()` 方法，获得 Channel 是否激活( active )。NioServerSocketChannel 对该方法的实现代码如下：

  ```java
  // NioServerSocketChannel.java
  
  @Override
  public boolean isActive() {
      return javaChannel().socket().isBound();
  }
  ```

  - NioServerSocketChannel 的 `#isActive()` 的方法实现，判断 ServerSocketChannel 是否绑定端口。此时，一般返回的是 `false` 。

- 第 28 行：调用 `#doBind(SocketAddress localAddress)` 方法，绑定 Channel 的端口。代码如下：

  ```java
  // NioServerSocketChannel.java
  
  @Override
  protected void doBind(SocketAddress localAddress) throws Exception {
      if (PlatformDependent.javaVersion() >= 7) {
          javaChannel().bind(localAddress, config.getBacklog());
      } else {
          javaChannel().socket().bind(localAddress, config.getBacklog());
      }
  }
  ```

  - 【重要】到了此处，服务端的 Java 原生 NIO ServerSocketChannel 终于绑定端口。😈

- 第 36 行：再次调用 `#isActive()` 方法，获得 Channel 是否激活。此时，一般返回的是 `true` 。因此，Channel 可以认为是**新激活**的，满足【第 36 至 43 行】代码的执行条件。

  - 第 37 行：调用 `#invokeLater(Runnable task)` 方法，提交任务，让【第 40 行】的代码执行，异步化。代码如下：

    ```java
    // AbstractUnsafe.java
    private void invokeLater(Runnable task) {
        try {
            // This method is used by outbound operation implementations to trigger an inbound event later.
            // They do not trigger an inbound event immediately because an outbound operation might have been
            // triggered by another inbound event handler method.  If fired immediately, the call stack
            // will look like this for example:
            //
            //   handlerA.inboundBufferUpdated() - (1) an inbound handler method closes a connection.
            //   -> handlerA.ctx.close()
            //      -> channel.unsafe.close()
            //         -> handlerA.channelInactive() - (2) another inbound handler method called while in (1) yet
            //
            // which means the execution of two inbound handler methods of the same handler overlap undesirably.
            eventLoop().execute(task);
        } catch (RejectedExecutionException e) {
            logger.warn("Can't invoke task later as EventLoop rejected it", e);
        }
    }
    ```

    - 从实现代码可以看出，是通过提交一个新的任务到 EventLoop 的线程中。
    - 英文注释虽然有丢丢长，但是胖友耐心看完。有道在手，英文不愁啊。

  - 第 40 行：调用 `DefaultChannelPipeline#fireChannelActive()` 方法，触发 Channel 激活的事件。详细解析，见 [「3.13.3 beginRead」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 。

- 第 46 行：调用 `#safeSetSuccess(ChannelPromise)` 方法，回调通知 `promise` 执行成功。此处的通知，对应回调的是我们添加到 `#bind(...)` 方法返回的 ChannelFuture 的 ChannelFutureListener 的监听器。示例代码如下：

  ```java
  ChannelFuture f = b.bind(PORT).addListener(new ChannelFutureListener() { // 回调的就是我！！！
      @Override
      public void operationComplete(ChannelFuture future) throws Exception {
          System.out.println("测试下被触发");
      }
  }).sync();
  ```

##### 3.13.3 beginRead

> 老艿艿：此小节的内容，胖友先看完 [「3.14 initAndRegister」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 的内容在回过头来看。因为 `#beginRead(...)` 方法的执行，在 `#doBind0(...)` 方法之后。

在 `#bind(final SocketAddress localAddress, final ChannelPromise promise)` 方法的【第 40 行】代码，调用 `Channel#bind(SocketAddress localAddress, ChannelPromise promise)` 方法，触发 Channel 激活的事件。后续的方法栈调用如下图：

![image-20230111170844434](../../_media/analysis/netty/image-20230111170844434.png)



还是老样子，我们先省略掉 pipeline 的内部实现代码，从`AbstractUnsafe#beginRead()` 方法，继续向下分享。

`AbstractUnsafe#beginRead()` 方法，开始读取操作。代码如下：

```java
@Override
public final void beginRead() {
    // 判断是否在 EventLoop 的线程中。
    assertEventLoop();

    // Channel 必须激活
    if (!isActive()) {
        return;
    }

    // 执行开始读取
    try {
        doBeginRead();
    } catch (final Exception e) {
        invokeLater(new Runnable() {
            @Override
            public void run() {
                pipeline.fireExceptionCaught(e);
            }
        });
        close(voidPromise());
    }
}
```

- 调用 `Channel#doBeginRead()` 方法，执行开始读取。对于 NioServerSocketChannel 来说，该方法实现代码如下：

  ```java
  // AbstractNioMessageChannel.java
  @Override
  protected void doBeginRead() throws Exception {
      if (inputShutdown) {
          return;
      }
      super.doBeginRead();
  }
  
  // AbstractNioChannel.java
  @Override
  protected void doBeginRead() throws Exception {
      // Channel.read() or ChannelHandlerContext.read() was called
      final SelectionKey selectionKey = this.selectionKey;
      if (!selectionKey.isValid()) {
          return;
      }
  
      readPending = true;
  
      final int interestOps = selectionKey.interestOps();
      if ((interestOps & readInterestOp) == 0) {
          selectionKey.interestOps(interestOps | readInterestOp);
      }
  }
  ```

  - 【重要】在最后几行，我们可以看到，调用 `SelectionKey#interestOps(ops)` 方法，将我们创建 NioServerSocketChannel 时，设置的 `readInterestOp = SelectionKey.OP_ACCEPT` 添加为感兴趣的事件。也就说，服务端可以开始处理客户端的连接事件。

#### 3.14 initAndRegister

`#initAndRegister()` 方法，初始化并注册一个 Channel 对象，并返回一个 ChannelFuture 对象。代码如下：

```java
  1: final ChannelFuture initAndRegister() {
 2:     Channel channel = null;
 3:     try {
 4:         // 创建 Channel 对象
 5:         channel = channelFactory.newChannel();
 6:         // 初始化 Channel 配置
 7:         init(channel);
 8:     } catch (Throwable t) {
 9:         if (channel != null) { // 已创建 Channel 对象
10:             // channel can be null if newChannel crashed (eg SocketException("too many open files"))
11:             channel.unsafe().closeForcibly(); // 强制关闭 Channel
12:             // as the Channel is not registered yet we need to force the usage of the GlobalEventExecutor
13:             return new DefaultChannelPromise(channel, GlobalEventExecutor.INSTANCE).setFailure(t);
14:         }
15:         // as the Channel is not registered yet we need to force the usage of the GlobalEventExecutor
16:         return new DefaultChannelPromise(new FailedChannel(), GlobalEventExecutor.INSTANCE).setFailure(t);
17:     }
18: 
19:     // 注册 Channel 到 EventLoopGroup 中
20:     ChannelFuture regFuture = config().group().register(channel);
21:     if (regFuture.cause() != null) {
22:         if (channel.isRegistered()) {
23:             channel.close();
24:         } else {
25:             channel.unsafe().closeForcibly(); // 强制关闭 Channel
26:         }
27:     }
28: 
29:     return regFuture;
30: }
```

- 第 5 行：调用`ChannelFactory#newChannel()`方法，创建 Channel 对象。在本文的示例中，会使用 ReflectiveChannelFactory 创建 NioServerSocketChannel 对象。详细解析，见「3.14.1 创建 Channel」

  - 第 16 行：返回带异常的 DefaultChannelPromise 对象。因为创建 Channel 对象失败，所以需要创建一个 FailedChannel 对象，设置到 DefaultChannelPromise 中才可以返回。

- 第 7 行：调用 `#init(Channel)`方法，初始化 Channel 配置。详细解析，见「3.14.1 创建 Channel」

- 第 9 至 14 行：返回带异常的 DefaultChannelPromise 对象。因为初始化 Channel 对象失败，所以需要调用 `#closeForcibly()` 方法，强制关闭 Channel 

- 第 20 行：首先获得 EventLoopGroup 对象，后调用 `EventLoopGroup#register(Channel)` 方法，注册 Channel 到 EventLoopGroup 中。实际在方法内部，EventLoopGroup 会分配一个 EventLoop 对象，将 Channel 注册到其上。详细解析，见 [「3.14.3 注册 Channel 到 EventLoopGroup」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 。

- 第 22 至 23 行：若发生异常，并且 Channel 已经注册成功，则调用 `#close()` 方法，正常关闭 Channel 。

- 第 24 至 26 行：若发生异常，并且 Channel 并未注册成功，则调用 `#closeForcibly()` 方法，强制关闭 Channel 。也就是说，和【第 9 至 14 行】一致。为什么会有正常和强制关闭 Channel 两种不同的处理呢？我们来看下 `#close()` 和 `#closeForcibly()` 方法的注释：

  ```java
  // Channel.java#Unsafe
  
  /**
   * Close the {@link Channel} of the {@link ChannelPromise} and notify the {@link ChannelPromise} once the
   * operation was complete.
   */
  void close(ChannelPromise promise);
  
  /**
   * Closes the {@link Channel} immediately without firing any events.  Probably only useful
   * when registration attempt failed.
   */
  void closeForcibly();
  ```

  - 调用的前提，在于 Channel 是否注册到 EventLoopGroup 成功。😈 因为注册失败，也不好触发相关的事件。

##### 3.14.1 创建 Channel 对象

考虑到本文的内容，我们以 NioServerSocketChannel 的创建过程作为示例。流程图如下：![image-20230111171131099](../../_media/analysis/netty/image-20230111171131099.png)

创建 NioServerSocketChannel 对象

- 我们可以看到，整个流程涉及到 NioServerSocketChannel 的父类们。类图如下：![image-20230111171146469](../../_media/analysis/netty/image-20230111171146469.png)

- 可能有部分胖友对 Netty Channel 的定义不是很理解，如下是官方的英文注释：

  > A nexus to a network socket or a component which is capable of I/O operations such as read, write, connect, and bind

  - 简单点来说，我们可以把 Netty Channel 和 Java 原生 Socket 对应，而 Netty NIO Channel 和 Java 原生 NIO SocketChannel 对象。

下面，我们来看看整个 NioServerSocketChannel 的创建过程的代码实现。

###### 3.14.1.1 NioServerSocketChannel

```java
private static final SelectorProvider DEFAULT_SELECTOR_PROVIDER = SelectorProvider.provider();

private final ServerSocketChannelConfig config;

public NioServerSocketChannel() {
    this(newSocket(DEFAULT_SELECTOR_PROVIDER));
}

public NioServerSocketChannel(SelectorProvider provider) {
    this(newSocket(provider));
}
```

- `DEFAULT_SELECTOR_PROVIDER` **静态**属性，默认的 SelectorProvider 实现类。

- `config` 属性，Channel 对应的配置对象。每种 Channel 实现类，也会对应一个 ChannelConfig 实现类。例如，NioServerSocketChannel 类，对应 ServerSocketChannelConfig 配置类。

  > ChannelConfig 的官网英文描述： A set of configuration properties of a Channel.

- 在构造方法中，调用 `#newSocket(SelectorProvider provider)` 方法，创建 NIO 的 ServerSocketChannel 对象。代码如下：

  ```java
  private static ServerSocketChannel newSocket(SelectorProvider provider) {
      try {
          return provider.openServerSocketChannel();
      } catch (IOException e) {
          throw new ChannelException("Failed to open a server socket.", e);
      }
  }
  ```

  - 😈 是不是很熟悉这样的代码，效果和 `ServerSocketChannel#open()` 方法创建 ServerSocketChannel 对象是一致。

- `#NioServerSocketChannel(ServerSocketChannel channel)` 构造方法，代码如下：

  ```java
  public NioServerSocketChannel(ServerSocketChannel channel) {
      super(null, channel, SelectionKey.OP_ACCEPT);
      config = new NioServerSocketChannelConfig(this, javaChannel().socket());
  }
  ```

  - 调用父 AbstractNioMessageChannel 的构造方法。详细解析，见 [「3.14.1.2 AbstractNioMessageChannel」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 。注意传入的 SelectionKey 的值为 `OP_ACCEPT` 。
  - 初始化 `config` 属性，创建 NioServerSocketChannelConfig 对象。

###### 3.14.1.2 AbstractNioMessageChannel

```java
protected AbstractNioMessageChannel(Channel parent, SelectableChannel ch, int readInterestOp) {
    super(parent, ch, readInterestOp);
}
```

- 直接调用父 AbstractNioChannel 的构造方法。详细解析，见 [「3.14.1.3 AbstractNioChannel」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 。

###### 3.14.1.3 AbstractNioChannel

```java
private final SelectableChannel ch;
protected final int readInterestOp;

protected AbstractNioChannel(Channel parent, SelectableChannel ch, int readInterestOp) {
    super(parent);
    this.ch = ch;
    this.readInterestOp = readInterestOp;
    try {
        ch.configureBlocking(false);
    } catch (IOException e) {
        try {
            ch.close();
        } catch (IOException e2) {
            if (logger.isWarnEnabled()) {
                logger.warn("Failed to close a partially initialized socket.", e2);
            }
        }

        throw new ChannelException("Failed to enter non-blocking mode.", e);
    }
}
```

- `ch` 属性，**Netty NIO Channel 对象，持有的 Java 原生 NIO 的 Channel 对象**。
- `readInterestOp`属性，感兴趣的读事件的操作位值。
  - 目前笔者看了 AbstractNioMessageChannel 是 `SelectionKey.OP_ACCEPT` ， 而 AbstractNioByteChannel 是 `SelectionKey.OP_READ` 。
  - 详细的用途，我们会在 [「3.13.3 beginRead」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 看到。
- 调用父 AbstractNioChannel 的构造方法。详细解析，见 [「3.14.1.4 AbstractChannel」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 。
- 调用 `SelectableChannel#configureBlocking(false)`方法，设置 NIO Channel 为非阻塞
  - 😈 这块代码是不是非常熟悉哟。
  - 若发生异常，关闭 NIO Channel ，并抛出异常。

###### 3.14.1.4 AbstractChannel

```java
/**
 * 父 Channel 对象
 */
private final Channel parent;
/**
 * Channel 编号
 */
private final ChannelId id;
/**
 * Unsafe 对象
 */
private final Unsafe unsafe;
/**
 * DefaultChannelPipeline 对象
 */
private final DefaultChannelPipeline pipeline;

protected AbstractChannel(Channel parent) {
    this.parent = parent;
    // 创建 ChannelId 对象
    id = newId();
    // 创建 Unsafe 对象
    unsafe = newUnsafe();
    // 创建 DefaultChannelPipeline 对象
    pipeline = newChannelPipeline();
}
```

- `parent` 属性，父 Channel 对象。对于 NioServerSocketChannel 的 `parent` 为空。

- `id` 属性，Channel 编号对象。在构造方法中，通过调用 `#newId()` 方法，进行创建。本文就先不分享，感兴趣的胖友自己看。

- `unsafe` 属性，Unsafe 对象。在构造方法中，通过调用 `#newUnsafe()` 方法，进行创建。本文就先不分享，感兴趣的胖友自己看。

  - 这里的 Unsafe 并不是我们常说的 Java 自带的`sun.misc.Unsafe` ，而是 `io.netty.channel.Channel#Unsafe`。

    ```java
    // Channel.java#Unsafe
    /**
    * <em>Unsafe</em> operations that should <em>never</em> be called from user-code. These methods
    * are only provided to implement the actual transport, and must be invoked from an I/O thread except for the
    * following methods:
    * <ul>
    *   <li>{@link #localAddress()}</li>
    *   <li>{@link #remoteAddress()}</li>
    *   <li>{@link #closeForcibly()}</li>
    *   <li>{@link #register(EventLoop, ChannelPromise)}</li>
    *   <li>{@link #deregister(ChannelPromise)}</li>
    *   <li>{@link #voidPromise()}</li>
    * </ul>
    */
    ```

    - 这就是为什么叫 Unsafe 的原因。按照上述官网类的英文注释，Unsafe 操作不允许被用户代码使用。这些函数是真正用于数据传输操作，必须被IO线程调用。
    - 实际上，Channel 真正的具体操作，通过调用对应的 Unsafe 实现。😈 下文，我们将会看到。

  - Unsafe 不是一个具体的类，而是一个定义在 Channel 接口中的接口。不同的 Channel 类对应不同的 Unsafe 实现类。整体类图如下：

    ![image-20230111171404381](../../_media/analysis/netty/image-20230111171404381.png)

    

    - 对于 NioServerSocketChannel ，Unsafe 的实现类为 NioMessageUnsafe 。

- `pipeline` 属性，DefaultChannelPipeline 对象。在构造方法中，通过调用 `#newChannelPipeline()` 方法，进行创建。本文就先不分享，感兴趣的胖友自己看。

  > ChannelPipeline 的英文注释：A list of ChannelHandlers which handles or intercepts inbound events and outbound operations of a Channel 。

###### 3.14.1.5 小结

看到此处，我们来对 [「3.1.4.1 创建 Channel 对象」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 作一个小结。

对于一个 Netty NIO Channel 对象，它会包含如下几个核心组件：

- ChannelId
- Unsafe
- Pipeline
  - ChannelHandler
- ChannelConfig
- **Java 原生 NIO Channel**

如果不太理解，可以撸起袖子，多调试几次。

##### 3.14.2 初始化 Channel 配置

`#init(Channel channel)` 方法，初始化 Channel 配置。它是个**抽象**方法，由子类 ServerBootstrap 或 Bootstrap 自己实现。代码如下：

```java
abstract void init(Channel channel) throws Exception;
```

- ServerBootstrap 对该方法的实现，我们在 [「4. ServerBootstrap」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 中，详细解析。

##### 3.14.3 注册 Channel 到 EventLoopGroup

`EventLoopGroup#register(Channel channel)` 方法，注册 Channel 到 EventLoopGroup 中。整体流程如下：

![image-20230111171510443](../../_media/analysis/netty/image-20230111171510443.png)

###### 3.14.3.1 register

EventLoopGroup 和 EventLoop 不是本文的重点，所以省略 1 + 2 + 3 部分的代码，从第 4 步的 `AbstractUnsafe#register(EventLoop eventLoop, final ChannelPromise promise)` 方法开始，代码如下：

```java
 1: @Override
 2: public final void register(EventLoop eventLoop, final ChannelPromise promise) {
 3:     // 校验传入的 eventLoop 非空
 4:     if (eventLoop == null) {
 5:         throw new NullPointerException("eventLoop");
 6:     }
 7:     // 校验未注册
 8:     if (isRegistered()) {
 9:         promise.setFailure(new IllegalStateException("registered to an event loop already"));
10:         return;
11:     }
12:     // 校验 Channel 和 eventLoop 匹配
13:     if (!isCompatible(eventLoop)) {
14:         promise.setFailure(new IllegalStateException("incompatible event loop type: " + eventLoop.getClass().getName()));
15:         return;
16:     }
17: 
18:     // 设置 Channel 的 eventLoop 属性
19:     AbstractChannel.this.eventLoop = eventLoop;
20: 
21:     // 在 EventLoop 中执行注册逻辑
22:     if (eventLoop.inEventLoop()) {
23:         register0(promise);
24:     } else {
25:         try {
26:             eventLoop.execute(new Runnable() {
27:                 @Override
28:                 public void run() {
31:                     register0(promise);
32:                 }
33:             });
34:         } catch (Throwable t) {
35:             logger.warn("Force-closing a channel whose registration task was not accepted by an event loop: {}", AbstractChannel.this, t);
36:             closeForcibly();
37:             closeFuture.setClosed();
38:             safeSetFailure(promise, t);
39:         }
40:     }
41: }
```

- 第 3 至 6 行：校验传入的 `eventLoop` 参数非空。

- 第 7 至 11 行：调用 `#isRegistered()` 方法，校验未注册。代码如下：

  ```java
  // AbstractChannel.java
  
  /**
   * 是否注册
   */
  private volatile boolean registered;
  
  @Override
  public boolean isRegistered() {
      return registered;
  }
  ```

- 第 12 至 16 行：校验 Channel 和 `eventLoop` 类型是否匹配，因为它们都有多种实现类型。代码如下：

  ```java
  @Override
  protected boolean isCompatible(EventLoop loop) {
      return loop instanceof NioEventLoop;
  }
  ```

  - 要求 `eventLoop` 的类型为 NioEventLoop 。

- 第 19 行：【重要】设置 Channel 的 `eventLoop` 属性。

- 第 21 至 40 行：在 `evnetLoop`中，调用 `#register0()`方法，执行注册的逻辑。详细解析，见「3.14.3.2 register0」

- 第 34 至 39 行：若调用 `EventLoop#execute(Runnable)`方法发生异常，则进行处理：

- 第 36 行：调用 `AbstractUnsafe#closeForcibly()` 方法，强制关闭 Channel 。

- 第 37 行：调用 `CloseFuture#setClosed()` 方法，通知 `closeFuture` 已经关闭。详细解析，见 [《精尽 Netty 源码解析 —— Channel（七）之 close 操作》](http://svip.iocoder.cn/Netty/Channel-7-close/) 。

- 第 38 行：调用 `AbstractUnsafe#safeSetFailure(ChannelPromise promise, Throwable cause)` 方法，回调通知 `promise` 发生该异常。

###### 3.14.3.2 register0

`#register0(ChannelPromise promise)` 方法，注册逻辑。代码如下：

```java
 1: private void register0(ChannelPromise promise) {
 2:     try {
 3:         // check if the channel is still open as it could be closed in the mean time when the register
 4:         // call was outside of the eventLoop
 5:         if (!promise.setUncancellable() // TODO 1001 Promise
 6:                 || !ensureOpen(promise)) { // 确保 Channel 是打开的
 7:             return;
 8:         }
 9:         // 记录是否为首次注册
10:         boolean firstRegistration = neverRegistered;
11: 
12:         // 执行注册逻辑
13:         doRegister();
14: 
15:         // 标记首次注册为 false
16:         neverRegistered = false;
17:         // 标记 Channel 为已注册
18:         registered = true;
19: 
20:         // Ensure we call handlerAdded(...) before we actually notify the promise. This is needed as the
21:         // user may already fire events through the pipeline in the ChannelFutureListener.
22:         pipeline.invokeHandlerAddedIfNeeded();
23: 
24:         // 回调通知 `promise` 执行成功
25:         safeSetSuccess(promise);
26: 
27:         // 触发通知已注册事件
28:         pipeline.fireChannelRegistered();
29: 
30:         // TODO 芋艿
31:         // Only fire a channelActive if the channel has never been registered. This prevents firing
32:         // multiple channel actives if the channel is deregistered and re-registered.
33:         if (isActive()) {
34:             if (firstRegistration) {
35:                 pipeline.fireChannelActive();
36:             } else if (config().isAutoRead()) {
37:                 // This channel was registered before and autoRead() is set. This means we need to begin read
38:                 // again so that we process inbound data.
39:                 //
40:                 // See https://github.com/netty/netty/issues/4805
41:                 beginRead();
42:             }
43:         }
44:     } catch (Throwable t) {
45:         // Close the channel directly to avoid FD leak.
46:         closeForcibly();
47:         closeFuture.setClosed();
48:         safeSetFailure(promise, t);
49:     }
50: }
```

- 第 5 行：// TODO 1001 Promise

- 第 6 行：调用 `#ensureOpen(ChannelPromise)` 方法，确保 Channel 是打开的。代码如下：

  ```java
  // AbstractUnsafe.java
  protected final boolean ensureOpen(ChannelPromise promise) {
      if (isOpen()) {
          return true;
      }
  
      // 若未打开，回调通知 promise 异常
      safeSetFailure(promise, ENSURE_OPEN_CLOSED_CHANNEL_EXCEPTION);
      return false;
  }
  
  // AbstractNioChannel.java
  @Override
  public boolean isOpen() {
      return ch.isOpen();
  }
  ```

- 第 10 行：记录是否**首次**注册。`neverRegistered` 变量声明在 AbstractUnsafe 中，代码如下：

  ```java
  /**
   * 是否重未注册过，用于标记首次注册
   *
   * true if the channel has never been registered, false otherwise
   */
  private boolean neverRegistered = true;
  ```

- 第 13 行：调用 `#doRegister()` 方法，执行注册逻辑。代码如下：

  ```java
  // NioUnsafe.java
    1: @Override
    2: protected void doRegister() throws Exception {
    3:     boolean selected = false;
    4:     for (;;) {
    5:         try {
    6:             selectionKey = javaChannel().register(eventLoop().unwrappedSelector(), 0, this);
    7:             return;
    8:         } catch (CancelledKeyException e) {
    9:             // TODO TODO 1003 doRegister 异常
   10:             if (!selected) {
   11:                 // Force the Selector to select now as the "canceled" SelectionKey may still be
   12:                 // cached and not removed because no Select.select(..) operation was called yet.
   13:                 eventLoop().selectNow();
   14:                 selected = true;
   15:             } else {
   16:                 // We forced a select operation on the selector before but the SelectionKey is still cached
   17:                 // for whatever reason. JDK bug ?
   18:                 throw e;
   19:             }
   20:         }
   21:     }
   22: }
  ```

  - 第 6 行：调用 `#unwrappedSelector()` 方法，返回 Java 原生 NIO Selector 对象。代码如下：

    ```java
    // NioEventLoop.java
    
    private Selector unwrappedSelector;
    
    Selector unwrappedSelector() {
        return unwrappedSelector;
    }
    ```

    - 每个 NioEventLoop 对象上，都**独有**一个 Selector 对象。

  - 第 6 行：调用 `#javaChannel()` 方法，获得 Java 原生 NIO 的 Channel 对象。

  - 第 6 行：【重要】调用 `SelectableChannel#register(Selector sel, int ops, Object att)` 方法，注册 Java 原生 NIO 的 Channel 对象到 Selector 对象上。相信胖友对这块的代码是非常熟悉的，但是为什么感兴趣的事件是为 **0** 呢？正常情况下，对于服务端来说，需要注册 `SelectionKey.OP_ACCEPT` 事件呢！这样做的**目的**是( 摘自《Netty权威指南（第二版）》 )：

    > 1. 注册方式是多态的，它既可以被 NIOServerSocketChannel 用来监听客户端的连接接入，也可以注册 SocketChannel 用来监听网络读或者写操作。
    >
    > 2. 通过
    >
    >     
    >
    >    ```
    >    SelectionKey#interestOps(int ops)
    >    ```
    >
    >     
    >
    >    方法可以方便地修改监听操作位。所以，此处注册需要获取 SelectionKey 并给 AbstractNIOChannel 的成员变量
    >
    >     
    >
    >    ```
    >    selectionKey
    >    ```
    >
    >     
    >
    >    赋值。
    >
    >    - 如果不理解，没关系，在下文中，我们会看到服务端对 `SelectionKey.OP_ACCEPT` 事件的关注。😈

  - 第 8 至 20 行：TODO 1003 doRegister 异常

- 第 16 行：标记首次注册为 `false` 。

- 第 18 行：标记 Channel 为已注册。`registered` 变量声明在 AbstractChannel 中，代码如下：

  ```java
  /**
   * 是否注册
   */
  private volatile boolean registered;
  ```

- 第 22 行：调用 `DefaultChannelPipeline#invokeHandlerAddedIfNeeded()` 方法，触发 ChannelInitializer 执行，进行 Handler 初始化。也就是说，我们在 [「4.init」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 写的 ServerBootstrap 对 Channel 设置的 ChannelInitializer 将被执行，进行 Channel 的 Handler 的初始化。

  - 具体的 pipeline 的内部调用过程，我们在后续文章分享。

- 第 25 行：调用 `#safeSetSuccess(ChannelPromise promise)` 方法，回调通知 `promise` 执行。在 [「3.13.1 doBind」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 小节，我们向 `regFuture` 注册的 ChannelFutureListener ，就会被**立即回调执行**。

  > 老艿艿：胖友在看完这小节的内容，可以调回 [「3.13.2 doBind0」](http://svip.iocoder.cn/Netty/bootstrap-1-server/#) 小节的内容继续看。

- 第 28 行：调用 `DefaultChannelPipeline#invokeHandlerAddedIfNeeded()` 方法，触发通知 Channel 已注册的事件。

  - 具体的 pipeline 的内部调用过程，我们在后续文章分享。
  - 笔者目前调试下来，没有涉及服务端启动流程的逻辑代码。

- 第 33 至 43 行：TODO 芋艿

- 第 44 至 49 行：发生异常，和 `#register(EventLoop eventLoop, final ChannelPromise promise)` 方法的处理异常的代码，是一致的。

### 4. ServerBootstrap

`io.netty.bootstrap.ServerBootstrap` ，实现 AbstractBootstrap 抽象类，用于 Server 的启动器实现类。

#### 4.1 构造方法

```java
/**
 * 启动类配置对象
 */
private final ServerBootstrapConfig config = new ServerBootstrapConfig(this);
/**
 * 子 Channel 的可选项集合
 */
private final Map<ChannelOption<?>, Object> childOptions = new LinkedHashMap<ChannelOption<?>, Object>();
/**
 * 子 Channel 的属性集合
 */
private final Map<AttributeKey<?>, Object> childAttrs = new LinkedHashMap<AttributeKey<?>, Object>();
/**
 * 子 Channel 的 EventLoopGroup 对象
 */
private volatile EventLoopGroup childGroup;
/**
 * 子 Channel 的处理器
 */
private volatile ChannelHandler childHandler;

public ServerBootstrap() { }

private ServerBootstrap(ServerBootstrap bootstrap) {
    super(bootstrap);
    childGroup = bootstrap.childGroup;
    childHandler = bootstrap.childHandler;
    synchronized (bootstrap.childOptions) {
        childOptions.putAll(bootstrap.childOptions);
    }
    synchronized (bootstrap.childAttrs) {
        childAttrs.putAll(bootstrap.childAttrs);
    }
}
```

- `config` 属性，ServerBootstrapConfig 对象，启动类配置对象。
- 在 Server 接受**一个** Client 的连接后，会创建**一个**对应的 Channel 对象。因此，我们看到 ServerBootstrap 的 `childOptions`、`childAttrs`、`childGroup`、`childHandler` 属性，都是这种 Channel 的可选项集合、属性集合、EventLoopGroup 对象、处理器。下面，我们会看到 ServerBootstrap 针对这些配置项的设置方法。

#### 4.2 group

`#group(..)` 方法，设置 EventLoopGroup 到 `group`、`childGroup` 中。代码如下：

```java
@Override
public ServerBootstrap group(EventLoopGroup group) {
    return group(group, group);
}

public ServerBootstrap group(EventLoopGroup parentGroup, EventLoopGroup childGroup) {
    super.group(parentGroup);
    if (childGroup == null) {
        throw new NullPointerException("childGroup");
    }
    if (this.childGroup != null) {
        throw new IllegalStateException("childGroup set already");
    }
    this.childGroup = childGroup;
    return this;
}
```

- 当只传入一个 EventLoopGroup 对象时，即调用的是 `#group(EventLoopGroup group)` 时，`group` 和 `childGroup` 使用同一个。一般情况下，我们不使用这个方法。

#### 4.3 childOption

`#childOption(ChannelOption<T> option, T value)` 方法，设置子 Channel 的可选项。代码如下：

```java
public <T> ServerBootstrap childOption(ChannelOption<T> childOption, T value) {
    if (childOption == null) {
        throw new NullPointerException("childOption");
    }
    if (value == null) { // 空，意味着移除
        synchronized (childOptions) {
            childOptions.remove(childOption);
        }
    } else { // 非空，进行修改
        synchronized (childOptions) {
            childOptions.put(childOption, value);
        }
    }
    return this;
}
```

#### 4.4 childAttr

`#childAttr(AttributeKey<T> key, T value)` 方法，设置子 Channel 的属性。代码如下：

```java
public <T> ServerBootstrap childAttr(AttributeKey<T> childKey, T value) {
    if (childKey == null) {
        throw new NullPointerException("childKey");
    }
    if (value == null) { // 空，意味着移除
        childAttrs.remove(childKey);
    } else { // 非空，进行修改
        childAttrs.put(childKey, value);
    }
    return this;
}
```

#### 4.5 childHandler

`#childHandler(ChannelHandler handler)` 方法，设置子 Channel 的处理器。代码如下：

```java
public ServerBootstrap childHandler(ChannelHandler childHandler) {
    if (childHandler == null) {
        throw new NullPointerException("childHandler");
    }
    this.childHandler = childHandler;
    return this;
}
```

#### 4.6 validate

`#validate()` 方法，校验配置是否正确。代码如下：

```java
@Override
public ServerBootstrap validate() {
    super.validate();
    if (childHandler == null) {
        throw new IllegalStateException("childHandler not set");
    }
    if (childGroup == null) {
        logger.warn("childGroup is not set. Using parentGroup instead.");
        childGroup = config.group();
    }
    return this;
}
```

#### 4.7 clone

`#clone()` 方法，克隆 ServerBootstrap 对象。代码如下：

```java
@Override
public ServerBootstrap clone() {
    return new ServerBootstrap(this);
}
```

- 调用参数为 `bootstrap` 为 ServerBootstrap 构造方法，克隆一个 ServerBootstrap 对象。

#### 4.8 init

`#init(Channel channel)` 方法，初始化 Channel 配置。代码如下：

```java
1: @Override
2: void init(Channel channel) throws Exception {
3:     // 初始化 Channel 的可选项集合
4:     final Map<ChannelOption<?>, Object> options = options0();
5:     synchronized (options) {
6:         setChannelOptions(channel, options, logger);
7:     }
8: 
9:     // 初始化 Channel 的属性集合
10:     final Map<AttributeKey<?>, Object> attrs = attrs0();
11:     synchronized (attrs) {
12:         for (Entry<AttributeKey<?>, Object> e: attrs.entrySet()) {
13:             @SuppressWarnings("unchecked")
14:             AttributeKey<Object> key = (AttributeKey<Object>) e.getKey();
15:             channel.attr(key).set(e.getValue());
16:         }
17:     }
18: 
19:     ChannelPipeline p = channel.pipeline();
20: 
21:     // 记录当前的属性
22:     final EventLoopGroup currentChildGroup = childGroup;
23:     final ChannelHandler currentChildHandler = childHandler;
24:     final Entry<ChannelOption<?>, Object>[] currentChildOptions;
25:     final Entry<AttributeKey<?>, Object>[] currentChildAttrs;
26:     synchronized (childOptions) {
27:         currentChildOptions = childOptions.entrySet().toArray(newOptionArray(0));
28:     }
29:     synchronized (childAttrs) {
30:         currentChildAttrs = childAttrs.entrySet().toArray(newAttrArray(0));
31:     }
32: 
33:     // 添加 ChannelInitializer 对象到 pipeline 中，用于后续初始化 ChannelHandler 到 pipeline 中。
34:     p.addLast(new ChannelInitializer<Channel>() {
35:         @Override
36:         public void initChannel(final Channel ch) throws Exception {
38:             final ChannelPipeline pipeline = ch.pipeline();
39: 
40:             // 添加配置的 ChannelHandler 到 pipeline 中。
41:             ChannelHandler handler = config.handler();
42:             if (handler != null) {
43:                 pipeline.addLast(handler);
44:             }
45: 
46:             // 添加 ServerBootstrapAcceptor 到 pipeline 中。
47:             // 使用 EventLoop 执行的原因，参见 https://github.com/lightningMan/netty/commit/4638df20628a8987c8709f0f8e5f3679a914ce1a
48:             ch.eventLoop().execute(new Runnable() {
49:                 @Override
50:                 public void run() {
52:                     pipeline.addLast(new ServerBootstrapAcceptor(
53:                             ch, currentChildGroup, currentChildHandler, currentChildOptions, currentChildAttrs));
54:                 }
55:             });
56:         }
57:     });
58: }}
```

- 第 3 至 7 行：将启动器配置的可选项集合，调用 `#setChannelOptions(channel, options, logger)` 方法，设置到 Channel 的可选项集合中。

- 第 9 至 17 行：将启动器配置的属性集合，设置到 Channel 的属性集合中。

- 第 21 至 31 行：记录启动器配置的**子 Channel**的属性，用于【第 52 至 53 行】的代码，创建 ServerBootstrapAcceptor 对象。

- 第 34 至 57 行：创建 ChannelInitializer 对象，添加到 pipeline 中，用于后续初始化 ChannelHandler 到 pipeline 中。

  - 第 40 至 44 行：添加启动器配置的 ChannelHandler 到 pipeline 中。

  - 第 46 至 55 行：创建 ServerBootstrapAcceptor 对象，添加到 pipeline 中。为什么使用 EventLoop 执行**添加的过程**？如果启动器配置的处理器，并且 ServerBootstrapAcceptor 不使用 EventLoop 添加，则会导致 ServerBootstrapAcceptor 添加到配置的处理器之前。示例代码如下：

    ```java
    ServerBootstrap b = new ServerBootstrap();
    b.handler(new ChannelInitializer<Channel>() {
    
        @Override
        protected void initChannel(Channel ch) {
            final ChannelPipeline pipeline = ch.pipeline();
            ch.eventLoop().execute(new Runnable() {
                @Override
                public void run() {
                    pipeline.addLast(new LoggingHandler(LogLevel.INFO));
                }
            });
        }
    
    });
    ```

    - Netty 官方的提交，可见 [github commit](https://github.com/lightningMan/netty/commit/4638df20628a8987c8709f0f8e5f3679a914ce1a) 。

  - ServerBootstrapAcceptor 也是一个 ChannelHandler 实现类，用于接受客户端的连接请求。详细解析，见后续文章。

  - 该 ChannelInitializer 的初始化的执行，在 `AbstractChannel#register0(ChannelPromise promise)` 方法中触发执行。

  - 那么为什么要使用 ChannelInitializer 进行处理器的初始化呢？而不直接添加到 pipeline 中。例如修改为如下代码：

    ```java
    final Channel ch = channel;
    final ChannelPipeline pipeline = ch.pipeline();
    
    // 添加配置的 ChannelHandler 到 pipeline 中。
    ChannelHandler handler = config.handler();
    if (handler != null) {
        pipeline.addLast(handler);
    }
    
    // 添加 ServerBootstrapAcceptor 到 pipeline 中。
    // 使用 EventLoop 执行的原因，参见 https://github.com/lightningMan/netty/commit/4638df20628a8987c8709f0f8e5f3679a914ce1a
    ch.eventLoop().execute(new Runnable() {
        @Override
        public void run() {
            System.out.println(Thread.currentThread() + ": ServerBootstrapAcceptor");
            pipeline.addLast(new ServerBootstrapAcceptor(
                    ch, currentChildGroup, currentChildHandler, currentChildOptions, currentChildAttrs));
        }
    });
    ```

    - 因为此时 Channel 并未注册到 EventLoop 中。如果调用 `EventLoop#execute(Runnable runnable)` 方法，会抛出 `Exception in thread "main" java.lang.IllegalStateException: channel not registered to an event loop` 异常。

### 666. 彩蛋

Netty 服务端启动涉及的流程非常多，所以有不理解的地方，胖友可以多多调试。在其中涉及到的 EventLoopGroup、EventLoop、Pipeline 等等组件，我们后在后续的文章，正式分享。

另外，也推荐如下和 Netty 服务端启动相关的文章，以加深理解：

- 闪电侠 [《Netty 源码分析之服务端启动全解析》](https://www.jianshu.com/p/c5068caab217)
- 小明哥 [《【死磕 Netty 】—— 服务端启动过程分析》](http://cmsblogs.com/?p=2470)
- 占小狼 [《Netty 源码分析之服务启动》](https://www.jianshu.com/p/e577803f0fb8)
- 杨武兵 [《Netty 源码分析系列 —— Bootstrap》](https://my.oschina.net/ywbrj042/blog/868798)
- 永顺 [《Netty 源码分析之 一 揭开 Bootstrap 神秘的红盖头 (服务器端)》](https://segmentfault.com/a/1190000007283053)

## Netty源码分析 —— 启动（二）之客户端

### 1. 概述

本文，我们来分享 Bootstrap 分享 Netty 客户端。因为我们日常使用 Netty 主要使用 NIO 部分，所以本文也只分享 Netty NIO 客户端。

### 2. Bootstrap 示例

下面，我们先来看一个 ServerBootstrap 的使用示例，就是我们在 [《精尽 Netty 源码分析 —— 调试环境搭建》](http://svip.iocoder.cn/Netty/build-debugging-environment/#5-2-EchoClient) 搭建的 EchoClient 示例。代码如下：

```java
public final class EchoClient {

    static final boolean SSL = System.getProperty("ssl") != null;
    static final String HOST = System.getProperty("host", "127.0.0.1");
    static final int PORT = Integer.parseInt(System.getProperty("port", "8007"));
    static final int SIZE = Integer.parseInt(System.getProperty("size", "256"));

    public static void main(String[] args) throws Exception {
        // Configure SSL.git
        // 配置 SSL
        final SslContext sslCtx;
        if (SSL) {
            sslCtx = SslContextBuilder.forClient()
                .trustManager(InsecureTrustManagerFactory.INSTANCE).build();
        } else {
            sslCtx = null;
        }

        // Configure the client.
        // 创建一个 EventLoopGroup 对象
        EventLoopGroup group = new NioEventLoopGroup();
        try {
            // 创建 Bootstrap 对象
            Bootstrap b = new Bootstrap();
            b.group(group) // 设置使用的 EventLoopGroup
             .channel(NioSocketChannel.class) // 设置要被实例化的为 NioSocketChannel 类
             .option(ChannelOption.TCP_NODELAY, true) // 设置 NioSocketChannel 的可选项
             .handler(new ChannelInitializer<SocketChannel>() { // 设置 NioSocketChannel 的处理器
                 @Override
                 public void initChannel(SocketChannel ch) throws Exception {
                     ChannelPipeline p = ch.pipeline();
                     if (sslCtx != null) {
                         p.addLast(sslCtx.newHandler(ch.alloc(), HOST, PORT));
                     }
                     //p.addLast(new LoggingHandler(LogLevel.INFO));
                     p.addLast(new EchoClientHandler());
                 }
             });

            // Start the client.
            // 连接服务器，并同步等待成功，即启动客户端
            ChannelFuture f = b.connect(HOST, PORT).sync();

            // Wait until the connection is closed.
            // 监听客户端关闭，并阻塞等待
            f.channel().closeFuture().sync();
        } finally {
            // Shut down the event loop to terminate all threads.
            // 优雅关闭一个 EventLoopGroup 对象
            group.shutdownGracefully();
        }
    }
}
```

- 示例比较简单，已经添加中文注释，胖友自己查看。

### 3. Bootstrap

`io.netty.bootstrap.Bootstrap` ，实现 AbstractBootstrap 抽象类，用于 Client 的启动器实现类。

#### 3.1 构造方法

```java
/**
 * 默认地址解析器对象
 */
private static final AddressResolverGroup<?> DEFAULT_RESOLVER = DefaultAddressResolverGroup.INSTANCE;

/**
 * 启动类配置对象
 */
private final BootstrapConfig config = new BootstrapConfig(this);
/**
 * 地址解析器对象
 */
@SuppressWarnings("unchecked")
private volatile AddressResolverGroup<SocketAddress> resolver = (AddressResolverGroup<SocketAddress>) DEFAULT_RESOLVER;
/**
 * 连接地址
 */
private volatile SocketAddress remoteAddress;

public Bootstrap() { }

private Bootstrap(Bootstrap bootstrap) {
    super(bootstrap);
    resolver = bootstrap.resolver;
    remoteAddress = bootstrap.remoteAddress;
}
```

- `config` 属性，BootstrapConfig 对象，启动类配置对象。
- `resolver` 属性，地址解析器对象。绝大多数情况下，使用 `DEFAULT_RESOLVER` 即可。
- `remoteAddress` 属性，连接地址。

#### 3.2 resolver

`#resolver(AddressResolverGroup<?> resolver)` 方法，设置 `resolver` 属性。代码如下：

```java
public Bootstrap resolver(AddressResolverGroup<?> resolver) {
    this.resolver = (AddressResolverGroup<SocketAddress>) (resolver == null ? DEFAULT_RESOLVER : resolver);
    return this;
}
```

#### 3.3 remoteAddress

`#remoteAddress(...)` 方法，设置 `remoteAddress` 属性。代码如下：

```java
public Bootstrap resolver(AddressResolverGroup<?> resolver) {
    this.resolver = (AddressResolverGroup<SocketAddress>) (resolver == null ? DEFAULT_RESOLVER : resolver);
    return this;
}

public Bootstrap remoteAddress(SocketAddress remoteAddress) {
    this.remoteAddress = remoteAddress;
    return this;
}

public Bootstrap remoteAddress(String inetHost, int inetPort) {
    remoteAddress = InetSocketAddress.createUnresolved(inetHost, inetPort);
    return this;
}

public Bootstrap remoteAddress(InetAddress inetHost, int inetPort) {
    remoteAddress = new InetSocketAddress(inetHost, inetPort);
    return this;
}
```

#### 3.4 validate

`#validate()` 方法，校验配置是否正确。代码如下：

```java
@Override
public Bootstrap validate() {
    // 父类校验
    super.validate();
    // handler 非空
    if (config.handler() == null) {
        throw new IllegalStateException("handler not set");
    }
    return this;
}
```

- 在 `#connect(...)` 方法中，连接服务端时，会调用该方法进行校验。

#### 3.5 clone

`#clone(...)` 方法，克隆 Bootstrap 对象。代码如下：

```java
@Override
public Bootstrap clone() {
    return new Bootstrap(this);
}

public Bootstrap clone(EventLoopGroup group) {
    Bootstrap bs = new Bootstrap(this);
    bs.group = group;
    return bs;
}
```

- 两个克隆方法，都是调用参数为 `bootstrap` 为 Bootstrap 构造方法，克隆一个 Bootstrap 对象。差别在于，下面的方法，多了对 `group` 属性的赋值。

#### 3.6 connect

`#connect(...)` 方法，连接服务端，即启动客户端。代码如下：

```java
public ChannelFuture connect() {
    // 校验必要参数
    validate();
    SocketAddress remoteAddress = this.remoteAddress;
    if (remoteAddress == null) {
        throw new IllegalStateException("remoteAddress not set");
    }
    // 解析远程地址，并进行连接
    return doResolveAndConnect(remoteAddress, config.localAddress());
}

public ChannelFuture connect(String inetHost, int inetPort) {
    return connect(InetSocketAddress.createUnresolved(inetHost, inetPort));
}

public ChannelFuture connect(InetAddress inetHost, int inetPort) {
    return connect(new InetSocketAddress(inetHost, inetPort));
}

public ChannelFuture connect(SocketAddress remoteAddress) {
    // 校验必要参数
    validate();
    if (remoteAddress == null) {
        throw new NullPointerException("remoteAddress");
    }
    // 解析远程地址，并进行连接
    return doResolveAndConnect(remoteAddress, config.localAddress());
}

public ChannelFuture connect(SocketAddress remoteAddress, SocketAddress localAddress) {
    // 校验必要参数
    validate();
    if (remoteAddress == null) {
        throw new NullPointerException("remoteAddress");
    }
    // 解析远程地址，并进行连接
    return doResolveAndConnect(remoteAddress, localAddress);
}
```

- 该方法返回的是 ChannelFuture 对象，也就是**异步**的连接服务端，启动客户端。如果需要**同步**，则需要调用 `ChannelFuture#sync()` 方法。

`#connect(...)` 方法，核心流程如下图：

`#bind(...)` 方法，核心流程如下图：

![image-20230111172425493](../../_media/analysis/netty/image-20230111172425493.png)



- 主要有 5 个步骤，下面我们来拆解代码，看看和我们在 [《精尽 Netty 源码分析 —— NIO 基础（五）之示例》](http://svip.iocoder.cn/Netty/nio-5-demo/?self) 的 NioClient 的代码，是**怎么对应**的。
- 相比 `#bind(...)` 方法的流程，主要是**绿色**的 2 个步骤。

##### 3.6.1 doResolveAndConnect

`#doResolveAndConnect(final SocketAddress remoteAddress, final SocketAddress localAddress)` 方法，代码如下：

```java
 1: private ChannelFuture doResolveAndConnect(final SocketAddress remoteAddress, final SocketAddress localAddress) {
 2:     // 初始化并注册一个 Channel 对象，因为注册是异步的过程，所以返回一个 ChannelFuture 对象。
 3:     final ChannelFuture regFuture = initAndRegister();
 4:     final Channel channel = regFuture.channel();
 5: 
 6:     if (regFuture.isDone()) {
 7:         // 若执行失败，直接进行返回。
 8:         if (!regFuture.isSuccess()) {
 9:             return regFuture;
10:         }
11:         // 解析远程地址，并进行连接
12:         return doResolveAndConnect0(channel, remoteAddress, localAddress, channel.newPromise());
13:     } else {
14:         // Registration future is almost always fulfilled already, but just in case it's not.
15:         final PendingRegistrationPromise promise = new PendingRegistrationPromise(channel);
16:         regFuture.addListener(new ChannelFutureListener() {
17: 
18:             @Override
19:             public void operationComplete(ChannelFuture future) throws Exception {
20:                 // Directly obtain the cause and do a null check so we only need one volatile read in case of a
21:                 // failure.
22:                 Throwable cause = future.cause();
23:                 if (cause != null) {
24:                     // Registration on the EventLoop failed so fail the ChannelPromise directly to not cause an
25:                     // IllegalStateException once we try to access the EventLoop of the Channel.
26:                     promise.setFailure(cause);
27:                 } else {
28:                     // Registration was successful, so set the correct executor to use.
29:                     // See https://github.com/netty/netty/issues/2586
30:                     promise.registered();
31: 
32:                     // 解析远程地址，并进行连接
33:                     doResolveAndConnect0(channel, remoteAddress, localAddress, promise);
34:                 }
35:             }
36: 
37:         });
38:         return promise;
39:     }
40: }
```

- 第 3 行：调用 `#initAndRegister()`方法，初始化并注册一个 Channel 对象。因为注册是异步的过程，所以返回一个 ChannelFuture 对象。详细解析，见「3.7 initAndRegister」
- 第 6 至 10 行：若执行失败，直接进行返回 `regFuture` 对象。
- 第 9 至 37 行：因为注册是异步的过程，有可能已完成，有可能未完成。所以实现代码分成了【第 12 行】和【第 13 至 37 行】分别处理已完成和未完成的情况。
  - **核心**在【第 12 行】或者【第 33 行】的代码，调用 `#doResolveAndConnect0(final Channel channel, SocketAddress remoteAddress, final SocketAddress localAddress, final ChannelPromise promise)` 方法，解析远程地址，并进行连接。
  - 如果**异步**注册对应的 ChanelFuture 未完成，则调用 `ChannelFuture#addListener(ChannelFutureListener)` 方法，添加监听器，在**注册**完成后，进行回调执行 `#doResolveAndConnect0(...)` 方法的逻辑。详细解析，见 [「3.6.2 doResolveAndConnect0」](http://svip.iocoder.cn/Netty/bootstrap-2-client/#) 。
  - 所以总结来说，**resolve 和 connect 的逻辑，执行在 register 的逻辑之后**。

##### 3.6.2 doResolveAndConnect0

> 老艿艿：此小节的内容，胖友先看完 [「3.7 initAndRegister」](http://svip.iocoder.cn/Netty/bootstrap-2-client/#) 的内容在回过头来看。因为 `#doResolveAndConnect0(...)` 方法的执行，在 `#initAndRegister()` 方法之后。

`#doResolveAndConnect0(...)` 方法，解析远程地址，并进行连接。代码如下：

```java
 1: private ChannelFuture doResolveAndConnect0(final Channel channel, SocketAddress remoteAddress,
 2:                                            final SocketAddress localAddress, final ChannelPromise promise) {
 3:     try {
 4:         final EventLoop eventLoop = channel.eventLoop();
 5:         final AddressResolver<SocketAddress> resolver = this.resolver.getResolver(eventLoop);
 6: 
 7:         if (!resolver.isSupported(remoteAddress) || resolver.isResolved(remoteAddress)) {
 8:             // Resolver has no idea about what to do with the specified remote address or it's resolved already.
 9:             doConnect(remoteAddress, localAddress, promise);
10:             return promise;
11:         }
12: 
13:         // 解析远程地址
14:         final Future<SocketAddress> resolveFuture = resolver.resolve(remoteAddress);
15: 
16:         if (resolveFuture.isDone()) {
17:             // 解析远程地址失败，关闭 Channel ，并回调通知 promise 异常
18:             final Throwable resolveFailureCause = resolveFuture.cause();
19:             if (resolveFailureCause != null) {
20:                 // Failed to resolve immediately
21:                 channel.close();
22:                 promise.setFailure(resolveFailureCause);
23:             } else {
24:                 // Succeeded to resolve immediately; cached? (or did a blocking lookup)
25:                 // 连接远程地址
26:                 doConnect(resolveFuture.getNow(), localAddress, promise);
27:             }
28:             return promise;
29:         }
30: 
31:         // Wait until the name resolution is finished.
32:         resolveFuture.addListener(new FutureListener<SocketAddress>() {
33:             @Override
34:             public void operationComplete(Future<SocketAddress> future) throws Exception {
35:                 // 解析远程地址失败，关闭 Channel ，并回调通知 promise 异常
36:                 if (future.cause() != null) {
37:                     channel.close();
38:                     promise.setFailure(future.cause());
39:                 // 解析远程地址成功，连接远程地址
40:                 } else {
41:                     doConnect(future.getNow(), localAddress, promise);
42:                 }
43:             }
44:         });
45:     } catch (Throwable cause) {
46:         // 发生异常，并回调通知 promise 异常
47:         promise.tryFailure(cause);
48:     }
49:     return promise;
50: }
```

- 第 3 至 14 行：使用 `resolver`解析远程地址。因为解析是异步的过程，所以返回一个 Future 对象。
  - 详细的解析远程地址的代码，考虑到暂时不是本文的重点，所以暂时省略。😈 老艿艿猜测胖友应该也暂时不感兴趣，哈哈哈。
- 第 16 至 44 行：因为注册是异步的过程，有可能已完成，有可能未完成。所以实现代码分成了【第 16 至 29 行】和【第 31 至 44 行】分别处理已完成和未完成的情况。
  - **核心**在【第 26 行】或者【第 41 行】的代码，调用 `#doConnect(...)` 方法，连接远程地址。
  - 如果**异步**解析对应的 Future 未完成，则调用 `Future#addListener(FutureListener)` 方法，添加监听器，在**解析**完成后，进行回调执行 `#doConnect(...)` 方法的逻辑。详细解析，见 见 [「3.13.3 doConnect」](http://svip.iocoder.cn/Netty/bootstrap-2-client/#) 。
  - 所以总结来说，**connect 的逻辑，执行在 resolve 的逻辑之后**。
  - 老艿艿目前使用 [「2. Bootstrap 示例」](http://svip.iocoder.cn/Netty/bootstrap-2-client/#) 测试下来，符合【第 16 至 30 行】的条件，即无需走**异步**的流程。

##### 3.6.3 doConnect

`#doConnect(...)` 方法，执行 Channel 连接远程地址的逻辑。代码如下：

```java
 1: private static void doConnect(final SocketAddress remoteAddress, final SocketAddress localAddress, final ChannelPromise connectPromise) {
 2: 
 3:     // This method is invoked before channelRegistered() is triggered.  Give user handlers a chance to set up
 4:     // the pipeline in its channelRegistered() implementation.
 5:     final Channel channel = connectPromise.channel();
 6:     channel.eventLoop().execute(new Runnable() {
 7: 
 8:         @Override
 9:         public void run() {
10:             if (localAddress == null) {
11:                 channel.connect(remoteAddress, connectPromise);
12:             } else {
13:                 channel.connect(remoteAddress, localAddress, connectPromise);
14:             }
15:             connectPromise.addListener(ChannelFutureListener.CLOSE_ON_FAILURE);
16:         }
17: 
18:     });
19: }
```

- 第 6 行：调用 EventLoop 执行 Channel 连接远程地址的逻辑。但是，实际上当前线程已经是 EventLoop 所在的线程了，为何还要这样操作呢？答案在【第 3 至 4 行】的英语注释。感叹句，Netty 虽然代码量非常庞大且复杂，但是英文注释真的是非常齐全，包括 Github 的 issue 对代码提交的描述，也非常健全。

- 第 10 至 14 行：调用`Channel#connect(...)`方法，执行 Channel 连接远程地址的逻辑。后续的方法栈调用如下图：

  ![image-20230111172602068](../../_media/analysis/netty/image-20230111172602068.png)

  

  Channel connect 流程

  - 还是老样子，我们先省略掉 pipeline 的内部实现代码，从 `AbstractNioUnsafe#connect(final SocketAddress remoteAddress, final SocketAddress localAddress, final ChannelPromise promise)` 方法，继续向下分享。

`AbstractNioUnsafe#connect(final SocketAddress remoteAddress, final SocketAddress localAddress, final ChannelPromise promise)` 方法，执行 Channel 连接远程地址的逻辑。代码如下：

```java
 1: @Override
 2: public final void connect(final SocketAddress remoteAddress, final SocketAddress localAddress, final ChannelPromise promise) {
 3:     if (!promise.setUncancellable() || !ensureOpen(promise)) {
 4:         return;
 5:     }
 6: 
 7:     try {
 8:         // 目前有正在连接远程地址的 ChannelPromise ，则直接抛出异常，禁止同时发起多个连接。
 9:         if (connectPromise != null) {
10:             // Already a connect in process.
11:             throw new ConnectionPendingException();
12:         }
13: 
14:         // 记录 Channel 是否激活
15:         boolean wasActive = isActive();
16: 
17:         // 执行连接远程地址
18:         if (doConnect(remoteAddress, localAddress)) {
19:             fulfillConnectPromise(promise, wasActive);
20:         } else {
21:             // 记录 connectPromise
22:             connectPromise = promise;
23:             // 记录 requestedRemoteAddress
24:             requestedRemoteAddress = remoteAddress;
25: 
26:             // 使用 EventLoop 发起定时任务，监听连接远程地址超时。若连接超时，则回调通知 connectPromise 超时异常。
27:             // Schedule connect timeout.
28:             int connectTimeoutMillis = config().getConnectTimeoutMillis(); // 默认 30 * 1000 毫秒
29:             if (connectTimeoutMillis > 0) {
30:                 connectTimeoutFuture = eventLoop().schedule(new Runnable() {
31:                     @Override
32:                     public void run() {
33:                         ChannelPromise connectPromise = AbstractNioChannel.this.connectPromise;
34:                         ConnectTimeoutException cause = new ConnectTimeoutException("connection timed out: " + remoteAddress);
35:                         if (connectPromise != null && connectPromise.tryFailure(cause)) {
36:                             close(voidPromise());
37:                         }
38:                     }
39:                 }, connectTimeoutMillis, TimeUnit.MILLISECONDS);
40:             }
41: 
42:             // 添加监听器，监听连接远程地址取消。
43:             promise.addListener(new ChannelFutureListener() {
44:                 @Override
45:                 public void operationComplete(ChannelFuture future) throws Exception {
46:                     if (future.isCancelled()) {
47:                         // 取消定时任务
48:                         if (connectTimeoutFuture != null) {
49:                             connectTimeoutFuture.cancel(false);
50:                         }
51:                         // 置空 connectPromise
52:                         connectPromise = null;
53:                         close(voidPromise());
54:                     }
55:                 }
56:             });
57:         }
58:     } catch (Throwable t) {
59:         // 回调通知 promise 发生异常
60:         promise.tryFailure(annotateConnectException(t, remoteAddress));
61:         closeIfClosed();
62:     }
63: }
```

- 第 8 至 12 行：目前有正在连接远程地址的 ChannelPromise ，则直接抛出异常，禁止同时发起多个连接。`connectPromise` 变量，定义在 AbstractNioChannel 类中，代码如下：

  ```java
  /**
   * 目前正在连接远程地址的 ChannelPromise 对象。
   *
   * The future of the current connection attempt.  If not null, subsequent
   * connection attempts will fail.
   */
  private ChannelPromise connectPromise;
  ```

- 第 15 行：调用 `#isActive()` 方法，获得 Channel 是否激活。NioSocketChannel 对该方法的实现代码如下：

  ```java
  @Override
  public boolean isActive() {
      SocketChannel ch = javaChannel();
      return ch.isOpen() && ch.isConnected();
  }
  ```

  - 判断 SocketChannel 是否处于打开，并且连接的状态。此时，一般返回的是 `false` 。

- 第 18 行：调用 `#doConnect(SocketAddress remoteAddress, SocketAddress localAddress)` 方法，执行连接远程地址。代码如下：

  ```java
  // NioSocketChannel.java
    1: @Override
    2: protected boolean doConnect(SocketAddress remoteAddress, SocketAddress localAddress) throws Exception {
    3:     // 绑定本地地址
    4:     if (localAddress != null) {
    5:         doBind0(localAddress);
    6:     }
    7: 
    8:     boolean success = false; // 执行是否成功
    9:     try {
   10:         // 连接远程地址
   11:         boolean connected = SocketUtils.connect(javaChannel(), remoteAddress);
   12:         // 若未连接完成，则关注连接( OP_CONNECT )事件。
   13:         if (!connected) {
   14:             selectionKey().interestOps(SelectionKey.OP_CONNECT);
   15:         }
   16:         // 标记执行是否成功
   17:         success = true;
   18:         // 返回是否连接完成
   19:         return connected;
   20:     } finally {
   21:         // 执行失败，则关闭 Channel
   22:         if (!success) {
   23:             doClose();
   24:         }
   25:     }
   26: }
  ```

  - 第 3 至 6 行：若 `localAddress` 非空，则调用 `#doBind0(SocketAddress)` 方法，绑定本地地址。一般情况下，NIO Client 是不需要绑定本地地址的。默认情况下，系统会随机分配一个可用的本地地址，进行绑定。

  - 第 11 行：调用 `SocketUtils#connect(SocketChannel socketChannel, SocketAddress remoteAddress)` 方法，Java 原生 NIO SocketChannel 连接 远程地址，并返回是否连接完成( 成功 )。代码如下：

    ```java
    public static boolean connect(final SocketChannel socketChannel, final SocketAddress remoteAddress) throws IOException {
        try {
            return AccessController.doPrivileged(new PrivilegedExceptionAction<Boolean>() {
                @Override
                public Boolean run() throws IOException {
                    return socketChannel.connect(remoteAddress);
                }
            });
        } catch (PrivilegedActionException e) {
            throw (IOException) e.getCause();
        }
    }
    ```

    - 可能有胖友有和我一样的疑问，为什么将 connect 操作包在 AccessController 中呢？我们来看下 SocketUtils 类的注释：

      ```java
      /**
       * Provides socket operations with privileges enabled. This is necessary for applications that use the
       * {@link SecurityManager} to restrict {@link SocketPermission} to their application. By asserting that these
       * operations are privileged, the operations can proceed even if some code in the calling chain lacks the appropriate
       * {@link SocketPermission}.
       */
      ```

      - 一般情况下，我们用不到，所以也可以暂时不用理解。
      - 感兴趣的胖友，可以 Google “AccessController” 关键字，或者阅读 [《Java 安全模型介绍》](https://www.ibm.com/developerworks/cn/java/j-lo-javasecurity/index.html) 。

  - 【重要】第 12 至 15 行：若连接未完成( `connected == false` )时，我们可以看到，调用 `SelectionKey#interestOps(ops)` 方法，添加连接事件( `SelectionKey.OP_CONNECT` )为感兴趣的事件。也就说，也就是说，当连接远程地址成功时，Channel 对应的 Selector 将会轮询到该事件，可以进一步处理。

  - 第 20 至 25 行：若执行失败( `success == false` )时，调用 `#doClose()` 方法，关闭 Channel 。

- 第 18 至 19 行：笔者测试下来，`#doConnect(SocketChannel socketChannel, SocketAddress remoteAddress)` 方法的结果为 `false` ，所以不会执行【第 19 行】代码的 `#fulfillConnectPromise(ChannelPromise promise, boolean wasActive)` 方法，而是执行【第 20 至 57 行】的代码逻辑。

- 第 22 行：记录 `connectPromise` 。

- 第 24 行：记录 `requestedRemoteAddress` 。`requestedRemoteAddress` 变量，在 AbstractNioChannel 类中定义，代码如下：

  ```java
  /**
   * 正在连接的远程地址
   */
  private SocketAddress requestedRemoteAddress;
  ```

- 第 26 至 40 行：调用 `EventLoop#schedule(Runnable command, long delay, TimeUnit unit)` 方法，发起定时任务 `connectTimeoutFuture` ，监听连接远程地址**是否超时**。若连接超时，则回调通知 `connectPromise` 超时异常。`connectPromise` 变量，在 AbstractNioChannel 类中定义，代码如下：

  ```java
  /**
   * 连接超时监听 ScheduledFuture 对象。
   */
  private ScheduledFuture<?> connectTimeoutFuture;
  ```

- 第 42 至 57 行：调用 `ChannelPromise#addListener(ChannelFutureListener)` 方法，添加监听器，监听连接远程地址**是否取消**。若取消，则取消 `connectTimeoutFuture` 任务，并置空 `connectPromise` 。这样，客户端 Channel 可以发起下一次连接。

##### 3.6.4 finishConnect

看到此处，可能胖友会有疑问，客户端的连接在哪里完成呢？答案在 `AbstractNioUnsafe#finishConnect()` 方法中。而该方法通过 Selector 轮询到 `SelectionKey.OP_CONNECT` 事件时，进行触发。调用栈如下图：

![image-20230111172626729](../../_media/analysis/netty/image-20230111172626729.png)

```
* 哈哈哈，还是老样子，我们先省略掉 EventLoop 的内部实现代码，从 `AbstractNioUnsafe#finishConnect()` 方法，继续向下分享。
```

`AbstractNioUnsafe#finishConnect()` 方法，完成客户端的连接。代码如下：

```java
 1: @Override
 2: public final void finishConnect() {
 3:     // Note this method is invoked by the event loop only if the connection attempt was
 4:     // neither cancelled nor timed out.
 5:     // 判断是否在 EventLoop 的线程中。
 6:     assert eventLoop().inEventLoop();
 7: 
 8:     try {
 9:         // 获得 Channel 是否激活
10:         boolean wasActive = isActive();
11:         // 执行完成连接
12:         doFinishConnect();
13:         // 通知 connectPromise 连接完成
14:         fulfillConnectPromise(connectPromise, wasActive);
15:     } catch (Throwable t) {
16:         // 通知 connectPromise 连接异常
17:         fulfillConnectPromise(connectPromise, annotateConnectException(t, requestedRemoteAddress));
18:     } finally {
19:         // 取消 connectTimeoutFuture 任务
20:         // Check for null as the connectTimeoutFuture is only created if a connectTimeoutMillis > 0 is used
21:         // See https://github.com/netty/netty/issues/1770
22:         if (connectTimeoutFuture != null) {
23:             connectTimeoutFuture.cancel(false);
24:         }
25:         // 置空 connectPromise
26:         connectPromise = null;
27:     }
28: }
```

- 第 6 行：判断是否在 EventLoop 的线程中。
- 第 10 行：调用 `#isActive()` 方法，获得 Channel 是否激活。笔者调试时，此时返回 `false` ，因为连接还没完成。
- 第 12 行：调用 `#doFinishConnect()` 方法，执行完成连接的逻辑。详细解析，见 [「3.6.4.1 doFinishConnect」](http://svip.iocoder.cn/Netty/bootstrap-2-client/#) 。
- 第 14 行：执行完成连接**成功**，调用 `#fulfillConnectPromise(ChannelPromise promise, boolean wasActive)` 方法，通知 `connectPromise` 连接完成。详细解析，见 [「3.6.4.2 fulfillConnectPromise 成功」](http://svip.iocoder.cn/Netty/bootstrap-2-client/#) 。
- 第 15 至 17 行：执行完成连接**异常**，调用 `#fulfillConnectPromise(ChannelPromise promise, Throwable cause)` 方法，通知 `connectPromise` 连接异常。详细解析，见 [「3.6.4.3 fulfillConnectPromise 异常」](http://svip.iocoder.cn/Netty/bootstrap-2-client/#) 。
- 第 18 至 27 行：执行完成连接**结束**，取消 `connectTimeoutFuture` 任务，并置空 `connectPromise` 。

###### 3.6.4.1 doFinishConnect

`NioSocketChannel#doFinishConnect()` 方法，执行完成连接的逻辑。代码如下：

```java
@Override
protected void doFinishConnect() throws Exception {
    if (!javaChannel().finishConnect()) {
        throw new Error();
    }
}
```

- 【重要】是不是非常熟悉的，调用 `SocketChannel#finishConnect()` 方法，完成连接。😈 美滋滋。

###### 3.6.4.2 fulfillConnectPromise 成功

`AbstractNioUnsafe#fulfillConnectPromise(ChannelPromise promise, Throwable cause)` 方法，通知 `connectPromise` 连接完成。代码如下：

```java
 1: private void fulfillConnectPromise(ChannelPromise promise, boolean wasActive) {
 2:     if (promise == null) {
 3:         // Closed via cancellation and the promise has been notified already.
 4:         return;
 5:     }
 6: 
 7:     // 获得 Channel 是否激活
 8:     // Get the state as trySuccess() may trigger an ChannelFutureListener that will close the Channel.
 9:     // We still need to ensure we call fireChannelActive() in this case.
10:     boolean active = isActive();
11: 
12:     // 回调通知 promise 执行成功
13:     // trySuccess() will return false if a user cancelled the connection attempt.
14:     boolean promiseSet = promise.trySuccess();
15: 
16:     // 若 Channel 是新激活的，触发通知 Channel 已激活的事件。
17:     // Regardless if the connection attempt was cancelled, channelActive() event should be triggered,
18:     // because what happened is what happened.
19:     if (!wasActive && active) {
20:         pipeline().fireChannelActive();
21:     }
22: 
23:     // If a user cancelled the connection attempt, close the channel, which is followed by channelInactive().
24:     // TODO 芋艿
25:     if (!promiseSet) {
26:         close(voidPromise());
27:     }
28: }
```

- 第 10 行：调用 `#isActive()` 方法，获得 Channel 是否激活。笔者调试时，此时返回 `true` ，因为连接已经完成。

- 第 14 行：回调通知 `promise` 执行成功。此处的通知，对应回调的是我们添加到 `#connect(...)` 方法返回的 ChannelFuture 的 ChannelFutureListener 的监听器。示例代码如下：

  ```java
  ChannelFuture f = b.connect(HOST, PORT).addListener(new ChannelFutureListener() { // 回调的就是我！！！
      @Override
      public void operationComplete(ChannelFuture future) throws Exception {
          System.out.println("连接完成");
      }
  }).sync();
  ```

- 第 19 行：因为`wasActive == false`并且`active == true`，因此，Channel 可以认为是新激活的，满足【第 20 行】代码的执行条件。
  - 第 40 行：调用 `DefaultChannelPipeline#fireChannelActive()` 方法，触发 Channel 激活的事件。【重要】后续的流程，和 NioServerSocketChannel 一样，也就说，会调用到 `AbstractUnsafe#beginRead()` 方法。这意味着什么呢？将我们创建 NioSocketChannel 时，设置的 `readInterestOp = SelectionKey.OP_READ` 添加为感兴趣的事件。也就说，客户端可以读取服务端发送来的数据。
  - 关于 `AbstractUnsafe#beginRead()` 方法的解析，见 [《精尽 Netty 源码分析 —— 启动（一）之服务端》的 「3.13.3 beginRead」](http://svip.iocoder.cn/Netty/bootstrap-1-server/?self) 部分。
- 第 23 至 27 行：TODO 芋艿 1004 fulfillConnectPromise promiseSet

###### 3.6.4.3 fulfillConnectPromise 异常

`#fulfillConnectPromise(ChannelPromise promise, Throwable cause)` 方法，通知 `connectPromise` 连接异常。代码如下：

```java
private void fulfillConnectPromise(ChannelPromise promise, Throwable cause) {
    if (promise == null) {
        // Closed via cancellation and the promise has been notified already.
        return;
    }

    // 回调通知 promise 发生异常
    // Use tryFailure() instead of setFailure() to avoid the race against cancel().
    promise.tryFailure(cause);
    // 关闭
    closeIfClosed();
}
```

- 比较简单，已经添加中文注释，胖友自己查看。

#### 3.7 initAndRegister

Bootstrap 继承 AbstractBootstrap 抽象类，所以 `#initAndRegister()` 方法的流程上是一致的。所以和 ServerBootstrap 的差别在于：

1. 创建的 Channel 对象不同。
2. 初始化 Channel 配置的代码实现不同。

##### 3.7.1 创建 Channel 对象

考虑到本文的内容，我们以 NioSocketChannel 的创建过程作为示例。创建 NioSocketChannel 对象的流程，和 NioServerSocketChannel 基本是一致的，所以流程图我们就不提供了，直接开始撸源码。

###### 3.7.1.1 NioSocketChannel

```java
private static final SelectorProvider DEFAULT_SELECTOR_PROVIDER = SelectorProvider.provider();

private final SocketChannelConfig config;

public NioSocketChannel() {
    this(DEFAULT_SELECTOR_PROVIDER);
}

public NioSocketChannel(SelectorProvider provider) {
    this(newSocket(provider));
}
```

- `DEFAULT_SELECTOR_PROVIDER` **静态**属性，默认的 SelectorProvider 实现类。

- `config` 属性，Channel 对应的配置对象。每种 Channel 实现类，也会对应一个 ChannelConfig 实现类。例如，NioSocketChannel 类，对应 SocketChannelConfig 配置类。

- 在构造方法中，调用 `#newSocket(SelectorProvider provider)` 方法，创建 NIO 的 ServerSocketChannel 对象。代码如下：

  ```java
  private static SocketChannel newSocket(SelectorProvider provider) {
      try {
          /**
           *  Use the {@link SelectorProvider} to open {@link SocketChannel} and so remove condition in
           *  {@link SelectorProvider#provider()} which is called by each SocketChannel.open() otherwise.
           *
           *  See <a href="https://github.com/netty/netty/issues/2308">#2308</a>.
           */
          return provider.openSocketChannel();
      } catch (IOException e) {
          throw new ChannelException("Failed to open a socket.", e);
      }
  }
  ```

  - 😈 是不是很熟悉这样的代码，效果和 `SocketChannel#open()` 方法创建 SocketChannel 对象是一致。

- `#NioSocketChannel(SocketChannel channel)` 构造方法，代码如下：

  ```java
  public NioSocketChannel(SocketChannel socket) {
      this(null, socket);
  }
  
  public NioSocketChannel(Channel parent, SocketChannel socket) {
      super(parent, socket);
      config = new NioSocketChannelConfig(this, socket.socket());
  }
  ```

  - 调用父 AbstractNioByteChannel 的构造方法。详细解析，见 [「3.7.1.2 AbstractNioByteChannel」](http://svip.iocoder.cn/Netty/bootstrap-2-client/#) 。
  - 初始化 `config` 属性，创建 NioSocketChannelConfig 对象。

###### 3.7.1.2 AbstractNioByteChannel

```java
protected AbstractNioByteChannel(Channel parent, SelectableChannel ch) {
    super(parent, ch, SelectionKey.OP_READ);
}
```

- 调用父 AbstractNioChannel 的构造方法。后续的构造方法，和 NioServerSocketChannel 是一致的。
  - 注意传入的 SelectionKey 的值为 `OP_READ` 。

##### 3.7.2 初始化 Channel 配置

`#init(Channel channel)` 方法，初始化 Channel 配置。代码如下：

```java
@Override
void init(Channel channel) throws Exception {
    ChannelPipeline p = channel.pipeline();

    // 添加处理器到 pipeline 中
    p.addLast(config.handler());

    // 初始化 Channel 的可选项集合
    final Map<ChannelOption<?>, Object> options = options0();
    synchronized (options) {
        setChannelOptions(channel, options, logger);
    }

    // 初始化 Channel 的属性集合
    final Map<AttributeKey<?>, Object> attrs = attrs0();
    synchronized (attrs) {
        for (Entry<AttributeKey<?>, Object> e: attrs.entrySet()) {
            channel.attr((AttributeKey<Object>) e.getKey()).set(e.getValue());
        }
    }
}
```

- 比较简单，已经添加中文注释，胖友自己查看。

### 666. 彩蛋

撸完 Netty 服务端启动之后，再撸 Netty 客户端启动之后，出奇的顺手。美滋滋。

另外，也推荐如下和 Netty 客户端启动相关的文章，以加深理解：

- 杨武兵 [《Netty 源码分析系列 —— Bootstrap》](https://my.oschina.net/ywbrj042/blog/868798)
- 永顺 [《Netty 源码分析之 一 揭开 Bootstrap 神秘的红盖头 (客户端)》](https://segmentfault.com/a/1190000007282789)