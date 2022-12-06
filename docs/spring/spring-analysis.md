## 学习方法
1. 先梳理脉络.然后抠细节
2. 不要忽略注释,translate idea翻译工具
3. 见名知意
4. 大胆猜测 小心验证
5. 坚持看

## spring ioc

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
