

# Spring

## 设计模式

### 单例

### 工厂

### 适配器

根据不同商家适配

### 责任链

继承 process 链路执行

## 源码

### IOC

>[spring ioc](/md/analysis/spring/spring-ioc.md)



### AOP

>[漫画:AOP 面试造火箭事件始末](https://mp.weixin.qq.com/s/NXZp8a3n-ssnC6Y1Hy9lzw)
>
>[给冰冰看的SpringAOP面试题](https://mp.weixin.qq.com/s/qlAvW10TRNVak1oJyHO39Q)

#### JDK代理

#### Cglib代理

与JDK动态代理相比，cglib可以实现对一般类的代理而无需实现接口。在上例中通过下列步骤来生成目标类Target的代理类：

1. 创建Enhancer实例
2. 通过setSuperclass方法来设置目标类
3. 通过setCallback 方法来设置拦截对象
4. create方法生成Target的代理类，并返回代理类的实例

```java
public class Target{
    public void f(){
        System.out.println("Target f()");
    }
    public void g(){
        System.out.println("Target g()");
    }
}

public class Interceptor implements MethodInterceptor {
    @Override
    public Object intercept(Object obj, Method method, Object[] args,    MethodProxy proxy) throws Throwable {
        System.out.println("I am intercept begin");
//Note: 此处一定要使用proxy的invokeSuper方法来调用目标类的方法
        proxy.invokeSuper(obj, args);
        System.out.println("I am intercept end");
        return null;
    }
}

public class Test {
    public static void main(String[] args) {
         //实例化一个增强器，也就是cglib中的一个class generator
        Enhancer eh = new Enhancer();
         //设置目标类
        eh.setSuperclass(Target.class);
        // 设置拦截对象
        eh.setCallback(new Interceptor());
        // 生成代理类并返回一个实例
        Target t = (Target) eh.create();
        t.f();
        t.h();
    }
}
```

##### 原理

>[cglib源码分析（四）：cglib 动态代理原理分析](https://www.cnblogs.com/cruze/p/3865180.html)

```java
1 public class Target$$EnhancerByCGLIB$$788444a0 extends Target implements Factory
 2 {
 3     private boolean CGLIB$BOUND;
 4     private static final ThreadLocal CGLIB$THREAD_CALLBACKS;
 5     private static final Callback[] CGLIB$STATIC_CALLBACKS;
 6     private MethodInterceptor CGLIB$CALLBACK_0;
 7     private static final Method CGLIB$g$0$Method;
 8     private static final MethodProxy CGLIB$g$0$Proxy;
 9     private static final Object[] CGLIB$emptyArgs;
10     private static final Method CGLIB$f$1$Method;
11     private static final MethodProxy CGLIB$f$1$Proxy;
12     
13     static void CGLIB$STATICHOOK1()
14     {
15       CGLIB$THREAD_CALLBACKS = new ThreadLocal();
16       CGLIB$emptyArgs = new Object[0];
17       Class localClass1 = Class.forName("net.sf.cglib.test.Target$$EnhancerByCGLIB$$788444a0");
18       Class localClass2;
19       Method[] tmp60_57 = ReflectUtils.findMethods(new String[] { "g", "()V", "f", "()V" }, (localClass2 = Class.forName("net.sf.cglib.test.Target")).getDeclaredMethods());
20       CGLIB$g$0$Method = tmp60_57[0];
21       CGLIB$g$0$Proxy = MethodProxy.create(localClass2, localClass1, "()V", "g", "CGLIB$g$0");
22       CGLIB$f$1$Method = tmp60_57[1];
23       CGLIB$f$1$Proxy = MethodProxy.create(localClass2, localClass1, "()V", "f", "CGLIB$f$1");
25     }
26     
27     final void CGLIB$g$0()
28     {
29       super.g();
30     }
31     
32     public final void g()
33     {
34       MethodInterceptor tmp4_1 = this.CGLIB$CALLBACK_0;
35       if (tmp4_1 == null)
36       {
37           CGLIB$BIND_CALLBACKS(this);
38           tmp4_1 = this.CGLIB$CALLBACK_0;
39       }
40       if (this.CGLIB$CALLBACK_0 != null) {
41           tmp4_1.intercept(this, CGLIB$g$0$Method, CGLIB$emptyArgs, CGLIB$g$0$Proxy);
42       }
43       else{
44           super.g();
45       }
46     }
47 }
```

代理类（Target$$EnhancerByCGLIB$$788444a0）继承了目标类（Target）。代理类为每个目标类的方法生成两个方法，例如针对目标类中的每个非private方法，代理类会生成两个方法，以g方法为例：一个是@Override的g方法，一个是CGLIB$g$0（CGLIB$g$0相当于目标类的g方法）。我们在示例代码中调用目标类的方法t.g()时，实际上调用的是代理类中的g()方法。接下来我们着重分析代理类中的g方法，看看是怎么实现的代理功能。

   当调用代理类的g方法时，先判断是否已经存在实现了MethodInterceptor接口的拦截对象，如果没有的话就调用CGLIB$BIND_CALLBACKS方法来获取拦截对象

CGLIB$BIND_CALLBACKS 先从CGLIB$THREAD_CALLBACKS中get拦截对象，如果获取不到的话，再从CGLIB$STATIC_CALLBACKS来获取，如果也没有则认为该方法不需要代理。

**那么拦截对象是如何设置到CGLIB$THREAD_CALLBACKS 或者 CGLIB$STATIC_CALLBACKS中的呢？**

在Jdk动态代理中拦截对象是在实例化代理类时由构造函数传入的，在cglib中是调用Enhancer的firstInstance方法来生成代理类实例并设置拦截对象的。firstInstance的调用轨迹为：

1. Enhancer：firstInstance
2. Enhancer：createUsingReflection
3. Enhancer：setThreadCallbacks
4. Enhancer：setCallbacksHelper
5. Target$$EnhancerByCGLIB$$788444a0 ： CGLIB$SET_THREAD_CALLBACKS

在CGLIB$SET_THREAD_CALLBACKS方法中调用了CGLIB$THREAD_CALLBACKS的set方法来保存拦截对象，在CGLIB$BIND_CALLBACKS方法中使用了CGLIB$THREAD_CALLBACKS的get方法来获取拦截对象，并保存到CGLIB$CALLBACK_0中。这样，在我们调用代理类的g方法时，就可以获取到我们设置的拦截对象，然后通过  *tmp4_1.intercept(this, CGLIB$g$0$Method, CGLIB$emptyArgs, CGLIB$g$0$Proxy)* 来实现代理。这里来解释一下intercept方法的参数含义：

- @para1 obj ：代理对象本身
- @para2 method ： 被拦截的方法对象
- @para3 args：方法调用入参
- @para4 proxy：用于调用被拦截方法的方法代理对象

这里会有一个疑问，为什么不直接反射调用代理类生成的（CGLIB$g$0）来间接调用目标类的被拦截方法，而使用proxy的invokeSuper方法呢？这里就涉及到了另外一个点— FastClass 。

**Fastclass 机制分析**

 Jdk动态代理的拦截对象是通过反射的机制来调用被拦截方法的，反射的效率比较低，所以cglib采用了FastClass的机制来实现对被拦截方法的调用。FastClass机制就是对一个类的方法建立索引，通过索引来直接调用相应的方法



## Bean

### 生命周期

- 扫描类
  - invokeBeanFactoryPostProcessors
- 封装beanDefinition对象 各种信息
- 放到map
- 遍历map
- 验证
  - 能不能实例化 需要实例化么 根据信息来
  - 是否单例等等
  - 判断是不是factory bean
  - 单例池 只是一个ConcurrentHashMap而已
  - 正在创建的 容器
- 得到 class
- 推断构造方法
  - 根据注入模型
  - 默认
- 得到构造方法
- 反射 实例化这个对象
- 后置处理器合并beanDefinition
- 判断是否允许 循环依赖
- 提前暴露bean工厂对象
- 填充属性
  - 自动注入
- 执行部分 aware 接口
- 继续执行部分 aware 接口 生命周期回调方法
- 完成代理AOP
- beanProstprocessor 的前置方法
- 实例化为bean
- 放到单例池
- 销毁

### 作用域

- 单例（singleton）
- 多例（prototype）
- Request
- Session

## 循环依赖

- 情况
  - 属性注入可以破解
  - 构造器不行
    - 三级缓存没自己 因二级之后去加载B了
- 三级缓存
  - 去单例池拿
  - 判断是不是正在被创建的
  - 判断是否 支持循环依赖
  - 二级缓存 放到 三级缓存
  - 干掉二级缓存
    - GC
  - 下次再来直接 三级缓存拿 缓存
- 缓存 存放
  - 一级缓存 单例Bean
  - 二级缓存 工厂 产生baen
    - 产生bean 复杂
  - 三级缓存 半成品

## 父子容器

## 事务

### 实现原理

- 采用不同的连接器
- 用AOP 新建立了一个 链接
  - 共享链接
- ThreadLocal 当前事务
- 前提是 关闭AutoCommit



## 类加载机制

### 过程

- 加载
  - 生成一个class对象
- 验证
  - 文件格式验证
  - 元数据验证
  - 字节码验证
  - 符号引用验证
- 准备
  - 默认值
  - static会分配内存
- 解析
  - 解析具体类的信息
    - 引用等
- 初始化
  - 父类没初始化 先初始化父类
- 使用
- 卸载

### 加载方式

- main（）
- class。forName
- ClassLoader。loadClass

### 类加载器

- Appclass Loade
- Extention ClassLoader
- Bootstrap ClassLoader

### 双亲委派原则

- 可以避免重复加载
- 安全