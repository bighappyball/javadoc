# Util 之 Future

笔者先把 Netty 主要的内容写完，所以关于 Future 的分享，先放在后续的计划里。

> 老艿艿：其实是因为，自己想去研究下 Service Mesh ，所以先简单收个小尾。

当然，良心如我，还是为对这块感兴趣的胖友，先准备好了一篇不错的文章：

- Hypercube [《自顶向下深入分析Netty（五）–Future》](https://www.jianshu.com/p/a06da3256f0c)

为避免可能 [《自顶向下深入分析Netty（五）–Future》](https://www.jianshu.com/p/a06da3256f0c) 被作者删除，笔者这里先复制一份作为备份。

# 666. 备份

再次回顾这幅图，在上一章中，我们分析了Reactor的完整实现。由于Java NIO事件驱动的模型，要求Netty的事件处理采用异步的方式，异步处理则需要表示异步操作的结果。Future正是用来表示异步操作结果的对象，Future的类签名为：

```
public interface Future<V>;
```

其中的泛型参数V即表示异步结果的类型。

### 5.1 总述

也许你已经使用过JDK的Future对象，该接口的方法如下：

```
// 取消异步操作
boolean cancel(boolean mayInterruptIfRunning);
// 异步操作是否取消
boolean isCancelled();
// 异步操作是否完成，正常终止、异常、取消都是完成
boolean isDone();
// 阻塞直到取得异步操作结果
V get() throws InterruptedException, ExecutionException;
// 同上，但最长阻塞时间为timeout
V get(long timeout, TimeUnit unit)
    throws InterruptedException, ExecutionException, TimeoutException;
```

我们的第一印象会觉得这样的设计并不坏，但仔细思考，便会发现问题：
(1).接口中只有isDone()方法判断一个异步操作是否完成，但是对于完成的定义过于模糊，JDK文档指出正常终止、抛出异常、用户取消都会使isDone()方法返回真。在我们的使用中，我们极有可能是对这三种情况分别处理，而JDK这样的设计不能满足我们的需求。
(2).对于一个异步操作，我们更关心的是这个异步操作触发或者结束后能否再执行一系列动作。比如说，我们浏览网页时点击一个按钮后实现用户登录。在javascript中，处理代码如下：

```
$("#login").click(function(){
    login();
});
```

可见在这样的情况下，JDK中的Future便不能处理，所以，Netty扩展了JDK的Future接口，使其能解决上面的两个问题。扩展的方法如下（类似方法只列出一个）：

```
// 异步操作完成且正常终止
boolean isSuccess();
// 异步操作是否可以取消
boolean isCancellable();
// 异步操作失败的原因
Throwable cause();
// 添加一个监听者，异步操作完成时回调，类比javascript的回调函数
Future<V> addListener(GenericFutureListener<? extends Future<? super V>> listener);
Future<V> removeListener(GenericFutureListener<? extends Future<? super V>> listener);
// 阻塞直到异步操作完成
Future<V> await() throws InterruptedException;
// 同上，但异步操作失败时抛出异常
Future<V> sync() throws InterruptedException;
// 非阻塞地返回异步结果，如果尚未完成返回null
V getNow();
```

如果你对Future的状态还有疑问，放上代码注释中的ascii图打消你的疑虑：

```
*                                      +---------------------------+
*                                      | Completed successfully    |
*                                      +---------------------------+
*                                 +---->      isDone() = true      |
* +--------------------------+    |    |   isSuccess() = true      |
* |        Uncompleted       |    |    +===========================+
* +--------------------------+    |    | Completed with failure    |
* |      isDone() = false    |    |    +---------------------------+
* |   isSuccess() = false    |----+---->      isDone() = true      |
* | isCancelled() = false    |    |    |       cause() = non-null  |
* |       cause() = null     |    |    +===========================+
* +--------------------------+    |    | Completed by cancellation |
*                                 |    +---------------------------+
*                                 +---->      isDone() = true      |
*                                      | isCancelled() = true      |
*                                      +---------------------------+
```

可知，Future对象有两种状态尚未完成和已完成，其中已完成又有三种状态：成功、失败、用户取消。各状态的状态断言请在此图中查找。
仔细看完上面的图并联系Future接口中的方法，你是不是也会和我有相同的疑问：Future接口中的方法都是getter方法而没有setter方法，也就是说这样实现的Future子类的状态是不可变的，如果我们想要变化，那该怎么办呢？Netty提供的解决方法是：使用可写的Future即Promise。Promise接口扩展的方法如下：

```
 // 标记异步操作结果为成功，如果已被设置（不管成功还是失败）则抛出异常IllegalStateException
 Promise<V> setSuccess(V result);
 // 同上，只是结果已被设置时返回False
 boolean trySuccess(V result);

 Promise<V> setFailure(Throwable cause);
 boolean tryFailure(Throwable cause);

// 设置结果为不可取消，结果已被取消返回False
 boolean setUncancellable();
```

需要注意的是：Promise接口继承自Future接口，它提供的setter方法与常见的setter方法大为不同。Promise从Uncompleted–>Completed的状态转变**有且只能有一次**，也就是说setSuccess和setFailure方法最多只会成功一个，此外，在setSuccess和setFailure方法中会通知注册到其上的监听者。为了加深对Future和Promise的理解，我们可以将Future类比于定额发票，Promise类比于机打发票。当商户拿到税务局的发票时，如果是定额发票，则已经确定好金额是100还是50或其他，商户再也不能更改；如果是机打发票，商户相当于拿到了一个发票模板，需要多少金额按实际情况填到模板指定处。显然，不能两次使用同一张机打发票打印，这会使发票失效，而Promise做的更好，它使第二次调用setter方法失败。
至此，我们从总体上了解了Future和Promise的原理。我们再看一下类图：

[![Future类图](http://static.iocoder.cn/images/Netty/2019_02_01/01.png)](http://static.iocoder.cn/images/Netty/2019_02_01/01.png)Future类图

类图给我们的第一印象是：繁杂。我们抓住关键点：Future和Promise两条分支，分而治之。我们使用自顶向下的方法分析其实现细节，使用两条线索：

```
AbstractFuture<--CompleteFuture<--CompleteChannelFuture<--Succeeded/FailedChannelFuture

DefaultPromise<--DefaultChannelPromise
```

### 5.2 Future

#### 5.2.1 AbstractFuture

AbstractFuture主要实现Future的get()方法，取得Future关联的异步操作结果：

```
@Override
public V get() throws InterruptedException, ExecutionException {
    await();    // 阻塞直到异步操作完成

    Throwable cause = cause();
    if (cause == null) {
        return getNow();    // 成功则返回关联结果
    }
    if (cause instanceof CancellationException) {
        throw (CancellationException) cause;    // 由用户取消
    }
    throw new ExecutionException(cause);    // 失败抛出异常
}
```

其中的实现简单明了，但关键调用方法的具体实现并没有，我们将在子类实现中分析。对应的加入超时时间的get(long timeout, TimeUnit unit)实现也类似，不再列出。

#### 5.2.2 CompleteFuture

Complete表示操作已完成，所以CompleteFuture表示一个异步操作已完成的结果，由此可推知：该类的实例在异步操作完成时创建，返回给用户，用户则使用addListener()方法定义一个异步操作。如果你熟悉javascript，将Listener类比于回调函数callback()可方便理解。
我们首先看其中的字段和构造方法：

```
// 执行器，执行Listener中定义的操作
private final EventExecutor executor;

// 这有一个构造方法，可知executor是必须的
protected CompleteFuture(EventExecutor executor) {
    this.executor = executor;
}
```

CompleteFuture类定义了一个EventExecutor，可视为一个线程，用于执行Listener中的操作。我们再看addListener()和removeListener()方法：

```
public Future<V> addListener(GenericFutureListener<? extends Future<? super V>> listener) {
    // 由于这是一个已完成的Future，所以立即通知Listener执行
    DefaultPromise.notifyListener(executor(), this, listener);
    return this;
}

public Future<V> removeListener(GenericFutureListener<? extends Future<? super V>> listener) {
    // 由于已完成，Listener中的操作已完成，没有需要删除的Listener
    return this;
}
```

其中的实现也很简单，我们看一下GenericFutureListener接口，其中只定义了一个方法：

```
// 异步操作完成是调用
void operationComplete(F future) throws Exception;
```

关于Listener我们再关注一下ChannelFutureListener，它并没有扩展GenericFutureListener接口，所以类似于一个标记接口。我们看其中实现的三个通用ChannelFutureListener：

```
ChannelFutureListener CLOSE = (future) --> {
    future.channel().close();   //操作完成时关闭Channel
};

ChannelFutureListener CLOSE_ON_FAILURE = (future) --> {
    if (!future.isSuccess()) {
        future.channel().close();   // 操作失败时关闭Channel
    }
};

ChannelFutureListener FIRE_EXCEPTION_ON_FAILURE = (future) --> {
    if (!future.isSuccess()) {
        // 操作失败时触发一个ExceptionCaught事件
        future.channel().pipeline().fireExceptionCaught(future.cause());
    }
};
```

这三个Listener对象定义了对Channel处理时常用的操作，如果符合需求，可以直接使用。
由于CompleteFuture表示一个已完成的异步操作，所以可推知sync()和await()方法都将立即返回。此外，可推知线程的状态如下，不再列出代码：

```
isDone() = true; isCancelled() = false;
```

#### 5.2.3 CompleteChannelFuture

CompleteChannelFuture的类签名如下：

```
abstract class CompleteChannelFuture extends CompleteFuture<Void> implements ChannelFuture
```

ChannelFuture是不是觉得很亲切？你肯定已经使用过ChannelFuture。ChannelFuture接口相比于Future只扩展了一个方法channel()用于取得关联的Channel对象。CompleteChannelFuture还继承了CompleteFuture，尖括号中的泛型表示Future关联的结果，此结果为Void，意味着CompleteChannelFuture不关心这个特定结果即get()相关方法返回null。也就是说，我们可以将CompleteChannelFuture纯粹的视为一种回调函数机制。
CompleteChannelFuture的字段只有一个：

```
private final Channel channel; // 关联的Channel对象
```

CompleteChannelFuture的大部分方法实现中，只是将方法返回的Future覆盖为ChannelFuture对象（ChannelFuture接口的要求），代码不在列出。我们看一下executor()方法：

```
@Override
protected EventExecutor executor() {
    EventExecutor e = super.executor(); // 构造方法指定
    if (e == null) {
        return channel().eventLoop();   // 构造方法未指定使用channel注册到的eventLoop
    } else {
        return e;
    }
}
```

#### 5.2.4 Succeeded/FailedChannelFuture

Succeeded/FailedChannelFuture为特定的两个异步操作结果，回忆总述中关于Future状态的讲解，成功意味着

```
Succeeded: isSuccess() == true, cause() == null;
Failed:    isSuccess() == false, cause() == non-null
```

代码中的实现也很简单，不再列出。需要注意的是，其中的构造方法不建议用户调用，一般使用Channel对象的方法newSucceededFuture()和newFailedFuture(Throwable)代替。

### 5.3 Promise

#### 5.3.1 DefaultPromise

我们首先看其中的static字段：

```
// 可以嵌套的Listener的最大层数，可见最大值为8
private static final int MAX_LISTENER_STACK_DEPTH = Math.min(8,
        SystemPropertyUtil.getInt("io.netty.defaultPromise.maxListenerStackDepth", 8));
// result字段由使用RESULT_UPDATER更新
private static final AtomicReferenceFieldUpdater<DefaultPromise, Object> RESULT_UPDATER;
// 此处的Signal是Netty定义的类，继承自Error，异步操作成功且结果为null时设置为改值
private static final Signal SUCCESS = Signal.valueOf(DefaultPromise.class.getName() + ".SUCCESS");
// 异步操作不可取消
private static final Signal UNCANCELLABLE = Signal.valueOf(...);
// 异步操作失败时保存异常原因
private static final CauseHolder CANCELLATION_CAUSE_HOLDER = new CauseHolder(...);
```

嵌套的Listener，是指在listener的operationComplete方法中，可以再次使用future.addListener()继续添加listener，Netty限制的最大层数是8，用户可使用系统变量io.netty.defaultPromise.maxListenerStackDepth设置。
再看其中的私有字段：

```
// 异步操作结果
private volatile Object result;
// 执行listener操作的执行器
private final EventExecutor executor;
// 监听者
private Object listeners;
// 阻塞等待该结果的线程数
private short waiters;
// 通知正在进行标识
private boolean notifyingListeners;
```

也许你已经注意到，listeners是一个Object类型。这似乎不合常理，一般情况下我们会使用一个集合或者一个数组。Netty之所以这样设计，是因为大多数情况下listener只有一个，用集合和数组都会造成浪费。当只有一个listener时，该字段为一个GenericFutureListener对象；当多余一个listener时，该字段为DefaultFutureListeners，可以储存多个listener。明白了这些，我们分析关键方法addListener()：

```
@Override
public Promise<V> addListener(GenericFutureListener<? extends Future<? super V>> listener) {
    synchronized (this) {
        addListener0(listener); // 保证多线程情况下只有一个线程执行添加操作
    }

    if (isDone()) {
        notifyListeners();  // 异步操作已经完成通知监听者
    }
    return this;
}

private void addListener0(GenericFutureListener<? extends Future<? super V>> listener) {
    if (listeners == null) {
        listeners = listener;   // 只有一个
    } else if (listeners instanceof DefaultFutureListeners) {
        ((DefaultFutureListeners) listeners).add(listener); // 大于两个
    } else {
        // 从一个扩展为两个
        listeners = new DefaultFutureListeners((GenericFutureListener<? extends Future<V>>) listeners, listener);   
    }
}
```

从代码中可以看出，在添加Listener时，如果异步操作已经完成，则会notifyListeners()：

```
private void notifyListeners() {
    EventExecutor executor = executor();
    if (executor.inEventLoop()) {   //执行线程为指定线程
        final InternalThreadLocalMap threadLocals = InternalThreadLocalMap.get();
        final int stackDepth = threadLocals.futureListenerStackDepth(); // 嵌套层数
        if (stackDepth < MAX_LISTENER_STACK_DEPTH) {
            // 执行前增加嵌套层数
            threadLocals.setFutureListenerStackDepth(stackDepth + 1);   
            try {
                notifyListenersNow();
            } finally {
                // 执行完毕，无论如何都要回滚嵌套层数
                threadLocals.setFutureListenerStackDepth(stackDepth);
            }
            return;
        }
    }
    // 外部线程则提交任务给执行线程
    safeExecute(executor, () -> { notifyListenersNow(); });
}

private static void safeExecute(EventExecutor executor, Runnable task) {
    try {
        executor.execute(task);
    } catch (Throwable t) {
        rejectedExecutionLogger.error("Failed to submit a listener notification task. Event loop shut down?", t);
    }
}
```

所以，外部线程不能执行监听者Listener中定义的操作，只能提交任务到指定Executor，其中的操作最终由指定Executor执行。我们再看notifyListenersNow()方法：

```
private void notifyListenersNow() {
    Object listeners;
    // 此时外部线程可能会执行添加Listener操作，所以需要同步
    synchronized (this) { 
        if (notifyingListeners || this.listeners == null) {
            // 正在通知或已没有监听者（外部线程删除）直接返回
            return; 
        }
        notifyingListeners = true;  
        listeners = this.listeners;
        this.listeners = null;
    }
    for (;;) {
        if (listeners instanceof DefaultFutureListeners) { // 通知单个
            notifyListeners0((DefaultFutureListeners) listeners);
        } else { // 通知多个（遍历集合调用单个）
            notifyListener0(this, (GenericFutureListener<? extends Future<V>>) listeners);
        }
        synchronized (this) {
            // 执行完毕且外部线程没有再添加监听者
            if (this.listeners == null) {
                notifyingListeners = false; 
                return; 
            }
            // 外部线程添加了监听者继续执行
            listeners = this.listeners; 
            this.listeners = null;
        }
    }
}

private static void notifyListener0(Future future, GenericFutureListener l) {
    try {
        l.operationComplete(future);
    } catch (Throwable t) {
        logger.warn("An exception was thrown by " + l.getClass().getName() + ".operationComplete()", t);
    }
}
```

到此为止，我们分析完了Promise最重要的addListener()和notifyListener()方法。在源码中还有static的notifyListener()方法，这些方法是CompleteFuture使用的，对于CompleteFuture，添加监听者的操作不需要缓存，直接执行Listener中的方法即可，执行线程为调用线程，相关代码可回顾CompleteFuture。addListener()相对的removeListener()方法实现简单，我们不再分析。
回忆result字段，修饰符有volatile，所以使用RESULT_UPDATER更新，保证更新操作为原子操作。Promise不携带特定的结果（即携带Void）时，成功时设置为静态字段的Signal对象SUCCESS；如果携带泛型参数结果，则设置为泛型一致的结果。对于Promise，设置成功、设置失败、取消操作，**三个操作至多只能调用一个且同一个方法至多生效一次**，再次调用会抛出异常（set）或返回失败（try）。这些设置方法原理相同，我们以setSuccess()为例分析:

```
public Promise<V> setSuccess(V result) {
    if (setSuccess0(result)) {
        notifyListeners();  // 可以设置结果说明异步操作已完成，故通知监听者
        return this;
    }
    throw new IllegalStateException("complete already: " + this);
}

private boolean setSuccess0(V result) {
    // 为空设置为Signal对象Success
    return setValue0(result == null ? SUCCESS : result);
}

private boolean setValue0(Object objResult) {
    // 只有结果为null或者UNCANCELLABLE时才可设置且只可以设置一次
    if (RESULT_UPDATER.compareAndSet(this, null, objResult) ||
        RESULT_UPDATER.compareAndSet(this, UNCANCELLABLE, objResult)) {
        checkNotifyWaiters();   // 通知等待的线程
        return true;
    }
    return false;
}
```

checkNotifyWaiters()方法唤醒调用await()和sync()方法等待该异步操作结果的线程，代码如下：

```
private synchronized void checkNotifyWaiters() {
    // 确实有等待的线程才notifyAll
    if (waiters > 0) {  
        notifyAll();    // JDK方法
    }
}
```

有了唤醒操作，那么sync()和await()的实现是怎么样的呢？我们首先看sync()的代码：

```
public Promise<V> sync() throws InterruptedException {
    await();
    rethrowIfFailed();  // 异步操作失败抛出异常
    return this;
}
```

可见，sync()和await()很类似，区别只是sync()调用，如果异步操作失败，则会抛出异常。我们接着看await()的实现：

```
public Promise<V> await() throws InterruptedException {
    // 异步操作已经完成，直接返回
    if (isDone()) {
        return this;    
    }
    if (Thread.interrupted()) {
        throw new InterruptedException(toString());
    }
    // 死锁检测
    checkDeadLock();
    // 同步使修改waiters的线程只有一个
    synchronized (this) {
        while (!isDone()) { // 等待直到异步操作完成
            incWaiters();   // ++waiters;
            try {
                wait(); // JDK方法
            } finally {
                decWaiters(); // --waiters
            }
        }
    }
    return this;
}
```

其中的实现简单明了，其他await()方法也类似，不再分析。我们注意其中的checkDeadLock()方法用来进行死锁检测：

```
protected void checkDeadLock() {
    EventExecutor e = executor();
    if (e != null && e.inEventLoop()) {
        throw new BlockingOperationException(toString());
    }
}
```

也就是说，**不能在同一个线程中调用await()相关的方法**。为了更好的理解这句话，我们使用代码注释中的例子来解释。Handler中的channelRead()方法是由Channel注册到的eventLoop执行的，其中的Future的Executor也是这个eventLoop，所以不能在channelRead()方法中调用await这一类（包括sync）方法。

```
// 错误的例子
public void channelRead(ChannelHandlerContext ctx, Object msg) {
    ChannelFuture future = ctx.channel().close();
    future.awaitUninterruptibly();
    // ...
}

// 正确的做法
public void channelRead(ChannelHandlerContext ctx, Object msg) {
    ChannelFuture future = ctx.channel().close();
    future.addListener(new ChannelFutureListener() {
        public void operationComplete(ChannelFuture future) {
            // ... 使用异步操作
        }
    });
}
```

到了这里，我们已经分析完Future和Promise的主要实现。剩下的DefaultChannelPromise、VoidChannelPromise实现都很简单，我们不再分析。ProgressivePromise表示异步的进度结果，也不再进行分析。

# 666. 彩蛋

一条有趣的评论：

> 其实Netty在实现Future接口的cancel和isDone方法时违反了Java的约定规则，请参见文章：https://www.jianshu.com/p/6a87ceb7f70a

# Util 之 FastThreadLocal

笔者先把 Netty 主要的内容写完，所以关于 FastThreadLocal 的分享，先放在后续的计划里。

> 老艿艿：其实是因为，自己想去研究下 Service Mesh ，所以先简单收个小尾。

当然，良心如我，还是为对这块感兴趣的胖友，先准备好了一篇不错的文章：

- 莫那一鲁道

   

  《Netty 高性能之道 FastThreadLocal 源码分析（快且安全）》

  - 😈 我的好基友，可以关注下他的简书。

- 暗夜君王 [《【源起Netty 外传】FastThreadLocal怎么Fast？》](https://segmentfault.com/a/1190000012926809)

为避免可能 [《Netty 高性能之道 FastThreadLocal 源码分析（快且安全）》](https://www.jianshu.com/p/3fc2fbac4bb7) 被作者删除，笔者这里先复制一份作为备份。

# 666. 备份

## 前言

Netty 作为高性能框架，对 JDK 中的很多类都进行了封装了和优化，例如 Thread 类，Netty 使用了 FastThreadLocalRunnable 对所有 DefaultThreadFactory 创建出来的 Runnable 都进行了包装。包装的目的是 run 方法的不同，看代码：

```
public void run() {
    try {
        runnable.run();
    } finally {
        FastThreadLocal.removeAll();
    }
}
```

可以看到，多了一行 FastThreadLocal.removeAll()，众所周知，JDK 中自带的 ThreadLocal 在线程池使用环境中，有内存泄漏的风险，很明显，Netty 为了避免这个 bug，重新进行了封装，而且这个封装线程的名字叫做 FastThreadLocalRunnable，语义很明显：快速的 ThreadLocal！意思说 JDK 自带的慢喽？那我们今天就来看看到底快在哪里？对 ThreadLocal 内存泄漏不清楚或者对 ThreadLoca 不清楚的可以移步 [并发编程之 ThreadLocal 源码剖析](https://www.jianshu.com/p/80284438bb97)。

## 1. 如何使用？

[![img](https://upload-images.jianshu.io/upload_images/4236553-12c253f98742f4b2.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/648/format/jpeg)](https://upload-images.jianshu.io/upload_images/4236553-12c253f98742f4b2.png?imageMogr2/auto-orient/strip|imageView2/2/w/648/format/jpeg)img

测试用例

[![img](https://upload-images.jianshu.io/upload_images/4236553-7ec7f64c3cbf86f8.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/454/format/jpeg)](https://upload-images.jianshu.io/upload_images/4236553-7ec7f64c3cbf86f8.png?imageMogr2/auto-orient/strip|imageView2/2/w/454/format/jpeg)img

运行结果

## 2. 构造方法解析

[![img](https://upload-images.jianshu.io/upload_images/4236553-852af1ffc45a7a99.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/563/format/jpeg)](https://upload-images.jianshu.io/upload_images/4236553-852af1ffc45a7a99.png?imageMogr2/auto-orient/strip|imageView2/2/w/563/format/jpeg)img

构造方法

构造方法中定义了两个变量。 index 和 cleanerFlagIndex，这两个变量且都是 int final 的。且都是通过
InternalThreadLocalMap.nextVariableIndex() 方法而来。

[![img](https://upload-images.jianshu.io/upload_images/4236553-266a99ac72429da7.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/719/format/jpeg)](https://upload-images.jianshu.io/upload_images/4236553-266a99ac72429da7.png?imageMogr2/auto-orient/strip|imageView2/2/w/719/format/jpeg)img

InternalThreadLocalMap.nextVariableIndex() 方法

[![img](https://upload-images.jianshu.io/upload_images/4236553-5cdca30965ae3c19.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/552/format/jpeg)](https://upload-images.jianshu.io/upload_images/4236553-5cdca30965ae3c19.png?imageMogr2/auto-orient/strip|imageView2/2/w/552/format/jpeg)img

nextIndex 变量

该方法通过一个原子 int 变量自增得到。也就是说，cleanerFlagIndex 变量比 index 大1，这两个变量的作用稍后我们会看到他们如何使用。这里暂且不表。

## 3. set 方法解析

[![img](https://upload-images.jianshu.io/upload_images/4236553-30ec041c29b4c55d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/698/format/jpeg)](https://upload-images.jianshu.io/upload_images/4236553-30ec041c29b4c55d.png?imageMogr2/auto-orient/strip|imageView2/2/w/698/format/jpeg)img

set（） 方法

该方法步骤如下：

1. 判断设置的 value 值是否是缺省值，如果是，则调用 remove 方法。
2. 如果不是，则获取道当前线程的 InternalThreadLocalMap。然后将该 FastThreadLocal 对应的 index 下标的 value 替换成新的 value。老的 value 设置成缺省值。

**小小的一个 set 方法，内部可是非常的复杂，非战斗人员请尽快撤离！**

实际上，这里调用了4个方法：

1. InternalThreadLocalMap.get()；
2. setKnownNotUnset(threadLocalMap, value);
3. registerCleaner(threadLocalMap);
4. remove();

让我们慢慢说道说道。

#### 1. InternalThreadLocalMap.get()；

代码如下：

```
public static InternalThreadLocalMap get() {
    Thread thread = Thread.currentThread();
    if (thread instanceof FastThreadLocalThread) {
        return fastGet((FastThreadLocalThread) thread);
    } else {
        return slowGet();
    }
}
```

首先是 InternalThreadLocalMap 的静态方法，方法逻辑很简单，主要是根据当前线程是否是 Netty 的 FastThreadLocalThread 来调用不同的方法，一个是 fast 的，一个 是 slow 的（不是 Netty 的线程就是 slow 的）。哈哈哈，Netty 的作者命名还真是犀利。那我们就看看 fastGet 方法是什么？

```
private static InternalThreadLocalMap fastGet(FastThreadLocalThread thread) {
    InternalThreadLocalMap threadLocalMap = thread.threadLocalMap();
    if (threadLocalMap == null) {
        thread.setThreadLocalMap(threadLocalMap = new InternalThreadLocalMap());
    }
    return threadLocalMap;
}
```

逻辑很简单，获取当前线程的 InternalThreadLocalMap，如果没有，就创建一个。我们看看他的构造方法。

```
public static final Object UNSET = new Object();

private InternalThreadLocalMap() {
    super(newIndexedVariableTable());
}

private static Object[] newIndexedVariableTable() {
    Object[] array = new Object[32];
    Arrays.fill(array, UNSET);
    return array;
}

UnpaddedInternalThreadLocalMap(Object[] indexedVariables) {
    this.indexedVariables = indexedVariables;
}
```

楼主将 3 个关联的方法都放在一起了，方便查看，首先，InternalThreadLocalMap 调用的父类 UnpaddedInternalThreadLocalMap 的构造方法，并传入了一个数组，而这个数组默认大小是 32，里面填充32 个空对象的引用。

那 slowGet 方法又是什么样子的呢？代码如下：

```
static final ThreadLocal<InternalThreadLocalMap> slowThreadLocalMap = new ThreadLocal<InternalThreadLocalMap>();

private static InternalThreadLocalMap slowGet() {
    ThreadLocal<InternalThreadLocalMap> slowThreadLocalMap = UnpaddedInternalThreadLocalMap.slowThreadLocalMap;
    InternalThreadLocalMap ret = slowThreadLocalMap.get();
    if (ret == null) {
        ret = new InternalThreadLocalMap();
        slowThreadLocalMap.set(ret);
    }
    return ret;
}
```

代码还是很简单的，我们分析一下：首先使用 JDK 的 ThreadLocal 获取一个 Netty 的 InternalThreadLocalMap，如果没有就创建一个，并将这个 InternalThreadLocalMap 设置到 JDK 的 ThreadLocal 中，然后返回这个 InternalThreadLocalMap。从这里可以看出，为了提高性能，Netty 还是避免使用了JDK 的 threadLocalMap，他的方式是曲线救国：在JDK 的 threadLocal 中设置 Netty 的 InternalThreadLocalMap ，然后，这个 InternalThreadLocalMap 中设置 Netty 的 FastThreadLcoal。

好，到这里，我们的 InternalThreadLocalMap.get() 方法就看完了，主要是获取当前线程的 InternalThreadLocalMap，如果没有，就创建一个，这个 Map 内部维护的是一个数组，和 JDK 不同，JDK
维护的是一个使用线性探测法的 Map，可见，从底层数据结构上，JDK 就已经输了，他们的读取速度相差很大，特别是当数据量很大的时候，Netty 的数据结构速度依然不变，而 JDK 由于使用线性探测法，速度会相应的下降。

#### 2. setKnownNotUnset(threadLocalMap, value);

当 InternalThreadLocalMap.get() 返回了 一个 InternalThreadLocalMap，这个时候调用 setKnownNotUnset(threadLocalMap, value); 方法进行操作。代码如下：

```
private boolean setKnownNotUnset(InternalThreadLocalMap threadLocalMap, V value) {
    if (threadLocalMap.setIndexedVariable(index, value)) {
        addToVariablesToRemove(threadLocalMap, this);
        return true;
    }
    return false;
}
```

看方法名称，是设置一个值，但不是 unset，也就是那个空对象。通过 threadLocalMap.setIndexedVariable(index, value) 进行设置。如果返回 true，则调用 addToVariablesToRemove(threadLocalMap, this) 。这两个方法，我们一起看看。先看第一个：

setIndexedVariable 方法

```
public boolean setIndexedVariable(int index, Object value) {
    Object[] lookup = indexedVariables;
    if (index < lookup.length) {
        Object oldValue = lookup[index];
        lookup[index] = value;
        return oldValue == UNSET;
    } else {
        expandIndexedVariableTableAndSet(index, value);
        return true;
    }
}
```

首先，拿到那个 32 长度的数组，如果 FastThreadLocal 的 index 属性小于数组长度，则将值设定到指定槽位。将原来槽位的值设置为空对象。如果原来的对象也是空对象，则返回 true，否则返回 false。

如果不够呢？调用 expandIndexedVariableTableAndSet(index, value) 方法。进入该方法查看。看方法名称是扩大索引并设置值。

```
private void expandIndexedVariableTableAndSet(int index, Object value) {
    Object[] oldArray = indexedVariables;
    final int oldCapacity = oldArray.length;
    int newCapacity = index;
    newCapacity |= newCapacity >>>  1;
    newCapacity |= newCapacity >>>  2;
    newCapacity |= newCapacity >>>  4;
    newCapacity |= newCapacity >>>  8;
    newCapacity |= newCapacity >>> 16;
    newCapacity ++;

    Object[] newArray = Arrays.copyOf(oldArray, newCapacity);
    Arrays.fill(newArray, oldCapacity, newArray.length, UNSET);
    newArray[index] = value;
    indexedVariables = newArray;
}
```

这里代码很熟悉，HashMap 中也有这样的代码，我们去看看：

[![img](https://upload-images.jianshu.io/upload_images/4236553-bb4c10b59073c4f7.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/647/format/jpeg)](https://upload-images.jianshu.io/upload_images/4236553-bb4c10b59073c4f7.png?imageMogr2/auto-orient/strip|imageView2/2/w/647/format/jpeg)img

HashMap 中的 tableSizeFor 方法

这段代码的作用就是按原来的容量扩容2倍。并且保证结果是2的幂次方。这里 Netty 的做法和 HashMap 一样，按照原来的容量扩容到最近的 2 的幂次方大小，比如原来32，就扩容到64，然后，将原来数组的内容填充到新数组中，剩余的填充`空对象`，然后将新数组赋值给成员变量 indexedVariables。完成了一次扩容。

回到 setKnownNotUnset 方法中，setIndexedVariable 方法什么情况下会返回 ture 呢？扩容了，或者没扩容，但插入的对象没有替换掉别的对象，也就是原槽位是空对象。换句话说，只有更新了对象才会返回 false。

也就是说，当新增了对象的时候，会调用 addToVariablesToRemove 方法，如同方法名，添加变量然后删除。我们看看 addToVariablesToRemove(threadLocalMap, this) 方法逻辑：

```
private static void addToVariablesToRemove(InternalThreadLocalMap threadLocalMap, FastThreadLocal<?> variable) {
    // 该变量是 static final 的，因此通常是 0
    Object v = threadLocalMap.indexedVariable(variablesToRemoveIndex);
    Set<FastThreadLocal<?>> variablesToRemove;
    if (v == InternalThreadLocalMap.UNSET || v == null) {
        // 创建一个基于 IdentityHashMap 的 Set，泛型是 FastThreadLocal
        variablesToRemove = Collections.newSetFromMap(new IdentityHashMap<FastThreadLocal<?>, Boolean>());
        // 将这个 Set 放到这个 Map 数组的下标 0 处
        threadLocalMap.setIndexedVariable(variablesToRemoveIndex, variablesToRemove);
    } else {
        // 如果拿到的不是 UNSET ，说明这是第二次操作了，因此可以强转为 Set
        variablesToRemove = (Set<FastThreadLocal<?>>) v;
    }

    // 最后的目的就是将 FastThreadLocal 放置到 Set 中
    variablesToRemove.add(variable);
}
```

这个方法的目的是将 FastThreadLocal 对象保存到一个 Set 中，因为 Netty 的 Map 只是一个数组，没有键，所以保存到一个 Set 中，这样就可以判断是否 set 过这个 map，例如 Netty 的 isSet 方法就是根据这个判断的。

说完了 setKnownNotUnset 方法，我们再说说 registerCleaner 方法。

#### 3. registerCleaner(threadLocalMap);

这个方法可以说有点复杂了，请耐住性子，这里是 ftl（FastThreadLocal） 的精髓。

首先说下该方法的作用：将这个 ftl 注册到一个 `清理线程` 中，当 thread 对象被 gc 的时候，则会自动清理掉 ftl，防止 JDK 的内存泄漏问题。

让我们进入该方法查看：

```
private void registerCleaner(final InternalThreadLocalMap threadLocalMap) {
    Thread current = Thread.currentThread();
    if (FastThreadLocalThread.willCleanupFastThreadLocals(current) ||
        threadLocalMap.indexedVariable(cleanerFlagIndex) != InternalThreadLocalMap.UNSET) {
        return;
    }
    threadLocalMap.setIndexedVariable(cleanerFlagIndex, Boolean.TRUE);
    ObjectCleaner.register(current, new Runnable() {
        public void run() {
            remove(threadLocalMap);
        }
    });
}
```

楼主删除了源码中的注释，我们来好好说说这个方法：

1. 获取当前线程，如果当前线程是 FastThreadLocalThread 类型 且 cleanupFastThreadLocals 是 true，则返回 true，直接return。也就是说，Netty 线程池里面创建的线程都符合这条件，只有用户自定义的线程池不符合。
   当然还有一个条件：如果这个 ftl 的 index + 1 在 map 中的值不是空对象，则已经注册过了，也直接 return，不再重复注册。
2. 当不符合上面的条件的时候，将 Map 中对应的 ftl 的 index + 1 位置的值设置为 TRUE。根据上面的判断，防止重复注册。
3. 调用 ObjectCleaner 的 register 方法，注册一个任务，任务的内容就是调用 remove 方法，删除 ftl 在 map 中的对象和相应的内容。

问题来了，怎么注册的呢？为什么还带着一个 current 当前线程呢？

我们看看源码：

```
public static void register(Object object, Runnable cleanupTask) {
    AutomaticCleanerReference reference = new AutomaticCleanerReference(object,
            ObjectUtil.checkNotNull(cleanupTask, "cleanupTask"));
    LIVE_SET.add(reference);

    // Check if there is already a cleaner running.
    if (CLEANER_RUNNING.compareAndSet(false, true)) {
        final Thread cleanupThread = new FastThreadLocalThread(CLEANER_TASK);
        cleanupThread.setPriority(Thread.MIN_PRIORITY);
        AccessController.doPrivileged(new PrivilegedAction<Void>() {
            public Void run() {
                cleanupThread.setContextClassLoader(null);
                return null;
            }
        });
        cleanupThread.setName(CLEANER_THREAD_NAME);
        cleanupThread.setDaemon(true);
        cleanupThread.start();
    }
}
```

首先创建一个 AutomaticCleanerReference 自动清洁对象，继承了 WeakReference，先不看他的构造方法，先看下面，将这个构造好的实例放入到 LIVE_SET 中，实际上，这是一个 Netty 封装的 ConcurrentSet，然后判断清除线程是否在运行。如果没有，并且CAS改状态成功。就创建一个线程，任务是 定义好的 CLEANER_TASK，线程优先级是最低，上下位类加载器是null，名字是 objectCleanerThread，并且是后台线程。然后启动这个线程。运行 CLEANER_TASK。

一步一步来看看。

首先 AutomaticCleanerReference 的构造方法如下：

```
private static final ReferenceQueue<Object> REFERENCE_QUEUE = new ReferenceQueue<Object>();

AutomaticCleanerReference(Object referent, Runnable cleanupTask) {
    super(referent, REFERENCE_QUEUE);
    this.cleanupTask = cleanupTask;
}   

void cleanup() {
   cleanupTask.run();
}
```

ReferenceQueue 的作用是，当对象被回收的时候，会将这个对象添加进这个队列，就可以跟踪这个对象。设置可以复活这个对象。也就是说，当这个 Thread 对象被回收的时候，会将这个对象放进这个引用队列，放进入干嘛呢？什么时候取出来呢？我们看看什么时候取出来：

代码如下：

```
private static final Runnable CLEANER_TASK = new Runnable() {
    @Override
    public void run() {
        for (;;) {
            while (!LIVE_SET.isEmpty()) {
                final AutomaticCleanerReference reference = (AutomaticCleanerReference) REFERENCE_QUEUE.remove(REFERENCE_QUEUE_POLL_TIMEOUT_MS);
               
                if (reference != null) {
                    try {
                        reference.cleanup();
                    } catch (Throwable ignored) {
                    }
                    LIVE_SET.remove(reference);
                }
            }
            CLEANER_RUNNING.set(false);
            if (LIVE_SET.isEmpty() || !CLEANER_RUNNING.compareAndSet(false, true)) {
                break;
            }
        }
    }
};
```

巧了 ！！！！正是 CLEANER_TASK 在使用这个 ReferenceQueue！！！！别激动，我们还是慢慢看看这个任务到底是做什么的：

1. 死循环，如果 ConcurrentSet 不是空（还记得我们将 AutomaticCleanerReference 放进这里吗），尝试从 REFERENCE_QUEUE 中取出 AutomaticCleanerReference，也就是我们刚刚放进入的。这是标准的跟踪 GC 对象的做法。因为当一个对象被 GC 时，会将保证这个对象的 Reference 放进指定的引用队列，这是 JVM 做的。
2. 如果不是空，就调用应用的 cleanUp 方法，也就是我们传进去的任务，什么任务？就是那个调用 ftl 的 remove 方法的任务。随后从 Set 中删除这个引用。
3. 如果 Set 是空的话，将清理线程状态（原子变量） 设置成 fasle。
4. 继续判断，如果Set 还是空，或者 Set 不是空 且 设置 CAS 设置状态为true 失败（说明其他线程改了这个状态）则跳出循环，结束线程。

有点懵？那我们就好好总结这里为什么这么做：

> 当我们在一个非 Netty 线程池创建的线程中使用 ftl 的时候，Netty 会注册一个垃圾清理线程（因为 Netty 线程池创建的线程最终都会执行 removeAll 方法，不会出现内存泄漏） ，用于清理这个线程这个 ftl 变量，从上面的代码中，我们知道，非 Netty 线程如果使用 ftl，Netty 仍然会借助 JDK 的 ThreadLocal，只是只借用一个槽位，放置 Netty 的 Map， Map 中再放置 Netty 的 ftl 。所以，在使用线程池的情况下可能会出现内存泄漏。**Netty 为了解决这个问题，在每次使用新的 ftl 的时候，都将这个 ftl 注册到和线程对象绑定到一个 GC 引用上， 当这个线程对象被回收的时候，也会顺便清理掉他的 Map 中的 所有 ftl，解决了该问题，就像解决 JDK Nio bug 一样。**

好，到这里，Netty 的 FastThreadLocal 的精华我们基本就全部吸取了。ftl 不仅快，而且安全。快在使用数组代替线性探测法的 Map，安全在每次线程回收的时候都清理 ftl，不用担心内存泄漏。

剩下的方法都是很简单的。我们一起看完吧

#### 4. remove();

每次 Set 一个空对象的时候，就是调用remove 方法，我们看看该方法，源码如下：

```
public final void remove() {
     remove(InternalThreadLocalMap.getIfSet());
 }

 public static InternalThreadLocalMap getIfSet() {
     Thread thread = Thread.currentThread();
     if (thread instanceof FastThreadLocalThread) {
         return ((FastThreadLocalThread) thread).threadLocalMap();
     }
     return slowThreadLocalMap.get();

 }

 public final void remove(InternalThreadLocalMap threadLocalMap) {
     if (threadLocalMap == null) {
         return;
     }
     // 删除并返回 Map 数组中当前 ThreadLocal index 对应的 value
     Object v = threadLocalMap.removeIndexedVariable(index);
     // 从 Map 数组下标 0 的位置取出 Set ，并删除当前的 ThreadLocal
     removeFromVariablesToRemove(threadLocalMap, this);

     if (v != InternalThreadLocalMap.UNSET) {
         try {
             // 默认啥也不做，用户可以继承 FastThreadLocal 重定义这个方法。
             onRemoval((V) v);
         } catch (Exception e) {
             PlatformDependent.throwException(e);
         }
     }
 }
```

楼主将这3个方法都合并在一起了，首先获取当前线程的 threadLocalMap，然后就像注释中写的：删除 ftl 对应下标中 map 的 value，然后删除 map 下标0 处 Set 中的 ftl。防止 isSet 方法误判。最后，如果用户重写了 onRemoval 方法，就调用，默认是个空方法。用户可以重写 onRemoval 方法和 initialize 方法。

## 4. get 方法解析

get 方法就更简单了，代码如下：

```
public final V get() {
    InternalThreadLocalMap threadLocalMap = InternalThreadLocalMap.get();
    Object v = threadLocalMap.indexedVariable(index);
    if (v != InternalThreadLocalMap.UNSET) {
        return (V) v;
    }

    V value = initialize(threadLocalMap);
    registerCleaner(threadLocalMap);
    return value;
}
```

首先获取当前线程的map，然后根据 ftl 的 index 获取 value，然后返回，如果是空对象，也就是没有设置，则通过 initialize 返回，initialize 方法会将返回值设置到 map 的槽位中，并放进 Set 中。最后，尝试注册一个清洁器。

## 5. remove All方法解析

这个方法在 Netty 的默认线程的 finally 块中调用。代码如下：

```
public static void removeAll() {
    InternalThreadLocalMap threadLocalMap = InternalThreadLocalMap.getIfSet();
    if (threadLocalMap == null) {
        return;
    }

    try {
        Object v = threadLocalMap.indexedVariable(variablesToRemoveIndex);
        if (v != null && v != InternalThreadLocalMap.UNSET) {
            @SuppressWarnings("unchecked")
            Set<FastThreadLocal<?>> variablesToRemove = (Set<FastThreadLocal<?>>) v;
            FastThreadLocal<?>[] variablesToRemoveArray =
                    variablesToRemove.toArray(new FastThreadLocal[variablesToRemove.size()]);
            for (FastThreadLocal<?> tlv: variablesToRemoveArray) {
                tlv.remove(threadLocalMap);
            }
        }
    } finally {
        InternalThreadLocalMap.remove();
    }
}
```

非常简单，首先获取当前线程map，然后获取 Set，将 Set 转成数组，遍历数组，调用 ftl 的 remove 方法。最后，删除线程中 的 map 属性。

## 总结

现在我们来总结一下 FastThreadLocal 。

之所以称之为 Fast，因为没有使用 JDK 的使用线性探测法的 Map，如果你使用的是Netty 线程池工厂创建的线程，搭配 Netty 的 ftl，性能非常好，如果你使用自定义的线程，搭配 ftl，性能也会比 JDK 的好，注意： ftl 没有 JDK 的内存泄露的风险。

但做到这些不是没有代价的，由于每一个 ftl 都是一个唯一的下标，而这个下标是每次创建一个 ftl 对象都是递增 2，当你的下标很大，你的线程中的 Map 相应的也要增大，可以想象，如果创建了海量的 ftl 对象，这个数组的浪费是非常客观的。很明显，这是一种空间换时间的做法。

通常，ftl 都是静态对象，所以不会有我们假设的那么多。如果使用不当，确实会浪费大量内存。

但这个风险带来的好处是明显的，在楼主的机器上测试，ftl 的读取性能是 JDK 的 5 倍左右，写入的速度也要快 20% 左右。

FastThreadLocal 人如其名，快且安全！

今天就到这里，good luck！！！！

# Util 之 Recycler

笔者先把 Netty 主要的内容写完，所以关于 Recycler 的分享，先放在后续的计划里。

> 老艿艿：其实是因为，自己想去研究下 Service Mesh ，所以先简单收个小尾。

当然，良心如我，还是为对这块感兴趣的胖友，先准备好了一篇不错的文章：

- 沧行 [《Netty之Recycler》](https://www.jianshu.com/p/4eab8450560c)

为避免可能 [《Netty之Recycler》](https://www.jianshu.com/p/4eab8450560c) 被作者删除，笔者这里先复制一份作为备份。

# 666. 备份

Recycler用来实现对象池，其中对应堆内存和直接内存的池化实现分别是PooledHeapByteBuf和PooledDirectByteBuf。Recycler主要提供了3个方法：

- get():获取一个对象。
- recycle(T, Handle):回收一个对象，T为对象泛型。
- newObject(Handle):当没有可用对象时创建对象的实现方法。

Recycler的UML图如下：

[![img](https://upload-images.jianshu.io/upload_images/3751588-916c6baab07fa863.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1000/format/jpeg)](https://upload-images.jianshu.io/upload_images/3751588-916c6baab07fa863.png?imageMogr2/auto-orient/strip|imageView2/2/w/1000/format/jpeg)img

Recycler.png

Recycler关联了4个核心类：

- DefaultHandle:对象的包装类，在Recycler中缓存的对象都会包装成DefaultHandle类。
- Stack:存储本线程回收的对象。对象的获取和回收对应Stack的pop和push，即获取对象时从Stack中pop出1个DefaultHandle，回收对象时将对象包装成DefaultHandle push到Stack中。Stack会与线程绑定，即每个用到Recycler的线程都会拥有1个Stack，在该线程中获取对象都是在该线程的Stack中pop出一个可用对象。
- WeakOrderQueue:存储其它线程回收到本线程stack的对象，当某个线程从Stack中获取不到对象时会从WeakOrderQueue中获取对象。每个线程的Stack拥有1个WeakOrderQueue链表，链表每个节点对应1个其它线程的WeakOrderQueue，其它线程回收到该Stack的对象就存储在这个WeakOrderQueue里。
- Link: WeakOrderQueue中包含1个Link链表，回收对象存储在链表某个Link节点里，当Link节点存储的回收对象满了时会新建1个Link放在Link链表尾。

整个Recycler回收对象存储结构如下图所示：

[![img](https://upload-images.jianshu.io/upload_images/3751588-63236f0c4e59328d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/799/format/jpeg)](https://upload-images.jianshu.io/upload_images/3751588-63236f0c4e59328d.png?imageMogr2/auto-orient/strip|imageView2/2/w/799/format/jpeg)img

Recycler.png

下面分析下源码，首先看下Recycler.recycle(T, Handle)方法，用于回收1个对象：

```
public final boolean recycle(T o, Handle handle) {
    if (handle == NOOP_HANDLE) {
        return false;
    }

    DefaultHandle h = (DefaultHandle) handle;
    if (h.stack.parent != this) {
        return false;
    }
    if (o != h.value) {
        throw new IllegalArgumentException("o does not belong to handle");
    }
    h.recycle();
    return true;
}
```

回收1个对象会调用该对象DefaultHandle.recycle()方法，如下：

```
public void recycle() {
   stack.push(this);
}
```

回收1个对象（DefaultHandle）就是把该对象push到stack中。

```
void push(DefaultHandle item) {
        Thread currentThread = Thread.currentThread();
        if (thread == currentThread) {
            // The current Thread is the thread that belongs to the Stack, we can try to push the object now.
            /**
             * 如果该stack就是本线程的stack，那么直接把DefaultHandle放到该stack的数组里
             */
            pushNow(item);
        } else {
            // The current Thread is not the one that belongs to the Stack, we need to signal that the push
            // happens later.
            /**
             * 如果该stack不是本线程的stack，那么把该DefaultHandle放到该stack的WeakOrderQueue中
             */
            pushLater(item, currentThread);
        }
    }
```

这里分为两种情况，当stack是当前线程对应的stack时，执行pushNow(item)方法，直接把对象放到该stack的DefaultHandle数组中，如下：

```
/**
 * 直接把DefaultHandle放到stack的数组里，如果数组满了那么扩展该数组为当前2倍大小
 * @param item
 */
private void pushNow(DefaultHandle item) {
    if ((item.recycleId | item.lastRecycledId) != 0) {
        throw new IllegalStateException("recycled already");
    }
    item.recycleId = item.lastRecycledId = OWN_THREAD_ID;

    int size = this.size;
    if (size >= maxCapacity || dropHandle(item)) {
        // Hit the maximum capacity or should drop - drop the possibly youngest object.
        return;
    }
    if (size == elements.length) {
        elements = Arrays.copyOf(elements, min(size << 1, maxCapacity));
    }

    elements[size] = item;
    this.size = size + 1;
}
```

当stack是其它线程的stack时，执行pushLater(item, currentThread)方法，将对象放到WeakOrderQueue中，如下：

```
private void pushLater(DefaultHandle item, Thread thread) {
       /** 
        * Recycler有1个stack->WeakOrderQueue映射，每个stack会映射到1个WeakOrderQueue，这个WeakOrderQueue是该stack关联的其它线程WeakOrderQueue链表的head WeakOrderQueue。
        * 当其它线程回收对象到该stack时会创建1个WeakOrderQueue中并加到stack的WeakOrderQueue链表中。 
        */
        Map<Stack<?>, WeakOrderQueue> delayedRecycled = DELAYED_RECYCLED.get();
        WeakOrderQueue queue = delayedRecycled.get(this);
        if (queue == null) {
            /**
             * 如果delayedRecycled满了那么将1个伪造的WeakOrderQueue（DUMMY）放到delayedRecycled中，并丢弃该对象（DefaultHandle）
             */
            if (delayedRecycled.size() >= maxDelayedQueues) {
                // Add a dummy queue so we know we should drop the object
                delayedRecycled.put(this, WeakOrderQueue.DUMMY);
                return;
            }
            // Check if we already reached the maximum number of delayed queues and if we can allocate at all.
            /**
             * 创建1个WeakOrderQueue
             */
            if ((queue = WeakOrderQueue.allocate(this, thread)) == null) {
                // drop object
                return;
            }
            delayedRecycled.put(this, queue);
        } else if (queue == WeakOrderQueue.DUMMY) {
            // drop object
            return;
        }

        /**
         * 将对象放入到该stack对应的WeakOrderQueue中
         */
        queue.add(item);
    }


static WeakOrderQueue allocate(Stack<?> stack, Thread thread) {
        // We allocated a Link so reserve the space
        /**
         * 如果该stack的可用共享空间还能再容下1个WeakOrderQueue，那么创建1个WeakOrderQueue，否则返回null
         */
        return reserveSpace(stack.availableSharedCapacity, LINK_CAPACITY)
                ? new WeakOrderQueue(stack, thread) : null;
    }
```

WeakOrderQueue的构造函数如下，WeakOrderQueue实现了多线程环境下回收对象的机制，当由其它线程回收对象到stack时会为该stack创建1个WeakOrderQueue，这些由其它线程创建的WeakOrderQueue会在该stack中按链表形式串联起来，每次创建1个WeakOrderQueue会把该WeakOrderQueue作为该stack的head WeakOrderQueue：

```
private WeakOrderQueue(Stack<?> stack, Thread thread) {
        head = tail = new Link();
        owner = new WeakReference<Thread>(thread);
        /**
         * 每次创建WeakOrderQueue时会更新WeakOrderQueue所属的stack的head为当前WeakOrderQueue， 当前WeakOrderQueue的next为stack的之前head，
         * 这样把该stack的WeakOrderQueue通过链表串起来了，当下次stack中没有可用对象需要从WeakOrderQueue中转移对象时从WeakOrderQueue链表的head进行scavenge转移到stack的对DefaultHandle数组。
         */
        synchronized (stack) {
            next = stack.head;
            stack.head = this;
        }
        availableSharedCapacity = stack.availableSharedCapacity;
    }
```

下面再看Recycler.get()方法：

```
public final T get() {
    if (maxCapacity == 0) {
        return newObject(NOOP_HANDLE);
    }
    Stack<T> stack = threadLocal.get();
    DefaultHandle handle = stack.pop();
    if (handle == null) {
        handle = stack.newHandle();
        handle.value = newObject(handle);
    }
    return (T) handle.value;
}
```

取出该线程对应的stack，从stack中pop出1个DefaultHandle，返回该DefaultHandle的真正对象。
下面看stack.pop()方法：

```
DefaultHandle pop() {
        int size = this.size;
        if (size == 0) {
            if (!scavenge()) {
                return null;
            }
            size = this.size;
        }
        size --;
        DefaultHandle ret = elements[size];
        elements[size] = null;
        if (ret.lastRecycledId != ret.recycleId) {
            throw new IllegalStateException("recycled multiple times");
        }
        ret.recycleId = 0;
        ret.lastRecycledId = 0;
        this.size = size;
        return ret;
    }
```

如果该stack的DefaultHandle数组中还有对象可用，那么从该DefaultHandle数组中取出1个可用对象返回，如果该DefaultHandle数组没有可用的对象了，那么执行scavenge()方法，将head WeakOrderQueue中的head Link中的DefaultHandle数组转移到stack的DefaultHandle数组，scavenge方法如下：

```
boolean scavenge() {
        // continue an existing scavenge, if any
        if (scavengeSome()) {
            return true;
        }

        // reset our scavenge cursor
        prev = null;
        cursor = head;
        return false;
    }
```

具体执行了scavengeSome()方法，清理WeakOrderQueue中部分DefaultHandle到stack，每次尽可能清理head WeakOrderQueue的head Link的全部DefaultHandle，如下：

```
boolean scavengeSome() {
        WeakOrderQueue cursor = this.cursor;
        if (cursor == null) {
            cursor = head;
            if (cursor == null) {
                return false;
            }
        }

        boolean success = false;
        WeakOrderQueue prev = this.prev;
        do {
            /**
             * 将当前WeakOrderQueue的head Link的DefaultHandle数组转移到stack的DefaultHandle数组中
             */
            if (cursor.transfer(this)) {
                success = true;
                break;
            }

            WeakOrderQueue next = cursor.next;
            if (cursor.owner.get() == null) {
                if (cursor.hasFinalData()) {
                    for (;;) {
                        if (cursor.transfer(this)) {
                            success = true;
                        } else {
                            break;
                        }
                    }
                }
                if (prev != null) {
                    prev.next = next;
                }
            } else {
                prev = cursor;
            }

            cursor = next;

        } while (cursor != null && !success);

        this.prev = prev;
        this.cursor = cursor;
        return success;
    }
```

WeakOrderQueue.transfer()方法如下，将WeakOrderQueue的head Link中的DefaultHandle数组迁移到stack中：

```
boolean transfer(Stack<?> dst) {
        Link head = this.head;
        if (head == null) {
            return false;
        }

        /**
         * 如果head Link的readIndex到达了Link的容量LINK_CAPACITY，说明该Link已经被scavengge完了。
         * 这时需要把下一个Link作为新的head Link。
         */
        if (head.readIndex == LINK_CAPACITY) {
            if (head.next == null) {
                return false;
            }
            this.head = head = head.next;
        }

        final int srcStart = head.readIndex;
        /**
         * head Link的回收对象数组的最大位置
         */
        int srcEnd = head.get();
        /**
         * head Link可以scavenge的DefaultHandle的数量
         */
        final int srcSize = srcEnd - srcStart;
        if (srcSize == 0) {
            return false;
        }

        final int dstSize = dst.size;

        /**
         * 每次会尽可能scavenge整个head Link，如果head Link的DefaultHandle数组能全部迁移到stack中，stack的DefaultHandle数组预期容量
         */
        final int expectedCapacity = dstSize + srcSize;
        /**
         * 如果预期容量大于stack的DefaultHandle数组最大长度，说明本次无法将head Link的DefaultHandle数组全部迁移到stack中
         */
        if (expectedCapacity > dst.elements.length) {
            final int actualCapacity = dst.increaseCapacity(expectedCapacity);
            srcEnd = min(srcStart + actualCapacity - dstSize, srcEnd);
        }

        if (srcStart != srcEnd) {
            /**
             * head Link的DefaultHandle数组
             */
            final DefaultHandle[] srcElems = head.elements;
            /**
             * stack的DefaultHandle数组
             */
            final DefaultHandle[] dstElems = dst.elements;
            int newDstSize = dstSize;
            /**
             * 迁移head Link的DefaultHandle数组到stack的DefaultHandle数组
             */
            for (int i = srcStart; i < srcEnd; i++) {
                DefaultHandle element = srcElems[i];
                if (element.recycleId == 0) {
                    element.recycleId = element.lastRecycledId;
                } else if (element.recycleId != element.lastRecycledId) {
                    throw new IllegalStateException("recycled already");
                }
                srcElems[i] = null;

                if (dst.dropHandle(element)) {
                    // Drop the object.
                    continue;
                }
                element.stack = dst;
                dstElems[newDstSize ++] = element;
            }

            /**
             * 当head节点的对象全都转移给stack后，取head下一个节点作为head，下次转移的时候再从新的head转移回收的对象
             */
            if (srcEnd == LINK_CAPACITY && head.next != null) {
                // Add capacity back as the Link is GCed.
                reclaimSpace(LINK_CAPACITY);

                this.head = head.next;
            }
            /**
             * 迁移完成后更新原始head Link的readIndex
             */
            head.readIndex = srcEnd;
            if (dst.size == newDstSize) {
                return false;
            }
            dst.size = newDstSize;
            return true;
        } else {
            // The destination stack is full already.
            return false;
        }
    }
```

# Util 之 HashedWheelTimer

笔者先把 Netty 主要的内容写完，所以关于 HashedWheelTimer 的分享，先放在后续的计划里。

> 老艿艿：其实是因为，自己想去研究下 Service Mesh ，所以先简单收个小尾。

当然，良心如我，还是为对这块感兴趣的胖友，先准备好了一篇不错的文章：

- 德胜 [《Netty工具类HashedWheelTimer源码走读(一)》](https://my.oschina.net/haogrgr/blog/489320)
- 德胜 [《Netty工具类HashedWheelTimer源码走读(二)》](https://my.oschina.net/haogrgr/blog/490266)
- 德胜 [《Netty工具类HashedWheelTimer源码走读(三)》](https://my.oschina.net/haogrgr/blog/490348)
- Zacard [《netty源码解读之时间轮算法实现-HashedWheelTimer》](https://zacard.net/2016/12/02/netty-hashedwheeltimer/)

为避免可能 [《netty源码解读之时间轮算法实现-HashedWheelTimer》](https://zacard.net/2016/12/02/netty-hashedwheeltimer/) 被作者删除，笔者这里先复制一份作为备份。

# 666. 备份

## 前因

由于netty动辄管理100w+的连接，每一个连接都会有很多超时任务。比如发送超时、心跳检测间隔等，如果每一个定时任务都启动一个`Timer`,不仅低效，而且会消耗大量的资源。

## 解决方案

根据George Varghese 和 Tony Lauck 1996 年的论文：[Hashed and Hierarchical Timing Wheels: data structures to efficiently implement a timer facility](http://static.iocoder.cn/62dc58eaa06cbd6f431dc616c375b717)。提出了一种定时轮的方式来管理和维护大量的`Timer`调度.

## 原理

时间轮其实就是一种环形的数据结构，可以想象成时钟，分成很多格子，一个格子代码一段时间（这个时间越短，`Timer`的精度越高）。并用一个链表报错在该格子上的到期任务，同时一个指针随着时间一格一格转动，并执行相应格子中的到期任务。任务通过`取摸`决定放入那个格子。如下图所示：

[![img](http://static.iocoder.cn/89a84b18103e57fc95e596a47daa49c5)](http://static.iocoder.cn/89a84b18103e57fc95e596a47daa49c5)img

以上图为例，假设一个格子是1秒，则整个wheel能表示的时间段为8s，假如当前指针指向2，此时需要调度一个3s后执行的任务，显然应该加入到(2+3=5)的方格中，指针再走3次就可以执行了；如果任务要在10s后执行，应该等指针走完一个round零2格再执行，因此应放入4，同时将round（1）保存到任务中。检查到期任务时应当只执行round为0的，格子上其他任务的round应减1。

是不是很像java中的`Hashmap`。其实就是`HashMap`的哈希拉链算法，只不过多了指针转动与一些定时处理的逻辑。所以其相关的操作和`HashMap`也一致：

- 添加任务：O(1)
- 删除/取消任务：O(1)
- 过期/执行任务：最差情况为O(n)->也就是当`HashMap`里面的元素全部hash冲突，退化为一条链表的情况。平均O(1)->显然，格子越多，每个格子上的链表就越短，这里需要权衡时间与空间。

### 多层时间轮

如果任务的时间跨度很大，数量很大，单层的时间轮会造成任务的`round`很大，单个格子的链表很长。这时候可以将时间轮分层，类似于时钟的时分秒3层。如下图所示：

[![img](http://static.iocoder.cn/f3172a69ecb37b8c26871a2553bdeb2e)](http://static.iocoder.cn/f3172a69ecb37b8c26871a2553bdeb2e)img

但是个人认为，多层的时间轮造成的算法复杂度的进一步提升。单层时间轮只需增加每一轮的格子就能解决链表过长的问题。因此，更倾向使用单层的时间轮，netty4中时间轮的实现也是单层的。

## netty时间轮的实现-HashedWheelTimer

### 简单使用示例

1.引入netty依赖

```
<dependency>
    <groupId>io.netty</groupId>
    <artifactId>netty-all</artifactId>
    <version>4.1.4.Final</version>
</dependency>
```

2.示例代码

示例1：

```
@Test
public void test1() throws Exception {
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    HashedWheelTimer hashedWheelTimer = new HashedWheelTimer(100, TimeUnit.MILLISECONDS);

    System.out.println("start:" + LocalDateTime.now().format(formatter));

    hashedWheelTimer.newTimeout(timeout -> {
        System.out.println("task :" + LocalDateTime.now().format(formatter));
    }, 3, TimeUnit.SECONDS);
    Thread.sleep(5000);
}
```

输出为：

> start:2016-11-30 05:56:35
>
> task :2016-11-30 05:56:38

示例2：

```
@Test
public void test2() throws Exception {
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    HashedWheelTimer hashedWheelTimer = new HashedWheelTimer(100, TimeUnit.MILLISECONDS);

    System.out.println("start:" + LocalDateTime.now().format(formatter));

    hashedWheelTimer.newTimeout(timeout -> {
        Thread.sleep(3000);
        System.out.println("task1:" + LocalDateTime.now().format(formatter));
    }, 3, TimeUnit.SECONDS);

    hashedWheelTimer.newTimeout(timeout -> System.out.println("task2:" + LocalDateTime.now().format(
            formatter)), 4, TimeUnit.SECONDS);

    Thread.sleep(10000);
}
```

输出：

> start:2016-12-01 08:32:37
>
> task1:2016-12-01 08:32:43
>
> task2:2016-12-01 08:32:43

可以看到，当前一个任务执行时间过长的时候，会影响后续任务的到期执行时间的。也就是说其中的任务是串行执行的。所以，要求里面的任务都要短平快。

### HashedWheelTimer源码之构造函数

```
  public HashedWheelTimer(
          ThreadFactory threadFactory, // 用来创建worker线程
          long tickDuration, // tick的时长，也就是指针多久转一格
          TimeUnit unit, // tickDuration的时间单位
          int ticksPerWheel, // 一圈有几格
          boolean leakDetection // 是否开启内存泄露检测
          ) {

      // 一些参数校验
      if (threadFactory == null) {
          throw new NullPointerException("threadFactory");
      }
      if (unit == null) {
          throw new NullPointerException("unit");
      }
      if (tickDuration <= 0) {
          throw new IllegalArgumentException("tickDuration must be greater than 0: " + tickDuration);
      }
      if (ticksPerWheel <= 0) {
          throw new IllegalArgumentException("ticksPerWheel must be greater than 0: " + ticksPerWheel);
      }

      // 创建时间轮基本的数据结构，一个数组。长度为不小于ticksPerWheel的最小2的n次方
      wheel = createWheel(ticksPerWheel);
      // 这是一个标示符，用来快速计算任务应该呆的格子。
      // 我们知道，给定一个deadline的定时任务，其应该呆的格子=deadline%wheel.length.但是%操作是个相对耗时的操作，所以使用一种变通的位运算代替：
      // 因为一圈的长度为2的n次方，mask = 2^n-1后低位将全部是1，然后deadline&mast == deadline%wheel.length
      // java中的HashMap也是使用这种处理方法
      mask = wheel.length - 1;

      // 转换成纳秒处理
      this.tickDuration = unit.toNanos(tickDuration);

      // 校验是否存在溢出。即指针转动的时间间隔不能太长而导致tickDuration*wheel.length>Long.MAX_VALUE
      if (this.tickDuration >= Long.MAX_VALUE / wheel.length) {
          throw new IllegalArgumentException(String.format(
                  "tickDuration: %d (expected: 0 < tickDuration in nanos < %d",
                  tickDuration, Long.MAX_VALUE / wheel.length));
      }
      // 创建worker线程
      workerThread = threadFactory.newThread(worker);

// 这里默认是启动内存泄露检测：当HashedWheelTimer实例超过当前cpu可用核数*4的时候，将发出警告
      leak = leakDetection || !workerThread.isDaemon() ? leakDetector.open(this) : null;
  }
```

再来看下`createWheel`的代码：

```
  private static HashedWheelBucket[] createWheel(int ticksPerWheel) {
      // 一些参数校验
if (ticksPerWheel <= 0) {
          throw new IllegalArgumentException(
                  "ticksPerWheel must be greater than 0: " + ticksPerWheel);
      }
      if (ticksPerWheel > 1073741824) {
          throw new IllegalArgumentException(
                  "ticksPerWheel may not be greater than 2^30: " + ticksPerWheel);
      }

// 初始化ticksPerWheel的值为不小于ticksPerWheel的最小2的n次方
      ticksPerWheel = normalizeTicksPerWheel(ticksPerWheel);
// 初始化wheel数组
      HashedWheelBucket[] wheel = new HashedWheelBucket[ticksPerWheel];
      for (int i = 0; i < wheel.length; i ++) {
          wheel[i] = new HashedWheelBucket();
      }
      return wheel;
  }
```

`normalizeTicksPerWheel()`的代码：

```
// 初始化ticksPerWheel的值为不小于ticksPerWheel的最小2的n次方
   private static int normalizeTicksPerWheel(int ticksPerWheel) {
       int normalizedTicksPerWheel = 1;
       while (normalizedTicksPerWheel < ticksPerWheel) {
           normalizedTicksPerWheel <<= 1;
       }
       return normalizedTicksPerWheel;
   }
```

这里其实不建议使用这种方式，因为当ticksPerWheel的值很大的时候，这个方法会循环很多次，方法执行时间不稳定，效率也不够。推荐使用java8 HashMap的做法：

```
private int normalizeTicksPerWheel(int ticksPerWheel) {
    // 这里参考java8 hashmap的算法，使推算的过程固定
    int n = ticksPerWheel - 1;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    // 这里1073741824 = 2^30,防止溢出
    return (n < 0) ? 1 : (n >= 1073741824) ? 1073741824 : n + 1;
}
```

### HashedWheelTimer源码之启动、停止与添加任务

`start()`启动时间轮的方法：

```
// 启动时间轮。这个方法其实不需要显示的主动调用，因为在添加定时任务（newTimeout()方法）的时候会自动调用此方法。
// 这个是合理的设计，因为如果时间轮里根本没有定时任务，启动时间轮也是空耗资源
public void start() {
    // 判断当前时间轮的状态，如果是初始化，则启动worker线程，启动整个时间轮；如果已经启动则略过；如果是已经停止，则报错
    // 这里是一个Lock Free的设计。因为可能有多个线程调用启动方法，这里使用AtomicIntegerFieldUpdater原子的更新时间轮的状态
    switch (WORKER_STATE_UPDATER.get(this)) {
        case WORKER_STATE_INIT:
            if (WORKER_STATE_UPDATER.compareAndSet(this, WORKER_STATE_INIT, WORKER_STATE_STARTED)) {
                workerThread.start();
            }
            break;
        case WORKER_STATE_STARTED:
            break;
        case WORKER_STATE_SHUTDOWN:
            throw new IllegalStateException("cannot be started once stopped");
        default:
            throw new Error("Invalid WorkerState");
    }

    // 等待worker线程初始化时间轮的启动时间
    while (startTime == 0) {
        try {
            startTimeInitialized.await();
        } catch (InterruptedException ignore) {
            // Ignore - it will be ready very soon.
        }
    }
}
```

AtomicIntegerFieldUpdater是JUC里面的类，原理是利用反射进行原子操作。有比AtomicInteger更好的性能和更低得内存占用。跟踪这个类的github 提交记录，可以看到更详细的[原因](http://static.iocoder.cn/894e662550de6d9f418324da5b2469d5)

`stop()`停止时间轮的方法：

```
public Set<Timeout> stop() {
    // worker线程不能停止时间轮，也就是加入的定时任务，不能调用这个方法。
    // 不然会有恶意的定时任务调用这个方法而造成大量定时任务失效
    if (Thread.currentThread() == workerThread) {
        throw new IllegalStateException(
                HashedWheelTimer.class.getSimpleName() +
                        ".stop() cannot be called from " +
                        TimerTask.class.getSimpleName());
    }
    // 尝试CAS替换当前状态为“停止：2”。如果失败，则当前时间轮的状态只能是“初始化：0”或者“停止：2”。直接将当前状态设置为“停止：2“
    if (!WORKER_STATE_UPDATER.compareAndSet(this, WORKER_STATE_STARTED, WORKER_STATE_SHUTDOWN)) {
        // workerState can be 0 or 2 at this moment - let it always be 2.
        WORKER_STATE_UPDATER.set(this, WORKER_STATE_SHUTDOWN);

        if (leak != null) {
            leak.close();
        }

        return Collections.emptySet();
    }

    // 终端worker线程
    boolean interrupted = false;
    while (workerThread.isAlive()) {
        workerThread.interrupt();
        try {
            workerThread.join(100);
        } catch (InterruptedException ignored) {
            interrupted = true;
        }
    }

    // 从中断中恢复
    if (interrupted) {
        Thread.currentThread().interrupt();
    }

    if (leak != null) {
        leak.close();
    }
    // 返回未处理的任务
    return worker.unprocessedTimeouts();
}
```

`newTimeout()`添加定时任务：

```
public Timeout newTimeout(TimerTask task, long delay, TimeUnit unit) {
    // 参数校验
    if (task == null) {
        throw new NullPointerException("task");
    }
    if (unit == null) {
        throw new NullPointerException("unit");
    }
    // 如果时间轮没有启动，则启动
    start();

    // Add the timeout to the timeout queue which will be processed on the next tick.
    // During processing all the queued HashedWheelTimeouts will be added to the correct HashedWheelBucket.
    // 计算任务的deadline
    long deadline = System.nanoTime() + unit.toNanos(delay) - startTime;
    // 这里定时任务不是直接加到对应的格子中，而是先加入到一个队列里，然后等到下一个tick的时候，会从队列里取出最多100000个任务加入到指定的格子中
    HashedWheelTimeout timeout = new HashedWheelTimeout(this, task, deadline);
    timeouts.add(timeout);
    return timeout;
}
```

这里使用的Queue不是普通java自带的Queue的实现，而是使用[JCTool](http://static.iocoder.cn/752997222ee0591298f89db49439b894)–一个高性能的的并发Queue实现包。

### HashedWheelTimer源码之HashedWheelTimeout

`HashedWheelTimeout`是一个定时任务的内部包装类，双向链表结构。会保存定时任务到期执行的任务、deadline、round等信息。

```
private static final class HashedWheelTimeout implements Timeout {

    // 定义定时任务的3个状态：初始化、取消、过期
    private static final int ST_INIT = 0;
    private static final int ST_CANCELLED = 1;
    private static final int ST_EXPIRED = 2;
    // 用来CAS方式更新定时任务状态
    private static final AtomicIntegerFieldUpdater<HashedWheelTimeout> STATE_UPDATER;

    static {
        AtomicIntegerFieldUpdater<HashedWheelTimeout> updater =
                PlatformDependent.newAtomicIntegerFieldUpdater(HashedWheelTimeout.class, "state");
        if (updater == null) {
            updater = AtomicIntegerFieldUpdater.newUpdater(HashedWheelTimeout.class, "state");
        }
        STATE_UPDATER = updater;
    }

    // 时间轮引用
    private final HashedWheelTimer timer;
    // 具体到期需要执行的任务
    private final TimerTask task;
    private final long deadline;

    @SuppressWarnings({"unused", "FieldMayBeFinal", "RedundantFieldInitialization" })
    private volatile int state = ST_INIT;

    // 离任务执行的轮数，当将次任务加入到格子中是计算该值，每过一轮，该值减一。
    long remainingRounds;

    // 双向链表结构，由于只有worker线程会访问，这里不需要synchronization / volatile
    HashedWheelTimeout next;
    HashedWheelTimeout prev;

    // 定时任务所在的格子
    HashedWheelBucket bucket;

    HashedWheelTimeout(HashedWheelTimer timer, TimerTask task, long deadline) {
        this.timer = timer;
        this.task = task;
        this.deadline = deadline;
    }

    @Override
    public Timer timer() {
        return timer;
    }

    @Override
    public TimerTask task() {
        return task;
    }

    @Override
    public boolean cancel() {
        // 这里只是修改状态为ST_CANCELLED，会在下次tick时，在格子中移除
        if (!compareAndSetState(ST_INIT, ST_CANCELLED)) {
            return false;
        }
        // 加入到时间轮的待取消队列，并在每次tick的时候，从相应格子中移除。
        timer.cancelledTimeouts.add(this);
        return true;
    }

    // 从格子中移除自身
    void remove() {
        HashedWheelBucket bucket = this.bucket;
        if (bucket != null) {
            bucket.remove(this);
        }
    }

    public boolean compareAndSetState(int expected, int state) {
        return STATE_UPDATER.compareAndSet(this, expected, state);
    }

    public int state() {
        return state;
    }

    @Override
    public boolean isCancelled() {
        return state() == ST_CANCELLED;
    }

    @Override
    public boolean isExpired() {
        return state() == ST_EXPIRED;
    }

    // 过期并执行任务
    public void expire() {
        if (!compareAndSetState(ST_INIT, ST_EXPIRED)) {
            return;
        }

        try {
            task.run(this);
        } catch (Throwable t) {
            if (logger.isWarnEnabled()) {
                logger.warn("An exception was thrown by " + TimerTask.class.getSimpleName() + '.', t);
            }
        }
    }

    // 略过toString()
}
```

### HashedWheelTimer源码之HashedWheelBucket

`HashedWheelBucket`用来存放HashedWheelTimeout，结构类似于LinkedList。提供了`expireTimeouts(long deadline)`方法来过期并执行格子中的定时任务

```
private static final class HashedWheelBucket {
    // 指向格子中任务的首尾
    private HashedWheelTimeout head;
    private HashedWheelTimeout tail;

    // 基础的链表添加操作
    public void addTimeout(HashedWheelTimeout timeout) {
        assert timeout.bucket == null;
        timeout.bucket = this;
        if (head == null) {
            head = tail = timeout;
        } else {
            tail.next = timeout;
            timeout.prev = tail;
            tail = timeout;
        }
    }

    // 过期并执行格子中的到期任务，tick到该格子的时候，worker线程会调用这个方法，根据deadline和remainingRounds判断任务是否过期
    public void expireTimeouts(long deadline) {
        HashedWheelTimeout timeout = head;

        // 遍历格子中的所有定时任务
        while (timeout != null) {
            boolean remove = false;
            if (timeout.remainingRounds <= 0) { // 定时任务到期
                if (timeout.deadline <= deadline) {
                    timeout.expire();
                } else {
                    // 如果round数已经为0，deadline却>当前格子的deadline，说放错格子了，这种情况应该不会出现
                    throw new IllegalStateException(String.format(
                            "timeout.deadline (%d) > deadline (%d)", timeout.deadline, deadline));
                }
                remove = true;
            } else if (timeout.isCancelled()) {
                remove = true;
            } else { //没有到期，轮数-1
                timeout.remainingRounds --;
            }
            // 先保存next，因为移除后next将被设置为null
            HashedWheelTimeout next = timeout.next;
            if (remove) {
                remove(timeout);
            }
            timeout = next;
        }
    }

    // 基础的链表移除node操作
    public void remove(HashedWheelTimeout timeout) {
        HashedWheelTimeout next = timeout.next;
        // remove timeout that was either processed or cancelled by updating the linked-list
        if (timeout.prev != null) {
            timeout.prev.next = next;
        }
        if (timeout.next != null) {
            timeout.next.prev = timeout.prev;
        }

        if (timeout == head) {
            // if timeout is also the tail we need to adjust the entry too
            if (timeout == tail) {
                tail = null;
                head = null;
            } else {
                head = next;
            }
        } else if (timeout == tail) {
            // if the timeout is the tail modify the tail to be the prev node.
            tail = timeout.prev;
        }
        // null out prev, next and bucket to allow for GC.
        timeout.prev = null;
        timeout.next = null;
        timeout.bucket = null;
    }

    /**
     * Clear this bucket and return all not expired / cancelled {@link Timeout}s.
     */
    public void clearTimeouts(Set<Timeout> set) {
        for (;;) {
            HashedWheelTimeout timeout = pollTimeout();
            if (timeout == null) {
                return;
            }
            if (timeout.isExpired() || timeout.isCancelled()) {
                continue;
            }
            set.add(timeout);
        }
    }

    // 链表的poll操作
    private HashedWheelTimeout pollTimeout() {
        HashedWheelTimeout head = this.head;
        if (head == null) {
            return null;
        }
        HashedWheelTimeout next = head.next;
        if (next == null) {
            tail = this.head =  null;
        } else {
            this.head = next;
            next.prev = null;
        }

        // null out prev and next to allow for GC.
        head.next = null;
        head.prev = null;
        head.bucket = null;
        return head;
    }
}
```

### HashedWheelTimer源码之Worker

`Worker`是时间轮的核心线程类。tick的转动，过期任务的处理都是在这个线程中处理的。

```
private final class Worker implements Runnable {
    private final Set<Timeout> unprocessedTimeouts = new HashSet<Timeout>();

    private long tick;

    @Override
    public void run() {
        // 初始化startTime.只有所有任务的的deadline都是想对于这个时间点
        startTime = System.nanoTime();
        // 由于System.nanoTime()可能返回0，甚至负数。并且0是一个标示符，用来判断startTime是否被初始化，所以当startTime=0的时候，重新赋值为1
        if (startTime == 0) {
            startTime = 1;
        }

        // 唤醒阻塞在start()的线程
        startTimeInitialized.countDown();

        // 只要时间轮的状态为WORKER_STATE_STARTED，就循环的“转动”tick，循环判断响应格子中的到期任务
        do {
            // waitForNextTick方法主要是计算下次tick的时间, 然后sleep到下次tick
            // 返回值就是System.nanoTime() - startTime, 也就是Timer启动后到这次tick, 所过去的时间
            final long deadline = waitForNextTick();
            if (deadline > 0) { // 可能溢出或者被中断的时候会返回负数, 所以小于等于0不管
                // 获取tick对应的格子索引
                int idx = (int) (tick & mask);
                // 移除被取消的任务
                processCancelledTasks();
                HashedWheelBucket bucket =
                        wheel[idx];
                // 从任务队列中取出任务加入到对应的格子中
                transferTimeoutsToBuckets();
                // 过期执行格子中的任务
                bucket.expireTimeouts(deadline);
                tick++;
            }
        } while (WORKER_STATE_UPDATER.get(HashedWheelTimer.this) == WORKER_STATE_STARTED);

        // 这里应该是时间轮停止了，清除所有格子中的任务，并加入到未处理任务列表，以供stop()方法返回
        for (HashedWheelBucket bucket: wheel) {
            bucket.clearTimeouts(unprocessedTimeouts);
        }
        // 将还没有加入到格子中的待处理定时任务队列中的任务取出，如果是未取消的任务，则加入到未处理任务队列中，以供stop()方法返回
        for (;;) {
            HashedWheelTimeout timeout = timeouts.poll();
            if (timeout == null) {
                break;
            }
            if (!timeout.isCancelled()) {
                unprocessedTimeouts.add(timeout);
            }
        }
        // 处理取消的任务
        processCancelledTasks();
    }

    // 将newTimeout()方法中加入到待处理定时任务队列中的任务加入到指定的格子中
    private void transferTimeoutsToBuckets() {
        // 每次tick只处理10w个任务，以免阻塞worker线程
        for (int i = 0; i < 100000; i++) {
            HashedWheelTimeout timeout = timeouts.poll();
            // 如果没有任务了，直接跳出循环
            if (timeout == null) {
                break;
            }
            // 还没有放入到格子中就取消了，直接略过
            if (timeout.state() == HashedWheelTimeout.ST_CANCELLED) {
                continue;
            }

            // 计算任务需要经过多少个tick
            long calculated = timeout.deadline / tickDuration;
            // 计算任务的轮数
            timeout.remainingRounds = (calculated - tick) / wheel.length;

            //如果任务在timeouts队列里面放久了, 以至于已经过了执行时间, 这个时候就使用当前tick, 也就是放到当前bucket, 此方法调用完后就会被执行.
            final long ticks = Math.max(calculated, tick); // Ensure we don't schedule for past.
            int stopIndex = (int) (ticks & mask);

            // 将任务加入到响应的格子中
            HashedWheelBucket bucket = wheel[stopIndex];
            bucket.addTimeout(timeout);
        }
    }

    // 将取消的任务取出，并从格子中移除
    private void processCancelledTasks() {
        for (;;) {
            HashedWheelTimeout timeout = cancelledTimeouts.poll();
            if (timeout == null) {
                // all processed
                break;
            }
            try {
                timeout.remove();
            } catch (Throwable t) {
                if (logger.isWarnEnabled()) {
                    logger.warn("An exception was thrown while process a cancellation task", t);
                }
            }
        }
    }

    /**
     * calculate goal nanoTime from startTime and current tick number,
     * then wait until that goal has been reached.
     * @return Long.MIN_VALUE if received a shutdown request,
     * current time otherwise (with Long.MIN_VALUE changed by +1)
     */
    //sleep, 直到下次tick到来, 然后返回该次tick和启动时间之间的时长
    private long waitForNextTick() {
        //下次tick的时间点, 用于计算需要sleep的时间
        long deadline = tickDuration * (tick + 1);

        for (;;) {
            // 计算需要sleep的时间, 之所以加999999后再除10000000, 是为了保证足够的sleep时间
            // 例如：当deadline - currentTime=2000002的时候，如果不加999999，则只睡了2ms，
            // 而2ms其实是未到达deadline这个时间点的，所有为了使上述情况能sleep足够的时间，加上999999后，会多睡1ms
            final long currentTime = System.nanoTime() - startTime;
            long sleepTimeMs = (deadline - currentTime + 999999) / 1000000;

            if (sleepTimeMs <= 0) {
	// 以下为个人理解：（如有错误，欢迎大家指正）
                // 这里的意思应该是从时间轮启动到现在经过太长的时间(跨度大于292年...)，以至于让long装不下，都溢出了...对于netty的严谨，我服！
                if (currentTime == Long.MIN_VALUE) {
                    return -Long.MAX_VALUE;
                } else {
                    return currentTime;
                }
            }

            // Check if we run on windows, as if thats the case we will need
            // to round the sleepTime as workaround for a bug that only affect
            // the JVM if it runs on windows.
            //
            // See https://github.com/netty/netty/issues/356
            if (PlatformDependent.isWindows()) { // 这里是因为windows平台的定时调度最小单位为10ms，如果不是10ms的倍数，可能会引起sleep时间不准确
                sleepTimeMs = sleepTimeMs / 10 * 10;
            }

            try {
                Thread.sleep(sleepTimeMs);
            } catch (InterruptedException ignored) {
	// 调用HashedWheelTimer.stop()时优雅退出
                if (WORKER_STATE_UPDATER.get(HashedWheelTimer.this) == WORKER_STATE_SHUTDOWN) {
                    return Long.MIN_VALUE;
                }
            }
        }
    }

    public Set<Timeout> unprocessedTimeouts() {
        return Collections.unmodifiableSet(unprocessedTimeouts);
    }
}
```

## 总结

通过阅读源码，学到了很多之前不知道的知识点和注意事项。比如：

1. 操作数字型要考虑溢出问题
2. System.nanoTime(）返回值
3. Atomic*FieldUpdater类的运用
4. 一些代码设计方式
5. 不断优化性能，Lock Less代替Lock；Lock Free代替Lock Less
6. JCTool高性能队列的使用

# Util 之 MpscUnboundedArrayQueue

笔者先把 Netty 主要的内容写完，所以关于 MpscUnboundedArrayQueue 的分享，先放在后续的计划里。

> 老艿艿：其实是因为，自己想去研究下 Service Mesh ，所以先简单收个小尾。

当然，良心如我，还是为对这块感兴趣的胖友，先准备好了一篇不错的文章：

- HMILYYLIMH [《原理剖析（第 012 篇）Netty之无锁队列MpscUnboundedArrayQueue原理分析》](https://www.jianshu.com/p/119a03332619)

为避免可能 [《原理剖析（第 012 篇）Netty之无锁队列MpscUnboundedArrayQueue原理分析》](https://www.jianshu.com/p/119a03332619) 被作者删除，笔者这里先复制一份作为备份。

# 666. 备份

## 一、大致介绍

```
1、了解过netty原理的童鞋，其实应该知道工作线程组的每个子线程都维护了一个任务队列；
2、细心的童鞋会发现netty的队列是重写了队列的实现方法，覆盖了父类中的LinkedBlockingQueue队列，但是如今却换成了JCTools的一些并发队列，因为JCTools是一款对jdk并发数据结构进行增强的并发工具；
3、那么问题就来了，现在的netty要用新的队列呢？难道是新的队列确实很高效么？
4、那么本章节就来和大家分享分析一下Netty新采用的队列之一MpscUnboundedArrayQueue，分析Netty的源码版本为：netty-netty-4.1.22.Final；
```

## 二、回顾预习

### 2.1 构造队列

```
1、源码：
    // NioEventLoop.java
    @Override
    protected Queue<Runnable> newTaskQueue(int maxPendingTasks) {
        // This event loop never calls takeTask()
        // 由于默认是没有配置io.netty.eventLoop.maxPendingTasks属性值的，所以maxPendingTasks默认值为Integer.MAX_VALUE；
        // 那么最后配备的任务队列的大小也就自然使用无参构造队列方法
        return maxPendingTasks == Integer.MAX_VALUE ? PlatformDependent.<Runnable>newMpscQueue()
                                                    : PlatformDependent.<Runnable>newMpscQueue(maxPendingTasks);
    }

    // PlatformDependent.java
    /**
     * Create a new {@link Queue} which is safe to use for multiple producers (different threads) and a single
     * consumer (one thread!).
     * @return A MPSC queue which may be unbounded.
     */
    public static <T> Queue<T> newMpscQueue() {
        return Mpsc.newMpscQueue();
    }

    // Mpsc.java
    static <T> Queue<T> newMpscQueue() {
        return USE_MPSC_CHUNKED_ARRAY_QUEUE ? new MpscUnboundedArrayQueue<T>(MPSC_CHUNK_SIZE)
                                            : new MpscUnboundedAtomicArrayQueue<T>(MPSC_CHUNK_SIZE);
    }

2、通过源码回顾，想必大家已经隐约回忆起之前分析过这段代码，我们在构建工作线程管理组的时候，还需要实例化子线程数组children[]，所以自然就会碰到这段代码；

3、这段代码其实就是为了实现一个无锁方式的线程安全队列，总之一句话，效率相当相当的高；
```

### 2.2 何为JCTools？

```
1、JCTools是服务虚拟机并发开发的工具，提供一些JDK没有的并发数据结构辅助开发。

2、是一个聚合四种 SPSC/MPSC/SPMC/MPMC 数据变量的并发队列：
    • SPSC：单个生产者对单个消费者（无等待、有界和无界都有实现）
    • MPSC：多个生产者对单个消费者（无锁、有界和无界都有实现）
    • SPMC：单生产者对多个消费者（无锁 有界）
    • MPMC：多生产者对多个消费者（无锁、有界）

3、SPSC/MPSC 提供了一个在性能，分配和分配规则之间的平衡的关联数组队列；
```

### 2.3 常用重要的成员属性及方法

```
1、private volatile long producerLimit;
   // 数据链表所分配或者扩展后的容量值

2、protected long producerIndex;
   // 生产者指针，每添加一个数据，指针加2

3、protected long consumerIndex;
   // 消费者指针，每移除一个数据，指针加2

4、private static final int RETRY = 1; // 重新尝试，有可能是因为并发原因，CAS操作指针失败，所以需要重新尝试添加动作
   private static final int QUEUE_FULL = 2; // 队列已满，直接返回false操作
   private static final int QUEUE_RESIZE = 3; // 需要扩容处理，扩容的后的容量值producerLimit一般都是mask的N倍
   // 添加数据时，根据offerSlowPath返回的状态值来做各种处理

5、protected E[] producerBuffer;
   // 数据缓冲区，需要添加的数据放在此

6、protected long producerMask;
   // 生产者扩充容量值，一般producerMask与consumerMask是一致的，而且需要扩容的数值一般和此值一样

7、public boolean offer(final E e)
   // 添加元素

8、public E poll()
   // 移除元素
```

### 2.4 数据结构

```
1、如果chunkSize初始化大小为4，则最后显示的数据结构如下：
   E1，E2，。。。，EN：表示具体的元素；
   NBP：表示下一个缓冲区的指针，我采用的是英文的缩写( Next Buffer Pointer)；

   而且你看着我是拆分开写的，其实每一个NBP指向的就是下面一组缓冲区；
   Buffer1中的NBP其实就是Buffer2的指针引用；
   Buffer2中的NBP其实就是Buffer3的指针引用；
   以此类推。。。
+------+------+------+------+------+
|      |      |      |      |      |
|  E1  |  E2  |  E3  | JUMP |  NBP |    Buffer1
|      |      |      |      |      |
+------+------+------+------+------+

+------+------+------+------+------+
|      |      |      |      |      |
|  E5  |  E6  | JUMP |  E4  |  NBP |    Buffer2
|      |      |      |      |      |
+------+------+------+------+------+

+------+------+------+------+------+
|      |      |      |      |      |
|  E9  | JUMP |  E7  |  E8  |  NBP |    Buffer3
|      |      |      |      |      |
+------+------+------+------+------+

+------+------+------+------+------+
|      |      |      |      |      |
| JUMP |  E10 |  E11 |  E12 |  NBP |    Buffer4
|      |      |      |      |      |
+------+------+------+------+------+

+------+------+------+------+------+
|      |      |      |      |      |
|  E13 |  E14 |  E15 | JUMP |  NBP |    Buffer5
|      |      |      |      |      |
+------+------+------+------+------+

2、这个数据结构和我们通常所认知的链表是不是有点异样，其实大体还是雷同的，这种数据结构其实也是指针的单项指引罢了；
```

## 三、源码分析MpscUnboundedArrayQueue

### 3.1、MpscUnboundedArrayQueue(int)

```
1、源码：
    // MpscUnboundedArrayQueue.java
    public MpscUnboundedArrayQueue(int chunkSize)
    {
        super(chunkSize); // 调用父类的含参构造方法
    }

    // BaseMpscLinkedArrayQueue.java
    /**
     * @param initialCapacity the queue initial capacity. If chunk size is fixed this will be the chunk size.
     *                        Must be 2 or more.
     */
    public BaseMpscLinkedArrayQueue(final int initialCapacity)
    {
        // 校验队列容量值，大小必须不小于2
        RangeUtil.checkGreaterThanOrEqual(initialCapacity, 2, "initialCapacity");

        // 通过传入的参数通过Pow2算法获取大于initialCapacity最近的一个2的n次方的值
        int p2capacity = Pow2.roundToPowerOfTwo(initialCapacity);
        // leave lower bit of mask clear
        long mask = (p2capacity - 1) << 1; // 通过p2capacity计算获得mask值，该值后续将用作扩容的值
        // need extra element to point at next array
        E[] buffer = allocate(p2capacity + 1); // 默认分配一个 p2capacity + 1 大小的数据缓冲区
        producerBuffer = buffer;
        producerMask = mask;
        consumerBuffer = buffer;
        consumerMask = mask;
        // 同时用mask作为初始化队列的Limit值，当生产者指针producerIndex超过该Limit值时就需要做扩容处理
        soProducerLimit(mask); // we know it's all empty to start with
    }

    // RangeUtil.java
    public static int checkGreaterThanOrEqual(int n, int expected, String name)
    {
        // 要求队列的容量值必须不小于 expected 值，这个 expected 值由上层决定，但是对 MpscUnboundedArrayQueue 而言，expected 为 2；
        // 那么就是说 MpscUnboundedArrayQueue 的值必须不小于 2；
        if (n < expected)
        {
            throw new IllegalArgumentException(name + ": " + n + " (expected: >= " + expected + ')');
        }

        return n;
    }

2、通过调用父类的构造方法，分配了一个数据缓冲区，初始化容量大小，并且容量值不小于2，差不多就这样队列的实例化操作已经完成了；
```

### 3.2、offer(E)

```
1、源码：
    // BaseMpscLinkedArrayQueue.java
    @Override
    public boolean offer(final E e)
    {
        if (null == e) // 待添加的元素e不允许为空，否则抛空指针异常
        {
            throw new NullPointerException();
        }

        long mask;
        E[] buffer;
        long pIndex;

        while (true)
        {
            long producerLimit = lvProducerLimit(); // 获取当前数据Limit的阈值
            pIndex = lvProducerIndex(); // 获取当前生产者指针位置
            // lower bit is indicative of resize, if we see it we spin until it's cleared
            if ((pIndex & 1) == 1)
            {
                continue;
            }
            // pIndex is even (lower bit is 0) -> actual index is (pIndex >> 1)

            // mask/buffer may get changed by resizing -> only use for array access after successful CAS.
            mask = this.producerMask;
            buffer = this.producerBuffer;
            // a successful CAS ties the ordering, lv(pIndex) - [mask/buffer] -> cas(pIndex)

            // assumption behind this optimization is that queue is almost always empty or near empty
            if (producerLimit <= pIndex) // 当阈值小于等于生产者指针位置时，则需要扩容，否则直接通过CAS操作对pIndex做加2处理
            {
                // 通过offerSlowPath返回状态值，来查看怎么来处理这个待添加的元素
                int result = offerSlowPath(mask, pIndex, producerLimit);
                switch (result)
                {
                    case CONTINUE_TO_P_INDEX_CAS:
                        break;
                    case RETRY: // 可能由于并发原因导致CAS失败，那么则再次重新尝试添加元素
                        continue;
                    case QUEUE_FULL: // 队列已满，直接返回false操作
                        return false;
                    case QUEUE_RESIZE: // 队列需要扩容操作
                        resize(mask, buffer, pIndex, e); // 对队列进行直接扩容操作
                        return true;
                }
            }

            // 能走到这里，则说明当前的生产者指针位置还没有超过阈值，因此直接通过CAS操作做加2处理
            if (casProducerIndex(pIndex, pIndex + 2))
            {
                break;
            }
        }
        // INDEX visible before ELEMENT
        // 获取计算需要添加元素的位置
        final long offset = modifiedCalcElementOffset(pIndex, mask);
        // 在buffer的offset位置添加e元素
        soElement(buffer, offset, e); // release element e
        return true;
    }

    // BaseMpscLinkedArrayQueueProducerFields.java
    @Override
    public final long lvProducerIndex()
    {
        // 通过Unsafe对象调用native方法，获取生产者指针位置
        return UNSAFE.getLongVolatile(this, P_INDEX_OFFSET);
    }

    // UnsafeRefArrayAccess.java
    /**
     * An ordered store(store + StoreStore barrier) of an element to a given offset
     *
     * @param buffer this.buffer
     * @param offset computed via {@link UnsafeRefArrayAccess#calcElementOffset}
     * @param e      an orderly kitty
     */
    public static <E> void soElement(E[] buffer, long offset, E e)
    {
        // 通过Unsafe对象调用native方法，将元素e设置到buffer缓冲区的offset位置
        UNSAFE.putOrderedObject(buffer, offset, e);
    }

2、此方法为添加新的元素对象，当pIndex指针超过阈值producerLimit时则扩容处理，否则直接通过CAS操作添加记录pIndex位置；
```

### 3.3、offerSlowPath(long, long, long)

```
1、源码：
    // BaseMpscLinkedArrayQueue.java
    /**
     * We do not inline resize into this method because we do not resize on fill.
     */
    private int offerSlowPath(long mask, long pIndex, long producerLimit)
    {
        // 获取消费者指针
        final long cIndex = lvConsumerIndex();
        // 获取当前缓冲区的容量值，getCurrentBufferCapacity方法由子类MpscUnboundedArrayQueue实现，默认返回mask值
        long bufferCapacity = getCurrentBufferCapacity(mask);

        // 如果消费指针加上容量值如果超过了生产指针，那么则会尝试进行扩容处理
        if (cIndex + bufferCapacity > pIndex)
        {
            if (!casProducerLimit(producerLimit, cIndex + bufferCapacity))
            {
                // retry from top
                return RETRY;
            }
            else
            {
                // continue to pIndex CAS
                return CONTINUE_TO_P_INDEX_CAS;
            }
        }
        // full and cannot grow 子类MpscUnboundedArrayQueue默认返回Integer.MAX_VALUE值，所以不会进入此分支
        else if (availableInQueue(pIndex, cIndex) <= 0)
        {
            // offer should return false;
            return QUEUE_FULL;
        }
        // grab index for resize -> set lower bit 尝试扩容队列
        else if (casProducerIndex(pIndex, pIndex + 1))
        {
            // trigger a resize
            return QUEUE_RESIZE;
        }
        else
        {
            // failed resize attempt, retry from top
            return RETRY;
        }
    }

    // MpscUnboundedArrayQueue.java
    @Override
    protected long getCurrentBufferCapacity(long mask)
    {
        // 获取当前缓冲区的容量值
        return mask;
    }

    // BaseMpscLinkedArrayQueue.java
    final boolean casProducerLimit(long expect, long newValue)
    {
        // 通过CAS尝试对阈值进行修改扩容处理
        return UNSAFE.compareAndSwapLong(this, P_LIMIT_OFFSET, expect, newValue);
    }

    // MpscUnboundedArrayQueue.java
    @Override
    protected long availableInQueue(long pIndex, long cIndex)
    {
        // 获取可用容量值
        return Integer.MAX_VALUE;
    }

    // BaseMpscLinkedArrayQueueProducerFields.java
    final boolean casProducerIndex(long expect, long newValue)
    {
        // 通过CAS操作更新生产者指针
        return UNSAFE.compareAndSwapLong(this, P_INDEX_OFFSET, expect, newValue);
    }

2、该方法主要通过一系列的if...else判断，并结合子类MpscUnboundedArrayQueue的一些重写方法来判断针对该新添加的元素要做何种状态处理；
```

### 3.4、resize(long, E[], long, E)

```
1、源码：
    // BaseMpscLinkedArrayQueue.java
    private void resize(long oldMask, E[] oldBuffer, long pIndex, E e)
    {
        // 获取oldBuffer的长度值
        int newBufferLength = getNextBufferSize(oldBuffer);
        // 重新创建新的缓冲区
        final E[] newBuffer = allocate(newBufferLength);

        producerBuffer = newBuffer; // 将新创建的缓冲区赋值到生产者缓冲区对象上
        final int newMask = (newBufferLength - 2) << 1;
        producerMask = newMask;

        // 根据oldMask获取偏移位置值
        final long offsetInOld = modifiedCalcElementOffset(pIndex, oldMask);
        // 根据newMask获取偏移位置值
        final long offsetInNew = modifiedCalcElementOffset(pIndex, newMask);

        // 将元素e设置到新的缓冲区newBuffer的offsetInNew位置处
        soElement(newBuffer, offsetInNew, e);// element in new array

        // 通过nextArrayOffset(oldMask)计算新的缓冲区将要放置旧的缓冲区的哪个位置
        // 将新的缓冲区newBuffer设置到旧的缓冲区oldBuffer的nextArrayOffset(oldMask)位置处
        // 主要是将oldBuffer中最后一个元素的位置指向新的缓冲区newBuffer
        // 这样就构成了一个单向链表指向的关系
        soElement(oldBuffer, nextArrayOffset(oldMask), newBuffer);// buffer linked

        // ASSERT code
        final long cIndex = lvConsumerIndex();
        final long availableInQueue = availableInQueue(pIndex, cIndex);
        RangeUtil.checkPositive(availableInQueue, "availableInQueue");

        // Invalidate racing CASs
        // We never set the limit beyond the bounds of a buffer
        // 重新扩容阈值，因为availableInQueue反正都是Integer.MAX_VALUE值，所以自然就取mask值啦
        // 因此针对MpscUnboundedArrayQueue来说，扩容的值其实就是mask的值的大小
        soProducerLimit(pIndex + Math.min(newMask, availableInQueue));

        // make resize visible to the other producers
        // 设置生产者指针加2处理
        soProducerIndex(pIndex + 2);

        // INDEX visible before ELEMENT, consistent with consumer expectation

        // make resize visible to consumer
        // 用一个空对象来衔接新老缓冲区，凡是在缓冲区中碰到JUMP对象的话，那么就得琢磨着准备着获取下一个缓冲区的数据元素了
        soElement(oldBuffer, offsetInOld, JUMP);
    }

    // MpscUnboundedArrayQueue.java
    @Override
    protected int getNextBufferSize(E[] buffer)
    {
        // 获取buffer缓冲区的长度
        return length(buffer);
    }

    // LinkedArrayQueueUtil.java
    static int length(Object[] buf)
    {
        // 直接通过length属性来获取数组的长度
        return buf.length;
    }

    // CircularArrayOffsetCalculator.java
    @SuppressWarnings("unchecked")
    public static <E> E[] allocate(int capacity)
    {
        // 根据容量值创建数组
        return (E[]) new Object[capacity];
    }

2、该方法主要完成新的元素的放置，同时也完成了扩容操作，采用单向链表指针关系，将原缓冲区和新创建的缓冲区衔接起来；
```

### 3.5、poll()

```
1、源码：
    // BaseMpscLinkedArrayQueue.java
    /**
     * {@inheritDoc}
     * <p>
     * This implementation is correct for single consumer thread use only.
     */
    @SuppressWarnings("unchecked")
    @Override
    public E poll()
    {
        final E[] buffer = consumerBuffer; // 获取缓冲区的数据
        final long index = consumerIndex;
        final long mask = consumerMask;

        // 根据消费指针与mask来获取当前需要从哪个位置开始来移除元素
        final long offset = modifiedCalcElementOffset(index, mask);
        // 从buffer缓冲区的offset位置获取元素内容
        Object e = lvElement(buffer, offset);// LoadLoad
        if (e == null) // 如果元素为null的话
        {
            // 则再探讨看看消费指针是不是和生产指针是不是相同
            if (index != lvProducerIndex())
            {
                // poll() == null iff queue is empty, null element is not strong enough indicator, so we must
                // check the producer index. If the queue is indeed not empty we spin until element is
                // visible.
                // 若不相同的话，则先尝试从buffer缓冲区的offset位置获取元素先，若获取元素为null则结束while处理
                do
                {
                    e = lvElement(buffer, offset);
                }
                while (e == null);
            }
            // 说明消费指针是不是和生产指针是相等的，那么则缓冲区的数据已经被消费完了，直接返回null即可
            else
            {
                return null;
            }
        }

        // 如果元素为JUMP空对象的话，那么意味着我们就得获取下一缓冲区进行读取数据了
        if (e == JUMP)
        {
            //
            final E[] nextBuffer = getNextBuffer(buffer, mask);
            //
            return newBufferPoll(nextBuffer, index);
        }

        // 能执行到这里，说明需要移除的元素既不是空的，也不是JUMP空对象，那么则就按照正常处理置空即可
        // 移除元素时，则将buffer缓冲区的offset位置的元素置为空即可
        soElement(buffer, offset, null); // release element null
        // 同时也通过CAS操作增加消费指针的关系，加2操作
        soConsumerIndex(index + 2); // release cIndex
        return (E) e;
    }

    // BaseMpscLinkedArrayQueueProducerFields.java
    @Override
    public final long lvProducerIndex()
    {
        // 通过Unsafe对象调用native方法，获取当前生产者指针值
        return UNSAFE.getLongVolatile(this, P_INDEX_OFFSET);
    }

    // UnsafeRefArrayAccess.java
    /**
     * A volatile load (load + LoadLoad barrier) of an element from a given offset.
     *
     * @param buffer this.buffer
     * @param offset computed via {@link UnsafeRefArrayAccess#calcElementOffset(long)}
     * @return the element at the offset
     */
    @SuppressWarnings("unchecked")
    public static <E> E lvElement(E[] buffer, long offset)
    {
        // 通过Unsafe对象调用native方法，获取buffer缓冲区offset位置的元素
        return (E) UNSAFE.getObjectVolatile(buffer, offset);
    }

    // BaseMpscLinkedArrayQueue.java
    @SuppressWarnings("unchecked")
    private E[] getNextBuffer(final E[] buffer, final long mask)
    {
        // 获取下一个缓冲区的偏移位置值
        final long offset = nextArrayOffset(mask);
        // 从buffer缓冲区的offset位置获取下一个缓冲区数组
        final E[] nextBuffer = (E[]) lvElement(buffer, offset);
        // 获取出来后，同时将buffer缓冲区的offset位置置为空，代表指针已经被取出，原来位置没用了，清空即可
        soElement(buffer, offset, null);
        return nextBuffer;
    }

    // BaseMpscLinkedArrayQueue.java
    private E newBufferPoll(E[] nextBuffer, long index)
    {
        // 从下一个新的缓冲区中找到需要移除数据的指针位置
        final long offset = newBufferAndOffset(nextBuffer, index);
        // 从newBuffer新的缓冲区中offset位置取出元素
        final E n = lvElement(nextBuffer, offset);// LoadLoad
        if (n == null) // 若取出的元素为空，则直接抛出异常
        {
            throw new IllegalStateException("new buffer must have at least one element");
        }
        // 如果取出的元素不为空，那么先将这个元素原先的位置内容先清空掉
        soElement(nextBuffer, offset, null);// StoreStore
        // 然后通过Unsafe对象调用native方法，修改消费指针的数值偏移加2处理
        soConsumerIndex(index + 2);
        return n;
    }

2、该方法主要阐述了该队列是如何的移除数据的；取出的数据如果为JUMP空对象的话，那么则准备从下一个缓冲区获取数据元素，否则还是从当前的缓冲区对象中移除元素，并且更新消费指针；
```

### 3.6、size()

```
1、源码：
    // BaseMpscLinkedArrayQueue.java
    @Override
    public final int size()
    {
        // NOTE: because indices are on even numbers we cannot use the size util.

        /*
         * It is possible for a thread to be interrupted or reschedule between the read of the producer and
         * consumer indices, therefore protection is required to ensure size is within valid range. In the
         * event of concurrent polls/offers to this method the size is OVER estimated as we read consumer
         * index BEFORE the producer index.
         */
        long after = lvConsumerIndex(); // 获取消费指针
        long size;
        while (true) // 为了防止在获取大小的时候指针发生变化，那么则死循环自旋方式获取大小数值
        {
            final long before = after;
            final long currentProducerIndex = lvProducerIndex(); // 获取生产者指针
            after = lvConsumerIndex(); // 获取消费指针

            // 如果后获取的消费指针after和之前获取的消费指针before相等的话，那么说明此刻还没有指针变化
            if (before == after)
            {
                // 那么则直接通过生产指针直接减去消费指针，然后向偏移一位，即除以2，得出最后size大小
                size = ((currentProducerIndex - after) >> 1);

                // 计算完了之后则直接break中断处理
                break;
            }

            // 若消费指针前后不一致，那么可以说是由于并发原因导致了指针发生了变化；
            // 那么则进行下一次循环继续获取最新的指针值再次进行判断
        }
        // Long overflow is impossible, so size is always positive. Integer overflow is possible for the unbounded
        // indexed queues.
        if (size > Integer.MAX_VALUE)
        {
            return Integer.MAX_VALUE;
        }
        else
        {
            return (int) size;
        }
    }

2、获取缓冲区数据大小其实很简单，就是拿着生产指针减去消费指针，但是为了防止并发操作计算错，才用了死循环的方式计算zise值；
```

### 3.7、isEmpty()

```
1、源码：
    // BaseMpscLinkedArrayQueue.java
    @Override
    public final boolean isEmpty()
    {
        // Order matters!
        // Loading consumer before producer allows for producer increments after consumer index is read.
        // This ensures this method is conservative in it's estimate. Note that as this is an MPMC there is
        // nothing we can do to make this an exact method.
        // 这个就简单了，直接判断消费指针和生产指针是不是相等就知道了
        return (this.lvConsumerIndex() == this.lvProducerIndex());
    }

2、通过前面我们已经知道了，添加数据的话生产指针在不停的累加操作，而做移除数据的时候消费指针也在不停的累加操作；

3、那么这种指针总会有一天会碰面的吧，碰面的那个时候则是数据已经空空如也的时刻；
```

## 四、性能测试

```
1、测试Demo：
/**
 * 比较队列的消耗情况。
 *
 * @author hmilyylimh
 * ^_^
 * @version 0.0.1
 * ^_^
 * @date 2018/3/30
 */
public class CompareQueueCosts {

    /** 生产者数量 */
    private static int COUNT_OF_PRODUCER = 2;

    /** 消费者数量 */
    private static final int COUNT_OF_CONSUMER = 1;

    /** 准备添加的任务数量值 */
    private static final int COUNT_OF_TASK = 1 << 20;

    /** 线程池对象 */
    private static ExecutorService executorService;

    public static void main(String[] args) throws Exception {

        for (int j = 1; j < 7; j++) {
            COUNT_OF_PRODUCER = (int) Math.pow(2, j);
            executorService = Executors.newFixedThreadPool(COUNT_OF_PRODUCER * 2);

            int basePow = 8;
            int capacity = 0;
            for (int i = 1; i <= 3; i++) {
                capacity = 1 << (basePow + i);
                System.out.print("Producers: " + COUNT_OF_PRODUCER + "\t\t");
                System.out.print("Consumers: " + COUNT_OF_CONSUMER + "\t\t");
                System.out.print("Capacity: " + capacity + "\t\t");
                System.out.print("LinkedBlockingQueue: " + testQueue(new LinkedBlockingQueue<Integer>(capacity), COUNT_OF_TASK) + "s" + "\t\t");
                // System.out.print("ArrayList: " + testQueue(new ArrayList<Integer>(capacity), COUNT_OF_TASK) + "s" + "\t\t");
                // System.out.print("LinkedList: " + testQueue(new LinkedList<Integer>(), COUNT_OF_TASK) + "s" + "\t\t");
                System.out.print("MpscUnboundedArrayQueue: " + testQueue(new MpscUnboundedArrayQueue<Integer>(capacity), COUNT_OF_TASK) + "s" + "\t\t");
                System.out.print("MpscChunkedArrayQueue: " + testQueue(new MpscChunkedArrayQueue<Integer>(capacity), COUNT_OF_TASK) + "s" + "\t\t");
                System.out.println();
            }
            System.out.println();

            executorService.shutdown();
        }
    }

    private static Double testQueue(final Collection<Integer> queue, final int taskCount) throws Exception {
        CompletionService<Long> completionService = new ExecutorCompletionService<Long>(executorService);

        long start = System.currentTimeMillis();
        for (int i = 0; i < COUNT_OF_PRODUCER; i++) {
            executorService.submit(new Producer(queue, taskCount / COUNT_OF_PRODUCER));
        }
        for (int i = 0; i < COUNT_OF_CONSUMER; i++) {
            completionService.submit((new Consumer(queue, taskCount / COUNT_OF_CONSUMER)));
        }

        for (int i = 0; i < COUNT_OF_CONSUMER; i++) {
            completionService.take().get();
        }

        long end = System.currentTimeMillis();
        return Double.parseDouble("" + (end - start)) / 1000;
    }

    private static class Producer implements Runnable {
        private Collection<Integer> queue;
        private int taskCount;

        public Producer(Collection<Integer> queue, int taskCount) {
            this.queue = queue;
            this.taskCount = taskCount;
        }

        @Override
        public void run() {
            // Queue队列
            if (this.queue instanceof Queue) {
                Queue<Integer> tempQueue = (Queue<Integer>) this.queue;
                while (this.taskCount > 0) {
                    if (tempQueue.offer(this.taskCount)) {
                        this.taskCount--;
                    } else {
                        // System.out.println("Producer offer failed.");
                    }
                }
            }
            // List列表
            else if (this.queue instanceof List) {
                List<Integer> tempList = (List<Integer>) this.queue;
                while (this.taskCount > 0) {
                    if (tempList.add(this.taskCount)) {
                        this.taskCount--;
                    } else {
                        // System.out.println("Producer offer failed.");
                    }
                }
            }
        }
    }

    private static class Consumer implements Callable<Long> {
        private Collection<Integer> queue;
        private int taskCount;

        public Consumer(Collection<Integer> queue, int taskCount) {
            this.queue = queue;
            this.taskCount = taskCount;
        }

        @Override
        public Long call() {
            // Queue队列
            if (this.queue instanceof Queue) {
                Queue<Integer> tempQueue = (Queue<Integer>) this.queue;
                while (this.taskCount > 0) {
                    if ((tempQueue.poll()) != null) {
                        this.taskCount--;
                    }
                }
            }
            // List列表
            else if (this.queue instanceof List) {
                List<Integer> tempList = (List<Integer>) this.queue;
                while (this.taskCount > 0) {
                    if (!tempList.isEmpty() && (tempList.remove(0)) != null) {
                        this.taskCount--;
                    }
                }
            }
            return 0L;
        }
    }
}

2、指标结果：
Producers: 2        Consumers: 1        Capacity: 512       LinkedBlockingQueue: 1.399s     MpscUnboundedArrayQueue: 0.109s     MpscChunkedArrayQueue: 0.09s
Producers: 2        Consumers: 1        Capacity: 1024      LinkedBlockingQueue: 1.462s     MpscUnboundedArrayQueue: 0.041s     MpscChunkedArrayQueue: 0.048s
Producers: 2        Consumers: 1        Capacity: 2048      LinkedBlockingQueue: 0.281s     MpscUnboundedArrayQueue: 0.037s     MpscChunkedArrayQueue: 0.082s

Producers: 4        Consumers: 1        Capacity: 512       LinkedBlockingQueue: 0.681s     MpscUnboundedArrayQueue: 0.085s     MpscChunkedArrayQueue: 0.133s
Producers: 4        Consumers: 1        Capacity: 1024      LinkedBlockingQueue: 0.405s     MpscUnboundedArrayQueue: 0.094s     MpscChunkedArrayQueue: 0.172s
Producers: 4        Consumers: 1        Capacity: 2048      LinkedBlockingQueue: 0.248s     MpscUnboundedArrayQueue: 0.107s     MpscChunkedArrayQueue: 0.153s

Producers: 8        Consumers: 1        Capacity: 512       LinkedBlockingQueue: 1.523s     MpscUnboundedArrayQueue: 0.093s     MpscChunkedArrayQueue: 0.172s
Producers: 8        Consumers: 1        Capacity: 1024      LinkedBlockingQueue: 0.668s     MpscUnboundedArrayQueue: 0.094s     MpscChunkedArrayQueue: 0.281s
Producers: 8        Consumers: 1        Capacity: 2048      LinkedBlockingQueue: 0.555s     MpscUnboundedArrayQueue: 0.078s     MpscChunkedArrayQueue: 0.455s

Producers: 16       Consumers: 1        Capacity: 512       LinkedBlockingQueue: 2.676s     MpscUnboundedArrayQueue: 0.093s     MpscChunkedArrayQueue: 0.753s
Producers: 16       Consumers: 1        Capacity: 1024      LinkedBlockingQueue: 2.135s     MpscUnboundedArrayQueue: 0.093s     MpscChunkedArrayQueue: 0.792s
Producers: 16       Consumers: 1        Capacity: 2048      LinkedBlockingQueue: 0.944s     MpscUnboundedArrayQueue: 0.098s     MpscChunkedArrayQueue: 0.64s

Producers: 32       Consumers: 1        Capacity: 512       LinkedBlockingQueue: 6.647s     MpscUnboundedArrayQueue: 0.078s     MpscChunkedArrayQueue: 2.109s
Producers: 32       Consumers: 1        Capacity: 1024      LinkedBlockingQueue: 3.893s     MpscUnboundedArrayQueue: 0.095s     MpscChunkedArrayQueue: 1.797s
Producers: 32       Consumers: 1        Capacity: 2048      LinkedBlockingQueue: 2.019s     MpscUnboundedArrayQueue: 0.109s     MpscChunkedArrayQueue: 2.427s

Producers: 64       Consumers: 1        Capacity: 512       LinkedBlockingQueue: 26.59s     MpscUnboundedArrayQueue: 0.078s     MpscChunkedArrayQueue: 3.627s
Producers: 64       Consumers: 1        Capacity: 1024      LinkedBlockingQueue: 22.566s    MpscUnboundedArrayQueue: 0.093s     MpscChunkedArrayQueue: 3.047s
Producers: 64       Consumers: 1        Capacity: 2048      LinkedBlockingQueue: 1.719s     MpscUnboundedArrayQueue: 0.093s     MpscChunkedArrayQueue: 2.549s

3、结果分析(一)：
通过结果打印耗时可以明显看到MpscUnboundedArrayQueue耗时几乎大多数都是不超过0.1s的，这添加、删除的操作效率不是一般的高，这也难怪人家netty要舍弃自己写的队列框架了；

4、结果分析(二)：
CompareQueueCosts代码里面我将ArrayList、LinkedList注释掉了，那是因为队列数量太大，List的操作太慢，效率低下，所以在大量并发的场景下，大家还是能避免则尽量避免，否则就遭殃了；
```

## 五、总结

```
1、通过底层无锁的Unsafe操作方式实现了多生产者同时访问队列的线程安全模型；

2、由于使用锁会造成的线程切换，特别消耗资源，因此使用无锁而是采用CAS的操作方式，虽然会在一定程度上造成CPU使用率过高，但是整体上将效率还是听可观的；

3、队列的数据结构是一种单向链表式的结构，通过生产、消费指针来标识添加、移除元素的指针位置，缓冲区与缓冲区之间通过指针指向，避免的数组的复制，较少了大量内存的占用情况；
```