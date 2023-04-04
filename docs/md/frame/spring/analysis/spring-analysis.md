## 学习方法
1. 先梳理脉络.然后抠细节
2. 不要忽略注释,translate idea翻译工具
3. 见名知意
4. 大胆猜测 小心验证
5. 坚持看

## 源码阅读顺序
springmvc-spring-mybaits  springboot-tomcat  springcloud

## spring ioc

### 脉络

容器: 从对象的创建到对象的使用再到对象的销毁全部有容器帮我们控制,用户只需要使用即可

流程  
加载配置文件 -> 解析-> 封装成beanDetinition对象 -> 实例化->初始化 -> 使用

加载  
配置文件可以有很多格式,怎么读取?  
每种配置文件读取实现 BeanDefinitionLoad 接口

加载成BeanDefinition后扩展  
1. bean加载时(loadBeanDefinition)属性值例如${uername} 不会进行值的替换,通过BeanFactoryPostProcessor 进行占位符值替换
2. 注解的加载

PostProcessor 后置处理器 增强器 (扩展功能用) 
子类 BeanFactoryPostProcessor 用于操作BeanFactory  
子类 BeanPostProcessor 用于Bean

实例化  
1. new
2. 反射

初始化
1. 填充属性值: set方法
2. 调用aware接口的方法:  
    spring 容器安照使用者分类:spring自身需要的对象,自定义对象  
    如果想要自定义容器中获取spring对象,  即调用aware接口
    
3. before ,BeanPostProcessor(低层用aop进行功能扩展)
4. 调用init方法
5. after ,BeanPostProcessor(低层用aop进行功能扩展)


实例化+初始化+使用+销毁即是bean的生命周期

总结:容器和对象的创建流程  
1. 创建容器
2. 加载配置文件,封装成BeanDefinition
3. 调用执行 BeanFactoryPostProcessor
准备工作:  
    准备BeanOistProcessor  
    准备监听器,时间,广播器  

4. 实例化
5. 初始化
6. 获取完整的对象

### 流程 P6

refresh() ioc加载流程:
```java
	public void refresh() throws BeansException, IllegalStateException {
		synchronized (this.startupShutdownMonitor) {
			// Prepare this context for refreshing.
            // 容器加载前准备
			prepareRefresh();

			// Tell the subclass to refresh the internal bean factory.
            // 创建容器
            // * 加载配置文件,封装成BeanDefinition
			ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

			// Prepare the bean factory for use in this context.
            // 给beanFactory属性值进行填充
			prepareBeanFactory(beanFactory);

			try {
				// Allows post-processing of the bean factory in context subclasses.
                // 留给子类扩展使用
				postProcessBeanFactory(beanFactory);

				// Invoke factory processors registered as beans in the context.
                // 调用执行 BeanFactoryPostProcessor 的各种处理器
				invokeBeanFactoryPostProcessors(beanFactory);

                // 以下为实例化准备
				// Register bean processors that intercept bean creation.
                // 注册Bean处理器,这里只是注册功能,真正调用的是getBean()
				registerBeanPostProcessors(beanFactory);

				// Initialize message source for this context.
                // 国际化处理
				initMessageSource();

				// Initialize event multicaster for this context.
                // 出初始化事件监听多路广播器
				initApplicationEventMulticaster();

				// Initialize other special beans in specific context subclasses.
                // 留给子类来初始化其他bean
				onRefresh();

				// Check for listener beans and register them.
                // 查所有注册的bean中查找listener bean 注册到消息广播器中
				registerListeners();
                // 以上为初始化准备

				// Instantiate all remaining (non-lazy-init) singletons.
                // 实例化并初始化非加载的单例对象
				finishBeanFactoryInitialization(beanFactory);

				// Last step: publish corresponding event.
				finishRefresh();
			}

			catch (BeansException ex) {
				if (logger.isWarnEnabled()) {
					logger.warn("Exception encountered during context initialization - " +
							"cancelling refresh attempt: " + ex);
				}

				// Destroy already created singletons to avoid dangling resources.
				destroyBeans();

				// Reset 'active' flag.
				cancelRefresh(ex);

				// Propagate exception to caller.
				throw ex;
			}

			finally {
				// Reset common introspection caches in Spring's core, since we
				// might not ever need metadata for singleton beans anymore...
				resetCommonCaches();
			}
		}
	}

```

**spring中do开头的方法都是实际干活的,很重要**
 
## 问题
1. spring怎么启动的
2. spring 怎么加载xml配置文件  
    xml->读取->转换成document->遍历每个子元素 进行解析操作->找到对应的处理器handle->对不同元素进行处理
3. 解决循环依赖
    构造器循环依赖无法解决,set方法可以通过三级缓存来解决
    1. 三级缓存: 一级放成品对象 二级放半成品  
    为什么不用二级?  
    2. 提前暴露对象


