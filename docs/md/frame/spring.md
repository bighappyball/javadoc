

# Spring

## 设计模式

### 单例

### 工厂

### 适配器

根据不同商家适配

### 责任链

继承 process 链路执行

## 源码

- Bean
  - 生命周期
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
  - 作用域
    - 单例（singleton）
    - 多例（prototype）
    - Request
    - Session
- 循环依赖
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
- 父子容器
- 事务实现原理
  - 采用不同的连接器
  - 用AOP 新建立了一个 链接
    - 共享链接
  - ThreadLocal 当前事务
  - 前提是 关闭AutoCommit
- AOP
  - 静态代理
    - 实现类
  - 动态代理
    - JDK动态代理
      - 实现接口
        - java反射机制生成一个代理接口的匿名类
          - 调用具体方法的时候调用invokeHandler
    - cjlib
      - asm字节码编辑技术动态创建类 基于classLoad装载
        - 修改字节码生成子类去处理
- IOC
- 类加载机制
  - 过程
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
  - 加载方式
    - main（）
    - class。forName
    - ClassLoader。loadClass
  - 类加载器
    - Appclass Loade
    - Extention ClassLoader
    - Bootstrap ClassLoader
  - 双亲委派原则
    - 可以避免重复加载
    - 安全

- 