let Mis = require('./lib/mis')
let static = require('./lib/mis-static')
let bodyparser = require('./lib/mis-bodyparser')
let cookies = require('./lib/mis-cookie')
let router = require('./lib/mis-router')()
let mis = new Mis()
mis.use(static(__dirname + '/static'));
mis.use(bodyparser())
mis.use(cookies())
router.get('/index', function (ctx, next) {
    ctx.body = '111'
 });
router.post('/list', function (ctx, next) {
    ctx.body =  '222' 
});

 mis.use(router.routes())
// * var router = new Router();
// *
// * router.get('/', function (ctx, next) {
// *   // ctx.router available
// * });
// *
// * app
// *   .use(router.routes())
// *   .use(router.allowedMethods());
// * ```
// mis.use(function(ctx,next){
//    ctx.cookies.set(
//      'age',
//      '18',
//      {
//       expires: new Date('2017-12-15'),  // cookie失效时间
//     }
//   )
//   next()
// })

// mis.use(function(ctx,next){
//   ctx.cookies.get('age')
//  next()
// })



mis.listen('11111', ()=>{
  console.log('11111 is port')
})
