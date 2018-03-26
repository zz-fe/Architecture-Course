let http = require('http')
let parse = require('url').parse
let compose = require('./mis-compose')
let Stream = require('stream')

class Mis {
  constructor() {
     this.middleware = []
  }
 
  use(fn) {
    if(typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    this.middleware.push(fn)
  }

  /**
   * [listen 监听端口]
   * @param  {[type]} args [description]
   * @return {[type]}      [description]
   */
  listen(...args) {
    let server = http.createServer(this.callback());
    return server.listen(...args)
  }

  callback() {
    const fn = compose(this.middleware);
    const httpRequest = (req, res) => {
      const ctx = this.createContext(req, res)
      ctx.path = parse(req.url).pathname;
      ctx.methods = req.methods;     
      return this.middlewareFn(ctx,fn)
    }
    return httpRequest
  }

  /**
   *  中间件执行
   * @param {全局ctx} ctx 
   * @param {中间件函数} fn 
   */
  middlewareFn(ctx,fn) {
    const send  = () => this.send(ctx)
    return fn(ctx).then(send)
  }

  /**
   * 合并
   * @param {请求} req 
   * @param {响应} res 
   */
  createContext(req, res) {
    let ctx = {}
    ctx.req = req
    ctx.res = res
    return ctx
  }

  /**
   * 响应
   * @param {全局} ctx 
   */
  send(ctx){
    let res = ctx.res 
    let body = ctx.body 
    
    if (res.headersSent) {
      res.end();
    } else {
      res.statusCode = 200;
    }

    if (body === undefined) res.statusCode = 404;
    if ('string' == typeof body) return res.end(body);
    // if (Object.prototype.toString.call(body) == '[object Object]') {
    //   res.end(JSON.stringify(ctx.body))
    // }
    if(body instanceof Stream) {
      return body.pipe(res);
    }
    res.end(body || 'error');
    
  }
}


module.exports = Mis
