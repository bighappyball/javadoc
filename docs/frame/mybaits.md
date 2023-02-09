### 3.4. MyBatis

#{}和${}的区别是什么？

${}是 Properties 文件中的变量占位符，它可以用于标签属性值和 sq内部，属于静态文本替换，比如${driver}会被静态替换为com.mysql.jdbc. Driver。

#{}是 sq的参数占位符，MyBatis 会将 sq中的#{}替换为? 号，在 sq执行前会使用 PreparedStatement 的参数设置方法，按序给 sq的? 号占位符设置参数值

Xm映射文件中，除了常见的 select|insert|update|delete 标签之外，还有哪些标签？

还有很多其他的标签， <resultMap> 、 <parameterMap> 、 <sql> 、 <include> 、 <selectKey> ，加上动态 sq的 9 个标签， trim|where|set|foreach|if|choose|when|otherwise|bind 等，其中 <sql> 为 sq片段标签，通过 <include> 标签引入 sq片段， <selectKey> 为不支持自增的主键生成策略标签。

通常一个 Xm映射文件，都会写一个 Dao 接口与之对应，请问，这个 Dao 接口的工作原理是什么？Dao 接口里的方法，参数不同时，方法能重载吗？

Dao 接口里的方法可以重载，但是 Mybatis 的 XM里面的 ID 不允许重复。Mybatis 的 Dao 接口可以有多个重载方法，但是多个接口对应的映射必须只有一个，否则启动会报错。

Dao 接口的工作原理是 JDK 动态代理，MyBatis 运行时会使用 JDK 动态代理为 Dao 接口生成代理 proxy 对象，代理对象 proxy 会拦截接口方法，转而执行 MappedStatement 所代表的 sql，然后将 sq执行结果返回。

简述 MyBatis 的插件运行原理，以及如何编写一个插件

实现 MyBatis 的 Interceptor 接口并复写 intercept() 方法，然后在给插件编写注解，指定要拦截哪一个接口的哪些方法即可，记住，别忘了在配置文件中配置你编写的插件。

MyBatis 是否支持延迟加载？如果支持，它的实现原理是什么？

它的原理是，使用 CGLIB 创建目标对象的代理对象，当调用目标方法时，进入拦截器方法，比如调用 a.getB().getName() ，拦截器 invoke() 方法发现 a.getB() 是 nul值，那么就会单独发送事先保存好的查询关联 B 对象的 sql，把 B 查询上来，然后调用 a.setB(b)，于是 a 的对象 b 属性就有值了，接着完成 a.getB().getName() 方法的调用。这就是延迟加载的基本原理。

MyBatis 中如何执行批处理？

使用 BatchExecutor 完成批处理

MyBatis 都有哪些 Executor 执行器？它们之间的区别是什么？

SimpleExecutor ：每执行一次 update 或 select，就开启一个 Statement 对象，用完立刻关闭 Statement 对象。

ReuseExecutor ：执行 update 或 select，以 sq作为 key 查找 Statement 对象，存在就使用，不存在就创建，用完后，不关闭 Statement 对象，而是放置于 Map<String, Statement>内，供下一次使用。简言之，就是重复使用 Statement 对象。

BatchExecutor ：执行 update（没有 select，JDBC 批处理不支持 select），将所有 sq都添加到批处理中（addBatch()），等待统一执行（executeBatch()），它缓存了多个 Statement 对象，每个 Statement 对象都是 addBatch()完毕后，等待逐一执行 executeBatch()批处理。与 JDBC 批处理相同。