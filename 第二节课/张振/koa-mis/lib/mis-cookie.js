module.exports = Cookies 



function Cookies () {
  
    return function(ctx,next) {
        let cookie= ctx.req.headers.cookie
        let obj = {};
        let cookieArray = cookie.split(';');
        cookieArray.forEach(element => {
            let item = element.split('=');
            obj[item[0]] = item[1]
        });
        ctx.cookies  = {
            get: (key) => {
                if(!key) return obj 
                for(var item in obj) {
                  if(item === key) return obj[key]
                }

            },
            set:(key,value,opts) => {
                if (typeof(key) != 'string') throw new TypeError('key  must be string!')
                if (typeof(value) != 'string') throw new TypeError('value  must be string!')
                let result = `${key}=${value}; expires=${opts.expires}`
                ctx.res.setHeader('Set-Cookie',[result]);             
            }
        }
        next()
    }

}