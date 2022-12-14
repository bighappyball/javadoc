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

### 统一资源 Resource

`org.springframework.core.io.Resource` 为 Spring 框架所有资源的抽象和访问接口，它继承 `org.springframework.core.io.InputStreamSource`接口。作为所有资源的统一抽象，Resource 定义了一些通用的方法，由子类 `AbstractResource` 提供统一的默认实现。

#### 子类结构

![image-20221214132812028](../../_media/analysis/spring/image-20221214132812028.png)

- FileSystemResource ：对 `java.io.File` 类型资源的封装，只要是跟 File 打交道的，基本上与 FileSystemResource 也可以打交道。支持文件和 URL 的形式，实现 WritableResource 接口，且从 Spring Framework 5.0 开始，FileSystemResource 使用 NIO2 API进行读/写交互。
- ByteArrayResource ：对字节数组提供的数据的封装。如果通过 InputStream 形式访问该类型的资源，该实现会根据字节数组的数据构造一个相应的 ByteArrayInputStream。
- UrlResource ：对 `java.net.URL`类型资源的封装。内部委派 URL 进行具体的资源操作。
- ClassPathResource ：class path 类型资源的实现。使用给定的 ClassLoader 或者给定的 Class 来加载资源。
- InputStreamResource ：将给定的 InputStream 作为一种资源的 Resource 的实现类。

#### AbstractResource

`org.springframework.core.io.AbstractResource` ，为 Resource 接口的默认**抽象**实现。它实现了 Resource 接口的**大部分的公共实现**，作为 Resource 接口中的重中之重

如果我们想要实现自定义的 Resource ，记住不要实现 Resource 接口，而应该继承 AbstractResource 抽象类，然后根据当前的具体资源特性覆盖相应的方法即可。

### 统一资源定位 ResourceLoader

`org.springframework.core.io.ResourceLoader` 为 Spring 资源加载的统一抽象，具体的资源加载则由相应的实现类来完成，所以我们可以将 ResourceLoader 称作为统一资源定位器。其定义如下：

> FROM 《Spring 源码深度解析》P16 页
>
> ResourceLoader，定义资源加载器，主要应用于根据给定的资源文件地址，返回对应的 Resource 。

```java
public interface ResourceLoader {
	String CLASSPATH_URL_PREFIX = ResourceUtils.CLASSPATH_URL_PREFIX; // CLASSPATH URL 前缀。默认为："classpath:"

	Resource getResource(String location);

	ClassLoader getClassLoader();

}
```

1.`getResource(String location)` 方法，根据所提供资源的路径 location 返回 Resource 实例，但是它不确保该 Resource 一定存在，需要调用 `Resource.exist()` 方法来判断。

> 该方法支持以下模式的资源加载：
>
> - URL位置资源，如 `"file:C:/test.dat"` 。
> - ClassPath位置资源，如 `"classpath:test.dat` 。
> - 相对路径资源，如 `"WEB-INF/test.dat"` ，此时返回的Resource 实例，根据实现不同而不同。

2.`getClassLoader()` 方法，返回 ClassLoader 实例，对于想要获取 ResourceLoader 使用的 ClassLoader 用户来说，可以直接调用该方法来获取。在分析 Resource 时，提到了一个类 ClassPathResource ，这个类是可以根据指定的 ClassLoader 来加载资源的。

#### 子类结构

![image-20221214133639178](../../_media/analysis/spring/image-20221214133639178.png)

#### DefaultResourceLoader

与 AbstractResource 相似，`org.springframework.core.io.DefaultResourceLoader` 是 ResourceLoader 的默认实现。

##### getResource 方法

ResourceLoader 中最核心的方法为 `#getResource(String location)` ，它根据提供的 location 返回相应的 Resource 。而 DefaultResourceLoader 对该方法提供了**核心实现**（因为，它的两个子类都没有提供覆盖该方法，所以可以断定 ResourceLoader 的资源加载策略就封装在 DefaultResourceLoader 中)，代码如下：

```java
// DefaultResourceLoader.java

@Override
public Resource getResource(String location) {
    Assert.notNull(location, "Location must not be null");

    // 首先，通过 ProtocolResolver 来加载资源
    for (ProtocolResolver protocolResolver : this.protocolResolvers) {
        Resource resource = protocolResolver.resolve(location, this);
        if (resource != null) {
            return resource;
        }
    }
    // 其次，以 / 开头，返回 ClassPathContextResource 类型的资源
    if (location.startsWith("/")) {
        return getResourceByPath(location);
    // 再次，以 classpath: 开头，返回 ClassPathResource 类型的资源
    } else if (location.startsWith(CLASSPATH_URL_PREFIX)) {
        return new ClassPathResource(location.substring(CLASSPATH_URL_PREFIX.length()), getClassLoader());
    // 然后，根据是否为文件 URL ，是则返回 FileUrlResource 类型的资源，否则返回 UrlResource 类型的资源
    } else {
        try {
            // Try to parse the location as a URL...
            URL url = new URL(location);
            return (ResourceUtils.isFileURL(url) ? new FileUrlResource(url) : new UrlResource(url));
        } catch (MalformedURLException ex) {
            // 最后，返回 ClassPathContextResource 类型的资源
            // No URL -> resolve as resource path.
            return getResourceByPath(location);
        }
    }
}
```

- 首先，通过 ProtocolResolver 来加载资源，成功返回 Resource 。
- 其次，若 `location` 以 `"/"` 开头，则调用 `getResourceByPath()` 方法，构造 ClassPathContextResource 类型资源并返回。
- 再次，若 `location` 以 `"classpath:"` 开头，则构造 ClassPathResource 类型资源并返回。在构造该资源时，通过 `getClassLoader()` 获取当前的 ClassLoader。
- 然后，构造 URL ，尝试通过它进行资源定位，若没有抛出 MalformedURLException 异常，则判断是否为 FileURL , 如果是则构造 FileUrlResource 类型的资源，否则构造 UrlResource 类型的资源。
- 最后，若在加载过程中抛出 MalformedURLException 异常，则委派 `getResourceByPath()` 方法，实现资源定位加载。😈 实际上，和【其次】相同落。

##### ProtocolResolver

`org.springframework.core.io.ProtocolResolver` ，用户自定义协议资源解决策略，作为 DefaultResourceLoader 的 **SPI**：它允许用户自定义资源加载协议，而不需要继承 ResourceLoader 的子类。

**在介绍 Resource 时，提到如果要实现自定义 Resource，我们只需要继承 AbstractResource 即可，但是有了 ProtocolResolver 后，我们不需要直接继承 DefaultResourceLoader，改为实现 ProtocolResolver 接口也可以实现自定义的 ResourceLoader。**

ProtocolResolver 接口，仅有一个方法 `Resource resolve(String location, ResourceLoader resourceLoader)`

在 Spring 中你会发现该接口并没有实现类，它需要用户自定义，自定义的 Resolver 如何加入 Spring 体系呢？调用 `DefaultResourceLoader.addProtocolResolver(ProtocolResolver)` 方法即可。

下面示例是演示 DefaultResourceLoader 加载资源的具体策略，代码如下:

```java
ResourceLoader resourceLoader = new DefaultResourceLoader();

Resource fileResource1 = resourceLoader.getResource("D:/Users/chenming673/Documents/spark.txt");
System.out.println("fileResource1 is FileSystemResource:" + (fileResource1 instanceof FileSystemResource));

Resource fileResource2 = resourceLoader.getResource("/Users/chenming673/Documents/spark.txt");
System.out.println("fileResource2 is ClassPathResource:" + (fileResource2 instanceof ClassPathResource));

Resource urlResource1 = resourceLoader.getResource("file:/Users/chenming673/Documents/spark.txt");
System.out.println("urlResource1 is UrlResource:" + (urlResource1 instanceof UrlResource));

Resource urlResource2 = resourceLoader.getResource("http://www.baidu.com");
System.out.println("urlResource1 is urlResource:" + (urlResource2 instanceof  UrlResource));
```

运行结果：

```
fileResource1 is FileSystemResource:false
fileResource2 is ClassPathResource:true
urlResource1 is UrlResource:true
urlResource1 is urlResource:true
```

- 其实对于 `fileResource1` ，我们更加希望是 FileSystemResource 资源类型。但是，事与愿违，它是 ClassPathResource 类型。为什么呢？在 `DefaultResourceLoader.getResource()` 方法的资源加载策略中，我们知道 `"D:/Users/chenming673/Documents/spark.txt"` 地址，其实在该方法中没有相应的资源类型，那么它就会在抛出 MalformedURLException 异常时，通过 `DefaultResourceLoader.getResourceByPath(...)` 方法，构造一个 ClassPathResource 类型的资源。
- 而 `urlResource1` 和 `urlResource2` ，指定有协议前缀的资源路径，则通过 URL 就可以定义，所以返回的都是 UrlResource 类型。

##### FileSystemResourceLoader

从上面的示例，我们看到，其实 DefaultResourceLoader 对`getResourceByPath(String)` 方法处理其实不是很恰当，这个时候我们可以使用 `org.springframework.core.io.FileSystemResourceLoader` 。它继承 DefaultResourceLoader ，且覆写了 `getResourceByPath(String)` 方法，使之从文件系统加载资源并以 FileSystemResource 类型返回，这样我们就可以得到想要的资源类型。

- 在构造器中，也是调用 FileSystemResource 的构造函数来构造 FileSystemResource 的。
- 为什么要有 FileSystemContextResource 类的原因是，实现 ContextResource 接口，并实现对应的 `getPathWithinContext()` 接口方法。

> ContextResource   从外围加载资源的扩展接口 'context'，例如来自一个{@link javax.servlet. context。ServletContext} 从普通类路径路径或相对文件系统路径(指定没有显式前缀，因此相对于本地应用 {@link ResourceLoader}的上下文)。

#### ClassRelativeResourceLoader

`org.springframework.core.io.ClassRelativeResourceLoader` ，是 DefaultResourceLoader 的另一个子类的实现。和 FileSystemResourceLoader 类似，在实现代码的结构上类似，也是覆写 `getResourceByPath(String path)` 方法，并返回其对应的 ClassRelativeContextResource 的资源类型。

> [《Spring5：就这一次，搞定资源加载器之ClassRelativeResourceLoader》](https://blog.csdn.net/seasonsbin/article/details/80914911) 
>
> ClassRelativeResourceLoader 扩展的功能是，可以根据给定的`class` 所在包或者所在包的子包下加载资源。

#### ResourcePatternResolver

ResourceLoader 的 `Resource getResource(String location)` 方法，每次只能根据 location 返回**一个** Resource 。当需要加载多个资源时，我们除了多次调用 `#getResource(String location)` 方法外，别无他法。`org.springframework.core.io.support.ResourcePatternResolver` 是 ResourceLoader 的扩展，它支持根据指定的资源路径匹配模式每次返回**多个** Resource 实例

- ResourcePatternResolver 在 ResourceLoader 的基础上增加了 `getResources(String locationPattern)` 方法，以支持根据路径匹配模式返回**多个** Resource 实例。

- 同时，也新增了一种**新的协议**前缀 `"classpath*:"`，该协议前缀由其子类负责实现。

  

#### PathMatchingResourcePatternResolver

`org.springframework.core.io.support.PathMatchingResourcePatternResolver` ，为 ResourcePatternResolver 最常用的子类，它除了支持 ResourceLoader 和 ResourcePatternResolver 新增的 `"classpath*:"` 前缀外，**还支持 Ant 风格的路径匹配模式**（类似于 `"**/*.xml"`）。

- athMatchingResourcePatternResolver 在实例化的时候，可以指定一个 ResourceLoader，如果不指定的话，它会在内部构造一个 DefaultResourceLoader 。
- `pathMatcher` 属性，默认为 AntPathMatcher 对象，用于支持 Ant 类型的路径匹配。

##### getResources

```java
@Override
public Resource[] getResources(String locationPattern) throws IOException {
    Assert.notNull(locationPattern, "Location pattern must not be null");
    // 以 "classpath*:" 开头
    if (locationPattern.startsWith(CLASSPATH_ALL_URL_PREFIX)) {
        // 路径包含通配符
        // a class path resource (multiple resources for same name possible)
        if (getPathMatcher().isPattern(locationPattern.substring(CLASSPATH_ALL_URL_PREFIX.length()))) {
            // a class path resource pattern
            return findPathMatchingResources(locationPattern);
        // 路径不包含通配符
        } else {
            // all class path resources with the given name
            return findAllClassPathResources(locationPattern.substring(CLASSPATH_ALL_URL_PREFIX.length()));
        }
    // 不以 "classpath*:" 开头
    } else {
        // Generally only look for a pattern after a prefix here, // 通常只在这里的前缀后面查找模式
        // and on Tomcat only after the "*/" separator for its "war:" protocol. 而在 Tomcat 上只有在 “*/ ”分隔符之后才为其 “war:” 协议
        int prefixEnd = (locationPattern.startsWith("war:") ? locationPattern.indexOf("*/") + 1 :
                locationPattern.indexOf(':') + 1);
        // 路径包含通配符
        if (getPathMatcher().isPattern(locationPattern.substring(prefixEnd))) {
            // a file pattern
            return findPathMatchingResources(locationPattern);
        // 路径不包含通配符
        } else {
            // a single resource with the given name
            return new Resource[] {getResourceLoader().getResource(locationPattern)};
        }
    }
}
```

- **非** `"classpath*:"` 开头，且路径**不包含**通配符，直接委托给相应的 ResourceLoader 来实现。
- 其他情况，调用 `#findAllClassPathResources(...)`、或 `#findPathMatchingResources(...)` 方法，返回多个 Resource 。下面，我们来详细分析。

##### findAllClassPathResources

当 `locationPattern` 以 `"classpath*:"` 开头但是不包含通配符，则调用 `#findAllClassPathResources(...)` 方法加载资源。该方法返回 classes 路径下和所有 jar 包中的所有相匹配的资源。

```java
protected Resource[] findAllClassPathResources(String location) throws IOException {
	String path = location;
	// 去除首个 /
	if (path.startsWith("/")) {
		path = path.substring(1);
	}
	// 真正执行加载所有 classpath 资源
	Set<Resource> result = doFindAllClassPathResources(path);
	if (logger.isTraceEnabled()) {
		logger.trace("Resolved classpath location [" + location + "] to resources " + result);
	}
	// 转换成 Resource 数组返回
	return result.toArray(new Resource[0]);
}
```

真正执行加载的是在 `#doFindAllClassPathResources(...)` 方法，代码如下：

```java
protected Set<Resource> doFindAllClassPathResources(String path) throws IOException {
	Set<Resource> result = new LinkedHashSet<>(16);
	ClassLoader cl = getClassLoader();
	// <1> 根据 ClassLoader 加载路径下的所有资源
	Enumeration<URL> resourceUrls = (cl != null ? cl.getResources(path) : ClassLoader.getSystemResources(path));
	// <2>
	while (resourceUrls.hasMoreElements()) {
		URL url = resourceUrls.nextElement();
		// 将 URL 转换成 UrlResource
		result.add(convertClassLoaderURL(url));
	}
	// <3> 加载路径下得所有 jar 包
	if ("".equals(path)) {
		// The above result is likely to be incomplete, i.e. only containing file system references.
		// We need to have pointers to each of the jar files on the classpath as well...
		addAllClassLoaderJarRoots(cl, result);
	}
	return result;
}
```

`<1>` 处，根据 ClassLoader 加载路径下的所有资源。在加载资源过程时，如果在构造 PathMatchingResourcePatternResolver 实例的时候如果传入了 ClassLoader，则调用该 ClassLoader 的 `#getResources()` 方法，否则调用 `ClassLoader#getSystemResources(path)` 方法。另外，`ClassLoader#getResources()` 方法，代码如下:

```java
// java.lang.ClassLoader.java
public Enumeration<URL> getResources(String name) throws IOException {
    @SuppressWarnings("unchecked")
    Enumeration<URL>[] tmp = (Enumeration<URL>[]) new Enumeration<?>[2];
    if (parent != null) {
        tmp[0] = parent.getResources(name);
    } else {
        tmp[0] = getBootstrapResources(name);
    }
    tmp[1] = findResources(name);

    return new CompoundEnumeration<>(tmp);
}
```

- 看到这里是不是就已经一目了然了？如果当前父类加载器不为 `null` ，则通过父类向上迭代获取资源，否则调用 `#getBootstrapResources()` 。这里是不是特别熟悉，(*^▽^*)。

`<2>` 处，遍历 URL 集合，调用 `#convertClassLoaderURL(URL url)` 方法，将 URL 转换成 UrlResource 对象。代码如下：

```java
protected Resource convertClassLoaderURL(URL url) {
	return new UrlResource(url);
}
```

`<3>` 处，若 `path` 为空（`“”`）时，则调用 `#addAllClassLoaderJarRoots(...)`方法。该方法主要是加载路径下得所有 jar 包

通过上面的分析，我们知道 `#findAllClassPathResources(...)` 方法，其实就是利用 ClassLoader 来加载指定路径下的资源，不论它是在 class 路径下还是在 jar 包中。如果我们传入的路径为空或者 `/`，则会调用 `#addAllClassLoaderJarRoots(...)` 方法，加载所有的 jar 包。

##### findPathMatchingResources

当 `locationPattern` 中包含了**通配符**，则调用该方法进行资源加载。代码如下：

1. 确定目录，获取该目录下得所有资源。
2. 在所获得的所有资源后，进行迭代匹配获取我们想要的资源。

```java
protected Resource[] findPathMatchingResources(String locationPattern) throws IOException {
    // 确定根路径、子路径
    String rootDirPath = determineRootDir(locationPattern);
    String subPattern = locationPattern.substring(rootDirPath.length());
    // 获取根据路径下的资源
    Resource[] rootDirResources = getResources(rootDirPath);
    // 遍历，迭代
    Set<Resource> result = new LinkedHashSet<>(16);
    for (Resource rootDirResource : rootDirResources) {
        rootDirResource = resolveRootDirResource(rootDirResource);
        URL rootDirUrl = rootDirResource.getURL();
        // bundle 资源类型
        if (equinoxResolveMethod != null && rootDirUrl.getProtocol().startsWith("bundle")) {
            URL resolvedUrl = (URL) ReflectionUtils.invokeMethod(equinoxResolveMethod, null, rootDirUrl);
            if (resolvedUrl != null) {
                rootDirUrl = resolvedUrl;
            }
            rootDirResource = new UrlResource(rootDirUrl);
        }
        // vfs 资源类型
        if (rootDirUrl.getProtocol().startsWith(ResourceUtils.URL_PROTOCOL_VFS)) {
            result.addAll(VfsResourceMatchingDelegate.findMatchingResources(rootDirUrl, subPattern, getPathMatcher()));
        // jar 资源类型
        } else if (ResourceUtils.isJarURL(rootDirUrl) || isJarResource(rootDirResource)) {
            result.addAll(doFindPathMatchingJarResources(rootDirResource, rootDirUrl, subPattern));
        // 其它资源类型
        } else {
            result.addAll(doFindPathMatchingFileResources(rootDirResource, subPattern));
        }
    }
    if (logger.isTraceEnabled()) {
        logger.trace("Resolved location pattern [" + locationPattern + "] to resources " + result);
    }
    // 转换成 Resource 数组返回
    return result.toArray(new Resource[0]);
}

```

在这个方法里面，我们要关注两个方法，一个是 `#determineRootDir(String location)` 方法，一个是 `#doFindPathMatchingXXXResources(...)` 等方法。

###### determineRootDir

`determineRootDir(String location)` 方法，主要是用于确定根路径。代码如下：

```Java

protected String determineRootDir(String location) {
	// 找到冒号的后一位
	int prefixEnd = location.indexOf(':') + 1;
	// 根目录结束位置
	int rootDirEnd = location.length();
	// 在从冒号开始到最后的字符串中，循环判断是否包含通配符，如果包含，则截断最后一个由”/”分割的部分。
	// 例如：在我们路径中，就是最后的ap?-context.xml这一段。再循环判断剩下的部分，直到剩下的路径中都不包含通配符。
	while (rootDirEnd > prefixEnd && getPathMatcher().isPattern(location.substring(prefixEnd, rootDirEnd))) {
		rootDirEnd = location.lastIndexOf('/', rootDirEnd - 2) + 1;
	}
	// 如果查找完成后，rootDirEnd = 0 了，则将之前赋值的 prefixEnd 的值赋给 rootDirEnd ，也就是冒号的后一位
	if (rootDirEnd == 0) {
		rootDirEnd = prefixEnd;
	}
	// 截取根目录
	return location.substring(0, rootDirEnd);
}
```

示例：

|               原路径               |      确定根路径       |
| :--------------------------------: | :-------------------: |
| `classpath*:test/cc*/spring-*.xml` |  `classpath*:test/`   |
| `classpath*:test/aa/spring-*.xml`  | `classpath*:test/aa/` |

###### doFindPathMatchingXXXResources

`#doFindPathMatchingXXXResources(...)` 方法，是个泛指，一共对应三个方法：

- `#doFindPathMatchingJarResources(rootDirResource, rootDirUrl, subPatter)` 方法
- `#doFindPathMatchingFileResources(rootDirResource, subPattern)` 方法
- `VfsResourceMatchingDelegate#findMatchingResources(rootDirUrl, subPattern, pathMatcher)` 方法

- [Spring源码情操陶冶-PathMatchingResourcePatternResolver路径资源匹配溶解器](https://www.cnblogs.com/question-sky/p/6959493.html) ，主要针对 `#doFindPathMatchingJarResources(rootDirResource, rootDirUrl, subPatter)` 方法。
- [深入 Spring IoC 源码之 ResourceLoader](http://www.blogjava.net/DLevin/archive/2012/12/01/392337.html) ，主要针对 `#doFindPathMatchingFileResources(rootDirResource, subPattern)` 方法。
- [Spring 源码学习 —— 含有通配符路径解析（上）](http://www.coderli.com/spring-wildpath-parse/) 

### 小结

至此 Spring 整个资源记载过程已经分析完毕。下面简要总结下：

- Spring 提供了 Resource 和 ResourceLoader 来统一抽象整个资源及其定位。使得资源与资源的定位有了一个更加清晰的界限，并且提供了合适的 Default 类，使得自定义实现更加方便和清晰。
- AbstractResource 为 Resource 的默认抽象实现，它对 Resource 接口做了一个统一的实现，子类继承该类后只需要覆盖相应的方法即可，同时对于自定义的 Resource 我们也是继承该类。
- DefaultResourceLoader 同样也是 ResourceLoader 的默认实现，在自定 ResourceLoader 的时候我们除了可以继承该类外还可以实现 ProtocolResolver 接口来实现自定资源加载协议。
- DefaultResourceLoader 每次只能返回单一的资源，所以 Spring 针对这个提供了另外一个接口 ResourcePatternResolver ，该接口提供了根据指定的 locationPattern 返回多个资源的策略。其子类 PathMatchingResourcePatternResolver 是一个集大成者的 ResourceLoader ，因为它即实现了 `Resource getResource(String location)` 方法，也实现了 `Resource[] getResources(String locationPattern)` 方法。

Resource 和 ResourceLoader 核心是在，`spring-core` 项目中。

##  加载 BeanDefinition

```java
ClassPathResource resource = new ClassPathResource("bean.xml"); // <1>
DefaultListableBeanFactory factory = new DefaultListableBeanFactory(); // <2>
XmlBeanDefinitionReader reader = new XmlBeanDefinitionReader(factory); // <3>
reader.loadBeanDefinitions(resource); // <4>
```

这段代码是 Spring 中编程式使用 IoC 容器，通过这四段简单的代码，我们可以初步判断 IoC 容器的使用过程。

1. 获取资源
2. 获取 BeanFactory
3. 根据新建的 BeanFactory 创建一个 BeanDefinitionReader 对象，该 Reader 对象为资源的**解析器**
4. 装载资源

整个过程就分为三个步骤：资源定位、装载、注册，如下：

![image-20221214143206474](../../_media/analysis/spring/image-20221214143206474.png)

- **资源定位**。我们一般用外部资源来描述 Bean 对象，所以在初始化 IoC 容器的第一步就是需要定位这个外部资源。即统一资源加载,见[统一资源加载策略](#统一资源加载策略)
- **装载/加载**。装载就是 BeanDefinition 的载入。BeanDefinitionReader 读取、解析 Resource 资源，也就是将用户定义的 Bean 表示成 IoC 容器的内部数据结构：BeanDefinition 。
  - 在 IoC 容器内部维护着一个 BeanDefinition Map 的数据结构
  - 在配置文件中每一个 `<bean>` 都对应着一个 BeanDefinition 对象。
- **注册**。向 IoC 容器注册在第二步解析好的 BeanDefinition，这个过程是通过 BeanDefinitionRegistry 接口来实现的。在 IoC 容器内部其实是将第二个过程解析得到的 BeanDefinition 注入到一个 HashMap 容器中，IoC 容器就是通过这个 HashMap 来维护这些 BeanDefinition 的。
  - 在这里需要注意的一点是这个过程并没有完成依赖注入（Bean 创建），Bean 创建是发生在应用第一次调用 `#getBean(...)` 方法，向容器索要 Bean 时。
  - 当然我们可以通过设置预处理，即对某个 Bean 设置 `lazyinit = false` 属性，那么这个 Bean 的依赖注入就会在容器初始化的时候完成。

简单的说，上面步骤的结果是，XML Resource => XML Document => Bean Definition 。

### loadBeanDefinitions

资源定位在前面已经分析了，下面我们直接分析**加载**，上面看到的 `reader.loadBeanDefinitions(resource)` 代码，才是加载资源的真正实现，所以我们直接从该方法入手。代码如下：

```Java
// XmlBeanDefinitionReader.java
@Override
public int loadBeanDefinitions(Resource resource) throws BeanDefinitionStoreException {
	return loadBeanDefinitions(new EncodedResource(resource));
}
```

从指定的 xml 文件加载 Bean Definition ，这里会先对 Resource 资源封装成 `org.springframework.core.io.support.EncodedResource` 对象。这里为什么需要将 Resource 封装成 EncodedResource 呢？主要是为了对 Resource 进行编码，保证内容读取的正确性。

然后，再调用 `#loadBeanDefinitions(EncodedResource encodedResource)` 方法，执行真正的逻辑实现。

```java
/**
 * 当前线程，正在加载的 EncodedResource 集合。
 */
private final ThreadLocal<Set<EncodedResource>> resourcesCurrentlyBeingLoaded = new NamedThreadLocal<>("XML bean definition resources currently being loaded");

public int loadBeanDefinitions(EncodedResource encodedResource) throws BeanDefinitionStoreException {
	Assert.notNull(encodedResource, "EncodedResource must not be null");
	if (logger.isTraceEnabled()) {
		logger.trace("Loading XML bean definitions from " + encodedResource);
	}

	// <1> 获取已经加载过的资源
	Set<EncodedResource> currentResources = this.resourcesCurrentlyBeingLoaded.get();
	if (currentResources == null) {
		currentResources = new HashSet<>(4);
		this.resourcesCurrentlyBeingLoaded.set(currentResources);
	}
	if (!currentResources.add(encodedResource)) { // 将当前资源加入记录中。如果已存在，抛出异常
		throw new BeanDefinitionStoreException("Detected cyclic loading of " + encodedResource + " - check your import definitions!");
	}
	try {
		// <2> 从 EncodedResource 获取封装的 Resource ，并从 Resource 中获取其中的 InputStream
		InputStream inputStream = encodedResource.getResource().getInputStream();
		try {
			InputSource inputSource = new InputSource(inputStream);
			if (encodedResource.getEncoding() != null) { // 设置编码
				inputSource.setEncoding(encodedResource.getEncoding());
			}
			// 核心逻辑部分，执行加载 BeanDefinition
			return doLoadBeanDefinitions(inputSource, encodedResource.getResource());
		} finally {
			inputStream.close();
		}
	} catch (IOException ex) {
		throw new BeanDefinitionStoreException("IOException parsing XML document from " + encodedResource.getResource(), ex);
	} finally {
		// 从缓存中剔除该资源 <3>
		currentResources.remove(encodedResource);
		if (currentResources.isEmpty()) {
			this.resourcesCurrentlyBeingLoaded.remove();
		}
	}
}
```

- <1>处，通过 `resourcesCurrentlyBeingLoaded.get()`代码，来获取已经加载过的资源，然后将encodedResource加入其中，如果resourcesCurrentlyBeingLoaded中已经存在该资源，则抛出 BeanDefinitionStoreException 异常。
  - 为什么需要这么做呢？答案在 `"Detected cyclic loading"` ，避免一个 EncodedResource 在加载时，还没加载完成，又加载自身，从而导致**死循环**。
  - 也因此，在 `<3>` 处，当一个 EncodedResource 加载完成后，需要从缓存中剔除。
- `<2>` 处理，从 `encodedResource` 获取封装的 Resource 资源，并从 Resource 中获取相应的 InputStream ，然后将 InputStream 封装为 InputSource ，最后调用 `#doLoadBeanDefinitions(InputSource inputSource, Resource resource)` 方法，执行加载 Bean Definition 的真正逻辑。

### doLoadBeanDefinitions

```java
/**
 * Actually load bean definitions from the specified XML file.
 * @param inputSource the SAX InputSource to read from
 * @param resource the resource descriptor for the XML file
 * @return the number of bean definitions found
 * @throws BeanDefinitionStoreException in case of loading or parsing errors
 * @see #doLoadDocument
 * @see #registerBeanDefinitions
 */
protected int doLoadBeanDefinitions(InputSource inputSource, Resource resource)
		throws BeanDefinitionStoreException {
	try {
		// <1> 获取 XML Document 实例
		Document doc = doLoadDocument(inputSource, resource);
		// <2> 根据 Document 实例，注册 Bean 信息
		int count = registerBeanDefinitions(doc, resource);
		if (logger.isDebugEnabled()) {
			logger.debug("Loaded " + count + " bean definitions from " + resource);
		}
		return count;
	} catch (BeanDefinitionStoreException ex) {
		throw ex;
	} catch (SAXParseException ex) {
		throw new XmlBeanDefinitionStoreException(resource.getDescription(),
                "Line " + ex.getLineNumber() + " in XML document from " + resource + " is invalid", ex);
	} catch (SAXException ex) {
		throw new XmlBeanDefinitionStoreException(resource.getDescription(),
				"XML document from " + resource + " is invalid", ex);
	} catch (ParserConfigurationException ex) {
		throw new BeanDefinitionStoreException(resource.getDescription(),
				"Parser configuration exception parsing XML from " + resource, ex);
	} catch (IOException ex) {
		throw new BeanDefinitionStoreException(resource.getDescription(),
				"IOException parsing XML document from " + resource, ex);
	} catch (Throwable ex) {
		throw new BeanDefinitionStoreException(resource.getDescription(),
				"Unexpected exception parsing XML document from " + resource, ex);
	}
}
```

- 在 `<1>` 处，调用 `#doLoadDocument(InputSource inputSource, Resource resource)` 方法，根据 xml 文件，获取 Document 实例。
- 在 `<2>` 处，调用 `#registerBeanDefinitions(Document doc, Resource resource)` 方法，根据获取的 Document 实例，注册 Bean 信息。

#### doLoadDocument

```java
/**
 * 获取 XML Document 实例
 *
 * Actually load the specified document using the configured DocumentLoader.
 * @param inputSource the SAX InputSource to read from
 * @param resource the resource descriptor for the XML file
 * @return the DOM Document
 * @throws Exception when thrown from the DocumentLoader
 * @see #setDocumentLoader
 * @see DocumentLoader#loadDocument
 */
protected Document doLoadDocument(InputSource inputSource, Resource resource) throws Exception {
	return this.documentLoader.loadDocument(inputSource, getEntityResolver(), this.errorHandler,
			getValidationModeForResource(resource), isNamespaceAware());
}
```

1. 调用 `#getValidationModeForResource(Resource resource)` 方法，获取指定资源（xml）的**验证模式**。详细解析，见 [获取验证模型](#获取验证模型)。
2. 调用 `DocumentLoader#loadDocument(InputSource inputSource, EntityResolver entityResolver, ErrorHandler errorHandler, int validationMode, boolean namespaceAware)` 方法，获取 XML Document 实例。详细解析，见 [获取 Document 对象](#获取 Document 对象)

#### registerBeanDefinitions

[注册 BeanDefinition](#注册 BeanDefinition)

## 获取验证模型

为什么需要获取验证模式呢？原因如下：

> XML 文件的验证模式保证了 XML 文件的正确性。

### DTD 与 XSD 的区别

#### DTD

DTD(Document Type Definition)，即文档类型定义，为 XML 文件的验证机制，属于 XML 文件中组成的一部分。DTD 是一种保证 XML 文档格式正确的有效验证方式，它定义了相关 XML 文档的元素、属性、排列方式、元素的内容类型以及元素的层次结构。其实 DTD 就相当于 XML 中的 “词汇”和“语法”，我们可以通过比较 XML 文件和 DTD 文件 来看文档是否符合规范，元素和标签使用是否正确。

要在 Spring 中使用 DTD，需要在 Spring XML 文件头部声明：

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE beans PUBLIC  "-//SPRING//DTD BEAN//EN"  "http://www.springframework.org/dtd/spring-beans.dtd">
```

DTD 在一定的阶段推动了 XML 的发展，但是它本身存在着一些**缺陷**：

1. 它没有使用 XML 格式，而是自己定义了一套格式，相对解析器的重用性较差；而且 DTD 的构建和访问没有标准的编程接口，因而解析器很难简单的解析 DTD 文档。
2. DTD 对元素的类型限制较少；同时其他的约束力也叫弱。
3. DTD 扩展能力较差。
4. 基于正则表达式的 DTD 文档的描述能力有限。

#### XSD

针对 DTD 的缺陷，W3C 在 2001 年推出 XSD。XSD（XML Schemas Definition）即 XML Schema 语言。XML Schema 本身就是一个 XML文档，使用的是 XML 语法，因此可以很方便的解析 XSD 文档。相对于 DTD，XSD 具有如下**优势**：

1. XML Schema 基于 XML ，没有专门的语法。
2. XML Schema 可以象其他 XML 文件一样解析和处理。
3. XML Schema 比 DTD 提供了更丰富的数据类型。
4. XML Schema 提供可扩充的数据模型。
5. XML Schema 支持综合命名空间。
6. XML Schema 支持属性组。

### getValidationModeForResource

```Java
// XmlBeanDefinitionReader.java

// 禁用验证模式
public static final int VALIDATION_NONE = XmlValidationModeDetector.VALIDATION_NONE;
// 自动获取验证模式
public static final int VALIDATION_AUTO = XmlValidationModeDetector.VALIDATION_AUTO;
// DTD 验证模式
public static final int VALIDATION_DTD = XmlValidationModeDetector.VALIDATION_DTD;
// XSD 验证模式
public static final int VALIDATION_XSD = XmlValidationModeDetector.VALIDATION_XSD;
	
/**
 * 验证模式。默认为自动模式。
 */
private int validationMode = VALIDATION_AUTO;
	
protected int getValidationModeForResource(Resource resource) {
	// <1> 获取指定的验证模式
	int validationModeToUse = getValidationMode();
	// 首先，如果手动指定，则直接返回
	if (validationModeToUse != VALIDATION_AUTO) {
		return validationModeToUse;
	}
	// 其次，自动获取验证模式
	int detectedMode = detectValidationMode(resource);
	if (detectedMode != VALIDATION_AUTO) {
		return detectedMode;
	}
	// 最后，使用 VALIDATION_XSD 做为默认
	// Hmm, we didn't get a clear indication... Let's assume XSD,
	// since apparently no DTD declaration has been found up until
	// detection stopped (before finding the document's root tag).
	return VALIDATION_XSD;
}
```

- `<1>` 处，调用 `#getValidationMode()` 方法，获取指定的验证模式( `validationMode` )。如果有手动指定，则直接返回。另外，对对于 `validationMode` 属性的设置和获得的代码，代码如下：

  ```java
  public void setValidationMode(int validationMode) {
  	this.validationMode = validationMode;
  }
  
  public int getValidationMode() {
  	return this.validationMode;
  }
  ```

- `<2>` 处，调用 `#detectValidationMode(Resource resource)` 方法，自动获取验证模式。代码如下：

  ```JAVA
    /**
     * XML 验证模式探测器
     */
    private final XmlValidationModeDetector validationModeDetector = new XmlValidationModeDetector();
  	
    protected int detectValidationMode(Resource resource) {
  // 不可读，抛出 BeanDefinitionStoreException 异常
    	if (resource.isOpen()) {
    		throw new BeanDefinitionStoreException(
    				"Passed-in Resource [" + resource + "] contains an open stream: " +
    				"cannot determine validation mode automatically. Either pass in a Resource " +
    				"that is able to create fresh streams, or explicitly specify the validationMode " +
    				"on your XmlBeanDefinitionReader instance.");
    	}
    
    	// 打开 InputStream 流
    	InputStream inputStream;
    	try {
    		inputStream = resource.getInputStream();
    	} catch (IOException ex) {
    		throw new BeanDefinitionStoreException(
    				"Unable to determine validation mode for [" + resource + "]: cannot open InputStream. " +
    				"Did you attempt to load directly from a SAX InputSource without specifying the " +
    				"validationMode on your XmlBeanDefinitionReader instance?", ex);
    	}
    
    	// <x> 获取相应的验证模式
    	try {
    		return this.validationModeDetector.detectValidationMode(inputStream);
    	} catch (IOException ex) {
    		throw new BeanDefinitionStoreException("Unable to determine validation mode for [" +
    				resource + "]: an error occurred whilst reading from the InputStream.", ex);
    	}
    }
  ```

  - 核心在于 `<x>` 处，调用 `XmlValidationModeDetector#detectValidationMode(InputStream inputStream)` 方法，获取相应的验证模式。

- `<3>` 处，使用 `VALIDATION_XSD` 做为默认。

### XmlValidationModeDetector

`org.springframework.util.xml.XmlValidationModeDetector` ，XML 验证模式探测器。

```JAVA
public int detectValidationMode(InputStream inputStream) throws IOException {
    // Peek into the file to look for DOCTYPE.
    BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
    try {
        // 是否为 DTD 校验模式。默认为，非 DTD 模式，即 XSD 模式
        boolean isDtdValidated = false;
        String content;
        // <0> 循环，逐行读取 XML 文件的内容
        while ((content = reader.readLine()) != null) {
            content = consumeCommentTokens(content);
            // 跳过，如果是注释，或者
            if (this.inComment || !StringUtils.hasText(content)) {
                continue;
            }
            // <1> 包含 DOCTYPE 为 DTD 模式
            if (hasDoctype(content)) {
                isDtdValidated = true;
                break;
            }
            // <2>  hasOpeningTag 方法会校验，如果这一行有 < ，并且 < 后面跟着的是字母，则返回 true 。
            if (hasOpeningTag(content)) {
                // End of meaningful data...
                break;
            }
        }
        // 返回 VALIDATION_DTD or VALIDATION_XSD 模式
        return (isDtdValidated ? VALIDATION_DTD : VALIDATION_XSD);
    } catch (CharConversionException ex) {
           
        // <3> 返回 VALIDATION_AUTO 模式
        // Choked on some character encoding...
        // Leave the decision up to the caller.
        return VALIDATION_AUTO;
    } finally {
        reader.close();
    }
}
```

- `<0`> 处，从代码中看，主要是通过读取 XML 文件的内容，来进行自动判断。

- `<1>` 处，调用 `#hasDoctype(String content)` 方法，判断内容中如果包含有 `"DOCTYPE`“ ，则为 DTD 验证模式。代码如下：

  ```JAVA
  /**
   * The token in a XML document that declares the DTD to use for validation
   * and thus that DTD validation is being used.
   */
  private static final String DOCTYPE = "DOCTYPE";
  
  private boolean hasDoctype(String content) {
  	return content.contains(DOCTYPE);
  }
  ```

- `<2>` 处，调用 `#hasOpeningTag(String content)` 方法，判断如果这一行包含 `<` ，并且 `<` 紧跟着的是字幕，则为 XSD 验证模式。代码如下：

  ```JAVA
  /**
   * Does the supplied content contain an XML opening tag. If the parse state is currently
   * in an XML comment then this method always returns false. It is expected that all comment
   * tokens will have consumed for the supplied content before passing the remainder to this method.
   */
  private boolean hasOpeningTag(String content) {
  	if (this.inComment) {
  		return false;
  	}
  	int openTagIndex = content.indexOf('<');
  	return (openTagIndex > -1 // < 存在
              && (content.length() > openTagIndex + 1) // < 后面还有内容
              && Character.isLetter(content.charAt(openTagIndex + 1))); // < 后面的内容是字幕
  }
  ```

- `<3>` 处，如果发生 CharConversionException 异常，则为 `VALIDATION_AUTO` 模式。

- 关于 `#consumeCommentTokens(String content)` 方法，代码如下：

  ```JAVA
  /**
   * The token that indicates the start of an XML comment.
   */
  private static final String START_COMMENT = "<!--";
  
  /**
   * The token that indicates the end of an XML comment.
   */
  private static final String END_COMMENT = "-->";
  
  /**
   * Consumes all the leading comment data in the given String and returns the remaining content, which
   * may be empty since the supplied content might be all comment data. For our purposes it is only important
   * to strip leading comment content on a line since the first piece of non comment content will be either
   * the DOCTYPE declaration or the root element of the document.
   */
  @Nullable
  private String consumeCommentTokens(String line) {
  	// 非注释
  	if (!line.contains(START_COMMENT) && !line.contains(END_COMMENT)) {
  		return line;
  	}
  	String currLine = line;
  	while ((currLine = consume(currLine)) != null) {
  		if (!this.inComment && !currLine.trim().startsWith(START_COMMENT)) {
  			return currLine;
  		}
  	}
  	return null;
  }
  
  /**
   * Consume the next comment token, update the "inComment" flag
   * and return the remaining content.
   */
  @Nullable
  private String consume(String line) {
  	int index = (this.inComment ? endComment(line) : startComment(line));
  	return (index == -1 ? null : line.substring(index));
  }
  
  /**
   * Try to consume the {@link #START_COMMENT} token.
   * @see #commentToken(String, String, boolean)
   */
  private int startComment(String line) {
  	return commentToken(line, START_COMMENT, true);
  }
  
  private int endComment(String line) {
  	return commentToken(line, END_COMMENT, false);
  }
  
  /**
   * Try to consume the supplied token against the supplied content and update the
   * in comment parse state to the supplied value. Returns the index into the content
   * which is after the token or -1 if the token is not found.
   */
  private int commentToken(String line, String token, boolean inCommentIfPresent) {
  	int index = line.indexOf(token);
  	if (index > - 1) {
  		this.inComment = inCommentIfPresent;
  	}
  	return (index == -1 ? index : index + token.length());
  }
  ```

  

  [《spring源码（六）–XmlValidationModeDetector（获取xml文档校验模式）》](https://blog.csdn.net/ljz2016/article/details/82686884)

  [《XmlValidationModeDetector》](https://my.oschina.net/u/3579120/blog/1532852)



## 获取 Document 对象

在 `XmlBeanDefinitionReader#doLoadDocument(InputSource inputSource, Resource resource)` 方法，中做了两件事情：

- 调用#getValidationModeForResource(Resource resource)方法，获取指定资源（xml）的验证模式
- 调用 `DocumentLoader#loadDocument(InputSource inputSource, EntityResolver entityResolver, ErrorHandler errorHandler, int validationMode, boolean namespaceAware)` 方法，获取 XML Document 实例。

### DocumentLoader

取 Document 的策略，由接口 `org.springframework.beans.factory.xml.DocumentLoader` 定义。代码如下：

> FROM 《Spring 源码深度解析》P16 页
>
> 定义从资源文件加载到转换为 Document 的功能。

```JAVA
public interface DocumentLoader {
    
//inputSource 方法参数，加载 Document 的 Resource 资源。
//entityResolver 方法参数，解析文件的解析器。
//errorHandler 方法参数，处理加载 Document 对象的过程的错误。
//validationMode 方法参数，验证模式。
//namespaceAware 方法参数，命名空间支持。如果要提供对 XML 名称空间的支持，则需要值为 true 。
	Document loadDocument(
			InputSource inputSource, EntityResolver entityResolver,
			ErrorHandler errorHandler, int validationMode, boolean namespaceAware)
			throws Exception;

}
```

#### DefaultDocumentLoader

该方法由 DocumentLoader 的默认实现类 `org.springframework.beans.factory.xml.DefaultDocumentLoader` 实现。代码如下：

## 1.1 DefaultDocumentLoader

该方法由 DocumentLoader 的默认实现类 `org.springframework.beans.factory.xml.DefaultDocumentLoader` 实现。代码如下：

```
/**
 * Load the {@link Document} at the supplied {@link InputSource} using the standard JAXP-configured
 * XML parser.
 */
@Override
public Document loadDocument(InputSource inputSource, EntityResolver entityResolver,
		ErrorHandler errorHandler, int validationMode, boolean namespaceAware) throws Exception {
	// <1> 创建 DocumentBuilderFactory
	DocumentBuilderFactory factory = createDocumentBuilderFactory(validationMode, namespaceAware);
	if (logger.isTraceEnabled()) {
		logger.trace("Using JAXP provider [" + factory.getClass().getName() + "]");
	}
	// <2> 创建 DocumentBuilder
	DocumentBuilder builder = createDocumentBuilder(factory, entityResolver, errorHandler);
	// <3> 解析 XML InputSource 返回 Document 对象
	return builder.parse(inputSource);
}
```

- 首先，调用 #`createDocumentBuilderFactory(...)` 方法，创建 `javax.xml.parsers.DocumentBuilderFactory` 对象。代码如下：

  ```
  /**
   * JAXP attribute used to configure the schema language for validation.
   */
  private static final String SCHEMA_LANGUAGE_ATTRIBUTE = "http://java.sun.com/xml/jaxp/properties/schemaLanguage";
  /**
   * JAXP attribute value indicating the XSD schema language.
   */
  private static final String XSD_SCHEMA_LANGUAGE = "http://www.w3.org/2001/XMLSchema";
  protected DocumentBuilderFactory createDocumentBuilderFactory(int validationMode, boolean namespaceAware)
          throws ParserConfigurationException {
      // 创建 DocumentBuilderFactory
      DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
      factory.setNamespaceAware(namespaceAware); // 设置命名空间支持
      if (validationMode != XmlValidationModeDetector.VALIDATION_NONE) {
          factory.setValidating(true); // 开启校验
          // XSD 模式下，设置 factory 的属性
          if (validationMode == XmlValidationModeDetector.VALIDATION_XSD) {
              // Enforce namespace aware for XSD...
              factory.setNamespaceAware(true); // XSD 模式下，强制设置命名空间支持
              // 设置 SCHEMA_LANGUAGE_ATTRIBUTE
              try {
                  factory.setAttribute(SCHEMA_LANGUAGE_ATTRIBUTE, XSD_SCHEMA_LANGUAGE);
              } catch (IllegalArgumentException ex) {
                  ParserConfigurationException pcex = new ParserConfigurationException(
                          "Unable to validate using XSD: Your JAXP provider [" + factory +
                          "] does not support XML Schema. Are you running on Java 1.4 with Apache Crimson? " +
                          "Upgrade to Apache Xerces (or Java 1.5) for full XSD support.");
                  pcex.initCause(ex);
                  throw pcex;
              }
          }
      }
      return factory;
  }
  ```

- 然后，调用 `#createDocumentBuilder(DocumentBuilderFactory factory, EntityResolver entityResolver,ErrorHandler errorHandler)` 方法，创建 `javax.xml.parsers.DocumentBuilder` 对象。代码如下：

  ```
  protected DocumentBuilder createDocumentBuilder(DocumentBuilderFactory factory,
  		@Nullable EntityResolver entityResolver, @Nullable ErrorHandler errorHandler)
  		throws ParserConfigurationException {
  	// 创建 DocumentBuilder 对象
  	DocumentBuilder docBuilder = factory.newDocumentBuilder();
  	// <x> 设置 EntityResolver 属性
  	if (entityResolver != null) {
  		docBuilder.setEntityResolver(entityResolver);
  	}
  	// 设置 ErrorHandler 属性
  	if (errorHandler != null) {
  		docBuilder.setErrorHandler(errorHandler);
  	}
  	return docBuilder;
  }
  ```

  - 在 `<x>` 处，设置 DocumentBuilder 的 **EntityResolver** 属性。关于它，在 [「2. EntityResolver」](http://svip.iocoder.cn/Spring/IoC-load-Document/#) 会详细解析。

- 最后，调用 `DocumentBuilder#parse(InputSource)` 方法，解析 InputSource ，返回 Document 对象。

# 2. EntityResolver

通过 `DocumentLoader#loadDocument(...)` 方法来获取 Document 对象时，有一个方法参数 `entityResolver` 。该参数是通过 `XmlBeanDefinitionReader#getEntityResolver()` 方法来获取的。代码如下：

> `#getEntityResolver()` 方法，返回指定的解析器，如果没有指定，则构造一个未指定的默认解析器。

```
// XmlBeanDefinitionReader.java

/**
 * EntityResolver 解析器
 */
@Nullable
private EntityResolver entityResolver;

protected EntityResolver getEntityResolver() {
	if (this.entityResolver == null) {
		// Determine default EntityResolver to use.
		ResourceLoader resourceLoader = getResourceLoader();
		if (resourceLoader != null) {
			this.entityResolver = new ResourceEntityResolver(resourceLoader);
		} else {
			this.entityResolver = new DelegatingEntityResolver(getBeanClassLoader());
		}
	}
	return this.entityResolver;
}
```

- 如果 ResourceLoader 不为 `null`，则根据指定的 ResourceLoader 创建一个 ResourceEntityResolver 对象。
- 如果 ResourceLoader 为 `null` ，则创建 一个 DelegatingEntityResolver 对象。该 Resolver 委托给默认的 BeansDtdResolver 和 PluggableSchemaResolver 。

## 2.1 子类

上面的方法，一共涉及**四个** EntityResolver 的子类：

- `org.springframework.beans.factory.xm.BeansDtdResolver` ：实现 EntityResolver 接口，Spring Bean dtd 解码器，用来从 classpath 或者 jar 文件中加载 dtd 。部分代码如下：

  ```
  private static final String DTD_EXTENSION = ".dtd";
  
  private static final String DTD_NAME = "spring-beans";
  ```

- `org.springframework.beans.factory.xml.PluggableSchemaResolver` ，实现 EntityResolver 接口，读取 classpath 下的所有 `"META-INF/spring.schemas"` 成一个 namespaceURI 与 Schema 文件地址的 map 。代码如下：

  ```
  /**
   * The location of the file that defines schema mappings.
   * Can be present in multiple JAR files.
   *
   * 默认 {@link #schemaMappingsLocation} 地址
   */
  public static final String DEFAULT_SCHEMA_MAPPINGS_LOCATION = "META-INF/spring.schemas";
  
  @Nullable
  private final ClassLoader classLoader;
  
  /**
   * Schema 文件地址
   */
  private final String schemaMappingsLocation;
  
  /** Stores the mapping of schema URL -> local schema path. */
  @Nullable
  private volatile Map<String, String> schemaMappings; // namespaceURI 与 Schema 文件地址的映射集合
  ```

- `org.springframework.beans.factory.xml.DelegatingEntityResolver` ：实现 EntityResolver 接口，分别代理 dtd 的 BeansDtdResolver 和 xml schemas 的 PluggableSchemaResolver 。代码如下：

  ```
  /** Suffix for DTD files. */
  public static final String DTD_SUFFIX = ".dtd";
  
  /** Suffix for schema definition files. */
  public static final String XSD_SUFFIX = ".xsd";
  
  private final EntityResolver dtdResolver;
  
  private final EntityResolver schemaResolver;
  
  // 默认
  public DelegatingEntityResolver(@Nullable ClassLoader classLoader) {
  	this.dtdResolver = new BeansDtdResolver();
  	this.schemaResolver = new PluggableSchemaResolver(classLoader);
  }
  
  // 自定义
  public DelegatingEntityResolver(EntityResolver dtdResolver, EntityResolver schemaResolver) {
  	Assert.notNull(dtdResolver, "'dtdResolver' is required");
  	Assert.notNull(schemaResolver, "'schemaResolver' is required");
  	this.dtdResolver = dtdResolver;
  	this.schemaResolver = schemaResolver;
  }
  ```

- `org.springframework.beans.factory.xml.ResourceEntityResolver` ：继承自 DelegatingEntityResolver 类，通过 ResourceLoader 来解析实体的引用。代码如下：

  ```
  private final ResourceLoader resourceLoader;
  
  public ResourceEntityResolver(ResourceLoader resourceLoader) {
  	super(resourceLoader.getClassLoader());
  	this.resourceLoader = resourceLoader;
  }
  ```

## 2.2 作用

> EntityResolver 的作用就是，通过实现它，应用可以自定义如何**寻找**【验证文件】的逻辑。

------

> FROM 《Spring 源码深度解析》
>
> 在 loadDocument 方法中涉及一个参数 EntityResolver ，何为EntityResolver？官网这样解释：如果 SAX 应用程序需要实现自定义处理外部实体，则必须实现此接口并使用 setEntityResolver 方法向SAX 驱动器注册一个实例。也就是说，对于解析一个XML，SAX 首先读取该 XML 文档上的声明，根据声明去寻找相应的 DTD 定义，以便对文档进行一个验证。默认的寻找规则，即通过网络（实现上就是声明的DTD的URI地址）来下载相应的DTD声明，并进行认证。下载的过程是一个漫长的过程，而且当网络中断或不可用时，这里会报错，就是因为相应的DTD声明没有被找到的原因。
>
> EntityResolver 的作用是项目本身就可以提供一个如何寻找 DTD 声明的方法，即由程序来实现寻找 DTD 声明的过程，比如我们将 DTD 文件放到项目中某处，在实现时直接将此文档读取并返回给 SAX 即可。这样就避免了通过网络来寻找相应的声明。

`org.xml.sax.EntityResolver` 接口，代码如下：

```
public interface EntityResolver {

    public abstract InputSource resolveEntity (String publicId, String systemId)
        throws SAXException, IOException;

}
```

接口方法接收两个参数 `publicId` 和 `systemId` ，并返回 InputSource 对象。两个参数声明如下：

- `publicId` ：被引用的外部实体的公共标识符，如果没有提供，则返回 `null` 。
- `systemId` ：被引用的外部实体的系统标识符。

这两个参数的实际内容和具体的验证模式的关系如下：

- XSD 验证模式
  - publicId：null
  - systemId：http://www.springframework.org/schema/beans/spring-beans.xsd
  - [![XSD 验证模式](http://static.iocoder.cn/08e5f8a505505def17e84becd4f0dbf9)](http://static.iocoder.cn/08e5f8a505505def17e84becd4f0dbf9)XSD 验证模式
- DTD 验证模式
  - publicId：-//SPRING//DTD BEAN 2.0//EN
  - systemId：http://www.springframework.org/dtd/spring-beans.dtd
  - [![DTD 验证模式](http://static.iocoder.cn/8f77d23019c10f4ac026968ce19067ef)](http://static.iocoder.cn/8f77d23019c10f4ac026968ce19067ef)DTD 验证模式

## 2.3 DelegatingEntityResolver

我们知道在 Spring 中使用 DelegatingEntityResolver 为 EntityResolver 的实现类。`#resolveEntity(String publicId, String systemId)` 方法，实现如下：

```
@Override
@Nullable
public InputSource resolveEntity(String publicId, @Nullable String systemId) throws SAXException, IOException {
	if (systemId != null) {
		// DTD 模式
		if (systemId.endsWith(DTD_SUFFIX)) {
			return this.dtdResolver.resolveEntity(publicId, systemId);
		// XSD 模式
		} else if (systemId.endsWith(XSD_SUFFIX)) {
			return this.schemaResolver.resolveEntity(publicId, systemId);
		}
	}
	return null;
}
```

- 如果是 DTD 验证模式，则使用 BeansDtdResolver 来进行解析
- 如果是 XSD 验证模式，则使用 PluggableSchemaResolver 来进行解析。

## 2.4 BeansDtdResolver

BeansDtdResolver 的解析过程，代码如下：

```
/**
 * DTD 文件的后缀
 */
private static final String DTD_EXTENSION = ".dtd";
/**
 * Spring Bean DTD 的文件名
 */
private static final String DTD_NAME = "spring-beans";

@Override
@Nullable
public InputSource resolveEntity(String publicId, @Nullable String systemId) throws IOException {
    if (logger.isTraceEnabled()) {
        logger.trace("Trying to resolve XML entity with public ID [" + publicId +
                "] and system ID [" + systemId + "]");
    }
    // 必须以 .dtd 结尾
    if (systemId != null && systemId.endsWith(DTD_EXTENSION)) {
        // 获取最后一个 / 的位置
        int lastPathSeparator = systemId.lastIndexOf('/');
        // 获取 spring-beans 的位置
        int dtdNameStart = systemId.indexOf(DTD_NAME, lastPathSeparator);
        if (dtdNameStart != -1) { // 找到
            String dtdFile = DTD_NAME + DTD_EXTENSION;
            if (logger.isTraceEnabled()) {
                logger.trace("Trying to locate [" + dtdFile + "] in Spring jar on classpath");
            }
            try {
                // 创建 ClassPathResource 对象
                Resource resource = new ClassPathResource(dtdFile, getClass());
                // 创建 InputSource 对象，并设置 publicId、systemId 属性
                InputSource source = new InputSource(resource.getInputStream());
                source.setPublicId(publicId);
                source.setSystemId(systemId);
                if (logger.isTraceEnabled()) {
                    logger.trace("Found beans DTD [" + systemId + "] in classpath: " + dtdFile);
                }
                return source;
            }
            catch (IOException ex) {
                if (logger.isDebugEnabled()) {
                    logger.debug("Could not resolve beans DTD [" + systemId + "]: not found in classpath", ex);
                }
            }
        }
    }

    // 使用默认行为，从网络上下载
    // Use the default behavior -> download from website or wherever.
    return null;
}
```

从上面的代码中，我们可以看到，加载 DTD 类型的 `BeansDtdResolver#resolveEntity(...)` 过程，只是对 `systemId` 进行了简单的校验（从最后一个 / 开始，内容中是否包含 `spring-beans`），然后构造一个 InputSource 对象，并设置 `publicId`、`systemId` 属性，然后返回。

## 2.5 PluggableSchemaResolver

PluggableSchemaResolver 的解析过程，代码如下:

```
@Nullable
private final ClassLoader classLoader;

/**
 * Schema 文件地址
 */
private final String schemaMappingsLocation;

/** Stores the mapping of schema URL -> local schema path. */
@Nullable
private volatile Map<String, String> schemaMappings; // namespaceURI 与 Schema 文件地址的映射集合

@Override
@Nullable
public InputSource resolveEntity(String publicId, @Nullable String systemId) throws IOException {
    if (logger.isTraceEnabled()) {
        logger.trace("Trying to resolve XML entity with public id [" + publicId +
                "] and system id [" + systemId + "]");
    }

    if (systemId != null) {
        // 获得 Resource 所在位置
        String resourceLocation = getSchemaMappings().get(systemId);
        if (resourceLocation != null) {
            // 创建 ClassPathResource
            Resource resource = new ClassPathResource(resourceLocation, this.classLoader);
            try {
                // 创建 InputSource 对象，并设置 publicId、systemId 属性
                InputSource source = new InputSource(resource.getInputStream());
                source.setPublicId(publicId);
                source.setSystemId(systemId);
                if (logger.isTraceEnabled()) {
                    logger.trace("Found XML schema [" + systemId + "] in classpath: " + resourceLocation);
                }
                return source;
            }
            catch (FileNotFoundException ex) {
                if (logger.isDebugEnabled()) {
                    logger.debug("Could not find XML schema [" + systemId + "]: " + resource, ex);
                }
            }
        }
    }
    return null;
}
```

- 首先调用 `#getSchemaMappings()` 方法，获取一个映射表(systemId 与其在本地的对照关系)。代码如下：

  ```
  private Map<String, String> getSchemaMappings() {
      Map<String, String> schemaMappings = this.schemaMappings;
      // 双重检查锁，实现 schemaMappings 单例
      if (schemaMappings == null) {
          synchronized (this) {
              schemaMappings = this.schemaMappings;
              if (schemaMappings == null) {
                  if (logger.isTraceEnabled()) {
                      logger.trace("Loading schema mappings from [" + this.schemaMappingsLocation + "]");
                  }
                  try {
                      // 以 Properties 的方式，读取 schemaMappingsLocation
                      Properties mappings = PropertiesLoaderUtils.loadAllProperties(this.schemaMappingsLocation, this.classLoader);
                      if (logger.isTraceEnabled()) {
                          logger.trace("Loaded schema mappings: " + mappings);
                      }
                      // 将 mappings 初始化到 schemaMappings 中
                      schemaMappings = new ConcurrentHashMap<>(mappings.size());
                      CollectionUtils.mergePropertiesIntoMap(mappings, schemaMappings);
                      this.schemaMappings = schemaMappings;
                  } catch (IOException ex) {
                      throw new IllegalStateException(
                              "Unable to load schema mappings from location [" + this.schemaMappingsLocation + "]", ex);
                  }
              }
          }
      }
      return schemaMappings;
  }
  ```

  - 映射表如下（**部分**）:[![映射表](http://static.iocoder.cn/4dba22abb6ce4bc1a7721afb2cb53567)](http://static.iocoder.cn/4dba22abb6ce4bc1a7721afb2cb53567)映射表

- 然后，根据传入的 `systemId` 获取该 `systemId` 在本地的路径 `resourceLocation` 。

- 最后，根据 `resourceLocation` ，构造 InputSource 对象。

## 2.6 ResourceEntityResolver

ResourceEntityResolver 的解析过程，代码如下:

```
private final ResourceLoader resourceLoader;

@Override
@Nullable
public InputSource resolveEntity(String publicId, @Nullable String systemId) throws SAXException, IOException {
    // 调用父类的方法，进行解析
    InputSource source = super.resolveEntity(publicId, systemId);
    // 解析失败，resourceLoader 进行解析
    if (source == null && systemId != null) {
        // 获得 resourcePath ，即 Resource 资源地址
        String resourcePath = null;
        try {
            String decodedSystemId = URLDecoder.decode(systemId, "UTF-8"); // 使用 UTF-8 ，解码 systemId
            String givenUrl = new URL(decodedSystemId).toString(); // 转换成 URL 字符串
            // 解析文件资源的相对路径（相对于系统根路径）
            String systemRootUrl = new File("").toURI().toURL().toString();
            // Try relative to resource base if currently in system root.
            if (givenUrl.startsWith(systemRootUrl)) {
                resourcePath = givenUrl.substring(systemRootUrl.length());
            }
        } catch (Exception ex) {
            // Typically a MalformedURLException or AccessControlException.
            if (logger.isDebugEnabled()) {
                logger.debug("Could not resolve XML entity [" + systemId + "] against system root URL", ex);
            }
            // No URL (or no resolvable URL) -> try relative to resource base.
            resourcePath = systemId;
        }
        if (resourcePath != null) {
            if (logger.isTraceEnabled()) {
                logger.trace("Trying to locate XML entity [" + systemId + "] as resource [" + resourcePath + "]");
            }
            // 获得 Resource 资源
            Resource resource = this.resourceLoader.getResource(resourcePath);
            // 创建 InputSource 对象
            source = new InputSource(resource.getInputStream());
            // 设置 publicId 和 systemId 属性
            source.setPublicId(publicId);
            source.setSystemId(systemId);
            if (logger.isDebugEnabled()) {
                logger.debug("Found XML entity [" + systemId + "]: " + resource);
            }
        }
    }
    return source;
}
```

- 首先，调用**父类**的方法，进行解析。
- 如果失败，使用 `resourceLoader` ，尝试读取 `systemId` 对应的 Resource 资源。

## 2.7 自定义 EntityResolver

> 老艿艿：本小节，为**选读**内容。

`#getEntityResolver()` 方法返回 EntityResolver 对象。那么怎么进行自定义 EntityResolver 呢?

> If a SAX application needs to implement customized handling for external entities, it must implement this interface and register an instance with the SAX driver using the setEntityResolver method.
>
> 就是说：如果 SAX 应用程序需要实现自定义处理外部实体，则必须实现此接口，并使用 `#setEntityResolver(EntityResolver entityResolver)` 方法，向 SAX 驱动器注册一个 EntityResolver 实例。

示例如下：

```
public class MyResolver implements EntityResolver {

    @Override
    public InputSource resolveEntity(String publicId, String systemId) {
        if (systemId.equals("http://www.myhost.com/today")) {
            MyReader reader = new MyReader();
            return new InputSource(reader);
        } else {
            // use the default behaviour
            return null;
        }
    }

}
```

我们首先将 `"spring-student.xml"` 文件中的 XSD 声明的地址改掉，如下：

[![spring-student.xml](http://static.iocoder.cn/882e730ac463e3007c5f3c5cde8380bc)](http://static.iocoder.cn/882e730ac463e3007c5f3c5cde8380bc)spring-student.xml

如果我们再次运行，则会报如下错误：

[![报错](http://static.iocoder.cn/741da1d13906154d36f02fa5113432fd)](http://static.iocoder.cn/741da1d13906154d36f02fa5113432fd)报错

从上面的错误可以看到，是在进行文档验证时，无法根据声明找到 XSD 验证文件而导致无法进行 XML 文件验证。在 [《【死磕 Spring】—— IoC 之获取验证模型》](http://svip.iocoder.cn/Spring/IoC-Validation-Mode-For-Resource) 中讲到，如果要解析一个 XML 文件，SAX 首先会读取该 XML 文档上的声明，然后根据声明去寻找相应的 DTD 定义，以便对文档进行验证。**默认的加载规则是通过网络方式下载验证文件**，而在实际生产环境中我们会遇到网络中断或者不可用状态，那么就应用就会因为无法下载验证文件而报错。

# 666. 彩蛋

是不是看到此处，有点懵逼，不是说好了分享**获取 Document 对象**，结果内容主要是 EntityResolver 呢？因为，从 XML 中获取 Document 对象，已经有 `javax.xml` 库进行解析。而 EntityResolver 的重点，是在于如何获取【验证文件】，从而验证用户写的 XML 是否通过验证。







## 注册 BeanDefinition
