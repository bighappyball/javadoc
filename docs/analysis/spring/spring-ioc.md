## IoC 理论

[谈谈对 Spring IoC 的理解](https://www.cnblogs.com/xdp-gacl/p/4249939.html)  
[Spring 的 IoC 原理](https://blog.csdn.net/m13666368773/article/details/7802126)  
[Spring IoC 原理](https://blog.csdn.net/it_man/article/details/4402245)

IoC 全称为 Inversion of Control，翻译为 “控制反转”，不是什么技术，而是一种设计思想, 它还有一个别名为 DI（Dependency Injection）,即依赖注入。所谓 IoC ，就是由 Spring IoC 容器来负责对象的生命周期和对象之间的关系

如何理解“控制反转”好呢？理解好它的关键在于我们需要回答如下四个问题：
1. 谁控制谁?  在传统的开发模式下，我们都是采用直接 new 一个对象的方式来创建对象，也就是说你依赖的对象直接由你自己控制，但是有了 IoC 容器后，则直接由 IoC 容器来控制。所以“谁控制谁”，当然是 IoC 容器控制对象
2. 控制什么? 控制对象。
3. 为何是反转? 没有 IoC 的时候我们都是在自己对象中主动去创建被依赖的对象，这是正转。但是有了 IoC 后，所依赖的对象直接由 IoC 容器创建后注入到被注入的对象中，依赖的对象由原来的主动获取变成被动接受，所以是反转。
4. 哪些方面反转了? 所依赖对象的获取被反转了。

### 注入形式

IoC Service Provider 为被注入对象提供被依赖对象也有如下几种方式：构造方法注入、stter方法注入、接口注入。

接口方式注入显得比较霸道，因为它需要被依赖的对象实现不必要的接口，带有侵入性。一般都不推荐这种方式。

## IoC各个组件

![alt IoC各个组件](../../_media/analysis/spring/企业微信截图_20221213163541.png)  

该图为 ClassPathXmlApplicationContext 的类继承体系结构，虽然只有一部分，但是它基本上包含了 IoC 体系中大部分的核心类和接口。

### Resource 体系

org.springframework.core.io.Resource，对资源的抽象。它的每一个实现类都代表了一种资源的访问策略，如 ClassPathResource、RLResource、FileSystemResource 等。

![alt Resource](/../../_media/analysis/spring/企业微信截图_20221213163941.png)  

### ResourceLoader 体系

有了资源，就应该有资源加载，Spring 利用 org.springframework.core.io.ResourceLoader 来进行统一资源加载，类图如下：

![alt Resource](/../../_media/analysis/spring/企业微信截图_20221213164138.png)  

### BeanFactory 体系

org.springframework.beans.factory.BeanFactory，是一个非常纯粹的 bean 容器，它是 IoC 必备的数据结构，其中 BeanDefinition 是它的基本结构。BeanFactory 内部维护着一个BeanDefinition map ，并可根据 BeanDefinition 的描述进行 bean 的创建和管理。

BeanFactory 有三个直接子类 ListableBeanFactory、HierarchicalBeanFactory 和 AutowireCapableBeanFactory 。  
DefaultListableBeanFactory 为最终默认实现，它实现了所有接口。

![alt Resource](/../../_media/analysis/spring/企业微信截图_20221213164244.png)  

### BeanDefinition 体系

org.springframework.beans.factory.config.BeanDefinition ，用来描述 Spring 中的 Bean 对象。

![alt Resource](/../../_media/analysis/spring/企业微信截图_20221213164357.png)  

### BeanDefinitionReader 体系

org.springframework.beans.factory.support.BeanDefinitionReader 的作用是读取 Spring 的配置文件的内容，并将其转换成 Ioc 容器内部的数据结构 ：BeanDefinition 。

![alt Resource](/../../_media/analysis/spring/企业微信截图_20221213164453.png)  

### ApplicationContext 体系

org.springframework.context.ApplicationContext ，这个就是大名鼎鼎的 Spring 容器，它叫做应用上下文，与我们应用息息相关。它继承 BeanFactory ，所以它是 BeanFactory 的扩展升级版，如果BeanFactory 是屌丝的话，那么 ApplicationContext 则是名副其实的高富帅。由于 ApplicationContext 的结构就决定了它与 BeanFactory 的不同，其主要区别有：

* 继承 org.springframework.context.MessageSource 接口，提供国际化的标准访问策略。
* 继承 org.springframework.context.ApplicationEventPublisher 接口，提供强大的事件机制。
* 扩展 ResourceLoader ，可以用来加载多种 Resource ，可以灵活访问不同的资源。
* 对 Web 应用的支持。

![alt Resource](/../../_media/analysis/spring/企业微信截图_20221213164658.png)

通过上面五个体系，我们可以看出，IoC 主要由 spring-beans 和 spring-context 项目，进行实现。

## 统一资源加载策略

在学 Java SE 的时候，我们学习了一个标准类 `java.net.URL`，该类在 Java SE 中的定位为统一资源定位器（Uniform Resource Locator），但是我们知道它的实现基本只限于网络形式发布的资源的查找和定位。然而，实际上资源的定义比较广泛，除了网络形式的资源，还有以二进制形式存在的、以文件形式存在的、以字节流形式存在的等等。而且它可以存在于任何场所，比如网络、文件系统、应用程序中。所以 `java.net.URL` 的局限性迫使 Spring 必须实现自己的资源加载策略，该资源加载策略需要满足如下要求：

1. 职能划分清楚。资源的定义和资源的加载应该要有一个清晰的**界限**；
2. 统一的抽象。统一的资源**定义**和资源加载**策略**。资源加载后要返回统一的抽象给客户端，客户端要对资源进行怎样的处理，应该由抽象资源接口来界定。









