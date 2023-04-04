## IoC 之深入分析 Aware 接口

﻿AbstractAutowireCapableBeanFactory 的 `#doCreateBean(final String beanName, final RootBeanDefinition mbd, final Object[] args)` 方法，主要干三件事情：

1. 实例化 bean 对象：`#createBeanInstance(String beanName, RootBeanDefinition mbd, Object[] args)` 方法。
2. 属性注入：`#populateBean(String beanName, RootBeanDefinition mbd, BeanWrapper bw)` 方法。
3. 初始化 bean 对象：`#initializeBean(final String beanName, final Object bean, RootBeanDefinition mbd)` 方法。

而初始化 bean 对象时，也是干了三件事情：

1. 激活 Aware 方法
2. 后置处理器的应用
3. 激活自定义的 init 方法

接下来三篇文章将会详细分析这三件事情，这篇主要分析 Aware 接口。

### 1. Aware 接口

`org.springframework.beans.factory.Aware` 接口，定义如下：

```java
/**
 * Marker superinterface indicating that a bean is eligible to be
 * notified by the Spring container of a particular framework object
 * through a callback-style method. Actual method signature is
 * determined by individual subinterfaces, but should typically
 * consist of just one void-returning method that accepts a single
 * argument.
 *
 * <p>Note that merely implementing {@link Aware} provides no default
 * functionality. Rather, processing must be done explicitly, for example
 * in a {@link org.springframework.beans.factory.config.BeanPostProcessor BeanPostProcessor}.
 * Refer to {@link org.springframework.context.support.ApplicationContextAwareProcessor}
 * and {@link org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory}
 * for examples of processing {@code *Aware} interface callbacks.
 *
 * @author Chris Beams
 * @since 3.1
 */
public interface Aware {

}
```

Aware 接口为 Spring 容器的核心接口，是一个具有标识作用的超级接口，实现了该接口的 bean 是具有被 Spring 容器通知的能力，通知的方式是采用**回调**的方式。

Aware 接口是一个空接口，实际的方法签名由各个子接口来确定，且该接口通常只会有一个接收单参数的 set 方法，该 set 方法的命名方式为 set + 去掉接口名中的 Aware 后缀，即 XxxAware 接口，则方法定义为 setXxx()，例如 BeanNameAware（setBeanName），ApplicationContextAware（setApplicationContext）。

Aware 的子接口需要提供一个 `setXxx` 方法，我们知道 set 是设置属性值的方法，即 Aware 类接口的 `setXxx` 方法其实就是设置 xxx 属性值的。 Aware 的含义是感知的、感应的，那么在 Spring 容器中是如何实现感知并设置属性值得呢？我们可以从初始化 bean 中的激活 Aware 的方法 `#invokeAwareMethods(final String beanName, final Object bean)` 中看到一点点，代码如下：

```java
// AbstractAutowireCapableBeanFactory.java

private void invokeAwareMethods(final String beanName, final Object bean) {
	if (bean instanceof Aware) {
	    // BeanNameAware
		if (bean instanceof BeanNameAware) {
			((BeanNameAware) bean).setBeanName(beanName);
		}
		// BeanClassLoaderAware
		if (bean instanceof BeanClassLoaderAware) {
			ClassLoader bcl = getBeanClassLoader();
			if (bcl != null) {
				((BeanClassLoaderAware) bean).setBeanClassLoader(bcl);
			}
		}
		// BeanFactoryAware
		if (bean instanceof BeanFactoryAware) {
			((BeanFactoryAware) bean).setBeanFactory(AbstractAutowireCapableBeanFactory.this);
		}
	}
}
```

- 首先，判断 bean 实例是否属于 Aware 接口的范畴，如果是的话，则调用实例的 `setXxx()` 方法给实例设置 xxx 属性值，在 `#invokeAwareMethods(...)` 方法，主要是设置 beanName，beanClassLoader、BeanFactory 中三个属性值。

### 2. Aware 子类

Spring 提供了一系列的 Aware 接口，如下图（部分）：

![image-20221219142611955](../../_media/analysis/spring/image-20221219142611955.png)

上面只是一部分子类，从这里我们可以看到 Spring 提供的 Aware 接口是是何其多。同时从上图我们也看到了几个比较熟悉的接口，如 BeanClassLoaderAware、BeanFactoryAware、BeanNameAware，下面就这三个接口来做一个简单的演示，先看各自的定义：

```java
public interface BeanClassLoaderAware extends Aware {

    /**
    * 将 BeanClassLoader 提供给 bean 实例回调
    * 在 bean 属性填充之后、初始化回调之前回调，
    * 例如InitializingBean的InitializingBean.afterPropertiesSet（）方法或自定义init方法
    */
    void setBeanClassLoader(ClassLoader classLoader);

}


public interface BeanFactoryAware extends Aware {
    /**
    * 将 BeanFactory 提供给 bean 实例回调
    * 调用时机和 setBeanClassLoader 一样
    */
    void setBeanFactory(BeanFactory beanFactory) throws BeansException;

}


public interface BeanNameAware extends Aware {

    /**
    * 在创建此 bean 的 bean工厂中设置 beanName
    */
    void setBeanName(String name);

}


public interface ApplicationContextAware extends Aware {

    /**
     * 设置此 bean 对象的 ApplicationContext，通常，该方法用于初始化对象
     */
    void setApplicationContext(ApplicationContext applicationContext)
        throws BeansException;

}
```

#### 2.1 示例

下面简单演示下上面四个接口的使用方法：

```java
public class MyApplicationAware implements BeanNameAware,BeanFactoryAware,BeanClassLoaderAware,ApplicationContextAware{

    private String beanName;

    private BeanFactory beanFactory;

    private ClassLoader classLoader;

    private ApplicationContext applicationContext;

    @Override
    public void setBeanClassLoader(ClassLoader classLoader) {
        System.out.println("调用了 BeanClassLoaderAware 的 setBeanClassLoader 方法");
        this.classLoader = classLoader;
    }

    @Override
    public void setBeanFactory(BeanFactory beanFactory) throws BeansException {
        System.out.println("调用了 BeanFactoryAware 的 setBeanFactory 方法");
        this.beanFactory = beanFactory;
    }

    @Override
    public void setBeanName(String name) {
        System.out.println("调用了 BeanNameAware 的 setBeanName 方法");
        this.beanName = name;
    }

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        System.out.println("调用了 ApplicationContextAware 的 setApplicationContext 方法");
        this.applicationContext = applicationContext;
    }

    public void display(){
        System.out.println("beanName:" + beanName);
        System.out.println("是否为单例：" + beanFactory.isSingleton(beanName));
        System.out.println("系统环境为：" + applicationContext.getEnvironment());
    }
}
```

测试方法如下:

```java
public static void main(String[] args) {
    ClassPathResource resource = new ClassPathResource("spring.xml");
    DefaultListableBeanFactory factory = new DefaultListableBeanFactory();
    XmlBeanDefinitionReader reader = new XmlBeanDefinitionReader(factory);
    reader.loadBeanDefinitions(resource);

    MyApplicationAware applicationAware = (MyApplicationAware) factory.getBean("myApplicationAware");
    applicationAware.display();
}
```

运行结果：

![image-20221219143002505](../../_media/analysis/spring/image-20221219143002505.png)

从该运行结果可以看出，这里只执行了三个 Aware 接口的 set 方法，原因就是通过 `#getBean(...)` 方法调用时，在激活 Aware 接口时只检测了 BeanNameAware、BeanClassLoaderAware、BeanFactoryAware 三个 Aware 接口。如果将测试方法调整为下面：

```java
public static void main(String[] args) {
    ApplicationContext applicationContext = new ClassPathXmlApplicationContext("spring.xml");
    MyApplicationAware applicationAware = (MyApplicationAware) applicationContext.getBean("myApplicationAware");
    applicationAware.display();
}
```

则运行结果如下：

![image-20221219143055134](../../_media/analysis/spring/image-20221219143055134.png)

### 3. 小结

从这了我们基本上就可以 Aware 真正的含义是什么了？感知，其实是 Spring 容器在初始化主动检测当前 bean 是否实现了 Aware 接口，如果实现了则回调其 set 方法将相应的参数设置给该 bean ，这个时候该 bean 就从 Spring 容器中取得相应的资源。

最后文章末尾列出部分常用的 Aware 子接口，便于日后查询：

- LoadTimeWeaverAware：加载Spring Bean时织入第三方模块，如AspectJ
- BeanClassLoaderAware：加载Spring Bean的类加载器
- BootstrapContextAware：资源适配器BootstrapContext，如JCA,CCI
- ResourceLoaderAware：底层访问资源的加载器
- BeanFactoryAware：声明BeanFactory
- PortletConfigAware：PortletConfig
- PortletContextAware：PortletContext
- ServletConfigAware：ServletConfig
- ServletContextAware：ServletContext
- MessageSourceAware：国际化
- ApplicationEventPublisherAware：应用事件
- NotificationPublisherAware：JMX通知
- BeanNameAware：声明Spring Bean的名字

## IoC 之深入分析 ﻿BeanPostProcessor

### 1. BeanPostProcessor 接口

﻿Spring 作为优秀的开源框架，它为我们提供了丰富的可扩展点，除了前面提到的 Aware 接口，还包括其他部分，其中一个很重要的就是 BeanPostProcessor。这篇文章主要介绍 BeanPostProcessor 的使用以及其实现原理。我们先看 BeanPostProcessor 的定位：

> BeanPostProcessor 的作用：在 Bean 完成实例化后，如果我们需要对其进行一些配置、增加一些自己的处理逻辑，那么请使用 BeanPostProcessor。

### 2. BeanPostProcessor 示例

首先定义一个类，该类实现 BeanPostProcessor 接口，代码如下：

```java
public class BeanPostProcessorTest implements BeanPostProcessor{

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("Bean [" + beanName + "] 开始初始化");
        // 这里一定要返回 bean，不能返回 null
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("Bean [" + beanName + "] 完成初始化");
        return bean;
    }

    public void display(){
        System.out.println("hello BeanPostProcessor!!!");
    }
}
```

测试方法如下：

```java
ClassPathResource resource = new ClassPathResource("spring.xml");
DefaultListableBeanFactory factory = new DefaultListableBeanFactory();
XmlBeanDefinitionReader reader = new XmlBeanDefinitionReader(factory);
reader.loadBeanDefinitions(resource);

BeanPostProcessorTest test = (BeanPostProcessorTest) factory.getBean("beanPostProcessorTest");
test.display();
```

运行结果：

![image-20221219143522222](../../_media/analysis/spring/image-20221219143522222.png)

运行结果比较奇怪，为什么没有执行 `#postProcessBeforeInitialization(...)` 和 `#postProcessAfterInitialization(...)` 方法呢？

我们 debug 跟踪下代码，这两个方法在 AbstractAutowireCapableBeanFactory 的 `#initializeBean(final String beanName, final Object bean, RootBeanDefinition mbd)` 方法处调用下，如下：

![image-20221219143855274](../../_media/analysis/spring/image-20221219143855274.png)

debug，在 `#postProcessBeforeInitialization(...)`方法中，结果如下：

![image-20221219143922109](../../_media/analysis/spring/image-20221219143922109.png)

这段代码是通过迭代 `#getBeanPostProcessors()` 方法返回的结果集来调用 BeanPostProcessor 的 `#postProcessBeforeInitialization(Object bean, String beanName)` 方法，但是在这里我们看到该方法返回的结果集为空，所以肯定不会执行相应的 `#postProcessBeforeInitialization(Object bean, String beanName)` 方法咯。怎么办？答案不言而喻：只需要 `#getBeanPostProcessors()` 方法，返回的结果集中存在至少一个元素即可，该方法定义如下：

```java
// AbstractBeanFactory.java

/** BeanPostProcessors to apply in createBean. */
private final List<BeanPostProcessor> beanPostProcessors = new CopyOnWriteArrayList<>();

public List<BeanPostProcessor> getBeanPostProcessors() {
    return this.beanPostProcessors;
}
```

- 返回的 `beanPostProcessors` 是一个 `private` 的 List ，也就是说只要该类中存在 `beanPostProcessors.add(BeanPostProcessor beanPostProcessor)` 的调用，我们就找到了入口，在类 AbstractBeanFactory 中找到了如下代码：

  ```java
  // AbstractBeanFactory.java
  
  @Override
  public void addBeanPostProcessor(BeanPostProcessor beanPostProcessor) {
  	Assert.notNull(beanPostProcessor, "BeanPostProcessor must not be null");
  	// Remove from old position, if any
  	this.beanPostProcessors.remove(beanPostProcessor);
  	// Track whether it is instantiation/destruction aware
  	if (beanPostProcessor instanceof InstantiationAwareBeanPostProcessor) {
  		this.hasInstantiationAwareBeanPostProcessors = true;
  	}
  	if (beanPostProcessor instanceof DestructionAwareBeanPostProcessor) {
  		this.hasDestructionAwareBeanPostProcessors = true;
  	}
  	// Add to end of list
  	this.beanPostProcessors.add(beanPostProcessor);
  }
  ```

  - 该方法是由 AbstractBeanFactory 的父类 `org.springframework.beans.factory.config.ConfigurableBeanFactory` 接口定义，它的核心意思就是将指定 BeanPostProcessor 注册到该 BeanFactory 创建的 bean 中，同时它是**按照插入的顺序进行注册的**，完全忽略 Ordered 接口所表达任何排序语义（在 BeanPostProcessor 中我们提供一个 Ordered 顺序，这个后面讲解）。

到这里应该就比较熟悉了，其实只需要显示调用 `#addBeanPostProcessor(BeanPostProcessor beanPostProcessor)` 方法就可以了。加入如下代码：

```java
BeanPostProcessorTest beanPostProcessorTest = new BeanPostProcessorTest();
factory.addBeanPostProcessor(beanPostProcessorTest);
```

运行结果：

![image-20221219144048676](../../_media/analysis/spring/image-20221219144048676.png)

其实还有一种更加简单的方法，这个我们后面再说，先看 BeanPostProcessor 的原理。

### 3. BeanPostProcessor 基本原理

`org.springframework.beans.factory.config.BeanPostProcessor` 接口，代码如下：

```java
public interface BeanPostProcessor {

	@Nullable
	default Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
		return bean;
	}

	@Nullable
	default Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
		return bean;
	}

}
```

BeanPostProcessor 可以理解为是 Spring 的一个工厂钩子（其实 Spring 提供一系列的钩子，如 Aware 、InitializingBean、DisposableBean），它是 Spring 提供的对象实例化阶段强有力的扩展点，允许 Spring 在实例化 bean 阶段对其进行定制化修改，比较常见的使用场景是处理标记接口实现类或者为当前对象提供代理实现（例如 AOP）。

一般普通的 BeanFactory 是不支持自动注册 BeanPostProcessor 的，需要我们手动调用 `#addBeanPostProcessor(BeanPostProcessor beanPostProcessor)` 方法进行注册。注册后的 BeanPostProcessor 适用于所有该 BeanFactory 创建的 bean，但是 **ApplicationContext 可以在其 bean 定义中自动检测所有的 BeanPostProcessor 并自动完成注册，同时将他们应用到随后创建的任何 Bean 中**。

`#postProcessBeforeInitialization(Object bean, String beanName)` 和 `#postProcessAfterInitialization(Object bean, String beanName)` 两个方法，都接收一个 Object 类型的 `bean` ，一个 String 类型的 `beanName` ，其中 `bean` 是已经实例化了的 `instanceBean` ，能拿到这个你是不是可以对它为所欲为了？ 这两个方法是初始化 `bean` 的前后置处理器，他们应用 `#invokeInitMethods(String beanName, final Object bean, RootBeanDefinition mbd)` 方法的前后。如下图：

![image-20221219144450362](../../_media/analysis/spring/image-20221219144450362.png)

代码层次上面已经贴出来，这里再贴一次：

![image-20221219144509954](../../_media/analysis/spring/image-20221219144509954.png)

两者源码如下：

```java
// AbstractAutowireCapableBeanFactory.java

@Override
public Object applyBeanPostProcessorsBeforeInitialization(Object existingBean, String beanName)
		throws BeansException {
	Object result = existingBean;
	// 遍历 BeanPostProcessor 数组
	for (BeanPostProcessor processor : getBeanPostProcessors()) {
	    // 处理
		Object current = processor.postProcessBeforeInitialization(result, beanName);
        // 返回空，则返回 result
		if (current == null) {
			return result;
		}
		// 修改 result
		result = current;
	}
	return result;
}

@Override
public Object applyBeanPostProcessorsAfterInitialization(Object existingBean, String beanName)
		throws BeansException {
	Object result = existingBean;
	// 遍历 BeanPostProcessor
	for (BeanPostProcessor processor : getBeanPostProcessors()) {
	    // 处理
		Object current = processor.postProcessAfterInitialization(result, beanName);
		// 返回空，则返回 result
		if (current == null) {
			return result;
		}
		// 修改 result
		result = current;
	}
	return result;
}
```

#### 3.1 自动检测并注册

`#getBeanPostProcessors()` 方法，返回的是 `beanPostProcessors` 集合，该集合里面存放就是我们自定义的 BeanPostProcessor ，如果该集合中存在元素则调用相应的方法，否则就直接返回 bean 了。这也是为什么使用 BeanFactory 容器是无法输出自定义 BeanPostProcessor 里面的内容，因为在 `BeanFactory#getBean(...)` 方法的过程中根本就没有将我们自定义的 BeanPostProcessor 注入进来，所以要想 BeanFactory 容器 的 BeanPostProcessor 生效我们必须手动调用 `#addBeanPostProcessor(BeanPostProcessor beanPostProcessor)` 方法，将定义的 BeanPostProcessor 注册到相应的 BeanFactory 中。**但是 ApplicationContext 不需要手动，因为 ApplicationContext 会自动检测并完成注册**。

ApplicationContext 实现自动注册的原因，在于我们构造一个 ApplicationContext 实例对象的时候会调用 `#registerBeanPostProcessors(ConfigurableListableBeanFactory beanFactory)` 方法，将检测到的 BeanPostProcessor 注入到 ApplicationContext 容器中，同时应用到该容器创建的 bean 中。代码如下：

```java
// AbstractApplicationContext.java

/**
 * 实例化并调用已经注入的 BeanPostProcessor
 * 必须在应用中 bean 实例化之前调用
 */
protected void registerBeanPostProcessors(ConfigurableListableBeanFactory beanFactory) {
    PostProcessorRegistrationDelegate.registerBeanPostProcessors(beanFactory, this);
}

// PostProcessorRegistrationDelegate.java

public static void registerBeanPostProcessors(
		ConfigurableListableBeanFactory beanFactory, AbstractApplicationContext applicationContext) {

    // 获取所有的 BeanPostProcessor 的 beanName
    // 这些 beanName 都已经全部加载到容器中去，但是没有实例化
	String[] postProcessorNames = beanFactory.getBeanNamesForType(BeanPostProcessor.class, true, false);

	// Register BeanPostProcessorChecker that logs an info message when
	// a bean is created during BeanPostProcessor instantiation, i.e. when
	// a bean is not eligible for getting processed by all BeanPostProcessors.
    // 记录所有的beanProcessor数量
	int beanProcessorTargetCount = beanFactory.getBeanPostProcessorCount() + 1 + postProcessorNames.length;
	// 注册 BeanPostProcessorChecker，它主要是用于在 BeanPostProcessor 实例化期间记录日志
    // 当 Spring 中高配置的后置处理器还没有注册就已经开始了 bean 的实例化过程，这个时候便会打印 BeanPostProcessorChecker 中的内容
	beanFactory.addBeanPostProcessor(new BeanPostProcessorChecker(beanFactory, beanProcessorTargetCount));

	// Separate between BeanPostProcessors that implement PriorityOrdered,
	// Ordered, and the rest.
    // PriorityOrdered 保证顺序
	List<BeanPostProcessor> priorityOrderedPostProcessors = new ArrayList<>();
    // MergedBeanDefinitionPostProcessor
	List<BeanPostProcessor> internalPostProcessors = new ArrayList<>();
    // 使用 Ordered 保证顺序
	List<String> orderedPostProcessorNames = new ArrayList<>();
    // 没有顺序
	List<String> nonOrderedPostProcessorNames = new ArrayList<>();
	for (String ppName : postProcessorNames) {
        // PriorityOrdered
        if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
            // 调用 getBean 获取 bean 实例对象
			BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
			priorityOrderedPostProcessors.add(pp);
			if (pp instanceof MergedBeanDefinitionPostProcessor) {
				internalPostProcessors.add(pp);
			}
		} else if (beanFactory.isTypeMatch(ppName, Ordered.class)) {
            // 有序 Ordered
			orderedPostProcessorNames.add(ppName);
		} else {
            // 无序
			nonOrderedPostProcessorNames.add(ppName);
		}
	}

	// First, register the BeanPostProcessors that implement PriorityOrdered.
    // 第一步，注册所有实现了 PriorityOrdered 的 BeanPostProcessor
    // 先排序
	sortPostProcessors(priorityOrderedPostProcessors, beanFactory);
    // 后注册
	registerBeanPostProcessors(beanFactory, priorityOrderedPostProcessors);

	// Next, register the BeanPostProcessors that implement Ordered.
    // 第二步，注册所有实现了 Ordered 的 BeanPostProcessor
	List<BeanPostProcessor> orderedPostProcessors = new ArrayList<>();
	for (String ppName : orderedPostProcessorNames) {
		BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
		orderedPostProcessors.add(pp);
		if (pp instanceof MergedBeanDefinitionPostProcessor) {
			internalPostProcessors.add(pp);
		}
	}
    // 先排序
	sortPostProcessors(orderedPostProcessors, beanFactory);
    // 后注册
	registerBeanPostProcessors(beanFactory, orderedPostProcessors);

	// Now, register all regular BeanPostProcessors.
    // 第三步注册所有无序的 BeanPostProcessor
	List<BeanPostProcessor> nonOrderedPostProcessors = new ArrayList<>();
	for (String ppName : nonOrderedPostProcessorNames) {
		BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
		nonOrderedPostProcessors.add(pp);
		if (pp instanceof MergedBeanDefinitionPostProcessor) {
			internalPostProcessors.add(pp);
		}
	}
	// 注册，无需排序
	registerBeanPostProcessors(beanFactory, nonOrderedPostProcessors);

	// Finally, re-register all internal BeanPostProcessors.
    // 最后，注册所有的 MergedBeanDefinitionPostProcessor 类型的 BeanPostProcessor
	sortPostProcessors(internalPostProcessors, beanFactory);
	registerBeanPostProcessors(beanFactory, internalPostProcessors);

	// Re-register post-processor for detecting inner beans as ApplicationListeners,
	// moving it to the end of the processor chain (for picking up proxies etc).
    // 加入ApplicationListenerDetector（探测器）
    // 重新注册 BeanPostProcessor 以检测内部 bean，因为 ApplicationListeners 将其移动到处理器链的末尾
	beanFactory.addBeanPostProcessor(new ApplicationListenerDetector(applicationContext));
}
```

- 方法首先 `beanFactory` 获取注册到该 BeanFactory 中所有 BeanPostProcessor 类型的 `beanName` 数组，其实就是找所有实现了 BeanPostProcessor 接口的 bean ，然后迭代这些 bean ，将其按照 PriorityOrdered、Ordered、无序的顺序，添加至相应的 List 集合中，最后依次调用 `#sortPostProcessors(List<?> postProcessors, ConfigurableListableBeanFactory beanFactory)` 方法来进行排序处理、 `#registerBeanPostProcessors(ConfigurableListableBeanFactory beanFactory, List<BeanPostProcessor> postProcessors)` 方法来完成注册。

- 【**排序**】很简单，如果 `beanFactory` 为 DefaultListableBeanFactory ，则返回 BeanFactory 所依赖的比较器，否则反正默认的比较器(OrderComparator)，然后调用 `List#sort(Comparator<? super E> c)` 方法即可。代码如下：

  ```java
  // PostProcessorRegistrationDelegate.java
  private static void sortPostProcessors(List<?> postProcessors, ConfigurableListableBeanFactory beanFactory) {
  	// 获得 Comparator 对象
      Comparator<Object> comparatorToUse = null;
  	if (beanFactory instanceof DefaultListableBeanFactory) { // 依赖的 Comparator 对象
  		comparatorToUse = ((DefaultListableBeanFactory) beanFactory).getDependencyComparator();
  	}
  	if (comparatorToUse == null) { // 默认 Comparator 对象
  		comparatorToUse = OrderComparator.INSTANCE;
  	}
  	// 排序
  	postProcessors.sort(comparatorToUse);
  }
  ```

而对于【**注册**】，同样是调用 `AbstractBeanFactory#addBeanPostProcessor(BeanPostProcessor beanPostProcessor)` 方法完成注册。代码如下：

```java
// PostProcessorRegistrationDelegate.java

private static void registerBeanPostProcessors(ConfigurableListableBeanFactory beanFactory, List<BeanPostProcessor> postProcessors) {
    // 遍历 BeanPostProcessor 数组，注册
	for (BeanPostProcessor postProcessor : postProcessors) {
		beanFactory.addBeanPostProcessor(postProcessor);
	}
}
```

### 4. 小结

至此，BeanPostProcessor 已经分析完毕了，这里简单总结下：

1. BeanPostProcessor 的作用域是容器级别的，它只和所在的容器相关 ，当 BeanPostProcessor 完成注册后，它会应用于所有跟它在同一个容器内的 bean 。
2. BeanFactory 和 ApplicationContext 对 BeanPostProcessor 的处理不同，ApplicationContext 会自动检测所有实现了 BeanPostProcessor 接口的 bean，并完成注册，但是使用 BeanFactory 容器时则需要手动调用 `AbstractBeanFactory#addBeanPostProcessor(BeanPostProcessor beanPostProcessor)` 方法来完成注册
3. ApplicationContext 的 BeanPostProcessor 支持 Ordered，而 BeanFactory 的 BeanPostProcessor 是不支持的，原因在于ApplicationContext 会对 BeanPostProcessor 进行 Ordered 检测并完成排序，而 BeanFactory 中的 BeanPostProcessor 只跟注册的顺序有关。

## IoC之深入分析InitializingBean和init-method

﻿Spring 在 bean 初始化时进行三个检测扩展，也就是说我们可以对 bean 进行三个不同的定制化处理，前面两篇博客 [《【死磕 Spring】—— IoC 之深入分析 Aware 接口》](http://svip.iocoder.cn/Spring/IoC-Aware-interface) 和 [《【死磕 Spring】—— IoC 之深入分析 ﻿BeanPostProcessor》](http://svip.iocoder.cn/Spring/IoC-BeanPostProcessor) 已经分析了 Aware 接口族和 BeanPostProcessor 接口，这篇分析 InitializingBean 接口和 `init-method` 方法。

### 1. InitializingBean

Spring 的 `org.springframework.beans.factory.InitializingBean` 接口，为 bean 提供了定义初始化方法的方式，它仅包含了一个方法：`#afterPropertiesSet()` 。代码如下：

```java
public interface InitializingBean {

    /**
     * 该方法在 BeanFactory 设置完了所有属性之后被调用
     * 该方法允许 bean 实例设置了所有 bean 属性时执行初始化工作，如果该过程出现了错误则需要抛出异常
     *
     * Invoked by the containing {@code BeanFactory} after it has set all bean properties
     * and satisfied {@link BeanFactoryAware}, {@code ApplicationContextAware} etc.
     * <p>This method allows the bean instance to perform validation of its overall
     * configuration and final initialization when all bean properties have been set.
     * @throws Exception in the event of misconfiguration (such as failure to set an
     * essential property) or if initialization fails for any other reason
     */
    void afterPropertiesSet() throws Exception;

}
```

Spring 在完成实例化后，设置完所有属性，进行 “Aware 接口” 和 “BeanPostProcessor 前置处理”之后，会接着检测当前 bean 对象是否实现了 InitializingBean 接口。如果是，则会调用其 `#afterPropertiesSet()` 方法，进一步调整 bean 实例对象的状态。

#### 1.1 示例

```java
public class InitializingBeanTest implements InitializingBean {

    private String name;

    @Override
    public void afterPropertiesSet() throws Exception {
        System.out.println("InitializingBeanTest initializing...");
        this.name = "chenssy 2 号";
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
```

配置项如下：

```xml
<bean id="initializingBeanTest" class="org.springframework.core.test.InitializingBeanTest">
    <property name="name" value="chenssy 1 号"/>
</bean>
```

测试代码如下：

```xml
InitializingBeanTest test = (InitializingBeanTest) factory.getBean("initializingBeanTest");
System.out.println("name ：" + test.getName());
```

执行结果如下：

![image-20230109174532961](../../_media/analysis/spring/image-20230109174532961.png)

在这个示例中，改变了 InitializingBeanTest 示例的 `name` 属性，也就是说 在 `#afterPropertiesSet()` 方法中，我们是可以改变 bean 的属性的，这相当于 Spring 容器又给我们提供了一种可以改变 bean 实例对象的方法。

#### 1.2 invokeInitMethods

上面提到 bean 初始化阶段（ `#initializeBean(final String beanName, final Object bean, RootBeanDefinition mbd)` 方法）， Spring 容器会主动检查当前 bean 是否已经实现了 InitializingBean 接口，如果实现了，则会掉用其 `#afterPropertiesSet()` 方法。这个主动检查、调用的动作是由 `#invokeInitMethods(String beanName, final Object bean, @Nullable RootBeanDefinition mbd)` 方法来完成的。代码如下：

```java
// AbstractAutowireCapableBeanFactory.java

protected void invokeInitMethods(String beanName, final Object bean, @Nullable RootBeanDefinition mbd)
        throws Throwable {
    // 首先会检查是否是 InitializingBean ，如果是的话需要调用 afterPropertiesSet()
    boolean isInitializingBean = (bean instanceof InitializingBean);
    if (isInitializingBean && (mbd == null || !mbd.isExternallyManagedInitMethod("afterPropertiesSet"))) {
        if (logger.isTraceEnabled()) {
            logger.trace("Invoking afterPropertiesSet() on bean with name '" + beanName + "'");
        }
        if (System.getSecurityManager() != null) { // 安全模式
            try {
                AccessController.doPrivileged((PrivilegedExceptionAction<Object>) () -> {
                    // 属性初始化的处理
                    ((InitializingBean) bean).afterPropertiesSet();
                    return null;
                }, getAccessControlContext());
            } catch (PrivilegedActionException pae) {
                throw pae.getException();
            }
        } else {
            // 属性初始化的处理
            ((InitializingBean) bean).afterPropertiesSet();
        }
    }

    if (mbd != null && bean.getClass() != NullBean.class) {
        // 判断是否指定了 init-method()，
        // 如果指定了 init-method()，则再调用制定的init-method
        String initMethodName = mbd.getInitMethodName();
        if (StringUtils.hasLength(initMethodName) &&
                !(isInitializingBean && "afterPropertiesSet".equals(initMethodName)) &&
                !mbd.isExternallyManagedInitMethod(initMethodName)) {
            // 激活用户自定义的初始化方法
            // 利用反射机制执行
            invokeCustomInitMethod(beanName, bean, mbd);
        }
    }
}
```

- 首先，检测当前 bean 是否实现了 InitializingBean 接口，如果实现了则调用其 `#afterPropertiesSet()` 方法。
- 然后，再检查是否也指定了 `init-method`，如果指定了则通过反射机制调用指定的 `init-method` 方法。

虽然该接口为 Spring 容器的扩展性立下了汗马功劳，但是如果真的让我们的业务对象来实现这个接口就显得不是那么的友好了，Spring 的一个核心理念就是无侵入性，但是如果我们业务类实现这个接口就显得 Spring 容器具有侵入性了。所以 Spring 还提供了另外一种实现的方式：`init-method` 方法

### 2. init-method

在分析分析 `<bean>` 标签解析过程中，我们提到了有关于 `init-method` 属性 ([《【死磕 Spring】—— IoC 之解析 标签：BeanDefinition》](http://svip.iocoder.cn/Spring/IoC-parse-BeanDefinitions-for-BeanDefinition))，该属性用于在 bean 初始化时指定执行方法，可以用来替代实现 InitializingBean 接口。

#### 2.1 示例

```java
public class InitializingBeanTest {

    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setOtherName(){
        System.out.println("InitializingBeanTest setOtherName...");
        this.name = "chenssy 3 号";
    }
}
```

配置文件如下：

```java
<bean id="initializingBeanTest" class="org.springframework.core.test.InitializingBeanTest"
        init-method="setOtherName">
    <property name="name" value="chenssy 1 号"/>
</bean>
```

执行结果:

![image-20230109174613569](../../_media/analysis/spring/image-20230109174613569.png)

完全可以达到和 InitializingBean 一样的效果，而且在代码中我们没有看到丝毫 Spring 侵入的现象。所以通过 `init-method` 我们可以使用业务对象中定义的任何方法来实现 bean 实例对象的初始化定制化，而不再受制于 InitializingBean的 `#afterPropertiesSet()` 方法。同时我们可以使用 `<beans>` 标签的 `default-init-method` 属性来统一指定初始化方法，这样就省了需要在每个 `<bean>` 标签中都设置 `init-method` 这样的繁琐工作了。比如在 `default-init-method` 规定所有初始化操作全部以 `initBean()` 命名。如下：

![image-20230109174626458](../../_media/analysis/spring/image-20230109174626458.png)

### 3. 小结

从 `#invokeInitMethods(...)` 方法中，我们知道 `init-method` 指定的方法会在 `#afterPropertiesSet()` 方法之后执行，如果 `#afterPropertiesSet()` 方法的执行的过程中出现了异常，则 `init-method` 是不会执行的，而且由于 `init-method` 采用的是反射执行的方式，所以 `#afterPropertiesSet()` 方法的执行效率一般会高些，但是并不能排除我们要优先使用 `init-method`，主要是因为它消除了 bean 对 Spring 的依赖，Spring 没有侵入到我们业务代码，这样会更加符合 Spring 的理念。诚然，`init-method` 是基于 xml 配置文件的，就目前而言，我们的工程几乎都摒弃了配置，而采用注释的方式，那么 `@PreDestory` 可能适合你，当然这个注解我们后面分析。

至此，InitializingBean 和 init-method 已经分析完毕了，对于DisposableBean 和 `destroy-method` ，他们和 init 相似，这里就不做阐述了。

## IoC之深入分析Bean的生命周期

在分析 Spring Bean 实例化过程中提到 Spring 并不是一启动容器就开启 bean 的实例化进程，只有当客户端通过显示或者隐式的方式调用 BeanFactory 的 `#getBean(...)` 方法来请求某个实例对象的时候，它才会触发相应 bean 的实例化进程。当然，也可以选择直接使用 ApplicationContext 容器，因为该容器启动的时候会立刻调用注册到该容器所有 bean 定义的实例化方法。当然，对于 BeanFactory 容器而言，并不是所有的 `#getBean(...)` 方法都会触发实例化进程，比如 singleton 类型的 bean，该类型的 bean 只会在第一次调用 `getBean()` 的时候才会触发，而后续的调用则会直接返回容器缓存中的实例对象。

`#getBean(...)` 方法，只是 bean 实例化进程的入口，真正的实现逻辑其实是在 AbstractAutowireCapableBeanFactory 的 `#doCreateBean(...)` 中实现，实例化过程如下图：

![image-20230109174739000](../../_media/analysis/spring/image-20230109174739000.png)

原来我们采用 new 的方式创建一个对象，用完该对象在其脱离作用域后就会被回收，对于后续操作我们无权也没法干涉，但是采用 Spring 容器后，我们完全摆脱了这种命运，Spring 容器将会对其所有管理的 Bean 对象全部给予一个**统一的生命周期管理**，同时在这个阶段我们也可以对其进行干涉（比如对 bean 进行增强处理，对 bean 进行篡改），如上图。

### 1. bean 实例化

在 `#doCreateBean(...)` 方法中，首先进行 bean 实例化工作，主要由 `#createBeanInstance(...)` 方法实现，该方法返回一个 BeanWrapper 对象。BeanWrapper 对象是 Spring 的一个低级 Bean 基础结构的核心接口，为什么说是**低级**呢？因为这个时候的 Bean 还不能够被我们使用，连最基本的属性都没有设置。而且在我们实际开发过程中，一般都不会直接使用该类，而是通过 BeanFactory 隐式使用。

BeanWrapper 接口有一个默认实现类 BeanWrapperImpl，其主要作用是对 Bean 进行“包裹”，然后对这个包裹的 bean 进行操作，比如后续注入 bean 属性。

在实例化 bean 过程中，Spring 采用“策略模式”来决定采用哪种方式来实例化 bean，一般有反射和 CGLIB 动态字节码两种方式。

InstantiationStrategy 定义了 Bean 实例化策略的抽象接口，其子类 SimpleInstantiationStrategy 提供了基于反射来实例化对象的功能，但是不支持方法注入方式的对象实例化。CglibSubclassingInstantiationStrategy 继承 SimpleInstantiationStrategy，他除了拥有父类以反射实例化对象的功能外，还提供了通过 CGLIB 的动态字节码的功能进而支持方法注入所需的对象实例化需求。默认情况下，Spring 采用 CglibSubclassingInstantiationStrategy。

关于 Bean 实例化的详细过程，请参考以下几篇文章：

1. [【死磕 Spring】—— IoC 之加载 bean：创建 bean（一）之主流程](http://svip.iocoder.cn/Spring/IoC-get-Bean-createBean-1)
2. [【死磕 Spring】—— IoC 之加载 bean：创建 bean（二）之实例化 Bean 对象(1)](http://svip.iocoder.cn/Spring/IoC-get-Bean-createBean-2)
3. [【死磕 Spring】—— IoC 之加载 bean：创建 bean（三）之实例化 Bean 对象(2)](http://svip.iocoder.cn/Spring/IoC-get-Bean-createBean-3)
4. [【死磕 Spring】—— IoC 之加载 bean：创建 bean（四）之属性填充](http://svip.iocoder.cn/Spring/IoC-get-Bean-createBean-4)
5. [【死磕 Spring】—— IoC 之加载 bean：创建 bean（五）之循环依赖处理](http://svip.iocoder.cn/Spring/IoC-get-Bean-createBean-5)
6. [【死磕 Spring】—— IoC 之加载 bean：创建 bean（六）之初始化 Bean 对象](http://svip.iocoder.cn/Spring/IoC-get-Bean-createBean-6)

对于 BeanWrapper 和 具体的实例化策略，LZ 在后面会专门写文章来进行详细说明。

### 2. 激活 Aware

当 Spring 完成 bean 对象实例化并且设置完相关属性和依赖后，则会开始 bean 的初始化进程（ `#initializeBean(...)` ），初始化第一个阶段是检查当前 bean 对象是否实现了一系列以 Aware 结尾的的接口。

Aware 接口为 Spring 容器的核心接口，是一个具有标识作用的超级接口，实现了该接口的 bean 是具有被 Spring 容器通知的能力，通知的方式是采用回调的方式。

在初始化阶段主要是感知 BeanNameAware、BeanClassLoaderAware、BeanFactoryAware 。代码如下：

```java
// AbstractAutowireCapableBeanFactory.java

private void invokeAwareMethods(final String beanName, final Object bean) {
	if (bean instanceof Aware) {
	    // BeanNameAware
		if (bean instanceof BeanNameAware) {
			((BeanNameAware) bean).setBeanName(beanName);
		}
		// BeanClassLoaderAware
		if (bean instanceof BeanClassLoaderAware) {
			ClassLoader bcl = getBeanClassLoader();
			if (bcl != null) {
				((BeanClassLoaderAware) bean).setBeanClassLoader(bcl);
			}
		}
		// BeanFactoryAware
		if (bean instanceof BeanFactoryAware) {
			((BeanFactoryAware) bean).setBeanFactory(AbstractAutowireCapableBeanFactory.this);
		}
	}
}
```

- BeanNameAware：对该 bean 对象定义的 beanName 设置到当前对象实例中
- BeanClassLoaderAware：将当前 bean 对象相应的 ClassLoader 注入到当前对象实例中
- BeanFactoryAware：BeanFactory 容器会将自身注入到当前对象实例中，这样当前对象就会拥有一个 BeanFactory 容器的引用。

当然，Spring 不仅仅只是提供了上面三个 Aware 接口，而是一系列：

- LoadTimeWeaverAware：加载Spring Bean时织入第三方模块，如AspectJ
- BootstrapContextAware：资源适配器BootstrapContext，如JCA,CCI
- ResourceLoaderAware：底层访问资源的加载器
- PortletConfigAware：PortletConfig
- PortletContextAware：PortletContext
- ServletConfigAware：ServletConfig
- ServletContextAware：ServletContext
- MessageSourceAware：国际化
- ApplicationEventPublisherAware：应用事件
- NotificationPublisherAware：JMX通知

更多关于 Aware 的请关注：[《【死磕 Spring】—— IoC 之深入分析 Aware 接口》](http://svip.iocoder.cn/Spring/IoC-Aware-interface) 。

### 3. BeanPostProcessor

初始化第二个阶段则是 BeanPostProcessor 增强处理，在该阶段 BeanPostProcessor 会处理当前容器内所有符合条件的实例化后的 bean 对象。它主要是对 Spring 容器提供的 bean 实例对象进行有效的扩展，允许 Spring 在初始化 bean 阶段对其进行定制化修改，如处理标记接口或者为其提供代理实现。

BeanPostProcessor 接口提供了两个方法，在不同的时机执行，分别对应上图的前置处理和后置处理。代码如下：

```java
public interface BeanPostProcessor {

	@Nullable
	default Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
		return bean;
	}

	@Nullable
	default Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
		return bean;
	}

}
```

更多关于 BeanPostProcessor 的请关注：[《【死磕 Spring】—— IoC 之深入分析 ﻿BeanPostProcessor》](http://svip.iocoder.cn/Spring/IoC-BeanPostProcessor) 。

### 4. InitializingBean 和 init-method

InitializingBean 是一个接口，它为 Spring Bean 的初始化提供了一种方式，它有一个 `#afterPropertiesSet()` 方法，在 bean 的初始化进程中会判断当前 bean 是否实现了 InitializingBean，如果实现了则调用 `#afterPropertiesSet()` 方法，进行初始化工作。然后再检查是否也指定了 `init-method` ，如果指定了则通过反射机制调用指定的 `init-method` 方法。代码如下：

```java
// AbstractAutowireCapableBeanFactory.java

protected void invokeInitMethods(String beanName, final Object bean, @Nullable RootBeanDefinition mbd)
		throws Throwable {
    // 首先会检查是否是 InitializingBean ，如果是的话需要调用 afterPropertiesSet()
	boolean isInitializingBean = (bean instanceof InitializingBean);
	if (isInitializingBean && (mbd == null || !mbd.isExternallyManagedInitMethod("afterPropertiesSet"))) {
		if (logger.isTraceEnabled()) {
			logger.trace("Invoking afterPropertiesSet() on bean with name '" + beanName + "'");
		}
		if (System.getSecurityManager() != null) { // 安全模式
			try {
				AccessController.doPrivileged((PrivilegedExceptionAction<Object>) () -> {
                    // 属性初始化的处理
					((InitializingBean) bean).afterPropertiesSet();
					return null;
				}, getAccessControlContext());
			} catch (PrivilegedActionException pae) {
				throw pae.getException();
			}
		} else {
            // 属性初始化的处理
			((InitializingBean) bean).afterPropertiesSet();
		}
	}

	if (mbd != null && bean.getClass() != NullBean.class) {
        // 判断是否指定了 init-method()，
        // 如果指定了 init-method()，则再调用制定的init-method
		String initMethodName = mbd.getInitMethodName();
		if (StringUtils.hasLength(initMethodName) &&
				!(isInitializingBean && "afterPropertiesSet".equals(initMethodName)) &&
				!mbd.isExternallyManagedInitMethod(initMethodName)) {
            // 激活用户自定义的初始化方法
            // 利用反射机制执行
			invokeCustomInitMethod(beanName, bean, mbd);
		}
	}
}
```

对于 Spring 而言，虽然上面两种方式都可以实现初始化定制化，但是更加推崇 `init-method` 方式，因为对于 InitializingBean 接口而言，他需要 bean 去实现接口，这样就会污染我们的应用程序，显得 Spring 具有一定的侵入性。但是由于 `init-method` 是采用反射的方式，所以执行效率上相对于 InitializingBean 接口回调的方式可能会低一些。

更多关于 init 的请关注：[《【死磕 Spring】—— IoC 之 深入分析 InitializingBean 和 init-method》](http://svip.iocoder.cn/Spring/IoC-InitializingBean-and-init-method)

### 5. DisposableBean 和 destroy-method

与 InitializingBean 和 `init-method` 用于对象的自定义初始化工作相似，DisposableBean和 `destroy-method` 则用于对象的自定义销毁工作。

当一个 bean 对象经历了实例化、设置属性、初始化阶段，那么该 bean 对象就可以供容器使用了（调用的过程）。当完成调用后，如果是 singleton 类型的 bean ，则会看当前 bean 是否应实现了 DisposableBean 接口或者配置了 `destroy-method` 属性，如果是的话，则会为该实例注册一个用于对象销毁的回调方法，便于在这些 singleton 类型的 bean 对象销毁之前执行销毁逻辑。

但是，并不是对象完成调用后就会立刻执行销毁方法，因为这个时候 Spring 容器还处于运行阶段，只有当 Spring 容器关闭的时候才会去调用。但是， Spring 容器不会这么聪明会自动去调用这些销毁方法，而是需要我们主动去告知 Spring 容器。

- 对于 BeanFactory 容器而言，我们需要主动调用 `#destroySingletons()` 方法，通知 BeanFactory 容器去执行相应的销毁方法。
- 对于 ApplicationContext 容器而言，调用 `#registerShutdownHook()` 方法。

### 6. 实践验证

下面用一个实例来真实看看看上面执行的逻辑，毕竟理论是不能缺少实践的：

```java
public class LifeCycleBean implements BeanNameAware,BeanFactoryAware,BeanClassLoaderAware,BeanPostProcessor,
        InitializingBean,DisposableBean {

    private String test;

    public String getTest() {
        return test;
    }

    public void setTest(String test) {
        System.out.println("属性注入....");
        this.test = test;
    }

    public LifeCycleBean(){ // 构造方法
        System.out.println("构造函数调用...");
    }

    public void display(){
        System.out.println("方法调用...");
    }

    @Override
    public void setBeanFactory(BeanFactory beanFactory) throws BeansException {
        System.out.println("BeanFactoryAware 被调用...");
    }

    @Override
    public void setBeanName(String name) {
        System.out.println("BeanNameAware 被调用...");
    }

    @Override
    public void setBeanClassLoader(ClassLoader classLoader) {
        System.out.println("BeanClassLoaderAware 被调用...");
    }

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("BeanPostProcessor postProcessBeforeInitialization 被调用...");
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("BeanPostProcessor postProcessAfterInitialization 被调用...");
        return bean;
    }

    @Override
    public void destroy() throws Exception {
        System.out.println("DisposableBean destroy 被调动...");
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        System.out.println("InitializingBean afterPropertiesSet 被调动...");
    }

    public void initMethod(){
        System.out.println("init-method 被调用...");
    }

    public void destroyMethdo(){
        System.out.println("destroy-method 被调用...");
    }

}
```

- LifeCycleBean 继承了 `BeanNameAware` , `BeanFactoryAware` , `BeanClassLoaderAware` , `BeanPostProcessor` , `InitializingBean` , `DisposableBean` 六个接口，同时定义了一个 `test` 属性用于验证属性注入和提供一个 `#display()` 方法用于模拟调用。

配置如下：

```java
<bean id="lifeCycle" class="org.springframework.core.test.lifeCycleBean"
        init-method="initMethod" destroy-method="destroyMethdo">
    <property name="test" value="test"/>
</bean>
```

- 配置 `init-method` 和 `destroy-method`。

测试方法如下：

```java
// BeanFactory 容器一定要调用该方法进行 BeanPostProcessor 注册
factory.addBeanPostProcessor(new LifeCycleBean()); // <1>

LifeCycleBean lifeCycleBean = (LifeCycleBean) factory.getBean("lifeCycle");
lifeCycleBean.display();

System.out.println("方法调用完成，容器开始关闭....");
// 关闭容器
factory.destroySingletons();
```

运行结果：

```java
构造函数调用...
构造函数调用...
属性注入....
BeanNameAware 被调用...
BeanClassLoaderAware 被调用...
BeanFactoryAware 被调用...
BeanPostProcessor postProcessBeforeInitialization 被调用...
InitializingBean afterPropertiesSet 被调动...
init-method 被调用...
BeanPostProcessor postProcessAfterInitialization 被调用...
方法调用...
方法调用完成，容器开始关闭....
DisposableBean destroy 被调动...
destroy-method 被调用...
```

- 有两个构造函数调用，是因为要 `<1>` 处注入一个 BeanPostProcessor（你也可以另外提供一个 BeanPostProcessor 实例）。

根据执行的结果已经上面的分析，我们就可以对 Spring Bean 的声明周期过程如下（方法级别）：

1. Spring 容器根据实例化策略对 Bean 进行实例化。
2. 实例化完成后，如果该 bean 设置了一些属性的话，则利用 set 方法设置一些属性。
3. 如果该 Bean 实现了 BeanNameAware 接口，则调用 `#setBeanName(String beanName)` 方法。
4. 如果该 bean 实现了 BeanClassLoaderAware 接口，则调用 `setBeanClassLoader(ClassLoader classLoader)` 方法。
5. 如果该 bean 实现了 BeanFactoryAware接口，则调用 `setBeanFactory(BeanFactory beanFactory)` 方法。
6. 如果该容器注册了 BeanPostProcessor，则会调用`#postProcessBeforeInitialization(Object bean, String beanName)` 方法,完成 bean 前置处理
7. 如果该 bean 实现了 InitializingBean 接口，则调用`#afterPropertiesSet()` 方法。
8. 如果该 bean 配置了 `init-method` 方法，则调用其指定的方法。
9. 初始化完成后，如果该容器注册了 BeanPostProcessor 则会调用 `#postProcessAfterInitialization(Object bean, String beanName)` 方法,完成 bean 的后置处理。
10. 对象完成初始化，开始方法调用。
11. 在容器进行关闭之前，如果该 bean 实现了 DisposableBean 接口，则调用 `#destroy()` 方法。
12. 在容器进行关闭之前，如果该 bean 配置了 `destroy-method` ，则调用其指定的方法。
13. 到这里一个 bean 也就完成了它的一生。

## IoC之深入分析 BeanFactoryPostProcessor

在博客 [《【死磕 Spring】—— IoC 之 深入分析 BeanPostProcessor》](http://svip.iocoder.cn/Spring/IoC-BeanPostProcessor) 中，深入介绍了 BeanPostProcessor 的实现机制。在这篇文章中提到 BeanPostProcessor 是 Spring 提供一种扩展机制，该机制允许我们在 Bean 实例化之后初始化之际对 Bean 进行增强处理（前、后置处理）。

同样在 Spring 容器启动阶段，Spring 也提供了一种容器扩展机制：**BeanFactoryPostProcessor**，该机制作用于容器启动阶段，允许我们在容器实例化 Bean 之前对注册到该容器的 BeanDefinition 做出修改。

### 1. BeanFactoryPostProcessor

BeanFactoryPostProcessor 的机制，就相当于给了我们在 Bean 实例化之前最后一次修改 BeanDefinition 的机会，我们可以利用这个机会对 BeanDefinition 来进行一些额外的操作，比如更改某些 bean 的一些属性，给某些 Bean 增加一些其他的信息等等操作。

`org.springframework.beans.factory.config.BeanFactoryPostProcessor` 接口，定义如下：

```java
public interface BeanFactoryPostProcessor {

 /**
  * 1、Modify the application context's internal bean factory after its standard initialization.
  *
  * 2、All bean definitions will have been loaded, but no beans will have been instantiated yet. This allows for overriding or adding properties even to eager-initializing beans.
  *
  * @param beanFactory the bean factory used by the application context
  * @throws org.springframework.beans.BeansException in case of errors
  */
 void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException;

}
```

BeanFactoryPostProcessor 接口仅有一个 `#postProcessBeanFactory(...)` 方法，该方法接收一个 ConfigurableListableBeanFactory 类型的 `beanFactory` 参数。上面有两行注释：

- 1、表示了该方法的**作用**：在 standard initialization（实在是不知道这个怎么翻译：标准的初始化？） 之后（已经就是已经完成了 BeanDefinition 的加载）对 bean factory 容器进行修改。其中参数 `beanFactory` 应该就是已经完成了 standard initialization 的 BeanFactory 。
- 2、表示作用**时机**：所有的 BeanDefinition 已经完成了加载即加载至 BeanFactory 中，但是还没有完成初始化。

所以这里总结一句话，就是：`#postProcessBeanFactory(...)` 方法，工作于 BeanDefinition 加载完成之后，Bean 实例化之前，其主要作用是对加载 BeanDefinition 进行修改。有一点需要需要**注意**的是在 `#postProcessBeanFactory(...)` 方法中，千万不能进行 Bean 的实例化工作，因为这样会导致 Bean 过早实例化，会产生严重后果，**我们始终需要注意的是 BeanFactoryPostProcessor 是与 BeanDefinition 打交道的，如果想要与 Bean 打交道，请使用 BeanPostProcessor** 。

与 BeanPostProcessor 一样，BeanFactoryPostProcessor 同样支持**排序**，一个容器可以同时拥有多个 BeanFactoryPostProcessor ，这个时候如果我们比较在乎他们的顺序的话，可以实现 Ordered 接口。

如果要自定义 BeanFactoryPostProcessor ，直接实现该接口即可。

### 2. 示例

```java
public class BeanFactoryPostProcessor_1 implements BeanFactoryPostProcessor,Ordered {

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        System.out.println("调用 BeanFactoryPostProcessor_1 ...");

        System.out.println("容器中有 BeanDefinition 的个数：" + beanFactory.getBeanDefinitionCount());

        // 获取指定的 BeanDefinition
        BeanDefinition bd = beanFactory.getBeanDefinition("studentService");

        MutablePropertyValues pvs = bd.getPropertyValues();

        pvs.addPropertyValue("name","chenssy1");
        pvs.addPropertyValue("age",15);
    }

    @Override
    public int getOrder() {
        return 1;
    }
}

public class BeanFactoryPostProcessor_2 implements BeanFactoryPostProcessor , Ordered {

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        System.out.println("调用 BeanFactoryPostProcessor_2 ...");

        // 获取指定的 BeanDefinition
        BeanDefinition bd = beanFactory.getBeanDefinition("studentService");

        MutablePropertyValues pvs = bd.getPropertyValues();

        pvs.addPropertyValue("age",18);
    }

    @Override
    public int getOrder() {
        return 2;
    }
}
```

- 提供了两个自定义的 BeanFactoryPostProcessor ，都继承 BeanFactoryPostProcessor 和 Ordered，其中 BeanFactoryPostProcessor_1 改变 `name` 和 `age` 的值，BeanFactoryPostProcessor_2 该变 `age` 的值。Ordered 分别为 1 和 2 。

XML 配置如下：

```java
<bean id="studentService" class="org.springframework.core.service.StudentService">
    <property name="name" value="chenssy"/>
    <property name="age" value="10"/>
</bean>

<bean class="org.springframework.core.test.BeanFactoryPostProcessor_1"/>
<bean class="org.springframework.core.test.BeanFactoryPostProcessor_2"/>
```

- `studentService` 设置 `name` 和 `age` 分别为 `"chenss"` 和 10 。

运行代码：

```java
ApplicationContext context = new ClassPathXmlApplicationContext("spring.xml");

StudentService studentService = (StudentService) context.getBean("studentService");
System.out.println("student name:" + studentService.getName() + "-- age:" + studentService.getAge());
```

运行结果：

```java
调用 BeanFactoryPostProcessor_1 ...
容器中有 BeanDefinition 的个数：3
调用 BeanFactoryPostProcessor_2 ...
student name:chenssy1-- age:18
```

- 看到运行结果，其实对上面的运行流程就已经一清二楚了。这里就不过多阐述了。

### 3. 原理

在上面测试方法中，我们使用的是 ApplicationContext ，对于 ApplicationContext 来说，使用 BeanFactoryPostProcessor 非常方便，因为他会自动识别配置文件中的 BeanFactoryPostProcessor 并且完成注册和调用，我们只需要简单的配置声明即可。而对于 BeanFactory 容器来说则不行，他和 BeanPostProcessor 一样需要容器主动去进行注册调用，方法如下：

```java
BeanFactoryPostProcessor_1 beanFactoryPostProcessor1 = new BeanFactoryPostProcessor_1();
beanFactoryPostProcessor1.postProcessBeanFactory(factory);
```

**至于 ApplicationContext 是如何自动识别和调用，这个我们后续在分析 ApplicationContext 时会做详细说明的，当然，如果有兴趣的同学可以提前看**。

诚然，一般情况下我们是不会主动去自定义 BeanFactoryPostProcessor ，其实 Spring 为我们提供了几个常用的 BeanFactoryPostProcessor，他们是PropertyPlaceholderConfigurer 和 PropertyOverrideConfigurer ，其中 PropertyPlaceholderConfigurer 允许我们在 XML 配置文件中使用占位符并将这些占位符所代表的资源单独配置到简单的 properties 文件中来加载，PropertyOverrideConfigurer 则允许我们使用占位符来明确表明bean 定义中的 property 与 properties 文件中的各配置项之间的对应关系，这两个类在我们大型项目中有非常重要的作用，后续两篇文章将对其进行详细说明分析。

## IoC之深入分析PropertyPlaceholderConfigurer

﻿在上文 [《【死磕 Spring】—— IoC 之深入分析 BeanFactoryPostProcessor》](http://svip.iocoder.cn/Spring/IoC-BeanFactoryPostProcessor) 中，介绍了 BeanFactoryPostProcessor，知道 BeanFactoryPostProcessor 作用域容器启动阶段，可以对解析好的 BeanDefinition 进行定制化处理，而其中 **PropertyPlaceholderConfigurer** 是其一个非常重要的应用，也是其**子类**，介绍如下：

> PropertyPlaceholderConfigurer 允许我们用 Properties 文件中的属性，来定义应用上下文（配置文件或者注解）。

什么意思，就是说我们在 XML 配置文件（或者其他方式，如注解方式）中使用**占位符**的方式来定义一些资源，并将这些占位符所代表的资源配置到 Properties 中，这样只需要对 Properties 文件进行修改即可，这个特性非常，在后面来介绍一种我们在项目中经常用到场景。

### 1. PropertyResourceConfigurer

![image-20230109175057708](../../_media/analysis/spring/image-20230109175057708.png)

从 PropertyPlaceholderConfigurer 的结构图可以看出，它间接实现了 Aware 和 BeanFactoryPostProcessor 两大扩展接口，这里只需要关注 BeanFactoryPostProcessor 即可。我们知道 BeanFactoryPostProcessor 提供了 `#postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory)` 接口方法，在这个体系中该方法的是在 **PropertyResourceConfigurer** 中实现，该类为属性资源的配置类，它实现了 BeanFactoryPostProcessor 接口，代码如下：

```java
// PropertyResourceConfigurer.java
// extends PropertiesLoaderSupport
// implements BeanFactoryPostProcessor, PriorityOrdered

@Override
public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
    try {
        // <1> 返回合并的 Properties 实例
        Properties mergedProps = mergeProperties();

        // Convert the merged properties, if necessary.
        // <2> 转换合并属性
        convertProperties(mergedProps);

        // Let the subclass process the properties.
        // <3> 子类处理
        processProperties(beanFactory, mergedProps);
    } catch (IOException ex) {
        throw new BeanInitializationException("Could not load properties", ex);
    }
}
```

- `<1>` 处，调用 `#mergeProperties()` 方法，返回合并的 Properties 实例。Properties 实例维护这**一组** `key-value` ，其实就是 Properties 配置文件中的内容。

- `<2>` 处，调用 `#convertProperties(Properties props)` 方法，转换合并的值，其实就是将原始值替换为真正的值。

- `<3>` 处，调用 `#processProperties(ConfigurableListableBeanFactory beanFactory, Properties props)` 方法，前面两个步骤已经将配置文件中的值进行了处理，那么该方法就是真正的替换过程，该方法**由子类实现**。代码如下：

  ```java
  // PropertyResourceConfigurer.java
  
  protected abstract void processProperties(ConfigurableListableBeanFactory beanFactory, Properties props)
  		throws BeansException;
  ```

### 2. PropertyPlaceholderConfigurer

在 PropertyPlaceholderConfigurer 中，重写 `#processProperties(ConfigurableListableBeanFactory beanFactory, Properties props)` 方法，代码如下：

```java
// PropertyPlaceholderConfigurer.java

@Override
protected void processProperties(ConfigurableListableBeanFactory beanFactoryToProcess, Properties props)
        throws BeansException {
    // <1> 创建 StringValueResolver 对象
    StringValueResolver valueResolver = new PlaceholderResolvingStringValueResolver(props);
    // <2> 处理
    doProcessProperties(beanFactoryToProcess, valueResolver);
}
```

#### 2.1 PlaceholderResolvingStringValueResolver

> 对应 `#processProperties(ConfigurableListableBeanFactory beanFactoryToProcess, Properties props)` 方法的 `<1>` 处。

首先，构造一个 PlaceholderResolvingStringValueResolver 类型的 StringValueResolver 实例。StringValueResolver 为一个解析 String 类型值的策略接口，该接口提供了 `#resolveStringValue(String strVal)` 方法，用于解析 String 值。PlaceholderResolvingStringValueResolver 为其一个解析策略，构造方法如下：

```java
// PropertyPlaceholderConfigurer.java
    
private class PlaceholderResolvingStringValueResolver implements StringValueResolver {
    
	private final PropertyPlaceholderHelper helper;
    
	private final PlaceholderResolver resolver;
    
	public PlaceholderResolvingStringValueResolver(Properties props) {
		this.helper = new PropertyPlaceholderHelper(
				placeholderPrefix, placeholderSuffix, valueSeparator, ignoreUnresolvablePlaceholders);
		this.resolver = new PropertyPlaceholderConfigurerResolver(props);
	}
	
	// ... 省略 resolveStringValue 方法
}
```

- 在构造 String 值解析器 StringValueResolver 时，将已经解析的 Properties 实例对象封装在 PlaceholderResolver 实例 `resolver` 中。PlaceholderResolver 是一个用于解析字符串中包含占位符的替换值的策略接口，该接口有一个 `#resolvePlaceholder(String strVa)` 方法，用于返回占位符的替换值。
- 还有一个 PropertyPlaceholderHelper 工具 `helper` ，从名字上面看应该是进行替换的工具类。

#### 2.2 doProcessProperties

> 对应 `#processProperties(ConfigurableListableBeanFactory beanFactoryToProcess, Properties props)` 方法的 `<2>` 处。

然后，得到 String 解析器的实例 `valueResolver` 后，则会调用 `#doProcessProperties(ConfigurableListableBeanFactory beanFactoryToProcess, StringValueResolver valueResolver)` 方法，来进行真值的替换操作。该方法在父类 PlaceholderConfigurerSupport 中实现，代码如下：

```java
// PlaceholderConfigurerSupport.java
    
protected void doProcessProperties(ConfigurableListableBeanFactory beanFactoryToProcess,
        StringValueResolver valueResolver) {
    // <2.1> 创建 BeanDefinitionVisitor 对象
    BeanDefinitionVisitor visitor = new BeanDefinitionVisitor(valueResolver);
    
    String[] beanNames = beanFactoryToProcess.getBeanDefinitionNames();
    for (String curName : beanNames) {
        // 校验
        // Check that we're not parsing our own bean definition,
        // to avoid failing on unresolvable placeholders in properties file locations.
        if (!(curName.equals(this.beanName) // 1. 当前实例 PlaceholderConfigurerSupport 不在解析范围内
                && beanFactoryToProcess.equals(this.beanFactory))) { // 2. 同一个 Spring 容器
            BeanDefinition bd = beanFactoryToProcess.getBeanDefinition(curName);
            try {
                visitor.visitBeanDefinition(bd);
            } catch (Exception ex) {
                throw new BeanDefinitionStoreException(bd.getResourceDescription(), curName, ex.getMessage(), ex);
            }
        }
    }
    
    // New in Spring 2.5: resolve placeholders in alias target names and aliases as well.
    // <2.3> 别名的占位符
    beanFactoryToProcess.resolveAliases(valueResolver);
    
    // New in Spring 3.0: resolve placeholders in embedded values such as annotation attributes.
    // <2.4> 解析嵌入值的占位符，例如注释属性
    beanFactoryToProcess.addEmbeddedValueResolver(valueResolver);
}
```

- `<2.1`> 处，根据 String 值解析策略 `valueResolver` 得到 BeanDefinitionVisitor 实例。BeanDefinitionVisitor 是 BeanDefinition 的访问者，我们通过它可以实现对 BeanDefinition 内容的进行访问，内容很多，例如 Scope、PropertyValues、FactoryMethodName 等等。
- `<2.2`> 处，得到该容器的所有 BeanName，然后对其进行访问（ `#visitBeanDefinition(BeanDefinition beanDefinition)` 方法）。
- `<2.3`> 处，解析别名的占位符。
- `<2.4`> 处，解析嵌入值的占位符，例如注释属性。

##### 2.2.1 visitBeanDefinition

这个方法的**核心**在于 `#visitBeanDefinition(BeanDefinition beanDefinition)` 方法的调用，代码如下：

```java
// BeanDefinitionVisitor.java

public void visitBeanDefinition(BeanDefinition beanDefinition) {
	visitParentName(beanDefinition);
	visitBeanClassName(beanDefinition);
	visitFactoryBeanName(beanDefinition);
	visitFactoryMethodName(beanDefinition);
	visitScope(beanDefinition);
	if (beanDefinition.hasPropertyValues()) {
		visitPropertyValues(beanDefinition.getPropertyValues());
	}
	if (beanDefinition.hasConstructorArgumentValues()) {
		ConstructorArgumentValues cas = beanDefinition.getConstructorArgumentValues();
		visitIndexedArgumentValues(cas.getIndexedArgumentValues());
		visitGenericArgumentValues(cas.getGenericArgumentValues());
	}
}
```

- 我们可以看到该方法基本访问了 BeanDefinition 中所有值得访问的东西了，包括 parent 、class 、factory-bean 、factory-method 、scope 、property 、constructor-arg 。

##### 2.2.2 visitPropertyValues

本篇文章的主题是 **property** ，所以关注 `#visitPropertyValues(MutablePropertyValues pvs)` 方法即可。代码如下：

```java
// BeanDefinitionVisitor.java

protected void visitPropertyValues(MutablePropertyValues pvs) {
    PropertyValue[] pvArray = pvs.getPropertyValues();
    // 遍历 PropertyValue 数组
    for (PropertyValue pv : pvArray) {
        // 解析真值
        Object newVal = resolveValue(pv.getValue());
        if (!ObjectUtils.nullSafeEquals(newVal, pv.getValue())) {
            // 设置到 PropertyValue 中
            pvs.add(pv.getName(), newVal);
        }
    }
}
```

- 过程就是对属性数组进行遍历，调用 `#resolveValue(Object value)`方法，对属性进行解析获取最新值，如果新值和旧值不等，则用新值替换旧值。

###### 2.2.2.1 resolveValue

`#resolveValue(Object value)` 方法，代码如下：

```java
// BeanDefinitionVisitor.java

@Nullable
protected Object resolveValue(@Nullable Object value) {
	if (value instanceof BeanDefinition) {
		visitBeanDefinition((BeanDefinition) value);
	} else if (value instanceof BeanDefinitionHolder) {
		visitBeanDefinition(((BeanDefinitionHolder) value).getBeanDefinition());
	} else if (value instanceof RuntimeBeanReference) {
		RuntimeBeanReference ref = (RuntimeBeanReference) value;
		String newBeanName = resolveStringValue(ref.getBeanName());
		if (newBeanName == null) {
			return null;
		}
		if (!newBeanName.equals(ref.getBeanName())) {
			return new RuntimeBeanReference(newBeanName);
		}
	} else if (value instanceof RuntimeBeanNameReference) {
		RuntimeBeanNameReference ref = (RuntimeBeanNameReference) value;
		String newBeanName = resolveStringValue(ref.getBeanName());
		if (newBeanName == null) {
			return null;
		}
		if (!newBeanName.equals(ref.getBeanName())) {
			return new RuntimeBeanNameReference(newBeanName);
		}
	} else if (value instanceof Object[]) {
		visitArray((Object[]) value);
	} else if (value instanceof List) {
		visitList((List) value);
	} else if (value instanceof Set) {
		visitSet((Set) value);
	} else if (value instanceof Map) {
		visitMap((Map) value);
	} else if (value instanceof TypedStringValue) {
		TypedStringValue typedStringValue = (TypedStringValue) value;
		String stringValue = typedStringValue.getValue();
		if (stringValue != null) {
			String visitedString = resolveStringValue(stringValue);
			typedStringValue.setValue(visitedString);
		}
	// 由于 Properties 中的是 String，所以重点在此处
	} else if (value instanceof String) {
		return resolveStringValue((String) value);
	}
	return value;
}
```

- 由于配置的是 String 类型，所以只需要看 String 相关的。

###### 2.2.2.2 resolveStringValue

`#resolveStringValue(String strVal)` 方法，代码如下：

```java
// BeanDefinitionVisitor.java

@Nullable
protected String resolveStringValue(String strVal) {
	if (this.valueResolver == null) {
		throw new IllegalStateException("No StringValueResolver specified - pass a resolver " +
				"object into the constructor or override the 'resolveStringValue' method");
	}
	// 解析真值
	String resolvedValue = this.valueResolver.resolveStringValue(strVal);
	// Return original String if not modified.
	return (strVal.equals(resolvedValue) ? strVal : resolvedValue);
}
```

- `valueResolver` 是我们在构造 BeanDefinitionVisitor 实例时传入的 String 类型解析器 PlaceholderResolvingStringValueResolver，调用其 `#resolveStringValue(String strVal)` 方法，代码如下：

```java
// PropertyPlaceholderConfigurer.java
// 内部类 PlaceholderResolvingStringValueResolver.java

@Override
@Nullable
public String resolveStringValue(String strVal) throws BeansException {
    // 解析真值
	String resolved = this.helper.replacePlaceholders(strVal, this.resolver);
	// trim
	if (trimValues) {
		resolved = resolved.trim();
	}
	// 返回真值
	return (resolved.equals(nullValue) ? null : resolved);
}
```

- `helper` 为 PropertyPlaceholderHelper 实例对象，而 PropertyPlaceholderHelper 则是处理应用程序中包含占位符的字符串工具类。在构造 `helper` 实例对象时需要传入了几个参数：`placeholderPrefix`、`placeholderSuffix`、`valueSeparator`，这些值在 PlaceholderConfigurerSupport 中定义如下：

  ```java
  // PlaceholderConfigurerSupport.java
  	
  /** Default placeholder prefix: {@value}. */
  public static final String DEFAULT_PLACEHOLDER_PREFIX = "${";
  /** Default placeholder suffix: {@value}. */
  public static final String DEFAULT_PLACEHOLDER_SUFFIX = "}";
  /** Default value separator: {@value}. */
  public static final String DEFAULT_VALUE_SEPARATOR = ":";
  
  
  /** Defaults to {@value #DEFAULT_PLACEHOLDER_PREFIX}. */
  protected String placeholderPrefix = DEFAULT_PLACEHOLDER_PREFIX;
  /** Defaults to {@value #DEFAULT_PLACEHOLDER_SUFFIX}. */
  protected String placeholderSuffix = DEFAULT_PLACEHOLDER_SUFFIX;
  /** Defaults to {@value #DEFAULT_VALUE_SEPARATOR}. */
  @Nullable
  protected String valueSeparator = DEFAULT_VALUE_SEPARATOR;
  ```

###### 2.2.2.3 replacePlaceholders

调用 PropertyPlaceholderHelper 的 `#replacePlaceholders(String value, PlaceholderResolver placeholderResolver)` 方法，进行占位符替换，代码如下：

```java
public String replacePlaceholders(String value, PlaceholderResolver placeholderResolver) {
	Assert.notNull(value, "'value' must not be null");
	return parseStringValue(value, placeholderResolver, new HashSet<>());
}
```

- 调用 `#parseStringValue(String value, PlaceholderResolver placeholderResolver, Set<String> visitedPlaceholders)` 方法，**这个方法是这篇博客最核心的地方**，`${}` 占位符的替换。代码如下：

  ```java
  // PropertyPlaceholderHelper.java
  
  protected String parseStringValue(String value, PlaceholderResolver placeholderResolver, Set<String> visitedPlaceholders) {
      StringBuilder result = new StringBuilder(value);
      // 获取前缀 "${" 的索引位置
      int startIndex = value.indexOf(this.placeholderPrefix);
      while (startIndex != -1) {
          // 获取 后缀 "}" 的索引位置
          int endIndex = findPlaceholderEndIndex(result, startIndex);
          if (endIndex != -1) {
              // 截取 "${" 和 "}" 中间的内容，这也就是我们在配置文件中对应的值
              String placeholder = result.substring(startIndex + this.placeholderPrefix.length(), endIndex);
              String originalPlaceholder = placeholder;
              if (!visitedPlaceholders.add(originalPlaceholder)) {
                  throw new IllegalArgumentException(
                          "Circular placeholder reference '" + originalPlaceholder + "' in property definitions");
              }
              // Recursive invocation, parsing placeholders contained in the placeholder key.
              // 解析占位符键中包含的占位符，真正的值
              placeholder = parseStringValue(placeholder, placeholderResolver, visitedPlaceholders);
              // Now obtain the value for the fully resolved key...
              // 从 Properties 中获取 placeHolder 对应的值 propVal
              String propVal = placeholderResolver.resolvePlaceholder(placeholder);
              // 如果不存在
              if (propVal == null && this.valueSeparator != null) {
                  // 查询 : 的位置
                  int separatorIndex = placeholder.indexOf(this.valueSeparator);
                  // 如果存在 :
                  if (separatorIndex != -1) {
                      // 获取 : 前面部分 actualPlaceholder
                      String actualPlaceholder = placeholder.substring(0, separatorIndex);
                      // 获取 : 后面部分 defaultValue
                      String defaultValue = placeholder.substring(separatorIndex + this.valueSeparator.length());
                      // 从 Properties 中获取 actualPlaceholder 对应的值
                      propVal = placeholderResolver.resolvePlaceholder(actualPlaceholder);
                      // 如果不存在 则返回 defaultValue
                      if (propVal == null) {
                          propVal = defaultValue;
                      }
                  }
              }
              if (propVal != null) {
                  // Recursive invocation, parsing placeholders contained in the
                  // previously resolved placeholder value.
                  propVal = parseStringValue(propVal, placeholderResolver, visitedPlaceholders);
                  result.replace(startIndex, endIndex + this.placeholderSuffix.length(), propVal);
                  if (logger.isTraceEnabled()) {
                      logger.trace("Resolved placeholder '" + placeholder + "'");
                  }
                  startIndex = result.indexOf(this.placeholderPrefix, startIndex + propVal.length());
              } else if (this.ignoreUnresolvablePlaceholders) {
                  // Proceed with unprocessed value.
                  // 忽略值
                  startIndex = result.indexOf(this.placeholderPrefix, endIndex + this.placeholderSuffix.length());
              } else {
                  throw new IllegalArgumentException("Could not resolve placeholder '" +
                          placeholder + "'" + " in value \"" + value + "\"");
              }
              visitedPlaceholders.remove(originalPlaceholder);
          } else {
              startIndex = -1;
          }
      }
      // 返回propVal，就是替换之后的值
      return result.toString();
  }
  ```

  1. 获取占位符前缀 `"${"` 的索引位置 `startIndex` 。
  2. 如果前缀 `"${"` 存在，则从 `“{”` 后面开始获取占位符后缀 “}” 的索引位置 `endIndex` 。
  3. 如果前缀 `“${”` 和后缀 `"}"` 都存在，则截取中间部分 `placeholder` 。
  4. 从 Properties 中获取 `placeHolder` 对应的值 `propVal` 。
  5. 如果 `propVal` 为空，则判断占位符中是否存在 `":"`，如果存在则对占位符进行分割处理，全面部分为 `actualPlaceholder`，后面部分 `defaultValue`，尝试从 Properties 中获取 `actualPlaceholder` 对应的值 `propVal`，如果不存在，则将 `defaultValue` 的值赋值给 `propVal`
  6. 返回 `propVal`，也就是 Properties 中对应的值。

### 3. 小结

到这里占位符的解析就结束了，下篇我们将利用 PropertyPlaceholderConfigurer 来实现动态加载配置文件，这个场景也是非常常见的。

## IoC之PropertyPlaceholderConfigurer的应用

在博客 [《【死磕 Spring】—— IoC 之深入分析 PropertyPlaceholderConfigurer》](http://svip.iocoder.cn/Spring/IoC-PropertyPlaceholderConfigurer) 中了解了 PropertyPlaceholderConfigurer 内部实现原理，它**允许我们在 XML 配置文件中使用占位符并将这些占位符所代表的资源单独配置到简单的 properties 文件中来加载**。这个特性非常重要，因为它我们对 Bean 实例属性的配置变得非常容易控制了，主要使用场景有：

1. 动态加载配置文件，多环境切换
2. 属性加解密

下面我们就第一个应用场景来做说明。

### 1. 多环境切换

在我们项目开发过程中，都会存在多个环境，如 dev 、test 、prod 等等，各个环境的配置都会不一样，在传统的开发过程中我们都是在进行打包的时候进行人工干预，或者将配置文件放在系统外部，加载的时候指定加载目录，这种方式容易出错，那么有没有一种比较好的方式来解决这种情况呢？有，**利用 PropertyPlaceholderConfigurer 的特性来动态加载配置文件，实现多环境切换**。

首先我们定义四个 Properties 文件，如下：

![image-20230109175349436](../../_media/analysis/spring/image-20230109175349436.png)

配置内容如下：

- `application-dev.properties` 文件，如下：

  ```java
  student.name=chenssy-dev
  ```

- `application-test.properties` 文件，如下：

  ```java
  student.name=chenssy-test
  ```

- `application-prod.properties` 文件，如下：

  ```java
  student.name=chenssy-prod
  ```

然后实现一个类，该类继承 PropertyPlaceholderConfigurer，实现 `#loadProperties(Properties props)` 方法，根据环境的不同加载不同的配置文件，代码如下：

```java
public class CustomPropertyConfig extends PropertyPlaceholderConfigurer {

    private Resource[] locations;

    private PropertiesPersister propertiesPersister = new DefaultPropertiesPersister();

    @Override
    public void setLocations(Resource[] locations) {
        this.locations = locations;
    }

    @Override
    public void setLocalOverride(boolean localOverride) {
        this.localOverride = localOverride;
    }

    /**
     * 覆盖这个方法，根据启动参数，动态读取配置文件
     * @param props
     * @throws IOException
     */
    @Override
    protected void loadProperties(Properties props) throws IOException {
        if (locations != null) {
            // locations 里面就已经包含了那三个定义的文件
            for (Resource location : this.locations) {
                InputStream is = null;
                try {
                    String filename = location.getFilename();
                    String env = "application-" + System.getProperty("spring.profiles.active", "dev") + ".properties";

                    // 找到我们需要的文件，加载
                    if (filename.contains(env)) {
                        logger.info("Loading properties file from " + location);
                        is = location.getInputStream();
                        this.propertiesPersister.load(props, is);

                    }
                } catch (IOException ex) {
                    logger.info("读取配置文件失败.....");
                    throw ex;
                } finally {
                    if (is != null) {
                        is.close();
                    }
                }
            }
        }
    }
}
```

配置文件：

```java
<bean id="PropertyPlaceholderConfigurer" class="org.springframework.core.custom.CustomPropertyConfig">
    <property name="locations">
        <list>
            <value>classpath:config/application-dev.properties</value>
            <value>classpath:config/application-test.properties</value>
            <value>classpath:config/application-prod.properties</value>
        </list>
    </property>
</bean>

<bean id="studentService" class="org.springframework.core.service.StudentService">
    <property name="name" value="${student.name}"/>
</bean>
```

在 idea 的 VM options 里面增加 `-Dspring.profiles.active=dev`，标志当前环境为 dev 环境。测试代码如下：

```java
ApplicationContext context = new ClassPathXmlApplicationContext("spring.xml");

StudentService studentService = (StudentService) context.getBean("studentService");
System.out.println("student name:" + studentService.getName());
```

运行结果：

```java
student name:chenssy-dev
```

当将 `-Dspring.profiles.active` 调整为 test，则打印结果则是 chenssy-test，这样就完全实现了根据不同的环境加载不同的配置。

如果各位用过 Spring Boot 的话，这个就完全是 Spring Boot 里面的 `spring.profiles.active` ，可参见 `org.springframework.core.envAbstractEnvironment` 类，对应博客为 [《Spring boot源码分析-profiles环境（4）》](https://blog.csdn.net/jamet/article/details/77508182) 。

### 2. 小结

PropertyPlaceholderConfigurer 对于属性的配置非常灵活，就看怎么玩了。

## IoC 之深入分析 PropertyOverrideConfigurer

﻿在文章 [《【死磕 Spring】—— IoC 之深入分析 BeanFactoryPostProcessor》](http://svip.iocoder.cn/Spring/IoC-BeanFactoryPostProcessor) 中提到，BeanFactoryPostProcessor 作用与 BeanDefinition 完成加载之后与 Bean 实例化之前，是 Spring 提供的一种强大的扩展机制。它有两个重要的子类，一个是 PropertyPlaceholderConfigurer，另一个是 PropertyOverrideConfigurer ，其中 PropertyPlaceholderConfigurer 允许我们通过配置 Properties 的方式来取代 Bean 中定义的占位符，而 **PropertyOverrideConfigurer** 呢？正是我们这篇博客介绍的。

> PropertyOverrideConfigurer 允许我们对 Spring 容器中配置的任何我们想处理的 bean 定义的 property 信息进行覆盖替换。

这个定义听起来有点儿玄乎，通俗点说，就是我们可以通过 PropertyOverrideConfigurer 来覆盖任何 bean 中的任何属性，只要我们想。

### 1. 使用

PropertyOverrideConfigurer 的使用规则是 `beanName.propertyName=value`，这里需要注意的是 `beanName.propertyName` 则是该 bean 中存在的属性。

#### 1.1 示例一

依然使用以前的例子，`Student.class`，我们只需要修改下配置文件，声明下 PropertyOverrideConfigurer 以及其加载的配置文件。如下：

```java
<bean class="org.springframework.beans.factory.config.PropertyOverrideConfigurer">
    <property name="locations">
        <list>
            <value>classpath:application.properties</value>
        </list>
    </property>
</bean>

<bean id="student" class="org.springframework.core.service.StudentService">
    <property name="name" value="chenssy"/>
</bean>
```

- 指定 student 的 `name` 属性值为 `"chenssy"` 。

- 声明 PropertyOverrideConfigurer 加载的文件为 `application.properties`，内容如下：

  ```
  student.name = chenssy-PropertyOverrideConfigurer
  ```

  - 指定 beanName 为 `student` 的 bean 的 `name` 属性值为 `"chenssy-PropertyOverrideConfigurer"` 。

测试打印 `student` 中的 `name` 属性值，代码如下：

```java
ApplicationContext context = new ClassPathXmlApplicationContext("spring.xml");

StudentService studentService = (StudentService) context.getBean("student");
System.out.println("student name:" + studentService.getName());
```

运行结果为：

![image-20230109175544033](../../_media/analysis/spring/image-20230109175544033.png)

从中可以看出 PropertyOverrideConfigurer 定义的文件取代了 bean 中默认的值。

#### 1.2 示例二

下面我们看一个有趣的例子，如果我们一个 bean 中 PropertyPlaceholderConfigurer 和 PropertyOverrideConfigurer 都使用呢？那是显示谁定义的值呢？这里先简单分析下：如果PropertyOverrideConfigurer 先作用，那么 PropertyPlaceholderConfigurer 在匹配占位符的时候就找不到了，**如果 PropertyOverrideConfigurer 后作用，也会直接取代 PropertyPlaceholderConfigurer 定义的值，所以无论如何都会显示 PropertyOverrideConfigurer 定义的值**。是不是这样呢？看如下例子：

xml 配置文件调整如下：

```java
<bean class="org.springframework.beans.factory.config.PropertyOverrideConfigurer">
    <property name="locations">
        <list>
            <value>classpath:application1.properties</value>
        </list>
    </property>
</bean>

<bean class="org.springframework.beans.factory.config.PropertyPlaceholderConfigurer">
    <property name="locations">
        <list>
            <value>classpath:application2.properties</value>
        </list>
    </property>
</bean>

<bean id="student" class="org.springframework.core.service.StudentService">
    <property name="name" value="${studentService.name}"/>
</bean>
```

- 指定 .PropertyOverrideConfigurer 加载文件为 `application1.properties` 。配置文件如下：

  ```
  student.name = chenssy-PropertyOverrideConfigurer
  ```

- PropertyPlaceholderConfigurer 加载文件为 `application2.properties` 。配置文件如下：

  ```
  studentService.name = chenssy-PropertyPlaceholderConfigurer
  ```

- `student` 的 `name` 属性使用占位符 `${studentService.name}`。

测试程序依然是打印 name 属性值，运行结果如下：

![image-20230109175607384](../../_media/analysis/spring/image-20230109175607384.png)

所以，上面的分析没有错。下面我们来分析 **PropertyOverrideConfigurer 实现原理**。
其实如果了解 PropertyPlaceholderConfigurer 的实现机制的话，那么 PropertyOverrideConfigurer 也不难猜测：加载指定 Properties，迭代其中的属性值，依据 `“.”` 来得到 `beanName`（`split(".")[0]`），从容器中获取指定的 BeanDefinition，然后得到 `name` 属性，进行替换即可。

### 2. 实现原理

UML 结构图如下：

![image-20230109175618838](../../_media/analysis/spring/image-20230109175618838.png)

与 PropertyPlaceholderConfigurer 一样，也是继承 PropertyResourceConfigurer，我们知道 PropertyResourceConfigurer 对 BeanFactoryPostProcessor 的 `#postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory)` 方法提供了实现，在该实现中它会去读取指定配置文件中的内容，然后调用 `#processProperties(ConfigurableListableBeanFactory beanFactoryToProcess, Properties props)` 方法。该方法是一个抽象方法，具体的实现由子类来实现，所以这里我们只需要看 PropertyOverrideConfigurer 中 `#processProperties(ConfigurableListableBeanFactory beanFactoryToProcess, Properties props)` 方法的具体实现，代码如下：

```java
// PropertyOverrideConfigurer.java

@Override
protected void processProperties(ConfigurableListableBeanFactory beanFactory, Properties props)
        throws BeansException {
    // 迭代配置文件中的内容
    for (Enumeration<?> names = props.propertyNames(); names.hasMoreElements();) {
        String key = (String) names.nextElement();
        try {
            processKey(beanFactory, key, props.getProperty(key));
        } catch (BeansException ex) {
            String msg = "Could not process key '" + key + "' in PropertyOverrideConfigurer";
            if (!this.ignoreInvalidKeys) {
                throw new BeanInitializationException(msg, ex);
            }
            if (logger.isDebugEnabled()) {
                logger.debug(msg, ex);
            }
        }
    }
}
```

- 迭代 `props` 数组，依次调用 `#processKey(ConfigurableListableBeanFactory factory, String key, String value)` 方法，代码如下:

  ```java
  // PropertyOverrideConfigurer.java
  
  /**
   * The default bean name separator.
   */
  public static final String DEFAULT_BEAN_NAME_SEPARATOR = ".";
  /**
   * Bean 名字的分隔符
   */
  private String beanNameSeparator = DEFAULT_BEAN_NAME_SEPARATOR;
  /**
   * Contains names of beans that have overrides.
   */
  private final Set<String> beanNames = Collections.newSetFromMap(new ConcurrentHashMap<>(16));
  protected void processKey(ConfigurableListableBeanFactory factory, String key, String value)
          throws BeansException {
      // 判断是否存在 "."，即获取其索引位置
      int separatorIndex = key.indexOf(this.beanNameSeparator);
      if (separatorIndex == -1) {
          throw new BeanInitializationException("Invalid key '" + key +
                  "': expected 'beanName" + this.beanNameSeparator + "property'");
      }
      // 得到 beanName
      String beanName = key.substring(0, separatorIndex);
      // 得到属性值
      String beanProperty = key.substring(separatorIndex+1);
      this.beanNames.add(beanName);
      // 替换
      applyPropertyValue(factory, beanName, beanProperty, value);
      if (logger.isDebugEnabled()) {
          logger.debug("Property '" + key + "' set to value [" + value + "]");
      }
  }
  ```

  - 获取分割符 `“.”` 的索引位置，得到 `beanName` 以及相应的属性，然后调用 `#applyPropertyValue(ConfigurableListableBeanFactory factory, String beanName, String property, String value)` 方法，代码如下：

    ```java
    // PropertyOverrideConfigurer.java
    
    protected void applyPropertyValue(ConfigurableListableBeanFactory factory, String beanName, String property, String value) {
        // 获得 BeanDefinition 对象
        BeanDefinition bd = factory.getBeanDefinition(beanName);
        BeanDefinition bdToUse = bd;
        while (bd != null) {
            bdToUse = bd;
            bd = bd.getOriginatingBeanDefinition();
        }
        // 设置 PropertyValue 到 BeanDefinition 中
        PropertyValue pv = new PropertyValue(property, value);
        pv.setOptional(this.ignoreInvalidKeys);
        bdToUse.getPropertyValues().addPropertyValue(pv);
    }
    ```

    - 从容器中获取 BeanDefinition ，然后根据属性 `property` 和其值 `value` 构造成一个 PropertyValue 对象，最后调用 `#addPropertyValue(PropertyValue pv )` 方法。PropertyValue 是用于保存一组bean属性的信息和值的对像。代码如下：

      ```java
      // MutablePropertyValues.java
      
      public MutablePropertyValues addPropertyValue(PropertyValue pv) {
          for (int i = 0; i < this.propertyValueList.size(); i++) {
              PropertyValue currentPv = this.propertyValueList.get(i);
              // 匹配
              if (currentPv.getName().equals(pv.getName())) {
                  // 合并属性
                  pv = mergeIfRequired(pv, currentPv);
                  // 覆盖属性
                  setPropertyValueAt(pv, i);
                  return this;
              }
          }
          // 未匹配到，添加到 propertyValueList 中
          this.propertyValueList.add(pv);
          return this;
      }
      ```

      - 添加 PropertyValue 对象，替换或者合并相同的属性值。整个过程其实与上面猜测相差不是很大。

### 3. 小结

至此，PropertyOverrideConfigurer 到这里也就分析完毕了。最后看下 PropertyPlaceholderConfigurer 和 PropertyOverrideConfigurer 整体的结构图：

![image-20230109175647852](../../_media/analysis/spring/image-20230109175647852.png)

## IoC 之深入分析 Bean 的类型转换体系

﻿我们知道不管 Bean 对象里面的属性时什么类型，他们都是通过 XML 、Properties 或者其他方式来配置这些**属性**对象类型的。在 Spring 容器加载过程中，这些属性都是以 String 类型加载进容器的，但是最终都需要将这些 String 类型的属性转换 Bean 对象属性所对应真正的类型，要想完成这种由字符串到具体对象的转换，就需要这种转换规则相关的信息，而这些信息以及转换过程由 **Spring 类型转换体系**来完成。

------

我们依然以 xml 为例，在 Spring 容器加载阶段，容器将 xml 文件中定义的 `<bean>` 解析为 BeanDefinition，BeanDefinition 中存储着我们定义一个 bean 需要的所有信息，包括属性，这些属性是以 String 类型的存储的。当用户触发 Bean 实例化阶段时，Spring 容器会将这些属性转换为这些属性真正对应的类型。我们知道在 Bean 实例化阶段，属性的注入是在实例化 Bean 阶段的属性注入阶段，即 AbstractAutowireCapableBeanFactory 的 `#populateBean(String beanName, RootBeanDefinition mbd, BeanWrapper bw)` 方法。

在 `#populateBean(String beanName, RootBeanDefinition mbd, BeanWrapper bw)` 方法中，会将 BeanDefinition 中定义的属性值翻译为 PropertyValue ，然后调用 `#applyPropertyValues(String beanName, BeanDefinition mbd, BeanWrapper bw, PropertyValues pvs)` 方法，进行属性应用。其中 PropertyValue 用于保存单个 bean 属性的信息和值的对象。

------

在 `#applyPropertyValues(String beanName, BeanDefinition mbd, BeanWrapper bw, PropertyValues pvs)` 方法中，会调用 `#convertForProperty(Object value, String propertyName, BeanWrapper bw, TypeConverter converter)` 进行属性转换，代码如下：

```java
// AbstractAutowireCapableBeanFactory。java

@Nullable
private Object convertForProperty(
        @Nullable Object value, String propertyName, BeanWrapper bw, TypeConverter converter) {
    // 若 TypeConverter 为 BeanWrapperImpl 类型，则使用 BeanWrapperImpl 来进行类型转换
    // 这里主要是因为 BeanWrapperImpl 实现了 PropertyEditorRegistry 接口
    if (converter instanceof BeanWrapperImpl) {
        return ((BeanWrapperImpl) converter).convertForProperty(value, propertyName);
    } else {
        // 获得属性对应的 PropertyDescriptor 对象
        PropertyDescriptor pd = bw.getPropertyDescriptor(propertyName);
        // 获得属性对应的 setting MethodParameter 对象
        MethodParameter methodParam = BeanUtils.getWriteMethodParameter(pd);
        // 执行转换
        return converter.convertIfNecessary(value, pd.getPropertyType(), methodParam);
    }
}
```

- 若 TypeConverter 为 BeanWrapperImpl 类型，则使用 BeanWrapperImpl 来进行类型转换，这里主要是因为 BeanWrapperImpl 实现了 PropertyEditorRegistry 接口。
- 否则，调用 TypeConverter 的 `#convertIfNecessary(Object value, Class<T> requiredType, MethodParameter methodParam)` 方法，进行类型转换。TypeConverter 是定义类型转换方法的接口，通常情况下与 PropertyEditorRegistry 配合使用实现类型转换。
- 关于 BeanWrapperImpl 小编后续专门出文分析它。

------

`#convertIfNecessary(Object value, Class<T> requiredType, MethodParameter methodParam)` 方法的实现者有两个：DataBinder 和 TypeConverterSupport 类。

- DataBinder 主要用于参数绑定（熟悉 Spring MVC 的都应该知道这个类）
- TypeConverterSupport 则是 TypeConverter 的基本实现，使用的是 `typeConverterDelegate` 委托者。

所以这里我们只需要关注 TypeConverterSupport 的 `#convertIfNecessary(Object value, Class<T> requiredType, MethodParameter methodParam)` 方法，代码如下：

```java
// TypeConverterSupport.java

@Override
@Nullable
public <T> T convertIfNecessary(@Nullable Object value, @Nullable Class<T> requiredType, @Nullable Field field)
        throws TypeMismatchException {
    return doConvert(value, requiredType, null, field);
}

@Nullable
private <T> T doConvert(@Nullable Object value,@Nullable Class<T> requiredType,
        @Nullable MethodParameter methodParam, @Nullable Field field) throws TypeMismatchException {
    Assert.state(this.typeConverterDelegate != null, "No TypeConverterDelegate");
    try {
        if (field != null) { // field
            return this.typeConverterDelegate.convertIfNecessary(value, requiredType, field);
        } else { // methodParam
            return this.typeConverterDelegate.convertIfNecessary(value, requiredType, methodParam);
        }
    } catch (ConverterNotFoundException | IllegalStateException ex) {
        throw new ConversionNotSupportedException(value, requiredType, ex);
    } catch (ConversionException | IllegalArgumentException ex) {
        throw new TypeMismatchException(value, requiredType, ex);
    }
}
```

我们一直往下跟会跟踪到 TypeConverterDelegate 的 `#convertIfNecessary(Object newValue, @Nullable Class<T> requiredType, ...)` 方法，会发现如下代码段：

```java
// TypeConverterDelegate.java

@Nullable
public <T> T convertIfNecessary(@Nullable String propertyName, @Nullable Object oldValue, @Nullable Object newValue,
        @Nullable Class<T> requiredType, @Nullable TypeDescriptor typeDescriptor) throws IllegalArgumentException {

        // ... 省略暂时非关键的代码

        // No custom editor but custom ConversionService specified?
        ConversionService conversionService = this.propertyEditorRegistry.getConversionService();
        if (editor == null && conversionService != null && newValue != null && typeDescriptor != null) {
            TypeDescriptor sourceTypeDesc = TypeDescriptor.forObject(newValue);
            if (conversionService.canConvert(sourceTypeDesc, typeDescriptor)) {
                try {
                    return (T) conversionService.convert(newValue, sourceTypeDesc, typeDescriptor);
                } catch (ConversionFailedException ex) {
                    // fallback to default conversion logic below
                    conversionAttemptEx = ex;
                }
            }
        }

        // ... 省略暂时非关键的代码
}
```

- 如果没有自定义的编辑器则使用 ConversionService 。

------

ConversionService 是字 Spring 3 后推出来用来替代 PropertyEditor 转换模式的转换体系，接口定义如下：

```java
// ConversionService.java

public interface ConversionService {

    boolean canConvert(@Nullable Class<?> sourceType, Class<?> targetType);

    boolean canConvert(@Nullable TypeDescriptor sourceType, TypeDescriptor targetType);

    @Nullable
    <T> T convert(@Nullable Object source, Class<T> targetType);

    @Nullable
    Object convert(@Nullable Object source, @Nullable TypeDescriptor sourceType, TypeDescriptor targetType);

}
```

其 UML 类图如下：

![image-20230109175746134](../../_media/analysis/spring/image-20230109175746134.png)



- **ConfigurableConversionService**：ConversionService 的配置接口，继承 ConversionService 和 ConverterRegistry 两个接口，用于合并他们两者的操作，以便于通过 add 和 remove 的方式添加和删除转换器。
- **GenericConversionService**：ConversionService 接口的基础实现，适用于大部分条件下的转换工作，通过 ConfigurableConversionService 接口间接地将 ConverterRegistry 实现为注册 API 。
- **DefaultConversionService**：ConversionService 接口的默认实现，适用于大部分条件下的转换工作。

------

回归到 TypeConverterDelegate 的 `#convertIfNecessary(String propertyName, Object oldValue, @Nullable Object newValue, Class<T> requiredType, TypeDescriptor typeDescriptor)` 方法，在该方法中，如果没有自定义的属性编辑器，则调用 ConversionService 接口的 `#convert(...)`，方法定义如下：

```java
// ConversionService.java

Object convert(@Nullable Object source, @Nullable TypeDescriptor sourceType, TypeDescriptor targetType);
```

- `source` ：要转换的源对象，可以为 `null` 。
- `sourceType`：`source` 的类型的上下文，如果 `source` 为 `null` ，则可以为 `null` 。
- `targetType` ：`source` 要转换的类型的上下文。

`#convert(...)` 方法，将给定的源对象 `source` 转换为指定的 `targetType` 。TypeDescriptors 提供有关发生转换的源位置和目标位置的附加上下文，通常是对象字段或属性位置。该方法由子类 GenericConversionService 实现：

```java
// GenericConversionService.java

@Override
@Nullable
public Object convert(@Nullable Object source, @Nullable TypeDescriptor sourceType, TypeDescriptor targetType) {
    Assert.notNull(targetType, "Target type to convert to cannot be null");
    // <1> 如果 sourceType 为空，则直接处理结果
    if (sourceType == null) {
        Assert.isTrue(source == null, "Source must be [null] if source type == [null]");
        return handleResult(null, targetType, convertNullSource(null, targetType));
    }
    // <2> 如果类型不对，抛出 IllegalArgumentException 异常
    if (source != null && !sourceType.getObjectType().isInstance(source)) {
        throw new IllegalArgumentException("Source to convert from must be an instance of [" +
                sourceType + "]; instead it was a [" + source.getClass().getName() + "]");
    }
    // <3> 获得对应的 GenericConverter 对象
    GenericConverter converter = getConverter(sourceType, targetType);
    // <4> 如果 converter 非空，则进行转换，然后再处理结果
    if (converter != null) {
        // <4.1> 执行转换
        Object result = ConversionUtils.invokeConverter(converter, source, sourceType, targetType);
        // <4.2> 处理器结果
        return handleResult(sourceType, targetType, result);
    }
    // <5> 处理 converter 为空的情况
    return handleConverterNotFound(source, sourceType, targetType);
}
```

- `<1>` 处，如果 `sourceType` 为空，则直接处理结果。

- `<2>` 处，如果类型不对，抛出 IllegalArgumentException 异常。

- `<3>` 处，调用 `#getConverter(TypeDescriptor sourceType, TypeDescriptor targetType)` 方法，获取 GenericConverter 对象 `converter` 。

- `<4>` 处，如果 `converter` 非空，则进行转换，然后再处理结果。

  - `<4.1>` 处，调用 `ConversionUtils#invokeConverter(GenericConverter converter, Object source, TypeDescriptor sourceType, TypeDescriptor targetType)` 方法，执行转换。代码如下：

    ```java
    // ConversionUtils.java
    
    @Nullable
    public static Object invokeConverter(GenericConverter converter, @Nullable Object source,
            TypeDescriptor sourceType, TypeDescriptor targetType) {
        try {
            // 执行转换
            return converter.convert(source, sourceType, targetType);
        } catch (ConversionFailedException ex) {
            throw ex;
        } catch (Throwable ex) {
            throw new ConversionFailedException(sourceType, targetType, source, ex);
        }
    }
    ```

    - 【重要】在这里，我们看到执行转换。

  - `<4.2>` 处，调用 `#handleResult(TypeDescriptor sourceType, TypeDescriptor targetType, Object result)` 方法，处理结果。代码如下：

    ```java
    // GenericConversionService.java
    
    @Nullable
    private Object handleResult(@Nullable TypeDescriptor sourceType, TypeDescriptor targetType, @Nullable Object result) {
    	if (result == null) {
    		assertNotPrimitiveTargetType(sourceType, targetType);
    	}
    	return result;
    }
    
    private void assertNotPrimitiveTargetType(@Nullable TypeDescriptor sourceType, TypeDescriptor targetType) {
    	if (targetType.isPrimitive()) {
    		throw new ConversionFailedException(sourceType, targetType, null,
    				new IllegalArgumentException("A null value cannot be assigned to a primitive type"));
    	}
    }
    ```

    - 实际上，是**校验**结果。

- `<5>` 处，调用 `#handleConverterNotFound(Object source, TypeDescriptor sourceType, TypeDescriptor targetType)` 方法，处理 `converter` 为空的情况。代码如下：

  ```java
  // GenericConversionService.java
  
  @Nullable
  private Object handleConverterNotFound(
          @Nullable Object source, @Nullable TypeDescriptor sourceType, TypeDescriptor targetType) {
      // 情况一，如果 source 为空，则返回空
      if (source == null) {
          assertNotPrimitiveTargetType(sourceType, targetType);
          return null;
      }
      // 情况二，如果 sourceType 为空，或者 targetType 是 sourceType 的子类，则返回 source
      if ((sourceType == null || sourceType.isAssignableTo(targetType)) &&
              targetType.getObjectType().isInstance(source)) {
          return source;
      }
      // 抛出 ConverterNotFoundException 异常
      throw new ConverterNotFoundException(sourceType, targetType);
  }
  ```

------

😈 逻辑有点点长，我们先从 `#getConverter(TypeDescriptor sourceType, TypeDescriptor targetType)` 方法，获取 GenericConverter 对象 `converter` 。代码如下：

```java
// GenericConversionService.java

@Nullable
protected GenericConverter getConverter(TypeDescriptor sourceType, TypeDescriptor targetType) {
    // 创建 ConverterCacheKey 对象
    ConverterCacheKey key = new ConverterCacheKey(sourceType, targetType);
    // 从 converterCache 缓存中，获得 GenericConverter 对象 converter
    GenericConverter converter = this.converterCache.get(key);
    // 如果获得到，则返回 converter
    if (converter != null) {
        return (converter != NO_MATCH ? converter : null);
    }

    // 如果获取不到，则从 converters 中查找
    converter = this.converters.find(sourceType, targetType);
    // 如果查找不到，则获得默认的 Converter 对象
    if (converter == null) {
        converter = getDefaultConverter(sourceType, targetType);
    }

    // 如果找到 converter ，则添加 converter 到 converterCache 中，并返回 converter
    if (converter != null) {
        this.converterCache.put(key, converter);
        return converter;
    }

    // 如果找不到 converter ，则添加 NO_MATCH 占位符到 converterCache 中，并返回 null
    this.converterCache.put(key, NO_MATCH);
    return null;
}
```

- 这段代码意图非常明确，从 `converterCache` 缓存中获取，如果存在返回，否则从 `converters` 中获取，然后加入到 `converterCache` 缓存中。

- `converterCache` 和 `converters` 是 GenericConversionService 维护的两个很重要的对象，代码如下：

  ```java
  // GenericConversionService.java
  
  /**
   * 所有 Converter 集合的封装对象
   */
  private final Converters converters = new Converters();
  
  /**
   * GenericConverter 缓存
   */
  private final Map<ConverterCacheKey, GenericConverter> converterCache = new ConcurrentReferenceHashMap<>(64);
  ```

------

Converters 是 GenericConversionService 内部类，用于管理所有注册的转换器，其内部维护一个 Set 和 Map 的数据结构用于管理转换器，代码如下：

```java
// GenericConversionService.java#Converters

private final Set<GenericConverter> globalConverters = new LinkedHashSet<>();

private final Map<ConvertiblePair, ConvertersForPair> converters = new LinkedHashMap<>(36);
```

- 同时提供了相应的方法（如 add、remove）操作这两个集合。

在 `#getConverter(TypeDescriptor sourceType, TypeDescriptor targetType)` 方法中，如果缓存 `converterCache` 中不存在，则调用 Converters 对象的 `#find(TypeDescriptor sourceType, TypeDescriptor targetType)` 方法，查找相应的 GenericConverter，如下：

```java
// GenericConversionService.java#Converters

@Nullable
public GenericConverter find(TypeDescriptor sourceType, TypeDescriptor targetType) {
    // Search the full type hierarchy
    List<Class<?>> sourceCandidates = getClassHierarchy(sourceType.getType());
    List<Class<?>> targetCandidates = getClassHierarchy(targetType.getType());
    // 遍历 sourceCandidates 数组
    for (Class<?> sourceCandidate : sourceCandidates) {
        // 遍历 targetCandidates 数组
        for (Class<?> targetCandidate : targetCandidates) {
            // 创建 ConvertiblePair 对象
            ConvertiblePair convertiblePair = new ConvertiblePair(sourceCandidate, targetCandidate);
            // 获得 GenericConverter 对象
            GenericConverter converter = getRegisteredConverter(sourceType, targetType, convertiblePair);
            if (converter != null) {
                return converter;
            }
        }
    }
    return null;
}

@Nullable
private GenericConverter getRegisteredConverter(TypeDescriptor sourceType,
        TypeDescriptor targetType, ConvertiblePair convertiblePair) {
    // Check specifically registered converters
    // 从 converters 中，获得 converter
    ConvertersForPair convertersForPair = this.converters.get(convertiblePair);
    if (convertersForPair != null) {
        GenericConverter converter = convertersForPair.getConverter(sourceType, targetType);
        if (converter != null) {
            return converter;
        }
    }
    // Check ConditionalConverters for a dynamic match
    // 从 globalConverters 中，获得 globalConverter
    for (GenericConverter globalConverter : this.globalConverters) {
        if (((ConditionalConverter) globalConverter).matches(sourceType, targetType)) {
            return globalConverter;
        }
    }
    return null;
}
```

- 在 `#find(TypeDescriptor sourceType, TypeDescriptor targetT)` 方法中，会根据 `sourceType` 和 `targetType` 去查询 Converters 中维护的 Map 中是否包括支持的注册类型。如果存在返回 GenericConverter ，如果没有存在返回 `null` 。

------

当得到 GenericConverter 后，则调用其 `#convert(Object source, TypeDescriptor sourceType, TypeDescriptor targetType)` 方法，进行类型转换。代码如下：

```java
// GenericConverter.java

Object convert(@Nullable Object source, TypeDescriptor sourceType, TypeDescriptor targetType);
```

到这里我们就可以得到 Bean 属性定义的真正类型了。

**GenericConverter 接口**

GenericConverter 是一个转换接口，一个用于在两种或更多种类型之间转换的通用型转换器接口。它是 Converter SPI 体系中最灵活的，也是最复杂的接口，灵活性在于 GenericConverter 可以支持在多个源/目标类型对之间进行转换，同时也可以在类型转换过程中访问源/目标字段上下文。由于该接口足够复杂，所有当更简单的 Converter 或 ConverterFactory 接口足够使用时，通常不应使用此接口。其定义如下：

```java
// GenericConverter.java

public interface GenericConverter {

    @Nullable
    Set<ConvertiblePair> getConvertibleTypes();

    @Nullable
    Object convert(@Nullable Object source, TypeDescriptor sourceType, TypeDescriptor targetType);

}
```

GenericConverter 的子类有这么多（看类名就知道是干嘛的了）：

![image-20230109175844659](../../_media/analysis/spring/image-20230109175844659.png)



我们看一个子类的实现 StringToArrayConverter，该子类将逗号分隔的 String 转换为 Array 。代码如下：

```java
// StringToArrayConverter.java

final class StringToArrayConverter implements ConditionalGenericConverter {

	private final ConversionService conversionService;

	public StringToArrayConverter(ConversionService conversionService) {
		this.conversionService = conversionService;
	}

	@Override
	public Set<ConvertiblePair> getConvertibleTypes() {
		return Collections.singleton(new ConvertiblePair(String.class, Object[].class));
	}

	@Override
	public boolean matches(TypeDescriptor sourceType, TypeDescriptor targetType) {
		return ConversionUtils.canConvertElements(sourceType, targetType.getElementTypeDescriptor(),
				this.conversionService);
	}

	@Override
	@Nullable
	public Object convert(@Nullable Object source, TypeDescriptor sourceType, TypeDescriptor targetType) {
		if (source == null) {
			return null;
		}
		// 按照 , 分隔成字符串数组
		String string = (String) source;
		String[] fields = StringUtils.commaDelimitedListToStringArray(string);
		// 获得 TypeDescriptor 对象
		TypeDescriptor targetElementType = targetType.getElementTypeDescriptor();
		Assert.state(targetElementType != null, "No target element type");
		// 创建目标数组
		Object target = Array.newInstance(targetElementType.getType(), fields.length);
		// 遍历 fields 数组，逐个转换
		for (int i = 0; i < fields.length; i++) {
			String sourceElement = fields[i];
			// 执行转换
			Object targetElement = this.conversionService.convert(sourceElement.trim(), sourceType, targetElementType);
			// 设置到 target 中
			Array.set(target, i, targetElement);
		}
		return target;
	}

}
```

在类型转换体系中，Spring 提供了非常多的类型转换器，除了上面的 GenericConverter，还有 Converter、ConditionalConverter、ConverterFactory。

------

**Converter**

Converter 是一个将 `<S>` 类型的源对象转换为 `<T>` 类型的目标对象的转换器。该接口是线程安全的，所以可以共享。代码如下:

```java
// Converter.java

public interface Converter<S, T> {

    @Nullable
    T convert(S source);

}
```

子类如下：

![image-20230109175905109](../../_media/analysis/spring/image-20230109175905109.png)

**ConditionalConverter**

ConditionalConverter 接口用于表示有条件的类型转换，通过转入的`sourceType` 与 `targetType` 判断转换能否匹配，只有可匹配的转换才会调用convert 方法进行转换。代码如下：

```java
// ConditionalConverter.java

public interface ConditionalConverter {

    boolean matches(TypeDescriptor sourceType, TypeDescriptor targetType);

}
```

ConditionalConverter 的子类如下：

![image-20230109175922717](../../_media/analysis/spring/image-20230109175922717.png)



------

**ConverterFactory**

一个用于“远程”转换的转换工厂，可以将对象从 `<S>` 转换为 `<R>` 的子类型。代码如下：

```
// ConverterFactory.java

public interface ConverterFactory<S, R> {

    <T extends R> Converter<S, T> getConverter(Class<T> targetType);

}
```

子类如下：

![image-20230109175943160](../../_media/analysis/spring/image-20230109175943160.png)



------

四种不同的转换器承载着不同的转换过程：

- Converter：用于 `1:1` 的 `source -> target` 类型转换。
- ConverterFactory：用于 `1:N` 的 `source -> target` 类型转换。
- GenericConverter用于 `N:N` 的 `source -> target` 类型转换。
- ConditionalConverter：有条件的 `source -> target` 类型转换。

------

**GenericConversionService**

转换器介绍完了，我们再次回归到 ConversionService 接口中去，该接口定义了两类方法：

- `canConvert(sourceType, targetType)` 方法，用于判 `sourceType` 能否转成 `targetType` 。
- `convert(source, targetType)` 方法，用于将 `source` 转成转入的 TargetType 类型实例。

这两类方法都是在 GenericConversionService 中实现。
类 GenericConversionService 实现 ConfigurableConversionService 接口，而 ConfigurableConversionService 接口继承 ConversionService 和 ConverterRegistry。
ConverterRegistry 提供了类型转换器的管理功能，他提供了四个 add 和一个 remove 方法，支持注册/删除相应的类型转换器。

GenericConversionService 作为一个基础实现类，它即支持了不同类型之间的转换，也对各类型转换器进行管理，主要是通过一个 Map 类型的 `converterCache` 和一个内部类 Converters 。在上面已经分析了 GenericConversionService 执行类型转换的过程 `#cover(...)` 方法。下面我们就一个 `addConverter(Converter<?, ?> converter)` 方法，来看看它是如何完成转换器的注入的工作的。代码如下：

```java
// GenericConversionService.java

@Override
public void addConverter(Converter<?, ?> converter) {
    // <1> 获取 ResolvableType 对象，基于 converter.getClass() 类
    ResolvableType[] typeInfo = getRequiredTypeInfo(converter.getClass(), Converter.class);
    // <1> 如果获取不到，并且 converter 是 DecoratingProxy 类型，则基于 ((DecoratingProxy) converter).getDecoratedClass() 类
    if (typeInfo == null && converter instanceof DecoratingProxy) {
        typeInfo = getRequiredTypeInfo(((DecoratingProxy) converter).getDecoratedClass(), Converter.class);
    }
    // 如果获取不到，抛出 IllegalArgumentException 异常
    if (typeInfo == null) {
        throw new IllegalArgumentException("Unable to determine source type <S> and target type <T> for your " +
                "Converter [" + converter.getClass().getName() + "]; does the class parameterize those types?");
    }
    // <2> 封装成 ConverterAdapter 对象，添加到 converters 中
    addConverter(new ConverterAdapter(converter, typeInfo[0], typeInfo[1]));
}
```

- `<1>` 首先，根据 `converter` 获取 ResolvableType 数组。
- `<2>` 然后，将其与 `converter` 封装成一个 ConverterAdapter 实例。
- `<2>` 最后，调用 `#addConverter(GenericConverter converter)` 方法，添加到 `converters` 中。
- ResolvableType 用于封装 Java 的 [Type](https://juejin.im/post/5adefaba518825670e5cb44d) 类型。
- ConverterAdapter 则是 Converter 的一个适配器， 它实现了 GenericConverter 和 ConditionalConverter 两个类型转换器。

其中，`#addConverter(GenericConverter converter)` 方法，代码如下：

```java
// GenericConversionService.java

@Override
public void addConverter(GenericConverter converter) {
    // 添加到 converters 中
    this.converters.add(converter);
    // 过期缓存
    invalidateCache();
}
```

直接调用内部类 Converters 的 `#add(GenericConverter converter)` 方法，代码如下：

```java
// GenericConversionService.java

public void add(GenericConverter converter) {
    // 获得 ConvertiblePair 集合
    Set<ConvertiblePair> convertibleTypes = converter.getConvertibleTypes();
    // 如果为空，并且 converter 是 ConditionalConverter 类型，则添加到 【globalConverters】 中
    if (convertibleTypes == null) {
        Assert.state(converter instanceof ConditionalConverter,
                "Only conditional converters may return null convertible types");
        this.globalConverters.add(converter);
    } else {
        // 通过迭代的方式依次添加【converters】中
        for (ConvertiblePair convertiblePair : convertibleTypes) {
            // 从 converters 中，获得 ConvertersForPair 对象
            ConvertersForPair convertersForPair = getMatchableConverters(convertiblePair);
            // 添加 converter 到 ConvertersForPair 中
            convertersForPair.add(converter);
        }
    }
}
```

- 首先调用 GenericConverter 的 `#getConvertibleTypes()` 方法，获取 ConvertiblePair 集合。如果为空，则加入到 `globalConverters` 集合中，否则通过迭代的方式依次添加 `converters` 中。

- ConvertiblePair 为 source-to-target 的持有者，它持有 `source` 和 `target` 的 class 类型，代码如下：

  ```java
  // GenericConverter.java#ConvertiblePair
  
  final class ConvertiblePair {
  
      private final Class<?> sourceType;
      private final Class<?> targetType;
  
      // 省略其他代码
  }
  ```

在迭代过程中会根据 ConvertiblePair 获取相应的 ConvertersForPair 对象，然后添加 `converter` 转换器加入其中。ConvertiblePair 用于管理使用特定GenericConverter.ConvertiblePair 注册的转换器。代码如下：

```java
// GenericConversionService.java#ConvertersForPair

private static class ConvertersForPair {

   private final LinkedList<GenericConverter> converters = new LinkedList<>();

    public void add(GenericConverter converter) {
        this.converters.addFirst(converter);
    }

    @Nullable
    public GenericConverter getConverter(TypeDescriptor sourceType, TypeDescriptor targetType) {
        for (GenericConverter converter : this.converters) {
            if (!(converter instanceof ConditionalGenericConverter) ||
                    ((ConditionalGenericConverter) converter).matches(sourceType, targetType)) {
                return converter;
            }
        }
        return null;
    }

}
```

- 其实内部就是维护一个 LinkedList 集合。他内部有两个方法：`#add(GenericConverter converter)` 和 `getConverter(TypeDescriptor sourceType, TypeDescriptor targetType)`，实现较为简单，这里就不多介绍了。

------

**DefaultConversionService**

DefaultConversionService 是 ConversionService 的默认实现，它继承 GenericConversionService，GenericConversionService 主要用于转换器的注册和调用，DefaultConversionService 则是为 ConversionService 体系提供一些默认的转换器。

在 DefaultConversionService 构造方法中就会添加默认的 Converter ，代码如下：

```java
// DefaultConversionService.java

public DefaultConversionService() {
    addDefaultConverters(this);
}

public static void addDefaultConverters(ConverterRegistry converterRegistry) {
    addScalarConverters(converterRegistry);
    addCollectionConverters(converterRegistry);

    converterRegistry.addConverter(new ByteBufferConverter((ConversionService) converterRegistry));
    converterRegistry.addConverter(new StringToTimeZoneConverter());
    converterRegistry.addConverter(new ZoneIdToTimeZoneConverter());
    converterRegistry.addConverter(new ZonedDateTimeToCalendarConverter());

    converterRegistry.addConverter(new ObjectToObjectConverter());
    converterRegistry.addConverter(new IdToEntityConverter((ConversionService) converterRegistry));
    converterRegistry.addConverter(new FallbackObjectToStringConverter());
    converterRegistry.addConverter(new ObjectToOptionalConverter((ConversionService) converterRegistry));
}
```

当然它还提供了一些其他的方法如 `#addCollectionConverters(ConverterRegistry converterRegistry)`、`addScalarConverters(ConverterRegistry converterRegistry)` 方法，用于注册其他类型的转换器。

------

至此，从 Bean 属性的转换，到 Spring ConversionService 体系的转换器 Converter 以及转换器的管理都介绍完毕了，下篇我们将分析如何利用 ConversionService 实现**自定义类型**转换器。

> 艿艿：因为本文是基于调用的过程，进行解析。所以胖友可以自己在总结整理下。
>
> 实际上，大体的调用流是如下：
>
> TypeConverterSupport => ConversionService => Converter

# IoC 之自定义类型转换器

**本文主要基于 Spring 5.0.6.RELEASE**

摘要: 原创出处 http://cmsblogs.com/?p=todo 「小明哥」，谢谢！

作为「小明哥」的忠实读者，「老艿艿」略作修改，记录在理解过程中，参考的资料。

------

在上篇文章中小编分析了 Spring ConversionService 类型转换体系，相信各位都对其有了一个清晰的认识，这篇博客将利用 ConversionService 体系来实现自己的类型转换器。

ConversionService 是 Spring 类型转换器体系中的核心接口，它定义了是否可以完成转换（`#canConvert(...)`） 与类型转换（`#convert(...)`） 两类接口方法。

ConversionService 有三个子类，每个子类针对不同的类型转换：

- Converter<S,T>: 将 S 类型对象转为 T 类型对象。
- GenericConverter: 会根据源类对象及目标类对象所在的宿主类中的上下文信息进行类型转换。
- ConverterFactory: 将相同系列多个 “同质” Converter 封装在一起。如果希望将一种类型的对象转换为另一种类型及其子类的对象(例如将 String 转换为 Number 及 Number 子类(Integer、Long、Double 等)对象)可使用该转换器工厂类。

# ConversionServiceFactoryBean

那么如何自定义类型转换器？分两步走：

1. 实现 Converter / GenericConverter / ConverterFactory 接口
2. 将该类注册到 ConversionServiceFactoryBean 中。

ConversionServiceFactoryBean 实现了 InitializingBean 接口实现 `#afterPropertiesSet()` 方法，我们知道在 Bean 实例化 Bean 阶段，Spring 容器会检查当前 Bean 是否实现了 InitializingBean 接口，如果是则执行相应的初始化方法。（关于 InitializingBean 详情请参考：[【死磕 Spring】—– IOC 之 深入分析 InitializingBean 和 init-method](http://svip.iocoder.cn/Spring/IoC-TypeConverter-custom/)）。`#afterPropertiesSet()` 方法，代码如下：

```
// ConversionServiceFactoryBean.java

@Override
public void afterPropertiesSet() {
    // 创建 DefaultConversionService 对象
    this.conversionService = createConversionService();
    // 注册到 ConversionServiceFactory 中
    ConversionServiceFactory.registerConverters(this.converters, this.conversionService);
}
```

- 首先调用 `#createConversionService()` 方法，初始化 `conversionService`。代码如下：

  ```
  // ConversionServiceFactoryBean.java
  
  protected GenericConversionService createConversionService() {
  	return new DefaultConversionService();
  }
  ```

- 然后调用 `ConversionServiceFactory#registerConverters(Set<?> converters, ConverterRegistry registry)` 方法，将定义的 `converters` 注入到类型转换体系中。代码如下：

  ```
  // ConverterRegistry.java
  
  public static void registerConverters(@Nullable Set<?> converters, ConverterRegistry registry) {
  	if (converters != null) {
  	    // 遍历 converters 数组，逐个注解
  		for (Object converter : converters) {
  			if (converter instanceof GenericConverter) {
  				registry.addConverter((GenericConverter) converter);
  			} else if (converter instanceof Converter<?, ?>) {
  				registry.addConverter((Converter<?, ?>) converter);
  			} else if (converter instanceof ConverterFactory<?, ?>) {
  				registry.addConverterFactory((ConverterFactory<?, ?>) converter);
  			} else {
  				throw new IllegalArgumentException("Each converter object must implement one of the " +
  						"Converter, ConverterFactory, or GenericConverter interfaces");
  			}
  		}
  	}
  }
  ```

  - 我们知道 ConverterRegistry 是一个 Converter 注册器，他定义了一系列注册方法。
  - 通过调用 ConverterRegistry 的 `#addConverter(...)` 方法将转换器注册到容器中。所以在我们使用 Spring 容器的时候，Spring 将会自动识别出 IOC 容器中注册的 ConversionService 并且在 Bean 属性注入阶段使用自定义的转换器完成属性的转换了。

# 示例

定义 StudentConversionService 转换器：

```
public class StudentConversionService implements Converter<String, StudentService>{

    @Override
    public StudentService convert(String source) {
        if(StringUtils.hasLength(source)){
            String[] sources = source.split("#");

            StudentService studentService = new StudentService();
            studentService.setAge(Integer.parseInt(sources[0]));
            studentService.setName(sources[1]);

            return studentService;
        }
        return null;
    }
    
}
```

配置：

```
<bean id="conversionService"
          class="org.springframework.context.support.ConversionServiceFactoryBean">
    <property name="converters">
        <set>
            <ref bean="studentConversionService"/>
        </set>
     </property>
 </bean>

<bean id="studentConversionService" class="org.springframework.core.conversion.StudentConversionService"/>

<bean id="student" class="org.springframework.core.conversion.Student">
    <property name="studentService" value="18#chenssy"/>
</bean>
```

运行结果：

> 脑补一下~哈哈哈哈

# IoC 之分析 BeanWrapper

**本文主要基于 Spring 5.0.6.RELEASE**

摘要: 原创出处 http://cmsblogs.com/?p=todo 「小明哥」，谢谢！

作为「小明哥」的忠实读者，「老艿艿」略作修改，记录在理解过程中，参考的资料。

------

﻿在实例化 Bean 阶段，我们从 BeanDefinition 得到的并不是我们最终想要的 Bean 实例，而是 BeanWrapper 实例，如下：

[![img](http://static.iocoder.cn/dfd73f60540dd579297a1f9df9f95fe8)](http://static.iocoder.cn/dfd73f60540dd579297a1f9df9f95fe8)

所以这里 BeanWrapper 是一个从 BeanDefinition 到 Bean 直接的**中间产物**，我们可以称它为”低级 bean“。在一般情况下，我们不会在实际项目中用到它。BeanWrapper 是 Spring 框架中重要的组件类，它就相当于一个代理类，Spring 委托 BeanWrapper 完成 Bean 属性的填充工作。在 Bean 实例被 InstantiationStrategy 创建出来后，Spring 容器会将 Bean 实例通过 BeanWrapper 包裹起来，是通过如如下代码实现：

[![img](http://static.iocoder.cn/3a5c719e69c1113dcc8cdc7ff124929d)](http://static.iocoder.cn/3a5c719e69c1113dcc8cdc7ff124929d)

- `beanInstance` 就是我们实例出来的 bean 实例，通过构造一个 BeanWrapper 实例对象进行包裹，如下：

  ```
  // BeanWrapperImpl.java
  
  public BeanWrapperImpl(Object object) {
      super(object);
  }
  
  protected AbstractNestablePropertyAccessor(Object object) {
      registerDefaultEditors();
      setWrappedInstance(object);
  }
  ```

------

下面小编就 BeanWrapper 来进行分析说明，先看整体的结构：

[![2018101210001](http://static.iocoder.cn/fea787ac555caf4dab31fb3bc889dc8d)](http://static.iocoder.cn/fea787ac555caf4dab31fb3bc889dc8d)2018101210001

从上图可以看出 BeanWrapper 主要继承三个核心接口：PropertyAccessor、PropertyEditorRegistry、TypeConverter。

**PropertyAccessor**

> 可以访问属性的通用型接口（例如对象的 bean 属性或者对象中的字段），作为 BeanWrapper 的基础接口。

```
// PropertyAccessor.java

public interface PropertyAccessor {

    String NESTED_PROPERTY_SEPARATOR = ".";
    char NESTED_PROPERTY_SEPARATOR_CHAR = '.';

    String PROPERTY_KEY_PREFIX = "[";
    char PROPERTY_KEY_PREFIX_CHAR = '[';

    String PROPERTY_KEY_SUFFIX = "]";
    char PROPERTY_KEY_SUFFIX_CHAR = ']';

    boolean isReadableProperty(String propertyName);

    boolean isWritableProperty(String propertyName);

    Class<?> getPropertyType(String propertyName) throws BeansException;
    TypeDescriptor getPropertyTypeDescriptor(String propertyName) throws BeansException;
    Object getPropertyValue(String propertyName) throws BeansException;

    void setPropertyValue(String propertyName, @Nullable Object value) throws BeansException;
    void setPropertyValue(PropertyValue pv) throws BeansException;
    void setPropertyValues(Map<?, ?> map) throws BeansException;
    void setPropertyValues(PropertyValues pvs) throws BeansException;
    void setPropertyValues(PropertyValues pvs, boolean ignoreUnknown)
    throws BeansException;
    void setPropertyValues(PropertyValues pvs, boolean ignoreUnknown, boolean ignoreInvalid)
    throws BeansException;

}
```

就上面的源码我们可以分解为四类方法：

- `#isReadableProperty(String propertyName)` 方法：判断指定 property 是否可读，是否包含 getter 方法。
- `#isWritableProperty(String propertyName)` 方法：判断指定 property 是否可写,是否包含 setter 方法。
- `#getPropertyType(...)` 方法：获取指定 propertyName 的类型
- `#setPropertyValue(...)` 方法：设置指定 propertyValue 。

------

**PropertyEditorRegistry**

> 用于注册 JavaBean 的 PropertyEditors，对 PropertyEditorRegistrar 起核心作用的中心接口。由 BeanWrapper 扩展，BeanWrapperImpl 和 DataBinder 实现。

```
// PropertyEditorRegistry.java

public interface PropertyEditorRegistry {

    void registerCustomEditor(Class<?> requiredType, PropertyEditor propertyEditor);

    void registerCustomEditor(@Nullable Class<?> requiredType, @Nullable String propertyPath, PropertyEditor propertyEditor);

    @Nullable
    PropertyEditor findCustomEditor(@Nullable Class<?> requiredType, @Nullable String propertyPath);

}
```

根据接口提供的方法，PropertyEditorRegistry 就是用于 PropertyEditor 的注册和发现，而 PropertyEditor 是 Java 内省里面的接口，用于改变指定 property 属性的类型。

------

**TypeConverter**

> 定义类型转换的接口，通常与 PropertyEditorRegistry 接口一起实现（但不是必须），但由于 TypeConverter 是基于线程不安全的 PropertyEditors ，因此 TypeConverters 本身也不被视为线程安全。
> 这里小编解释下，在 Spring 3 后，不在采用 PropertyEditors 类作为 Spring 默认的类型转换接口，而是采用 ConversionService 体系，但 ConversionService 是线程安全的，所以在 Spring 3 后，如果你所选择的类型转换器是 ConversionService 而不是 PropertyEditors 那么 TypeConverters 则是线程安全的。

```
public interface TypeConverter {

    <T> T convertIfNecessary(Object value, Class<T> requiredType) throws TypeMismatchException;
    <T> T convertIfNecessary(Object value, Class<T> requiredType, MethodParameter methodParam)
            throws TypeMismatchException;
    <T> T convertIfNecessary(Object value, Class<T> requiredType, Field field)
            throws TypeMismatchException;

}
```

------

BeanWrapper 继承上述三个接口，那么它就具有三重身份：

- 属性编辑器
- 属性编辑器注册表
- 类型转换器

BeanWrapper 继承 ConfigurablePropertyAccessor 接口，该接口除了继承上面介绍的三个接口外还集成了 Spring 的 ConversionService 类型转换体系。

```
// ConfigurablePropertyAccessor.java

public interface ConfigurablePropertyAccessor extends PropertyAccessor, PropertyEditorRegistry, TypeConverter {

    void setConversionService(@Nullable ConversionService conversionService);

    @Nullable
    ConversionService getConversionService();

    void setExtractOldValueForEditor(boolean extractOldValueForEditor);

    boolean isExtractOldValueForEditor();

    void setAutoGrowNestedPaths(boolean autoGrowNestedPaths);

    boolean isAutoGrowNestedPaths();

}
```

`#setConversionService(ConversionService conversionService)` 和 `#getConversionService()` 方法，则是用于集成 Spring 的 ConversionService 类型转换体系。

**BeanWrapper**

> Spring 的 低级 JavaBean 基础结构的接口，一般不会直接使用，而是通过 BeanFactory 或者 DataBinder 隐式使用。它提供分析和操作标准 JavaBeans 的操作：获取和设置属性值、获取属性描述符以及查询属性的可读性/可写性的能力。

```
// BeanWrapper.java
public interface BeanWrapper extends ConfigurablePropertyAccessor {

    void setAutoGrowCollectionLimit(int autoGrowCollectionLimit);
    int getAutoGrowCollectionLimit();

    Object getWrappedInstance();
    Class<?> getWrappedClass();

    PropertyDescriptor[] getPropertyDescriptors();
    PropertyDescriptor getPropertyDescriptor(String propertyName) throws InvalidPropertyException;

}
```

下面几个方法比较重要：

- `#getWrappedInstance()` 方法：获取包装对象的实例。
- `#getWrappedClass()` 方法：获取包装对象的类型。
- `#getPropertyDescriptors()` 方法：获取包装对象所有属性的 PropertyDescriptor 就是这个属性的上下文。
- `#getPropertyDescriptor(String propertyName)` 方法：获取包装对象指定属性的上下文。

------

**BeanWrapperImpl**

> BeanWrapper 接口的默认实现，用于对Bean的包装，实现上面接口所定义的功能很简单包括设置获取被包装的对象，获取被包装bean的属性描述器

------

**小结**

BeanWrapper 体系相比于 Spring 中其他体系是比较简单的，它作为 BeanDefinition 向 Bean 转换过程中的中间产物，承载了 Bean 实例的包装、类型转换、属性的设置以及访问等重要作用。

# IoC 之 Bean 的实例化策略：InstantiationStrategy

**本文主要基于 Spring 5.0.6.RELEASE**

摘要: 原创出处 http://cmsblogs.com/?p=todo 「小明哥」，谢谢！

作为「小明哥」的忠实读者，「老艿艿」略作修改，记录在理解过程中，参考的资料。

------

﻿在开始分析 InstantiationStrategy 之前，我们先来简单回顾下 Bean 的实例化过程：

1. Bean 的创建，主要是 `AbstractAutowireCapableBeanFactory#doCreateBean(...)` 方法。在这个方法中有 Bean 的实例化、属性注入和初始化过程，对于 Bean 的实例化过程这是根据 Bean 的类型来判断的，如果是单例模式，则直接从 `factoryBeanInstanceCache` 缓存中获取，否则调用 `#createBeanInstance(...)` 方法来创建。
2. 在 `#createBeanInstance(...)` 方法中，如果 Supplier 不为空，则调用 `#obtainFromSupplier(...)` 实例化 bean。如果 `factory` 不为空，则调用 `#instantiateUsingFactoryMethod(...)` 方法来实例化 Bean 。如果都不是，则调用 `#instantiateBean(...)` 方法来实例化 Bean 。但是无论是 `#instantiateUsingFactoryMethod(...)` 方法，还是 `#instantiateBean()` 方法，最后都一定会调用到 InstantiationStrategy 接口的 `#instantiate(...)` 方法。

# 1. InstantiationStrategy

InstantiationStrategy 接口定义了 Spring Bean 实例化的策略，根据创建对象情况的不同，提供了三种策略：无参构造方法、有参构造方法、工厂方法。代码如下：

```
public interface InstantiationStrategy {

    /**
    * 默认构造方法
    */
    Object instantiate(RootBeanDefinition bd, @Nullable String beanName, BeanFactory owner)
    throws BeansException;

    /**
    * 指定构造方法
    */
    Object instantiate(RootBeanDefinition bd, @Nullable String beanName, BeanFactory owner,
    Constructor<?> ctor, @Nullable Object... args) throws BeansException;

    /**
    * 工厂方法
    */
    Object instantiate(RootBeanDefinition bd, @Nullable String beanName, BeanFactory owner,
    @Nullable Object factoryBean, Method factoryMethod, @Nullable Object... args)
    throws BeansException;

}
```

# 2. SimpleInstantiationStrategy

InstantiationStrategy 接口有两个实现类：SimpleInstantiationStrategy 和 CglibSubclassingInstantiationStrategy。

SimpleInstantiationStrategy 对以上三个方法都做了简单的实现。

① 如果是工厂方法实例化，则直接使用反射创建对象，如下：

```
// SimpleInstantiationStrategy.java

@Override
public Object instantiate(RootBeanDefinition bd, @Nullable String beanName, BeanFactory owner,
        @Nullable Object factoryBean, final Method factoryMethod, Object... args) {
    try {
        // 设置 Method 可访问
        if (System.getSecurityManager() != null) {
            AccessController.doPrivileged((PrivilegedAction<Object>) () -> {
                ReflectionUtils.makeAccessible(factoryMethod);
                return null;
            });
        } else {
            ReflectionUtils.makeAccessible(factoryMethod);
        }

        // 获得原 Method 对象
        Method priorInvokedFactoryMethod = currentlyInvokedFactoryMethod.get();
        try {
            // 设置新的 Method 对象，到 currentlyInvokedFactoryMethod 中
            currentlyInvokedFactoryMethod.set(factoryMethod);
            // 创建 Bean 对象
            Object result = factoryMethod.invoke(factoryBean, args);
            // 未创建，则创建 NullBean 对象
            if (result == null) {
                result = new NullBean();
            }
            return result;
        } finally {
            // 设置老的 Method 对象，到 currentlyInvokedFactoryMethod 中
            if (priorInvokedFactoryMethod != null) {
                currentlyInvokedFactoryMethod.set(priorInvokedFactoryMethod);
            } else {
                currentlyInvokedFactoryMethod.remove();
            }
        }
    // 一大堆 catch 异常
    } catch (IllegalArgumentException ex) {
        throw new BeanInstantiationException(factoryMethod,
                "Illegal arguments to factory method '" + factoryMethod.getName() + "'; " +
                "args: " + StringUtils.arrayToCommaDelimitedString(args), ex);
    } catch (IllegalAccessException ex) {
        throw new BeanInstantiationException(factoryMethod,
                "Cannot access factory method '" + factoryMethod.getName() + "'; is it public?", ex);
    } catch (InvocationTargetException ex) {
        String msg = "Factory method '" + factoryMethod.getName() + "' threw exception";
        if (bd.getFactoryBeanName() != null && owner instanceof ConfigurableBeanFactory &&
                ((ConfigurableBeanFactory) owner).isCurrentlyInCreation(bd.getFactoryBeanName())) {
            msg = "Circular reference involving containing bean '" + bd.getFactoryBeanName() + "' - consider " +
                    "declaring the factory method as static for independence from its containing instance. " + msg;
        }
        throw new BeanInstantiationException(factoryMethod, msg, ex.getTargetException());
    }
}
```

② 如果是构造方法实例化，则是先判断是否有 MethodOverrides，如果没有则是直接使用反射，如果有则就需要 CGLIB 实例化对象。如下：

```
// SimpleInstantiationStrategy.java

// 默认构造方法
@Override
public Object instantiate(RootBeanDefinition bd, @Nullable String beanName, BeanFactory owner) {
	// Don't override the class with CGLIB if no overrides.
    // 没有覆盖，直接使用反射实例化即可
    if (!bd.hasMethodOverrides()) {
		Constructor<?> constructorToUse;
		synchronized (bd.constructorArgumentLock) {
		    // 获得构造方法 constructorToUse
			constructorToUse = (Constructor<?>) bd.resolvedConstructorOrFactoryMethod;
			if (constructorToUse == null) {
				final Class<?> clazz = bd.getBeanClass();
				// 如果是接口，抛出 BeanInstantiationException 异常
				if (clazz.isInterface()) {
					throw new BeanInstantiationException(clazz, "Specified class is an interface");
				}
				try {
				    // 从 clazz 中，获得构造方法
					if (System.getSecurityManager() != null) { // 安全模式
						constructorToUse = AccessController.doPrivileged(
								(PrivilegedExceptionAction<Constructor<?>>) clazz::getDeclaredConstructor);
					} else {
						constructorToUse =	clazz.getDeclaredConstructor();
					}
					// 标记 resolvedConstructorOrFactoryMethod 属性
					bd.resolvedConstructorOrFactoryMethod = constructorToUse;
				} catch (Throwable ex) {
					throw new BeanInstantiationException(clazz, "No default constructor found", ex);
				}
			}
		}
        // 通过 BeanUtils 直接使用构造器对象实例化 Bean 对象
        return BeanUtils.instantiateClass(constructorToUse);
	} else {
		// Must generate CGLIB subclass.
        // 生成 CGLIB 创建的子类对象
        return instantiateWithMethodInjection(bd, beanName, owner);
	}
}

// 指定构造方法
@Override
public Object instantiate(RootBeanDefinition bd, @Nullable String beanName, BeanFactory owner,
		final Constructor<?> ctor, Object... args) {
    // 没有覆盖，直接使用反射实例化即可
	if (!bd.hasMethodOverrides()) {
		if (System.getSecurityManager() != null) {
		    // 设置构造方法，可访问
			// use own privileged to change accessibility (when security is on)
			AccessController.doPrivileged((PrivilegedAction<Object>) () -> {
				ReflectionUtils.makeAccessible(ctor);
				return null;
			});
		}
        // 通过 BeanUtils 直接使用构造器对象实例化 Bean 对象
		return BeanUtils.instantiateClass(ctor, args);
	} else {
        // 生成 CGLIB 创建的子类对象
		return instantiateWithMethodInjection(bd, beanName, owner, ctor, args);
	}
}
```

- SimpleInstantiationStrategy 对 `#instantiateWithMethodInjection(RootBeanDefinition bd, String beanName, BeanFactory owner, Constructor<?> ctor, Object... args)` 的实现任务交给了子类 CglibSubclassingInstantiationStrategy 。

# 3. MethodOverrides

对于 MethodOverrides，如果读者是跟着小编文章一路跟过来的话一定不会陌生，在 BeanDefinitionParserDelegate 类解析 `<bean/>` 的时候是否还记得这两个方法：`#parseLookupOverrideSubElements(...)` 和 `#parseReplacedMethodSubElements(...)` 这两个方法分别用于解析 `lookup-method` 和 `replaced-method` 属性。

其中，`#parseLookupOverrideSubElements(...)` 源码如下：

[![parseLookupOverrideSubElements](http://static.iocoder.cn/4cdb7d0fafb164c00feb74680948e785)](http://static.iocoder.cn/4cdb7d0fafb164c00feb74680948e785)parseLookupOverrideSubElements

更多关于 `lookup-method` 和 `replaced-method` 请看：[【死磕 Spring】—– IoC 之解析 bean 标签：meta、lookup-method、replace-method](http://svip.iocoder.cn/Spring/IoC-parse-BeanDefinitions-for-meta-and-look-method-and-replace-method)

# 4. CglibSubclassingInstantiationStrategy

类 CglibSubclassingInstantiationStrategy 为 Spring 实例化 Bean 的默认实例化策略，其主要功能还是对父类功能进行补充：其父类将 CGLIB 的实例化策略委托其实现。

```
// SimpleInstantiationStrategy.java

protected Object instantiateWithMethodInjection(RootBeanDefinition bd, @Nullable String beanName, BeanFactory owner) {
	throw new UnsupportedOperationException("Method Injection not supported in SimpleInstantiationStrategy");
}

// CglibSubclassingInstantiationStrategy.java

@Override
protected Object instantiateWithMethodInjection(RootBeanDefinition bd, @Nullable String beanName, BeanFactory owner) {
	return instantiateWithMethodInjection(bd, beanName, owner, null);
}
```

- CglibSubclassingInstantiationStrategy 实例化 Bean 策略，是通过其内部类 **CglibSubclassCreator** 来实现的。代码如下：

  ```
  // CglibSubclassingInstantiationStrategy.java
  
  @Override
  protected Object instantiateWithMethodInjection(RootBeanDefinition bd, @Nullable String beanName, BeanFactory owner, @Nullable Constructor<?> ctor, Object... args) {
  	// Must generate CGLIB subclass...
      // 通过CGLIB生成一个子类对象
  	return new CglibSubclassCreator(bd, owner).instantiate(ctor, args);
  }
  ```

- 创建 CglibSubclassCreator 实例，然后调用其 `#instantiate(Constructor<?> ctor, Object... args)` 方法，该方法用于动态创建子类实例，同时实现所需要的 lookups（`lookup-method`、`replace-method`）。

  ```
  // CglibSubclassingInstantiationStrategy.java#CglibSubclassCreator
  
  public Object instantiate(@Nullable Constructor<?> ctor, Object... args) {
      // <x> 通过 Cglib 创建一个代理类
      Class<?> subclass = createEnhancedSubclass(this.beanDefinition);
      Object instance;
      // <y> 没有构造器，通过 BeanUtils 使用默认构造器创建一个bean实例
      if (ctor == null) {
          instance = BeanUtils.instantiateClass(subclass);
      } else {
          try {
              // 获取代理类对应的构造器对象，并实例化 bean
              Constructor<?> enhancedSubclassConstructor = subclass.getConstructor(ctor.getParameterTypes());
              instance = enhancedSubclassConstructor.newInstance(args);
          } catch (Exception ex) {
              throw new BeanInstantiationException(this.beanDefinition.getBeanClass(),
                      "Failed to invoke constructor for CGLIB enhanced subclass [" + subclass.getName() + "]", ex);
          }
      }
      // SPR-10785: set callbacks directly on the instance instead of in the
      // enhanced class (via the Enhancer) in order to avoid memory leaks.
      // 为了避免 memory leaks 异常，直接在 bean 实例上设置回调对象
      Factory factory = (Factory) instance;
      factory.setCallbacks(new Callback[] {NoOp.INSTANCE,
              new LookupOverrideMethodInterceptor(this.beanDefinition, this.owner),
              new ReplaceOverrideMethodInterceptor(this.beanDefinition, this.owner)});
      return instance;
  }
  ```

  - 在 `<x>` 处，调用 `#createEnhancedSubclass(RootBeanDefinition beanDefinition)` 方法，为提供的 BeanDefinition 创建 bean 类的增强子类。代码如下：

    ```
    // CglibSubclassingInstantiationStrategy.java#CglibSubclassCreator
    
    private Class<?> createEnhancedSubclass(RootBeanDefinition beanDefinition) {
        // 创建 Enhancer 对象
        Enhancer enhancer = new Enhancer();
        // 设置 Bean 类
        enhancer.setSuperclass(beanDefinition.getBeanClass());
        // 设置 Spring 的命名策略
        enhancer.setNamingPolicy(SpringNamingPolicy.INSTANCE);
        // 设置生成策略
        if (this.owner instanceof ConfigurableBeanFactory) {
            ClassLoader cl = ((ConfigurableBeanFactory) this.owner).getBeanClassLoader();
            enhancer.setStrategy(new ClassLoaderAwareGeneratorStrategy(cl));
        }
        // 过滤，自定义逻辑来指定调用的callback下标
        enhancer.setCallbackFilter(new MethodOverrideCallbackFilter(beanDefinition));
        enhancer.setCallbackTypes(CALLBACK_TYPES);
        return enhancer.createClass();
    }
    ```

    - CGLIB 的标准 API 的使用。

  - `<y>` 处，获取子类增强 `subclass` 后，如果 Constructor 实例 `ctr` 为空，则调用默认构造函数（`BeanUtils#instantiateClass(subclass)`）来实例化类，否则则根据构造函数类型获取具体的构造器，调用 `Constructor#newInstance(args)` 方法来实例化类。

## 4.1 MethodOverrideCallbackFilter

在 `<x>` 处调用的 `#createEnhancedSubclass(RootBeanDefinition beanDefinition)` 方法，我们注意两行代码：

```
// CglibSubclassingInstantiationStrategy.java#CglibSubclassCreator

enhancer.setCallbackFilter(new MethodOverrideCallbackFilter(beanDefinition));
enhancer.setCallbackTypes(CALLBACK_TYPES);
```

- 通过 MethodOverrideCallbackFilter 来定义调用 callback 类型。

MethodOverrideCallbackFilter 是用来定义 CGLIB 回调过滤方法的拦截器行为，它继承 CglibIdentitySupport 实现 CallbackFilter 接口。

- CallbackFilter 是 CGLIB 的一个回调过滤器。
- CglibIdentitySupport 则为 CGLIB 提供 `#hashCode()` 和 `#equals(Object o)` 方法，以确保 CGLIB 不会为每个 Bean 生成不同的类。

MethodOverrideCallbackFilter 实现 CallbackFilter 的 `#accept(Method method)` 方法，代码如下：

```
// CglibSubclassingInstantiationStrategy.java#MethodOverrideCallbackFilter

@Override
public int accept(Method method) {
	MethodOverride methodOverride = getBeanDefinition().getMethodOverrides().getOverride(method);
	if (logger.isTraceEnabled()) {
		logger.trace("Override for '" + method.getName() + "' is [" + methodOverride + "]");
	}
	if (methodOverride == null) {
		return PASSTHROUGH;
	} else if (methodOverride instanceof LookupOverride) {
		return LOOKUP_OVERRIDE;
	} else if (methodOverride instanceof ReplaceOverride) {
		return METHOD_REPLACER;
	}
	throw new UnsupportedOperationException("Unexpected MethodOverride subclass: " +
			methodOverride.getClass().getName());
}
```

- 根据 BeanDefinition 中定义的 MethodOverride 不同，返回不同的值， 这里返回的 `PASSTHROUGH` 、`LOOKUP_OVERRIDE`、`METHOD_REPLACER` 都是 Callback 数组的**下标**，这里对应的数组为 `CALLBACK_TYPES` 数组，如下：

  ```
  // CglibSubclassingInstantiationStrategy.java#CglibSubclassCreator
  
  private static final Class<?>[] CALLBACK_TYPES = new Class<?>[] {
      NoOp.class,
      LookupOverrideMethodInterceptor.class,
      ReplaceOverrideMethodInterceptor.class
  };
  ```

  - 这里又定义了两个熟悉的拦截器 ：LookupOverrideMethodInterceptor 和 ReplaceOverrideMethodInterceptor，两个拦截器分别对应两个不同的 callback 业务。详细解析，见 [「4.2 LookupOverrideMethodInterceptor」](http://svip.iocoder.cn/Spring/IoC-InstantiationStrategy/#) 和 [「4.3 ReplaceOverrideMethodInterceptor」](http://svip.iocoder.cn/Spring/IoC-InstantiationStrategy/#) 中。

## 4.2 LookupOverrideMethodInterceptor

```
// CglibSubclassingInstantiationStrategy.java#LookupOverrideMethodInterceptor

private static class LookupOverrideMethodInterceptor extends CglibIdentitySupport implements MethodInterceptor {

    private final BeanFactory owner;

    public LookupOverrideMethodInterceptor(RootBeanDefinition beanDefinition, BeanFactory owner) {
        super(beanDefinition);
        this.owner = owner;
    }

    @Override
    public Object intercept(Object obj, Method method, Object[] args, MethodProxy mp) throws Throwable {
        // Cast is safe, as CallbackFilter filters are used selectively.
        // 获得 method 对应的 LookupOverride 对象
        LookupOverride lo = (LookupOverride) getBeanDefinition().getMethodOverrides().getOverride(method);
        Assert.state(lo != null, "LookupOverride not found");
        // 获得参数
        Object[] argsToUse = (args.length > 0 ? args : null);  // if no-arg, don't insist on args at all
        // 获得 Bean
        if (StringUtils.hasText(lo.getBeanName())) { // Bean 的名字
            return (argsToUse != null ? this.owner.getBean(lo.getBeanName(), argsToUse) :
                    this.owner.getBean(lo.getBeanName()));
        } else { // Bean 的类型
            return (argsToUse != null ? this.owner.getBean(method.getReturnType(), argsToUse) :
                    this.owner.getBean(method.getReturnType()));
        }
    }
}
```

## 4.3 ReplaceOverrideMethodInterceptor

```
// CglibSubclassingInstantiationStrategy.java#ReplaceOverrideMethodInterceptor

private static class ReplaceOverrideMethodInterceptor extends CglibIdentitySupport implements MethodInterceptor {

    private final BeanFactory owner;

    public ReplaceOverrideMethodInterceptor(RootBeanDefinition beanDefinition, BeanFactory owner) {
        super(beanDefinition);
        this.owner = owner;
    }

    @Override
    public Object intercept(Object obj, Method method, Object[] args, MethodProxy mp) throws Throwable {
        // 获得 method 对应的 LookupOverride 对象
        ReplaceOverride ro = (ReplaceOverride) getBeanDefinition().getMethodOverrides().getOverride(method);
        Assert.state(ro != null, "ReplaceOverride not found");
        // TODO could cache if a singleton for minor performance optimization
        // 获得 MethodReplacer 对象
        MethodReplacer mr = this.owner.getBean(ro.getMethodReplacerBeanName(), MethodReplacer.class);
        // 执行替换
        return mr.reimplement(obj, method, args);
    }
}
```

通过这两个拦截器，再加上这篇博客：[【死磕 Spring】—— IoC 之解析 bean 标签：meta、lookup-method、replace-method](http://svip.iocoder.cn/Spring/IoC-parse-BeanDefinitions-for-meta-and-look-method-and-replace-method)，是不是一道绝佳的美食。

# IoC 之 BeanDefinition 注册表：BeanDefinitionRegistry

**本文主要基于 Spring 5.0.6.RELEASE**

摘要: 原创出处 http://cmsblogs.com/?p=todo 「小明哥」，谢谢！

作为「小明哥」的忠实读者，「老艿艿」略作修改，记录在理解过程中，参考的资料。

------

将定义 Bean 的资源文件解析成 BeanDefinition 后需要将其注入容器中，这个过程由 BeanDefinitionRegistry 来完成。

**BeanDefinitionRegistry：向注册表中注册 BeanDefinition 实例，完成注册的过程。**

下图是 BeanDefinitionRegistry 类结构图：

[![BeanDefinitionRegistry 类图](http://static.iocoder.cn/c91d5c1d310f4257bb0edae3444e7cd9)](http://static.iocoder.cn/c91d5c1d310f4257bb0edae3444e7cd9)BeanDefinitionRegistry 类图

BeanDefinitionRegistry 继承了 AliasRegistry 接口，其核心子类有三个：SimpleBeanDefinitionRegistry、DefaultListableBeanFactory、GenericApplicationContext 。

# 1. AliasRegistry

**用于别名管理的通用型接口，作为 BeanDefinitionRegistry 的顶层接口。** AliasRegistry 定义了一些别名管理的方法。

```
// AliasRegistry.java

public interface AliasRegistry {

    void registerAlias(String name, String alias);
    void removeAlias(String alias);

    boolean isAlias(String name);
    String[] getAliases(String name);

}
```

# 2. BeanDefinitionRegistry

**BeanDefinition 的注册接口，如 RootBeanDefinition 和 ChildBeanDefinition。它通常由 BeanFactories 实现，在 Spring 中已知的实现者为：DefaultListableBeanFactory 和 GenericApplicationContext。BeanDefinitionRegistry 是 Spring 的 Bean 工厂包中唯一封装 BeanDefinition 注册的接口。**

BeanDefinitionRegistry 接口定义了关于 BeanDefinition 注册、注销、查询等一系列的操作。

```
// BeanDefinitionRegistry.java

    public interface BeanDefinitionRegistry extends AliasRegistry {

    // 往注册表中注册一个新的 BeanDefinition 实例
    void registerBeanDefinition(String beanName, BeanDefinition beanDefinition) throws BeanDefinitionStoreException;

    // 移除注册表中已注册的 BeanDefinition 实例
    void removeBeanDefinition(String beanName) throws NoSuchBeanDefinitionException;

    // 从注册中取得指定的 BeanDefinition 实例
    BeanDefinition getBeanDefinition(String beanName) throws NoSuchBeanDefinitionException;

    // 判断 BeanDefinition 实例是否在注册表中（是否注册）
    boolean containsBeanDefinition(String beanName);

    // 取得注册表中所有 BeanDefinition 实例的 beanName（标识）
    String[] getBeanDefinitionNames();

    // 返回注册表中 BeanDefinition 实例的数量
    int getBeanDefinitionCount();

    // beanName（标识）是否被占用
    boolean isBeanNameInUse(String beanName);

}
```

# 3. SimpleBeanDefinitionRegistry

**SimpleBeanDefinitionRegistry 是 BeanDefinitionRegistry 一个简单的实现，它还继承 SimpleAliasRegistry（ AliasRegistry 的简单实现），它仅仅只提供注册表功能，无工厂功能**。

SimpleBeanDefinitionRegistry 使用 ConcurrentHashMap 来存储注册的 BeanDefinition。

```
// SimpleBeanDefinitionRegistry.java

private final Map<String, BeanDefinition> beanDefinitionMap = new ConcurrentHashMap<>(64);
```

他对注册其中的 BeanDefinition 都是基于 `beanDefinitionMap` 这个集合来实现的，如下：

```
// SimpleBeanDefinitionRegistry.java

@Override
public void registerBeanDefinition(String beanName, BeanDefinition beanDefinition)
   throws BeanDefinitionStoreException {
	Assert.hasText(beanName, "'beanName' must not be empty");
	Assert.notNull(beanDefinition, "BeanDefinition must not be null");
	this.beanDefinitionMap.put(beanName, beanDefinition);
}

@Override
public void removeBeanDefinition(String beanName) throws NoSuchBeanDefinitionException {
	if (this.beanDefinitionMap.remove(beanName) == null) {
		throw new NoSuchBeanDefinitionException(beanName);
	}
}

@Override
public BeanDefinition getBeanDefinition(String beanName) throws NoSuchBeanDefinitionException {
	BeanDefinition bd = this.beanDefinitionMap.get(beanName);
	if (bd == null) {
		throw new NoSuchBeanDefinitionException(beanName);
	}
	return bd;
}
```

实现简单、粗暴。

# 4. DefaultListableBeanFactory

**DefaultListableBeanFactory，ConfigurableListableBeanFactory（其实就是 BeanFactory ） 和 BeanDefinitionRegistry 接口的默认实现：一个基于 BeanDefinition 元数据的完整 bean 工厂**。所以相对于 SimpleBeanDefinitionRegistry 而言，DefaultListableBeanFactory 则是一个具有注册功能的完整 Bean 工厂。它同样是用 ConcurrentHashMap 数据结构来存储注册的 BeanDefinition 。

```
// DefaultListableBeanFactory.java

// 注册表，由 BeanDefinition 的标识 （beanName） 与其实例组成
private final Map<String, BeanDefinition> beanDefinitionMap = new ConcurrentHashMap<String, bean>(64);

// 标识（beanName）集合
private final List<String> beanDefinitionNames = new ArrayList<String>(64);
```

## 4.1 registerBeanDefinition

在看看 `#registerBeanDefinition(String beanName, BeanDefinition beanDefinition)` 方法，代码如下：

```
// DefaultListableBeanFactory.java

public void registerBeanDefinition(String beanName, BeanDefinition beanDefinition)
   throws BeanDefinitionStoreException {

    // ... 省略其他代码

    // 如果未存在
    } else {
        // 检测创建 Bean 阶段是否已经开启，如果开启了则需要对 beanDefinitionMap 进行并发控制
        if (hasBeanCreationStarted()) {
            // beanDefinitionMap 为全局变量，避免并发情况
            // Cannot modify startup-time collection elements anymore (for stable iteration)
            synchronized (this.beanDefinitionMap) {
                // <x> 添加到 BeanDefinition 到 beanDefinitionMap 中。
                this.beanDefinitionMap.put(beanName, beanDefinition);
                // 添加 beanName 到 beanDefinitionNames 中
                List<String> updatedDefinitions = new ArrayList<>(this.beanDefinitionNames.size() + 1);
                updatedDefinitions.addAll(this.beanDefinitionNames);
                updatedDefinitions.add(beanName);
                this.beanDefinitionNames = updatedDefinitions;
                // 从 manualSingletonNames 移除 beanName
                if (this.manualSingletonNames.contains(beanName)) {
                    Set<String> updatedSingletons = new LinkedHashSet<>(this.manualSingletonNames);
                    updatedSingletons.remove(beanName);
                    this.manualSingletonNames = updatedSingletons;
                }
            }
        } else {
            // Still in startup registration phase
            // <x> 添加到 BeanDefinition 到 beanDefinitionMap 中。
            this.beanDefinitionMap.put(beanName, beanDefinition);
            // 添加 beanName 到 beanDefinitionNames 中
            this.beanDefinitionNames.add(beanName);
            // 从 manualSingletonNames 移除 beanName
            this.manualSingletonNames.remove(beanName);
        }

        this.frozenBeanDefinitionNames = null;
    }

    // 重新设置 beanName 对应的缓存
    if (existingDefinition != null || containsSingleton(beanName)) {
        resetBeanDefinition(beanName);
    }

}
```

- 其实上面一堆代码最重要就只有一句，就是 `<x>` 处：

  ```
  // DefaultListableBeanFactory.java
  
  this.beanDefinitionMap.put(beanName, beanDefinition);
  ```

## 4.2 removeBeanDefinition

在看看 `#removeBeanDefinition(String beanName)` 方法，其实也是调用 `beanDefinitionMap.remove(beanName)` 的逻辑。

# 5. GenericApplicationContext

对于类 GenericApplicationContext ，查看源码你会发现他实现注册、注销功能都是委托 DefaultListableBeanFactory 实现的。简化代码如下：

```
// GenericApplicationContext.java

private final DefaultListableBeanFactory beanFactory;

@Override
public void registerBeanDefinition(String beanName, BeanDefinition beanDefinition)
		throws BeanDefinitionStoreException {

	this.beanFactory.registerBeanDefinition(beanName, beanDefinition);
}

@Override
public void removeBeanDefinition(String beanName) throws NoSuchBeanDefinitionException {
	this.beanFactory.removeBeanDefinition(beanName);
}

// ... 省略其它 N 多方法
```

# 6. 小结

> 所以 BeanDefinition 注册并不是非常高大上的功能，内部就是用一个 Map 实现 ，并不是多么高大上的骚操作，所以有时候我们会潜意识地认为某些技术很高大上就觉得他很深奥，如果试着去一探究竟你会发现，原来这么简单。虽然 BeanDefinitionRegistry 实现简单，但是它作为 Spring IOC 容器的核心接口，其地位还是很重的.

# 环境 & 属性：PropertySource、Environment、Profile

**本文主要基于 Spring 5.0.6.RELEASE**

摘要: 原创出处 http://cmsblogs.com/?p=todo 「小明哥」，谢谢！

作为「小明哥」的忠实读者，「老艿艿」略作修改，记录在理解过程中，参考的资料。

------

﻿`spring.profiles.active` 和 `@Profile` 这两个我相信各位都熟悉吧，主要功能是可以实现不同环境下（开发、测试、生产）参数配置的切换。其实关于环境的切换，小编在博客 [【死磕Spring】—— IoC 之 PropertyPlaceholderConfigurer 的应用](http://svip.iocoder.cn/Spring/IoC-PropertyPlaceholderConfigurer-demo) 中，已经介绍了利用 PropertyPlaceholderConfigurer 来实现动态切换配置环境，当然这种方法需要我们自己实现，有点儿麻烦。但是对于这种非常实际的需求，Spring 怎么可能没有提供呢？下面小编就问题来对 Spring 的**环境 & 属性**来做一个分析说明。

# 1. 概括

Spring 环境 & 属性由四个部分组成：PropertySource、PropertyResolver、Profile 和 Environment。

- PropertySource：属性**源**，key-value 属性对抽象，用于配置数据。
- PropertyResolver：属性**解析器**，用于解析属性配置
- Profile：剖面，只有激活的剖面的组件/配置才会注册到 Spring 容器，类似于 Spring Boot 中的 profile 。
- Environment：环境，Profile 和 PropertyResolver 的组合。

下面是整个体系的结构图：

[![整体类图](http://static.iocoder.cn/0f22156c0d3d902cf4cf196c2b94aaa5)](http://static.iocoder.cn/0f22156c0d3d902cf4cf196c2b94aaa5)整体类图

下面就针对上面结构图对 Spring 的 Properties & Environment 做一个详细的分析。

# 2. Properties

## 2.1 PropertyResolver

> 属性解析器，用于解析任何基础源的属性的接口

```
// PropertyResolver.java

public interface PropertyResolver {

    // 是否包含某个属性
    boolean containsProperty(String key);

    // 获取属性值 如果找不到返回null
    @Nullable
    String getProperty(String key);
    // 获取属性值，如果找不到返回默认值
    String getProperty(String key, String defaultValue);
    // 获取指定类型的属性值，找不到返回null
    @Nullable
    <T> T getProperty(String key, Class<T> targetType);
    // 获取指定类型的属性值，找不到返回默认值
    <T> T getProperty(String key, Class<T> targetType, T defaultValue);

    // 获取属性值，找不到抛出异常IllegalStateException
    String getRequiredProperty(String key) throws IllegalStateException;
    // 获取指定类型的属性值，找不到抛出异常IllegalStateException
    <T> T getRequiredProperty(String key, Class<T> targetType) throws IllegalStateException;

    // 替换文本中的占位符（${key}）到属性值，找不到不解析
    String resolvePlaceholders(String text);
    // 替换文本中的占位符（${key}）到属性值，找不到抛出异常IllegalArgumentException
    String resolveRequiredPlaceholders(String text) throws IllegalArgumentException;

}
```

从 API 上面我们就知道属性解析器 PropertyResolver 的作用了。下面是一个简单的运用。

```
PropertyResolver propertyResolver = new PropertySourcesPropertyResolver(propertySources);

System.out.println(propertyResolver.getProperty("name"));
System.out.println(propertyResolver.getProperty("name", "chenssy"));
System.out.println(propertyResolver.resolvePlaceholders("my name is  ${name}"));
```

下图是 PropertyResolver 体系结构图：

[PropertyResolver 体系结构图](https://gitee.com/chenssy/blog-home/raw/master/image/201811/201810241001.png)

- ConfigurablePropertyResolver：供属性类型转换的功能
- AbstractPropertyResolver：解析属性文件的抽象基类
- PropertySourcesPropertyResolver：PropertyResolver 的实现者，他对一组 PropertySources 提供属性解析服务

## 2.2 ConfigurablePropertyResolver

> 提供属性类型转换的功能

通俗点说就是 ConfigurablePropertyResolver 提供属性值类型转换所需要的 ConversionService。代码如下：

```
// ConfigurablePropertyResolver.java

public interface ConfigurablePropertyResolver extends PropertyResolver {

    // 返回执行类型转换时使用的 ConfigurableConversionService
    ConfigurableConversionService getConversionService();
    // 设置 ConfigurableConversionService
    void setConversionService(ConfigurableConversionService conversionService);

    // 设置占位符前缀
    void setPlaceholderPrefix(String placeholderPrefix);
    // 设置占位符后缀
    void setPlaceholderSuffix(String placeholderSuffix);
    // 设置占位符与默认值之间的分隔符
    void setValueSeparator(@Nullable String valueSeparator);

    // 设置当遇到嵌套在给定属性值内的不可解析的占位符时是否抛出异常
    // 当属性值包含不可解析的占位符时，getProperty(String)及其变体的实现必须检查此处设置的值以确定正确的行为。
    void setIgnoreUnresolvableNestedPlaceholders(boolean ignoreUnresolvableNestedPlaceholders);

    // 指定必须存在哪些属性，以便由validateRequiredProperties（）验证
    void setRequiredProperties(String... requiredProperties);

    // 验证setRequiredProperties指定的每个属性是否存在并解析为非null值
    void validateRequiredProperties() throws MissingRequiredPropertiesException;

}
```

- 从 ConfigurablePropertyResolver 所提供的方法来看，除了访问和设置 ConversionService 外，主要还提供了一些解析规则之类的方法。

就 Properties 体系而言，PropertyResolver 定义了访问 Properties 属性值的方法，而 ConfigurablePropertyResolver 则定义了解析 Properties 一些相关的规则和值进行类型转换所需要的 Service。

该体系有两个实现者：AbstractPropertyResolver 和 PropertySourcesPropertyResolver，其中 AbstractPropertyResolver 为实现的抽象基类，PropertySourcesPropertyResolver 为真正的实现者。

## 2.3 AbstractPropertyResolver

> 解析属性文件的抽象基类

AbstractPropertyResolver 作为基类它仅仅只是设置了一些解析属性文件所需要配置或者转换器，如 `#setConversionService(...)`、`#setPlaceholderPrefix(...)`、`#setValueSeparator(...)` 。其实这些方法的实现都比较简单，都是设置或者获取 AbstractPropertyResolver 所提供的属性，代码如下：

```
// AbstractPropertyResolver.java

// 类型转换去
private volatile ConfigurableConversionService conversionService;
// 占位符
private PropertyPlaceholderHelper nonStrictHelper;
//
private PropertyPlaceholderHelper strictHelper;
// 设置是否抛出异常
private boolean ignoreUnresolvableNestedPlaceholders = false;
// 占位符前缀
private String placeholderPrefix = SystemPropertyUtils.PLACEHOLDER_PREFIX;
// 占位符后缀
private String placeholderSuffix = SystemPropertyUtils.PLACEHOLDER_SUFFIX;
// 与默认值的分割
private String valueSeparator = SystemPropertyUtils.VALUE_SEPARATOR;
// 必须要有的字段值
private final Set<String> requiredProperties = new LinkedHashSet<>();
```

这些属性都是 ConfigurablePropertyResolver 接口所提供方法需要的属性，他所提供的方法都是设置和读取这些值，如下几个方法：

```
// AbstractPropertyResolver.java

public ConfigurableConversionService getConversionService() {
    // 需要提供独立的DefaultConversionService，而不是PropertySourcesPropertyResolver 使用的共享DefaultConversionService。
    ConfigurableConversionService cs = this.conversionService;
    if (cs == null) {
        synchronized (this) {
            cs = this.conversionService;
            if (cs == null) {
                cs = new DefaultConversionService();
                this.conversionService = cs;
            }
        }
    }
    return cs;
}

@Override
public void setConversionService(ConfigurableConversionService conversionService) {
    Assert.notNull(conversionService, "ConversionService must not be null");
    this.conversionService = conversionService;
}

public void setPlaceholderPrefix(String placeholderPrefix) {
    Assert.notNull(placeholderPrefix, "'placeholderPrefix' must not be null");
    this.placeholderPrefix = placeholderPrefix;
}

public void setPlaceholderSuffix(String placeholderSuffix) {
    Assert.notNull(placeholderSuffix, "'placeholderSuffix' must not be null");
    this.placeholderSuffix = placeholderSuffix;
}
```

而对属性的访问，则委托给子类 PropertySourcesPropertyResolver 实现。

```
// AbstractPropertyResolver.java

public String getProperty(String key) {
    return getProperty(key, String.class);
}

public String getProperty(String key, String defaultValue) {
    String value = getProperty(key);
    return (value != null ? value : defaultValue);
}

public <T> T getProperty(String key, Class<T> targetType, T defaultValue) {
    T value = getProperty(key, targetType);
    return (value != null ? value : defaultValue);
}

public String getRequiredProperty(String key) throws IllegalStateException {
    String value = getProperty(key);
    if (value == null) {
        throw new IllegalStateException("Required key '" + key + "' not found");
    }
    return value;
}

public <T> T getRequiredProperty(String key, Class<T> valueType) throws IllegalStateException {
    T value = getProperty(key, valueType);
    if (value == null) {
        throw new IllegalStateException("Required key '" + key + "' not found");
    }
    return value;
}
```

## 2.4 PropertySourcesPropertyResolver

> PropertyResolver 的实现者，他对一组 PropertySources 提供属性解析服务

它仅有一个成员变量：PropertySources 。该成员变量内部存储着一组 PropertySource，表示 key-value 键值对的源的抽象基类，即一个 PropertySource 对象则是一个 key-value 键值对。PropertySource 的代码如下：

```
// PropertySource.java

public abstract class PropertySource<T> {

    protected final Log logger = LogFactory.getLog(getClass());

    protected final String name;
    protected final T source;

    // ...

}
```

------

PropertySourcesPropertyResolver 对外公开的 `#getProperty(...)` 方法，都是委托给 `#getProperty(String key, Class<T> targetValueType, boolean resolveNestedPlaceholders)` 方法实现，他有三个参数，分别表示为：

- `key` ：获取的 key 。
- `targetValueType` ： 目标 value 的类型。
- `resolveNestedPlaceholders` ：是否解决嵌套占位符。

源码如下：

```
// PropertySourcesPropertyResolver.java

@Nullable
protected <T> T getProperty(String key, Class<T> targetValueType, boolean resolveNestedPlaceholders) {
    if (this.propertySources != null) {
        // 遍历 propertySources 数组
        for (PropertySource<?> propertySource : this.propertySources) {
            if (logger.isTraceEnabled()) {
                logger.trace("Searching for key '" + key + "' in PropertySource '" +
                        propertySource.getName() + "'");
            }
            // 获得 key 对应的 value 值
            Object value = propertySource.getProperty(key);
            if (value != null) {
                // 如果解决嵌套占位符，解析占位符
                if (resolveNestedPlaceholders && value instanceof String) {
                    value = resolveNestedPlaceholders((String) value);
                }
                // 如果未找到 key 对应的值，则打印日志
                logKeyFound(key, propertySource, value);
                // value 的类型转换
                return convertValueIfNecessary(value, targetValueType);
            }
        }
    }
    if (logger.isTraceEnabled()) {
        logger.trace("Could not find key '" + key + "' in any property source");
    }
    return null;
}
```

- 首先，从 `propertySource` 中，获取指定 `key` 的 `value` 值。
- 然后，判断是否需要进行嵌套占位符解析，如果需要则调用 `#resolveNestedPlaceholders(String value)` 方法，进行嵌套占位符解析。详细解析，见 [「2.4.1 resolveNestedPlaceholders」](http://svip.iocoder.cn/Spring/PropertySource-and-Environment-and-Profile/#) 。
- 最后，调用 `#convertValueIfNecessary(Object value, Class<T> targetType)` 方法，进行类型转换。详细解析，见 [「2.4.2 convertValueIfNecessary」](http://svip.iocoder.cn/Spring/PropertySource-and-Environment-and-Profile/#) 。

### 2.4.1 resolveNestedPlaceholders

`#resolveNestedPlaceholders(String value)` 方法，用于解析给定字符串中的占位符，同时根据 `ignoreUnresolvableNestedPlaceholders` 的值，来确定是否对不可解析的占位符的处理方法：是忽略还是抛出异常（该值由 `#setIgnoreUnresolvableNestedPlaceholders(boolean ignoreUnresolvableNestedPlaceholders)` 方法来设置）。代码如下：

```
// AbstractPropertyResolver.java

protected String resolveNestedPlaceholders(String value) {
    return (this.ignoreUnresolvableNestedPlaceholders ?
            resolvePlaceholders(value) : resolveRequiredPlaceholders(value));
}
```

- 如果 `this.ignoreUnresolvableNestedPlaceholders` 为 `true` ，则调用 `#resolvePlaceholders(String text)` 方法，否则调用 `#resolveRequiredPlaceholders(String text)` 方法，但是无论是哪个方法，最终都会到 `#doResolvePlaceholders(String text, PropertyPlaceholderHelper helper)` 方法。该方法接收两个参数：

  ```
  // AbstractPropertyResolver.java
  
  // String 类型的 text：待解析的字符串
  // PropertyPlaceholderHelper 类型的 helper：用于解析占位符的工具类。
  private String doResolvePlaceholders(String text, PropertyPlaceholderHelper helper) {
      return helper.replacePlaceholders(text, this::getPropertyAsRawString);
  }
  ```

------

PropertyPlaceholderHelper 是用于处理包含占位符值的字符串，构造该实例需要四个参数：

- `placeholderPrefix`：占位符前缀。

- `placeholderSuffix`：占位符后缀。

- `valueSeparator`：占位符变量与关联的默认值之间的分隔符。

- `ignoreUnresolvablePlaceholders`：指示是否忽略不可解析的占位符（`true`）或抛出异常（`false`）。

- 构造函数如下：

  ```
  // PropertyPlaceholderHelper.java
  
  public PropertyPlaceholderHelper(String placeholderPrefix, String placeholderSuffix,
          @Nullable String valueSeparator, boolean ignoreUnresolvablePlaceholders) {
  
      Assert.notNull(placeholderPrefix, "'placeholderPrefix' must not be null");
      Assert.notNull(placeholderSuffix, "'placeholderSuffix' must not be null");
      this.placeholderPrefix = placeholderPrefix;
      this.placeholderSuffix = placeholderSuffix;
      String simplePrefixForSuffix = wellKnownSimplePrefixes.get(this.placeholderSuffix);
      if (simplePrefixForSuffix != null && this.placeholderPrefix.endsWith(simplePrefixForSuffix)) {
          this.simplePrefix = simplePrefixForSuffix;
      } else {
          this.simplePrefix = this.placeholderPrefix;
      }
      this.valueSeparator = valueSeparator;
      this.ignoreUnresolvablePlaceholders = ignoreUnresolvablePlaceholders;
  }
  ```

就 PropertySourcesPropertyResolver 而言，其父类 AbstractPropertyResolver 已经对上述四个值做了定义：

- `placeholderPrefix` 为 `${` 。
- `placeholderSuffix` 为 `}` 。
- `valueSeparator` 为 `:` 。
- `ignoreUnresolvablePlaceholders` ，默认为 `false` ，当然我们也可以使用相应的 setter 方法自定义。

调用 PropertyPlaceholderHelper 的 `#replacePlaceholders(String value, PlaceholderResolver placeholderResolver)` 方法，对占位符进行处理，该方法接收两个参数，一个是待解析的字符串 `value` ，一个是 PlaceholderResolver 类型的 `placeholderResolver` ，他是定义占位符解析的策略类。代码如下：

```
// PropertyPlaceholderHelper.java

public String replacePlaceholders(String value, PlaceholderResolver placeholderResolver) {
    Assert.notNull(value, "'value' must not be null");
    return parseStringValue(value, placeholderResolver, new HashSet<>());
}

protected String parseStringValue(String value, PlaceholderResolver placeholderResolver, Set<String> visitedPlaceholders) {
    StringBuilder result = new StringBuilder(value);

    // 获取前缀 "${" 的索引位置
    int startIndex = value.indexOf(this.placeholderPrefix);
    while (startIndex != -1) {
        // 获取 后缀 "}" 的索引位置
        int endIndex = findPlaceholderEndIndex(result, startIndex);
        if (endIndex != -1) {
            // 截取 "${" 和 "}" 中间的内容，这也就是我们在配置文件中对应的值
            String placeholder = result.substring(startIndex + this.placeholderPrefix.length(), endIndex);
            String originalPlaceholder = placeholder;
            if (!visitedPlaceholders.add(originalPlaceholder)) {
                throw new IllegalArgumentException(
                        "Circular placeholder reference '" + originalPlaceholder + "' in property definitions");
            }
            // Recursive invocation, parsing placeholders contained in the placeholder key.
            // 解析占位符键中包含的占位符，真正的值
            placeholder = parseStringValue(placeholder, placeholderResolver, visitedPlaceholders);
            // Now obtain the value for the fully resolved key...
            // 从 Properties 中获取 placeHolder 对应的值 propVal
            String propVal = placeholderResolver.resolvePlaceholder(placeholder);
            // 如果不存在
            if (propVal == null && this.valueSeparator != null) {
                // 查询 : 的位置
                int separatorIndex = placeholder.indexOf(this.valueSeparator);
                // 如果存在 :
                if (separatorIndex != -1) {
                    // 获取 : 前面部分 actualPlaceholder
                    String actualPlaceholder = placeholder.substring(0, separatorIndex);
                    // 获取 : 后面部分 defaultValue
                    String defaultValue = placeholder.substring(separatorIndex + this.valueSeparator.length());
                    // 从 Properties 中获取 actualPlaceholder 对应的值
                    propVal = placeholderResolver.resolvePlaceholder(actualPlaceholder);
                    // 如果不存在 则返回 defaultValue
                    if (propVal == null) {
                        propVal = defaultValue;
                    }
                }
            }
            if (propVal != null) {
                // Recursive invocation, parsing placeholders contained in the
                // previously resolved placeholder value.
                propVal = parseStringValue(propVal, placeholderResolver, visitedPlaceholders);
                result.replace(startIndex, endIndex + this.placeholderSuffix.length(), propVal);
                if (logger.isTraceEnabled()) {
                    logger.trace("Resolved placeholder '" + placeholder + "'");
                }
                startIndex = result.indexOf(this.placeholderPrefix, startIndex + propVal.length());
            } else if (this.ignoreUnresolvablePlaceholders) {
                // Proceed with unprocessed value.
                // 忽略值
                startIndex = result.indexOf(this.placeholderPrefix, endIndex + this.placeholderSuffix.length());
            } else {
                throw new IllegalArgumentException("Could not resolve placeholder '" +
                        placeholder + "'" + " in value \"" + value + "\"");
            }
            visitedPlaceholders.remove(originalPlaceholder);
        } else {
            startIndex = -1;
        }
    }

    // 返回propVal，就是替换之后的值
    return result.toString();
}
```

- 其实就是获取占位符 `${}` 中间的值，这里面会涉及到一个递归的过程，因为可能会存在这种情况 `${${name}}`。

## 2.5 convertValueIfNecessary

`#convertValueIfNecessary(Object value, Class<T> targetType)` 方法，是不是感觉到非常的熟悉，该方法就是完成类型转换的。代码如下：

```
// AbstractPropertyResolver.java

@Nullable
protected <T> T convertValueIfNecessary(Object value, @Nullable Class<T> targetType) {
	if (targetType == null) {
		return (T) value;
	}
	ConversionService conversionServiceToUse = this.conversionService;
	if (conversionServiceToUse == null) {
		// Avoid initialization of shared DefaultConversionService if
		// no standard type conversion is needed in the first place...
		if (ClassUtils.isAssignableValue(targetType, value)) {
			return (T) value;
		}
		conversionServiceToUse = DefaultConversionService.getSharedInstance();
	}
	// 执行转换
	return conversionServiceToUse.convert(value, targetType);
}
```

- 首先，获取类型转换服务 `conversionService` 。若为空，则判断是否可以通过反射来设置，如果可以则直接强转返回，否则构造一个 DefaultConversionService 实例。
- 最后调用其 `#convert(Object source, Class<T> targetType)` 方法，完成类型转换。后续就是 Spring 类型转换体系的事情了，如果对其不了解，可以参考小编这篇博客：[【死磕 Spring】—— IoC 之深入分析 Bean 的类型转换体系](http://svip.iocoder.cn/Spring/IoC-TypeConverter)

# 3. Environment

> 表示当前应用程序正在运行的环境

应用程序的环境有两个关键方面：profile 和 properties。

- properties 的方法由 PropertyResolver 定义。
- profile 则表示当前的运行环境，对于应用程序中的 properties 而言，并不是所有的都会加载到系统中，只有其属性与 profile 一直才会被激活加载，

所以 Environment 对象的作用，是确定哪些配置文件（如果有）当前处于活动状态，以及默认情况下哪些配置文件（如果有）应处于活动状态。properties 在几乎所有应用程序中都发挥着重要作用，并且有多种来源：属性文件，JVM 系统属性，系统环境变量，JNDI，servlet 上下文参数，ad-hoc 属性对象，映射等。同时它继承 PropertyResolver 接口，所以与属性相关的 Environment 对象其主要是为用户提供方便的服务接口，用于配置属性源和从中属性源中解析属性。

代码如下：

```
// Environment.java

public interface Environment extends PropertyResolver {

    // 返回此环境下激活的配置文件集
    String[] getActiveProfiles();

    // 如果未设置激活配置文件，则返回默认的激活的配置文件集
    String[] getDefaultProfiles();

    boolean acceptsProfiles(String... profiles);
}
```

Environment 体系结构图如下：

[![Environment 类图](http://static.iocoder.cn/ab5f2dc7cf389534866cc96f1dcf7048)](http://static.iocoder.cn/ab5f2dc7cf389534866cc96f1dcf7048)Environment 类图

- PropertyResolver：提供属性访问功能
- Environment：提供访问和判断 profiles 的功能
- ConfigurableEnvironment：提供设置激活的 profile 和默认的 profile 的功能以及操作 Properties 的工具
- ConfigurableWebEnvironment：提供配置 Servlet 上下文和 Servlet 参数的功能
- AbstractEnvironment：实现了 ConfigurableEnvironment 接口，默认属性和存储容器的定义，并且实现了 ConfigurableEnvironment 的方法，并且为子类预留可覆盖了扩展方法
- StandardEnvironment：继承自 AbstractEnvironment ，非 Servlet(Web) 环境下的标准 Environment 实现
- StandardServletEnvironment：继承自 StandardEnvironment ，Servlet(Web) 环境下的标准 Environment 实现

## 3.1 ConfigurableEnvironment

> 提供设置激活的 profile 和默认的 profile 的功能以及操作 Properties 的工具

该类除了继承 Environment 接口外还继承了 ConfigurablePropertyResolver 接口，所以它即具备了设置 profile 的功能也具备了操作 Properties 的功能。同时还允许客户端通过它设置和验证所需要的属性，自定义转换服务等功能。如下：

```
// ConfigurableEnvironment.java

public interface ConfigurableEnvironment extends Environment, ConfigurablePropertyResolver {

    // 指定该环境下的 profile 集
    void setActiveProfiles(String... profiles);
    // 增加此环境的 profile
    void addActiveProfile(String profile);
    // 设置默认的 profile
    void setDefaultProfiles(String... profiles);

    // 返回此环境的 PropertySources
    MutablePropertySources getPropertySources();
   // 尝试返回 System.getenv() 的值，若失败则返回通过 System.getenv(string) 的来访问各个键的映射
    Map<String, Object> getSystemEnvironment();
    // 尝试返回 System.getProperties() 的值，若失败则返回通过 System.getProperties(string) 的来访问各个键的映射
    Map<String, Object> getSystemProperties();

    void merge(ConfigurableEnvironment parent);
}
```

## 3.2 AbstractEnvironment

> Environment 的基础实现

允许通过设置 `ACTIVE_PROFILES_PROPERTY_NAME` 和`DEFAULT_PROFILES_PROPERTY_NAME` 属性指定活动和默认配置文件。子类的主要区别在于它们默认添加的 PropertySource 对象。而 AbstractEnvironment 则没有添加任何内容。

- 子类应该通过受保护的 `#customizePropertySources(MutablePropertySources)` 钩子提供属性源。方法的代码如下：

  ```
  // AbstractEnvironment.java
  
  public AbstractEnvironment() {
  	customizePropertySources(this.propertySources);
  }
  
  protected void customizePropertySources(MutablePropertySources propertySources) {
  }
  ```

- 而客户端应该使用`AbstractEnvironment#getPropertySources()` 方法，进行自定义并对 MutablePropertySources API 进行操作。方法的代码如下：

  ```
  // AbstractEnvironment.java
  
  @Override
  public MutablePropertySources getPropertySources() {
  	return this.propertySources;
  }
  ```

在 AbstractEnvironment 有两对变量，这两对变量维护着激活和默认配置 profile。如下：

```
// AbstractEnvironment.java

public static final String ACTIVE_PROFILES_PROPERTY_NAME = "spring.profiles.active";
private final Set<String> activeProfiles = new LinkedHashSet<>();

public static final String DEFAULT_PROFILES_PROPERTY_NAME = "spring.profiles.default";
private final Set<String> defaultProfiles = new LinkedHashSet<>(getReservedDefaultProfiles());
```

- 由于实现方法较多，这里只关注两个方法：`#setActiveProfiles(String... profiles)` 和 `#getActiveProfiles()` 。

### 3.2.1 setActiveProfiles

```
// AbstractEnvironment.java

@Override
public void setActiveProfiles(String... profiles) {
    Assert.notNull(profiles, "Profile array must not be null");
    if (logger.isDebugEnabled()) {
        logger.debug("Activating profiles " + Arrays.asList(profiles));
    }
    synchronized (this.activeProfiles) {
        // 清空 activeProfiles
        this.activeProfiles.clear();
        // 遍历 profiles 数组，添加到 activeProfiles 中
        for (String profile : profiles) {
            // 校验
            validateProfile(profile);
            this.activeProfiles.add(profile);
        }
    }
}
```

- 该方法其实就是操作 `activeProfiles` 集合，在每次设置之前都会将该集合清空重新添加，添加之前调用 `#validateProfile(String profile)` 方法，对添加的 profile 进行校验，如下：

  ```
  // AbstractEnvironment.java
  
  protected void validateProfile(String profile) {
      if (!StringUtils.hasText(profile)) {
          throw new IllegalArgumentException("Invalid profile [" + profile + "]: must contain text");
      }
      if (profile.charAt(0) == '!') {
          throw new IllegalArgumentException("Invalid profile [" + profile + "]: must not begin with ! operator");
      }
  }
  ```

  - 这个校验过程比较弱，子类可以提供更加严格的校验规则。

### 3.2.2 getActiveProfile

从 `getActiveProfiles()` 方法，中我们可以猜出这个方法实现的逻辑：获取 `activeProfiles` 集合即可。代码如下：

```
// AbstractEnvironment.java

public String[] getActiveProfiles() {
    return StringUtils.toStringArray(doGetActiveProfiles());
}
```

- 委托给 `#doGetActiveProfiles()` 方法，代码实现：

  ```
  // AbstractEnvironment.java
  
  protected Set<String> doGetActiveProfiles() {
      synchronized (this.activeProfiles) {
          // 如果 activeProfiles 为空，则进行初始化
          if (this.activeProfiles.isEmpty()) {
              // 获得 ACTIVE_PROFILES_PROPERTY_NAME 对应的 profiles 属性值
              String profiles = getProperty(ACTIVE_PROFILES_PROPERTY_NAME);
              if (StringUtils.hasText(profiles)) {
                  // 设置到 activeProfiles 中
                  setActiveProfiles(StringUtils.commaDelimitedListToStringArray(
                          StringUtils.trimAllWhitespace(profiles)));
              }
          }
          return this.activeProfiles;
      }
  }
  ```

  - 如果 `activeProfiles` 为空，则从 Properties 中获取 `spring.profiles.active` 配置，如果不为空，则调用 `#setActiveProfiles(String... profiles)` 方法，设置 profile，最后返回。

# 4. 小结

到这里整个环境&属性已经分析完毕了，至于在后面他是如何与应用上下文结合的，我们后面分析。

# ApplicationContext 相关接口架构分析

**本文主要基于 Spring 5.0.6.RELEASE**

摘要: 原创出处 http://cmsblogs.com/?p=todo 「小明哥」，谢谢！

作为「小明哥」的忠实读者，「老艿艿」略作修改，记录在理解过程中，参考的资料。

------

﻿在前面 40 篇博客中都是基于 BeanFactory 这个容器来进行分析的，BeanFactory 容器有点儿简单，它并不适用于我们生产环境，在生产环境我们通常会选择 ApplicationContext ，相对于大多数人而言，它才是正规军，相比于 BeanFactory 这个杂牌军而言，它由如下几个区别：

1. 继承 MessageSource，提供国际化的标准访问策略。
2. 继承 ApplicationEventPublisher ，提供强大的事件机制。
3. 扩展 ResourceLoader，可以用来加载多个 Resource，可以灵活访问不同的资源。
4. 对 Web 应用的支持。

# 1. ApplicationContext

下图是 ApplicationContext 结构类图：

[![ApplicationContext 结构类图](http://static.iocoder.cn/3a0321713096156d42661f2df11a93c2)](http://static.iocoder.cn/3a0321713096156d42661f2df11a93c2)ApplicationContext 结构类图

- **BeanFactory**：Spring 管理 Bean 的顶层接口，我们可以认为他是一个简易版的 Spring 容器。ApplicationContext 继承 BeanFactory 的两个子类：HierarchicalBeanFactory 和 ListableBeanFactory。HierarchicalBeanFactory 是一个具有层级关系的 BeanFactory，拥有属性 `parentBeanFactory` 。ListableBeanFactory 实现了枚举方法可以列举出当前 BeanFactory 中所有的 bean 对象而不必根据 name 一个一个的获取。
- **ApplicationEventPublisher**：用于封装事件发布功能的接口，向事件监听器（Listener）发送事件消息。
- **ResourceLoader**：Spring 加载资源的顶层接口，用于从一个源加载资源文件。ApplicationContext 继承 ResourceLoader 的子类 ResourcePatternResolver，该接口是将 location 解析为 Resource 对象的策略接口。
- **MessageSource**：解析 message 的策略接口，用不支撑国际化等功能。
- **EnvironmentCapable**：用于获取 Environment 的接口。

# 2. ApplicationContext 的子接口

ApplicationContext 有两个直接子类：WebApplicationContext 和 ConfigurableApplicationContext 。

## 2.1 WebApplicationContext

```
// WebApplicationContext.java

public interface WebApplicationContext extends ApplicationContext {

    ServletContext getServletContext();

}
```

该接口只有一个 `#getServletContext()` 方法，用于给 Servlet 提供上下文信息。

## 2.2 ConfigurableApplicationContext

```
// ConfigurableApplicationContext.java

public interface ConfigurableApplicationContext extends ApplicationContext, Lifecycle, Closeable {

    // 为 ApplicationContext 设置唯一 ID
    void setId(String id);

    // 为 ApplicationContext 设置 parent
    // 父类不应该被修改：如果创建的对象不可用时，则应该在构造函数外部设置它
    void setParent(@Nullable ApplicationContext parent);

    // 设置 Environment
    void setEnvironment(ConfigurableEnvironment environment);

    // 获取 Environment
    @Override
    ConfigurableEnvironment getEnvironment();

    // 添加 BeanFactoryPostProcessor
    void addBeanFactoryPostProcessor(BeanFactoryPostProcessor postProcessor);

    // 添加 ApplicationListener
    void addApplicationListener(ApplicationListener<?> listener);

    // 添加 ProtocolResolver
    void addProtocolResolver(ProtocolResolver resolver);

    // 加载或者刷新配置
    // 这是一个非常重要的方法
    void refresh() throws BeansException, IllegalStateException;

    // 注册 shutdown hook
    void registerShutdownHook();

    // 关闭 ApplicationContext
    @Override
    void close();

    // ApplicationContext 是否处于激活状态
    boolean isActive();

    // 获取当前上下文的 BeanFactory
    ConfigurableListableBeanFactory getBeanFactory() throws IllegalStateException;

}
```

从上面代码可以看到 ConfigurableApplicationContext 接口提供的方法都是对 ApplicationContext 进行配置的，例如 `#setEnvironment(ConfigurableEnvironment environment)`、`#addBeanFactoryPostProcessor(BeanFactoryPostProcessor postProcessor)`，同时它还继承了如下两个接口：

- Lifecycle：对 context 生命周期的管理，它提供 `#start()` 和 `#stop()` 方法启动和暂停组件。
- Closeable：标准 JDK 所提供的一个接口，用于最后关闭组件释放资源等。

## 2.3 ConfigurableWebApplicationContext

WebApplicationContext 接口和 ConfigurableApplicationContext 接口有一个共同的子类接口 ConfigurableWebApplicationContext，该接口将这两个接口进行合并，提供了一个可配置、可管理、可关闭的 WebApplicationContext ，同时该接口还增加了 `#setServletContext(ServletContext servletContext)`，`setServletConfig(ServletConfig servletConfig)` 等方法，用于装配 WebApplicationContext 。代码如下：

```
// ConfigurableWebApplicationContext.java

public interface ConfigurableWebApplicationContext extends WebApplicationContext, ConfigurableApplicationContext {

    void setServletContext(@Nullable ServletContext servletContext);

    void setServletConfig(@Nullable ServletConfig servletConfig);
    ServletConfig getServletConfig();

    void setNamespace(@Nullable String namespace);
    String getNamespace();

    void setConfigLocation(String configLocation);
    void setConfigLocations(String... configLocations);
    String[] getConfigLocations();

}
```

上面三个接口就可以构成一个比较完整的 Spring 容器，整个 Spring 容器体系涉及的接口较多，所以下面小编就一个具体的实现类来看看 ApplicationContext 的实现（其实在前面一系列的文章中，小编对涉及的大部分接口都已经分析了其原理），当然不可能每个方法都涉及到，但小编会把其中最为重要的实现方法贴出来分析。ApplicationContext 的实现类较多，**就以 ClassPathXmlApplicationContext 来分析 ApplicationContext**。

# 3. ClassPathXmlApplicationContext

ClassPathXmlApplicationContext 是我们在学习 Spring 过程中用的非常多的一个类，很多人第一个接触的 Spring 容器就是它，包括小编自己，下面代码我想很多人依然还记得吧。

```
// 示例
ApplicationContext ac = new ClassPathXmlApplicationContext("applicationContext.xml");
StudentService studentService = (StudentService)ac.getBean("studentService");
```

下图是 ClassPathXmlApplicationContext 的结构类图：

[![ClassPathXmlApplicationContext 的类图](http://static.iocoder.cn/dde0bf4ae9014ec73c80f4c45045850a)](http://static.iocoder.cn/dde0bf4ae9014ec73c80f4c45045850a)ClassPathXmlApplicationContext 的类图

主要的的类层级关系如下：

```
org.springframework.context.support.AbstractApplicationContext
      org.springframework.context.support.AbstractRefreshableApplicationContext
            org.springframework.context.support.AbstractRefreshableConfigApplicationContext
                  org.springframework.context.support.AbstractXmlApplicationContext
                        org.springframework.context.support.ClassPathXmlApplicationContext
```

这种设计是模板方法模式典型的应用，AbstractApplicationContext 实现了 ConfigurableApplicationContext 这个全家桶接口，其子类 AbstractRefreshableConfigApplicationContext 又实现了 BeanNameAware 和 InitializingBean 接口。所以 ClassPathXmlApplicationContext 设计的顶级接口有：

```
BeanFactory：Spring 容器 Bean 的管理
MessageSource：管理 message ，实现国际化等功能
ApplicationEventPublisher：事件发布
ResourcePatternResolver：资源加载
EnvironmentCapable：系统 Environment（profile + Properties） 相关
Lifecycle：管理生命周期
Closable：关闭，释放资源
InitializingBean：自定义初始化
BeanNameAware：设置 beanName 的 Aware 接口
```

下面就这些接口来一一分析。

## 3.1 MessageSource

MessageSource 定义了获取 message 的策略方法 `#getMessage(...)` 。
在 ApplicationContext 体系中，该方法由 AbstractApplicationContext 实现。
在 AbstractApplicationContext 中，它持有一个 MessageSource 实例，将 `#getMessage(...)` 方法委托给该实例来实现，代码如下：

```
// AbstractApplicationContext.java

private MessageSource messageSource;

// 实现 getMessage()
public String getMessage(String code, @Nullable Object[] args, @Nullable String defaultMessage, Locale locale) {
    // 委托给 messageSource 实现
    return getMessageSource().getMessage(code, args, defaultMessage, locale);
}

private MessageSource getMessageSource() throws IllegalStateException {
    if (this.messageSource == null) {
        throw new IllegalStateException("MessageSource not initialized - " + "call 'refresh' before accessing messages via the context: " + this);
    }
    return this.messageSource;
}
```

- 真正实现逻辑，是在 AbstractMessageSource 中，代码如下：

  ```
  // AbstractMessageSource.java
  
  public final String getMessage(String code, @Nullable Object[] args, @Nullable String defaultMessage, Locale locale) {
      String msg = getMessageInternal(code, args, locale);
      if (msg != null) {
          return msg;
      }
      if (defaultMessage == null) {
          return getDefaultMessage(code);
      }
      return renderDefaultMessage(defaultMessage, args, locale);
  }
  ```

  - 具体的实现这里就不分析了，有兴趣的小伙伴可以自己去深入研究。

## 3.2 ApplicationEventPublisher

ApplicationEventPublisher ，用于封装事件发布功能的接口，向事件监听器（Listener）发送事件消息。

该接口提供了一个 `#publishEvent(Object event, ...)` 方法，用于通知在此应用程序中注册的所有的监听器。该方法在 AbstractApplicationContext 中实现。

```
// AbstractApplicationContext.java

@Override
public void publishEvent(ApplicationEvent event) {
    publishEvent(event, null);
}

@Override
public void publishEvent(Object event) {
    publishEvent(event, null);
}

protected void publishEvent(Object event, @Nullable ResolvableType eventType) {
    Assert.notNull(event, "Event must not be null");

    // Decorate event as an ApplicationEvent if necessary
    ApplicationEvent applicationEvent;
    if (event instanceof ApplicationEvent) {
        applicationEvent = (ApplicationEvent) event;
    } else {
        applicationEvent = new PayloadApplicationEvent<>(this, event);
        if (eventType == null) {
            eventType = ((PayloadApplicationEvent) applicationEvent).getResolvableType();
        }
    }

    // Multicast right now if possible - or lazily once the multicaster is initialized
    if (this.earlyApplicationEvents != null) {
        this.earlyApplicationEvents.add(applicationEvent);
    } else {
        getApplicationEventMulticaster().multicastEvent(applicationEvent, eventType);
    }

    // Publish event via parent context as well...
    if (this.parent != null) {
        if (this.parent instanceof AbstractApplicationContext) {
            ((AbstractApplicationContext) this.parent).publishEvent(event, eventType);
        } else {
            this.parent.publishEvent(event);
        }
    }
}
```

- 如果指定的事件不是 ApplicationEvent，则它将包装在PayloadApplicationEvent 中。
- 如果存在父级 ApplicationContext ，则同样要将 event 发布给父级 ApplicationContext 。

## 3.3 ResourcePatternResolver

ResourcePatternResolver 接口继承 ResourceLoader 接口，为将 location 解析为 Resource 对象的策略接口。他提供的 `#getResources(String locationPattern)` 方法，在 AbstractApplicationContext 中实现，在 AbstractApplicationContext 中他持有一个 ResourcePatternResolver 的实例对象。代码如下：

```
// AbstractApplicationContext.java

/** ResourcePatternResolver used by this context. */
private ResourcePatternResolver resourcePatternResolver;

public Resource[] getResources(String locationPattern) throws IOException {
    return this.resourcePatternResolver.getResources(locationPattern);
}
```

- 如果小伙伴对 Spring 的 ResourceLoader 比较熟悉的话，你会发现最终是在 PathMatchingResourcePatternResolver 中实现，该类是 ResourcePatternResolver 接口的实现者。

## 3.4 EnvironmentCapable

提供当前系统环境 Environment 组件。提供了一个 `#getEnvironment()` 方法，用于返回 Environment 实例对象。该方法在 AbstractApplicationContext 实现。代码如下：

```
// AbstractApplicationContext.java
public ConfigurableEnvironment getEnvironment() {
    if (this.environment == null) {
        this.environment = createEnvironment();
    }
    return this.environment;
}
```

- 如果持有的 `environment` 实例对象为空，则调用 `#createEnvironment()` 方法，创建一个。代码如下：

  ```
  // AbstractApplicationContext.java
  
  protected ConfigurableEnvironment createEnvironment() {
      return new StandardEnvironment();
  }
  ```

  - StandardEnvironment 是一个适用于非 WEB 应用的 Environment。

## 3.5 Lifecycle

Lifecycle ，一个用于管理声明周期的接口。

在 AbstractApplicationContext 中存在一个 LifecycleProcessor 类型的实例对象 `lifecycleProcessor` ，AbstractApplicationContext 中关于 Lifecycle 接口的实现都是委托给 `lifecycleProcessor` 实现的。代码如下：

```
// AbstractApplicationContext.java

/** LifecycleProcessor for managing the lifecycle of beans within this context. */
@Nullable
private LifecycleProcessor lifecycleProcessor;

@Override
public void start() {
    getLifecycleProcessor().start();
    publishEvent(new ContextStartedEvent(this));
}

@Override
public void stop() {
    getLifecycleProcessor().stop();
    publishEvent(new ContextStoppedEvent(this));
}

@Override
public boolean isRunning() {
    return (this.lifecycleProcessor != null && this.lifecycleProcessor.isRunning());
}
```

- 在启动、停止的时候会分别发布 ContextStartedEvent 和 ContextStoppedEvent 事件。

## 3.6 Closable

Closable 接口用于关闭和释放资源，提供了 `#close()` 方法，以释放对象所持有的资源。在 ApplicationContext 体系中由AbstractApplicationContext 实现，用于关闭 ApplicationContext 销毁所有 Bean ，此外如果注册有 JVM shutdown hook ，同样要将其移除。代码如下：

```
// AbstractApplicationContext.java

public void close() {
    synchronized (this.startupShutdownMonitor) {
        doClose();
        // If we registered a JVM shutdown hook, we don't need it anymore now:
        // We've already explicitly closed the context.
        if (this.shutdownHook != null) {
            try {
                Runtime.getRuntime().removeShutdownHook(this.shutdownHook);
            } catch (IllegalStateException ex) {
             // ignore - VM is already shutting down
            }
        }
    }
}
```

- 调用 `#doClose()` 方法，发布 ContextClosedEvent 事件，销毁所有 Bean（单例），关闭 BeanFactory 。代码如下：

  ```
  // AbstractApplicationContext.java
  
  protected void doClose() {
      // ... 省略部分代码
      try {
          // Publish shutdown event.
          publishEvent(new ContextClosedEvent(this));
      } catch (Throwable ex) {
          logger.warn("Exception thrown from ApplicationListener handling ContextClosedEvent", ex);
      }
  
      // ... 省略部分代码
      destroyBeans();
      closeBeanFactory();
      onClose();
  
      this.active.set(false);
  
  }
  ```

## 3.7 InitializingBean

InitializingBean 为 Bean 提供了初始化方法的方式，它提供的 `#afterPropertiesSet()` 方法，用于执行初始化动作。在 ApplicationContext 体系中，该方法由 AbstractRefreshableConfigApplicationContext 实现，代码如下：

```
// AbstractRefreshableConfigApplicationContext.java
public void afterPropertiesSet() {
    if (!isActive()) {
        refresh();
    }
}
```

- 执行 `refresh()` 方法，该方法在 AbstractApplicationContext 中执行，执行整个 Spring 容器的初始化过程。**该方法将在下篇文章进行详细分析说明**。

## 3.8 BeanNameAware

BeanNameAware ，设置 Bean Name 的接口。接口在 AbstractRefreshableConfigApplicationContext 中实现。

```
// AbstractRefreshableConfigApplicationContext.java
public void setBeanName(String name) {
    if (!this.setIdCalled) {
        super.setId(name);
        setDisplayName("ApplicationContext '" + name + "'");
    }
}
```

# 4. 小结

由于篇幅问题，再加上大部分接口小编都已经在前面文章进行了详细的阐述，所以本文主要是以 Spring Framework 的 ApplicationContext 为中心，对其结构和功能的实现进行了简要的说明。

这里不得不说 Spring 真的是一个非常优秀的框架，具有良好的结构设计和接口抽象，它的每一个接口职能单一，且都是具体功能到各个模块的高度抽象，且几乎每套接口都提供了一个默认的实现（defaultXXX）。

对于 ApplicationContext 体系而言，他继承 Spring 中众多的核心接口，能够为客户端提供一个相对完整的 Spring 容器，接口 ConfigurableApplicationContext 对 ApplicationContext 接口再次进行扩展，提供了生命周期的管理功能。
抽象类 ApplicationContext 对整套接口提供了大部分的默认实现，将其中“不易变动”的部分进行了封装，通过“组合”的方式将“容易变动”的功能委托给其他类来实现，同时利用模板方法模式将一些方法的实现开放出去由子类实现，从而实现“**对扩展开放，对修改封闭**”的设计原则。

最后我们再来领略下图的风采：

[![ClassPathXmlApplicationContext 的类图](http://static.iocoder.cn/dde0bf4ae9014ec73c80f4c45045850a)](http://static.iocoder.cn/dde0bf4ae9014ec73c80f4c45045850a)ClassPathXmlApplicationContext 的类图

# 深入分析 ApplicationContext 的 refresh()

**本文主要基于 Spring 5.0.6.RELEASE**

摘要: 原创出处 http://cmsblogs.com/?p=todo 「小明哥」，谢谢！

作为「小明哥」的忠实读者，「老艿艿」略作修改，记录在理解过程中，参考的资料。

------

上篇博客只是对 ApplicationContext 相关的接口做了一个简单的介绍，作为一个高富帅级别的 Spring 容器，它涉及的方法实在是太多了，全部介绍是不可能的，而且大部分功能都已经在前面系列博客中做了详细的介绍，所以这篇博问介绍 ApplicationContext 最重要的方法（小编认为的） ：`#refresh()` 方法。

> 艿艿：我也这么认为，`#refresh()` 方法是关键的关键！

`#refresh()` 方法，是定义在 ConfigurableApplicationContext 类中的，如下：

```
// ConfigurableApplicationContext.java

/**
 * Load or refresh the persistent representation of the configuration,
 * which might an XML file, properties file, or relational database schema.
 * As this is a startup method, it should destroy already created singletons
 * if it fails, to avoid dangling resources. In other words, after invocation
 * of that method, either all or no singletons at all should be instantiated.
 * @throws BeansException if the bean factory could not be initialized
 * @throws IllegalStateException if already initialized and multiple refresh
 * attempts are not supported
 */
void refresh() throws BeansException, IllegalStateException;
```

- 作用就是：**刷新 Spring 的应用上下文**。

其实现是在 AbstractApplicationContext 中实现。如下：

```
// AbstractApplicationContext.java

@Override
public void refresh() throws BeansException, IllegalStateException {
	synchronized (this.startupShutdownMonitor) {
		// 准备刷新上下文环境
		prepareRefresh();

		// 创建并初始化 BeanFactory
		ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

		// 填充BeanFactory功能
		prepareBeanFactory(beanFactory);

		try {
			// 提供子类覆盖的额外处理，即子类处理自定义的BeanFactoryPostProcess
			postProcessBeanFactory(beanFactory);

			// 激活各种BeanFactory处理器
			invokeBeanFactoryPostProcessors(beanFactory);

			// 注册拦截Bean创建的Bean处理器，即注册 BeanPostProcessor
			registerBeanPostProcessors(beanFactory);

			// 初始化上下文中的资源文件，如国际化文件的处理等
			initMessageSource();

			// 初始化上下文事件广播器
			initApplicationEventMulticaster();

			// 给子类扩展初始化其他Bean
			onRefresh();

			// 在所有bean中查找listener bean，然后注册到广播器中
			registerListeners();

			// 初始化剩下的单例Bean(非延迟加载的)
			finishBeanFactoryInitialization(beanFactory);

			// 完成刷新过程,通知生命周期处理器lifecycleProcessor刷新过程,同时发出ContextRefreshEvent通知别人
			finishRefresh();
		} catch (BeansException ex) {
			if (logger.isWarnEnabled()) {
				logger.warn("Exception encountered during context initialization - " +
						"cancelling refresh attempt: " + ex);
			}

			//  销毁已经创建的Bean
			destroyBeans();

			// 重置容器激活标签
			cancelRefresh(ex);

			// 抛出异常
			throw ex;
		} finally {
			// Reset common introspection caches in Spring's core, since we
			// might not ever need metadata for singleton beans anymore...
			resetCommonCaches();
		}
	}
}
```

这里每一个方法都非常重要，需要一个一个地解释说明。

# 1. prepareRefresh()

> 初始化上下文环境，对系统的环境变量或者系统属性进行准备和校验,如环境变量中必须设置某个值才能运行，否则不能运行，这个时候可以在这里加这个校验，重写 initPropertySources 方法就好了

```
// AbstractApplicationContext.java

protected void prepareRefresh() {
   // 设置启动日期
	this.startupDate = System.currentTimeMillis();
	// 设置 context 当前状态
	this.closed.set(false);
	this.active.set(true);

	if (logger.isInfoEnabled()) {
		logger.info("Refreshing " + this);
	}

	// 初始化context environment（上下文环境）中的占位符属性来源
	initPropertySources();

	// 对属性进行必要的验证
	getEnvironment().validateRequiredProperties();

	this.earlyApplicationEvents = new LinkedHashSet<>();
}
```

该方法主要是做一些准备工作，如：

1. 设置 context 启动时间
2. 设置 context 的当前状态
3. 初始化 context environment 中占位符
4. 对属性进行必要的验证

# 2. obtainFreshBeanFactory()

> 创建并初始化 BeanFactory

```
// AbstractApplicationContext.java

protected ConfigurableListableBeanFactory obtainFreshBeanFactory() {
   // 刷新 BeanFactory
	refreshBeanFactory();
	// 获取 BeanFactory
	ConfigurableListableBeanFactory beanFactory = getBeanFactory();
	if (logger.isDebugEnabled()) {
		logger.debug("Bean factory for " + getDisplayName() + ": " + beanFactory);
	}
	return beanFactory;
}
```

核心方法就在 `#refreshBeanFactory()` 方法，该方法的核心任务就是创建 BeanFactory 并对其就行一番初始化。如下：

```
// AbstractRefreshableApplicationContext.java

@Override
protected final void refreshBeanFactory() throws BeansException {
    // 若已有 BeanFactory ，销毁它的 Bean 们，并销毁 BeanFactory
    if (hasBeanFactory()) {
        destroyBeans();
        closeBeanFactory();
    }
    try {
        // 创建 BeanFactory 对象
        DefaultListableBeanFactory beanFactory = createBeanFactory();
        // 指定序列化编号
        beanFactory.setSerializationId(getId());
        // 定制 BeanFactory 设置相关属性
        customizeBeanFactory(beanFactory);
        // 加载 BeanDefinition 们
        loadBeanDefinitions(beanFactory);
        // 设置 Context 的 BeanFactory
        synchronized (this.beanFactoryMonitor) {
            this.beanFactory = beanFactory;
        }
    } catch (IOException ex) {
        throw new ApplicationContextException("I/O error parsing bean definition source for " + getDisplayName(), ex);
    }
}
```

1. 判断当前容器是否存在一个 BeanFactory，如果存在则对其进行销毁和关闭
2. 调用 `#createBeanFactory()` 方法，创建一个 BeanFactory 实例，其实就是 DefaultListableBeanFactory 。
3. 自定义 BeanFactory
4. 加载 BeanDefinition 。
5. 将创建好的 bean 工厂的引用交给的 context 来管理

上面 5 个步骤，都是比较简单的，但是有必要讲解下第 4 步：加载 BeanDefinition。如果各位看过 【死磕 Spring】系列的话，在刚刚开始分析源码的时候，小编就是以 `BeanDefinitionReader#loadBeanDefinitions(Resource resource)` 方法，作为入口来分析的，示例如下：

```
// 示例代码

ClassPathResource resource = new ClassPathResource("bean.xml");
DefaultListableBeanFactory factory = new DefaultListableBeanFactory();
XmlBeanDefinitionReader reader = new XmlBeanDefinitionReader(factory);
reader.loadBeanDefinitions(resource);
```

只不过这段代码的 `BeanDefinitionReader#loadBeanDefinitions(Resource)` 方法，是定义在 BeanDefinitionReader 中，而此处的 `#loadBeanDefinitions(DefaultListableBeanFactory beanFactory)` 则是定义在 AbstractRefreshableApplicationContext 中，如下：

```
// AbstractRefreshableApplicationContext.java

protected abstract void loadBeanDefinitions(DefaultListableBeanFactory beanFactory) throws BeansException, IOException
```

由具体的子类实现，我们以 AbstractXmlApplicationContext 为例，实现如下：

```
// AbstractXmlApplicationContext.java

@Override
protected void loadBeanDefinitions(DefaultListableBeanFactory beanFactory) throws BeansException, IOException {
    // Create a new XmlBeanDefinitionReader for the given BeanFactory.
    // 创建 XmlBeanDefinitionReader 对象
    XmlBeanDefinitionReader beanDefinitionReader = new XmlBeanDefinitionReader(beanFactory);

    // Configure the bean definition reader with this context's
    // resource loading environment.
    // 对 XmlBeanDefinitionReader 进行环境变量的设置
    beanDefinitionReader.setEnvironment(this.getEnvironment());
    beanDefinitionReader.setResourceLoader(this);
    beanDefinitionReader.setEntityResolver(new ResourceEntityResolver(this));

    // Allow a subclass to provide custom initialization of the reader,
    // then proceed with actually loading the bean definitions.
    // 对 XmlBeanDefinitionReader 进行设置，可以进行覆盖
    initBeanDefinitionReader(beanDefinitionReader);

    // 从 Resource 们中，加载 BeanDefinition 们
    loadBeanDefinitions(beanDefinitionReader);
}
```

- 新建 XmlBeanDefinitionReader 实例对象 beanDefinitionReader，调用 `initBeanDefinitionReader()` 对其进行初始化，然后调用 `loadBeanDefinitions()` 加载 BeanDefinition。代码如下：

  ```
  // AbstractXmlApplicationContext.java
  
  protected void loadBeanDefinitions(XmlBeanDefinitionReader reader) throws BeansException, IOException {
      // 从配置文件 Resource 中，加载 BeanDefinition 们
      Resource[] configResources = getConfigResources();
      if (configResources != null) {
          reader.loadBeanDefinitions(configResources);
      }
      // 从配置文件地址中，加载 BeanDefinition 们
      String[] configLocations = getConfigLocations();
      if (configLocations != null) {
          reader.loadBeanDefinitions(configLocations);
      }
  }
  ```

  - 到这里我们发现，其实内部依然是调用 `BeanDefinitionReader#loadBeanDefinitionn()` 进行 BeanDefinition 的加载进程。

# 3. prepareBeanFactory(beanFactory)

> 填充 BeanFactory 功能

上面获取获取的 BeanFactory 除了加载了一些 BeanDefinition 就没有其他任何东西了，这个时候其实还不能投入生产，因为还少配置了一些东西，比如 context的 ClassLoader 和 后置处理器等等。

```
// AbstractApplicationContext.java

protected void prepareBeanFactory(ConfigurableListableBeanFactory beanFactory) {
	// 设置beanFactory的classLoader
	beanFactory.setBeanClassLoader(getClassLoader());

	// 设置beanFactory的表达式语言处理器,Spring3开始增加了对语言表达式的支持,默认可以使用#{bean.xxx}的形式来调用相关属性值
	beanFactory.setBeanExpressionResolver(new StandardBeanExpressionResolver(beanFactory.getBeanClassLoader()));
	// 为beanFactory增加一个默认的propertyEditor
	beanFactory.addPropertyEditorRegistrar(new ResourceEditorRegistrar(this, getEnvironment()));

	// 添加ApplicationContextAwareProcessor
	beanFactory.addBeanPostProcessor(new ApplicationContextAwareProcessor(this));
	// 设置忽略自动装配的接口
    beanFactory.ignoreDependencyInterface(EnvironmentAware.class);
	beanFactory.ignoreDependencyInterface(EmbeddedValueResolverAware.class);
	beanFactory.ignoreDependencyInterface(ResourceLoaderAware.class);
	beanFactory.ignoreDependencyInterface(ApplicationEventPublisherAware.class);
	beanFactory.ignoreDependencyInterface(MessageSourceAware.class);
	beanFactory.ignoreDependencyInterface(ApplicationContextAware.class);

	// 设置几个自动装配的特殊规则
	beanFactory.registerResolvableDependency(BeanFactory.class, beanFactory);
	beanFactory.registerResolvableDependency(ResourceLoader.class, this);
	beanFactory.registerResolvableDependency(ApplicationEventPublisher.class, this);
	beanFactory.registerResolvableDependency(ApplicationContext.class, this);

	// Register early post-processor for detecting inner beans as ApplicationListeners.
	beanFactory.addBeanPostProcessor(new ApplicationListenerDetector(this));

	// 增加对AspectJ的支持
	if (beanFactory.containsBean(LOAD_TIME_WEAVER_BEAN_NAME)) {
		beanFactory.addBeanPostProcessor(new LoadTimeWeaverAwareProcessor(beanFactory));
		// Set a temporary ClassLoader for type matching.
		beanFactory.setTempClassLoader(new ContextTypeMatchClassLoader(beanFactory.getBeanClassLoader()));
	}

	// 注册默认的系统环境bean
	if (!beanFactory.containsLocalBean(ENVIRONMENT_BEAN_NAME)) {
		beanFactory.registerSingleton(ENVIRONMENT_BEAN_NAME, getEnvironment());
	}
	if (!beanFactory.containsLocalBean(SYSTEM_PROPERTIES_BEAN_NAME)) {
		beanFactory.registerSingleton(SYSTEM_PROPERTIES_BEAN_NAME, getEnvironment().getSystemProperties());
	}
	if (!beanFactory.containsLocalBean(SYSTEM_ENVIRONMENT_BEAN_NAME)) {
		beanFactory.registerSingleton(SYSTEM_ENVIRONMENT_BEAN_NAME, getEnvironment().getSystemEnvironment());
	}
}
```

看上面的源码知道这个就是对 BeanFactory 设置各种各种的功能。

# 4. postProcessBeanFactory()

> 提供子类覆盖的额外处理，即子类处理自定义的BeanFactoryPostProcess

```
// AbstractApplicationContext.java

protected void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
	beanFactory.addBeanPostProcessor(new ServletContextAwareProcessor(this.servletContext, this.servletConfig));
	beanFactory.ignoreDependencyInterface(ServletContextAware.class);
	beanFactory.ignoreDependencyInterface(ServletConfigAware.class);

	WebApplicationContextUtils.registerWebApplicationScopes(beanFactory, this.servletContext);
	WebApplicationContextUtils.registerEnvironmentBeans(beanFactory, this.servletContext, this.servletConfig);
}
```

1. 添加 ServletContextAwareProcessor 到 BeanFactory 容器中，该 processor 实现 BeanPostProcessor 接口，主要用于将ServletContext 传递给实现了 ServletContextAware 接口的 bean
2. 忽略 ServletContextAware、ServletConfigAware
3. 注册 WEB 应用特定的域（scope）到 beanFactory 中，以便 WebApplicationContext 可以使用它们。比如 “request” , “session” , “globalSession” , “application”
4. 注册 WEB 应用特定的 Environment bean 到 beanFactory 中，以便WebApplicationContext 可以使用它们。如：”contextParameters”, “contextAttributes”

# 5. invokeBeanFactoryPostProcessors()

> 激活各种BeanFactory处理器

```
// AbstractApplicationContext.java

public static void invokeBeanFactoryPostProcessors(
		ConfigurableListableBeanFactory beanFactory, List<BeanFactoryPostProcessor> beanFactoryPostProcessors) {

	// 定义一个 set 保存所有的 BeanFactoryPostProcessors
	Set<String> processedBeans = new HashSet<>();

	// 如果当前 BeanFactory 为 BeanDefinitionRegistry
	if (beanFactory instanceof BeanDefinitionRegistry) {
		BeanDefinitionRegistry registry = (BeanDefinitionRegistry) beanFactory;
		// BeanFactoryPostProcessor 集合
		List<BeanFactoryPostProcessor> regularPostProcessors = new ArrayList<>();
		// BeanDefinitionRegistryPostProcessor 集合
		List<BeanDefinitionRegistryPostProcessor> registryProcessors = new ArrayList<>();

		// 迭代注册的 beanFactoryPostProcessors
		for (BeanFactoryPostProcessor postProcessor : beanFactoryPostProcessors) {
			// 如果是 BeanDefinitionRegistryPostProcessor，则调用 postProcessBeanDefinitionRegistry 进行注册，
			// 同时加入到 registryProcessors 集合中
			if (postProcessor instanceof BeanDefinitionRegistryPostProcessor) {
				BeanDefinitionRegistryPostProcessor registryProcessor =
						(BeanDefinitionRegistryPostProcessor) postProcessor;
				registryProcessor.postProcessBeanDefinitionRegistry(registry);
				registryProcessors.add(registryProcessor);
			}
			else {
				// 否则当做普通的 BeanFactoryPostProcessor 处理
				// 添加到 regularPostProcessors 集合中即可，便于后面做后续处理
				regularPostProcessors.add(postProcessor);
			}
		}

		// 用于保存当前处理的 BeanDefinitionRegistryPostProcessor
		List<BeanDefinitionRegistryPostProcessor> currentRegistryProcessors = new ArrayList<>();

		// 首先处理实现了 PriorityOrdered (有限排序接口)的 BeanDefinitionRegistryPostProcessor
		String[] postProcessorNames =
				beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
		for (String ppName : postProcessorNames) {
			if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
				currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
				processedBeans.add(ppName);
			}
		}

		// 排序
		sortPostProcessors(currentRegistryProcessors, beanFactory);

		// 加入registryProcessors集合
		registryProcessors.addAll(currentRegistryProcessors);

		// 调用所有实现了 PriorityOrdered 的 BeanDefinitionRegistryPostProcessors 的 postProcessBeanDefinitionRegistry()
		invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);

		// 清空，以备下次使用
		currentRegistryProcessors.clear();

		// 其次，调用是实现了 Ordered（普通排序接口）的 BeanDefinitionRegistryPostProcessors
		// 逻辑和 上面一样
		postProcessorNames = beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
		for (String ppName : postProcessorNames) {
			if (!processedBeans.contains(ppName) && beanFactory.isTypeMatch(ppName, Ordered.class)) {
				currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
				processedBeans.add(ppName);
			}
		}
		sortPostProcessors(currentRegistryProcessors, beanFactory);
		registryProcessors.addAll(currentRegistryProcessors);
		invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);
		currentRegistryProcessors.clear();

		// 最后调用其他的 BeanDefinitionRegistryPostProcessors
		boolean reiterate = true;
		while (reiterate) {
			reiterate = false;
			// 获取 BeanDefinitionRegistryPostProcessor
			postProcessorNames = beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
			for (String ppName : postProcessorNames) {

				// 没有包含在 processedBeans 中的（因为包含了的都已经处理了）
				if (!processedBeans.contains(ppName)) {
					currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
					processedBeans.add(ppName);
					reiterate = true;
				}
			}

			// 与上面处理逻辑一致
			sortPostProcessors(currentRegistryProcessors, beanFactory);
			registryProcessors.addAll(currentRegistryProcessors);
			invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);
			currentRegistryProcessors.clear();
		}

		// 调用所有 BeanDefinitionRegistryPostProcessor (包括手动注册和通过配置文件注册)
		// 和 BeanFactoryPostProcessor(只有手动注册)的回调函数(postProcessBeanFactory())
		invokeBeanFactoryPostProcessors(registryProcessors, beanFactory);
		invokeBeanFactoryPostProcessors(regularPostProcessors, beanFactory);
	}

	else {
		// 如果不是 BeanDefinitionRegistry 只需要调用其回调函数（postProcessBeanFactory()）即可
		invokeBeanFactoryPostProcessors(beanFactoryPostProcessors, beanFactory);
	}

	//
	String[] postProcessorNames =
			beanFactory.getBeanNamesForType(BeanFactoryPostProcessor.class, true, false);

	// 这里同样需要区分 PriorityOrdered 、Ordered 和 no Ordered
	List<BeanFactoryPostProcessor> priorityOrderedPostProcessors = new ArrayList<>();
	List<String> orderedPostProcessorNames = new ArrayList<>();
	List<String> nonOrderedPostProcessorNames = new ArrayList<>();
	for (String ppName : postProcessorNames) {
		// 已经处理过了的，跳过
		if (processedBeans.contains(ppName)) {
			// skip - already processed in first phase above
		}
		// PriorityOrdered
		else if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
			priorityOrderedPostProcessors.add(beanFactory.getBean(ppName, BeanFactoryPostProcessor.class));
		}
		// Ordered
		else if (beanFactory.isTypeMatch(ppName, Ordered.class)) {
			orderedPostProcessorNames.add(ppName);
		}
		// no Ordered
		else {
			nonOrderedPostProcessorNames.add(ppName);
		}
	}

	// First, PriorityOrdered 接口
	sortPostProcessors(priorityOrderedPostProcessors, beanFactory);
	invokeBeanFactoryPostProcessors(priorityOrderedPostProcessors, beanFactory);

	// Next, Ordered 接口
	List<BeanFactoryPostProcessor> orderedPostProcessors = new ArrayList<>();
	for (String postProcessorName : orderedPostProcessorNames) {
		orderedPostProcessors.add(beanFactory.getBean(postProcessorName, BeanFactoryPostProcessor.class));
	}
	sortPostProcessors(orderedPostProcessors, beanFactory);
	invokeBeanFactoryPostProcessors(orderedPostProcessors, beanFactory);

	// Finally, no ordered
	List<BeanFactoryPostProcessor> nonOrderedPostProcessors = new ArrayList<>();
	for (String postProcessorName : nonOrderedPostProcessorNames) {
		nonOrderedPostProcessors.add(beanFactory.getBean(postProcessorName, BeanFactoryPostProcessor.class));
	}
	invokeBeanFactoryPostProcessors(nonOrderedPostProcessors, beanFactory);

	// Clear cached merged bean definitions since the post-processors might have
	// modified the original metadata, e.g. replacing placeholders in values...
	beanFactory.clearMetadataCache();
}
```

上述代码较长，但是处理逻辑较为单一，就是对所有的 BeanDefinitionRegistryPostProcessors 、手动注册的 BeanFactoryPostProcessor 以及通过配置文件方式的 BeanFactoryPostProcessor 按照 PriorityOrdered 、 Ordered、no ordered 三种方式分开处理、调用。

# 6. registerBeanPostProcessors

> 注册拦截Bean创建的Bean处理器，即注册 BeanPostProcessor

与 BeanFactoryPostProcessor 一样，也是委托给 PostProcessorRegistrationDelegate 来实现的。

```
// AbstractApplicationContext.java

public static void registerBeanPostProcessors(
		ConfigurableListableBeanFactory beanFactory, AbstractApplicationContext applicationContext) {

	// 所有的 BeanPostProcessors
	String[] postProcessorNames = beanFactory.getBeanNamesForType(BeanPostProcessor.class, true, false);

	// 注册 BeanPostProcessorChecker
	// 主要用于记录一些 bean 的信息，这些 bean 不符合所有 BeanPostProcessors 处理的资格时
	int beanProcessorTargetCount = beanFactory.getBeanPostProcessorCount() + 1 + postProcessorNames.length;
	beanFactory.addBeanPostProcessor(new BeanPostProcessorChecker(beanFactory, beanProcessorTargetCount));

	// 区分 PriorityOrdered、Ordered 、 no ordered
	List<BeanPostProcessor> priorityOrderedPostProcessors = new ArrayList<>();
	List<String> orderedPostProcessorNames = new ArrayList<>();
	List<String> nonOrderedPostProcessorNames = new ArrayList<>();
	// MergedBeanDefinition
	List<BeanPostProcessor> internalPostProcessors = new ArrayList<>();
	for (String ppName : postProcessorNames) {
		if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
			BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
			priorityOrderedPostProcessors.add(pp);
			if (pp instanceof MergedBeanDefinitionPostProcessor) {
				internalPostProcessors.add(pp);
			}
		}
		else if (beanFactory.isTypeMatch(ppName, Ordered.class)) {
			orderedPostProcessorNames.add(ppName);
		}
		else {
			nonOrderedPostProcessorNames.add(ppName);
		}
	}

	// First, PriorityOrdered
	sortPostProcessors(priorityOrderedPostProcessors, beanFactory);
	registerBeanPostProcessors(beanFactory, priorityOrderedPostProcessors);

	// Next, Ordered
	List<BeanPostProcessor> orderedPostProcessors = new ArrayList<>();
	for (String ppName : orderedPostProcessorNames) {
		BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
		orderedPostProcessors.add(pp);
		if (pp instanceof MergedBeanDefinitionPostProcessor) {
			internalPostProcessors.add(pp);
		}
	}
	sortPostProcessors(orderedPostProcessors, beanFactory);
	registerBeanPostProcessors(beanFactory, orderedPostProcessors);

	// onOrdered
	List<BeanPostProcessor> nonOrderedPostProcessors = new ArrayList<>();
	for (String ppName : nonOrderedPostProcessorNames) {
		BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
		nonOrderedPostProcessors.add(pp);
		if (pp instanceof MergedBeanDefinitionPostProcessor) {
			internalPostProcessors.add(pp);
		}
	}
	registerBeanPostProcessors(beanFactory, nonOrderedPostProcessors);

	// Finally, all internal BeanPostProcessors.
	sortPostProcessors(internalPostProcessors, beanFactory);
	registerBeanPostProcessors(beanFactory, internalPostProcessors);

	// 重新注册用来自动探测内部ApplicationListener的post-processor，这样可以将他们移到处理器链条的末尾
	beanFactory.addBeanPostProcessor(new ApplicationListenerDetector(applicationContext));
}
```

# 7. initMessageSource

> 初始化上下文中的资源文件，如国际化文件的处理等

其实该方法就是初始化一个 MessageSource 接口的实现类，主要用于国际化/i18n。

```
// AbstractApplicationContext.java

protected void initMessageSource() {
	ConfigurableListableBeanFactory beanFactory = getBeanFactory();
	// 包含 “messageSource” bean
	if (beanFactory.containsLocalBean(MESSAGE_SOURCE_BEAN_NAME)) {
		this.messageSource = beanFactory.getBean(MESSAGE_SOURCE_BEAN_NAME, MessageSource.class);
		// 如果有父类
		// HierarchicalMessageSource 分级处理的 MessageSource
		if (this.parent != null && this.messageSource instanceof HierarchicalMessageSource) {
			HierarchicalMessageSource hms = (HierarchicalMessageSource) this.messageSource;
			if (hms.getParentMessageSource() == null) {
				// 如果没有注册父 MessageSource，则设置为父类上下文的的 MessageSource
				hms.setParentMessageSource(getInternalParentMessageSource());
			}
		}
		if (logger.isDebugEnabled()) {
			logger.debug("Using MessageSource [" + this.messageSource + "]");
		}
	}
	else {
		// 使用 空 MessageSource
		DelegatingMessageSource dms = new DelegatingMessageSource();
		dms.setParentMessageSource(getInternalParentMessageSource());
		this.messageSource = dms;
		beanFactory.registerSingleton(MESSAGE_SOURCE_BEAN_NAME, this.messageSource);
		if (logger.isDebugEnabled()) {
			logger.debug("Unable to locate MessageSource with name '" + MESSAGE_SOURCE_BEAN_NAME +
					"': using default [" + this.messageSource + "]");
		}
	}
}
```

# 8. initApplicationEventMulticaster

> 初始化上下文事件广播器

```
// AbstractApplicationContext.java

protected void initApplicationEventMulticaster() {
	ConfigurableListableBeanFactory beanFactory = getBeanFactory();

	// 如果存在 applicationEventMulticaster bean，则获取赋值
	if (beanFactory.containsLocalBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME)) {
		this.applicationEventMulticaster =
				beanFactory.getBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, ApplicationEventMulticaster.class);
		if (logger.isDebugEnabled()) {
			logger.debug("Using ApplicationEventMulticaster [" + this.applicationEventMulticaster + "]");
		}
	}
	else {
		// 没有则新建 SimpleApplicationEventMulticaster，并完成 bean 的注册
		this.applicationEventMulticaster = new SimpleApplicationEventMulticaster(beanFactory);
		beanFactory.registerSingleton(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, this.applicationEventMulticaster);
		if (logger.isDebugEnabled()) {
			logger.debug("Unable to locate ApplicationEventMulticaster with name '" +
					APPLICATION_EVENT_MULTICASTER_BEAN_NAME +
					"': using default [" + this.applicationEventMulticaster + "]");
		}
	}
}
```

如果当前容器中存在 applicationEventMulticaster 的 bean，则对 applicationEventMulticaster 赋值，否则新建一个 SimpleApplicationEventMulticaster 的对象（默认的），并完成注册。

# 9. onRefresh

> 给子类扩展初始化其他Bean

预留给 AbstractApplicationContext 的子类用于初始化其他特殊的 bean，该方法需要在所有单例 bean 初始化之前调用。

# 10. registerListeners

> 在所有 bean 中查找 listener bean，然后注册到广播器中

```
// AbstractApplicationContext.java

protected void registerListeners() {
	// 注册静态 监听器
	for (ApplicationListener<?> listener : getApplicationListeners()) {
		getApplicationEventMulticaster().addApplicationListener(listener);
	}

	String[] listenerBeanNames = getBeanNamesForType(ApplicationListener.class, true, false);
	for (String listenerBeanName : listenerBeanNames) {
		getApplicationEventMulticaster().addApplicationListenerBean(listenerBeanName);
	}

	// 至此，已经完成将监听器注册到ApplicationEventMulticaster中，下面将发布前期的事件给监听器。
	Set<ApplicationEvent> earlyEventsToProcess = this.earlyApplicationEvents;
	this.earlyApplicationEvents = null;
	if (earlyEventsToProcess != null) {
		for (ApplicationEvent earlyEvent : earlyEventsToProcess) {
			getApplicationEventMulticaster().multicastEvent(earlyEvent);
		}
	}
}
```

# 10. finishBeanFactoryInitialization

> 初始化剩下的单例Bean(非延迟加载的)

```
// AbstractApplicationContext.java

protected void finishBeanFactoryInitialization(ConfigurableListableBeanFactory beanFactory) {
	// 初始化转换器
	if (beanFactory.containsBean(CONVERSION_SERVICE_BEAN_NAME) &&
			beanFactory.isTypeMatch(CONVERSION_SERVICE_BEAN_NAME, ConversionService.class)) {
		beanFactory.setConversionService(
				beanFactory.getBean(CONVERSION_SERVICE_BEAN_NAME, ConversionService.class));
	}

	// 如果之前没有注册 bean 后置处理器（例如PropertyPlaceholderConfigurer），则注册默认的解析器
	if (!beanFactory.hasEmbeddedValueResolver()) {
		beanFactory.addEmbeddedValueResolver(strVal -> getEnvironment().resolvePlaceholders(strVal));
	}

	// 初始化 Initialize LoadTimeWeaverAware beans early to allow for registering their transformers early.
	String[] weaverAwareNames = beanFactory.getBeanNamesForType(LoadTimeWeaverAware.class, false, false);
	for (String weaverAwareName : weaverAwareNames) {
		getBean(weaverAwareName);
	}

	// 停止使用临时的 ClassLoader
	beanFactory.setTempClassLoader(null);

	//
	beanFactory.freezeConfiguration();

	// 初始化所有剩余的单例（非延迟初始化）
	beanFactory.preInstantiateSingletons();
}
```

# 11. finishRefresh

> 完成刷新过程,通知生命周期处理器 lifecycleProcessor 刷新过程,同时发出 ContextRefreshEvent 通知别人

主要是调用 `LifecycleProcessor#onRefresh()` ，并且发布事件（ContextRefreshedEvent）。

```
// AbstractApplicationContext.java
	
protected void finishRefresh() {
	// Clear context-level resource caches (such as ASM metadata from scanning).
	clearResourceCaches();

	// Initialize lifecycle processor for this context.
	initLifecycleProcessor();

	// Propagate refresh to lifecycle processor first.
	getLifecycleProcessor().onRefresh();

	// Publish the final event.
	publishEvent(new ContextRefreshedEvent(this));

	// Participate in LiveBeansView MBean, if active.
	LiveBeansView.registerApplicationContext(this);
}
```
