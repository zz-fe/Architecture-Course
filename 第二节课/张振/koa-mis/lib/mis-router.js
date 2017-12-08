module.exports = Router  

function Router(){
    return new misRouter()
}

class route{
    constructor(path,method,middleware){
        this.path = path 
        this.method = method
        //为了获取参数
        this.route = (ctx,next) => {
            console.log(ctx)
            ctx.params = this.params
            return middleware(ctx,next)
        }
        this.params = {}

    }
}
class misRouter{
    constructor(){
        this.opts = {}
        this.stack = []
        this.methods = ['get','post']
        this.methods.forEach(method =>{
            misRouter.prototype[method] = (path,middleware) => {
                this.stack.push(this.register(path,method,middleware))
            }
        })
    }
    /**
     * 
     * @param {路径} path 
     * @param {方法} method 
     * @param {中间件} middleware
     * @returns router 
     */
    register(path,method,middleware){
        return new route(path,method,middleware)
    }
    /**
     * 过滤路由
     * @param {路径} path 
     */
    filterRoute(path,method){
      return this.stack.filter((item)=>{
             return item.path == path && item.method == method 
        })
    }
    routes(){
        return (ctx,next) =>{
            let curPath = ctx.path  
            let method = ctx.req.method.toLowerCase() 
            let mathRoute = this.filterRoute(curPath,method)
            if(mathRoute.length == 0) {
                return next()
            } 
            let route = mathRoute[0].route 
            return Promise.resolve(route(ctx,()=>{}))
        }
    }
}

