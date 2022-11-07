### netty 
1. HttpServerCodec ChunkedWriteHandler HttpObjectAggregator WebSocketServerProtocolHandler  
2. websocket基于TCP协议，在不稳定的网络环境下发送大量数据，并且发送频率非常高，很可能会出现错误（1、程序处理逻辑错误；2、多线程同步问题；3、缓冲区溢出等）。这掉线的频率让人很难接收，抓包也是抓的崩溃， 放弃了！ 几个同事之间可能也都踢了好几周的皮球，呵呵，感觉对不起公司的同事们。首先让客户端和设备端全部添加了断线重连、优化设备端发送频率、服务端缓存一些消息。  