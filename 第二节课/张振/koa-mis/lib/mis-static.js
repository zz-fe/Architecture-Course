let join = require('path').join
let fs = require('fs')
module.exports = static



function static(path,opts) {
    opts = opts || {};
    opts.rootPath = path;
    return function(ctx, next){
        let filePath = join(opts.rootPath ,ctx.path);
        //判断路径是否存在
        let flag = fs.existsSync(filePath);
        if(flag) {
            let index = filePath.lastIndexOf(".");
            let Type =  filePath.substring(index+1).toLocaleUpperCase();
            switch (Type) {
                case 'HTML':
                    ctx.res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    break;
                case 'JS':
                    ctx.res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
                    break;
                case 'CSS':
                    ctx.res.setHeader('Content-Type', 'text/css; charset=utf-8');
                    break;
                default:
                    break;
            }
            ctx.body = fs.createReadStream(filePath)
   
        }else{
          next();
        }
    }
}