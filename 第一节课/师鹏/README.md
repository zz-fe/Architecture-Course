# 前端全链路优化

谈到前端全链路应该要从用户输入URL到页面呈现给用户的整个过程梳理清楚再在每个过程中细分找到优化点

我把过程大体上分为以下几个主要过程
- 浏览器查找当前URL是否存在缓存，并比较缓存是否过期
- DNS解析URL对应的IP
- 根据IP建立TCP连接（三次握手）
- HTTP发起请求
- 服务器处理请求返回处理结果给浏览器并关闭TCP连接（四次挥手）
- 浏览器接收数据开始解析构建DOM树，渲染页面

## 一、URL
我们常见的RUL是这样的:http://www.baidu.com,这个域名由三部分组成：协议名、域名、端口号，这里端口是80，因为不输入端口号默认就是80所以隐藏。基本URL包含模式（或称协议）、服务器名称（或IP地址）、路径和文件名，如“协议://授权/路径?查询”。完整的、带有授权部分的普通统一资源标志符语法看上去如下：协议://用户名:密码@子域名.域名.顶级域名:端口号/目录/文件名.文件后缀?参数=值#标志

URL还分为两类
绝对URL（absolute URL）显示文件的完整路径，这意味着绝对URL本身所在的位置与被引用的实际文件的位置无关。

相对URL（relative URL）以包含URL本身的文件夹的位置为参考点，描述目标文件夹的位置。如果目标文件与当前页面（也就是包含URL的页面）在同一个目录，那么这个文件的相对URL仅仅是文件名和扩展名，如果目标文件在当前目录的子目录中，那么它的相对URL是子目录名，后面是斜杠，然后是目标文件的文件名和扩展名。
如果要引用文件层次结构中更高层目录中的文件，那么使用两个句点和一条斜杠。可以组合和重复使用两个句点和一条斜杠，从而引用当前文件所在的硬盘上的任何文件，
一般来说，对于同一服务器上的文件，应该总是使用相对URL，它们更容易输入，而且在将页面从本地系统转移到服务器上时更方便，只要每个文件的相对位置保持不变，链接就仍然是有效地。

## 二、缓存
浏览器缓存主要有两类强缓存（也称本地缓存）和协商缓存（也称弱缓存）
浏览器缓存有减少冗余的数据传输、、减少服务器负担、加快客户端加载网页的速度优点

<img src="https://sfault-image.b0.upaiyun.com/292/633/2926334056-56fe382bb7a63">

### 强缓存
强缓存是利用http头中的Expires和Cache-Control两个字段来控制的，用来表示资源的缓存时间。强缓存中，普通刷新会忽略它，但不会清除它，需要强制刷新。浏览器强制刷新，请求会带上Cache-Control:no-cache和Pragma:no-cache

#### Expires
Expires是http1.0的规范，它的值是一个绝对时间的GMT格式的时间字符串。如我现在这个网页的Expires值是：expires:Fri, 14 Apr 2017 10:47:02 GMT。这个时间代表这这个资源的失效时间，只要发送请求时间是在Expires之前，那么本地缓存始终有效，则在缓存中读取数据。所以这种方式有一个明显的缺点，由于失效的时间是一个绝对时间，所以当服务器与客户端时间偏差较大时，就会导致缓存混乱。如果同时出现Cache-Control:max-age和Expires，那么max-age优先级更高。如我主页的response headers部分如下表示资源可以被缓存的最长时间为691200秒，会优先考虑max-age
``` html
cache-control:max-age=691200
expires:Fri, 14 Apr 2017 10:47:02 GMT
```
#### Cache-Control
Cache-Control是在http1.1中出现的，主要是利用该字段的max-age值来进行判断，它是一个相对时间，例如Cache-Control:max-age=3600，代表着资源的有效期是3600秒。cache-control除了该字段外，还有下面几个比较常用的设置值：
- no-cache：不使用本地缓存。需要使用缓存协商，先与服务器确认返回的响应是否被更改，如果之前的响应中存在ETag，那么请求的时候会与服务端验证，如果资源未被更改，则可以避免重新下载。
- no-store：直接禁止游览器缓存数据，每次用户请求该资源，都会向服务器发送一个请求，每次都会下载完整的资源。
- public：可以被所有的用户缓存，包括终端用户和CDN等中间代理服务器。
- private：只能被终端用户的浏览器缓存，不允许CDN等中继缓存服务器对其缓存。

Cache-Control与Expires可以在服务端配置同时启用，同时启用的时候Cache-Control优先级高。

### 协商缓存
协商缓存就是由服务器来确定缓存资源是否可用，所以客户端与服务器端要通过某种标识来进行通信，从而让服务器判断请求资源是否可以缓存访问。

普通刷新会启用弱缓存，忽略强缓存。只有在地址栏或收藏夹输入网址、通过链接引用资源等情况下，浏览器才会启用强缓存，这也是为什么有时候我们更新一张图片、一个js文件，页面内容依然是旧的，但是直接浏览器访问那个图片或文件，看到的内容却是新的。

这个主要涉及到两组header字段：Etag和If-None-Match、Last-Modified和If-Modified-Since。

#### Etag和If-None-Match
Etag/If-None-Match返回的是一个校验码。ETag可以保证每一个资源是唯一的，资源变化都会导致ETag变化。服务器根据浏览器上送的If-None-Match值来判断是否命中缓存。

与Last-Modified不一样的是，当服务器返回304 Not Modified的响应时，由于ETag重新生成过，response header中还会把这个ETag返回，即使这个ETag跟之前的没有变化。

#### Last-Modify/If-Modify-Since
浏览器第一次请求一个资源的时候，服务器返回的header中会加上Last-Modify，Last-modify是一个时间标识该资源的最后修改时间，例如Last-Modify: Thu,31 Dec 2037 23:59:59 GMT。

当浏览器再次请求该资源时，request的请求头中会包含If-Modify-Since，该值为缓存之前返回的Last-Modify。服务器收到If-Modify-Since后，根据资源的最后修改时间判断是否命中缓存。

如果命中缓存，则返回304，并且不会返回资源内容，并且不会返回Last-Modify。

你可能会觉得使用Last-Modified已经足以让浏览器知道本地的缓存副本是否足够新，为什么还需要Etag呢？HTTP1.1中Etag的出现主要是为了解决几个Last-Modified比较难解决的问题：
- 一些文件也许会周期性的更改，但是他的内容并不改变(仅仅改变的修改时间)，这个时候我们并不希望客户端认为这个文件被修改了，而重新GET；
- 某些文件修改非常频繁，比如在秒以下的时间内进行修改，(比方说1s内修改了N次)，If-Modified-Since能检查到的粒度是s级的，这种修改无法判断(或者说UNIX记录MTIME只能精确到秒)；
- 某些服务器不能精确的得到文件的最后修改时间。

Last-Modified与ETag是可以一起使用的，服务器会优先验证ETag，一致的情况下，才会继续比对Last-Modified，最后才决定是否返回304。

HTTP基于缓存策略三要素分解法
http://caibaojian.com/http-cache-3.html

## 三、DNS域名解析
在说DNS的时候要先看一下输入的是IP地址还是域名
如果是IP地址是不需要DNS解析直接点对点请求的。但是IP地址并不方便记忆。为了方便记忆域名孕育而生也就是大家所说的网址，另外域名比IP还有一个优点就是在你IP地址变更的后用户无需重新记住一个新的IP，只需把域名指向的IP地址改为变更后的IP即可，对用户来讲是无感知的。

首先浏览器先检查本地hosts文件是否有这个网址映射关系，如果有就调用这个IP地址映射，完成域名解析。

　　如果没找到则会查找本地DNS解析器缓存，如果查找到则返回。

　　如果还是没有找到则会查找本地DNS服务器，如果查找到则返回。
最后才通过DNS服务器查询，这里还分为迭代查询和递归查询

迭代查询：按根域服务器 ->顶级域,.cn->第二层域，hb.cn ->子域，www.hb.cn的顺序找到IP地址。

<img src="http://images2015.cnblogs.com/blog/1034346/201703/1034346-20170329144552311-345405404.jpg">

递归查询，按上一级DNS服务器->上上级->....逐级向上查询找到IP地址。

<img src="http://images2015.cnblogs.com/blog/1034346/201703/1034346-20170329144611358-1044454178.jpg">

## 四、建立连接
在建立链接和传输数据过程中都是基于网络通信的基础上来实现的这里涉及的东西比较多，我在结尾部分介绍了一下网络通信。

在通过DNS域名解析后，获取到了服务器的IP地址，在获取到IP地址后，便会开始建立一次连接，这是由TCP协议完成的，主要通过三次握手进行连接的（<a href="#tcp">详情可移步底部</a>）

## 五、发送HTTP请求
发送HTTP请求的过程就是构建HTTP请求报文并通过TCP协议中发送到服务器指定端口

完整的HTTP请求包含请求起始行、请求头部、请求主体三部分。

请求行以方法字段开始，后面分别是 URL 字段和 HTTP 协议版本字段，并以 CRLF 结尾。SP 是分隔符。除了在最后的 CRLF 序列中 CF 和 LF 是必需的之外，其他都可以不要。

Method Request-URL HTTP-Version CRLF
其中Method表示请求方法，Request-URI是统一资源标识符，HTTP-Version表示请求的HTTP协议版本，行，以 CRLF 结尾。SP 是分隔符。除了在最后的 CRLF 序列中 CF 和 LF 是必需的之外，其他都可以不要。
例如 GET http://www.xxx.com/xx.html HTTP/1.1

## 六、服务器处理请求返回处理结果
+ 1、服务器解析请求

　　Web服务器对请求按照HTTP协议进行解码来确定进一步的动作，设计的内容有三鼐要点：方法（GET）、文档(/sample.html)、和浏览器使用的协议（HTTP/1.1）其中方法告诉服务器应完动的动作，GET方法的含义很明显是：服务器应定位、读取文件并将它返回给客户。

Web服务器现在就知道了，它应该找到文件/sample.html，并使用HTTP/1.1协议将内容返回给客户。信息是经过与请求到来相同的连接发出的，所以服务器不需要定们客户或创建新的连接。

+ 2、读取其它信息（非必须步骤）

Web服务器根据需要去读取请求的其它部分。在HTTP/1.1下，客户还应给服务器提供关于它的一些信息。元信息（metainformation）可用来描述浏览器及其能力，以使服务器能据此确定如何返回应答。

+ 3、完成请求的动作

　　若现在没有错误出现，WWW服务器将执行请求所要求的动作。要获取（GET）一个文档，web服务器在其文档树中搜索请求的文件（/sample.html）。这是由服务器机器上作为操作系统一部分的文件系统完成的。若文件能找到并可正常读取，则服务器将把它返回给客户。

如果成功：文件被发送出去。

　　首先，web服务器发送一个状态码及一些描述信息。既然文件已经找到，则发送状态码200，表示一切都OK ，文档随后发出，因为发送的信息是HTML文档，所以Content-type 取值为text/html。文档长为1024个字节，所以Content-type 取1024 。服务器软件的标识及文件的时间属性信息也被包含在头域中。

如果失败：返回错误指示。

　　如果请求的文件没有找到或找到但无法读取，测请求无法满足。这时将返回不同于200的状态码。最常见的问题是请求中的文件名拼写有误，所以服务器无法找到该文件。这种情况下，服务器将发送一个状态码---404给客户(<a href="#resCode">详细的状态码系统还请移步底部查看详情</a>)。

+ 4、关网络连接，结束会话。

当文件已被发送或错误已发出后，web服务器结束整个会话。它关闭打开的网络端口从而结束网络连接。

## 浏览器接收数据开始解析构建DOM树，渲染页面

如果说响应的内容是HTML文档的话，就需要浏览器进行解析渲染呈现给用户。整个过程涉及两个方面：解析和渲染。在渲染页面之前，需要构建DOM树和CSSOM树。

　　在浏览器还没接收到完整的 HTML 文件时，它就开始渲染页面了，在遇到外部链入的脚本标签或样式标签或图片时，会再次发送 HTTP 请求重复上述的步骤。在收到 CSS 文件后会对已经渲染的页面重新渲染，加入它们应有的样式，图片文件加载完立刻显示在相应位置。在这一过程中可能会触发页面的重绘或重排。这里就涉及了两个重要概念：Reflow和Repaint。

　　Reflow，也称作Layout，中文叫回流，一般意味着元素的内容、结构、位置或尺寸发生了变化，需要重新计算样式和渲染树，这个过程称为Reflow。

　　Repaint，中文重绘，意味着元素发生的改变只是影响了元素的一些外观之类的时候（例如，背景色，边框颜色，文字颜色等），此时只需要应用新样式绘制这个元素就OK了，这个过程称为Repaint。

　　所以说Reflow的成本比Repaint的成本高得多的多。DOM树里的每个结点都会有reflow方法，一个结点的reflow很有可能导致子结点，甚至父点以及同级结点的reflow。

　　下面这些动作有很大可能会是成本比较高的：

增加、删除、修改DOM结点时，会导致Reflow或Repaint

移动DOM的位置，或是搞个动画的时候

内容发生变化

修改CSS样式的时候

Resize窗口的时候，或是滚动的时候

修改网页的默认字体时

　　基本上来说，reflow有如下的几个原因：

Initial，网页初始化的时候

Incremental，一些js在操作DOM树时

Resize，其些元件的尺寸变了

StyleChange，如果CSS的属性发生变化了

Dirty，几个Incremental的reflow发生在同一个frame的子树上

# 开始优化了

#### 使用CDN提高用户访问资源的速度
以前用户访问一个网站需要从指定的服务器上获取资源之后渲染成页面展示给用户，但这样会有很多问题出现比如访问量过大服务器不堪重负。解决办法是使用集群+负载均衡来解决但如果用户距离服务器很远或网络互通不理想的时候就会导致页面加载缓慢甚至打不开的情况出现为了解决这个问题CDN出现了。用户通过CDN DNS的全局负载均衡设备根据用户请求的资源用户IP地址，以及请求的内容URL，选择一台有所需内容并距用户最近负载正常的，告诉用户向这台设备发起请求从而以最快的方式获取到资源。

## 浏览器缓存
上面已经说到浏览器缓存分为协商缓存和强制缓存合理利用缓存可以减少冗余的数据传输、
减少服务器负担、加快客户端加载网页的速度。

- 谨慎地使用过期时间，最好配合 MD5 一起使用。
- 总是启用条件请求，比如 Etag 或 Last-Modified。
- 文件服务采用 Last-Modified，动态内容采用 Etag。
- 分离经常变化的部分，也会提高缓存的命中率

#### 谨慎使用过期时间
设置过期时间可以使用Cache-Control字段也可以使用Expires字段，前者设置有效期长度后者设置截止日期。 一旦浏览器获得这样的资源，在一定时期内服务器都无法保证资源的更新。 因此使用不当的过期时间可能导致资源的有效性和一致性问题。

有效性问题。考虑一个简单的场景：你编写了一个网站，设置更新周期为一周并立即发布。 发布后发现里面的内容有错误，马上修改后再次发布。即便如此，在两次发布之间打开过该网站的人，可能在一周内都会看到错误的版本。

一致性问题。页面的脚本文件之间可能存在依赖关系，这时如果使用 max-age 策略来缓存这些文件 可能会使整个页面不可访问，因为 max-age 无法表达依赖关系。 文件版本错乱的状况远比你想象的常见：浏览器随时可以丢弃任意一个文件的缓存、 相互依赖的文件并非总是一同载入、同一页面的资源到达时间也略有不同。

过期时间对于前端的基础库、博客页面、带MD5的资源等比较有用，尤其是 CDN 上的资源常常都有很长的过期时间。

#### 启用条件请求
条件请求（Conditional Requests）是指结果可能会被校验程序改变的 HTTP 请求。 其中校验器（validator）通常是指缓存相关的校验程序。 条件头字段包括 If-Match, If-None-Match, If-Modified-Since, If-Unmodified-Since, If-Range。

不论有无 max-age，总是应该启用条件请求。因为浏览器在刷新时就会忽略 max-age， 另外假设文件已过期，条件请求也可能减少不必要的传输。

对于静态的文件服务采用 Last-Modified 比较方便，但对于很多网站页面而言最后修改时间很难确定。 此时 Etag 更加方便，只需渲染结束后通过一次哈希来决定是否发送。 

#### 使用 MD5
由于过期时间独自无法解决快速更新的问题，条件请求也无法避免发送一次请求。 MD5 + 永不过期的 CDN 几乎已经成为业界常态：为每一个静态文件的文件名都增加版本号（或 MD5 值）， 每次更新文件都同时更新版本号，每个文件都在Cache-Control设为永不过期， 同时 HTML 等入口文件的 Cache-Control 则设为禁止缓存。

标准上讲，使用 URL 的 search 字符串作为文件版本号是完全等价的，这样文件名都无需改变。 这一 Trick 在 Github Badges 中很常见。但是在实践中，网络运营商和 CDN 提供商不一定会理会 search 字符串。

按照现在的节奏，一个互联网应用几乎每天都会有更新。 那么对于一个使用频次较高的网站，将所有静态文件（比如 JavaScript 脚本）打包在一起会让缓存整体失效。 在这种情况下分离的缓存会更加有效。比如：把经常变化的业务逻辑抽离，单独缓存。
基础工具库独立打包并缓存。


### 浏览器并发
目前浏览器对每个域名是有最大并发数量的，IE9+，chrome,firefox新版均为6个。
尽量把并发请求控制在6个内，一些大型项目中会有很多个页面，每个页面引用资源也会有很多如果同时请求的资源超过6个就要考虑这里的优化了
#### 并发优化
可以使用gulp,webpack之类的工具在打包时合并压缩优化来降低并发和容量，nginx也可以合并请求资源。

上面提到了浏览器是基于域名来控制最大并发数的，那么就可以资源放在不同的域名下来提高并发数，那么问题又来了使用多个域名会增加用户DNS解析次数提高获取资源的时间怎么么解决呢？

减少DNS解析数量和使用多个域名提高并发是冲突的，怎么鱼和熊掌兼得呢？
使用DNS预解析DNS Prefetch 是一种DNS 预解析技术，浏览器会在加载网页时对网页中的DNS Prefetch域名进行解析缓存
``` html
<meta http-equiv="x-dns-prefetch-control" content="on">
<link rel="dns-prefetch" href="http://www.spreadfirefox.com/">
<link rel="dns-prefetch" href="//www.spreadfirefox.com">
```
虽然dns-prefetch能够加快网页解析速度，但是也不能随便滥用，因为多页面重复DNS预解析会增加重复DNS查询的次数

引用自 https://developer.mozilla.org/zh-CN/docs/Controlling_DNS_prefetching


# TCP/IP优化
影响TCP性能的协议因素：
- （1）TCP连接建立握手
- （2）TCP慢启动拥塞控制；
- （3）数据聚集的Nagle算法；
- （4）用于捎带确认的TCP延迟确认机制;
- （5）TIME_WAIT时延和端口耗尽。

1、2可通过长连接避免，3可使用TCP_NODELAY避免，4可通过调整内核栈参数避免，但调整需谨慎，5通常只在性能测试环境出现。
其中最后一个TIME_WAIT是TCP协议中特有的因素，主动正常关闭连接的一方都会出现这个状态，在以前的博客中也介绍了这个状态存在的两点好处，在常见的处理方式中也提出了怎么出处理避免这种情况的出现，大部分都是修改内核参数来打到目的，但是总觉得这些也是治标不治本，不知有没有更好的方案。

TCP_NODELAY和Nagle算法:http://blog.csdn.net/majianfei1023/article/details/51558941

关于Keep-Alive：http://blog.csdn.net/xjbclz/article/details/52563663

Linux内核TCP/IP参数分析与调优：http://www.linuxidc.com/Linux/2016-01/127842.htm

Tcp性能调优解决Tcp长延时：http://blog.csdn.net/Happyqunqunqun/article/details/51079504

## 页面性能优化
- （1）不要一个个修改属性，应通过一个class来修改
错误写法：div.style.width="50px";div.style.top="60px";
正确写法：div.className+=" modify";
- （2）clone节点，在副本中修改，然后直接替换当前的节点；
- （3）若要频繁获取计算后的样式，请暂存起来；
- （4）降低受影响的节点：在页面顶部插入节点将影响后续所有节点。而绝对定位的元素改变会影响较少的元素；
- （5）批量添加DOM：多个DOM插入或修改，应组成一个长的字符串后一次性放入DOM。使用innerHTML永远比DOM操作快。（特别注意：innerHTML不会执行字符串中的嵌入脚本，因此不会产生XSS漏洞）


# 基础知识

## 网络通信
为了使不同网络设备之间能够相互通信，国际标准化组织（ISO）在1978年提出了“开放系统互联参考模型”，即著名的OSI/RM模型（Open System Interconnection/Reference Model）。它将计算机网络体系结构的通信协议划分为七层，自下而上依次为：
物理层（Physics Layer）
以太网 · 调制解调器 · 电力线通信(PLC) · SONET/SDH · G.709 · 光导纤维 · 同轴电缆 · 双绞线等

数据链路层（Data Link Layer）
Wi-Fi(IEEE 802.11) · WiMAX(IEEE 802.16) ·ATM · DTM · 令牌环 · 以太网 ·FDDI · 帧中继 · GPRS · EVDO ·HSPA · HDLC · PPP · L2TP ·PPTP · ISDN·STP 等

网络层（Network Layer）
IP (IPv4 · IPv6) · ICMP· ICMPv6·IGMP ·IS-IS · IPsec · ARP · RARP等

传输层（Transport Layer）
TCP · UDP · TLS · DCCP · SCTP · RSVP · OSPF 等

会话层（Session Layer）

表示层（Presentation Layer）

应用层（Application Layer）
DHCP ·DNS · FTP · Gopher · HTTP· IMAP4 · IRC · NNTP · XMPP ·POP3 · SIP · SMTP ·SNMP · SSH ·TELNET · RPC · RTCP · RTP ·RTSP· SDP · SOAP · GTP · STUN · NTP· SSDP · BGP · RIP 等

目前应用最为广泛的TCP/IP协议可以看作是OSI协议层的简化，它分为四层：数据链路层、网络层、传输层、应用层

#### 正向代理与反向代理

<img src="https://pic1.zhimg.com/50/480c1c45d2565e2f92fd930d25b73a18_hd.jpg">

- 正向代理中，proxy和client同属一个LAN，对server透明；
- 反向代理中，proxy和server同属一个LAN，对client透明。
- 实际上proxy在两种代理中做的事都是代为收发请求和响应，不过从结构上来看正好左右互换了下，所以把后出现的那种代理方式叫成了反向代理。
- 两者的区别在于代理的对象不一样：正向代理代理的对象是客户端，反向代理代理的对象是服务端


#### 数据封装

数据封装的过程大致如下：
1.用户信息转换为数据，以便在网络上传输
2.数据转换为数据段，并在发送方和接收方主机之间建立一条可靠的连接
3.数据段转换为数据包或数据报，并在报头中放上逻辑地址，这样每一个数据包都可以通过互联网络进行传输
4.数据包或数据报转换为帧，以便在本地网络中传输。在本地网段上，使用硬件地址唯一标识每一台主机。
5.帧转换为比特流，并采用数字编码和时钟方案

<img src="https://gss2.bdstatic.com/9fo3dSag_xI4khGkpoWK1HF6hhy/baike/c0%3Dbaike116%2C5%2C5%2C116%2C38/sign=ef0111789a25bc313f5009ca3fb6e6d4/fc1f4134970a304ee7eb644cd2c8a786c8175cbf.jpg">


#### 数据解封装

<img src="https://gss2.bdstatic.com/9fo3dSag_xI4khGkpoWK1HF6hhy/baike/c0%3Dbaike116%2C5%2C5%2C116%2C38/sign=1a29d7abd72a283457ab3e593adca28f/a044ad345982b2b7aad2fe7232adcbef76099b33.jpg">

<div id="tcp"></div>

## TCP的建立连接和关闭连接
理解：窗口和滑动窗口
TCP的流量控制
TCP使用窗口机制进行流量控制
什么是窗口？
连接建立时，各端分配一块缓冲区用来存储接收的数据，并将缓冲区的尺寸发送给另一端

接收方发送的确认信息中包含了自己剩余的缓冲区尺寸

剩余缓冲区空间的数量叫做窗口

TCP(Transmission Control Protocol)　传输控制协议

TCP的流控过程（滑动窗口）

<img src="http://images.cnitblog.com/blog/88420/201402/081517071882901.png">


### 三次握手

TCP是主机对主机层的传输控制协议，提供可靠的连接服务，采用三次握手确认建立一个连接:

位码即tcp标志位,有6种标示:

- SYN(synchronous建立联机)

- ACK(acknowledgement 确认)

- PSH(push传送)

- FIN(finish结束)

- RST(reset重置)

- URG(urgent紧急)

- Sequence number(顺序号码)

- Acknowledge number(确认号码)


客户端TCP状态迁移：
CLOSED->SYN_SENT->ESTABLISHED->FIN_WAIT_1->FIN_WAIT_2->TIME_WAIT->CLOSED

服务器TCP状态迁移：
CLOSED->LISTEN->SYN收到->ESTABLISHED->CLOSE_WAIT->LAST_ACK->CLOSED

<img src="http://dl.iteye.com/upload/attachment/0077/6056/bdf8d214-c8de-3b2a-8a53-219a0dce3259.png">


各个状态的意义如下： 
- LISTEN - 侦听来自远方TCP端口的连接请求； 
- SYN-SENT -在发送连接请求后等待匹配的连接请求； 
- SYN-RECEIVED - 在收到和发送一个连接请求后等待对连接请求的确认； 
- ESTABLISHED- 代表一个打开的连接，数据可以传送给用户； 
- FIN-WAIT-1 - 等待远程TCP的连接中断请求，或先前的连接中断请求的确认；
- FIN-WAIT-2 - 从远程TCP等待连接中断请求； 
- CLOSE-WAIT - 等待从本地用户发来的连接中断请求； 
- CLOSING -等待远程TCP对连接中断的确认； 
- LAST-ACK - 等待原来发向远程TCP的连接中断请求的确认； 
- TIME-WAIT -等待足够的时间以确保远程TCP接收到连接中断请求的确认； 
- CLOSED - 没有任何连接状态；

Linux shell代码查看TCP的TIME_WAIT和Close_Wait状态

``` shell
netstat -n | awk '/^tcp/ {++S[$NF]} END {for(a in S) print a, S[a]}'
```

TCP/IP协议中，TCP协议提供可靠的连接服务，采用三次握手建立一个连接，如图1所示。

（1）第一次握手：建立连接时，客户端A发送SYN包（SYN=j）到服务器B，并进入SYN_SEND状态，等待服务器B确认。

（2）第二次握手：服务器B收到SYN包，必须确认客户A的SYN（ACK=j+1），同时自己也发送一个SYN包（SYN=k），即SYN+ACK包，此时服务器B进入SYN_RECV状态。

（3）第三次握手：客户端A收到服务器B的SYN＋ACK包，向服务器B发送确认包ACK（ACK=k+1），此包发送完毕，客户端A和服务器B进入ESTABLISHED状态，完成三次握手。

完成三次握手，客户端与服务器开始传送数据。
确认号：其数值等于发送方的发送序号 +1(即接收方期望接收的下一个序列号)。

<img src="http://images2015.cnblogs.com/blog/1034346/201703/1034346-20170329145607592-1103856922.png">

TCP的包头结构：
- 源端口 16位
- 目标端口 16位
- 序列号 32位
- 回应序号 32位
- TCP头长度 4位
- reserved 6位
- 控制代码 6位
- 窗口大小 16位
- 偏移量 16位
- 校验和 16位
- 选项  32位(可选)

这样我们得出了TCP包头的最小长度，为20字节

<img src="http://up.2cto.com/2013/0308/20130308081720404.jpg">

### http
HTTP1.1的Method请求方法有
- GET
- HEAD
- POST
- TRACE
- OPTIONS
- PUT
- DELETE
- CONNECT

extension-method =token这些Request方法。

引用链接 https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9

### 关闭连接（四次挥手）
 TCP的连接的关闭需要发送四个包，因此称为四次挥手(four-way handshake)。客户端或服务器均可主动发起挥手动作，在socket编程中，任何一方执行close()操作即可产生挥手操作。

（1）客户端A发送一个FIN，用来关闭客户A到服务器B的数据传送。 

（2）服务器B收到这个FIN，它发回一个ACK，确认序号为收到的序号加1。和SYN一样，一个FIN将占用一个序号。 

（3）服务器B关闭与客户端A的连接，发送一个FIN给客户端A。 

（4）客户端A发回ACK报文确认，并将确认序号设置为收到序号加1。

<img src="http://images2015.cnblogs.com/blog/1034346/201703/1034346-20170329153945389-2019926409.png">

深入理解TCP连接的释放： 

由于TCP连接是全双工的，因此每个方向都必须单独进行关闭。这原则是当一方完成它的数据发送任务后就能发送一个FIN来终止这个方向的连接。收到一个 FIN只意味着这一方向上没有数据流动，一个TCP连接在收到一个FIN后仍能发送数据。首先进行关闭的一方将执行主动关闭，而另一方执行被动关闭。
TCP协议的连接是全双工连接，一个TCP连接存在双向的读写通道。 
简单说来是 “先关读，后关写”，一共需要四个阶段。以客户机发起关闭连接为例：

- 1.服务器读通道关闭
- 2.客户机写通道关闭
- 3.客户机读通道关闭
- 4.服务器写通道关闭

关闭行为是在发起方数据发送完毕之后，给对方发出一个FIN（finish）数据段。直到接收到对方发送的FIN，且对方收到了接收确认ACK之后，双方的数据通信完全结束，过程中每次接收都需要返回确认数据段ACK。

详细过程：
+ 第一阶段   客户机发送完数据之后，向服务器发送一个FIN数据段，序列号为i；
    - 1.服务器收到FIN(i)后，返回确认段ACK，序列号为i+1，关闭服务器读通道；
    - 2.客户机收到ACK(i+1)后，关闭客户机写通道；
   （此时，客户机仍能通过读通道读取服务器的数据，服务器仍能通过写通道写数据）
+ 第二阶段 服务器发送完数据之后，向客户机发送一个FIN数据段，序列号为j；
    - 1.客户机收到FIN(j)后，返回确认段ACK，序列号为j+1，关闭客户机读通道；
    - 2.服务器收到ACK(j+1)后，关闭服务器写通道。

这是标准的TCP关闭两个阶段，服务器和客户机都可以发起关闭，完全对称。

FIN标识是通过发送最后一块数据时设置的，标准的例子中，服务器还在发送数据，所以要等到发送完的时候，设置FIN（此时可称为TCP连接处于半关闭状态，因为数据仍可从被动关闭一方向主动关闭方传送）。

如果在服务器收到FIN(i)时，已经没有数据需要发送，可以在返回ACK(i+1)的时候就设置FIN(j)标识，这样就相当于可以合并第二步和第三步。


## TCP状态

<img src="http://dl.iteye.com/upload/attachment/0077/6056/bdf8d214-c8de-3b2a-8a53-219a0dce3259.png">

可能有点眼花缭乱？再看看这个时序图

<img src="http://dl.iteye.com/upload/attachment/0077/6058/5d4e8c89-fc42-3862-bdb8-399bc982f410.png">


SYN_RECV 
服务端收到建立连接的SYN没有收到ACK包的时候处在SYN_RECV状态。有两个相关系统配置：

1，net.ipv4.tcp_synack_retries ：INTEGER

默认值是5

对于远端的连接请求SYN，内核会发送SYN ＋ ACK数据报，以确认收到上一个 SYN连接请求包。这是所谓的三次握手( threeway handshake)机制的第二个步骤。这里决定内核在放弃连接之前所送出的 SYN+ACK 数目。不应该大于255，默认值是5，对应于180秒左右时间。通常我们不对这个值进行修改，因为我们希望TCP连接不要因为偶尔的丢包而无法建立。

2，net.ipv4.tcp_syncookies

一般服务器都会设置net.ipv4.tcp_syncookies=1来防止SYN Flood攻击。假设一个用户向服务器发送了SYN报文后突然死机或掉线，那么服务器在发出SYN+ACK应答报文后是无法收到客户端的ACK报文的（第三次握手无法完成），这种情况下服务器端一般会重试（再次发送SYN+ACK给客户端）并等待一段时间后丢弃这个未完成的连接，这段时间的长度我们称为SYN Timeout，一般来说这个时间是分钟的数量级（大约为30秒-2分钟）。

这些处在SYNC_RECV的TCP连接称为半连接，并存储在内核的半连接队列中，在内核收到对端发送的ack包时会查找半连接队列，并将符合的requst_sock信息存储到完成三次握手的连接的队列中，然后删除此半连接。大量SYNC_RECV的TCP连接会导致半连接队列溢出，这样后续的连接建立请求会被内核直接丢弃，这就是SYN Flood攻击。

能够有效防范SYN Flood攻击的手段之一，就是SYN Cookie。SYN Cookie原理由D. J. Bernstain和 Eric Schenk发明。SYN Cookie是对TCP服务器端的三次握手协议作一些修改，专门用来防范SYN Flood攻击的一种手段。它的原理是，在TCP服务器收到TCP SYN包并返回TCP SYN+ACK包时，不分配一个专门的数据区，而是根据这个SYN包计算出一个cookie值。在收到TCP ACK包时，TCP服务器在根据那个cookie值检查这个TCP ACK包的合法性。如果合法，再分配专门的数据区进行处理未来的TCP连接。


观测服务上SYN_RECV连接个数为：7314，对于一个高并发连接的通讯服务器，这个数字比较正常。

CLOSE_WAIT
主动关闭的一方发出 FIN 包，被动关闭的一方响应 ACK 包，此时，被动关闭的一方就进入了 CLOSE_WAIT 状态。如果一切正常，稍后被动关闭的一方也会发出 FIN 包，然后迁移到 LAST_ACK 状态。

通常，CLOSE_WAIT 状态在服务器停留时间很短，如果你发现大量的 CLOSE_WAIT 状态，那么就意味着被动关闭的一方没有及时发出 FIN 包，一般有如下几种可能：

程序问题：如果代码层面忘记了 close 相应的 socket 连接，那么自然不会发出 FIN 包，从而导致 CLOSE_WAIT 累积；或者代码不严谨，出现死循环之类的问题，导致即便后面写了 close 也永远执行不到。
响应太慢或者超时设置过小：如果连接双方不和谐，一方不耐烦直接 timeout，另一方却还在忙于耗时逻辑，就会导致 close 被延后。响应太慢是首要问题，不过换个角度看，也可能是 timeout 设置过小。
BACKLOG 太大：此处的 backlog 不是 syn backlog，而是 accept 的 backlog，如果 backlog 太大的话，设想突然遭遇大访问量的话，即便响应速度不慢，也可能出现来不及消费的情况，导致多余的请求还在队列里就被对方关闭了。
如果你通过「netstat -ant」或者「ss -ant」命令发现了很多 CLOSE_WAIT 连接，请注意结果中的「Recv-Q」和「Local Address」字段，通常「Recv-Q」会不为空，它表示应用还没来得及接收数据，而「Local Address」表示哪个地址和端口有问题，我们可以通过「lsof -i:<PORT>」来确认端口对应运行的是什么程序以及它的进程号是多少。

如果是我们自己写的一些程序，比如用 HttpClient 自定义的蜘蛛，那么八九不离十是程序问题，如果是一些使用广泛的程序，比如 Tomcat 之类的，那么更可能是响应速度太慢或者 timeout 设置太小或者 BACKLOG 设置过大导致的故障。

此外还有一点需要说明：，当被动关闭的一方处于 CLOSE_WAIT 状态时，主动关闭的一方处于 FIN_WAIT2 状态。 那么为什么我们总听说 CLOSE_WAIT 状态过多的故障，但是却相对少听说 FIN_WAIT2 状态过多的故障呢？这是因为 Linux 有一个「tcp_fin_timeout」设置，控制了 FIN_WAIT2 的最大生命周期。坏消息是 CLOSE_WAIT 没有类似的设置，如果不重启进程，那么 CLOSE_WAIT 状态很可能会永远持续下去；好消息是如果 socket 开启了 keepalive 机制，那么可以通过相应的设置来清理无效连接，不过 keepalive 是治标不治本的方法，还是应该找到问题的症结才对。

TIME_WAIT
根据TCP协议定义的3次握手断开连接规定,发起socket主动关闭的一方 socket将进入TIME_WAIT状态。TIME_WAIT状态将持续2个MSL(Max Segment Lifetime),在Windows下默认为4分钟，即240秒。TIME_WAIT状态下的socket不能被回收使用. 具体现象是对于一个处理大量短连接的服务器,如果是由服务器主动关闭客户端的连接，将导致服务器端存在大量的处于TIME_WAIT状态的socket， 甚至比处于Established状态下的socket多的多,严重影响服务器的处理能力，甚至耗尽可用的socket，停止服务。

为什么需要TIME_WAIT？TIME_WAIT是TCP协议用以保证被重新分配的socket不会受到之前残留的延迟重发报文影响的机制,是必要的逻辑保证。

和TIME_WAIT状态有关的系统参数有一般由3个，本厂设置如下：

net.ipv4.tcp_tw_recycle = 1

net.ipv4.tcp_tw_reuse = 1

net.ipv4.tcp_fin_timeout = 30

 
net.ipv4.tcp_fin_timeout，默认60s，减小fin_timeout，减少TIME_WAIT连接数量。


net.ipv4.tcp_tw_reuse = 1表示开启重用。允许将TIME-WAIT sockets重新用于新的TCP连接，默认为0，表示关闭；

net.ipv4.tcp_tw_recycle = 1表示开启TCP连接中TIME-WAIT sockets的快速回收，默认为0，表示关闭。

为了方便描述，我给这个TCP连接的一端起名为Client，给另外一端起名为Server。上图描述的是Client主动关闭的过程，FTP协议中就这样的。如果要描述Server主动关闭的过程，只要交换描述过程中的Server和Client就可以了，HTTP协议就是这样的。

描述过程：
Client调用close()函数，给Server发送FIN，请求关闭连接；Server收到FIN之后给Client返回确认ACK，同时关闭读通道（不清楚就去看一下shutdown和close的差别），也就是说现在不能再从这个连接上读取东西，现在read返回0。此时Server的TCP状态转化为CLOSE_WAIT状态。
Client收到对自己的FIN确认后，关闭 写通道，不再向连接中写入任何数据。
接下来Server调用close()来关闭连接，给Client发送FIN，Client收到后给Server回复ACK确认，同时Client关闭读通道，进入TIME_WAIT状态。
Server接收到Client对自己的FIN的确认ACK，关闭写通道，TCP连接转化为CLOSED，也就是关闭连接。
Client在TIME_WAIT状态下要等待最大数据段生存期的两倍，然后才进入CLOSED状态，TCP协议关闭连接过程彻底结束。

以上就是TCP协议关闭连接的过程，现在说一下TIME_WAIT状态。
从上面可以看到，主动发起关闭连接的操作的一方将达到TIME_WAIT状态，而且这个状态要保持Maximum Segment Lifetime的两倍时间。为什么要这样做而不是直接进入CLOSED状态？

原因有二：
一、保证TCP协议的全双工连接能够可靠关闭
二、保证这次连接的重复数据段从网络中消失

先说第一点，如果Client直接CLOSED了，那么由于IP协议的不可靠性或者是其它网络原因，导致Server没有收到Client最后回复的ACK。那么Server就会在超时之后继续发送FIN，此时由于Client已经CLOSED了，就找不到与重发的FIN对应的连接，最后Server就会收到RST而不是ACK，Server就会以为是连接错误把问题报告给高层。这样的情况虽然不会造成数据丢失，但是却导致TCP协议不符合可靠连接的要求。所以，Client不是直接进入CLOSED，而是要保持TIME_WAIT，当再次收到FIN的时候，能够保证对方收到ACK，最后正确的关闭连接。

再说第二点，如果Client直接CLOSED，然后又再向Server发起一个新连接，我们不能保证这个新连接与刚关闭的连接的端口号是不同的。也就是说有可能新连接和老连接的端口号是相同的。一般来说不会发生什么问题，但是还是有特殊情况出现：假设新连接和已经关闭的老连接端口号是一样的，如果前一次连接的某些数据仍然滞留在网络中，这些延迟数据在建立新连接之后才到达Server，由于新连接和老连接的端口号是一样的，又因为TCP协议判断不同连接的依据是socket pair，于是，TCP协议就认为那个延迟的数据是属于新连接的，这样就和真正的新连接的数据包发生混淆了。所以TCP连接还要在TIME_WAIT状态等待2倍MSL，这样可以保证本次连接的所有数据都从网络中消失。

<div id="resCode"></div>

## 状态码

状态码是由3位数组成，第一个数字定义了响应的类别，且有五种可能取值:

- 1xx：指示信息–表示请求已接收，继续处理。
- 2xx：成功–表示请求已被成功接收、理解、接受。
- 3xx：重定向–要完成请求必须进行更进一步的操作。
- 4xx：客户端错误–请求有语法错误或请求无法实现。
- 5xx：服务器端错误–服务器未能实现合法的请求。

平时遇到比较常见的状态码有:200, 204, 301, 302, 304, 400, 401, 403, 404, 422, 500。

<img src='https://segmentfault.com/img/bVDNI1?w=2404&h=1342'>

