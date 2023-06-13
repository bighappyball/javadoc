# 第10节 分布式RPC框架Dubbo

## RPC基础

### 什么是 RPC

RPC，Remote Procedure Call 即远程过程调用，远程过程调用其实对标的是本地过程调用

### RPC 框架设计

#### 服务消费者

##### 提供代理类

首先消费者面向接口编程，所以需要得知有哪些接口可以调用，可以通过公用 jar 包的方式来维护接口。现在知道有哪些接口可以调用了，但是只有接口啊，具体的实现怎么来？这事必须框架给处理了！所以还需要来个代理类，让消费者只管调，啥事都别管了，我代理帮你搞定。

##### 负载均衡

一般而言提供方不止一个，毕竟只有一个挂了那不就没了。所以提供方一般都是集群部署，那调用方需要通过负载均衡来选择一个调用，可以通过某些策略例如同机房优先调用啊啥的。

##### 容错机制

当然还需要有容错机制，毕竟这是远程调用，网络是不可靠的，所以可能需要重试什么的。

##### 约定通信协议和序列化

还要和服务提供方约定一个协议，例如我们就用 HTTP 来通信就好啦，也就是大家要讲一样的话，不然可能听不懂了。

当然序列化必不可少，毕竟我们本地的结构是“立体”的，需要序列化之后才能传输，因此还需要约定序列化格式。

#### 服务提供者

##### 实现对应的接口

服务提供者肯定要实现对应的接口这是毋庸置疑的。然后需要把自己的接口暴露出去，向注册中心注册自己，暴露自己所能提供的服务。

##### 反序列化

有消费者请求过来需要处理，提供者需要用和消费者协商好的协议来处理这个请求，然后做反序列化。

##### 线程池

序列化完的请求应该扔到线程池里面做处理，某个线程接受到这个请求之后找到对应的实现调用，然后再将结果原路返回。

#### 注册中心

#### 监控运维

## Dubbo基础

> [Dubbo系列-扬帆起航 (qq.com)](https://mp.weixin.qq.com/s/FPbu8rFOHyTGROIV8XJeTA)

> Dubbo 是阿里巴巴 2011年开源的一个基于 Java 的 RPC 框架，中间沉寂了一段时间，不过其他一些企业还在用 Dubbo 并自己做了扩展，比如当当网的 Dubbox，还有网易考拉的 Dubbok。
>
> 但是在 2017 年阿里巴巴又重启了对 Dubbo 维护。在 2017 年荣获了开源中国 2017 最受欢迎的中国开源软件 Top 3。
>
> 在 2018 年和 Dubbox 进行了合并，并且进入 Apache 孵化器，在 2019 年毕业正式成为 Apache 顶级项目。
>
> 目前 Dubbo 社区主力维护的是 2.6.x 和 2.7.x 两大版本，2.6.x 版本主要是 bug 修复和少量功能增强为准，是稳定版本。
>
> 而 2.7.x 是主要开发版本，更新和新增新的 feature 和优化，并且 2.7.5 版本的发布被 Dubbo 认为是里程碑式的版本发布，之后我们再做分析。
>
> 它实现了面向接口的代理 RPC 调用，并且可以配合 ZooKeeper 等组件实现服务注册和发现功能，并且拥有负载均衡、容错机制等。

### 总体架构

![图片](../_media/dubbo/640.jpeg)

| 节点      | 角色说明                     |
| :-------- | :--------------------------- |
| Consumer  | 需要调用远程服务的服务消费方 |
| Registry  | 注册中心                     |
| Provider  | 服务提供方                   |
| Container | 服务运行的容器               |
| Monitor   | 监控中心                     |

1. 首先服务提供者 **Provider 启动然后向注册中心注册**自己所能提供的服务。
2. 服务消费者 **Consumer 启动向注册中心订阅**自己所需的服务。然后注册中心将提供者元信息通知给 Consumer， 之后 Consumer 因为已经从注册中心获取提供者的地址，因此可以**通过负载均衡选择一个 Provider 直接调用** 。
3. 之后服务提供方元数据变更的话**注册中心会把变更推送给服务消费者**。
4. 服务提供者和消费者都会在内存中记录着调用的次数和时间，然后**定时的发送统计数据到监控中心**。

### 分层架构

总的而言 Dubbo 分为三层，如果每一层再细分下去，一共有十层。大的三层分别为 Business（业务层）、RPC 层、Remoting，并且还分为 API 层和 SPI 层。

分为大三层其实就是和我们知道的网络分层一样的意思，**只有层次分明，职责边界清晰才能更好的扩展**。

而分 API 层和 SPI 层这是 Dubbo 成功的一点，**采用微内核设计+SPI扩展**，使得有特殊需求的接入方可以自定义扩展，做定制的二次开发。

![图片](../_media/dubbo/640-1686194242595-3.jpeg)

接下来咱们再来看看每一层都是干嘛的。

1. Service，业务层，就是咱们开发的业务逻辑层。
2. Config，配置层，主要围绕 ServiceConfig 和 ReferenceConfig，初始化配置信息。
3. Proxy，代理层，服务提供者还是消费者都会生成一个代理类，使得服务接口透明化，代理层做远程调用和返回结果。
4. Register，注册层，封装了服务注册和发现。
5. Cluster，路由和集群容错层，负责选取具体调用的节点，处理特殊的调用要求和负责远程调用失败的容错措施。
6. Monitor，监控层，负责监控统计调用时间和次数。
7. Portocol，远程调用层，主要是封装 RPC 调用，主要负责管理 Invoker，Invoker代表一个抽象封装了的执行体，之后再做详解。
8. Exchange，信息交换层，用来封装请求响应模型，同步转异步。
9. Transport，网络传输层，抽象了网络传输的统一接口，这样用户想用 Netty 就用 Netty，想用 Mina 就用 Mina。
10. Serialize，序列化层，将数据序列化成二进制流，当然也做反序列化。

### SPI

SPI（Service Provider Interface），是 JDK 内置的一个服务发现机制，**它使得接口和具体实现完全解耦**。我们只声明接口，具体的实现类在配置中选择。

具体的就是你定义了一个接口，然后在`META-INF/services`目录下**放置一个与接口同名的文本文件**，文件的内容为**接口的实现类**，多个实现类用换行符分隔。





### 服务暴露过程

![图片](../_media/dubbo/640-1686205372407-6.jpeg)

首先 Provider 启动，通过 Proxy 组件根据具体的协议 Protocol 将需要暴露出去的接口封装成 Invoker，Invoker 是 Dubbo 一个很核心的组件，代表一个可执行体。

然后再通过 Exporter 包装一下，这是为了在注册中心暴露自己套的一层，然后将 Exporter 通过 Registry 注册到注册中心。这就是整体服务暴露过程。

### 消费过程

![图片](../_media/dubbo/640-1686206452296-9.jpeg)

首先消费者启动会向注册中心拉取服务提供者的元信息，然后调用流程也是从 Proxy 开始，毕竟都需要代理才能无感知。

Proxy 持有一个 Invoker 对象，调用 invoke 之后需要通过 Cluster 先从 Directory 获取所有可调用的远程服务的 Invoker 列表，如果配置了某些路由规则，比如某个接口只能调用某个节点的那就再过滤一遍 Invoker 列表。

剩下的 Invoker 再通过 LoadBalance 做负载均衡选取一个。然后再经过 Filter 做一些统计什么的，再通过 Client 做数据传输，比如用 Netty 来传输。

传输需要经过 Codec 接口做协议构造，再序列化。最终发往对应的服务提供者。

服务提供者接收到之后也会进行 Codec 协议处理，然后反序列化后将请求扔到线程池处理。某个线程会根据请求找到对应的 Exporter ，而找到 Exporter 其实就是找到了 Invoker，但是还会有一层层 Filter，经过一层层过滤链之后最终调用实现类然后原路返回结果。

完成整个调用过程！

## Dubbo调用过程

>[堂妹问我：Dubbo的服务暴露过程 (qq.com)](https://mp.weixin.qq.com/s/ISiN06QynyE2pPtX3cGQ9w)

### URL

一般而言我们说的 URL 指的就是统一资源定位符，在网络上一般指代地址，本质上看其实就是一串包含特殊格式的字符串，标准格式如下：

```
protocol://username:password@host:port/path?key=value&key=value
```

Dubbo 就是采用 URL 的方式来作为约定的参数类型，被称为公共契约，就是我们都通过 URL 来交互，来交流。

URL 具体的参数如下：

- protocol：指的是 dubbo 中的各种协议，如：dubbo thrift http
- username/password：用户名/密码
- host/port：主机/端口
- path：接口的名称
- parameters：参数键值对

### 配置解析

Dubbo 利用了 Spring 配置文件扩展了自定义的解析，像 dubbo.xsd 就是用来约束 XML 配置时候的标签和对应的属性用的，然后 Spring 在解析到自定义的标签的时候会查找 spring.schemas 和 spring.handlers。

![图片](../_media/dubbo/641)

![图片](../_media/dubbo/642)

spring.schemas 就是指明了约束文件的路径，而 spring.handlers 指明了利用该 handler 来解析标签，你看好的框架都是会预留扩展点的，讲白了就是去固定路径的固定文件名去找你扩展的东西，这样才能让用户灵活的使用。

我们再来看一下 DubboNamespaceHandler 都干了啥。

![图片](../_media/dubbo/643)

讲白了就是将标签对应的解析类关联起来，这样在解析到标签的时候就知道委托给对应的解析类解析，本质就是为了生成 Spring 的 BeanDefinition，然后利用 Spring 最终创建对应的对象。

### 服务暴露全流程

从**代码的流程**来看大致可以分为三个步骤（本文默认都需要暴露服务到注册中心）。

1. 第一步是检测配置，如果有些配置空的话会默认创建，并且组装成 URL 。

2. 第二步是暴露服务，包括暴露到本地的服务和远程的服务。

3. 第三步是注册服务至注册中心。


![图片](../_media/dubbo/644)

从**对象构建转换的角度**看可以分为两个步骤。

1. 第一步是将服务实现类转成 Invoker。

2. 第二部是将 Invoker 通过具体的协议转换成 Exporter。


![图片](../_media/dubbo/646)

### 服务暴露源码分析

接下来我们进入源码分析阶段，从上面配置解析的截图标红了的地方可以看到 service 标签其实就是对应 ServiceBean，我们看下它的定义。

![image-20230612102457354](../_media/dubbo/image-20230612102457354.png)

这里又涉及到 Spring 相关内容了，可以看到它实现了 `ApplicationListener<ContextRefreshedEvent>`，这样就会**在 Spring IOC 容器刷新完成后调用 `onApplicationEvent` 方法，而这个方法里面做的就是服务暴露**，这就是服务暴露的启动点。

![image-20230612102532927](../_media/dubbo/image-20230612102532927.png)

可以看到，如果不是延迟暴露、并且还没暴露过、并且支持暴露的话就执行 export 方法，而 export 最终会调用父类的 export 方法，我们来看看。

![image-20230612102607982](../_media/dubbo/image-20230612102607982.png)

主要就是检查了一下配置，确认需要暴露的话就暴露服务， doExport 这个方法很长，不过都是一些检测配置的过程，虽说不可或缺不过不是我们关注的重点，我们重点关注里面的 doExportUrls 方法。

![image-20230612102734691](../_media/dubbo/image-20230612102734691.png)

可以看到 Dubbo 支持多注册中心，并且支持多个协议，一个服务如果有多个协议那么就都需要暴露，比如同时支持 dubbo 协议和 hessian 协议，那么需要将这个服务用两种协议分别向多个注册中心（如果有多个的话）暴露注册。

loadRegistries 方法我就不做分析了，就是根据配置组装成注册中心相关的 URL ，我就给大家看下拼接成的 URL的样子。

```
registry://127.0.0.1:2181/com.alibaba.dubbo.registry.RegistryService?application=demo-provider&dubbo=2.0.2&pid=7960&qos.port=22222&registry=zookeeper&timestamp=1598624821286
```

我们接下来关注的重点在 doExportUrlsFor1Protocol 方法中，这个方法挺长的，我会截取大致的部分来展示核心的步骤。

![图片](../_media/dubbo/647)

此时构建出来的 URL 长这样，可以看到走得是 dubbo 协议。

![图片](../_media/dubbo/648)

然后就是要根据 URL 来进行服务暴露了，我们再来看下代码，这段代码我就直接截图了，因为需要断点的解释。

![图片](../_media/dubbo/649)

#### 本地暴露

我们再来看一下 exportLocal 方法，这个方法是**本地暴露**，走的是 injvm 协议，可以看到它搞了个新的 URL 修改了协议。

```java
    private void exportLocal(URL url) {
        if (!Constants.LOCAL_PROTOCOL.equalsIgnoreCase(url.getProtocol())) {
            URL local = URL.valueOf(url.toFullString())
                    .setProtocol(Constants.LOCAL_PROTOCOL)
                    .setHost(NetUtils.LOCALHOST)
                    .setPort(0);
            Exporter<?> exporter = protocol.export(
                    proxyFactory.getInvoker(ref, (Class) interfaceClass, local));
            exporters.add(exporter);
            logger.info("Export dubbo service " + interfaceClass.getName() +" to local registry");
        }
    }
```



我们来看一下这个 URL，可以看到协议已经变成了 injvm。

![图片](../_media/dubbo/650)

这里的 export 其实就涉及到上一篇文章讲的自适应扩展了。

```
 Exporter<?> exporter = protocol.export(
                    proxyFactory.getInvoker(ref, (Class) interfaceClass, local));
```

Protocol 的 export 方法是标注了 @ Adaptive 注解的，因此会生成代理类，然后代理类会根据 Invoker 里面的 URL 参数得知具体的协议，然后通过 Dubbo SPI 机制选择对应的实现类进行 export，而这个方法就会调用 InjvmProtocol#export 方法。

![image-20230612104003371](../_media/dubbo/image-20230612104003371.png)

![image-20230612104035118](../_media/dubbo/image-20230612104035118.png)

我们再来看看转换得到的 export 到底长什么样子。

![图片](../_media/dubbo/651)

从图中可以看到实际上就是具体实现类层层封装， invoker 其实是由 Javassist 创建的，具体创建过程 proxyFactory.getInvoker 就不做分析了，对 Javassist 有兴趣的同学自行去了解，之后可能会写一篇，至于 dubbo 为什么用 javassist 而不用 jdk 动态代理是**因为 javassist 快**。

##### 为什么要封装成 invoker

至于为什么要**封装成 invoker 其实就是想屏蔽调用的细节，统一暴露出一个可执行体**，这样调用者简单的使用它，向它发起 invoke 调用，它有可能是一个本地的实现，也可能是一个远程的实现，也可能一个集群实现。

##### 为什么要搞个本地暴露呢

因为可能存在同一个 JVM 内部引用自身服务的情况，因此**暴露的本地服务在内部调用的时候可以直接消费同一个 JVM 的服务避免了网络间的通信**。

可以有些同学已经有点晕，没事我这里立马搞个图带大家过一遍。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblzGqW0Ebo1TqXUU611Idn2HfgMMnibLpVxTLgsJ5GBpiaOfTYQzyVagAg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

对 exportLocal 再来一波时序图分析。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsibl6hxnozZoBEs8INI7vENeEXP7pIrwJBhcIvPRia4kqAUY08pMb140kJg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

#### 远程暴露

至此本地暴露已经好了，接下来就是远程暴露了，即下面这一部分代码

![image-20230612104634389](../_media/dubbo/image-20230612104634389.png)

也和本地暴露一样，需要封装成 Invoker ，不过这里相对而言比较复杂一些，我们先来看下  registryURL.addParameterAndEncoded(Constants.EXPORT_KEY, url.toFullString()) 将 URL 拼接成什么样子。

> registry://127.0.0.1:2181/com.alibaba.dubbo.registry.RegistryService?application=demo-provider&dubbo=2.0.2&export=dubbo://192.168.1.17:20880/com.alibaba.dubbo.demo.DemoService....

因为很长，我就不截全了，可以看到走 registry 协议，然后参数里又有 export=dubbo://，这个走 dubbo 协议，所以我们可以得知会先通过 registry 协议找到  RegistryProtocol 进行 export，并且在此方法里面还会根据 export 字段得到值然后执行 DubboProtocol 的 export 方法。

**大家要挺住，就快要完成整个流程的解析了！**

现在我们把目光聚焦到 RegistryProtocol#export 方法上，我们先过一遍整体的流程，然后再进入 doLocalExport 的解析。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblnYxKNq333alcwsZevKfSNtXWKnDRz6glgUbjBf21icJfMKLC8kLXbUA/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到这一步主要是将上面的 export=dubbo://... 先转换成 exporter ，然后获取注册中心的相关配置，如果需要注册则向注册中心注册，并且在 ProviderConsumerRegTable 这个表格中记录服务提供者，其实就是往一个 ConcurrentHashMap 中将塞入 invoker，key 就是服务接口全限定名，value 是一个 set，set 里面会存包装过的 invoker 。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblRlb5hOLHW0krzeBictdYNZyiaMEuUvKEryHIPRHA019KZhBYAu06g1Ow/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

我们再把目光聚焦到  doLocalExport 方法内部。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsibldYyndfEjR7cHSYVFQn0UpLc48eMTJ9icfDut7yACQqTPfX9upp4a9Wg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

这个方法没什么难度，主要就是根据URL上 Dubbo 协议暴露出 exporter，接下来就看下 DubboProtocol#export 方法。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsibljEBUibbiatNwW4WBwOT7tcSyob38DHKSttxVL6ys0AUVSuibq69edN0qw/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到这里的关键其实就是打开 Server ，RPC 肯定需要远程调用，这里我们用的是 NettyServer 来监听服务。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblc4NugZVXZvn4k7n2IrAnnW5TgWwxNGibmiaKAhy57AwicJMIYuJJts5hg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

再下面我就不跟了，我总结一下 Dubbo 协议的 export 主要就是根据 URL 构建出 key（例如有分组、接口名端口等等），然后 key 和 invoker 关联，关联之后存储到 DubboProtocol 的 exporterMap 中，然后如果是服务初次暴露则会创建监听服务器，默认是 NettyServer，并且会初始化各种 Handler 比如心跳啊、编解码等等。

看起来好像流程结束了？并没有， Filter 到现在还没出现呢？有隐藏的措施，上一篇 Dubbo SPI 看的仔细的各位就知道在哪里触发的。

其实上面的 protocol 是个代理类，在内部会通过 SPI 机制找到具体的实现类。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblw6mCmsR1dokn5rlX5kMEdBFcMjcAJaianBOwBLxiaiacIYQuFg0vj7BWQ/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

这张图是上一篇文章的，可以看到 export 具体的实现。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblibJYC6favuibufq5WAeTpPSxibtSvNxAjnNibC3lv3q4BJTQic0viaicuqlZg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

复习下上一篇的要点，通过 Dubbo SPI 扫包会把 wrapper 结尾的类缓存起来，然后当加载具体实现类的时候会包装实现类，来实现 Dubbo 的 AOP，我们看到 DubboProtocol 有什么包装类。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblwjQlIHIeXyZib8aWqicmiaw3dTaFhlghfkmxd6rUF0UsuvCwanCibhQVfw/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到有两个，分别是 ProtocolFilterWrapper 和 ProtocolListenerWrapper

对于所有的 Protocol 实现类来说就是这么个调用链。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblw6wOGicrq2BX7QS0kyLnIa1tNIxy3UnlNOzFF5I1PhVegU9J9v32HeA/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

而在 ProtocolFilterWrapper 的 export 里面就会把 invoker 组装上各种 Filter。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblw6wOGicrq2BX7QS0kyLnIa1tNIxy3UnlNOzFF5I1PhVegU9J9v32HeA/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

看看有 8 个在。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblOZPPdMIGbDj6S30XeDo3E7Ih6Nx1yL4jNT3ic1q9XmHXPl8JslVqKuQ/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

我们再来看下 zookeeper 里面现在是怎么样的，关注 dubbo 目录。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblo6ofqlKicMcIRQG6ibnQEz3iaAeJ6DwQwvKvHVayJ66sCkMbd6ib8vMf6w/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

两个 service 占用了两个目录，分别有 configurators 和 providers 文件夹，文件夹里面记录的就是 URL 的那一串，值是服务提供者 ip。

至此服务流程暴露差不多完结了，可以看到还是有点内容在里面的，并且还需要掌握 Dubbo SPI，不然有些点例如自适应什么的还是很难理解的。最后我再来一张完整的流程图带大家再过一遍，具体还是有很多细节，不过不是主干我就不做分析了，不然文章就有点散。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblwxBsUibsTPN5VM0JQXzbzcHiaibhVjgFtSyAmiaLelVPtBFibtzGmmZD3BA/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

然后再引用一下官网的时序图。

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpz82arDLk6S32wLdibQBnsiblbj7gR5D3ZHxGo6AhfwBTmIhHt9pkJpqHDRaAEd9Fp01SmaeXSib0UCw/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

## Dubbo的服务引用过程

>[女朋友问我：Dubbo的服务引用过程 (qq.com)](https://mp.weixin.qq.com/s?__biz=MzAwNDA2OTM1Ng==&mid=2453146107&idx=1&sn=03849f2f45ba27b480ad683f0a4b8f20&chksm=8cfd2b78bb8aa26ec3aabfc76d49afd9f697e9795cd3ace47306ffc575a3770efdc317adb2d2&cur_album_id=1508169304872108033&scene=189#wechat_redirect)

### 服务引用大致流程

我们已经得知 `Provider`将自己的服务暴露出来，注册到注册中心，而 `Consumer`无非就是通过一波操作从注册中心得知 Provider 的信息，然后自己封装一个调用类和 Provider 进行深入地交流。

而之前的文章我都已经提到在 `Dubbo`中一个可执行体就是 `Invoker`，所有调用都要向 Invoker 靠拢，因此可以推断出应该要先生成一个 Invoker，然后又因为框架需要往不侵入业务代码的方向发展，那我们的 Consumer 需要无感知的调用远程接口，因此需要搞个代理类，包装一下屏蔽底层的细节。

整体大致流程如下：

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrXv1lLAjPPFbhOG7j0n3IU9Ez3V7HDZkeZY2PCufvUPrCEEMxN7MJJQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

### 服务引入的时机

服务的引入和服务的暴露一样，也是通过 spring 自定义标签机制解析生成对应的 Bean，**Provider Service 对应解析的是 ServiceBean 而 Consumer Reference 对应的是 ReferenceBean**。

![image-20230612113727043](../_media/dubbo/image-20230612113727043.png)

前面服务暴露的时机我们上篇文章分析过了，在 Spring 容器刷新完成之后开始暴露，而服务的引入时机有两种，第一种是饿汉式，第二种是懒汉式。

饿汉式是通过实现 Spring 的`InitializingBean`接口中的 `afterPropertiesSet`方法，容器通过调用 `ReferenceBean`的 `afterPropertiesSet`方法时引入服务。

懒汉式是只有当这个服务被注入到其他类中时启动引入流程，也就是说用到了才会开始服务引入。

**默认情况下，Dubbo 使用懒汉式引入服务**，如果需要使用饿汉式，可通过配置 dubbo:reference 的 init 属性开启。

我们可以看到 `ReferenceBean`还实现了`FactoryBean`接口，这里有个关于 Spring 的面试点我带大家分析一波。

### BeanFactory 、FactoryBean、ObjectFactory

就是这三个玩意，我单独拿出来说一下，从字面上来看其实可以得知`BeanFactory`、`ObjectFactory`是个工厂而`FactoryBean`是个 Bean。

`BeanFactory` 其实就是 IOC 容器，有多种实现类我就不分析了，简单的说就是 Spring 里面的 Bean 都归它管，而`FactoryBean`也是 Bean 所以说也是归 BeanFactory 管理的。

那 `FactoryBean` 到底是个什么 Bean 呢？它其实就是把你真实想要的 Bean 封装了一层，在真正要获取这个 Bean 的时候容器会调用 FactoryBean#getObject() 方法，而在这个方法里面你可以进行一些复杂的组装操作。

这个方法就封装了真实想要的对象**复杂的创建过程**。

到这里其实就很清楚了，就是在真实想要的 Bean 创建比较复杂的情况下，或者是一些第三方 Bean 难以修改的情形，使用 FactoryBean 封装了一层，屏蔽了底层创建的细节，便于 Bean 的使用。

而 ObjectFactory 这个是用于延迟查找的场景，它就是一个普通工厂，当得到 ObjectFactory 对象时，相当于 Bean 没有被创建，只有当 getObject() 方法时，才会触发 Bean 实例化等生命周期。

主要用于暂时性地获取某个 Bean Holder 对象，如果过早的加载，可能会引起一些意外的情况，比如当  Bean A 依赖 Bean B 时，如果过早地初始化 A，那么 B 里面的状态可能是中间状态，这时候使用 A 容易导致一些错误。

总结的说 **BeanFactory 就是 IOC 容器，FactoryBean 是特殊的 Bean, 用来封装创建比较复杂的对象，而 ObjectFactory 主要用于延迟查找的场景，延迟实例化对象**。

### 服务引入的三种方式

服务的引入又分为了三种，第一种是本地引入、第二种是直接连接引入远程服务、第三种是通过注册中心引入远程服务。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrmmOgiaU3K060l9w9mWbUOHYtkYUN5CgUFPOZ2NpUK6CT8SlDC8Yzlsg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

**本地引入**不知道大家是否还有印象，之前服务暴露的流程每个服务都会通过搞一个本地暴露，走 injvm 协议（当然你要是 scope = remote 就没本地引用了），因为**存在一个服务端既是 Provider 又是 Consumer 的情况，然后有可能自己会调用自己的服务**，因此就弄了一个本地引入，这样就避免了远程网络调用的开销。

所以**服务引入会先去本地缓存找找看有没有本地服务**。

**直连远程引入服务**，这个其实就是平日测试的情况下用用，不需要启动注册中心，由 Consumer 直接配置写死 Provider 的地址，然后直连即可。

**注册中心引入远程服务**，这个就是重点了，Consumer 通过注册中心得知 Provider 的相关信息，然后进行服务的引入，这里还包括多注册中心，同一个服务多个提供者的情况，如何抉择如何封装，如何进行负载均衡、容错并且让使用者无感知，这就是个技术活。

**本文用的就是单注册中心引入远程服务**，让我们来看看 Dubbo 是如何做的吧。

### 服务引入流程解析

默认是懒汉式的，所以服务引入的入口就是 ReferenceBean 的 getObject 方法。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrUbHyCWZvXrQWJlz2gdvjEL3ZD6G4mibcofjIAmPgALtgHdiaqAX2BxIg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到很简单，就是调用 get 方法，如果当前还没有这个引用那么就执行 init 方法。

### 官网的一个小问题

这个问题就在 `if (ref == null)` 这一行，其实是一位老哥在调试的时候发现这个 ref 竟然不等于 null，因此就进不到 init 方法里面调试了，后来他发现是因为 IDEA 为了显示对象的信息，会通过 toString 方法获取对象对应的信息。

toString 调用的是 AbstractConfig#toString，而这个方法会通过反射调用了 ReferenceBean 的 getObject 方法，触发了引入服务动作，所以说到断点的时候 `ref != null`。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdr6lECMvsYUAm5HASdDvKHY6dqNQsKAjgBfVTO9L4vdqzqU821j6VJJA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到是通过方法名来进行反射调用的，而 getObject 就是 get 开头的，因此会被调用。

所以这个哥们提了个 PR，但是一开始没有被接受，一位 Member 认为这不是 bug， idea 设置一下不让调用 toString 就好了。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrtmiaBh3JJicSqiaq7Y3MQ3fCBPm3IMYdgbL1GhOuWJIOuvpFYlAXBeLug/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

不过另一位 Member 觉得这个 PR 挺好的，并且 Dubbo 项目二代掌门人北纬30也发话了，因此这个 PR 被受理了。

至此我们已经知道这个小问题了，然后官网上其实也写的很清楚。

但是小问题来了，之前我在文章提到我的源码版本是 **2.6.5**，是在 github 的 releases 里面下的，这个 tostring 问题其实我挺早之前就知道了，我想的是我 2.6.5 稳的一批，谁知道翻车了。

我调试的时候也没进到 init 方法因为 ref 也没等于 null，我就奇怪了，我里面去看了下 toString 方法，**2.6.5**版本竟然没有修改？没有将 getObject 做过滤，因此还是被调用了。

我又打开了**2.7.5**版本的代码，发现是修改过的判断。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdr1PrUJ565qicL524YajjJl4CdEpwiaX55xBM1E0E8VW5v0ibBKhBrPibwKQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

我又去特意下了 **2.6.6** 版本的代码，发现也是修改过的，因此这个修改并不是随着 **2.6.5** 版本发布，而是 **2.6.6**，除非我下的是个假包，这就是我说的小问题了，不过影响不大。

### 源码分析

init 方法很长，不过大部分就是检查配置然后将配置构建成 map ，这一大段我就不分析了，我们直接看一下构建完的 map 长什么样。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrIwVhwDSUcObSHGDSczzPxzrBf1qStwhgFKxoJB4PicYhdI6tHbjMTBQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

然后就进入重点方法 createProxy，从名字可以得到就是要创建的一个代理，因为代码很长，我就**一段一段的分析**。

![image-20230612130331232](../_media/dubbo/image-20230612130331232.png)

如果是走本地的话，那么直接构建个走本地协议的 URL 然后进行服务的引入，即 refprotocol.refer，这个方法之后会做分析，本地的引入就不深入了，就是去之前服务暴露的 exporterMap 拿到服务。

![image-20230612130434280](../_media/dubbo/image-20230612130434280.png)

如果不是本地，那肯定是远程了，接下来就是判断是点对点直连 provider 还是通过注册中心拿到 provider 信息再连接 provider 了，我们分析一下配置了 url 的情况，如果配置了 url 那么不是直连的地址，就是注册中心的地址。

![image-20230612130527878](../_media/dubbo/image-20230612130527878.png)

然后就是没配置 url 的情况，到这里肯定走的就是注册中心引入远程服务了。

![image-20230612130756197](../_media/dubbo/image-20230612130756197.png)

最终拼接出来的 URL 长这样。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrHMTHpA73Z90DOJQ9K1Baaicicn9YHqzgew5rao4A6IJPo3oZSxdlojxQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到这一部分其实就是根据各种参数来组装 URL ，因为我们的自适应扩展都需要根据 URL 的参数来进行的。

![image-20230612130856035](../_media/dubbo/image-20230612130856035.png)

至此我先画个图，给大家先捋一下。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrlyHedol8mkDRbeecs6TibqBibWQ4NAlmXT8CStgS4Z1ZJXut3XdqYJRg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

这其实就是整个流程了，简述一下就是先检查配置，通过配置构建一个 map ，然后利用 map 来构建 URL ，再通过 URL 上的协议利用自适应扩展机制调用对应的 protocol.refer 得到相应的 invoker 。

在有多个 URL 的时候，先遍历构建出 invoker 然后再由 StaticDirectory 封装一下，然后通过 cluster 进行合并，只暴露出一个 invoker 。

然后再构建代理，封装 invoker 返回服务引用，之后 Comsumer 调用的就是这个代理类。

相信通过图和上面总结性的简述已经知道大致的服务引入流程了，不过还是有很多细节，比如如何从注册中心得到 Provider 的地址，invoker 里面到底是怎么样的？别急，我们继续看。

从前面的截图我们可以看到此时的协议是 registry 因此走的是 RegistryProtocol#refer，我们来看一下这个方法。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdromJ8WP6SvDqslKyibk7Nlg91vmJZCzO4K1t1Uia4NCWcBfC5qC68fzdw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

主要就是获取注册中心实例，然后调用 doRefer 进行真正的 refer。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrZdgkbWZlRjPhgH4sWlicrXF6MvvJ8Ch860Gw0PzPTwZOQsOWQpMbwgg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

这个方法很关键，可以看到生成了`RegistryDirectory` 这个 directory 塞了注册中心实例，它自身也实现了`NotifyListener` 接口，因此**注册中心的监听其实是靠这家伙来处理的**。

然后向注册中心注册自身的信息，并且向注册中心订阅了 providers 节点、 configurators 节点 和 routers 节点，**订阅了之后 RegistryDirectory 会收到这几个节点下的信息，就会触发 DubboInvoker 的生成了，即用于远程调用的 Invoker**。

然后通过 cluster 再包装一下得到 Invoker，因此一个服务可能有多个提供者，最终在 ProviderConsumerRegTable 中记录这些信息，然后返回 Invoker。

所以我们知道`Conusmer` 是在 RegistryProtocol#refer 中向注册中心注册自己的信息，并且订阅 Provider 和配置的一些相关信息，我们看看订阅返回的信息是怎样的。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrMPHw3C3zPow0ODKgSCduespHTUUodL6EnPsjZzu8nGJ2GSguhGzAng/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

拿到了`Provider`的信息之后就可以通过监听触发 DubboProtocol# refer 了（具体调用哪个 protocol 还是得看 URL的协议的，我们这里是 dubbo 协议），整个触发流程我就不一一跟一下了，看下调用栈就清楚了。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdruxQeyeTV9Z4m3PqB18z4BuKbCM8guHTuZGVDkH9Zr1aN9OmnjlibUibg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

终于我们从注册中心拿到远程`Provider` 的信息了，然后进行服务的引入。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrGjs4RiavT2BF6Ayoib2JgUBrpe4mYVjVLrOcl3Fwib1u6TWA5sgicH3kOw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

这里的重点在 `getClients`，因为终究是要跟远程服务进行网络调用的，而 getClients 就是用于获取客户端实例，实例类型为 ExchangeClient，底层依赖 Netty 来进行网络通信，并且可以看到默认是共享连接。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrGjs4RiavT2BF6Ayoib2JgUBrpe4mYVjVLrOcl3Fwib1u6TWA5sgicH3kOw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

`getSharedClient` 我就不分析了，就是通过远程地址找 client ，这个 client 还有引用计数的功能，如果该远程地址还没有 client 则调用 initClient，我们就来看一下 initClient 方法。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrLrLOibVQkEib9WAPjwjAmLOicMFXSs8t3hkheRSyibrFiaASqU8Oq5iazcBg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

而这个`connect`最终返回 `HeaderExchangeClient`里面封装的是 `NettyClient` 。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrXyZCwBTXr4HKRc7XWJAjDOUq7lfxWwmbG80icjcjB9iafbe6GTf6lmtQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

然后最终得到的 `Invoker`就是这个样子，可以看到记录的很多信息，基本上该有的都有了，我这里走的是对应的服务只有一个 url 的情况，多个 url 无非也是利用 `directory` 和 `cluster`再封装一层。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrTVRmAU5kjbVvDAjorC4gYoibeOkxNeaO4WbsE6DEktRRezRqStz99AA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

最终将调用 `return (T) proxyFactory.getProxy(invoker);` 返回一个代理对象，这个就不做分析了。

到这里，整个流程就是分析完了，不知道大家清晰了没？我再补充前面的图，来一个完整的流程给大家再过一遍。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpz5d8nUSmg6LId8fd5ibJPdrpk1g5xYFUKsBNiaXQPibnYicl8bhiawpzKlgloDmoAUEZCPSpTDiaWPSkzg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

## Dubbo服务调用过程

>[帅地问我：Dubbo服务调用过程 (qq.com)](https://mp.weixin.qq.com/s/oNR9v_ID2oAlEvDI93hRcw)

### 大致流程

在分析`Dubbo` 的服务调用过程前我们先来思考一下如果让我们自己实现的话一次调用过程需要经历哪些步骤？

首先我们已经知晓了远程服务的地址，然后我们要做的就是把我们**要调用的方法具体信息告知远程服务，让远程服务解析这些信息**。

然后根据这些信息找到对应的实现类，然后进行调用，调用完了之后再原路返回，然后客户端解析响应再返回即可。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPf8uRmicqkl1Tk8oKmeHPghKiaAnib5hvgO4PZV42ias8JCTAnc4hfoBsG9w/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

### 调用具体的信息

那客户端告知服务端的具体信息应该包含哪些呢？

首先客户端肯定要告知要调用是服务端的哪个接口，当然还需要方法名、方法的参数类型、方法的参数值，还有可能存在多个版本的情况，所以还得带上版本号。

由这么几个参数，那么服务端就可以清晰的得知客户端要调用的是哪个方法，可以进行精确调用！

然后组装响应返回即可，我这里贴一个实际调用请求对象列子。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfAloNdB7ISl1punyfrbuWrMt2aVp6u22AW8lsfek3w8X7EwMaIXfDnA/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

data 就是我所说的那些数据，其他是框架的，包括协议版本、调用方式等等这个下面再分析。

到此其实大致的意思大家都清楚了，就是普通的远程调用，告知请求的参数，然后服务端解析参数找到对应的实现调用，再返回。

### 落地的调用流程

上面的是想象的调用流程，真实的落地调用流程没有这么简单。

首先**远程调用需要定义协议，也就是互相约定我们要讲什么样的语言**，要保证双方都能听得懂。

### 需要一个协议

所以**首先需要双方定义一个协议，这样计算机才能解析出正确的信息**。

#### 常见的三种协议形式

应用层一般有三种类型的协议形式，分别是：固定长度形式、特殊字符隔断形式、header+body 形式。

**固定长度形式**：指的是协议的长度是固定的，比如100个字节为一个协议单元，那么读取100个字节之后就开始解析。

- 优点就是效率较高，无脑读一定长度就解析。
- 缺点就是死板，每次长度只能固定，不能超过限制的长度，并且短了还得填充，在 RPC 场景中不太合适，谁晓得参数啥的要多长，定长了浪费，定短了不够。

**特殊字符隔断形式**：其实就是定义一个特殊结束符，根据特殊的结束符来判断一个协议单元的结束，比如用换行符等等。

- 这个协议的优点是长度自由，反正根据特殊字符来截断，缺点就是需要一直读，直到读到一个完整的协议单元之后才能开始解析，然后假如传输的数据里面混入了这个特殊字符就出错了。

**header+body 形式**：也就是头部是固定长度的，然后头部里面会填写 body 的长度， body 是不固定长度的，这样伸缩性就比较好了，可以先解析头部，然后根据头部得到 body 的 len 然后解析 body。

dubbo 协议就是属于 header+body 形式，而且也有特殊的字符 0xdabb ，这是用来解决 TCP 网络粘包问题的。

#### Dubbo 协议

Dubbo 支持的协议很多，我们就简单的分析下 Dubbo 协议。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPficyxfS8hvkxGzEaM09NXouyeibqpCDvzCcBX8LlVD8mUrkgicChpJwOYw/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

协议分为协议头和协议体，可以看到 16 字节的头部主要携带了魔法数，也就是之前说的 0xdabb，然后一些请求的设置，消息体的长度等等。

16 字节之后就是协议体了，包括协议版本、接口名字、接口版本、方法名字等等。

其实协议很重要，因为从中可以得知很多信息，而且只有懂了协议的内容，才能看得懂编码器和解码器在干嘛，我再截取一张官网对协议的解释图。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfcCbApOibqaDaaq4t3EbNXeZrlw5SMWicKuzJ5NCD1ibaGJdKVw73BiaJdQ/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

### 需要约定序列化器

**网络是以字节流的形式传输的**，相对于我们的对象来说，我们对象是多维的，而字节流是一维的，我们需要把我们的对象压缩成一维的字节流传输到对端。

然后对端再反序列化这些字节流变成对象。

#### 序列化协议

序列化大致分为两大类，一种是字符型，一种是二进制流。

**字符型**的代表就是 XML、JSON，字符型的优点就是调试方便，它是对人友好的，我们一看就能知道那个字段对应的哪个参数。

缺点就是传输的效率低，有很多冗余的东西，比如 JSON 的括号，对于网络传输来说传输的时间变长，占用的带宽变大。

还有一大类就是**二进制流型**，这种类型是对机器友好的，它的数据更加的紧凑，所以占用的字节数更小，传输更快。

缺点就是调试很难，肉眼是无法识别的，必须借用特殊的工具转换。

更深层次的就不深入了，序列化还是有很多门道的，以后有机会再谈。

Dubbo 默认用的是 hessian2 序列化协议。

所以实际落地还需要先约定好协议，然后再选择好序列化方式构造完请求之后发送。

### 粗略的调用流程图

我们来看一下官网的图。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfneB2Nfgl5F9f2TaXqO53zNrXYTBjF84l4Y866yGUFWrXYg5CwA8IKg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

简述一下就是客户端发起调用，实际调用的是代理类，代理类最终调用的是 Client (默认Netty)，需要构造好协议头，然后将 Java 的对象序列化生成协议体，然后网络调用传输。

服务端的 `NettyServer`接到这个请求之后，分发给业务线程池，由业务线程调用具体的实现方法。

但是这还不够，因为 Dubbo 是一个生产级别的 RPC 框架，它需要更加的安全、稳重。

### 详细的调用流程

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfpVwiaRgfNrIrLrZFQ4MnLEBH23RLpw8YmQIOpNHa1dHibXiajBNl51jsg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

前面已经分析过了客户端也是要序列化构造请求的，为了让图更加突出重点，所以就省略了这一步，当然还有响应回来的步骤，暂时就理解为原路返回，下文会再做分析。

可以看到生产级别就得稳，因此服务端往往会有多个，多个服务端的服务就会有多个 Invoker，最终需要通过路由过滤，然后再通过负载均衡机制来选出一个 Invoker 进行调用。

当然 Cluster 还有容错机制，包括重试等等。

请求会先到达 Netty 的 I/O 线程池进行读写和可选的序列化和反序列化，可以通过 `decode.in.io`控制，然后通过业务线程池处理反序列化之后的对象，找到对应 Invoker 进行调用。

### 调用流程-客户端源码分析

客户端调用一下代码。

```
String hello = demoService.sayHello("world"); 
```

调用具体的接口会调用生成的代理类，而代理类会生成一个 `RpcInvocation` 对象调用 `MockClusterInvoker#invoke`方法。

此时生成的 RpcInvocation  如下图所示，包含方法名、参数类和参数值。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPf6Kcd76JNERIqzpG5d3bMxOA9bQxBbnEFtmVyuiaIcnQFM4SPCZL4BLg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

然后我们再来看一下 MockClusterInvoker#invoke 代码。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfybeoLLwkibBtxrnaiapj4luaRxOtyRiaGAmeecOBKzros0U2MDDLyr50g/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到就是判断配置里面有没有配置 mock， mock 的话就不展开分析了，我们来看看 this.invoker.invoke 的实现，实际上会调用 AbstractClusterInvoker#invoker 。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfJZWj5D3phH6kXnoaIm7kQW4UfasJZOJaq3ENBiaCOqg69zfJ4QIKbTg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

#### 模板方法

这其实就是很常见的设计模式之一，模板方法。如果你经常看源码的话你知道这个设计模式真的是太常见的。

**模板方法其实就是在抽象类中定好代码的执行骨架，然后将具体的实现延迟到子类中，由子类来自定义个性化实现**，也就是说可以在不改变整体执行步骤的情况下修改步骤里面的实现，减少了重复的代码，也利于扩展，符合开闭原则。

在代码中就是那个 `doInvoke`由子类来实现，上面的一些步骤都是每个子类都要走的，所以抽到抽象类中。

#### 路由和负载均衡得到 Invoker

我们再来看那个 `list(invocation)`，其实就是通过方法名找 Invoker，然后服务的路由过滤一波，也有再造一个 MockInvoker 的。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfTGaTbHwn6gx0uDzyuDjReHadjSOnv4zB7Aq0iacichJSMM9EicutiaUMyQ/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

然后带着这些 Invoker 再进行一波 loadbalance 的挑选，得到一个 Invoker，我们默认使用的是 `FailoverClusterInvoker`，也就是失败自动切换的容错方式，其实关于路由、集群、负载均衡是独立的模块，如果展开讲的话还是有很多内容的，所以需要另起一篇讲，这篇文章就把它们先作为黑盒使用。

稍微总结一下就是 **FailoverClusterInvoker 拿到 Directory 返回的 Invoker 列表，并且经过路由之后，它会让 LoadBalance 从 Invoker 列表中选择一个 Invoker**。

最后`FailoverClusterInvoker`会将参数传给选择出的那个 Invoker 实例的 invoke 方法，进行真正的远程调用，我们来简单的看下 FailoverClusterInvoker#doInvoke，为了突出重点我删除了很多方法。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfJx8wic9NAMicIJBP36Y2QGsDq1FpGUhOncvQqjGicLZ07WPeqfUkJjmZQ/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

发起调用的这个 invoke 又是调用抽象类中的 invoke 然后再调用子类的 doInvoker，抽象类中的方法很简单我就不展示了，影响不大，直接看子类 DubboInvoker 的 doInvoke 方法。

![图片](data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate(-249.000000, -126.000000)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E)

#### 调用的三种方式

从上面的代码可以看到调用一共分为三种，分别是 oneway、异步、同步。

- **oneway**还是很常见的，就是当你不关心你的请求是否发送成功的情况下，就用 oneway 的方式发送，这种方式消耗最小，啥都不用记，啥都不用管。
- **异步调用**，其实 Dubbo 天然就是异步的，可以看到 client 发送请求之后会得到一个 ResponseFuture，然后把 future 包装一下塞到上下文中，这样用户就可以从上下文中拿到这个 future，然后用户可以做了一波操作之后再调用 future.get 等待结果。
- **同步调用**，这是我们最常用的，也就是 Dubbo 框架帮助我们异步转同步了，从代码可以看到在 Dubbo 源码中就调用了 `future.get`，所以给用户的感觉就是我调用了这个接口的方法之后就阻塞住了，必须要等待结果到了之后才能返回，所以就是同步的。

可以看到 Dubbo 本质上就是异步的，为什么有同步就是因为框架帮我们转了一下，而**同步和异步的区别其实就是`future.get` 在用户代码被调用还是在框架代码被调用**。

再回到源码中来，currentClient.request 源码如下就是组装 request 然后构造一个 future 然后调用 NettyClient 发送请求。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfdazVqrKvKOPhDNx2vXusfRqM22fmyVybuLcM1siaxo5wrGFicsJHgckA/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

我们再来看一下 `DefaultFuture` 的内部，你有没有想过一个问题，因为是异步，那么这个 future 保存了之后，等响应回来了如何找到对应的 future 呢？

这里就揭秘了！就是利用一个唯一 ID。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPf2gvdic7udcHgrjmrHF0Xnc7C8fcIhQs8oaeCPiaIdkchRrmWABbL5tFg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到 Request 会生成一个全局唯一 ID，然后 future 内部会将自己和 ID 存储到一个 ConcurrentHashMap。这个 ID 发送到服务端之后，服务端也会把这个 ID 返回来，这样通过这个 ID 再去ConcurrentHashMap 里面就可以找到对应的 future ，这样整个连接就正确且完整了！

我们再来看看最终接受到响应的代码，应该就很清晰了。

先看下一个响应的 message 的样子：

```
Response [id=14, version=null, status=20, event=false, error=null, result=RpcResult [result=Hello world, response from provider: 192.168.1.17:20881, exception=null]]
```

看到这个 ID 了吧，最终会调用 `DefaultFuture#received`的方法。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfDMPZ0FKIicD9RxNmVdRg54xUuMcUfmicumTfcYlZpq0C2Mk5qUbvQmWQ/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

为了能让大家更加的清晰，我再画个图：

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfmwiaKmmZkfcibdNh0uCI1AluGiaD4cm7ooPTv4P0fKWAoiaibeZnpw6jHYw/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

到这里差不多客户端调用主流程已经很清晰了，其实还有很多细节，之后的文章再讲述，不然一下太乱太杂了。

发起请求的调用链如下图所示：

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPf4tibXiaC1eUriawweJu6ia4klrXfCWS7CUDYBhkqR8speIDoSZ85ic1TCvQ/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

处理请求响应的调用链如下图所示：

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfibJSVUiclK7cbNGrjictG90eOcjBE0s2hvJPTayib8bAd3xbBgsKzX8dwg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

### 调用流程-服务端端源码分析

服务端接收到请求之后就会解析请求得到消息，这消息又有五种派发策略：

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfBrdmrbiaUonAUlWg1JOOSbJoZlvdfCNoibavVgbxC9J3zTBN5NfLl1OQ/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

默认走的是 all，也就是所有消息都派发到业务线程池中，我们来看下 AllChannelHandler 的实现。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfbw2q8zewj9aTEHJmGmgicb0UQZ6pfpNJSaQQIYheZO96DLFouGnIe4A/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

就是将消息封装成一个 ChannelEventRunnable 扔到业务线程池中执行，ChannelEventRunnable 里面会根据 ChannelState 调用对于的处理方法，这里是 `ChannelState.RECEIVED`，所以调用 `handler.received`，最终会调用 HeaderExchangeHandler#handleRequest，我们就来看下这个代码。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfMhDQfbkL4kpgcynWEeQ1CzlAkaD1QhU9w6Vr5hvzAEmhDrcCS7JuBA/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

这波关键点看到了吧，构造的响应先塞入请求的 ID，我们再来看看这个 reply 干了啥。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfO9ictiakGGFZPppia7b0Ef065EZLMAzgah3AwzHqBkIyec7Fh7TzfEXxg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

最后的调用我们已经清楚了，实际上会调用一个 Javassist 生成的代理类，里面包含了真正的实现类，之前已经分析过了这里就不再深入了，我们再来看看`getInvoker` 这个方法，看看怎么根据请求的信息找到对应的 invoker 的。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfJ9iaASDjaQQf4ptkMpOFiadcTMISLdTI34QWbBfxsFHZria7Loe6reSNg/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

关键就是那个 serviceKey， 还记得之前服务暴露将invoker 封装成 exporter 之后再构建了一个 serviceKey将其和 exporter 存入了 exporterMap 中吧，这 map 这个时候就起作用了！

这个 Key 就长这样：

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfvWyNk8CZNlzWCic50pzw8qxjRZVgtsibuvCh9CU79BuktiaYrVfXsxMnw/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

找到 invoker 最终调用实现类具体的方法再返回响应整个流程就完结了，我再补充一下之前的图。

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1FpzRZ8zcIIAfAouFVhHEibwPfhlxzLSibIkJhiaIe9hVOngIlhIjOgq39CXh4L7SQ0yhsouBREO95RAgQ/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

## Dubbo的SPI机制

> [三歪问我Dubbo的SPI机制是啥？ (qq.com)](https://mp.weixin.qq.com/s/gwWOsdQGEN0t2GJVMQQexw)

### 什么是 SPI

首先我们得先知道什么叫 SPI。

SPI (Service Provider Interface)，主要是用来在框架中使用的，最常见和莫过于我们在访问数据库时候用到的`java.sql.Driver`接口了。

你想一下首先市面上的数据库五花八门，不同的数据库底层协议的大不相同，所以首先需要**定制一个接口**，来约束一下这些数据库，使得 Java 语言的使用者在调用数据库的时候可以方便、统一的面向接口编程。

Java SPI 就是这样做的，约定在 Classpath 下的 META-INF/services/ 目录里创建一个**以服务接口命名的文件**，然后**文件里面记录的是此 jar 包提供的具体实现类的全限定名**。

这样当我们引用了某个 jar 包的时候就可以去找这个 jar 包的 META-INF/services/ 目录，再根据接口名找到文件，然后读取文件里面的内容去进行实现类的加载与实例化。

比如我们看下 MySQL 是怎么做的。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RicicTibLttZpmyoGMPdIqrG0PPDmxCdQJvxibwmfthKdTXOiaRQE55GhDVQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

再来看一下文件里面的内容。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RqicLkTZM509g8ksS1KAuoefukRaHrOWdvaXdiakrMuQoic2UeFfHQr31g/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

MySQL 就是这样做的，为了让大家更加深刻的理解我再简单的写一个示例。

### Java SPI 示例

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3Rep2Z3Bj8kOw7VfiakMvmlDUh4zFibKFqwGeSznxkcOJQK9qQJxRyWOLA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

然后我在 META-INF/services/ 目录下建了个以接口全限定名命名的文件，内容如下

```
com.demo.spi.NuanNanAobing
com.demo.spi.ShuaiAobing
```

运行之后的结果如下

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RRzX1S4fzlbTq54A0EfUP7KONIgbmSsRicL2GJM98HLQsRgEBkwrZUGA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

### Java SPI 源码分析

之前的文章我也提到了 Dubbo 并没有用 Java 实现的 SPI，而是自定义 SPI，那肯定是 Java SPI 有什么不方便的地方或者劣势。

因此丙带着大家先深入了解一下 Java SPI，这样才能知道哪里不好，进而再和 Dubbo SPI 进行对比的时候会更加的清晰其优势。

大家看到源码不要怕，丙已经给大家做了注释，并且逻辑也不难的，**想要变强源码不可或缺**。为了让大家更好的理解，丙在源码分析完了之后还会画个图，帮大家再理一下思路。

从上面我的示例中可以看到`ServiceLoader.load()`其实就是 Java SPI 入口，我们来看看到底做了什么操作。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3Rah6FcLYsZhFoEnvrz21txibCaWgBb6XIJ8b3z54TcCiaVbgbUJGFSCNw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

我用一句话概括一下，简单的说就是先找当前线程绑定的 ClassLoader，如果没有就用 SystemClassLoader，然后清除一下缓存，再创建一个 LazyIterator。

那现在重点就是 LazyIterator了，从上面代码可以看到我们调用了 hasNext() 来做实例循环，通过 next() 得到一个实例。而 LazyIterator 其实就是 Iterator 的实现类。我们来看看它到底干了啥。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RIcBsibpk93iaXMbU7q3qfTJPaQsk0tGsibfJIJ9G6siaFvYMag1YB8ElGA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

不管进入 if 分支还是 else 分支，重点都在我框出来的代码，接下来就进入重要时刻了！

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3R5P5X9U8ulB3ObfyeucEgQHwSFyd1lqic4U6pnUJmv6VoNBBYibUTdl4g/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到这个方法其实就是在约定好的地方找到接口对应的文件，然后加载文件并且解析文件里面的内容。

我们再来看一下 nextService()。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3Rj3DdAwv5upibs2sFzBXuPz9IvMgicx4YXIP6w03CEzQZYyGBrwyYCAAw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

所以就是通过文件里填写的全限定名加载类，并且创建其实例放入缓存之后返回实例。

整体的 Java SPI 的源码解析已经完毕，是不是很简单？就是约定一个目录，根据接口名去那个目录找到文件，文件解析得到实现类的全限定名，然后循环加载实现类和创建其实例。

我再用一张图来带大家过一遍。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RBYpGMZCDPcybNvpqIJWzKU7lNQIZtEEKUDiceusoODFBdLyjMibpUVyQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

### 想一下 Java SPI 哪里不好

相信大家一眼就能看出来，Java SPI 在查找扩展实现类的时候遍历 SPI 的配置文件并且**将实现类全部实例化**，假设一个实现类初始化过程比较消耗资源且耗时，但是你的代码里面又用不上它，这就产生了资源的浪费。

所以说 Java SPI 无法按需加载实现类。

### Dubbo SPI

因此 Dubbo 就自己实现了一个 SPI，让我们想一下按需加载的话首先你得给个名字，通过名字去文件里面找到对应的实现类全限定名然后加载实例化即可。

Dubbo 就是这样设计的，配置文件里面存放的是键值对，我截一个 Cluster 的配置。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RO7HWiciaVFgsqsCsVXnB65TA8hqcOFEbU2DEicLmw7cpZSWym42BCEylQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

并且 **Dubbo SPI 除了可以按需加载实现类之外，增加了 IOC 和 AOP 的特性，还有个自适应扩展机制。**

我们先来看一下 Dubbo 对配置文件目录的约定，不同于 Java SPI ，Dubbo 分为了三类目录。

- META-INF/services/ 目录：该目录下的 SPI 配置文件是为了用来兼容 Java SPI 。
- META-INF/dubbo/ 目录：该目录存放用户自定义的 SPI 配置文件。
- META-INF/dubbo/internal/ 目录：该目录存放 Dubbo 内部使用的 SPI 配置文件。

### Dubbo SPI 简单实例

用法很是简单，我就拿官网上的例子来展示一下。

首先在  META-INF/dubbo 目录下按接口全限定名建立一个文件，内容如下：

```
optimusPrime = org.apache.spi.OptimusPrime
bumblebee = org.apache.spi.Bumblebee
```

然后在接口上标注@SPI 注解，以表明它要用SPI机制，类似下面这个图（我就是拿 Cluster 的图举个例子，和这个示例代码定义的接口不一样）。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RCeoV9Kj3uEPYXQZbYr8uwUQ5ibuThkd8Lv8bTddmHAn6WIPJGrIJ8AQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

接着通过下面的示例代码即可加载指定的实现类。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RFaWV55E7dNdA3Kbu5j3aNx6nqUk1H7NkIH8dGeXJpXnYficiblibbkTkA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

再来看一下运行的结果。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3R36e7pYAW3WibibElgO2vBG9sRShhQOicSHX9A8zhIL1ibCy4ptic2zpT2DQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

### Dubbo 源码分析

> 此次分析的源码版本是 2.6.5

相信通过上面的描述大家已经对 Dubbo SPI 已经有了一定的认识，接下来我们来看看它的实现。

从上面的示例代码我们知道 ExtensionLoader 好像就是重点，它是类似 Java SPI 中 ServiceLoader 的存在。

我们可以看到大致流程就是先通过接口类找到一个 ExtensionLoader ，然后再通过 ExtensionLoader.getExtension(name) 得到指定名字的实现类实例。

我们就先看下 getExtensionLoader() 做了什么。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3R0Azap6qhdHhU789h7ouUO9NQqb26zFcZ3EEaeOLTuWicsMIrUhFXk2g/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

很简单，做了一些判断然后从缓存里面找是否已经存在这个类型的 ExtensionLoader ，如果没有就新建一个塞入缓存。最后返回接口类对应的 ExtensionLoader 。

我们再来看一下 getExtension() 方法，从现象我们可以知道这个方法就是从类对应的 ExtensionLoader 中通过名字找到实例化完的实现类。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RAoVHhD3A5fWAnO3DxyHLKO3fvjqWMINb8kFwZ8g9PP8wUHNWft728Q/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到重点就是 createExtension()，我们再来看下这个方法干了啥。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RZjSkiaJCoPbxqeZNkkuzTlI5yzWjsJf6qxPYJ6HGU6f6U4bXXugyByA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

整体逻辑很清晰，先找实现类，判断缓存是否有实例，没有就反射建个实例，然后执行 set 方法依赖注入。如果有找到包装类的话，再包一层。

到这步为止我先画个图，大家理一理，还是很简单的。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RXO6vQxwvic88MEAqmE1eicnxaplqR2O0XiaHD7jLicNFw6hvSqPapDGYdg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

那么问题来了 getExtensionClasses() 是怎么找的呢？injectExtension() 如何注入的呢（其实我已经说了set方法注入）？为什么需要包装类呢？

#### getExtensionClasses

这个方法进去也是先去缓存中找，如果缓存是空的，那么调用 `loadExtensionClasses`，我们就来看下这个方法。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RxrIlq3tFoMcvqHYla7g7K02Y4RK3gRrAeJ58J2F4pIgKKNaD1KsqZg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

而 `loadDirectory`里面就是根据类名和指定的目录，找到文件先获取所有的资源，然后一个一个去加载类，然后再通过`loadClass`去做一下缓存操作。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RmgMicjrwrerluSicGUVZfXybiaKpmbMbODWrLiaPpb3osYg11iakp9q7ZUg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到，loadClass 之前已经加载了类，loadClass  只是根据类上面的情况做不同的缓存。分别有 `Adaptive` 、`WrapperClass` 和普通类这三种，普通类又将`Activate`记录了一下。至此对于普通的类来说整个 SPI 过程完结了。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RVUImuJEtQYylq54iaJvV7WFKHPd63wTpouRfUq7A8ibp1hFlE8sBch9g/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

接下来我们分别看不是普通类的几种东西是干啥用的。

#### Adaptive 注解 - 自适应扩展

在进入这个注解分析之前，我们需要知道 Dubbo 的自适应扩展机制。

我们先来看一个场景，首先我们根据配置来进行 SPI 扩展的加载，但是我不想在启动的时候让扩展被加载，我想根据请求时候的参数来动态选择对应的扩展。

怎么做呢？

**Dubbo 通过一个代理机制实现了自适应扩展**，简单的说就是为你想扩展的接口生成一个代理类，可以通过JDK 或者 javassist 编译你生成的代理类代码，然后通过反射创建实例。

这个实例里面的实现会根据本来方法的请求参数得知需要的扩展类，然后通过 `ExtensionLoader.getExtensionLoader(type.class).getExtension(从参数得来的name)`，来获取真正的实例来调用。

我从官网搞了个例子，大家来看下。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3R9RFZPrqr40btichibZUAZ0H229hmWGULOU1wYsc7ErzGwmThYsDDfRicw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

现在大家应该对自适应扩展有了一定的认识了，我们再来看下源码，到底怎么做的。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RU1yaJ6KKvk4GibNdyUSqgp0JACfKowSicuWYXpT29GbYXgKN7e0bbeEA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

这个注解就是自适应扩展相关的注解，可以修饰类和方法上，在修饰类的时候不会生成代理类，因为这个类就是代理类，修饰在方法上的时候会生成代理类。

#### Adaptive 注解在类上

比如这个 `ExtensionFactory` 有三个实现类，其中一个实现类就被标注了 Adaptive 注解。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RpJQiaPEseJ25gwRmdLDWXRMJtpcGQGRrnZqwqDWOTUGlafT8W9uO8Lw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3Ro0bZGxxCKGLpSuGW6NLGXsPrCfXnss9G587uwSK1Ifs2yIZPlcrcUw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

在 ExtensionLoader 构造的时候就会去通过getAdaptiveExtension 获取指定的扩展类的 ExtensionFactory。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RdmoUNE3hpxKg4uVaa2n6Sk1plCmDZ8fCzp3icPwtNscro6hXUlmSf3g/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

我们再来看下 `AdaptiveExtensionFactory` 的实现。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3Rm1sfianmbJwAatsU38MSzfhTNPic7gfB0Y1lMRjTj40iapb224YZ3vU4w/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到先缓存了所有实现类，然后在获取的时候通过遍历找到对应的 Extension。

我们再来深入分析一波 getAdaptiveExtension 里面到底干了什么。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3R5UP0AR7sibuficGpjP5kE8R3JusFQye91cLiaAs6D146h2Uf9ZXFs7qUw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

到这里其实已经和上文分析的 `getExtensionClasses`中loadClass 对 Adaptive 特殊缓存相呼应上了。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3R4yE13oFDJKNib5n6ceuLDy5zPIY3SqI5m4VftDfRBfSePd64Jgqr7bQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

#### Adaptive 注解在方法上

注解在方法上则需要动态拼接代码，然后动态生成类，我们以 Protocol 为例子来看一下。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RJRCHbD6nKheGBKzpr1WusWMjd18szJ8t0z3sDRIdNOdyNzLrboMEwA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

Protocol 没有实现类注释了 Adaptive ，但是接口上有两个方法注解了 Adaptive ，有两个方法没有。

因此它走的逻辑应该应该是 `createAdaptiveExtensionClass`，

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RKjGk2f9Mk9jfrrn6SLHK8EomKyiahdicUgcrmIVjZdQZCh7ZpxhFCPjw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

具体在里面如何生成代码的我就不再深入了，有兴趣的自己去看吧，我就把成品解析一下，就差不多了。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RGYpibGH8vvOhianqJf5FA32SppqSa8iba2392jZSB6LQj59t3smcicxtlQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

我美化一下给大家看看。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RmWXDpgbOIhuicPVp7NhFiaJK0aWMPDzQXa5j0OMm24MB3FlAozkmlhhw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

可以看到会生成包，也会生成 import 语句，类名就是接口加个$Adaptive，并且实现这接口，没有标记 Adaptive 注解的方法调用的话直接抛错。

我们再来看一下标注了注解的方法，我就拿 export 举例。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3R3ia2kzzTC5niansOYQ2LPD04l0FOGFibyOibF4yibuejnWeic8LfA3YRvr0g/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

就像我前面说的那样，根据请求的参数，即 URL 得到具体要调用的实现类名，然后再调用 `getExtension` 获取。

整个自适应扩展流程如下。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RR8iclowUiaTELpdd8iamZTIPV6wB0yiaG4G31ib4dMLSTQCHagQgd1LTXuQ/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

#### WrapperClass - AOP

包装类是因为一个扩展接口可能有多个扩展实现类，而**这些扩展实现类会有一个相同的或者公共的逻辑**，如果每个实现类都写一遍代码就重复了，并且比较不好维护。

因此就搞了个包装类，Dubbo 里帮你自动包装，只需要某个扩展类的构造函数只有一个参数，并且是扩展接口类型，就会被判定为包装类，然后记录下来，用来包装别的实现类。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3Rtsiax4JTXDQFmrdUJZ4eicOYfeCHYibX60vxGobhbkTZNo5ibAUUxV0Idw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

简单又巧妙，这就是 AOP 了。

#### injectExtension - IOC

直接看代码，很简单，就是查找 set 方法，根据参数找到依赖对象则注入。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3R68OibCbjfiavE5zO5W73S4OiaElWh1PsC3wQ8qro4YM4gK79ItxcImNlw/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

这就是 IOC。

#### Activate 注解

这个注解我就简单的说下，拿 Filter 举例，Filter 有很多实现类，在某些场景下需要其中的几个实现类，而某些场景下需要另外几个，而 Activate 注解就是标记这个用的。

它有三个属性，group 表示修饰在哪个端，是 provider 还是 consumer，value 表示在 URL参数中出现才会被激活，order 表示实现类的顺序。

### 总结

先放个上述过程完整的图。

![图片](https://mmbiz.qpic.cn/mmbiz_png/uChmeeX1Fpw2oMzXxojtaJ9TARZP6z3RgiaKYdlGaHTkMdgoLg7YaBb5uGB9DY3Uyyq0B9GGlh7agyRR67Tvoqg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

