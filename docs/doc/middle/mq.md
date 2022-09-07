## 基础

### 为什么要用MQ

### RocketMQ
#### 连接结构
![alt 连接结构图](../../_media/mq/1.png)  
[ocketmq源码解析-namesrv与broker](http://events.jianshu.io/p/4475ba4640b6 )  
### namesrv 
namesrv 是类似zk的命名服务端，broker向它发起注册、producer与consumer向他拉取topic的队列。为什么不用现有的比如zk等中间件呢？应该是因为解耦：功能比较简单不需要引入外界中间件，避免引入新的复杂度，控制权在自己手上，简单即是美。
### broker 
### producer
### consumer

#### RabbitMQ

#### Kafka

