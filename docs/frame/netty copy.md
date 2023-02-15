[敖丙肝了一个月的Netty知识点 (qq.com)](https://mp.weixin.qq.com/s?__biz=MzAwNDA2OTM1Ng==&mid=2453149075&idx=1&sn=97fce87e5784823ad3ac9141292faf09&chksm=8cfd3710bb8abe06e767f7f81d97951a676d4ea68863b825ef91eab1ba822931b2d9f160073f&cur_album_id=1508169304872108033&scene=189#wechat_redirect)

## Netty

### Netty简介

Netty 是 JBOSS 提供的一个 Java 开源框架，是基于 NIO 的客户端/服务器编程框架，它既能快速开发高并发、高可用、高可靠性的网络服务器程序，也能开发高可用、高可靠的客户端程序。 
Netty 之所以受青睐，是因为 **Netty 提供异步的、事件驱动的网络应用程序框架和工具**。作为一个异步框架，Netty 的所有 IO 操作都是异步非阻塞的，通过 Future-Listener 机制，用户可以方便地主动获取或者通过通知机制获得 IO 操作结果

**优点**

* API 使用简单，开发门槛低。
* 功能强大，预置了多种编解码功能，支持多种主流协议。
* 定制能力强，可以通过 ChannelHandler 对通信框架进行灵活扩展。
* 性能高，与其他业界主流的 NIO 框架对比，Netty 的综合性能最优。
* 成熟、稳定，Netty 修复了已经发现的所有 JDK NIO 中的 BUG，业务开发人员不需要再为NIO 的 BUG 而烦恼。
* 社区活跃，版本迭代周期短，发现的 BUG 可以被及时修复。

### **NIO 基本概念**

#### IO 读写的基础原理

用户程序进行 IO 的读写，依赖于底层的 IO 读写，基本上会用到底层的 read&write两大系统调用。在不同的操作系统中，IO 读写的系统调用的名称可能不完全一样，但是基本功能是一样的。
上层应用无论是调用操作系统的 read，还是调用操作系统的 write，都会涉及缓冲区

* read 是把数据从内核缓冲区复制到进程缓冲区
* write 把数据从进程缓冲区复制到内核缓冲区。
而内核缓冲区底层的读写交换，是由操作系统内核（Kernel）来完成的
在用户程序中，无论是 Socket 的 IO、还是文件 IO 操作，都属于上层应用的开发，它们的输入（Input）和输出（Output）的处理，在编程的流程上，都是一致的

#### 内核缓冲区与进程缓冲区
缓冲区的目的，是为了减少频繁地与设备之间的物理交换。  
外部设备的直接读写，涉及操作系统的中断。发生系统中断时，需要保存之前的进程数据和状态等信息，而结束中断之后，还需要恢复之前的进程数据和状态等信息。为了减少这种底层系统的时间损耗、性能损耗，于是出现了内存缓冲区。

#### 系统调用流程
![alt 系统调用流程图](../_media/netty/1.png)  
以 read 系统调用为例，先看下一个完整输入流程的两个阶段：

* 等待数据准备好。
* 从内核向进程复制数据。 

read 一个 socket（套接字）:
* 第一个阶段，等待数据从网络中到达网卡。当所等待的分组到达时，它被复制到内核中的某个缓冲区。这个工作由操作系统自动完成，用户程序无感知。
* 第二个阶段，就是把数据从内核缓冲区复制到应用进程缓冲区。

再具体一点，如果是在 Java 服务器端，完成一次 socket 请求和响应:
* 客户端请求：Linux 通过网卡读取客户端的请求数据，将数据读取到内核缓冲区。
* 获取请求数据：Java 服务器通过 read 系统调用，从 Linux 内核缓冲区读取数据，再送入 Java进程缓冲区。
* 服务器端业务处理：Java 服务器在自己的用户空间中处理客户端的请求。
* 服务器端返回数据：Java 服务器完成处理后，构建好的响应数据，将这些数据从用户缓冲区写入内核缓冲区。这里用到的是 write 系统调用。
* 发送给客户端：Linux 内核通过网络 IO，将内核缓冲区中的数据写入网卡，网卡通过底层的通信协议，会将数据发送给目标客户端。

**阻塞与非阻塞**

- 阻塞 IO，指的是需要内核 IO 操作彻底完成后，才返回到用户空间执行用户的操作。  阻塞指的是用户空间程序的执行状态
- 阻塞是指用户空间（调用线程）一直在等待，而不能干别的事情；非阻塞是指用户空间（调用线程）拿到内核返回的状态值就返回自己的空间，IO 操作可以干就干，不可以干，就去干别的事情。

#### 同步与异步
- 同步 IO，是一种用户空间与内核空间的 IO 发起方式。同步 IO 是指用户空间的线程是主动发起 IO 请求的一方，内核空间是被动接受方。 
- 异步 IO 则反过来，是指系统内核是主动发起 IO 请求的一方，用户空间的线程是被动接受方。

#### IO 模型

**同步阻塞 IO（Blocking IO）** 

1. 从 Java 启动 IO 读的 read 系统调用开始，用户线程就进入阻塞状态。 
2. 当系统内核收到 read 系统调用，就开始准备数据。一开始，数据可能还没有到达内核缓冲区（例如，还没有收到一个完整的 socket 数据包），这个时候内核就要等待。 
3. 内核一直等到完整的数据到达，就会将数据从内核缓冲区复制到用户缓冲区（用户空间的内存），然后内核返回结果（例如返回复制到用户缓冲区中的字节数）。 
4. 直到内核返回后，用户线程才会解除阻塞的状态，重新运行起来。 

总之，阻塞 IO 的特点是：在内核进行 IO 执行的两个阶段，用户线程都被阻塞了。  

 阻塞IO的优点是 应用的程序开发非常简单；在阻塞等待数据期间，用户线程挂起。在阻塞期间，用户线程基本不会占用 CPU 资源。
 阻塞IO的缺点是 一般情况下，会为每个连接配备一个独立的线程；反过来说，就是一个线程维护一个连接的 IO 操作。但是，当在高并发的应用场景下，需要大量的线程来维护大量的网络连接，内存、线程切换开销会非常巨大。 

**同步非阻塞 IO（Non-blocking IO）**   

1. 在内核数据没有准备好的阶段，用户线程发起 IO 请求时，立即返回。所以，为了读取到最终的数据，用户线程需要不断地发起 IO 系统调用。  
2. 内核数据到达后，用户线程发起系统调用，用户线程阻塞。内核开始复制数据，它会将数据从内核缓冲区复制到用户缓冲区（用户空间的内存），然后内核返回结果（例如返回复制到的用户缓冲区的字节数）。  
3. 用户线程读到数据后，才会解除阻塞状态，重新运行起来。也就是说，用户进程需要经过多次的尝试，才能保证最终真正读到数据，而后继续执行。  
4. 同步非阻塞 IO 的特点：应用程序的线程需要不断地进行 IO 系统调用，轮询数据是否已经准备好，如果没有准备好，就继续轮询，直到完成 IO 系统调用为止。  
5. 同步非阻塞 IO 的优点：每次发起的 IO 系统调用，在内核等待数据过程中可以立即返回。用户线程不会阻塞，实时性较好。  

同步非阻塞 IO 的缺点：不断地轮询内核，这将占用大量的 CPU 时间，效率低下  

*这里说明一下，同步非阻塞 IO，可以简称为 NIO，但是，它不是 Java 中的 NIO，虽然它们的英文缩写一样，希望大家不要混淆。Java 的 NIO（New IO），对应的不是四种基础 IO 模型中的NIO（None Blocking IO）模型，而是另外的一种模型，叫作 IO 多路复用模型（ IO Multiplexing）。*

**IO 多路复用（IO Multiplexing）**

在 IO 多路复用模型中，引入了一种新的系统调用，查询 IO 的就绪状态。在 Linux 系统中，对应的系统调用为 select/epoll 系统调用。通过该系统调用，一个进程可以监视多个文件描述符，一旦某个描述符就绪（一般是内核缓冲区可读/可写），内核能够将就绪的状态返回给应用程序。随后，应用程序根据就绪的状态，进行相应的 IO 系统调用。 

select 系统调用，几乎在所有的操作系统上都有支持，具有良好的跨平台特性。epoll 是在 Linux 2.6 内核中提出的，是 select 系统调用的 Linux 增强版本。 

1. 选择器注册。在这种模式中，首先，将需要 read 操作的目标 socket 网络连接，提前注册到 select/epoll 选择器中，Java 中对应的选择器类是 Selector 类。然后，才可以开启整个 IO 多路复用模型的轮询流程。  
2. 就绪状态的轮询。通过选择器的查询方法，查询注册过的所有 socket 连接的就绪状态。通过查询的系统调用，内核会返回一个就绪的 socket 列表。当任何一个注册过的 socket 中的数据准备好了，内核缓冲区有数据（就绪）了，内核就将该 socket 加入到就绪的列表中。当用户进程调用了 select 查询方法，那么整个线程会被阻塞掉。  
3. 用户线程获得了就绪状态的列表后，根据其中的 socket 连接，发起 read 系统调用，用户线程阻塞。内核开始复制数据，将数据从内核缓冲区复制到用户缓冲区。  
4. 复制完成后，内核返回结果，用户线程才会解除阻塞的状态，用户线程读取到了数据，继续执行。

IO 多路复用模型的优点：与一个线程维护一个连接的阻塞 IO 模式相比，使用 select/epoll 的最大优势在于，一个选择器查询线程可以同时处理成千上万个连（Connection）。系统不必创建大量的线程，也不必维护这些线程，从而大大减小了系统的开销。

**异步 IO（Asynchronous IO）**

异步 IO，指的是用户空间与内核空间的调用方式反过来。用户空间的线程变成被动接受者，而内核空间成了主动调用者。 
AIO 的基本流程是：用户线程通过系统调用，向内核注册某个 IO 操作。内核在整个 IO 操作（包括数据准备、数据复制）完成后，通知用户程序，用户执行后续的业务操作。  

1. 当用户线程发起了 read 系统调用，立刻就可以开始去做其他的事，用户线程不阻塞。  

2. 内核就开始了 IO 的第一个阶段：准备数据。等到数据准备好了，内核就会将数据从内核缓冲区复制到用户缓冲区（用户空间的内存）。  

3. 内核会给用户线程发送一个信号（Signal），或者回调用户线程注册的回调方法，告诉用户线程 read 操作完成了。  

4. 用户线程读取用户缓冲区的数据，完成后续的业务操作。  

异步 IO 模型的特点：在内核等待数据和复制数据的两个阶段，用户线程都不是阻塞的。用户线程需要接收内核的 IO 操作完成的事件，或者用户线程需要注册一个 IO 操作完成的回调函数。正因为如此，异步 IO 有的时候也被称为信号驱动 IO。  

异步 IO 异步模型的缺点：应用程序仅需要进行事件的注册与接收，其余的工作都留给了操作系统，也就是说，需要底层内核提供支持。  

#### **通过合理配置来支持百万级并发连接**

前面已经深入浅出地介绍了高并发 IO 的模型。但是，即使采用了最先进的模型，如果不进行合理的配置，也没有办法支撑百万级的网络连接并发。  

这里所涉及的配置，就是 Linux 操作系统中文件句柄数的限制。在生产环境 Linux 系统中，基本上都需要解除文件句柄数的限制。原因是，Linux 的系统默认值为 1024，也就是说，一个进程最多可以接受 1024 个 socket 连接。这是远远不够的。 

文件句柄，也叫文件描述符。在 Linux 系统中，文件可分为：普通文件、目录文件、链接文件和设备文件。文件描述符（File Descriptor）是内核为了高效管理已被打开的文件所创建的索引，它是一个非负整数（通常是小整数），用于指代被打开的文件。所有的 IO 系统调用，包括 socket 的读写调用，都是通过文件描述符完成的。

ulimit -n 查看单个进程能够打开的最大文件句柄数量 -n 命令选项用于引用或设置当前的文件句柄数量的限制值。 
ulimit -n 1000000 设置为100000局柄

文件句柄数不够，会导致什么后果呢？当单个进程打开的文件句柄数量，超过了系统配置的上限值时，就会发出“Socket/File:Can't open so many files”的错误提示。 然而，使用 ulimit 命令来修改当前用户进程的一些基础限制，仅在当前用户环境有效。 
如果想永久地把设置值保存下来，可以编辑/etc/rc.local 开机启动文件，在文件中添加如下内容：   

ulimit -SHn 1000000  选项-S 表示软性极限值，-H 表示硬性极限值。硬性极限是实际的限制，就是最大可以是 100 万，不能再多了。软性极限是系统警告（Warning）的极限值，超过这个极限值，内核会发出警告。  

普通用户通过 ulimit 命令，可将软极限更改到硬极限的最大设置值。如果要更改硬极限，必须拥有 root 用户权限  

### Java NIO 通信基础

Java NIO 由以下三个核心组件组成： Channel（通道） Buffer（缓冲区） Selector（选择器）  

#### NIO 和 OIO 的对比

- OIO 是面向流（Stream Oriented）的，NIO 是面向缓冲区（Buffer Oriented）的。
- NIO 中引入了 Channel（通道）和 Buffer（缓冲区）的概念。读取和写入，只需要从通道中读取数据到缓冲区中，或将数据从缓冲区中写入到通道中。NIO 不像 OIO 那样是顺序操作，可以随意地读取 Buffer 中任意位置的数据。  
- OIO 的操作是阻塞的，而 NIO 的操作是非阻塞的。  
- OIO 没有选择器（Selector）概念，而 NIO 有选择器的概念。 

#### 通道（Channel）

  在 OIO 中，同一个网络连接会关联到两个流：一个输入流（Input Stream），另一个输出流（Output Stream）。通过这两个流，不断地进行输入和输出的操作。   
  在 NIO 中，同一个网络连接使用一个通道表示，所有的 NIO 的 IO 操作都是从通道开始的。一个通道类似于 OIO 中的两个流的结合体，既可以从通道读取，也可以向通道写入。

#### Selector 选择器

IO 多路复用:指的是一个进程/线程可以同时监视多个文件描述符（一个网络连接，操作系统底层使用一个文件描述符来表示），一旦其中的一个或者多个文件描述符可读或者可写，系统内核就通知该进程/线程。在 Java 应用层面，如何实现对多个文件描述符的监视呢？需要用到一个非常重要的 Java NIO 组件——Selector 选择器。   
选择器的神奇功能是什么呢？它一个 IO 事件的查询器。通过选择器，一个线程可以查询多个通道的 IO 事件的就绪状态。   
实现 IO 多路复用，从具体的开发层面来说，首先把通道注册到选择器中，然后通过选择器内部的机制，可以查询（select）这些注册的通道是否有已经就绪的 IO 事件（例如可读、可写、网络连接完成等） 
一个选择器只需要一个线程进行监控，换句话说，我们可以很简单地使用一个线程，通过选  择器去管理多个通道。这是非常高效的，这种高效来自于 Java 的选择器组件Selector，以及其背后的操作系统底层的 IO 多路复用的支持。  

#### 缓冲区（Buffer）

​    应用程序与通道（Channel）主要的交互操作，就是进行数据的 read 读取和 write 写入。为了完成如此大任，NIO 为大家准备了第三个重要的组件——NIO Buffer（NIO 缓冲区）。通道的读取，就是将数据从通道读取到缓冲区中；通道的写入，就是将数据从缓冲区中写入到通道中。   
​    IO 的 Buffer（缓冲区）本质上是一个内存块，既可以写入数据，也可以从中读取数据。NIO的 Buffer 类，是一个抽象类，位于 java.nio 包中，其内部是一个内存块（数组）。 

***需要强调的是：Buffer 类是一个非线程安全类。*** 

**Buffer 类**  

Buffer 类是一个抽象类，对应于 Java 的主要数据类型，在 NIO 中有 8 种缓冲区类，分别如下：ByteBuffer 、 CharBuffer 、 DoubleBuffer 、 FloatBuffer 、 IntBuffer 、 LongBuffer 、 ShortBuffer 、MappedByteBuffer。MappedByteBuffer 是专门用于内存映射的一种 ByteBuffer 类型。 

Buffer 类在其内部，有一个 byte[]数组内存块，作为内存缓冲区。为了记录读写的状态和位置，Buffer 类提供了一些重要的属性。其中，有三个重要的成员属性：  

|  属性  |  说明  |
|  ----  | ----  |  
|  capacity  |  容量，即可以容纳的最大数据量；在缓冲区创建时设置并且不能改变
|limit| 上限，缓冲区中当前的数据量|  
|position|  位置，缓冲区中下一个要被读或写的元素的索引|
|mark| 标记，调用 mark()方法来设置 mark=position，再调用 reset()可以让 position 恢复到 mark标记的位position=mark|
* capacity（容量） 
Buffer 类的对象在初始化时，会按照 capacity 分配内部的内存。在内存分配好之后,就不能再改变。
* position（读写位置） 
Buffer 类的 position 属性，表示当前的位置。position 属性与缓冲区的读写模式有关。在不同的模式下，position 属性的值是不同的。当缓冲区进行读写的模式改变时，position 会进行调整。
在写入模式下，position 的值变化规则如下： 
（1）在刚进入到写模式时，position 值为 0，表示当前的写入位置为从头开始。 
（2）每当一个数据写到缓冲区之后，position 会向后移动到下一个可写的位置。
（3）初始的 position 值为 0，最大可写值 position 为 limit– 1。当position 值达到 limit时，缓冲区就已经无空间可写了。  
在读模式下，position 的值变化规则如下：  
（1）当缓冲区刚开始进入到读模式时，position 会被重置为 0。  
（2）当从缓冲区读取时，也是从 position 位置开始读。读取数据后，position 向前移动到下一个可读的位置。  
（3）position 最大的值为最大可读上限 limit，当 position 达到 limit 时，
表明缓冲区已经无数据可读。  
起点在哪里呢？当新建一个缓冲区时，缓冲区处于写入模式，这时是可以写数据的。数据写
入后，如果要从缓冲区读取数据，这就要进行模式的切换，可以使用（即调用）flip 翻转方法，将缓冲区变成读取模式。  
在这个 flip 翻转过程中，position 会进行非常巨大的调整，具体的规则是：position 由原来的写入位置，变成新的可读位置，也就是 0，表示可以从头开始读。flip 翻转的另外一半工作，就是要调整 limit 属性。  
* limit（读写的限制）:
Buffer 类的 limit 属性，表示读写的最大上限。limit 属性，也与缓冲区的读写模式有关  
在写模式下，limit 属性值的含义为可以写入的数据最大上限。  
在读模式下，limit 的值含义为最多能从缓冲区中读取到多少数据。  
是先写入再读取。当缓冲区写入完成后，就可以开始从 Buffer 读取数据，可以使用 flip 翻转方法，这时，limit 的值也会进行非常大的调整。  
写模式下的 position 值，设置成读模式下的 limit 值，也就是说，将之前写入的最大数量，作为可以读取的上限值。  
在 flip 翻转时，属性的调整，将涉及 position、limit 两个属性，这种调整比较微妙，不是太好理解，举一个简单例子：
首先，创建缓冲区。刚开始，缓冲区处于写模式。position 为 0，limit 为最大容量。然后，向缓冲区写数据。每写入一个数据，position 向后面移动一个位置，也就是 position 的值加 1。假定写入了 5 个数，当写入完成后，position 的值为 5。  
这时，使用（即调用）flip 方法，将缓冲区切换到读模式。limit 的值，先会被设置成写模式时的 position 值。这里新的 limit 是 5，表示可以读取的最大上限是 5 个数。同时，新的 position 会被重置为 0，表示可以从 0 开始读  
* mark（标记）: 可以将当前的 position 临时存入 mark 中；需要的时候，可以再从 mark 标记恢复到 position 位置。   
#### NIO Buffer 类的重要方法  
* allocate()创建缓冲区 
IntBuffer 是具体的 Buffer 子类，通过调用 IntBuffer.allocate(20)，创建了一个 Intbuffer实例对象，并且分配了 20 * 4 个字节的内存空间。一个缓冲区在新建后，处于写入的模式，position 写入位置为 0，最大可写上限 limit 为的初始化值（这里是 20），而缓冲区的容量 capacity 也是初始化值。    
* put()写入到缓冲区 
put 方法很简单，只有一个参数，即为所需要写入的对象。不过，写入的数据类型要求与缓冲区的类型保持一致。  
* flip()翻转 
如果需要读取数据，还需要将缓冲区转换成读模式。flip()翻转方法是 Buffer 类提供的一个模式转变的重要方法，它的作用就是将写入模式翻转成读取模式。  
flip()方法的从写入到读取转换:  
首先，设置可读的长度上限 limit。将写模式下的缓冲区中内容的最后写入位置 position 值，作为读模式下的 limit 上限值。  
其次，把读的起始位置 position 的值设为 0，表示从头开始读。  
最后，清除之前的 mark 标记，因为 mark 保存的是写模式下的临时位置。在读模式下，如果继续使用旧的 mark 标记，会造成位置混乱。 
```` java
public final Buffer flip() {
 limit = position; //设置可读的长度上限 limit,为写入的 position
 position = 0; //把读的起始位置 position 的值设为 0，表示从头开始读
 mark = UNSET_MARK; // 清除之前的 mark 标记
 return this;
}
````
在读取完成后，如何再一次将缓冲区切换成写入模式呢？: 
可以调用 Buffer.clear()清空或者 Buffer.compact()压缩方法，它们可以将缓冲区转换为写模式。  

* get()从缓冲区读取  
调用 flip 方法，将缓冲区切换成读取模式。这时，可以开始从缓冲区中进行数据读取了。读数据很简单，调用 get 方法，每次从position 的位置读取一个数据，并且进行相应的缓冲区属性的调整。  
缓冲区是不是可以重复读呢？答案是可以的  
* rewind()倒带  
已经读完的数据，如果需要再读一遍，可以调用 rewind()方法。rewind()也叫倒带，就像播放磁带一样倒回去，再重新播放:  
（1）position 重置为 0，所以可以重读缓冲区中的所有数据。  
（2）limit 保持不变，数据量还是一样的，仍然表示能从缓冲区中读取多少个元素。  
（3）mark 标记被清理，表示之前的临时位置不能再用了。  
```` java
public final Buffer rewind() {
position = 0;//重置为 0，所以可以重读缓冲区中的所有数据
mark = -1; // mark 标记被清理，表示之前的临时位置不能再用了
return this;
}  
````
* mark( )和 reset( )  
Buffer.mark()方法的作用是将当前 position 的值保存起来，放在 mark 属性中，让 mark 属性记住这个临时位置；之后，可以调用Buffer.reset()方法将 mark 的值恢复到 position 中。  
* clear( )清空缓冲区  
在读取模式下，调用 clear()方法将缓冲区切换为写入模式。此方法会将 position 清零，limit设置为 capacity 最大容量值，可以一直写入，直到缓冲区写满。  
* 总结  
总体来说，使用 Java NIO Buffer 类的基本步骤如下:  
（1）使用创建子类实例对象的 allocate()方法，创建一个 Buffer 类的实例对象。  
（2）调用 put 方法，将数据写入到缓冲区中。  
（3）写入完成后，在开始读取数据前，调用 Buffer.flip()方法，将缓冲区转换为读模式。  
（4）调用 get 方法，从缓冲区中读取数据。  
（5）读取完成后，调用 Buffer.clear() 或 Buffer.compact()方法，将缓冲区转换为写入模式。  
### NIO Channel（通道）类  
#### Channel（通道）的主要类型  
（1）FileChannel 文件通道，用于文件的数据读写。  
（2）SocketChannel 套接字通道，用于 Socket 套接字 TCP 连接的数据读写。  
（3）ServerSocketChannel 服务器嵌套字通道（或服务器监听通道），允许我们监听 TCP 连接请求，为每个监听到的请求，创建一个 SocketChannel 套接字通道。  
（4）DatagramChannel 数据报通道，用于 UDP 协议的数据读写。 
#### FileChannel 文件通道  
 FileChannel 是专门操作文件的通道。通过 FileChannel，既可以从一个文件中读取数据，也可以将数据写入到文件中。特别申明一下，**FileChannel 为阻塞模式，不能设置为非阻塞模式**。  
 下面分别介绍：FileChannel 的获取、读取、写入、关闭四个操作：  
 1. 获取 FileChannel 通道  
````java 
 //创建一条文件输入流
FileInputStreamfis = new FileInputStream(srcFile);
//获取文件流的通道
FileChannelinChannel = fis.getChannel();
//创建一条文件输出流
FileOutputStreamfos = new FileOutputStream(destFile);
//获取文件流的通道
FileChanneloutchannel = fos.getChannel();
````
或者  
````java
// 创建 RandomAccessFile 随机访问对象
RandomAccessFileaFile = new RandomAccessFile("filename.txt"，"rw");
//获取文件流的通道
FileChannelinChannel = aFile.getChannel();
````
2. 读取 FileChannel 通道  
````java
RandomAccessFileaFile = new RandomAccessFile(fileName, "rw");
//获取通道
FileChannelinChannel=aFile.getChannel();
//获取一个字节缓冲区
ByteBufferbuf = ByteBuffer.allocate(CAPACITY);
int length = -1;
//调用通道的 read 方法，读取数据并买入字节类型的缓冲区
while ((length = inChannel.read(buf)) != -1) {
//省略……处理读取到的 buf 中的数据
}
````
3. 写入 FileChannel 通道  
写入数据到通道，在大部分应用场景，都会调用通道的 int write（ByteBufferbuf）方法。此方法的参数——ByteBuffer 缓冲区，是数据的来源。write 方法的作用，是从 ByteBuffer 缓冲区中读取数据，然后写入到通道自身，而返回值是写入成功的字节数。  
````java
//如果 buf 刚写完数据，需要 flip 翻转 buf，使其变成读取模式
buf.flip();
int outlength = 0;
//调用 write 方法，将 buf 的数据写入通道
while ((outlength = outchannel.write(buf)) != 0) {
System.out.println("写入的字节数：" + outlength);
}
````
**此时的 ByteBuffer 缓冲区要求是可读的，处于读模式下。**  
4．关闭通道
当通道使用完成后，必须将其关闭。关闭非常简单，调用 close 方法即可。  
5．强制刷新到磁  
在将缓冲区写入通道时，出于性能原因，操作系统不可能每次都实时将数据写入磁盘。如果需要保证写入通道的缓冲数据，最终都真正地写入磁盘，可以调用 FileChannel 的 force()方法。  
***TODO 使用 FileChannel 完成文件复制的实践案例***  
#### SocketChannel 套接字通道  
在 NIO 中，涉及网络连接的通道有两个，一个是 SocketChannel 负责连接传输，另一个是ServerSocketChannel 负责连接的监听。  
ServerSocketChannel 应用于服务器端，而 SocketChannel 同时处于服务器端和客户端。  换句话说，对应于一个连接，两端都有一个负责传输的 SocketChannel 传输通道。  
无论是 ServerSocketChannel，还是 SocketChannel，都支持阻塞和非阻塞两种模式:  
（1）socketChannel.configureBlocking（false）设置为非阻塞模式。  
（2）socketChannel.configureBlocking（true）设置为阻塞模式。 
在阻塞模式下，SocketChannel 通道的 connect 连接、read 读、write 写操作，都是同步的和阻塞式的，在效率上与 Java 旧的 OIO 的面向流的阻塞式读写操作相同。  
在非阻塞模式下，通道的操作是异步、高效率的，这也是相对于传统的OIO 的优势所在。下面详细介绍在非阻塞模式下通道的打开、读写和关闭操作等操作:     

1. 获取 SocketChannel 传输通道  
在客户端，先通过 SocketChannel 静态方法 open()获得一个套接字传输通道；然后，将 socket套接字设置为非阻塞模式；最后，通过 connect()实例方法，对服务器的 IP 和端口发起连接。
````java
 //获得一个套接字传输通道
SocketChannelsocketChannel = SocketChannel.open();
 //设置为非阻塞模式
socketChannel.configureBlocking(false);
 //对服务器的 IP 和端口发起连接
socketChannel.connect(new InetSocketAddress("127.0.0.1"，80));
````
非阻塞情况下，与服务器的连接可能还没有真正建立，socketChannel.connect 方法就返回了，因此需要不断地自旋，检查当前是否是连接到了主机：
````java
while(! socketChannel.finishConnect() ){
 //不断地自旋、等待，或者做一些其他的事情…… 
}
````
当新连接事件到来时，在服务器端的 ServerSocketChannel 能成功地查询出一个新连接事件，并且通过调用服务器端 ServerSocketChannel 监听套接字的 accept()方法，来获取新连接的套接字通道：  
````java
//新连接事件到来，首先通过事件，获取服务器监听通道
ServerSocketChannel server = (ServerSocketChannel) key.channel();
//获取新连接的套接字通道
SocketChannelsocketChannel = server.accept();
//设置为非阻塞模式
socketChannel.configureBlocking(false);
````
强调一下，NIO 套接字通道，主要用于非阻塞应用场景。所以，需要调用 configureBlocking（false），从阻塞模式设置为非阻塞模式。  
2. 读取 SocketChannel 传输通道  
当 SocketChannel 通道可读时，可以从 SocketChannel 读取数据，具体方法与前面的文件通道读取方法是相同的。调用 read 方法，将数据读入缓冲区 ByteBuffer。  
````java
ByteBufferbuf = ByteBuffer.allocate(1024);
int bytesRead = socketChannel.read(buf);
````
在读取时，因为是异步的，因此我们必须检查 read 的返回值，以便判断当前是否读取到了数据。read()方法的返回值，是读取的字节数。如果返回-1，那么表示读取到对方的输出结束标志，对方已经输出结束，准备关闭连接。实际上，通过 read 方法读数据，本身是很简单的，比较困难的是，在非阻塞模式下，如何知道通道何时是可读的呢？这就需要用到 NIO 的新组件——Selector通道选择器  
3. 写入到 SocketChannel 传输通道  
````java
//写入前需要读取缓冲区，要求 ByteBuffer 是读取模式
buffer.flip();
socketChannel.write(buffer);
````
4. 关闭 SocketChannel 传输通道  
在关闭 SocketChannel 传输通道前，如果传输通道用来写入数据，则建议调用一次shutdownOutput() 终 止 输 出 方 法 ， 向 对 方 发 送 一 个 输 出 的 结 束 标 志 （ -1 ） 。 然 后 调 用socketChannel.close()方法，关闭套接字连接。
````java
//终止输出方法，向对方发送一个输出的结束标志
socketChannel.shutdownOutput();
//关闭套接字连接
IOUtil.closeQuietly(socketChannel);
````
#### DatagramChannel 数据报通道
和 Socket 套接字的 TCP 传输协议不同，UDP 协议不是面向连接的协议。使用 UDP 协议时，只要知道服务器的 IP 和端口，就可以直接向对方发送数据。在 Java 中使用 UDP 协议传输数据，比 TCP 协议更加简单。在 Java NIO 中，使用 DatagramChannel 数据报通道来处理 UDP 协议的数据传输。  
1. 获取 DatagramChannel 数据报通道  
获取数据报通道的方式很简单，调用 DatagramChannel 类的 open 静态方法即可。然后调用configureBlocking（false）方法，设置成非阻塞模式。  
````java
//获取 DatagramChannel 数据报通道
DatagramChannel channel = DatagramChannel.open();
//设置为非阻塞模式
datagramChannel.configureBlocking(false);
````
如果需要接收数据，还需要调用 bind 方法绑定一个数据报的监听端口，具体如下：
````java
//调用 bind 方法绑定一个数据报的监听端口
channel.socket().bind(new InetSocketAddress(18080));
````
2. 读取 DatagramChannel 数据报通道数据  
当 DatagramChannel 通道可读时，可以从 DatagramChannel 读取数据。和前面的 SocketChannel的读取方式不同，不是调用 read 方法，而是调用 receive（ByteBufferbuf）方法将数据从DatagramChannel 读入，再写入到 ByteBuffer 缓冲区中。  
````java
//创建缓冲区
ByteBufferbuf = ByteBuffer.allocate(1024);
//从 DatagramChannel 读入，再写入到 ByteBuffer 缓冲区
SocketAddressclientAddr= datagramChannel.receive(buffer);
````
通道读取 receive（ByteBufferbuf）方法的返回值，是 SocketAddress 类型，表示返回发送端的连接地址（包括 IP 和端口）。通过 receive 方法读数据非常简单，但是，在非阻塞模式下，如何知道 DatagramChannel 通道何时是可读的呢？和 SocketChannel 一样，同样需要用到 NIO 的新组件—Selector 通道选择器，稍后介绍。  
3. 写入 DatagramChannel 数据报通道  
向 DatagramChannel 发送数据，和向 SocketChannel 通道发送数据的方法也是不同的。这里不是调用 write 方法，而是调用 send 方法。示例代码如下：  
````java
//把缓冲区翻转到读取模式
buffer.flip();
//调用 send 方法，把数据发送到目标 IP+端口
dChannel.send(buffer, new InetSocketAddress(NioDemoConfig.SOCKET_SERVER_IP, 
 NioDemoConfig.SOCKET_SERVER_PORT));
//清空缓冲区，切换到写入模式
buffer.clear();
````
由于 UDP 是面向非连接的协议，因此，在调用 send 方法发送数据的时候，需要指定接收方的地址（IP 和端口）。  
4. 关闭 DatagramChannel 数据报通道
这个比较简单，直接调用 close()方法，即可关闭数据报通道。
````java
//简单关闭即可
dChannel.close();
````
### NIO Selector 选择器
#### 选择器以及注册
选择器（Selector）是什么呢？选择器和通道的关系又是什么？  
简单地说：选择器的使命是完成 IO 的多路复用。一个通道代表一条连接通路，通过选择器可以同时监控多个通道的 IO（输入输出）状况。选择器和通道的关系，是监控和被监控的关系。  
一般来说，一个单线程处理一个选择器，一个选择器可以监控很多通道。通过选择器，一个单线程可以处理数百、数千、数万、甚至更多的通道。在极端情况下（数万个连接），只用一个线程就可以处理所有的通道，这样会大量地减少线程之间上下文切换的开销。  
通道和选择器之间的关系，通过 register（注册）的方式完成   
````java
Channel.register（Selector sel，int ops）
````
可供选择器监控的通道 IO 事件类型，包括以下四种：  
（1）可读：SelectionKey.OP_READ  
（2）可写：SelectionKey.OP_WRITE  
（3）连接：SelectionKey.OP_CONNECT  
（4）接收：SelectionKey.OP_ACCEPT  
如果选择器要监控通道的多种事件，可以用“按位或”运算符来实现  
````java
//监控通道的多种事件，用“按位或”运算符来实现
int key = SelectionKey.OP_READ | SelectionKey.OP_WRITE ;
````
什么是 IO 事件呢？  
IO 事件不是对通道的 IO操作，而是通道的某个 IO 操作的一种就绪状态，表示通道具备完成某个 IO 操作的条件。  
#### SelectableChannel 可选择通道
并不是所有的通道，都是可以被选择器监控或选择的。比方说，FileChannel 文件通道就不能被选择器复用。判断一个通道能否被选择器监控或选择，有一个前提：判断它是否继承了抽象类SelectableChannel（可选择通道）。如果继承了 SelectableChannel，则可以被选择，否则不能。  
#### SelectionKey 选择键  
通道和选择器的监控关系注册成功后，就可以选择就绪事件。具体的选择工作，和调用选择器 Selector 的 select()方法来完成。通过 select 方法，选择器可以不断地选择通道中所发生操作的就绪状态，返回注册过的感兴趣的那些 IO 事件。换句话说，一旦在通道中发生了某些 IO 事件（就绪状态达成），并且是在选择器中注册过的 IO 事件，就会被选择器选中，并放入 SelectionKey 选择键的集合中。  
SelectionKey 选择键就是那些被选择器选中的 IO 事件  
#### 选择器使用流程
（1）获取选择器实例；  
````java
//调用静态工厂方法 open()来获取 Selector 实例
Selector selector = Selector.open()
````
Selector 选择器的类方法 open()的内部，是向选择器 SPI（SelectorProvider）发出请求，通过默认的 SelectorProvider（选择器提供者）对象，获取一个新的选择器实例。Java 中 SPI 全称为（Service 
Provider Interface，服务提供者接口），是 JDK 的一种可以扩展的服务提供和发现机制。Java 通过SPI 的方式，提供选择器的默认实现版本。也就是说，其他的服务提供商可以通过 SPI 的方式，提供定制化版本的选择器的动态替换或者扩展。  
（2）将通道注册到选择器中；  
````java
// 2.获取通道
ServerSocketChannelserverSocketChannel = ServerSocketChannel.open();
// 3.设置为非阻塞
serverSocketChannel.configureBlocking(false);
// 4.绑定连接
serverSocketChannel.bind(new 
InetSocketAddress(SystemConfig.SOCKET_SERVER_PORT));
// 5.将通道注册到选择器上,并制定监听事件为：“接收连接”事件
serverSocketChannel.register(selector，SelectionKey.OP_ACCEPT);
````
注 册 到 选 择 器 的 通 道 ， 必 须 处 于 非 阻 塞 模 式 下 ， 否 则 将 抛 出IllegalBlockingModeException 异常。这意味着，FileChannel 文件通道不能与选择器一起使用，因为FileChannel 文件通道只有阻塞模式，不能切换到非阻塞模式；而 Socket 套接字相关的所有通道都可以。  
一个通道，并不一定要支持所有的四种 IO 事件。例如服务器监听通道ServerSocketChannel，仅仅支持 Accept（接收到新连接）IO 事件；而SocketChannel 传输通道，则不支持 Accept（接收到新连接）IO 事件。如何判断通道支持哪些事件呢？可以在注册之前，可以通过通道的 validOps()方法，来获取该通道所有支持的 IO 事件集合。  

（3）轮询感兴趣的 IO 就绪事件（选择键集合）。    
通过 Selector 选择器的 select()方法，选出已经注册的、已经就绪的 IO 事件，保存到 SelectionKey选择键集合中。SelectionKey 集合保存在选择器实例内部，是一个元素为 SelectionKey 类型的集合（Set）。调用选择器的 selectedKeys()方法，可以取得选择键集合  
````java
//轮询，选择感兴趣的 IO 就绪事件（选择键集合）
while (selector.select() 0) {
Set selectedKeys = selector.selectedKeys();
Iterator keyIterator = selectedKeys.iterator();
while(keyIterator.hasNext()) {
SelectionKey key = keyIterator.next();
//根据具体的 IO 事件类型，执行对应的业务操作
if(key.isAcceptable()) {
// IO 事件：ServerSocketChannel 服务器监听通道有新连接
} else if (key.isConnectable()) {
// IO 事件：传输通道连接成功
} else if (key.isReadable()) {
// IO 事件：传输通道可读
} else if (key.isWritable()) {
// IO 事件：传输通道可写
}
//处理完成后，移除选择键 防止下一次循环的时候，被重复的处理
keyIterator.remove();
}
}
````
用于选择就绪的 IO 事件的 select()方法，有多个重载的实现版本，具体如下：  
（1）select()：阻塞调用，一直到至少有一个通道发生了注册的 IO 事件。  
（2）select(long timeout)：和 select()一样，但最长阻塞时间为   timeout 指定的毫秒数。
（3）selectNow()：非阻塞，不管有没有 IO 事件，都会立刻返回。  
select()方法返回的整数值（int 整数类型），表示发生了 IO 事件的通道数量。更准确地说，是从上一次 select 到这一次 select 之间，有多少通道发生了 IO 事件。  
强调一下，select()方法返回的数量，指的是通道数，而不是 IO 事件数，准确地说，是指发生了选择器感兴趣的 IO 事件的通道数。  

TODO  
使用 SocketChannel 在服务器端接收文件的实践案例  
使用 NIO 实现 Discard 服务器的实践案例  

### Reactor 反应器模式
反应器模式是高性能网络编程的必知、必会的模式,反应器模式相当于高性能、高并发的一项非常重要的基础知识，只有掌握了它，才能真正掌握 Nginx、Redis、Netty 等这些大名鼎鼎的中间件技术  
#### 简介
反应器模式由 Reactor 反应器线程、Handlers 处理器两大角色组成：  
（1）Reactor 反应器线程的职责：负责响应 IO 事件，并且分发到Handlers 处理器。  
（2）Handlers 处理器的职责：非阻塞的执行业务处理逻辑。  
#### 多线程 OIO 的致命缺陷  
在 Java 的 OIO 编程中，最初和最原始的网络服务器程序，是用一个 while 循环，不断地监听端口是否有新的连接.这种方法的最大问题是：如果前一个网络连接的 handle（socket）没有处理完，那么后面的连接请求没法被接收，于是后面的请求通通会被阻塞住，服务器的吞吐量就太低了。对于服务器来说，这是一个严重的问题.  
为了解决这个严重的连接阻塞问题，出现了一个极为经典模式：Connection Per Thread（一个线程处理一个连接）模式。  
对于每一个新的网络连接都分配给一个线程。每个线程都独自处理自己负责的输入和输出。当然，服务器的监听线程也是独立的，任何的 socket 连接的输入和输出处理，不会阻塞到后面新socket 连接的监听和建立。早期版本的 Tomcat 服务器，就是这样实现的。  
Connection Per Thread 模式（一个线程处理一个连接）的优点是：解决了前面的新连接被严重阻塞的问题，在一定程度上，极大地提高了服务器的吞吐量。  
这里有个问题：如果一个线程同时负责处理多个 socket 连接的输入和输入，行不行呢？  
看上去，没有什么不可以。但是，实际上没有用。为什么？传统 OIO 编程中每一个 socket 的IO 读写操作，都是阻塞的。在同一时刻，一个线程里只能处理一个 socket，前一个 socket 被阻塞了，后面连接的 IO 操作是无法被并发执行的。所以，不论怎么处理，OIO 中一个线程也只能是处理一个连接的 IO 操作。  
Connection Per Thread 模式的缺点是：对应于大量的连接，需要耗费大量的线程资源，对线程资源要求太高。在系统中，线程是比较昂贵的系统资源。如果线程数太多，系统无法承受。而且，线程的反复创建、销毁、线程的切换也需要代价。因此，在高并发的应用场景下，多线程 OIO 的缺陷是致命的。  

#### 单线程 Reactor 反应器模式
总体来说，Reactor 反应器模式有点儿类似事件驱动模式。
在事件驱动模式中，当有事件触发时，事件源会将事件 dispatch 分发到handler 处理器进行事件处理。反应器模式中的反应器角色，类似于事件驱动模式中的 dispatcher 事件分发器角色。  
前面已经提到，在反应器模式中，有 Reactor 反应器和 Handler 处理器两个重要的组件：   
（1）Reactor 反应器：负责查询 IO 事件，当检测到一个 IO 事件，将其发送给相应的 Handler处理器去处理。这里的 IO 事件，就是 NIO 中选择器监控的通道 IO 事件。  
（2）Handler 处理器：与 IO 事件（或者选择键）绑定，负责 IO 事件的处理。完成真正的连接建立、通道的读取、处理业务逻辑、负责将结果写出到通道等。  
![alt 单线程 Reactor 反应器模式](../../_media/netty/3.png) 
基于 Java NIO，如何实现简单的单线程版本的反应器模式呢？需要用到SelectionKey 选择键的几个重要的成员方法：  
方法一：void attach(Object o)
此方法可以将任何的 Java POJO 对象，作为附件添加到 SelectionKey 实例，相当于附件属性的setter 方法。这方法非常重要，因为在单线程版本的反应器模式中，需要将 Handler 处理器实例作为附件添加到 SelectionKey 实例。  
方法二：Object attachment()  
此方法的作用是取出之前通过 attach(Object o)添加到 SelectionKey 选择键实例的附件，相当于附件属性的 getter 方法，与 attach(Object o)配套使用。  
这个方法同样非常重要，当 IO 事件发生，选择键被 select 方法选到，可以直接将事件的附件取出，也就是之前绑定的 Handler 处理器实例，通过该Handler，完成相应的处理。  
总之，在反应器模式中，需要进行 attach 和 attachment 结合使用：在选择键注册完成之后，调用 attach 方法，将 Handler 处理器绑定到选择键；当事件发生时，调用 attachment 方法，可以从选择键取出 Handler 处理器，将事件分发到 Handler 处理器中，完成业务处理。  
单线程 Reactor 反应器模式的缺点:  
在单线程反应器模式中，Reactor 反应器和 Handler 处理器，都执行在同一条线程上。这样，带来了一个问题：当其中某个 Handler 阻塞时，会导致其他所有的 Handler 都得不到执行。在这种场景下，如果被阻塞的 Handler 不仅仅负责输入和输出处理的业务，还包括负责连接监听的AcceptorHandler 处理器。这个是非常严重的问题.一旦 AcceptorHandler 处理器阻塞，会导致整个服务不能接收新的连接，使得服务器变得不可用。因为这个缺陷，因此单线程反应器模型用得比较少。  


TODO 单线程 Reactor 反应器的参考代码
```` java
package com.crazymakercircle.ReactorModel;
//...
class Reactor implements Runnable {
Selector selector;
ServerSocketChannelserverSocket;
 EchoServerReactor() throws IOException {
 //....省略：打开选择器、serverSocket 连接监听通道
 //注册 serverSocket 的 accept 事件
 SelectionKeysk =
serverSocket.register(selector, SelectionKey.OP_ACCEPT);
 //将新连接处理器作为附件，绑定到 sk 选择键
 sk.attach(new AcceptorHandler());
 }
 public void run() {
 //选择器轮询
 try {
 while (!Thread.interrupted()) {
 selector.select();
 Set selected = selector.selectedKeys();
 Iterator it = selected.iterator();
 while (it.hasNext()) {
//反应器负责 dispatch 收到的事件
 SelectionKeysk=it.next();
dispatch(sk);
 }
selected.clear();
 }
 } catch (IOException ex) { ex.printStackTrace(); }
 }
 //反应器的分发方法
 void dispatch(SelectionKey k) {
 Runnable handler = (Runnable) (k.attachment());
 //调用之前绑定到选择键的 handler 处理器对象
 if (handler != null) {
     handler.run();
 }
 }
 // 新连接处理器
 class AcceptorHandler implements Runnable {
 public void run() {
//接受新连接
 //需要为新连接，创建一个输入输出的 handler 处理器
 }
 }
 //….
}
````
TODO 一个 Reactor 反应器版本的 EchoServer 实践案例

#### 多线程的 Reactor 反应器模式
多线程池 Reactor 反应器的演进，分为两个方面：  
（1）首先是升级 Handler 处理器。既要使用多线程，又要尽可能的高效率，则可以考虑使用线程池。  
（2）其次是升级 Reactor 反应器。可以考虑引入多个 Selector 选择器，提升选择大量通道的
能力。  
总体来说，多线程池反应器的模式，大致如下：  
（1）将负责输入输出处理的 IOHandler 处理器的执行，放入独立的线程池中。这样，业务处
理线程与负责服务监听和 IO 事件查询的反应器线程相隔离，避免服务器的连接监听受到阻塞。  
（2）如果服务器为多核的 CPU，可以将反应器线程拆分为多个子反应器（SubReactor）线程；
同时，引入多个选择器，每一个 SubReactor 子线程负责一个选择器。这样，充分释放了系统资源
的能力；也提高了反应器管理大量连接，提升选择大量通道的能力。  

TODO 多线程 Reactor 反应器的实践案例  
多线程 Handler 处理器的实践案例  

#### Reactor 反应器模式小结
1. 反应器模式和生产者消费者模式对比  
二者相似之处：在一定程度上，反应器模式有点类似生产者消费者模式。在生产者消费者模式中，一个或多个生产者将事件加入到一个队列中，一个或多个消费者主动地从这个队列中提取（Pull）事件来处理。  
二者不同之处：反应器模式是基于查询的，没有专门的队列去缓冲存储 IO 事件，查询到 IO事件之后，反应器会根据不同 IO 选择键（事件）将其分发给对应的 Handler 处理器来处理。  
2. 反应器模式和观察者模式（Observer Pattern）对比  
相似之处在于：在反应器模式中，当查询到 IO 事件后，服务处理程序使用单路/多路分发（Dispatch）策略，同步地分发这些 IO 事件。观察者模式（Observer Pattern）也被称作发布/订阅模式，它定义了一种依赖关系，让多个观察者同时监听某一个主题（Topic）。这个主题对象在状态发生变化时，会通知所有观察者，它们能够执行相应的处理。  
不同之处在于：在反应器模式中， Handler 处理器实例和 IO 事件（选择键）的订阅关系，基本上是一个事件绑定到一个 Handler 处理器；每一个 IO 事件（选择键）被查询后，反应器会将事件分发给所绑定的 Handler 处理器；而在观察者模式中，同一个时刻，同一个主题可以被订阅过的多个观察者处理。

总结一下反应器模式的优点和缺点。作为高性能的 IO 模式，反应器模式的优点如下： 

⚫ 响应快，虽然同一反应器线程本身是同步的，但不会被单个连接的同步 IO 所阻塞；  
⚫ 编程相对简单，最大程度避免了复杂的多线程同步，也避免了多线程的各个进程之间切换的开销；  
⚫ 可扩展，可以方便地通过增加反应器线程的个数来充分利用 CPU 资源。  

反应器模式的缺点如下：  

⚫ 反应器模式增加了一定的复杂性，因而有一定的门槛，并且不易于调试。  
⚫ 反应器模式需要操作系统底层的 IO 多路复用的支持，如 Linux 中的 epoll。如果操作系统的底层不支持 IO 多路复用，反应器模式不会有那么高效。  
⚫ 同一个 Handler 业务线程中，如果出现一个长时间的数据读写，会影响这个反应器中其他通道的 IO 处理。例如在大文件传输时，IO 操作就会影响其他客户端（Client）的响应时间。因而对于这种操作，还需要进一步对反应器模式进行改进  

### 并发基础中的 Future 异步回调模式
随着业务模块系统越来越多，各个系统的业务架构变得越来越错综复杂，特别是这几年微服务架构的兴起，跨设备跨服务的接口调用越来越频繁。打个简单的比方：现在的一个业务流程，可能需要调用 N 次第三方接口，获取 N 种上游数据。因此，面临一个大的问题是：如何高效率地异步去调取这些接口，然后同步去处理这些接口的返回结果呢？这里涉及线程的异步回调问题，这也是高并发的一个基础问题。  

#### 从泡茶的案例说起  
为了异步执行整个泡茶流程，分别设计三条线程：主线程、清洗线程、烧水线程。  
（1）主线程（MainThread）的工作是：启动清洗线程、启动烧水线程，等清洗、烧水的工作完成后，泡茶喝。  
（2）清洗线程（WashThread）的工作是：洗茶壶、洗茶杯。  
（3）烧水线程（HotWarterThread）的工作是：洗好水壶，灌上凉水，放在火上，一直等水烧  

join 异步阻塞  
在 Java 中，线程（Thread）的合并流程是：假设线程 A 调用了线程 B 的 B.join 方法，合并 B线程。那么，线程 A 进入阻塞状态，直到 B 线程执行完成。  
![alt 使用 join 实现泡茶实例的流程](../../_media/netty/4.png)  

TODO  使用 join 实现异步泡茶喝的实践案例  

join 有一个问题：被合并的线程没有返回值。例如，在烧水的实例中，如果烧水线程的执行结束，main 线程是无法知道结果的。同样，清洗线程的执行结果，main 线程也是无法知道的。形象地说，join 线程合并就是一像一个闷葫芦。只能发起合并线程，不能取到执行结果。如果需要获得异步线程的执行结果，怎么办呢？可以使用 Java 的 FutureTask 系列类。  

#### FutureTask 异步回调之重武器
FutureTask 方式包含了一系列的 Java 相关的类，在 java.util.concurrent 包中。其中最为重要的是 FutureTask 类和 Callable 接口。  

Callable 接口与 Runnable 接口相比，还有一个很大的不同：Callable 接口的实例不能作为 Thread线程实例的 target 来使用；而 Runnable 接口实例可以作为 Thread 线程实例的target 构造参数，开启一个 Thread 线程。  
问题来了，Java 中的线程类型，只有一个 Thread 类，没有其他的类型。如果 Callable 实例需
要异步执行，就要想办法赋值给 Thread 的 target 成员，一个 Runnable 类型的成员。为此，Java 提供了在 Callable 实例和 Thread 的 target 成员之间一个搭桥的类——FutureTask 类。  

FutureTask 类的构造函数的参数为 Callable 类型，实际上是对Callable 类型的二次封装，可以执行 Callable 的 call 方法。FutureTask 类间接地继承了 Runnable 接口，从而可以作为 Thread 实例的 target 执行目标。  

FutureTask 类就像一座搭在 Callable 实例与 Thread 线程实例之间的桥。FutureTask 类的内部封装一个 Callable 实例，然后自身又作为 Thread 线程的 target。  
在外部，如何要获取 Callable 实例的异步执行结果，不是调用其 call 方法，而是需要通过
FutureTask 类的相应方法去获取。 
总体来说，FutureTask 类首先是一个搭桥类的角色，FutureTask 类能当作 Thread 线程去执行
目标 target，被异步执行；其次，如果要获取异步执行的结果，需要通过 FutureTask 类的方法去获取，在 FutureTask 类的内部，会将 Callable 的 call 方法的真正结果保存起来，以供外部获取  
在 Java 语言中，将 FutureTask 类的一系列操作，抽象出来作为一个重要的接口——Future 接
口。当然，FutureTask 类也实现了此接口。  

Future 接口  
Future 接口不复杂，主要是对并发任务的执行及获取其结果的一些操作。主要提供了 3 大功能：  
（1）判断并发任务是否执行完成。  booleanisDone()  
（2）获取并发的任务完成后的结果。  booleanisCancelled()  
（3）取消并发执行中的任务。  boolean cancel(booleanmayInterruptRunning)  

FutureTask 和 Callable 都是泛型类，泛型参数表示返回结果的类型。所以，在使用的时候，它
们两个实例的泛型参数一定需要保持一致的。  

总之，FutureTask 类的实现比 join 线程合并操作更加高明，能取得异步线程的结果。但是，也
就未必高明到哪里去了。为啥呢？  
因为通过 FutureTask 类的 get 方法，获取异步结果时，主线程也会被阻塞的。这一点，FutureTask和 join 也是一样的，它们俩都是异步阻塞模式。  

异步阻塞的效率往往是比较低的，被阻塞的主线程不能干任何事情，唯一能干的，就是在傻傻地等待。原生 Java API，除了阻塞模式的获取结果外，并没有实现非阻塞的异步结果获取方法。如果需要用到获取异步的结果，则需要引入一些额外的框架，这里首先介绍谷歌公司的 Guava 框架。  

TODO 使用 Guava 实现泡茶喝的实践案例

#### Netty 的异步回调模式  
Netty 和 Guava 一样，实现了自己的异步回调体系：Netty 继承和扩展了 JDK Future 系列异步
回调的 API，定义了自身的 Future 系列接口和类，实现了异步任务的监控、异步执行结果的获取。
总体来说，Netty 对 JavaFuture 异步任务的扩展如下：  
（1）继承 Java 的 Future 接口，得到了一个新的属于 Netty 自己的 Future 异步任务接口；该接口对原有的接口进行了增强，使得 Netty 异步任务能够以非阻塞的方式处理回调的结果；注意，Netty没有修改 Future 的名称，只是调整了所在的包名，Netty 的 Future 类的包名和 Java 的 Future 接口的包名不同。  
（2）引入了一个新接口——GenericFutureListener，用于表示异步执行完成的监听器。这个接口和 Guava 的 FutureCallbak 回调接口不同。Netty 使用了监听器的模式，异步任务的执行完成后的回调逻辑抽象成了 Listener 监听器接口。可以将 Netty 的 GenericFutureListener 监听器接口加入 Netty异步任务 Future 中，实现对异步任务执行状态的事件监听。  
总体上说，在异步非阻塞回调的设计思路上，Netty 和 Guava 的思路是一致的。对应关系为：  
⚫ Netty 的 Future 接口，可以对应到 Guava 的 ListenableFuture 接口。  
⚫ Netty 的 GenericFutureListener 接口，可以对应到 Guava 的 FutureCallback 接口。  

### Netty 原理与基础













































=======
## 同步和阻塞

- 同步和异步的区别：数据拷贝阶段是否需要完全由操作系统处理。
- 阻塞和非阻塞操作：是针对发起 IO 请求操作后，是否有立刻返回一个标志信息而不让请求线程等待。

## BIO、NIO 有什么区别？

- 线程模型不同
- BIO：一个连接一个线程，客户端有连接请求时服务器端就需要启动一个线程进行处理。所以，线程开销大。可改良为用线程池的方式代替新创建线程，被称为伪异步 IO 。
  - NIO：一个请求一个线程，但客户端发送的连接请求都会注册到多路复用器上，多路复用器轮询到连接有新的 I/O 请求时，才启动一个线程进行处理。可改良为一个线程处理多个请求，基于 [多 Reactor 模型](http://svip.iocoder.cn/Netty/EventLoop-1-Reactor-Model/)。
- BIO 是面向流( Stream )的，而 NIO 是面向缓冲区( Buffer )的。
- BIO 的各种操作是阻塞的，而 NIO 的各种操作是非阻塞的。
- BIO 的 Socket 是单向的，而 NIO 的 Channel 是双向的。

## 什么是 Netty ？

Netty 是一款提供异步的、事件驱动的网络应用程序框架和工具，用以快速开发高性能、高可靠性的网络服务器和客户端程序。

也就是说，Netty 是一个基于 NIO 的客户、服务器端编程框架。使用 Netty 可以确保你快速和简单地开发出一个网络应用，例如实现了某种协议的客户，服务端应用。Netty 相当简化和流线化了网络应用的编程开发过程，例如，TCP 和 UDP 的 socket 服务开发。

1. Netty 是一个 **基于 NIO** 的 client-server(客户端服务器)框架，使用它可以快速简单地开发网络应用程序。
2. 它极大地简化并优化了 TCP 和 UDP 套接字服务器等网络编程,并且性能以及安全性等很多方面甚至都要更好。
3. **支持多种协议** 如 FTP，SMTP，HTTP 以及各种二进制和基于文本的传统协议。

为什么要用 Netty ？

- **使用简单**：API 使用简单，开发门槛低。
- **功能强大**：预置了多种编解码功能，支持多种主流协议。
- **定制能力强**：可以通过 ChannelHandler 对通信框架进行灵活的扩展。
- **性能高**：通过与其它业界主流的 NIO 框架对比，Netty 的综合性能最优。
- **成熟稳定**：Netty 修复了已经发现的所有 JDK NIO BUG，业务开发人员不需要再为 NIO 的 BUG 而烦恼。
- **社区活跃**：版本迭代周期短，发现的BUG可以被及时修复，同时，更多的新功能会被加入。
- **案例丰富**：经历了大规模的商业应用考验，质量已经得到验证。在互联网、大数据、网络游戏、企业应用、电信软件等众多行业得到成功商用，证明了它可以完全满足不同行业的商业应用。

## Netty 应用场景了解么？

Netty 主要用来做**网络通信** :

1. **作为 RPC 框架的网络通信工具** ：我们在分布式系统中，不同服务节点之间经常需要相互调用，这个时候就需要 RPC 框架了。不同服务节点之间的通信是如何做的呢？可以使用 Netty 来做。比如我调用另外一个节点的方法的话，至少是要让对方知道我调用的是哪个类中的哪个方法以及相关参数吧！
2. **实现一个自己的 HTTP 服务器** ：通过 Netty 我们可以自己实现一个简单的 HTTP 服务器，这个大家应该不陌生。说到 HTTP 服务器的话，作为 Java 后端开发，我们一般使用 Tomcat 比较多。一个最基本的 HTTP 服务器可要以处理常见的 HTTP Method 的请求，比如 POST 请求、GET 请求等等。
3. **实现一个即时通讯系统** ：使用 Netty 我们可以实现一个可以聊天类似微信的即时通讯系统，这方面的开源项目还蛮多的，可以自行去 Github 找一找。
4. **实现消息推送系统** ：市面上有很多消息推送系统都是基于 Netty 来做的。
5. ......

### Netty 核心组件有哪些？分别有什么作用？

👨‍💻**面试官** ：Netty 核心组件有哪些？分别有什么作用？

🙋 **我** ：表面上，嘴上开始说起 Netty 的核心组件有哪些，实则，内心已经开始 mmp 了，深度怀疑这面试官是存心搞我啊！

## 说说 Netty 如何实现高性能？

1. **线程模型** ：更加优雅的 Reactor 模式实现、灵活的线程模型、利用 EventLoop 等创新性的机制，可以非常高效地管理成百上千的 Channel 。
2. **内存池设计** ：使用池化的 Direct Buffer 等技术，在提高 IO 性能的同时，减少了对象的创建和销毁。并且，内部实现是用一颗二叉查找树，更好的管理内存分配情况 , TCP 接收和发送缓冲区采用直接内存代替堆内存，避免了内存复制，提升了 I/O 读取和写入性能。
3. **内存零拷贝** ：使用 Direct Buffer ，可以使用 Zero-Copy 机制。Zero-Copy ，在操作数据时，不需要将数据 Buffer 从一个内存区域拷贝到另一个内存区域。因为少了一次内存的拷贝，因此 CPU 的效率就得到的提升。
4. **参数配置** ：可配置的 I/O 线程数目和 TCP 参数等，为不同用户提供定制化的调优参数，满足不同的性能场景。
5. **队列优化** ：采用环形数组缓冲区，实现无锁化并发编程，代替传统的线程安全容器或锁。
6. **并发能力** ：合理使用线程安全容器、原子类等，提升系统的并发能力。
7. **降低锁竞争** ：关键资源的使用采用单线程串行化的方式，避免多线程并发访问带来的锁竞争和额外的 CPU 资源消耗问题。
8. **内存泄露检测** ：通过引用计数器及时地释放不再被引用的对象，细粒度的内存管理降低了 GC 的频率，减少频繁 GC 带来的时延增大和 CPU 损耗。

## Netty 的高可靠如何体现？

1. 链路有效性检测：由于长连接不需要每次发送消息都创建链路，也不需要在消息完成交互时关闭链路，因此相对于短连接性能更高。为了保证长连接的链路有效性，往往需要通过心跳机制周期性地进行链路检测。使用心跳机制的原因是，避免在系统空闲时因网络闪断而断开连接，之后又遇到海量业务冲击导致消息积压无法处理。为了解决这个问题，需要周期性地对链路进行有效性检测，一旦发现问题，可以及时关闭链路，重建 TCP 连接。为了支持心跳，Netty 提供了两种链路空闲检测机制：
   - 读空闲超时机制：连续 T 周期没有消息可读时，发送心跳消息，进行链路检测。如果连续 N 个周期没有读取到心跳消息，可以主动关闭链路，重建连接。
 - 写空闲超时机制：连续 T 周期没有消息需要发送时，发送心跳消息，进行链路检测。如果连续 N 个周期没有读取对方发回的心跳消息，可以主动关闭链路，重建连接。
2. 内存保护机制：Netty 提供多种机制对内存进行保护，包括以下几个方面：
- 通过对象引用计数器对 ByteBuf 进行细粒度的内存申请和释放，对非法的对象引用进行检测和保护。
   - 可设置的内存容量上限，包括 ByteBuf、线程池线程数等，避免异常请求耗光内存。
3. **优雅停机**：优雅停机功能指的是当系统推出时，JVM 通过注册的 Shutdown Hook 拦截到退出信号量，然后执行推出操作，释放相关模块的资源占用，将缓冲区的消息处理完成或清空，将待刷新的数据持久化到磁盘和数据库中，等到资源回收和缓冲区消息处理完成之后，再退出。

## Netty 的可扩展如何体现？

可定制、易扩展。

- **责任链模式** ：ChannelPipeline 基于责任链模式开发，便于业务逻辑的拦截、定制和扩展。
- **基于接口的开发** ：关键的类库都提供了接口或抽象类，便于用户自定义实现。
- **提供大量的工厂类** ：通过重载这些工厂类，可以按需创建出用户需要的对象。
- **提供大量系统参数** ：供用户按需设置，增强系统的场景定制性。

## 简单介绍 Netty 的核心组件？

Netty 有如下六个核心组件：

### Channel

Channel是 Java NIO 的一个基本构造。可以看作是传入或传出数据的载体。因此，它可以被打开或关闭，连接或者断开连接。

`Channel` 接口是 Netty 对网络操作抽象类，它除了包括基本的 I/O 操作，如 `bind()`、`connect()`、`read()`、`write()` 等。

比较常用的`Channel`接口实现类是`NioServerSocketChannel`（服务端）和`NioSocketChannel`（客户端），这两个 `Channel` 可以和 BIO 编程模型中的`ServerSocket`以及`Socket`两个概念对应上。Netty 的 `Channel` 接口所提供的 API，大大地降低了直接使用 Socket 类的复杂性。

### EventLoop 与 EventLoopGroup

EventLoop 定义了Netty的核心抽象，用来处理连接的生命周期中所发生的事件，在内部，将会为每个Channel分配一个EventLoop。

EventLoopGroup 是一个 EventLoop 池，包含很多的 EventLoop。

Netty 为每个 Channel 分配了一个 EventLoop，用于处理用户连接请求、对用户请求的处理等所有事件。EventLoop 本身只是一个线程驱动，在其生命周期内只会绑定一个线程，让该线程处理一个 Channel 的所有 IO 事件。

一个 Channel 一旦与一个 EventLoop 相绑定，那么在 Channel 的整个生命周期内是不能改变的。一个 EventLoop 可以与多个 Channel 绑定。即 Channel 与 EventLoop 的关系是 n:1，而 EventLoop 与线程的关系是 1:1。

说白了，**`EventLoop` 的主要作用实际就是负责监听网络事件并调用事件处理器进行相关 I/O 操作的处理。**

**那 `Channel` 和 `EventLoop` 直接有啥联系呢？**

`Channel` 为 Netty 网络操作(读写等操作)抽象类，`EventLoop` 负责处理注册到其上的`Channel` 处理 I/O 操作，两者配合参与 I/O 操作。

**EventloopGroup 了解么?和 EventLoop 啥关系?**

![图片](https://mmbiz.qpic.cn/mmbiz_png/iaIdQfEric9TyHkpkttoicqYcbytibtU38aaqML3uQghC5WA6X8PNZ9h9YiaQDZpwREFEMIaqHkeUERAibAW9d0hmJ5g/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

`EventLoopGroup` 包含多个 `EventLoop`（每一个 `EventLoop` 通常内部包含一个线程），上面我们已经说了 `EventLoop` 的主要作用实际就是负责监听网络事件并调用事件处理器进行相关 I/O 操作的处理。

并且 `EventLoop` 处理的 I/O 事件都将在它专有的 `Thread` 上被处理，即 `Thread` 和 `EventLoop` 属于 1 : 1 的关系，从而保证线程安全。

上图是一个服务端对 `EventLoopGroup` 使用的大致模块图，其中 `Boss EventloopGroup` 用于接收连接，`Worker EventloopGroup` 用于具体的处理（消息的读写以及其他逻辑处理）。

从上图可以看出：当客户端通过 `connect` 方法连接服务端时，`bossGroup` 处理客户端连接请求。当客户端处理完成后，会将这个连接提交给 `workerGroup` 来处理，然后 `workerGroup` 负责处理其 IO 相关操作。

### ServerBootstrap 与 Bootstrap

Bootstarp 和 ServerBootstrap 被称为引导类，指对应用程序进行配置，并使他运行起来的过程。Netty处理引导的方式是使你的应用程序和网络层相隔离。

Bootstrap 是客户端的引导类，Bootstrap 在调用 bind()（连接UDP）和 connect()（连接TCP）方法时，会新创建一个 Channel，仅创建一个单独的、没有父 Channel 的 Channel 来实现所有的网络交换。

ServerBootstrap 是服务端的引导类，ServerBootstarp 在调用 bind() 方法时会创建一个 ServerChannel 来接受来自客户端的连接，并且该 ServerChannel 管理了多个子 Channel 用于同客户端之间的通信。

1. `Bootstrap` 通常使用 `connet()` 方法连接到远程的主机和端口，作为一个 Netty TCP 协议通信中的客户端。另外，`Bootstrap` 也可以通过 `bind()` 方法绑定本地的一个端口，作为 UDP 协议通信中的一端。
2. `ServerBootstrap`通常使用 `bind()` 方法绑定本地的端口上，然后等待客户端的连接。
3. `Bootstrap` 只需要配置一个线程组— `EventLoopGroup` ,而 `ServerBootstrap`需要配置两个线程组— `EventLoopGroup` ，一个用于接收连接，一个用于具体的处理。

### ChannelHandler 与 ChannelPipeline

ChannelHandler 是对 Channel 中数据的处理器，这些处理器可以是系统本身定义好的编解码器，也可以是用户自定义的。这些处理器会被统一添加到一个 ChannelPipeline 的对象中，然后按照添加的顺序对 Channel 中的数据进行依次处理。

下面这段代码使用过 Netty 的小伙伴应该不会陌生，我们指定了序列化编解码器以及自定义的 `ChannelHandler` 处理消息。

```java
       b.group(eventLoopGroup)
              .handler(new ChannelInitializer<SocketChannel() {
                   @Override
                  protected void initChannel(SocketChannel ch) {
                       ch.pipeline().addLast(new NettyKryoDecoder(kryoSerializer, RpcResponse.class));
                      ch.pipeline().addLast(new NettyKryoEncoder(kryoSerializer, RpcRequest.class));
                       ch.pipeline().addLast(new KryoClientHandler());
                   }
                });
```

`ChannelHandler` 是消息的具体处理器。他负责处理读写操作、客户端连接等事情。

`ChannelPipeline` 为 `ChannelHandler` 的链，提供了一个容器并定义了用于沿着链传播入站和出站事件流的 API 。当 `Channel` 被创建时，它会被自动地分配到它专属的 `ChannelPipeline`。

我们可以在 `ChannelPipeline` 上通过 `addLast()` 方法添加一个或者多个`ChannelHandler` ，因为一个数据或者事件可能会被多个 Handler 处理。当一个 `ChannelHandler` 处理完之后就将数据交给下一个 `ChannelHandler` 。

### ChannelFuture

Netty 中所有的 I/O 操作都是异步的，即操作不会立即得到返回结果，所以 Netty 中定义了一个 ChannelFuture 对象作为这个异步操作的“代言人”，表示异步操作本身。如果想获取到该异步操作的返回值，可以通过该异步操作对象的addListener() 方法为该异步操作添加监 NIO 网络编程框架 Netty 听器，为其注册回调：当结果出来后马上调用执行。

Netty 的异步编程模型都是建立在 Future 与回调概念之上的。

## Netty 服务端和客户端的启动过程了解么？

### 服务端

```
       // 1.bossGroup 用于接收连接，workerGroup 用于具体的处理
      EventLoopGroup bossGroup = new NioEventLoopGroup(1);
       EventLoopGroup workerGroup = new NioEventLoopGroup();
      try {
           //2.创建服务端启动引导/辅助类：ServerBootstrap
          ServerBootstrap b = new ServerBootstrap();
           //3.给引导类配置两大线程组,确定了线程模型
           b.group(bossGroup, workerGroup)
                   // (非必备)打印日志
                   .handler(new LoggingHandler(LogLevel.INFO))
                   // 4.指定 IO 模型
                   .channel(NioServerSocketChannel.class)
                    .childHandler(new ChannelInitializer<SocketChannel() {
                       @Override
                        public void initChannel(SocketChannel ch) {
                            ChannelPipeline p = ch.pipeline();
                            //5.可以自定义客户端消息的业务处理逻辑
                            p.addLast(new HelloServerHandler());
                        }
                    });
            // 6.绑定端口,调用 sync 方法阻塞知道绑定完成
            ChannelFuture f = b.bind(port).sync();
            // 7.阻塞等待直到服务器Channel关闭(closeFuture()方法获取Channel 的CloseFuture对象,然后调用sync()方法)
            f.channel().closeFuture().sync();
        } finally {
           //8.优雅关闭相关线程组资源
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
```

简单解析一下服务端的创建过程具体是怎样的：

1.首先你创建了两个 `NioEventLoopGroup` 对象实例：`bossGroup` 和 `workerGroup`。

- `bossGroup` : 用于处理客户端的 TCP 连接请求。
- `workerGroup` ：负责每一条连接的具体读写数据的处理逻辑，真正负责 I/O 读写操作，交由对应的 Handler 处理。

举个例子：我们把公司的老板当做 bossGroup，员工当做 workerGroup，bossGroup 在外面接完活之后，扔给 workerGroup 去处理。一般情况下我们会指定 bossGroup 的 线程数为 1（并发连接量不大的时候） ，workGroup 的线程数量为 **CPU 核心数 \*2** 。另外，根据源码来看，使用 `NioEventLoopGroup` 类的无参构造函数设置线程数量的默认值就是 **CPU 核心数 \*2** 。

2.接下来 我们创建了一个服务端启动引导/辅助类：`ServerBootstrap`，这个类将引导我们进行服务端的启动工作。

3.通过 `.group()` 方法给引导类 `ServerBootstrap` 配置两大线程组，确定了线程模型。

通过下面的代码，我们实际配置的是多线程模型，这个在上面提到过。

```
    EventLoopGroup bossGroup = new NioEventLoopGroup(1);
  EventLoopGroup workerGroup = new NioEventLoopGroup();
```

4.通过`channel()`方法给引导类 `ServerBootstrap`指定了 IO 模型为`NIO`

- `NioServerSocketChannel` ：指定服务端的 IO 模型为 NIO，与 BIO 编程模型中的`ServerSocket`对应

- `NioSocketChannel` : 指定客户端的 IO 模型为 NIO， 与 BIO 编程模型中的`Socket`对应

5.通过 `.childHandler()`给引导类创建一个`ChannelInitializer` ，然后指定了服务端消息的业务处理逻辑 `HelloServerHandler` 对象

 6.调用 `ServerBootstrap` 类的 `bind()`方法绑定端口

### 客户端

```
        //1.创建一个 NioEventLoopGroup 对象实例
       EventLoopGroup group = new NioEventLoopGroup();
        try {
           //2.创建客户端启动引导/辅助类：Bootstrap
            Bootstrap b = new Bootstrap();
           //3.指定线程组
            b.group(group)
                    //4.指定 IO 模型
                   .channel(NioSocketChannel.class)
                    .handler(new ChannelInitializer<SocketChannel() {
                       @Override
                        public void initChannel(SocketChannel ch) throws Exception {
                            ChannelPipeline p = ch.pipeline();
                            // 5.这里可以自定义消息的业务处理逻辑
                            p.addLast(new HelloClientHandler(message));
                        }
                    });
            // 6.尝试建立连接
            ChannelFuture f = b.connect(host, port).sync();
            // 7.等待连接关闭（阻塞，直到Channel关闭）
            f.channel().closeFuture().sync();
        } finally {
            group.shutdownGracefully();
        }
```

继续分析一下客户端的创建流程：

1.创建一个 `NioEventLoopGroup` 对象实例

2.创建客户端启动的引导类是 `Bootstrap`

3.通过 `.group()` 方法给引导类 `Bootstrap` 配置一个线程组

4.通过`channel()`方法给引导类 `Bootstrap`指定了 IO 模型为`NIO`

5.通过 `.childHandler()`给引导类创建一个`ChannelInitializer` ，然后指定了客户端消息的业务处理逻辑 `HelloClientHandler` 对象

6.调用 `Bootstrap` 类的 `connect()`方法进行连接，这个方法需要指定两个参数：

- `inetHost` : ip 地址
- `inetPort` : 端口号

```
   public ChannelFuture connect(String inetHost, int inetPort) {
       return this.connect(InetSocketAddress.createUnresolved(inetHost, inetPort));
   }
   public ChannelFuture connect(SocketAddress remoteAddress) {
        ObjectUtil.checkNotNull(remoteAddress, "remoteAddress");
      this.validate();
        return this.doResolveAndConnect(remoteAddress, this.config.localAddress());
   }
```

`connect` 方法返回的是一个 `Future` 类型的对象

```
public interface ChannelFuture extends Future<Void{
  ......
}
```

也就是说这个方是异步的，我们通过 `addListener` 方法可以监听到连接是否成功，进而打印出连接信息。具体做法很简单，只需要对代码进行以下改动：

```
ChannelFuture f = b.connect(host, port).addListener(future -{
  if (future.isSuccess()) {
    System.out.println("连接成功!");
 } else {
    System.err.println("连接失败!");
 }
}).sync();
```

什么是 TCP 粘包/拆包?有什么解决办法呢？

👨‍💻**面试官** ：什么是 TCP 粘包/拆包?

🙋 **我** ：TCP 粘包/拆包 就是你基于 TCP 发送数据的时候，出现了多个字符串“粘”在了一起或者一个字符串被“拆”开的问题。比如你多次发送：“你好,你真帅啊！哥哥！”，但是客户端接收到的可能是下面这样的：

![图片](https://mmbiz.qpic.cn/mmbiz_png/iaIdQfEric9TyHkpkttoicqYcbytibtU38aatuef3OK7wajJLyGEgLiadnXic9hvje8uJaRAmbWCJgZ1iamWQIyavfGHg/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

👨‍💻**面试官** ：那有什么解决办法呢?

🙋 **我** ：

**1.使用 Netty 自带的解码器**

- **`LineBasedFrameDecoder`** : 发送端发送数据包的时候，每个数据包之间以换行符作为分隔，`LineBasedFrameDecoder` 的工作原理是它依次遍历 `ByteBuf` 中的可读字节，判断是否有换行符，然后进行相应的截取。
- **`DelimiterBasedFrameDecoder`** : 可以自定义分隔符解码器，**`LineBasedFrameDecoder`** 实际上是一种特殊的 `DelimiterBasedFrameDecoder` 解码器。
- **`FixedLengthFrameDecoder`**: 固定长度解码器，它能够按照指定的长度对消息进行相应的拆包。
- **`LengthFieldBasedFrameDecoder`**：

**2.自定义序列化编解码器**

在 Java 中自带的有实现 `Serializable` 接口来实现序列化，但由于它性能、安全性等原因一般情况下是不会被使用到的。

通常情况下，我们使用 Protostuff、Hessian2、json 序列方式比较多，另外还有一些序列化性能非常好的序列化方式也是很好的选择：

- 专门针对 Java 语言的：Kryo，FST 等等
- 跨语言的：Protostuff（基于 protobuf 发展而来），ProtoBuf，Thrift，Avro，MsgPack 等等

“

由于篇幅问题，这部分内容会在后续的文章中详细分析介绍~~~

## Netty 长连接、心跳机制了解么？

👨‍💻**面试官** ：TCP 长连接和短连接了解么？

🙋 **我** ：我们知道 TCP 在进行读写之前，server 与 client 之间必须提前建立一个连接。建立连接的过程，需要我们常说的三次握手，释放/关闭连接的话需要四次挥手。这个过程是比较消耗网络资源并且有时间延迟的。

所谓，短连接说的就是 server 端 与 client 端建立连接之后，读写完成之后就关闭掉连接，如果下一次再要互相发送消息，就要重新连接。短连接的有点很明显，就是管理和实现都比较简单，缺点也很明显，每一次的读写都要建立连接必然会带来大量网络资源的消耗，并且连接的建立也需要耗费时间。

长连接说的就是 client 向 server 双方建立连接之后，即使 client 与 server 完成一次读写，它们之间的连接并不会主动关闭，后续的读写操作会继续使用这个连接。长连接的可以省去较多的 TCP 建立和关闭的操作，降低对网络资源的依赖，节约时间。对于频繁请求资源的客户来说，非常适用长连接。

👨‍💻**面试官** ：为什么需要心跳机制？Netty 中心跳机制了解么？

🙋 **我** ：

在 TCP 保持长连接的过程中，可能会出现断网等网络异常出现，异常发生的时候， client 与 server 之间如果没有交互的话，它们是无法发现对方已经掉线的。为了解决这个问题, 我们就需要引入 **心跳机制** 。

心跳机制的工作原理是: 在 client 与 server 之间在一定时间内没有数据交互时, 即处于 idle 状态时, 客户端或服务器就会发送一个特殊的数据包给对方, 当接收方收到这个数据报文后, 也立即发送一个特殊的数据报文, 回应发送方, 此即一个 PING-PONG 交互。所以, 当某一端收到心跳消息后, 就知道了对方仍然在线, 这就确保 TCP 连接的有效性.

TCP 实际上自带的就有长连接选项，本身是也有心跳包机制，也就是 TCP 的选项：`SO_KEEPALIVE`。但是，TCP 协议层面的长连接灵活性不够。所以，一般情况下我们都是在应用层协议上实现自定义心跳机制的，也就是在 Netty 层面通过编码实现。通过 Netty 实现心跳机制的话，核心类是 `IdleStateHandler` 。

## Netty 的零拷贝了解么？

👨‍💻**面试官** ：讲讲 Netty 的零拷贝？

🙋 **我** ：

维基百科是这样介绍零拷贝的：

“

零复制（英语：Zero-copy；也译零拷贝）技术是指计算机执行操作时，CPU 不需要先将数据从某处内存复制到另一个特定区域。这种技术通常用于通过网络传输文件时节省 CPU 周期和内存带宽。

在 OS 层面上的 `Zero-copy` 通常指避免在 `用户态(User-space)` 与 `内核态(Kernel-space)` 之间来回拷贝数据。而在 Netty 层面 ，零拷贝主要体现在对于数据操作的优化。

Netty 中的零拷贝体现在以下几个方面：

1. 使用 Netty 提供的 `CompositeByteBuf` 类, 可以将多个`ByteBuf` 合并为一个逻辑上的 `ByteBuf`, 避免了各个 `ByteBuf` 之间的拷贝。
2. `ByteBuf` 支持 slice 操作, 因此可以将 ByteBuf 分解为多个共享同一个存储区域的 `ByteBuf`, 避免了内存的拷贝。
3. 通过 `FileRegion` 包装的`FileChannel.tranferTo` 实现文件传输, 可以直接将文件缓冲区的数据发送到目标 `Channel`, 避免了传统通过循环 write 方式导致的内存拷贝问题.

## NioEventLoopGroup 默认的构造函数会起多少线程？

👨‍💻**面试官** ：看过 Netty 的源码了么？`NioEventLoopGroup` 默认的构造函数会起多少线程呢？

🙋 **我** ：嗯嗯！看过部分。

回顾我们在上面写的服务器端的代码：

```java
// 1.bossGroup 用于接收连接，workerGroup 用于具体的处理
EventLoopGroup bossGroup = new NioEventLoopGroup(1);
EventLoopGroup workerGroup = new NioEventLoopGroup();
```

为了搞清楚`NioEventLoopGroup` 默认的构造函数 到底创建了多少个线程，我们来看一下它的源码。

```java
   /**
     * 无参构造函数。
    * nThreads:0
   */
   public NioEventLoopGroup() {
      //调用下一个构造方法
       this(0);
   }

   /**
     * Executor：null
    */
    public NioEventLoopGroup(int nThreads) {
       //继续调用下一个构造方法
        this(nThreads, (Executor) null);
   }

   //中间省略部分构造函数

   /**
     * RejectedExecutionHandler（）：RejectedExecutionHandlers.reject()
    */
    public NioEventLoopGroup(int nThreads, Executor executor, final SelectorProvider selectorProvider,final SelectStrategyFactory selectStrategyFactory) {
      //开始调用父类的构造函数
        super(nThreads, executor, selectorProvider, selectStrategyFactory, RejectedExecutionHandlers.reject());
   }
```

一直向下走下去的话，你会发现在 `MultithreadEventLoopGroup` 类中有相关的指定线程数的代码，如下：

```java
   // 从1，系统属性，CPU核心数*2 这三个值中取出一个最大的
    //可以得出 DEFAULT_EVENT_LOOP_THREADS 的值为CPU核心数*2
    private static final int DEFAULT_EVENT_LOOP_THREADS = Math.max(1, SystemPropertyUtil.getInt("io.netty.eventLoopThreads", NettyRuntime.availableProcessors() * 2));

   // 被调用的父类构造函数，NioEventLoopGroup 默认的构造函数会起多少线程的秘密所在
   // 当指定的线程数nThreads为0时，使用默认的线程数DEFAULT_EVENT_LOOP_THREADS
   protected MultithreadEventLoopGroup(int nThreads, ThreadFactory threadFactory, Object... args) {
        super(nThreads == 0 ? DEFAULT_EVENT_LOOP_THREADS : nThreads, threadFactory, args);
   }
```

综上，我们发现 `NioEventLoopGroup` 默认的构造函数实际会起的线程数为 **`CPU核心数\*2`**。

另外，如果你继续深入下去看构造函数的话，你会发现每个`NioEventLoopGroup`对象内部都会分配一组`NioEventLoop`，其大小是 `nThreads`, 这样就构成了一个线程池， 一个`NIOEventLoop` 和一个线程相对应，这和我们上面说的 `EventloopGroup` 和 `EventLoop`关系这部分内容相对应。

## 说说 Netty 的逻辑架构？

Netty 采用了典型的**三层网络架构**进行设计和开发

1. **Reactor 通信调度层**：由一系列辅助类组成，包括 Reactor 线程 NioEventLoop 及其父类，NioSocketChannel 和 NioServerSocketChannel 等等。该层的职责就是监听网络的读写和连接操作，负责将网络层的数据读到内存缓冲区，然后触发各自网络事件，例如连接创建、连接激活、读事件、写事件等。将这些事件触发到 pipeline 中，由 pipeline 管理的职责链来进行后续的处理。
2. **职责链 ChannelPipeline**：负责事件在职责链中的有序传播，以及负责动态地编排职责链。职责链可以选择监听和处理自己关心的事件，拦截处理和向后传播事件。
3. **业务逻辑编排层**：业务逻辑编排层通常有两类，一类是纯粹的业务逻辑编排，一类是应用层协议插件，用于特定协议相关的会话和链路管理。由于应用层协议栈往往是开发一次到处运行，并且变动较小，故而将应用协议到 POJO 的转变和上层业务放到不同的 ChannelHandler 中，就可以实现协议层和业务逻辑层的隔离，实现架构层面的分层隔离。

## Netty 执行流程

![图片](https://mmbiz.qpic.cn/mmbiz_jpg/uChmeeX1Fpx7bubp6WLdlCN7ERvRXSp9tVKk9w9aKE0IFPb0BeZSSmbnURKIlKicib7ovgibKXUJ59KnaeI0RSXsA/640?wx_fmt=jpeg&wxfrom=5&wx_lazy=1&wx_co=1)

## 什么是 Reactor 模型？

直接阅读 [《精尽 Netty 源码解析 —— EventLoop（一）之 Reactor 模型》](http://svip.iocoder.cn/Netty/EventLoop-1-Reactor-Model/) 一文。

认真仔细读，这是一个高频面试题。

无论是那种类型的 Reactor 模型，都需要在 Reactor 所在的线程中，进行读写操作。那么此时就会有一个问题，如果我们读取到数据，需要进行业务逻辑处理，并且这个业务逻辑需要对数据库、缓存等等进行操作，会有什么问题呢？假设这个数据库操作需要 5 ms ，那就意味着这个 Reactor 线程在这 5 ms 无法进行注册在这个 Reactor 的 Channel 进行读写操作。也就是说，多个 Channel 的所有读写操作都变成了串行。势必，这样的效率会非常非常非常的低。

🦅 **解决**

那么怎么解决呢？创建业务线程池，将读取到的数据，提交到业务线程池中进行处理。这样，Reactor 的 Channel 就不会被阻塞，而 Channel 的所有读写操作都变成了并行了。

🦅 **案例**

如果胖友熟悉 Dubbo 框架，就会发现 [《Dubbo 用户指南 —— 线程模型》](http://dubbo.apache.org/zh-cn/docs/user/demos/thread-model.html) 。😈 认真读下，可以跟面试官吹一吹啦。

## 请介绍 Netty 的线程模型？

还是阅读 [《精尽 Netty 源码解析 —— EventLoop（一）之 Reactor 模型》](http://svip.iocoder.cn/Netty/EventLoop-1-Reactor-Model/) 一文。

认真仔细读，这真的真的真的是一个高频面试题。

Reactor 模式基于事件驱动，采用多路复用将事件分发给相应的 Handler 处理，非常适合处理海量 IO 的场景。

在 Netty 主要靠 `NioEventLoopGroup` 线程池来实现具体的线程模型的 。

我们实现服务端的时候，一般会初始化两个线程组：

1. **`bossGroup`** :接收连接。
2. **`workerGroup`** ：负责具体的处理，交由对应的 Handler 处理。

下面我们来详细看一下 Netty 中的线程模型吧！

1.**单线程模型** ：

一个线程需要执行处理所有的 `accept`、`read`、`decode`、`process`、`encode`、`send` 事件。对于高负载、高并发，并且对性能要求比较高的场景不适用。

对应到 Netty 代码是下面这样的

“

使用 `NioEventLoopGroup` 类的无参构造函数设置线程数量的默认值就是 **CPU 核心数 \*2** 。

```
 //1.eventGroup既用于处理客户端连接，又负责具体的处理。
EventLoopGroup eventGroup = new NioEventLoopGroup(1);
 //2.创建服务端启动引导/辅助类：ServerBootstrap
  ServerBootstrap b = new ServerBootstrap();
          boobtstrap.group(eventGroup, eventGroup)
           //......
```

2.**多线程模型**

一个 Acceptor 线程只负责监听客户端的连接，一个 NIO 线程池负责具体处理：`accept`、`read`、`decode`、`process`、`encode`、`send` 事件。满足绝大部分应用场景，并发连接量不大的时候没啥问题，但是遇到并发连接大的时候就可能会出现问题，成为性能瓶颈。

对应到 Netty 代码是下面这样的：

```
// 1.bossGroup 用于接收连接，workerGroup 用于具体的处理
EventLoopGroup bossGroup = new NioEventLoopGroup(1);
EventLoopGroup workerGroup = new NioEventLoopGroup();
try {
  //2.创建服务端启动引导/辅助类：ServerBootstrap
ServerBootstrap b = new ServerBootstrap();
  //3.给引导类配置两大线程组,确定了线程模型
 b.group(bossGroup, workerGroup)
    //......
```

![图片](https://mmbiz.qpic.cn/mmbiz_png/iaIdQfEric9TyHkpkttoicqYcbytibtU38aaO6Auuhgj3XYgltLXDar0aZuBmvkiaAP9ucR6a8DHa57CGuLSaYUiaic4w/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

**3.主从多线程模型**

从一个 主线程 NIO 线程池中选择一个线程作为 Acceptor 线程，绑定监听端口，接收客户端连接的连接，其他线程负责后续的接入认证等工作。连接建立完成后，Sub NIO 线程池负责具体处理 I/O 读写。如果多线程模型无法满足你的需求的时候，可以考虑使用主从多线程模型 。

```
// 1.bossGroup 用于接收连接，workerGroup 用于具体的处理
EventLoopGroup bossGroup = new NioEventLoopGroup();
EventLoopGroup workerGroup = new NioEventLoopGroup();
try {
  //2.创建服务端启动引导/辅助类：ServerBootstrap
ServerBootstrap b = new ServerBootstrap();
  //3.给引导类配置两大线程组,确定了线程模型
 b.group(bossGroup, workerGroup)
    //......
```

![图片](https://mmbiz.qpic.cn/mmbiz_png/iaIdQfEric9TyHkpkttoicqYcbytibtU38aaLYFs3eXxsVc9iadeEz7eialgZltfyl9ziaVrc2N2GzTRCJIdnmc63ZcOA/640?wx_fmt=png&wxfrom=5&wx_lazy=1&wx_co=1)

## TCP 粘包 / 拆包的原因？应该这么解决？

🦅 **概念**

TCP 是以流的方式来处理数据，所以会导致粘包 / 拆包。

- 拆包：一个完整的包可能会被 TCP 拆分成多个包进行发送。
- 粘包：也可能把小的封装成一个大的数据包发送。

🦅 **原因**

- 应用程序写入的字节大小大于套接字发送缓冲区的大小，会发生**拆包**现象。而应用程序写入数据小于套接字缓冲区大小，网卡将应用多次写入的数据发送到网络上，这将会发生**粘包**现象。
- 待发送数据大于 MSS（最大报文长度），TCP 在传输前将进行**拆包**。
- 以太网帧的 payload（净荷）大于 MTU（默认为 1500 字节）进行 IP 分片**拆包**。
- 接收数据端的应用层没有及时读取接收缓冲区中的数据，将发生**粘包**。

🦅 **解决**

在 Netty 中，提供了多个 Decoder 解析类，如下：

- ① FixedLengthFrameDecoder ，基于**固定长度**消息进行粘包拆包处理的。
- ② LengthFieldBasedFrameDecoder ，基于**消息头指定消息长度**进行粘包拆包处理的。
- ③ LineBasedFrameDecoder ，基于**换行**来进行消息粘包拆包处理的。
- ④ DelimiterBasedFrameDecoder ，基于**指定消息边界方式**进行粘包拆包处理的。

实际上，上述四个 FrameDecoder 实现可以进行规整：

- ① 是 ② 的特例，**固定长度**是**消息头指定消息长度**的一种形式。
- ③ 是 ④ 的特例，**换行**是于**指定消息边界方式**的一种形式。

## 了解哪几种序列化协议？

🦅 **概念**

- 序列化（编码），是将对象序列化为二进制形式（字节数组），主要用于网络传输、数据持久化等。
- 反序列化（解码），则是将从网络、磁盘等读取的字节数组还原成原始对象，主要用于网络传输对象的解码，以便完成远程调用。

🦅 **选型**

在选择序列化协议的选择，主要考虑以下三个因素：

- 序列化后的**字节大小**。更少的字节数，可以减少网络带宽、磁盘的占用。
- 序列化的**性能**。对 CPU、内存资源占用情况。
- 是否支持**跨语言**。例如，异构系统的对接和开发语言切换。

🦅 **方案**

如果对序列化工具了解不多的胖友，可能一看有这么多优缺点会比较懵逼，可以先记得有哪些序列化工具，然后在慢慢熟悉它们的优缺点。

重点，还是知道【**选型**】的考虑点。

1. 【重点】Java 默认提供的序列化

  - 无法跨语言；序列化后的字节大小太大；序列化的性能差。

2. 【重点】XML 。

  - 优点：人机可读性好，可指定元素或特性的名称。
 - 缺点：序列化数据只包含数据本身以及类的结构，不包括类型标识和程序集信息；只能序列化公共属性和字段；不能序列化方法；文件庞大，文件格式复杂，传输占带宽。
  - 适用场景：当做配置文件存储数据，实时数据转换。

3. 【重点】JSON ，是一种轻量级的数据交换格式。

  - 优点：兼容性高、数据格式比较简单，易于读写、序列化后数据较小，可扩展性好，兼容性好。与 XML 相比，其协议比较简单，解析速度比较快。
  - 缺点：数据的描述性比 XML 差、不适合性能要求为 ms 级别的情况、额外空间开销比较大。
   - 适用场景（可替代 XML ）：跨防火墙访问、可调式性要求高、基于Restful API 请求、传输数据量相对小，实时性要求相对低（例如秒级别）的服务。

4. 【了解】Thrift ，不仅是序列化协议，还是一个 RPC 框架。

 - 优点：序列化后的体积小, 速度快、支持多种语言和丰富的数据类型、对于数据字段的增删具有较强的兼容性、支持二进制压缩编码。
   - 缺点：使用者较少、跨防火墙访问时，不安全、不具有可读性，调试代码时相对困难、不能与其他传输层协议共同使用（例如 HTTP）、无法支持向持久层直接读写数据，即不适合做数据持久化序列化协议。
  - 适用场景：分布式系统的 RPC 解决方案。

5. 【了解】Avro ，Hadoop 的一个子项目，解决了JSON的冗长和没有IDL的问题。

  - 优点：支持丰富的数据类型、简单的动态语言结合功能、具有自我描述属性、提高了数据解析速度、快速可压缩的二进制数据形式、可以实现远程过程调用 RPC、支持跨编程语言实现。
  - 缺点：对于习惯于静态类型语言的用户不直观。
   - 适用场景：在 Hadoop 中做 Hive、Pig 和 MapReduce 的持久化数据格式。

6. 【重点】Protobuf ，将数据结构以



```
.proto
```



  文件进行描述，通过代码生成工具可以生成对应数据结构的 POJO 对象和 Protobuf 相关的方法和属性。

   - 优点：序列化后码流小，性能高、结构化数据存储格式（XML JSON等）、通过标识字段的顺序，可以实现协议的前向兼容、结构化的文档更容易管理和维护。
 - 缺点：需要依赖于工具生成代码、支持的语言相对较少，官方只支持Java 、C++、python。
  - 适用场景：对性能要求高的 RPC 调用、具有良好的跨防火墙的访问属性、适合应用层对象的持久化。

7. 其它

 - 【重点】Protostuff ，基于 Protobuf 协议，但不需要配置proto 文件，直接导包即可。

        - 目前，微博 RPC 框架 Motan 在使用它。

  - 【了解】Jboss Marshaling ，可以直接序列化 Java 类， 无须实 `java.io.Serializable` 接口。

  - 【了解】Message Pack ，一个高效的二进制序列化格式。

     - 【重点】

    Hessian



    ，采用二进制协议的轻量级 remoting on http 服务。
    
    - 目前，阿里 RPC 框架 Dubbo 的**默认**序列化协议。

 - 【重要】kryo ，是一个快速高效的Java对象图形序列化框架，主要特点是性能、高效和易用。该项目用来序列化对象到文件、数据库或者网络。

    - 目前，阿里 RPC 框架 Dubbo 的可选序列化协议。

  - 【重要】FST ，fast-serialization 是重新实现的 Java 快速对象序列化的开发包。序列化速度更快（2-10倍）、体积更小，而且兼容 JDK 原生的序列化。要求 JDK 1.7 支持。

   - 目前，阿里 RPC 框架 Dubbo 的可选序列化协议。

    ## Netty 的零拷贝实现？

Netty 的零拷贝实现，是体现在多方面的，主要如下：

     1. 【重点】Netty 的接收和发送 ByteBuffer 采用堆外直接内存Direct Buffer。
   - 使用堆外直接内存进行 Socket 读写，不需要进行字节缓冲区的二次拷贝；使用堆内内存会多了一次内存拷贝，JVM 会将堆内存 Buffer 拷贝一份到直接内存中，然后才写入 Socket 中。
  - Netty 创建的 ByteBuffer 类型，由 ChannelConfig 配置。而 ChannelConfig 配置的 ByteBufAllocator 默认创建 Direct Buffer 类型。
2. CompositeByteBuf类，可以将多个 ByteBuf 合并为一个逻辑上的 ByteBuf ，避免了传统通过内存拷贝的方式将几个小 Buffer 合并成一个大的 Buffer 。
  - `#addComponents(...)` 方法，可将 header 与 body 合并为一个逻辑上的 ByteBuf 。这两个 ByteBuf 在CompositeByteBuf 内部都是单独存在的，即 CompositeByteBuf 只是逻辑上是一个整体。
3. 通过FileRegion包装的 FileChannel 。
 - `#tranferTo(...)` 方法，实现文件传输, 可以直接将文件缓冲区的数据发送到目标 Channel ，避免了传统通过循环 write 方式，导致的内存拷贝问题。
4. 通过 **wrap** 方法, 我们可以将 `byte[]` 数组、ByteBuf、ByteBuffer 等包装成一个 Netty ByteBuf 对象, 进而避免了拷贝操作。

## 原生的 NIO 存在 Epoll Bug 是什么？Netty 是怎么解决的？

🦅 **Java NIO Epoll BUG**

Java NIO Epoll 会导致 Selector 空轮询，最终导致 CPU 100% 。

官方声称在 JDK 1.6 版本的 update18 修复了该问题，但是直到 JDK 1.7 版本该问题仍旧存在，只不过该 BUG 发生概率降低了一些而已，它并没有得到根本性解决。

🦅 **Netty 解决方案**

对 Selector 的 select 操作周期进行**统计**，每完成一次**空**的 select 操作进行一次计数，若在某个周期内连续发生 N 次空轮询，则判断触发了 Epoll 死循环 Bug 。

艿艿：此处**空**的 select 操作的定义是，select 操作执行了 0 毫秒。

此时，Netty **重建** Selector 来解决。判断是否是其他线程发起的重建请求，若不是则将原 SocketChannel 从旧的 Selector 上取消注册，然后重新注册到新的 Selector 上，最后将原来的 Selector 关闭。

## 什么是 Netty 空闲检测？

在 Netty 中，提供了 IdleStateHandler 类，正如其名，空闲状态处理器，用于检测连接的读写是否处于空闲状态。如果是，则会触发 IdleStateEvent 。
    
IdleStateHandler 目前提供三种类型的心跳检测，通过构造方法来设置。代码如下：

  ```
// IdleStateHandler.java

public IdleStateHandler(
       int readerIdleTimeSeconds,
      int writerIdleTimeSeconds,
       int allIdleTimeSeconds) {
   this(readerIdleTimeSeconds, writerIdleTimeSeconds, allIdleTimeSeconds,
         TimeUnit.SECONDS);
}
  ```

- `readerIdleTimeSeconds` 参数：为读超时时间，即测试端一定时间内未接受到被测试端消息。
- `writerIdleTimeSeconds` 参数：为写超时时间，即测试端一定时间内向被测试端发送消息。
- `allIdleTimeSeconds` 参数：为读或写超时时间。

------

另外，我们会在网络上看到类似《IdleStateHandler 心跳机制》这样标题的文章，实际上空闲检测和心跳机制是**两件事**。

- 只是说，因为我们使用 IdleStateHandler 的目的，就是检测到连接处于空闲，通过心跳判断其是否还是**有效的连接**。
- 虽然说，TCP 协议层提供了 Keeplive 机制，但是该机制默认的心跳时间是 2 小时，依赖操作系统实现不够灵活。因而，我们才在应用层上，自己实现心跳机制。

## Netty 如何实现重连？

- 客户端，通过 IdleStateHandler 实现定时检测是否空闲，例如说 15 秒。
 - 如果空闲，则向服务端发起心跳。
  - 如果多次心跳失败，则关闭和服务端的连接，然后重新发起连接。
- 服务端，通过 IdleStateHandler 实现定时检测客户端是否空闲，例如说 90 秒。
- 如果检测到空闲，则关闭客户端。
  - 注意，如果接收到客户端的心跳请求，要反馈一个心跳响应给客户端。通过这样的方式，使客户端知道自己心跳成功。

## Netty 自己实现的 ByteBuf 有什么优点？

如下是 [《Netty 实战》](http://svip.iocoder.cn/Netty/ByteBuf-1-1-ByteBuf-intro/#) 对它的**优点总**结：

- A01. 它可以被用户自定义的**缓冲区类型**扩展
- A02. 通过内置的符合缓冲区类型实现了透明的**零拷贝**
- A03. 容量可以**按需增长**
- A04. 在读和写这两种模式之间切换不需要调用 `#flip()` 方法
- A05. 读和写使用了**不同的索引**
- A06. 支持方法的**链式**调用
- A07. 支持引用计数
- A08. 支持**池化**

## Netty 为什么要实现内存管理？

🦅 **老艿艿的理解**

在 Netty 中，IO 读写必定是非常频繁的操作，而考虑到更高效的网络传输性能，Direct ByteBuffer 必然是最合适的选择。但是 Direct ByteBuffer 的申请和释放是高成本的操作，那么进行**池化**管理，多次重用是比较有效的方式。但是，不同于一般于我们常见的对象池、连接池等**池化**的案例，ByteBuffer 是有**大小**一说。又但是，申请多大的 Direct ByteBuffer 进行池化又会是一个大问题，太大会浪费内存，太小又会出现频繁的扩容和内存复制！！！所以呢，就需要有一个合适的内存管理算法，解决**高效分配内存**的同时又解决**内存碎片化**的问题

## 什么是 Netty 的内存泄露检测？是如何进行实现的？

艿艿：这是一道比较复杂的面试题，可以挑战一下。

推荐阅读如下两篇文章：

- [《Netty 之有效规避内存泄漏》](http://calvin1978.blogcn.com/articles/netty-leak.html) 从原理层面解释。
- [《精尽 Netty 源码解析 —— Buffer 之 ByteBuf（三）内存泄露检测》](http://svip.iocoder.cn/Netty/ByteBuf-1-3-ByteBuf-resource-leak-detector/) 从源码层面解读。

另外，Netty 的内存泄露检测的实现，是对 WeakReference 和 ReferenceQueue 很好的学习。之前很多胖友在看了 [《Java 中的四种引用类型》](http://www.iocoder.cn/Fight/Four-reference-types-in-Java) 之后，是不太理解 Java 的四种引用的具体使用场景，这不就来了么。



[敖丙肝了一个月的Netty知识点 (qq.com)](https://mp.weixin.qq.com/s/I9PGsWo7-ykGf2diKklGtA)
3a661ce (fixs)
