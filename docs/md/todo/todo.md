### netty 
1. HttpServerCodec ChunkedWriteHandler HttpObjectAggregator WebSocketServerProtocolHandler  
2. websocket基于TCP协议，在不稳定的网络环境下发送大量数据，并且发送频率非常高，很可能会出现错误（1、程序处理逻辑错误；2、多线程同步问题；3、缓冲区溢出等）。这掉线的频率让人很难接收，抓包也是抓的崩溃， 放弃了！ 几个同事之间可能也都踢了好几周的皮球，呵呵，感觉对不起公司的同事们。首先让客户端和设备端全部添加了断线重连、优化设备端发送频率、服务端缓存一些消息。  

### fastdfs
1.断点上传
2.分片上传

### netty 
#### HttpServerCodec ChunkedWriteHandler HttpObjectAggregator WebSocketServerProtocolHandler  
#### websocket 
基于TCP协议，在不稳定的网络环境下发送大量数据，并且发送频率非常高，很可能会出现错误（1、程序处理逻辑错误；2、多线程同步问题；3、缓冲区溢出等）。这掉线的频率让人很难接收，抓包也是抓的崩溃， 放弃了！ 几个同事之间可能也都踢了好几周的皮球，呵呵，感觉对不起公司的同事们。首先让客户端和设备端全部添加了断线重连、优化设备端发送频率、服务端缓存一些消息。  
1. netty使用WebSockert协议传输数据是通过帧(frame) 形式传递，如果使用其他类型的载体传输数据，数据会传输不了。
2. 在netty中，有6个子类的帧数据传输类型，在本代码中使用文本帧TextWebSocketFrame
3. WebSocketServerProtocolHandler主要作用，就是将其返回的状态码变成101，将其http协议升级为ws（webSocket）协议
4. HttpObjectAggregator主要作用当浏览器发送大量数据时，就会发出多次http请求，就是为了让其聚合处理消息
5. 在http协议中netty使用HttpServerCodec，进行编解码，主要这个包含编码和界面，内部继承了两个类一个编码类，一个解码类
6. ChunkedWriteHandler主要作用是以块方式写数据

