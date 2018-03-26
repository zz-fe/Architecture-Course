let queryString = require('querystring')


module.exports = bodyparser 

function bodyparser () {
    return function(ctx, next) {
       let Type = ctx.req.headers['content-type'] || 'text/plain; charset=UTF-8'
        Parse.init(ctx,Type)
        next()
    }
}



class Parse {
    constructor(){
        this.result = ''
        this.jsonTypes = 'application/json; charset=UTF-8';
        this.formTypes = 'application/x-www-form-urlencoded; charset=UTF-8';
        this.textTypes = 'text/plain; charset=UTF-8';
    }
    form(ctx){
        ctx.req.body = queryString.parse(this.result)
    }
    json(ctx){
        ctx.req.body = JSON.parse(this.result);
    }
    text(ctx){
        ctx.req.body = this.result;
    }
    data(ctx,Type) {
        ctx.req.on('data',(data) => {
            this.result += data
        })
        ctx.req.on('end',() => {
            switch (Type) {
                case this.jsonTypes:
                 this.json(ctx)
                    break;
                case this.formTypes:
                 this.form(ctx)
                    break;
                case this.textTypes:
                    this.text(ctx)
                    break;
            }
        })   

    }
    static init(ctx,Type){
        new Parse().data(ctx,Type)
    }
}
